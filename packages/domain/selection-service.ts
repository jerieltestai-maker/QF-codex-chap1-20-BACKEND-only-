import {randomUUID} from 'node:crypto';
import {AppError,requiredText,sgdCents} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {canRead,requireCapability} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedJob} from './workspace-service.js';
import {publication,currentQuote,selectableQuotes,maskedName,quoteCautions,type QuoteRow,type QuoteTerms} from './quote-service.js';
import {createAttention,finishAttention,eligibility,adminOnly} from './verification-service.js';
import {responseTask,finishResponse,stopSelectionClock} from './procurement-clocks.js';
import {explicitInstant,sourcingDue} from './calendar.js';
import type {Intake} from './rfq-service.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';
import {initializeWork} from './work-core.js';
import {freezeReputation,currentAdvice,projectFrozenReputation} from './advice-service.js';
import {refreshReputation} from './reputation-core.js';
import {score} from './reputation-model.js';
import {bindIntegrityRound} from './integrity-settings.js';
import {selectionEvaluation,recordCard,needsClearance,clearCard,cardCleared,type Evaluation} from './integrity-core.js';
import {concealPack} from './decision-pack.js';

const notFound=()=>new AppError(404,'NOT_FOUND','Resource unavailable');
export async function estateAuthority(sql:Sql,actor:Actor,id:string) {
  requireCapability(actor,'rfq.manage');return authorizedJob(sql,actor,id);
}
export async function publicTerms(sql:Sql,actor:Actor,quote:QuoteRow):Promise<QuoteTerms> {
  const name=await maskedName(sql,actor,quote.job_id,quote.organisation_id);
  if(!name.masked)return quote.terms;
  const identities=await contractorIdentifiers(sql,quote.organisation_id);
  const terms={...quote.terms};delete terms.narrative;
  for(const field of ['warrantyOther','availabilityOther','durationReason','exclusionsOther'] as const)if(terms[field])terms[field]=concealedText(terms[field]!,identities);
  return terms;
}
export async function quoteProjection(sql:Sql,actor:Actor,quote:QuoteRow,selectable:boolean,now:Date,held=false) {
  const identity=await maskedName(sql,actor,quote.job_id,quote.organisation_id);
  const expired=!held&&new Date(quote.expires_at)<=now;
  return {quoteId:quote.id,version:quote.version,quoteVersion:quote.current_version,...identity,terms:await publicTerms(sql,actor,quote),amountCents:Number(quote.amount_cents),
    rfqRevision:quote.rfq_revision,scopeVersion:quote.scope_version,expiresAt:quote.expires_at,status:held?'held':quote.status==='withdrawn'?'withdrawn':expired?'expired':quote.status,expired,held,selectable,cautions:quoteCautions(quote.terms),
    pdfId:identity.masked?null:quote.pdf_id??null,pdfWithheld:identity.masked&&!!quote.pdf_id,narrativeWithheld:identity.masked&&!!quote.terms.narrative};
}
function acknowledge(required:string[],provided:string[]) {
  if(required.some(code=>!provided.includes(code)))throw new AppError(422,'CAUTIONS_REQUIRED','Review and acknowledge every displayed caution and limited-comparison warning');
}
export function comparisonFacts(quotes:QuoteRow[]) {
  const amounts=quotes.map(q=>BigInt(q.amount_cents)),sum=amounts.reduce((a,b)=>a+b,0n),highest=amounts.reduce((a,b)=>a>b?a:b,0n);
  return {count:quotes.length,sumCents:sum.toString(),average:quotes.length?{numeratorCents:sum.toString(),denominator:quotes.length}:null,highestCents:quotes.length?highest.toString():null,
    versions:quotes.map(q=>({quoteId:q.id,quoteVersion:q.current_version,organisationId:q.organisation_id,amountCents:String(q.amount_cents),scopeVersion:q.scope_version}))};
}
export async function revealLocation(tx:Sql,actor:Actor,jobId:string,organisationId:string,cause:'visit'|'work_authorisation',sourceId:string,now:Date) {
  const [location]=await tx.query('SELECT e.name,e.private_address,j.affected_location FROM job_records j JOIN estates e ON e.id=j.estate_id WHERE j.id=$1',[jobId]);
  const snapshot={estateName:location!.name,address:location!.private_address??null,affectedLocation:location!.affected_location};
  await tx.query('INSERT INTO location_reveals VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(cause,source_id) DO NOTHING',[randomUUID(),jobId,organisationId,cause,sourceId,snapshot,actor.id,now.toISOString()]);
  await audit(tx,actor,'location.revealed',jobId,null,{organisationId,cause,sourceId},'location-reveal',now);
}
async function authorise(tx:Sql,actor:Actor,selection:Record<string,unknown>,now:Date) {
  const id=randomUUID(),quote=await currentQuote(tx,String(selection.quote_id));
  // Immutable selection points to its exact version; never substitute the latest pointer.
  const [version]=await tx.query('SELECT terms FROM quote_versions WHERE quote_id=$1 AND version=$2',[selection.quote_id,selection.quote_version]);
  await tx.query('INSERT INTO work_authorisations VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,selection.job_id,selection.id,selection.organisation_id,selection.quote_id,selection.quote_version,selection.amount_cents,version!.terms,actor.id,now.toISOString()]);
  await tx.query("UPDATE selection_state SET status='authorised' WHERE job_id=$1",[selection.job_id]);
  await tx.query("UPDATE quotation_rounds SET status='closed' WHERE id=$1",[selection.round_id]);
  await tx.query("UPDATE job_records SET stage='Starting work' WHERE id=$1",[selection.job_id]);
  await revealLocation(tx,actor,String(selection.job_id),String(selection.organisation_id),'work_authorisation',id,now);
  await createAttention(tx,now,{kind:'work.start',resourceId:String(selection.job_id),organisationId:quote.organisation_id,ownerRole:'contractor',action:'Work authorised. Review the agreed scope; record Start through the work workflow when ready.'});
  await initializeWork(tx,String(selection.job_id),now);
  await audit(tx,actor,'work.authorised',String(selection.job_id),null,{authorisationId:id,selectionId:selection.id,quoteId:selection.quote_id,quoteVersion:selection.quote_version,amountCents:String(selection.amount_cents)},'work-authorisation',now);
  return id;
}
export class SelectionService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;}get identity(){return this.commands.identity;}get now(){return this.commands.now;}
  async procurementSettings(token:string,id:string) {
    return this.db.transaction(async tx=>{
      const actor=await this.identity.actor(token,tx);
      if(!['mcst','admin'].includes(actor.context?.role??'')||!canRead(actor,{estateId:id}))throw notFound();
      const [estate]=await tx.query('SELECT id,name,version,approval_threshold_cents,contractor_identities_visible,private_address FROM estates WHERE id=$1',[id]);
      if(!estate)throw notFound();
      return {estateId:estate.id,name:estate.name,version:Number(estate.version),thresholdCents:estate.approval_threshold_cents===null?null:Number(estate.approval_threshold_cents),identitiesVisible:Boolean(estate.contractor_identities_visible),...(actor.context?.role==='admin'?{address:String(estate.private_address??'')}:{})};
    });
  }
  async compare(token:string,id:string) {
    return this.db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');
    const actor=await this.identity.actor(token,tx),job=await estateAuthority(tx,actor,id),rfq=await publication(tx,id);
    const valid=await selectableQuotes(tx,String(rfq.round_id),Number(rfq.scope_version),this.now()),facts=comparisonFacts(valid),quotes=[];
    const [held]=await tx.query("SELECT c.quote_id,c.quote_version FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.job_id=$1 AND s.status IN ('pending','authorised')",[id]);
    for(const row of await tx.query('SELECT id FROM quotes WHERE round_id=$1 ORDER BY id',[rfq.round_id])) {
      const quote=await currentQuote(tx,String(row.id)),reputation=await refreshReputation(tx,quote.organisation_id,this.now()),priorities=rfq.snapshot as Intake;
      quotes.push({...await quoteProjection(tx,actor,quote,valid.some(v=>v.id===quote.id),this.now(),held?.quote_id===quote.id&&held.quote_version===quote.current_version),
        reputation:score(reputation.inputs.units,priorities.primaryPriority,priorities.secondaryPriority),requiresReconfirmation:!held&&quote.scope_version!==rfq.scope_version});
    }
    const [estate]=await tx.query('SELECT version,approval_threshold_cents,contractor_identities_visible FROM estates WHERE id=$1',[job.estate_id]);
    const [state]=await tx.query('SELECT * FROM selection_state WHERE job_id=$1',[id]);
    const [clock]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[rfq.round_id]);
    // The internal version set retains org IDs for reproducibility; public projection does not expose them.
    const reputationReview=await currentAdvice(tx,actor,id,this.now());
    const integrityPreviews:Record<string,unknown>={};for(const q of valid)integrityPreviews[q.id]=await concealPack(tx,actor,id,await selectionEvaluation(tx,id,String(rfq.round_id),q,valid));
    if(state){const [selected]=await tx.query('SELECT snapshot FROM contractor_selections WHERE id=$1',[state.selection_id]);integrityPreviews.pending=await concealPack(tx,actor,id,(selected?.snapshot as {integrity?:Evaluation})?.integrity??null);}
    return {jobId:id,version:job.version,stage:job.stage,rfqRevision:rfq.revision,scopeVersion:rfq.scope_version,roundId:rfq.round_id,roundStatus:rfq.status,quotes,reputationFingerprint:reputationReview.fingerprint,advice:reputationReview.advice,
      comparison:{count:facts.count,sumCents:facts.sumCents,average:facts.average,highestCents:facts.highestCents},thresholdCents:estate?.approval_threshold_cents===null?null:Number(estate?.approval_threshold_cents),
      settingsVersion:estate?.version,selection:state??null,clock:clock??null,integrityPreviews,history:await this.historyFor(tx,actor,id),serverTime:this.now().toISOString()};
    });
  }
  async settings(token:string,meta:WorkspaceCommand,id:string,body:{thresholdSgd?:string;identitiesVisible?:boolean;address?:string;reason:string}) {
    return this.commands.run(token,meta,'estate.procurement-settings',{id,...body},async(_tx,actor)=>{
      if(body.thresholdSgd!==undefined||body.address!==undefined)adminOnly(actor);
      else if(actor.context?.role!=='mcst'&&actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','MCST or Admin authority required');
      if(!canRead(actor,{estateId:id}))throw notFound();
    },async(tx,actor)=>{
      const [estate]=await tx.query('SELECT * FROM estates WHERE id=$1',[id]);if(!estate)throw notFound();requireVersion(Number(estate.version),meta.expectedVersion);
      if(body.thresholdSgd===undefined&&body.identitiesVisible===undefined&&body.address===undefined)throw new AppError(422,'FIELD_VALIDATION','Supply a setting to change');
      let threshold=estate.approval_threshold_cents;if(body.thresholdSgd!==undefined)try{threshold=sgdCents(body.thresholdSgd);}catch{throw new AppError(422,'FIELD_VALIDATION','Use an exact SGD threshold');}
      const reason=requiredText(body.reason),version=Number(estate.version)+1,now=this.now();
      await tx.query('UPDATE estates SET approval_threshold_cents=$1,contractor_identities_visible=$2,private_address=$3,version=$4 WHERE id=$5',[threshold,body.identitiesVisible??estate.contractor_identities_visible,body.address?.trim()??estate.private_address,version,id]);
      await audit(tx,actor,'estate.procurement-settings',id,{thresholdCents:estate.approval_threshold_cents,identitiesVisible:estate.contractor_identities_visible,version:estate.version},{thresholdCents:threshold,identitiesVisible:body.identitiesVisible??estate.contractor_identities_visible,addressChanged:body.address!==undefined,version},meta.requestId,now,reason);
      return {estateId:id,version};
    });
  }
  async select(token:string,meta:WorkspaceCommand,id:string,body:{settingsVersion:number;rfqRevision:number;quoteId:string;quoteVersion:number;rationale:string;confirmed:boolean;acknowledgedCautions:string[];thresholdAcknowledged:boolean;reputationFingerprint?:string;clearWarning?:boolean;warningExplanation?:string}) {
    return this.commands.run(token,meta,'selection.select',{id,...body},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      const job=await estateAuthority(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if((await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id])).length)throw new AppError(409,'LINKED_REPLACEMENT_REQUIRED','Authorised work retains its contractor. Create a linked replacement ticket.');
      const rfq=await publication(tx,id);if(rfq.status!=='open')throw new AppError(409,'QUOTING_PAUSED','A current nomination is already being reviewed');
      const quotes=await selectableQuotes(tx,String(rfq.round_id),Number(rfq.scope_version),this.now()),quote=quotes.find(q=>q.id===body.quoteId);
      if(!quote||quote.current_version!==body.quoteVersion)throw new AppError(412,'QUOTE_CHANGED','Select an exact currently valid quote version after reviewing the latest comparison');
      const [estate]=await tx.query('SELECT * FROM estates WHERE id=$1',[job.estate_id]);
      requireVersion(Number(estate!.version),body.settingsVersion);requireVersion(Number(rfq.revision),body.rfqRevision);
      if(estate!.approval_threshold_cents===null)throw new AppError(409,'THRESHOLD_REQUIRED','Admin must configure the estate approval threshold before selection');
      const threshold=Number(estate!.approval_threshold_cents),amount=Number(quote.amount_cents),above=amount>threshold,combined=actor.context!.role==='mcst'||actor.context!.role==='admin';
      const required=[...quoteCautions(quote.terms),...(quotes.length<3?['limited_comparison']:[])];acknowledge(required,body.acknowledgedCautions);
      if(!body.confirmed||(combined&&above&&!body.thresholdAcknowledged))throw new AppError(422,'CONFIRMATION_REQUIRED',combined&&above?'Confirm the displayed amount and threshold with Yes I know':'Explicitly confirm the selection');
      const review=await currentAdvice(tx,actor,id,this.now());
      if((body.reputationFingerprint!==undefined||review.evidence.quotes.some(q=>q.pure!==null)||review.advice)&&body.reputationFingerprint!==review.fingerprint)
        throw new AppError(412,'REPUTATION_CHANGED','Review the current reputation and comparison evidence before selecting');
      const integrity=await selectionEvaluation(tx,id,String(rfq.round_id),quote,quotes),flagged=needsClearance(integrity);
      if(!integrity.policy)throw new AppError(409,'INTEGRITY_POLICY_REQUIRED','MCST must explicitly configure warning settings for future events on this legacy ticket');
      if(flagged&&combined&&body.clearWarning!==true)throw new AppError(422,'WARNING_CLEARANCE_REQUIRED','Review the warning and explicitly Allow work to proceed with an explanation');
      if(flagged&&combined)requiredText(body.warningExplanation??'');
      const pendingMcst=!combined&&(above||flagged);
      const idSelection=randomUUID(),now=this.now(),version=job.version+1;
      const cardId=await recordCard(tx,actor,id,String(rfq.round_id),'selection',idSelection,1,integrity,now,meta.requestId);
      if(cardId&&flagged&&combined)await clearCard(tx,actor,cardId,1,body.warningExplanation!,now,meta.requestId);
      const snapshot={comparison:comparisonFacts(quotes),terms:quote.terms,cautions:required,integrity,integrityCardId:cardId,
        reputation:await freezeReputation(tx,actor,id,now),acknowledgments:body.acknowledgedCautions,thresholdAcknowledged:body.thresholdAcknowledged,rfqRevision:rfq.revision,scopeVersion:rfq.scope_version,thresholdVersion:estate!.version,
        quotes:await Promise.all(quotes.map(async q=>({quoteId:q.id,quoteVersion:q.current_version,organisationId:q.organisation_id,name:(await maskedName(tx,{...actor,context:{...actor.context!,role:'admin'}},id,q.organisation_id)).name,terms:q.terms,amountCents:String(q.amount_cents)})))};
      const rationale=requiredText(body.rationale);
      await tx.query('INSERT INTO contractor_selections VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[idSelection,id,rfq.round_id,quote.id,quote.current_version,quote.organisation_id,threshold,estate!.version,amount,rationale,snapshot,actor.id,actor.context!.role,now.toISOString()]);
      let taskId:string|null=null;
      if(pendingMcst)taskId=await responseTask(tx,now,{kind:'selection.approval',resourceId:id,estateId:job.estate_id,ownerRole:'mcst',action:flagged?'Review the grouped warning; explicitly clear and approve or reject this exact nomination':'Review the selected contractor and approve or reject this exact nomination',rule:'T07',requiredVersion:version});
      await tx.query("INSERT INTO selection_state VALUES($1,$2,$3,$4,$5) ON CONFLICT(job_id) DO UPDATE SET selection_id=$2,status=$3,version=$4,task_id=$5",[id,idSelection,pendingMcst?'pending':'authorised',version,taskId]);
      await tx.query("UPDATE quotation_rounds SET status='paused' WHERE id=$1",[rfq.round_id]);
      await tx.query("UPDATE job_records SET version=$1,updated_at=$2,stage='MCST Reviewing selected Contractor' WHERE id=$3",[version,now.toISOString(),id]);
      for(const kind of ['rfq.sourcing','selection.review','selection.escalation','rfq.urgent'])await finishAttention(tx,id,kind);
      // Pending Q&A/visit tasks cannot outlive the frozen quotation phase.
      for(const table of ['job_questions','visit_requests'])for(const pending of await tx.query(`SELECT task_id FROM ${table} WHERE job_id=$1 AND state='pending'`,[id]))await finishResponse(tx,String(pending.task_id));
      await tx.query("UPDATE job_questions SET state='superseded',version=version+1 WHERE job_id=$1 AND state='pending'",[id]);await tx.query("UPDATE visit_requests SET state='superseded',version=version+1 WHERE job_id=$1 AND state='pending'",[id]);
      let authorisationId:string|null=null;
      if(!pendingMcst) {
        await tx.query('INSERT INTO selection_decisions VALUES($1,$2,$3,\'\',$4,$5,$6)',[randomUUID(),idSelection,combined?'combined_authorisation':'threshold_authorisation',{cautions:body.acknowledgedCautions,thresholdAcknowledged:body.thresholdAcknowledged},actor.id,now.toISOString()]);
        const [selection]=await tx.query('SELECT * FROM contractor_selections WHERE id=$1',[idSelection]);authorisationId=await authorise(tx,actor,selection!,now);
      }
      await audit(tx,actor,'selection.select',id,{version:job.version},{selectionId:idSelection,quoteId:quote.id,quoteVersion:quote.current_version,version,pendingMcst,authorisationId,integrityCardId:cardId},meta.requestId,now,rationale);
      await enqueue(tx,'selection.changed',id,{selectionId:idSelection,version},now);return {jobId:id,selectionId:idSelection,version,pendingMcst,authorisationId,integrityCardId:cardId};
    });
  }
  async decide(token:string,meta:WorkspaceCommand,id:string,body:{selectionId:string;outcome:'approved'|'rejected';reason:string;confirmed:boolean;acknowledgedCautions:string[];clearWarning?:boolean;warningExplanation?:string}) {
    return this.commands.run(token,meta,'selection.decide',{id,...body},async(tx,actor)=>{if(actor.context?.role!=='mcst'&&actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','MCST approval authority required');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if(job.stage==='Cancelled'||(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id])).length)throw new AppError(409,'WORK_CANCELLED','Cancelled procurement cannot authorise work');
      const [state]=await tx.query('SELECT * FROM selection_state WHERE job_id=$1',[id]);if(!state||state.status!=='pending'||state.selection_id!==body.selectionId)throw new AppError(412,'SELECTION_CHANGED','Review the exact current pending nomination');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the displayed nomination decision');
      const [selection]=await tx.query('SELECT * FROM contractor_selections WHERE id=$1',[body.selectionId]),now=this.now(),version=job.version+1;
      if(body.outcome==='approved') {
        const snapshot=selection!.snapshot as {integrity?:Evaluation;integrityCardId?:string};
        if(snapshot.integrity&&needsClearance(snapshot.integrity)&&snapshot.integrityCardId&&!await cardCleared(tx,snapshot.integrityCardId)) {
          if(body.clearWarning!==true)throw new AppError(422,'WARNING_CLEARANCE_REQUIRED','Explicitly Allow work to proceed with an explanation');
          await clearCard(tx,actor,snapshot.integrityCardId,1,body.warningExplanation??'',now,meta.requestId);
        }
        const rfq=await publication(tx,id);if(!(await eligibility(tx,String(selection!.organisation_id),(rfq.snapshot as Intake).categories,now,{selected:true})).eligible)throw new AppError(409,'CONTRACTOR_RESTRICTED','Required eligibility is no longer current. Request Admin Support; the held terms remain preserved.');
        acknowledge((selection!.snapshot as {cautions:string[]}).cautions,body.acknowledgedCautions);
      }
      await tx.query('INSERT INTO selection_decisions VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),body.selectionId,body.outcome,body.reason.trim(),{cautions:body.acknowledgedCautions},actor.id,now.toISOString()]);
      if(state.task_id)await finishResponse(tx,String(state.task_id));
      await tx.query('UPDATE selection_state SET version=$1,status=$2,task_id=NULL WHERE job_id=$3',[version,body.outcome==='approved'?'authorised':'rejected',id]);
      await tx.query('UPDATE job_records SET version=$1,updated_at=$2,stage=$3 WHERE id=$4',[version,now.toISOString(),body.outcome==='approved'?'Starting work':'Rejected Contractor',id]);
      let authorisationId:string|null=null;
      if(body.outcome==='approved')authorisationId=await authorise(tx,actor,selection!,now);
      else await tx.query("UPDATE quotation_rounds SET status='open' WHERE id=$1",[selection!.round_id]);
      await audit(tx,actor,'selection.decide',id,{selectionId:body.selectionId,status:'pending'},{status:body.outcome,version,authorisationId},meta.requestId,now,body.reason);
      await enqueue(tx,'selection.changed',id,{selectionId:body.selectionId,outcome:body.outcome,version},now);return {jobId:id,version,authorisationId};
    });
  }
  async reopen(token:string,meta:WorkspaceCommand,id:string,reasonInput:string) {
    return this.commands.run(token,meta,'selection.reopen',{id,reason:reasonInput},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);const [state]=await tx.query('SELECT * FROM selection_state WHERE job_id=$1',[id]);
      if(!state||state.status!=='rejected'||(await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id])).length)throw new AppError(409,'REOPEN_NOT_ALLOWED','A new round requires a rejected nomination before work authorisation');
      const rfq=await publication(tx,id),now=this.now(),roundId=randomUUID(),reason=requiredText(reasonInput),version=job.version+1;
      await tx.query("UPDATE quotation_rounds SET status='closed' WHERE id=$1",[rfq.round_id]);await stopSelectionClock(tx,String(rfq.round_id),now);
      const rules=await tx.query('SELECT r.category,r.version,ARRAY(SELECT type_id FROM trade_requirements q WHERE q.category=r.category ORDER BY type_id) AS required_type_ids FROM trade_rules r WHERE category=ANY($1) ORDER BY category',[(rfq.snapshot as Intake).categories]);
      await tx.query("INSERT INTO quotation_rounds(id,job_id,number,status,published_at,sourcing_due_at,rule_snapshot) VALUES($1,$2,$3,'open',$4,$5,$6)",[roundId,id,Number(rfq.number)+1,now.toISOString(),sourcingDue(now).toISOString(),JSON.stringify(rules)]);
      await bindIntegrityRound(tx,job.estate_id,roundId,now);
      await tx.query('UPDATE rfq_publications SET round_id=$1 WHERE job_id=$2',[roundId,id]);await tx.query("UPDATE job_records SET stage='Requesting for quotes',version=$1,updated_at=$2 WHERE id=$3",[version,now.toISOString(),id]);
      for(const kind of ['rfq.sourcing','selection.review','selection.escalation'])await finishAttention(tx,id,kind);
      if((rfq.snapshot as Intake).urgency==='urgent')await createAttention(tx,now,{kind:'rfq.urgent',resourceId:id,estateId:job.estate_id,action:'Take coordination for the explicitly reopened urgent quotation round',urgent:true,requiredVersion:Number(rfq.number)+1});
      await audit(tx,actor,'selection.reopen',id,{roundId:rfq.round_id},{roundId,version,previousSelectionId:state.selection_id},meta.requestId,now,reason);
      await enqueue(tx,'rfq.changed',id,{revision:rfq.revision,scopeVersion:rfq.scope_version,roundId},now);return {jobId:id,version,roundId};
    });
  }
  async schedule(token:string,meta:WorkspaceCommand,id:string,at:string) {
    return this.commands.run(token,meta,'selection.schedule',{id,at},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);const rfq=await publication(tx,id),date=explicitInstant(at),now=this.now();
      const [clock]=await tx.query('SELECT * FROM selection_clocks WHERE round_id=$1',[rfq.round_id]);
      if(rfq.status!=='open'||!clock||clock.status==='stopped'||date<=now)throw new AppError(422,'REVIEW_DATE_REQUIRED','Schedule a future review for an actionable open selection task');
      await tx.query('UPDATE selection_clocks SET scheduled_review_at=$1 WHERE round_id=$2',[date.toISOString(),rfq.round_id]);
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);
      await audit(tx,actor,'selection.schedule',id,{scheduledReviewAt:clock.scheduled_review_at,anchorAt:clock.anchor_at},{scheduledReviewAt:date.toISOString(),originalAnchorPreserved:true},meta.requestId,now);
      return {jobId:id,version:job.version+1,scheduledReviewAt:date.toISOString()};
    });
  }
  async history(token:string,id:string) {
    return this.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const actor=await this.identity.actor(token,tx);await estateAuthority(tx,actor,id);return this.historyFor(tx,actor,id);});
  }
  private async historyFor(tx:Sql,actor:Actor,id:string) {
    const result=[];
    for(const selection of await tx.query('SELECT * FROM contractor_selections WHERE job_id=$1 ORDER BY recorded_at,id',[id])) {
      const identity=await maskedName(tx,actor,id,String(selection.organisation_id)),quote=await currentQuote(tx,String(selection.quote_id));
      const snapshot=selection.snapshot as {reputation?:Awaited<ReturnType<typeof freezeReputation>>;cautions:string[];terms:QuoteTerms;comparison:ReturnType<typeof comparisonFacts>;quotes:{name:string;quoteId:string;quoteVersion:number;organisationId:string;terms:QuoteTerms;amountCents:string}[]};
      const clean=(value:string)=>identity.masked&&value?'Free-text decision details are withheld while identities are concealed. MCST can review them.':value;
      const [exact]=await tx.query('SELECT terms FROM quote_versions WHERE quote_id=$1 AND version=$2',[selection.quote_id,selection.quote_version]);
      const terms=await publicTerms(tx,actor,{...quote,terms:exact!.terms as QuoteTerms});
      const frozenQuotes=[];
      for(const frozen of snapshot.quotes) {
        const original=await currentQuote(tx,frozen.quoteId),display=await maskedName(tx,actor,id,frozen.organisationId);
        frozenQuotes.push({quoteId:frozen.quoteId,quoteVersion:frozen.quoteVersion,...display,amountCents:frozen.amountCents,terms:await publicTerms(tx,actor,{...original,terms:frozen.terms}),narrativeWithheld:display.masked&&!!frozen.terms.narrative});
      }
      result.push({selectionId:selection.id,quoteId:selection.quote_id,quoteVersion:selection.quote_version,roundId:selection.round_id,...identity,amountCents:Number(selection.amount_cents),thresholdCents:Number(selection.threshold_cents),
        reputation:await projectFrozenReputation(tx,actor,id,snapshot.reputation),rationale:clean(String(selection.rationale)),terms,narrativeWithheld:identity.masked&&!!(exact!.terms as QuoteTerms).narrative,cautions:snapshot.cautions,frozenQuotes,comparison:{count:snapshot.comparison.count,sumCents:snapshot.comparison.sumCents,average:snapshot.comparison.average,highestCents:snapshot.comparison.highestCents},
        recordedAt:selection.recorded_at,decisions:(await tx.query('SELECT id,outcome,reason,actor_id,recorded_at FROM selection_decisions WHERE selection_id=$1 ORDER BY recorded_at,id',[selection.id])).map(d=>({...d,reason:clean(String(d.reason))}))});
    }
    return result;
  }
  async replacement(token:string,meta:WorkspaceCommand,id:string,body:{title:string;observations:string;affectedLocation:string;reason:string}) {
    return this.commands.run(token,meta,'selection.replacement',{id,...body},async(tx,actor)=>{await estateAuthority(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);if(!(await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id])).length)throw new AppError(409,'REPLACEMENT_NOT_REQUIRED','Preauthorisation rejection permits reselection on this ticket');
      const newId=randomUUID(),now=this.now(),fields={title:requiredText(body.title),observations:requiredText(body.observations),affectedLocation:requiredText(body.affectedLocation)},reason=requiredText(body.reason);
      await tx.query('INSERT INTO job_records(id,estate_id,created_by,title,observations,affected_location,replaces_job_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)',[newId,job.estate_id,actor.id,fields.title,fields.observations,fields.affectedLocation,id,now.toISOString()]);
      await tx.query('INSERT INTO job_versions VALUES($1,1,$2,$3,$4)',[newId,fields,actor.id,now.toISOString()]);await audit(tx,actor,'workspace.create',newId,null,{...fields,version:1,replacesJobId:id},meta.requestId,now,reason);
      await audit(tx,actor,'selection.replacement',id,null,{replacementJobId:newId},meta.requestId,now,reason);return {jobId:newId,version:1,replacesJobId:id,message:'Linked private replacement ticket created. Original work authority and financial history remain separate.'};
    });
  }
}
