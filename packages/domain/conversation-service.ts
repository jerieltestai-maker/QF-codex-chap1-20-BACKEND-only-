import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {contractorRfq,type Intake} from './rfq-service.js';
import {publication,contractorReadRfq,selectionOwner,maskedName} from './quote-service.js';
import {estateAuthority,revealLocation} from './selection-service.js';
import {responseTask,finishResponse} from './procurement-clocks.js';
import {createAttention,eligibility} from './verification-service.js';
import {explicitInstant} from './calendar.js';
import type {Sql} from '../infrastructure/database.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';

const unavailable=()=>new AppError(404,'NOT_FOUND','Request unavailable');
export async function publicAnswerCheck(tx:Sql,jobId:string,text:string) {
  const [estate]=await tx.query('SELECT e.name,e.private_address FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[jobId]);
  if([estate!.name,estate!.private_address].filter(Boolean).some(value=>text.toLowerCase().includes(String(value).toLowerCase()))||/\b[^\s@]+@[^\s@]+\.[^\s@]+\b|(?:\$|SGD)\s*\d|\d\s*(?:SGD|dollars)\b/i.test(text))throw new AppError(422,'PRIVACY_REVIEW_REQUIRED','Remove estate identifiers, contacts and contractor prices from the shared factual answer');
  for(const org of await tx.query(`SELECT name FROM organisations UNION SELECT snapshot->>'name' FROM contractor_profile_versions
    UNION SELECT before_value->>'name' FROM audit_events WHERE action='verification.profile'`))if(org.name&&String(org.name).length>2&&text.toLowerCase().includes(String(org.name).toLowerCase()))throw new AppError(422,'PRIVACY_REVIEW_REQUIRED','Remove contractor identities from the shared question and answer');
}
export class ConversationService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;}get identity(){return this.commands.identity;}get now(){return this.commands.now;}
  async list(token:string,id:string) {
    return this.db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');const actor=await this.identity.actor(token,tx),contractor=actor.context?.role==='contractor';
    if(!contractor)await estateAuthority(tx,actor,id);
    const rfq=contractor?await contractorReadRfq(tx,actor,id,this.now()):await publication(tx,id);
    const questions=await tx.query('SELECT * FROM job_questions WHERE job_id=$1 AND ($2::uuid IS NULL OR organisation_id=$2) ORDER BY recorded_at,id',[id,contractor?actor.context!.organisation_id:null]);
    const privateQuestions=[];
    for(const q of questions) {
      const name=await maskedName(tx,actor,id,String(q.organisation_id));let question=String(q.question);
      if(name.masked) {
        question=concealedText(question,await contractorIdentifiers(tx,String(q.organisation_id)));
      }
      privateQuestions.push({id:q.id,version:q.version,question,state:q.state,...name});
    }
    const shared=await tx.query(`SELECT r.id,r.public_question,r.public_answer,r.classification,r.rfq_revision,r.recorded_at FROM question_responses r JOIN job_questions q ON q.id=r.question_id WHERE q.job_id=$1 AND r.outcome='answered' AND r.rfq_revision<=$2 ORDER BY r.recorded_at,r.id`,[id,rfq.revision]);
    const visits=await tx.query('SELECT id,version,reason,state FROM visit_requests WHERE job_id=$1 AND ($2::uuid IS NULL OR organisation_id=$2) ORDER BY recorded_at,id',[id,contractor?actor.context!.organisation_id:null]);
    if(actor.context?.role==='cm'){const [e]=await tx.query('SELECT contractor_identities_visible FROM estates WHERE id=$1',[actor.context.estate_id]);if(!e?.contractor_identities_visible)for(const v of visits)v.reason='Private visit request; identity concealed';}
    const reveals=contractor?await tx.query('SELECT cause,snapshot,recorded_at FROM location_reveals WHERE job_id=$1 AND organisation_id=$2 ORDER BY recorded_at',[id,actor.context!.organisation_id]):[];
    return {jobId:id,rfqRevision:rfq.revision,questions:privateQuestions,shared,visits,reveals};
    });
  }
  async ask(token:string,meta:WorkspaceCommand,id:string,body:{rfqRevision:number;question:string}) {
    return this.commands.run(token,meta,'question.ask',{id,...body},async(tx,actor)=>{await contractorRfq(tx,actor,id,this.now());},async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);const rfq=await contractorRfq(tx,actor,id,this.now());requireVersion(Number(rfq.revision),body.rfqRevision);
      if((await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2 LIMIT 1',[id,actor.context!.organisation_id])).length)throw new AppError(409,'PREQUOTE_ONLY','Shared Q&A is available before your first quote for this job');
      const question=requiredText(body.question),questionId=randomUUID(),now=this.now(),[job]=await tx.query('SELECT estate_id FROM job_records WHERE id=$1',[id]);
      const owner=await selectionOwner(tx,id),taskId=await responseTask(tx,now,{kind:'question.response',resourceId:questionId,estateId:String(job!.estate_id),ownerRole:owner,action:'Answer or decline a private factual job question',rule:'T22'});
      await tx.query("INSERT INTO job_questions VALUES($1,$2,$3,$4,$5,'pending',1,$6,$7,$8,$9)",[questionId,id,rfq.round_id,actor.context!.organisation_id,question,taskId,actor.id,now.toISOString(),rfq.revision]);
      await audit(tx,actor,'question.ask',questionId,null,{jobId:id,question},meta.requestId,now);return {questionId,jobId:id,version:1};
    });
  }
  async answer(token:string,meta:WorkspaceCommand,id:string,questionId:string,body:{rfqRevision:number;outcome:'answered'|'declined';publicQuestion:string;publicAnswer:string;classification:'minor'|'material';changeKinds:string[];reason:string;privacyConfirmed:boolean;factsConfirmed:boolean}) {
    return this.commands.run(token,meta,'question.answer',{id,questionId,...body},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      const job=await estateAuthority(tx,actor,id),rfq=await publication(tx,id),[q]=await tx.query('SELECT * FROM job_questions WHERE id=$1 AND job_id=$2',[questionId,id]);
      if(!q)throw unavailable();requireVersion(Number(q.version),meta.expectedVersion);requireVersion(Number(rfq.revision),body.rfqRevision);
      if(q.state!=='pending'||q.round_id!==rfq.round_id||rfq.status!=='open')throw new AppError(409,'QUESTION_CLOSED','This question is no longer awaiting an answer in an open round');
      const now=this.now(),responseId=randomUUID();let revision:number=Number(rfq.revision),scopeVersion=Number(rfq.scope_version);
      if(body.outcome==='answered') {
        const publicQuestion=requiredText(body.publicQuestion),publicAnswer=requiredText(body.publicAnswer);requiredText(body.reason);
        if(!body.privacyConfirmed||!body.factsConfirmed)throw new AppError(422,'REVIEW_REQUIRED','Review the sanitized factual question and answer before publishing');
        await publicAnswerCheck(tx,id,publicQuestion+'\n'+publicAnswer);
        if(body.classification==='minor'&&(body.changeKinds.some(k=>!['spelling','formatting'].includes(k))||/\d/.test(publicQuestion+'\n'+publicAnswer)))throw new AppError(422,'MATERIAL_CLASSIFICATION_REQUIRED','Substantive, quantitative or uncertain answers require material scope classification');
        const source=rfq.snapshot as Intake,[draft]=await tx.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);
        if(draft!.public_description!==source.publicDescription||draft!.public_location!==source.publicLocation||draft!.no_photo_reason!==source.noPhotoReason||JSON.stringify(draft!.categories)!==JSON.stringify(source.categories)||draft!.urgency!==source.urgency||draft!.grouping!==source.grouping||draft!.primary_priority!==source.primaryPriority||(draft!.secondary_priority??null)!==(source.secondaryPriority??null)||draft!.access_equipment_required!==(source.accessEquipmentRequired??false)||JSON.stringify(draft!.evidence_ids)!==JSON.stringify(source.evidenceIds))throw new AppError(409,'DRAFT_CONFLICT','Resolve the saved RFQ draft before publishing a shared answer');
        const snapshot={...source,publicDescription:source.publicDescription+'\n\nQuestions about this job\n'+publicQuestion+'\n'+publicAnswer};revision=Number(rfq.revision)+1;scopeVersion+=body.classification==='material'?1:0;
        await tx.query('INSERT INTO rfq_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,revision,scopeVersion,snapshot,body.classification,body.reason,actor.id,now.toISOString()]);
        await tx.query('UPDATE rfq_publications SET revision=$1,scope_version=$2 WHERE job_id=$3',[revision,scopeVersion,id]);
        await tx.query('UPDATE rfq_intakes SET public_description=$1,version=$2,updated_at=$3 WHERE job_id=$4',[snapshot.publicDescription,job.version+1,now.toISOString(),id]);
        await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);
        await enqueue(tx,'rfq.changed',id,{revision,scopeVersion,roundId:rfq.round_id,requiresReconfirmation:body.classification==='material'},now);
      }
      await tx.query('INSERT INTO question_responses VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[responseId,questionId,body.outcome,body.outcome==='answered'?body.publicQuestion.trim():null,body.outcome==='answered'?body.publicAnswer.trim():null,body.outcome==='answered'?body.classification:null,body.reason.trim(),revision,actor.id,now.toISOString()]);
      await tx.query('UPDATE job_questions SET state=$1,version=version+1 WHERE id=$2',[body.outcome,questionId]);await finishResponse(tx,String(q.task_id));
      await createAttention(tx,now,{kind:'question.outcome',resourceId:questionId,organisationId:String(q.organisation_id),ownerRole:'contractor',action:body.outcome==='answered'?'A sanitized factual answer has been published. Review the current RFQ scope.':'The estate has declined this information request.',informational:true});
      await audit(tx,actor,'question.answer',questionId,{state:'pending'},{state:body.outcome,responseId,rfqRevision:revision,scopeVersion},meta.requestId,now,body.reason);
      return {jobId:id,questionId,version:Number(q.version)+1,jobVersion:job.version+(body.outcome==='answered'?1:0),rfqRevision:revision,scopeVersion};
    });
  }
  async requestVisit(token:string,meta:WorkspaceCommand,id:string,body:{rfqRevision:number;reason:string}) {
    return this.commands.run(token,meta,'visit.request',{id,...body},async(tx,actor)=>{await contractorRfq(tx,actor,id,this.now());},async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);const rfq=await contractorRfq(tx,actor,id,this.now());requireVersion(Number(rfq.revision),body.rfqRevision);
      if(!(await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND round_id=$2 AND organisation_id=$3 LIMIT 1',[id,rfq.round_id,actor.context!.organisation_id])).length)throw new AppError(409,'INITIAL_QUOTE_REQUIRED','Submit an initial quote before requesting a site visit');
      if((await tx.query("SELECT id FROM visit_requests WHERE job_id=$1 AND round_id=$2 AND organisation_id=$3 AND state='pending'",[id,rfq.round_id,actor.context!.organisation_id])).length)throw new AppError(409,'VISIT_PENDING','A visit request is already pending');
      const now=this.now(),visitId=randomUUID(),reason=requiredText(body.reason),owner=await selectionOwner(tx,id),[job]=await tx.query('SELECT estate_id FROM job_records WHERE id=$1',[id]);
      const taskId=await responseTask(tx,now,{kind:'visit.response',resourceId:visitId,estateId:String(job!.estate_id),ownerRole:owner,action:'Approve or decline a contractor site visit',rule:'T22'});
      await tx.query("INSERT INTO visit_requests VALUES($1,$2,$3,$4,$5,'pending',1,$6,$7,$8)",[visitId,id,rfq.round_id,actor.context!.organisation_id,reason,taskId,actor.id,now.toISOString()]);
      await audit(tx,actor,'visit.request',visitId,null,{jobId:id,reason},meta.requestId,now);return {jobId:id,visitId,version:1};
    });
  }
  async decideVisit(token:string,meta:WorkspaceCommand,id:string,visitId:string,body:{outcome:'approved'|'declined';reason:string;visitAt?:string;confirmed:boolean}) {
    return this.commands.run(token,meta,'visit.decide',{id,visitId,...body},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      await estateAuthority(tx,actor,id);const rfq=await publication(tx,id),[visit]=await tx.query('SELECT * FROM visit_requests WHERE id=$1 AND job_id=$2',[visitId,id]);if(!visit)throw unavailable();requireVersion(Number(visit.version),meta.expectedVersion);
      if(visit.state!=='pending'||rfq.status!=='open'||visit.round_id!==rfq.round_id)throw new AppError(409,'VISIT_CLOSED','This visit is no longer awaiting a decision');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the visit decision and any estate-location reveal');
      const now=this.now(),decisionId=randomUUID(),visitAt=body.visitAt?explicitInstant(body.visitAt):null;
      if(body.outcome==='approved'&&!(await eligibility(tx,String(visit.organisation_id),(rfq.snapshot as Intake).categories,now)).eligible)throw new AppError(409,'CONTRACTOR_RESTRICTED','The contractor is no longer eligible for this visit');
      if(visitAt&&visitAt<=now)throw new AppError(422,'FIELD_VALIDATION','Choose a future agreed visit time');
      await tx.query('INSERT INTO visit_decisions VALUES($1,$2,$3,$4,$5,$6,$7)',[decisionId,visitId,body.outcome,visitAt?.toISOString()??null,body.reason.trim(),actor.id,now.toISOString()]);
      await tx.query('UPDATE visit_requests SET state=$1,version=version+1 WHERE id=$2',[body.outcome,visitId]);await finishResponse(tx,String(visit.task_id));
      if(body.outcome==='approved')await revealLocation(tx,actor,id,String(visit.organisation_id),'visit',decisionId,now);
      await createAttention(tx,now,{kind:'visit.outcome',resourceId:visitId,organisationId:String(visit.organisation_id),ownerRole:'contractor',action:body.outcome==='approved'?'Your site visit was approved. The permitted estate location is now available.':'Your site visit request was declined.',informational:true});
      await audit(tx,actor,'visit.decide',visitId,{state:'pending'},{outcome:body.outcome,decisionId,visitAt:visitAt?.toISOString()??null},meta.requestId,now,body.reason);return {jobId:id,visitId,version:Number(visit.version)+1};
    });
  }
}
