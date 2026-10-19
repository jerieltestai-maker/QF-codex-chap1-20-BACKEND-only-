import {AppError,requiredText} from '../contracts/primitives.js';
import type {Actor} from './access.js';
import type {Sql} from '../infrastructure/database.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {workAccess,contractorOnly,bumpWork,workEvent,readWork,type WorkState} from './work-core.js';
import {completion,money,readyFile,pendingVariation,reviewer,finishKind,completionTask,reconcileCompletion} from './completion-core.js';
import {explicitInstant} from './calendar.js';

export class CompletionService {
  constructor(readonly commands:CommandService) {}
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:unknown,role:(a:Actor)=>void,work:(tx:Sql,a:Actor,w:WorkState)=>Promise<Record<string,unknown>>) {
    return this.commands.run(token,meta,intent,{id,...body as object},async(tx,a)=>{await workAccess(tx,a,id);role(a);},async(tx,a)=>{
      const w=await workAccess(tx,a,id);requireVersion(w.version,meta.expectedVersion);
      if(w.status!=='active')throw new AppError(409,'WORK_NOT_ACTIONABLE','Work is interrupted or cancelled');
      return work(tx,a,w);
    });
  }
  async submit(token:string,meta:WorkspaceCommand,id:string,body:{invoiceFileId:string;amountSgd:string;explanation?:string;completedAt:string;evidenceIds?:string[];confirmed:boolean;originatingRound?:number}) {
    return this.run(token,meta,id,'completion.submit',body,contractorOnly,async(tx,a,w)=>{
      if(w.integrity_paused)throw new AppError(409,'MCST_CLEARANCE_REQUIRED','Ordinary work is paused until MCST clears the warning');
      const now=this.commands.now(),c=await completion(tx,id),evidenceIds=body.evidenceIds??[],explanation=(body.explanation??'').trim();
      if(!w.started_at)throw new AppError(409,'NOT_STARTED','Start must be recorded before completion');
      if(c?.confirmed_version)throw new AppError(409,'INVOICE_FROZEN','Use Admin Support for changes after financial confirmation');
      await pendingVariation(tx,id);
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm all work is finished and the invoice is attached');
      const occurred=explicitInstant(body.completedAt);
      if(occurred>now||occurred<new Date(w.started_at))throw new AppError(422,'FIELD_VALIDATION','Physical completion time must fall between Start and now');
      if(c) {
        const [inspection]=await tx.query('SELECT outcome FROM inspections WHERE job_id=$1 AND round=$2',[id,c.round]);
        if(!inspection&&c.scope===w.scope)throw new AppError(409,'REMEDY_NOT_ACTIONABLE','The current submitted round must be inspected before another physical remedy');
        requireVersion(c.round,body.originatingRound??0);requiredText(explanation);
        if(occurred<new Date(c.completed_at))throw new AppError(422,'FIELD_VALIDATION','A corrected round cannot predate its originating physical completion');
      } else if(body.originatingRound!==undefined)throw new AppError(422,'FIELD_VALIDATION','The first round has no originating findings');
      await readyFile(tx,a,id,body.invoiceFileId,'invoice');
      for(const file of evidenceIds)await readyFile(tx,a,id,file,'evidence');
      const amount=money(body.amountSgd),round=(c?.round??0)+1,invoice=(c?.invoice_version??0)+1;
      await tx.query('INSERT INTO completion_rounds VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,round,w.terms_version,w.scope,occurred.toISOString(),a.id,now.toISOString(),evidenceIds,c?.round??null]);
      await tx.query('INSERT INTO invoice_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,invoice,round,body.invoiceFileId,amount,explanation,a.id,now.toISOString()]);
      await tx.query('INSERT INTO completion_state(job_id,round,invoice_version) VALUES($1,$2,$3) ON CONFLICT(job_id) DO UPDATE SET round=$2,invoice_version=$3,accepted_round=NULL',[id,round,invoice]);
      await tx.query("UPDATE work_state SET completed_at=$1,resume_context='inspection' WHERE job_id=$2",[occurred.toISOString(),id]);
      for(const kind of ['completion.inspect','completion.remedy','completion.response','completion.confirm'])await finishKind(tx,id,kind);
      await workEvent(tx,w,a,'completion.declared',{round,invoiceVersion:invoice,amountCents:amount,fileIds:evidenceIds,physicalCompletionSource:'contractor declaration',originatingRound:c?.round??null,explanation,completionTargetAt:w.completion_target_at,completionTargetVersion:w.completion_target_version,hoursLate:w.completion_target_at?Math.max(0,(occurred.getTime()-new Date(w.completion_target_at).getTime())/3600000):null},now,occurred.toISOString());
      const version=await bumpWork(tx,await readWork(tx,id),now,"CM's Inspecting of work");
      await reconcileCompletion(tx,id,now);
      await audit(tx,a,'completion.submit',id,c?{round:c.round,invoiceVersion:c.invoice_version}:null,{round,invoiceVersion:invoice,completedAt:occurred.toISOString(),version},meta.requestId,now);
      return {jobId:id,version:(await readWork(tx,id)).version,round,invoiceVersion:invoice};
    });
  }
  async inspect(token:string,meta:WorkspaceCommand,id:string,body:{round:number;outcome:'accepted'|'unsatisfactory';checklist:{scopeReviewed:boolean;issuesReviewed:boolean;evidenceReviewed:boolean;invoiceReviewed:boolean};findings:string;satisfactory:boolean;confirmed:boolean}) {
    return this.run(token,meta,id,'completion.inspect',body,reviewer,async(tx,a,w)=>{
      const c=await completion(tx,id),now=this.commands.now();if(!c||c.confirmed_version)throw new AppError(409,'INSPECTION_NOT_ACTIONABLE','No current inspection is available');
      requireVersion(c.round,body.round);await pendingVariation(tx,id);
      if(c.scope!==w.scope)throw new AppError(409,'SCOPE_CHANGED','Submit a new physical completion round for the authorised changed scope');
      const [existing]=await tx.query('SELECT round FROM inspections WHERE job_id=$1 AND round=$2',[id,c.round]);
      if(existing)throw new AppError(409,'ALREADY_INSPECTED','This inspection outcome is immutable');
      if(!body.confirmed||!Object.values(body.checklist).every(v=>v===true))throw new AppError(422,'REVIEW_REQUIRED','Review scope, issues, available evidence and invoice, then confirm the outcome');
      if(body.outcome==='accepted'&&!body.satisfactory)throw new AppError(422,'CONFIRMATION_REQUIRED','I agree the works are Complete and Satisfactory must be explicitly checked');
      const findings=body.outcome==='unsatisfactory'?requiredText(body.findings):body.findings.trim();
      await tx.query('INSERT INTO inspections VALUES($1,$2,$3,$4,$5,$6,$7)',[id,c.round,body.outcome,body.checklist,findings,a.id,now.toISOString()]);
      await tx.query('UPDATE completion_state SET accepted_round=$1 WHERE job_id=$2',[body.outcome==='accepted'?c.round:null,id]);
      await finishKind(tx,id,'completion.inspect');
      if(body.outcome==='unsatisfactory')await completionTask(tx,w,'completion.response','contractor','Respond to this inspection’s findings and submit corrected work for a fresh inspection.',now,c.round);
      await workEvent(tx,w,a,'completion.inspected',{round:c.round,outcome:body.outcome,findings,checklist:body.checklist},now);
      await bumpWork(tx,w,now,body.outcome==='accepted'?'Confirming invoice':'Addressing issues');await reconcileCompletion(tx,id,now);
      await audit(tx,a,'completion.inspect',id,{round:c.round},{outcome:body.outcome,findings},meta.requestId,now);
      return {jobId:id,version:(await readWork(tx,id)).version,round:c.round,outcome:body.outcome};
    });
  }
  async respond(token:string,meta:WorkspaceCommand,id:string,body:{round:number;response:string}) {
    return this.run(token,meta,id,'completion.respond',body,contractorOnly,async(tx,a,w)=>{
      const c=await completion(tx,id),now=this.commands.now();if(!c||c.accepted_round||c.confirmed_version)throw new AppError(409,'REMEDY_NOT_ACTIONABLE','No outstanding failed inspection');
      requireVersion(c.round,body.round);
      const [i]=await tx.query("SELECT round FROM inspections WHERE job_id=$1 AND round=$2 AND outcome='unsatisfactory'",[id,c.round]);
      if(!i)throw new AppError(409,'REMEDY_NOT_ACTIONABLE','The current round must be inspected first');
      const response=requiredText(body.response);await finishKind(tx,id,'completion.response');
      const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.remedy' AND status='open'",[id]);
      if(!task)await completionTask(tx,w,'completion.remedy','contractor','Carry out the promised remedy and submit a new completion round. A response alone does not complete the repair.',now,c.round);
      await workEvent(tx,w,a,'completion.remedy-response',{round:c.round,response},now);
      const version=await bumpWork(tx,w,now,'Addressing issues');await audit(tx,a,'completion.respond',id,{round:c.round},{response,version},meta.requestId,now);
      return {jobId:id,version};
    });
  }
  async reviseInvoice(token:string,meta:WorkspaceCommand,id:string,body:{invoiceVersion:number;invoiceFileId:string;amountSgd:string;explanation:string}) {
    return this.run(token,meta,id,'completion.invoice',body,contractorOnly,async(tx,a,w)=>{
      const c=await completion(tx,id),now=this.commands.now();if(!c||c.confirmed_version)throw new AppError(409,'INVOICE_FROZEN','No editable invoice; use Admin Support after confirmation');
      requireVersion(c.invoice_version,body.invoiceVersion);const explanation=requiredText(body.explanation),amount=money(body.amountSgd);
      await readyFile(tx,a,id,body.invoiceFileId,'invoice');
      const iv=c.invoice_version+1;await tx.query('INSERT INTO invoice_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,iv,c.round,body.invoiceFileId,amount,explanation,a.id,now.toISOString()]);
      await tx.query('UPDATE completion_state SET invoice_version=$1 WHERE job_id=$2',[iv,id]);await finishKind(tx,id,'completion.confirm');
      // A revision resolves the old response, even when the revised invoice still needs reconciliation.
      await finishKind(tx,id,'completion.invoice');
      const version=await bumpWork(tx,w,now,w.stage);await reconcileCompletion(tx,id,now);
      await workEvent(tx,w,a,'completion.invoice-revised',{beforeVersion:c.invoice_version,invoiceVersion:iv,amountCents:amount,explanation,acceptanceRetained:!!c.accepted_round},now);
      await audit(tx,a,'completion.invoice',id,{invoiceVersion:c.invoice_version,amountCents:c.amount_cents},{invoiceVersion:iv,amountCents:amount,explanation,version},meta.requestId,now);
      return {jobId:id,version:(await readWork(tx,id)).version,invoiceVersion:iv};
    });
  }
}
