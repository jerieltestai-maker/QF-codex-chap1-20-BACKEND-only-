import {createHash,randomUUID} from 'node:crypto';
import {AppError} from '../contracts/primitives.js';
import type {Database,Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import type {IdentityService} from './identity-service.js';

export interface WorkspaceCommand {
  operationId:string; accessVersion:number; expectedVersion:number; csrf:string; requestId:string;
}
function canonical(value:unknown):string {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b))
    .map(([key,v])=>JSON.stringify(key)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
export async function audit(tx:Sql, actor:Actor, action:string, resourceId:string,
  before:unknown,after:unknown,requestId:string,now:Date,reason?:string) {
  await tx.query(`INSERT INTO audit_events(id,actor_id,actor_role,action,resource_id,before_value,after_value,reason,request_id,recorded_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [randomUUID(),actor.id,actor.context!.role,action,resourceId,before,after,reason??null,requestId,now.toISOString()]);
}
export async function enqueue(tx:Sql,kind:string,resourceId:string,payload:unknown,now:Date) {
  await tx.query('INSERT INTO outbox(id,kind,resource_id,payload,created_at,available_at) VALUES($1,$2,$3,$4,$5,$5)',
    [randomUUID(),kind,resourceId,payload,now.toISOString()]);
}
export class CommandService {
  constructor(readonly db:Database,readonly identity:IdentityService,readonly now:()=>Date=()=>new Date(),readonly observe?:(tx:Sql,now:Date,intent:string,body:unknown,phase:'before'|'after')=>Promise<void>) {}
  async run(token:string,meta:WorkspaceCommand,intent:string,body:unknown,
    authorize:(tx:Sql,actor:Actor)=>Promise<void>,work:(tx:Sql,actor:Actor)=>Promise<Record<string,unknown>>) {
    return this.db.transaction(async tx=>{
      // Shared with identity changes so membership/context revocation cannot race a decision.
      // Bounded local monolith: replace with ordered scoped locks before high-throughput deployment.
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      if (actor.csrf!==meta.csrf) throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      await authorize(tx,actor); // Always recheck access, including cached outcomes.
      const fingerprint=createHash('sha256').update(canonical({body,expectedVersion:meta.expectedVersion})).digest('hex');
      const [receipt]=await tx.query('SELECT intent,fingerprint,result FROM command_receipts WHERE actor_id=$1 AND operation_id=$2',[actor.id,meta.operationId]);
      if (receipt) {
        if (receipt.intent!==intent || receipt.fingerprint!==fingerprint)
          throw new AppError(409,'IDEMPOTENCY_KEY_REUSED','This operation identity has different input');
        return receipt.result as Record<string,unknown>;
      }
      if (actor.accessVersion!==meta.accessVersion) throw new AppError(412,'ACCESS_CHANGED','Access changed. Refresh before submitting');
      if(this.observe)await this.observe(tx,this.now(),intent,body,'before');
      const result=await work(tx,actor);
      if(this.observe)await this.observe(tx,this.now(),intent,body,'after');
      await tx.query('INSERT INTO command_receipts(actor_id,operation_id,intent,fingerprint,result,created_at) VALUES($1,$2,$3,$4,$5,$6)',
        [actor.id,meta.operationId,intent,fingerprint,result,this.now().toISOString()]);
      return result;
    });
  }
  async lookup(token:string,operationId:string,authorize:(tx:Sql,actor:Actor,result:Record<string,unknown>,intent:string)=>Promise<void>) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      const [receipt]=await tx.query('SELECT result,intent FROM command_receipts WHERE actor_id=$1 AND operation_id=$2',[actor.id,operationId]);
      if (!receipt) throw new AppError(404,'NOT_FOUND','Submission unavailable');
      const result=receipt.result as Record<string,unknown>;
      await authorize(tx,actor,result,String(receipt.intent));
      return result;
    });
  }
}
export function requireVersion(actual:number,expected:number) {
  if (actual!==expected) throw new AppError(412,'VERSION_CHANGED','This record changed. Keep your draft and review the latest version');
}
