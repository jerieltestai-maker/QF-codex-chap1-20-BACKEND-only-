import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {operationalSnapshot,recordWorkerTick} from '../packages/infrastructure/operations.js';
import {Worker,LEASE_MS} from '../packages/infrastructure/worker.js';
import {verifyEvidenceIntegrity} from '../packages/infrastructure/recovery.js';
import {evaluateRelease,RELEASE_CHECKS,type ReleaseEvidence} from '../packages/infrastructure/release-gate.js';
import {ids} from '../packages/test-fixtures/fixtures.js';

test('Chapter 19: operational failures, guarded recovery and evidence integrity',async t=>{
  const f=await completionFixture();
  let journeyId='';
  try {
    await t.test('CH19-T12: missing worker heartbeat is visible only to Admin; response contains no private evidence',async()=>{
      for(const c of [f.cm,f.mcst,f.contractor])assert.equal((await f.get('admin/operations',c)).statusCode,403);
      assert.equal((await f.app.inject('/api/v1/admin/operations')).statusCode,401);
      const first=f.okay(await f.get('admin/operations',f.admin));assert.ok(first.alerts.includes('WORKER_UNHEALTHY'));
      assert.equal(JSON.stringify(first).includes('password'),false);assert.equal(JSON.stringify(first).includes('payload'),false);
      await f.worker.tick(500);const healthy=await operationalSnapshot(f.db,f.now());assert.equal(healthy.metrics.workerAgeSeconds,0);
      assert.ok(!healthy.alerts.includes('WORKER_UNHEALTHY'));
      await recordWorkerTick(f.db,f.now(),false);assert.ok((await operationalSnapshot(f.db,f.now())).alerts.includes('WORKER_UNHEALTHY'));
      await f.worker.tick(500);assert.equal((await operationalSnapshot(f.db,f.now())).metrics.workerFailures,0);
    });
    await t.test('CH19-T01/T04: real API role handoffs, private files, financial settlement, exports and due Feedback agree',async()=>{
      const id=await f.prepared();await f.transfer(id);await f.worker.tick(500);
      journeyId=id;
      const d=await f.detail(id,f.contractor);await f.cmd(id,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      assert.equal((await f.detail(id)).stage,'Closed');
      const workspace=f.okay(await f.get('workspaces/'+id,f.mcst));
      const pack=f.okay(await f.post('workspaces/'+id+'/exports',{format:'json'},f.mcst,workspace.job.version));await f.worker.tick(500);
      assert.equal((await f.get('exports/'+pack.exportId,f.rival)).statusCode,404);
      const verified=await verifyEvidenceIntegrity(f.db);assert.ok(verified.fileCount>=2);assert.equal(verified.exportCount,1);
      const [feedback]=await f.db.query('SELECT * FROM feedback_obligations WHERE job_id=$1',[id]);assert.ok(feedback);
      f.setNow(new Date('2026-12-02T04:00:00Z'));await f.worker.tick(500);
      assert.equal((await f.detail(id)).stage,'Closed');assert.ok(f.okay(await f.get('workspaces/'+id+'/feedback',f.cm)).obligation);
    });
    await t.test('CH19-T02: claimed work survives a worker restart; stale lease holder cannot acknowledge a newer claim',async()=>{
      await f.worker.tick(1000);
      const id=randomUUID();await f.db.query("INSERT INTO outbox(id,kind,payload,created_at,available_at) VALUES($1,'workspace.changed','{}',$2,$2)",[id,f.now().toISOString()]);
      const old=await f.worker.claim();assert.equal(old!.id,id);
      const restarted=new Worker(f.db,{scan:async()=>'clean'},f.now);assert.equal(await restarted.claim(),undefined);
      f.setNow(new Date(f.now().getTime()+LEASE_MS));const fresh=await restarted.claim();assert.equal(fresh!.id,id);assert.notEqual(fresh!.lease_token,old!.lease_token);
      await f.worker.process(old!);assert.equal((await f.db.query('SELECT processed_at FROM outbox WHERE id=$1',[id]))[0]!.processed_at,null);
      await restarted.process(fresh!);assert.ok((await f.db.query('SELECT processed_at FROM outbox WHERE id=$1',[id]))[0]!.processed_at);
      assert.equal((await operationalSnapshot(f.db,f.now())).metrics.expiredLeases,0);
    });
    await t.test('CH19-T03/T07/T12: queue/first-notice/scanner faults remain observable without issuing a false customer notice',async()=>{
      const task=randomUUID(),work=randomUUID(),at=new Date(f.now().getTime()-120000).toISOString();
      await f.db.query("INSERT INTO tasks(id,kind,owner_role,status,rule_version,created_at) VALUES($1,'test.no-recipient','admin','open','v1',$2)",[task,at]);
      await f.db.query("INSERT INTO outbox(id,kind,resource_id,payload,created_at,available_at,attempts,last_error_code,failed_at) VALUES($1,'file.scan',$2,$3,$4,$4,8,'SCANNER_UNAVAILABLE',$4)",[work,randomUUID(),{privateBody:'DO NOT LEAK'},at]);
      const snapshot=await operationalSnapshot(f.db,f.now());assert.ok(snapshot.alerts.includes('INITIAL_NOTICE_DELAY'));assert.ok(snapshot.alerts.includes('SCAN_UNAVAILABLE'));assert.ok(snapshot.alerts.includes('FAILED_WORK'));
      assert.equal(JSON.stringify(snapshot).includes('DO NOT LEAK'),false);assert.equal(JSON.stringify(snapshot).includes(task),false);
      assert.equal((await f.db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[task]))[0]!.first_issued_at,null);
      await f.db.query("UPDATE tasks SET status='resolved' WHERE id=$1",[task]);await f.db.query('UPDATE outbox SET processed_at=$1 WHERE id=$2',[f.now().toISOString(),work]);
    });
    await t.test('CH19-T04: restored object corruption and missing ready originals are refused',async()=>{
      const [file]=await f.db.query('SELECT * FROM file_objects LIMIT 1');assert.ok(file);
      await assert.rejects(f.db.transaction(async tx=>{
        const uploadId=randomUUID();
        await tx.query('INSERT INTO upload_intents(id,job_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at) SELECT $1,job_id,owner_id,purpose,media_type,byte_size,checksum,\'verifying\',expires_at,created_at FROM upload_intents WHERE id=$2',[uploadId,file.upload_id]);
        await tx.query('INSERT INTO file_objects(id,upload_id,variant,media_type,checksum,bytes,created_at) VALUES($1,$2,\'original\',\'image/png\',$3,$4,$5)',[randomUUID(),uploadId,'0'.repeat(64),Buffer.from('corrupt'),f.now().toISOString()]);
        await verifyEvidenceIntegrity(tx);
      }),/checksum verification failed/);
      await assert.rejects(f.db.transaction(async tx=>{
        await tx.query('INSERT INTO upload_intents(id,job_id,owner_id,purpose,media_type,byte_size,checksum,state,expires_at,created_at) SELECT $1,job_id,owner_id,purpose,media_type,byte_size,checksum,\'ready\',expires_at,created_at FROM upload_intents LIMIT 1',[randomUUID()]);
        await verifyEvidenceIntegrity(tx);
      }),/missing or differs/);
      assert.ok((await verifyEvidenceIntegrity(f.db)).fileCount>=2);
    });
    await t.test('CH19-T06: an Admin who is the confidential report subject cannot list or retry its failed scan',async()=>{
      const j=f.okay(await f.get('workspaces/'+journeyId,f.cm));
      const support=f.okay(await f.post('workspaces/'+journeyId+'/cases',{description:'Confidential fictional concern',category:'confidential_conduct',privacy:'confidential',subjectUserIds:[ids.admin],subjectOrganisationIds:[]},f.cm,j.job.version));
      const intent=f.okay(await f.post('support/'+support.supportId+'/uploads',{mediaType:'image/png',byteSize:3,checksum:'a'.repeat(64)},f.cm));
      const before=f.okay(await f.get('admin/operations',f.admin));
      const id=randomUUID();await f.db.query("INSERT INTO outbox(id,kind,resource_id,payload,failed_at,last_error_code) VALUES($1,'file.scan',$2,'{}',$3,'SCANNER_UNAVAILABLE')",[id,intent.uploadId,f.now().toISOString()]);
      const failed=f.okay(await f.get('admin/failed-work',f.admin));assert.ok(!failed.some((row:{id:string})=>row.id===id));
      assert.equal((await f.post('admin/failed-work/'+id+'/retry',{},f.admin)).statusCode,404);
      const after=f.okay(await f.get('admin/operations',f.admin));assert.equal(after.metrics.failedWork,before.metrics.failedWork);assert.equal(after.metrics.scanFailures,before.metrics.scanFailures);
    });
    await t.test('CH19-T08: representative concurrent evidence, export requests and worker burst preserve exact results',async()=>{
      const started=performance.now(),durations:number[]=[],j=f.okay(await f.get('workspaces/'+journeyId,f.mcst));
      const results=await Promise.all(Array.from({length:8},async()=>{const at=performance.now();const result=f.okay(await f.post('workspaces/'+journeyId+'/exports',{format:'json'},f.mcst,j.job.version));durations.push(performance.now()-at);return result;}));
      const files=await Promise.all(Array.from({length:4},()=>f.file(journeyId,'invoice')));assert.equal(new Set(files).size,4);
      await f.worker.tick(1000);
      for(const result of results)assert.equal(f.okay(await f.get('exports/'+result.exportId,f.mcst)).status,'ready');
      durations.sort((a,b)=>a-b);t.diagnostic(JSON.stringify({exports:8,uploads:4,exportRequestP95Ms:Math.ceil(durations.at(-1)!),totalMs:Math.ceil(performance.now()-started)}));
      assert.ok((await verifyEvidenceIntegrity(f.db)).exportCount>=9);
    });
  } finally {await f.close();}
});

test('CH19-T11/T12: release refuses incomplete, stale, unowned and evidence-free claims',()=>{
  const commit='a'.repeat(40),manifest:ReleaseEvidence={sourceCommit:commit,checks:{}};
  assert.equal(evaluateRelease(null,commit).ready,false);
  assert.deepEqual(evaluateRelease(manifest,commit).blocks,[...RELEASE_CHECKS]);
  for(const check of RELEASE_CHECKS)manifest.checks[check]={status:'passed',evidence:'Reviewable measured record for '+check};
  assert.equal(evaluateRelease(manifest,commit).ready,true);
  assert.equal(evaluateRelease(manifest,'b'.repeat(40)).ready,false);
  manifest.checks.decisions={status:'blocked',evidence:'G14 unresolved'};assert.ok(evaluateRelease(manifest,commit).blocks.includes('decisions'));
  manifest.checks.responseOwner={status:'passed',evidence:' '};assert.ok(evaluateRelease(manifest,commit).blocks.includes('responseOwner'));
});
