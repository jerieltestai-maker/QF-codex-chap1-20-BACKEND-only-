import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import {businessDayDue,loadCalendar,remainingBusinessMs,resumeBusinessDue,nextDate,singaporeDate,singaporeInstant} from './calendar.js';
import {createAttention,finishAttention} from './verification-service.js';
import {publication,selectableQuotes,selectionOwner,type QuoteRow} from './quote-service.js';
import {enqueue} from './commands.js';

export async function responseTask(tx:Sql,now:Date,body:{kind:string;resourceId:string;estateId:string;organisationId?:string;ownerRole:'cm'|'mcst'|'contractor';action:string;rule:'T04'|'T07'|'T08'|'T09'|'T22';requiredVersion?:number}) {
  const id=await createAttention(tx,now,{...body,requiredVersion:body.requiredVersion??1});
  await tx.query('UPDATE tasks SET response_rule=$1 WHERE id=$2',[body.rule,id]);return id;
}
export async function finishResponse(tx:Sql,id:string) {
  await tx.query("UPDATE tasks SET status='resolved',version=version+1 WHERE id=$1 AND status='open'",[id]);
  await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND status='pending'",[id]);
  await finishAttention(tx,id,'response.escalation');
}
export async function scheduleResponse(tx:Sql,task:Record<string,unknown>,now:Date) {
  if(!task.response_rule)return;const calendar=await loadCalendar(tx);
  for(const [kind,days] of [['response.actor',2],['response.admin',5]] as const)await tx.query(`INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,calendar_version,anchor_at,due_at,dedupe_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(dedupe_key) DO NOTHING`,[randomUUID(),task.id,task.version,kind,`${task.response_rule}-v1`,calendar.version,now.toISOString(),businessDayDue(now,days,calendar).toISOString(),`${task.response_rule}:${task.id}:${kind}`]);
}
async function queueCheckpoint(tx:Sql,id:string,key:string,payload:unknown,now:Date) {
  const [pending]=await tx.query("SELECT id FROM outbox WHERE kind='notification.issue' AND resource_id=$1 AND payload->>'dedupeKey'=$2 AND processed_at IS NULL",[id,key]);
  if(!pending)await enqueue(tx,'notification.issue',id,payload,now);
}
async function effectivePause(tx:Sql,roundId:string,scopeVersion:number,last:Date,now:Date):Promise<Date> {
  const candidates=await tx.query(`SELECT v.expires_at AS boundary FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version WHERE q.round_id=$1 AND q.status='active'
    UNION SELECT cv.expires_at AS boundary FROM quotes q JOIN credentials c ON c.organisation_id=q.organisation_id JOIN credential_versions cv ON cv.credential_id=c.id AND cv.submission=c.approved_submission
    JOIN trade_requirements tr ON tr.type_id=c.type_id WHERE q.round_id=$1`,[roundId]);
  const dates=[...new Set(candidates.filter(c=>c.boundary).map(c=>new Date(c.boundary as string).getTime()))].filter(t=>t>last.getTime()&&t<=now.getTime()).sort((a,b)=>a-b);
  for(const time of dates)if((await selectableQuotes(tx,roundId,scopeVersion,new Date(time))).length<3)return new Date(time);
  return now;
}
export async function reconcileProcurementClocks(tx:Sql,now:Date) {
  const rows=await tx.query('SELECT job_id FROM rfq_publications ORDER BY job_id');
  for(const row of rows) {
    const id=String(row.job_id),rfq=await publication(tx,id),roundId=String(rfq.round_id);
    const [clock]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[roundId]);
    const [authorised]=await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id]);
    if(rfq.status!=='open'||authorised) {
      await stopSelectionClock(tx,roundId,now);
      await finishAttention(tx,id,'selection.review');await finishAttention(tx,id,'selection.escalation');continue;
    }
    const valid=await selectableQuotes(tx,roundId,Number(rfq.scope_version),now),count=valid.length;
    if((!clock||clock.status==='stopped')&&count>=3) {
      const owner=await selectionOwner(tx,id),calendar=await loadCalendar(tx),taskId=await createAttention(tx,now,{kind:'selection.review',resourceId:id,estateId:String(rfq.estate_id),ownerRole:owner,action:'Review available quotes and select a contractor or record the next review',requiredVersion:Number(rfq.number)});
      const actorDue=businessDayDue(now,5,calendar),adminDue=businessDayDue(now,10,calendar),start=singaporeInstant(nextDate(singaporeDate(now)));
      await tx.query(`INSERT INTO selection_clocks(round_id,job_id,owner_role,task_id,anchor_at,start_at,calendar_version,actor_due_at,admin_due_at,status,last_reconciled_at,iteration) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$5,$10)
        ON CONFLICT(round_id) DO UPDATE SET task_id=$4,anchor_at=$5,start_at=$6,calendar_version=$7,actor_due_at=$8,admin_due_at=$9,status='active',last_reconciled_at=$5,iteration=$10,paused_at=NULL,actor_remaining_ms=NULL,admin_remaining_ms=NULL,actor_issued_at=NULL,admin_issued_at=NULL,admin_task_id=NULL,scheduled_review_at=NULL`,[roundId,id,owner,taskId,now.toISOString(),start.toISOString(),calendar.version,actorDue.toISOString(),adminDue.toISOString(),Number(clock?.iteration??0)+1]);
    } else if(clock&&clock.status!=='stopped') {
      const calendar=await loadCalendar(tx,String(clock.calendar_version)),start=new Date(clock.start_at as string);
      if(count<3&&clock.status==='active') {
        const pause=await effectivePause(tx,roundId,Number(rfq.scope_version),new Date(clock.last_reconciled_at as string),now);
        const actorRemaining=remainingBusinessMs(pause,new Date(clock.actor_due_at as string),calendar,start),adminRemaining=remainingBusinessMs(pause,new Date(clock.admin_due_at as string),calendar,start);
        await tx.query("UPDATE selection_clocks SET status='paused',paused_at=$1,actor_remaining_ms=$2,admin_remaining_ms=$3,last_reconciled_at=$4 WHERE round_id=$5",[pause.toISOString(),actorRemaining,adminRemaining,now.toISOString(),roundId]);
        await tx.query("UPDATE tasks SET action='Selection follow-up paused: awaiting current quote coverage' WHERE id=$1 AND status='open'",[clock.task_id]);
        if(clock.admin_task_id)await tx.query("UPDATE tasks SET action='Quote coverage dropped below three. Source current eligible offers; selection reminders are paused.' WHERE id=$1 AND status='open'",[clock.admin_task_id]);
        const [attention]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='rfq.sourcing' AND status='open'",[id]);
        if(!attention&&!clock.admin_task_id)await createAttention(tx,now,{kind:'rfq.sourcing',resourceId:id,estateId:String(rfq.estate_id),action:'Quote coverage dropped below three. Source current eligible offers; selection reminders are paused.',requiredVersion:Number(rfq.number)});
      } else if(count>=3&&clock.status==='paused') {
        const actorDue=clock.actor_issued_at?new Date(clock.actor_due_at as string):resumeBusinessDue(now,Number(clock.actor_remaining_ms),calendar,start);
        const adminDue=clock.admin_task_id?new Date(clock.admin_due_at as string):resumeBusinessDue(now,Number(clock.admin_remaining_ms),calendar,start);
        await tx.query("UPDATE selection_clocks SET status='active',actor_due_at=$1,admin_due_at=$2,paused_at=NULL,last_reconciled_at=$3 WHERE round_id=$4",[actorDue.toISOString(),adminDue.toISOString(),now.toISOString(),roundId]);
        await tx.query("UPDATE tasks SET action='Review available quotes and select a contractor or record the next review' WHERE id=$1 AND status='open'",[clock.task_id]);
        if(clock.admin_task_id)await tx.query("UPDATE tasks SET action='Current quote coverage restored. Follow up on the pending contractor selection.' WHERE id=$1 AND status='open'",[clock.admin_task_id]);
      } else await tx.query('UPDATE selection_clocks SET last_reconciled_at=$1 WHERE round_id=$2',[now.toISOString(),roundId]);
    }
    const [current]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[roundId]);
    if(count>=3)await finishAttention(tx,id,'rfq.sourcing');
    if(!current||current.status!=='active'||count<3||(current.scheduled_review_at&&new Date(current.scheduled_review_at as string)>now))continue;
    if(!current.actor_issued_at&&new Date(current.actor_due_at as string)<=now) {
      const key=`T17:${roundId}:${current.iteration}:actor`;await queueCheckpoint(tx,String(current.task_id),key,{rule:'T17.actor',roundId,iteration:current.iteration,dedupeKey:key,step:key,message:'Review the available quotes. Select a contractor or record the next review date.'},now);
    }
    if(!current.admin_task_id&&new Date(current.admin_due_at as string)<=now) {
      const taskId=await createAttention(tx,now,{kind:'selection.escalation',resourceId:id,estateId:String(rfq.estate_id),action:`Selection is still pending. Follow up with ${String(current.owner_role).toUpperCase()} and record the next action.`,requiredVersion:Number(rfq.number)});
      await tx.query('UPDATE selection_clocks SET admin_task_id=$1 WHERE round_id=$2',[taskId,roundId]);
    }
  }
}
export async function stopSelectionClock(tx:Sql,roundId:string,now:Date) {
  const [clock]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[roundId]);
  if(!clock||clock.status==='stopped')return;
  await tx.query('INSERT INTO selection_clock_history VALUES($1,$2,$3,$4)',[randomUUID(),roundId,clock,now.toISOString()]);
  await tx.query("UPDATE selection_clocks SET status='stopped',last_reconciled_at=$1 WHERE round_id=$2",[now.toISOString(),roundId]);
}
export async function quoteExpiryTimers(tx:Sql,now:Date) {
  const expired=await tx.query<QuoteRow>(`SELECT q.*,v.expires_at FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version
    JOIN quotation_rounds r ON r.id=q.round_id WHERE q.status='active' AND v.expires_at<=$1 AND q.expiry_notified_version IS DISTINCT FROM q.current_version
    AND r.status IN ('open','paused') AND NOT EXISTS(SELECT 1 FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.job_id=q.job_id AND s.status IN ('pending','authorised') AND c.quote_id=q.id AND c.quote_version=q.current_version)`,[now.toISOString()]);
  for(const quote of expired) {
    await createAttention(tx,now,{kind:'quote.expired',resourceId:quote.id,organisationId:quote.organisation_id,ownerRole:'contractor',action:'Your unselected quote has expired. Submit an explicit new version to renew the offer.',informational:true,requiredVersion:quote.current_version});
    await tx.query('UPDATE quotes SET expiry_notified_version=current_version WHERE id=$1',[quote.id]);
    await tx.query("INSERT INTO audit_events(id,action,resource_id,after_value,request_id,recorded_at) VALUES($1,'quote.expired',$2,$3,'quote-expiry-worker',$4)",[randomUUID(),quote.id,{quoteVersion:quote.current_version,effectiveAt:new Date(quote.expires_at).toISOString()},now.toISOString()]);
  }
}
