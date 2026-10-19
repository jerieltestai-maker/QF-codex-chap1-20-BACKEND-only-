import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {adminOnly,authorizedOrganisation,createAttention,finishAttention} from './verification-service.js';
import {businessDayDue,loadCalendar} from './calendar.js';
import {money,observedDate} from './completion-core.js';
import {contractorOnly} from './work-core.js';

// Integer cents throughout. Round each component independently; never round a combined 8%.
export const feeComponent=(basis:bigint)=>(basis*4n+50n)/100n;
export async function financialTotal(tx:Sql,id:string) {
  const [latest]=await tx.query('SELECT amount_cents FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]);
  if(latest)return BigInt(String(latest.amount_cents));
  const [original]=await tx.query('SELECT amount_cents FROM invoice_confirmations WHERE job_id=$1',[id]);
  return BigInt(String(original?.amount_cents??0));
}
async function account(tx:Sql,id:string) {
  await tx.query('INSERT INTO fee_accounts(organisation_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
  const [row]=await tx.query('SELECT version FROM fee_accounts WHERE organisation_id=$1',[id]);return Number(row!.version);
}
async function bump(tx:Sql,id:string) {await tx.query('UPDATE fee_accounts SET version=version+1 WHERE organisation_id=$1',[id]);}
export async function liabilities(tx:Sql,org:string) {
  return tx.query(`SELECT e.*,e.amount_cents-COALESCE((SELECT sum(a.amount_cents) FROM fee_allocations a WHERE a.debit_id=e.id),0) AS outstanding_cents
    FROM fee_entries e WHERE organisation_id=$1 AND amount_cents>0 ORDER BY due_at,recorded_at,id`,[org]);
}
export async function credits(tx:Sql,org:string) {
  return tx.query(`SELECT e.*,-e.amount_cents-COALESCE((SELECT sum(a.amount_cents) FROM fee_allocations a WHERE a.credit_id=e.id),0)
    -COALESCE((SELECT sum(r.amount_cents) FROM fee_refunds r WHERE r.credit_id=e.id),0) AS available_cents
    FROM fee_entries e WHERE organisation_id=$1 AND amount_cents<0 ORDER BY recorded_at,id`,[org]);
}
async function applyCredits(tx:Sql,org:string,now:Date) {
  const debits=await liabilities(tx,org);
  for(const credit of await credits(tx,org)) {
    let available=BigInt(String(credit.available_cents));
    for(const debit of debits) {
      if(credit.job_id!==debit.job_id||credit.component!==debit.component)continue;
      const open=BigInt(String(debit.outstanding_cents)),amount=available<open?available:open;if(amount<=0n)continue;
      await tx.query('INSERT INTO fee_allocations VALUES($1,$2,$3,NULL,$4,$5)',[randomUUID(),debit.id,credit.id,amount.toString(),now.toISOString()]);
      available-=amount;debit.outstanding_cents=(open-amount).toString();
    }
  }
}
export async function assessFinancial(tx:Sql,body:{jobId:string;organisationId:string;amount:bigint;source:'invoice'|'settlement'|'adjustment';sourceId:string;actorId:string;reason:string},now:Date) {
  const [existing]=await tx.query('SELECT id FROM financial_confirmations WHERE source=$1 AND source_id=$2',[body.source,body.sourceId]);if(existing)return String(existing.id);
  const [previous]=await tx.query('SELECT * FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[body.jobId]);
  if(previous&&previous.organisation_id!==body.organisationId)throw new AppError(409,'LINKED_REPLACEMENT_REQUIRED','Financial history retains its original Contractor');
  const id=randomUUID(),version=Number(previous?.version??0)+1,calendar=await loadCalendar(tx),due=businessDayDue(now,3,calendar);
  await account(tx,body.organisationId);
  await tx.query('INSERT INTO financial_confirmations VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,body.jobId,version,body.organisationId,body.amount.toString(),body.source,body.sourceId,body.actorId,body.reason,now.toISOString()]);
  const delta=feeComponent(body.amount)-feeComponent(BigInt(String(previous?.amount_cents??0)));
  for(const component of ['platform','lead'])await tx.query('INSERT INTO fee_entries VALUES($1,$2,$3,$4,$5,$6,$7,400,\'independent-half-up-cent-v1\',$8,$9,$10)',[randomUUID(),id,body.organisationId,body.jobId,component,delta.toString(),body.amount.toString(),due.toISOString(),calendar.version,now.toISOString()]);
  await applyCredits(tx,body.organisationId,now);await bump(tx,body.organisationId);await billingRestrictions(tx,now,body.organisationId);return id;
}
export async function syncBillingSources(tx:Sql,now:Date) {
  for(const s of await tx.query(`SELECT b.*,c.actor_id,w.organisation_id FROM billing_sources b JOIN invoice_confirmations c ON c.job_id=b.job_id JOIN work_state w ON w.job_id=b.job_id
    WHERE NOT EXISTS(SELECT 1 FROM financial_confirmations f WHERE f.source='invoice' AND f.source_id=b.job_id) ORDER BY b.recorded_at,b.job_id`))
    await assessFinancial(tx,{jobId:String(s.job_id),organisationId:String(s.organisation_id),amount:BigInt(String(s.basis_cents)),source:'invoice',sourceId:String(s.job_id),actorId:String(s.actor_id),reason:'Exact MCST invoice confirmation'},new Date(s.recorded_at as string));
  await billingRestrictions(tx,now);
}
export async function billingRestrictions(tx:Sql,now:Date,organisationId?:string) {
  const accounts=await tx.query('SELECT organisation_id FROM fee_accounts'+(organisationId?' WHERE organisation_id=$1':''),organisationId?[organisationId]:[]);
  for(const a of accounts) {
    const org=String(a.organisation_id),overdue=(await liabilities(tx,org)).some(d=>BigInt(String(d.outstanding_cents))>0n&&new Date(d.due_at as string)<now);
    const [hold]=await tx.query("SELECT id FROM contractor_restrictions WHERE organisation_id=$1 AND source='fee' AND active=true",[org]);
    if(overdue&&!hold) {
      await tx.query("INSERT INTO contractor_restrictions(id,organisation_id,source,reason,created_at) VALUES($1,$2,'fee','Overdue fees await verified collection',$3)",[randomUUID(),org,now.toISOString()]);
      await createAttention(tx,now,{kind:'billing.restricted',resourceId:org,organisationId:org,ownerRole:'contractor',action:'Overdue QuoteFix fees restrict new quoting and selection of unselected offers. Existing selected jobs and support remain accessible.',informational:true});
      await createAttention(tx,now,{kind:'billing.collection',resourceId:org,organisationId:org,action:'Reconcile overdue Contractor fees. Prioritise pending payment evidence; a verification backlog is not evidence of nonpayment.'});await bump(tx,org);
    } else if(!overdue&&hold) {
      await tx.query('UPDATE contractor_restrictions SET active=false,version=version+1 WHERE id=$1',[hold.id]);await finishAttention(tx,org,'billing.collection');
      await createAttention(tx,now,{kind:'billing.restored',resourceId:org,organisationId:org,ownerRole:'contractor',action:'The overdue fee restriction is lifted. Other credential or account restrictions still apply.',informational:true});await bump(tx,org);
    }
    const refund=(await credits(tx,org)).some(c=>BigInt(String(c.available_cents))>0n);
    const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='billing.refund' AND status='open'",[org]);
    if(refund&&!task)await createAttention(tx,now,{kind:'billing.refund',resourceId:org,organisationId:org,action:'A fee credit requires actual refund execution. Record amount, date, reference and evidence; keep a dated follow-up.'});
    if(!refund&&task)await finishAttention(tx,org,'billing.refund');
  }
}
export class BillingService {
  constructor(readonly commands:CommandService){}
  async statement(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);await authorizedOrganisation(tx,a,id);
      await syncBillingSources(tx,this.commands.now());const [acc]=await tx.query('SELECT version FROM fee_accounts WHERE organisation_id=$1',[id]);
      const debts=await liabilities(tx,id),cs=await credits(tx,id);
      return {organisationId:id,version:Number(acc?.version??0),liabilities:debts,credits:cs,
        outstandingCents:debts.reduce((n,d)=>n+BigInt(String(d.outstanding_cents)),0n).toString(),refundDueCents:cs.reduce((n,c)=>n+BigInt(String(c.available_cents)),0n).toString(),
        confirmations:await tx.query('SELECT * FROM financial_confirmations WHERE organisation_id=$1 ORDER BY recorded_at,version',[id]),
        reports:await tx.query('SELECT r.*,v.id AS verification_id,v.amount_cents AS verified_cents,v.received_date,v.reference'+(a.context?.role==='admin'?',v.evidence AS verification_evidence':'')+' FROM fee_reports r LEFT JOIN fee_verifications v ON v.report_id=r.id WHERE r.organisation_id=$1 ORDER BY r.recorded_at,r.id',[id]),
        allocations:await tx.query('SELECT a.* FROM fee_allocations a JOIN fee_entries e ON e.id=a.debit_id WHERE e.organisation_id=$1 ORDER BY a.recorded_at,a.id',[id]),
        refunds:await tx.query('SELECT r.* FROM fee_refunds r JOIN fee_entries e ON e.id=r.credit_id WHERE e.organisation_id=$1 ORDER BY r.recorded_at,r.id',[id]),serverTime:this.commands.now().toISOString()};
    });
  }
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:object,admin:boolean,work:(tx:Sql,actorId:string,now:Date)=>Promise<object>) {
    return this.commands.run(token,meta,intent,{organisationId:id,...body},async(tx,a)=>{await authorizedOrganisation(tx,a,id);if(admin)adminOnly(a);else contractorOnly(a);},async(tx,a)=>{
      const now=this.commands.now();await syncBillingSources(tx,now);requireVersion(await account(tx,id),meta.expectedVersion);
      const result=await work(tx,a.id,now);await bump(tx,id);await billingRestrictions(tx,now,id);
      await audit(tx,a,intent,id,null,result,meta.requestId,now);return {organisationId:id,...result,version:await account(tx,id)};
    });
  }
  report(token:string,meta:WorkspaceCommand,id:string,body:{amountSgd:string;paidDate:string;proofId?:string;context:string}) {
    return this.run(token,meta,id,'billing.report',body,false,async(tx,actorId,now)=>{
      const amount=BigInt(money(body.amountSgd));if(amount<=0n)throw new AppError(422,'FIELD_VALIDATION','Report a positive payment');
      const date=observedDate(body.paidDate,now);if(!body.proofId)requiredText(body.context);
      if(body.proofId) {const [f]=await tx.query("SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND u.organisation_id=$2 AND u.owner_id=$3 AND u.purpose='fee_proof' AND u.state='ready' AND f.variant='original'",[body.proofId,id,actorId]);if(!f)throw new AppError(422,'FILE_NOT_READY','Use your ready fee-payment evidence');}
      const reportId=randomUUID();await tx.query('INSERT INTO fee_reports VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[reportId,id,amount.toString(),date.value,body.proofId??null,body.context.trim(),actorId,now.toISOString()]);
      await createAttention(tx,now,{kind:'billing.evidence',resourceId:reportId,organisationId:id,action:'Verify the reported Contractor fee payment and allocate actual collection. This submission is not verified receipt.'});return {reportId};
    });
  }
  verify(token:string,meta:WorkspaceCommand,id:string,body:{reportId:string;amountSgd:string;receivedDate:string;reference:string;evidence:string;allocations:{debitId:string;amountSgd:string}[]}) {
    return this.run(token,meta,id,'billing.verify',body,true,async(tx,actorId,now)=>{
      const [report]=await tx.query('SELECT * FROM fee_reports WHERE id=$1 AND organisation_id=$2',[body.reportId,id]);
      if(!report)throw new AppError(404,'NOT_FOUND','Report unavailable');
      if((await tx.query('SELECT id FROM fee_verifications WHERE report_id=$1',[body.reportId])).length)throw new AppError(409,'ALREADY_VERIFIED','This report already has a recorded verification');
      const amount=BigInt(money(body.amountSgd)),date=observedDate(body.receivedDate,now),reference=requiredText(body.reference),evidence=requiredText(body.evidence);
      if(amount>BigInt(String(report.amount_cents)))throw new AppError(422,'FIELD_VALIDATION','Verified collection cannot exceed this report');
      const debits=await liabilities(tx,id),seen=new Set<string>();let total=0n;
      for(const item of body.allocations) {
        const d=debits.find(d=>d.id===item.debitId),n=BigInt(money(item.amountSgd));
        if(!d||n<=0n||n>BigInt(String(d.outstanding_cents))||seen.has(item.debitId))throw new AppError(422,'ALLOCATION_INVALID','Allocate once to an outstanding liability in this account');seen.add(item.debitId);total+=n;
      }
      if(total!==amount)throw new AppError(422,'ALLOCATION_INVALID','Allocate the exact verified collection amount');
      if(amount>0n&&(await tx.query('SELECT id FROM fee_verifications WHERE reference=$1 AND amount_cents>0',[reference])).length)throw new AppError(409,'DUPLICATE_COLLECTION','This bank reference is already verified');
      const collectionId=randomUUID();await tx.query('INSERT INTO fee_verifications VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[collectionId,body.reportId,amount.toString(),date.value,reference,evidence,actorId,now.toISOString()]);
      for(const item of body.allocations)await tx.query('INSERT INTO fee_allocations VALUES($1,$2,NULL,$3,$4,$5)',[randomUUID(),item.debitId,collectionId,money(item.amountSgd),now.toISOString()]);
      await finishAttention(tx,body.reportId,'billing.evidence');return {collectionId,verifiedCents:amount.toString()};
    });
  }
  refund(token:string,meta:WorkspaceCommand,id:string,body:{creditId:string;amountSgd:string;refundedDate:string;reference:string;evidence:string}) {
    return this.run(token,meta,id,'billing.refund',body,true,async(tx,actorId,now)=>{
      const c=(await credits(tx,id)).find(c=>c.id===body.creditId),amount=BigInt(money(body.amountSgd));
      if(!c||amount<=0n||amount>BigInt(String(c.available_cents)))throw new AppError(422,'REFUND_INVALID','Record no more than the available fee credit');
      const date=observedDate(body.refundedDate,now),reference=requiredText(body.reference),evidence=requiredText(body.evidence);
      if((await tx.query('SELECT id FROM fee_refunds WHERE reference=$1',[reference])).length)throw new AppError(409,'DUPLICATE_REFUND','This refund reference is already recorded');
      const refundId=randomUUID();await tx.query('INSERT INTO fee_refunds VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[refundId,c.id,amount.toString(),date.value,reference,evidence,actorId,now.toISOString()]);return {refundId};
    });
  }
}
