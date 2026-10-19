import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {buildApp} from '../apps/api/src/app.js';
import {Worker} from '../packages/infrastructure/worker.js';
import {settleFixtureFees} from './billing-helper.js';
type Client={cookie:string;csrf:string};

test('Chapters 11/12: real completion, repeated inspection, reconciled invoice, per-transfer receipts and guarded closure',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}),db=await testDatabase(config);
  await migrate(db,'test');await installFixtures(db,'test');let now=new Date('2026-11-02T04:00:00Z'),address=0,color=0;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>now);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>'clean'},()=>now);
  const post=(path:string,body:unknown,c:Client,v=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+path,payload:body as Record<string,unknown>,remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin,cookie:c.cookie,'x-csrf-token':c.csrf,'x-access-version':'1','if-match':`"record-${v}"`,'idempotency-key':key}});
  const get=(path:string,c:Client)=>app.inject({url:'/api/v1/'+path,remoteAddress:'127.0.0.'+(++address%240+1),headers:{cookie:c.cookie}});
  const okay=(r:Awaited<ReturnType<typeof post>>)=>{assert.equal(r.statusCode,200,r.body);return r.json();};
  async function login(email:string) {const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin}});okay(r);await db.query("UPDATE sessions SET expires_at='2027-12-31T00:00Z'");return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
  const detail=async(id:string,c:Client)=>okay(await get('workspaces/'+id+'/completion',c));
  const cmd=async(id:string,path:string,body:unknown,c:Client)=>okay(await post('workspaces/'+id+'/'+path,body,c,(await detail(id,c)).version));
  let cm:Client,mcst:Client,contractor:Client,admin:Client,peer:Client,other:Client;
  async function job(amount='100.00') {
    await settleFixtureFees(post,get,contractor,admin,now);
    const created=okay(await post('workspaces',{estateId:ids.estate,title:'Fictional settlement test',observations:'Fictional observation',affectedLocation:'Private plant room'},cm)),id=created.jobId as string;
    okay(await post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to photograph',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Plant room',evidenceIds:[]},cm,1));
    okay(await post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,2));
    const q=okay(await post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:amount,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true}},contractor));
    const c=okay(await get('workspaces/'+id+'/comparison',cm));
    okay(await post('workspaces/'+id+'/select',{quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:1,rationale:'Factual test selection',confirmed:true,acknowledgedCautions:[...c.quotes[0].cautions,'limited_comparison'],thresholdAcknowledged:true},mcst,c.version));
    await cmd(id,'work/start',{mode:'known',completedBy:new Date(now.getTime()+86400000).toISOString(),confirmed:true},contractor);return id;
  }
  async function file(id:string,purpose:'invoice'|'payment_proof',who=purpose==='invoice'?contractor:mcst) {
    const bytes=await sharp({create:{width:2,height:2,channels:3,background:{r:++color%255,g:50,b:60}}}).png().toBuffer();
    const upload=okay(await post('workspaces/'+id+'/completion/uploads',{purpose,mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},who));
    okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},who));okay(await post('uploads/'+upload.uploadId+'/finalize',{},who));
    for(let attempt=0;attempt<500;attempt++) {
      const work=await worker.claim();if(!work)break;await worker.process(work);
      const [state]=await db.query('SELECT state FROM upload_intents WHERE id=$1',[upload.uploadId]);if(state!.state==='ready')break;
    }
    const status=okay(await get('uploads/'+upload.uploadId,who));assert.equal(status.state,'ready');return status.objects.find((o:Record<string,unknown>)=>o.variant==='original').id as string;
  }
  const complete=async(id:string,amount='100.00',extra:Record<string,unknown>={})=>cmd(id,'completion/submit',{invoiceFileId:await file(id,'invoice'),amountSgd:amount,explanation:'Factual invoice',completedAt:now.toISOString(),evidenceIds:[],confirmed:true,...extra},contractor);
  const inspect=async(id:string,outcome='accepted',extra:Record<string,unknown>={})=>cmd(id,'completion/inspect',{round:(await detail(id,cm)).completion.round,outcome,checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:outcome==='accepted'?'':'Valve still leaks',satisfactory:outcome==='accepted',confirmed:true,...extra},cm);
  const confirm=async(id:string,amount='100.00')=>cmd(id,'payments/confirm-invoice',{invoiceVersion:(await detail(id,mcst)).completion.invoice_version,amountSgd:amount,confirmed:true},mcst);
  const transfer=async(id:string,amount='100.00',extra:Record<string,unknown>={})=>cmd(id,'payments/transfer',{invoiceVersion:(await detail(id,mcst)).completion.confirmed_version,proofId:await file(id,'payment_proof'),amountSgd:amount,transferDate:now.toISOString().slice(0,10),rationale:'Agreed partial instalment',reference:'',completedTransfer:true,confirmed:true,duplicateAcknowledged:false,...extra},mcst);
  const prepared=async(amount='100.00')=>{const id=await job(amount);await complete(id,amount);await inspect(id);await confirm(id,amount);return id;};
  try {
    cm=await login('cm@example.test');mcst=await login('mcst@example.test');contractor=await login('contractor@example.test');admin=await login('admin@example.test');peer=await login('mcsttwo@example.test');
    await db.query('UPDATE memberships SET estate_id=$1 WHERE user_id=$2',[ids.otherEstate,ids.cm2]);other=await login('cmtwo@example.test');
    okay(await post('admin/trades/plumbing/configure',{requiredTypeIds:[],reason:'Fictional explicit configuration'},admin,1));
    okay(await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'100.00',reason:'Fictional threshold'},admin,1));
    await db.query('UPDATE organisations SET verified=true WHERE id=$1',[ids.organisation]);
    await db.query("INSERT INTO contractor_profiles VALUES($1,'Fictional contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[ids.organisation,now.toISOString()]);
    let id=await job();
    await t.test('CH11-T01/T02/T08: ready invoice plus deliberate declaration, optional photos, no upload-only completion, immutable idempotent round',async()=>{
      const invoice=await file(id,'invoice'),v=(await detail(id,contractor)).version;
      assert.equal((await detail(id,cm)).completion,null);
      assert.equal((await post('workspaces/'+id+'/completion/submit',{invoiceFileId:randomUUID(),amountSgd:'100.00',explanation:'',completedAt:now.toISOString(),evidenceIds:[],confirmed:true},contractor,v)).statusCode,422);
      const body={invoiceFileId:invoice,amountSgd:'100.00',explanation:'',completedAt:now.toISOString(),evidenceIds:[],confirmed:false};
      assert.equal((await post('workspaces/'+id+'/completion/submit',body,contractor,v)).statusCode,422);body.confirmed=true;
      const key=randomUUID(),result=okay(await post('workspaces/'+id+'/completion/submit',body,contractor,v,key));assert.deepEqual(okay(await post('workspaces/'+id+'/completion/submit',body,contractor,v,key)),result);
      assert.equal(okay(await get('operations/'+key,contractor)).round,1);
      assert.equal((await db.query('SELECT * FROM completion_rounds WHERE job_id=$1',[id])).length,1);
      await assert.rejects(db.query("UPDATE completion_rounds SET scope='tamper' WHERE job_id=$1",[id]));
      assert.equal((await detail(id,cm)).stage,"CM's Inspecting of work");
      await worker.tick(500);
    });
    await t.test('CH11-T03/T04/T09/T10: negative route needs findings, no positive checkbox; every corrected physical round gets fresh inspection',async()=>{
      const v=(await detail(id,cm)).version;
      assert.equal((await post('workspaces/'+id+'/completion/inspect',{round:1,outcome:'unsatisfactory',checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:'',satisfactory:false,confirmed:true},cm,v)).statusCode,422);
      await inspect(id,'unsatisfactory');assert.equal((await detail(id,cm)).stage,'Addressing issues');
      await cmd(id,'completion/respond',{round:1,response:'Will replace valve seal'},contractor);
      assert.equal((await detail(id,cm)).completion.accepted_round,null);
      now=new Date('2026-11-08T04:00:00Z');await complete(id,'100.00',{originatingRound:1,explanation:'Replaced seal in response to originating leak'});
      let d=await detail(id,cm);assert.equal(d.completion.round,2);assert.equal(d.rounds[0].outcome,'unsatisfactory');assert.equal(d.rounds[1].originating_round,1);assert.equal(d.completion.accepted_round,null);
      assert.equal((await post('workspaces/'+id+'/completion/inspect',{round:1,outcome:'accepted',checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:'',satisfactory:true,confirmed:true},cm,d.version)).statusCode,412);
      await worker.tick(500);
      const timers=await db.query("SELECT t.required_version,x.due_at FROM tasks t JOIN timer_jobs x ON x.task_id=t.id WHERE t.resource_id=$1 AND t.kind='completion.inspect' AND x.rule='response.actor' ORDER BY t.created_at",[id]);
      assert.equal(timers.length,2);assert.equal(timers[1]!.required_version,2);assert.ok(new Date(timers[1]!.due_at as string)>new Date(timers[0]!.due_at as string));
      await inspect(id);d=await detail(id,cm);assert.equal(d.completion.accepted_round,2);assert.equal(d.stage,'Confirming invoice');
      assert.equal(d.rounds.length,2);assert.equal((await db.query('SELECT * FROM inspections WHERE job_id=$1',[id])).length,2);
    });
    await t.test('CH11-T06/T07: differences block confirmation and notify MCST/Admin; invoice-only correction retains exact work acceptance',async()=>{
      const f=await file(id,'invoice');await cmd(id,'completion/invoice',{invoiceVersion:2,invoiceFileId:f,amountSgd:'110.00',explanation:'Unapproved extra cost'},contractor);
      assert.equal((await detail(id,cm)).stage,'Explaining price change');await worker.tick(500);
      assert.equal((await db.query("SELECT owner_role FROM tasks WHERE resource_id=$1 AND kind IN ('completion.difference.mcst','completion.difference.admin')",[id])).length,2);
      assert.equal((await post('workspaces/'+id+'/payments/confirm-invoice',{invoiceVersion:3,amountSgd:'110.00',confirmed:true},mcst,(await detail(id,mcst)).version)).statusCode,409);
      await get('workspaces/'+id+'/completion',mcst);assert.equal((await detail(id,cm)).completion.confirmed_version,null);
      await cmd(id,'completion/invoice',{invoiceVersion:3,invoiceFileId:await file(id,'invoice'),amountSgd:'100.00',explanation:'Removed unapproved extra charge'},contractor);
      const d=await detail(id,cm);assert.equal(d.completion.accepted_round,2);assert.equal(d.rounds.length,2);assert.equal(d.invoices.length,4);
    });
    await t.test('CH12-T01: CM denied; exact version/amount, named equal-role MCST, one frozen confirmation and billing source',async()=>{
      const d=await detail(id,mcst),body={invoiceVersion:d.completion.invoice_version,amountSgd:'100.00',confirmed:true};
      assert.equal((await post('workspaces/'+id+'/payments/confirm-invoice',body,cm,d.version)).statusCode,403);
      assert.equal((await post('workspaces/'+id+'/payments/confirm-invoice',{...body,invoiceVersion:1},mcst,d.version)).statusCode,412);
      assert.equal((await post('workspaces/'+id+'/payments/confirm-invoice',{...body,amountSgd:'99.99'},mcst,d.version)).statusCode,409);
      const key=randomUUID(),confirmed=okay(await post('workspaces/'+id+'/payments/confirm-invoice',body,peer,d.version,key));assert.deepEqual(okay(await post('workspaces/'+id+'/payments/confirm-invoice',body,peer,d.version,key)),confirmed);
      assert.equal((await db.query('SELECT * FROM billing_sources WHERE job_id=$1',[id])).length,1);assert.equal((await detail(id,mcst)).confirmations[0].actor_id,undefined);
      const [named]=await db.query('SELECT actor_id FROM invoice_confirmations WHERE job_id=$1',[id]);assert.equal(named!.actor_id,ids.mcst2);
      assert.equal((await post('workspaces/'+id+'/completion/invoice',{invoiceVersion:4,invoiceFileId:fallbackFile(),amountSgd:'100.00',explanation:'Changed'},contractor,confirmed.version)).statusCode,409);
    });
    function fallbackFile(){return randomUUID();}
    await t.test('CH12-T02/T03/T08: completed proof purpose, partial rationale, bounds, idempotent lost-response recovery, no phantom transfer',async()=>{
      const proof=await file(id,'payment_proof'),d=await detail(id,mcst),body={invoiceVersion:4,proofId:proof,amountSgd:'40.00',transferDate:'2026-11-02',rationale:'',reference:'',completedTransfer:true,confirmed:true,duplicateAcknowledged:false};
      assert.equal((await post('workspaces/'+id+'/payments/transfer',body,mcst,d.version)).statusCode,422);
      assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,rationale:'Partial',proofId:await file(id,'invoice')},mcst,d.version)).statusCode,422);
      assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,rationale:'Partial',completedTransfer:false},mcst,d.version)).statusCode,422);
      body.rationale='Remaining after paperwork';const key=randomUUID(),result=okay(await post('workspaces/'+id+'/payments/transfer',body,mcst,d.version,key));assert.deepEqual(okay(await post('workspaces/'+id+'/payments/transfer',body,mcst,d.version,key)),result);
      assert.equal(okay(await get('operations/'+key,mcst)).version,result.version);
      const latest=await detail(id,contractor);assert.equal(latest.transfers.length,1);assert.equal(latest.balances.unsentCents,'6000');assert.equal(latest.transfers[0].rationale,body.rationale);
      assert.equal((await get('files/'+proof,contractor)).statusCode,200);
      assert.equal((await get('workspaces/'+id+'/completion',other)).statusCode,404);
    });
    await t.test('CH12-T04/T05: failed receipt notice gives no silence anchor; late transfer window starts at durable notice, retry/read never resets',async()=>{
      const [tid]=await db.query('SELECT receipt_task_id FROM payment_transfers WHERE job_id=$1',[id]);
      await db.query('UPDATE memberships SET active=false WHERE id=$1',[ids.contractor]);await worker.tick(500);
      assert.equal((await detail(id,mcst)).transfers[0].first_issued_at,null);
      now=new Date('2026-11-12T02:00:00Z');await db.query('UPDATE memberships SET active=true WHERE id=$1',[ids.contractor]);await worker.tick(500);
      let d=await detail(id,contractor);assert.equal(d.transfers[0].receipt_due_at,'2026-11-19T02:00:00.000Z');
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.mcst'",[id])).length,0,'A valid partial transfer is a payment update; retain balance follow-up without a false missing-update notice');
      await worker.tick(500);d=await detail(id,contractor);assert.equal(d.transfers[0].receipt_due_at,'2026-11-19T02:00:00.000Z');
      const [notice]=await db.query('SELECT id FROM notifications WHERE task_id=$1',[tid!.receipt_task_id]);okay(await post('notifications/'+notice!.id+'/read',{},contractor));assert.equal((await detail(id,contractor)).transfers[0].receipt_due_at,d.transfers[0].receipt_due_at);
      await cmd(id,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'40.00',receiptDate:'2026-11-02',confirmed:true},contractor);
      assert.equal((await detail(id,contractor)).transfers[0].receipt_date,'2026-11-02');assert.equal((await detail(id,contractor)).stage,'Unresolved payment');
    });
    await t.test('CH12-T06/T07/T12: disputed instalment never deemed; later silent transfer assumed once, popup dismissal is not receipt',async()=>{
      now=new Date('2026-11-12T02:00:00Z');
      const j=await prepared();await transfer(j,'40.00');await worker.tick(500);let d=await detail(j,contractor);
      await cmd(j,'payments/issue',{transferId:d.transfers[0].id,description:'First instalment not in bank'},contractor);
      await transfer(j,'60.00');await worker.tick(500);d=await detail(j,contractor);const silent=d.transfers.find((t:Record<string,unknown>)=>t.status==='pending');
      now=new Date(silent.receipt_due_at);await worker.tick(500);await worker.tick(500);d=await detail(j,contractor);
      assert.equal(d.balances.receivedCents,'6000');assert.equal(d.balances.disputedCents,'4000');assert.equal(d.stage,'Admin Intervention');
      assert.equal(d.transfers.find((t:Record<string,unknown>)=>t.id===silent.id).showAssumedPopup,true);
      await cmd(j,'payments/understood',{transferId:silent.id},contractor);d=await detail(j,contractor);assert.equal(d.transfers.find((t:Record<string,unknown>)=>t.id===silent.id).status,'assumed');
      assert.equal((await db.query("SELECT * FROM payment_events WHERE job_id=$1 AND kind='receipt.assumed'",[j])).length,1);
      await cmd(j,'payments/resolve',{transferId:d.transfers.find((t:Record<string,unknown>)=>t.status==='disputed').id,outcome:'actual',reason:'Bank credit verified',executionEvidence:'Fictional bank statement reviewed',receiptDate:'2026-11-12'},admin);
      assert.equal((await detail(j,mcst)).stage,'Closed');
      await cmd(j,'payments/issue',{transferId:silent.id,description:'Assumed credit is incorrect'},contractor);assert.equal((await detail(j,mcst)).stage,'Admin Intervention');
      assert.equal((await db.query('SELECT * FROM settlement_anchors WHERE job_id=$1',[j])).length,0);
      const unresolved={transferId:silent.id,outcome:'pending',reason:'Receipt remains unverified',executionEvidence:'Bank transfer completed but beneficiary tracing pending'};
      assert.equal((await post('workspaces/'+j+'/payments/resolve',unresolved,admin,(await detail(j,admin)).version)).statusCode,422);
      await cmd(j,'payments/resolve',{...unresolved,nextAction:'Admin follows up on beneficiary bank tracing',followUpAt:new Date(now.getTime()+86400000).toISOString()},admin);
      now=new Date(now.getTime()+86400000*9);await worker.tick(500);assert.equal((await detail(j,mcst)).transfers.find((t:Record<string,unknown>)=>t.id===silent.id).status,'disputed');
      assert.equal((await detail(j,mcst)).stage,'Admin Intervention');
      assert.equal((await db.query("SELECT id FROM tasks WHERE support_id=(SELECT issue_id FROM payment_transfers WHERE id=$1) AND status='open' AND follow_up_at IS NOT NULL",[silent.id])).length,1);
    });
    await t.test('CH12-T09/T10: zero payable closes with performed-work anchor and no fake transfers; cancellation stays Cancelled',async()=>{
      const j=await job(),w=okay(await get('workspaces/'+j+'/work',contractor));
      const reduction=await cmd(j,'variations',{kind:'scope_price',confirmed:true,proposal:{reason:'Contractor waives the performed-work charge',scope:w.state.scope,newTotalSgd:'0.00',timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},contractor);
      await cmd(j,'variations/decide',{variationId:reduction.variationId,proposalVersion:reduction.proposalVersion,outcome:'approved',confirmed:true},mcst);
      await complete(j,'0.00');await inspect(j);await confirm(j,'0.00');const d=await detail(j,mcst);assert.equal(d.stage,'Closed');assert.equal(d.transfers.length,0);assert.equal(d.settlementAnchor.source,'zero performed-work confirmation');
      const cancelled=await prepared();await transfer(cancelled);await worker.tick(500);await db.query("UPDATE work_state SET status='cancelled' WHERE job_id=$1",[cancelled]);await db.query("UPDATE job_records SET stage='Cancelled' WHERE id=$1",[cancelled]);
      now=new Date(now.getTime()+86400000*8);await worker.tick(500);assert.equal((await detail(cancelled,mcst)).stage,'Cancelled');assert.equal((await detail(cancelled,mcst)).transfers[0].status,'assumed','Chapter 14 preserves confirmed debts and their receipt response clocks through cancellation');
    });
    await t.test('CH12-T11/T01: progress is not money or a made-up deadline; one/three business-day follow-up uses correct estate recipients',async()=>{
      const j=await prepared(),d=await detail(j,mcst);assert.ok(d.followUp);assert.equal((await detail(j,cm)).followUp,null);assert.equal((await detail(j,contractor)).followUp,null);
      await cmd(j,'payments/progress',{explanation:'Awaiting paperwork',nextUpdateAt:new Date(now.getTime()+3*86400000).toISOString()},mcst);
      assert.equal((await detail(j,mcst)).balances.unsentCents,'10000');assert.equal((await detail(j,mcst)).transfers.length,0);
      now=new Date(d.followUp.threeBusinessDays);await worker.tick(500);
      assert.equal((await db.query('SELECT * FROM payment_checkpoints WHERE job_id=$1',[j])).length,1);
      assert.equal((await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open'",[j])).length,1);
    });
    await t.test('Duplicate review distinguishes a possible same-amount instalment, while exact proof reuse is permanently refused',async()=>{
      const j=await prepared();await transfer(j,'50.00');
      const proof=await file(j,'payment_proof'),d=await detail(j,mcst),body={invoiceVersion:1,proofId:proof,amountSgd:'50.00',transferDate:now.toISOString().slice(0,10),rationale:'',reference:'',completedTransfer:true,confirmed:true,duplicateAcknowledged:false};
      const r=await post('workspaces/'+j+'/payments/transfer',body,mcst,d.version);assert.equal(r.statusCode,409);assert.equal(r.json().error.code,'POSSIBLE_DUPLICATE');
      okay(await post('workspaces/'+j+'/payments/transfer',{...body,duplicateAcknowledged:true},mcst,d.version));assert.equal((await detail(j,mcst)).transfers.length,2);
      assert.equal((await post('workspaces/'+j+'/payments/transfer',{...body,duplicateAcknowledged:true},mcst,(await detail(j,mcst)).version)).statusCode,422);
    });
    await t.test('Concurrent receipt/assumption and later issue retain one settlement allocation with immutable event history',async()=>{
      const j=await prepared();await transfer(j);await worker.tick(500);const d=await detail(j,contractor),tid=d.transfers[0].id;
      now=new Date(d.transfers[0].receipt_due_at);
      const results=await Promise.all([worker.tick(500),post('workspaces/'+j+'/payments/receipt',{transferId:tid,amountSgd:'100.00',receiptDate:now.toISOString().slice(0,10),confirmed:true},contractor,d.version)]);
      const response=results[1];assert.ok([200,412].includes(response!.statusCode),response!.body);
      let latest=await detail(j,mcst);assert.equal(latest.balances.receivedCents,'10000');assert.equal(latest.stage,'Closed');assert.equal(latest.transfers.length,1);
      await cmd(j,'payments/issue',{transferId:tid,description:'Credit discrepancy discovered'},contractor);latest=await detail(j,mcst);assert.equal(latest.balances.receivedCents,'0');assert.equal(latest.stage,'Admin Intervention');
      assert.ok(latest.events.some((e:Record<string,unknown>)=>e.kind==='receipt.actual'||e.kind==='receipt.assumed'));
    });
    await t.test('CM identity concealment protects raw documents and free text without exposing billing records',async()=>{
      const j=await prepared();await transfer(j);await db.query('UPDATE estates SET contractor_identities_visible=false WHERE id=$1',[ids.estate]);
      const d=await detail(j,cm);assert.equal(d.invoices[0].file_id,null);assert.equal(d.transfers[0].proof_id,null);
      const full=await detail(j,mcst);assert.equal((await get('files/'+full.invoices[0].file_id,cm)).statusCode,404);
      assert.equal((await get('files/'+full.invoices[0].file_id,mcst)).statusCode,200);assert.ok(!JSON.stringify(d).includes('basis_cents'));
      await db.query('UPDATE estates SET contractor_identities_visible=true WHERE id=$1',[ids.estate]);
    });
    await t.test('CH11-T05/T06: new physical work invalidates accepted round; an explicit price-only reduction retains acceptance',async()=>{
      const j=await job();await complete(j);await inspect(j);
      await complete(j,'100.00',{originatingRound:1,explanation:'Additional physical correction following the accepted round'});
      let d=await detail(j,cm);assert.equal(d.completion.accepted_round,null);assert.equal(d.rounds[0].outcome,'accepted');assert.equal(d.rounds[1].outcome,null);
      await inspect(j);d=await detail(j,cm);const scope=d.completion.scope;
      const variation=await cmd(j,'variations',{kind:'scope_price',confirmed:true,proposal:{reason:'Explicit agreed invoice reduction',scope,newTotalSgd:'90.00',timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},contractor);
      await cmd(j,'variations/decide',{variationId:variation.variationId,proposalVersion:variation.proposalVersion,outcome:'approved',confirmed:true},cm);
      assert.equal((await detail(j,cm)).completion.accepted_round,2);
      await cmd(j,'completion/invoice',{invoiceVersion:2,invoiceFileId:await file(j,'invoice'),amountSgd:'90.00',explanation:'Matched explicit approved reduction'},contractor);await confirm(j,'90.00');
      assert.equal((await detail(j,mcst)).balances.payableCents,'9000');assert.equal((await detail(j,cm)).rounds.length,2);
    });
    await t.test('Financial transaction failure rolls back transfer, notice, audit and idempotency receipt; competing payments use one current balance',async()=>{
      const j=await prepared(),proof=await file(j,'payment_proof'),d=await detail(j,mcst),key=randomUUID(),body={invoiceVersion:1,proofId:proof,amountSgd:'100.00',transferDate:now.toISOString().slice(0,10),rationale:'',reference:'',completedTransfer:true,confirmed:true,duplicateAcknowledged:false};
      await db.exec("CREATE FUNCTION fail_payment_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='payment.transfer' THEN RAISE EXCEPTION 'test'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_payment_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_payment_audit();");
      assert.equal((await post('workspaces/'+j+'/payments/transfer',body,mcst,d.version,key)).statusCode,500);
      assert.equal((await detail(j,mcst)).transfers.length,0);assert.equal((await db.query('SELECT * FROM command_receipts WHERE operation_id=$1',[key])).length,0);
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='payment.receipt'",[j])).length,0);
      await db.exec('DROP TRIGGER reject_payment_audit ON audit_events; DROP FUNCTION fail_payment_audit();');
      const peerProof=await file(j,'payment_proof',peer);
      const responses=await Promise.all([post('workspaces/'+j+'/payments/transfer',body,mcst,d.version,key),post('workspaces/'+j+'/payments/transfer',{...body,proofId:peerProof},peer,d.version)]);
      assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,412]);assert.equal((await detail(j,mcst)).transfers.length,1);
      await assert.rejects(db.query('UPDATE payment_transfers SET amount_cents=1 WHERE job_id=$1',[j]));
    });
  } finally {await app.close();}
});
