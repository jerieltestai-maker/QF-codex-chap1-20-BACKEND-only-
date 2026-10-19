import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService,WorkspaceCommand} from '../../../packages/domain/commands.js';
import {WorkService} from '../../../packages/domain/work-service.js';
import {VariationService,rejectionReasons} from '../../../packages/domain/variation-service.js';
import {workspaceMeta} from './workspace-routes.js';
import {FileService} from '../../../packages/domain/file-service.js';

const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},bool={type:'boolean'},version={type:'integer',minimum:1,maximum:2147483647},instant={type:'string',minLength:20,maxLength:40};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
export async function workRoutes(app:FastifyInstance,commands:CommandService) {
  const work=new WorkService(commands),variations=new VariationService(commands);
  const files=new FileService(commands);
  function post<B>(path:string,body:unknown,handler:(token:string,meta:WorkspaceCommand,id:string,body:B)=>Promise<unknown>) {
    app.post<{Params:{id:string};Body:B}>('/api/v1/workspaces/:id/'+path,{schema:{params,body}},req=>handler(token(req),workspaceMeta(req),req.params.id,req.body as B));
  }
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/work',{schema:{params}},req=>work.detail(token(req),req.params.id));
  post('work/start',schema({mode:{enum:['known','unknown']},completedBy:instant,reason:text,confirmed:bool},['mode','confirmed']),work.start.bind(work));
  post('work/estimate',schema({completedBy:instant}),work.initialEstimate.bind(work));
  post('work/estimate/extend',schema({dueAt:instant,reason:text}),work.extendEstimate.bind(work));
  post('work/update',schema({note:text,occurredAt:instant,fileIds:{type:'array',items:uuid,maxItems:10,uniqueItems:true}},['note','fileIds']),work.update.bind(work));
  post('work/uploads',schema({mediaType:{enum:['image/jpeg','image/png','application/pdf']},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}}),files.workEvidenceIntent.bind(files));
  post('work/interrupt',schema({reason:text,affectedWork:text}),work.interrupt.bind(work));
  post('work/verdict',schema({outcome:{enum:['resume','follow_up']},reason:text,safeAndFeasible:bool,nextAction:text,followUpAt:instant,ownerRole:{enum:['cm','mcst','contractor','admin']}},['outcome','reason','safeAndFeasible']),work.verdict.bind(work));
  post('work/notice',schema({taskId:uuid,outcome:{enum:['okay','intervention']},reason:text},['taskId','outcome']),work.notice.bind(work));
  const proposal=schema({reason:text,scope:text,newTotalSgd:{type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'},timing:{enum:['unchanged','changed']},targetAt:instant,timingReason:text,canContinueOriginal:bool,canContinueApproved:bool},['reason','timing','canContinueOriginal','canContinueApproved']);
  post('variations',schema({kind:{enum:['scope_price','completion_schedule','start_schedule']},proposal,confirmed:bool,variationId:uuid,proposalVersion:version},['kind','proposal','confirmed']),variations.submit.bind(variations));
  post('variations/confirm',schema({variationId:uuid,proposalVersion:version,confirmed:bool}),variations.confirm.bind(variations));
  post('variations/decide',schema({variationId:uuid,proposalVersion:version,outcome:{enum:['approved','rejected','withdrawn','intervention']},confirmed:bool,reasonCode:{enum:rejectionReasons},reason:text,clearWarning:bool,warningExplanation:text},['variationId','proposalVersion','outcome','confirmed']),variations.decide.bind(variations));
}
