import {randomUUID,createHash} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {canRead,type Actor} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {dateExpiry,explicitInstant,singaporeDate,singaporeInstant} from './calendar.js';

export const categories=['handyman','plumbing','electrical'] as const;
export function validCategories(input:string[]) {
  if(!input.length||new Set(input).size!==input.length||input.some(c=>!categories.includes(c as typeof categories[number])))
    throw new AppError(422,'FIELD_VALIDATION','Choose supported distinct trade categories');
  return input;
}
export function adminOnly(actor:Actor) {
  if(actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
}
export async function authorizedOrganisation(sql:Sql,actor:Actor,id:string) {
  if(!canRead(actor,{organisationId:id}))throw new AppError(404,'NOT_FOUND','Organisation unavailable');
  const [org]=await sql.query('SELECT id,name,version,verified FROM organisations WHERE id=$1',[id]);
  if(!org)throw new AppError(404,'NOT_FOUND','Organisation unavailable');
  return org;
}
export function credentialExpiry(value?:string) {
  if(!value)return {expiresAt:null,remindAt:null};
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(value);
  let expires:Date;
  try {expires=dateOnly?dateExpiry(value):explicitInstant(value);} catch {throw new AppError(422,'FIELD_VALIDATION','Supply a real expiry date or a date and time with timezone');}
  // Date-only reminders use midnight on the same numbered date in the prior month;
  // the effective expiry remains the following midnight, preserving full-day validity.
  const day=dateOnly?value:singaporeDate(expires),year=Number(day.slice(0,4)),month=Number(day.slice(5,7));
  const previous=new Date(Date.UTC(year,month-2,1));
  const last=new Date(Date.UTC(previous.getUTCFullYear(),previous.getUTCMonth()+1,0)).getUTCDate();
  const target=previous.toISOString().slice(0,7)+'-'+String(Math.min(Number(day.slice(8,10)),last)).padStart(2,'0');
  const time=dateOnly?'00:00:00':new Date(expires.getTime()+8*3600000).toISOString().slice(11,23);
  return {expiresAt:expires.toISOString(),remindAt:singaporeInstant(target,time).toISOString()};
}
export async function createAttention(tx:Sql,now:Date,body:{kind:string;resourceId:string;action:string;organisationId?:string;estateId?:string;ownerRole?:string;urgent?:boolean;requiredVersion?:number;informational?:boolean}) {
  const id=randomUUID(),role=body.ownerRole??'admin';
  await tx.query(`INSERT INTO tasks(id,kind,resource_id,owner_role,status,rule_version,organisation_id,estate_id,action,actionable_at,created_at,required_version,informational)
    VALUES($1,$2,$3,$4,'open',$5,$6,$7,$8,$9,$9,$10,$11)`,[id,body.kind,body.resourceId,role,body.urgent?'T19-v1':'T18-v1',body.organisationId??null,body.estateId??null,body.action,now.toISOString(),body.requiredVersion??1,body.informational??false]);
  await enqueue(tx,'notification.issue',id,{step:'initial',dedupeKey:`${id}:initial`,message:body.action,informational:body.informational??false},now);
  return id;
}
export async function finishAttention(tx:Sql,resourceId:string,kind:string) {
  await tx.query(`UPDATE timer_jobs SET status='superseded' WHERE status='pending' AND task_id IN
    (SELECT id FROM tasks WHERE resource_id=$1 AND kind=$2 AND status='open')`,[resourceId,kind]);
  await tx.query("UPDATE tasks SET status='resolved',version=version+1 WHERE resource_id=$1 AND kind=$2 AND status='open'",[resourceId,kind]);
}
export async function eligibility(sql:Sql,organisationId:string,requested:string[],now:Date,options:{selected?:boolean}={}) {
  validCategories(requested);
  const [profile]=await sql.query('SELECT * FROM contractor_profiles WHERE organisation_id=$1',[organisationId]);
  const [organisation]=await sql.query('SELECT verified FROM organisations WHERE id=$1',[organisationId]);
  const reasons:string[]=[];
  if(!organisation?.verified||profile?.state!=='approved')reasons.push('Admin verification is required');
  const approved=(profile?.approved_categories??[]) as string[];
  const restrictions=await sql.query('SELECT source,categories FROM contractor_restrictions WHERE organisation_id=$1 AND active=true',[organisationId]);
  for(const category of requested) {
    if(!approved.includes(category))reasons.push(`${category}: category is not approved`);
    const [rule]=await sql.query('SELECT configured FROM trade_rules WHERE category=$1',[category]);
    if(!rule?.configured)reasons.push(`${category}: Admin trade setup is required`);
    if(restrictions.some(r=>(!options.selected||r.source!=='fee')&&(!(r.categories as string[]).length||(r.categories as string[]).includes(category))))reasons.push(`${category}: an active restriction applies`);
    const missing=await sql.query(`SELECT t.name FROM trade_requirements r JOIN credential_types t ON t.id=r.type_id
      WHERE r.category=$1 AND NOT EXISTS (SELECT 1 FROM credentials c JOIN credential_versions v
        ON v.credential_id=c.id AND v.submission=c.approved_submission
        WHERE c.organisation_id=$2 AND c.type_id=r.type_id AND (v.expires_at IS NULL OR v.expires_at>$3))`,[category,organisationId,now.toISOString()]);
    for(const credential of missing)reasons.push(`${category}: required ${credential.name} is missing or invalid`);
  }
  return {eligible:reasons.length===0,categories:requested,reasons};
}
export class VerificationService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  async list(token:string) {
    const actor=await this.identity.actor(token);
    if(actor.context?.role==='admin')return this.db.query(`SELECT o.id,o.name,o.version,p.state,p.categories FROM organisations o LEFT JOIN contractor_profiles p ON p.organisation_id=o.id ORDER BY o.name LIMIT 200`);
    if(actor.context?.role==='contractor')return this.db.query('SELECT o.id,o.name,o.version,p.state,p.categories FROM organisations o LEFT JOIN contractor_profiles p ON p.organisation_id=o.id WHERE o.id=$1',[actor.context.organisation_id]);
    throw new AppError(403,'FORBIDDEN','Private contractor account access is required');
  }
  async detail(token:string,id:string) {
    const actor=await this.identity.actor(token),org=await authorizedOrganisation(this.db,actor,id);
    const [profile]=await this.db.query('SELECT * FROM contractor_profiles WHERE organisation_id=$1',[id]);
    const credentials=await this.db.query(`SELECT c.*,t.name,t.holder_kind,v.*,a.expires_at AS approved_expires_at FROM credentials c JOIN credential_types t ON t.id=c.type_id
      JOIN credential_versions v ON v.credential_id=c.id AND v.submission=c.current_submission
      LEFT JOIN credential_versions a ON a.credential_id=c.id AND a.submission=c.approved_submission WHERE c.organisation_id=$1 ORDER BY c.id`,[id]);
    const badges=credentials.map(c=>({...c,verified:!!c.approved_submission,expired:!!c.approved_expires_at&&new Date(c.approved_expires_at as string)<=this.now()}));
    const decisions=await this.db.query(`SELECT id,credential_id,target_version,outcome,categories,reason,actor_id,recorded_at${actor.context?.role==='admin'?',internal_notes':''} FROM verification_decisions WHERE organisation_id=$1 ORDER BY recorded_at,id`,[id]);
    const application=(await this.db.query('SELECT contact,trades FROM contractor_applications WHERE organisation_id=$1',[id]))[0];
    return {organisation:org,profile:profile??null,application:application??null,credentials:badges,decisions,
      restrictions:await this.db.query('SELECT id,source,categories,reason,active,version FROM contractor_restrictions WHERE organisation_id=$1 ORDER BY created_at,id',[id]),
      eligibility:profile?await eligibility(this.db,id,profile.categories as string[],this.now()):{eligible:false,categories:[],reasons:['Complete a supported trade profile and submit it for Admin verification']},serverTime:this.now().toISOString()};
  }
  async rules(token:string) {
    const actor=await this.identity.actor(token);if(!actor.context)throw new AppError(403,'FORBIDDEN','Active account context required');
    return {types:await this.db.query('SELECT id,name,holder_kind,categories FROM credential_types ORDER BY name'),
      rules:await this.db.query('SELECT r.*,ARRAY(SELECT type_id FROM trade_requirements q WHERE q.category=r.category ORDER BY type_id) AS required_type_ids FROM trade_rules r ORDER BY category')};
  }
  async publicProfile(token:string,jobId:string,id:string) {
    const actor=await this.identity.actor(token);
    if(!['cm','mcst','admin'].includes(actor.context?.role??''))throw new AppError(404,'NOT_FOUND','Profile unavailable');
    const [job]=await this.db.query('SELECT estate_id FROM job_records WHERE id=$1',[jobId]);
    if(!job||!canRead(actor,{estateId:String(job.estate_id)}))throw new AppError(404,'NOT_FOUND','Profile unavailable');
    const [publication]=await this.db.query(`SELECT v.snapshot FROM rfq_publications p JOIN rfq_versions v ON v.job_id=p.job_id AND v.revision=p.revision WHERE p.job_id=$1`,[jobId]);
    if(!publication||!(await eligibility(this.db,id,(publication.snapshot as {categories:string[]}).categories,this.now())).eligible)throw new AppError(404,'NOT_FOUND','Profile unavailable');
    const [estate]=await this.db.query('SELECT contractor_identities_visible FROM estates WHERE id=$1',[job.estate_id]);
    const masked=actor.context?.role==='cm'&&!estate?.contractor_identities_visible;
    const [org]=await this.db.query('SELECT name FROM organisations WHERE id=$1',[id]);
    const badges=await this.db.query(`SELECT t.name,v.expiry_value,v.expires_at FROM credentials c JOIN credential_types t ON t.id=c.type_id
      JOIN credential_versions v ON v.credential_id=c.id AND v.submission=c.approved_submission WHERE c.organisation_id=$1 ORDER BY t.name`,[id]);
    return {name:masked?'Contractor '+createHash('sha256').update(jobId+':'+id).digest('hex').slice(0,8):String(org!.name),masked,
      badges:badges.map(b=>({name:String(b.name),expiry:b.expiry_value,expired:!!b.expires_at&&new Date(b.expires_at as string)<=this.now()}))};
  }
  async saveProfile(token:string,meta:WorkspaceCommand,id:string,body:{name:string;contact:string;categories:string[];description:string}) {
    return this.commands.run(token,meta,'verification.profile',{id,...body},async(tx,actor)=>{await authorizedOrganisation(tx,actor,id);},async(tx,actor)=>{
      const org=await authorizedOrganisation(tx,actor,id);requireVersion(Number(org.version),meta.expectedVersion);
      const fields={name:requiredText(body.name),contact:requiredText(body.contact),categories:validCategories(body.categories),description:body.description.trim()};
      const version=Number(org.version)+1,now=this.now();
      await tx.query('UPDATE organisations SET name=$1,version=$2,verified=false WHERE id=$3',[fields.name,version,id]);
      await tx.query(`INSERT INTO contractor_profiles(organisation_id,contact,categories,description,version,state,updated_at)
        VALUES($1,$2,$3,$4,$5,'draft',$6) ON CONFLICT(organisation_id) DO UPDATE SET contact=$2,categories=$3,description=$4,version=$5,state='draft',approved_categories='{}',updated_at=$6`,[id,fields.contact,fields.categories,fields.description,version,now.toISOString()]);
      await tx.query('INSERT INTO contractor_profile_versions VALUES($1,$2,$3,$4,$5)',[id,version,fields,actor.id,now.toISOString()]);
      await finishAttention(tx,id,'verification.review');
      await audit(tx,actor,'verification.profile',id,org,{...fields,version},meta.requestId,now);
      return {organisationId:id,version};
    });
  }
  async submit(token:string,meta:WorkspaceCommand,id:string) {
    return this.commands.run(token,meta,'verification.submit',{id},async(tx,actor)=>{await authorizedOrganisation(tx,actor,id);},async(tx,actor)=>{
      const org=await authorizedOrganisation(tx,actor,id);requireVersion(Number(org.version),meta.expectedVersion);
      const [profile]=await tx.query('SELECT * FROM contractor_profiles WHERE organisation_id=$1',[id]);
      if(!profile||!['draft','needs_evidence','rejected'].includes(String(profile.state)))throw new AppError(409,'PROFILE_NOT_READY','Save a complete profile before submitting it for review');
      const version=Number(org.version)+1,now=this.now();
      await tx.query('UPDATE organisations SET version=$1,verified=false WHERE id=$2',[version,id]);
      await tx.query("UPDATE contractor_profiles SET state='pending',version=$1,updated_at=$2 WHERE organisation_id=$3",[version,now.toISOString(),id]);
      await tx.query('INSERT INTO contractor_profile_versions VALUES($1,$2,$3,$4,$5)',[id,version,{...profile,name:org.name,state:'pending',version},actor.id,now.toISOString()]);
      await finishAttention(tx,id,'verification.review');await finishAttention(tx,id,'verification.evidence');
      await createAttention(tx,now,{kind:'verification.review',resourceId:id,organisationId:id,action:'Review contractor verification',requiredVersion:version});
      await audit(tx,actor,'verification.submit',id,profile,{state:'pending',version},meta.requestId,now);
      return {organisationId:id,version};
    });
  }
  async createType(token:string,meta:WorkspaceCommand,body:{name:string;holderKind:'company'|'person';categories:string[]}) {
    return this.commands.run(token,meta,'credential.type',body,async(_tx,actor)=>{adminOnly(actor);},async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);const id=randomUUID(),now=this.now();validCategories(body.categories);
      await tx.query('INSERT INTO credential_types VALUES($1,$2,$3,$4,$5,$6)',[id,requiredText(body.name),body.holderKind,body.categories,actor.id,now.toISOString()]);
      await audit(tx,actor,'credential.type',id,null,body,meta.requestId,now);return {typeId:id,version:1};
    });
  }
  async restrict(token:string,meta:WorkspaceCommand,id:string,body:{categories:string[];reason:string}) {
    return this.commands.run(token,meta,'verification.restrict',{id,...body},async(tx,actor)=>{adminOnly(actor);await authorizedOrganisation(tx,actor,id);},async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);if(body.categories.length)validCategories(body.categories);
      const reason=requiredText(body.reason),restrictionId=randomUUID(),now=this.now();
      await tx.query("INSERT INTO contractor_restrictions(id,organisation_id,source,categories,reason,created_at) VALUES($1,$2,'admin',$3,$4,$5)",[restrictionId,id,body.categories,reason,now.toISOString()]);
      await audit(tx,actor,'verification.restrict',restrictionId,null,{organisationId:id,source:'admin',categories:body.categories,reason},meta.requestId,now);
      await createAttention(tx,now,{kind:'verification.restriction',resourceId:restrictionId,organisationId:id,ownerRole:'contractor',action:`Admin restriction: ${reason}`,informational:true});
      await createAttention(tx,now,{kind:'verification.restriction-review',resourceId:restrictionId,organisationId:id,action:'Review the restriction and any affected active work'});
      return {organisationId:id,restrictionId,version:1};
    });
  }
  async liftRestriction(token:string,meta:WorkspaceCommand,id:string,restrictionId:string,reasonInput:string) {
    return this.commands.run(token,meta,'verification.lift-restriction',{id,restrictionId,reason:reasonInput},async(tx,actor)=>{adminOnly(actor);await authorizedOrganisation(tx,actor,id);},async(tx,actor)=>{
      const [restriction]=await tx.query('SELECT * FROM contractor_restrictions WHERE id=$1 AND organisation_id=$2',[restrictionId,id]);
      if(!restriction)throw new AppError(404,'NOT_FOUND','Restriction unavailable');requireVersion(Number(restriction.version),meta.expectedVersion);
      if(restriction.source!=='admin')throw new AppError(409,'RESTRICTION_SOURCE_REQUIRED','Use the owning financial or credential workflow to clear this specific restriction');
      if(!restriction.active)throw new AppError(409,'NOT_ACTIONABLE','This restriction is already lifted');
      const reason=requiredText(reasonInput),version=Number(restriction.version)+1,now=this.now();
      await tx.query('UPDATE contractor_restrictions SET active=false,version=$1 WHERE id=$2',[version,restrictionId]);
      await finishAttention(tx,restrictionId,'verification.restriction-review');
      await audit(tx,actor,'verification.lift-restriction',restrictionId,{active:true,version:restriction.version},{active:false,version},meta.requestId,now,reason);
      await createAttention(tx,now,{kind:'verification.restriction',resourceId:restrictionId,organisationId:id,ownerRole:'contractor',action:'A specific Admin restriction was lifted. Other verification and restrictions still apply.',informational:true});
      return {organisationId:id,restrictionId,version};
    });
  }
  async configureTrade(token:string,meta:WorkspaceCommand,category:string,body:{requiredTypeIds:string[];reason:string}) {
    return this.commands.run(token,meta,'verification.configure-trade',{category,...body},async(_tx,actor)=>{adminOnly(actor);},async(tx,actor)=>{
      validCategories([category]);const reason=requiredText(body.reason);
      const [rule]=await tx.query('SELECT * FROM trade_rules WHERE category=$1',[category]);requireVersion(Number(rule!.version),meta.expectedVersion);
      if(new Set(body.requiredTypeIds).size!==body.requiredTypeIds.length)throw new AppError(422,'FIELD_VALIDATION','Choose each required credential once');
      for(const typeId of body.requiredTypeIds) {
        const [type]=await tx.query('SELECT categories FROM credential_types WHERE id=$1',[typeId]);
        if(!type||!(type.categories as string[]).includes(category))throw new AppError(422,'FIELD_VALIDATION','Required credential types must apply to this trade');
      }
      const previous=await tx.query('SELECT type_id FROM trade_requirements WHERE category=$1 ORDER BY type_id',[category]);
      const now=this.now(),version=Number(rule!.version)+1;
      await tx.query('DELETE FROM trade_requirements WHERE category=$1',[category]);
      for(const typeId of body.requiredTypeIds)await tx.query('INSERT INTO trade_requirements VALUES($1,$2)',[category,typeId]);
      await tx.query('UPDATE trade_rules SET configured=true,version=$1,updated_by=$2,updated_at=$3 WHERE category=$4',[version,actor.id,now.toISOString(),category]);
      await audit(tx,actor,'verification.configure-trade',actor.id,{category,configured:rule!.configured,version:rule!.version,requiredTypeIds:previous.map(p=>p.type_id)},{category,configured:true,version,requiredTypeIds:body.requiredTypeIds},meta.requestId,now,reason);
      if(rule!.configured) {
        await createAttention(tx,now,{kind:'verification.rule-review',resourceId:actor.id,action:`Trade prerequisites changed for ${category}: review affected eligibility and active work`});
      }
      return {category,version,configured:true};
    });
  }
  async credential(token:string,meta:WorkspaceCommand,orgId:string,body:{credentialId?:string;typeId:string;holderName:string;reference:string;fileId?:string;expiry?:string}) {
    return this.commands.run(token,meta,'credential.submit',{orgId,...body},async(tx,actor)=>{await authorizedOrganisation(tx,actor,orgId);},async(tx,actor)=>{
      const [type]=await tx.query('SELECT * FROM credential_types WHERE id=$1',[body.typeId]);if(!type)throw new AppError(422,'FIELD_VALIDATION','Choose an existing credential type');
      const [current]=body.credentialId?await tx.query('SELECT * FROM credentials WHERE id=$1 AND organisation_id=$2',[body.credentialId,orgId]):[];
      if(body.credentialId&&!current)throw new AppError(404,'NOT_FOUND','Credential unavailable');
      if(current&&current.type_id!==body.typeId)throw new AppError(422,'FIELD_VALIDATION','A renewal must keep the original credential type');
      requireVersion(Number(current?.version??0),meta.expectedVersion);
      if(body.fileId) {
        const [file]=await tx.query(`SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND u.organisation_id=$2 AND u.purpose='credential' AND u.state='ready' AND f.variant='original'`,[body.fileId,orgId]);
        if(!file)throw new AppError(422,'FILE_NOT_READY','Use a ready private credential file for this company');
      }
      const id=body.credentialId??randomUUID(),version=Number(current?.version??0)+1,submission=Number(current?.current_submission??0)+1,now=this.now(),expiry=credentialExpiry(body.expiry);
      await tx.query(`INSERT INTO credentials(id,organisation_id,type_id,version,current_submission,state) VALUES($1,$2,$3,$4,$5,'pending')
        ON CONFLICT(id) DO UPDATE SET version=$4,current_submission=$5,state='pending'`,[id,orgId,body.typeId,version,submission]);
      await tx.query('INSERT INTO credential_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,submission,requiredText(body.holderName),requiredText(body.reference),body.fileId??null,body.expiry??null,expiry.expiresAt,expiry.remindAt,actor.id,now.toISOString()]);
      for(const kind of ['credential.review','credential.evidence'])await finishAttention(tx,id,kind);
      await createAttention(tx,now,{kind:'credential.review',resourceId:id,organisationId:orgId,action:'Review submitted credential evidence',requiredVersion:version});
      await audit(tx,actor,'credential.submit',id,current??null,{organisationId:orgId,version,submission,...body},meta.requestId,now);
      return {credentialId:id,version,submission};
    });
  }
  async decide(token:string,meta:WorkspaceCommand,orgId:string,body:{credentialId?:string;outcome:'approved'|'rejected'|'needs_evidence';categories:string[];reason:string;internalNotes:string}) {
    return this.commands.run(token,meta,'verification.decide',{orgId,...body},async(tx,actor)=>{adminOnly(actor);await authorizedOrganisation(tx,actor,orgId);},async(tx,actor)=>{
      const org=await authorizedOrganisation(tx,actor,orgId),now=this.now(),reason=requiredText(body.reason);
      const [target]=body.credentialId?await tx.query('SELECT * FROM credentials WHERE id=$1 AND organisation_id=$2',[body.credentialId,orgId]):await tx.query('SELECT * FROM contractor_profiles WHERE organisation_id=$1',[orgId]);
      if(!target)throw new AppError(404,'NOT_FOUND','Submission unavailable');requireVersion(Number(target.version),meta.expectedVersion);
      if(!['pending','needs_evidence'].includes(String(target.state)))throw new AppError(409,'NOT_ACTIONABLE','This submission is not awaiting verification');
      if(body.categories.length)validCategories(body.categories);
      if(!body.credentialId&&body.outcome==='approved') {
        validCategories(body.categories);
        if(body.categories.some(c=>!(target.categories as string[]).includes(c)))throw new AppError(422,'FIELD_VALIDATION','Approve only requested categories');
        for(const category of body.categories) {
          const [rule]=await tx.query('SELECT configured FROM trade_rules WHERE category=$1',[category]);
          if(!rule?.configured)throw new AppError(409,'TRADE_NOT_CONFIGURED','Admin must configure each approved trade first');
        }
      }
      if(body.credentialId&&body.outcome==='approved') {
        const [v]=await tx.query('SELECT expires_at FROM credential_versions WHERE credential_id=$1 AND submission=$2',[body.credentialId,target.current_submission]);
        if(v?.expires_at&&new Date(v.expires_at as string)<=now)throw new AppError(422,'CREDENTIAL_EXPIRED','Expired evidence cannot receive a current verified badge');
      }
      const id=randomUUID(),version=Number(target.version)+1;
      await tx.query('INSERT INTO verification_decisions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,orgId,body.credentialId??null,target.version,body.outcome,body.categories,reason,body.internalNotes,actor.id,now.toISOString()]);
      if(body.credentialId) {
        await tx.query(`UPDATE credentials SET state=$1,version=$2,approved_submission=CASE WHEN $1='approved' THEN current_submission ELSE approved_submission END,
          expiry_notified_version=CASE WHEN $1='approved' THEN NULL ELSE expiry_notified_version END,
          renewal_notified_version=CASE WHEN $1='approved' THEN NULL ELSE renewal_notified_version END WHERE id=$3`,[body.outcome,version,body.credentialId]);
        if(body.outcome==='approved')for(const kind of ['credential.renewal','credential.expired','credential.expired.notice'])await finishAttention(tx,body.credentialId,kind);
      }
      else {
        await tx.query('UPDATE contractor_profiles SET state=$1,approved_categories=$2,version=$3,updated_at=$4 WHERE organisation_id=$5',[body.outcome,body.outcome==='approved'?body.categories:[],version,now.toISOString(),orgId]);
        await tx.query('UPDATE organisations SET verified=$1,version=$2 WHERE id=$3',[body.outcome==='approved',Number(org.version)+1,orgId]);
        await tx.query('INSERT INTO contractor_profile_versions VALUES($1,$2,$3,$4,$5)',[orgId,version,{...target,name:org.name,state:body.outcome,approved_categories:body.outcome==='approved'?body.categories:[],version,decisionId:id},actor.id,now.toISOString()]);
        await tx.query("UPDATE contractor_applications SET status='reviewed' WHERE organisation_id=$1",[orgId]);
      }
      const resource=body.credentialId??orgId,prefix=body.credentialId?'credential':'verification';
      await finishAttention(tx,resource,`${prefix}.review`);await finishAttention(tx,resource,`${prefix}.evidence`);
      await createAttention(tx,now,{kind:`${prefix}.evidence`,resourceId:resource,organisationId:orgId,ownerRole:'contractor',action:`Verification ${body.outcome}: ${reason}`,requiredVersion:version,informational:body.outcome!=='needs_evidence'});
      await audit(tx,actor,'verification.decide',resource,{state:target.state,version:target.version},{state:body.outcome,version,decisionId:id},meta.requestId,now,reason);
      return {decisionId:id,organisationId:orgId,version,organisationVersion:Number(org.version)+(body.credentialId?0:1)};
    });
  }
}
