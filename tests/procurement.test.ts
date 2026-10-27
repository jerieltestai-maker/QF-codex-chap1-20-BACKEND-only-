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
import {eligibility,credentialExpiry} from '../packages/domain/verification-service.js';

type Client={cookie:string;csrf:string};
test('Chapters 05/06: private verification, current eligibility, reviewed RFQ and timers',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'});
  const db=await testDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
  let clock=new Date('2026-10-13T04:00:00Z'),address=1,coverage:string[]=[];
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>clock);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>'clean'},()=>clock,async()=>coverage);
  const post=(route:string,body:unknown,client:Client,version=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+route,
    remoteAddress:'127.0.0.'+(address++%240+1),payload:body as Record<string,unknown>,headers:{origin:config.origin,cookie:client.cookie,
      'x-csrf-token':client.csrf,'x-access-version':'1','if-match':`"record-${version}"`,'idempotency-key':key}});
  const get=(route:string,client:Client)=>app.inject({url:'/api/v1/'+route,headers:{cookie:client.cookie},remoteAddress:'127.0.0.'+(address++%240+1)});
  async function login(email:string):Promise<Client> {
    const result=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},headers:{origin:config.origin}});
    assert.equal(result.statusCode,200,result.body);return {cookie:String(result.headers['set-cookie']).split(';')[0]!,csrf:result.json().csrfToken};
  }
  async function okay(response:Awaited<ReturnType<typeof post>>) {assert.equal(response.statusCode,200,response.body);return response.json();}
  try {
    const cm=await login('cm@example.test'),admin=await login('admin@example.test'),contractor=await login('contractor@example.test');
    await db.query("UPDATE sessions SET expires_at='2027-12-31T00:00:00Z'");
    let requiredType='',optionalType='',credentialId='',credentialVersion=0,optionalCredentialId='',originalId='',sanitizedId='';
    const orgRoute='contractors/'+ids.organisation;
    await t.test('CH05-T01/T02: unverified accounts can submit evidence, never gain eligibility automatically',async()=>{
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      await okay(await post(orgRoute+'/profile',{name:'Fictional Plumbing Company',contact:'Private contact',categories:['plumbing'],description:'Fictional profile'},contractor,1));
      requiredType=(await okay(await post('admin/credential-types',{name:'Fictional required trade evidence',holderKind:'company',categories:['plumbing']},admin))).typeId;
      optionalType=(await okay(await post('admin/credential-types',{name:'Fictional optional badge',holderKind:'person',categories:['plumbing']},admin))).typeId;
      const credential=await okay(await post(orgRoute+'/credentials',{typeId:requiredType,holderName:'Fictional Plumbing Company',reference:'Offline registry check reference',expiry:'2026-10-31'},contractor));
      credentialId=credential.credentialId;credentialVersion=credential.version;
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      assert.equal((await post('admin/'+orgRoute+'/decision',{outcome:'approved',categories:['plumbing'],reason:'Checked offline',internalNotes:'private'},contractor,2)).statusCode,403);
      await okay(await post(orgRoute+'/submit',{},contractor,2));await worker.tick();
      const beforeSetup=await post('admin/'+orgRoute+'/decision',{outcome:'approved',categories:['plumbing'],reason:'Checked offline',internalNotes:'private'},admin,3);
      assert.equal(beforeSetup.statusCode,409,beforeSetup.body);
      assert.equal((await post('admin/trades/plumbing/configure',{requiredTypeIds:[requiredType],reason:'Fictional offline setup'},contractor,1)).statusCode,403);
      await okay(await post('admin/trades/plumbing/configure',{requiredTypeIds:[requiredType],reason:'Fictional offline setup; required company credential checked'},admin,1));
      await okay(await post('admin/'+orgRoute+'/decision',{outcome:'approved',categories:['plumbing'],reason:'Checked identity and scope offline',internalNotes:'Private authenticity notes'},admin,3));
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      const approved=await okay(await post('admin/'+orgRoute+'/decision',{credentialId,outcome:'approved',categories:[],reason:'Authenticity checked offline',internalNotes:'Private credential findings'},admin,credentialVersion));credentialVersion=approved.version;
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,true);
      assert.equal((await get('contractors',contractor)).json()[0].state,'approved');
    });
    await t.test('CH05-T08: private contacts, decisions and credential files exclude CM and rivals',async()=>{
      assert.equal((await get(orgRoute,cm)).statusCode,404);
      assert.equal((await get(orgRoute,contractor)).json().decisions.some((d:Record<string,unknown>)=>'internal_notes' in d),false);
      assert.equal((await get(orgRoute,admin)).json().decisions.some((d:Record<string,unknown>)=>'internal_notes' in d),true);
      const bytes=await sharp({create:{width:2,height:2,channels:3,background:'#808080'}}).png().toBuffer();
      const upload=await okay(await post(orgRoute+'/uploads',{mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},contractor,4));
      await okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},contractor));
      await okay(await post('uploads/'+upload.uploadId+'/finalize',{},contractor));await worker.tick();
      const status=(await get('uploads/'+upload.uploadId,contractor)).json();assert.equal(status.state,'ready');
      const file=status.objects.find((f:{variant:string})=>f.variant==='original');
      assert.equal((await get('files/'+file.id,cm)).statusCode,404);assert.equal((await get('files/'+file.id,admin)).statusCode,200);
      assert.equal((await get('files/'+file.id,contractor)).statusCode,200);
      const rivalOrg=randomUUID(),rivalMembership=randomUUID();
      await db.query('INSERT INTO organisations(id,name) VALUES($1,$2)',[rivalOrg,'Fictional rival company']);
      await db.query("INSERT INTO memberships(id,user_id,role,organisation_id) VALUES($1,$2,'contractor',$3)",[rivalMembership,ids.cm2,rivalOrg]);
      const rival=await login('cmtwo@example.test');await okay(await post('me/context',{membershipId:rivalMembership},rival));
      assert.equal((await get(orgRoute,rival)).statusCode,404);assert.equal((await get('files/'+file.id,rival)).statusCode,404);
      optionalCredentialId=(await okay(await post(orgRoute+'/credentials',{typeId:optionalType,holderName:'Named worker',reference:'Submitted evidence',fileId:file.id,expiry:'2026-10-14'},contractor))).credentialId;
      await okay(await post('admin/'+orgRoute+'/decision',{credentialId:optionalCredentialId,outcome:'approved',categories:[],reason:'Optional badge checked offline',internalNotes:''},admin,1));
    });
    await t.test('CH05-T04/T05: date-only validity and calendar month clamp; invalid dates rejected',async()=>{
      assert.equal(credentialExpiry('2027-03-31').remindAt,'2027-02-27T16:00:00.000Z');
      assert.equal(credentialExpiry('2026-10-31').expiresAt,'2026-10-31T16:00:00.000Z');
      assert.equal(credentialExpiry('2026-10-31T15:00:00+08:00').expiresAt,'2026-10-31T07:00:00.000Z');
      assert.throws(()=>credentialExpiry('2026-02-30'));
      assert.throws(()=>credentialExpiry('2026-02-30T12:00:00+08:00'));
      await worker.tick();await worker.tick();
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM tasks WHERE kind='credential.renewal' AND resource_id=$1",[credentialId]))[0]!.n,1);
      clock=new Date('2026-10-31T15:59:59Z');assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,true);
      assert.equal((await get(orgRoute,contractor)).json().credentials.find((c:{id:string})=>c.id===optionalCredentialId).expired,true);
      assert.equal((await get('me/context',contractor)).json().capabilities['quote.submit'],true);
      clock=new Date('2026-10-31T16:00:00Z');assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      assert.equal((await get('me/context',contractor)).json().capabilities['quote.submit'],false);
      await worker.tick();await worker.tick();
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM tasks WHERE kind='credential.expired' AND resource_id=$1",[credentialId]))[0]!.n,1);
      assert.equal((await db.query('SELECT verified FROM organisations WHERE id=$1',[ids.organisation]))[0]!.verified,true);
    });
    await t.test('CH05-T06/T07: renewal supersedes old expiry; clearing fee hold cannot clear invalid credentials',async()=>{
      const renewal=await okay(await post(orgRoute+'/credentials',{credentialId,typeId:requiredType,holderName:'Fictional Plumbing Company',reference:'Renewal check',expiry:'2027-03-31'},contractor,credentialVersion));credentialVersion=renewal.version;
      await worker.tick();assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      const fee=randomUUID();await db.query('INSERT INTO contractor_restrictions(id,organisation_id,source,reason,created_at) VALUES($1,$2,\'fee\',\'Fictional fee hold\',$3)',[fee,ids.organisation,clock.toISOString()]);
      await db.query('UPDATE contractor_restrictions SET active=false WHERE id=$1',[fee]);assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      const approved=await okay(await post('admin/'+orgRoute+'/decision',{credentialId,outcome:'approved',categories:[],reason:'Renewal verified offline',internalNotes:''},admin,credentialVersion));credentialVersion=approved.version;
      await worker.tick();assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,true);
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM tasks WHERE kind='credential.expired' AND resource_id=$1 AND status='open'",[credentialId]))[0]!.n,0);
      await db.query('UPDATE contractor_restrictions SET active=true WHERE id=$1',[fee]);assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      await db.query('UPDATE contractor_restrictions SET active=false WHERE id=$1',[fee]);
      const hold=await okay(await post('admin/'+orgRoute+'/restrictions',{categories:['plumbing'],reason:'Fictional Admin restriction'},admin));
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,false);
      assert.equal((await post('admin/'+orgRoute+'/restrictions/'+fee+'/lift',{reason:'Wrong owning workflow'},admin,1)).statusCode,409);
      await okay(await post('admin/'+orgRoute+'/restrictions/'+hold.restrictionId+'/lift',{reason:'Specific Admin restriction resolved'},admin,1));
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,true);
      const early=await okay(await post(orgRoute+'/credentials',{credentialId,typeId:requiredType,holderName:'Fictional Plumbing Company',reference:'Early renewal'},contractor,credentialVersion));credentialVersion=early.version;
      assert.equal((await eligibility(db,ids.organisation,['plumbing'],clock)).eligible,true,'An approved unexpired credential remains valid during early renewal review');
      await okay(await post('admin/'+orgRoute+'/decision',{credentialId,outcome:'approved',categories:[],reason:'Permanent replacement approved offline',internalNotes:''},admin,credentialVersion));
    });
    clock=new Date('2026-12-01T15:59:00Z');
    const created=await okay(await post('workspaces',{title:'Private original title',observations:'Water visible under pipe at Fictional Estate Alpha',affectedLocation:'Private room details',estateId:ids.estate},cm));
    const jobId=created.jobId;let version=1;
    const intake={categories:['plumbing'],urgency:'urgent',noPhotoReason:'Cannot safely take a photo',grouping:'combined',primaryPriority:'none',publicDescription:'Water visible under pipe',publicLocation:'Service room',evidenceIds:[]};
    const rfqRoute='workspaces/'+jobId+'/rfq';
    await t.test('CH06-T01/T04: explicit no-photo explanation and valid No preference',async()=>{
      const saved=await okay(await post(rfqRoute+'/intake',{...intake,noPhotoReason:''},cm,version));version=saved.version;
      assert.equal((await get(rfqRoute+'/preview',cm)).statusCode,422);
      const invalid=await post(rfqRoute+'/intake',{...intake,secondaryPriority:'workmanship'},cm,version);assert.equal(invalid.statusCode,422);
      const valid=await okay(await post(rfqRoute+'/intake',intake,cm,version));version=valid.version;
      assert.equal((await get(rfqRoute+'/preview',cm)).statusCode,200);
    });
    await t.test('CH06-T02: durable extractive suggestions retain facts, stale edits win and acceptance cannot auto-publish',async()=>{
      const queued=await okay(await post(rfqRoute+'/refine',{},cm,version));await worker.tick();
      assert.equal((await get('workspaces/'+jobId,cm)).json().job.stage,'Approving AI input');
      const changed=await okay(await post(rfqRoute+'/intake',{...intake,publicDescription:'Edited human wording'},cm,version));version=changed.version;
      assert.equal((await post(rfqRoute+'/accept-refinement',{refinementId:queued.refinementId},cm,version)).statusCode,409);
      const fresh=await okay(await post(rfqRoute+'/refine',{},cm,version));await worker.tick();
      await db.query('UPDATE ai_refinements SET output=$1 WHERE id=$2',[{observations:'Replace 20 metres of pipe'},fresh.refinementId]);
      assert.equal((await post(rfqRoute+'/accept-refinement',{refinementId:fresh.refinementId},cm,version)).statusCode,422);
      await db.query('UPDATE ai_refinements SET output=$1 WHERE id=$2',[{observations:'Water visible under pipe at Fictional Estate Alpha'},fresh.refinementId]);
      const accepted=await okay(await post(rfqRoute+'/accept-refinement',{refinementId:fresh.refinementId},cm,version));version=accepted.version;
      assert.equal((await get(rfqRoute+'/preview',cm)).statusCode,422);
      const safe=await okay(await post(rfqRoute+'/intake',intake,cm,version));version=safe.version;
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM quotation_rounds'))[0]!.n,0);
      const late=await okay(await post(rfqRoute+'/refine',{},cm,version));
      const current=await okay(await post(rfqRoute+'/intake',{...intake,publicDescription:'Latest human draft'},cm,version));version=current.version;
      await worker.tick();
      assert.equal((await db.query('SELECT state FROM ai_refinements WHERE id=$1',[late.refinementId]))[0]!.state,'superseded');
      assert.equal((await get('workspaces/'+jobId,cm)).json().job.stage,'Report an issue');
      assert.equal((await get(rfqRoute,cm)).json().intake.publicDescription,'Latest human draft');
    });
    let roundId='';
    await t.test('CH06-T09/T10: atomic reviewed publication, duplicates, sanitized evidence and private original denial',async()=>{
      const bytes=await sharp({create:{width:2,height:2,channels:3,background:'#eeeeee'}}).jpeg().toBuffer();
      const upload=await okay(await post('workspaces/'+jobId+'/uploads',{purpose:'evidence',mediaType:'image/jpeg',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},cm,version));
      await okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},cm));await okay(await post('uploads/'+upload.uploadId+'/finalize',{},cm));await worker.tick();
      const status=(await get('uploads/'+upload.uploadId,cm)).json();originalId=status.objects.find((o:{variant:string})=>o.variant==='original').id;sanitizedId=status.objects.find((o:{variant:string})=>o.variant==='sanitized').id;
      await okay(await post('workspaces/'+jobId+'/attachments',{fileId:sanitizedId},cm));
      const unsafe=await okay(await post(rfqRoute+'/intake',{...intake,evidenceIds:[originalId]},cm,version));version=unsafe.version;
      assert.equal((await get(rfqRoute+'/preview',cm)).statusCode,422);
      const safe=await okay(await post(rfqRoute+'/intake',{...intake,evidenceIds:[sanitizedId]},cm,version));version=safe.version;
      const key=randomUUID(),body={privacyConfirmed:true,factsConfirmed:true};
      assert.equal((await post(rfqRoute+'/publish',{...body,privacyConfirmed:false},cm,version)).statusCode,422);
      await db.exec(`CREATE FUNCTION reject_publish_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='rfq.changed' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_publish_event BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION reject_publish_event();`);
      assert.equal((await post(rfqRoute+'/publish',body,cm,version,key)).statusCode,500);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM quotation_rounds'))[0]!.n,0);
      await db.exec('DROP TRIGGER reject_publish_event ON outbox; DROP FUNCTION reject_publish_event();');
      const [a,b]=await Promise.all([post(rfqRoute+'/publish',body,cm,version,key),post(rfqRoute+'/publish',body,cm,version,key)]);
      const result=await okay(a);assert.deepEqual(b.json(),result);assert.equal(b.statusCode,200);version=result.version;roundId=result.roundId;
      assert.equal(result.sourcingDueAt,'2026-12-03T04:00:00.000Z');await worker.tick();
      const publicView=await get('opportunities/'+jobId,contractor);assert.equal(publicView.statusCode,200,publicView.body);
      for(const secret of ['Fictional Estate Alpha','Private original title','Private room details',ids.estate])assert.equal(publicView.body.includes(secret),false);
      assert.equal((await get('workspaces/'+jobId,contractor)).statusCode,404);
      assert.equal((await get('files/'+originalId,contractor)).statusCode,404);assert.equal((await get('files/'+sanitizedId,contractor)).statusCode,200);
      assert.equal((await post('workspaces/'+jobId+'/edit',{title:'Bypass',observations:'Unreviewed',affectedLocation:'Private'},cm,version)).statusCode,409);
    });
    await t.test('CH06-T07/T08: urgent repeats retain first issue; read is not acknowledgment; coordination preserves follow-up',async()=>{
      const [task]=await db.query("SELECT * FROM tasks WHERE kind='rfq.urgent' AND resource_id=$1",[jobId]);
      const anchor=new Date(task!.first_issued_at as string).getTime();
      const [notice]=await db.query('SELECT id FROM notifications WHERE task_id=$1',[task!.id]);await okay(await post('notifications/'+notice!.id+'/read',{},admin));
      for(const offset of [15,60,180,600,1020]) {clock=new Date(anchor+offset*60000);await worker.tick();await worker.tick();}
      const notices=await db.query('SELECT dedupe_key FROM notifications WHERE task_id=$1',[task!.id]);assert.equal(notices.length,6);
      assert.equal((await post('admin/attention/'+task!.id+'/acknowledge',{nextAction:'Call',followUpAt:new Date(clock.getTime()+3600000).toISOString()},admin,1)).statusCode,409);
      const followUp=new Date(clock.getTime()+2*3600000).toISOString();
      await okay(await post('admin/urgency/'+task!.id+'/coordinate',{outcome:'unresolved',summary:'Called; no confirmed attendance',nextAction:'Try another eligible contractor',followUpAt:followUp},admin,1));
      clock=new Date(anchor+1440*60000);await worker.tick();
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM timer_jobs WHERE task_id=$1 AND rule='urgent' AND status='pending'",[task!.id]))[0]!.n,0);
      assert.equal((await db.query('SELECT status FROM tasks WHERE id=$1',[task!.id]))[0]!.status,'open');
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM urgency_updates'))[0]!.n,1);
    });
    await t.test('CH06-T05: zero/current distinct coverage and repeated sourcing execution',async()=>{
      clock=new Date('2026-12-03T04:00:00Z');coverage=[];await worker.tick();await worker.tick();
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM tasks WHERE kind='rfq.sourcing' AND resource_id=$1",[jobId]))[0]!.n,1);
      assert.equal((await db.query('SELECT status FROM quotation_rounds WHERE id=$1',[roundId]))[0]!.status,'open');
      assert.equal((await get('workspaces/'+jobId,cm)).json().job.stage,'Requesting for quotes');
    });
    await t.test('CH06-T06: author classification, minor versus material, immutable snapshots and unchanged sourcing anchor',async()=>{
      const before=(await db.query('SELECT sourcing_due_at FROM quotation_rounds WHERE id=$1',[roundId]))[0]!.sourcing_due_at;
      const safeIntake={...intake,evidenceIds:[sanitizedId],publicDescription:'Water visible below pipe',primaryPriority:'workmanship',secondaryPriority:'earlier_availability'};
      const saved=await okay(await post(rfqRoute+'/intake',safeIntake,cm,version));version=saved.version;
      const minor=await okay(await post(rfqRoute+'/revise',{classification:'minor',changeKinds:['spelling'],reason:'Correct observation wording without changing scope',privacyConfirmed:true,factsConfirmed:true},cm,version));version=minor.version;
      assert.equal(minor.scopeVersion,1);assert.equal(minor.requiresReconfirmation,false);
      const quantity=await okay(await post(rfqRoute+'/intake',{...safeIntake,publicDescription:'Water visible below 3 pipe joints'},cm,version));version=quantity.version;
      assert.equal((await post(rfqRoute+'/revise',{classification:'minor',changeKinds:['spelling'],reason:'Misclassified quantity change',privacyConfirmed:true,factsConfirmed:true},cm,version)).statusCode,422);
      const material=await okay(await post(rfqRoute+'/revise',{classification:'material',changeKinds:['quantities'],reason:'CM observed three affected joints',privacyConfirmed:true,factsConfirmed:true},cm,version));version=material.version;
      assert.equal(material.scopeVersion,2);assert.equal(material.requiresReconfirmation,true);
      assert.equal(String((await db.query('SELECT sourcing_due_at FROM quotation_rounds WHERE id=$1',[roundId]))[0]!.sourcing_due_at),String(before));
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM quotation_rounds WHERE job_id=$1',[jobId]))[0]!.n,1);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM rfq_versions WHERE job_id=$1',[jobId]))[0]!.n,3);
      await assert.rejects(db.query("UPDATE rfq_versions SET reason='Rewrite' WHERE job_id=$1 AND revision=1",[jobId]),/append-only/);
      const original=(await db.query('SELECT snapshot FROM rfq_versions WHERE job_id=$1 AND revision=1',[jobId]))[0]!.snapshot as {publicDescription:string};assert.equal(original.publicDescription,'Water visible under pipe');
      assert.equal((await get('opportunities/'+jobId,contractor)).json().scopeVersion,2);
    });
    await t.test('CH05-T08 public profile: masked CM keeps stable alias; no private evidence/contact/holder leak',async()=>{
      const route='workspaces/'+jobId+'/contractor-profiles/'+ids.organisation;
      await db.query('UPDATE estates SET contractor_identities_visible=false WHERE id=$1',[ids.estate]);
      const masked=await get(route,cm);assert.equal(masked.statusCode,200,masked.body);assert.equal(masked.json().masked,true);
      for(const secret of ['Private contact','Private authenticity','holder_name','file_id','Fictional Plumbing Company'])assert.equal(masked.body.includes(secret),false);
      assert.equal((await get(route,cm)).json().name,masked.json().name);
      const mcst=await login('mcst@example.test');assert.equal((await get(route,mcst)).json().name,'Fictional Plumbing Company');
      assert.equal((await get(route,contractor)).statusCode,404);
      await db.query('UPDATE estates SET contractor_identities_visible=true WHERE id=$1',[ids.estate]);
    });
    await t.test('CH06-T03: separate repairs create linked private tickets and preserve original',async()=>{
      const source=await okay(await post('workspaces',{title:'Two repairs',observations:'Two independent problems',affectedLocation:'Private',estateId:ids.estate},cm));
      const separate=await okay(await post('workspaces/'+source.jobId+'/rfq/intake',{...intake,grouping:'separate'},cm,1));
      assert.equal((await post('workspaces/'+source.jobId+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,separate.version)).statusCode,409);
      const repairs=[{title:'Pipe',observations:'Drip',affectedLocation:'Room'},{title:'Socket',observations:'Damaged cover',affectedLocation:'Hall'}];
      const result=await okay(await post('workspaces/'+source.jobId+'/rfq/separate',{repairs},cm,separate.version));assert.equal(result.children.length,2);
      const jobs=await db.query('SELECT id,group_id,stage FROM job_records WHERE group_id=$1',[result.groupId]);assert.equal(jobs.length,3);
      assert.equal(jobs.every(j=>j.stage==='Report an issue'),true);
      assert.equal((await db.query('SELECT observations FROM job_records WHERE id=$1',[source.jobId]))[0]!.observations,'Two independent problems');
      assert.equal((await post('workspaces/'+source.jobId+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,result.version)).statusCode,409);
    });
    await t.test('CH06-T03/T04/T05: all-trade bundle eligibility; sourcing counts distinct current eligible organisations',async()=>{
      await okay(await post('admin/trades/electrical/configure',{requiredTypeIds:[],reason:'Deliberately empty fictional electrical requirements'},admin,1));
      assert.equal((await eligibility(db,ids.organisation,['plumbing','electrical'],clock)).eligible,false,'The accountable contractor lacks electrical scope approval');
      const others=[randomUUID(),randomUUID()];
      for(const organisation of others) {
        await db.query('INSERT INTO organisations(id,name,verified) VALUES($1,$2,true)',[organisation,'Fictional coverage fixture '+organisation.slice(0,8)]);
        await db.query("INSERT INTO contractor_profiles(organisation_id,contact,categories,description,version,state,approved_categories,updated_at) VALUES($1,'Fixture contact',$2,'',1,'approved',$2,$3)",[organisation,['plumbing'],clock.toISOString()]);
        const credential=randomUUID();
        await db.query("INSERT INTO credentials(id,organisation_id,type_id,state,approved_submission) VALUES($1,$2,$3,'approved',1)",[credential,organisation,requiredType]);
        await db.query("INSERT INTO credential_versions(credential_id,submission,holder_name,reference,actor_id,recorded_at) VALUES($1,1,'Fictional company','Fictional offline reference',$2,$3)",[credential,ids.admin,clock.toISOString()]);
      }
      for(const count of [2,3]) {
        const created=await okay(await post('workspaces',{title:'Coverage scenario '+count,observations:'Drip',affectedLocation:'Private',estateId:ids.estate},cm));
        const saved=await okay(await post('workspaces/'+created.jobId+'/rfq/intake',{...intake,urgency:'ordinary',primaryPriority:'workmanship',secondaryPriority:'earlier_availability'},cm,1));
        const published=await okay(await post('workspaces/'+created.jobId+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,saved.version));
        clock=new Date(published.sourcingDueAt);coverage=[ids.organisation,...others.slice(0,count-1),ids.organisation];
        await worker.tick();await worker.tick();
        const tasks=await db.query("SELECT id FROM tasks WHERE kind='rfq.sourcing' AND resource_id=$1",[created.jobId]);assert.equal(tasks.length,count<3?1:0);
        const [checked]=await db.query("SELECT after_value FROM audit_events WHERE resource_id=$1 AND action='rfq.sourcing-checked'",[created.jobId]);assert.equal((checked!.after_value as {distinctEligibleOffers:number}).distinctEligibleOffers,count);
        const [round]=await db.query('SELECT rule_snapshot FROM quotation_rounds WHERE id=$1',[published.roundId]);assert.equal((round!.rule_snapshot as unknown[]).length,1);
        await assert.rejects(db.query('UPDATE quotation_rounds SET sourcing_due_at=$1 WHERE id=$2',[new Date(clock.getTime()+1000).toISOString(),published.roundId]),/immutable/);
      }
    });
  } finally {await app.close();}
});
