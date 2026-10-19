import {randomUUID} from 'node:crypto';
import {AppError} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {canRead} from './access.js';
import {audit,enqueue} from './commands.js';
import {createAttention,finishAttention} from './verification-service.js';
import {responseTask,finishResponse} from './procurement-clocks.js';
import {workHeld} from './integrity-core.js';

export interface WorkState extends Record<string,unknown> {
  job_id:string; estate_id:string; organisation_id:string; version:number; stage:string;
  terms_version:number; amount_cents:string; mcst_authorised_cents:string|null; scope:string;
  status:'active'|'interrupted'|'cancelled'; resume_context:'work'|'invoice'|'inspection';
  started_at:string|null; completed_at:string|null; scheduled_start_at:string|null; start_schedule_version:number;
  completion_target_at:string|null; completion_target_version:number;
  estimate_due_at:string|null; estimate_deadline_version:number; unknown_reason:string|null; interruption_id:string|null;
  integrity_paused?:boolean;
}
export async function readWork(sql:Sql,id:string):Promise<WorkState> {
  const [w]=await sql.query<WorkState>(`SELECT w.*,j.estate_id,j.version,j.stage,t.amount_cents,t.mcst_authorised_cents,t.scope
    FROM work_state w JOIN job_records j ON j.id=w.job_id JOIN work_terms t ON t.job_id=w.job_id AND t.version=w.terms_version WHERE w.job_id=$1`,[id]);
  if(!w)throw new AppError(404,'NOT_FOUND','Authorised work unavailable');w.integrity_paused=await workHeld(sql,id);return w;
}
export async function workAccess(sql:Sql,actor:Actor,id:string) {
  const w=await readWork(sql,id);
  if(actor.context?.role==='contractor' ? actor.context.organisation_id!==w.organisation_id : !canRead(actor,{estateId:w.estate_id}))
    throw new AppError(404,'NOT_FOUND','Authorised work unavailable');return w;
}
export function contractorOnly(actor:Actor) {
  if(actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','The assigned Contractor must submit this action');
}
export function activeWork(w:WorkState) {
  if(w.integrity_paused)throw new AppError(409,'MCST_CLEARANCE_REQUIRED','Ordinary work is paused until MCST explicitly clears the procurement warning');
  if(w.status!=='active'||w.completed_at)throw new AppError(409,'WORK_NOT_ACTIONABLE','Ordinary work is paused, cancelled or already completed');
}
export async function workEvent(tx:Sql,w:WorkState,actor:Actor,kind:string,details:unknown,now:Date,occurredAt?:string) {
  const id=randomUUID();
  await tx.query('INSERT INTO work_events VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,w.job_id,kind,details,actor.id,actor.context!.role,occurredAt??null,now.toISOString()]);return id;
}
export function workDestination(w:WorkState) {
  if(w.status==='cancelled')return 'Cancelled';
  if(w.integrity_paused)return 'Unable to continue work';
  if(w.status==='interrupted')return 'Unable to continue work';
  if(w.resume_context==='invoice')return 'Explaining price change';
  if(w.resume_context==='inspection')return "CM's Inspecting of work";
  return w.started_at?'Carrying out work':'Starting work';
}
export async function bumpWork(tx:Sql,w:WorkState,now:Date,stage=workDestination(w)) {
  const version=w.version+1;
  await tx.query('UPDATE job_records SET version=$1,stage=$2,updated_at=$3 WHERE id=$4',[version,stage,now.toISOString(),w.job_id]);
  await enqueue(tx,'work.changed',w.job_id,{version},now);return version;
}
export async function agreeStartTask(tx:Sql,w:WorkState,now:Date) {
  if(w.started_at||w.scheduled_start_at||w.status!=='active'||w.completed_at)return;
  const [pending]=await tx.query("SELECT id FROM variations WHERE job_id=$1 AND kind='start_schedule' AND state IN ('terms','decision')",[w.job_id]);
  const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='work.agree-start' AND status='open'",[w.job_id]);
  if(!pending&&!task)await responseTask(tx,now,{kind:'work.agree-start',resourceId:w.job_id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:'contractor',action:'Propose a start date and time for CM/MCST agreement',rule:'T22'});
}
export async function initializeWork(tx:Sql,id:string,now:Date) {
  const [a]=await tx.query(`SELECT a.*,j.estate_id,v.snapshot,s.actor_role FROM work_authorisations a JOIN job_records j ON j.id=a.job_id
    JOIN contractor_selections s ON s.id=a.selection_id JOIN quote_versions q ON q.quote_id=a.quote_id AND q.version=a.quote_version
    JOIN rfq_versions v ON v.job_id=a.job_id AND v.revision=q.rfq_revision WHERE a.job_id=$1`,[id]);
  if(!a)return;
  const inserted=await tx.query('INSERT INTO work_state(job_id,authorisation_id,organisation_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING job_id',[id,a.id,a.organisation_id]);
  if(inserted.length) {
    const [mcst]=await tx.query("SELECT id FROM selection_decisions WHERE selection_id=$1 AND outcome IN ('approved','combined_authorisation')",[a.selection_id]);
    await tx.query('INSERT INTO work_terms VALUES($1,1,$2,$3,$4,\'selection\',$5,$6,$7)',[id,a.amount_cents,mcst?a.amount_cents:null,(a.snapshot as {publicDescription:string}).publicDescription,a.id,a.actor_id,a.recorded_at]);
  }
  await agreeStartTask(tx,await readWork(tx,id),now);
}
export async function stopStartTasks(tx:Sql,id:string) {
  for(const kind of ['work.agree-start','work.start']) {
    for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind=$2 AND status='open'",[id,kind]))await finishResponse(tx,String(t.id));
  }
}
export async function interruptWork(tx:Sql,w:WorkState,actor:Actor,description:string,now:Date,requestId:string) {
  if(w.status==='cancelled')throw new AppError(409,'WORK_CANCELLED','Support cannot restore cancelled work');
  let supportId=w.interruption_id;
  if(!supportId) {
    supportId=randomUUID();
    await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[supportId,w.job_id,actor.id,description,now.toISOString()]);
    const taskId=await createAttention(tx,now,{kind:'work.interruption',resourceId:w.job_id,estateId:w.estate_id,action:'Review interruption: record safe/feasible resumption or a dated next action'});
    await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,taskId]);
  }
  await tx.query("UPDATE work_state SET status='interrupted',interruption_id=$1 WHERE job_id=$2",[supportId,w.job_id]);
  await workEvent(tx,w,actor,'work.interrupted',{description,supportId},now);
  await audit(tx,actor,'work.interrupted',w.job_id,{status:w.status},{status:'interrupted',supportId},requestId,now,description);
  await finishAttention(tx,w.job_id,'work.start');
  for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='work.agree-start' AND status='open'",[w.job_id]))await finishResponse(tx,String(t.id));
  return supportId;
}
