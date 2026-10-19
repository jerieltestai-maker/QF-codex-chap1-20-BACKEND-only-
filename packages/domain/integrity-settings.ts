import {randomUUID} from 'node:crypto';
import {AppError,requiredText} from '../contracts/primitives.js';
import type {Sql} from '../infrastructure/database.js';
import {canRead,type Actor} from './access.js';
import {CommandService,audit,requireVersion,type WorkspaceCommand} from './commands.js';
import {authorizedJob} from './workspace-service.js';
export const INTEGRITY_DEFAULTS={quoteRevisionPct:20,selectedPricePct:30,variationGrowthPct:20,minimumQuotes:3};
export type IntegrityValues=typeof INTEGRITY_DEFAULTS;
export const ESTATE_ACK='I understand these warning settings apply from the next RFQ round. Existing jobs will continue to use their previous warning settings.';
export const TICKET_ACK='I understand these new warning settings apply only to future events on this ticket. Earlier warnings and decisions will keep the settings that applied at the time.';
export function validateValues(v:IntegrityValues) {
  for(const key of ['quoteRevisionPct','selectedPricePct','variationGrowthPct'] as const)if(!Number.isInteger(v[key])||v[key]<0||v[key]>10000)throw new AppError(422,'FIELD_VALIDATION','Warning percentages must be whole numbers from 0 to 10000');
  if(!Number.isInteger(v.minimumQuotes)||v.minimumQuotes<1||v.minimumQuotes>100)throw new AppError(422,'FIELD_VALIDATION','Quote count must be a whole number from 1 to 100');
  if(Object.keys(v).length!==4)throw new AppError(422,'FIELD_VALIDATION','Choose all four warning settings');return {...v};
}
export async function oversightAuthority(tx:Sql,a:Actor,id:string,job=false) {
  if(!['mcst','admin'].includes(a.context?.role??''))throw new AppError(403,'FORBIDDEN','MCST or Admin authority required');
  if(job)return (await authorizedJob(tx,a,id)).estate_id;
  if(!canRead(a,{estateId:id})||!(await tx.query('SELECT id FROM estates WHERE id=$1',[id])).length)throw new AppError(404,'NOT_FOUND','Estate unavailable');return id;
}
export async function bindIntegrityRound(tx:Sql,estateId:string,roundId:string,now:Date) {
  const [s]=await tx.query('SELECT id,values FROM integrity_settings WHERE estate_id=$1 AND job_id IS NULL ORDER BY version DESC LIMIT 1',[estateId]);
  if(!s)throw new AppError(409,'INTEGRITY_SETTINGS_REQUIRED','MCST must confirm the four warning settings before opening a new quotation round');
  await tx.query('INSERT INTO integrity_round_policies VALUES($1,$2,$3,$4)',[roundId,s.id,s.values,now.toISOString()]);
}
export async function eventPolicy(tx:Sql,jobId:string,roundId:string) {
  const [r]=await tx.query('SELECT * FROM integrity_round_policies WHERE round_id=$1',[roundId]);
  const [override]=await tx.query('SELECT * FROM integrity_settings WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[jobId]);
  // A saved ticket override persists for future events on this ticket, including reopened rounds.
  return override?{settingId:override.id,ticketVersion:override.version,roundId,values:override.values as IntegrityValues}:
    r?{settingId:r.setting_id,roundId,values:r.values as IntegrityValues}:null;
}
export class IntegritySettingsService {
  constructor(readonly commands:CommandService){}
  async detail(token:string,id:string,job=false) {
    return this.commands.db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');const a=await this.commands.identity.actor(token,tx),estateId=await oversightAuthority(tx,a,id,job);
      const versions=await tx.query('SELECT * FROM integrity_settings WHERE '+(job?'job_id=$1':'estate_id=$1 AND job_id IS NULL')+' ORDER BY version DESC',[id]);
      return {estateId,jobId:job?id:null,version:versions[0]?.version??0,values:versions[0]?.values??INTEGRITY_DEFAULTS,configured:versions.length>0,versions,acknowledgment:job?TICKET_ACK:ESTATE_ACK};
    });
  }
  save(token:string,meta:WorkspaceCommand,id:string,body:{values:IntegrityValues;acknowledged:boolean;reason:string},job=false) {
    return this.commands.run(token,meta,job?'integrity.ticket-settings':'integrity.estate-settings',{id,...body},async(tx,a)=>{await oversightAuthority(tx,a,id,job);},async(tx,a)=>{
      const estateId=await oversightAuthority(tx,a,id,job),values=validateValues(body.values);
      const [prior]=await tx.query('SELECT * FROM integrity_settings WHERE '+(job?'job_id=$1':'estate_id=$1 AND job_id IS NULL')+' ORDER BY version DESC LIMIT 1',[id]);
      requireVersion(Number(prior?.version??0),meta.expectedVersion);
      if(body.acknowledged!==true)throw new AppError(422,'ACKNOWLEDGMENT_REQUIRED','Tick the prospective-effect acknowledgment before saving');
      const bidding=job&&(await tx.query('SELECT id FROM quotes WHERE job_id=$1 LIMIT 1',[id])).length>0;
      const reason=bidding||a.context?.role==='admin'?requiredText(body.reason):body.reason.trim();
      const version=Number(prior?.version??0)+1,settingId=randomUUID(),now=this.commands.now(),ack=job?TICKET_ACK:ESTATE_ACK;
      await tx.query('INSERT INTO integrity_settings VALUES($1,$2,$3,$4,$5,true,$6,$7,$8,$9,$10,$11)',[settingId,estateId,job?id:null,version,values,ack,reason,a.id,a.context!.role,now.toISOString(),job?'future_ticket_events':'next_round']);
      if(job)await tx.query('UPDATE job_records SET version=version+1,updated_at=$1 WHERE id=$2',[now.toISOString(),id]);
      await audit(tx,a,job?'integrity.ticket-settings':'integrity.estate-settings',id,prior?{settingId:prior.id,version:prior.version,values:prior.values}:null,{settingId,version,values,acknowledged:true,acknowledgment:ack,effectivePoint:job?'future_ticket_events':'next_round'},meta.requestId,now,reason);
      return {settingId,version,estateId,...(job?{jobId:id}:{}),effectivePoint:job?'future_ticket_events':'next_round'};
    });
  }
}
