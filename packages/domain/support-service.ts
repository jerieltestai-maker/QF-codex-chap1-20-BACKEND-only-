import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {canRead} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedSupport} from './workspace-service.js';
import {adminOnly,createAttention,authorizedOrganisation} from './verification-service.js';
import {supportJobAccess,selectedOrganisation,newCase,caseAttention,closeCaseTasks,caseEvent,datedTask,confidentialNotice} from './support-core.js';
import {completion,balance,money,observedDate,readyFile,completionTask} from './completion-core.js';
import {readWork,contractorOnly} from './work-core.js';
import {assessFinancial,syncBillingSources} from './billing-service.js';
import {explicitInstant} from './calendar.js';
import {reconcileSettlement,paymentTimers} from './payment-clocks.js';
import {finishResponse} from './procurement-clocks.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';


export async function maskedProjection(tx:Sql,a:Actor,id:string,value:unknown):Promise<Record<string,unknown>> {
  const [estate]=await tx.query('SELECT e.name,e.private_address,e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[id]);
  const org=await selectedOrganisation(tx,id),masked=a.context?.role==='cm'&&!estate?.contractor_identities_visible;
  const identifiers=masked&&org?await contractorIdentifiers(tx,org):[];
  const contractor=a.context?.role==='contractor',revealed=!contractor||(await tx.query('SELECT id FROM location_reveals WHERE job_id=$1 AND organisation_id=$2',[id,a.context?.organisation_id??null])).length>0;
  const estateIdentifiers=contractor&&!revealed?[estate?.name,estate?.private_address].filter(Boolean).map(String):[];
  const humanText=new Set(['description','reason','findings','explanation','action','next_action','evidence','reference','scope','outcome','name','request','permittedSummary','externalReference']);
  const visit=(v:unknown,key=''):unknown=>{
    if(v instanceof Date)return v.toISOString();if(typeof v==='string'){if(!humanText.has(key))return v;const text=masked?concealedText(v,identifiers):v;return estateIdentifiers.length?concealedText(text,estateIdentifiers):text;}
    if(Array.isArray(v))return v.map(item=>visit(item,key));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([key])=>(!contractor||key!=='estate_id')&&(!masked||!['organisation_id','actor_id','proof_id','file_id','fileIds','evidence_ids'].includes(key))).map(([key,val])=>[key,visit(val,key)]));return v;
  };return visit(value) as Record<string,unknown>;
}
interface Obligation {kind:'repair'|'payment'|'refund'|'action';ownerRole:'cm'|'mcst'|'contractor'|'admin';description:string;reuseObligationId?:string;followUpAt?:string}
export class SupportService {
  constructor(readonly commands:CommandService){}
  private async accountContext(tx:Sql,a:Actor,id:string,estate:boolean) {
    if(estate){if(!canRead(a,{estateId:id})||a.context?.role==='contractor'||!(await tx.query('SELECT id FROM estates WHERE id=$1',[id])).length)throw new AppError(404,'NOT_FOUND','Account context unavailable');}
    else await authorizedOrganisation(tx,a,id);
  }
  async accountList(token:string,id:string,estate=false) {
    const a=await this.commands.identity.actor(token),tx=this.commands.db;
    await this.accountContext(tx,a,id,estate);
    const rows=await tx.query('SELECT id FROM support_requests WHERE job_id IS NULL AND '+(estate?'estate_id':'organisation_id')+'=$1 ORDER BY created_at,id',[id]),cases=[];
    for(const row of rows){const s=await authorizedSupport(tx,a,String(row.id));const [c]=await tx.query('SELECT * FROM support_cases WHERE support_id=$1',[row.id]);cases.push({...s,case:c});}return {cases};
  }
  openAccount(token:string,meta:WorkspaceCommand,id:string,body:{description:string},estate=false) {
    return this.commands.run(token,meta,'support.open-account',{contextId:id,estate,...body},async(tx,a)=>{
      await this.accountContext(tx,a,id,estate);
    },async(tx,a)=>{
      requireVersion(0,meta.expectedVersion);const now=this.commands.now(),supportId=randomUUID();
      await tx.query("INSERT INTO support_requests(id,reporter_id,description,privacy,created_at,estate_id,organisation_id) VALUES($1,$2,$3,'ordinary',$4,$5,$6)",[supportId,a.id,requiredText(body.description),now.toISOString(),estate?id:null,estate?null:id]);
      await tx.query("INSERT INTO support_cases(support_id,category,state,blocking,organisation_id) VALUES($1,'verification_account','review',false,$2)",[supportId,estate?null:id]);
      await caseAttention(tx,supportId,'support.review','Review the account/access concern and record actual required action or evidence.',now);
      await audit(tx,a,'support.open-account',supportId,null,{contextId:id,estate},meta.requestId,now);return {supportId,version:1};
    });
  }
  async subjects(token:string,id:string) {
    const a=await this.commands.identity.actor(token),tx=this.commands.db,j=await supportJobAccess(tx,a,id),subjects=[];
    if(a.context?.role!=='contractor'||(await tx.query('SELECT id FROM work_authorisations WHERE job_id=$1 AND organisation_id=$2',[id,a.context.organisation_id])).length)
      for(const u of await tx.query("SELECT u.id,u.name,m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.estate_id=$1 AND m.active=true ORDER BY u.name,u.id",[j.estate_id]))if(u.id!==a.id)subjects.push({kind:'user',id:u.id,name:u.name,role:u.role});
    const organisations=a.context?.role==='contractor'?[{id:a.context.organisation_id}]:await tx.query('SELECT DISTINCT organisation_id AS id FROM quotes WHERE job_id=$1 ORDER BY organisation_id',[id]);
    for(const orgRow of organisations) {const org=String(orgRow.id),{maskedName}=await import('./quote-service.js');const name=await maskedName(tx,a,id,org);subjects.push({kind:'organisation',id:org,name:name.name,role:'contractor'});
      const users=await tx.query("SELECT u.id,u.name FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.organisation_id=$1 AND m.active=true ORDER BY u.id",[org]);
      for(const [index,u] of users.entries())if(u.id!==a.id)subjects.push({kind:'user',id:u.id,name:name.masked?'Contractor account '+(index+1):u.name,role:'contractor'});
    }
    return subjects;
  }
  async list(token:string,id:string) {
    const a=await this.commands.identity.actor(token);await supportJobAccess(this.commands.db,a,id);const visible=[];
    for(const row of await this.commands.db.query('SELECT id FROM support_requests WHERE job_id=$1 ORDER BY created_at,id',[id])) {
      try {const s=await authorizedSupport(this.commands.db,a,String(row.id));const [c]=await this.commands.db.query('SELECT * FROM support_cases WHERE support_id=$1',[row.id]);visible.push({...s,case:c??null});}
      catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
    }
    return maskedProjection(this.commands.db,a,id,{cases:visible});
  }
  async detail(token:string,id:string) {
    const a=await this.commands.identity.actor(token),tx=this.commands.db,s=await authorizedSupport(tx,a,id),[c]=await tx.query('SELECT * FROM support_cases WHERE support_id=$1',[id]);
    const events=await tx.query('SELECT * FROM support_events WHERE support_id=$1 ORDER BY recorded_at,id',[id]);
    const result={support:s,case:c??null,events:a.context?.role==='admin'?events:events.filter(e=>e.kind!=='offline.coordination'),
      resolutions:await tx.query('SELECT * FROM support_resolutions WHERE support_id=$1 ORDER BY version',[id]),
      obligations:await tx.query('SELECT * FROM support_obligations WHERE support_id=$1 ORDER BY resolution_version,id',[id]),
      acknowledgments:await tx.query('SELECT * FROM support_acknowledgments WHERE support_id=$1',[id]),
      settlementProposals:await tx.query('SELECT * FROM settlement_proposals WHERE support_id=$1 ORDER BY version',[id]),
      attachments:await tx.query("SELECT f.id,u.owner_id FROM support_evidence_links l JOIN file_objects f ON f.id=l.file_id JOIN upload_intents u ON u.id=f.upload_id WHERE l.support_id=$1 AND u.state='ready' AND f.variant='original'",[id]),
      responders:s.job_id?(await this.subjects(token,String(s.job_id))).filter(p=>p.kind==='user'&&!(s.subject_user_ids as string[]).includes(String(p.id))):await tx.query("SELECT u.id,u.name,m.role,'user' AS kind FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.active=true AND (m.estate_id=$1 OR m.organisation_id=$2) ORDER BY u.name,u.id",[s.estate_id,s.organisation_id]),
      workCancelled:s.job_id?(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[s.job_id])).length>0:false,
      aftercareCase:(await tx.query('SELECT id FROM aftercare_cases WHERE id=$1',[id])).length>0,
      serverTime:this.commands.now().toISOString()};return s.job_id?maskedProjection(tx,a,String(s.job_id),result):result;
  }
  open(token:string,meta:WorkspaceCommand,id:string,body:{description:string;category:string;privacy:'ordinary'|'confidential';subjectUserIds:string[];subjectOrganisationIds:string[]}) {
    return this.commands.run(token,meta,'support.open',{id,...body},async(tx,a)=>{await supportJobAccess(tx,a,id);},async(tx,a)=>{
      const j=await supportJobAccess(tx,a,id);requireVersion(Number(j.version),meta.expectedVersion);
      const now=this.commands.now(),supportId=await newCase(tx,a,id,body,now);
      await audit(tx,a,'support.open',supportId,null,{jobId:id,category:body.category},meta.requestId,now);
      return {jobId:id,supportId,version:1,message:body.privacy==='confidential'?confidentialNotice:'Sent to Admin for review.'};
    });
  }
  private run(token:string,meta:WorkspaceCommand,id:string,intent:string,body:object,admin:boolean,work:(tx:Sql,a:Actor,s:Record<string,unknown>,c:Record<string,unknown>,now:Date)=>Promise<object>) {
    return this.commands.run(token,meta,intent,{supportId:id,...body},async(tx,a)=>{await authorizedSupport(tx,a,id);if(admin)adminOnly(a);},async(tx,a)=>{
      const s=await authorizedSupport(tx,a,id);let [c]=await tx.query('SELECT * FROM support_cases WHERE support_id=$1',[id]);
      if(!s.job_id&&['support.propose-settlement','support.confirm-settlement','support.estate-refund','support.submit-repair','support.inspect-repair','support.make-safe','support.grant'].includes(intent))throw new AppError(409,'JOB_CONTEXT_REQUIRED','Use a specific job for financial, physical-work or conduct decisions');
      if((await tx.query('SELECT id FROM aftercare_cases WHERE id=$1',[id])).length&&!['support.request-evidence','support.evidence','support.follow-up','support.grant'].includes(intent))throw new AppError(409,'AFTERCARE_WORKFLOW_REQUIRED','Use the linked aftercare inspection/execution workflow. A financial correction needs a separate Admin Support case.');
      // Existing domain-specific support joins the same pipeline without replacing its evidence/tasks.
      if(!c){const [payment]=await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND kind LIKE 'payment.%' LIMIT 1",[id]);await tx.query("INSERT INTO support_cases(support_id,category,state,organisation_id) VALUES($1,$2,'review',$3)",[id,payment?'invoice_payment':'general',(await selectedOrganisation(tx,String(s.job_id)))??null]);[c]=await tx.query('SELECT * FROM support_cases WHERE support_id=$1',[id]);}
      requireVersion(Number(c!.version),meta.expectedVersion);const now=this.commands.now(),result=await work(tx,a,s,c!,now);
      await tx.query('UPDATE support_cases SET version=version+1 WHERE support_id=$1',[id]);
      await audit(tx,a,intent,id,{version:c!.version},result,meta.requestId,now);return {supportId:id,jobId:s.job_id,...result,version:Number(c!.version)+1};
    });
  }
  requestEvidence(token:string,meta:WorkspaceCommand,id:string,body:{request:string;respondingRole:'cm'|'mcst'|'contractor';respondingUserId:string;followUpAt?:string}) {
    return this.run(token,meta,id,'support.request-evidence',body,true,async(tx,a,s,c,now)=>{
      if(!['review','evidence'].includes(String(c.state)))throw new AppError(409,'CASE_NOT_REVIEWABLE','Execution disputes must return to review first');
      const request=requiredText(body.request),[m]=await tx.query('SELECT role,estate_id,organisation_id FROM memberships WHERE user_id=$1 AND role=$2 AND active=true AND (estate_id=$3 OR organisation_id=$4)',[body.respondingUserId,body.respondingRole,s.estate_id,c.organisation_id??null]);
      if(!m||!canRead({...a,id:body.respondingUserId,memberships:[m] as Actor['memberships'],context:m as Actor['context']},{estateId:String(s.estate_id),...(m.organisation_id?{organisationId:String(m.organisation_id)}:{}),subjectUserIds:s.subject_user_ids as string[],subjectOrganisationIds:s.subject_organisation_ids as string[]}))throw new AppError(422,'RESPONDER_UNAVAILABLE','Choose an authorised, uninvolved responding party');
      if(s.privacy==='confidential'&&body.respondingUserId!==s.reporter_id&&!(await tx.query('SELECT user_id FROM support_access WHERE support_id=$1 AND user_id=$2',[id,body.respondingUserId])).length)throw new AppError(422,'RESPONDER_UNAVAILABLE','Explicitly authorise this uninvolved person before requesting confidential evidence');
      await closeCaseTasks(tx,id,'support.evidence');await closeCaseTasks(tx,id,'support.review');
      const task=await caseAttention(tx,id,'support.evidence',request,now,body.respondingRole,body.respondingUserId,body.followUpAt);
      await tx.query("UPDATE support_cases SET state='evidence',responding_role=$1,responding_user_id=$2,evidence_task_id=$3 WHERE support_id=$4",[body.respondingRole,body.respondingUserId,task,id]);
      await caseEvent(tx,a,id,'evidence.requested',{request,respondingRole:body.respondingRole,respondingUserId:body.respondingUserId,followUpAt:body.followUpAt??null},now);return {state:'evidence',taskId:task};
    });
  }
  evidence(token:string,meta:WorkspaceCommand,id:string,body:{explanation:string;fileIds:string[]}) {
    return this.run(token,meta,id,'support.evidence',body,false,async(tx,a,s,c,now)=>{
      if(c.state==='resolved')throw new AppError(409,'CASE_RESOLVED','Open a new support request for a later concern');
      if(a.context?.role!=='admin'&&a.id!==s.reporter_id&&a.id!==c.responding_user_id)throw new AppError(403,'FORBIDDEN','The reporter or named responding party submits evidence');
      const explanation=requiredText(body.explanation);
      for(const file of body.fileIds){const [f]=await tx.query("SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND u.support_id=$2 AND u.owner_id=$3 AND u.state='ready' AND f.variant='original'",[file,id,a.id]);if(!f)throw new AppError(422,'FILE_NOT_READY','Use your ready evidence for this case');}
      for(const file of body.fileIds)await tx.query('INSERT INTO support_evidence_links VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,file,a.id,now.toISOString()]);
      if(c.evidence_task_id)await finishResponse(tx,String(c.evidence_task_id));
      // A party submission always returns to Admin review; it never issues a verdict.
      await tx.query("UPDATE support_cases SET state='review',responding_role=NULL,responding_user_id=NULL,evidence_task_id=NULL WHERE support_id=$1",[id]);
      await closeCaseTasks(tx,id,'support.review');await caseAttention(tx,id,'support.review','Review newly submitted evidence; judge sufficiency and remaining obligations.',now);
      await caseEvent(tx,a,id,'evidence.submitted',{explanation,fileIds:body.fileIds},now);return {state:'review'};
    });
  }
  followUp(token:string,meta:WorkspaceCommand,id:string,body:{nextAction:string;followUpAt:string;externalReference?:string;permittedSummary?:string}) {
    return this.run(token,meta,id,'support.follow-up',body,true,async(tx,a,_s,c,now)=>{
      if(c.state==='resolved')throw new AppError(409,'CASE_RESOLVED','Resolved cases do not acquire follow-up tasks');
      await closeCaseTasks(tx,id,'support.review');const task=await caseAttention(tx,id,'support.review',requiredText(body.nextAction),now);
      await datedTask(tx,task,body.nextAction,body.followUpAt,now,a.id);
      if(body.externalReference)await caseEvent(tx,a,id,'offline.coordination',{externalReference:requiredText(body.externalReference),permittedSummary:body.permittedSummary?.trim()??''},now);
      await caseEvent(tx,a,id,'follow-up.saved',{nextAction:body.nextAction,followUpAt:body.followUpAt},now);return {taskId:task,state:c.state};
    });
  }
  grant(token:string,meta:WorkspaceCommand,id:string,body:{userId:string;reason:string}) {
    return this.run(token,meta,id,'support.grant',body,true,async(tx,a,s,_c,now)=>{
      if(s.privacy!=='confidential')throw new AppError(422,'FIELD_VALIDATION','Explicit confidential access applies only to a confidential case');
      const [m]=await tx.query("SELECT m.*,u.access_version FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.estate_id=$2 AND m.role='mcst' AND m.active=true",[body.userId,s.estate_id]);
      if(!m||(s.subject_user_ids as string[]).includes(body.userId)||(s.subject_organisation_ids as string[]).length&&(await tx.query('SELECT id FROM memberships WHERE user_id=$1 AND organisation_id=ANY($2::uuid[])',[body.userId,s.subject_organisation_ids])).length)throw new AppError(422,'SUBJECT_EXCLUDED','Only an uninvolved estate MCST user can be authorised');
      await tx.query('INSERT INTO support_access VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,body.userId,a.id,now.toISOString()]);
      await caseEvent(tx,a,id,'access.granted',{userId:body.userId,reason:requiredText(body.reason)},now);return {grantedUserId:body.userId};
    });
  }
  resolve(token:string,meta:WorkspaceCommand,id:string,body:{outcome:string;reason:string;obligations:Obligation[];supersedeOutstanding?:boolean}) {
    return this.run(token,meta,id,'support.resolve',body,true,async(tx,a,s,c,now)=>{
      if(c.state==='resolved'||c.state==='execution')throw new AppError(409,'CASE_NOT_REVIEWABLE','Return a disputed execution to review before issuing a new resolution');
      const pending=await tx.query('SELECT id FROM support_obligations WHERE support_id=$1 AND verified_at IS NULL AND superseded_at IS NULL',[id]);if(pending.length&&!body.supersedeOutstanding)throw new AppError(409,'OBLIGATIONS_OUTSTANDING','Explicitly confirm a superseding resolution to replace outstanding execution; original obligations remain in history');
      const version=Number(c.resolution_version)+1,outcome=requiredText(body.outcome),reason=requiredText(body.reason),j=String(s.job_id),cpl=s.job_id?await completion(tx,j):undefined;
      const [financial]=s.job_id?await tx.query('SELECT * FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[j]):[],b=s.job_id?await balance(tx,j):undefined;
      for(const ob of body.obligations) {
        requiredText(ob.description);
        const [owner]=await tx.query(`SELECT m.id FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.active=true AND u.active=true AND u.email_verified=true AND m.role=$1
          AND (m.role='admin' OR m.estate_id=$2 OR m.organisation_id=$3) AND NOT(m.user_id=ANY($4::uuid[]))
          AND NOT EXISTS(SELECT 1 FROM memberships x WHERE x.user_id=m.user_id AND x.organisation_id=ANY($5::uuid[]))
          AND ($6='ordinary' OR m.role='admin' OR m.user_id=$7 OR EXISTS(SELECT 1 FROM support_access g WHERE g.support_id=$8 AND g.user_id=m.user_id)) LIMIT 1`,[ob.ownerRole,s.estate_id,c.organisation_id??null,s.subject_user_ids,s.subject_organisation_ids,s.privacy,s.reporter_id,id]);
        if(!owner)throw new AppError(422,'RESPONDER_UNAVAILABLE','The execution owner must be an actual authorised party in this case');
        if(ob.kind==='repair') {
          if(ob.ownerRole!=='contractor'||!cpl)throw new AppError(422,'REPAIR_CONTEXT_REQUIRED','A repair must link existing physical work and its Contractor');
          if((await tx.query("SELECT id FROM aftercare_cases WHERE job_id=$1 AND status<>'resolved'",[j])).length)throw new AppError(409,'AFTERCARE_WORKFLOW_REQUIRED','Use the existing unresolved aftercare remedy and its current inspection');
          if((await tx.query("SELECT o.id FROM support_obligations o JOIN support_requests s ON s.id=o.support_id WHERE s.job_id=$1 AND o.support_id<>$2 AND o.kind='repair' AND o.verified_at IS NULL AND o.superseded_at IS NULL",[j,id])).length)throw new AppError(409,'REPAIR_ALREADY_ACTIVE','Use the existing current repair obligation before authorising another');
          if(ob.reuseObligationId){const [prior]=await tx.query('SELECT * FROM support_obligations WHERE id=$1 AND support_id=$2',[ob.reuseObligationId,id]);if(!prior||prior.kind!=='repair'||prior.description!==ob.description||prior.required_round!==cpl.round||cpl.accepted_round!==cpl.round)throw new AppError(409,'REPAIR_EVIDENCE_MISMATCH','Only the same accepted corrected repair round can be reused');}
        } else if(ob.reuseObligationId)throw new AppError(422,'FIELD_VALIDATION','Only a matching repaired round can be reused');
        if(['action','repair'].includes(ob.kind)&&!ob.reuseObligationId&&!ob.followUpAt)throw new AppError(422,'FOLLOW_UP_REQUIRED','Name a dated action for unresolved execution');
        if(['payment','refund'].includes(ob.kind)&&!financial)throw new AppError(409,'FINANCIAL_CONFIRMATION_REQUIRED','Confirm the exact payable settlement/invoice before issuing financial execution obligations');
      }
      await tx.query('INSERT INTO support_resolutions VALUES($1,$2,$3,$4,$5,$6,$7)',[id,version,outcome,reason,body.obligations,a.id,now.toISOString()]);
      if(pending.length){await tx.query('UPDATE support_obligations SET superseded_at=$1 WHERE support_id=$2 AND verified_at IS NULL AND superseded_at IS NULL',[now.toISOString(),id]);await caseEvent(tx,a,id,'resolution.superseded',{priorResolutionVersion:c.resolution_version,obligationIds:pending.map(o=>o.id),reason},now);}
      await closeCaseTasks(tx,id);
      const [lastRound]=s.job_id?await tx.query('SELECT max(round) AS round FROM completion_rounds WHERE job_id=$1',[j]):[];
      for(const ob of body.obligations) {
        const oid=randomUUID(),reuse=!!ob.reuseObligationId;
        const task=reuse?null:await caseAttention(tx,id,'support.execution',ob.description,now,ob.ownerRole,undefined,ob.followUpAt);
        // Physical review gets the established inspection timer when submitted, never a competing support response timer.
        if(task&&ob.kind!=='action')await tx.query('UPDATE tasks SET response_rule=NULL WHERE id=$1',[task]);
        await tx.query('INSERT INTO support_obligations(id,support_id,resolution_version,kind,owner_role,description,required_round,verified_at,task_id,financial_confirmation_id,required_refund_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[oid,id,version,ob.kind,ob.ownerRole,ob.description,ob.kind==='repair'?(reuse?cpl!.round:Number(lastRound!.round)+1):null,reuse?now.toISOString():null,task,['payment','refund'].includes(ob.kind)?financial!.id:null,ob.kind==='refund'?(b!.refunded+(b!.received>b!.payable?b!.received-b!.payable:0n)).toString():'0']);
      }
      await tx.query("UPDATE support_cases SET state='execution',resolution_version=$1 WHERE support_id=$2",[version,id]);
      await caseEvent(tx,a,id,'resolution.issued',{resolutionVersion:version,outcome,reason,acknowledgmentNonblocking:true},now);
      const audience=await tx.query(`SELECT DISTINCT m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.active=true AND u.active=true AND u.email_verified=true AND m.role<>'admin'
        AND (m.estate_id=$1 OR m.organisation_id=$2) AND NOT(m.user_id=ANY($3::uuid[]))
        AND NOT EXISTS(SELECT 1 FROM memberships x WHERE x.user_id=m.user_id AND x.organisation_id=ANY($4::uuid[]))
        AND ($5='ordinary' OR m.user_id=$6 OR EXISTS(SELECT 1 FROM support_access g WHERE g.support_id=$7 AND g.user_id=m.user_id))`,[s.estate_id,c.organisation_id??null,s.subject_user_ids,s.subject_organisation_ids,s.privacy,s.reporter_id,id]);
      for(const party of audience)await caseAttention(tx,id,'support.resolution-notice','A final Admin resolution is available. Acknowledge resolution; execution proceeds independently.',now,String(party.role));
      for(const t of await tx.query("SELECT id FROM tasks WHERE support_id=$1 AND kind='support.resolution-notice'",[id]))await tx.query('UPDATE outbox SET payload=payload||\'{"informational":true}\'::jsonb WHERE resource_id=$1 AND processed_at IS NULL',[t.id]);
      return {state:'execution',resolutionVersion:version};
    });
  }
  acknowledge(token:string,meta:WorkspaceCommand,id:string,body:{resolutionVersion:number;confirmed:boolean}) {
    return this.run(token,meta,id,'support.acknowledge',body,false,async(tx,a,_s,c,now)=>{
      requireVersion(Number(c.resolution_version),body.resolutionVersion);if(!body.resolutionVersion||!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Acknowledge the exact final resolution');
      await tx.query('INSERT INTO support_acknowledgments VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id,body.resolutionVersion,a.id,now.toISOString()]);return {acknowledged:true};
    });
  }
  proposeSettlement(token:string,meta:WorkspaceCommand,id:string,body:{amountSgd:string;reason:string}) {
    return this.run(token,meta,id,'support.propose-settlement',body,true,async(tx,a,_s,c,now)=>{
      if(c.state==='resolved')throw new AppError(409,'CASE_RESOLVED','Use a new case for a later correction');
      const [last]=await tx.query('SELECT version FROM settlement_proposals WHERE support_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      const proposalId=randomUUID(),version=Number(last?.version??0)+1;await tx.query('INSERT INTO settlement_proposals VALUES($1,$2,$3,$4,$5,$6,$7)',[proposalId,id,version,money(body.amountSgd),requiredText(body.reason),a.id,now.toISOString()]);
      await closeCaseTasks(tx,id,'support.settlement');await caseAttention(tx,id,'support.settlement','Confirm the exact proposed payable settlement total. It includes existing confirmed debts; it is not an additional invoice.',now,'mcst');return {proposalId,proposalVersion:version};
    });
  }
  confirmSettlement(token:string,meta:WorkspaceCommand,id:string,body:{proposalId:string;proposalVersion:number;amountSgd:string;confirmed:boolean;financialOverride:boolean;reason:string}) {
    return this.run(token,meta,id,'support.confirm-settlement',body,false,async(tx,a,s,c,now)=>{
      if(c.state==='resolved')throw new AppError(409,'CASE_RESOLVED','A resolved case cannot change money');
      if(body.financialOverride)adminOnly(a);else if(a.context?.role!=='mcst')throw new AppError(403,'FORBIDDEN','Named MCST confirmation or explicit Admin financial override required');
      const [p]=await tx.query('SELECT * FROM settlement_proposals WHERE support_id=$1 ORDER BY version DESC LIMIT 1',[id]);
      if(!p||p.id!==body.proposalId)throw new AppError(412,'SETTLEMENT_CHANGED','Review the exact latest settlement');requireVersion(Number(p.version),body.proposalVersion);
      const amount=money(body.amountSgd),reason=requiredText(body.reason);if(!body.confirmed||amount!==String(p.amount_cents))throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the exact total and version');
      const j=String(s.job_id),organisationId=await selectedOrganisation(tx,j);if(!organisationId)throw new AppError(409,'NO_SELECTED_CONTRACTOR','A settlement requires the accountable selected Contractor');
      await syncBillingSources(tx,now);const [existing]=await tx.query('SELECT id FROM financial_confirmations WHERE source_id=$1',[p.id]);if(existing)throw new AppError(409,'ALREADY_CONFIRMED','This exact settlement is already confirmed');
      const [old]=await tx.query('SELECT id FROM financial_confirmations WHERE job_id=$1 LIMIT 1',[j]);
      const confirmationId=await assessFinancial(tx,{jobId:j,organisationId,amount:BigInt(amount),source:old?'adjustment':'settlement',sourceId:String(p.id),actorId:a.id,reason},now);
      await closeCaseTasks(tx,id,'support.settlement');
      await caseEvent(tx,a,id,'settlement.confirmed',{confirmationId,proposalId:p.id,amountCents:amount,financialOverride:body.financialOverride,reason},now);
      const b=await balance(tx,j);
      if(b.unsent>0n){const [task]=await tx.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.send' AND status='open'",[j]);if(!task)await createAttention(tx,now,{kind:'payment.send',resourceId:j,estateId:String(s.estate_id),ownerRole:'mcst',action:'Record the outstanding settlement transfer with completed bank proof.'});}
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),j]);await paymentTimers(tx,now,j);return {confirmationId,amountCents:amount};
    });
  }
  verify(token:string,meta:WorkspaceCommand,id:string,body:{obligationId:string;evidence:string}) {
    return this.run(token,meta,id,'support.verify',body,true,async(tx,a,s,c,now)=>{
      const [ob]=await tx.query('SELECT * FROM support_obligations WHERE id=$1 AND support_id=$2 AND resolution_version=$3',[body.obligationId,id,c.resolution_version]);
      if(!ob||ob.verified_at||c.state!=='execution')throw new AppError(409,'OBLIGATION_NOT_ACTIONABLE','Verify a current outstanding execution obligation');
      const j=String(s.job_id),evidence=requiredText(body.evidence);
      if(ob.kind==='repair') {const cp=await completion(tx,j),w=await readWork(tx,j);if(!cp||cp.round!==ob.required_round||cp.accepted_round!==cp.round||cp.scope!==w.scope)throw new AppError(409,'REPAIR_NOT_ACCEPTED','The same current corrected physical round must pass inspection');}
      if(ob.kind==='payment'||ob.kind==='refund') {
        const b=await balance(tx,j),[financial]=await tx.query('SELECT id FROM financial_confirmations WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[j]);
        if(financial?.id!==ob.financial_confirmation_id)throw new AppError(409,'FINANCIAL_OBLIGATION_CHANGED','Review a superseding resolution against the corrected financial confirmation');
        if(b.outstanding!==0n||b.disputed!==0n)throw new AppError(409,'PAYMENT_OUTSTANDING','Actual/assumed full settlement and applicable refunds must be recorded');
        if(ob.kind==='refund'&&(BigInt(String(ob.required_refund_cents))<=0n||b.refunded<BigInt(String(ob.required_refund_cents))))throw new AppError(409,'REFUND_NOT_EXECUTED','Record the actual refund for this exact overpayment obligation');
      }
      await tx.query('UPDATE support_obligations SET verified_at=$1 WHERE id=$2',[now.toISOString(),ob.id]);if(ob.task_id)await finishResponse(tx,String(ob.task_id));
      await caseEvent(tx,a,id,'execution.verified',{obligationId:ob.id,kind:ob.kind,evidence,requiredRound:ob.required_round},now);return {verifiedObligationId:ob.id};
    });
  }
  finish(token:string,meta:WorkspaceCommand,id:string,body:{reason:string}) {
    return this.run(token,meta,id,'support.finish',body,true,async(tx,a,s,c,now)=>{
      if(c.state!=='execution')throw new AppError(409,'CASE_NOT_EXECUTED','Issue a resolution and verify actual execution first');
      if((await tx.query('SELECT id FROM support_obligations WHERE support_id=$1 AND verified_at IS NULL AND superseded_at IS NULL',[id])).length)throw new AppError(409,'OBLIGATIONS_OUTSTANDING','Execution remains outstanding');
      if(!s.job_id){await closeCaseTasks(tx,id);await tx.query("UPDATE support_cases SET state='resolved' WHERE support_id=$1",[id]);await caseEvent(tx,a,id,'case.resolved',{reason:requiredText(body.reason)},now);return {state:'resolved'};}
      const j=String(s.job_id),[cancel]=await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[j]);
      const [interrupted]=await tx.query("SELECT job_id FROM work_state WHERE interruption_id=$1 AND status='interrupted'",[id]);if(interrupted)throw new AppError(409,'WORK_VERDICT_REQUIRED','Record a safe/feasible interruption outcome through the work verdict workflow');
      if(['invoice_payment','cancellation_expenses'].includes(String(c.category))) {
        if(cancel&&!(await tx.query('SELECT id FROM financial_confirmations WHERE job_id=$1',[j])).length)throw new AppError(409,'SETTLEMENT_UNCONFIRMED','Confirm the exact payable settlement, including an explicit zero if nothing is due');
        const b=await balance(tx,j);if(b.outstanding!==0n||b.disputed!==0n)throw new AppError(409,'PAYMENT_OUTSTANDING','Cancellation settlement remains outstanding');
      }
      await closeCaseTasks(tx,id);await tx.query("UPDATE support_cases SET state='resolved' WHERE support_id=$1",[id]);
      await caseEvent(tx,a,id,'case.resolved',{reason:requiredText(body.reason),acknowledgmentsRequired:false},now);
      if(cancel) {
        const [other]=await tx.query("SELECT c.support_id FROM support_cases c JOIN support_requests s ON s.id=c.support_id WHERE s.job_id=$1 AND c.state<>'resolved' AND c.blocking=true AND c.support_id<>$2",[j,id]);
        if(!other)await tx.query("UPDATE job_records SET stage='Cancelled',version=version+1,updated_at=$1 WHERE id=$2",[now.toISOString(),j]);
      }
      await reconcileSettlement(tx,j,now);
      return {state:'resolved'};
    });
  }
  dispute(token:string,meta:WorkspaceCommand,id:string,body:{description:string}) {
    return this.run(token,meta,id,'support.dispute-execution',body,false,async(tx,a,_s,c,now)=>{
      if(c.state!=='execution')throw new AppError(409,'NO_EXECUTION','No current execution is available for review');
      await tx.query("UPDATE support_cases SET state='review' WHERE support_id=$1",[id]);
      await caseAttention(tx,id,'support.review','Review disputed execution. Retain the actual repair/payment obligations and a dated next action.',now);
      await caseEvent(tx,a,id,'execution.disputed',{description:requiredText(body.description)},now);return {state:'review'};
    });
  }
  resumeExecution(token:string,meta:WorkspaceCommand,id:string,body:{reason:string;nextAction:string;followUpAt:string}) {
    return this.run(token,meta,id,'support.resume-execution',body,true,async(tx,a,_s,c,now)=>{
      if(c.state!=='review'||!c.resolution_version)throw new AppError(409,'NO_RESOLUTION','A previously issued resolution is required');
      await closeCaseTasks(tx,id,'support.review');const t=await caseAttention(tx,id,'support.follow-up',requiredText(body.nextAction),now);await datedTask(tx,t,body.nextAction,body.followUpAt,now,a.id);
      await tx.query("UPDATE support_cases SET state='execution' WHERE support_id=$1",[id]);await caseEvent(tx,a,id,'execution.resumed',{reason:requiredText(body.reason)},now);return {state:'execution'};
    });
  }
  refundEstate(token:string,meta:WorkspaceCommand,id:string,body:{amountSgd:string;refundedDate:string;reference:string;evidence:string}) {
    return this.run(token,meta,id,'support.estate-refund',body,true,async(tx,a,s,_c,now)=>{
      const j=String(s.job_id),b=await balance(tx,j),amount=BigInt(money(body.amountSgd)),date=observedDate(body.refundedDate,now);
      if(amount<=0n||amount>b.received-b.payable)throw new AppError(422,'REFUND_INVALID','Record only the actual outstanding estate overpayment refund');
      const reference=requiredText(body.reference);if((await tx.query('SELECT id FROM estate_refunds WHERE reference=$1',[reference])).length)throw new AppError(409,'DUPLICATE_REFUND','This refund is already recorded');
      const refundId=randomUUID();await tx.query('INSERT INTO estate_refunds VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[refundId,j,amount.toString(),date.value,reference,requiredText(body.evidence),a.id,now.toISOString()]);
      await caseEvent(tx,a,id,'estate.refunded',{refundId,amountCents:amount.toString(),refundedDate:date.value},now);await paymentTimers(tx,now,j);return {refundId};
    });
  }
  submitRepair(token:string,meta:WorkspaceCommand,id:string,body:{obligationId:string;completedAt:string;explanation:string;evidenceIds:string[];confirmed:boolean}) {
    return this.run(token,meta,id,'support.submit-repair',body,false,async(tx,a,s,c,now)=>{
      contractorOnly(a);const j=String(s.job_id),w=await readWork(tx,j),cp=await completion(tx,j);
      const [ob]=await tx.query("SELECT * FROM support_obligations WHERE id=$1 AND support_id=$2 AND resolution_version=$3 AND kind='repair' AND verified_at IS NULL",[body.obligationId,id,c.resolution_version]);
      if(!ob||c.state!=='execution'||!cp||a.context!.organisation_id!==w.organisation_id)throw new AppError(409,'REPAIR_NOT_ACTIONABLE','A current authorised repair obligation is required');
      if((await tx.query("SELECT id FROM aftercare_cases WHERE job_id=$1 AND status<>'resolved'",[j])).length)throw new AppError(409,'AFTERCARE_WORKFLOW_REQUIRED','Complete the existing aftercare inspection before a separate repair');
      const [last]=await tx.query('SELECT round,completed_at FROM completion_rounds WHERE job_id=$1 ORDER BY round DESC LIMIT 1',[j]);
      const [inspection]=await tx.query('SELECT outcome FROM inspections WHERE job_id=$1 AND round=$2',[j,last!.round]);
      if(!inspection)throw new AppError(409,'INSPECTION_PENDING','Inspect the current submitted round before another repair submission');
      if(!body.confirmed)throw new AppError(422,'CONFIRMATION_REQUIRED','Confirm the authorised physical repair is complete');
      const at=explicitInstant(body.completedAt),explanation=requiredText(body.explanation);
      if(at>now||at<new Date(last!.completed_at as string))throw new AppError(422,'FIELD_VALIDATION','Repair completion must follow the latest physical round and not be in the future');
      for(const file of body.evidenceIds)await readyFile(tx,a,j,file,'evidence');
      const round=Number(last!.round)+1;await tx.query('INSERT INTO completion_rounds VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[j,round,w.terms_version,w.scope,at.toISOString(),a.id,now.toISOString(),body.evidenceIds,last!.round]);
      await tx.query('UPDATE completion_state SET round=$1,accepted_round=NULL WHERE job_id=$2',[round,j]);
      await tx.query('UPDATE support_obligations SET required_round=$1 WHERE id=$2',[round,ob.id]);
      await closeCaseTasks(tx,id,'completion.response');await closeCaseTasks(tx,id,'completion.inspect');
      const task=await completionTask(tx,w,'completion.inspect','cm','Inspect the newly completed authorised repair round; prior acceptance cannot establish its outcome.',now,round);
      await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[id,task]);
      if(ob.task_id)await finishResponse(tx,String(ob.task_id));
      await tx.query('UPDATE work_state SET completed_at=$1 WHERE job_id=$2',[at.toISOString(),j]);
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),j]);
      await caseEvent(tx,a,id,'repair.submitted',{obligationId:ob.id,round,originatingRound:last!.round,explanation,evidenceIds:body.evidenceIds,completedAt:at.toISOString(),invoiceRetained:true},now);return {round};
    });
  }
  inspectRepair(token:string,meta:WorkspaceCommand,id:string,body:{obligationId:string;round:number;outcome:'accepted'|'unsatisfactory';findings:string;checklist:{scopeReviewed:boolean;issuesReviewed:boolean;evidenceReviewed:boolean;invoiceReviewed:boolean};satisfactory:boolean;confirmed:boolean}) {
    return this.run(token,meta,id,'support.inspect-repair',body,false,async(tx,a,s,c,now)=>{
      if(!['cm','mcst'].includes(a.context?.role??''))throw new AppError(403,'FORBIDDEN','CM/MCST inspection authority required');
      const j=String(s.job_id),cp=await completion(tx,j),w=await readWork(tx,j),[ob]=await tx.query("SELECT * FROM support_obligations WHERE id=$1 AND support_id=$2 AND resolution_version=$3 AND kind='repair' AND verified_at IS NULL",[body.obligationId,id,c.resolution_version]);
      if(!cp||!ob||c.state!=='execution'||cp.round!==ob.required_round||cp.round!==body.round||cp.scope!==w.scope)throw new AppError(409,'REPAIR_NOT_ACTIONABLE','Inspect the exact current submitted repair round');
      if((await tx.query('SELECT round FROM inspections WHERE job_id=$1 AND round=$2',[j,cp.round])).length)throw new AppError(409,'ALREADY_INSPECTED','This inspection outcome is immutable');
      if(!body.confirmed||!Object.values(body.checklist).every(v=>v===true)||body.outcome==='accepted'&&!body.satisfactory)throw new AppError(422,'REVIEW_REQUIRED','Review all inspection facts and explicitly confirm satisfactory work for acceptance');
      const findings=body.outcome==='unsatisfactory'?requiredText(body.findings):body.findings.trim();
      await tx.query('INSERT INTO inspections VALUES($1,$2,$3,$4,$5,$6,$7)',[j,cp.round,body.outcome,body.checklist,findings,a.id,now.toISOString()]);
      await tx.query('UPDATE completion_state SET accepted_round=$1 WHERE job_id=$2',[body.outcome==='accepted'?cp.round:null,j]);
      await closeCaseTasks(tx,id,'completion.inspect');
      if(body.outcome==='unsatisfactory') {
        const task=await completionTask(tx,w,'completion.response','contractor','Address the failed repair and submit a fresh physical round. Earlier acceptance cannot be reused.',now,cp.round);await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[id,task]);
      }
      await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),j]);
      await caseEvent(tx,a,id,'repair.inspected',{obligationId:ob.id,round:cp.round,outcome:body.outcome,findings},now);return {round:cp.round,outcome:body.outcome};
    });
  }
  makeSafe(token:string,meta:WorkspaceCommand,id:string,body:{description:string;evidenceIds:string[]}) {
    return this.run(token,meta,id,'support.make-safe',body,false,async(tx,a,s,_c,now)=>{
      const j=String(s.job_id);if(!(await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[j])).length)throw new AppError(409,'NOT_CANCELLED','Use ordinary progress for active works');
      for(const file of body.evidenceIds)await readyFile(tx,a,j,file,'evidence');
      await caseEvent(tx,a,id,'cancelled.make-safe',{description:requiredText(body.description),evidenceIds:body.evidenceIds,ordinaryWorkAuthorised:false,costEntitlementEstablished:false},now);return {recorded:true};
    });
  }
}
