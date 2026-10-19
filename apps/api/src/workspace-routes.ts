import type {FastifyInstance,FastifyRequest} from 'fastify';
import {randomUUID} from 'node:crypto';
import type {Database} from '../../../packages/infrastructure/database.js';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {IdentityService} from '../../../packages/domain/identity-service.js';
import {CommandService,type WorkspaceCommand} from '../../../packages/domain/commands.js';
import {WorkspaceService} from '../../../packages/domain/workspace-service.js';
import {TaskService,authorizedTask} from '../../../packages/domain/task-service.js';
import {FileService} from '../../../packages/domain/file-service.js';
import {authorizedJob} from '../../../packages/domain/workspace-service.js';

const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},short={type:'string',minLength:1,maxLength:500};
const integer={type:'integer',minimum:0,maximum:2147483647};
const fields={title:short,observations:text,affectedLocation:short};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
const csrf=(req:FastifyRequest)=>typeof req.headers['x-csrf-token']==='string'?req.headers['x-csrf-token']:'';
export function workspaceMeta(req:FastifyRequest):WorkspaceCommand {
  const operation=req.headers['idempotency-key'],access=req.headers['x-access-version'],match=req.headers['if-match'];
  if(typeof operation!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation) ||
    typeof access!=='string'||!/^\d+$/.test(access)||!Number.isSafeInteger(Number(access))||Number(access)<1 ||
    typeof match!=='string'||!/^"record-\d+"$/.test(match)||!Number.isSafeInteger(Number(match.slice(8,-1))))
    throw new AppError(428,'PRECONDITION_REQUIRED','Supply operation identity and current access/record versions');
  return {operationId:operation,accessVersion:Number(access),expectedVersion:Number(match.slice(8,-1)),csrf:csrf(req),requestId:req.id};
}
const meta=workspaceMeta;
export async function workspaceRoutes(app:FastifyInstance,db:Database,identity:IdentityService,commands=new CommandService(db,identity,identity.now)) {
  const workspace=new WorkspaceService(commands),files=new FileService(commands),tasks=new TaskService(commands);
  app.get('/api/v1/workspaces',async req=>workspace.list(token(req)));
  app.post<{Body:{title:string;observations:string;affectedLocation:string;estateId:string}}>('/api/v1/workspaces',
    {schema:{body:schema({...fields,estateId:uuid})}},async req=>workspace.create(token(req),meta(req),req.body));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id',{schema:{params}},async(req,reply)=>{
    const result=await workspace.detail(token(req),req.params.id);reply.header('ETag',`"record-${result.job.version}"`);return result;
  });
  app.post<{Params:{id:string};Body:{title:string;observations:string;affectedLocation:string}}>('/api/v1/workspaces/:id/edit',
    {schema:{params,body:schema(fields)}},async req=>workspace.edit(token(req),meta(req),req.params.id,req.body));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/history',{schema:{params}},async req=>workspace.history(token(req),req.params.id));
  app.get('/api/v1/drafts',async req=>workspace.drafts(token(req)));
  app.post<{Body:{id:string;estateId:string;jobId?:string;baseVersion:number;fields:{title:string;observations:string;affectedLocation:string}}}>('/api/v1/drafts',
    {schema:{body:schema({id:uuid,estateId:uuid,jobId:uuid,baseVersion:integer,fields:schema(fields)},['id','estateId','baseVersion','fields'])}},
    async req=>workspace.saveDraft(token(req),meta(req),req.body));
  app.get<{Params:{id:string}}>('/api/v1/operations/:id',{schema:{params}},async req=>workspace.operation(token(req),req.params.id));
  app.post<{Params:{id:string};Body:{description:string;privacy:'ordinary'|'confidential';subjectUserIds:string[];subjectOrganisationIds:string[]}}>('/api/v1/workspaces/:id/support',
    {schema:{params,body:schema({description:{...text,minLength:1},privacy:{enum:['ordinary','confidential']},subjectUserIds:{type:'array',items:uuid,maxItems:20,uniqueItems:true},subjectOrganisationIds:{type:'array',items:uuid,maxItems:20,uniqueItems:true}})}},
    async req=>workspace.support(token(req),meta(req),req.params.id,req.body));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/support',{schema:{params}},async req=>workspace.supports(token(req),req.params.id));
  app.post<{Params:{id:string};Body:{purpose:string;mediaType:string;byteSize:number;checksum:string}}>('/api/v1/workspaces/:id/uploads',
    {schema:{params,body:schema({purpose:{enum:['evidence','invoice','payment_proof']},mediaType:{enum:['image/png','image/jpeg','application/pdf']},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}})}},
    async req=>files.intent(token(req),meta(req),req.params.id,req.body));
  app.get<{Params:{id:string}}>('/api/v1/uploads/:id',{schema:{params}},async req=>files.status(token(req),req.params.id));
  app.post<{Params:{id:string}}>('/api/v1/uploads/:id/renew',{schema:{params,body:schema({})}},async req=>files.renew(token(req),csrf(req),req.params.id));
  app.post<{Params:{id:string};Body:{offset:number;bytes:string}}>('/api/v1/uploads/:id/chunks',
    {bodyLimit:400000,schema:{params,body:schema({offset:integer,bytes:{type:'string',minLength:1,maxLength:349528}})}},
    async req=>files.chunk(token(req),csrf(req),req.params.id,req.body.offset,req.body.bytes));
  app.post<{Params:{id:string}}>('/api/v1/uploads/:id/finalize',{schema:{params,body:schema({})}},async req=>files.finalize(token(req),meta(req),req.params.id));
  app.post<{Params:{id:string};Body:{fileId:string}}>('/api/v1/workspaces/:id/attachments',
    {schema:{params,body:schema({fileId:uuid})}},async req=>files.attach(token(req),meta(req),req.params.id,req.body.fileId));
  app.get<{Params:{id:string}}>('/api/v1/files/:id',{schema:{params}},async(req,reply)=>{
    const file=await files.download(token(req),req.params.id);
    return reply.header('Content-Disposition',`attachment; filename="evidence.${file.mediaType==='application/pdf'?'pdf':file.mediaType==='image/png'?'png':'jpg'}"`)
      .header('X-Content-Type-Options','nosniff').type(file.mediaType).send(file.bytes);
  });
  app.get('/api/v1/tasks',async req=>tasks.list(token(req)));
  app.get('/api/v1/notifications',async req=>tasks.bells(token(req)));
  app.post<{Params:{id:string}}>('/api/v1/notifications/:id/read',{schema:{params,body:schema({})}},async req=>tasks.read(token(req),csrf(req),req.params.id));
  app.get('/api/v1/admin/attention',async req=>tasks.list(token(req),true));
  app.post<{Params:{id:string};Body:{nextAction:string;followUpAt:string}}>('/api/v1/admin/attention/:id/acknowledge',
    {schema:{params,body:schema({nextAction:short,followUpAt:short})}},async req=>tasks.acknowledge(token(req),meta(req),req.params.id,req.body));
  const failedVisible=async(id:string,actor:Awaited<ReturnType<IdentityService['actor']>>,sql=db as import('../../../packages/infrastructure/database.js').Sql)=>{
    if(actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
    const [work]=await sql.query('SELECT * FROM outbox WHERE id=$1 AND failed_at IS NOT NULL',[id]);
    if(!work)throw new AppError(404,'NOT_FOUND','Work unavailable');
    if(work.kind==='notification.issue'||work.kind==='task.changed')await authorizedTask(sql,actor,String(work.resource_id));
    if(work.kind==='workspace.changed'||work.kind==='workspace.evidence')await authorizedJob(sql,actor,String(work.resource_id));
    if(work.kind==='file.scan') {
      const [upload]=await sql.query('SELECT job_id,organisation_id FROM upload_intents WHERE id=$1',[work.resource_id]);
      if(!upload)throw new AppError(404,'NOT_FOUND','Work unavailable');
      if(upload.organisation_id) {
        const {authorizedOrganisation}=await import('../../../packages/domain/verification-service.js');
        await authorizedOrganisation(sql,actor,String(upload.organisation_id));
      } else await authorizedJob(sql,actor,String(upload.job_id));
    }
    return work;
  };
  app.get('/api/v1/admin/failed-work',async req=>{
    const actor=await identity.actor(token(req));
    if(actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
    const rows=await db.query('SELECT id,kind,attempts,last_error_code,failed_at,created_at FROM outbox WHERE failed_at IS NOT NULL AND processed_at IS NULL ORDER BY failed_at LIMIT 200');
    const visible=[];
    for(const row of rows)try{await failedVisible(String(row.id),actor);visible.push(row);}catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}
    return visible;
  });
  app.post<{Params:{id:string}}>('/api/v1/admin/failed-work/:id/retry',{schema:{params,body:schema({})}},async req=>{
    const id=req.params.id;
    // Technical recovery is keyed to durable work, with repeatable safe results.
    return db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await identity.actor(token(req),tx);
      if(csrf(req)!==actor.csrf)throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      const work=await failedVisible(id,actor,tx);
      await tx.query('UPDATE outbox SET failed_at=NULL,attempts=0,available_at=$1,lease_token=NULL,lease_until=NULL WHERE id=$2',[identity.now().toISOString(),id]);
      await tx.query(`INSERT INTO audit_events(id,actor_id,actor_role,action,resource_id,before_value,after_value,request_id,recorded_at)
        VALUES($1,$2,'admin','worker.retry',$3,$4,$5,$6,$7)`,[randomUUID(),actor.id,id,{attempts:work.attempts},{requeued:true},req.id,identity.now().toISOString()]);
      return {message:'Work requeued. Existing notification anchors remain unchanged.'};
    });
  });
}
