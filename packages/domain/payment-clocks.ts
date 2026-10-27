import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import {businessDayDue,loadCalendar,singaporeDate} from './calendar.js';
import {enqueue} from './commands.js';
import {createAttention} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {readWork} from './work-core.js';
import {balance,blockers,completion,paymentEvent,finishKind,reconcileCompletion} from './completion-core.js';

export async function issuedReceipt(tx:Sql,taskId:string,now:Date) {
  const [t]=await tx.query("UPDATE payment_transfers SET first_issued_at=$1,receipt_due_at=$2 WHERE receipt_task_id=$3 AND first_issued_at IS NULL AND status='pending' RETURNING *",[now.toISOString(),new Date(now.getTime()+7*86400000).toISOString(),taskId]);
  if(t)await paymentEvent(tx,String(t.job_id),String(t.id),'receipt.notice-issued',{firstIssuedAt:now.toISOString(),dueAt:new Date(now.getTime()+7*86400000).toISOString()},now);
}
async function settlementDate(tx:Sql,id:string,fallback:Date) {
  const b=await balance(tx,id),receipts=b.rows.filter(t=>['actual','assumed'].includes(String(t.status))).map(t=>({value:String(t.receipt_date),precision:String(t.receipt_precision)}));
  for(const r of await tx.query('SELECT refunded_date FROM estate_refunds WHERE job_id=$1',[id]))receipts.push({value:String(r.refunded_date),precision:/^\d{4}-\d{2}-\d{2}$/.test(String(r.refunded_date))?'date':'instant'});
  const day=(r:{value:string;precision:string})=>r.precision==='date'?r.value:singaporeDate(new Date(r.value));
  const latestDay=receipts.map(day).sort().at(-1),final=receipts.filter(r=>day(r)===latestDay);
  const last=final.find(r=>r.precision==='date')??final.sort((a,b)=>Date.parse(a.value)-Date.parse(b.value)).at(-1);
  return {value:last?.value??fallback.toISOString(),precision:last?.precision??'instant'};
}
export async function cancelledSettlementAnchor(tx:Sql,id:string,now:Date) {
  const [w]=await tx.query("SELECT * FROM work_state WHERE job_id=$1 AND status='cancelled'",[id]);if(!w)return;
  const [f]=await tx.query('SELECT * FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]),b=await balance(tx,id);
  const [old]=await tx.query('SELECT * FROM settlement_anchors WHERE job_id=$1',[id]);
  if(!f||!w.started_at||b.outstanding!==0n||b.disputed!==0n) {
    if(old){await tx.query('DELETE FROM settlement_anchors WHERE job_id=$1',[id]);await paymentEvent(tx,id,null,'settlement.invalidated',old,now);}return;
  }
  const at=await settlementDate(tx,id,new Date(f.recorded_at as string)),source='cancelled performed-work settlement';
  if(old&&String(old.settled_at)===at.value&&old.precision===at.precision&&old.source===source)return;
  await tx.query('INSERT INTO settlement_anchors VALUES($1,$2,$3,$4,$5) ON CONFLICT(job_id) DO UPDATE SET settled_at=$2,precision=$3,source=$4,recorded_at=$5',[id,at.value,at.precision,source,now.toISOString()]);
  await paymentEvent(tx,id,null,'settlement.anchored',{settledAt:at.value,precision:at.precision,source},now);
}
export async function reconcileSettlement(tx:Sql,id:string,now:Date) {
  await cancelledSettlementAnchor(tx,id,now);
  const c=await completion(tx,id);if(!c?.confirmed_version)return;
  const w=await readWork(tx,id),b=await balance(tx,id),blocked=(await blockers(tx,id)).length>0;
  const [adjusted]=await tx.query('SELECT id FROM financial_confirmations WHERE job_id=$1 AND source<>\'invoice\' LIMIT 1',[id]);
  const eligible=!!c.accepted_round&&c.scope===w.scope&&(!!adjusted||BigInt(c.amount_cents)===BigInt(w.amount_cents))&&b.outstanding===0n&&!blocked&&w.status==='active';
  if(eligible) {
    const [anchor]=await tx.query('SELECT job_id FROM settlement_anchors WHERE job_id=$1',[id]);
    if(!anchor) {
      const [confirmation]=await tx.query('SELECT recorded_at FROM invoice_confirmations WHERE job_id=$1',[id]);
      const at=await settlementDate(tx,id,new Date(confirmation!.recorded_at as string)),settledAt=at.value,precision=at.precision;
      await tx.query('INSERT INTO settlement_anchors VALUES($1,$2,$3,$4,$5)',[id,settledAt,precision,b.payable===0n?'zero performed-work confirmation':'full actual/assumed receipts',now.toISOString()]);
      await paymentEvent(tx,id,null,'settlement.anchored',{settledAt,precision},now);
    }
    if(w.stage!=='Closed') {
      await tx.query("UPDATE job_records SET stage='Closed',version=version+1,updated_at=$1 WHERE id=$2",[now.toISOString(),id]);
      await tx.query("INSERT INTO closure_events VALUES($1,$2,'closed',$3,$4)",[randomUUID(),id,{invoiceVersion:c.confirmed_version,acceptedRound:c.accepted_round},now.toISOString()]);
      for(const role of ['cm','mcst','contractor'])await createAttention(tx,now,{kind:'payment.closed',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action:'Accepted works, confirmed invoice and full settlement are recorded. The job is Closed.',informational:true});
    }
    await finishKind(tx,id,'payment.send');return;
  }
  if(b.outstanding!==0n) {
    const [anchor]=await tx.query('DELETE FROM settlement_anchors WHERE job_id=$1 RETURNING *',[id]);
    if(anchor)await paymentEvent(tx,id,null,'settlement.invalidated',anchor,now);
  }
  if(w.status==='cancelled')return;
  const stage=blocked?'Admin Intervention':b.unsent>0n?(b.sent>0n?'Unresolved payment':'Arranging payment'):'Confirming payment';
  if(w.stage!==stage) {
    if(w.stage==='Closed')await tx.query("INSERT INTO closure_events VALUES($1,$2,'support.opened-after-closure',$3,$4)",[randomUUID(),id,{stage},now.toISOString()]);
    await tx.query('UPDATE job_records SET stage=$1,version=version+1,updated_at=$2 WHERE id=$3',[stage,now.toISOString(),id]);
  }
  if(b.unsent===0n)await finishKind(tx,id,'payment.send');
  else {
    const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.send' AND status='open'",[id]);
    if(!task)await createAttention(tx,now,{kind:'payment.send',resourceId:id,estateId:w.estate_id,ownerRole:'mcst',action:'Send the remaining estate payment outside QuoteFix, then record completed-transfer proof.'});
  }
}
export async function paymentTimers(tx:Sql,now:Date,jobId?:string) {
  for(const t of await tx.query("SELECT * FROM payment_transfers WHERE status='pending' AND receipt_due_at<=$1"+(jobId?' AND job_id=$2':''),jobId?[now.toISOString(),jobId]:[now.toISOString()])) {
    await tx.query("UPDATE payment_transfers SET status='assumed',receipt_date=$1,receipt_precision='instant' WHERE id=$2 AND status='pending'",[new Date(t.receipt_due_at as string).toISOString(),t.id]);
    await paymentEvent(tx,String(t.job_id),String(t.id),'receipt.assumed',{amountCents:String(t.amount_cents),receiptAt:new Date(t.receipt_due_at as string).toISOString(),rule:'T02+7CD'},now);
    await finishResponse(tx,String(t.receipt_task_id));
  }
  for(const row of await tx.query('SELECT job_id FROM completion_state'+(jobId?' WHERE job_id=$1':'')+' ORDER BY job_id',jobId?[jobId]:[])) {
    const id=String(row.job_id);await reconcileCompletion(tx,id,now);
    const c=await completion(tx,id);if(!c?.confirmed_version)continue;
    const w=await readWork(tx,id);
    const b=await balance(tx,id);
    if(b.unsent>0n) {
      const [confirmation]=await tx.query('SELECT recorded_at FROM invoice_confirmations WHERE job_id=$1',[id]),calendar=await loadCalendar(tx);
      for(const days of [1,3]) {
        const due=businessDayDue(new Date(confirmation!.recorded_at as string),days,calendar);
        if(due>now)continue;
        if(days===1) {
          const [progress]=await tx.query("SELECT id FROM payment_events WHERE job_id=$1 AND kind='payment.progress' LIMIT 1",[id]);
          if(progress||b.sent>0n)continue;
        }
        const [existing]=await tx.query('SELECT job_id FROM payment_checkpoints WHERE job_id=$1 AND checkpoint=$2',[id,days]);if(existing)continue;
        await tx.query('INSERT INTO payment_checkpoints VALUES($1,$2,$3,$4)',[id,days,due.toISOString(),now.toISOString()]);
        if(days===1)await createAttention(tx,now,{kind:'payment.follow-up.mcst',resourceId:id,estateId:w.estate_id,ownerRole:'mcst',action:'QuoteFix is following up on the missing payment update. Record payment or truthful progress.',informational:true});
        const [admin]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open'",[id]);
        if(!admin)await createAttention(tx,now,{kind:'payment.follow-up.admin',resourceId:id,estateId:w.estate_id,action:'Follow up with MCST about missing payment/progress; keep the remaining balance and a dated next action.'});
        else if(days===3) {
          await enqueue(tx,'notification.issue',String(admin.id),{step:'T01+3BD',dedupeKey:'payment:'+id+':3BD',message:'Payment remains unresolved at three business days. Record Admin follow-up.'},now);
        }
      }
    } else {
      await finishKind(tx,id,'payment.follow-up.mcst');await finishKind(tx,id,'payment.follow-up.admin');
    }
    await reconcileSettlement(tx,id,now);
  }
  // Confirmed cancellation settlements can exist before a completion/invoice cycle.
  for(const f of await tx.query(`SELECT f.*,j.estate_id FROM financial_confirmations f JOIN job_records j ON j.id=f.job_id
    WHERE NOT EXISTS(SELECT 1 FROM invoice_confirmations i WHERE i.job_id=f.job_id)
    AND f.version=(SELECT max(v.version) FROM financial_confirmations v WHERE v.job_id=f.job_id)`+(jobId?' AND f.job_id=$1':''),jobId?[jobId]:[])) {
    const id=String(f.job_id),b=await balance(tx,id);await cancelledSettlementAnchor(tx,id,now);
    if(b.unsent<=0n){await finishKind(tx,id,'payment.send');await finishKind(tx,id,'payment.follow-up.admin');continue;}
    const calendar=await loadCalendar(tx);
    for(const days of [1,3]) {
      const due=businessDayDue(new Date(f.recorded_at as string),days,calendar);if(due>now)continue;
      const rows=await tx.query('INSERT INTO financial_followups VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING checkpoint',[f.id,days,due.toISOString()]);if(!rows.length)continue;
      const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open'",[id]);
      if(!task)await createAttention(tx,now,{kind:'payment.follow-up.admin',resourceId:id,estateId:String(f.estate_id),action:'Follow up with MCST about the outstanding confirmed cancellation settlement. Retain a concrete dated next action.'});
    }
  }
}
