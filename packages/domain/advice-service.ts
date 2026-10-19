import {randomUUID} from 'node:crypto';
import {AppError} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedJob} from './workspace-service.js';
import {requireCapability} from './access.js';
import {publication,selectableQuotes,maskedName} from './quote-service.js';
import {refreshReputation,fingerprint} from './reputation-core.js';
import {score} from './reputation-model.js';

export type Evidence={jobVersion:number;rfqRevision:number;roundId:string;settingsVersion:number;contextId:string;role:string;primary:string;secondary:string|null;
  quotes:{quoteId:string;quoteVersion:number;name:string;masked:boolean;amountCents:string;availability:string;duration:string;snapshotId:string;pure:number|null;adjusted:number|null;externalCount:number;quoteFixCount:number}[]};
export type AdviceResult={recommendedQuoteId:string|null;citations:string[];origin?:'local'|'provider'};
export interface AdviceProvider {readonly name:string;evaluate(evidence:Evidence,signal?:AbortSignal):Promise<AdviceResult>}
export async function comparisonEvidence(tx:Sql,a:Actor,id:string,now:Date):Promise<Evidence> {
  requireCapability(a,'rfq.manage');const job=await authorizedJob(tx,a,id),rfq=await publication(tx,id),[estate]=await tx.query('SELECT version FROM estates WHERE id=$1',[job.estate_id]);
  const priorities=rfq.snapshot as {primaryPriority:string;secondaryPriority?:string},quotes=[];
  for(const q of await selectableQuotes(tx,String(rfq.round_id),Number(rfq.scope_version),now)) {
    const identity=await maskedName(tx,a,id,q.organisation_id),snapshot=await refreshReputation(tx,q.organisation_id,now),scores=score(snapshot.inputs.units,priorities.primaryPriority,priorities.secondaryPriority);
    quotes.push({quoteId:q.id,quoteVersion:q.current_version,name:identity.name,masked:identity.masked,amountCents:String(q.amount_cents),availability:q.terms.availability,duration:q.terms.duration,
      snapshotId:snapshot.snapshotId,pure:scores.pure,adjusted:scores.adjusted,externalCount:scores.externalCount,quoteFixCount:scores.quoteFixCount});
  }
  quotes.sort((a,b)=>a.quoteId.localeCompare(b.quoteId));
  return {jobVersion:job.version,rfqRevision:Number(rfq.revision),roundId:String(rfq.round_id),settingsVersion:Number(estate!.version),contextId:a.context!.id,role:a.context!.role,primary:priorities.primaryPriority,secondary:priorities.secondaryPriority??null,quotes};
}
function preferred(e:Evidence):string|null {
  if(e.quotes.length<2||e.primary==='none')return null;
  let candidates=e.quotes;
  for(const priority of [e.primary,e.secondary].filter((p):p is string=>!!p)) {
    const order=['same_day','next_day','2_3_days','4_7_days'];
    const value=(q:Evidence['quotes'][number]):bigint|null=>priority==='lower_total_price'?BigInt(q.amountCents):priority==='earlier_availability'&&order.includes(q.availability)?BigInt(order.indexOf(q.availability)):
      priority==='workmanship'&&q.adjusted!==null?-BigInt(Math.round(q.adjusted*10)):null;
    // Similar experience/disruption and unknown custom availability lack comparable structured evidence.
    if(candidates.some(q=>value(q)===null))return null;
    const best=candidates.map(q=>value(q)!).reduce((a,b)=>a<b?a:b);
    candidates=candidates.filter(q=>value(q)===best);
    if(candidates.length===1)return candidates[0]!.quoteId;
  }
  return null;
}
export const localAdvice:AdviceProvider={name:'local-factual-comparison',async evaluate(e) {
  const recommendedQuoteId=preferred(e);return {recommendedQuoteId,citations:recommendedQuoteId?[recommendedQuoteId]:[]};
}};
export async function currentAdvice(tx:Sql,a:Actor,id:string,now:Date) {
  const evidence=await comparisonEvidence(tx,a,id,now),hash=fingerprint(evidence);
  const [advice]=await tx.query('SELECT id,fingerprint,result,recorded_at FROM comparison_advice WHERE job_id=$1 AND actor_id=$2 ORDER BY sequence DESC LIMIT 1',[id,a.id]);
  return {evidence,fingerprint:hash,advice:advice?.fingerprint===hash?advice:null};
}
// Selection stores the evidence visible to its actual actor, including the exact current advice, immutably.
export async function freezeReputation(tx:Sql,a:Actor,id:string,now:Date) {
  const current=await currentAdvice(tx,a,id,now);return {evidence:current.evidence,advice:current.advice??null};
}
export async function projectFrozenReputation(tx:Sql,a:Actor,id:string,snapshot:Awaited<ReturnType<typeof freezeReputation>>|undefined) {
  if(!snapshot)return null;const quotes=[];let concealed=false;
  for(const q of snapshot.evidence.quotes) {
    const [source]=await tx.query('SELECT organisation_id FROM quotes WHERE id=$1 AND job_id=$2',[q.quoteId,id]);if(!source)continue;
    const identity=await maskedName(tx,a,id,String(source.organisation_id));concealed ||= identity.masked;quotes.push({...q,...identity});
  }
  const result=snapshot.advice?.result as Record<string,unknown>|undefined;
  return {rfqRevision:snapshot.evidence.rfqRevision,primary:snapshot.evidence.primary,secondary:snapshot.evidence.secondary,quotes,
    advice:result?{...result,...(concealed?{preferenceFit:'The recommendation and cited quote versions were saved at selection. Free text is withheld while identities are concealed.'}:{})}:null};
}
export class AdviceService {
  private readonly inFlight=new Map<string,{promise:Promise<AdviceResult>;users:number}>();
  constructor(readonly commands:CommandService,readonly provider:AdviceProvider=localAdvice,readonly timeoutMs=15000) {}
  private async load(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);return {...await currentAdvice(tx,a,id,this.commands.now()),actorId:a.id,csrf:a.csrf,accessVersion:a.accessVersion};});
  }
  async detail(token:string,id:string) {
    const current=await this.load(token,id);return {version:current.evidence.jobVersion,evidence:current.evidence,advice:current.advice};
  }
  async request(token:string,meta:WorkspaceCommand,id:string,body:{confirmed:boolean}) {
    const before=await this.load(token,id);let evaluated:AdviceResult|null=null,failure=false;
    const authorize=async(tx:Sql,a:Actor)=>{requireCapability(a,'rfq.manage');await authorizedJob(tx,a,id);};
    const [receipt]=await this.commands.db.query('SELECT operation_id FROM command_receipts WHERE actor_id=$1 AND operation_id=$2',[before.actorId,meta.operationId]);
    if(receipt)return this.commands.run(token,meta,'reputation.advice',{id,...body},authorize,async()=>{throw new AppError(409,'REPLAY_UNAVAILABLE','Refresh the comparison');});
    if(before.csrf!==meta.csrf)throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
    if(before.accessVersion!==meta.accessVersion)throw new AppError(412,'ACCESS_CHANGED','Access changed. Review current records');
    requireVersion(before.evidence.jobVersion,meta.expectedVersion);
    if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Explicitly request advice using the current comparison');
    const cached=before.advice?.result as Record<string,unknown>|undefined;
    if(cached?.provider===this.provider.name&&cached.status==='ready')return this.commands.run(token,meta,'reputation.advice',{id,...body},authorize,async(tx,a)=>{
      const current=await currentAdvice(tx,a,id,this.commands.now());requireVersion(current.evidence.jobVersion,meta.expectedVersion);
      if(current.fingerprint!==before.fingerprint)throw new AppError(412,'ADVICE_STALE','Review the changed comparison');
      return {jobId:id,version:current.evidence.jobVersion,adviceId:before.advice!.id,result:cached};
    });
    // Provider work happens outside the transaction/lock. Only structured citations and a candidate ID are accepted.
    let flight=this.inFlight.get(before.fingerprint);
    if(!flight) {
      const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
      const promise=Promise.race([Promise.resolve().then(()=>this.provider.evaluate(before.evidence,controller.signal)),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Advice timeout'));},this.timeoutMs);})]).finally(()=>clearTimeout(timer));
      flight={promise,users:0};this.inFlight.set(before.fingerprint,flight);
    }
    flight.users++;
    try {
      try {evaluated=await flight.promise;}catch {failure=true;}
      return await this.commands.run(token,meta,'reputation.advice',{id,...body},authorize,async(tx,a)=>{
      const current=await currentAdvice(tx,a,id,this.commands.now());requireVersion(current.evidence.jobVersion,meta.expectedVersion);
      if(before.fingerprint!==current.fingerprint)throw new AppError(412,'ADVICE_STALE','Quote, reputation, priorities or access changed. Review current facts and request advice again');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Explicitly request advice using the current comparison');
      const recommended=evaluated?.recommendedQuoteId??null,quote=current.evidence.quotes.find(q=>q.quoteId===recommended),valid=!recommended||!!quote;
      const citations=evaluated?.citations;
      if(!valid||!Array.isArray(citations)||citations.some(c=>!current.evidence.quotes.some(q=>q.quoteId===c))||recommended&&!citations.includes(recommended))failure=true;
      // A provider cannot introduce a hidden cheapest fallback or unsupported specialty claim.
      const supported=preferred(current.evidence);
      if(recommended&&recommended!==supported)failure=true;
      const now=this.commands.now(),adviceId=randomUUID(),result={provider:this.provider.name,mode:this.provider===localAdvice||evaluated?.origin==='local'?'local_factual':'provider',status:failure?'unavailable':'ready',
        recommendedQuoteId:failure?null:recommended,citations:failure?[]:citations??[],
        preferenceFit:!failure&&quote?`${quote.name} best matches the stated priorities among comparable current facts: ${current.evidence.primary.replaceAll('_',' ')}${current.evidence.secondary?', then '+current.evidence.secondary.replaceAll('_',' '):''}.`:'The available evidence does not support a single recommendation. Review the factual comparison and choose manually.',
        limitations:['The estate chooses; advice does not authorise work.','Historical timeliness does not establish current availability. Historical value is not the current price.',
          'External references are Contractor-selected; sparse or missing history cannot guarantee outcomes.','Current quotes may differ in scope, exclusions and commitments; review the complete comparison.',
          ...(current.evidence.secondary?['This local comparison evaluates the primary priority first and uses the secondary priority to break a tie. Review other tradeoffs manually.']:[])]};
      await tx.query('INSERT INTO comparison_advice(id,job_id,actor_id,fingerprint,context,result,recorded_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[adviceId,id,a.id,current.fingerprint,current.evidence,result,now.toISOString()]);
      await audit(tx,a,'reputation.advice',id,null,{adviceId,fingerprint:current.fingerprint,provider:this.provider.name,status:result.status},meta.requestId,now);
      return {jobId:id,version:current.evidence.jobVersion,adviceId,result};
      });
    } finally {flight.users--;if(!flight.users)this.inFlight.delete(before.fingerprint);}
  }
}
