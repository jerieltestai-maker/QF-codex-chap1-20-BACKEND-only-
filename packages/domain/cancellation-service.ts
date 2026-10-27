import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {CommandService,audit,requireVersion,enqueue,type WorkspaceCommand} from './commands.js';
import {authorizedJob} from './workspace-service.js';
import {reviewer} from './completion-core.js';
import {contractorOnly} from './work-core.js';
import {createAttention} from './verification-service.js';
import {finishResponse,stopSelectionClock} from './procurement-clocks.js';
import {businessDayDue,loadCalendar} from './calendar.js';
import {newCase,selectedOrganisation,supportJobAccess} from './support-core.js';

export const cancelWarning='Cancelling stops further ordinary work immediately. You may still need to settle completed work or costs the contractor has already committed. The contractor can ask Admin to review a claim; cancellation does not erase an existing amount owed.';
export const okayDeclaration='I accept the cancellation and do not have any additional claims.';
export async function cancellationEvent(tx:Sql,id:string,kind:string,details:unknown,now:Date,actorId?:string) {
  await tx.query('INSERT INTO cancellation_events VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),id,kind,details,actorId??null,now.toISOString()]);
}
export async function issuedCancellation(tx:Sql,taskId:string,now:Date) {
  const due=new Date(now.getTime()+7*86400000);
  const [c]=await tx.query('UPDATE cancellations SET first_issued_at=$1,claim_due_at=$2 WHERE task_id=$3 AND first_issued_at IS NULL AND restored_at IS NULL RETURNING id',[now.toISOString(),due.toISOString(),taskId]);
  if(c)await cancellationEvent(tx,String(c.id),'notice.issued',{firstIssuedAt:now.toISOString(),claimDueAt:due.toISOString(),rule:'T10-v1'},now);
}
export async function cancellationTimers(tx:Sql,now:Date) {
  for(const c of await tx.query('SELECT * FROM cancellations WHERE restored_at IS NULL AND response IS NULL AND first_issued_at IS NOT NULL ORDER BY id')) {
    const anchor=new Date(c.first_issued_at as string),cutoff=new Date(c.claim_due_at as string),calendar=await loadCalendar(tx);
    if(now>=cutoff) {
      await tx.query("UPDATE cancellations SET response='expired' WHERE id=$1",[c.id]);await finishResponse(tx,String(c.task_id));
      await cancellationEvent(tx,String(c.id),'claim-window.expired',{accepted:false,waiver:false},now);continue;
    }
    const actor=businessDayDue(anchor,2,calendar),five=businessDayDue(anchor,5,calendar),lastDay=new Date(cutoff.getTime()-86400000),admin=five<lastDay?five:lastDay;
    for(const [kind,due] of [['actor',actor],['admin',admin]] as const) {
      if(now<due)continue;
      const added=await tx.query('INSERT INTO cancellation_checkpoints VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING kind',[c.id,kind,due.toISOString()]);if(!added.length)continue;
      if(kind==='actor')await enqueue(tx,'notification.issue',String(c.task_id),{step:'T10.actor',dedupeKey:'cancel:'+c.id+':actor',message:'Respond to the cancellation or submit your claim before the displayed cutoff. Opening a draft is not submission.'},now);
      else await createAttention(tx,now,{kind:'cancellation.follow-up',resourceId:String(c.job_id),organisationId:String(c.organisation_id),action:'The cancellation is unanswered. Follow up before the seven-day claim cutoff; silence is not acceptance.'});
    }
  }
}
export class CancellationService {
  constructor(readonly commands:CommandService){}
  async detail(token:string,id:string) {
    const a=await this.commands.identity.actor(token);await supportJobAccess(this.commands.db,a,id);
    const organisationId=a.context?.role==='contractor'?a.context.organisation_id:null;
    const rows=await this.commands.db.query('SELECT * FROM cancellations WHERE job_id=$1 AND ($2::uuid IS NULL OR organisation_id=$2) ORDER BY recorded_at,id',[id,organisationId]);
    const events=await this.commands.db.query('SELECT e.* FROM cancellation_events e JOIN cancellations c ON c.id=e.cancellation_id WHERE c.job_id=$1 AND ($2::uuid IS NULL OR c.organisation_id=$2) ORDER BY e.recorded_at,e.id',[id,organisationId]);
    const [j]=await this.commands.db.query('SELECT version,stage FROM job_records WHERE id=$1',[id]);
    const {maskedProjection}=await import('./support-service.js');
    return maskedProjection(this.commands.db,a,id,{jobId:id,version:j!.version,stage:j!.stage,cancellations:rows,events,warning:cancelWarning,declaration:okayDeclaration,serverTime:this.commands.now().toISOString()});
  }
  cancel(token:string,meta:WorkspaceCommand,id:string,body:{reason:string;confirmed:boolean}) {
    return this.commands.run(token,meta,'cancellation.cancel',{id,...body},async(tx,a)=>{reviewer(a);await authorizedJob(tx,a,id);},async(tx,a)=>{
      const job=await authorizedJob(tx,a,id);requireVersion(job.version,meta.expectedVersion);const reason=requiredText(body.reason),now=this.commands.now();
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED',cancelWarning);
      if(job.stage==='Closed'||(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id])).length)throw new AppError(409,'CANCELLATION_NOT_ACTIONABLE','Use Admin Support for a closed or already cancelled job');
      const organisationId=await selectedOrganisation(tx,id),cancellationId=randomUUID();
      for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND status='open' AND support_id IS NULL AND kind NOT LIKE 'payment.%'",[id]))await finishResponse(tx,String(t.id));
      for(const v of await tx.query("SELECT id,current_version,task_id FROM variations WHERE job_id=$1 AND state IN ('terms','decision')",[id])) {
        if(v.task_id)await finishResponse(tx,String(v.task_id));
        await tx.query("UPDATE variations SET state='superseded' WHERE id=$1",[v.id]);
        await tx.query("INSERT INTO variation_decisions VALUES($1,$2,$3,'superseded',$4,$5,$6,$7,$8,$9)",[randomUUID(),v.id,v.current_version,reason,{state:'pending'},{state:'superseded',cancellationId},a.id,a.context!.role,now.toISOString()]);
      }
      for(const r of await tx.query('SELECT id FROM quotation_rounds WHERE job_id=$1',[id])){await stopSelectionClock(tx,String(r.id),now);await tx.query("UPDATE quotation_rounds SET status='closed' WHERE id=$1",[r.id]);}
      await tx.query("UPDATE work_state SET status='cancelled' WHERE job_id=$1",[id]);
      // Payment and confirmed-debt tasks survive. Cancellation only stops ordinary commitments.
      const task=organisationId?await createAttention(tx,now,{kind:'cancellation.response',resourceId:id,organisationId,ownerRole:'contractor',action:'Works cancelled. Review the reason and choose Okay or Admin Intervention. Submit claim by seven calendar days from first issued notice.'}):null;
      await tx.query('INSERT INTO cancellations(id,job_id,reason,organisation_id,actor_id,recorded_at,prior_stage,task_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[cancellationId,id,reason,organisationId??null,a.id,now.toISOString(),job.stage,task]);
      await tx.query("UPDATE job_records SET stage='Cancelled',version=version+1,updated_at=$1 WHERE id=$2",[now.toISOString(),id]);
      await cancellationEvent(tx,cancellationId,'cancelled',{reason,priorStage:job.stage,warningConfirmed:true},now,a.id);
      await audit(tx,a,'cancellation.cancel',id,{stage:job.stage},{stage:'Cancelled',cancellationId},meta.requestId,now,reason);
      return {jobId:id,cancellationId,version:job.version+1};
    });
  }
  respond(token:string,meta:WorkspaceCommand,id:string,body:{cancellationId:string;outcome:'okay'|'claim';declaration?:string;description?:string}) {
    return this.commands.run(token,meta,'cancellation.respond',{id,...body},async(tx,a)=>{contractorOnly(a);await supportJobAccess(tx,a,id);},async(tx,a)=>{
      const [job]=await tx.query('SELECT version FROM job_records WHERE id=$1',[id]);requireVersion(Number(job!.version),meta.expectedVersion);
      const [c]=await tx.query('SELECT * FROM cancellations WHERE job_id=$1 AND id=$2 AND restored_at IS NULL',[id,body.cancellationId]),now=this.commands.now();
      if(!c||c.organisation_id!==a.context!.organisation_id)throw new AppError(404,'NOT_FOUND','Cancellation unavailable');
      if(c.response||!c.claim_due_at||now>=new Date(c.claim_due_at as string))throw new AppError(409,'CLAIM_WINDOW_CLOSED','The ordinary claim response is unavailable. Existing debts and exceptional Admin Support remain available.');
      let supportId:string|undefined;
      if(body.outcome==='okay') {if(body.declaration!==okayDeclaration)throw new AppError(422,'DECLARATION_REQUIRED',okayDeclaration);}
      else supportId=await newCase(tx,a,id,{description:requiredText(body.description??''),category:'cancellation_expenses',privacy:'ordinary'},now);
      await tx.query('UPDATE cancellations SET response=$1,support_id=$2 WHERE id=$3',[body.outcome,supportId??null,c.id]);await finishResponse(tx,String(c.task_id));
      for(const t of await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='cancellation.follow-up' AND status='open'",[id]))await finishResponse(tx,String(t.id));
      const stage=supportId?'Admin Intervention':'Cancelled';await tx.query('UPDATE job_records SET stage=$1,version=version+1,updated_at=$2 WHERE id=$3',[stage,now.toISOString(),id]);
      await cancellationEvent(tx,String(c.id),body.outcome,{supportId:supportId??null,declaration:body.declaration??null,existingDebtsRetained:true},now,a.id);
      await audit(tx,a,'cancellation.respond',id,{cancellationId:c.id},{outcome:body.outcome,supportId},meta.requestId,now);
      return {jobId:id,supportId,cancellationId:c.id,version:Number(job!.version)+1};
    });
  }
}
