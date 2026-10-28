import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService,WorkspaceCommand} from '../../../packages/domain/commands.js';
import {QuoteService,warrantyOptions,availabilityOptions,durationOptions} from '../../../packages/domain/quote-service.js';
import {ConversationService} from '../../../packages/domain/conversation-service.js';
import {SelectionService} from '../../../packages/domain/selection-service.js';
import {FileService} from '../../../packages/domain/file-service.js';
import {workspaceMeta} from './workspace-routes.js';

const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},short={type:'string',maxLength:500},bool={type:'boolean'},version={type:'integer',minimum:1,maximum:2147483647};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
const cautionList={type:'array',items:short,maxItems:30,uniqueItems:true};
const changeKinds={type:'array',items:{enum:['spelling','formatting','scope','quantities','price_terms','safety','access','uncertain']},minItems:1,maxItems:8,uniqueItems:true};
export async function quotingRoutes(app:FastifyInstance,commands:CommandService) {
  const quotes=new QuoteService(commands),conversation=new ConversationService(commands),selection=new SelectionService(commands),files=new FileService(commands);
  function post<B>(path:string,body:unknown,handler:(token:string,meta:WorkspaceCommand,id:string,body:B)=>Promise<unknown>) {
    app.post<{Params:{id:string};Body:B}>('/api/v1/'+path,{schema:{params,body}},req=>handler(token(req),workspaceMeta(req),req.params.id,req.body as B));
  }
  const terms=schema({amountSgd:{type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'},wasteDisposal:bool,warranty:bool,warrantyDuration:{enum:warrantyOptions},warrantyOther:text,makingGood:bool,gstCharged:bool,accessEquipment:bool,availability:{enum:availabilityOptions},availabilityOther:text,duration:{enum:durationOptions},durationReason:text,exclusions:{type:'array',items:{enum:['none','other']},minItems:1,maxItems:2,uniqueItems:true},exclusionsOther:text,narrative:text,expiry:{type:'string',minLength:10,maxLength:40},expiryConfirmed:bool,commitment:bool},['amountSgd','wasteDisposal','warranty','makingGood','gstCharged','availability','duration','exclusions','expiry','expiryConfirmed','commitment']);
  app.get<{Params:{id:string}}>('/api/v1/opportunities/:id/quotes',{schema:{params}},req=>quotes.own(token(req),req.params.id));
  app.get('/api/v1/contractor/jobs',req=>quotes.jobs(token(req)));
  post('opportunities/:id/quotes',schema({rfqRevision:version,terms,pdfId:uuid,revisionReason:text},['rfqRevision','terms']),quotes.submit.bind(quotes));
  post('quotes/:id/reconfirm',schema({rfqRevision:version,confirmed:bool}),quotes.reconfirm.bind(quotes));
  post<{reason:string}>('quotes/:id/withdraw',schema({reason:{...short,minLength:1}}),(t,m,id,b)=>quotes.withdraw(t,m,id,b.reason));
  post<{quoteId:string}>('workspaces/:id/quotes/prompt',schema({quoteId:uuid}),(t,m,id,b)=>quotes.prompt(t,m,id,b.quoteId));
  for(const prefix of ['opportunities','workspaces'])app.get<{Params:{id:string}}>(`/api/v1/${prefix}/:id/conversation`,{schema:{params}},req=>conversation.list(token(req),req.params.id));
  post('opportunities/:id/questions',schema({rfqRevision:version,question:{...text,minLength:1}}),conversation.ask.bind(conversation));
  post('opportunities/:id/visits',schema({rfqRevision:version,reason:{...short,minLength:1}}),conversation.requestVisit.bind(conversation));
  app.post<{Params:{id:string;requestId:string};Body:Parameters<ConversationService['answer']>[4]}>('/api/v1/workspaces/:id/questions/:requestId/respond',
    {schema:{params:schema({id:uuid,requestId:uuid}),body:schema({rfqRevision:version,outcome:{enum:['answered','declined']},publicQuestion:text,publicAnswer:text,classification:{enum:['minor','material']},changeKinds,reason:text,privacyConfirmed:bool,factsConfirmed:bool})}},
    req=>conversation.answer(token(req),workspaceMeta(req),req.params.id,req.params.requestId,req.body));
  app.post<{Params:{id:string;requestId:string};Body:Parameters<ConversationService['decideVisit']>[4]}>('/api/v1/workspaces/:id/visits/:requestId/decide',
    {schema:{params:schema({id:uuid,requestId:uuid}),body:schema({outcome:{enum:['approved','declined']},reason:text,visitAt:{type:'string',minLength:20,maxLength:40},confirmed:bool},['outcome','reason','confirmed'])}},
    req=>conversation.decideVisit(token(req),workspaceMeta(req),req.params.id,req.params.requestId,req.body));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/comparison',{schema:{params}},req=>selection.compare(token(req),req.params.id));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/selections',{schema:{params}},req=>selection.history(token(req),req.params.id));
  post('workspaces/:id/select',schema({quoteId:uuid,quoteVersion:version,settingsVersion:version,rfqRevision:version,rationale:{...text,minLength:1},confirmed:bool,acknowledgedCautions:cautionList,thresholdAcknowledged:bool,reputationFingerprint:{type:'string',pattern:'^[a-f0-9]{64}$'},clearWarning:bool,warningExplanation:text},['quoteId','quoteVersion','settingsVersion','rfqRevision','rationale','confirmed','acknowledgedCautions','thresholdAcknowledged']),selection.select.bind(selection));
  post('workspaces/:id/selection/decide',schema({selectionId:uuid,outcome:{enum:['approved','rejected']},reason:text,confirmed:bool,acknowledgedCautions:cautionList,clearWarning:bool,warningExplanation:text},['selectionId','outcome','reason','confirmed','acknowledgedCautions']),selection.decide.bind(selection));
  post<{reason:string}>('workspaces/:id/selection/reopen',schema({reason:{...short,minLength:1}}),(t,m,id,b)=>selection.reopen(t,m,id,b.reason));
  post<{at:string}>('workspaces/:id/selection/schedule',schema({at:{type:'string',minLength:20,maxLength:40}}),(t,m,id,b)=>selection.schedule(t,m,id,b.at));
  post('workspaces/:id/selection/replacement',schema({title:{...short,minLength:1},observations:{...text,minLength:1},affectedLocation:{...short,minLength:1},reason:{...short,minLength:1}}),selection.replacement.bind(selection));
  app.get<{Params:{id:string}}>('/api/v1/estates/:id/procurement-settings',{schema:{params}},req=>selection.procurementSettings(token(req),req.params.id));
  post('estates/:id/procurement-settings',schema({thresholdSgd:{type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'},identitiesVisible:bool,address:text,reason:{...short,minLength:1}},['reason']),selection.settings.bind(selection));
  post('contractors/:id/quote-uploads',schema({mediaType:{const:'application/pdf'},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}}),files.quoteIntent.bind(files));
}
