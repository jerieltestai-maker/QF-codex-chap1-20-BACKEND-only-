import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {audit} from './commands.js';
import {createAttention} from './verification-service.js';
import {finishResponse} from './procurement-clocks.js';
import {eventPolicy} from './integrity-settings.js';
import type {QuoteRow} from './quote-service.js';
export interface Trigger {rule:string;threshold:number|null;basisCents?:string;amountCents?:string;differenceCents?:string;percentage?:string|null;unavailable?:string;count?:number;sourceCardId?:string;previouslyCleared?:boolean}
export interface Evaluation {policy:Awaited<ReturnType<typeof eventPolicy>>;triggers:Trigger[];evidence:Record<string,unknown>}
export function percentageRule(rule:string,basis:bigint|null,amount:bigint,threshold:number,absolute=false):Trigger|null {
  if(basis===null||basis<=0n)return {rule,threshold,basisCents:basis?.toString()??'unavailable',amountCents:amount.toString(),percentage:null,unavailable:'Percentage unavailable: no positive starting price. Review the recorded amounts.'};
  const delta=amount-basis,difference=absolute?(delta<0n?-delta:delta):delta;
  if(difference<=0n||difference*100n<basis*BigInt(threshold))return null;
  // Exact cross multiplication decides the warning. Rounded text is display-only.
  const hundredths=(difference*10000n+basis/2n)/basis;
  return {rule,threshold,basisCents:basis.toString(),amountCents:amount.toString(),differenceCents:delta.toString(),percentage:(hundredths/100n).toString()+'.'+(hundredths%100n).toString().padStart(2,'0')};
}
export async function revisionEvaluation(tx:Sql,q:QuoteRow):Promise<Evaluation> {
  const policy=await eventPolicy(tx,q.job_id,q.round_id);
  const [first]=await tx.query('SELECT version,amount_cents,terms,recorded_at FROM quote_versions WHERE quote_id=$1 AND scope_version=$2 ORDER BY version LIMIT 1',[q.id,q.scope_version]);
  const trigger=policy&&first&&Number(first.version)!==q.current_version?percentageRule('quote_revision',BigInt(String(first.amount_cents)),BigInt(q.amount_cents),policy.values.quoteRevisionPct,true):null;
  return {policy,triggers:trigger?[trigger]:[],evidence:{quoteId:q.id,quoteVersion:q.current_version,scopeVersion:q.scope_version,rfqRevision:q.rfq_revision,first:first??null,current:{amountCents:String(q.amount_cents),terms:q.terms,reason:q.revision_reason,recordedAt:q.recorded_at},comparison:'First quote for this same material RFQ scope; earlier material scopes are separate.'}};
}
export async function selectionEvaluation(tx:Sql,jobId:string,roundId:string,selected:QuoteRow,quotes:QuoteRow[]):Promise<Evaluation> {
  const policy=await eventPolicy(tx,jobId,roundId),triggers:Trigger[]=[];
  if(policy) {
    const amounts=quotes.map(q=>BigInt(q.amount_cents)),lowest=amounts.length?amounts.reduce((a,b)=>a<b?a:b):null;
    const gap=percentageRule('selected_price',lowest,BigInt(selected.amount_cents),policy.values.selectedPricePct);if(gap)triggers.push(gap);
    if(quotes.length<policy.values.minimumQuotes)triggers.push({rule:'quote_count',threshold:policy.values.minimumQuotes,count:quotes.length});
  }
  // A settings edit never recalculates a recorded quote revision. Reuse the exact revision event's rule.
  const [revision]=await tx.query(`SELECT c.id,c.triggers,x.card_id FROM integrity_cards c LEFT JOIN integrity_clearances x ON x.card_id=c.id
    WHERE c.event_type='quote.revision' AND c.source_id=$1 AND c.source_version=$2 ORDER BY c.recorded_at DESC LIMIT 1`,[selected.id,selected.current_version]);
  if(revision)for(const t of revision.triggers as Trigger[])triggers.push({...t,sourceCardId:String(revision.id),previouslyCleared:!!revision.card_id});
  return {policy,triggers,evidence:{quoteId:selected.id,quoteVersion:selected.current_version,scopeVersion:selected.scope_version,
    selectedAmountCents:String(selected.amount_cents),comparableQuotes:quotes.map(q=>({quoteId:q.id,quoteVersion:q.current_version,amountCents:String(q.amount_cents),scopeVersion:q.scope_version,terms:q.terms})),
    interpretation:'Received-price differences only. Review exclusions, timing and scope; no market valuation or misconduct finding.'}};
}
export async function variationEvaluation(tx:Sql,jobId:string,roundId:string,proposal:{newTotalCents:string;deltaCents:string;reason:string},currentAmount:string):Promise<Evaluation> {
  const policy=await eventPolicy(tx,jobId,roundId),[selection]=await tx.query('SELECT a.amount_cents,a.quote_id,a.quote_version FROM work_authorisations a WHERE a.job_id=$1',[jobId]);
  const prospective=BigInt(currentAmount)+BigInt(proposal.deltaCents);
  const trigger=policy?percentageRule('variation_growth',selection?BigInt(String(selection.amount_cents)):null,prospective,policy.values.variationGrowthPct):null;
  return {policy,triggers:trigger?[trigger]:[],evidence:{selected:selection??null,approvedTotalCents:currentAmount,proposal,prospectiveTotalCents:prospective.toString(),pendingWorkAuthorised:false,
    calculation:'(approved total + this proposal delta - selected quote) / selected quote. Pending alternatives are not added.'}};
}
export function needsClearance(e:Evaluation) {return e.triggers.some(t=>!t.previouslyCleared);}
export async function recordCard(tx:Sql,a:Actor,jobId:string,roundId:string,eventType:string,sourceId:string,sourceVersion:number,e:Evaluation,now:Date,requestId:string) {
  if(!e.triggers.length)return null;
  const eventKey=eventType+':'+sourceId+':'+sourceVersion+':'+(e.policy?.settingId??'legacy'),[existing]=await tx.query('SELECT id FROM integrity_cards WHERE event_key=$1',[eventKey]);if(existing)return String(existing.id);
  if(eventType.startsWith('variation.')) {
    const [same]=await tx.query("SELECT id FROM integrity_cards WHERE source_id=$1 AND event_type LIKE 'variation.%' AND policy=$2::jsonb AND evidence=$3::jsonb ORDER BY recorded_at DESC LIMIT 1",[sourceId,JSON.stringify(e.policy??{unavailable:true}),JSON.stringify(e.evidence)]);
    if(same)return String(same.id);
  }
  const id=randomUUID();
  await tx.query('INSERT INTO integrity_cards VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id,jobId,roundId,eventKey,eventType,sourceId,sourceVersion,e.policy??{unavailable:true},JSON.stringify(e.triggers),e.evidence,a.id,now.toISOString()]);
  const [j]=await tx.query('SELECT estate_id FROM job_records WHERE id=$1',[jobId]);
  for(const role of ['mcst','admin'])await createAttention(tx,now,{kind:role==='mcst'?(eventType==='quote.revision'?'integrity.review':eventType.startsWith('variation.')?'integrity.hold':'integrity.warning'):'integrity.warning',resourceId:id,estateId:String(j!.estate_id),ownerRole:role,
    action:eventType.startsWith('variation.')?'Ordinary work is paused. Review the grouped variation warning and explicitly clear continuation; withdrawing or rejecting the proposal does not resume work.':'Review the grouped procurement warning and exact source evidence. A warning is not a misconduct finding.',informational:role==='admin'||eventType==='selection'});
  await audit(tx,a,'integrity.warning',jobId,null,{cardId:id,eventType,sourceId,sourceVersion,policy:e.policy,triggers:e.triggers},requestId,now);
  return id;
}
export async function clearCard(tx:Sql,a:Actor,cardId:string,sourceVersion:number,explanation:string,now:Date,requestId:string) {
  if(!['mcst','admin'].includes(a.context?.role??''))throw new AppError(403,'FORBIDDEN','MCST clearance is required');
  const [card]=await tx.query('SELECT source_version,job_id,triggers FROM integrity_cards WHERE id=$1',[cardId]);
  if(!card||card.source_version!==sourceVersion)throw new AppError(412,'WARNING_CHANGED','Review the exact warning source version');
  if(await cardCleared(tx,cardId))throw new AppError(409,'WARNING_ALREADY_CLEARED','This exact warning already has an immutable clearance');
  const reason=requiredText(explanation);
  await tx.query('INSERT INTO integrity_clearances VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(card_id) DO NOTHING',[cardId,reason,a.id,a.context!.role,sourceVersion,now.toISOString()]);
  for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind IN ('integrity.review','integrity.hold') AND status='open'",[cardId]))await finishResponse(tx,String(t.id));
  await audit(tx,a,'integrity.clearance',String(card.job_id),null,{cardId,sourceVersion,explanation:reason},requestId,now,reason);
  for(const t of card.triggers as Trigger[])if(t.sourceCardId&&!await cardCleared(tx,t.sourceCardId)) {
    const [source]=await tx.query('SELECT source_version FROM integrity_cards WHERE id=$1 AND job_id=$2',[t.sourceCardId,card.job_id]);
    if(source)await clearCard(tx,a,t.sourceCardId,Number(source.source_version),reason,now,requestId);
  }
}
export async function cardCleared(tx:Sql,id:string) {return (await tx.query('SELECT card_id FROM integrity_clearances WHERE card_id=$1',[id])).length>0;}
export async function workHeld(tx:Sql,id:string) {return (await tx.query(`SELECT c.id FROM integrity_cards c WHERE c.job_id=$1 AND c.event_type LIKE 'variation.%'
  AND NOT EXISTS(SELECT 1 FROM integrity_clearances x WHERE x.card_id=c.id) LIMIT 1`,[id])).length>0;}
