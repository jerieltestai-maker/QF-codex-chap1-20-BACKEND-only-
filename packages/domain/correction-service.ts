import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedJob} from './workspace-service.js';
import {adminOnly} from './verification-service.js';
import {newCase,caseAttention,caseEvent} from './support-core.js';
import {completion,balance} from './completion-core.js';
import {readWork,agreeStartTask} from './work-core.js';
import {finishResponse,responseTask} from './procurement-clocks.js';
import {cancellationEvent} from './cancellation-service.js';
import {datedTask} from './support-core.js';

export const correctionTargets=['restore_work','restore_procurement','fresh_repair','review_invoice','review_payment'] as const;
async function impact(tx:Sql,id:string,target:string) {
  if(!correctionTargets.includes(target as typeof correctionTargets[number]))throw new AppError(422,'FIELD_VALIDATION','Choose a supported controlled correction');
  const [j]=await tx.query('SELECT version,stage FROM job_records WHERE id=$1',[id]),[w]=await tx.query('SELECT * FROM work_state WHERE job_id=$1',[id]),cp=await completion(tx,id),b=await balance(tx,id);
  const [cancel]=await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id]);
  const financial=await tx.query('SELECT id,version,amount_cents FROM financial_confirmations WHERE job_id=$1 ORDER BY version',[id]);
  const tasks=await tx.query("SELECT id,version,kind FROM tasks WHERE resource_id=$1 AND status='open' ORDER BY id",[id]);
  if(['restore_work','fresh_repair'].includes(target)&&!w)throw new AppError(409,'NO_AUTHORITY','Work restoration requires original work authorisation; replacement uses a linked new ticket');
  if(target==='restore_work'&&!cancel&&w?.status!=='interrupted')throw new AppError(409,'RESTORATION_NOT_REQUIRED','No cancelled/interrupted work is awaiting restoration');
  if(target==='fresh_repair'&&!cp)throw new AppError(409,'NO_COMPLETION','A fresh remedy requires a previous physical completion round');
  if(target==='fresh_repair'||target==='restore_work'&&cp) {
    if((await tx.query("SELECT id FROM aftercare_cases WHERE job_id=$1 AND status<>'resolved'",[id])).length)throw new AppError(409,'AFTERCARE_WORKFLOW_REQUIRED','Use the existing unresolved aftercare repair');
    if((await tx.query("SELECT o.id FROM support_obligations o JOIN support_requests s ON s.id=o.support_id WHERE s.job_id=$1 AND o.kind='repair' AND o.verified_at IS NULL AND o.superseded_at IS NULL",[id])).length)throw new AppError(409,'REPAIR_ALREADY_ACTIVE','Use the existing authorised physical remedy');
  }
  if(target==='restore_procurement'&&(w||!cancel))throw new AppError(409,'LINKED_REPLACEMENT_REQUIRED','Authorised jobs require a linked replacement; only cancelled preauthorisation procurement can be restored here');
  return {oldStage:j!.stage,jobVersion:j!.version,target,cancellationId:cancel?.id??null,work:w??null,completion:cp??null,financial,
    balances:{payableCents:b.payable.toString(),sentCents:b.sent.toString(),receivedCents:b.received.toString(),outstandingCents:b.outstanding.toString()},tasks,
    invalidatesAcceptance:(target==='fresh_repair'||target==='restore_work')&&!!cp,
    retained:'Original approvals, cancellations, invoices, transfers, fees, collections, deadlines and still-valid physical facts are retained.'};
}
export class CorrectionService {
  constructor(readonly commands:CommandService){}
  preview(token:string,meta:WorkspaceCommand,id:string,body:{target:string}) {
    return this.commands.run(token,meta,'correction.preview',{id,...body},async(tx,a)=>{adminOnly(a);await authorizedJob(tx,a,id);},async(tx,a)=>{
      const j=await authorizedJob(tx,a,id);requireVersion(j.version,meta.expectedVersion);const previewId=randomUUID(),now=this.commands.now(),before=await impact(tx,id,body.target);
      await tx.query('INSERT INTO correction_previews VALUES($1,$2,$3,$4,$5,$6,$7)',[previewId,id,j.version,body.target,before,a.id,now.toISOString()]);return {jobId:id,previewId,impact:before,version:j.version};
    });
  }
  execute(token:string,meta:WorkspaceCommand,id:string,body:{previewId:string;reason:string;feasibleConfirmed:boolean;followUpAt?:string}) {
    return this.commands.run(token,meta,'correction.execute',{id,...body},async(tx,a)=>{adminOnly(a);await authorizedJob(tx,a,id);},async(tx,a)=>{
      const j=await authorizedJob(tx,a,id);requireVersion(j.version,meta.expectedVersion);
      const [p]=await tx.query('SELECT * FROM correction_previews WHERE id=$1 AND job_id=$2 AND actor_id=$3',[body.previewId,id,a.id]);
      if(!p)throw new AppError(404,'NOT_FOUND','Preview unavailable');requireVersion(Number(p.job_version),j.version);
      const current=await impact(tx,id,String(p.target));
      // Compare the full dependency snapshot; tasks, payments and approvals can change without the job version.
      const canonical=(v:unknown):string=>JSON.stringify(v,(_key,val)=>val&&typeof val==='object'&&!Array.isArray(val)?Object.fromEntries(Object.entries(val).sort(([a],[b])=>a.localeCompare(b))):val);
      if(canonical(p.impact)!==canonical(current))throw new AppError(412,'DEPENDENCIES_CHANGED','Affected facts changed. Review a new impact preview');
      const reason=requiredText(body.reason),now=this.commands.now(),target=String(p.target);
      if(!body.feasibleConfirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the displayed dependencies and safe/feasible action');
      let supportId:string|undefined,stage='Admin Intervention';
      if(target.startsWith('restore_')) {
        if(current.cancellationId){await tx.query('UPDATE cancellations SET restored_at=$1 WHERE id=$2',[now.toISOString(),current.cancellationId]);await cancellationEvent(tx,String(current.cancellationId),'admin.restored',{reason,previewId:p.id},now,a.id);}
        for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind IN ('cancellation.response','cancellation.follow-up') AND status='open'",[id]))await finishResponse(tx,String(t.id));
      }
      if(target==='restore_procurement') {
        const [selection]=await tx.query('SELECT * FROM selection_state WHERE job_id=$1',[id]),[rfq]=await tx.query('SELECT round_id FROM rfq_publications WHERE job_id=$1',[id]);
        stage=selection?.status==='pending'?'MCST Reviewing selected Contractor':'Requesting for quotes';
        if(rfq)await tx.query('UPDATE quotation_rounds SET status=$1 WHERE id=$2',[selection?.status==='pending'?'paused':'open',rfq.round_id]);
        if(selection?.status==='pending') {
          const task=await responseTask(tx,now,{kind:'selection.approval',resourceId:id,estateId:j.estate_id,ownerRole:'mcst',action:'Review the restored exact Contractor selection before work authorisation.',rule:'T07'});await tx.query('UPDATE selection_state SET task_id=$1 WHERE job_id=$2',[task,id]);
        }
      } else if(target==='restore_work'&&!current.completion) {
        await tx.query("UPDATE work_state SET status='active',interruption_id=NULL WHERE job_id=$1",[id]);const w=await readWork(tx,id);stage=w.started_at?'Carrying out work':'Starting work';await agreeStartTask(tx,w,now);
      } else {
        const repair=target==='fresh_repair'||target==='restore_work';
        supportId=await newCase(tx,a,id,{description:reason,category:repair?'quality_remedy':'invoice_payment',privacy:'ordinary'},now);
        if(repair) {
          if(!body.followUpAt)throw new AppError(422,'FOLLOW_UP_REQUIRED','A fresh repair requires a dated Admin follow-up');
          await tx.query('UPDATE completion_state SET accepted_round=NULL WHERE job_id=$1',[id]);
          if(target==='restore_work')await tx.query("UPDATE work_state SET status='active',interruption_id=NULL WHERE job_id=$1",[id]);
          await tx.query("INSERT INTO support_resolutions VALUES($1,1,'Perform a fresh physical remedy',$2,$3,$4,$5)",[supportId,reason,JSON.stringify([{kind:'repair',description:reason}]),a.id,now.toISOString()]);
          const task=await caseAttention(tx,supportId,'support.execution','Perform the authorised remedy, then submit a fresh physical completion round for inspection.',now,'contractor');await tx.query('UPDATE tasks SET response_rule=NULL WHERE id=$1',[task]);
          await datedTask(tx,task,reason,body.followUpAt,now);
          const [lastRound]=await tx.query('SELECT max(round) AS round FROM completion_rounds WHERE job_id=$1',[id]);
          await tx.query("INSERT INTO support_obligations(id,support_id,resolution_version,kind,owner_role,description,required_round,verified_at,task_id) VALUES($1,$2,1,'repair','contractor',$3,$4,NULL,$5)",[randomUUID(),supportId,reason,Number(lastRound!.round)+1,task]);
          await tx.query("UPDATE support_cases SET state='execution',resolution_version=1 WHERE support_id=$1",[supportId]);
          for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND support_id IS NULL AND kind IN ('completion.inspect','completion.confirm','completion.response','completion.remedy') AND status='open'",[id]))await finishResponse(tx,String(t.id));
        }
        await caseEvent(tx,a,supportId,'correction.authorised',{previewId:p.id,target,reason},now);
      }
      await tx.query('UPDATE job_records SET stage=$1,version=version+1,updated_at=$2 WHERE id=$3',[stage,now.toISOString(),id]);
      await audit(tx,a,'correction.execute',id,current,{target,stage,supportId,previewId:p.id},meta.requestId,now,reason);return {jobId:id,supportId,version:j.version+1,stage};
    });
  }
}
