import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import {verifyEvidenceIntegrity} from '../packages/infrastructure/recovery.js';

// Invoked by local-postgres.ps1 after validating the local Docker Desktop endpoint.
// Exported-snapshot fingerprints and pg_dump observe the same committed database state.
const [docker,...compose]=process.argv.slice(2);
if(!docker||!compose.length)throw new Error('Use tools/local-postgres.ps1 backup');
const id=randomUUID().replaceAll('-',''),directory=resolve('work/postgres-backups',id);
const containerFile='/tmp/quotefix-backup-'+id+'.dump',dump=resolve(directory,'database.dump');
const restoreFile='/tmp/quotefix-backup-'+id+'-copied-back.dump';
const restoredDatabase='quotefix_restorecheck_'+id;
const source=new pg.Client({connectionString:'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_development',connectionTimeoutMillis:5000,statement_timeout:30000});
let restored:pg.Client|undefined,phase='starting',transaction=false;
function run(args:string[]) {
  const result=spawnSync(docker!,[...compose,...args],{encoding:'utf8',windowsHide:true,timeout:120000});
  // Never print raw driver/tool errors, row bodies or credentials to an execution record.
  if(result.status!==0||result.error)throw new Error('Local PostgreSQL operation failed');
}
async function fingerprint(db:pg.Client) {
  const {rows:tables}=await db.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const results=[];
  for(const {tablename} of tables) {
    if(!/^[a-z_][a-z0-9_]*$/.test(tablename))throw new Error('Unexpected table identifier');
    const {rows:[row]}=await db.query<{count:string;data:string}>(`SELECT count(*)::text AS count,
      COALESCE(string_agg(row_to_json(r)::text,E'\\n' ORDER BY row_to_json(r)::text),'') AS data FROM public."${tablename}" r`);
    results.push({table:tablename,count:row!.count,sha256:createHash('sha256').update(row!.data).digest('hex')});
  }
  return results;
}
try {
  await mkdir(directory,{recursive:true});
  phase='source snapshot';
  await source.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=true;
  await source.query("SET LOCAL TIME ZONE 'UTC'");
  const {rows:[identity]}=await source.query('SELECT environment FROM deployment_identity');
  if(identity?.environment!=='development')throw new Error('Refusing a non-development source');
  const {rows:[snapshot]}=await source.query<{id:string}>('SELECT pg_export_snapshot() AS id');
  const {rows:[version]}=await source.query<{server_version:string}>('SHOW server_version');
  const expected=await fingerprint(source);
  const queryAdapter=(client:pg.Client)=>({query:async<T extends Record<string,unknown>>(sql:string,params:unknown[]=[]) => (await client.query<T>(sql,params)).rows,exec:async(sql:string)=>{await client.query(sql);}});
  const expectedEvidence=await verifyEvidenceIntegrity(queryAdapter(source));
  phase='database dump';
  run(['exec','-T','postgres','pg_dump','-U','quotefix','-d','quotefix_development','-Fc','--snapshot='+snapshot!.id,'-f',containerFile]);
  await source.query('COMMIT');transaction=false;
  phase='backup copy';run(['cp','postgres:'+containerFile,dump]);
  const hash=createHash('sha256');for await(const chunk of createReadStream(dump))hash.update(chunk);
  // Restore the artifact saved on Windows, rather than the original container-side dump.
  phase='backup round trip';run(['cp',dump,'postgres:'+restoreFile]);
  phase='fresh restore database';run(['exec','-T','postgres','createdb','-U','quotefix',restoredDatabase]);
  phase='restore';run(['exec','-T','postgres','pg_restore','-U','quotefix','--exit-on-error','-d',restoredDatabase,restoreFile]);
  restored=new pg.Client({connectionString:'postgresql://quotefix:local-only@127.0.0.1:5432/'+restoredDatabase,connectionTimeoutMillis:5000,statement_timeout:30000});
  await restored.connect();
  await restored.query("SET TIME ZONE 'UTC'");
  phase='full-row verification';
  const actual=await fingerprint(restored);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Restored rows differ from the exported snapshot');
  const evidence=await verifyEvidenceIntegrity(queryAdapter(restored));
  if(JSON.stringify(evidence)!==JSON.stringify(expectedEvidence))throw new Error('Restored evidence differs from the exported snapshot');
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),serverVersion:version!.server_version,
    source:'quotefix_development',restoredDatabase,dumpSha256:hash.digest('hex'),tables:expected,evidence,verified:true,
    scope:'Database-only local development restore check. Preserve local helper encryption keys, mailbox and any external evidence separately; this is not a production recovery certification.'},null,2),{flag:'wx'});
  console.log('Database backup and full-row restore verification passed. Record: '+resolve(directory,'manifest.json'));
} catch {
  console.error('Backup verification failed during '+phase+'. Retained artifacts: '+directory);process.exitCode=1;
} finally {
  if(transaction)await source.query('ROLLBACK').catch(()=>{});
  await Promise.all([source.end(),restored?.end()]);
}
