import {spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import assert from 'node:assert/strict';
import {completionFixture} from '../tests/completion-helper.js';
import {verifyEvidenceIntegrity} from '../packages/infrastructure/recovery.js';
import type {Sql} from '../packages/infrastructure/database.js';

// Uses the same real API fixture as integration tests, exclusively in a disposable test schema.
const [docker,...compose]=process.argv.slice(2);
if(!docker||!compose.length||process.env.TEST_DATABASE_URL!=='postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_test')throw new Error('Use tools/local-postgres.ps1 drill');
const id=randomUUID().replaceAll('-',''),directory=resolve('work/recovery-drills',id),dump=resolve(directory,'database.dump'),containerFile='/tmp/quotefix-drill-'+id+'.dump',roundTrip='/tmp/quotefix-drill-copied-'+id+'.dump',restoredDatabase='quotefix_restorecheck_'+id;
function run(args:string[]) {const r=spawnSync(docker!,[...compose,...args],{encoding:'utf8',windowsHide:true,timeout:120000});if(r.status!==0||r.error)throw new Error('Recovery tool failed');}
async function fingerprint(sql:Sql) {
  const tables=await sql.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename"),result=[];
  for(const {tablename} of tables){if(!/^[a-z_][a-z0-9_]*$/.test(tablename))throw new Error('Unexpected table');const [r]=await sql.query(`SELECT count(*)::text AS count,COALESCE(string_agg(row_to_json(r)::text,E'\\n' ORDER BY row_to_json(r)::text),'') AS data FROM "${tablename}" r`);result.push({table:tablename,count:r!.count,sha256:createHash('sha256').update(String(r!.data)).digest('hex')});}
  return result;
}
let fixture:Awaited<ReturnType<typeof completionFixture>>|undefined,restored:pg.Client|undefined,phase='initializing';const started=performance.now();
try {
  await mkdir(directory,{recursive:true});fixture=await completionFixture();const f=fixture;
  phase='fictional journey';const jobId=await f.prepared();await f.transfer(jobId);await f.worker.tick(500);const d=await f.detail(jobId,f.contractor);
  await f.cmd(jobId,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
  const workspace=f.okay(await f.get('workspaces/'+jobId,f.mcst));const pack=f.okay(await f.post('workspaces/'+jobId+'/exports',{format:'json'},f.mcst,workspace.job.version));await f.worker.tick(500);
  assert.equal((await f.detail(jobId)).stage,'Closed');assert.equal(f.okay(await f.get('exports/'+pack.exportId,f.mcst)).status,'ready');
  const [target]=await f.db.query('SELECT current_schema() AS schema,current_database() AS database');
  if(target!.database!=='quotefix_test'||!/^qf_test_[a-f0-9]{16}$/.test(String(target!.schema)))throw new Error('Unsafe drill source');
  const schema=String(target!.schema);
  const expected=await f.db.transaction(async tx=>{
    await tx.exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY; SET LOCAL TIME ZONE 'UTC';");
    const [snapshot]=await tx.query('SELECT pg_export_snapshot() AS id'),tables=await fingerprint(tx),evidence=await verifyEvidenceIntegrity(tx);
    phase='snapshot-bound dump';run(['exec','-T','postgres','pg_dump','-U','quotefix','-d','quotefix_test','--schema='+schema,'--snapshot='+String(snapshot!.id),'-Fc','-f',containerFile]);return {tables,evidence};
  });
  phase='artifact round trip';run(['cp','postgres:'+containerFile,dump]);const dumpSha256=createHash('sha256').update(await readFile(dump)).digest('hex');run(['cp',dump,'postgres:'+roundTrip]);
  phase='fresh restore';run(['exec','-T','postgres','createdb','-U','quotefix',restoredDatabase]);run(['exec','-T','postgres','pg_restore','-U','quotefix','--exit-on-error','-d',restoredDatabase,roundTrip]);
  restored=new pg.Client({connectionString:'postgresql://quotefix:local-only@127.0.0.1:5432/'+restoredDatabase,options:'-c search_path='+schema,connectionTimeoutMillis:5000,statement_timeout:30000});await restored.connect();await restored.query("SET TIME ZONE 'UTC'");
  const sql:Sql={exec:async s=>{await restored!.query(s);},query:async<T extends Record<string,unknown>>(s:string,p:unknown[]=[]) => (await restored!.query<T>(s,p)).rows};
  phase='restored financial and evidence verification';assert.deepEqual(await fingerprint(sql),expected.tables);assert.deepEqual(await verifyEvidenceIntegrity(sql),expected.evidence);
  const [balance]=await sql.query('SELECT stage FROM job_records WHERE id=$1',[jobId]);assert.equal(balance!.stage,'Closed');
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify({verified:true,scope:'Isolated fictional test schema; copied artifact restored into a new database. Existing development data untouched.',dumpSha256,restoredDatabase,schema,...expected,durationMs:Math.ceil(performance.now()-started)},null,2),{flag:'wx'});
  console.log('Recovery drill passed: '+resolve(directory,'manifest.json'));
}catch{console.error('Recovery drill failed during '+phase+'. Artifacts retained at '+directory);process.exitCode=1;}
finally{await restored?.end();await fixture?.close();}
