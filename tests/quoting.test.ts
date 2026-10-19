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
import {quoteCautions,validateTerms,type QuoteTerms} from '../packages/domain/quote-service.js';
import {comparisonFacts} from '../packages/domain/selection-service.js';
import {loadCalendar,remainingBusinessMs,resumeBusinessDue} from '../packages/domain/calendar.js';

type Client={cookie:string;csrf:string};
const terms=(amount='100.00',extra:Partial<QuoteTerms>={}):QuoteTerms=>({amountSgd:amount,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-03-31',expiryConfirmed:true,commitment:true,...extra});
test('CH07 field validation: explicit declarations, conditional details and precise SGD',()=>{
  const scope={categories:['plumbing'],urgency:'ordinary' as const,noPhotoReason:'No photo',grouping:'combined' as const,primaryPriority:'none',publicDescription:'Water under pipe',publicLocation:'Service room',evidenceIds:[]};
  const now=new Date('2026-10-13T04:00Z');
  for(const field of ['wasteDisposal','warranty','makingGood','gstCharged','availability','duration','exclusions','expiry','expiryConfirmed','commitment']) {
    const value=terms() as unknown as Record<string,unknown>;delete value[field];assert.throws(()=>validateTerms(value as unknown as QuoteTerms,scope,now),field);
  }
  for(const value of [terms('1.001'),terms('1',{warranty:true}),terms('1',{warranty:true,warrantyDuration:'other',warrantyOther:' '}),terms('1',{duration:'unknown',durationReason:''}),terms('1',{availability:'other'}),terms('1',{exclusions:['none','other']}),terms('1',{exclusions:['other'],exclusionsOther:''}),terms('1',{warrantyDuration:'1_year'}),terms('1',{accessEquipment:true}),terms('1',{expiry:'2026-02-30'})])assert.throws(()=>validateTerms(value,scope,now));
  assert.throws(()=>validateTerms(terms(),{...scope,accessEquipmentRequired:true},now));
  assert.equal(validateTerms(terms('123.45',{gstCharged:true}),scope,now).amount,12345);
  assert.equal(validateTerms(terms('123.45',{gstCharged:false}),scope,now).amount,12345);
  assert.throws(()=>validateTerms(terms('0'),scope,now),/at least SGD 0.01/);
  assert.equal(validateTerms(terms('0.01'),scope,now).amount,1);
  assert.ok(quoteCautions(terms('10',{duration:'unknown',durationReason:'Cannot see concealed pipe'})).includes('duration_unknown'));
  assert.deepEqual(comparisonFacts([]).average,null);
});

test('Chapters 07/08: sealed quotes, questions, visits, exact selection and durable clocks',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}),db=await testDatabase(config);
  await migrate(db,'test');await installFixtures(db,'test');let now=new Date('2026-10-13T04:00:00Z'),address=0;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>now);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>'clean'},()=>now);
  const post=(path:string,body:unknown,c:Client,v=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+path,payload:body as Record<string,unknown>,remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin,cookie:c.cookie,'x-csrf-token':c.csrf,'x-access-version':'1','if-match':`"record-${v}"`,'idempotency-key':key}});
  const get=(path:string,c:Client)=>app.inject({url:'/api/v1/'+path,remoteAddress:'127.0.0.'+(++address%240+1),headers:{cookie:c.cookie}});
  const okay=(r:Awaited<ReturnType<typeof post>>)=>{assert.equal(r.statusCode,200,r.body);return r.json();};
  async function login(email:string) {const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin}});okay(r);await db.query("UPDATE sessions SET expires_at='2027-12-31T00:00Z'");return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
  async function job(owner:Client,flag=false) {
    const created=okay(await post('workspaces',{estateId:ids.estate,title:'Fictional private issue',observations:'Private evidence',affectedLocation:'Private room 8'},owner));
    okay(await post('workspaces/'+created.jobId+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to take photo',grouping:'combined',primaryPriority:'none',publicDescription:'Water under pipe',publicLocation:'Service room',evidenceIds:[],accessEquipmentRequired:flag},owner,1));
    okay(await post('workspaces/'+created.jobId+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},owner,2));return created.jobId as string;
  }
  async function offer(id:string,c:Client,amount='100.00',extra:Partial<QuoteTerms>={},version=0,revision=1,reason?:string) {
    return okay(await post('opportunities/'+id+'/quotes',{rfqRevision:revision,terms:terms(amount,extra),...(reason?{revisionReason:reason}:{})},c,version));
  }
  async function selectBody(id:string,c:Client,quoteId?:string) {
    const comparison=okay(await get('workspaces/'+id+'/comparison',c)),q=comparison.quotes.find((q:{selectable:boolean;quoteId:string})=>q.selectable&&(!quoteId||q.quoteId===quoteId));assert.ok(q);
    return {version:comparison.version,body:{quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:comparison.settingsVersion,rfqRevision:comparison.rfqRevision,rationale:'Recorded factual selection rationale',confirmed:true,acknowledgedCautions:[...q.cautions,...(comparison.comparison.count<3?['limited_comparison']:[])],thresholdAcknowledged:true}};
  }
  try {
    const cm=await login('cm@example.test'),mcst=await login('mcst@example.test'),admin=await login('admin@example.test'),contractor=await login('contractor@example.test');
    okay(await post('admin/trades/plumbing/configure',{requiredTypeIds:[],reason:'Explicit fictional test configuration'},admin,1));
    const clients=[contractor],orgs=[ids.organisation as string];
    const [password]=await db.query('SELECT password_hash FROM users WHERE id=$1',[ids.contractor]);
    for(let i=1;i<=2;i++) {
      const org=randomUUID(),user=randomUUID();orgs.push(org);
      await db.query('INSERT INTO organisations(id,name,verified) VALUES($1,$2,true)',[org,'Fictional Company '+i]);
      await db.query('INSERT INTO users(id,email,name,password_hash,email_verified) VALUES($1,$2,$3,$4,true)',[user,`quote${i}@example.test`,'Fictional bidder '+i,password!.password_hash]);
      await db.query("INSERT INTO memberships(id,user_id,role,organisation_id) VALUES($1,$2,'contractor',$3)",[randomUUID(),user,org]);clients.push(await login(`quote${i}@example.test`));
    }
    await db.query('UPDATE organisations SET verified=true WHERE id=$1',[ids.organisation]);
    for(const org of orgs)await db.query("INSERT INTO contractor_profiles VALUES($1,'private contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[org,now.toISOString()]);
    const settings=okay(await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'100.00',address:'Fictional private address',reason:'Fictional authorised test setup'},admin,1));assert.equal(settings.version,2);
    const id=await job(cm);
    let q1:Record<string,any>,q2:Record<string,any>,q3:Record<string,any>;
    await t.test('CH07-T04: prequote question private; visit requires initial quote; decline completes duty',async()=>{
      const q=okay(await post('opportunities/'+id+'/questions',{rfqRevision:1,question:'Private factual question'},contractor));
      assert.equal((await post('opportunities/'+id+'/visits',{rfqRevision:1,reason:'Assess access'},contractor)).statusCode,409);
      assert.equal(okay(await get('opportunities/'+id+'/conversation',clients[1]!)).questions.length,0);
      await worker.tick(100);
      const [task]=await db.query('SELECT * FROM tasks WHERE resource_id=$1',[q.questionId]);assert.ok(task!.first_issued_at);
      assert.equal((await db.query('SELECT rule FROM timer_jobs WHERE task_id=$1',[task!.id])).length,2);
      okay(await post(`workspaces/${id}/questions/${q.questionId}/respond`,{rfqRevision:1,outcome:'declined',publicQuestion:'',publicAnswer:'',classification:'material',changeKinds:['uncertain'],reason:'',privacyConfirmed:false,factsConfirmed:false},cm,1));
      assert.equal((await db.query('SELECT status FROM tasks WHERE id=$1',[task!.id]))[0]!.status,'resolved');
      assert.equal((await db.query("SELECT id FROM timer_jobs WHERE task_id=$1 AND status='pending'",[task!.id])).length,0);
    });
    let pendingQuestion='';
    await t.test('CH07-T01/T02/T10: validated immutable versions; optional narrative and unknown duration remain selectable',async()=>{
      pendingQuestion=okay(await post('opportunities/'+id+'/questions',{rfqRevision:1,question:'Is the access space clear?'},clients[2]!)).questionId;
      assert.equal((await post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:{...terms(),wasteDisposal:undefined}},contractor)).statusCode,422);
      const key=randomUUID(),body={rfqRevision:1,terms:terms('100.00',{duration:'unknown',durationReason:'Need access inspection'})};
      q1=okay(await post('opportunities/'+id+'/quotes',body,contractor,0,key));assert.deepEqual(okay(await post('opportunities/'+id+'/quotes',body,contractor,0,key)),q1);
      assert.equal((await post('opportunities/'+id+'/quotes',{...body,terms:terms('101.00')},contractor,0,key)).statusCode,409);
      assert.equal((await post('opportunities/'+id+'/questions',{rfqRevision:1,question:'Too late'},contractor)).statusCode,409);
      q2=await offer(id,clients[1]!,'200.01');q3=await offer(id,clients[2]!,'300.00');
      const c=okay(await get('workspaces/'+id+'/comparison',cm));assert.equal(c.comparison.count,3);assert.equal(c.comparison.highestCents,'30000');assert.deepEqual(c.comparison.average,{numeratorCents:'60001',denominator:3});assert.equal(c.clock.status,'active');
      assert.equal((await get('workspaces/'+id+'/comparison',contractor)).statusCode,403);
      assert.equal(okay(await get('opportunities/'+id+'/quotes',contractor)).quotes.length,1);
      assert.equal(okay(await get('operations/'+key,contractor)).quoteId,q1.quoteId);
      assert.equal((await get('operations/'+key,clients[1]!)).statusCode,404);
      await assert.rejects(db.query('UPDATE quote_versions SET amount_cents=1 WHERE quote_id=$1',[q1.quoteId]));
    });
    await t.test('CH07-T05/T06: sanitized material answer excludes prices and outdates three offers atomically',async()=>{
      const route=`workspaces/${id}/questions/${pendingQuestion}/respond`,body={rfqRevision:1,outcome:'answered',publicQuestion:'Is the space clear?',publicAnswer:'Access is clear.',classification:'material',changeKinds:['access'],reason:'Confirmed access information affects pricing',privacyConfirmed:true,factsConfirmed:true};
      assert.equal((await post(route,{...body,publicAnswer:'Fictional Company 1 quoted SGD 500'},cm,1)).statusCode,422);
      assert.equal(okay(await get('opportunities/'+id+'/conversation',clients[1]!)).shared.length,0);
      okay(await post(route,body,cm,1));
      const c=okay(await get('workspaces/'+id+'/comparison',cm));assert.equal(c.comparison.count,0);assert.equal(c.clock.status,'paused');
      const shared=okay(await get('opportunities/'+id+'/conversation',clients[1]!)).shared;assert.equal(shared.length,1);assert.ok(!JSON.stringify(shared).includes('organisation'));
      for(const [i,q] of [q1,q2,q3].entries())okay(await post('quotes/'+q.quoteId+'/reconfirm',{rfqRevision:2,confirmed:true},clients[i]!,q.version));
      const resumed=okay(await get('workspaces/'+id+'/comparison',cm));assert.equal(resumed.comparison.count,3);assert.equal(resumed.clock.status,'active');assert.equal(new Date(resumed.clock.anchor_at).toISOString(),'2026-10-13T04:00:00.000Z');
      q1={...q1,version:2,quoteVersion:2};q2={...q2,version:2,quoteVersion:2};q3={...q3,version:2,quoteVersion:2};
      assert.equal(okay(await get('opportunities/'+id+'/quotes',contractor)).quotes[0].versions[1].expiry_value,'2027-03-31');
    });
    await t.test('CH07-T09: approved visit reveals only to that organisation; later revision requires reason',async()=>{
      const visit=okay(await post('opportunities/'+id+'/visits',{rfqRevision:2,reason:'Assess clearances'},contractor));
      okay(await post(`workspaces/${id}/visits/${visit.visitId}/decide`,{outcome:'approved',confirmed:true,reason:'Agreed attendance'},cm,1));
      const own=okay(await get('opportunities/'+id+'/conversation',contractor));assert.equal(own.reveals[0].snapshot.address,'Fictional private address');
      assert.equal(okay(await get('opportunities/'+id+'/conversation',clients[1]!)).reveals.length,0);
      assert.equal((await post('opportunities/'+id+'/quotes',{rfqRevision:2,terms:terms()},contractor,2)).statusCode,422);
      q1=await offer(id,contractor,'100.00',{},2,2,'Inspected access; unchanged price');
    });
    await t.test('CH08-T03: coverage loss pauses remaining business time and restoration does not reset it',async()=>{
      now=new Date('2026-10-15T04:00:00Z');
      const prior=okay(await get('workspaces/'+id+'/comparison',cm)).clock;
      okay(await post('quotes/'+q3.quoteId+'/withdraw',{reason:'Temporary capacity constraint'},clients[2]!,2));
      const paused=okay(await get('workspaces/'+id+'/comparison',cm)).clock,calendar=await loadCalendar(db);
      assert.equal(paused.status,'paused');assert.equal(Number(paused.actor_remaining_ms),remainingBusinessMs(now,new Date(prior.actor_due_at),calendar,new Date(prior.start_at)));
      const remaining=Number(paused.actor_remaining_ms);now=new Date('2026-10-19T04:00:00Z');q3=await offer(id,clients[2]!,'300.00',{},3,2);
      const resumed=okay(await get('workspaces/'+id+'/comparison',cm)).clock;assert.equal(new Date(resumed.actor_due_at).toISOString(),resumeBusinessDue(now,remaining,calendar,new Date(prior.start_at)).toISOString());
      assert.equal(new Date(resumed.anchor_at).toISOString(),new Date(prior.anchor_at).toISOString());
      const before=okay(await get('workspaces/'+id+'/comparison',cm));okay(await post('workspaces/'+id+'/selection/schedule',{at:'2026-11-02T10:00:00+08:00'},cm,before.version));
      now=new Date('2026-10-28T12:00:00Z');await worker.tick(150);
      assert.equal((await db.query("SELECT id FROM notifications WHERE dedupe_key LIKE 'T17:%' AND task_id=$1",[resumed.task_id])).length,0);
      now=new Date('2026-11-02T04:00:00Z');await worker.tick(150);await worker.tick(150);
      assert.equal((await db.query("SELECT id FROM notifications WHERE dedupe_key LIKE 'T17:%' AND task_id=$1",[resumed.task_id])).length,1);
    });
    await t.test('CH08-T04/T05: equality authorises once; stale threshold and competing decision cannot commit',async()=>{
      const ready=await selectBody(id,cm,q1.quoteId);
      assert.equal((await post('workspaces/'+id+'/select',{...ready.body,settingsVersion:1},cm,ready.version)).statusCode,412);
      assert.equal((await post('workspaces/'+id+'/select',{...ready.body,acknowledgedCautions:[]},cm,ready.version)).statusCode,422);
      const key=randomUUID(),results=await Promise.all([post('workspaces/'+id+'/select',ready.body,cm,ready.version,key),post('workspaces/'+id+'/select',ready.body,mcst,ready.version)]);
      assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,412]);
      assert.equal((await db.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id])).length,1);
      const winner=results[0]!.statusCode===200?cm:mcst;
      if(winner===cm)assert.equal(okay(await post('workspaces/'+id+'/select',ready.body,cm,ready.version,key)).version,ready.version+1);
      assert.equal(okay(await get('workspaces/'+id,cm)).job.stage,'Starting work');
      assert.equal((await post('quotes/'+q1.quoteId+'/withdraw',{reason:'Too late'},contractor,q1.version)).statusCode,409);
      assert.equal((await post('opportunities/'+id+'/quotes',{rfqRevision:2,terms:terms()},contractor,q1.version)).statusCode,404);
    });
    await t.test('CH08-T09/T10: linked replacement preserves authority; masked views conceal identities and narrative',async()=>{
      const c=okay(await get('workspaces/'+id+'/comparison',cm));
      assert.equal((await post('workspaces/'+id+'/select',{quoteId:q2.quoteId,quoteVersion:2,settingsVersion:c.settingsVersion,rfqRevision:2,rationale:'Replacement',confirmed:true,acknowledgedCautions:[],thresholdAcknowledged:false},admin,c.version)).statusCode,409);
      const replacement=okay(await post('workspaces/'+id+'/selection/replacement',{title:'Replacement issue',observations:'Private new scope',affectedLocation:'Private room',reason:'New contractor needed'},cm,c.version));
      assert.equal(replacement.replacesJobId,id);assert.equal((await db.query('SELECT stage FROM job_records WHERE id=$1',[replacement.jobId]))[0]!.stage,'Report an issue');
      assert.equal((await db.query('SELECT id FROM work_authorisations WHERE job_id=$1',[id])).length,1);
      okay(await post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'MCST concealment decision'},mcst,2));
      const masked=okay(await get('workspaces/'+id+'/comparison',cm));assert.ok(masked.quotes.every((q:{masked:boolean;name:string;terms:QuoteTerms})=>q.masked&&q.name.startsWith('Contractor ')&&!q.terms.narrative));
      assert.equal(okay(await get('workspaces/'+id+'/comparison',mcst)).quotes[0].masked,false);
      assert.equal(okay(await get('contractor/jobs',contractor))[0].selection.status,'authorised');
      assert.equal(okay(await get('contractor/jobs',clients[1]!))[0].selection,null);
    });
    await t.test('CH08-T06/CH07-T07: above threshold held offer survives expiry; T07 clock anchors successful notice',async()=>{
      const heldId=await job(cm);now=new Date('2026-11-03T04:00:00Z');const q=await offer(heldId,contractor,'101.00',{expiry:'2026-11-03'});
      const ready=await selectBody(heldId,cm,q.quoteId),selection=okay(await post('workspaces/'+heldId+'/select',ready.body,cm,ready.version));assert.equal(selection.pendingMcst,true);
      await worker.tick(200);const [task]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='selection.approval'",[heldId]);assert.ok(task!.first_issued_at);
      assert.equal((await db.query('SELECT id FROM timer_jobs WHERE task_id=$1',[task!.id])).length,2);
      now=new Date('2026-11-12T04:00:00Z');await worker.tick(200);
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='quote.expired'",[q.quoteId])).length,0);
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='response.escalation'",[task!.id])).length,1);
      const comparison=okay(await get('workspaces/'+heldId+'/comparison',mcst)),history=comparison.history[0];
      assert.equal(comparison.quotes[0].held,true);assert.equal(comparison.quotes[0].expired,false);
      okay(await post('workspaces/'+heldId+'/selection/decide',{selectionId:selection.selectionId,outcome:'approved',reason:'',confirmed:true,acknowledgedCautions:history.cautions},mcst,comparison.version));
      assert.equal(String((await db.query('SELECT amount_cents FROM work_authorisations WHERE job_id=$1',[heldId]))[0]!.amount_cents),'10100');
      assert.equal(okay(await get('opportunities/'+heldId+'/conversation',contractor)).reveals.length,1);
    });
    await t.test('CH08-T07: rejection permits valid reselection and explicit new round without revived offers',async()=>{
      const rejected=await job(cm),quote=await offer(rejected,contractor,'200');const ready=await selectBody(rejected,cm,quote.quoteId);
      const selection=okay(await post('workspaces/'+rejected+'/select',ready.body,cm,ready.version));
      okay(await post('workspaces/'+rejected+'/selection/decide',{selectionId:selection.selectionId,outcome:'rejected',reason:'',confirmed:true,acknowledgedCautions:[]},mcst,selection.version));
      let c=okay(await get('workspaces/'+rejected+'/comparison',cm));assert.equal(c.quotes[0].selectable,true);
      const second=await selectBody(rejected,cm,quote.quoteId),s=okay(await post('workspaces/'+rejected+'/select',second.body,cm,second.version));
      okay(await post('workspaces/'+rejected+'/selection/decide',{selectionId:s.selectionId,outcome:'rejected',reason:'Review scope again',confirmed:true,acknowledgedCautions:[]},mcst,s.version));
      c=okay(await get('workspaces/'+rejected+'/comparison',cm));okay(await post('workspaces/'+rejected+'/selection/reopen',{reason:'New sourcing round explicitly requested'},cm,c.version));
      c=okay(await get('workspaces/'+rejected+'/comparison',cm));assert.equal(c.comparison.count,0);assert.equal(c.history.length,2);
      assert.equal((await post('quotes/'+quote.quoteId+'/reconfirm',{rfqRevision:1,confirmed:true},contractor,quote.version)).statusCode,409);
      const fresh=await offer(rejected,contractor,'210');assert.notEqual(fresh.quoteId,quote.quoteId);
    });
    await t.test('CH08-T08: MCST combined selection above threshold requires recorded Yes I know',async()=>{
      const combined=await job(mcst),q=await offer(combined,contractor,'150');const ready=await selectBody(combined,mcst,q.quoteId);
      assert.equal((await post('workspaces/'+combined+'/select',{...ready.body,thresholdAcknowledged:false},mcst,ready.version)).statusCode,422);
      okay(await post('workspaces/'+combined+'/select',ready.body,mcst,ready.version));
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='selection.approval'",[combined])).length,0);
      assert.equal((await db.query("SELECT d.outcome FROM selection_decisions d JOIN contractor_selections s ON s.id=d.selection_id WHERE s.job_id=$1",[combined]))[0]!.outcome,'combined_authorisation');
    });
    await t.test('CH07 PDF privacy: ready own PDF is optional; CM concealment blocks direct download',async()=>{
      const pdfJob=await job(cm,true),bytes=Buffer.from('%PDF-1.4\nFictional private company details\n%%EOF');
      const upload=okay(await post('contractors/'+ids.organisation+'/quote-uploads',{mediaType:'application/pdf',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},contractor,1));
      okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},contractor));okay(await post('uploads/'+upload.uploadId+'/finalize',{},contractor));await worker.tick(200);
      const file=okay(await get('uploads/'+upload.uploadId,contractor)).objects[0];assert.ok(file);
      assert.equal((await get('files/'+file.id,cm)).statusCode,404);
      okay(await post('opportunities/'+pdfJob+'/quotes',{rfqRevision:1,terms:terms('20',{accessEquipment:true,narrative:'Fictional Pending Contractor contact contractor@example.test'}),pdfId:file.id},contractor));
      assert.equal((await get('files/'+file.id,mcst)).statusCode,200);assert.equal((await get('files/'+file.id,contractor)).statusCode,200);assert.equal((await get('files/'+file.id,clients[1]!)).statusCode,404);
      const masked=okay(await get('workspaces/'+pdfJob+'/comparison',cm)).quotes[0];assert.equal(masked.pdfId,null);assert.equal(masked.pdfWithheld,true);assert.equal(masked.terms.narrative,undefined);
      assert.equal(masked.narrativeWithheld,true);
      assert.equal((await get('files/'+file.id,cm)).statusCode,404);
    });
    await t.test('CH08 transaction rollback: a failed selection event preserves every prior fact',async()=>{
      const rollbackJob=await job(cm),q=await offer(rollbackJob,contractor,'20'),ready=await selectBody(rollbackJob,cm,q.quoteId),key=randomUUID();
      await db.exec(`CREATE FUNCTION fail_selection_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='selection.changed' THEN RAISE EXCEPTION 'injected'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_selection_outbox BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION fail_selection_outbox();`);
      try{assert.equal((await post('workspaces/'+rollbackJob+'/select',ready.body,cm,ready.version,key)).statusCode,500);}finally{await db.exec('DROP TRIGGER fail_selection_outbox ON outbox; DROP FUNCTION fail_selection_outbox();');}
      for(const table of ['contractor_selections','selection_state','work_authorisations','location_reveals'])assert.equal((await db.query(`SELECT * FROM ${table} WHERE job_id=$1`,[rollbackJob])).length,0,table);
      assert.equal((await db.query('SELECT id FROM audit_events WHERE resource_id=$1 AND action=$2',[rollbackJob,'selection.select'])).length,0);
      assert.equal((await db.query('SELECT * FROM command_receipts WHERE operation_id=$1',[key])).length,0);
      assert.equal(okay(await get('workspaces/'+rollbackJob+'/comparison',cm)).version,ready.version);
      okay(await post('workspaces/'+rollbackJob+'/select',ready.body,cm,ready.version,key));
    });
    await t.test('CH07-T09 selection/revision race never substitutes an unseen price',async()=>{
      const race=await job(cm),q=await offer(race,contractor,'20'),ready=await selectBody(race,cm,q.quoteId);
      const [selection,revision]=await Promise.all([post('workspaces/'+race+'/select',ready.body,cm,ready.version),post('opportunities/'+race+'/quotes',{rfqRevision:1,terms:terms('21')},contractor,q.version)]);
      if(selection.statusCode===200){assert.equal(revision.statusCode,404);assert.equal(String((await db.query('SELECT amount_cents FROM work_authorisations WHERE job_id=$1',[race]))[0]!.amount_cents),'2000');}
      else{assert.equal(selection.statusCode,412,selection.body);okay(revision);assert.equal((await db.query('SELECT id FROM work_authorisations WHERE job_id=$1',[race])).length,0);const refreshed=await selectBody(race,cm,q.quoteId);okay(await post('workspaces/'+race+'/select',refreshed.body,cm,refreshed.version));assert.equal((await db.query('SELECT amount_cents FROM work_authorisations WHERE job_id=$1',[race]))[0]!.amount_cents,2100);}
    });
    await t.test('T22 first successful issuance anchors response deadlines; reading is not answering',async()=>{
      const responseJob=await job(cm),q=okay(await post('opportunities/'+responseJob+'/questions',{rfqRevision:1,question:'Is access possible?'},contractor));
      const [task]=await db.query('SELECT * FROM tasks WHERE resource_id=$1',[q.questionId]),members=await db.query("SELECT id FROM memberships WHERE role='cm' AND estate_id=$1 AND active=true",[ids.estate]);
      await db.query("UPDATE memberships SET active=false WHERE role='cm' AND estate_id=$1",[ids.estate]);
      await db.query("UPDATE outbox SET available_at='2020-01-01T00:00Z' WHERE resource_id=$1 AND kind='notification.issue'",[task!.id]);
      const work=await worker.claim();assert.equal(work!.resource_id,task!.id);await worker.process(work!);
      assert.equal((await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[task!.id]))[0]!.first_issued_at,null);assert.equal((await db.query('SELECT id FROM timer_jobs WHERE task_id=$1',[task!.id])).length,0);
      for(const member of members)await db.query('UPDATE memberships SET active=true WHERE id=$1',[member.id]);
      now=new Date('2026-11-14T04:00:00Z');await worker.tick(200);
      const [issued]=await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[task!.id]);assert.equal(new Date(issued!.first_issued_at as string).toISOString(),now.toISOString());
      const [notice]=await db.query('SELECT id FROM notifications WHERE task_id=$1',[task!.id]);okay(await post('notifications/'+notice!.id+'/read',{},cm));
      assert.equal((await db.query('SELECT status FROM tasks WHERE id=$1',[task!.id]))[0]!.status,'open');
      assert.equal((await db.query("SELECT due_at FROM timer_jobs WHERE task_id=$1 AND rule='response.actor'",[task!.id]))[0]!.due_at instanceof Date,true);
      now=new Date('2026-11-17T15:59:00Z');await worker.tick(200);
      assert.equal((await db.query("SELECT id FROM notifications WHERE task_id=$1 AND dedupe_key LIKE 'T22:%response.actor'",[task!.id])).length,1);
    });
    await t.test('CH08-T01/CH07-T07: delayed worker cannot make expired or fee-restricted offers selectable',async()=>{
      const expired=await job(cm);await offer(expired,contractor,'10',{expiry:'2026-11-17'});now=new Date('2026-11-17T16:00:00Z');
      assert.equal(okay(await get('workspaces/'+expired+'/comparison',cm)).comparison.count,0);
      await worker.tick(200);await worker.tick(200);assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id IN(SELECT id FROM quotes WHERE job_id=$1) AND kind='quote.expired'",[expired])).length,1);
      const restricted=await job(cm),q=await offer(restricted,contractor,'10');await db.query("INSERT INTO contractor_restrictions(id,organisation_id,source,reason,created_at) VALUES($1,$2,'fee','Fictional fee hold',$3)",[randomUUID(),ids.organisation,now.toISOString()]);
      assert.equal(okay(await get('workspaces/'+restricted+'/comparison',cm)).comparison.count,0);
      assert.equal((await post('workspaces/'+restricted+'/select',{quoteId:q.quoteId,quoteVersion:1,settingsVersion:3,rfqRevision:1,rationale:'Cannot bypass hold',confirmed:true,acknowledgedCautions:[],thresholdAcknowledged:true},cm,3)).statusCode,412);
      assert.equal((await db.query('SELECT id FROM work_authorisations WHERE job_id=$1',[restricted])).length,0);
    });
    await t.test('CH08-T03: effective expiry and repeated coverage pauses span Christmas and New Year',async()=>{
      await db.query("UPDATE contractor_restrictions SET active=false WHERE organisation_id=$1 AND source='fee'",[ids.organisation]);
      now=new Date('2026-12-24T04:00:00Z');const holidayJob=await job(cm);
      await offer(holidayJob,contractor,'20');await offer(holidayJob,clients[1]!,'30');const third=await offer(holidayJob,clients[2]!,'40',{expiry:'2026-12-24'});
      const initial=okay(await get('workspaces/'+holidayJob+'/comparison',cm)).clock;
      assert.equal(new Date(initial.actor_due_at).toISOString(),'2027-01-04T15:59:00.000Z');
      now=new Date('2026-12-28T04:00:00Z');await worker.tick(200);
      let clock=okay(await get('workspaces/'+holidayJob+'/comparison',cm)).clock;
      assert.equal(clock.status,'paused');assert.equal(new Date(clock.paused_at).toISOString(),'2026-12-24T16:00:00.000Z');
      assert.equal(Number(clock.actor_remaining_ms),5*86400000-60000);
      const revised=await offer(holidayJob,clients[2]!,'40',{},third.version);
      clock=okay(await get('workspaces/'+holidayJob+'/comparison',cm)).clock;assert.equal(new Date(clock.actor_due_at).toISOString(),'2027-01-05T03:59:00.000Z');
      now=new Date('2026-12-29T04:00:00Z');okay(await post('quotes/'+third.quoteId+'/withdraw',{reason:'Fictional second pause'},clients[2]!,revised.version));
      clock=okay(await get('workspaces/'+holidayJob+'/comparison',cm)).clock;assert.equal(Number(clock.actor_remaining_ms),4*86400000-60000);
      now=new Date('2026-12-31T02:00:00Z');await offer(holidayJob,clients[2]!,'40',{},revised.version+1);
      clock=okay(await get('workspaces/'+holidayJob+'/comparison',cm)).clock;
      assert.equal(new Date(clock.actor_due_at).toISOString(),'2027-01-07T01:59:00.000Z');assert.equal(new Date(clock.anchor_at).toISOString(),'2026-12-24T04:00:00.000Z');
    });
    await t.test('Audit: reviewed historical photos survive closed quoting; originals, rivals and later unauthorised scopes remain private',async()=>{
      const photoJob=await job(cm);
      const photos=[];
      for(const color of ['red','blue']) {
        const bytes=await sharp({create:{width:2,height:2,channels:3,background:color}}).png().toBuffer();
        const upload=okay(await post('workspaces/'+photoJob+'/uploads',{purpose:'evidence',mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},cm,3));
        okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},cm));okay(await post('uploads/'+upload.uploadId+'/finalize',{},cm));await worker.tick(300);
        const objects=okay(await get('uploads/'+upload.uploadId,cm)).objects;
        for(const file of objects)okay(await post('workspaces/'+photoJob+'/attachments',{fileId:file.id},cm));
        photos.push({original:objects.find((f:{variant:string})=>f.variant==='original').id,sanitized:objects.find((f:{variant:string})=>f.variant==='sanitized').id});
      }
      async function revisePhoto(fileId:string) {
        const data=okay(await get('workspaces/'+photoJob+'/rfq',cm)),version=okay(await get('workspaces/'+photoJob,cm)).job.version;
        okay(await post('workspaces/'+photoJob+'/rfq/intake',{...data.intake,noPhotoReason:'',evidenceIds:[fileId]},cm,version));
        okay(await post('workspaces/'+photoJob+'/rfq/revise',{classification:'material',changeKinds:['scope'],reason:'Reviewed replacement evidence',privacyConfirmed:true,factsConfirmed:true},cm,version+1));
      }
      await revisePhoto(photos[0]!.sanitized);await offer(photoJob,contractor,'20',{},0,2);
      await revisePhoto(photos[1]!.sanitized);
      const restriction=okay(await post('admin/contractors/'+ids.organisation+'/restrictions',{categories:['plumbing'],reason:'Fictional restricted scope'},admin));
      try {
        assert.equal((await get('files/'+photos[0]!.sanitized,contractor)).statusCode,200);
        assert.equal((await get('files/'+photos[0]!.original,contractor)).statusCode,404);
        assert.equal((await get('files/'+photos[1]!.sanitized,contractor)).statusCode,404);
        await offer(photoJob,clients[1]!,'30',{},0,3);const ready=await selectBody(photoJob,cm);okay(await post('workspaces/'+photoJob+'/select',ready.body,cm,ready.version));
        assert.equal((await get('files/'+photos[0]!.sanitized,contractor)).statusCode,200);
        assert.equal((await get('files/'+photos[1]!.sanitized,clients[1]!)).statusCode,200);
        assert.equal((await get('files/'+photos[1]!.sanitized,clients[2]!)).statusCode,404);
        assert.equal((await get('files/'+photos[1]!.original,clients[1]!)).statusCode,404);
      } finally {okay(await post('admin/contractors/'+ids.organisation+'/restrictions/'+restriction.restrictionId+'/lift',{reason:'Fictional test scope restored'},admin,1));}
    });
    await t.test('Audit: material trade changes notify affected bidders even after eligibility is lost',async()=>{
      const changed=await job(cm);await offer(changed,contractor,'20');
      okay(await post('admin/trades/electrical/configure',{requiredTypeIds:[],reason:'Explicit fictional electrical configuration'},admin,1));
      const data=okay(await get('workspaces/'+changed+'/rfq',cm));
      okay(await post('workspaces/'+changed+'/rfq/intake',{...data.intake,categories:['electrical']},cm,3));
      okay(await post('workspaces/'+changed+'/rfq/revise',{classification:'material',changeKinds:['scope'],reason:'Changed trade scope',privacyConfirmed:true,factsConfirmed:true},cm,4));
      await worker.tick(400);
      const notices=await db.query("SELECT t.id,n.message FROM tasks t JOIN notifications n ON n.task_id=t.id WHERE t.kind='rfq.opportunity' AND t.resource_id=$1 AND t.organisation_id=$2 AND t.required_version=2",[changed,ids.organisation]);
      assert.equal(notices.length,1);assert.match(String(notices[0]!.message),/material scope change/);
      assert.equal((await get('opportunities/'+changed,contractor)).statusCode,404);
      const own=okay(await get('contractor/jobs',contractor)).find((j:{jobId:string})=>j.jobId===changed);assert.deepEqual(own.rfq.categories,['plumbing']);
      await worker.tick(400);assert.equal((await db.query("SELECT id FROM tasks WHERE kind='rfq.opportunity' AND resource_id=$1 AND organisation_id=$2 AND required_version=2",[changed,ids.organisation])).length,1);
    });
    await t.test('Audit: answered prequote question retains its shared answer after another contractor is selected',async()=>{
      const answered=await job(cm),q=okay(await post('opportunities/'+answered+'/questions',{rfqRevision:1,question:'Which access is available?'},contractor));
      okay(await post(`workspaces/${answered}/questions/${q.questionId}/respond`,{rfqRevision:1,outcome:'answered',publicQuestion:'Which access is available?',publicAnswer:'Service access is available.',classification:'material',changeKinds:['access'],reason:'Confirmed access',privacyConfirmed:true,factsConfirmed:true},cm,1));
      await offer(answered,clients[1]!,'30',{},0,2);const ready=await selectBody(answered,cm);okay(await post('workspaces/'+answered+'/select',ready.body,cm,ready.version));
      const conversation=okay(await get('opportunities/'+answered+'/conversation',contractor));assert.equal(conversation.rfqRevision,2);assert.equal(conversation.shared.length,1);
      assert.equal((await get('opportunities/'+answered+'/conversation',clients[2]!)).statusCode,404);
    });
    await t.test('Audit: fee restriction blocks new selections but never cancels a held nomination; Admin restrictions still require review',async()=>{
      const held=await job(cm),q=await offer(held,contractor,'150'),ready=await selectBody(held,cm,q.quoteId),selection=okay(await post('workspaces/'+held+'/select',ready.body,cm,ready.version));
      const feeId=randomUUID();await db.query("INSERT INTO contractor_restrictions(id,organisation_id,source,reason,created_at) VALUES($1,$2,'fee','Fictional later fee hold',$3)",[feeId,ids.organisation,now.toISOString()]);
      const restriction=okay(await post('admin/contractors/'+ids.organisation+'/restrictions',{categories:['plumbing'],reason:'Admin review still required'},admin));
      const body={selectionId:selection.selectionId,outcome:'approved',reason:'',confirmed:true,acknowledgedCautions:ready.body.acknowledgedCautions};
      try {
        assert.equal((await post('workspaces/'+held+'/selection/decide',body,mcst,selection.version)).statusCode,409);
        okay(await post('admin/contractors/'+ids.organisation+'/restrictions/'+restriction.restrictionId+'/lift',{reason:'Admin review complete'},admin,1));
        okay(await post('workspaces/'+held+'/selection/decide',body,mcst,selection.version));
        assert.equal((await db.query('SELECT id FROM work_authorisations WHERE job_id=$1',[held])).length,1);
        assert.equal((await get('opportunities/'+held,contractor)).statusCode,404);
      } finally {await db.query('UPDATE contractor_restrictions SET active=false WHERE id=$1',[feeId]);}
    });
    await t.test('Audit: credential evidence cannot silently reuse a quotation PDF',async()=>{
      const [file]=await db.query("SELECT f.id FROM file_objects f JOIN upload_intents u ON u.id=f.upload_id WHERE u.purpose='quote_pdf' AND u.organisation_id=$1 AND u.state='ready' LIMIT 1",[ids.organisation]);assert.ok(file);
      const type=okay(await post('admin/credential-types',{name:'Fictional separate evidence type',holderKind:'company',categories:['plumbing']},admin));
      assert.equal((await post('contractors/'+ids.organisation+'/credentials',{typeId:type.typeId,holderName:'Company',reference:'Fictional reference',fileId:file.id},contractor)).statusCode,422);
    });
    await t.test('Audit: procurement setting receipts are recoverable by their actor, not another estate role',async()=>{
      const [estate]=await db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]),key=randomUUID();
      const saved=okay(await post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:true,reason:'Explicit fictional display setting'},mcst,Number(estate!.version),key));
      assert.deepEqual(okay(await get('operations/'+key,mcst)),saved);assert.equal((await get('operations/'+key,cm)).statusCode,404);
    });
    await t.test('Audit: configured private address and identifying no-photo explanations cannot publish in RFQ or shared answers',async()=>{
      const created=okay(await post('workspaces',{estateId:ids.estate,title:'Fictional privacy test',observations:'Private facts',affectedLocation:'Private room'},cm));
      const intake={categories:['plumbing'],urgency:'ordinary',noPhotoReason:'No safe photo',grouping:'combined',primaryPriority:'none',publicDescription:'Observed leak',publicLocation:'Service room',evidenceIds:[],accessEquipmentRequired:false};
      for(const fields of [{publicLocation:'Fictional private address'},{noPhotoReason:'At Fictional Estate Alpha'},{noPhotoReason:'At Fictional private address'}]) {
        const version=okay(await get('workspaces/'+created.jobId,cm)).job.version;
        okay(await post('workspaces/'+created.jobId+'/rfq/intake',{...intake,...fields},cm,version));
        assert.equal((await get('workspaces/'+created.jobId+'/rfq/preview',cm)).statusCode,422);
        assert.equal((await post('workspaces/'+created.jobId+'/rfq/publish',{factsConfirmed:true,privacyConfirmed:true},cm,version+1)).statusCode,422);
      }
      assert.equal((await db.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[created.jobId])).length,0);
      const answered=await job(cm),q=okay(await post('opportunities/'+answered+'/questions',{rfqRevision:1,question:'Where is access?'},contractor));
      assert.equal((await post(`workspaces/${answered}/questions/${q.questionId}/respond`,{rfqRevision:1,outcome:'answered',publicQuestion:'Where is access?',publicAnswer:'Fictional private address',classification:'material',changeKinds:['access'],reason:'Fictional review',privacyConfirmed:true,factsConfirmed:true},cm,1)).statusCode,422);
      assert.equal((await db.query('SELECT id FROM question_responses WHERE question_id=$1',[q.questionId])).length,0);
    });
    await t.test('Audit: concealed historical terms and private questions stay masked after a company rename',async()=>{
      const maskedJob=await job(cm),q=okay(await post('opportunities/'+maskedJob+'/questions',{rfqRevision:1,question:'Fictional Pending Contractor contact contractor@example.test, 9123 4567. Is access possible?'},contractor));
      await offer(maskedJob,contractor,'20',{availability:'other',availabilityOther:'Fictional Pending Contractor can attend next week.'});
      const [estate]=await db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);
      okay(await post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Fictional identity concealment'},mcst,Number(estate!.version)));
      const before=okay(await get('workspaces/'+maskedJob+'/comparison',cm)).quotes[0].name;
      const [company]=await db.query('SELECT version FROM organisations WHERE id=$1',[ids.organisation]);
      okay(await post('contractors/'+ids.organisation+'/profile',{name:'Fictional Renamed Company',contact:'New private contact',categories:['plumbing'],description:''},contractor,Number(company!.version)));
      const masked=okay(await get('workspaces/'+maskedJob+'/comparison',cm));assert.equal(masked.quotes[0].name,before);assert.ok(!JSON.stringify(masked).includes('Fictional Pending Contractor'));
      const questions=okay(await get('workspaces/'+maskedJob+'/conversation',cm));assert.equal(questions.questions[0].id,q.questionId);
      for(const value of ['Fictional Pending Contractor','contractor@example.test','9123 4567'])assert.ok(!JSON.stringify(questions).includes(value));
      assert.ok(JSON.stringify(okay(await get('workspaces/'+maskedJob+'/comparison',mcst))).includes('Fictional Pending Contractor'));
      assert.equal((await post(`workspaces/${maskedJob}/questions/${q.questionId}/respond`,{rfqRevision:1,outcome:'answered',publicQuestion:'Can Fictional Pending Contractor attend?',publicAnswer:'Access is possible.',classification:'material',changeKinds:['access'],reason:'Factual response',privacyConfirmed:true,factsConfirmed:true},cm,1)).statusCode,422);
    });
  } finally {await app.close();}
});
