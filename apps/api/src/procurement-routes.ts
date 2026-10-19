import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {Database} from '../../../packages/infrastructure/database.js';
import type {IdentityService} from '../../../packages/domain/identity-service.js';
import {CommandService} from '../../../packages/domain/commands.js';
import {VerificationService,categories} from '../../../packages/domain/verification-service.js';
import {RfqService,priorities,type Intake} from '../../../packages/domain/rfq-service.js';
import {FileService} from '../../../packages/domain/file-service.js';
import {AppError} from '../../../packages/contracts/primitives.js';
import {workspaceMeta} from './workspace-routes.js';

const uuid={type:'string',format:'uuid'},short={type:'string',minLength:1,maxLength:500},text={type:'string',maxLength:10000};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const trades={type:'array',items:{enum:categories},minItems:1,maxItems:3,uniqueItems:true};
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
const intake={accessEquipmentRequired:{type:'boolean'},categories:trades,urgency:{enum:['ordinary','urgent']},noPhotoReason:{type:'string',maxLength:1000},grouping:{enum:['combined','separate']},primaryPriority:{enum:priorities},secondaryPriority:{enum:priorities.filter(p=>p!=='none')},publicDescription:{...text,minLength:1},publicLocation:short,evidenceIds:{type:'array',items:uuid,uniqueItems:true,maxItems:20}};
const intakeRequired=Object.keys(intake).filter(k=>!['secondaryPriority','accessEquipmentRequired'].includes(k));
export async function procurementRoutes(app:FastifyInstance,db:Database,identity:IdentityService,commands=new CommandService(db,identity,identity.now)) {
  const verification=new VerificationService(commands),rfq=new RfqService(commands),files=new FileService(commands);
  app.get('/api/v1/contractors',async req=>verification.list(token(req)));
  app.get<{Params:{id:string}}>('/api/v1/contractors/:id',{schema:{params}},async req=>verification.detail(token(req),req.params.id));
  app.get('/api/v1/verification/rules',async req=>verification.rules(token(req)));
  app.get<{Params:{id:string;organisationId:string}}>('/api/v1/workspaces/:id/contractor-profiles/:organisationId',
    {schema:{params:schema({id:uuid,organisationId:uuid})}},async req=>verification.publicProfile(token(req),req.params.id,req.params.organisationId));
  app.post<{Params:{category:string};Body:{requiredTypeIds:string[];reason:string}}>('/api/v1/admin/trades/:category/configure',
    {schema:{params:schema({category:{enum:categories}}),body:schema({requiredTypeIds:{type:'array',items:uuid,uniqueItems:true,maxItems:30},reason:short})}},async req=>verification.configureTrade(token(req),workspaceMeta(req),req.params.category,req.body));
  app.post<{Params:{id:string};Body:{name:string;contact:string;categories:string[];description:string}}>('/api/v1/contractors/:id/profile',
    {schema:{params,body:schema({name:short,contact:short,categories:trades,description:text})}},async req=>verification.saveProfile(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string}}>('/api/v1/contractors/:id/submit',{schema:{params,body:schema({})}},async req=>verification.submit(token(req),workspaceMeta(req),req.params.id));
  app.post<{Body:{name:string;holderKind:'company'|'person';categories:string[]}}>('/api/v1/admin/credential-types',
    {schema:{body:schema({name:short,holderKind:{enum:['company','person']},categories:trades})}},async req=>verification.createType(token(req),workspaceMeta(req),req.body));
  app.post<{Params:{id:string};Body:{credentialId?:string;typeId:string;holderName:string;reference:string;fileId?:string;expiry?:string}}>('/api/v1/contractors/:id/credentials',
    {schema:{params,body:schema({credentialId:uuid,typeId:uuid,holderName:short,reference:short,fileId:uuid,expiry:{type:'string',minLength:10,maxLength:40}},['typeId','holderName','reference'])}},async req=>verification.credential(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string};Body:{credentialId?:string;outcome:'approved'|'rejected'|'needs_evidence';categories:string[];reason:string;internalNotes:string}}>('/api/v1/admin/contractors/:id/decision',
    {schema:{params,body:schema({credentialId:uuid,outcome:{enum:['approved','rejected','needs_evidence']},categories:{...trades,minItems:0},reason:short,internalNotes:text},['outcome','categories','reason','internalNotes'])}},async req=>verification.decide(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string};Body:{mediaType:string;byteSize:number;checksum:string}}>('/api/v1/contractors/:id/uploads',
    {schema:{params,body:schema({mediaType:{enum:['image/png','image/jpeg','application/pdf']},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}})}},async req=>files.credentialIntent(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string};Body:{categories:string[];reason:string}}>('/api/v1/admin/contractors/:id/restrictions',
    {schema:{params,body:schema({categories:{...trades,minItems:0},reason:short})}},async req=>verification.restrict(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string;restrictionId:string};Body:{reason:string}}>('/api/v1/admin/contractors/:id/restrictions/:restrictionId/lift',
    {schema:{params:schema({id:uuid,restrictionId:uuid}),body:schema({reason:short})}},async req=>verification.liftRestriction(token(req),workspaceMeta(req),req.params.id,req.params.restrictionId,req.body.reason));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/rfq',{schema:{params}},async req=>rfq.detail(token(req),req.params.id));
  app.post<{Params:{id:string};Body:Intake}>('/api/v1/workspaces/:id/rfq/intake',{schema:{params,body:schema(intake,intakeRequired)}},async req=>rfq.save(token(req),workspaceMeta(req),req.params.id,req.body));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/rfq/preview',{schema:{params}},async req=>rfq.preview(token(req),req.params.id));
  app.post<{Params:{id:string};Body:{privacyConfirmed:boolean;factsConfirmed:boolean}}>('/api/v1/workspaces/:id/rfq/publish',
    {schema:{params,body:schema({privacyConfirmed:{type:'boolean'},factsConfirmed:{type:'boolean'}})}},async req=>rfq.publish(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string};Body:{classification:'minor'|'material';changeKinds:string[];reason:string;privacyConfirmed:boolean;factsConfirmed:boolean}}>('/api/v1/workspaces/:id/rfq/revise',
    {schema:{params,body:schema({classification:{enum:['minor','material']},changeKinds:{type:'array',items:{enum:['spelling','formatting','scope','quantities','price_terms','safety','access','uncertain']},minItems:1,maxItems:8,uniqueItems:true},reason:short,privacyConfirmed:{type:'boolean'},factsConfirmed:{type:'boolean'}})}},async req=>rfq.revise(token(req),workspaceMeta(req),req.params.id,req.body));
  app.post<{Params:{id:string}}>('/api/v1/workspaces/:id/rfq/refine',{schema:{params,body:schema({})}},async req=>rfq.refine(token(req),workspaceMeta(req),req.params.id));
  app.post<{Params:{id:string};Body:{refinementId:string}}>('/api/v1/workspaces/:id/rfq/accept-refinement',{schema:{params,body:schema({refinementId:uuid})}},async req=>rfq.acceptRefinement(token(req),workspaceMeta(req),req.params.id,req.body.refinementId));
  app.post<{Params:{id:string};Body:{repairs:{title:string;observations:string;affectedLocation:string}[]}}>('/api/v1/workspaces/:id/rfq/separate',
    {schema:{params,body:schema({repairs:{type:'array',minItems:2,maxItems:10,items:schema({title:short,observations:{...text,minLength:1},affectedLocation:short})}})}},async req=>rfq.split(token(req),workspaceMeta(req),req.params.id,req.body));
  app.get('/api/v1/opportunities',async req=>rfq.opportunities(token(req)));
  app.get<{Params:{id:string}}>('/api/v1/opportunities/:id',{schema:{params}},async req=>rfq.opportunity(token(req),req.params.id));
  app.post<{Params:{id:string};Body:{outcome:'attempted'|'attendance_arranged'|'unresolved';summary:string;eta?:string;nextAction:string;followUpAt:string}}>('/api/v1/admin/urgency/:id/coordinate',
    {schema:{params,body:schema({outcome:{enum:['attempted','attendance_arranged','unresolved']},summary:short,eta:short,nextAction:short,followUpAt:short},['outcome','summary','nextAction','followUpAt'])}},async req=>rfq.coordinate(token(req),workspaceMeta(req),req.params.id,req.body));
}
