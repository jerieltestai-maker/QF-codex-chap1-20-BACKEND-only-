import type {Sql} from '../infrastructure/database.js';
import {balance,completion} from './completion-core.js';
import {caseAttention} from './support-core.js';
import {finishResponse} from './procurement-clocks.js';

// Domain execution changes the next actor, never verifies a verdict by itself.
export async function supportExecutionTimers(tx:Sql,now:Date) {
  for(const c of await tx.query(`SELECT c.support_id FROM support_cases c WHERE c.state='execution' AND NOT EXISTS(SELECT 1 FROM aftercare_cases a WHERE a.id=c.support_id)
    AND NOT EXISTS(SELECT 1 FROM support_obligations o WHERE o.support_id=c.support_id AND o.verified_at IS NULL AND o.superseded_at IS NULL)
    AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.support_id=c.support_id AND t.kind='support.finish' AND t.status='open')`))
    await caseAttention(tx,String(c.support_id),'support.finish','Review verified execution and explicitly resolve this case. Party acknowledgment is nonblocking.',now);
  for(const t of await tx.query(`SELECT t.id FROM tasks t JOIN support_obligations o ON o.id=t.resource_id
    WHERE t.kind='support.verify' AND t.status='open' AND (o.verified_at IS NOT NULL OR o.superseded_at IS NOT NULL)`))await finishResponse(tx,String(t.id));
  for(const o of await tx.query(`SELECT o.*,s.job_id FROM support_obligations o JOIN support_requests s ON s.id=o.support_id JOIN support_cases c ON c.support_id=s.id
    WHERE o.verified_at IS NULL AND o.superseded_at IS NULL AND c.state='execution' AND c.resolution_version=o.resolution_version
    AND NOT EXISTS(SELECT 1 FROM aftercare_cases a WHERE a.id=s.id) ORDER BY o.id`)) {
    let ready=false;
    if(o.kind==='repair') {
      const cp=await completion(tx,String(o.job_id));ready=!!cp&&cp.round===o.required_round&&cp.accepted_round===cp.round;
    } else if(['payment','refund'].includes(String(o.kind))) {
      const b=await balance(tx,String(o.job_id)),[f]=await tx.query('SELECT id FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[o.job_id]);
      ready=f?.id===o.financial_confirmation_id&&b.outstanding===0n&&b.disputed===0n&&(o.kind!=='refund'||BigInt(String(o.required_refund_cents))>0n&&b.refunded>=BigInt(String(o.required_refund_cents)));
      if(o.kind==='payment'&&b.unsent<=0n&&o.task_id)await finishResponse(tx,String(o.task_id));
    }
    const existing=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='support.verify' AND status='open'",[o.id]);
    if(ready&&!existing.length) {
      if(o.task_id)await finishResponse(tx,String(o.task_id));
      const task=await caseAttention(tx,String(o.support_id),'support.verify','Review actual domain execution for this exact obligation, then verify fulfilment or retain a dated follow-up.',now);
      await tx.query('UPDATE tasks SET resource_id=$1 WHERE id=$2',[o.id,task]);
    }
    if(!ready)for(const t of existing)await finishResponse(tx,String(t.id));
  }
}
