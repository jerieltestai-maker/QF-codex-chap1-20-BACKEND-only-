export const RELEASE_CHECKS=['scope','decisions','journeys','security','dependencies','secrets','restoreWithEvidence','capacity','accessibility',
  'monitoring','responseOwner','rollback','productionIdentity','productionStorage','deploymentAuthorization'] as const;
export type ReleaseCheck=typeof RELEASE_CHECKS[number];
export interface ReleaseEvidence {sourceCommit:string;checks:Partial<Record<ReleaseCheck,{status:'passed'|'blocked'|'pending';evidence:string}>>}
export function evaluateRelease(value:unknown,sourceCommit:string) {
  const blocks:string[]=[];
  if(!value||typeof value!=='object'||Array.isArray(value))return {ready:false,blocks:['INVALID_MANIFEST']};
  const manifest=value as Partial<ReleaseEvidence>;
  if(!/^[a-f0-9]{40}$/.test(sourceCommit)||manifest.sourceCommit!==sourceCommit)blocks.push('SOURCE_EVIDENCE_MISMATCH');
  for(const check of RELEASE_CHECKS) {
    const record=manifest.checks?.[check];
    if(!record||record.status!=='passed'||typeof record.evidence!=='string'||!record.evidence.trim())blocks.push(check);
  }
  return {ready:blocks.length===0,blocks};
}
