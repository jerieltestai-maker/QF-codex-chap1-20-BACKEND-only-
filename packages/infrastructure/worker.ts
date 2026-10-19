import {createHash,randomUUID} from 'node:crypto';
import type {Database,Sql} from './database.js';
import {validateAndSanitize,type FileInspector} from './file-inspection.js';
import {memberships,type Actor} from '../domain/access.js';
import {taskVisible,type Task} from '../domain/task-service.js';
import {businessDayDue,loadCalendar,urgentCheckpoint} from '../domain/calendar.js';
import {enqueue} from '../domain/commands.js';
import {procurementTimers,processRefinement,notifyRfq,type QuoteCoverage} from '../domain/procurement-worker.js';
import {actualQuoteCoverage,publication,selectionOwner} from '../domain/quote-service.js';
import {scheduleResponse,reconcileProcurementClocks,quoteExpiryTimers} from '../domain/procurement-clocks.js';
import {createAttention} from '../domain/verification-service.js';
import {workTimers,currentWorkNotice} from '../domain/work-clocks.js';
import {paymentTimers,issuedReceipt} from '../domain/payment-clocks.js';
import {syncBillingSources} from '../domain/billing-service.js';
import {cancellationTimers,issuedCancellation} from '../domain/cancellation-service.js';
import {supportExecutionTimers} from '../domain/support-clocks.js';
import {feedbackTimers} from '../domain/feedback-core.js';
import {generateExport} from '../domain/export-service.js';

