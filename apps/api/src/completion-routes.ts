import type {FastifyInstance,FastifyRequest} from 'fastify';
import {AppError} from '../../../packages/contracts/primitives.js';
import type {CommandService,WorkspaceCommand} from '../../../packages/domain/commands.js';
import {CompletionService} from '../../../packages/domain/completion-service.js';
import {PaymentService} from '../../../packages/domain/payment-service.js';
import {FileService} from '../../../packages/domain/file-service.js';
import {workspaceMeta} from './workspace-routes.js';
const uuid={type:'string',format:'uuid'},text={type:'string',maxLength:10000},bool={type:'boolean'},version={type:'integer',minimum:1,maximum:2147483647},money={type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'},date={type:'string',minLength:10,maxLength:40};
const schema=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const params=schema({id:uuid});
const token=(req:FastifyRequest)=>{if(!req.cookies.qf_session)throw new AppError(401,'SESSION_REQUIRED','Sign in to continue');return req.cookies.qf_session;};
export async function completionRoutes(app:FastifyInstance,commands:CommandService) {
  const c=new CompletionService(commands),p=new PaymentService(commands),files=new FileService(commands);
  function post<B>(path:string,body:unknown,handler:(token:string,meta:WorkspaceCommand,id:string,body:B)=>Promise<unknown>) {
    app.post<{Params:{id:string};Body:B}>('/api/v1/workspaces/:id/'+path,{schema:{params,body}},req=>handler(token(req),workspaceMeta(req),req.params.id,req.body as B));
  }
  app.get<{Params:{id:string}}>('/api/v1/workspaces/:id/completion',{schema:{params}},req=>p.detail(token(req),req.params.id));
  post('completion/uploads',schema({purpose:{enum:['invoice','payment_proof']},mediaType:{enum:['application/pdf','image/png','image/jpeg']},byteSize:{type:'integer',minimum:1,maximum:10485760},checksum:{type:'string',pattern:'^[a-f0-9]{64}$'}}),files.completionIntent.bind(files));
  post('completion/submit',schema({invoiceFileId:uuid,amountSgd:money,explanation:text,completedAt:date,evidenceIds:{type:'array',items:uuid,maxItems:10,uniqueItems:true},confirmed:bool,originatingRound:version},['invoiceFileId','amountSgd','completedAt','confirmed']),c.submit.bind(c));
  post('completion/inspect',schema({round:version,outcome:{enum:['accepted','unsatisfactory']},checklist:schema({scopeReviewed:bool,issuesReviewed:bool,evidenceReviewed:bool,invoiceReviewed:bool}),findings:text,satisfactory:bool,confirmed:bool}),c.inspect.bind(c));
  post('completion/respond',schema({round:version,response:text}),c.respond.bind(c));
  post('completion/invoice',schema({invoiceVersion:version,invoiceFileId:uuid,amountSgd:money,explanation:text}),c.reviseInvoice.bind(c));
  post('payments/confirm-invoice',schema({invoiceVersion:version,amountSgd:money,confirmed:bool}),p.confirmInvoice.bind(p));
  post('payments/transfer',schema({invoiceVersion:version,financialVersion:version,proofId:uuid,amountSgd:money,transferDate:date,rationale:text,reference:{type:'string',maxLength:200},completedTransfer:bool,confirmed:bool,duplicateAcknowledged:bool},['invoiceVersion','proofId','amountSgd','transferDate','completedTransfer','confirmed']),p.transfer.bind(p));
  post('payments/receipt',schema({transferId:uuid,amountSgd:money,receiptDate:date,confirmed:bool}),p.receipt.bind(p));
  post('payments/issue',schema({transferId:uuid,description:text},['description']),p.issue.bind(p));
  post('payments/resolve-balance',schema({supportId:uuid,reason:text,executionEvidence:text}),p.resolveBalance.bind(p));
  post('payments/resolve',schema({transferId:uuid,outcome:{enum:['pending','void','actual']},reason:text,executionEvidence:text,receiptDate:date,nextAction:text,followUpAt:date},['transferId','outcome','reason','executionEvidence']),p.resolve.bind(p));
  post('payments/progress',schema({explanation:text,nextUpdateAt:date},['explanation']),p.progress.bind(p));
  post('payments/understood',schema({transferId:uuid}),p.understood.bind(p));
}
