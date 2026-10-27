import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {canRead,type Actor} from './access.js';
import {CommandService,audit,enqueue,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedSupport} from './workspace-service.js';
import {explicitInstant} from './calendar.js';
import {contractorIdentifiers,concealedText} from './identity-concealment.js';

export interface Task extends Record<string,unknown> {
  id:string;resource_id:string;owner_role:string;status:string;version:number;required_version:number;
  estate_id:string|null;organisation_id:string|null;support_id:string|null;
  first_issued_at:Date|string|null;acknowledged_at:Date|string|null;follow_up_at:Date|string|null;
}
export async function taskVisible(sql:Sql,actor:Actor,task:Task,inheritOperations=false):Promise<boolean> {
  if(task.responding_user_id&&task.responding_user_id!==actor.id&&actor.context?.role!=='admin')return false;
  if(actor.context?.role!==task.owner_role && actor.context?.role!=='admin'&&!(inheritOperations&&actor.context?.role==='mcst'&&task.owner_role==='cm'))return false;
  if(!canRead(actor,{...(task.estate_id?{estateId:task.estate_id}:{}),...(task.organisation_id?{organisationId:task.organisation_id}:{})}))return false;
  if(task.support_id)try{await authorizedSupport(sql,actor,task.support_id);}catch(error){if(error instanceof AppError && error.status===404)return false;throw error;}
  return true;
}
export async function authorizedTask(sql:Sql,actor:Actor,id:string):Promise<Task> {
  const [task]=await sql.query<Task>('SELECT * FROM tasks WHERE id=$1',[id]);
  if(!task || !await taskVisible(sql,actor,task))throw new AppError(404,'NOT_FOUND','Resource unavailable');
  return task;
}
export async function maskedWorkTask(sql:Sql,actor:Actor,task:Task,value:Record<string,unknown>) {
  if(actor.context?.role!=='cm')return value;
  const [w]=await sql.query(`SELECT w.organisation_id FROM work_state w JOIN job_records j ON j.id=w.job_id JOIN estates e ON e.id=j.estate_id
    WHERE e.contractor_identities_visible=false AND (w.job_id=$1 OR w.job_id=(SELECT job_id FROM variations WHERE id=$1) OR w.job_id=(SELECT job_id FROM support_requests WHERE id=$2))`,[task.resource_id,task.support_id]);
  if(!w)return value;const identifiers=await contractorIdentifiers(sql,String(w.organisation_id));
  return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,typeof v==='string'&&['action','message','next_action','resolution_evidence'].includes(key)?concealedText(v,identifiers):v]));
}
export class TaskService {
  constructor(readonly commands:CommandService) {}
  get db(){return this.commands.db;} get identity(){return this.commands.identity;} get now(){return this.commands.now;}
  async list(token:string,adminQueue=false) {
    const actor=await this.identity.actor(token);
    if(adminQueue && actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
    const rows=await this.db.query<Task>(`SELECT * FROM tasks WHERE status='open' AND
      (owner_role=$1 OR $1='admin') AND ($1='admin' OR estate_id=$2 OR organisation_id=$3) ORDER BY actionable_at,id`,
      [actor.context?.role??'',actor.context?.estate_id??null,actor.context?.organisation_id??null]);
    const tasks=[];
    for(const task of rows)if(await taskVisible(this.db,actor,task))tasks.push(await maskedWorkTask(this.db,actor,task,task));
    return {tasks,serverTime:this.now().toISOString()};
  }
  async bells(token:string) {
    const actor=await this.identity.actor(token);
    const rows=await this.db.query(`SELECT n.*,r.read_at FROM notifications n JOIN tasks t ON t.id=n.task_id
      LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=$1
      WHERE (t.owner_role=$2 OR $2='admin') AND ($2='admin' OR t.estate_id=$3 OR t.organisation_id=$4)
      ORDER BY n.issued_at DESC,n.id`,[actor.id,actor.context?.role??'',actor.context?.estate_id??null,actor.context?.organisation_id??null]);
    const notifications=[];
    for(const row of rows) {
      const [task]=await this.db.query<Task>('SELECT * FROM tasks WHERE id=$1',[row.task_id]);
      if(task&&await taskVisible(this.db,actor,task))notifications.push(await maskedWorkTask(this.db,actor,task,row));
    }
    return {notifications,unreadCount:notifications.filter(n=>!n.read_at).length,serverTime:this.now().toISOString()};
  }
  async read(token:string,csrf:string,id:string) {
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(734130)');
      const actor=await this.identity.actor(token,tx);
      if(csrf!==actor.csrf)throw new AppError(403,'CSRF_INVALID','Refresh and submit again');
      const [notice]=await tx.query('SELECT task_id FROM notifications WHERE id=$1',[id]);
      if(!notice)throw new AppError(404,'NOT_FOUND','Resource unavailable');
      await authorizedTask(tx,actor,String(notice.task_id));
      await tx.query('INSERT INTO notification_reads(notification_id,user_id,read_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,actor.id,this.now().toISOString()]);
      return {message:'Marked as read. The action is still outstanding.'};
    });
  }
  async acknowledge(token:string,meta:WorkspaceCommand,id:string,body:{nextAction:string;followUpAt:string}) {
    return this.commands.run(token,meta,'task.acknowledge',{id,...body},async(tx,actor)=>{
      if(actor.context?.role!=='admin')throw new AppError(403,'FORBIDDEN','Admin access is required');
      await authorizedTask(tx,actor,id);
    },async(tx,actor)=>{
      const task=await authorizedTask(tx,actor,id);requireVersion(task.version,meta.expectedVersion);
      if(task.status!=='open'||task.owner_role!=='admin')throw new AppError(409,'TASK_NOT_ACTIONABLE','This Admin action is no longer outstanding');
      if(task.kind==='rfq.urgent')throw new AppError(409,'COORDINATION_REQUIRED','Record the actual coordination outcome and next follow-up for this urgent RFQ');
      const nextAction=requiredText(body.nextAction),followUp=explicitInstant(body.followUpAt),now=this.now();
      if(followUp<=now)throw new AppError(422,'FIELD_VALIDATION','Next follow-up must be a future date and time');
      const version=task.version+1;
      await tx.query(`UPDATE tasks SET acknowledged_at=COALESCE(acknowledged_at,$1),acknowledged_by=$2,
        next_action=$3,follow_up_at=$4,version=$5 WHERE id=$6`,[now.toISOString(),actor.id,nextAction,followUp.toISOString(),version,id]);
      await tx.query("UPDATE timer_jobs SET status='superseded' WHERE task_id=$1 AND status='pending'",[id]);
      await tx.query(`INSERT INTO timer_jobs(id,task_id,task_version,rule,rule_version,anchor_at,due_at,dedupe_key)
        VALUES($1,$2,$3,'T11','T11-v1',$4,$5,$6)`,[randomUUID(),id,version,now.toISOString(),followUp.toISOString(),`T11:${id}:${version}`]);
      await audit(tx,actor,'task.acknowledge',id,{version:task.version,followUpAt:task.follow_up_at,nextAction:task.next_action},
        {version,nextAction,followUpAt:followUp.toISOString()},meta.requestId,now);
      await enqueue(tx,'task.changed',id,{version},now);
      return {taskId:id,version,followUpAt:followUp.toISOString(),message:'Acknowledged. The unresolved action retains its dated follow-up.'};
    });
  }
}
