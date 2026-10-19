import {randomUUID} from 'node:crypto';
import type {Database} from '../infrastructure/database.js';
import type {IdentityService} from './identity-service.js';
import {AppError} from '../contracts/primitives.js';
import {adminOnly} from './verification-service.js';
import {authorizedSupport} from './workspace-service.js';
import {createAttention} from './verification-service.js';

// Independent committed security evidence survives a rejected/rolled-back command.
// Request bodies, cookies, URLs, grants, allegation contents and original filenames are never recorded.
export async function recordProtectedAccess(db:Database,identity:IdentityService,token:string|undefined,route:string,params:Record<string,string>,status:number) {
  if(!params?.id||!(status>=200&&status<300||[401,403,404].includes(status)))return;
  let type:string|undefined;
  if(route==='/api/v1/workspaces/:id/comparison'||route==='/api/v1/workspaces/:id/selections')type='sealed_quotes';
  else if(route.includes('/passports/')||route.includes('/passport'))type='masked_identity';
  else if(route==='/api/v1/files/:id')type='original_file';
  else if(route.startsWith('/api/v1/support/:id'))type='confidential_case';
  if(!type)return;
  await db.transaction(async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(734130)');
    let actor;try{if(token)actor=await identity.actor(token,tx);}catch(e){if(!(e instanceof AppError))throw e;}
    let jobId:string|null=null,supportId:string|null=null,projection='private';
    if(type==='sealed_quotes'||type==='masked_identity') {const [j]=await tx.query('SELECT j.id,e.contractor_identities_visible FROM job_records j JOIN estates e ON e.id=j.estate_id WHERE j.id=$1',[params.id]);jobId=j?String(j.id):null;projection=actor?.context?.role==='cm'&&!j?.contractor_identities_visible?'masked':'permitted_identity';}
    if(type==='original_file') {
      const [f]=await tx.query('SELECT f.variant,u.job_id,u.support_id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE f.id=$1',[params.id]);
      if(f&&f.variant!=='original')return;jobId=f?.job_id?String(f.job_id):null;supportId=f?.support_id?String(f.support_id):null;
    }
    if(type==='confidential_case') {const [s]=await tx.query('SELECT id,job_id,privacy FROM support_requests WHERE id=$1',[params.id]);if(s&&s.privacy!=='confidential')return;supportId=s?String(s.id):null;jobId=s?.job_id?String(s.job_id):null;}
    const eventId=randomUUID(),outcome=status>=200&&status<300?'allowed':'denied';
    await tx.query('INSERT INTO protected_access_events VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[eventId,actor?.id??null,actor?.context?.role??null,jobId,params.id,type,outcome,identity.now().toISOString(),supportId,projection]);
    if(outcome==='denied') {
      const [existing]=await tx.query(`SELECT t.id FROM tasks t JOIN protected_access_events e ON e.id=t.resource_id WHERE t.kind='integrity.access-denied' AND t.status='open' AND e.resource_id=$1 AND e.actor_id IS NOT DISTINCT FROM $2::uuid`,[params.id,actor?.id??null]);
      if(!existing) {
        const taskId=await createAttention(tx,identity.now(),{kind:'integrity.access-denied',resourceId:eventId,action:'A protected access request was refused. Review the private security event; this is not a misconduct finding.'});
        if(supportId)await tx.query('UPDATE tasks SET support_id=$1 WHERE id=$2',[supportId,taskId]);
      }
    }
  });
}
export async function accessEvents(db:Database,identity:IdentityService,token:string,jobId?:string,offset=0,limit=25) {
  return db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await identity.actor(token,tx);adminOnly(a);
    const rows=await tx.query('SELECT e.*,u.name AS actor_name FROM protected_access_events e LEFT JOIN users u ON u.id=e.actor_id WHERE ($1::uuid IS NULL OR e.job_id=$1) ORDER BY e.recorded_at DESC,e.id',[jobId??null]),visible=[];
    for(const row of rows) {if(row.support_id)try{await authorizedSupport(tx,a,String(row.support_id));}catch(e){if(e instanceof AppError&&e.status===404)continue;throw e;}visible.push(row);}
    return {items:visible.slice(offset,offset+limit),total:visible.length,offset,limit,interpretation:'Allowed access is an authorised projection, not evidence of misconduct. Denied access records an access-control outcome, not intent.'};
  });
}
