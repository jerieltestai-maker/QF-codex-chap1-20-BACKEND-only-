import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import {createAttention} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {initializeWork,readWork,type WorkState} from './work-core.js';

const DAY=86400000;
function current(w:WorkState,rule:string,version:number):boolean {
  if(w.status==='cancelled'||w.completed_at)return false;
  if(rule==='T23')return !w.started_at&&!!w.scheduled_start_at&&w.start_schedule_version===version;
  if(rule==='T21')return !!w.started_at&&!w.completion_target_at&&!!w.estimate_due_at&&w.estimate_deadline_version===version;
  return !!w.started_at&&!!w.completion_target_at&&w.completion_target_version===version;
}
export async function currentWorkNotice(tx:Sql,taskId:string) {
  const [event]=await tx.query('SELECT * FROM work_clock_events WHERE $1=ANY(task_ids)',[taskId]);
  return !event||current(await readWork(tx,String(event.job_id)),String(event.rule),Number(event.target_version));
}
async function checkpoint(tx:Sql,w:WorkState,now:Date,rule:'T20'|'T21'|'T23',version:number,due:Date,estate=false) {
  if(due>now)return;
  const point=estate?'estate':'admin';
  const [existing]=await tx.query('SELECT job_id FROM work_clock_events WHERE job_id=$1 AND rule=$2 AND target_version=$3 AND checkpoint=$4',[w.job_id,rule,version,point]);
  if(existing)return;
  const hours=rule==='T20'?Math.max(0,(now.getTime()-new Date(w.completion_target_at!).getTime())/3600000):0;
  const action=rule==='T23'?'Start has not been recorded for the agreed date and time.':rule==='T21'?'The first completion estimate has not been supplied by its submission deadline.':`Work completion has not been recorded; the accepted target is ${hours.toFixed(1)} hours overdue. Okay acknowledges this notice only. Admin Intervention requests support.`;
  const ids=[];
  for(const role of estate?['cm','mcst']:['admin'])ids.push(await createAttention(tx,now,{kind:`work.${rule}.${point}`,resourceId:w.job_id,estateId:w.estate_id,ownerRole:role,action,requiredVersion:version}));
  await tx.query('INSERT INTO work_clock_events VALUES($1,$2,$3,$4,$5,$6,$7)',[w.job_id,rule,version,point,due.toISOString(),now.toISOString(),ids]);
  await tx.query("INSERT INTO work_events VALUES($1,$2,'work.deadline-missed',$3,NULL,NULL,$4,$5)",[randomUUID(),w.job_id,{rule,targetVersion:version,checkpoint:point,dueAt:due.toISOString(),hoursLate:hours},due.toISOString(),now.toISOString()]);
}
export async function workTimers(tx:Sql,now:Date) {
  // Also backfills work authorised before migration 008, preserving the original authorisation.
  for(const a of await tx.query('SELECT job_id FROM work_authorisations WHERE job_id NOT IN (SELECT job_id FROM work_state)'))await initializeWork(tx,String(a.job_id),now);
  for(const row of await tx.query('SELECT job_id FROM work_state ORDER BY job_id')) {
    const w=await readWork(tx,String(row.job_id));
    // Supersede unsent and outstanding notices when their exact obligation no longer exists.
    for(const e of await tx.query('SELECT * FROM work_clock_events WHERE job_id=$1',[w.job_id]))if(!current(w,String(e.rule),Number(e.target_version)))
      for(const id of e.task_ids as string[])await finishResponse(tx,id);
    if(w.status==='cancelled'||w.completed_at) {
      for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND status='open' AND kind LIKE 'work.%'",[w.job_id]))await finishResponse(tx,String(t.id));
      if(w.status==='cancelled')for(const v of await tx.query("SELECT * FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[w.job_id])) {
        if(v.task_id)await finishResponse(tx,String(v.task_id));
        await tx.query("UPDATE variations SET state='superseded',task_id=NULL WHERE id=$1",[v.id]);
        await tx.query("INSERT INTO variation_decisions VALUES($1,$2,$3,'superseded','Work cancellation superseded this pending proposal',$4,$5,NULL,NULL,$6)",[randomUUID(),v.id,v.current_version,{state:v.state},{state:'superseded',workStatus:'cancelled'},now.toISOString()]);
        await tx.query("INSERT INTO work_events VALUES($1,$2,'variation.superseded',$3,NULL,NULL,NULL,$4)",[randomUUID(),w.job_id,{variationId:v.id,proposalVersion:v.current_version,cause:'work_cancelled'},now.toISOString()]);
      }
      continue;
    }
    if(!w.started_at&&w.scheduled_start_at) {
      const at=new Date(w.scheduled_start_at);
      await checkpoint(tx,w,now,'T23',w.start_schedule_version,at);
      await checkpoint(tx,w,now,'T23',w.start_schedule_version,new Date(at.getTime()+DAY),true);
    }
    if(w.started_at&&!w.completion_target_at&&w.estimate_due_at)await checkpoint(tx,w,now,'T21',w.estimate_deadline_version,new Date(w.estimate_due_at));
    if(w.started_at&&w.completion_target_at) {
      const at=new Date(w.completion_target_at);
      await checkpoint(tx,w,now,'T20',w.completion_target_version,at);
      await checkpoint(tx,w,now,'T20',w.completion_target_version,new Date(at.getTime()+DAY),true);
    }
  }
}
