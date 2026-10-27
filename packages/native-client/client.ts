export interface NativeSession {token:string;csrfToken:string;expiresAt:string}
export interface NativeContext {user:{id:string;name:string};accessVersion:number;csrfToken:string;context:{id:string;role:string;estate_id:string|null;organisation_id:string|null}|null;memberships:{id:string;role:string;estate_id:string|null;organisation_id:string|null}[]}
export class NativeError extends Error {constructor(message:string,readonly status:number,readonly code:string){super(message);}}
export type Transport=(url:string,init:RequestInit)=>Promise<{ok:boolean;status:number;json():Promise<unknown>}>;
export class NativeClient {
  private epoch=0;
  private active=new Set<AbortController>();
  constructor(readonly baseUrl:string,private session:NativeSession|undefined,readonly transport:Transport=fetch) {
    const url=new URL(baseUrl);
    if(url.origin!==baseUrl||(!['https:'].includes(url.protocol)&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))))throw new Error('Use HTTPS or an explicit loopback development API');
  }
  replaceSession(session:NativeSession|undefined){this.cancelResponses();this.session=session;}
  get generation(){return this.epoch;}
  cancelResponses(){this.epoch++;for(const controller of this.active)controller.abort();this.active.clear();}
  async request<T>(path:string,body?:unknown,headers:Record<string,string>={}):Promise<T> {
    if(!/^[a-zA-Z0-9/?=&._%-]+$/.test(path)||path.includes('..')||path.startsWith('/'))throw new Error('Invalid API path');
    const epoch=this.epoch,session=this.session;
    const controller=new AbortController();this.active.add(controller);const timeout=setTimeout(()=>controller.abort(),15000);
    const stop=()=>{clearTimeout(timeout);this.active.delete(controller);};
    let response:Awaited<ReturnType<Transport>>;
    try {response=await this.transport(this.baseUrl+'/api/v1/'+path,{method:body===undefined?'GET':'POST',credentials:'omit',signal:controller.signal,headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token,'X-CSRF-Token':session.csrfToken}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
    catch {stop();if(epoch!==this.epoch)throw new NativeError('Account changed. Refresh before continuing.',409,'ACCOUNT_CHANGED');throw new NativeError(body===undefined?'Connect and refresh to continue.':'Checking submission. Reconnect and check the original operation before trying again.',0,body===undefined?'OFFLINE':'OUTCOME_UNKNOWN');}
    if(epoch!==this.epoch){stop();throw new NativeError('Account changed. Refresh before continuing.',409,'ACCOUNT_CHANGED');}
    let value:unknown;try{value=await response.json();}catch{throw new NativeError('Unable to read the response. Check the original submission.',response.status,'OUTCOME_UNKNOWN');}finally{stop();}
    if(epoch!==this.epoch)throw new NativeError('Account changed. Refresh before continuing.',409,'ACCOUNT_CHANGED');
    if(!response.ok){if(response.status>=500&&body!==undefined)throw new NativeError('Checking submission. Check the original operation before retrying.',response.status,'OUTCOME_UNKNOWN');const error=(value as {error?:{message?:string;code?:string}})?.error;throw new NativeError(error?.message??'Request unavailable',response.status,error?.code??'REQUEST_FAILED');}
    return value as T;
  }
  context(){return this.request<NativeContext>('me/context');}
  async all<T>(path:string,field='items'):Promise<T[]> {
    const epoch=this.epoch,items:T[]=[];
    for(let offset=0;;offset+=100) {
      if(epoch!==this.epoch)throw new NativeError('Account changed. Refresh before continuing.',409,'ACCOUNT_CHANGED');
      const result=await this.request<Record<string,T[]>>(path+(path.includes('?')?'&':'?')+'limit=100&offset='+offset);
      const page=result[field];if(!Array.isArray(page))throw new NativeError('Refresh this list before continuing.',502,'INVALID_LIST');
      items.push(...page);if(page.length<100)return items;
    }
  }
  async command<T>(path:string,body:unknown,operationId:string,reviewedVersion:number,accessVersion:number,owner?:{accountId:string;contextId:string}) {
    // This refresh is a mandatory live boundary. A stored draft is never an offline command queue.
    const epoch=this.epoch,active=await this.request<{accountId:string;contextId:string|null}>('me/refresh-context');
    if(epoch!==this.epoch)throw new NativeError('Account changed. Review before submitting.',409,'ACCOUNT_CHANGED');
    if(owner&&(owner.accountId!==active.accountId||owner.contextId!==active.contextId))throw new NativeError('Account or context changed. Review before submitting.',409,'ACCOUNT_CHANGED');
    return this.request<T>(path,body,{'Idempotency-Key':operationId,'If-Match':'"record-'+reviewedVersion+'"','X-Access-Version':String(accessVersion)});
  }
  recover<T>(operationId:string){return this.request<T>('operations/'+encodeURIComponent(operationId));}
}

export function encodeBase64(bytes:Uint8Array) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let result='';
  for(let i=0;i<bytes.length;i+=3){const a=bytes[i]!,b=bytes[i+1],c=bytes[i+2];result+=alphabet[a>>2]!+alphabet[((a&3)<<4)|((b??0)>>4)]!+(b===undefined?'=':alphabet[((b&15)<<2)|((c??0)>>6)]!)+(c===undefined?'=':alphabet[c&63]!);}
  return result;
}
export const base64url=(bytes:Uint8Array)=>encodeBase64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');

