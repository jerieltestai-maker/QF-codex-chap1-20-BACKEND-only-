import {listPage} from './list-pages.js';
import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService,WorkspaceCommand} from '../../../packages/domain/commands.js';
import {FeedbackService} from '../../../packages/domain/feedback-service.js';
import {ReputationService} from '../../../packages/domain/reputation-service.js';
import {AdviceService} from '../../../packages/domain/advice-service.js';
import type {AdviceProvider} from '../../../packages/domain/advice-service.js';
import {workspaceMeta} from './workspace-routes.js';
const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},bool={type:'boolean'},version={type:'integer',minimum:1,maximum:2147483647},stars={type:'integer',minimum:1,maximum:5};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid}),files={type:'array',items:uuid,maxItems:10,uniqueItems:true};
const rubric=schema({workmanship:stars,timeliness:stars,customerService:stars,valueForMoney:stars,recommendation:stars});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
export async function feedbackRoutes(app:FastifyInstance,commands:CommandService,provider?:AdviceProvider) {
  const f=new FeedbackService(commands),r=new ReputationService(commands),advice=new AdviceService(commands,provider);
  function post<B>(path:string,body:unknown,handler:(token:string,meta:WorkspaceCommand,id:string,body:B)=>Promise<unknown>) {
    app.post<{Params:{id:string};Body:B}>('/api/v1/'+path,{schema:{params,body}},req=>handler(token(req),workspaceMeta(req),req.params.id,req.body as B));
  }
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/feedback',{schema:{params}},req=>f.detail(token(req),req.params.id));
  post('workspaces/:id/feedback/submit',schema({obligationVersion:version,outcome:{enum:['rated','unable']},rating:stars,observation:text,confirmed:bool},['obligationVersion','outcome','observation','confirmed']),f.submit.bind(f));
  post('workspaces/:id/feedback/correct',schema({entryVersion:version,outcome:{enum:['rated','unable']},rating:stars,observation:text,correctionReason:text,confirmed:bool},['entryVersion','outcome','observation','correctionReason','confirmed']),f.correct.bind(f));
  post('workspaces/:id/reputation/inspection',schema({round:version,rubric,reason:text,entryVersion:version,correctionReason:text,confirmed:bool},['round','rubric','reason','confirmed']),r.inspect.bind(r));
  post('workspaces/:id/aftercare/request',schema({concern:text,requestedHelp:text,evidenceIds:files}),f.requestAftercare.bind(f));
  post('workspaces/:id/aftercare/remedy',schema({caseId:uuid,description:text,evidenceIds:files,completedAt:text,confirmed:bool}),f.remedy.bind(f));
  post('workspaces/:id/aftercare/inspect',schema({caseId:uuid,round:version,outcome:{enum:['accepted','unsatisfactory']},findings:text,scopeReviewed:bool,evidenceReviewed:bool,confirmed:bool}),f.inspect.bind(f));
  post('workspaces/:id/aftercare/decide',schema({caseId:uuid,outcome:{enum:['physical_remedy','explanation','resolved']},reason:text,executionEvidence:text}),f.decide.bind(f));
  post('admin/organisations/:id/reputation/references',schema({workDate:text,trade:{enum:['handyman','plumbing','electrical']},workDescription:text,source:text,refereeContact:text,independentChannel:text,interviewEvidence:text,uncertainty:text,independentlyVerified:bool,rubric,reason:text,referenceKey:{type:'string',minLength:1,maxLength:200}}),r.external.bind(r));
  app.get('/api/v1/admin/reputation',req=>r.queue(token(req)).then(rows=>listPage(req,rows)));
  app.get<{Params:{id:string}}>('/api/v1/reputation/entries/:id',{schema:{params}},req=>r.entry(token(req),req.params.id));
  post('reputation/entries/:id/moderate',schema({entryVersion:version,decision:{enum:['publish','reject','void','redact']},reason:text,publicText:schema({observation:text,reason:text},[]),durabilityContested:bool},['entryVersion','decision','reason','durabilityContested']),r.moderate.bind(r));
  post('reputation/entries/:id/reply',schema({entryVersion:version,text}),r.reply.bind(r));
  post('reputation/entries/:id/moderate-reply',schema({replyVersion:version,approved:bool,reason:text}),r.moderateReply.bind(r));
  app.get<{Params:{id:string;org:string}}>('/api/v1/workspaces/:id/passports/:org',{schema:{params:schema({id:uuid,org:uuid})}},req=>r.passport(token(req),req.params.id,req.params.org));
  app.get<{Params:{id:string;quoteId:string}}>('/api/v1/workspaces/:id/quotes/:quoteId/passport',{schema:{params:schema({id:uuid,quoteId:uuid})}},req=>r.passportByQuote(token(req),req.params.id,req.params.quoteId));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/advice',{schema:{params}},req=>advice.detail(token(req),req.params.id));
  post('workspaces/:id/advice',schema({confirmed:bool}),advice.request.bind(advice));
}
