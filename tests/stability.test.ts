import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import pg from 'pg';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {NativeClient,resumeUpload,consumeEvidence,type PendingUpload,type UploadStatus} from '../packages/native-client/client.js';
import {buildDecisionPack} from '../packages/domain/decision-pack.js';

if(process.env.TEST_DATABASE_URL)test('PostgreSQL: losing an idle connection does not crash; transaction disconnects reject and reconnect',async()=>{
  const db=await testDatabase(loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}));
  const control=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await control.connect();
  try{
    const [idle]=await db.query<{pid:number}>('SELECT pg_backend_pid() AS pid');
    await control.query('SELECT pg_terminate_backend($1)',[idle!.pid]);
    // Let the actual idle socket emit its pool error; without the handler this
    // terminates the test process, rather than merely failing an assertion.
    await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal((await db.query('SELECT 1 AS value'))[0]!.value,1);
    await assert.rejects(db.transaction(async tx=>{
      const [active]=await tx.query<{pid:number}>('SELECT pg_backend_pid() AS pid');
      await control.query('SELECT pg_terminate_backend($1)',[active!.pid]);
      await tx.query('SELECT 1');
    }));
    assert.equal((await db.query('SELECT 1 AS value'))[0]!.value,1);
  }finally{await control.end();await db.close();}
});

