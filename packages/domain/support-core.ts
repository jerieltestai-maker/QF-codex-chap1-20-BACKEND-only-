import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {canRead,type Actor} from './access.js';
import {authorizedJob} from './workspace-service.js';
import {createAttention} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {explicitInstant} from './calendar.js';
import {workAccess,type WorkState} from './work-core.js';

export const supportCategories=['quote_scope','access_interruption','quality_remedy','invoice_payment','verification_account','feedback_track_record','confidential_conduct','cancellation_expenses','general'] as const;
export const confidentialNotice='Your report is confidential. It will not be shown to the person or organisation you are reporting.';
export async function supportJobAccess(tx:Sql,a:Actor,id:string) {
  if(a.context?.role!=='contractor')return authorizedJob(tx,a,id);
  const [j]=await tx.query(`SELECT j.* FROM job_records j WHERE j.id=$1 AND
    (EXISTS(SELECT 1 FROM quotes q WHERE q.job_id=j.id AND q.organisation_id=$2) OR EXISTS(SELECT 1 FROM work_state w WHERE w.job_id=j.id AND w.organisation_id=$2))`,[id,a.context.organisation_id]);
  if(!j)throw new AppError(404,'NOT_FOUND','Job unavailable');return j;
}
export async function selectedOrganisation(tx:Sql,id:string) {
  const [s]=await tx.query("SELECT c.organisation_id FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.job_id=$1 AND s.status IN ('pending','authorised')",[id]);return s?String(s.organisation_id):undefined;
}
export async function financialAccess(tx:Sql,a:Actor,id:string):Promise<WorkState> {
  const [w]=await tx.query('SELECT job_id FROM work_state WHERE job_id=$1',[id]);if(w)return workAccess(tx,a,id);
  const j=await supportJobAccess(tx,a,id),org=await selectedOrganisation(tx,id);
  if(!org||a.context?.role==='contractor'&&a.context.organisation_id!==org||!(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id])).length)throw new AppError(404,'NOT_FOUND','Settlement unavailable');
  return {...j,job_id:id,organisation_id:org,status:'cancelled',stage:j.stage,version:j.version} as WorkState;
}
export async function newCase(tx:Sql,a:Actor,id:string,body:{description:string;category:string;privacy:'ordinary'|'confidential';subjectUserIds?:string[];subjectOrganisationIds?:string[];blocking?:boolean},now:Date) {
  if(!supportCategories.includes(body.category as typeof supportCategories[number]))throw new AppError(422,'FIELD_VALIDATION','Choose a supported category');
  const users=body.subjectUserIds??[],orgs=body.subjectOrganisationIds??[];
  if((body.category==='confidential_conduct'&&body.privacy!=='confidential')||(body.privacy==='ordinary'&&(users.length||orgs.length)))throw new AppError(422,'FIELD_VALIDATION','Conduct reports and subject exclusions require confidential handling');
  if(body.privacy==='confidential'&&!users.length&&!orgs.length)throw new AppError(422,'FIELD_VALIDATION','Identify the reported subject so access can be excluded');
  if(!canRead(a,{...(a.context?.role==='contractor'?{organisationId:a.context.organisation_id!}:{estateId:String((await supportJobAccess(tx,a,id)).estate_id)}),subjectUserIds:users,subjectOrganisationIds:orgs}))throw new AppError(422,'FIELD_VALIDATION','The reporter cannot also be an excluded subject');
  for(const user of users)if(!(await tx.query('SELECT id FROM users WHERE id=$1',[user])).length)throw new AppError(422,'FIELD_VALIDATION','Reported user unavailable');
  for(const org of orgs)if(!(await tx.query('SELECT id FROM organisations WHERE id=$1',[org])).length)throw new AppError(422,'FIELD_VALIDATION','Reported organisation unavailable');
  const supportId=randomUUID();await tx.query('INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,subject_user_ids,subject_organisation_ids,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[supportId,id,a.id,requiredText(body.description),body.privacy,users,orgs,now.toISOString()]);
  const participant=a.context?.role==='contractor'?a.context.organisation_id:await selectedOrganisation(tx,id);
  await tx.query("INSERT INTO support_cases(support_id,category,state,blocking,organisation_id) VALUES($1,$2,'review',$3,$4)",[supportId,body.category,body.blocking??(body.privacy==='ordinary'&&['quote_scope','access_interruption','quality_remedy','invoice_payment','cancellation_expenses'].includes(body.category)),participant??null]);
  await caseAttention(tx,supportId,'support.review','Review evidence and record a concrete next action or resolution.',now);return supportId;
}
export async function caseAttention(tx:Sql,id:string,kind:string,action:string,now:Date,role='admin',respondingUserId?:string,dueAt?:string) {
  const [s]=await tx.query('SELECT s.*,COALESCE(j.estate_id,s.estate_id) AS estate_id FROM support_requests s LEFT JOIN job_records j ON j.id=s.job_id WHERE s.id=$1',[id]);
  if(!s)throw new AppError(404,'NOT_FOUND','Case unavailable');
  const [c]=await tx.query('SELECT organisation_id FROM support_cases WHERE support_id=$1',[id]);
  const org=c?.organisation_id?String(c.organisation_id):s.job_id?await selectedOrganisation(tx,String(s.job_id)):undefined;
  const task=await createAttention(tx,now,{kind,resourceId:s.job_id?String(s.job_id):id,...(s.estate_id?{estateId:String(s.estate_id)}:{}),...(org?{organisationId:org}:{}),ownerRole:role,action});
  await tx.query('UPDATE tasks SET support_id=$1,responding_user_id=$2 WHERE id=$3',[id,respondingUserId??null,task]);
  if(role!=='admin'&&dueAt)await datedTask(tx,task,action,dueAt,now);
  else if(role!=='admin')await tx.query("UPDATE tasks SET response_rule='T09' WHERE id=$1",[task]);return task;
}
export async function datedTask(tx:Sql,id:string,action:string,followUpAt:string,now:Date,actorId?:string) {
  const date=explicitInstant(followUpAt);if(date<=now)throw new AppError(422,'FIELD_VALIDATION','Unresolved work requires a future follow-up');
  await tx.query('UPDATE tasks SET next_action=$1,follow_up_at=$2,acknowledged_at=COALESCE(acknowledged_at,$3),acknowledged_by=COALESCE($4,acknowledged_by),version=version+1 WHERE id=$5',[requiredText(action),date.toISOString(),actorId?now.toISOString():null,actorId??null,id]);
  await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND status='pending'",[id]);
  await tx.query("INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key) SELECT $1,id,version,CASE WHEN owner_role='admin' THEN 'T11' ELSE 'response.admin' END,'T11-v1',$2,$3,$4||version FROM tasks WHERE id=$5",[randomUUID(),now.toISOString(),date.toISOString(),'support:'+id+':',id]);
}
export async function closeCaseTasks(tx:Sql,id:string,kind?:string) {
  for(const t of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND status='open'"+(kind?' AND kind=$2':''),kind?[id,kind]:[id]))await finishResponse(tx,String(t.id));
}
export async function caseEvent(tx:Sql,a:Actor,id:string,kind:string,details:unknown,now:Date) {
  await tx.query('INSERT INTO support_events VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),id,kind,details,a.id,now.toISOString()]);
}
