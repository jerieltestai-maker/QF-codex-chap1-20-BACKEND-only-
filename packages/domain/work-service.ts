import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {adminOnly,createAttention,eligibility} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {explicitInstant} from './calendar.js';
import {publication,maskedName} from './quote-service.js';
import {variationEvaluation} from './integrity-core.js';
import type {Intake} from './rfq-service.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';
import {activeWork,agreeStartTask,bumpWork,contractorOnly,interruptWork,readWork,stopStartTasks,workAccess,workEvent,type WorkState} from './work-core.js';
import {authorizedTask} from './task-service.js';
import {completionWaiting} from './completion-core.js';
import {supportWaiting} from './workspace-service.js';

export class WorkService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  async detail(token:string,id:string) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');const actor=await this.identity.actor(token,tx),w=await workAccess(tx,actor,id);
      const identity=await maskedName(tx,actor,id,w.organisation_id),identifiers=identity.masked?await contractorIdentifiers(tx,w.organisation_id):[];
      const project=(value:unknown):unknown=>{
        if(value instanceof Date)return value.toISOString();
        if(typeof value==='string')return identity.masked?concealedText(value,identifiers):value;
        if(Array.isArray(value))return value.map(project);
        if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['organisation_id','authorisation_id','actor_id','proposer_id'].includes(key)).map(([key,v])=>[key,identity.masked&&key==='fileIds'?[]:project(v)]));
        return value;
      };
      const terms=await tx.query('SELECT t.*,u.name AS actor_name FROM work_terms t JOIN users u ON u.id=t.actor_id WHERE t.job_id=$1 ORDER BY t.version',[id]);
      const events=await tx.query(`SELECT e.*,u.name AS actor_name FROM work_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.job_id=$1 ORDER BY e.recorded_at,e.id`,[id]);
      const variations=await tx.query(`SELECT v.*,p.proposal,p.base_terms_version,p.contractor_confirmed FROM variations v JOIN variation_versions p ON p.variation_id=v.id AND p.version=v.current_version WHERE v.job_id=$1 ORDER BY v.id`,[id]);
      const versions=await tx.query(`SELECT p.*,u.name AS actor_name FROM variation_versions p JOIN variations v ON v.id=p.variation_id JOIN users u ON u.id=p.actor_id WHERE v.job_id=$1 ORDER BY p.variation_id,p.version`,[id]);
      const decisions=await tx.query(`SELECT d.*,u.name AS actor_name FROM variation_decisions d JOIN variations v ON v.id=d.variation_id LEFT JOIN users u ON u.id=d.actor_id WHERE v.job_id=$1 ORDER BY d.recorded_at,d.id`,[id]);
      const pending=variations.find(v=>['terms','decision'].includes(String(v.state)));
      const [interruptionTask]=w.interruption_id?await tx.query("SELECT owner_role,action FROM tasks WHERE support_id=$1 AND status='open' ORDER BY created_at DESC LIMIT 1",[w.interruption_id]):[];
      const waitingOn=await supportWaiting(tx,actor,id)??(w.status==='cancelled'?{role:'none',action:'work is cancelled'}:w.status==='interrupted'?{role:interruptionTask?.owner_role??'admin',action:interruptionTask?.action??'review interruption of works'}:pending?{role:pending.state==='terms'?'contractor':pending.approver_role,action:pending.state==='terms'?'confirm scope, price and timing':'review the exact proposed variation'}:completionWaiting(w.stage)??{role:'contractor',action:w.started_at?'complete the authorised work':w.scheduled_start_at?'begin at the agreed start time':'propose an agreed start or begin the authorised work'});
      if(w.integrity_paused&&w.status!=='cancelled')Object.assign(waitingOn,{role:'mcst',action:'review the procurement warning and explicitly clear continuation; ordinary work is paused'});
      if(pending?.kind==='scope_price'&&actor.context?.role!=='contractor') {
        const rfq=await publication(tx,id);pending.integrityPreview=await variationEvaluation(tx,id,String(rfq.round_id),pending.proposal as Parameters<typeof variationEvaluation>[3],String(w.amount_cents));
      }
      const notices=await tx.query("SELECT id,kind,owner_role,action,version FROM tasks WHERE resource_id=$1 AND kind LIKE 'work.%' AND status='open'",[id]);
      const evidence=identity.masked?[]:await tx.query(`SELECT f.id,f.variant,f.media_type FROM job_attachments a JOIN file_objects f ON f.id=a.file_id
        JOIN upload_intents u ON u.id=f.upload_id WHERE a.job_id=$1 AND u.state='ready' AND u.purpose='evidence' AND u.work_organisation_id=$2 ORDER BY a.attached_at,f.id`,[id,w.organisation_id]);
      const proposingParty=(v:Record<string,unknown>)=>v.proposer_id===actor.id||actor.context?.role===v.proposer_role||(actor.context?.role==='mcst'&&v.proposer_role==='cm')||actor.context?.role==='admin';
      return {jobId:id,version:w.version,contractor:identity,evidence,state:project({...w,amount_cents:Number(w.amount_cents),mcst_authorised_cents:w.mcst_authorised_cents===null?null:Number(w.mcst_authorised_cents)}),terms:project(terms),events:project(events.map(e=>({...e,actor_name:identity.masked&&e.actor_role==='contractor'?identity.name:e.actor_name}))),variations:project(variations.map(v=>({...v,canWithdraw:proposingParty(v),canRevise:proposingParty(v)||actor.context?.role==='contractor'}))),variationVersions:project(versions),decisions:project(decisions),notices:project(notices),waitingOn:project(waitingOn),serverTime:this.now().toISOString()};
    });
  }
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:unknown,role:(actor:Actor)=>void,work:(tx:import('../infrastructure/database.js').Sql,actor:Actor,w:WorkState)=>Promise<Record<string,unknown>>) {
    return this.commands.run(token,meta,intent,{id,...body as object},async(tx,actor)=>{await workAccess(tx,actor,id);role(actor);},async(tx,actor)=>{
      const w=await workAccess(tx,actor,id);requireVersion(w.version,meta.expectedVersion);return work(tx,actor,w);
    });
  }
  async start(token:string,meta:WorkspaceCommand,id:string,body:{mode:'known'|'unknown';completedBy?:string;reason?:string;confirmed:boolean}) {
    return this.run(token,meta,id,'work.start',body,contractorOnly,async(tx,actor,w)=>{
      activeWork(w);if(w.started_at)throw new AppError(409,'ALREADY_STARTED','Start is already recorded');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm Start of the authorised work');
      const now=this.now(),rfq=await publication(tx,id);
      if(!(await eligibility(tx,w.organisation_id,(rfq.snapshot as Intake).categories,now,{selected:true})).eligible)throw new AppError(409,'CONTRACTOR_RESTRICTED','Required verification is not current. Request Admin review before Start');
      let target:string|null=null,reason:string|null=null,due:string|null=null;
      if(body.mode==='known') {
        if(body.reason)throw new AppError(422,'FIELD_VALIDATION','Choose only one completion-estimate alternative');
        const at=explicitInstant(body.completedBy??'');if(at<=now)throw new AppError(422,'FIELD_VALIDATION','Completed by must be after Start');target=at.toISOString();
      } else {
        if(body.completedBy)throw new AppError(422,'FIELD_VALIDATION','Choose only one completion-estimate alternative');
        reason=requiredText(body.reason??'');due=new Date(now.getTime()+86400000).toISOString();
      }
      await tx.query(`UPDATE work_state SET started_at=$1,completion_target_at=$2,completion_target_version=CASE WHEN $2::timestamptz IS NULL THEN 0 ELSE 1 END,
        unknown_reason=$3,estimate_due_at=$4,estimate_deadline_version=CASE WHEN $4::timestamptz IS NULL THEN 0 ELSE 1 END WHERE job_id=$5`,[now.toISOString(),target,reason,due,id]);
      await stopStartTasks(tx,id);
      // A proposed start schedule becomes obsolete after the explicit actual Start.
      for(const v of await tx.query("SELECT * FROM variations WHERE job_id=$1 AND kind='start_schedule' AND state IN ('terms','decision')",[id])) {
        if(v.task_id)await finishResponse(tx,String(v.task_id));
        await tx.query("UPDATE variations SET state='superseded' WHERE id=$1",[v.id]);
        await tx.query('INSERT INTO variation_decisions VALUES($1,$2,$3,\'superseded\',\'Actual Start recorded\',$4,$5,$6,$7,$8)',[randomUUID(),v.id,v.current_version,{scheduledStart:w.scheduled_start_at},{startedAt:now.toISOString()},actor.id,actor.context!.role,now.toISOString()]);
      }
      const eventId=await workEvent(tx,w,actor,'work.started',{completedBy:target,unknownReason:reason,estimateDueAt:due,termsVersion:w.terms_version},now,now.toISOString());
      const next=await readWork(tx,id),version=await bumpWork(tx,next,now);
      await audit(tx,actor,'work.start',id,{startedAt:null},{eventId,startedAt:now.toISOString(),completedBy:target,estimateDueAt:due,version},meta.requestId,now,reason??undefined);
      for(const role of ['cm','mcst'])await createAttention(tx,now,{kind:'work.started',resourceId:id,estateId:w.estate_id,ownerRole:role,action:'The assigned Contractor recorded Start. Review the saved completion target or initial-estimate duty.',informational:true});
      return {jobId:id,version,eventId,startedAt:now.toISOString(),estimateDueAt:due};
    });
  }
  async initialEstimate(token:string,meta:WorkspaceCommand,id:string,body:{completedBy:string}) {
    return this.run(token,meta,id,'work.initial-estimate',body,contractorOnly,async(tx,actor,w)=>{
      activeWork(w);if(!w.started_at||w.completion_target_at)throw new AppError(409,'ESTIMATE_NOT_ACTIONABLE','Use a revised-target proposal for an existing completion estimate');
      const now=this.now(),target=explicitInstant(body.completedBy);if(target<=now)throw new AppError(422,'FIELD_VALIDATION','Supply a future completion date and time');
      await tx.query('UPDATE work_state SET completion_target_at=$1,completion_target_version=completion_target_version+1 WHERE job_id=$2',[target.toISOString(),id]);
      await workEvent(tx,w,actor,'work.initial-estimate',{completedBy:target.toISOString(),submissionDeadline:w.estimate_due_at,lateSubmission:!!w.estimate_due_at&&new Date(w.estimate_due_at)<now},now);
      const version=await bumpWork(tx,await readWork(tx,id),now);await audit(tx,actor,'work.initial-estimate',id,{completedBy:null},{completedBy:target.toISOString(),version},meta.requestId,now);
      for(const role of ['cm','mcst'])await createAttention(tx,now,{kind:'work.estimate-supplied',resourceId:id,estateId:w.estate_id,ownerRole:role,action:'The Contractor supplied the first completion estimate. Review its date and recorded submission time.',informational:true});
      return {jobId:id,version};
    });
  }
  async extendEstimate(token:string,meta:WorkspaceCommand,id:string,body:{dueAt:string;reason:string}) {
    return this.run(token,meta,id,'work.extend-estimate',body,adminOnly,async(tx,actor,w)=>{
      if(w.status==='cancelled'||w.completed_at||!w.started_at||w.completion_target_at||!w.estimate_due_at)throw new AppError(409,'ESTIMATE_NOT_ACTIONABLE','No temporary estimate-submission obligation is outstanding');
      const reason=requiredText(body.reason),now=this.now(),at=explicitInstant(body.dueAt);
      if(at<=now||at<=new Date(w.estimate_due_at))throw new AppError(422,'FIELD_VALIDATION','An extension must move the submission deadline forward into the future');
      await tx.query('UPDATE work_state SET estimate_due_at=$1,estimate_deadline_version=estimate_deadline_version+1 WHERE job_id=$2',[at.toISOString(),id]);
      await workEvent(tx,w,actor,'work.estimate-extension',{before:w.estimate_due_at,after:at.toISOString(),reason},now);
      const version=await bumpWork(tx,await readWork(tx,id),now);await audit(tx,actor,'work.extend-estimate',id,{dueAt:w.estimate_due_at},{dueAt:at.toISOString(),version},meta.requestId,now,reason);
      await createAttention(tx,now,{kind:'work.estimate-extension',resourceId:id,organisationId:w.organisation_id,ownerRole:'contractor',action:'Admin extended the first-estimate submission deadline. Review the new due time and reason; no completion target was invented.',informational:true});
      return {jobId:id,version};
    });
  }
  async update(token:string,meta:WorkspaceCommand,id:string,body:{note:string;occurredAt?:string;fileIds:string[]}) {
    return this.run(token,meta,id,'work.update',body,contractorOnly,async(tx,actor,w)=>{
      activeWork(w);if(!w.started_at)throw new AppError(409,'NOT_STARTED','Record Start before adding progress');
      const note=body.note.trim();if(!note&&!body.fileIds.length)throw new AppError(422,'FIELD_VALIDATION','Supply an optional note or ready evidence');
      const now=this.now(),occurred=body.occurredAt?explicitInstant(body.occurredAt):now;
      if(occurred>now||occurred<new Date(w.started_at))throw new AppError(422,'FIELD_VALIDATION','Progress occurrence must fall between recorded Start and now');
      for(const fileId of body.fileIds) {
        const [file]=await tx.query(`SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND u.job_id=$2 AND u.owner_id=$3 AND u.purpose='evidence' AND u.state='ready'`,[fileId,id,actor.id]);
        if(!file)throw new AppError(422,'FILE_NOT_READY','Use your ready evidence from this job');
      }
      const eventId=await workEvent(tx,w,actor,'work.progress',{note,fileIds:body.fileIds},now,occurred.toISOString());
      await audit(tx,actor,'work.update',id,null,{eventId},meta.requestId,now);
      // Optional evidence never changes the decision version or invalidates pending terms.
      return {jobId:id,version:w.version,eventId};
    });
  }
  async interrupt(token:string,meta:WorkspaceCommand,id:string,body:{reason:string;affectedWork:string}) {
    return this.run(token,meta,id,'work.interrupt',body,()=>{},async(tx,actor,w)=>{
      const description=requiredText(body.reason)+'\nAffected work: '+requiredText(body.affectedWork),now=this.now();
      const supportId=await interruptWork(tx,w,actor,description,now,meta.requestId),version=await bumpWork(tx,await readWork(tx,id),now);
      for(const role of ['cm','mcst','contractor'])await createAttention(tx,now,{kind:'work.interruption-notice',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action:'Work is unable to continue. Review the interruption and actual next action; existing authorised terms are preserved.',informational:true});
      return {jobId:id,version,supportId};
    });
  }
  async verdict(token:string,meta:WorkspaceCommand,id:string,body:{outcome:'resume'|'follow_up';reason:string;safeAndFeasible:boolean;nextAction?:string;followUpAt?:string;ownerRole?:'cm'|'mcst'|'contractor'|'admin'}) {
    return this.run(token,meta,id,'work.verdict',body,adminOnly,async(tx,actor,w)=>{
      if(w.status!=='interrupted')throw new AppError(409,'NO_INTERRUPTION','No unresolved work interruption to review');
      const reason=requiredText(body.reason),now=this.now();let taskId:string|null=null;
      if(body.outcome==='resume') {
        if(!body.safeAndFeasible)throw new AppError(422,'CONFIRMATION_REQUIRED','Explicitly confirm authorised work can safely and feasibly resume');
        await tx.query("UPDATE work_state SET status='active',interruption_id=NULL WHERE job_id=$1",[id]);
        for(const t of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND status='open'",[w.interruption_id]))await finishResponse(tx,String(t.id));
      } else {
        const at=explicitInstant(body.followUpAt??''),action=requiredText(body.nextAction??'');
        if(at<=now||!body.ownerRole)throw new AppError(422,'FIELD_VALIDATION','Name the next actor/action and a future follow-up');
        for(const t of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND status='open'",[w.interruption_id]))await finishResponse(tx,String(t.id));
        taskId=await createAttention(tx,now,{kind:'work.interruption-follow-up',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:body.ownerRole,action});
        await tx.query('UPDATE tasks SET support_id=$1,next_action=$2,follow_up_at=$3 WHERE id=$4',[w.interruption_id,action,at.toISOString(),taskId]);
        await tx.query("INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key) VALUES($1,$2,1,'T11','T11-v1',$3,$4,$5)",[randomUUID(),taskId,now.toISOString(),at.toISOString(),`T11:${taskId}:follow-up`]);
      }
      await workEvent(tx,w,actor,'work.verdict',{...body,taskId,supportId:w.interruption_id},now);
      const version=await bumpWork(tx,await readWork(tx,id),now);
      await audit(tx,actor,'work.verdict',id,{status:w.status},{outcome:body.outcome,taskId,version},meta.requestId,now,reason);
      await agreeStartTask(tx,await readWork(tx,id),now);
      for(const role of ['cm','mcst','contractor'])await createAttention(tx,now,{kind:'work.verdict-notice',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action:body.outcome==='resume'?'Admin explicitly authorised safe and feasible resumption under the retained work authority.':'Admin recorded an unresolved work verdict with a named next action and follow-up.',informational:true});
      return {jobId:id,version,taskId};
    });
  }
  async notice(token:string,meta:WorkspaceCommand,id:string,body:{taskId:string;outcome:'okay'|'intervention';reason?:string}) {
    return this.commands.run(token,meta,'work.notice',{id,...body},async(tx,actor)=>{await workAccess(tx,actor,id);await authorizedTask(tx,actor,body.taskId);},async(tx,actor)=>{
      const w=await workAccess(tx,actor,id),task=await authorizedTask(tx,actor,body.taskId);requireVersion(task.version,meta.expectedVersion);
      if(task.resource_id!==id||task.status!=='open'||!['work.T20.estate','work.T23.estate'].includes(String(task.kind)))throw new AppError(409,'NOTICE_NOT_ACTIONABLE','This outstanding work notice is no longer actionable');
      const now=this.now();await finishResponse(tx,task.id);let supportId:string|null=null;
      if(body.outcome==='intervention') {
        // Support alone does not pause work or change its accepted target.
        const reason=requiredText(body.reason??'');
        const [existing]=await tx.query("SELECT support_id FROM tasks WHERE resource_id=$1 AND kind='work.support' AND status='open'",[id]);
        supportId=existing?.support_id?String(existing.support_id):randomUUID();
        if(!existing) {
          await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[supportId,id,actor.id,reason,now.toISOString()]);
          const taskId=await createAttention(tx,now,{kind:'work.support',resourceId:id,estateId:w.estate_id,action:'Review the requested work schedule support'});
          await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,taskId]);
        }
      }
      await workEvent(tx,w,actor,'work.notice-response',{taskId:task.id,outcome:body.outcome,supportId,reason:body.reason??'',targetUnchanged:w.completion_target_at},now);
      await audit(tx,actor,'work.notice',id,{taskId:task.id},{outcome:body.outcome,supportId},meta.requestId,now);
      return {jobId:id,version:w.version,taskId:task.id,...(supportId?{supportId}:{})};
    });
  }
}
