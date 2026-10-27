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
import {workDestination,type WorkState} from '../packages/domain/work-core.js';
import {variationApprover} from '../packages/domain/variation-service.js';
import {workTimers} from '../packages/domain/work-clocks.js';

type Client={cookie:string;csrf:string};
const proposal=(total='100.00',extra:Record<string,unknown>={})=>({reason:'Confirmed additional repair scope',scope:'Original scope plus valve replacement',newTotalSgd:total,timing:'unchanged',canContinueOriginal:true,canContinueApproved:true,...extra});
test('Variation routing and integer-cent approval boundaries',()=>{
  assert.equal(variationApprover(10000n,10000n,null),'cm');
  assert.equal(variationApprover(10001n,10000n,null),'mcst');
  assert.equal(variationApprover(95000n,10000n,100000n),'cm');
  assert.equal(variationApprover(100001n,10000n,100000n),'mcst');
  const w={status:'active',resume_context:'work',started_at:null} as WorkState;
  assert.equal(workDestination(w),'Starting work');assert.equal(workDestination({...w,started_at:'2026-10-14T04:00Z'}),'Carrying out work');
  assert.equal(workDestination({...w,resume_context:'invoice'}),'Explaining price change');
  assert.equal(workDestination({...w,resume_context:'inspection'}),"CM's Inspecting of work");
  assert.equal(workDestination({...w,status:'interrupted'}),'Unable to continue work');assert.equal(workDestination({...w,status:'cancelled'}),'Cancelled');
});
test('Migration 008 backfills previously authorised work without changing its signed quote, price, actor or scope',async()=>{
  const db=await testDatabase(loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}));
  try {
    await migrate(db,'test','007_local_account_helper.sql');await installFixtures(db,'test');
    const job=randomUUID(),round=randomUUID(),quote=randomUUID(),selection=randomUUID(),authorisation=randomUUID(),at='2026-10-13T04:00:00Z';
    await db.query("INSERT INTO job_records(id,estate_id,created_by,title,observations,affected_location,stage,created_at,updated_at) VALUES($1,$2,$3,'Previous authorised repair','','Private room','Starting work',$4,$4)",[job,ids.estate,ids.cm,at]);
    await db.query("INSERT INTO rfq_versions VALUES($1,1,1,$2,'initial','',$3,$4)",[job,{publicDescription:'Exact previous approved scope'},ids.cm,at]);
    await db.query("INSERT INTO quotation_rounds(id,job_id,number,status,published_at,sourcing_due_at) VALUES($1,$2,1,'closed',$3,$4)",[round,job,at,'2026-10-15T04:00:00Z']);
    await db.query("INSERT INTO quotes(id,job_id,organisation_id,round_id,current_version,status,version) VALUES($1,$2,$3,$4,1,'active',1)",[quote,job,ids.organisation,round]);
    await db.query('INSERT INTO quote_versions VALUES($1,1,1,1,$2,12000,\'2026-12-31\',$3,NULL,\'\',$4,$5)',[quote,{amountSgd:'120.00'},'2026-12-31T16:00:00Z',ids.contractor,at]);
    await db.query('INSERT INTO contractor_selections VALUES($1,$2,$3,$4,1,$5,10000,1,12000,\'Original rationale\',$6,$7,\'cm\',$8)',[selection,job,round,quote,ids.organisation,{},ids.cm,at]);
    await db.query("INSERT INTO selection_decisions VALUES($1,$2,'approved','',$3,$4,$5)",[randomUUID(),selection,{},ids.mcst,at]);
    await db.query('INSERT INTO work_authorisations VALUES($1,$2,$3,$4,$5,1,12000,$6,$7,$8)',[authorisation,job,selection,ids.organisation,quote,{amountSgd:'120.00'},ids.mcst,at]);
    const original=await db.query('SELECT * FROM work_authorisations WHERE job_id=$1',[job]);
    await migrate(db,'test');const now=new Date('2026-10-14T04:00:00Z');
    await db.transaction(tx=>workTimers(tx,now));await db.transaction(tx=>workTimers(tx,now));
    assert.deepEqual(await db.query('SELECT * FROM work_authorisations WHERE job_id=$1',[job]),original);
    const [terms]=await db.query('SELECT * FROM work_terms WHERE job_id=$1',[job]);assert.equal(terms!.scope,'Exact previous approved scope');assert.equal(Number(terms!.amount_cents),12000);assert.equal(Number(terms!.mcst_authorised_cents),12000);assert.equal(terms!.actor_id,ids.mcst);
    assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='work.agree-start'",[job])).length,1);
  } finally {await db.close();}
});
test('Chapters 09/10: exact work authority, schedules, immutable variations and clocks',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}),db=await testDatabase(config);
  await migrate(db,'test');await installFixtures(db,'test');let now=new Date('2026-10-16T04:00:00Z'),address=0;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>now);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>'clean'},()=>now);
  const post=(path:string,body:unknown,c:Client,v=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+path,payload:body as Record<string,unknown>,remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin,cookie:c.cookie,'x-csrf-token':c.csrf,'x-access-version':'1','if-match':`"record-${v}"`,'idempotency-key':key}});
  const get=(path:string,c:Client)=>app.inject({url:'/api/v1/'+path,remoteAddress:'127.0.0.'+(++address%240+1),headers:{cookie:c.cookie}});
  const okay=(r:Awaited<ReturnType<typeof post>>)=>{assert.equal(r.statusCode,200,r.body);return r.json();};
  async function login(email:string) {const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin}});okay(r);await db.query("UPDATE sessions SET expires_at='2027-12-31T00:00Z'");return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
  const detail=async(id:string,c:Client)=>okay(await get('workspaces/'+id+'/work',c));
  const cmd=async(id:string,path:string,body:unknown,c:Client)=>okay(await post('workspaces/'+id+'/'+path,body,c,(await detail(id,c)).version));
  let cm:Client,mcst:Client,admin:Client,contractor:Client,rival:Client,otherEstate:Client,peerMcst:Client;
  async function job(amount='100.00') {
    const created=okay(await post('workspaces',{estateId:ids.estate,title:'Fictional work test',observations:'Fictional observation',affectedLocation:'Private plant room'},cm));const id=created.jobId as string;
    okay(await post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to photograph',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Plant room',evidenceIds:[]},cm,1));
    okay(await post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,2));
    const q=okay(await post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:amount,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true}},contractor));
    const c=okay(await get('workspaces/'+id+'/comparison',cm));
    okay(await post('workspaces/'+id+'/select',{quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:1,rationale:'Factual test selection',confirmed:true,acknowledgedCautions:[...c.quotes[0].cautions,'limited_comparison'],thresholdAcknowledged:true},BigInt(Math.round(Number(amount)*100))>BigInt(c.thresholdCents)?mcst:cm,c.version));return id;
  }
  const submit=async(id:string,kind:string,p:unknown,c:Client)=>cmd(id,'variations',{kind,proposal:p,confirmed:true},c);
  const decision=async(id:string,v:Record<string,any>,outcome:string,c:Client,extra:Record<string,unknown>={})=>cmd(id,'variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome,confirmed:true,...extra},c);
  const schedule=(at:Date)=>({reason:'Agreed access window',timing:'changed',targetAt:at.toISOString(),timingReason:'Site access arranged',canContinueOriginal:true,canContinueApproved:true});
  try {
    cm=await login('cm@example.test');mcst=await login('mcst@example.test');admin=await login('admin@example.test');contractor=await login('contractor@example.test');
    peerMcst=await login('mcsttwo@example.test');
    okay(await post('admin/trades/plumbing/configure',{requiredTypeIds:[],reason:'Fictional test explicit configuration'},admin,1));
    await db.query('UPDATE organisations SET verified=true WHERE id=$1',[ids.organisation]);
    await db.query("INSERT INTO contractor_profiles VALUES($1,'Fictional contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[ids.organisation,now.toISOString()]);
    okay(await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'100.00',reason:'Fictional test threshold'},admin,1));
    const org=randomUUID(),user=randomUUID(),[hash]=await db.query('SELECT password_hash FROM users WHERE id=$1',[ids.contractor]);
    await db.query("INSERT INTO organisations(id,name,verified) VALUES($1,'Fictional Rival',true)",[org]);
    await db.query("INSERT INTO users(id,email,name,password_hash,email_verified) VALUES($1,'rival@example.test','Fictional Rival User',$2,true)",[user,hash!.password_hash]);
    await db.query("INSERT INTO memberships(id,user_id,role,organisation_id) VALUES($1,$2,'contractor',$3)",[randomUUID(),user,org]);rival=await login('rival@example.test');
    await db.query('UPDATE memberships SET estate_id=$1 WHERE user_id=$2',[ids.otherEstate,ids.cm2]);otherEstate=await login('cmtwo@example.test');
    let id=await job();
    await t.test('CH09-T01: Start input alternatives, selected access, current authority, explicit actual Start and idempotency',async()=>{
      assert.equal((await get('workspaces/'+id+'/work',rival)).statusCode,404);assert.equal((await get('workspaces/'+id+'/work',otherEstate)).statusCode,404);
      const version=(await detail(id,contractor)).version;
      for(const b of [{mode:'known',completedBy:'2026-10-17',confirmed:true},{mode:'known',confirmed:true},{mode:'unknown',reason:' ',confirmed:true},{mode:'known',completedBy:now.toISOString(),confirmed:true},{mode:'unknown',reason:'Needs access',completedBy:'2026-10-17T10:00:00+08:00',confirmed:true}])
        assert.equal((await post('workspaces/'+id+'/work/start',b,contractor,version)).statusCode,422);
      assert.equal((await post('workspaces/'+id+'/work/start',{mode:'unknown',reason:'Needs access',confirmed:true},cm,version)).statusCode,403);
      const key=randomUUID(),b={mode:'unknown',reason:'Need to open concealed pipe',confirmed:true};
      const started=okay(await post('workspaces/'+id+'/work/start',b,contractor,version,key));assert.deepEqual(okay(await post('workspaces/'+id+'/work/start',b,contractor,version,key)),started);
      assert.equal(started.estimateDueAt,'2026-10-17T04:00:00.000Z');assert.equal((await detail(id,contractor)).state.stage,'Carrying out work');
      assert.equal(okay(await get('operations/'+key,contractor)).eventId,started.eventId);
      assert.equal((await post('workspaces/'+id+'/work/start',b,contractor,started.version)).statusCode,409);
      assert.equal((await db.query("SELECT id FROM work_events WHERE job_id=$1 AND kind='work.started'",[id])).length,1);
    });
    await t.test('CH09-T02/T03: unknown estimate uses 24 elapsed hours across weekend; only Admin extends; missed history survives',async()=>{
      now=new Date('2026-10-17T03:59:59Z');await worker.tick(300);assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T21'",[id])).length,0);
      now=new Date('2026-10-17T04:00:00Z');await worker.tick(300);assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T21'",[id])).length,1);
      const b={dueAt:'2026-10-18T06:00:00Z',reason:'Admin accepted inaccessible plant-room exception'};
      assert.equal((await post('workspaces/'+id+'/work/estimate/extend',b,contractor,(await detail(id,contractor)).version)).statusCode,403);
      await cmd(id,'work/estimate/extend',b,admin);assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T21'",[id])).length,1);
      await cmd(id,'work/estimate',{completedBy:'2026-10-19T04:00:00Z'},contractor);await worker.tick(300);
      assert.equal((await detail(id,cm)).state.completion_target_version,1);assert.equal((await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='work.T21.admin' AND status='open'",[id])).length,0);
      assert.equal((await post('workspaces/'+id+'/work/estimate',{completedBy:'2026-10-20T04:00:00Z'},contractor,(await detail(id,contractor)).version)).statusCode,409);
    });
    await t.test('G03/T22: no agreed start has Contractor task; failed first notice never starts its 2/5 BD clock',async()=>{
      const j=await job();await db.query('UPDATE memberships SET active=false WHERE id=$1',[ids.contractor]);await worker.tick(300);
      const [task]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='work.agree-start'",[j]);assert.equal(task!.first_issued_at,null);assert.equal((await db.query('SELECT * FROM timer_jobs WHERE task_id=$1',[task!.id])).length,0);
      await db.query('UPDATE memberships SET active=true WHERE id=$1',[ids.contractor]);now=new Date(now.getTime()+2000);await worker.tick(300);
      const due=await db.query('SELECT * FROM timer_jobs WHERE task_id=$1 ORDER BY due_at',[task!.id]);assert.equal(due.length,2);assert.equal(new Date(due[0]!.due_at as string).toISOString(),'2026-10-20T15:59:00.000Z');assert.equal(new Date(due[1]!.due_at as string).toISOString(),'2026-10-23T15:59:00.000Z');
      assert.equal((await detail(j,cm)).state.started_at,null);
    });
    await t.test('CH09-T04: exact agreed schedule, missed Start notices, no automatic commencement and obsolete suppression',async()=>{
      const j=await job(),at=new Date(now.getTime()+3600000),v=await submit(j,'start_schedule',schedule(at),contractor);
      assert.equal((await detail(j,cm)).state.scheduled_start_at,null);await decision(j,v,'approved',cm);
      now=at;await worker.tick(300);let d=await detail(j,cm);assert.equal(d.state.started_at,null);assert.equal(d.notices.filter((n:any)=>n.kind==='work.T23.admin').length,1);
      now=new Date(at.getTime()+86400000);await worker.tick(300);d=await detail(j,cm);assert.equal(d.notices.filter((n:any)=>n.kind==='work.T23.estate').length,2);
      await cmd(j,'work/start',{mode:'known',completedBy:new Date(now.getTime()+86400000).toISOString(),confirmed:true},contractor);await worker.tick(300);
      assert.equal((await detail(j,cm)).notices.filter((n:any)=>n.kind.startsWith('work.T23')).length,0);assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T23'",[j])).length,2);
    });
    await t.test('CH09-T06/T07: completion revisions retain old target; stale Okay blocked; support does not accept or extend',async()=>{
      const j=await job(),target=new Date(now.getTime()+3600000);await cmd(j,'work/start',{mode:'known',completedBy:target.toISOString(),confirmed:true},contractor);
      let v=await submit(j,'completion_schedule',schedule(new Date(now.getTime()+7200000)),contractor),oldVersion=v.version;
      await decision(j,v,'intervention',cm,{reason:'Please help verify access timing'});assert.equal(new Date((await detail(j,cm)).state.completion_target_at).toISOString(),target.toISOString());assert.equal((await detail(j,cm)).state.status,'active');
      v=await cmd(j,'variations',{kind:'completion_schedule',variationId:v.variationId,proposalVersion:v.proposalVersion,proposal:schedule(new Date(now.getTime()+10800000)),confirmed:true},contractor);
      assert.equal((await post('workspaces/'+j+'/variations/decide',{variationId:v.variationId,proposalVersion:1,outcome:'approved',confirmed:true},cm,(await detail(j,cm)).version)).statusCode,412);
      assert.equal((await post('workspaces/'+j+'/variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true},cm,oldVersion)).statusCode,412);
      await decision(j,v,'approved',cm);assert.equal((await detail(j,cm)).state.completion_target_version,2);
      const j2=await job(),at=new Date(now.getTime()+1000);await cmd(j2,'work/start',{mode:'known',completedBy:at.toISOString(),confirmed:true},contractor);
      now=new Date(at.getTime()+86400000);await worker.tick(500);const d=await detail(j2,cm),notice=d.notices.find((n:any)=>n.kind==='work.T20.estate'&&n.owner_role==='cm');assert.ok(notice);
      okay(await post('workspaces/'+j2+'/work/notice',{taskId:notice.id,outcome:'okay'},cm,notice.version));
      assert.equal(new Date((await detail(j2,cm)).state.completion_target_at).toISOString(),at.toISOString());
      assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T20'",[j2])).length,2);
    });
    await t.test('CH09-T05: completion already recorded suppresses estate reminder; occurrence and recording time remain distinct',async()=>{
      const j=await job(),target=new Date(now.getTime()+3600000);await cmd(j,'work/start',{mode:'known',completedBy:target.toISOString(),confirmed:true},contractor);
      now=target;await worker.tick(500);assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T20'",[j])).length,1);
      // Chapter 11 owns the combined completion command. Fixture establishes physical completion 19h late separately.
      await db.query('UPDATE work_state SET completed_at=$1 WHERE job_id=$2',[new Date(target.getTime()+19*3600000).toISOString(),j]);
      now=new Date(target.getTime()+24*3600000);await worker.tick(500);
      assert.equal((await db.query("SELECT * FROM work_clock_events WHERE job_id=$1 AND rule='T20' AND checkpoint='estate'",[j])).length,0);
      assert.equal((new Date((await detail(j,cm)).state.completed_at).getTime()-target.getTime())/3600000,19);
    });
    await t.test('CH10-T01/T02: required Contractor confirmation, exact cents, threshold equality and explicit MCST approval above it',async()=>{
      id=await job();let v=await submit(id,'scope_price',proposal('100.00'),cm);assert.equal(v.contractorConfirmed,false);
      assert.equal((await post('workspaces/'+id+'/variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true},cm,v.version)).statusCode,409);
      assert.equal((await detail(id,cm)).state.amount_cents,10000);v=await cmd(id,'variations/confirm',{variationId:v.variationId,proposalVersion:v.proposalVersion,confirmed:true},contractor);await decision(id,v,'approved',cm);
      assert.equal((await detail(id,cm)).state.terms_version,2);
      v=await submit(id,'scope_price',proposal('100.01'),contractor);assert.equal(v.approverRole,'mcst');
      assert.equal((await post('workspaces/'+id+'/variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true},cm,v.version)).statusCode,403);
      await decision(id,v,'approved',mcst);assert.equal((await detail(id,cm)).state.amount_cents,10001);
      assert.equal((await post('workspaces/'+id+'/variations',{kind:'scope_price',proposal:proposal('100.001'),confirmed:true},contractor,(await detail(id,contractor)).version)).statusCode,422);
    });
    await t.test('Owner-approved MCST limit survives CM reductions and permits an increase within the held limit',async()=>{
      const j=await job('1000.00');assert.equal((await detail(j,cm)).state.mcst_authorised_cents,100000);
      let v=await submit(j,'scope_price',proposal('900.00'),contractor);assert.equal(v.approverRole,'cm');await decision(j,v,'approved',cm);
      v=await submit(j,'scope_price',proposal('950.00'),contractor);assert.equal(v.approverRole,'cm');await decision(j,v,'approved',cm);
      assert.equal((await detail(j,cm)).state.mcst_authorised_cents,100000);
      v=await submit(j,'scope_price',proposal('1000.01'),contractor);assert.equal(v.approverRole,'mcst');await decision(j,v,'approved',mcst);
      assert.equal((await detail(j,cm)).state.mcst_authorised_cents,100001);
      const history=await db.query('SELECT amount_cents FROM work_terms WHERE job_id=$1 ORDER BY version',[j]);assert.deepEqual(history.map(h=>Number(h.amount_cents)),[100000,90000,95000,100001]);
    });
    await t.test('CH10-T03/T04/T05/T09: mandatory rejection reasons, optional withdrawal note, permanent audit, correct W1 and infeasible E2',async()=>{
      const j=await job();let v=await submit(j,'scope_price',proposal('200.00'),contractor);
      for(const extra of [{},{reasonCode:'other',reason:' '}])assert.equal((await post('workspaces/'+j+'/variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'rejected',confirmed:true,...extra},mcst,v.version)).statusCode,422);
      const rejected=await decision(j,v,'rejected',mcst,{reasonCode:'price',reason:'Outside available funds'});assert.equal(rejected.destination,'Starting work');assert.equal((await detail(j,cm)).state.amount_cents,10000);
      assert.ok(JSON.stringify((await detail(j,cm)).decisions).includes('Outside available funds'));
      v=await submit(j,'scope_price',proposal('101.00'),contractor);await decision(j,v,'withdrawn',contractor);
      v=await submit(j,'scope_price',proposal('300.00',{canContinueOriginal:false}),contractor);const infeasible=await decision(j,v,'rejected',mcst,{reasonCode:'scope'});assert.equal(infeasible.destination,'Unable to continue work');
      const d=await detail(j,contractor);assert.equal(d.waitingOn.role,'admin');assert.equal(d.state.amount_cents,10000);
      assert.equal((await post('workspaces/'+j+'/work/start',{mode:'unknown',reason:'Need estimate',confirmed:true},contractor,d.version)).statusCode,409);
      assert.ok(okay(await get('operations/'+(await db.query("SELECT operation_id FROM command_receipts WHERE intent='variation.decide' AND result->>'supportId'=$1",[infeasible.supportId]))[0]!.operation_id,mcst)).supportId);
      await assert.rejects(db.query('UPDATE variation_decisions SET reason=\'erased\' WHERE variation_id=$1',[v.variationId]));
      await assert.rejects(db.query('UPDATE work_terms SET amount_cents=0 WHERE job_id=$1',[j]));
    });
    await t.test('CH09-T08/T10: interruption requires explicit safe resumption; unresolved access work names CM and retains follow-up',async()=>{
      const j=await job();await cmd(j,'work/interrupt',{reason:'Keys not supplied',affectedWork:'Access to valve'},contractor);
      const at=new Date(now.getTime()+3600000).toISOString();await cmd(j,'work/verdict',{outcome:'follow_up',reason:'CM must supply keys',safeAndFeasible:false,nextAction:'Supply keys for plant room',ownerRole:'cm',followUpAt:at},admin);
      let d=await detail(j,cm);assert.equal(d.state.status,'interrupted');assert.equal(d.waitingOn.role,'cm');
      assert.equal((await post('workspaces/'+j+'/work/verdict',{outcome:'resume',reason:'Awaiting keys',safeAndFeasible:false},admin,d.version)).statusCode,422);
      await cmd(j,'work/verdict',{outcome:'resume',reason:'Keys provided and authorised work safe',safeAndFeasible:true},admin);d=await detail(j,cm);assert.equal(d.state.status,'active');assert.equal(d.state.started_at,null);assert.equal(d.state.stage,'Starting work');
    });
    await t.test('CH10-T06: existing invoice/review contexts route without fabricating acceptance or modifying completed work records',async()=>{
      for(const [context,destination] of [['invoice','Explaining price change'],['inspection',"CM's Inspecting of work"]]) {
        const j=await job();await db.query('UPDATE work_state SET resume_context=$1 WHERE job_id=$2',[context,j]);
        const v=await submit(j,'scope_price',proposal('99.00'),contractor);assert.equal((await decision(j,v,'approved',cm)).destination,destination);
      }
    });
    await t.test('CH10-T07: simultaneous decisions, threshold changes and cancelled work cannot authorise stale extra work',async()=>{
      const j=await job(),v=await submit(j,'scope_price',proposal('100.00'),contractor),body={variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true};
      const results=await Promise.all([post('workspaces/'+j+'/variations/decide',body,cm,v.version),post('workspaces/'+j+'/variations/decide',body,mcst,v.version)]);assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,412]);
      const j2=await job(),v2=await submit(j2,'scope_price',proposal('100.00'),contractor),[estate]=await db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);
      okay(await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'50.00',reason:'New threshold after proposal'},admin,Number(estate!.version)));
      assert.equal((await post('workspaces/'+j2+'/variations/decide',{variationId:v2.variationId,proposalVersion:v2.proposalVersion,outcome:'approved',confirmed:true},cm,v2.version)).statusCode,412);
      await db.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock(734130)');await tx.query("UPDATE work_state SET status='cancelled' WHERE job_id=$1",[j2]);await tx.query("UPDATE job_records SET stage='Cancelled',version=version+1 WHERE id=$1",[j2]);});
      assert.equal((await post('workspaces/'+j2+'/work/start',{mode:'unknown',reason:'Start despite cancellation',confirmed:true},contractor,v2.version)).statusCode,412);
      assert.equal((await post('workspaces/'+j2+'/variations/decide',{variationId:v2.variationId,proposalVersion:v2.proposalVersion,outcome:'approved',confirmed:true},mcst,(await detail(j2,mcst)).version)).statusCode,409);
      // Rejected commands roll back observer writes too. The durable worker applies cancellation supersession.
      await worker.tick(500);
      assert.equal((await db.query('SELECT state FROM variations WHERE id=$1',[v2.variationId]))[0]!.state,'superseded');
      assert.equal((await db.query("SELECT t.id FROM tasks t JOIN variations v ON v.id=t.resource_id WHERE v.id=$1 AND t.status='open'",[v2.variationId])).length,0);
    });
    await t.test('Equal-role named accounts can revise/withdraw their party proposal; support reuses one case without moving targets',async()=>{
      const j=await job();let v=await submit(j,'scope_price',proposal('110.00'),mcst);
      assert.equal((await detail(j,peerMcst)).variations[0].canWithdraw,true);
      v=await cmd(j,'variations',{kind:'scope_price',variationId:v.variationId,proposalVersion:v.proposalVersion,proposal:proposal('115.00'),confirmed:true},peerMcst);
      await decision(j,v,'withdrawn',peerMcst);
      const target=new Date(now.getTime()+1000);await cmd(j,'work/start',{mode:'known',completedBy:target.toISOString(),confirmed:true},contractor);
      now=new Date(target.getTime()+86400000);await worker.tick(500);const d=await detail(j,cm),notices=d.notices.filter((n:any)=>n.kind==='work.T20.estate');
      const cmNotice=notices.find((n:any)=>n.owner_role==='cm'),mcstNotice=notices.find((n:any)=>n.owner_role==='mcst');
      const a=okay(await post('workspaces/'+j+'/work/notice',{taskId:cmNotice.id,outcome:'intervention',reason:'Please verify expected finish'},cm,cmNotice.version));
      const b=okay(await post('workspaces/'+j+'/work/notice',{taskId:mcstNotice.id,outcome:'intervention',reason:'Please coordinate access'},mcst,mcstNotice.version));
      assert.equal(a.supportId,b.supportId);assert.equal(new Date((await detail(j,cm)).state.completion_target_at).toISOString(),target.toISOString());
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='work.support'",[j])).length,1);
    });
    await t.test('CH09-T09: cancellation racing explicit Start leaves one consistent outcome and never restores cancelled work',async()=>{
      const j=await job(),version=(await detail(j,contractor)).version;
      const [start]=await Promise.all([post('workspaces/'+j+'/work/start',{mode:'unknown',reason:'Need access to estimate',confirmed:true},contractor,version),db.transaction(async tx=>{
        await tx.query('SELECT pg_advisory_xact_lock(734130)');await tx.query("UPDATE work_state SET status='cancelled' WHERE job_id=$1",[j]);await tx.query("UPDATE job_records SET stage='Cancelled',version=version+1 WHERE id=$1",[j]);
      })]);
      assert.ok([200,412].includes(start.statusCode),start.body);await worker.tick(500);const d=await detail(j,mcst);assert.equal(d.state.status,'cancelled');assert.equal(d.state.stage,'Cancelled');assert.equal(!!d.state.started_at,start.statusCode===200);
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind IN ('work.start','work.agree-start') AND status='open'",[j])).length,0);
    });
    await t.test('CH10-T08/privacy: ready work evidence does not conflict with pending decisions; masking covers files, free text and history',async()=>{
      const j=await job();await cmd(j,'work/start',{mode:'known',completedBy:new Date(now.getTime()+86400000).toISOString(),confirmed:true},contractor);
      const bytes=await sharp({create:{width:10,height:10,channels:3,background:'red'}}).png().toBuffer(),checksum=createHash('sha256').update(bytes).digest('hex');
      const upload=okay(await post('workspaces/'+j+'/work/uploads',{mediaType:'image/png',byteSize:bytes.length,checksum},contractor));
      const chunk=await app.inject({method:'POST',url:'/api/v1/uploads/'+upload.uploadId+'/chunks',payload:{offset:0,bytes:bytes.toString('base64')},headers:{origin:config.origin,cookie:contractor.cookie,'x-csrf-token':contractor.csrf}});okay(chunk);
      okay(await post('uploads/'+upload.uploadId+'/finalize',{},contractor));await worker.tick(500);const u=okay(await get('uploads/'+upload.uploadId,contractor)),file=u.objects.find((o:any)=>o.variant==='original');assert.ok(file);
      let v=await submit(j,'scope_price',proposal('101.00'),contractor),version=v.version;
      const update=await cmd(j,'work/update',{note:'Fictional Pending Contractor inspected the pipe',fileIds:[file.id]},contractor);assert.equal(update.version,version);
      assert.equal((await get('files/'+file.id,rival)).statusCode,404);assert.equal((await get('files/'+file.id,contractor)).statusCode,200);
      const [estate]=await db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);okay(await post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Conceal Contractor identities'},mcst,Number(estate!.version)));
      const masked=await detail(j,cm);assert.equal(masked.contractor.masked,true);assert.ok(!JSON.stringify(masked).includes('Fictional Pending Contractor'));assert.equal((await get('files/'+file.id,cm)).statusCode,404);assert.equal((await get('files/'+file.id,mcst)).statusCode,200);
      // Refresh the proposal against the changed estate policy; optional evidence did not change it.
      v=await cmd(j,'variations',{kind:'scope_price',variationId:v.variationId,proposalVersion:v.proposalVersion,proposal:proposal('101.00'),confirmed:true},contractor);await decision(j,v,'approved',mcst);
      assert.equal((await detail(j,mcst)).state.amount_cents,10100);
    });
    await t.test('Atomic failure rolls back terms, decisions, tasks, audit and receipt',async()=>{
      const j=await job(),v=await submit(j,'scope_price',proposal('120.00'),contractor),before=(await detail(j,mcst)).version;
      await db.exec("CREATE FUNCTION fail_work_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='variation.decide' THEN RAISE EXCEPTION 'test'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_work_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_work_audit();");
      const key=randomUUID(),body={variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true};
      assert.equal((await post('workspaces/'+j+'/variations/decide',body,mcst,before,key)).statusCode,500);
      assert.equal((await detail(j,mcst)).version,before);assert.equal((await detail(j,mcst)).state.amount_cents,10000);assert.equal((await db.query('SELECT * FROM variation_decisions WHERE variation_id=$1',[v.variationId])).length,0);assert.equal((await db.query('SELECT * FROM command_receipts WHERE operation_id=$1',[key])).length,0);
      await db.exec('DROP TRIGGER reject_work_audit ON audit_events; DROP FUNCTION fail_work_audit();');okay(await post('workspaces/'+j+'/variations/decide',body,mcst,before,key));
    });
  } finally {await app.close();}
});