export interface PendingUpload {
  id:string;accountId:string;contextId:string;jobId:string;purpose:'evidence'|'invoice'|'quote_pdf';localUri:string;
  mediaType:string;byteSize:number;checksum:string;intentPath:string;intentBody:Record<string,unknown>;baseVersion:number;
  intentOperationId:string;finalizeOperationId:string;uploadId?:string;state:'device-only'|'transferring'|'verifying'|'ready'|'rejected';
  draftId?:string;
  consumption?:{kind:'attachments'|'work_attachments';operations:Record<string,string>;note:string;version:number;fileIds:string[]};
  consumed?:boolean;
}
export interface UploadStatus {state:PendingUpload['state'];chunks:{byte_offset:number;size:number}[];objects:{id:string;variant:string}[];rejectionCode?:string}
export async function resumeUpload(client:NativeClient,context:NativeContext,record:PendingUpload,
  bytes:Uint8Array,checksum:string,save:(record:PendingUpload)=>Promise<void>) {
  const generation=client.generation,current=()=>{if(generation!==client.generation)throw new NativeError('Account changed. Resume with the original owner.',409,'ACCOUNT_CHANGED');};
  const owner={accountId:context.user.id,contextId:context.context?.id??''};
  if(record.accountId!==context.user.id||record.contextId!==context.context?.id)throw new NativeError('This file belongs to another account or context.',403,'ACCOUNT_CHANGED');
  if(bytes.length!==record.byteSize||checksum!==record.checksum)throw new NativeError('The local file changed or is unavailable. Capture it again.',422,'LOCAL_FILE_CHANGED');
  if(!record.uploadId) {
    const result=await client.command<{uploadId:string}>(record.intentPath,record.intentBody,record.intentOperationId,record.baseVersion,context.accessVersion,owner);
    current();record={...record,uploadId:result.uploadId,state:'transferring'};await save(record);current();
  }
  const id=record.uploadId!;let status=await client.request<UploadStatus>('uploads/'+id);
  if(status.state==='transferring') {
    await client.request('uploads/'+id+'/renew',{});
    for(let offset=0;offset<bytes.length;offset+=262144) {
      current();
      const chunk=bytes.subarray(offset,Math.min(offset+262144,bytes.length));
      if(!status.chunks.some(c=>c.byte_offset===offset&&c.size===chunk.length))await client.request('uploads/'+id+'/chunks',{offset,bytes:encodeBase64(chunk)});
    }
    current();await client.command('uploads/'+id+'/finalize',{},record.finalizeOperationId,0,context.accessVersion,owner);
    status=await client.request<UploadStatus>('uploads/'+id);
  }
  current();record={...record,state:status.state};await save(record);current();
  return {record,status}; // Ready bytes never declare work complete or publish a request.
}

export async function consumeEvidence(client:NativeClient,context:NativeContext,record:PendingUpload,status:UploadStatus,
  review:{note:string;workVersion:number;newOperationId:()=>string},save:(record:PendingUpload)=>Promise<void>) {
  const generation=client.generation;
  const current=()=>{if(client.generation!==generation)throw new NativeError('Account changed. Review this capture again.',409,'ACCOUNT_CHANGED');};
  if(record.accountId!==context.user.id||record.contextId!==context.context?.id)throw new NativeError('This capture belongs to another account or context.',403,'ACCOUNT_CHANGED');
  if(record.consumed)return record;
  if(status.state!=='ready'||record.purpose!=='evidence')throw new NativeError('Wait for verified repair evidence before attaching it.',422,'FILE_NOT_READY');
  if(!record.consumption) {
    const contractor=context.context.role==='contractor',fileIds=status.objects.map(o=>o.id);
    if(!fileIds.length)throw new NativeError('Review the ready file before attaching it.',422,'REVIEW_REQUIRED');
    const operations=Object.fromEntries(fileIds.map(id=>[id,review.newOperationId()]));
    record={...record,consumption:{kind:contractor?'work_attachments':'attachments',operations,note:review.note.trim(),version:review.workVersion,fileIds}};
    await save(record); // Freeze every exact body/key before the first possible effect.
  }
  current();
  const c=record.consumption!;
  for(const id of c.fileIds){current();await client.command('workspaces/'+record.jobId+(c.kind==='work_attachments'?'/work/attachments':'/attachments'),{fileId:id,...(c.kind==='work_attachments'?{note:c.note}:{})},c.operations[id]!,0,context.accessVersion,{accountId:context.user.id,contextId:context.context!.id});}
  current();
  record={...record,consumed:true};await save(record);
  return record; // Caller removes the local file/queue only after durable consumption.
}
