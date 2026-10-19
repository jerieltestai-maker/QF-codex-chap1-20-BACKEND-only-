import {AppError,requiredText,dateOnly} from '../contracts/primitives.js';
import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {workAccess} from './work-core.js';
import {reviewer,completion} from './completion-core.js';
import {adminOnly,authorizedOrganisation,finishAttention,createAttention} from './verification-service.js';
import {estateAuthority} from './selection-service.js';
import {maskedName,publication} from './quote-service.js';
import {singaporeDate} from './calendar.js';
import {saveEntry,currentEntry,entryProjection,refreshReputation} from './reputation-core.js';
import {validateRubric,score,type Rubric} from './reputation-model.js';

export class ReputationService {
  constructor(readonly commands:CommandService) {}
  async inspect(token:string,meta:WorkspaceCommand,id:string,body:{round:number;rubric:Rubric;reason:string;entryVersion?:number;correctionReason?:string;confirmed:boolean}) {
    return this.commands.run(token,meta,'reputation.inspection',{id,...body},async(tx,a)=>{await workAccess(tx,a,id);reviewer(a);},async(tx,a)=>{
      const w=await workAccess(tx,a,id);requireVersion(w.version,meta.expectedVersion);const c=await completion(tx,id),now=this.commands.now();
      const [inspection]=await tx.query('SELECT round FROM inspections WHERE job_id=$1 AND round=$2',[id,body.round]);
      if(!c||!inspection)throw new AppError(409,'INSPECTION_REQUIRED','Submit operational inspection separately before its reputation questionnaire');
      const [latest]=await tx.query('SELECT MAX(round) AS round FROM inspections WHERE job_id=$1',[id]);requireVersion(Number(latest!.round),body.round);
      const rubric=validateRubric(body.rubric,body.reason);if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm these feedback answers');
      const [existing]=await tx.query("SELECT id,current_version FROM reputation_entries WHERE job_id=$1 AND kind='inspection'",[id]);
      if(existing) {requireVersion(Number(existing.current_version),body.entryVersion??0);requiredText(body.correctionReason??'');}
      const entryId=await saveEntry(tx,a,w.organisation_id,id,'inspection',{round:body.round,rubric,reason:body.reason.trim(),correctionReason:body.correctionReason??''},now,existing?{id:String(existing.id),version:Number(existing.current_version)}:undefined);
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);
      await refreshReputation(tx,w.organisation_id,now);
      await audit(tx,a,'reputation.inspection',id,{entryId:existing?.id??null,version:existing?.current_version??0},{entryId,round:body.round,rubric,reason:body.reason,correctionReason:body.correctionReason??''},meta.requestId,now);
      return {jobId:id,version:w.version+1,entryId};
    });
  }
  async external(token:string,meta:WorkspaceCommand,org:string,body:{workDate:string;trade:string;workDescription:string;source:string;refereeContact:string;independentChannel:string;interviewEvidence:string;uncertainty:string;independentlyVerified:boolean;rubric:Rubric;reason:string;referenceKey:string}) {
    return this.commands.run(token,meta,'reputation.external',{organisationId:org,...body},async(tx,a)=>{adminOnly(a);await authorizedOrganisation(tx,a,org);},async(tx,a)=>{
      const organisation=await authorizedOrganisation(tx,a,org);requireVersion(Number(organisation.version),meta.expectedVersion);
      const now=this.commands.now(),workDate=dateOnly(body.workDate);if(workDate>singaporeDate(now))throw new AppError(422,'FIELD_VALIDATION','External work must have actually occurred');
      if(!body.independentlyVerified)throw new AppError(422,'VERIFICATION_REQUIRED','Independently verify the referee and completed work before entering a scorable reference');
      const facts={...body,workDate,rubric:validateRubric(body.rubric,body.reason)};
      for(const key of ['trade','workDescription','source','refereeContact','independentChannel','interviewEvidence','referenceKey'] as const)facts[key]=requiredText(body[key]);
      const [duplicate]=await tx.query("SELECT e.id FROM reputation_entries e JOIN reputation_entry_versions v ON v.entry_id=e.id AND v.version=e.current_version WHERE e.organisation_id=$1 AND e.kind='external' AND v.facts->>'referenceKey'=$2",[org,facts.referenceKey]);
      if(duplicate)throw new AppError(409,'DUPLICATE_REFERENCE','This external work reference is already recorded');
      const entryId=await saveEntry(tx,a,org,null,'external',facts,now);
      await tx.query('UPDATE organisations SET version=version+1 WHERE id=$1',[org]);await refreshReputation(tx,org,now);
      await audit(tx,a,'reputation.external',entryId,null,{organisationId:org,entryVersion:1,independentlyVerified:true},meta.requestId,now);
      return {entryId,organisationId:org,version:Number(organisation.version)+1};
    });
  }
  private async entryAccess(tx:Sql,a:Actor,id:string) {
    const e=await currentEntry(tx,id);
    if(a.context?.role==='admin')return e;
    if(a.context?.role==='contractor'&&a.context.organisation_id===e.organisation_id)return e;
    if(e.job_id) {await workAccess(tx,a,String(e.job_id));return e;}
    throw new AppError(404,'NOT_FOUND','Feedback unavailable');
  }
  async moderate(token:string,meta:WorkspaceCommand,id:string,body:{entryVersion:number;decision:'publish'|'reject'|'void'|'redact';reason:string;publicText?:{observation?:string;reason?:string};durabilityContested:boolean}) {
    return this.commands.run(token,meta,'reputation.moderate',{entryId:id,...body},async(tx,a)=>{adminOnly(a);await this.entryAccess(tx,a,id);},async(tx,a)=>{
      const e=await currentEntry(tx,id);requireVersion(Number(e.review_version),meta.expectedVersion);requireVersion(Number(e.current_version),body.entryVersion);
      if(body.decision==='void'&&e.kind==='external')throw new AppError(422,'FIELD_VALIDATION','Reject or correct external references; void applies to CM/MCST feedback');
      if(body.durabilityContested&&e.kind!=='durability')throw new AppError(422,'FIELD_VALIDATION','Causal attribution applies to durability evidence');
      const reason=requiredText(body.reason),now=this.commands.now();
      // Redaction replaces only public free text. Original evidence and numeric answers remain immutable.
      if(body.decision==='redact') {
        const key=e.kind==='durability'?'observation':'reason';requiredText(body.publicText?.[key]??'');
      }
      const publicText=body.decision==='redact'?body.publicText??{}:e.moderation?.public_text??{};
      await tx.query(`INSERT INTO reputation_moderation(id,entry_id,entry_version,decision,public_text,private_reason,durability_contested,actor_id,recorded_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),id,e.current_version,body.decision,publicText,reason,body.durabilityContested,a.id,now.toISOString()]);
      await tx.query('UPDATE reputation_entries SET review_version=review_version+1 WHERE id=$1',[id]);
      await finishAttention(tx,id,'reputation.moderation');await refreshReputation(tx,String(e.organisation_id),now);
      await audit(tx,a,'reputation.moderate',id,{entryVersion:e.current_version,decision:e.moderation?.decision??null},{decision:body.decision,publicText,durabilityContested:body.durabilityContested},meta.requestId,now,reason);
      return {entryId:id,version:Number(e.review_version)+1};
    });
  }
  async reply(token:string,meta:WorkspaceCommand,id:string,body:{entryVersion:number;text:string}) {
    return this.commands.run(token,meta,'reputation.reply',{entryId:id,...body},async(tx,a)=>{
      const e=await this.entryAccess(tx,a,id);if(a.context?.role!=='contractor'||a.context.organisation_id!==e.organisation_id)throw new AppError(403,'FORBIDDEN','Only the feedback subject Contractor can reply');
    },async(tx,a)=>{
      const e=await currentEntry(tx,id);requireVersion(Number(e.review_version),meta.expectedVersion);requireVersion(Number(e.current_version),body.entryVersion);
      const text=requiredText(body.text),now=this.commands.now(),[last]=await tx.query('SELECT MAX(version) AS version FROM reputation_replies WHERE entry_id=$1',[id]),version=Number(last!.version??0)+1;
      await tx.query('INSERT INTO reputation_replies VALUES($1,$2,$3,$4,$5,$6)',[id,e.current_version,version,text,a.id,now.toISOString()]);
      await tx.query('UPDATE reputation_entries SET review_version=review_version+1 WHERE id=$1',[id]);
      await finishAttention(tx,id,'reputation.reply');await createAttention(tx,now,{kind:'reputation.reply',resourceId:id,organisationId:String(e.organisation_id),action:'Review the Contractor reply before shared publication.',requiredVersion:version});
      await audit(tx,a,'reputation.reply',id,null,{replyVersion:version,entryVersion:e.current_version},meta.requestId,now);return {entryId:id,version:Number(e.review_version)+1,replyVersion:version};
    });
  }
  async moderateReply(token:string,meta:WorkspaceCommand,id:string,body:{replyVersion:number;approved:boolean;reason:string}) {
    return this.commands.run(token,meta,'reputation.reply-moderate',{entryId:id,...body},async(tx,a)=>{adminOnly(a);await this.entryAccess(tx,a,id);},async(tx,a)=>{
      const e=await currentEntry(tx,id);requireVersion(Number(e.review_version),meta.expectedVersion);
      const [reply]=await tx.query('SELECT version,entry_version FROM reputation_replies WHERE entry_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      if(!reply||reply.version!==body.replyVersion||reply.entry_version!==e.current_version)throw new AppError(412,'REPLY_CHANGED','Review the current reply to this exact feedback version');
      const [already]=await tx.query('SELECT entry_id FROM reputation_reply_moderation WHERE entry_id=$1 AND reply_version=$2',[id,body.replyVersion]);
      if(already)throw new AppError(409,'ALREADY_MODERATED','Submit a new reply version for a different publication decision');
      const reason=requiredText(body.reason),now=this.commands.now();
      await tx.query('INSERT INTO reputation_reply_moderation VALUES($1,$2,$3,$4,$5,$6)',[id,body.replyVersion,body.approved,reason,a.id,now.toISOString()]);
      await tx.query('UPDATE reputation_entries SET review_version=review_version+1 WHERE id=$1',[id]);await finishAttention(tx,id,'reputation.reply');
      await audit(tx,a,'reputation.reply-moderate',id,null,{replyVersion:body.replyVersion,approved:body.approved},meta.requestId,now,reason);
      return {entryId:id,version:Number(e.review_version)+1};
    });
  }
  async entry(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx),e=await this.entryAccess(tx,a,id);
      const identity=e.job_id?await maskedName(tx,a,String(e.job_id),String(e.organisation_id)):{masked:false};return entryProjection(tx,a,id,false,identity.masked);});
  }
  async queue(token:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);adminOnly(a);
      const result=[];for(const e of await tx.query('SELECT id FROM reputation_entries ORDER BY created_at,id LIMIT 200'))result.push(await entryProjection(tx,a,String(e.id),false));return result;});
  }
  async passportFor(tx:Sql,a:Actor,id:string,org:string,now:Date) {
    await estateAuthority(tx,a,id);const rfq=await publication(tx,id),[participating]=await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2 LIMIT 1',[id,org]);
    if(!participating)throw new AppError(404,'NOT_FOUND','Contractor passport unavailable for this job');
    const identity=await maskedName(tx,a,id,org),snapshot=await refreshReputation(tx,org,now),priorities=rfq.snapshot as {primaryPriority:string;secondaryPriority?:string},entries=[];
    for(const e of await tx.query('SELECT id FROM reputation_entries WHERE organisation_id=$1 ORDER BY created_at,id',[org])) {
      const projection=await entryProjection(tx,a,String(e.id),true,identity.masked);if(projection)entries.push(projection);
    }
    const [organisation]=await tx.query('SELECT verified FROM organisations WHERE id=$1',[org]);
    return {...identity,verified:organisation!.verified,snapshotId:snapshot.snapshotId,scores:score(snapshot.inputs.units,priorities.primaryPriority,priorities.secondaryPriority),
      sourceCounts:{verifiedExternal:snapshot.inputs.verifiedExternalCount,scoredExternal:snapshot.result.externalCount,quoteFixJobs:snapshot.result.quoteFixCount},durability:snapshot.inputs.durabilityStates,
      limitations:[...(snapshot.inputs.verifiedExternalCount<5?['Fewer than five verified external references; external references contribute no score.']:[]),...(snapshot.result.quoteFixCount===0?['No scored QuoteFix jobs.']:[]),'External references are Contractor-selected and independently checked.','Unanswered, pending, unassessable or contested durability is not evidence of a clean repair.','Current availability and price are evaluated from the current quote.'],
      entries};
  }
  async passport(token:string,id:string,org:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');return this.passportFor(tx,await this.commands.identity.actor(token,tx),id,org,this.commands.now());});
  }
  async passportByQuote(token:string,id:string,quoteId:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);await estateAuthority(tx,a,id);
      const [q]=await tx.query('SELECT organisation_id FROM quotes WHERE id=$1 AND job_id=$2',[quoteId,id]);if(!q)throw new AppError(404,'NOT_FOUND','Passport unavailable');
      return this.passportFor(tx,a,id,String(q.organisation_id),this.commands.now());});
  }
}
