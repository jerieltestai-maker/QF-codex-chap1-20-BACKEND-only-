import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Actor} from './access.js';
import type {Sql} from '../infrastructure/database.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {contractorOnly,type WorkState} from './work-core.js';
import {completion,money,readyFile,pendingVariation,mcstOnly,balance,blockers,paymentEvent,observedDate,finishKind} from './completion-core.js';
import {reconcileSettlement} from './payment-clocks.js';
import {createAttention,adminOnly} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {businessDayDue,explicitInstant,loadCalendar,singaporeInstant} from './calendar.js';
import {financialAccess} from './support-core.js';
import {assessFinancial} from './billing-service.js';

export class PaymentService {
  constructor(readonly commands:CommandService) {}
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:unknown,role:(a:Actor)=>void,work:(tx:Sql,a:Actor,w:WorkState)=>Promise<void>) {
    return this.commands.run(token,meta,intent,{id,...body as object},async(tx,a)=>{await financialAccess(tx,a,id);role(a);},async(tx,a)=>{
      const w=await financialAccess(tx,a,id);requireVersion(w.version,meta.expectedVersion);
      const now=this.commands.now();await work(tx,a,w);
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);await reconcileSettlement(tx,id,now);
      return {jobId:id,version:(await financialAccess(tx,a,id)).version};
    });
  }
  async confirmInvoice(token:string,meta:WorkspaceCommand,id:string,body:{invoiceVersion:number;amountSgd:string;confirmed:boolean}) {
    return this.run(token,meta,id,'payment.confirm-invoice',body,mcstOnly,async(tx,a,w)=>{
      const c=await completion(tx,id),now=this.commands.now();
      if(!c||c.confirmed_version||!c.accepted_round||c.accepted_round!==c.round||w.status!=='active')throw new AppError(409,'INVOICE_NOT_ACTIONABLE','Current accepted works and an unconfirmed invoice are required');
      requireVersion(c.invoice_version,body.invoiceVersion);await pendingVariation(tx,id);
      if((await blockers(tx,id)).length)throw new AppError(409,'BLOCKING_CASE','Resolve outstanding support obligations before financial confirmation');
      const amount=money(body.amountSgd);
      if(c.scope!==w.scope||amount!==String(c.amount_cents)||BigInt(amount)!==BigInt(w.amount_cents))throw new AppError(409,'INVOICE_MISMATCH','Confirm only the exact invoice reconciled to authorised scope and total');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the exact reconciled invoice');
      await tx.query('INSERT INTO invoice_confirmations VALUES($1,$2,$3,$4,$5)',[id,c.invoice_version,amount,a.id,now.toISOString()]);
      await tx.query('INSERT INTO billing_sources VALUES($1,$2,$3,$4)',[id,c.invoice_version,amount,now.toISOString()]);
      await assessFinancial(tx,{jobId:id,organisationId:w.organisation_id,amount:BigInt(amount),source:'invoice',sourceId:id,actorId:a.id,reason:'Exact MCST invoice confirmation'},now);
      await tx.query('UPDATE completion_state SET confirmed_version=$1 WHERE job_id=$2',[c.invoice_version,id]);await finishKind(tx,id,'completion.confirm');
      await paymentEvent(tx,id,null,'invoice.confirmed',{invoiceVersion:c.invoice_version,amountCents:amount,billingSource:id},now,a);
      await audit(tx,a,'payment.confirm-invoice',id,null,{invoiceVersion:c.invoice_version,amountCents:amount,billingSource:id},meta.requestId,now);
    });
  }
  async transfer(token:string,meta:WorkspaceCommand,id:string,body:{invoiceVersion:number;financialVersion?:number;proofId:string;amountSgd:string;transferDate:string;rationale?:string;reference?:string;completedTransfer:boolean;confirmed:boolean;duplicateAcknowledged?:boolean}) {
    return this.run(token,meta,id,'payment.transfer',body,mcstOnly,async(tx,a,w)=>{
      const c=await completion(tx,id),now=this.commands.now(),[financial]=await tx.query('SELECT version FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      if(!financial&&!c?.confirmed_version)throw new AppError(409,'INVOICE_UNCONFIRMED','MCST must confirm the invoice or exact settlement first');
      requireVersion(c?.confirmed_version??Number(financial!.version),body.invoiceVersion);
      if(financial&&Number(financial.version)>1)requireVersion(Number(financial.version),body.financialVersion??0);
      if(!body.confirmed||!body.completedTransfer)throw new AppError(422,'CONFIRMATION_REQUIRED','Record only a completed bank transfer with deliberate confirmation');
      await readyFile(tx,a,id,body.proofId,'payment_proof');const amount=BigInt(money(body.amountSgd)),b=await balance(tx,id);
      if(amount<=0n||amount>b.unsent)throw new AppError(422,'PAYMENT_AMOUNT_INVALID','Payment must be positive and no greater than the unsent balance');
      const observed=observedDate(body.transferDate,now),rationale=amount<b.unsent?requiredText(body.rationale??''):(body.rationale??'').trim(),reference=(body.reference??'').trim();
      const [used]=await tx.query('SELECT id FROM payment_transfers WHERE proof_id=$1',[body.proofId]);if(used)throw new AppError(409,'PROOF_ALREADY_USED','This proof already records a transfer');
      const duplicates=await tx.query(`SELECT t.id FROM payment_transfers t JOIN file_objects f ON f.id=t.proof_id
        WHERE t.job_id=$1 AND t.status<>'void' AND (f.checksum=(SELECT checksum FROM file_objects WHERE id=$2)
        OR ($3<>'' AND t.reference=$3) OR (t.amount_cents=$4 AND t.transfer_date=$5))`,[id,body.proofId,reference,amount.toString(),observed.value]);
      if(duplicates.length&&!body.duplicateAcknowledged)throw new AppError(409,'POSSIBLE_DUPLICATE','Possible duplicate transfer. Review the recorded transfers and explicitly acknowledge before recording a separate instalment');
      const tid=randomUUID(),task=await createAttention(tx,now,{kind:'payment.receipt',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:'contractor',action:'Confirm actual receipt of this exact transfer or report a Payment Issue. The seven-day period begins when this notice is successfully issued.'});
      await tx.query(`INSERT INTO payment_transfers(id,job_id,invoice_version,amount_cents,proof_id,transfer_date,rationale,reference,actor_id,reported_at,receipt_task_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[tid,id,c?.confirmed_version??null,amount.toString(),body.proofId,observed.value,rationale,reference,a.id,now.toISOString(),task]);
      await paymentEvent(tx,id,tid,'transfer.recorded',{amountCents:amount.toString(),transferDate:observed.value,proofId:body.proofId,rationale,reference,possibleDuplicates:duplicates.map(d=>d.id),duplicateAcknowledged:body.duplicateAcknowledged??false},now,a);
      await audit(tx,a,'payment.transfer',id,{unsentCents:b.unsent.toString()},{transferId:tid,amountCents:amount.toString(),proofId:body.proofId},meta.requestId,now);
    });
  }
  private async exactTransfer(tx:Sql,id:string,tid:string) {
    const [t]=await tx.query('SELECT * FROM payment_transfers WHERE id=$1 AND job_id=$2',[tid,id]);
    if(!t)throw new AppError(404,'NOT_FOUND','Transfer unavailable');return t;
  }
  async receipt(token:string,meta:WorkspaceCommand,id:string,body:{transferId:string;amountSgd:string;receiptDate:string;confirmed:boolean}) {
    return this.run(token,meta,id,'payment.receipt',body,contractorOnly,async(tx,a)=>{
      const t=await this.exactTransfer(tx,id,body.transferId),now=this.commands.now();
      if(!['pending','assumed'].includes(String(t.status)))throw new AppError(409,'RECEIPT_NOT_ACTIONABLE','Resolve a disputed or already recorded receipt through its current task');
      if(!body.confirmed||money(body.amountSgd)!==String(t.amount_cents))throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm receipt of the exact transfer amount');
      const date=observedDate(body.receiptDate,now,/^\d{4}-\d{2}-\d{2}$/.test(String(t.transfer_date))?singaporeInstant(String(t.transfer_date)):explicitInstant(String(t.transfer_date)));
      await tx.query("UPDATE payment_transfers SET status='actual',receipt_date=$1,receipt_precision=$2 WHERE id=$3",[date.value,date.precision,t.id]);
      await finishResponse(tx,String(t.receipt_task_id));
      // A correction from assumed to actual receipt changes the factual Feedback anchor without deleting history.
      const [anchor]=await tx.query('DELETE FROM settlement_anchors WHERE job_id=$1 RETURNING *',[id]);
      if(anchor)await paymentEvent(tx,id,null,'settlement.revised',anchor,now,a);
      await paymentEvent(tx,id,String(t.id),'receipt.actual',{before:t.status,receiptDate:date.value,precision:date.precision,amountCents:String(t.amount_cents)},now,a);
      await audit(tx,a,'payment.receipt',id,{status:t.status},{transferId:t.id,receiptDate:date.value,precision:date.precision},meta.requestId,now);
    });
  }
  async issue(token:string,meta:WorkspaceCommand,id:string,body:{transferId?:string;description:string}) {
    return this.run(token,meta,id,'payment.issue',body,contractorOnly,async(tx,a,w)=>{
      if(!body.transferId) {
        const b=await balance(tx,id),description=requiredText(body.description),now=this.commands.now();
        if(b.unsent<=0n)throw new AppError(409,'NO_UNSENT_BALANCE','Use the specific transfer for an issue about recorded payments');
        const [existing]=await tx.query("SELECT support_id FROM tasks WHERE resource_id=$1 AND kind='payment.balance-issue' AND status='open'",[id]);
        const supportId=existing?String(existing.support_id):randomUUID();
        if(!existing) {
          await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[supportId,id,a.id,description,now.toISOString()]);
          const task=await createAttention(tx,now,{kind:'payment.balance-issue',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,action:'Review the unpaid-balance issue. Retain the balance, actual payment/receipt obligations and a dated Admin follow-up.'});
          await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,task]);
        }
        await paymentEvent(tx,id,null,'payment.balance-issue',{supportId,description,unsentCents:b.unsent.toString()},now,a);
        await audit(tx,a,'payment.issue',id,{unsentCents:b.unsent.toString()},{supportId,description},meta.requestId,now);return;
      }
      const t=await this.exactTransfer(tx,id,body.transferId),now=this.commands.now(),description=requiredText(body.description);
      if(t.status==='void')throw new AppError(409,'TRANSFER_VOID','This transfer was voided');
      let supportId=t.issue_id?String(t.issue_id):randomUUID();
      if(t.status!=='disputed') {
        supportId=randomUUID();await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[supportId,id,a.id,description,now.toISOString()]);
        const task=await createAttention(tx,now,{kind:'payment.issue',resourceId:id,estateId:w.estate_id,action:'Review the payment issue, preserve evidence and verify actual execution before resolving.'});
        await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,task]);
      }
      await tx.query("UPDATE payment_transfers SET status='disputed',issue_id=$1 WHERE id=$2",[supportId,t.id]);await finishResponse(tx,String(t.receipt_task_id));
      await paymentEvent(tx,id,String(t.id),'payment.issue',{beforeStatus:t.status,previousReceiptDate:t.receipt_date,description,supportId},now,a);
      await audit(tx,a,'payment.issue',id,{status:t.status},{transferId:t.id,supportId,description},meta.requestId,now);
    });
  }
  async resolveBalance(token:string,meta:WorkspaceCommand,id:string,body:{supportId:string;reason:string;executionEvidence:string}) {
    return this.run(token,meta,id,'payment.resolve-balance',body,adminOnly,async(tx,a,w)=>{
      const reason=requiredText(body.reason),evidence=requiredText(body.executionEvidence),now=this.commands.now(),c=await completion(tx,id),b=await balance(tx,id);
      const [financial]=await tx.query('SELECT id,version FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      const tasks=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND support_id=$2 AND kind='payment.balance-issue' AND status='open'",[id,body.supportId]);
      if(!tasks.length)throw new AppError(409,'NO_PAYMENT_ISSUE','No unresolved balance case is available');
      const accepted=w.status==='cancelled'?!!financial:!!c?.confirmed_version&&c.accepted_round===c.round&&c.scope===w.scope;
      if(!accepted||b.unsent!==0n||b.outstanding!==0n||b.disputed!==0n)
        throw new AppError(409,'OBLIGATIONS_OUTSTANDING','Work acceptance and full recorded settlement must be verified before resolving the balance case');
      for(const task of tasks)await finishResponse(tx,String(task.id));
      await paymentEvent(tx,id,null,'payment.balance-resolved',{supportId:body.supportId,reason,executionEvidence:evidence,acceptedRound:c?.accepted_round??null,invoiceVersion:c?.confirmed_version??null,financialConfirmationId:financial?.id??null},now,a);
      await audit(tx,a,'payment.resolve-balance',id,{supportId:body.supportId},{reason,executionEvidence:evidence,acceptedRound:c?.accepted_round??null,financialConfirmationId:financial?.id??null},meta.requestId,now,reason);
    });
  }
  async resolve(token:string,meta:WorkspaceCommand,id:string,body:{transferId:string;outcome:'pending'|'void'|'actual';reason:string;executionEvidence:string;receiptDate?:string;nextAction?:string;followUpAt?:string}) {
    return this.run(token,meta,id,'payment.resolve',body,adminOnly,async(tx,a)=>{
      const t=await this.exactTransfer(tx,id,body.transferId),now=this.commands.now(),reason=requiredText(body.reason),evidence=requiredText(body.executionEvidence);
      if(t.status!=='disputed')throw new AppError(409,'NO_PAYMENT_ISSUE','An unresolved transfer issue is required');
      const observed=body.outcome==='actual'?observedDate(body.receiptDate??'',now,/^\d{4}-\d{2}-\d{2}$/.test(String(t.transfer_date))?singaporeInstant(String(t.transfer_date)):explicitInstant(String(t.transfer_date))):null;
      if(body.outcome==='pending') {
        const nextAction=requiredText(body.nextAction??''),followUp=explicitInstant(body.followUpAt??'');
        if(followUp<=now)throw new AppError(422,'FIELD_VALIDATION','Unverified receipt requires a future Admin follow-up');
        const tasks=await tx.query("SELECT id,version FROM tasks WHERE support_id=$1 AND owner_role='admin' AND status='open'",[t.issue_id]);
        if(!tasks.length)throw new AppError(409,'CASE_TASK_MISSING','The unresolved payment case needs its Admin task');
        for(const task of tasks) {
          const version=Number(task.version)+1;
          await tx.query('UPDATE tasks SET acknowledged_at=COALESCE(acknowledged_at,$1),acknowledged_by=$2,next_action=$3,follow_up_at=$4,version=$5 WHERE id=$6',[now.toISOString(),a.id,nextAction,followUp.toISOString(),version,task.id]);
          await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND status='pending'",[task.id]);
          await tx.query("INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key) VALUES($1,$2,$3,'T11','T11-v1',$4,$5,$6)",[randomUUID(),task.id,version,now.toISOString(),followUp.toISOString(),`payment-unverified:${task.id}:${version}`]);
        }
      }
      // An unverified verdict retains the dispute and a dated obligation; it never restarts silence.
      await tx.query('UPDATE payment_transfers SET status=$1,receipt_date=$2,receipt_precision=$3,receipt_due_at=NULL WHERE id=$4',[body.outcome==='pending'?'disputed':body.outcome,observed?.value??null,observed?.precision??null,t.id]);
      if(body.outcome!=='pending')for(const task of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND status='open'",[t.issue_id]))await finishResponse(tx,String(task.id));
      await paymentEvent(tx,id,String(t.id),body.outcome==='pending'?'payment.unverified-follow-up':'payment.resolved',{outcome:body.outcome,reason,executionEvidence:evidence,receiptDate:observed?.value??null,oldReceiptDate:t.receipt_date,nextAction:body.nextAction??null,followUpAt:body.followUpAt??null},now,a);
      await audit(tx,a,'payment.resolve',id,{status:t.status},{transferId:t.id,outcome:body.outcome,reason,executionEvidence:evidence},meta.requestId,now,reason);
    });
  }
  async progress(token:string,meta:WorkspaceCommand,id:string,body:{explanation:string;nextUpdateAt?:string}) {
    return this.run(token,meta,id,'payment.progress',body,mcstOnly,async(tx,a,w)=>{
      const b=await balance(tx,id),now=this.commands.now();if(b.unsent<=0n)throw new AppError(409,'NO_UNSENT_BALANCE','No unrecorded balance is awaiting MCST');
      const explanation=requiredText(body.explanation),next=body.nextUpdateAt?explicitInstant(body.nextUpdateAt):null;
      if(next&&next<=now)throw new AppError(422,'FIELD_VALIDATION','A known next update must be in the future');
      await paymentEvent(tx,id,null,'payment.progress',{explanation,nextUpdateAt:next?.toISOString()??null,unsentCents:b.unsent.toString()},now,a);
      const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open'",[id]);
      const tid=task?.id??await createAttention(tx,now,{kind:'payment.follow-up.admin',resourceId:id,estateId:w.estate_id,action:'Review the MCST payment progress and retain the unsent balance with a dated follow-up.'});
      if(next) {
        await tx.query('UPDATE tasks SET next_action=$1,follow_up_at=$2,version=version+1 WHERE id=$3',[explanation,next.toISOString(),tid]);
        await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND rule='T11' AND status='pending'",[tid]);
        await tx.query("UPDATE timer_jobs SET task_version=(SELECT version FROM tasks WHERE id=$1) WHERE task_id=$1 AND rule<>'T11' AND status='pending'",[tid]);
        await tx.query("INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key) SELECT $1,id,version,'T11','T11-v1',$2,$3,$4 FROM tasks WHERE id=$5 ON CONFLICT(dedupe_key) DO NOTHING",[randomUUID(),now.toISOString(),next.toISOString(),`payment-progress:${meta.operationId}`,tid]);
      }
      await audit(tx,a,'payment.progress',id,{unsentCents:b.unsent.toString()},{explanation,nextUpdateAt:next?.toISOString()??null},meta.requestId,now);
    });
  }
  async understood(token:string,meta:WorkspaceCommand,id:string,body:{transferId:string}) {
    return this.run(token,meta,id,'payment.understood',body,contractorOnly,async(tx,a)=>{
      const t=await this.exactTransfer(tx,id,body.transferId),now=this.commands.now();if(t.status!=='assumed')throw new AppError(409,'NO_ASSUMPTION','No assumed-receipt popup is outstanding');
      await tx.query('UPDATE payment_transfers SET popup_acknowledged_at=COALESCE(popup_acknowledged_at,$1) WHERE id=$2',[now.toISOString(),t.id]);
      await paymentEvent(tx,id,String(t.id),'popup.understood',{actualReceiptConfirmed:false},now,a);
    });
  }
  async detail(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx),w=await financialAccess(tx,a,id),c=await completion(tx,id),b=await balance(tx,id);
      const {maskedName}=await import('./quote-service.js');const identity=await maskedName(tx,a,id,w.organisation_id);
      const {contractorIdentifiers,concealedText}=await import('./identity-concealment.js');const identifiers=identity.masked?await contractorIdentifiers(tx,w.organisation_id):[];
      const project=(v:unknown):unknown=>{
        if(v instanceof Date)return v.toISOString();if(typeof v==='string')return identity.masked?concealedText(v,identifiers):v;
        if(Array.isArray(v))return v.map(project);
        if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['actor_id','organisation_id','receipt_task_id','billingSource'].includes(k)).map(([k,val])=>[k,identity.masked&&['file_id','proof_id','evidence_ids'].includes(k)?null:project(val)]));
        return v;
      };
      const rounds=await tx.query('SELECT r.*,u.name AS declared_by,m.outcome,m.checklist,m.findings,m.recorded_at AS inspected_at,reviewer.name AS inspected_by FROM completion_rounds r JOIN users u ON u.id=r.actor_id LEFT JOIN inspections m ON m.job_id=r.job_id AND m.round=r.round LEFT JOIN users reviewer ON reviewer.id=m.actor_id WHERE r.job_id=$1 ORDER BY r.round',[id]);
      const invoices=await tx.query('SELECT m.*,u.name AS submitted_by FROM invoice_versions m JOIN users u ON u.id=m.actor_id WHERE m.job_id=$1 ORDER BY version',[id]);
      const confirmations=await tx.query('SELECT m.*,u.name AS confirmed_by FROM invoice_confirmations m JOIN users u ON u.id=m.actor_id WHERE m.job_id=$1',[id]);
      const events=await tx.query('SELECT e.*,u.name AS actor_name FROM payment_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.job_id=$1 ORDER BY recorded_at,id',[id]);
      const [anchor]=await tx.query('SELECT * FROM settlement_anchors WHERE job_id=$1',[id]);
      const balanceIssues=await tx.query(`SELECT s.id,s.description,t.id AS task_id,t.next_action,t.follow_up_at FROM tasks t JOIN support_requests s ON s.id=t.support_id
        WHERE t.resource_id=$1 AND t.kind='payment.balance-issue' AND t.status='open' ORDER BY s.created_at`,[id]);
      const [financial]=await tx.query('SELECT version,amount_cents,source,actor_id,recorded_at FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      let followUp:unknown=null;
      if(['mcst','admin'].includes(a.context?.role??'')&&(confirmations.length||financial)&&b.unsent>0n) {
        const calendar=await loadCalendar(tx),now=this.commands.now(),at=new Date((confirmations[0]?.recorded_at??financial!.recorded_at) as string);
        const one=businessDayDue(at,1,calendar),three=businessDayDue(at,3,calendar);
        const [progress]=await tx.query("SELECT id FROM payment_events WHERE job_id=$1 AND kind='payment.progress' LIMIT 1",[id]);
        const [saved]=await tx.query("SELECT follow_up_at FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open' AND follow_up_at IS NOT NULL",[id]);
        const next=saved?new Date(saved.follow_up_at as string):!progress&&b.sent===0n&&one>now?one:three>now?three:null;
        followUp={oneBusinessDay:one.toISOString(),threeBusinessDays:three.toISOString(),nextDueAt:next?.toISOString()??null};
      }
      return {jobId:id,version:w.version,stage:w.stage,financialConfirmation:project(financial??null),completion:project(c??null),rounds:project(rounds),invoices:project(invoices),confirmations:project(confirmations),
        balances:{payableCents:b.payable.toString(),sentCents:b.sent.toString(),receivedCents:b.received.toString(),disputedCents:b.disputed.toString(),unsentCents:b.unsent.toString(),outstandingCents:b.outstanding.toString()},
        transfers:project(b.rows.map(t=>({...t,showAssumedPopup:a.context?.role==='contractor'&&t.status==='assumed'&&!t.popup_acknowledged_at}))),balanceIssues:project(balanceIssues),events:project(events),settlementAnchor:project(anchor??null),followUp,serverTime:this.commands.now().toISOString()};
    });
  }
}
