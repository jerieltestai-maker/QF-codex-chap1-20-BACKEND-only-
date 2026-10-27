import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {workAccess,readWork,contractorOnly,type WorkState} from './work-core.js';
import {completion,reviewer,readyFile,observedDate} from './completion-core.js';
import {adminOnly,createAttention} from './verification-service.js';
import {responseTask,finishResponse} from './procurement-clocks.js';
import {feedbackTimers,feedbackEvent,stopFeedbackTask} from './feedback-core.js';
import {refreshReputation,saveEntry,entryProjection,currentEntry} from './reputation-core.js';
import {maskedName} from './quote-service.js';
import {explicitInstant} from './calendar.js';

export class FeedbackService {
  constructor(readonly commands:CommandService) {}
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:unknown,role:(a:Actor)=>void,work:(tx:Sql,a:Actor,w:WorkState)=>Promise<Record<string,unknown>|void>) {
    return this.commands.run(token,meta,intent,{id,...body as object},async(tx,a)=>{await workAccess(tx,a,id);role(a);},async(tx,a)=>{
      const w=await workAccess(tx,a,id);requireVersion(w.version,meta.expectedVersion);
      const result=await work(tx,a,w),now=this.commands.now();
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);
      await refreshReputation(tx,w.organisation_id,now);
      return {jobId:id,version:(await readWork(tx,id)).version,...result};
    });
  }
  async submit(token:string,meta:WorkspaceCommand,id:string,body:{obligationVersion:number;outcome:'rated'|'unable';rating?:number;observation:string;confirmed:boolean}) {
    return this.run(token,meta,id,'feedback.submit',body,reviewer,async(tx,a,w)=>{
      const now=this.commands.now();await feedbackTimers(tx,now,id);
      const [obligation]=await tx.query('SELECT * FROM feedback_obligations WHERE job_id=$1',[id]);
      if(!obligation||obligation.status!=='due'||new Date(obligation.due_at as string)>now)throw new AppError(409,'FEEDBACK_NOT_DUE','Feedback becomes available only when due and cannot be submitted twice');
      requireVersion(Number(obligation.version),body.obligationVersion);
      const observation=requiredText(body.observation);
      if(!body.confirmed||!['rated','unable'].includes(body.outcome)||
        (body.outcome==='rated'?(!Number.isInteger(body.rating)||body.rating!<1||body.rating!>5):body.rating!==undefined))
        throw new AppError(422,'FIELD_VALIDATION','Confirm a 1–5 rating and observation, or Unable to assess with explanation and no rating');
      const entryId=await saveEntry(tx,a,w.organisation_id,id,'durability',{outcome:body.outcome,...(body.outcome==='rated'?{rating:body.rating}:{}),observation,anchor:obligation.anchor,dueAt:new Date(obligation.due_at as string).toISOString()},now);
      await tx.query("UPDATE feedback_obligations SET status='submitted',submitted_at=$1,version=version+1 WHERE job_id=$2",[now.toISOString(),id]);
      await stopFeedbackTask(tx,obligation.task_id);
      await feedbackEvent(tx,id,'feedback.submitted',{entryId,outcome:body.outcome,observationDate:now.toISOString()},now,a);
      await audit(tx,a,'feedback.submit',id,{obligationVersion:obligation.version},{entryId,...body},meta.requestId,now);
      return {entryId};
    });
  }
  async requestAftercare(token:string,meta:WorkspaceCommand,id:string,body:{concern:string;requestedHelp:string;evidenceIds:string[]}) {
    return this.run(token,meta,id,'aftercare.request',body,reviewer,async(tx,a,w)=>{
      const c=await completion(tx,id);if(!c?.confirmed_version||!c.accepted_round||w.status==='cancelled')throw new AppError(409,'AFTERCARE_NOT_AVAILABLE','Accepted performed work and its confirmed invoice are required; cancellation aftercare needs its authorised settlement integration');
      const [existing]=await tx.query("SELECT id FROM aftercare_cases WHERE job_id=$1 AND status<>'resolved'",[id]);
      if(existing)throw new AppError(409,'AFTERCARE_ALREADY_OPEN','Use the existing unresolved aftercare case');
      const [repair]=await tx.query("SELECT o.id FROM support_obligations o JOIN support_requests s ON s.id=o.support_id WHERE s.job_id=$1 AND o.kind='repair' AND o.verified_at IS NULL AND o.superseded_at IS NULL",[id]);
      if(repair)throw new AppError(409,'REPAIR_ALREADY_OPEN','Use the existing outstanding support repair and its matching inspection before opening aftercare');
      const concern=requiredText(body.concern),help=requiredText(body.requestedHelp),now=this.commands.now(),caseId=randomUUID();
      for(const file of body.evidenceIds)await readyFile(tx,a,id,file,'evidence');
      await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[caseId,id,a.id,concern,now.toISOString()]);
      await tx.query("INSERT INTO support_cases(support_id,category,state,blocking,organisation_id) VALUES($1,'quality_remedy','review',false,$2)",[caseId,w.organisation_id]);
      const [lastAccepted]=await tx.query("SELECT MAX(round) AS round FROM inspections WHERE job_id=$1 AND outcome='accepted'",[id]);
      await tx.query('INSERT INTO aftercare_cases(id,job_id,requested_help,evidence_ids,originating_round) VALUES($1,$2,$3,$4,$5)',[caseId,id,help,body.evidenceIds,lastAccepted!.round]);
      await this.caseTask(tx,w,caseId,'aftercare.review','admin','Review the aftercare concern and requested help. A report or low rating does not establish liability.',now);
      await feedbackEvent(tx,id,'aftercare.requested',{caseId,concern,requestedHelp:help,evidenceIds:body.evidenceIds},now,a);
      await audit(tx,a,'aftercare.request',id,null,{caseId,concern,requestedHelp:help},meta.requestId,now);return {caseId};
    });
  }
  async correct(token:string,meta:WorkspaceCommand,id:string,body:{entryVersion:number;outcome:'rated'|'unable';rating?:number;observation:string;correctionReason:string;confirmed:boolean}) {
    return this.run(token,meta,id,'feedback.correct',body,reviewer,async(tx,a,w)=>{
      const [row]=await tx.query("SELECT id FROM reputation_entries WHERE job_id=$1 AND kind='durability'",[id]);if(!row)throw new AppError(409,'NO_FEEDBACK','Submit due feedback before correcting it');
      const e=await currentEntry(tx,String(row.id));requireVersion(e.current_version,body.entryVersion);
      const observation=requiredText(body.observation),reason=requiredText(body.correctionReason),now=this.commands.now();
      if(!body.confirmed||(body.outcome==='rated'?(!Number.isInteger(body.rating)||body.rating!<1||body.rating!>5):body.outcome!=='unable'||body.rating!==undefined))throw new AppError(422,'FIELD_VALIDATION','Confirm a valid rating/observation or a non-rating exception');
      const entryId=await saveEntry(tx,a,w.organisation_id,id,'durability',{...e.facts,outcome:body.outcome,rating:body.outcome==='rated'?body.rating:null,observation,correctionReason:reason},now,
        {id:e.id,version:e.current_version,observedAt:new Date(e.observed_at as string).toISOString()});
      await feedbackEvent(tx,id,'feedback.corrected',{entryId,entryVersion:e.current_version+1,reason,originalObservationAt:e.observed_at},now,a);
      await audit(tx,a,'feedback.correct',id,{entryId,entryVersion:e.current_version},{entryVersion:e.current_version+1,reason,originalObservationAt:e.observed_at},meta.requestId,now,reason);return {entryId};
    });
  }
  private async caseTask(tx:Sql,w:WorkState,caseId:string,kind:string,role:'admin'|'cm'|'contractor',action:string,now:Date,round=1) {
    const taskId=role==='admin'?await createAttention(tx,now,{kind,resourceId:w.job_id,estateId:w.estate_id,action}):
      await responseTask(tx,now,{kind,resourceId:w.job_id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action,rule:role==='cm'?'T08':'T09',requiredVersion:round});
    await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[caseId,taskId]);return taskId;
  }
  private async exactCase(tx:Sql,id:string,caseId:string) {
    const [c]=await tx.query("SELECT * FROM aftercare_cases WHERE id=$1 AND job_id=$2 AND status<>'resolved'",[caseId,id]);
    if(!c)throw new AppError(409,'AFTERCARE_NOT_ACTIONABLE','No unresolved matching aftercare case');return c;
  }
  private async finishCaseTasks(tx:Sql,caseId:string) {
    for(const t of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND status='open'",[caseId]))await finishResponse(tx,String(t.id));
  }
  async remedy(token:string,meta:WorkspaceCommand,id:string,body:{caseId:string;description:string;evidenceIds:string[];completedAt:string;confirmed:boolean}) {
    return this.run(token,meta,id,'aftercare.remedy',body,contractorOnly,async(tx,a,w)=>{
      const c=await this.exactCase(tx,id,body.caseId),now=this.commands.now();
      if(c.status!=='remedy'||!body.confirmed)throw new AppError(409,'REMEDY_NOT_ACTIONABLE','Admin must request a physical remedy before its deliberate resubmission');
      const description=requiredText(body.description),[origin]=await tx.query('SELECT completed_at FROM completion_rounds WHERE job_id=$1 AND round=$2',[id,c.current_round??c.originating_round]);
      const occurred=observedDate(body.completedAt,now,new Date(origin!.completed_at as string));explicitInstant(body.completedAt);
      for(const f of body.evidenceIds)await readyFile(tx,a,id,f,'evidence');
      const [last]=await tx.query('SELECT MAX(round) AS round FROM completion_rounds WHERE job_id=$1',[id]),round=Number(last!.round)+1;
      await tx.query('INSERT INTO completion_rounds VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,round,w.terms_version,w.scope,occurred.at.toISOString(),a.id,now.toISOString(),body.evidenceIds,c.current_round??c.originating_round]);
      await tx.query("UPDATE aftercare_cases SET status='inspection',current_round=$1 WHERE id=$2",[round,c.id]);
      await tx.query("UPDATE support_cases SET state='execution',version=version+1 WHERE support_id=$1",[c.id]);
      await this.finishCaseTasks(tx,String(c.id));
      await this.caseTask(tx,w,String(c.id),'aftercare.inspect','cm','Inspect the new physical aftercare remedy against the originating findings. This does not repeat the invoice or payment cycle.',now,round);
      await feedbackEvent(tx,id,'aftercare.remedy-submitted',{caseId:c.id,round,originatingRound:c.current_round??c.originating_round,description,completedAt:occurred.value,evidenceIds:body.evidenceIds},now,a);
      await audit(tx,a,'aftercare.remedy',id,{caseId:c.id,status:c.status},{round,description},meta.requestId,now);return {round};
    });
  }
  async inspect(token:string,meta:WorkspaceCommand,id:string,body:{caseId:string;round:number;outcome:'accepted'|'unsatisfactory';findings:string;scopeReviewed:boolean;evidenceReviewed:boolean;confirmed:boolean}) {
    return this.run(token,meta,id,'aftercare.inspect',body,reviewer,async(tx,a,w)=>{
      const c=await this.exactCase(tx,id,body.caseId),now=this.commands.now();
      if(c.status!=='inspection'||Number(c.current_round)!==body.round)throw new AppError(412,'ROUND_CHANGED','Inspect the exact current aftercare round');
      if(!body.confirmed||!body.scopeReviewed||!body.evidenceReviewed)throw new AppError(422,'CONFIRMATION_REQUIRED','Review the remedy scope/evidence and confirm this outcome');
      const findings=body.outcome==='unsatisfactory'?requiredText(body.findings):body.findings.trim();
      await tx.query('INSERT INTO inspections VALUES($1,$2,$3,$4,$5,$6,$7)',[id,body.round,body.outcome,{scopeReviewed:true,evidenceReviewed:true,aftercareCaseId:c.id},findings,a.id,now.toISOString()]);
      await this.finishCaseTasks(tx,String(c.id));
      await tx.query('UPDATE aftercare_cases SET status=$1 WHERE id=$2',[body.outcome==='accepted'?'review':'remedy',c.id]);
      await tx.query("UPDATE support_cases SET state=$1,version=version+1 WHERE support_id=$2",[body.outcome==='accepted'?'review':'execution',c.id]);
      await this.caseTask(tx,w,String(c.id),body.outcome==='accepted'?'aftercare.verify':'aftercare.remedy',body.outcome==='accepted'?'admin':'contractor',body.outcome==='accepted'?'Verify the accepted matching remedy and any outstanding case obligations before resolution.':'Respond to the originating findings and resubmit physical corrections for another inspection.',now,body.round);
      await feedbackEvent(tx,id,'aftercare.inspected',{...body,actorRole:a.context!.role},now,a);
      await audit(tx,a,'aftercare.inspect',id,{round:body.round},{caseId:c.id,outcome:body.outcome,findings},meta.requestId,now);
    });
  }
  async decide(token:string,meta:WorkspaceCommand,id:string,body:{caseId:string;outcome:'physical_remedy'|'explanation'|'resolved';reason:string;executionEvidence:string}) {
    return this.run(token,meta,id,'aftercare.decide',body,adminOnly,async(tx,a,w)=>{
      const c=await this.exactCase(tx,id,body.caseId),now=this.commands.now(),reason=requiredText(body.reason),evidence=requiredText(body.executionEvidence);
      if((await tx.query('SELECT id FROM support_obligations WHERE support_id=$1 AND verified_at IS NULL AND superseded_at IS NULL',[c.id])).length)throw new AppError(409,'OBLIGATIONS_OUTSTANDING','Verify all linked support execution obligations before changing or resolving aftercare');
      if(body.outcome==='resolved') {
        const [accepted]=await tx.query("SELECT round FROM inspections WHERE job_id=$1 AND round=$2 AND outcome='accepted'",[id,c.current_round??0]);
        if(!accepted||c.status!=='review')throw new AppError(409,'INSPECTION_REQUIRED','Resolve physical aftercare only after successful inspection of this same current remedy');
      } else if(body.outcome==='explanation'&&(c.current_round||c.status!=='review'))throw new AppError(409,'INSPECTION_REQUIRED','An outstanding physical remedy cannot be replaced by an explanation-only resolution');
      if(body.outcome==='physical_remedy'&&c.status==='inspection')throw new AppError(409,'INSPECTION_REQUIRED','Inspect the submitted remedy before requesting another');
      await this.finishCaseTasks(tx,String(c.id));
      await tx.query('UPDATE aftercare_cases SET status=$1 WHERE id=$2',[body.outcome==='physical_remedy'?'remedy':'resolved',c.id]);
      await tx.query('UPDATE support_cases SET state=$1,version=version+1 WHERE support_id=$2',[body.outcome==='physical_remedy'?'execution':'resolved',c.id]);
      if(body.outcome==='physical_remedy')await this.caseTask(tx,w,String(c.id),'aftercare.remedy','contractor','Respond to Admin findings and submit the physical remedy for a new inspection.',now,Number(c.current_round??c.originating_round));
      await feedbackEvent(tx,id,'aftercare.'+body.outcome,{caseId:c.id,reason,executionEvidence:evidence,verifiedRound:c.current_round},now,a);
      await audit(tx,a,'aftercare.decide',id,{caseId:c.id,status:c.status},{outcome:body.outcome,reason,executionEvidence:evidence,verifiedRound:c.current_round},meta.requestId,now,reason);
    });
  }
  async detail(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx),w=await workAccess(tx,a,id);
      await feedbackTimers(tx,this.commands.now(),id);
      const [obligation]=await tx.query('SELECT f.*,t.first_issued_at FROM feedback_obligations f LEFT JOIN tasks t ON t.id=f.task_id WHERE f.job_id=$1',[id]);
      const identity=await maskedName(tx,a,id,w.organisation_id),masked=identity.masked;
      const entries=[];for(const row of await tx.query('SELECT id FROM reputation_entries WHERE job_id=$1 ORDER BY kind',[id]))entries.push(await entryProjection(tx,a,String(row.id),false,masked));
      const cases=await tx.query('SELECT a.*,s.description FROM aftercare_cases a JOIN support_requests s ON s.id=a.id WHERE a.job_id=$1 ORDER BY s.created_at',[id]);
      const inspections=await tx.query(`SELECT i.round,i.outcome,i.findings,i.recorded_at,r.originating_round FROM inspections i JOIN completion_rounds r ON r.job_id=i.job_id AND r.round=i.round
        WHERE i.job_id=$1 AND EXISTS(SELECT 1 FROM aftercare_cases c WHERE c.job_id=i.job_id AND i.round>c.originating_round) ORDER BY i.round`,[id]);
      return {jobId:id,version:w.version,stage:w.stage,obligation:obligation??null,canSubmit:obligation?.status==='due'&&['cm','mcst'].includes(a.context!.role),entries:entries.filter(Boolean),
        cases:cases.map(c=>({...c,...(masked?{description:'Details withheld while identities are concealed.',requested_help:'Details withheld while identities are concealed.',evidence_ids:[]}: {})})),
        inspections:inspections.map(i=>({...i,...(masked?{findings:'Details withheld while identities are concealed.'}:{})})),serverTime:this.commands.now().toISOString()};
    });
  }
}
