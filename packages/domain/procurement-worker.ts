import {randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import {createAttention,eligibility} from './verification-service.js';
import type {Intake} from './rfq-service.js';

// Supply authoritative current/selectable organisations for this exact round/material scope.
// Tests may explicitly inject fictional coverage; production bindings cannot default to zero.
export type QuoteCoverage=(sql:Sql,roundId:string,scopeVersion:number,now:Date)=>Promise<string[]>;
export async function procurementTimers(tx:Sql,now:Date,coverage:QuoteCoverage) {
  const credentials=await tx.query(`SELECT c.*,v.expires_at,v.remind_at,t.name FROM credentials c JOIN credential_versions v
    ON v.credential_id=c.id AND v.submission=c.approved_submission JOIN credential_types t ON t.id=c.type_id WHERE v.expires_at IS NOT NULL`);
  for(const c of credentials) {
    if(new Date(c.remind_at as string)<=now&&c.renewal_notified_version!==c.approved_submission) {
      await createAttention(tx,now,{kind:'credential.renewal',resourceId:String(c.id),organisationId:String(c.organisation_id),action:'Review a credential approaching expiry',requiredVersion:Number(c.version)});
      await tx.query('UPDATE credentials SET renewal_notified_version=approved_submission WHERE id=$1',[c.id]);
    }
    if(new Date(c.expires_at as string)<=now&&c.expiry_notified_version!==c.approved_submission) {
      const affected=await tx.query('SELECT category FROM trade_requirements WHERE type_id=$1',[c.type_id]);
      if(affected.length)await createAttention(tx,now,{kind:'credential.expired',resourceId:String(c.id),organisationId:String(c.organisation_id),action:'Required credential expired: review affected eligibility and any active work',requiredVersion:Number(c.version)});
      await createAttention(tx,now,{kind:'credential.expired.notice',resourceId:String(c.id),organisationId:String(c.organisation_id),ownerRole:'contractor',action:affected.length?'Required credential expired. Affected trade eligibility is restricted.':'Optional credential expired. Its badge is grey.',informational:true});
      await tx.query('UPDATE credentials SET expiry_notified_version=approved_submission WHERE id=$1',[c.id]);
      await tx.query(`INSERT INTO audit_events(id,action,resource_id,before_value,after_value,request_id,recorded_at)
        VALUES($1,'credential.expired',$2,$3,$4,'credential-expiry-worker',$5)`,[randomUUID(),c.id,{submission:c.approved_submission},{effectiveAt:new Date(c.expires_at as string).toISOString(),affectedCategories:affected.map(a=>a.category)},now.toISOString()]);
    }
  }
  const rounds=await tx.query(`SELECT r.*,p.scope_version,v.snapshot,j.estate_id FROM quotation_rounds r JOIN rfq_publications p ON p.round_id=r.id
    JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision JOIN job_records j ON j.id=r.job_id
    WHERE r.status='open' AND r.sourcing_checked_at IS NULL AND r.sourcing_due_at<=$1 ORDER BY r.sourcing_due_at LIMIT 100`,[now.toISOString()]);
  for(const round of rounds) {
    const quotes=new Set(await coverage(tx,String(round.id),Number(round.scope_version),now)),valid=[];
    for(const orgId of quotes)if((await eligibility(tx,orgId,(round.snapshot as Intake).categories,now)).eligible)valid.push(orgId);
    if(valid.length<3) {
      const [existing]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='rfq.sourcing' AND status='open'",[round.job_id]);
      if(!existing)await createAttention(tx,now,{kind:'rfq.sourcing',resourceId:String(round.job_id),estateId:String(round.estate_id),action:`Source quotations: fewer than three eligible contractors have current selectable offers (${valid.length})`,requiredVersion:Number(round.number)});
    }
    await tx.query('UPDATE quotation_rounds SET sourcing_checked_at=$1 WHERE id=$2',[now.toISOString(),round.id]);
    await tx.query(`INSERT INTO audit_events(id,action,resource_id,after_value,request_id,recorded_at) VALUES($1,'rfq.sourcing-checked',$2,$3,'sourcing-worker',$4)`,[randomUUID(),round.job_id,{roundId:round.id,scopeVersion:round.scope_version,distinctEligibleOffers:valid.length,effectiveAt:new Date(round.sourcing_due_at as string).toISOString()},now.toISOString()]);
  }
}
export async function processRefinement(tx:Sql,id:string,now:Date) {
  const [suggestion]=await tx.query('SELECT * FROM ai_refinements WHERE id=$1',[id]);
  if(!suggestion||suggestion.state!=='pending_review'||!(suggestion.output as Record<string,unknown>).pending)return;
  const [job]=await tx.query('SELECT version,stage FROM job_records WHERE id=$1',[suggestion.job_id]);
  if(!job||job.version!==suggestion.input_version||job.stage!=='AI is refining your draft') {
    await tx.query("UPDATE ai_refinements SET state='superseded' WHERE id=$1",[id]);return;
  }
  const input=suggestion.input_snapshot as {observations:string;affectedLocation:string};
  const output={observations:input.observations,affectedLocation:input.affectedLocation,
    sections:[{label:'Observed facts',text:input.observations,source:'observations'},{label:'Affected location',text:input.affectedLocation,source:'affectedLocation'}],
    cautions:['Confirm missing facts manually. This local extractive adapter does not diagnose or invent specifications.','Review contractor-visible text and evidence for estate identifiers.']};
  await tx.query('UPDATE ai_refinements SET output=$1 WHERE id=$2',[output,id]);
  await tx.query("UPDATE job_records SET stage='Approving AI input' WHERE id=$1",[suggestion.job_id]);
  await tx.query(`INSERT INTO audit_events(id,action,resource_id,after_value,request_id,recorded_at) VALUES($1,'rfq.refinement-ready',$2,$3,'refinement-worker',$4)`,[randomUUID(),suggestion.job_id,{refinementId:id,inputVersion:suggestion.input_version,model:'local-extractive-v1'},now.toISOString()]);
}
export async function notifyRfq(tx:Sql,id:string,revision:number,now:Date,roundId?:string) {
  const [publication]=await tx.query(`SELECT v.snapshot,p.revision,p.scope_version,p.round_id,r.status FROM rfq_publications p JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision JOIN quotation_rounds r ON r.id=p.round_id WHERE p.job_id=$1`,[id]);
  if(!publication||publication.revision!==revision||publication.status!=='open'||(roundId&&publication.round_id!==roundId))return;
  const affected=await tx.query('SELECT organisation_id FROM quotes WHERE job_id=$1 UNION SELECT organisation_id FROM job_questions WHERE job_id=$1',[id]);
  const organisations=new Set([...affected,...await tx.query("SELECT organisation_id FROM contractor_profiles WHERE state='approved'")].map(o=>String(o.organisation_id)));
  for(const organisationId of organisations) {
    const eligible=(await eligibility(tx,organisationId,(publication.snapshot as Intake).categories,now)).eligible;
    // A changed trade/credential can remove eligibility; affected bidders still need to know their old offer is outdated.
    if(!eligible&&!affected.some(o=>o.organisation_id===organisationId))continue;
    const [outdated]=await tx.query(`SELECT q.id FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version
      WHERE q.job_id=$1 AND q.round_id=$2 AND q.organisation_id=$3 AND q.status='active' AND v.scope_version<>$4 LIMIT 1`,[id,publication.round_id,organisationId,publication.scope_version]);
    const action=outdated?'The RFQ has a material scope change. Your old quote cannot be selected until you are eligible and explicitly reconfirm or revise it.':!eligible?'An RFQ you participated in has changed. Current eligibility is required to view the new scope or quote.':revision===1?'A relevant RFQ is open for quotes.':'A relevant RFQ has a reviewed revision. Check its current scope before quoting.';
    await createAttention(tx,now,{kind:'rfq.opportunity',resourceId:id,organisationId,ownerRole:'contractor',action,informational:true,requiredVersion:revision});
  }
}
