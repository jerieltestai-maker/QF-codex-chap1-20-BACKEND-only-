import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {AppError} from '../contracts/primitives.js';
import {CommandService} from './commands.js';
import {taskVisible,maskedWorkTask,type Task} from './task-service.js';
import {contractorReadRfq,selectableQuotes,publication} from './quote-service.js';
import {contractorRfq} from './rfq-service.js';
import {packAccess,packHistory,contractorHistory,concealPack} from './decision-pack.js';
import {jobWaiting,type Job} from './workspace-service.js';

export interface DashboardFilter {q?:string;stage?:string;category?:string;urgency?:string;from?:string;to?:string;offset?:number;limit?:number;state?:string}
function page<T>(items:T[],f:DashboardFilter) {const offset=f.offset??0,limit=f.limit??25;return {items:items.slice(offset,offset+limit),total:items.length,offset,limit};}
function within(at:unknown,f:DashboardFilter) {const t=new Date(at as string).getTime();return (!f.from||t>=Date.parse(f.from))&&(!f.to||t<=Date.parse(f.to));}
const noticeKinds=new Set(['quote.updated','selection.outcome','variation.outcome','work.overdue-estate','work.start-missed-estate','payment.assumed-notice','support.resolution-notice','integrity.warning','integrity.access-summary']);
export async function taskRows(tx:Sql,a:Actor,now:Date) {
  const rows=await tx.query<Task>(`SELECT t.* FROM tasks t WHERE t.status='open' AND t.informational=false AND (t.owner_role=$1 OR $1='admin' OR ($1='mcst' AND t.owner_role='cm'))
    AND ($1='admin' OR t.estate_id=$2 OR t.organisation_id=$3) ORDER BY t.created_at,t.id`,[a.context?.role??'',a.context?.estate_id??null,a.context?.organisation_id??null]);
  const result=[];
  for(const t of rows)if(!noticeKinds.has(String(t.kind))&&await taskVisible(tx,a,t,true)) {
    const [timer]=await tx.query("SELECT rule,due_at FROM timer_jobs WHERE task_id=$1 AND task_version=$2 AND status IN ('pending','done') ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,due_at LIMIT 1",[t.id,t.version]);
    const scheduled=!!(t.acknowledged_at&&t.follow_up_at&&new Date(t.follow_up_at)>now)||!!(t.actionable_at&&new Date(t.actionable_at as string)>now);
    const [overdueEvent]=await tx.query("SELECT rule,due_at FROM timer_jobs WHERE task_id=$1 AND task_version=$2 AND status IN ('pending','done') AND due_at<$3 ORDER BY due_at LIMIT 1",[t.id,t.version,now.toISOString()]);
    const event=scheduled?timer:overdueEvent??timer,at=t.follow_up_at??event?.due_at??t.actionable_at;
    const dueName=t.follow_up_at?'Admin follow-up':event?.rule==='response.actor'?'Response reminder':event?.rule==='response.admin'?'Admin escalation':event?.rule==='T18'?'Unacknowledged Admin reminder':event?.rule==='urgent'?'Urgent Admin reminder':'Action available';
    const job=await tx.query(`SELECT id,title FROM job_records WHERE id=$1 UNION SELECT j.id,j.title FROM variations v JOIN job_records j ON j.id=v.job_id WHERE v.id=$1
      UNION SELECT j.id,j.title FROM support_requests s JOIN job_records j ON j.id=s.job_id WHERE s.id=$2
      UNION SELECT j.id,j.title FROM integrity_cards c JOIN job_records j ON j.id=c.job_id WHERE c.id=$1
      UNION SELECT j.id,j.title FROM protected_access_events e JOIN job_records j ON j.id=e.job_id WHERE e.id=$1`,[t.resource_id,t.support_id]);
    const value=await maskedWorkTask(tx,a,t,{taskId:t.id,jobId:job[0]?.id??null,kind:t.kind,ownerRole:t.owner_role,action:t.next_action??t.action,version:t.version,requiredVersion:t.required_version,
      nextEvent:dueName,eventAt:at??null,state:scheduled?'scheduled':t.follow_up_at&&new Date(t.follow_up_at)<now||overdueEvent?'overdue':'actionable',
      firstIssuedAt:t.first_issued_at,createdAt:t.created_at,acknowledgedAt:t.acknowledged_at,supportId:t.support_id});
    result.push(value);
  }return result;
}
export class DashboardService {
  constructor(readonly commands:CommandService){}
  private read<T>(token:string,fn:(tx:Sql,a:Actor,now:Date)=>Promise<T>) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);
      if(!a.context)throw new AppError(403,'CONTEXT_REQUIRED','Choose an authorised account context');return fn(tx,a,this.commands.now());});
  }
  tasks(token:string,f:DashboardFilter={}) {return this.read(token,async(tx,a,now)=>{
    const rows=(await taskRows(tx,a,now)).filter(t=>(!f.q||[t.action,t.kind,t.jobId].some(v=>String(v??'').toLowerCase().includes(f.q!.toLowerCase())))&&(!f.state||t.state===f.state)&&within(t.createdAt,f));
    return {...page(rows,f),serverTime:now.toISOString()};
  });}
  tickets(token:string,f:DashboardFilter={}) {return this.read(token,async(tx,a,now)=>{
    const rows=await tx.query(`SELECT j.id,j.estate_id,j.title,j.observations,j.affected_location,j.is_group_source,j.stage,j.version,j.created_at,j.data_origin,i.categories,i.urgency
      FROM job_records j LEFT JOIN rfq_intakes i ON i.job_id=j.id WHERE ($1 IN ('admin','contractor') OR j.estate_id=$2) ORDER BY j.created_at DESC,j.id`,[a.context!.role,a.context!.estate_id]);
    const tasks=await taskRows(tx,a,now),items=[];
    for(const j of rows) {
      let title=String(j.title),kind='estate';
      if(a.context!.role==='contractor')try {
        const rfq=await contractorReadRfq(tx,a,String(j.id),now);title=String((rfq.snapshot as Record<string,unknown>).publicDescription);kind='own_record';
        if(!(await tx.query('SELECT id FROM quotes WHERE job_id=$1 AND organisation_id=$2',[j.id,a.context!.organisation_id])).length) {await contractorRfq(tx,a,String(j.id),now);kind='eligible_opportunity';}
      }catch(e){if(e instanceof AppError&&e.status===404)continue;throw e;}
      let waitingOn={role:'contractor',action:kind==='eligible_opportunity'?'review the RFQ and submit a quote':'review your quote and permitted job records'};
      if(a.context!.role!=='contractor'||(await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1 AND organisation_id=$2',[j.id,a.context!.organisation_id])).length)waitingOn=await jobWaiting(tx,a,j as Job,now);
      else if((await tx.query("SELECT c.id FROM contractor_selections c JOIN selection_state s ON s.selection_id=c.id WHERE c.job_id=$1 AND c.organisation_id=$2 AND s.status='pending'",[j.id,a.context!.organisation_id])).length)waitingOn={role:'mcst',action:'review the held nomination before work is authorised'};
      const row={jobId:j.id,title,stage:j.stage,version:j.version,dataOrigin:j.data_origin,categories:j.categories??[],urgency:j.urgency??'ordinary',createdAt:j.created_at,kind,waitingOn,
        pendingActions:tasks.filter(t=>t.jobId===j.id).map(t=>({ownerRole:t.ownerRole,action:t.action,state:t.state,eventAt:t.eventAt,nextEvent:t.nextEvent}))};
      if(f.q&&![row.jobId,row.title].some(v=>String(v).toLowerCase().includes(f.q!.toLowerCase())))continue;
      if(f.stage&&row.stage!==f.stage||f.category&&!(row.categories as string[]).includes(f.category)||f.urgency&&row.urgency!==f.urgency||!within(j.created_at,f))continue;
      items.push(row);
    }
    return {...page(items,f),serverTime:now.toISOString()};
  });}
  history(token:string,id:string,f:DashboardFilter={}) {return this.read(token,async(tx,a,now)=>{
    await packAccess(tx,a,id,now);
    const history=a.context!.role==='contractor'?await contractorHistory(tx,a,id):await packHistory(tx,a,id) as Record<string,unknown>[];
    return {...page(history.filter(h=>(!f.q||JSON.stringify(h).toLowerCase().includes(f.q.toLowerCase()))&&within(h.recorded_at,f)),f),serverTime:now.toISOString()};
  });}
  analytics(token:string,id:string) {return this.read(token,async(tx,a,now)=>{
    const j=await packAccess(tx,a,id,now),fictional=j.data_origin==='fictional';
    const [marker]=await tx.query('SELECT environment FROM deployment_identity');
    if(fictional&&!['development','test'].includes(String(marker?.environment)))return {jobId:id,excluded:true,reason:'Fictional records are excluded from production analytics',metrics:null};
    const own=a.context!.role==='contractor',quotes=await tx.query(`SELECT q.id,q.organisation_id,v.version,v.amount_cents,v.terms FROM quotes q JOIN quote_versions v ON v.quote_id=q.id AND v.version=q.current_version
      WHERE q.job_id=$1 AND ($2::uuid IS NULL OR q.organisation_id=$2) ORDER BY q.id`,[id,own?a.context!.organisation_id:null]);
    let comparable=quotes;
    if(!own) {
      const [s]=await tx.query('SELECT c.snapshot FROM selection_state s JOIN contractor_selections c ON c.id=s.selection_id WHERE s.job_id=$1',[id]);
      if(s)comparable=(s.snapshot as {quotes:Record<string,unknown>[]}).quotes.map(q=>({amount_cents:q.amountCents,...q}));
      else if((await tx.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[id])).length) {const p=await publication(tx,id);comparable=await selectableQuotes(tx,String(p.round_id),Number(p.scope_version),now);}
      else comparable=[];
    }
    const amounts=comparable.map(q=>BigInt(String(q.amount_cents))),range=amounts.length?{minimumCents:amounts.reduce((a,b)=>a<b?a:b).toString(),maximumCents:amounts.reduce((a,b)=>a>b?a:b).toString()}:null;
    const workAllowed=!own||(await tx.query('SELECT job_id FROM work_authorisations WHERE job_id=$1 AND organisation_id=$2',[id,a.context!.organisation_id])).length>0;
    const terms=workAllowed?await tx.query('SELECT version,amount_cents,source_type,source_id,recorded_at FROM work_terms WHERE job_id=$1 ORDER BY version',[id]):[];
    const payments=workAllowed?await tx.query('SELECT id,amount_cents,transfer_date,reported_at,status,receipt_date,receipt_precision FROM payment_transfers WHERE job_id=$1 ORDER BY reported_at,id',[id]):[];
    const metrics={quoteCount:{value:comparable.length,definition:own?'Own latest quotes only':'Current selectable offers, or the exact set frozen at the latest selection',denominator:'Distinct contractor organisations'},range,
      quoteTerms:quotes,authorisedPriceMovement:terms,payments,
      initialQuotes:await tx.query(`SELECT DISTINCT ON (q.id) q.id,v.version,v.scope_version,v.amount_cents,v.recorded_at FROM quotes q JOIN quote_versions v ON v.quote_id=q.id WHERE q.job_id=$1 AND ($2::uuid IS NULL OR q.organisation_id=$2) ORDER BY q.id,v.version`,[id,own?a.context!.organisation_id:null]),
      selected:await tx.query('SELECT quote_id,quote_version,amount_cents,recorded_at FROM contractor_selections WHERE job_id=$1 AND ($2::uuid IS NULL OR organisation_id=$2) ORDER BY recorded_at,id',[id,own?a.context!.organisation_id:null]),
      invoices:workAllowed?await tx.query('SELECT version,amount_cents,recorded_at FROM invoice_versions WHERE job_id=$1 ORDER BY version',[id]):[],
      confirmedPayable:workAllowed?await tx.query('SELECT version,amount_cents,source,recorded_at FROM financial_confirmations WHERE job_id=$1 ORDER BY version',[id]):[],
      inspections:workAllowed?await tx.query('SELECT round,outcome,recorded_at FROM inspections WHERE job_id=$1 ORDER BY round',[id]):[],
      waiting:(await taskRows(tx,a,now)).filter(t=>t.jobId===id).map(t=>({taskId:t.taskId,ownerRole:t.ownerRole,firstIssuedAt:t.firstIssuedAt,recordedAt:t.createdAt,elapsedSinceNoticeMs:t.firstIssuedAt?Math.max(0,now.getTime()-new Date(t.firstIssuedAt as string).getTime()):null})),
      definition:'Recorded outcomes only. Actual transfer/receipt dates are separate from report times. Missing Feedback makes no outcome claim. No market estimate, proven saving, penalty or fault percentage.'};
    return {jobId:id,dataOrigin:j.data_origin,fictional,dateRange:{from:j.created_at??null,to:now.toISOString()},metrics:await concealPack(tx,a,id,metrics),serverTime:now.toISOString()};
  });}
}
