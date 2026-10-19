import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {canRead,requireCapability,type Actor} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedOrganisation,adminOnly} from './verification-service.js';
import {authorizedTask} from './task-service.js';
import {workAccess} from './work-core.js';
import {completionWaiting} from './completion-core.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';
import {authorizedExport} from './export-service.js';
import {workHeld} from './integrity-core.js';
import {financialAccess} from './support-core.js';

export interface Job extends Record<string,unknown> {id:string;estate_id:string;version:number;title:string;observations:string;affected_location:string}
export interface DraftFields {title:string;observations:string;affectedLocation:string}
const unavailable=()=>new AppError(404,'NOT_FOUND','Resource unavailable');
export async function authorizedJob(sql:Sql,actor:Actor,id:string):Promise<Job> {
  const [job]=await sql.query<Job>('SELECT * FROM job_records WHERE id=$1',[id]);
  if(!job || !canRead(actor,{estateId:job.estate_id}))throw unavailable();
  return job;
}
export async function authorizedSupport(sql:Sql,actor:Actor,id:string) {
  const [support]=await sql.query('SELECT s.*,COALESCE(j.estate_id,s.estate_id) AS estate_id FROM support_requests s LEFT JOIN job_records j ON j.id=s.job_id WHERE s.id=$1',[id]);
  const [domainCase]=support?await sql.query('SELECT support_id,organisation_id FROM support_cases WHERE support_id=$1',[id]):[];
  if(support&&domainCase) {
    const subjects={subjectUserIds:support.subject_user_ids as string[],subjectOrganisationIds:support.subject_organisation_ids as string[]};
    if(!canRead(actor,{...(actor.context?.role==='contractor'?{organisationId:actor.context.organisation_id!}:{estateId:String(support.estate_id)}),...subjects}))throw unavailable();
    if(actor.context?.role==='admin')return support;
    if(support.reporter_id===actor.id)return support;
    if(support.privacy==='confidential') {if((await sql.query('SELECT user_id FROM support_access WHERE support_id=$1 AND user_id=$2',[id,actor.id])).length)return support;throw unavailable();}
    if(actor.context?.role!=='contractor')return support;
    if(domainCase.organisation_id===actor.context.organisation_id)return support;throw unavailable();
  }
  if(support&&actor.context?.role==='contractor'&&support.privacy==='ordinary') {
    const [linked]=await sql.query("SELECT id,kind FROM tasks WHERE support_id=$1 AND (kind LIKE 'work.%' OR kind='variation.support' OR kind LIKE 'payment.%' OR kind LIKE 'aftercare.%') LIMIT 1",[id]);
    if(linked&&canRead(actor,{organisationId:actor.context.organisation_id!,subjectUserIds:support.subject_user_ids as string[],subjectOrganisationIds:support.subject_organisation_ids as string[]})) {
      if(String(linked.kind).startsWith('payment.'))await financialAccess(sql,actor,String(support.job_id));
      else await workAccess(sql,actor,String(support.job_id));return support;
    }
  }
  if(!support || !canRead(actor,{estateId:String(support.estate_id),subjectUserIds:support.subject_user_ids as string[],subjectOrganisationIds:support.subject_organisation_ids as string[]}) ||
    (support.privacy==='confidential' && actor.context?.role!=='admin' && actor.id!==support.reporter_id))throw unavailable();
  return support;
}
export async function supportWaiting(sql:Sql,actor:Actor,id:string) {
  const tasks=await sql.query(`SELECT t.owner_role,t.action,t.support_id FROM tasks t JOIN support_cases c ON c.support_id=t.support_id JOIN support_requests s ON s.id=c.support_id
    WHERE s.job_id=$1 AND c.blocking=true AND c.state<>'resolved' AND t.status='open' AND t.kind<>'support.resolution-notice'
    ORDER BY CASE WHEN c.state='evidence' AND t.id=c.evidence_task_id THEN 0 WHEN c.state='review' AND t.kind='support.review' THEN 1 WHEN c.state='execution' AND t.kind IN ('completion.inspect','completion.response','support.verify','support.finish') THEN 2 ELSE 3 END,t.created_at DESC,t.id`,[id]);
  for(const t of tasks)try {await authorizedSupport(sql,actor,String(t.support_id));return {role:String(t.owner_role),action:String(t.action)};}catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
  return undefined;
}
export async function jobWaiting(sql:Sql,actor:Actor,job:Job,now:Date) {
  const id=job.id;
    const [creation]=await sql.query("SELECT actor_role FROM audit_events WHERE resource_id=$1 AND action='workspace.create' ORDER BY recorded_at,id LIMIT 1",[id]);
    const owner=creation?.actor_role==='mcst'?'mcst':'cm';
    const [clock]=await sql.query('SELECT c.status,c.scheduled_review_at FROM selection_clocks c JOIN rfq_publications p ON p.round_id=c.round_id WHERE p.job_id=$1',[id]);
    let waitingOn=job.stage==='MCST Reviewing selected Contractor'?{role:'mcst',action:'approve or reject the selected contractor'}:job.stage==='Starting work'?{role:'contractor',action:'start the authorised work'}:job.stage==='Rejected Contractor'?{role:owner,action:'reselect a valid quote or explicitly reopen quotations'}:job.is_group_source?{role:owner,action:'review and publish the linked repair tickets'}:job.stage==='Requesting for quotes'?(clock?.status==='active'?{role:owner,action:clock.scheduled_review_at&&new Date(clock.scheduled_review_at as string)>now?'review quotes on the scheduled date':'compare quotes and select a contractor'}:{role:'contractor',action:'submit quotations'}):
      job.stage==='AI is refining your draft'?{role:'system',action:'prepare the draft suggestion'}:
      job.stage==='Approving AI input'?{role:owner,action:'review the draft suggestion'}:{role:owner,action:'prepare the issue report'};
    const [work]=await sql.query('SELECT * FROM work_state WHERE job_id=$1',[id]);
    if(work) {
      const [pending]=await sql.query("SELECT state,approver_role FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[id]);
      const [task]=work.interruption_id?await sql.query("SELECT owner_role,action FROM tasks WHERE support_id=$1 AND status='open' ORDER BY created_at DESC LIMIT 1",[work.interruption_id]):[];
      waitingOn=work.status==='cancelled'?{role:'none',action:'work is cancelled'}:work.status==='interrupted'?{role:String(task?.owner_role??'admin'),action:String(task?.action??'review interruption of works')}:pending?{role:String(pending.state==='terms'?'contractor':pending.approver_role),action:pending.state==='terms'?'confirm scope, price and timing':'review the proposed variation'}:{role:'contractor',action:work.started_at?'complete the authorised work':work.scheduled_start_at?'begin at the agreed start time':'propose an agreed start or begin the authorised work'};
    }
    waitingOn=await supportWaiting(sql,actor,id)??completionWaiting(String(job.stage))??waitingOn;
    if(work&&work.status!=='cancelled'&&await workHeld(sql,id))waitingOn={role:'mcst',action:'review the procurement warning and explicitly clear continuation; ordinary work is paused'};
  return waitingOn;
}
export class WorkspaceService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  async list(token:string) {
    const actor=await this.identity.actor(token);
    if(!actor.context)return [];
    if(actor.context.role==='admin')return this.db.query('SELECT id,title,stage,version,estate_id FROM job_records ORDER BY created_at DESC,id LIMIT 100');
    if(actor.context.role==='contractor')return []; // RFQ opportunity access is bound in Chapter 06, never estate-wide.
    return this.db.query('SELECT id,title,stage,version,estate_id FROM job_records WHERE estate_id=$1 ORDER BY created_at DESC,id LIMIT 100',[actor.context.estate_id]);
  }
  async detail(token:string,id:string) {
    const actor=await this.identity.actor(token),job=await authorizedJob(this.db,actor,id);
    const secondaryActions=[];
    for(const task of await this.db.query("SELECT id,owner_role,action,support_id FROM tasks WHERE resource_id=$1 AND status='open' AND support_id IS NOT NULL",[id])) {
      try {await authorizedSupport(this.db,actor,String(task.support_id));secondaryActions.push({role:task.owner_role,action:task.action});}
      catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
    }
    const waitingOn=await jobWaiting(this.db,actor,job,this.now());
    return {job,waitingOn,secondaryActions,serverTime:this.now().toISOString(),attachments:await this.db.query(`SELECT f.id,f.variant,f.media_type,f.checksum,u.purpose
      FROM job_attachments a JOIN file_objects f ON f.id=a.file_id JOIN upload_intents u ON u.id=f.upload_id
      WHERE a.job_id=$1 ORDER BY a.attached_at,f.id`,[id])};
  }
  async history(token:string,id:string) {
    const actor=await this.identity.actor(token);await authorizedJob(this.db,actor,id);
    // Only explicitly job-scoped events; support descriptions, fees and access logs have separate scopes.
    const events=await this.db.query(`SELECT id,action,actor_id,actor_role,before_value,after_value,reason,recorded_at FROM audit_events
      WHERE resource_id=$1 AND action IN ('workspace.create','workspace.edit','file.attach','rfq.intake','rfq.publish','rfq.revise','rfq.split','rfq.refine','rfq.accept-refinement','rfq.coordinate') ORDER BY recorded_at,id LIMIT 200`,[id]);
    if(actor.context?.role==='cm'){const [estate]=await this.db.query('SELECT contractor_identities_visible FROM estates WHERE id=$1',[actor.context.estate_id]);if(!estate?.contractor_identities_visible)return events.filter(e=>e.action!=='rfq.coordinate');}
    return events;
  }
  async create(token:string,meta:WorkspaceCommand,body:DraftFields & {estateId:string}) {
    return this.commands.run(token,meta,'workspace.create',body,async(_tx,actor)=>{
      requireCapability(actor,'rfq.manage');
      if(!canRead(actor,{estateId:body.estateId}))throw unavailable();
    },async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);
      const fields={title:requiredText(body.title),observations:requiredText(body.observations),affectedLocation:requiredText(body.affectedLocation)};
      const id=randomUUID(),now=this.now();
      await tx.query(`INSERT INTO job_records(id,estate_id,created_by,title,observations,affected_location,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$7)`,[id,body.estateId,actor.id,fields.title,fields.observations,fields.affectedLocation,now.toISOString()]);
      await tx.query('INSERT INTO job_versions VALUES($1,1,$2,$3,$4)',[id,fields,actor.id,now.toISOString()]);
      await audit(tx,actor,'workspace.create',id,null,{...fields,version:1},meta.requestId,now);
      await enqueue(tx,'workspace.changed',id,{version:1},now);
      return {jobId:id,version:1,message:'Private workspace saved. RFQ publication is built in Chapter 06.'};
    });
  }
  async edit(token:string,meta:WorkspaceCommand,id:string,body:DraftFields) {
    return this.commands.run(token,meta,'workspace.edit',{id,...body},async(tx,actor)=>{
      requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);
    },async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if((await tx.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[id])).length)throw new AppError(409,'RFQ_REVISION_REQUIRED','Use the reviewed RFQ revision action after publication');
      const fields={title:requiredText(body.title),observations:requiredText(body.observations),affectedLocation:requiredText(body.affectedLocation)};
      const version=job.version+1,now=this.now();
      await tx.query("UPDATE job_records SET title=$1,observations=$2,affected_location=$3,version=$4,updated_at=$5,stage='Report an issue' WHERE id=$6",
        [fields.title,fields.observations,fields.affectedLocation,version,now.toISOString(),id]);
      await tx.query('INSERT INTO job_versions VALUES($1,$2,$3,$4,$5)',[id,version,fields,actor.id,now.toISOString()]);
      await tx.query("UPDATE ai_refinements SET state='superseded' WHERE job_id=$1 AND state='pending_review'",[id]);
      await audit(tx,actor,'workspace.edit',id,{title:job.title,observations:job.observations,affectedLocation:job.affected_location,version:job.version},{...fields,version},meta.requestId,now);
      await enqueue(tx,'workspace.changed',id,{version},now);
      return {jobId:id,version};
    });
  }
  async saveDraft(token:string,meta:WorkspaceCommand,body:{id:string;estateId:string;jobId?:string;baseVersion:number;fields:DraftFields}) {
    return this.commands.run(token,meta,'draft.save',body,async(tx,actor)=>{
      requireCapability(actor,'rfq.manage');
      if(!canRead(actor,{estateId:body.estateId}))throw unavailable();
      const [draft]=await tx.query('SELECT owner_id,estate_id FROM workspace_drafts WHERE id=$1',[body.id]);
      if(draft && (draft.owner_id!==actor.id || draft.estate_id!==body.estateId))throw unavailable();
      if(body.jobId) {const job=await authorizedJob(tx,actor,body.jobId);if(job.estate_id!==body.estateId)throw unavailable();}
    },async(tx,actor)=>{
      const [draft]=await tx.query('SELECT revision FROM workspace_drafts WHERE id=$1',[body.id]);
      requireVersion(Number(draft?.revision??0),meta.expectedVersion);
      const revision=meta.expectedVersion+1;
      await tx.query(`INSERT INTO workspace_drafts(id,owner_id,estate_id,job_id,base_version,revision,fields,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(id) DO UPDATE SET job_id=$4,base_version=$5,revision=$6,fields=$7,updated_at=$8`,
        [body.id,actor.id,body.estateId,body.jobId??null,body.baseVersion,revision,body.fields,this.now().toISOString()]);
      return {draftId:body.id,revision};
    });
  }
  async drafts(token:string) {
    const actor=await this.identity.actor(token);
    if(!actor.context || actor.context.role==='contractor')return [];
    return this.db.query('SELECT * FROM workspace_drafts WHERE owner_id=$1 AND estate_id=$2 ORDER BY updated_at DESC LIMIT 100',[actor.id,actor.context.estate_id]);
  }
  async support(token:string,meta:WorkspaceCommand,id:string,body:{description:string;privacy:'ordinary'|'confidential';subjectUserIds:string[];subjectOrganisationIds:string[]}) {
    return this.commands.run(token,meta,'support.submit',{id,...body},async(tx,actor)=>{await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if(body.privacy==='ordinary'&&(body.subjectUserIds.length||body.subjectOrganisationIds.length))throw new AppError(422,'FIELD_VALIDATION','Subject exclusions require confidential support');
      const supportId=randomUUID(),taskId=randomUUID(),now=this.now();
      await tx.query('INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,subject_user_ids,subject_organisation_ids,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [supportId,id,actor.id,requiredText(body.description),body.privacy,body.subjectUserIds,body.subjectOrganisationIds,now.toISOString()]);
      await tx.query(`INSERT INTO tasks(id,kind,resource_id,owner_role,status,rule_version,estate_id,support_id,action,actionable_at,created_at)
        VALUES($1,'admin.attention',$2,'admin','open','T18-v1',$3,$4,'Review support request',$5,$5)`,[taskId,id,job.estate_id,supportId,now.toISOString()]);
      await audit(tx,actor,'support.submit',supportId,null,{jobId:id,privacy:body.privacy},meta.requestId,now);
      await enqueue(tx,'notification.issue',taskId,{taskId,message:'A support request needs Admin review.',step:'initial'},now);
      return {supportId,taskId,jobId:id,message:body.privacy==='confidential'?'Sent to Admin. Reported subjects cannot see this report.':'Sent to the Admin attention queue.'};
    });
  }
  async supports(token:string,id:string) {
    const actor=await this.identity.actor(token);await authorizedJob(this.db,actor,id);
    const rows=await this.db.query('SELECT id FROM support_requests WHERE job_id=$1 ORDER BY created_at DESC LIMIT 100',[id]);
    const visible=[];
    for(const row of rows)try{visible.push(await authorizedSupport(this.db,actor,String(row.id)));}catch(error){if(!(error instanceof AppError && error.status===404))throw error;}
    if(actor.context?.role==='cm') {
      const [w]=await this.db.query('SELECT w.organisation_id,e.contractor_identities_visible FROM work_state w JOIN job_records j ON j.id=w.job_id JOIN estates e ON e.id=j.estate_id WHERE w.job_id=$1',[id]);
      if(w&&!w.contractor_identities_visible) {
        const identifiers=await contractorIdentifiers(this.db,String(w.organisation_id));
        return visible.map(s=>({...s,description:concealedText(String(s.description),identifiers)}));
      }
    }
    return visible;
  }
  async operation(token:string,id:string) {
    return this.commands.lookup(token,id,async(tx,actor,result,intent)=>{
      if(result.exportId){await authorizedExport(tx,actor,String(result.exportId),this.now());return;}
      if(intent.startsWith('integrity.')) {
        if(intent==='integrity.make-safe'){await workAccess(tx,actor,String(result.jobId));return;}
        if(intent==='integrity.access-summary')adminOnly(actor);
        const {oversightAuthority}=await import('./integrity-settings.js');await oversightAuthority(tx,actor,String(result.jobId??result.estateId),!!result.jobId);return;
      }
      if(intent.startsWith('correction.')||['verification.decide','verification.restrict','verification.lift-restriction','verification.configure-trade','credential.type','task.acknowledge','rfq.coordinate','work.extend-estimate','work.verdict'].includes(intent))adminOnly(actor);
      if(intent.startsWith('billing.')) {await authorizedOrganisation(tx,actor,String(result.organisationId));if(intent!=='billing.report')adminOnly(actor);return;}
      if(intent.startsWith('support.')&&result.supportId){await authorizedSupport(tx,actor,String(result.supportId));return;}
      if(intent.startsWith('cancellation.')){const {supportJobAccess}=await import('./support-core.js');await supportJobAccess(tx,actor,String(result.jobId));return;}
      if(intent.startsWith('reputation.')&&result.entryId) {
        const {currentEntry}=await import('./reputation-core.js'),e=await currentEntry(tx,String(result.entryId));
        if(['reputation.moderate','reputation.reply-moderate','reputation.external'].includes(intent)){adminOnly(actor);return;}
        if(intent==='reputation.reply') {if(actor.context?.role!=='contractor'||actor.context.organisation_id!==e.organisation_id)throw unavailable();return;}
        if(!e.job_id||!['cm','mcst'].includes(actor.context?.role??''))throw unavailable();await workAccess(tx,actor,e.job_id);return;
      }
      if(result.jobId&&(intent.startsWith('feedback.')||intent.startsWith('aftercare.'))) {
        await workAccess(tx,actor,String(result.jobId));
        if(intent==='aftercare.decide')adminOnly(actor);
        else if(intent==='aftercare.remedy'){if(actor.context?.role!=='contractor')throw unavailable();}
        else if(!['cm','mcst'].includes(actor.context?.role??''))throw unavailable();return;
      }
      if(result.jobId&&(intent.startsWith('work.')||intent.startsWith('variation.')||intent.startsWith('completion.')||intent.startsWith('payment.'))) {
        if(intent.startsWith('payment.')) {const {financialAccess}=await import('./support-core.js');await financialAccess(tx,actor,String(result.jobId));}else await workAccess(tx,actor,String(result.jobId));
        if(['work.start','work.initial-estimate','work.update','variation.confirm'].includes(intent)&&actor.context?.role!=='contractor')throw unavailable();
        if(['completion.submit','completion.respond','completion.invoice','payment.receipt','payment.issue','payment.understood'].includes(intent)&&actor.context?.role!=='contractor')throw unavailable();
        if(['payment.confirm-invoice','payment.transfer','payment.progress'].includes(intent)&&actor.context?.role!=='mcst')throw unavailable();
        if(intent==='completion.inspect'&&!['cm','mcst'].includes(actor.context?.role??''))throw unavailable();
        if(['payment.resolve','payment.resolve-balance'].includes(intent))adminOnly(actor);
        if(result.supportId)await authorizedSupport(tx,actor,String(result.supportId));return;
      }
      if(result.supportId)await authorizedSupport(tx,actor,String(result.supportId));
      else if(actor.context?.role==='contractor'&&(result.quoteId||result.questionId||result.visitId)) {
        const table=result.quoteId?'quotes':result.questionId?'job_questions':'visit_requests',resource=result.quoteId??result.questionId??result.visitId;
        const [record]=await tx.query(`SELECT organisation_id FROM ${table} WHERE id=$1`,[resource]);
        if(!record||record.organisation_id!==actor.context.organisation_id)throw unavailable();
      }
      else if(result.jobId)await authorizedJob(tx,actor,String(result.jobId));
      else if(result.draftId) {
        const [draft]=await tx.query('SELECT * FROM workspace_drafts WHERE id=$1',[result.draftId]);
        if(!draft||draft.owner_id!==actor.id||!canRead(actor,{estateId:String(draft.estate_id)}))throw unavailable();
      } else if(result.uploadId) {
        const [upload]=await tx.query('SELECT * FROM upload_intents WHERE id=$1',[result.uploadId]);
        if(!upload||upload.owner_id!==actor.id)throw unavailable();
        if(upload.support_id)await authorizedSupport(tx,actor,String(upload.support_id));
        else if(upload.organisation_id)await authorizedOrganisation(tx,actor,String(upload.organisation_id));
        else if(upload.work_organisation_id&&actor.context?.role==='contractor')await workAccess(tx,actor,String(upload.job_id));
        else await authorizedJob(tx,actor,String(upload.job_id));
      } else if(result.organisationId) {
        await authorizedOrganisation(tx,actor,String(result.organisationId));
        if(result.decisionId)adminOnly(actor);
      } else if(result.credentialId) {
        const [credential]=await tx.query('SELECT organisation_id FROM credentials WHERE id=$1',[result.credentialId]);
        if(!credential)throw unavailable();await authorizedOrganisation(tx,actor,String(credential.organisation_id));
      } else if(result.typeId) {
        adminOnly(actor);
      } else if(result.category) {
        adminOnly(actor);
      } else if(result.estateId) {
        if(!['mcst','admin'].includes(actor.context?.role??'')||!canRead(actor,{estateId:String(result.estateId)}))throw unavailable();
      } else if(result.taskId) {
        await authorizedTask(tx,actor,String(result.taskId));
      } else throw unavailable();
    });
  }
}
