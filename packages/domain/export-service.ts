import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {memberships} from './access.js';
import {AppError} from '../contracts/primitives.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {audience,buildDecisionPack,packAccess,notFound} from './decision-pack.js';

export const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
interface ExportRow extends Record<string,unknown> {id:string;job_id:string;requested_by:string;membership_id:string;access_version:number;audience:unknown;snapshot:Record<string,unknown>;format:'html'|'json';source_version:number}
async function allowed(tx:Sql,a:Actor,e:ExportRow,now:Date) {
  if(e.requested_by!==a.id||e.membership_id!==a.context?.id||e.access_version!==a.accessVersion)throw notFound();
  if(!isDeepStrictEqual(await audience(tx,a,e.job_id,now),e.audience))throw notFound();
}
export async function authorizedExport(tx:Sql,a:Actor,id:string,now:Date) {
  const [e]=await tx.query<ExportRow>('SELECT * FROM decision_exports WHERE id=$1',[id]);if(!e)throw notFound();await allowed(tx,a,e,now);return e;
}
// Escape every value, including keys and JSON. No scripts, remote assets, private filenames or metadata.
const escape=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderPack(snapshot:Record<string,unknown>,format:'html'|'json'):Buffer {
  if(format==='json')return Buffer.from(JSON.stringify(snapshot,null,2));
  const render=(v:unknown):string=>{
    if(v===null||v===undefined)return '<span>Not recorded</span>';
    if(Array.isArray(v))return v.length?'<ol>'+v.map(i=>'<li>'+render(i)+'</li>').join('')+'</ol>':'<p>None recorded</p>';
    if(typeof v==='object')return '<dl>'+Object.entries(v).map(([k,x])=>'<dt>'+escape(k)+'</dt><dd>'+render(x)+'</dd>').join('')+'</dl>';
    return escape(v);
  };
  return Buffer.from('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>QuoteFix decision pack</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:850px;margin:24px auto;padding:16px;color:#17202a}h1,h2{break-after:avoid}dt{font-weight:600;margin-top:8px}dd{margin-left:18px;overflow-wrap:anywhere}li{margin-bottom:18px}section{border-top:1px solid #aaa}a{color:inherit}@media print{body{margin:0;font-size:10pt}li,dd{break-inside:auto}}</style></head><body><h1>QuoteFix decision pack</h1><p>Snapshot captured at '+escape(snapshot.capturedAt)+'. Times ending Z are UTC; Singapore time is UTC+08:00. Amounts marked cents are SGD cents. Later corrections do not rewrite this snapshot.</p>'+Object.entries(snapshot).map(([k,v])=>'<section><h2>'+escape(k)+'</h2>'+render(v)+'</section>').join('')+'</body></html>');
}
export async function generateExport(tx:Sql,id:string,now:Date) {
  const [e]=await tx.query<ExportRow>('SELECT * FROM decision_exports WHERE id=$1',[id]);if(!e)throw new Error('EXPORT_MISSING');
  const [u]=await tx.query('SELECT id,name,email,access_version,active,email_verified FROM users WHERE id=$1',[e.requested_by]);
  const all=u?await memberships(tx,String(u.id)):[],context=all.find(m=>m.id===e.membership_id);
  if(!u?.active||!u.email_verified||!context)throw new Error('EXPORT_ACCESS_REVOKED');
  const a:Actor={id:String(u.id),name:String(u.name),email:String(u.email),accessVersion:Number(u.access_version),memberships:all,context,csrf:'',sessionHash:''};
  try{await allowed(tx,a,e,now);}catch(error){if(error instanceof AppError)throw new Error('EXPORT_ACCESS_REVOKED');throw error;}
  const bytes=renderPack(e.snapshot,e.format);
  await tx.query('INSERT INTO export_results VALUES($1,$2,$3,$4,$5) ON CONFLICT(export_id) DO NOTHING',[e.id,bytes,hash(bytes),e.format==='html'?'text/html; charset=utf-8':'application/json',now.toISOString()]);
}
export class ExportService {
  constructor(readonly commands:CommandService){}
  request(token:string,meta:WorkspaceCommand,id:string,body:{format:'html'|'json'}) {
    return this.commands.run(token,meta,'export.request',{id,...body},async(tx,a)=>{await packAccess(tx,a,id,this.commands.now());},async(tx,a)=>{
      if(!['html','json'].includes(body.format))throw new AppError(422,'FIELD_VALIDATION','Choose HTML or JSON');
      const now=this.commands.now(),j=await packAccess(tx,a,id,now);requireVersion(Number(j.version),meta.expectedVersion);
      const exportId=randomUUID(),scope=await audience(tx,a,id,now),snapshot=await buildDecisionPack(tx,a,id,now);
      await tx.query('INSERT INTO decision_exports VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[exportId,id,a.id,a.context!.id,a.accessVersion,scope,j.version,body.format,snapshot,now.toISOString()]);
      await enqueue(tx,'export.generate',exportId,{},now);await audit(tx,a,'export.request',exportId,null,{jobId:id,sourceVersion:j.version,format:body.format},meta.requestId,now);
      return {exportId,jobId:id,sourceVersion:j.version,status:'queued'};
    });
  }
  async withExport<T>(token:string,id:string,fn:(tx:Sql,a:Actor,e:ExportRow)=>Promise<T>) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const a=await this.commands.identity.actor(token,tx),[e]=await tx.query<ExportRow>('SELECT * FROM decision_exports WHERE id=$1',[id]);
      if(!e)throw notFound();await allowed(tx,a,e,this.commands.now());return fn(tx,a,e);
    });
  }
  async list(token:string,id:string) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx);await packAccess(tx,a,id,this.commands.now());
      const result=[];for(const e of await tx.query<ExportRow>('SELECT * FROM decision_exports WHERE job_id=$1 AND requested_by=$2 ORDER BY requested_at DESC,id',[id,a.id]))try {
        await allowed(tx,a,e,this.commands.now());result.push(await this.status(tx,e));
      }catch(error){if(!(error instanceof AppError&&error.status===404))throw error;}return {exports:result};
    });
  }
  private async status(tx:Sql,e:ExportRow) {
    const [r]=await tx.query('SELECT checksum,generated_at FROM export_results WHERE export_id=$1',[e.id]);
    const [o]=await tx.query("SELECT attempts,failed_at,last_error_code FROM outbox WHERE resource_id=$1 AND kind='export.generate'",[e.id]);
    const [j]=await tx.query('SELECT version FROM job_records WHERE id=$1',[e.job_id]);
    const records=(e.snapshot.records??{}) as Record<string,unknown>,financial=(records.financialCorrections??[]) as {version:number}[];
    const corrections=await tx.query('SELECT version,source,recorded_at FROM financial_confirmations WHERE job_id=$1 AND version>$2 ORDER BY version',[e.job_id,financial.at(-1)?.version??0]);
    const own=(e.audience as {organisationId?:string;role:string}).role==='contractor'?(e.audience as {organisationId:string}).organisationId:null;
    const [q]=await tx.query('SELECT count(*) AS count FROM quote_versions v JOIN quotes q ON q.id=v.quote_id WHERE q.job_id=$1 AND ($2::uuid IS NULL OR q.organisation_id=$2)',[e.job_id,own]);
    const [w]=await tx.query("SELECT count(*) AS count FROM work_events WHERE job_id=$1 AND kind NOT LIKE 'support.%'",[e.job_id]);
    const changedQuoteCount=Number(q!.count)!==(e.snapshot.quotes as unknown[]).length;
    const changedWorkCount=Array.isArray(records.workEvents)&&Number(w!.count)!==records.workEvents.length;
    return {exportId:e.id,jobId:e.job_id,format:e.format,sourceVersion:e.source_version,currentVersion:j!.version,hasLaterChanges:j!.version!==e.source_version||corrections.length>0||changedQuoteCount||changedWorkCount,corrections,
      capturedAt:e.requested_at,status:r?'ready':o?.failed_at?'failed':'queued',checksum:r?.checksum??null};
  }
  detail(token:string,id:string){return this.withExport(token,id,(tx,_a,e)=>this.status(tx,e));}
  async grant(token:string,id:string,csrf:string) {
    return this.withExport(token,id,async(tx,a,e)=>{
      if(a.csrf!==csrf)throw new AppError(403,'CSRF_INVALID','Refresh and try again');
      if(!(await tx.query('SELECT export_id FROM export_results WHERE export_id=$1',[id])).length)throw new AppError(409,'EXPORT_NOT_READY','Export is still being generated');
      const grant=randomBytes(32).toString('base64url'),expiresAt=new Date(this.commands.now().getTime()+15*60000).toISOString();
      await tx.query('INSERT INTO export_grants(token_hash,export_id,user_id,expires_at) VALUES($1,$2,$3,$4)',[hash(grant),id,a.id,expiresAt]);
      return {url:'/api/v1/exports/'+id+'/download?grant='+grant,expiresAt,format:e.format};
    });
  }
  async revoke(token:string,id:string,csrf:string) {return this.withExport(token,id,async(tx,a)=>{
    if(a.csrf!==csrf)throw new AppError(403,'CSRF_INVALID','Refresh and try again');
    await tx.query('UPDATE export_grants SET revoked_at=$1 WHERE export_id=$2 AND user_id=$3 AND revoked_at IS NULL',[this.commands.now().toISOString(),id,a.id]);return {revoked:true};
  });}
  async download(token:string,id:string,grant:string) {return this.withExport(token,id,async(tx,a)=>{
    const [g]=await tx.query('SELECT token_hash FROM export_grants WHERE token_hash=$1 AND export_id=$2 AND user_id=$3 AND revoked_at IS NULL AND expires_at>$4',[hash(grant),id,a.id,this.commands.now().toISOString()]);
    if(!g)throw notFound();const [r]=await tx.query('SELECT * FROM export_results WHERE export_id=$1',[id]);if(!r)throw notFound();return r;
  });}
}
