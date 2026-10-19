import {createHash,randomUUID} from 'node:crypto';
import {AppError} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedJob,authorizedSupport} from './workspace-service.js';
import {authorizedOrganisation} from './verification-service.js';
import {contractorEvidence} from './quote-service.js';
import {workAccess,contractorOnly} from './work-core.js';
import {financialAccess} from './support-core.js';

export interface Upload extends Record<string,unknown> {
  id:string;job_id:string|null;organisation_id:string|null;owner_id:string;state:string;expires_at:Date|string;
  byte_size:number;media_type:string;checksum:string;
}
export const FILE_LIMIT=10485760, CHUNK_LIMIT=262144;
export class FileService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  private async upload(sql:Sql,actor:Actor,id:string):Promise<Upload> {
    const [row]=await sql.query<Upload>('SELECT * FROM upload_intents WHERE id=$1',[id]);
    if(!row || row.owner_id!==actor.id)throw new AppError(404,'NOT_FOUND','Upload unavailable');
    if(row.support_id)await authorizedSupport(sql,actor,String(row.support_id));
    else if(row.organisation_id)await authorizedOrganisation(sql,actor,row.organisation_id);
    else if(row.work_organisation_id&&actor.context?.role==='contractor')await workAccess(sql,actor,row.job_id!);
    else await authorizedJob(sql,actor,row.job_id!);
    return row;
  }
  async intent(token:string,meta:WorkspaceCommand,id:string,body:{purpose:string;mediaType:string;byteSize:number;checksum:string}) {
    return this.commands.run(token,meta,'upload.intent',{id,...body},async(tx,actor)=>{await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      const job=await authorizedJob(tx,actor,id);requireVersion(job.version,meta.expectedVersion);
      const uploadId=randomUUID(),now=this.now(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      await tx.query(`INSERT INTO upload_intents(id,job_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,'transferring',$8,$9)`,[uploadId,id,actor.id,body.purpose,body.mediaType,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      await audit(tx,actor,'upload.intent',uploadId,null,{purpose:body.purpose,byteSize:body.byteSize},meta.requestId,now);
      return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async credentialIntent(token:string,meta:WorkspaceCommand,id:string,body:{mediaType:string;byteSize:number;checksum:string}) {
    return this.commands.run(token,meta,'upload.credential',{id,...body},async(tx,actor)=>{await authorizedOrganisation(tx,actor,id);},async(tx,actor)=>{
      const org=await authorizedOrganisation(tx,actor,id);requireVersion(Number(org.version),meta.expectedVersion);
      const uploadId=randomUUID(),now=this.now(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      await tx.query(`INSERT INTO upload_intents(id,organisation_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at)
        VALUES($1,$2,$3,'credential',$4,$5,$6,'transferring',$7,$8)`,[uploadId,id,actor.id,body.mediaType,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      await audit(tx,actor,'upload.credential',uploadId,null,{organisationId:id,byteSize:body.byteSize},meta.requestId,now);
      return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async quoteIntent(token:string,meta:WorkspaceCommand,id:string,body:{mediaType:string;byteSize:number;checksum:string}) {
    return this.commands.run(token,meta,'upload.quote',{id,...body},async(tx,actor)=>{await authorizedOrganisation(tx,actor,id);if(actor.context?.role!=='contractor')throw new AppError(403,'FORBIDDEN','Contractor account required');},async(tx,actor)=>{
      const org=await authorizedOrganisation(tx,actor,id);requireVersion(Number(org.version),meta.expectedVersion);
      const uploadId=randomUUID(),now=this.now(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      await tx.query(`INSERT INTO upload_intents(id,organisation_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at) VALUES($1,$2,$3,'quote_pdf','application/pdf',$4,$5,'transferring',$6,$7)`,[uploadId,id,actor.id,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      await audit(tx,actor,'upload.quote',uploadId,null,{organisationId:id,byteSize:body.byteSize},meta.requestId,now);return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async workEvidenceIntent(token:string,meta:WorkspaceCommand,id:string,body:{mediaType:string;byteSize:number;checksum:string}) {
    return this.commands.run(token,meta,'upload.work-evidence',{id,...body},async(tx,actor)=>{contractorOnly(actor);await workAccess(tx,actor,id);},async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);const w=await workAccess(tx,actor,id),now=this.now(),uploadId=randomUUID(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      await tx.query(`INSERT INTO upload_intents(id,job_id,work_organisation_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at)
        VALUES($1,$2,$3,$4,'evidence',$5,$6,$7,'transferring',$8,$9)`,[uploadId,id,w.organisation_id,actor.id,body.mediaType,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      await audit(tx,actor,'upload.work-evidence',uploadId,null,{jobId:id,byteSize:body.byteSize},meta.requestId,now);return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async completionIntent(token:string,meta:WorkspaceCommand,id:string,body:{purpose:'invoice'|'payment_proof';mediaType:string;byteSize:number;checksum:string}) {
    return this.commands.run(token,meta,'upload.completion',{id,...body},async(tx,actor)=>{
      await financialAccess(tx,actor,id);
      if(body.purpose==='invoice')contractorOnly(actor);
      else if(actor.context?.role!=='mcst')throw new AppError(403,'FORBIDDEN','MCST records estate payment proof');
    },async(tx,actor)=>{
      requireVersion(0,meta.expectedVersion);const w=await financialAccess(tx,actor,id),now=this.now(),uploadId=randomUUID(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      await tx.query(`INSERT INTO upload_intents(id,job_id,work_organisation_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'transferring',$9,$10)`,[uploadId,id,body.purpose==='invoice'?w.organisation_id:null,actor.id,body.purpose,body.mediaType,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      await audit(tx,actor,'upload.completion',uploadId,null,{jobId:id,purpose:body.purpose},meta.requestId,now);return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async privateIntent(token:string,meta:WorkspaceCommand,id:string,body:{mediaType:string;byteSize:number;checksum:string},support=false) {
    return this.commands.run(token,meta,support?'upload.support':'upload.fee',{id,...body},async(tx,a)=>{if(support)await authorizedSupport(tx,a,id);else {contractorOnly(a);await authorizedOrganisation(tx,a,id);}},async(tx,a)=>{
      requireVersion(0,meta.expectedVersion);const now=this.now(),uploadId=randomUUID(),expiresAt=new Date(now.getTime()+3600000).toISOString();
      const s=support?await authorizedSupport(tx,a,id):null;
      await tx.query(`INSERT INTO upload_intents(id,job_id,organisation_id,support_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'transferring',$10,$11)`,[uploadId,s?.job_id??null,support?(s?.job_id?null:s?.organisation_id??null):id,support?id:null,a.id,support?'support_evidence':'fee_proof',body.mediaType,body.byteSize,body.checksum,expiresAt,now.toISOString()]);
      return {uploadId,expiresAt,chunkLimit:CHUNK_LIMIT};
    });
  }
  async status(token:string,id:string) {
    const actor=await this.identity.actor(token),upload=await this.upload(this.db,actor,id);
    const chunks=await this.db.query('SELECT byte_offset,octet_length(bytes) AS size FROM upload_chunks WHERE upload_id=$1 ORDER BY byte_offset',[id]);
    const objects=await this.db.query('SELECT id,variant,media_type,checksum FROM file_objects WHERE upload_id=$1',[id]);
    return {uploadId:id,jobId:upload.job_id,state:upload.state,expiresAt:upload.expires_at,byteSize:upload.byte_size,rejectionCode:upload.rejection_code,chunks,objects};
  }
  private async transfer(token:string,csrf:string,id:string,work:(tx:Sql,actor:Actor,upload:Upload)=>Promise<Record<string,unknown>>) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      if(actor.csrf!==csrf)throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      const upload=await this.upload(tx,actor,id);
      return work(tx,actor,upload);
    });
  }
  async renew(token:string,csrf:string,id:string) {
    return this.transfer(token,csrf,id,async(tx,_actor,upload)=>{
      if(upload.state!=='transferring')throw new AppError(409,'UPLOAD_CLOSED','This upload no longer accepts bytes');
      const expiresAt=new Date(this.now().getTime()+3600000).toISOString();
      await tx.query('UPDATE upload_intents SET expires_at=$1 WHERE id=$2',[expiresAt,id]);
      return {uploadId:id,expiresAt};
    });
  }
  async chunk(token:string,csrf:string,id:string,offset:number,encoded:string) {
    if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw new AppError(422,'FIELD_VALIDATION','Invalid encoded bytes');
    const bytes=Buffer.from(encoded,'base64');
    if(!bytes.length || bytes.length>CHUNK_LIMIT)throw new AppError(422,'FILE_SIZE_INVALID','Use chunks up to 256 KiB');
    return this.transfer(token,csrf,id,async(tx,_actor,upload)=>{
      if(upload.state!=='transferring')throw new AppError(409,'UPLOAD_CLOSED','This upload no longer accepts bytes');
      if(new Date(upload.expires_at)<=this.now())throw new AppError(410,'UPLOAD_EXPIRED','Renew upload authorization to resume');
      if(!Number.isInteger(offset)||offset<0||offset%CHUNK_LIMIT!==0||offset+bytes.length>upload.byte_size ||
        bytes.length!==Math.min(CHUNK_LIMIT,upload.byte_size-offset))throw new AppError(422,'FILE_SIZE_INVALID','Chunk offset or length does not match the upload');
      const [existing]=await tx.query('SELECT bytes FROM upload_chunks WHERE upload_id=$1 AND byte_offset=$2',[id,offset]);
      if(existing && !Buffer.from(existing.bytes as Uint8Array).equals(bytes))throw new AppError(409,'CHUNK_CHANGED','Previously received bytes cannot be replaced');
      await tx.query('INSERT INTO upload_chunks VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,offset,bytes]);
      return {uploadId:id,receivedOffset:offset};
    });
  }
  async finalize(token:string,meta:WorkspaceCommand,id:string) {
    return this.commands.run(token,meta,'upload.finalize',{id},async(tx,actor)=>{await this.upload(tx,actor,id);},async(tx,actor)=>{
      const upload=await this.upload(tx,actor,id);requireVersion(0,meta.expectedVersion);
      if(upload.state!=='transferring')throw new AppError(409,'UPLOAD_CLOSED','This upload is already submitted for processing');
      if(new Date(upload.expires_at)<=this.now())throw new AppError(410,'UPLOAD_EXPIRED','Renew upload authorization to resume');
      const chunks=await tx.query('SELECT bytes FROM upload_chunks WHERE upload_id=$1 ORDER BY byte_offset',[id]);
      const bytes=Buffer.concat(chunks.map(c=>Buffer.from(c.bytes as Uint8Array)));
      if(bytes.length!==upload.byte_size)throw new AppError(422,'UPLOAD_INCOMPLETE','Some bytes are still missing');
      const valid=createHash('sha256').update(bytes).digest('hex')===upload.checksum;
      await tx.query('UPDATE upload_intents SET state=$1,rejection_code=$2 WHERE id=$3',[valid?'verifying':'rejected',valid?null:'CHECKSUM_MISMATCH',id]);
      if(valid)await enqueue(tx,'file.scan',id,{uploadId:id},this.now());
      await audit(tx,actor,'upload.finalize',id,{state:'transferring'},{state:valid?'verifying':'rejected'},meta.requestId,this.now());
      return {uploadId:id,state:valid?'verifying':'rejected'};
    });
  }
  async attach(token:string,meta:WorkspaceCommand,id:string,fileId:string) {
    return this.commands.run(token,meta,'file.attach',{id,fileId},async(tx,actor)=>{await authorizedJob(tx,actor,id);},async(tx,actor)=>{
      // Evidence is independent of decision version: it cannot edit scope/status or reject unrelated decisions.
      requireVersion(0,meta.expectedVersion);
      const [file]=await tx.query(`SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id
        WHERE f.id=$1 AND u.job_id=$2 AND u.state='ready' AND u.support_id IS NULL`,[fileId,id]);
      if(!file)throw new AppError(422,'FILE_NOT_READY','Use a verified ready file belonging to this job');
      const inserted=await tx.query('INSERT INTO job_attachments VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING file_id',[id,fileId,actor.id,this.now().toISOString()]);
      if(inserted.length) {
        await audit(tx,actor,'file.attach',id,null,{fileId},meta.requestId,this.now());
        await enqueue(tx,'workspace.evidence',id,{fileId},this.now());
      }
      return {jobId:id,fileId};
    });
  }
  async download(token:string,id:string) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      const [file]=await tx.query(`SELECT f.*,u.owner_id,u.job_id,u.organisation_id,u.work_organisation_id,u.support_id,u.purpose FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1 AND u.state='ready'`,[id]);
      if(!file)throw new AppError(404,'NOT_FOUND','File unavailable');
      if(file.purpose==='payment_proof'&&actor.context?.role==='cm') {
        const [estate]=await tx.query('SELECT e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[file.job_id]);
        if(!estate?.contractor_identities_visible)throw new AppError(404,'NOT_FOUND','Payment proof withheld while contractor identities are concealed');
      }
      if(file.support_id) {
        await authorizedSupport(tx,actor,String(file.support_id));
        if(file.owner_id!==actor.id&&!(await tx.query('SELECT file_id FROM support_evidence_links WHERE support_id=$1 AND file_id=$2',[file.support_id,id])).length)throw new AppError(404,'NOT_FOUND','Evidence has not been submitted');
        if(actor.context?.role==='cm'&&file.job_id) {const [e]=await tx.query('SELECT e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[file.job_id]);if(!e?.contractor_identities_visible)throw new AppError(404,'NOT_FOUND','Evidence withheld while Contractor identities are concealed');}
      } else if(file.work_organisation_id) {
        await financialAccess(tx,actor,String(file.job_id));
        if(actor.context?.role==='cm') {
          const [estate]=await tx.query('SELECT e.contractor_identities_visible FROM estates e JOIN job_records j ON j.estate_id=e.id WHERE j.id=$1',[file.job_id]);
          if(!estate?.contractor_identities_visible)throw new AppError(404,'NOT_FOUND','Work evidence withheld while contractor identities are concealed');
        }
      } else if(file.organisation_id&&file.purpose==='quote_pdf'&&['cm','mcst'].includes(actor.context?.role??'')) {
        const references=await tx.query('SELECT DISTINCT q.job_id FROM quote_versions v JOIN quotes q ON q.id=v.quote_id WHERE v.pdf_id=$1',[id]);let permitted=false;
        for(const reference of references) {
          try{const job=await authorizedJob(tx,actor,String(reference.job_id)),[estate]=await tx.query('SELECT contractor_identities_visible FROM estates WHERE id=$1',[job.estate_id]);if(actor.context?.role!=='cm'||estate?.contractor_identities_visible)permitted=true;}
          catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
        }
        if(!permitted)throw new AppError(404,'NOT_FOUND','File unavailable');
      } else if(file.organisation_id)await authorizedOrganisation(tx,actor,String(file.organisation_id));
      else if(actor.context?.role==='contractor'&&file.purpose==='payment_proof') {
        await workAccess(tx,actor,String(file.job_id));
        const [reference]=await tx.query('SELECT id FROM payment_transfers WHERE job_id=$1 AND proof_id=$2',[file.job_id,id]);
        if(!reference)throw new AppError(404,'NOT_FOUND','File unavailable');
      } else if(actor.context?.role==='contractor') {
        if(file.variant!=='sanitized'||!await contractorEvidence(tx,actor,String(file.job_id),id,this.now()))throw new AppError(404,'NOT_FOUND','File unavailable');
      } else await authorizedJob(tx,actor,String(file.job_id));
      await audit(tx,actor,'file.access',id,null,{variant:file.variant},'file-access',this.now());
      return {bytes:Buffer.from(file.bytes as Uint8Array),mediaType:String(file.media_type),variant:String(file.variant)};
    });
  }
}
