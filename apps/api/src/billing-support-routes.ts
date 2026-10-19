import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService,WorkspaceCommand} from '../../../packages/domain/commands.js';
import {BillingService} from '../../../packages/domain/billing-service.js';
import {CancellationService} from '../../../packages/domain/cancellation-service.js';
import {SupportService} from '../../../packages/domain/support-service.js';
import {CorrectionService} from '../../../packages/domain/correction-service.js';
import {FileService} from '../../../packages/domain/file-service.js';
import {supportCategories} from '../../../packages/domain/support-core.js';
import {correctionTargets} from '../../../packages/domain/correction-service.js';
import {workspaceMeta} from './workspace-routes.js';
const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},bool={type:'boolean'},version={type:'integer',minimum:1,maximum:2147483647},money={type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'},date={type:'string',minLength:10,maxLength:40};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required}),params=schema({id:uuid});
const ids={type:'array',items:uuid,maxItems:20,uniqueItems:true};
const upload=schema({mediaType:{enum:['application/pdf','image/png','image/jpeg']},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
export async function billingSupportRoutes(app:FastifyInstance,commands:CommandService) {
  const billing=new BillingService(commands),cancel=new CancellationService(commands),support=new SupportService(commands),correction=new CorrectionService(commands),files=new FileService(commands);
  function post<B>(path:string,body:unknown,handler:(token:string,meta:WorkspaceCommand,id:string,body:B)=>Promise<unknown>) {
    app.post<{Params:{id:string};Body:B}>('/api/v1/'+path,{schema:{params,body}},req=>handler(token(req),workspaceMeta(req),req.params.id,req.body as B));
  }
  app.get<{Params:{id:string}}>('/api/v1/organisations/:id/billing',{schema:{params}},req=>billing.statement(token(req),req.params.id));
  for(const [scope,estate] of [['organisations',false],['estates',true]] as const) {
    app.get<{Params:{id:string}}>(`/api/v1/${scope}/:id/cases`,{schema:{params}},req=>support.accountList(token(req),req.params.id,estate));
    post(`${scope}/:id/cases`,schema({description:text}),(t,m,id,b:{description:string})=>support.openAccount(t,m,id,b,estate));
  }
  post('organisations/:id/billing/report',schema({amountSgd:money,paidDate:date,proofId:uuid,context:text},['amountSgd','paidDate','context']),billing.report.bind(billing));
  post('organisations/:id/billing/verify',schema({reportId:uuid,amountSgd:money,receivedDate:date,reference:text,evidence:text,allocations:{type:'array',maxItems:200,items:schema({debitId:uuid,amountSgd:money})}}),billing.verify.bind(billing));
  post('organisations/:id/billing/refund',schema({creditId:uuid,amountSgd:money,refundedDate:date,reference:text,evidence:text}),billing.refund.bind(billing));
  post('organisations/:id/billing/uploads',upload,(t,m,id,b:Parameters<FileService['privateIntent']>[3])=>files.privateIntent(t,m,id,b));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/cancellation',{schema:{params}},req=>cancel.detail(token(req),req.params.id));
  post('workspaces/:id/cancel',schema({reason:text,confirmed:bool}),cancel.cancel.bind(cancel));
  post('workspaces/:id/cancellation/respond',schema({cancellationId:uuid,outcome:{enum:['okay','claim']},declaration:text,description:text},['cancellationId','outcome']),cancel.respond.bind(cancel));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/cases',{schema:{params}},req=>support.list(token(req),req.params.id));
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/support-subjects',{schema:{params}},req=>support.subjects(token(req),req.params.id));
  post('workspaces/:id/cases',schema({description:text,category:{enum:supportCategories},privacy:{enum:['ordinary','confidential']},subjectUserIds:ids,subjectOrganisationIds:ids}),support.open.bind(support));
  app.get<{Params:{id:string}}>('/api/v1/support/:id',{schema:{params}},req=>support.detail(token(req),req.params.id));
  post('support/:id/uploads',upload,(t,m,id,b:Parameters<FileService['privateIntent']>[3])=>files.privateIntent(t,m,id,b,true));
  post('support/:id/request-evidence',schema({request:text,respondingRole:{enum:['cm','mcst','contractor']},respondingUserId:uuid,followUpAt:date},['request','respondingRole','respondingUserId']),support.requestEvidence.bind(support));
  post('support/:id/evidence',schema({explanation:text,fileIds:ids}),support.evidence.bind(support));
  post('support/:id/follow-up',schema({nextAction:text,followUpAt:date,externalReference:text,permittedSummary:text},['nextAction','followUpAt']),support.followUp.bind(support));
  post('support/:id/grant',schema({userId:uuid,reason:text}),support.grant.bind(support));
  post('support/:id/resolve',schema({outcome:text,reason:text,supersedeOutstanding:bool,obligations:{type:'array',maxItems:20,items:schema({kind:{enum:['repair','payment','refund','action']},ownerRole:{enum:['cm','mcst','contractor','admin']},description:text,reuseObligationId:uuid,followUpAt:date},['kind','ownerRole','description'])}},['outcome','reason','obligations']),support.resolve.bind(support));
  post('support/:id/acknowledge',schema({resolutionVersion:version,confirmed:bool}),support.acknowledge.bind(support));
  post('support/:id/settlements',schema({amountSgd:money,reason:text}),support.proposeSettlement.bind(support));
  post('support/:id/confirm-settlement',schema({proposalId:uuid,proposalVersion:version,amountSgd:money,confirmed:bool,financialOverride:bool,reason:text}),support.confirmSettlement.bind(support));
  post('support/:id/verify',schema({obligationId:uuid,evidence:text}),support.verify.bind(support));
  post('support/:id/finish',schema({reason:text}),support.finish.bind(support));
  post('support/:id/dispute-execution',schema({description:text}),support.dispute.bind(support));
  post('support/:id/resume-execution',schema({reason:text,nextAction:text,followUpAt:date}),support.resumeExecution.bind(support));
  post('support/:id/estate-refund',schema({amountSgd:money,refundedDate:date,reference:text,evidence:text}),support.refundEstate.bind(support));
  post('support/:id/repair',schema({obligationId:uuid,completedAt:date,explanation:text,evidenceIds:ids,confirmed:bool}),support.submitRepair.bind(support));
  post('support/:id/inspect-repair',schema({obligationId:uuid,round:version,outcome:{enum:['accepted','unsatisfactory']},findings:text,checklist:schema({scopeReviewed:bool,issuesReviewed:bool,evidenceReviewed:bool,invoiceReviewed:bool}),satisfactory:bool,confirmed:bool}),support.inspectRepair.bind(support));
  post('support/:id/make-safe',schema({description:text,evidenceIds:ids}),support.makeSafe.bind(support));
  post('workspaces/:id/correction/preview',schema({target:{enum:correctionTargets}}),correction.preview.bind(correction));
  post('workspaces/:id/correction/execute',schema({previewId:uuid,reason:text,feasibleConfirmed:bool,followUpAt:date},['previewId','reason','feasibleConfirmed']),correction.execute.bind(correction));
}
