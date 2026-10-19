import {randomUUID} from 'node:crypto';
import {AppError,requiredText,sgdCents} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {explicitInstant} from './calendar.js';
import {responseTask,finishResponse} from './procurement-clocks.js';
import {agreeStartTask,bumpWork,contractorOnly,interruptWork,readWork,workAccess,workDestination,workEvent,type WorkState} from './work-core.js';
import {publication} from './quote-service.js';
import {variationEvaluation,needsClearance,recordCard,cardCleared,clearCard} from './integrity-core.js';
import {createAttention} from './verification-service.js';

export const rejectionReasons=['price','scope','timing','not_needed','other'] as const;
export type VariationKind='scope_price'|'completion_schedule'|'start_schedule';
export interface ProposalInput {
  reason:string; scope?:string; newTotalSgd?:string; timing:'unchanged'|'changed'; targetAt?:string; timingReason?:string;
  canContinueOriginal:boolean; canContinueApproved:boolean;
}
export interface Proposal extends ProposalInput {
  newTotalCents:string; deltaCents:string; scope:string; settingsVersion:number; thresholdCents:string;
  before:{amountCents:string;scope:string;completionTargetAt:string|null;scheduledStartAt:string|null;mcstAuthorisedCents:string|null};
}
interface Variation extends Record<string,unknown> {
  id:string; job_id:string; kind:VariationKind; proposer_id:string; state:string; current_version:number; task_id:string|null;
  approver_role:'cm'|'mcst'|null; proposer_role:string; proposal:Proposal; base_terms_version:number; contractor_confirmed:boolean;
}
function proposerAuthority(actor:Actor,v:Variation) {
  const role=actor.context?.role;return actor.id===v.proposer_id||role===v.proposer_role||(role==='mcst'&&v.proposer_role==='cm')||role==='admin';
}
async function variation(tx:Sql,id:string):Promise<Variation> {
  const [v]=await tx.query<Variation>('SELECT v.*,p.proposal,p.base_terms_version,p.contractor_confirmed FROM variations v JOIN variation_versions p ON p.variation_id=v.id AND p.version=v.current_version WHERE v.id=$1',[id]);
  if(!v)throw new AppError(404,'NOT_FOUND','Variation unavailable');return v;
}
export function variationApprover(total:bigint,threshold:bigint,ceiling:bigint|null):'cm'|'mcst' {
  return total<=threshold||(ceiling!==null&&total<=ceiling)?'cm':'mcst';
}
async function validateProposal(tx:Sql,w:WorkState,kind:VariationKind,input:ProposalInput,now:Date):Promise<Proposal> {
  const reason=requiredText(input.reason),[settings]=await tx.query('SELECT version,approval_threshold_cents FROM estates WHERE id=$1',[w.estate_id]);
  if(settings?.approval_threshold_cents===null||!settings)throw new AppError(409,'THRESHOLD_REQUIRED','Configure the estate threshold before a variation decision');
  if(typeof input.canContinueOriginal!=='boolean'||typeof input.canContinueApproved!=='boolean')throw new AppError(422,'FIELD_VALIDATION','Explicitly assess ability to continue the original and proposed work');
  let amount=String(w.amount_cents),scope=w.scope;
  if(kind==='scope_price') {
    scope=requiredText(input.scope??'');try{amount=String(sgdCents(input.newTotalSgd??''));}catch{throw new AppError(422,'FIELD_VALIDATION','Supply the exact new final GST-inclusive total in SGD');}
  } else if(input.scope!==undefined||input.newTotalSgd!==undefined)throw new AppError(422,'FIELD_VALIDATION','Schedule-only changes cannot change scope or price');
  if(kind==='start_schedule'&&w.started_at)throw new AppError(409,'ALREADY_STARTED','An actual Start cannot be rescheduled');
  if(kind==='completion_schedule'&&!w.completion_target_at)throw new AppError(409,'INITIAL_ESTIMATE_REQUIRED','Supply the first estimate through its own duty; it cannot be replaced by a schedule variation');
  if(kind!=='scope_price'&&input.timing!=='changed')throw new AppError(422,'FIELD_VALIDATION','Supply the proposed schedule date and time');
  let timingReason:string|undefined,targetAt:string|undefined;
  if(input.timing==='changed') {
    timingReason=requiredText(input.timingReason??'');const at=explicitInstant(input.targetAt??'');
    if(at<=now)throw new AppError(422,'FIELD_VALIDATION','Propose a future target date and time');
    if(kind==='scope_price'&&!w.completion_target_at)throw new AppError(409,'INITIAL_ESTIMATE_REQUIRED','Record the first completion estimate separately before changing its date');
    targetAt=at.toISOString();
  } else if(input.targetAt||input.timingReason)throw new AppError(422,'FIELD_VALIDATION','Unchanged timing must not contain a replacement target');
  return {reason,scope,...(kind==='scope_price'?{newTotalSgd:input.newTotalSgd!}:{}),timing:input.timing,...(targetAt?{targetAt,timingReason:timingReason!}:{}),
    canContinueOriginal:input.canContinueOriginal,canContinueApproved:input.canContinueApproved,newTotalCents:amount,deltaCents:(BigInt(amount)-BigInt(w.amount_cents)).toString(),settingsVersion:Number(settings.version),thresholdCents:String(settings.approval_threshold_cents),
    before:{amountCents:String(w.amount_cents),scope:w.scope,completionTargetAt:w.completion_target_at,scheduledStartAt:w.scheduled_start_at,mcstAuthorisedCents:w.mcst_authorised_cents}};
}
async function nextTask(tx:Sql,w:WorkState,v:VariationKind,id:string,confirmed:boolean,approver:'cm'|'mcst',now:Date,version:number) {
  return responseTask(tx,now,{kind:confirmed?'variation.decision':'variation.terms',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:confirmed?approver:'contractor',
    action:confirmed?`${v==='scope_price'?'Review variation':'Okay accepts this exact proposed date / Admin Intervention requests support'}: ${approver.toUpperCase()} decision required`:'Confirm change of terms: scope, price, timing and ability to continue',rule:confirmed&&approver==='mcst'?'T07':'T22',requiredVersion:version});
}
export class VariationService {
  constructor(readonly commands:CommandService) {}
  get now(){return this.commands.now;}
  async submit(token:string,meta:WorkspaceCommand,id:string,body:{kind:VariationKind;proposal:ProposalInput;confirmed:boolean;variationId?:string;proposalVersion?:number}) {
    return this.commands.run(token,meta,'variation.submit',{id,...body},async(tx,actor)=>{await workAccess(tx,actor,id);},async(tx,actor)=>{
      const w=await workAccess(tx,actor,id);requireVersion(w.version,meta.expectedVersion);
      const [frozen]=await tx.query('SELECT job_id FROM invoice_confirmations WHERE job_id=$1',[id]);
      if(frozen)throw new AppError(409,'INVOICE_FROZEN','Use Admin Support for authorised adjustments after invoice confirmation');
      if(w.status==='cancelled'||(w.completed_at&&w.resume_context==='work'))throw new AppError(409,'WORK_NOT_ACTIONABLE','This work context does not accept ordinary variations');
      if(w.completed_at&&body.kind!=='scope_price')throw new AppError(409,'WORK_COMPLETED','A completed physical round cannot have its start/completion target moved');
      const now=this.now(),proposal=await validateProposal(tx,w,body.kind,body.proposal,now),confirmed=actor.context?.role==='contractor';
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the displayed proposed terms');
      let approver=body.kind==='scope_price'?variationApprover(BigInt(proposal.newTotalCents),BigInt(proposal.thresholdCents),w.mcst_authorised_cents===null?null:BigInt(w.mcst_authorised_cents)):'cm';
      const rfq=await publication(tx,id),integrity=body.kind==='scope_price'?await variationEvaluation(tx,id,String(rfq.round_id),proposal,String(w.amount_cents)):null;
      if(integrity&&!integrity.policy)throw new AppError(409,'INTEGRITY_POLICY_REQUIRED','MCST must explicitly configure warning settings for future events on this legacy ticket');
      if(integrity&&needsClearance(integrity))approver='mcst';
      let vid=body.variationId??randomUUID(),pv=1;
      if(body.variationId) {
        const v=await variation(tx,vid);
        if(v.job_id!==id||v.kind!==body.kind||!['terms','decision'].includes(v.state))throw new AppError(409,'VARIATION_NOT_PENDING','This proposal is no longer pending');
        requireVersion(v.current_version,body.proposalVersion??0);requireVersion(w.terms_version,v.base_terms_version);
        if(!proposerAuthority(actor,v)&&actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','Only the proposing party or assigned Contractor may revise proposed terms');
        if(v.task_id)await finishResponse(tx,v.task_id);pv=v.current_version+1;
        await tx.query('UPDATE variations SET current_version=$1,state=$2,approver_role=$3 WHERE id=$4',[pv,confirmed?'decision':'terms',approver,vid]);
      } else {
        const [pending]=await tx.query("SELECT id FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[id]);
        if(pending)throw new AppError(409,'VARIATION_PENDING','Finish, withdraw or revise the current proposal before creating another');
        await tx.query('INSERT INTO variations(id,job_id,kind,proposer_id,proposer_role,state,approver_role) VALUES($1,$2,$3,$4,$5,$6,$7)',[vid,id,body.kind,actor.id,actor.context!.role,confirmed?'decision':'terms',approver]);
      }
      await tx.query('INSERT INTO variation_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[vid,pv,w.terms_version,proposal,confirmed,actor.id,actor.context!.role,now.toISOString()]);
      if(integrity)await recordCard(tx,actor,id,String(rfq.round_id),'variation.proposal',vid,pv,integrity,now,meta.requestId);
      const taskId=await nextTask(tx,w,body.kind,vid,confirmed,approver,now,pv);await tx.query('UPDATE variations SET task_id=$1 WHERE id=$2',[taskId,vid]);
      if(body.kind==='start_schedule')for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='work.agree-start' AND status='open'",[id]))await finishResponse(tx,String(t.id));
      const state=await readWork(tx,id),version=await bumpWork(tx,state,now,state.integrity_paused?workDestination(state):body.kind==='scope_price'&&w.status==='active'?'Modifying job scope':workDestination(w));
      await workEvent(tx,w,actor,'variation.proposed',{variationId:vid,proposalVersion:pv,proposal,confirmed,approverRole:approver},now);
      await audit(tx,actor,'variation.submit',id,proposal.before,{variationId:vid,proposalVersion:pv,proposal,version},meta.requestId,now,proposal.reason);
      return {jobId:id,variationId:vid,proposalVersion:pv,version,approverRole:approver,contractorConfirmed:confirmed};
    });
  }
  async confirm(token:string,meta:WorkspaceCommand,id:string,body:{variationId:string;proposalVersion:number;confirmed:boolean}) {
    return this.commands.run(token,meta,'variation.confirm',{id,...body},async(tx,actor)=>{await workAccess(tx,actor,id);contractorOnly(actor);},async(tx,actor)=>{
      const w=await workAccess(tx,actor,id),v=await variation(tx,body.variationId);requireVersion(w.version,meta.expectedVersion);requireVersion(v.current_version,body.proposalVersion);
      if(v.job_id!==id||v.state!=='terms'||w.status==='cancelled')throw new AppError(409,'VARIATION_NOT_PENDING','Contractor terms are no longer awaiting confirmation');
      requireVersion(w.terms_version,v.base_terms_version);if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm these exact proposed terms');
      if(v.task_id)await finishResponse(tx,v.task_id);const now=this.now(),pv=v.current_version+1;
      await tx.query('INSERT INTO variation_versions VALUES($1,$2,$3,$4,true,$5,$6,$7)',[v.id,pv,w.terms_version,v.proposal,actor.id,actor.context!.role,now.toISOString()]);
      const taskId=await nextTask(tx,w,v.kind,v.id,true,v.approver_role!,now,pv);
      await tx.query("UPDATE variations SET state='decision',current_version=$1,task_id=$2 WHERE id=$3",[pv,taskId,v.id]);
      const version=await bumpWork(tx,w,now,w.stage);
      await workEvent(tx,w,actor,'variation.contractor-confirmed',{variationId:v.id,proposalVersion:pv,proposal:v.proposal},now);
      await audit(tx,actor,'variation.confirm',id,{variationId:v.id,proposalVersion:v.current_version},{proposalVersion:pv,version},meta.requestId,now);
      return {jobId:id,variationId:v.id,proposalVersion:pv,version};
    });
  }
  async decide(token:string,meta:WorkspaceCommand,id:string,body:{variationId:string;proposalVersion:number;outcome:'approved'|'rejected'|'withdrawn'|'intervention';confirmed:boolean;reasonCode?:typeof rejectionReasons[number];reason?:string;clearWarning?:boolean;warningExplanation?:string}) {
    return this.commands.run(token,meta,'variation.decide',{id,...body},async(tx,actor)=>{await workAccess(tx,actor,id);},async(tx,actor)=>{
      const w=await workAccess(tx,actor,id),v=await variation(tx,body.variationId),now=this.now();
      requireVersion(w.version,meta.expectedVersion);requireVersion(v.current_version,body.proposalVersion);
      if(v.job_id!==id||!['terms','decision'].includes(v.state)||w.status==='cancelled')throw new AppError(409,'VARIATION_NOT_PENDING','A superseded, completed or cancelled proposal cannot change work authority');
      requireVersion(w.terms_version,v.base_terms_version);
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the exact version and decision');
      let reason=(body.reason??'').trim();
      if(body.outcome==='withdrawn') {
        if(!proposerAuthority(actor,v))throw new AppError(403,'FORBIDDEN','Only the proposing party may withdraw this change');
      } else {
        if(v.state!=='decision'||!v.contractor_confirmed)throw new AppError(409,'TERMS_UNCONFIRMED','The Contractor must confirm scope, price and timing first');
        if(actor.context?.role!==v.approver_role&&actor.context?.role!=='mcst'&&actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','The displayed decision authority is required');
        if(body.outcome==='rejected') {
          if(!body.reasonCode||!rejectionReasons.includes(body.reasonCode))throw new AppError(422,'REJECTION_REASON_REQUIRED','Choose a rejection reason');
          if(body.reasonCode==='other')requiredText(reason);
          reason=body.reasonCode+(reason?': '+reason:'');
        }
        if(body.outcome==='intervention')requiredText(reason);
      }
      if(actor.context?.role==='admin')requiredText(reason);
      const p=v.proposal;
      if(body.outcome==='approved') {
        if(v.kind==='scope_price') {
          const rfq=await publication(tx,id),e=await variationEvaluation(tx,id,String(rfq.round_id),p,String(w.amount_cents));
          const cardId=await recordCard(tx,actor,id,String(rfq.round_id),'variation.review',v.id,v.current_version,e,now,meta.requestId);
          if(cardId&&needsClearance(e)&&!await cardCleared(tx,cardId)) {
            if(!['mcst','admin'].includes(actor.context?.role??'')) {
              if(v.task_id)await finishResponse(tx,v.task_id);
              const taskId=await nextTask(tx,w,v.kind,v.id,true,'mcst',now,v.current_version);
              await tx.query("UPDATE variations SET approver_role='mcst',task_id=$1 WHERE id=$2",[taskId,v.id]);
              const version=await bumpWork(tx,await readWork(tx,id),now);
              return {jobId:id,variationId:v.id,proposalVersion:v.current_version,version,pendingMcst:true,integrityCardId:cardId,destination:'Unable to continue work'};
            }
            if(body.clearWarning!==true)throw new AppError(422,'WARNING_CLEARANCE_REQUIRED','Explicitly Allow work to proceed with an explanation before approving this flagged variation');
            const [card]=await tx.query('SELECT source_version FROM integrity_cards WHERE id=$1',[cardId]);
            await clearCard(tx,actor,cardId,Number(card!.source_version),body.warningExplanation??'',now,meta.requestId);
          }
        }
        const [settings]=await tx.query('SELECT version,approval_threshold_cents FROM estates WHERE id=$1',[w.estate_id]);
        requireVersion(Number(settings!.version),p.settingsVersion);
        const role=v.kind==='scope_price'?variationApprover(BigInt(p.newTotalCents),BigInt(String(settings!.approval_threshold_cents)),w.mcst_authorised_cents===null?null:BigInt(w.mcst_authorised_cents)):'cm';
        if(role==='mcst'&&actor.context?.role==='cm')throw new AppError(403,'FORBIDDEN','MCST approval is required beyond the authorised limit');
        if(v.kind==='start_schedule'&&w.started_at)throw new AppError(409,'ALREADY_STARTED','A schedule cannot overwrite actual Start');
        if(p.timing==='changed'&&explicitInstant(p.targetAt!)<=now)throw new AppError(422,'TARGET_PASSED','Review a new future proposed target before accepting');
        if(v.kind==='scope_price') {
          const ceiling=actor.context?.role==='mcst'||actor.context?.role==='admin'?p.newTotalCents:w.mcst_authorised_cents;
          await tx.query("INSERT INTO work_terms VALUES($1,$2,$3,$4,$5,'variation',$6,$7,$8)",[id,w.terms_version+1,p.newTotalCents,ceiling,p.scope,v.id,actor.id,now.toISOString()]);
          await tx.query('UPDATE work_state SET terms_version=terms_version+1 WHERE job_id=$1',[id]);
        }
        if(p.timing==='changed') {
          if(v.kind==='start_schedule')await tx.query('UPDATE work_state SET scheduled_start_at=$1,start_schedule_version=start_schedule_version+1 WHERE job_id=$2',[p.targetAt,id]);
          else await tx.query('UPDATE work_state SET completion_target_at=$1,completion_target_version=completion_target_version+1 WHERE job_id=$2',[p.targetAt,id]);
        }
      }
      let supportId:string|null=null;
      if(body.outcome==='intervention') {
        // Reuse a contextual case. Requesting support alone leaves the proposal and accepted target unchanged.
        const [existing]=await tx.query("SELECT support_id FROM tasks WHERE resource_id=$1 AND kind='variation.support' AND status='open'",[v.id]);
        supportId=existing?.support_id?String(existing.support_id):randomUUID();
        if(!existing) {
          await tx.query("INSERT INTO support_requests(id,job_id,reporter_id,description,privacy,created_at) VALUES($1,$2,$3,$4,'ordinary',$5)",[supportId,id,actor.id,reason,now.toISOString()]);
          const tid=await createAttention(tx,now,{kind:'variation.support',resourceId:v.id,estateId:w.estate_id,action:'Review requested support for the pending variation; no change is authorised'});
          await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,tid]);
        }
      } else {
        if(v.task_id)await finishResponse(tx,v.task_id);
        await tx.query('UPDATE variations SET state=$1,task_id=NULL WHERE id=$2',[body.outcome,v.id]);
        const canContinue=body.outcome==='approved'?p.canContinueApproved:p.canContinueOriginal;
        if(!canContinue&&w.status==='active'&&v.contractor_confirmed)supportId=await interruptWork(tx,w,actor,`Variation ${body.outcome}: Contractor confirmed the ${body.outcome==='approved'?'proposed':'original'} work cannot safely/feasibly continue. ${p.reason}`,now,meta.requestId);
      }
      const after=await readWork(tx,id),version=await bumpWork(tx,after,now,body.outcome==='intervention'?w.stage:workDestination(after));
      await tx.query('INSERT INTO variation_decisions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),v.id,v.current_version,body.outcome,reason,{...p.before,proposal:p},{amountCents:String(after.amount_cents),scope:after.scope,completionTargetAt:after.completion_target_at,scheduledStartAt:after.scheduled_start_at,destination:workDestination(after)},actor.id,actor.context!.role,now.toISOString()]);
      await workEvent(tx,w,actor,'variation.outcome',{variationId:v.id,proposalVersion:v.current_version,outcome:body.outcome,reason,before:p.before,after:{amountCents:String(after.amount_cents),scope:after.scope,completionTargetAt:after.completion_target_at,destination:workDestination(after)},supportId},now);
      await audit(tx,actor,'variation.decide',id,p.before,{variationId:v.id,proposalVersion:v.current_version,outcome:body.outcome,reason,version},meta.requestId,now,reason);
      if(body.outcome!=='intervention') {
        for(const role of ['cm','mcst','contractor'])await createAttention(tx,now,{kind:'variation.outcome',resourceId:id,estateId:w.estate_id,organisationId:w.organisation_id,ownerRole:role,action:`Variation ${body.outcome}. Review the dated decision and effective terms in work history.`,informational:true});
        await agreeStartTask(tx,after,now);
      }
      return {jobId:id,variationId:v.id,proposalVersion:v.current_version,version,destination:workDestination(after),...(supportId?{supportId}:{})};
    });
  }
}
