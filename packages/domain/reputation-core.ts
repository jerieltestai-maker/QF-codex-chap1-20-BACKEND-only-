import {createHash,randomUUID} from 'node:crypto';
import type {Sql} from '../infrastructure/database.js';
import type {Actor} from './access.js';
import {AppError} from '../contracts/primitives.js';
import {createAttention,finishAttention} from './verification-service.js';
import {score,formulaVersion,formula,type ScoreUnit,type Rubric} from './reputation-model.js';

export function fingerprint(value:unknown):string {
  const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}':JSON.stringify(v);
  return createHash('sha256').update(canonical(value)).digest('hex');
}
export async function saveEntry(tx:Sql,a:Actor,org:string,jobId:string|null,kind:string,facts:unknown,now:Date,existing?:{id:string;version:number;observedAt?:string}) {
  const id=existing?.id??randomUUID(),version=existing?existing.version+1:1;
  if(!existing)await tx.query('INSERT INTO reputation_entries(id,organisation_id,job_id,kind,created_at) VALUES($1,$2,$3,$4,$5)',[id,org,jobId,kind,now.toISOString()]);
  else await tx.query('UPDATE reputation_entries SET current_version=$1,review_version=review_version+1 WHERE id=$2',[version,id]);
  await tx.query('INSERT INTO reputation_entry_versions VALUES($1,$2,$3,$4,$5,$6,$7)',[id,version,facts,a.id,a.context!.role,existing?.observedAt??now.toISOString(),now.toISOString()]);
  await finishAttention(tx,id,'reputation.moderation');
  await createAttention(tx,now,{kind:'reputation.moderation',resourceId:id,organisationId:org,action:'Review submitted reputation evidence before shared publication or scoring.',requiredVersion:version});
  return id;
}
export interface ReputationEntry extends Record<string,unknown> {id:string;organisation_id:string;job_id:string|null;kind:string;current_version:number;review_version:number;facts:Record<string,unknown>;moderation:Record<string,unknown>|undefined}
export async function currentEntry(tx:Sql,id:string):Promise<ReputationEntry> {
  const [row]=await tx.query<Omit<ReputationEntry,'moderation'>>(`SELECT e.*,v.facts,v.actor_id,v.actor_role,v.observed_at,v.recorded_at FROM reputation_entries e
    JOIN reputation_entry_versions v ON v.entry_id=e.id AND v.version=e.current_version WHERE e.id=$1`,[id]);
  if(!row)throw new AppError(404,'NOT_FOUND','Feedback unavailable');
  const [moderation]=await tx.query('SELECT * FROM reputation_moderation WHERE entry_id=$1 AND entry_version=$2 ORDER BY sequence DESC LIMIT 1',[id,row.current_version]);
  return {...row,moderation} as ReputationEntry;
}
export async function reputationUnits(tx:Sql,org:string) {
  const entries=[];for(const row of await tx.query('SELECT id FROM reputation_entries WHERE organisation_id=$1 ORDER BY id',[org]))entries.push(await currentEntry(tx,String(row.id)));
  const eligible=entries.filter(e=>['publish','redact'].includes(String(e.moderation?.decision)));
  const external=eligible.filter(e=>e.kind==='external'&&(e.facts as Record<string,unknown>).independentlyVerified===true);
  const units:ScoreUnit[]=[];
  if(external.length>=5)for(const e of external)units.push({id:String(e.id),source:'external',inspectionEntryId:String(e.id),inspectionVersion:Number(e.current_version),rubric:(e.facts as {rubric:Rubric}).rubric});
  for(const e of eligible.filter(e=>e.kind==='inspection')) {
    const durability=eligible.find(d=>d.job_id===e.job_id&&d.kind==='durability'&&!d.moderation?.durability_contested&&(d.facts as {outcome:string}).outcome==='rated');
    units.push({id:String(e.job_id),source:'quotefix',inspectionEntryId:String(e.id),inspectionVersion:Number(e.current_version),rubric:(e.facts as {rubric:Rubric}).rubric,
      ...(durability?{durability:(durability.facts as {rating:number}).rating,durabilityEntryId:String(durability.id),durabilityVersion:Number(durability.current_version)}:{})});
  }
  units.sort((a,b)=>a.id.localeCompare(b.id));
  const states={pending:0,unanswered:0,unable:0,rated:0,contested:0};
  for(const row of await tx.query(`SELECT f.status,t.escalated_at,e.id FROM feedback_obligations f JOIN work_state w ON w.job_id=f.job_id
    LEFT JOIN tasks t ON t.id=f.task_id LEFT JOIN reputation_entries e ON e.job_id=f.job_id AND e.kind='durability' WHERE w.organisation_id=$1`,[org])) {
    const e=eligible.find(e=>e.id===row.id);
    if(e?.moderation?.durability_contested)states.contested++;
    else if(e&&(e.facts as {outcome:string}).outcome==='unable')states.unable++;
    else if(e)states.rated++;
    else if(row.status==='due'&&row.escalated_at)states.unanswered++;
    else states.pending++;
  }
  return {units,formula,moderationInputs:entries.filter(e=>e.moderation).map(e=>({entryId:e.id,entryVersion:e.current_version,moderationId:e.moderation!.id,decision:e.moderation!.decision,durabilityContested:e.moderation!.durability_contested})),verifiedExternalCount:external.length,durabilityStates:states};
}
export async function refreshReputation(tx:Sql,org:string,now:Date) {
  const inputs=await reputationUnits(tx,org),hash=fingerprint({formulaVersion,...inputs}),result=score(inputs.units);
  await tx.query(`INSERT INTO reputation_snapshots(id,organisation_id,formula_version,fingerprint,inputs,result,recorded_at)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(organisation_id,formula_version,fingerprint) DO NOTHING`,[randomUUID(),org,formulaVersion,hash,inputs,result,now.toISOString()]);
  const [snapshot]=await tx.query('SELECT id FROM reputation_snapshots WHERE organisation_id=$1 AND formula_version=$2 AND fingerprint=$3',[org,formulaVersion,hash]);
  return {snapshotId:String(snapshot!.id),fingerprint:hash,inputs,result};
}
// Free text is withheld entirely under identity concealment: name replacement cannot remove arbitrary identifying clues.
export async function entryProjection(tx:Sql,a:Actor,id:string,shared:boolean,masked=false) {
  const e=await currentEntry(tx,id),admin=a.context?.role==='admin',contractor=a.context?.role==='contractor'&&a.context.organisation_id===e.organisation_id;
  if(shared&&!admin&&!['publish','redact','void'].includes(String(e.moderation?.decision)))return null;
  const facts=e.facts as Record<string,unknown>,text=e.moderation?.public_text as Record<string,unknown>|undefined;
  const publicFacts=e.kind==='durability'?{outcome:facts.outcome,rating:facts.rating??null,observation:text?.observation??facts.observation}:
    {rubric:facts.rubric,reason:text?.reason??facts.reason??'',...(e.kind==='external'?{source:'Admin-verified external reference',workDate:facts.workDate,trade:facts.trade}:{round:facts.round})};
  if(masked)for(const key of ['observation','reason'])if(key in publicFacts)(publicFacts as Record<string,unknown>)[key]='Free text withheld while identities are concealed.';
  const replies=await tx.query(`SELECT r.version,r.entry_version,r.body,r.recorded_at,m.approved FROM reputation_replies r LEFT JOIN reputation_reply_moderation m
    ON m.entry_id=r.entry_id AND m.reply_version=r.version WHERE r.entry_id=$1 AND r.entry_version=$2 ORDER BY r.version DESC LIMIT 1`,[id,e.current_version]);
  return {id:e.id,kind:e.kind,version:e.review_version,entryVersion:e.current_version,observedAt:e.observed_at,recordedAt:e.recorded_at,facts:admin?facts:publicFacts,
    ...(admin?{moderation:e.moderation??null}:{}),muted:e.moderation?.decision==='void',
    ...(contractor&&!shared?{publication:['publish','redact','void'].includes(String(e.moderation?.decision))?'published':'awaiting review'}:{}),
    replies:replies.filter(r=>admin||contractor||r.approved===true).map(r=>({version:r.version,body:masked?'Reply withheld while identities are concealed.':r.body,recordedAt:r.recorded_at,...(admin?{approved:r.approved}: {})}))};
}
