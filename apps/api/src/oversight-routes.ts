import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService} from '../../../packages/domain/commands.js';
import {DashboardService,type DashboardFilter} from '../../../packages/domain/dashboard-service.js';
import {ExportService} from '../../../packages/domain/export-service.js';
import {workspaceMeta} from './workspace-routes.js';
import {IntegritySettingsService} from '../../../packages/domain/integrity-settings.js';
import {IntegrityService} from '../../../packages/domain/integrity-service.js';
import {accessEvents} from '../../../packages/domain/protected-access.js';
const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:200};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const filter=schema({q:text,stage:text,category:{enum:['handyman','plumbing','electrical']},urgency:{enum:['ordinary','urgent']},state:{enum:['scheduled','actionable','overdue']},
  from:{type:'string',format:'date-time'},to:{type:'string',format:'date-time'},offset:{type:'string',pattern:'^[0-9]{1,6}$'},limit:{type:'string',pattern:'^(?:[1-9]|[1-9][0-9]|100)$'}},[]);
const parse=(f:Record<string,string>):DashboardFilter=>({...f,...(f.offset?{offset:Number(f.offset)}:{}),...(f.limit?{limit:Number(f.limit)}:{})});
const token=(r:FastifyRequest)=>{if(!r.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return r.cookies.qf_session;};
const csrf=(r:FastifyRequest)=>typeof r.headers['x-csrf-token']==='string'?r.headers['x-csrf-token']:'';
export async function oversightRoutes(app:FastifyInstance,commands:CommandService) {
  const d=new DashboardService(commands),e=new ExportService(commands);
  const settings=new IntegritySettingsService(commands),pct={type:'integer',minimum:0,maximum:10000};
  const integrity=new IntegrityService(commands),long={type:'string',maxLength:10000},bool={type:'boolean'},version={type:'integer',minimum:1};
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/integrity',{schema:{params}},r=>integrity.detail(token(r),r.params.id));
  const integrityPost=<B>(path:string,body:unknown,handler:(token:string,meta:ReturnType<typeof workspaceMeta>,id:string,body:B)=>Promise<unknown>)=>
    app.post<{Params:{id:string};Body:B}>('/api/v1/workspaces/:id/integrity/'+path,{schema:{params,body}},r=>handler(token(r),workspaceMeta(r),r.params.id,r.body as B));
  integrityPost('review',schema({cardId:uuid,sourceVersion:version,disposition:{enum:['explained','needs_clarification','escalated','unresolved']},note:long}),integrity.review.bind(integrity));
  integrityPost('clear',schema({cardId:uuid,sourceVersion:version,explanation:long,confirmed:bool}),integrity.clear.bind(integrity));
  integrityPost('make-safe',schema({description:long,evidenceIds:{type:'array',items:uuid,maxItems:10,uniqueItems:true}}),integrity.makeSafe.bind(integrity));
  integrityPost('access-summary',schema({summary:long,confirmed:bool}),integrity.summary.bind(integrity));
  app.get<{Querystring:{jobId?:string;offset?:string;limit?:string}}>('/api/v1/admin/protected-access',{schema:{querystring:schema({jobId:uuid,offset:{type:'string',pattern:'^[0-9]{1,6}$'},limit:{type:'string',pattern:'^(?:[1-9]|[1-9][0-9]|100)$'}},[])}},r=>accessEvents(commands.db,commands.identity,token(r),r.query.jobId,Number(r.query.offset??0),Number(r.query.limit??25)));
  const settingBody=schema({values:schema({quoteRevisionPct:pct,selectedPricePct:pct,variationGrowthPct:pct,minimumQuotes:{type:'integer',minimum:1,maximum:100}}),acknowledged:{type:'boolean'},reason:{type:'string',maxLength:10000}});
  for(const [scope,job] of [['estates',false],['workspaces',true]] as const) {
    app.get<{Params:{id:string}}>('/api/v1/'+scope+'/:id/integrity-settings',{schema:{params}},r=>settings.detail(token(r),r.params.id,job));
    app.post<{Params:{id:string};Body:Parameters<IntegritySettingsService['save']>[3]}>('/api/v1/'+scope+'/:id/integrity-settings',{schema:{params,body:settingBody}},r=>settings.save(token(r),workspaceMeta(r),r.params.id,r.body,job));
  }
  for(const method of ['tasks','tickets'] as const)app.get<{Querystring:Record<string,string>}>('/api/v1/dashboard/'+method,{schema:{querystring:filter}},r=>d[method](token(r),parse(r.query)));
  app.get<{Params:{id:string};Querystring:Record<string,string>}>('/api/v1/workspaces/:id/chronology',{schema:{params,querystring:filter}},r=>d.history(token(r),r.params.id,parse(r.query)));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/analytics',{schema:{params}},r=>d.analytics(token(r),r.params.id));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/exports',{schema:{params}},r=>e.list(token(r),r.params.id));
  app.post<{Params:{id:string};Body:{format:'html'|'json'}}>('/api/v1/workspaces/:id/exports',{schema:{params,body:schema({format:{enum:['html','json']}})}},r=>e.request(token(r),workspaceMeta(r),r.params.id,r.body));
  app.get<{Params:{id:string}}>('/api/v1/exports/:id',{schema:{params}},r=>e.detail(token(r),r.params.id));
  app.post<{Params:{id:string}}>('/api/v1/exports/:id/grant',{schema:{params,body:schema({})}},r=>e.grant(token(r),r.params.id,csrf(r)));
  app.post<{Params:{id:string}}>('/api/v1/exports/:id/revoke',{schema:{params,body:schema({})}},r=>e.revoke(token(r),r.params.id,csrf(r)));
  app.get<{Params:{id:string};Querystring:{grant:string}}>('/api/v1/exports/:id/download',{schema:{params,querystring:schema({grant:{type:'string',pattern:'^[A-Za-z0-9_-]{43}$'}})}},async(r,reply)=>{
    const result=await e.download(token(r),r.params.id,r.query.grant);
    return reply.header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; sandbox").header('Referrer-Policy','no-referrer')
      .header('Content-Disposition',`attachment; filename="decision-pack-${r.params.id}.${String(result.media_type).startsWith('text/html')?'html':'json'}"`)
      .header('X-Content-SHA256',String(result.checksum)).type(String(result.media_type)).send(Buffer.from(result.bytes as Uint8Array));
  });
}
