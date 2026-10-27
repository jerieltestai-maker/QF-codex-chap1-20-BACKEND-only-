import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {requireCapability,type Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand,enqueue} from './commands.js';
import {authorizedJob,type Job} from './workspace-service.js';
import {createAttention,finishAttention,eligibility,validCategories,adminOnly} from './verification-service.js';
import {sourcingDue,explicitInstant} from './calendar.js';
import {authorizedTask} from './task-service.js';
import {bindIntegrityRound} from './integrity-settings.js';

export const priorities=['none','earlier_availability','lower_total_price','workmanship','similar_experience','less_disruption'] as const;
export interface Intake {
  categories:string[];urgency:'ordinary'|'urgent';noPhotoReason:string;grouping:'combined'|'separate';
  primaryPriority:string;secondaryPriority?:string;publicDescription:string;publicLocation:string;evidenceIds:string[];accessEquipmentRequired?:boolean;
}
function validateIntake(body:Intake) {
  validCategories(body.categories);requiredText(body.publicDescription);requiredText(body.publicLocation);
  if(!priorities.includes(body.primaryPriority as typeof priorities[number]) ||
    (body.secondaryPriority&&(!priorities.includes(body.secondaryPriority as typeof priorities[number])||body.secondaryPriority==='none'||body.secondaryPriority===body.primaryPriority||body.primaryPriority==='none')))
    throw new AppError(422,'FIELD_VALIDATION','Choose distinct priorities or No preference without a secondary priority');
}
function fromRow(row:Record<string,unknown>):Intake {
  return {categories:row.categories as string[],urgency:row.urgency as Intake['urgency'],noPhotoReason:String(row.no_photo_reason),
    grouping:row.grouping as Intake['grouping'],primaryPriority:String(row.primary_priority),...(row.secondary_priority?{secondaryPriority:String(row.secondary_priority)}:{}),
    publicDescription:String(row.public_description),publicLocation:String(row.public_location),evidenceIds:row.evidence_ids as string[],accessEquipmentRequired:Boolean(row.access_equipment_required)};
}
async function readyEvidence(sql:Sql,id:string,body:Intake) {
  let photos=0;
  for(const fileId of body.evidenceIds) {
    const [file]=await sql.query(`SELECT f.media_type FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id JOIN job_attachments a ON a.file_id=f.id
      WHERE f.id=$1 AND u.job_id=$2 AND a.job_id=$2 AND u.purpose='evidence' AND u.state='ready' AND f.variant='sanitized' AND f.media_type='image/png'`,[fileId,id]);
    if(!file)throw new AppError(422,'EVIDENCE_NOT_PERMITTED','Choose ready sanitized photos attached to this workspace. Private originals and PDFs cannot be published.');
    photos++;
  }
  if(!photos&&!body.noPhotoReason.trim())throw new AppError(422,'PHOTO_EXPLANATION_REQUIRED','Explain why you cannot provide a photo');
}
async function privacyCheck(sql:Sql,job:Job,body:Intake) {
  const [estate]=await sql.query('SELECT name,private_address FROM estates WHERE id=$1',[job.estate_id]);
  const visible=body.publicDescription+'\n'+body.publicLocation+'\n'+body.noPhotoReason;
  if(estate&&[estate.name,estate.private_address].filter(Boolean).some(value=>visible.toLowerCase().includes(String(value).toLowerCase())))throw new AppError(422,'PRIVACY_REVIEW_REQUIRED','Remove the exact estate name/address from contractor-visible text');
  if(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(visible))throw new AppError(422,'PRIVACY_REVIEW_REQUIRED','Remove private contact addresses before publication');
  // These checks supplement the required human preview, never claim complete redaction.
}
export async function contractorRfq(sql:Sql,actor:Actor,id:string,now:Date) {
  if(actor.context?.role!=='contractor'||!actor.context.organisation_id)throw new AppError(404,'NOT_FOUND','Opportunity unavailable');
  const [row]=await sql.query(`SELECT v.snapshot,p.revision,p.scope_version,p.round_id,r.status FROM rfq_publications p
    JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision JOIN quotation_rounds r ON r.id=p.round_id WHERE p.job_id=$1`,[id]);
  if(!row||row.status!=='open'||!(await eligibility(sql,actor.context.organisation_id,(row.snapshot as Intake).categories,now)).eligible)
    throw new AppError(404,'NOT_FOUND','Opportunity unavailable');
  return row;
}
export class RfqService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  async detail(token:string,id:string) {
    const actor=await this.identity.actor(token);await authorizedJob(this.db,actor,id);
    const [intake]=await this.db.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);
    const [published]=await this.db.query('SELECT * FROM rfq_publications WHERE job_id=$1',[id]);
    const ai=await this.db.query('SELECT id,input_version,output,model,state FROM ai_refinements WHERE job_id=$1 ORDER BY recorded_at DESC LIMIT 10',[id]);
    return {intake:intake?fromRow(intake):null,published:published??null,ai,
      rounds:await this.db.query('SELECT * FROM quotation_rounds WHERE job_id=$1 ORDER BY number',[id]),
      revisions:await this.db.query('SELECT * FROM rfq_versions WHERE job_id=$1 ORDER BY revision',[id]),serverTime:this.now().toISOString()};
  }
  async save(token:string,meta:WorkspaceCommand,id:string,body:Intake) {
    return this.commands.run(token,meta,'rfq.intake',{id,...body},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);validateIntake(body);
      const [phase]=await tx.query('SELECT r.status FROM rfq_publications p JOIN quotation_rounds r ON r.id=p.round_id WHERE p.job_id=$1',[id]);
      if(phase&&phase.status!=='open')throw new AppError(409,'QUOTING_PAUSED','The published scope is held. RFQ edits require an open quotation round.');
      const version=job.version+1,now=this.now();
      await tx.query(`INSERT INTO rfq_intakes(job_id,categories,urgency,no_photo_reason,grouping,primary_priority,secondary_priority,public_description,public_location,evidence_ids,version,updated_at,access_equipment_required) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT(job_id) DO UPDATE SET categories=$2,urgency=$3,no_photo_reason=$4,grouping=$5,primary_priority=$6,secondary_priority=$7,
        public_description=$8,public_location=$9,evidence_ids=$10,version=$11,updated_at=$12,access_equipment_required=$13`,
        [id,body.categories,body.urgency,body.noPhotoReason.trim(),body.grouping,body.primaryPriority,body.secondaryPriority??null,body.publicDescription.trim(),body.publicLocation.trim(),body.evidenceIds,version,now.toISOString(),body.accessEquipmentRequired??false]);
      await tx.query("UPDATE job_records SET version=$1,updated_at=$2,stage=CASE WHEN stage IN ('AI is refining your draft','Approving AI input') THEN 'Report an issue' ELSE stage END WHERE id=$3",[version,now.toISOString(),id]);
      await tx.query("UPDATE ai_refinements SET state='superseded' WHERE job_id=$1 AND state='pending_review'",[id]);
      await audit(tx,actor,'rfq.intake',id,{version:job.version},{...body,version},meta.requestId,now);
      return {jobId:id,version};
    });
  }
  async preview(token:string,id:string) {
    const actor=await this.identity.actor(token),job=await authorizedJob(this.db,actor,id);
    const [row]=await this.db.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);if(!row)throw new AppError(409,'INTAKE_REQUIRED','Save the RFQ fields first');
    const intake=fromRow(row);await readyEvidence(this.db,id,intake);await privacyCheck(this.db,job,intake);
    return {jobId:id,version:job.version,contractorView:intake,reviewNotice:'Review all visible text and photos for estate identifiers. Retain safety, access and pricing facts.'};
  }
  async publish(token:string,meta:WorkspaceCommand,id:string,body:{privacyConfirmed:boolean;factsConfirmed:boolean}) {
    return this.commands.run(token,meta,'rfq.publish',{id,...body},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if((await tx.query('SELECT id FROM cancellations WHERE job_id=$1 AND restored_at IS NULL',[id])).length)throw new AppError(409,'WORK_CANCELLED','Admin must explicitly restore cancelled procurement before publication');
      if(job.is_group_source)throw new AppError(409,'GROUP_SOURCE_ONLY','Publish the linked repair tickets separately; this original report is their preserved source');
      if(!body.privacyConfirmed||!body.factsConfirmed)throw new AppError(422,'REVIEW_REQUIRED','Confirm accuracy and contractor-visible privacy after preview');
      if((await tx.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[id])).length)throw new AppError(409,'ALREADY_PUBLISHED','Use a versioned RFQ revision for an existing publication');
      const [row]=await tx.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);if(!row)throw new AppError(409,'INTAKE_REQUIRED','Save the RFQ fields first');
      const intake=fromRow(row);validateIntake(intake);await readyEvidence(tx,id,intake);await privacyCheck(tx,job,intake);
      if(intake.grouping==='separate'&&!job.group_id)throw new AppError(409,'SEPARATE_REPAIRS_REQUIRED','Create the linked separate repair tickets before publishing');
      for(const category of intake.categories) {
        const [rule]=await tx.query('SELECT configured FROM trade_rules WHERE category=$1',[category]);
        if(!rule?.configured)throw new AppError(409,'TRADE_NOT_CONFIGURED','Admin must configure the relevant trade requirements before publication');
      }
      const now=this.now(),roundId=randomUUID(),version=job.version+1,due=sourcingDue(now);
      await tx.query("INSERT INTO rfq_versions VALUES($1,1,1,$2,'initial','Initial publication',$3,$4)",[id,intake,actor.id,now.toISOString()]);
      const rules=await tx.query('SELECT r.category,r.version,ARRAY(SELECT type_id FROM trade_requirements q WHERE q.category=r.category ORDER BY type_id) AS required_type_ids FROM trade_rules r WHERE category=ANY($1) ORDER BY category',[intake.categories]);
      await tx.query("INSERT INTO quotation_rounds(id,job_id,number,status,published_at,sourcing_due_at,rule_snapshot) VALUES($1,$2,1,'open',$3,$4,$5)",[roundId,id,now.toISOString(),due.toISOString(),JSON.stringify(rules)]);
      await bindIntegrityRound(tx,job.estate_id,roundId,now);
      await tx.query('INSERT INTO rfq_publications VALUES($1,1,1,$2)',[id,roundId]);
      await tx.query("UPDATE job_records SET stage='Requesting for quotes',version=$1,updated_at=$2 WHERE id=$3",[version,now.toISOString(),id]);
      await tx.query("UPDATE ai_refinements SET state='superseded' WHERE job_id=$1 AND state='pending_review'",[id]);
      if(intake.urgency==='urgent')await createAttention(tx,now,{kind:'rfq.urgent',resourceId:id,estateId:job.estate_id,action:'Take coordination for an urgent RFQ',urgent:true,requiredVersion:1});
      await audit(tx,actor,'rfq.publish',id,{version:job.version},{version,revision:1,scopeVersion:1,roundId,privacyConfirmed:true,factsConfirmed:true,snapshot:intake},meta.requestId,now);
      await enqueue(tx,'rfq.changed',id,{revision:1,scopeVersion:1,roundId},now);
      return {jobId:id,version,revision:1,scopeVersion:1,roundId,sourcingDueAt:due.toISOString()};
    });
  }
  async revise(token:string,meta:WorkspaceCommand,id:string,body:{classification:'minor'|'material';changeKinds:string[];reason:string;privacyConfirmed:boolean;factsConfirmed:boolean}) {
    return this.commands.run(token,meta,'rfq.revise',{id,...body},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      const [publication]=await tx.query(`SELECT p.*,v.snapshot,r.status FROM rfq_publications p JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision JOIN quotation_rounds r ON r.id=p.round_id WHERE p.job_id=$1`,[id]);
      if(!publication||publication.status!=='open')throw new AppError(409,'RFQ_NOT_OPEN','Revise only an open quotation phase');
      if(!body.privacyConfirmed||!body.factsConfirmed)throw new AppError(422,'REVIEW_REQUIRED','Review and confirm the exact revised privacy preview');
      const reason=requiredText(body.reason),[row]=await tx.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);
      if(!row)throw new AppError(409,'INTAKE_REQUIRED','Save the revised draft first');
      const intake=fromRow(row),previous=publication.snapshot as Intake;validateIntake(intake);await readyEvidence(tx,id,intake);await privacyCheck(tx,job,intake);
      if(intake.grouping==='separate'&&!job.group_id)throw new AppError(409,'SEPARATE_REPAIRS_REQUIRED','Separate repairs require independently linked tickets; changing this label cannot split a published scope');
      const kinds=['spelling','formatting','scope','quantities','price_terms','safety','access','uncertain'];
      if(!body.changeKinds.length||body.changeKinds.some(k=>!kinds.includes(k)))throw new AppError(422,'FIELD_VALIDATION','Identify the kind of RFQ change');
      const minorFields=['categories','urgency','grouping','publicLocation','evidenceIds','accessEquipmentRequired'] as const;
      const changedStructured=minorFields.some(k=>JSON.stringify(intake[k])!==JSON.stringify(previous[k]));
      const quantities=(text:string)=>text.match(/\d+(?:[.,]\d+)*/g)??[];
      const numbersChanged=JSON.stringify(quantities(intake.publicDescription))!==JSON.stringify(quantities(previous.publicDescription));
      if(body.classification==='minor'&&(body.changeKinds.some(k=>!['spelling','formatting'].includes(k))||changedStructured||numbersChanged))
        throw new AppError(422,'MATERIAL_CLASSIFICATION_REQUIRED','Scope, quantities, terms, safety, access or uncertain changes must be material');
      for(const category of intake.categories) {
        const [rule]=await tx.query('SELECT configured FROM trade_rules WHERE category=$1',[category]);if(!rule?.configured)throw new AppError(409,'TRADE_NOT_CONFIGURED','Configure the revised trade requirements before publication');
      }
      const now=this.now(),revision=Number(publication.revision)+1,scopeVersion=Number(publication.scope_version)+(body.classification==='material'?1:0),version=job.version+1;
      await tx.query('INSERT INTO rfq_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,revision,scopeVersion,intake,body.classification,reason,actor.id,now.toISOString()]);
      await tx.query('UPDATE rfq_publications SET revision=$1,scope_version=$2 WHERE job_id=$3',[revision,scopeVersion,id]);
      await tx.query('UPDATE job_records SET version=$1,updated_at=$2 WHERE id=$3',[version,now.toISOString(),id]);
      if(previous.urgency!==intake.urgency) {
        await finishAttention(tx,id,'rfq.urgent');
        if(intake.urgency==='urgent')await createAttention(tx,now,{kind:'rfq.urgent',resourceId:id,estateId:job.estate_id,action:'Take coordination for an urgent RFQ',urgent:true,requiredVersion:revision});
      }
      await audit(tx,actor,'rfq.revise',id,{revision:publication.revision,scopeVersion:publication.scope_version,snapshot:previous},{revision,scopeVersion,snapshot:intake,classification:body.classification,changeKinds:body.changeKinds,requiresReconfirmation:body.classification==='material',privacyConfirmed:true,factsConfirmed:true},meta.requestId,now,reason);
      await enqueue(tx,'rfq.changed',id,{revision,scopeVersion,requiresReconfirmation:body.classification==='material',roundId:publication.round_id},now);
      return {jobId:id,version,revision,scopeVersion,requiresReconfirmation:body.classification==='material',roundId:publication.round_id};
    });
  }
  async opportunities(token:string) {
    const actor=await this.identity.actor(token);if(actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','Contractor access is required');
    const rows=await this.db.query('SELECT job_id FROM rfq_publications ORDER BY job_id'),result=[];
    for(const row of rows)try{result.push(await this.opportunity(token,String(row.job_id)));}catch(e){if(!(e instanceof AppError&&e.status===404))throw e;}
    return result;
  }
  async opportunity(token:string,id:string) {
    const actor=await this.identity.actor(token),row=await contractorRfq(this.db,actor,id,this.now()),s=row.snapshot as Intake;
    // Explicit projection: no original observations, estate ID/name, author/contact, group or private file IDs.
    return {jobId:id,revision:row.revision,scopeVersion:row.scope_version,roundId:row.round_id,description:s.publicDescription,location:s.publicLocation,categories:s.categories,
      urgency:s.urgency,primaryPriority:s.primaryPriority,secondaryPriority:s.secondaryPriority??null,evidenceIds:s.evidenceIds,accessEquipmentRequired:s.accessEquipmentRequired??false};
  }
  async refine(token:string,meta:WorkspaceCommand,id:string) {
    return this.commands.run(token,meta,'rfq.refine',{id},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if((await tx.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[id])).length)throw new AppError(409,'ALREADY_PUBLISHED','Refinement is for unpublished issue drafts');
      const now=this.now(),refinementId=randomUUID();
      await tx.query("UPDATE ai_refinements SET state='superseded' WHERE job_id=$1 AND state='pending_review'",[id]);
      await tx.query("INSERT INTO ai_refinements VALUES($1,$2,$3,$4,$5,'local-extractive-v1','pending_review',$6,$7)",[refinementId,id,job.version,{observations:job.observations,affectedLocation:job.affected_location},{pending:true},actor.id,now.toISOString()]);
      await tx.query("UPDATE job_records SET stage='AI is refining your draft' WHERE id=$1",[id]);
      await enqueue(tx,'rfq.refine',refinementId,{jobId:id,inputVersion:job.version},now);
      await audit(tx,actor,'rfq.refine',id,null,{refinementId,inputVersion:job.version,adapter:'local-extractive-v1'},meta.requestId,now);
      return {refinementId,jobId:id,version:job.version,message:'Local extractive draft assistance queued. Review facts and privacy before publication.'};
    });
  }
  async acceptRefinement(token:string,meta:WorkspaceCommand,id:string,refinementId:string) {
    return this.commands.run(token,meta,'rfq.accept-refinement',{id,refinementId},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      const [suggestion]=await tx.query('SELECT * FROM ai_refinements WHERE id=$1 AND job_id=$2',[refinementId,id]);
      if(!suggestion||suggestion.state!=='pending_review'||suggestion.input_version!==job.version||(suggestion.output as Record<string,unknown>).pending)throw new AppError(409,'AI_INPUT_CHANGED','This suggestion is stale or unfinished. Keep your latest draft.');
      const [intake]=await tx.query('SELECT * FROM rfq_intakes WHERE job_id=$1',[id]);if(!intake)throw new AppError(409,'INTAKE_REQUIRED','Save routing and privacy fields first');
      const output=suggestion.output as {observations:string};
      // Extractive adapter cannot add facts: future generative adapters must satisfy the same provenance contract.
      if(output.observations!==job.observations)throw new AppError(422,'AI_UNSUPPORTED_FACTS','Suggestion contains unsupported changes; correct it manually');
      const now=this.now(),version=job.version+1;
      await tx.query('UPDATE rfq_intakes SET public_description=$1,version=$2,updated_at=$3 WHERE job_id=$4',[output.observations,version,now.toISOString(),id]);
      await tx.query("UPDATE ai_refinements SET state='accepted' WHERE id=$1",[refinementId]);
      await tx.query("UPDATE job_records SET stage='Report an issue',version=$1,updated_at=$2 WHERE id=$3",[version,now.toISOString(),id]);
      await audit(tx,actor,'rfq.accept-refinement',id,{version:job.version},{refinementId,version},meta.requestId,now);
      return {jobId:id,version,message:'Accepted into your editable draft. Review privacy before publishing.'};
    });
  }
  async split(token:string,meta:WorkspaceCommand,id:string,body:{repairs:{title:string;observations:string;affectedLocation:string}[]}) {
    return this.commands.run(token,meta,'rfq.split',{id,...body},async(tx,actor)=>{requireCapability(actor,'rfq.manage');await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      if((await tx.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[id])).length)throw new AppError(409,'ALREADY_PUBLISHED','Separate repairs before publication');
      if(job.group_id)throw new AppError(409,'ALREADY_GROUPED','This report already belongs to a repair group');
      const groupId=randomUUID(),now=this.now(),children=[];
      await tx.query('UPDATE job_records SET group_id=$1,is_group_source=true,version=version+1,updated_at=$2 WHERE id=$3',[groupId,now.toISOString(),id]);
      for(const repair of body.repairs) {
        const child=randomUUID(),fields={title:requiredText(repair.title),observations:requiredText(repair.observations),affectedLocation:requiredText(repair.affectedLocation)};
        await tx.query('INSERT INTO job_records(id,estate_id,created_by,title,observations,affected_location,group_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)',[child,job.estate_id,actor.id,fields.title,fields.observations,fields.affectedLocation,groupId,now.toISOString()]);
        await tx.query('INSERT INTO job_versions VALUES($1,1,$2,$3,$4)',[child,fields,actor.id,now.toISOString()]);
        await audit(tx,actor,'workspace.create',child,null,{...fields,version:1,groupId,sourceJobId:id},meta.requestId,now);children.push({jobId:child,version:1});
      }
      await audit(tx,actor,'rfq.split',id,{version:job.version},{version:job.version+1,groupId,children},meta.requestId,now);
      return {jobId:id,version:job.version+1,groupId,children,message:'Linked private repair tickets created. Review and publish each independently.'};
    });
  }
  async coordinate(token:string,meta:WorkspaceCommand,id:string,body:{outcome:'attempted'|'attendance_arranged'|'unresolved';summary:string;eta?:string;nextAction:string;followUpAt:string}) {
    return this.commands.run(token,meta,'rfq.coordinate',{id,...body},async(tx,actor)=>{adminOnly(actor);await authorizedTask(tx,actor,id);},async(tx,actor)=>{
      const task=await authorizedTask(tx,actor,id);requireVersion(task.version,meta.expectedVersion);
      if(task.kind!=='rfq.urgent'||task.status!=='open')throw new AppError(409,'NOT_ACTIONABLE','Urgent coordination is no longer outstanding');
      const now=this.now(),followUp=explicitInstant(body.followUpAt),eta=body.eta?explicitInstant(body.eta):null;
      if(followUp<=now)throw new AppError(422,'FIELD_VALIDATION','Save a future next follow-up');
      const updateId=randomUUID(),summary=requiredText(body.summary),nextAction=requiredText(body.nextAction);
      await tx.query('INSERT INTO urgency_updates VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[updateId,task.resource_id,id,body.outcome,summary,eta?.toISOString()??null,nextAction,followUp.toISOString(),actor.id,now.toISOString()]);
      const version=task.version+1;
      await tx.query('UPDATE tasks SET acknowledged_at=COALESCE(acknowledged_at,$1),acknowledged_by=$2,next_action=$3,follow_up_at=$4,version=$5 WHERE id=$6',[now.toISOString(),actor.id,nextAction,followUp.toISOString(),version,id]);
      await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND status='pending'",[id]);
      await tx.query("INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key) VALUES($1,$2,$3,'T11','T11-v1',$4,$5,$6)",[randomUUID(),id,version,now.toISOString(),followUp.toISOString(),`T11:${id}:${version}`]);
      await audit(tx,actor,'rfq.coordinate',String(task.resource_id),{taskVersion:task.version},{updateId,outcome:body.outcome,summary,eta:body.eta??null,nextAction,followUpAt:followUp.toISOString(),taskVersion:version},meta.requestId,now);
      return {taskId:id,version,updateId};
    });
  }
}