interface Work extends Record<string,unknown> {id:string;kind:string;resource_id:string;payload:Record<string,unknown>;lease_token:string;attempts:number}
const instant=(value:Date|string)=>new Date(value).toISOString();
export const RETRY_LIMIT=8, LEASE_MS=120000;
export class Worker {
  constructor(readonly db:Database,readonly inspector:FileInspector,readonly now:()=>Date=()=>new Date(),readonly coverage:QuoteCoverage=actualQuoteCoverage) {}
  async claim():Promise<Work|undefined> {
    return this.db.transaction(async tx=>{
      const now=this.now().toISOString();
      const [row]=await tx.query<Work>(`SELECT * FROM outbox WHERE processed_at IS NULL AND failed_at IS NULL
        AND available_at<=$1 AND (lease_until IS NULL OR lease_until<=$1)
        ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,[now]);
      if(!row)return;
      const lease=randomUUID();
      const [claimed]=await tx.query<Work>('UPDATE outbox SET lease_token=$1,lease_until=$2,attempts=attempts+1 WHERE id=$3 RETURNING *',
        [lease,new Date(this.now().getTime()+LEASE_MS).toISOString(),row.id]);
      return claimed;
    });
  }
  private async recipients(tx:Sql,task:Task):Promise<boolean> {
    const users=await tx.query(`SELECT DISTINCT u.id,u.name,u.email,u.access_version FROM users u JOIN memberships m ON m.user_id=u.id
      WHERE u.active=true AND u.email_verified=true AND m.active=true AND m.role=$1
      AND ($1='admin' OR m.estate_id=$2 OR m.organisation_id=$3)`,[task.owner_role,task.estate_id,task.organisation_id]);
    for(const user of users) {
      const all=await memberships(tx,String(user.id));
      for(const context of all.filter(m=>m.role===task.owner_role)) {
        const actor:Actor={id:String(user.id),name:String(user.name),email:String(user.email),accessVersion:Number(user.access_version),memberships:all,context,csrf:'',sessionHash:''};
        if(await taskVisible(tx,actor,task))return true;
      }
    }
    return false;
  }
  private async issue(tx:Sql,work:Work) {
    const [task]=await tx.query<Task>('SELECT * FROM tasks WHERE id=$1 FOR UPDATE',[work.resource_id]);
    if(!task||task.status!=='open')return;
    if(!await currentWorkNotice(tx,task.id))return;
    if(work.payload.taskVersion!==undefined && task.version!==work.payload.taskVersion)return;
    if(work.payload.step==='initial' && task.acknowledged_at)return;
    if(['T18','urgent'].includes(String(work.payload.rule)) && task.acknowledged_at)return;
    if(work.payload.rule==='T17.actor') {
      const [clock]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[work.payload.roundId]);
      const rfq=await publication(tx,String(task.resource_id));
      if(!clock||clock.status!=='active'||clock.iteration!==work.payload.iteration||clock.actor_issued_at||rfq.round_id!==clock.round_id||
        (clock.scheduled_review_at&&new Date(clock.scheduled_review_at as string)>this.now())||(await actualQuoteCoverage(tx,String(clock.round_id),Number(rfq.scope_version),this.now())).length<3)return;
    }
    if(!await this.recipients(tx,task))throw new Error('NO_AUTHORIZED_RECIPIENT');
    const now=this.now(),key=String(work.payload.dedupeKey??`${task.id}:${work.payload.step}`);
    // Calendar validation precedes issuance: a failed transaction leaves both notice and anchor absent.
    const needsUrgent=work.payload.step==='initial' && task.rule_version==='T19-v1' && !task.acknowledged_at && !task.first_issued_at;
    const needsReminder=work.payload.step==='initial' && task.owner_role==='admin' && !work.payload.informational && !task.acknowledged_at && !task.first_issued_at && !needsUrgent;
    const calendar=needsReminder?await loadCalendar(tx):null;
    const due=calendar?businessDayDue(now,1,calendar):null;
    const inserted=await tx.query(`INSERT INTO notifications(id,task_id,dedupe_key,message,copy_version,issued_at)
      VALUES($1,$2,$3,$4,'shared-v1',$5) ON CONFLICT(dedupe_key) DO NOTHING RETURNING issued_at`,
      [randomUUID(),task.id,key,String(work.payload.message),now.toISOString()]);
    if(!inserted.length)return;
    await tx.query('UPDATE tasks SET first_issued_at=COALESCE(first_issued_at,$1) WHERE id=$2',[now.toISOString(),task.id]);
    await issuedReceipt(tx,task.id,now);
    await issuedCancellation(tx,task.id,now);
    if(work.payload.step==='initial'&&!task.first_issued_at)await scheduleResponse(tx,task,now);
    if(work.payload.rule==='T17.actor')await tx.query('UPDATE selection_clocks SET actor_issued_at=$1 WHERE round_id=$2',[now.toISOString(),work.payload.roundId]);
    await tx.query('UPDATE selection_clocks SET admin_issued_at=COALESCE(admin_issued_at,$1) WHERE admin_task_id=$2',[now.toISOString(),task.id]);
    if(calendar&&due)await tx.query(`INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,calendar_version,anchor_at,due_at,dedupe_key)
      VALUES($1,$2,$3,'T18','T18-v1',$4,$5,$6,$7) ON CONFLICT(dedupe_key) DO NOTHING`,
      [randomUUID(),task.id,task.version,calendar.version,now.toISOString(),due.toISOString(),`T18:${task.id}:initial`]);
    if(needsUrgent)await tx.query(`INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key)
      VALUES($1,$2,$3,'urgent','T19-v1',$4,$5,$6)`,[randomUUID(),task.id,task.version,now.toISOString(),new Date(now.getTime()+900000).toISOString(),`urgent:${task.id}:15`]);
    if(work.payload.informational===true)await tx.query("UPDATE tasks SET status='resolved' WHERE id=$1",[task.id]);
  }
  async process(work:Work):Promise<void> {
    try {
      let scanned:{original:Buffer;sanitized:Buffer|null;state:'ready'|'rejected';code:string|null;mediaType:string}|undefined;
      if(work.kind==='file.scan') {
        const [upload]=await this.db.query('SELECT * FROM upload_intents WHERE id=$1',[work.resource_id]);
        if(upload?.state==='verifying') {
          const chunks=await this.db.query('SELECT bytes FROM upload_chunks WHERE upload_id=$1 ORDER BY byte_offset',[work.resource_id]);
          const original=Buffer.concat(chunks.map(c=>Buffer.from(c.bytes as Uint8Array)));
          const mediaType=String(upload.media_type);
          if(original.length!==upload.byte_size || createHash('sha256').update(original).digest('hex')!==upload.checksum)
            scanned={original,sanitized:null,state:'rejected',code:'CHECKSUM_MISMATCH',mediaType};
          else {
            const scan=await this.inspector.scan(original);
            if(scan==='unavailable')throw new Error('SCANNER_UNAVAILABLE');
            if(scan==='infected')scanned={original,sanitized:null,state:'rejected',code:'MALWARE_DETECTED',mediaType};
            else {
              try {scanned={original,sanitized:await validateAndSanitize(original,mediaType),state:'ready',code:null,mediaType};}
              catch {scanned={original,sanitized:null,state:'rejected',code:'INVALID_FILE_TYPE',mediaType};}
            }
          }
        }
      }
      await this.db.transaction(async tx=>{
        await tx.query('SELECT pg_advisory_xact_lock(734130)');
        const [current]=await tx.query('SELECT lease_token,processed_at FROM outbox WHERE id=$1 FOR UPDATE',[work.id]);
        if(current?.lease_token!==work.lease_token || current.processed_at)return;
        if(work.kind==='notification.issue')await this.issue(tx,work);
        if(work.kind==='export.generate')await generateExport(tx,work.resource_id,this.now());
        if(work.kind==='rfq.refine')await processRefinement(tx,work.resource_id,this.now());
        if(work.kind==='rfq.changed')await notifyRfq(tx,work.resource_id,Number(work.payload.revision),this.now(),work.payload.roundId as string|undefined);
        if(work.kind==='quote.changed') {
          const rfq=await publication(tx,work.resource_id);
          const [quote]=await tx.query('SELECT round_id,version FROM quotes WHERE id=$1',[work.payload.quoteId]);
          if(rfq.status==='open'&&quote&&quote.round_id===rfq.round_id&&quote.version===work.payload.quoteVersion)await createAttention(tx,this.now(),{kind:'quote.updated',resourceId:work.resource_id,estateId:String(rfq.estate_id),ownerRole:await selectionOwner(tx,work.resource_id),action:'A contractor updated its sealed quote. Review the current comparison.',informational:true});
        }
        if(work.kind==='selection.changed') {
          const [current]=await tx.query('SELECT c.organisation_id,s.status FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.selection_id=$1 AND s.version=$2',[work.payload.selectionId,work.payload.version]);
          if(current)await createAttention(tx,this.now(),{kind:'selection.outcome',resourceId:work.resource_id,organisationId:String(current.organisation_id),ownerRole:'contractor',action:current.status==='pending'?'Your exact quote is held while awaiting MCST approval. Work is not authorised.':current.status==='authorised'?'Your quote was selected and work is authorised.':'The estate rejected this nomination. Quoting may resume under the current round.',informational:true});
        }
        if(['rfq.changed','quote.changed','selection.changed'].includes(work.kind))await reconcileProcurementClocks(tx,this.now());
        if(scanned) {
          const [upload]=await tx.query('SELECT state FROM upload_intents WHERE id=$1 FOR UPDATE',[work.resource_id]);
          if(upload?.state==='verifying') {
            const now=this.now().toISOString();
            if(scanned.state==='ready')for(const [variant,bytes,type] of [
              ['original',scanned.original,scanned.mediaType],['sanitized',scanned.sanitized,'image/png']
            ] as const)if(bytes)await tx.query('INSERT INTO file_objects VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(upload_id,variant) DO NOTHING',
              [randomUUID(),work.resource_id,variant,type,createHash('sha256').update(bytes).digest('hex'),bytes,now]);
            await tx.query('UPDATE upload_intents SET state=$1,rejection_code=$2 WHERE id=$3',[scanned.state,scanned.code,work.resource_id]);
            await tx.query(`INSERT INTO audit_events(id,action,resource_id,before_value,after_value,request_id,recorded_at)
              VALUES($1,'file.verified',$2,$3,$4,$5,$6)`,[randomUUID(),work.resource_id,{state:'verifying'},{state:scanned.state,code:scanned.code},work.id,now]);
          }
        }
        // Other registered domain events are durable integration facts; current chapters have no subscriber.
        const known=['notification.issue','file.scan','workspace.changed','workspace.evidence','task.changed',
          'membership.invite','membership.accept-invite','contractor.apply','membership.revoke','rfq.refine','rfq.changed','quote.changed','selection.changed','work.changed','export.generate'];
        if(!known.includes(work.kind))throw new Error('UNBOUND_EVENT_KIND');
        await tx.query('UPDATE outbox SET processed_at=$1,lease_token=NULL,lease_until=NULL,last_error_code=NULL WHERE id=$2',[this.now().toISOString(),work.id]);
      });
    } catch(error) {
      const permitted=['NO_AUTHORIZED_RECIPIENT','SCANNER_UNAVAILABLE','UNBOUND_EVENT_KIND','EXPORT_ACCESS_REVOKED'];
      const code=error instanceof Error && permitted.includes(error.message)?error.message:'WORK_FAILED';
      const delay=Math.min(300000,1000*2**Math.min(work.attempts-1,9));
      await this.db.query(`UPDATE outbox SET lease_token=NULL,lease_until=NULL,last_error_code=$1,
        available_at=$2,failed_at=$3 WHERE id=$4 AND lease_token=$5 AND processed_at IS NULL`,
        [code,new Date(this.now().getTime()+delay).toISOString(),work.attempts>=RETRY_LIMIT?this.now().toISOString():null,work.id,work.lease_token]);
    }
  }
  async timers() {
    await this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const now=this.now();
      await reconcileProcurementClocks(tx,now);
      await quoteExpiryTimers(tx,now);
      await procurementTimers(tx,now,this.coverage);
      await workTimers(tx,now);
      await paymentTimers(tx,now);
      await syncBillingSources(tx,now);
      await cancellationTimers(tx,now);
      await supportExecutionTimers(tx,now);
      await feedbackTimers(tx,now);
      const timers=await tx.query(`SELECT * FROM timer_jobs WHERE status='pending' AND due_at<=$1 ORDER BY due_at,id LIMIT 100 FOR UPDATE SKIP LOCKED`,[now.toISOString()]);
      for(const timer of timers) {
        const [task]=await tx.query<Task>('SELECT * FROM tasks WHERE id=$1 FOR UPDATE',[timer.task_id]);
        if(!task||task.status!=='open'||task.version!==timer.task_version ||
          (['T18','urgent'].includes(String(timer.rule)) && task.acknowledged_at)) {
          await tx.query("UPDATE timer_jobs SET status='superseded',executed_at=$1 WHERE id=$2",[now.toISOString(),timer.id]);continue;
        }
        const checkpoint=timer.rule==='urgent'?urgentCheckpoint(new Date(timer.anchor_at as Date|string),now):null;
        if(timer.rule==='response.admin') {
          if(!task.escalated_at) {
            const escalation=await createAttention(tx,now,{kind:'response.escalation',resourceId:task.id,...(task.estate_id?{estateId:task.estate_id}:{}),...(task.organisation_id?{organisationId:task.organisation_id}:{}),action:`${task.owner_role.toUpperCase()} has an unanswered ${task.kind} action. Record Admin follow-up.`});
            if(task.support_id)await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[task.support_id,escalation]);
            await tx.query('UPDATE tasks SET escalated_at=$1 WHERE id=$2',[now.toISOString(),task.id]);
          }
          await tx.query("UPDATE timer_jobs SET status='done',executed_at=$1,effective_at=due_at WHERE id=$2",[now.toISOString(),timer.id]);continue;
        }
        const dedupeKey=checkpoint?`urgent:${task.id}:${checkpoint.offsetMinutes}`:String(timer.dedupe_key);
        await enqueue(tx,'notification.issue',task.id,{taskId:task.id,taskVersion:task.version,rule:timer.rule,
          dedupeKey,step:dedupeKey,
          message:timer.rule==='response.actor'?'Your response is still required. Answer or make the displayed decision.':timer.rule==='T11'?'The saved Admin follow-up is due.':timer.rule==='urgent'?'An urgent Admin attention item is still unacknowledged.':'An Admin attention item is still unacknowledged.',
          effectiveAt:instant(timer.due_at as Date|string)},now);
        await tx.query("UPDATE timer_jobs SET status='done',executed_at=$1,effective_at=due_at WHERE id=$2",[now.toISOString(),timer.id]);
        if(checkpoint)await tx.query(`INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key)
          VALUES($1,$2,$3,'urgent','T19-v1',$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING`,
          [randomUUID(),task.id,task.version,instant(timer.anchor_at as Date|string),checkpoint.nextDue.toISOString(),`urgent:${task.id}:next:${checkpoint.nextDue.toISOString()}`]);
      }
    });
  }
  async tick(limit=25) {
    await this.timers();
    for(let i=0;i<limit;i++) {const work=await this.claim();if(!work)break;await this.process(work);}
  }
}
