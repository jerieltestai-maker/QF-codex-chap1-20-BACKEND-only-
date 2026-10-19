import {randomUUID} from 'node:crypto';
import {AppError,sgdCents,dateOnly} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {explicitInstant,singaporeDate,singaporeInstant} from './calendar.js';
import {readWork,type WorkState} from './work-core.js';
import {createAttention} from './verification-service.js';
import {responseTask,finishResponse} from './procurement-clocks.js';
import {financialTotal} from './billing-service.js';

export interface Completion extends Record<string,unknown> {
  job_id:string; round:number; invoice_version:number; accepted_round:number|null; confirmed_version:number|null;
  amount_cents:string; scope:string; completed_at:string; file_id:string; explanation:string;
}
export async function completion(tx:Sql,id:string):Promise<Completion|undefined> {
  const [c]=await tx.query<Completion>(`SELECT c.*,i.amount_cents,i.file_id,i.explanation,r.scope,r.completed_at
    FROM completion_state c JOIN invoice_versions i ON i.job_id=c.job_id AND i.version=c.invoice_version
    JOIN completion_rounds r ON r.job_id=c.job_id AND r.round=c.round WHERE c.job_id=$1`,[id]);return c;
}
export function completionWaiting(stage:string) {
  const map:Record<string,{role:string;action:string}>={
    "CM's Inspecting of work":{role:'cm',action:'review the current completion round and invoice'},
    'Addressing issues':{role:'contractor',action:'respond to findings and submit corrected work for inspection'},
    'Explaining price change':{role:'contractor',action:'explain or correct the invoice against authorised terms'},
    'Confirming invoice':{role:'mcst',action:'confirm the exact reconciled invoice'},
    'Arranging payment':{role:'mcst',action:'send payment and record completed-transfer proof'},
    'Unresolved payment':{role:'mcst',action:'send the remaining payment or record truthful progress'},
    'Confirming payment':{role:'contractor',action:'confirm actual receipt or report a Payment Issue'},
    'Admin Intervention':{role:'admin',action:'resolve outstanding support and verify actual obligations'},
    'Closed':{role:'none',action:'the required work and settlement gates are complete'}
  };return map[stage];
}
export function money(value:string) {
  try{return String(sgdCents(value));}catch{throw new AppError(422,'FIELD_VALIDATION','Supply an exact SGD amount with at most two decimal places');}
}
export function observedDate(value:string,now:Date,earliest?:Date) {
  try {
    const precision=/^\d{4}-\d{2}-\d{2}$/.test(value)?'date':'instant';
    const at=precision==='date'?singaporeInstant(dateOnly(value)):explicitInstant(value);
    if(precision==='date'?(value>singaporeDate(now)||earliest&&value<singaporeDate(earliest)):(at>now||earliest&&at<earliest))throw new Error('outside range');
    return {value:precision==='date'?value:at.toISOString(),precision,at};
  }catch{throw new AppError(422,'FIELD_VALIDATION','Supply a valid observed date, within the allowed period');}
}
export function reviewer(actor:Actor) {
  if(!['cm','mcst'].includes(actor.context?.role??''))throw new AppError(403,'FORBIDDEN','CM/MCST inspection authority required');
}
export function mcstOnly(actor:Actor) {
  if(actor.context?.role!=='mcst')throw new AppError(403,'FORBIDDEN','Named MCST confirmation required');
}
export async function readyFile(tx:Sql,actor:Actor,id:string,fileId:string,purpose:string) {
  const [f]=await tx.query(`SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id
    WHERE f.id=$1 AND u.job_id=$2 AND u.owner_id=$3 AND u.purpose=$4 AND u.state='ready' AND f.variant='original'`,[fileId,id,actor.id,purpose]);
  if(!f)throw new AppError(422,'FILE_NOT_READY','Use your ready file with the correct job and document purpose');
}
export async function pendingVariation(tx:Sql,id:string) {
  const [v]=await tx.query("SELECT id FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[id]);
  if(v)throw new AppError(409,'VARIATION_PENDING','Resolve the current variation before submitting this decision');
}
export async function finishKind(tx:Sql,id:string,kind:string) {
  for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind=$2 AND status='open'",[id,kind]))await finishResponse(tx,String(t.id));
}
export async function completionTask(tx:Sql,w:WorkState,kind:string,role:'cm'|'mcst'|'contractor',action:string,now:Date,version:number) {
  return responseTask(tx,now,{kind,resourceId:w.job_id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action,rule:kind==='completion.inspect'?'T08':kind==='completion.response'?'T09':role==='mcst'?'T07':'T22',requiredVersion:version});
}
export async function paymentEvent(tx:Sql,id:string,transferId:string|null,kind:string,details:unknown,now:Date,actor?:Actor) {
  await tx.query('INSERT INTO payment_events VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,transferId,kind,details,actor?.id??null,now.toISOString()]);
}
export async function balance(tx:Sql,id:string) {
  const rows=await tx.query('SELECT * FROM payment_transfers WHERE job_id=$1 ORDER BY reported_at,id',[id]);
  const payable=await financialTotal(tx,id);let sent=0n,received=0n,disputed=0n;
  for(const t of rows)if(t.status!=='void') {
    const amount=BigInt(String(t.amount_cents));sent+=amount;
    if(['actual','assumed'].includes(String(t.status)))received+=amount;
    if(t.status==='disputed')disputed+=amount;
  }
  const [refund]=await tx.query('SELECT COALESCE(sum(amount_cents),0) AS total FROM estate_refunds WHERE job_id=$1',[id]);
  const refunded=BigInt(String(refund!.total));sent-=refunded;received-=refunded;
  return {payable,sent,received,disputed,refunded,unsent:payable-sent,outstanding:payable-received,rows};
}
export async function blockers(tx:Sql,id:string) {
  return tx.query(`SELECT id FROM tasks WHERE status='open' AND support_id IN (SELECT s.id FROM support_requests s LEFT JOIN support_cases c ON c.support_id=s.id WHERE s.job_id=$1 AND (c.support_id IS NULL OR c.blocking=true))
    AND support_id NOT IN (SELECT id FROM aftercare_cases WHERE job_id=$1)
    UNION SELECT c.support_id AS id FROM support_cases c JOIN support_requests s ON s.id=c.support_id WHERE s.job_id=$1 AND c.blocking=true AND c.state<>'resolved'
    UNION SELECT id FROM variations WHERE job_id=$1 AND state IN ('terms','decision')`,[id]);
}
export async function discrepancy(tx:Sql,w:WorkState,c:Completion,now:Date) {
  if(BigInt(c.amount_cents)===BigInt(w.amount_cents)) {
    await finishKind(tx,w.job_id,'completion.invoice');await finishKind(tx,w.job_id,'completion.difference.mcst');await finishKind(tx,w.job_id,'completion.difference.admin');return false;
  }
  for(const [role,kind] of [['contractor','completion.invoice'],['mcst','completion.difference.mcst'],['admin','completion.difference.admin']] as const) {
    const [existing]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind=$2 AND required_version=$3 AND status='open'",[w.job_id,kind,c.invoice_version]);
    if(!existing) {
      await finishKind(tx,w.job_id,kind);
      if(role==='contractor')await completionTask(tx,w,kind,role,'Explain or correct the invoice. Added charges require approved variations; reductions need explicit agreement.',now,c.invoice_version);
      else await createAttention(tx,now,{kind,resourceId:w.job_id,estateId:w.estate_id,ownerRole:role,action:'Invoice differs from the authorised total. Financial confirmation is blocked until reconciled.',requiredVersion:c.invoice_version,informational:role==='mcst'});
    }
  }return true;
}
export async function reconcileCompletion(tx:Sql,id:string,now:Date) {
  const c=await completion(tx,id);if(!c)return;
  const w=await readWork(tx,id);
  if(w.status==='cancelled')return;
  // Financial adjustments after confirmation belong to Chapter 14, never mutate the frozen invoice here.
  if(c.confirmed_version)return;
  const scopeChanged=c.scope!==w.scope;
  if(c.accepted_round&&scopeChanged) {
    await tx.query('UPDATE completion_state SET accepted_round=NULL WHERE job_id=$1',[id]);
    await tx.query("INSERT INTO closure_events VALUES($1,$2,'acceptance.invalidated',$3,$4)",[randomUUID(),id,{round:c.accepted_round,reason:'Authorised physical scope changed'},now.toISOString()]);
    c.accepted_round=null;
  }
  if(scopeChanged) {
    await finishKind(tx,id,'completion.inspect');await finishKind(tx,id,'completion.response');
    const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.remedy' AND status='open'",[id]);
    if(!task)await completionTask(tx,w,'completion.remedy','contractor','Authorised physical scope changed. Submit a new physical completion round for fresh inspection.',now,c.round);
  }
  let stage:string;
  const difference=await discrepancy(tx,w,c,now);
  const [review]=await tx.query('SELECT outcome FROM inspections WHERE job_id=$1 AND round=$2',[id,c.round]);
  if(!c.accepted_round) {
    stage=review||scopeChanged?'Addressing issues':"CM's Inspecting of work";
    if(!review&&!scopeChanged) {
      const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.inspect' AND required_version=$2 AND status='open'",[id,c.round]);
      if(!task)await completionTask(tx,w,'completion.inspect','cm','Review the current completion round, agreed scope, visible issues, evidence and invoice.',now,c.round);
    }
    await finishKind(tx,id,'completion.confirm');
  } else if(difference) {stage='Explaining price change';await finishKind(tx,id,'completion.confirm');}
  else {
    stage='Confirming invoice';
    const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.confirm' AND required_version=$2 AND status='open'",[id,c.invoice_version]);
    if(!task)await completionTask(tx,w,'completion.confirm','mcst','Confirm the exact reconciled invoice version and amount after accepted works.',now,c.invoice_version);
  }
  await tx.query('UPDATE work_state SET resume_context=$1 WHERE job_id=$2',[difference?'invoice':'inspection',id]);
  const [v]=await tx.query("SELECT id FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[id]);
  if(w.status==='active'&&!v&&w.stage!==stage)await tx.query('UPDATE job_records SET stage=$1,version=version+1,updated_at=$2 WHERE id=$3',[stage,now.toISOString(),id]);
}
