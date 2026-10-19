import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {AppError} from '../contracts/primitives.js';
import {authorizedJob,authorizedSupport} from './workspace-service.js';
import {contractorReadRfq} from './quote-service.js';
import {quoteProjection} from './selection-service.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';

export const notFound=()=>new AppError(404,'NOT_FOUND','Record unavailable');
export async function packAccess(tx:Sql,a:Actor,id:string,now:Date) {
  if(a.context?.role==='contractor') {
    await contractorReadRfq(tx,a,id,now);
    const [j]=await tx.query('SELECT id,version,stage,data_origin FROM job_records WHERE id=$1',[id]);
    if(!j)throw notFound();return j;
  }
  return authorizedJob(tx,a,id);
}
export async function audience(tx:Sql,a:Actor,id:string,now:Date) {
  await packAccess(tx,a,id,now);
  const [e]=await tx.query('SELECT e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[id]);
  return {role:a.context!.role,membershipId:a.context!.id,estateId:a.context!.estate_id,organisationId:a.context!.organisation_id,
    identitiesVisible:a.context!.role==='cm'?e!.contractor_identities_visible:true};
}
// Sanitize all human-authored fields, nested AI text and historical identity aliases together.
// Attachments are references only; originals are never bundled into exported content.
export async function concealPack(tx:Sql,a:Actor,id:string,value:unknown):Promise<unknown> {
  const [e]=await tx.query('SELECT e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[id]);
  if(a.context?.role!=='cm'||e?.contractor_identities_visible)return value;
  const identifiers:string[]=[],ids=new Set<string>();
  for(const r of await tx.query('SELECT DISTINCT organisation_id FROM quotes WHERE job_id=$1',[id])) {
    const org=String(r.organisation_id);ids.add(org);identifiers.push(...await contractorIdentifiers(tx,org));
    for(const u of await tx.query('SELECT user_id FROM memberships WHERE organisation_id=$1',[org]))ids.add(String(u.user_id));
  }
  const visit=(v:unknown,key=''):unknown=>{
    if(v instanceof Date)return v.toISOString();
    if(typeof v==='string')return ids.has(v)?'[identity concealed]':concealedText(v,identifiers);
    if(Array.isArray(v))return v.map(i=>visit(i,key));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['pdf_id','pdfId','file_id','fileId','proof_id','proofId','evidence_ids','evidenceIds','actor_id','organisation_id','organisationId','narrative'].includes(k)).map(([k,x])=>[k,visit(x,k)]));
    return v;
  };return visit(value);
}
const historyActions=['workspace.create','workspace.edit','rfq.publish','rfq.revise','selection.select','selection.decide','work.start','variation.submit','variation.confirm','variation.decide','completion.submit','completion.inspect','payment.confirm-invoice','payment.transfer','payment.receipt','cancellation.cancel'];
export async function packHistory(tx:Sql,a:Actor,id:string) {
  const rows=await tx.query(`SELECT e.id,e.action,e.actor_role,e.recorded_at,e.reason,u.name AS actor_name,
    e.after_value->>'version' AS version,e.after_value->>'quoteVersion' AS quote_version,e.after_value->>'invoiceVersion' AS invoice_version,e.after_value->>'round' AS round
    FROM audit_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.resource_id=$1 AND e.action=ANY($2::text[]) ORDER BY e.recorded_at,e.id`,[id,historyActions]);
  return concealPack(tx,a,id,rows);
}
export async function buildDecisionPack(tx:Sql,a:Actor,id:string,now:Date) {
  const j=await packAccess(tx,a,id,now),contractor=a.context?.role==='contractor';
  const org=a.context?.organisation_id;
  const rfq=contractor?await contractorReadRfq(tx,a,id,now):null;
  const request=contractor?{revision:rfq!.revision,scopeVersion:rfq!.scope_version,fields:rfq!.snapshot}:
    await tx.query('SELECT revision,scope_version,snapshot,actor_id,recorded_at FROM rfq_versions WHERE job_id=$1 ORDER BY revision',[id]);
  const quotes=[];
  for(const q of await tx.query(`SELECT q.*,v.terms,v.amount_cents,v.expires_at,v.rfq_revision,v.scope_version,v.pdf_id,v.revision_reason,v.recorded_at,
    v.version AS current_version FROM quotes q JOIN quote_versions v ON v.quote_id=q.id WHERE q.job_id=$1 AND ($2::uuid IS NULL OR q.organisation_id=$2) ORDER BY q.id,v.version`,[id,contractor?org:null])) {
    quotes.push({...await quoteProjection(tx,a,q as Parameters<typeof quoteProjection>[2],false,now),reason:q.revision_reason,recordedAt:q.recorded_at});
  }
  const selections=contractor?[]:await tx.query('SELECT id,quote_id,quote_version,amount_cents,rationale,snapshot,actor_id,actor_role,recorded_at FROM contractor_selections WHERE job_id=$1 ORDER BY recorded_at,id',[id]);
  const selected=await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1 AND ($2::uuid IS NULL OR organisation_id=$2)',[id,contractor?org:null]);
  const workVisible=!contractor||selected.length>0;
  const records:Record<string,unknown>={};
  if(workVisible) {
    records.authorisations=await tx.query('SELECT quote_id,quote_version,amount_cents,terms,actor_id,recorded_at FROM work_authorisations WHERE job_id=$1',[id]);
    records.authorisedTerms=await tx.query('SELECT version,amount_cents,scope,source_type,source_id,actor_id,recorded_at FROM work_terms WHERE job_id=$1 ORDER BY version',[id]);
    records.variations=await tx.query(`SELECT v.id,v.kind,v.state,p.version,p.base_terms_version,p.proposal,p.contractor_confirmed,p.actor_id,p.actor_role,p.recorded_at
      FROM variations v JOIN variation_versions p ON p.variation_id=v.id WHERE v.job_id=$1 ORDER BY p.recorded_at,v.id,p.version`,[id]);
    records.variationDecisions=await tx.query('SELECT d.* FROM variation_decisions d JOIN variations v ON v.id=d.variation_id WHERE v.job_id=$1 ORDER BY d.recorded_at,d.id',[id]);
    records.completion=await tx.query('SELECT round,terms_version,scope,completed_at,actor_id,recorded_at FROM completion_rounds WHERE job_id=$1 ORDER BY round',[id]);
    records.inspections=await tx.query('SELECT round,outcome,findings,actor_id,recorded_at FROM inspections WHERE job_id=$1 ORDER BY recorded_at',[id]);
    records.invoices=await tx.query('SELECT version,round,amount_cents,explanation,actor_id,recorded_at FROM invoice_versions WHERE job_id=$1 ORDER BY version',[id]);
    records.invoiceConfirmation=await tx.query('SELECT invoice_version,amount_cents,actor_id,recorded_at FROM invoice_confirmations WHERE job_id=$1',[id]);
    records.financialCorrections=await tx.query('SELECT version,amount_cents,source,reason,actor_id,recorded_at FROM financial_confirmations WHERE job_id=$1 ORDER BY version',[id]);
    records.payments=await tx.query('SELECT id,invoice_version,amount_cents,transfer_date,reported_at,status,receipt_date,receipt_precision FROM payment_transfers WHERE job_id=$1 ORDER BY reported_at,id',[id]);
    records.closure=await tx.query('SELECT kind,details,recorded_at FROM closure_events WHERE job_id=$1 ORDER BY recorded_at,id',[id]);
    records.workEvents=await tx.query("SELECT kind,details,occurred_at,recorded_at,actor_id,actor_role FROM work_events WHERE job_id=$1 AND kind NOT LIKE 'support.%' ORDER BY recorded_at,id",[id]);
    const exceptions=[];
    // Conduct material never enters a general decision pack, even for an otherwise privileged audience.
    for(const s of await tx.query("SELECT id FROM support_requests WHERE job_id=$1 AND privacy='ordinary' ORDER BY created_at,id",[id]))try {
      await authorizedSupport(tx,a,String(s.id));
      const [c]=await tx.query('SELECT category,state,blocking FROM support_cases WHERE support_id=$1',[s.id]);
      const obligations=await tx.query('SELECT kind,owner_role,description,verified_at,superseded_at FROM support_obligations WHERE support_id=$1 ORDER BY id',[s.id]);
      exceptions.push({supportId:s.id,...c,obligations});
    }catch(e){if(!(e instanceof AppError&&e.status===404))throw e;}
    records.exceptions=exceptions;
  }
  if(['mcst','admin'].includes(a.context!.role)) {
    records.warnings=await tx.query('SELECT c.*,x.explanation AS clearance_explanation,x.actor_id AS cleared_by,x.recorded_at AS cleared_at FROM integrity_cards c LEFT JOIN integrity_clearances x ON x.card_id=c.id WHERE c.job_id=$1 ORDER BY c.recorded_at,c.id',[id]);
    records.warningReviews=await tx.query('SELECT r.* FROM integrity_reviews r JOIN integrity_cards c ON c.id=r.card_id WHERE c.job_id=$1 ORDER BY r.recorded_at,r.id',[id]);
  }
  const data={schemaVersion:'decision-pack-v1',jobId:id,sourceVersion:j.version,capturedAt:now.toISOString(),audience:a.context!.role,
    dataOrigin:j.data_origin,stage:j.stage,request,quotes,selections,records,
    approvals:contractor?[]:await tx.query('SELECT d.* FROM selection_decisions d JOIN contractor_selections c ON c.id=d.selection_id WHERE c.job_id=$1 ORDER BY d.recorded_at,d.id',[id]),
    history:contractor?[]:await packHistory(tx,a,id),
    evidencePolicy:'File references require fresh authorization. Restricted originals, confidential conduct material and QuoteFix fees are not annexed.',
    interpretation:'Received quote differences are not market estimates or proven savings. Unanswered Feedback is not a favourable outcome.'};
  const actorIds=new Set<string>();
  const collect=(v:unknown):void=>{if(Array.isArray(v)){for(const x of v)collect(x);}else if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['actor_id','cleared_by'].includes(k)&&typeof x==='string')actorIds.add(x);else collect(x);}};
  collect(data);
  const actors=await tx.query('SELECT id AS actorId,name FROM users WHERE id=ANY($1::uuid[]) ORDER BY id',[[...actorIds]]);
  return concealPack(tx,a,id,{...data,namedActors:actors}) as Promise<Record<string,unknown>>;
}
