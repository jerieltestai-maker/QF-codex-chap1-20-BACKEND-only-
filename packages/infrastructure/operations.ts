import type {Database,Sql} from './database.js';
import type {Actor} from '../domain/access.js';

// Engineering diagnostic thresholds, not a customer response SLA or a business timer.
export const OPERATIONAL_TARGETS={workerStaleSeconds:30,queueAgeSeconds:60,timerLagSeconds:60,initialNoticeSeconds:60} as const;
export async function recordWorkerTick(db:Database,now:Date,success:boolean) {
  const at=now.toISOString();
  await db.query(`INSERT INTO worker_health(singleton,last_attempt_at,last_success_at,last_failure_at,consecutive_failures)
    VALUES(true,$1,$2,$3,$4) ON CONFLICT(singleton) DO UPDATE SET last_attempt_at=$1,
    last_success_at=CASE WHEN $5 THEN $1 ELSE worker_health.last_success_at END,
    last_failure_at=CASE WHEN $5 THEN worker_health.last_failure_at ELSE $1 END,
    consecutive_failures=CASE WHEN $5 THEN 0 ELSE worker_health.consecutive_failures+1 END`,
    [at,success?at:null,success?null:at,success?0:1,success]);
}
export async function operationalSnapshot(db:Sql,now:Date,actor?:Actor) {
  const excluded=`($3::uuid=ANY(s.subject_user_ids) OR s.subject_organisation_ids && $4::uuid[])`;
  const taskVisible=`NOT EXISTS(SELECT 1 FROM support_requests s WHERE s.id=t.support_id AND ${excluded})`;
  const workVisible=`NOT EXISTS(SELECT 1 FROM support_requests s WHERE ${excluded} AND
    (s.id=o.resource_id OR EXISTS(SELECT 1 FROM tasks t WHERE t.id=o.resource_id AND t.support_id=s.id)
      OR EXISTS(SELECT 1 FROM upload_intents u WHERE u.id=o.resource_id AND u.support_id=s.id)))`;
  // One MVCC snapshot. No payloads, resource IDs, identities, error text or file URLs leave this query.
  const [row]=await db.query(`SELECT
    (SELECT count(*)::integer FROM outbox o WHERE processed_at IS NULL AND failed_at IS NOT NULL AND ${workVisible}) AS failed,
    (SELECT count(*)::integer FROM outbox o WHERE processed_at IS NULL AND failed_at IS NULL AND ${workVisible}) AS pending,
    (SELECT min(available_at) FROM outbox o WHERE processed_at IS NULL AND failed_at IS NULL AND available_at<=$1 AND ${workVisible}) AS oldest,
    (SELECT count(*)::integer FROM outbox o WHERE processed_at IS NULL AND failed_at IS NULL AND lease_until<=$1 AND ${workVisible}) AS expired_leases,
    (SELECT min(j.due_at) FROM timer_jobs j JOIN tasks t ON t.id=j.task_id WHERE j.status='pending' AND j.due_at<=$1 AND ${taskVisible}) AS oldest_timer,
    (SELECT count(*)::integer FROM tasks t WHERE status='open' AND informational=false AND first_issued_at IS NULL AND COALESCE(actionable_at,created_at)<$2 AND ${taskVisible}) AS unissued,
    (SELECT count(*)::integer FROM tasks t WHERE status='open' AND owner_role='admin' AND acknowledged_at IS NOT NULL AND (follow_up_at IS NULL OR next_action IS NULL OR length(trim(next_action))=0) AND ${taskVisible}) AS missing_follow_up,
    (SELECT count(*)::integer FROM outbox o WHERE kind='file.scan' AND processed_at IS NULL AND (failed_at IS NOT NULL OR attempts>0) AND ${workVisible}) AS scan_failures,
    (SELECT row_to_json(h) FROM worker_health h WHERE singleton) AS worker`,[now.toISOString(),new Date(now.getTime()-OPERATIONAL_TARGETS.initialNoticeSeconds*1000).toISOString(),actor?.id??null,actor?.memberships.flatMap(m=>m.organisation_id?[m.organisation_id]:[])??[]]);
  const age=(at:unknown)=>at?Math.max(0,Math.floor((now.getTime()-new Date(at as string).getTime())/1000)):0;
  const worker=row!.worker as {last_success_at:string|null;consecutive_failures:number}|null;
  const metrics={failedWork:Number(row!.failed),pendingWork:Number(row!.pending),oldestWorkSeconds:age(row!.oldest),expiredLeases:Number(row!.expired_leases),
    timerLagSeconds:age(row!.oldest_timer),unissuedNotices:Number(row!.unissued),missingAdminFollowUp:Number(row!.missing_follow_up),scanFailures:Number(row!.scan_failures),
    workerLastSuccessAt:worker?.last_success_at??null,workerAgeSeconds:worker?.last_success_at?age(worker.last_success_at):null,workerFailures:worker?.consecutive_failures??0};
  const alerts:string[]=[];
  if(metrics.workerAgeSeconds===null||metrics.workerAgeSeconds>OPERATIONAL_TARGETS.workerStaleSeconds||metrics.workerFailures)alerts.push('WORKER_UNHEALTHY');
  if(metrics.failedWork)alerts.push('FAILED_WORK');
  if(metrics.oldestWorkSeconds>OPERATIONAL_TARGETS.queueAgeSeconds)alerts.push('QUEUE_DELAY');
  if(metrics.timerLagSeconds>OPERATIONAL_TARGETS.timerLagSeconds)alerts.push('TIMER_DELAY');
  if(metrics.unissuedNotices)alerts.push('INITIAL_NOTICE_DELAY');
  if(metrics.missingAdminFollowUp)alerts.push('MISSING_ADMIN_FOLLOW_UP');
  if(metrics.scanFailures)alerts.push('SCAN_UNAVAILABLE');
  return {status:alerts.length?'attention':'healthy',serverTime:now.toISOString(),metrics,alerts,targets:OPERATIONAL_TARGETS,runbook:'docs/implementation/OPERATIONS_RUNBOOK.md'};
}
