import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {oversightAuthority,eventPolicy} from './integrity-settings.js';
import {clearCard,workHeld} from './integrity-core.js';
import {authorizedJob} from './workspace-service.js';
import {workAccess,readWork,workDestination,workEvent} from './work-core.js';
import {readyFile} from './completion-core.js';
import {adminOnly,createAttention} from './verification-service.js';

export class IntegrityService {
  constructor(readonly commands:CommandService){}
  async detail(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);await oversightAuthority(tx,a,id,true);
      const job=await authorizedJob(tx,a,id),cards=await tx.query(`SELECT c.*,u.name AS actor_name,x.explanation AS clearance_explanation,x.recorded_at AS cleared_at,x.source_version AS cleared_source_version,cu.name AS cleared_by
        FROM integrity_cards c JOIN users u ON u.id=c.actor_id LEFT JOIN integrity_clearances x ON x.card_id=c.id LEFT JOIN users cu ON cu.id=x.actor_id WHERE c.job_id=$1 ORDER BY c.recorded_at,c.id`,[id]);
      const reviews=await tx.query('SELECT r.*,u.name AS actor_name FROM integrity_reviews r JOIN integrity_cards c ON c.id=r.card_id JOIN users u ON u.id=r.actor_id WHERE c.job_id=$1 ORDER BY r.recorded_at,r.version',[id]);
      const timeline=await tx.query(`SELECT 'rfq' AS kind,revision AS version,scope_version,classification,reason,recorded_at FROM rfq_versions WHERE job_id=$1 ORDER BY revision`,[id]);
      const sharedAnswers=await tx.query(`SELECT r.public_question,r.public_answer,r.classification,r.rfq_revision,r.recorded_at FROM question_responses r JOIN job_questions q ON q.id=r.question_id WHERE q.job_id=$1 AND r.outcome='answered' ORDER BY r.recorded_at,r.id`,[id]);
      const notifications=await tx.query(`SELECT t.organisation_id,t.kind,t.created_at,t.first_issued_at,t.status FROM tasks t WHERE t.resource_id=$1 AND t.kind LIKE 'rfq.%' AND t.owner_role='contractor' ORDER BY t.created_at,t.id`,[id]);
      const quoteScopes=await tx.query(`SELECT q.id AS quote_id,v.version,v.scope_version,v.rfq_revision,v.revision_reason,v.recorded_at FROM quotes q JOIN quote_versions v ON v.quote_id=q.id WHERE q.job_id=$1 ORDER BY v.recorded_at,q.id,v.version`,[id]);
      const priceBridge={quotes:await tx.query(`SELECT q.id,q.organisation_id,v.version,v.scope_version,v.amount_cents,v.revision_reason,v.recorded_at FROM quotes q JOIN quote_versions v ON v.quote_id=q.id WHERE q.job_id=$1 ORDER BY q.id,v.version`,[id]),
        selections:await tx.query('SELECT id,quote_id,quote_version,amount_cents,actor_id,recorded_at FROM contractor_selections WHERE job_id=$1 ORDER BY recorded_at,id',[id]),
        authorisedTerms:await tx.query('SELECT version,amount_cents,source_type,source_id,actor_id,recorded_at FROM work_terms WHERE job_id=$1 ORDER BY version',[id]),
        invoices:await tx.query('SELECT version,amount_cents,explanation,actor_id,recorded_at FROM invoice_versions WHERE job_id=$1 ORDER BY version',[id]),
        confirmed:await tx.query('SELECT version,amount_cents,source,reason,actor_id,recorded_at FROM financial_confirmations WHERE job_id=$1 ORDER BY version',[id])};
      const [p]=await tx.query('SELECT round_id FROM rfq_publications WHERE job_id=$1',[id]);
      return {jobId:id,version:job.version,cards,reviews,workPaused:await workHeld(tx,id),policy:p?await eventPolicy(tx,id,String(p.round_id)):null,
        fairInformation:{timeline,sharedAnswers,notifications,quoteScopes,note:'Issued means the in-app notice exists; it does not prove the recipient read it. Questioner identity and proprietary source questions are withheld.'},priceBridge,
        accessSummaries:await tx.query('SELECT s.id,s.summary,s.recorded_at,u.name AS approved_by FROM protected_access_summaries s JOIN users u ON u.id=s.actor_id WHERE s.job_id=$1 ORDER BY s.recorded_at,s.id',[id]),
        interpretation:'Warnings require review and the approved work clearances. They are not misconduct findings or reputation penalties.',serverTime:this.commands.now().toISOString()};
    });
  }
  review(token:string,meta:WorkspaceCommand,id:string,body:{cardId:string;sourceVersion:number;disposition:'explained'|'needs_clarification'|'escalated'|'unresolved';note:string}) {
    return this.commands.run(token,meta,'integrity.review',{id,...body},async(tx,a)=>{await oversightAuthority(tx,a,id,true);},async(tx,a)=>{
      const j=await authorizedJob(tx,a,id);requireVersion(j.version,meta.expectedVersion);
      const [c]=await tx.query('SELECT source_version FROM integrity_cards WHERE id=$1 AND job_id=$2',[body.cardId,id]);if(!c)throw new AppError(404,'NOT_FOUND','Warning unavailable');requireVersion(Number(c.source_version),body.sourceVersion);
      if(!['explained','needs_clarification','escalated','unresolved'].includes(body.disposition))throw new AppError(422,'FIELD_VALIDATION','Choose a review disposition');
      const [r]=await tx.query('SELECT COALESCE(max(version),0) AS version FROM integrity_reviews WHERE card_id=$1',[body.cardId]);const now=this.commands.now(),version=Number(r!.version)+1;
      await tx.query('INSERT INTO integrity_reviews VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),body.cardId,version,body.disposition,body.note.trim(),a.id,a.context!.role,now.toISOString()]);
      if(body.disposition==='escalated'&&!(await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='integrity.escalated' AND status='open'",[body.cardId])).length)await createAttention(tx,now,{kind:'integrity.escalated',resourceId:body.cardId,estateId:j.estate_id,action:'MCST escalated this procurement warning. Record a reasoned review and dated next follow-up.'});
      await audit(tx,a,'integrity.review',id,null,{cardId:body.cardId,sourceVersion:body.sourceVersion,disposition:body.disposition,note:body.note.trim()},meta.requestId,now);
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);return {jobId:id,version:j.version+1,reviewVersion:version,cleared:false};
    });
  }
  clear(token:string,meta:WorkspaceCommand,id:string,body:{cardId:string;sourceVersion:number;explanation:string;confirmed:boolean}) {
    return this.commands.run(token,meta,'integrity.clear',{id,...body},async(tx,a)=>{await oversightAuthority(tx,a,id,true);},async(tx,a)=>{
      const j=await authorizedJob(tx,a,id);requireVersion(j.version,meta.expectedVersion);
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Explicitly confirm Allow work to proceed');
      if(!(await tx.query('SELECT id FROM integrity_cards WHERE id=$1 AND job_id=$2',[body.cardId,id])).length)throw new AppError(404,'NOT_FOUND','Warning unavailable');
      const now=this.commands.now();await clearCard(tx,a,body.cardId,body.sourceVersion,body.explanation,now,meta.requestId);
      const [hasWork]=await tx.query('SELECT job_id FROM work_state WHERE job_id=$1',[id]);
      const state=hasWork?await readWork(tx,id):null;
      const [pending]=state?await tx.query("SELECT id FROM variations WHERE job_id=$1 AND kind='scope_price' AND state IN ('terms','decision')",[id]):[];
      const stage=state?state.status==='active'&&!state.integrity_paused&&pending?'Modifying job scope':workDestination(state):j.stage;
      await tx.query('UPDATE job_records SET version=version+1,stage=$1,updated_at=$2 WHERE id=$3',[stage,now.toISOString(),id]);
      return {jobId:id,version:j.version+1,workPaused:await workHeld(tx,id),message:'Clearance recorded. Existing work authority, pending approvals and other warning holds still apply.'};
    });
  }
  makeSafe(token:string,meta:WorkspaceCommand,id:string,body:{description:string;evidenceIds:string[]}) {
    return this.commands.run(token,meta,'integrity.make-safe',{id,...body},async(tx,a)=>{await workAccess(tx,a,id);},async(tx,a)=>{
      const w=await workAccess(tx,a,id);requireVersion(w.version,meta.expectedVersion);if(!await workHeld(tx,id))throw new AppError(409,'NO_WARNING_PAUSE','Use ordinary progress for unpaused work');
      for(const file of body.evidenceIds)await readyFile(tx,a,id,file,'evidence');const description=requiredText(body.description),now=this.commands.now();
      const eventId=await workEvent(tx,w,a,'integrity.make-safe',{description,evidenceIds:body.evidenceIds,ordinaryWorkAuthorised:false,costEntitlementEstablished:false},now);
      await audit(tx,a,'integrity.make-safe',id,null,{eventId,description},meta.requestId,now);return {jobId:id,version:w.version,eventId};
    });
  }
  summary(token:string,meta:WorkspaceCommand,id:string,body:{summary:string;confirmed:boolean}) {
    return this.commands.run(token,meta,'integrity.access-summary',{id,...body},async(tx,a)=>{adminOnly(a);await authorizedJob(tx,a,id);},async(tx,a)=>{
      const j=await authorizedJob(tx,a,id);requireVersion(j.version,meta.expectedVersion);if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm that the summary is permitted for MCST and contains no protected allegation or subject information');
      const summary=requiredText(body.summary),now=this.commands.now(),summaryId=randomUUID();await tx.query('INSERT INTO protected_access_summaries VALUES($1,$2,$3,$4,$5)',[summaryId,id,summary,a.id,now.toISOString()]);
      await audit(tx,a,'integrity.access-summary',id,null,{summaryId,summary},meta.requestId,now);
      await createAttention(tx,now,{kind:'integrity.access-summary',resourceId:id,estateId:j.estate_id,ownerRole:'mcst',action:'Admin approved a permitted procurement access summary. Review it in MCST oversight.',informational:true});
      return {jobId:id,version:j.version,summaryId};
    });
  }
}
