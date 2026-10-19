import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {singaporeInstant,nextDate} from './calendar.js';
import {readWork} from './work-core.js';
import {responseTask,finishResponse} from './procurement-clocks.js';

export async function feedbackEvent(tx:Sql,id:string,kind:string,details:unknown,now:Date,actor?:Actor) {
  await tx.query('INSERT INTO feedback_events VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),id,kind,details,actor?.id??null,now.toISOString()]);
  if(actor&&kind.startsWith('aftercare.')&&details&&typeof details==='object'&&'caseId' in details)
    await tx.query('INSERT INTO support_events VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),details.caseId,kind,details,actor.id,now.toISOString()]);
}
export function feedbackDue(value:string,precision:string) {
  if(precision==='instant')return new Date(Date.parse(value)+30*86400000);
  let day=value;for(let i=0;i<30;i++)day=nextDate(day);
  return singaporeInstant(day,'09:00:00');
}
export async function stopFeedbackTask(tx:Sql,taskId:unknown) {
  if(taskId)await finishResponse(tx,String(taskId));
}
export async function feedbackTimers(tx:Sql,now:Date,jobId?:string) {
  const sameAnchor=(a:unknown,b:unknown)=>{const x=a as Record<string,unknown>|null,y=b as Record<string,unknown>|null;return x?.settledAt===y?.settledAt&&x?.precision===y?.precision&&x?.source===y?.source;};
  const rows=await tx.query(`SELECT w.job_id,a.settled_at,a.precision,a.source,w.status AS work_status
    FROM work_state w LEFT JOIN settlement_anchors a ON a.job_id=w.job_id ${jobId?'WHERE w.job_id=$1':''} ORDER BY w.job_id`,jobId?[jobId]:[]);
  for(const row of rows) {
    const id=String(row.job_id),[old]=await tx.query('SELECT * FROM feedback_obligations WHERE job_id=$1',[id]);
    // Completed observations are facts at their real observation time, even if payment facts change later.
    if(old?.status==='submitted') {
      const anchor=row.settled_at?{settledAt:row.settled_at,precision:row.precision,source:row.source}:null;
      const prior=old.anchor as Record<string,unknown>;
      if(!sameAnchor(Object.hasOwn(prior,'latest')?prior.latest:prior,anchor)) {
        await feedbackEvent(tx,id,'feedback.completed-anchor-corrected',{original:old.anchor,latest:anchor},now);
        await tx.query('UPDATE feedback_obligations SET anchor=$1 WHERE job_id=$2',[{...(old.anchor as object),latest:anchor},id]);
      }
      continue;
    }
    // Chapter 14 supplies this explicit performed-work settlement authority; cancellation alone is insufficient.
    if(!row.settled_at||(row.work_status==='cancelled'&&row.source!=='cancelled performed-work settlement')) {
      if(old&&old.status!=='suspended') {
        await stopFeedbackTask(tx,old.task_id);
        await feedbackEvent(tx,id,'feedback.anchor-suspended',{anchor:old.anchor},now);
        await tx.query("UPDATE feedback_obligations SET status='suspended',version=version+1,task_id=NULL WHERE job_id=$1",[id]);
      }
      continue;
    }
    const anchor={settledAt:row.settled_at,precision:row.precision,source:row.source},due=feedbackDue(String(row.settled_at),String(row.precision));
    const changed=!!old&&(!sameAnchor(old.anchor,anchor)||old.status==='suspended');
    if(!old||changed) {
      if(old)await stopFeedbackTask(tx,old.task_id);
      await tx.query(`INSERT INTO feedback_obligations(job_id,anchor,due_at,status,created_at) VALUES($1,$2,$3,'scheduled',$4)
        ON CONFLICT(job_id) DO UPDATE SET anchor=$2,due_at=$3,status='scheduled',task_id=NULL,version=feedback_obligations.version+1`,[id,anchor,due.toISOString(),now.toISOString()]);
      await feedbackEvent(tx,id,old?'feedback.anchor-corrected':'feedback.scheduled',{anchor,dueAt:due.toISOString()},now);
    }
    const [current]=await tx.query('SELECT * FROM feedback_obligations WHERE job_id=$1',[id]);
    if(current!.status==='scheduled'&&due<=now) {
      const w=await readWork(tx,id);
      const [inspectionActor]=await tx.query(`SELECT a.actor_role FROM inspections i JOIN audit_events a ON a.resource_id=i.job_id
        AND a.actor_id=i.actor_id AND a.recorded_at=i.recorded_at AND a.action='completion.inspect'
        WHERE i.job_id=$1 ORDER BY i.round DESC LIMIT 1`,[id]);
      const [creator]=await tx.query("SELECT actor_role FROM audit_events WHERE resource_id=$1 AND action='workspace.create' ORDER BY recorded_at,id LIMIT 1",[id]);
      const role=(inspectionActor?.actor_role??creator?.actor_role)==='mcst'?'mcst':'cm';
      const task=await responseTask(tx,now,{kind:'feedback.durability',resourceId:id,estateId:w.estate_id,ownerRole:role,
        action:'Give feedback: assess the repair durability, or explain why it cannot be assessed.',rule:'T04',requiredVersion:Number(current!.version)});
      await tx.query("UPDATE feedback_obligations SET status='due',task_id=$1 WHERE job_id=$2",[task,id]);
      await feedbackEvent(tx,id,'feedback.due',{dueAt:due.toISOString(),discoveredAt:now.toISOString(),taskId:task},now);
    }
  }
}