test('Stability: incomplete drafts, capture handoffs, complete history/exports and list boundaries',async t=>{
  const f=await completionFixture();
  const actor=async(c=f.mcst)=>f.identity.actor(c.cookie.slice('qf_session='.length));
  const transport=(who=f.cm,loseAttachment=false):ConstructorParameters<typeof NativeClient>[2]=>async(url,init)=>{
    const r=await f.app.inject({method:init.method as 'GET'|'POST',url:new URL(url).pathname+new URL(url).search,remoteAddress:'127.0.0.242',
      headers:{...init.headers as Record<string,string>,origin:'http://127.0.0.1:3000',cookie:who.cookie,'x-csrf-token':who.csrf},...(init.body?{payload:JSON.parse(String(init.body))}:{})});
    if(loseAttachment&&url.endsWith('/attachments')&&r.statusCode===200){loseAttachment=false;throw new Error('Committed attachment response lost');}
    return {ok:r.statusCode<400,status:r.statusCode,json:async()=>r.json()};
  };
  let captureJob='';
  try {
    await t.test('Server drafts accept unfinished fields, survive a fresh read, stay private and never create a job',async()=>{
      const id=randomUUID(),fields={title:'',observations:'A note before the location is known',affectedLocation:''};
      f.okay(await f.post('drafts',{id,estateId:ids.estate,baseVersion:0,fields},f.cm));
      const rows=f.okay(await f.get('drafts',f.cm));assert.deepEqual(rows.find((r:{id:string})=>r.id===id).fields,fields);
      assert.equal(f.okay(await f.get('drafts',f.mcst)).some((r:{id:string})=>r.id===id),false);
      const adminId=randomUUID();f.okay(await f.post('drafts',{id:adminId,estateId:ids.estate,baseVersion:0,fields},f.admin));
      assert.ok(f.okay(await f.get('drafts',f.admin)).some((r:{id:string})=>r.id===adminId));
      assert.equal(Number((await f.db.query('SELECT count(*) n FROM job_records'))[0]!.n),0);
      assert.equal((await f.post('workspaces',{estateId:ids.estate,...fields},f.cm)).statusCode,422);
    });
    await t.test('Ready native capture is explicitly attached; lost responses keep exact operation identities and RFQ can use it',async()=>{
      captureJob=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Capture handoff',observations:'Visible drip',affectedLocation:'Private plant room'},f.cm)).jobId;
      const client=new NativeClient('http://127.0.0.1:3000',undefined,transport(f.cm,true)),context=await client.context();
      const bytes=await sharp({create:{width:3,height:3,channels:3,background:'blue'}}).png().toBuffer(),checksum=createHash('sha256').update(bytes).digest('hex');
      let record:PendingUpload={id:randomUUID(),accountId:context.user.id,contextId:context.context!.id,jobId:captureJob,purpose:'evidence',localUri:'file:///fictional-capture.png',mediaType:'image/png',byteSize:bytes.length,checksum,
        intentPath:'workspaces/'+captureJob+'/uploads',intentBody:{purpose:'evidence',mediaType:'image/png',byteSize:bytes.length,checksum},baseVersion:1,intentOperationId:randomUUID(),finalizeOperationId:randomUUID(),state:'device-only'};
      const save=async(r:PendingUpload)=>{record=structuredClone(r);};
      await resumeUpload(client,context,record,bytes,checksum,save);await f.worker.tick(500);
      const ready=await resumeUpload(client,context,record,bytes,checksum,save);assert.equal(ready.status.state,'ready');
      assert.equal(f.okay(await f.get('workspaces/'+captureJob,f.cm)).attachments.length,0);
      await assert.rejects(consumeEvidence(client,context,record,ready.status,{note:'',workVersion:0,newOperationId:randomUUID},save),/Checking submission/);
      const keys=structuredClone(record.consumption!.operations);assert.equal(record.consumed,undefined);
      await consumeEvidence(client,context,record,ready.status,{note:'changed retry text',workVersion:99,newOperationId:randomUUID},save);
      assert.deepEqual(record.consumption!.operations,keys);assert.equal(record.consumed,true);
      assert.equal(f.okay(await f.get('workspaces/'+captureJob,f.cm)).attachments.length,2);
      const sanitized=ready.status.objects.find(o=>o.variant==='sanitized')!;
      f.okay(await f.post('workspaces/'+captureJob+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Plant room',evidenceIds:[sanitized.id]},f.cm,1));
      f.okay(await f.get('workspaces/'+captureJob+'/rfq/preview',f.cm));
      assert.equal(Number((await f.db.query('SELECT count(*) n FROM rfq_publications WHERE job_id=$1',[captureJob]))[0]!.n),0);
      assert.equal(Number((await f.db.query("SELECT count(*) n FROM audit_events WHERE resource_id=$1 AND action='file.attach'",[captureJob]))[0]!.n),2);
    });
    await t.test('Contractor capture attaches to authorised work without inventing Start/progress, and rivals cannot attach',async()=>{
      const id=await f.job('100.00',false),fileId=await f.file(id,'evidence'),[file]=await f.db.query('SELECT upload_id FROM file_objects WHERE id=$1',[fileId]);
      const client=new NativeClient('http://127.0.0.1:3000',undefined,transport(f.contractor)),context=await client.context(),status=await client.request<UploadStatus>('uploads/'+file!.upload_id);
      let record:PendingUpload={id:randomUUID(),accountId:context.user.id,contextId:context.context!.id,jobId:id,purpose:'evidence',localUri:'file:///fictional-work.png',mediaType:'image/png',byteSize:1,checksum:'0'.repeat(64),intentPath:'workspaces/'+id+'/work/uploads',intentBody:{},baseVersion:0,intentOperationId:randomUUID(),finalizeOperationId:randomUUID(),uploadId:String(file!.upload_id),state:'ready'};
      await consumeEvidence(client,context,record,status,{note:'Pre-start repair evidence',workVersion:0,newOperationId:randomUUID},async r=>{record=r;});
      const work=f.okay(await f.get('workspaces/'+id+'/work',f.contractor));assert.equal(work.state.started_at,null);assert.equal(work.evidence.length,2);assert.equal(record.consumed,true);
      assert.equal((await f.post('workspaces/'+id+'/work/attachments',{fileId},f.rival)).statusCode,404);
      assert.equal(Number((await f.db.query("SELECT count(*) n FROM work_events WHERE job_id=$1 AND kind='work.progress'",[id]))[0]!.n),0);
    });
    await t.test('Contractor chronology includes work and actual payment, with normalized actions and no estate selection rationale',async()=>{
      const id=await f.prepared();await f.transfer(id);await f.worker.tick(500);const d=await f.detail(id,f.contractor);
      await f.cmd(id,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      const h=f.okay(await f.get('workspaces/'+id+'/chronology',f.contractor));
      for(const action of ['quote.submitted','work.start','completion.submit','payment.transfer','payment.receipt'])assert.ok(h.items.some((r:{action:string})=>r.action===action),action);
      assert.ok(h.items.every((r:{action:unknown})=>typeof r.action==='string'));
      assert.equal(JSON.stringify(h).includes('Factual selection'),false);assert.equal((await f.get('workspaces/'+id+'/chronology',f.rival)).statusCode,404);
    });
    await t.test('Exports retain exact cancellation consent and ordinary resolution acknowledgments without confidential cases',async()=>{
      const id=await f.job(),d=await f.detail(id);f.okay(await f.post('workspaces/'+id+'/cancel',{reason:'Recorded cancellation reason',confirmed:true},f.cm,d.version));await f.worker.tick(500);
      const c=f.okay(await f.get('workspaces/'+id+'/cancellation',f.contractor));
      f.okay(await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:c.cancellations[0].id,outcome:'okay',declaration:'I accept the cancellation and do not have any additional claims.'},f.contractor,c.version));
      const version=f.okay(await f.get('workspaces/'+id,f.cm)).job.version;
      const s=f.okay(await f.post('workspaces/'+id+'/cases',{description:'Ordinary explanation request',category:'general',privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[]},f.cm,version));
      f.okay(await f.post('support/'+s.supportId+'/resolve',{outcome:'Explanation supplied',reason:'Recorded final resolution reason',obligations:[]},f.admin,1));
      f.okay(await f.post('support/'+s.supportId+'/acknowledge',{resolutionVersion:1,confirmed:true},f.cm,2));
      const pack=await buildDecisionPack(f.db,await actor(),id,f.now()),records=pack.records as {cancellationEvents:{kind:string;details:{declaration?:string}}[];exceptions:{resolutions:{reason:string}[];acknowledgments:unknown[]}[]};
      assert.ok(records.cancellationEvents.some(e=>e.details.declaration==='I accept the cancellation and do not have any additional claims.'));
      assert.ok(records.exceptions.some(e=>e.resolutions.some(r=>r.reason==='Recorded final resolution reason')&&e.acknowledgments.length===1));
    });
    await t.test('Closed publications cannot starve an open eligible opportunity; moderation and list pages have no permanent 200-row cutoff',async()=>{
      f.okay(await f.post('workspaces/'+captureJob+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.cm,2));
      await f.db.transaction(async tx=>{
        await tx.query(`INSERT INTO job_records(id,estate_id,created_by,title,observations,affected_location,created_at,updated_at)
          SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,estate_id,created_by,'Old fictional publication','Fictional','Private',created_at,updated_at FROM job_records CROSS JOIN generate_series(1,200) n WHERE id=$1`,[captureJob]);
        await tx.query(`INSERT INTO rfq_versions SELECT j.id,1,1,v.snapshot,'initial','Old fictional publication',v.actor_id,v.recorded_at FROM job_records j CROSS JOIN rfq_versions v WHERE j.id::text LIKE '00000000-%' AND v.job_id=$1`,[captureJob]);
        await tx.query(`INSERT INTO quotation_rounds(id,job_id,number,status,published_at,sourcing_due_at,rule_snapshot) SELECT gen_random_uuid(),id,1,'closed',$1,$1,'[]'::jsonb FROM job_records WHERE id::text LIKE '00000000-%'`,[f.now().toISOString()]);
        await tx.query("INSERT INTO rfq_publications SELECT job_id,1,1,id FROM quotation_rounds WHERE job_id::text LIKE '00000000-%'");
        await tx.query(`INSERT INTO reputation_entries(id,organisation_id,kind,created_at) SELECT ('00000001-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'external','2026-01-01T00:00Z' FROM generate_series(1,200) n`,[ids.organisation]);
        await tx.query(`INSERT INTO reputation_entry_versions SELECT id,1,$1,$2,'admin','2026-01-01T00:00Z','2026-01-01T00:00Z' FROM reputation_entries WHERE id::text LIKE '00000001-%'`,[{rubric:{workmanship:4,timeliness:4,customerService:4,valueForMoney:4,recommendation:4},reason:'Fictional',workDate:'2025-01-01',trade:'plumbing'},ids.admin]);
      });
      assert.ok(f.okay(await f.get('opportunities?limit=100&offset=0',f.contractor)).some((r:{jobId:string})=>r.jobId===captureJob));
      const created=f.okay(await f.post('admin/organisations/'+ids.organisation+'/reputation/references',{workDate:'2026-01-01',trade:'plumbing',workDescription:'Fictional work',source:'Fictional source',refereeContact:'Fictional contact',independentChannel:'Fictional verification',interviewEvidence:'Fictional evidence',uncertainty:'',independentlyVerified:true,rubric:{workmanship:4,timeliness:4,customerService:4,valueForMoney:4,recommendation:4},reason:'',referenceKey:'last-reference'},f.admin,1));
      const page=f.okay(await f.get('admin/reputation?limit=100&offset=200',f.admin));assert.ok(page.some((r:{id:string})=>r.id===created.entryId));
      assert.equal((await f.get('opportunities?limit=101',f.contractor)).statusCode,422);
      assert.equal(f.okay(await f.get('admin/reputation?limit=100&offset=0',f.admin)).length,100);
    });
  }finally{await f.close();}
});
