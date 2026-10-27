import {randomUUID,createHash} from 'node:crypto';
import {AppError,requiredText,sgdCents} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {contractorRfq,type Intake} from './rfq-service.js';
import {authorizedJob} from './workspace-service.js';
import {eligibility,createAttention} from './verification-service.js';
import {dateExpiry,explicitInstant,nextDate,singaporeDate} from './calendar.js';
import {revisionEvaluation,recordCard} from './integrity-core.js';

export const warrantyOptions=['7_days','14_days','1_month','3_months','1_year','other'];
export const availabilityOptions=['same_day','next_day','2_3_days','4_7_days','other'];
export const durationOptions=['half_day','1_day','2_3_days','4_7_days','other','unknown'];
export const QUOTE_COMMITMENT='My quote will be valid when the CM selects it. Once selected, its price and scope remain held while awaiting MCST approval, if needed.';
export interface QuoteTerms {
  amountSgd:string;wasteDisposal:boolean;warranty:boolean;warrantyDuration?:string;warrantyOther?:string;
  makingGood:boolean;gstCharged:boolean;accessEquipment?:boolean;
  availability:string;availabilityOther?:string;duration:string;durationReason?:string;
  exclusions:string[];exclusionsOther?:string;narrative?:string;expiry:string;expiryConfirmed:boolean;commitment:boolean;
}
export interface QuoteRow extends Record<string,unknown> {id:string;job_id:string;organisation_id:string;round_id:string;version:number;current_version:number;status:string;terms:QuoteTerms;amount_cents:string|number;expires_at:string|Date;scope_version:number;rfq_revision:number}
export async function publication(sql:Sql,id:string) {
  const [row]=await sql.query(`SELECT p.*,r.status,r.number,r.published_at,r.sourcing_due_at,r.sourcing_checked_at,v.snapshot,j.estate_id
    FROM rfq_publications p JOIN quotation_rounds r ON r.id=p.round_id JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision JOIN job_records j ON j.id=p.job_id WHERE p.job_id=$1`,[id]);
  if(!row)throw new AppError(404,'NOT_FOUND','RFQ unavailable');return row;
}
export async function selectionOwner(sql:Sql,id:string):Promise<'cm'|'mcst'> {
  const [creation]=await sql.query("SELECT actor_role FROM audit_events WHERE resource_id=$1 AND action='workspace.create' ORDER BY recorded_at,id LIMIT 1",[id]);
  return creation?.actor_role==='mcst'?'mcst':'cm';
}
export function quoteExpiry(value:string):Date {
  try{return /^\d{4}-\d{2}-\d{2}$/.test(value)?dateExpiry(value):explicitInstant(value);}catch{throw new AppError(422,'FIELD_VALIDATION','Choose a real expiry date or a date/time with timezone');}
}
export function validateTerms(terms:QuoteTerms,scope:Intake & {accessEquipmentRequired?:boolean},now:Date) {
  let amount:number;try{amount=sgdCents(terms.amountSgd);}catch{throw new AppError(422,'FIELD_VALIDATION','Final SGD amount must have at most two decimal places');}
  if(amount<=0)throw new AppError(422,'POSITIVE_QUOTE_REQUIRED','A quotation must be at least SGD 0.01');
  for(const field of ['wasteDisposal','warranty','makingGood','gstCharged'] as const)if(typeof terms[field]!=='boolean')throw new AppError(422,'FIELD_VALIDATION',`${field}: choose Yes or No`);
  if(!terms.commitment||!terms.expiryConfirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the quote commitment and the chosen expiry');
  if(terms.warranty) {
    if(!warrantyOptions.includes(terms.warrantyDuration??''))throw new AppError(422,'FIELD_VALIDATION','Choose a warranty duration');
    if(terms.warrantyDuration==='other')requiredText(terms.warrantyOther??'');
    else if(terms.warrantyOther)throw new AppError(422,'FIELD_VALIDATION','Other warranty details require Other');
  } else if(terms.warrantyDuration||terms.warrantyOther)throw new AppError(422,'FIELD_VALIDATION','No warranty cannot declare a warranty duration');
  if(scope.accessEquipmentRequired&&typeof terms.accessEquipment!=='boolean')throw new AppError(422,'FIELD_VALIDATION','Choose whether required access equipment is included');
  if(!scope.accessEquipmentRequired&&terms.accessEquipment!==undefined)throw new AppError(422,'FIELD_VALIDATION','Access equipment is not flagged in this RFQ');
  if(!availabilityOptions.includes(terms.availability))throw new AppError(422,'FIELD_VALIDATION','Choose earliest availability after authorisation and site access');
  if(terms.availability==='other')requiredText(terms.availabilityOther??'');else if(terms.availabilityOther)throw new AppError(422,'FIELD_VALIDATION','Other availability details require Other');
  if(!durationOptions.includes(terms.duration))throw new AppError(422,'FIELD_VALIDATION','Choose work duration');
  if(['other','unknown'].includes(terms.duration))requiredText(terms.durationReason??'');else if(terms.durationReason)throw new AppError(422,'FIELD_VALIDATION','A duration explanation requires Other or Unable to estimate');
  if(!terms.exclusions.length||new Set(terms.exclusions).size!==terms.exclusions.length||terms.exclusions.some(e=>!['none','other'].includes(e)))throw new AppError(422,'FIELD_VALIDATION','Choose No additional exclusions or Other');
  if(terms.exclusions.includes('none')&&terms.exclusions.length!==1)throw new AppError(422,'FIELD_VALIDATION','No additional exclusions cannot accompany Other');
  if(terms.exclusions.includes('other'))requiredText(terms.exclusionsOther??'');else if(terms.exclusionsOther)throw new AppError(422,'FIELD_VALIDATION','Other exclusions need the Other choice');
  const expires=quoteExpiry(terms.expiry);if(expires<=now)throw new AppError(422,'QUOTE_EXPIRED','Choose a future expiry');
  return {amount,expires};
}
export function quoteCautions(terms:QuoteTerms):string[] {
  const result=[];
  if(!terms.wasteDisposal)result.push('waste_disposal_excluded_unknown_cost');
  if(!terms.makingGood)result.push('making_good_excluded_unknown_cost');
  if(terms.accessEquipment===false)result.push('access_equipment_excluded_unknown_cost');
  if(!terms.warranty)result.push('no_warranty');
  if(terms.exclusions.includes('other'))result.push('additional_exclusions_unknown_cost');
  if(terms.duration==='unknown')result.push('duration_unknown');
  if(!terms.narrative)result.push('optional_narrative_not_stated');
  return result;
}
export async function currentQuote(sql:Sql,id:string):Promise<QuoteRow> {
  const [quote]=await sql.query<QuoteRow>(`SELECT q.*,v.terms,v.amount_cents,v.expires_at,v.expiry_value,v.rfq_revision,v.scope_version,v.pdf_id,v.revision_reason,v.recorded_at
    FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version WHERE q.id=$1`,[id]);
  if(!quote)throw new AppError(404,'NOT_FOUND','Quote unavailable');return quote;
}
export async function selectableQuotes(sql:Sql,roundId:string,scopeVersion:number,now:Date):Promise<QuoteRow[]> {
  const [round]=await sql.query('SELECT job_id,status FROM quotation_rounds WHERE id=$1',[roundId]);if(!round||round.status!=='open')return [];
  const published=await publication(sql,String(round.job_id));if(published.round_id!==roundId||published.scope_version!==scopeVersion)return [];
  const rows=await sql.query<QuoteRow>(`SELECT q.*,v.terms,v.amount_cents,v.expires_at,v.expiry_value,v.rfq_revision,v.scope_version,v.pdf_id,v.revision_reason,v.recorded_at
    FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version
    WHERE q.round_id=$1 AND q.status='active' AND v.amount_cents>0 AND v.scope_version=$2 AND v.expires_at>$3 AND v.recorded_at<=$3 ORDER BY q.organisation_id,q.id`,[roundId,scopeVersion,now.toISOString()]);
  const valid=[];for(const row of rows)if((await eligibility(sql,row.organisation_id,(published.snapshot as Intake).categories,now)).eligible)valid.push(row);
  return valid;
}
export async function actualQuoteCoverage(sql:Sql,roundId:string,scopeVersion:number,now:Date) {return (await selectableQuotes(sql,roundId,scopeVersion,now)).map(q=>q.organisation_id);}
async function ownedRfqRevisions(sql:Sql,jobId:string,organisationId:string) {
  return sql.query<{revision:number}>(`SELECT v.rfq_revision AS revision FROM quotes q JOIN quote_versions v ON v.quote_id=q.id WHERE q.job_id=$1 AND q.organisation_id=$2
    UNION SELECT q.rfq_revision FROM job_questions q WHERE q.job_id=$1 AND q.organisation_id=$2
    UNION SELECT r.rfq_revision FROM question_responses r JOIN job_questions q ON q.id=r.question_id WHERE q.job_id=$1 AND q.organisation_id=$2 AND r.outcome='answered'`,[jobId,organisationId]);
}
export async function contractorEvidence(sql:Sql,actor:Actor,jobId:string,fileId:string,now:Date) {
  if(actor.context?.role!=='contractor'||!actor.context.organisation_id)return false;
  try {if(((await contractorRfq(sql,actor,jobId,now)).snapshot as Intake).evidenceIds.includes(fileId))return true;}
  catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
  // Retain reviewed evidence for owned historical scopes, without granting later scope or originals.
  const revisions=(await ownedRfqRevisions(sql,jobId,actor.context.organisation_id)).map(r=>r.revision);
  const versions=await sql.query('SELECT snapshot FROM rfq_versions WHERE job_id=$1 AND revision=ANY($2::integer[])',[jobId,revisions]);
  return versions.some(v=>(v.snapshot as Intake).evidenceIds.includes(fileId));
}
export async function contractorReadRfq(sql:Sql,actor:Actor,id:string,now:Date) {
  try{return await contractorRfq(sql,actor,id,now);}catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
  if(actor.context?.role!=='contractor')throw new AppError(404,'NOT_FOUND','Job unavailable');
  const revisions=await ownedRfqRevisions(sql,id,actor.context.organisation_id!),revision=Math.max(0,...revisions.map(r=>r.revision));
  if(!revision)throw new AppError(404,'NOT_FOUND','Job unavailable');
  const current=await publication(sql,id),[version]=await sql.query('SELECT snapshot,scope_version FROM rfq_versions WHERE job_id=$1 AND revision=$2',[id,revision]);
  return {...current,revision,snapshot:version!.snapshot,scope_version:version!.scope_version};
}
export async function maskedName(sql:Sql,actor:Actor,jobId:string,orgId:string) {
  const [estate]=await sql.query('SELECT e.contractor_identities_visible,o.name FROM job_records j JOIN estates e ON e.id=j.estate_id JOIN organisations o ON o.id=$2 WHERE j.id=$1',[jobId,orgId]);
  if(actor.context?.role==='cm'&&!estate?.contractor_identities_visible)return {name:'Contractor '+createHash('sha256').update(jobId+':'+orgId).digest('hex').slice(0,8),masked:true};
  return {name:String(estate?.name),masked:false};
}
export class QuoteService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;}get identity(){return this.commands.identity;}get now(){return this.commands.now;}
  async jobs(token:string) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');const actor=await this.identity.actor(token,tx);
      if(actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','Contractor account required');
      const jobs=[];
      for(const row of await tx.query('SELECT job_id FROM quotes WHERE organisation_id=$1 UNION SELECT job_id FROM job_questions WHERE organisation_id=$1 ORDER BY job_id',[actor.context.organisation_id])) {
        const id=String(row.job_id),rfq=await contractorReadRfq(tx,actor,id,this.now()),phase=await publication(tx,id),own=await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2 ORDER BY round_id',[id,actor.context.organisation_id]);
        const [selected]=await tx.query(`SELECT c.id,c.quote_id,c.quote_version,c.amount_cents,s.status FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.job_id=$1 AND c.organisation_id=$2`,[id,actor.context.organisation_id]);
        const reveals=await tx.query('SELECT cause,snapshot,recorded_at FROM location_reveals WHERE job_id=$1 AND organisation_id=$2 ORDER BY recorded_at',[id,actor.context.organisation_id]);
        const workCancelled=(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id])).length>0;
        jobs.push({jobId:id,rfq:rfq.snapshot,rfqRevision:rfq.revision,scopeVersion:rfq.scope_version,roundId:rfq.round_id,roundStatus:phase.status,workCancelled,quotes:await Promise.all(own.map(q=>currentQuote(tx,String(q.id)))),selection:selected??null,reveals});
      }
      return jobs;
    });
  }
  async own(token:string,jobId:string) {
    return this.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const actor=await this.identity.actor(token,tx);if(actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','Contractor account required');
    const rows=await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2 ORDER BY round_id',[jobId,actor.context.organisation_id]);
    const result=[];for(const row of rows)result.push({quote:await currentQuote(tx,String(row.id)),versions:await tx.query('SELECT * FROM quote_versions WHERE quote_id=$1 ORDER BY version',[row.id])});
    return {quotes:result,suggestedExpiry:nextDate(singaporeDate(this.now()),30),commitmentCopy:QUOTE_COMMITMENT,serverTime:this.now().toISOString()};
      });
  }
  async submit(token:string,meta:WorkspaceCommand,jobId:string,body:{rfqRevision:number;terms:QuoteTerms;pdfId?:string;revisionReason?:string}) {
    return this.commands.run(token,meta,'quote.submit',{jobId,...body},async(tx,actor)=>{
      const own=actor.context?.role==='contractor'&&await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2 LIMIT 1',[jobId,actor.context.organisation_id]);
      if(!own||!own.length)await contractorRfq(tx,actor,jobId,this.now());
    },async(tx,actor)=>{
      const rfq=await contractorRfq(tx,actor,jobId,this.now());requireVersion(Number(rfq.revision),body.rfqRevision);
      const [previous]=await tx.query('SELECT * FROM quotes WHERE round_id=$1 AND organisation_id=$2',[rfq.round_id,actor.context!.organisation_id]);
      requireVersion(Number(previous?.version??0),meta.expectedVersion);const now=this.now(),validated=validateTerms(body.terms,rfq.snapshot as Intake,now);
      const [visit]=await tx.query("SELECT id FROM visit_requests WHERE job_id=$1 AND round_id=$2 AND organisation_id=$3 AND state='approved' LIMIT 1",[jobId,rfq.round_id,actor.context!.organisation_id]);
      if(previous&&visit)requiredText(body.revisionReason??'');
      if(body.pdfId) {
        const [file]=await tx.query(`SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND f.variant='original' AND f.media_type='application/pdf' AND u.state='ready' AND u.purpose='quote_pdf' AND u.organisation_id=$2`,[body.pdfId,actor.context!.organisation_id]);
        if(!file)throw new AppError(422,'FILE_NOT_READY','Use a ready quotation PDF belonging to your company');
      }
      const id=String(previous?.id??randomUUID()),version=Number(previous?.version??0)+1;
      await tx.query("INSERT INTO quotes(id,job_id,organisation_id,round_id,current_version,status,version) VALUES($1,$2,$3,$4,$5,'active',$5) ON CONFLICT(id) DO UPDATE SET current_version=$5,version=$5,status='active',expiry_notified_version=NULL",[id,jobId,actor.context!.organisation_id,rfq.round_id,version]);
      await tx.query('INSERT INTO quote_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id,version,rfq.revision,rfq.scope_version,body.terms,validated.amount,body.terms.expiry,validated.expires.toISOString(),body.pdfId??null,body.revisionReason?.trim()??'',actor.id,now.toISOString()]);
      const q=await currentQuote(tx,id),evaluation=await revisionEvaluation(tx,q);
      if(!evaluation.policy)throw new AppError(409,'INTEGRITY_POLICY_REQUIRED','MCST must explicitly configure warning settings for future events on this legacy ticket');
      await recordCard(tx,actor,jobId,String(rfq.round_id),'quote.revision',id,version,evaluation,now,meta.requestId);
      await audit(tx,actor,'quote.submit',id,previous??null,{jobId,version,rfqRevision:rfq.revision,scopeVersion:rfq.scope_version,terms:body.terms},meta.requestId,now,body.revisionReason);
      await enqueue(tx,'quote.changed',jobId,{quoteId:id,quoteVersion:version},now);
      return {jobId,quoteId:id,version,quoteVersion:version};
    });
  }
  async ownAccess(sql:Sql,actor:Actor,id:string) {
    const quote=await currentQuote(sql,id);if(actor.context?.role!=='contractor'||actor.context.organisation_id!==quote.organisation_id)throw new AppError(404,'NOT_FOUND','Quote unavailable');return quote;
  }
  async reconfirm(token:string,meta:WorkspaceCommand,id:string,body:{rfqRevision:number;confirmed:boolean}) {
    return this.commands.run(token,meta,'quote.reconfirm',{id,...body},async(tx,actor)=>{await this.ownAccess(tx,actor,id);},async(tx,actor)=>{
      const quote=await this.ownAccess(tx,actor,id),rfq=await contractorRfq(tx,actor,quote.job_id,this.now());requireVersion(quote.version,meta.expectedVersion);requireVersion(Number(rfq.revision),body.rfqRevision);
      if(quote.round_id!==rfq.round_id||quote.status!=='active')throw new AppError(409,'QUOTE_NOT_CURRENT','Submit an explicit quote for the current round');
      if(!body.confirmed||new Date(quote.expires_at)<=this.now())throw new AppError(422,'RECONFIRMATION_REQUIRED','Review the current scope; an expired quote needs an explicit revision with new expiry');
      validateTerms(quote.terms,rfq.snapshot as Intake,this.now());const version=quote.version+1,now=this.now();
      await tx.query('INSERT INTO quote_versions SELECT quote_id,$2,$3,$4,terms,amount_cents,expiry_value,expires_at,pdf_id,\'Scope explicitly reconfirmed\',$5,$6 FROM quote_versions WHERE quote_id=$1 AND version=$7',[id,version,rfq.revision,rfq.scope_version,actor.id,now.toISOString(),quote.current_version]);
      await tx.query('UPDATE quotes SET version=$1,current_version=$1,expiry_notified_version=NULL WHERE id=$2',[version,id]);
      await audit(tx,actor,'quote.reconfirm',id,{quoteVersion:quote.current_version,scopeVersion:quote.scope_version},{version,rfqRevision:rfq.revision,scopeVersion:rfq.scope_version,expiryUnchanged:true},meta.requestId,now);
      await enqueue(tx,'quote.changed',quote.job_id,{quoteId:id,quoteVersion:version},now);return {jobId:quote.job_id,quoteId:id,version,quoteVersion:version};
    });
  }
  async withdraw(token:string,meta:WorkspaceCommand,id:string,reasonInput:string) {
    return this.commands.run(token,meta,'quote.withdraw',{id,reason:reasonInput},async(tx,actor)=>{await this.ownAccess(tx,actor,id);},async(tx,actor)=>{
      const quote=await this.ownAccess(tx,actor,id),rfq=await publication(tx,quote.job_id);requireVersion(quote.version,meta.expectedVersion);
      if(rfq.status!=='open'||rfq.round_id!==quote.round_id||quote.status!=='active')throw new AppError(409,'QUOTING_PAUSED','This quotation phase no longer permits withdrawal');
      const reason=requiredText(reasonInput),version=quote.version+1,now=this.now();await tx.query("UPDATE quotes SET status='withdrawn',version=$1 WHERE id=$2",[version,id]);
      await audit(tx,actor,'quote.withdraw',id,{status:quote.status,version:quote.version},{status:'withdrawn',version},meta.requestId,now,reason);await enqueue(tx,'quote.changed',quote.job_id,{quoteId:id,quoteVersion:version},now);
      return {jobId:quote.job_id,quoteId:id,version};
    });
  }
  async prompt(token:string,meta:WorkspaceCommand,id:string,quoteId:string) {
    return this.commands.run(token,meta,'quote.prompt',{id,quoteId},async(tx,actor)=>{if(!['cm','mcst','admin'].includes(actor.context?.role??''))throw new AppError(403,'FORBIDDEN','Estate authority required');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id),quote=await currentQuote(tx,quoteId),rfq=await publication(tx,id);requireVersion(job.version,meta.expectedVersion);
      if(quote.job_id!==id||quote.round_id!==rfq.round_id||rfq.status!=='open')throw new AppError(409,'RFQ_NOT_OPEN','Prompt only a contractor in this open round');
      const now=this.now();await createAttention(tx,now,{kind:'quote.prompt',resourceId:quoteId,organisationId:quote.organisation_id,ownerRole:'contractor',action:'Prompt Contractor to Re-Quote',informational:true});
      await audit(tx,actor,'quote.prompt',id,null,{quoteId,expiryUnchanged:true},meta.requestId,now);return {jobId:id,version:job.version};
    });
  }
}
