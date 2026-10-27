import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {buildApp} from '../apps/api/src/app.js';
import {Worker} from '../packages/infrastructure/worker.js';
import type {ScanResult} from '../packages/infrastructure/file-inspection.js';
type Client={cookie:string;csrf:string};
test('Chapters 03/04: SQL/API workspace, file integrity, private tasks and durable worker',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'});
  const db=await testDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
  let clock=new Date('2026-10-13T04:00:00Z'),scan:ScanResult='clean',address=1;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>clock);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>scan},()=>clock);
  const post=(route:string,body:unknown,client:Client,version=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+route,
    remoteAddress:'127.0.0.'+(address++%240+1),payload:body as Record<string,unknown>,headers:{origin:config.origin,cookie:client.cookie,
      'x-csrf-token':client.csrf,'x-access-version':'1','if-match':`"record-${version}"`,'idempotency-key':key}});
  const get=(route:string,client:Client)=>app.inject({url:'/api/v1/'+route,headers:{cookie:client.cookie},remoteAddress:'127.0.0.'+(address++%240+1)});
  async function login(email:string):Promise<Client> {
    const result=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},headers:{origin:config.origin}});
    assert.equal(result.statusCode,200,result.body);
    return {cookie:String(result.headers['set-cookie']).split(';')[0]!,csrf:result.json().csrfToken};
  }
  try {
    const cm=await login('cm@example.test'),admin=await login('admin@example.test'),mcst=await login('mcst@example.test'),
      mcst2=await login('mcsttwo@example.test'),contractor=await login('contractor@example.test');
    // Worker outage tests span days. Keep these fixture sessions open; real eight-hour expiry is tested in Chapter 02.
    await db.query('UPDATE sessions SET expires_at=$1',[new Date(clock.getTime()+10*86400000).toISOString()]);
    const body={title:'Leaking pipe',observations:'Water visible below pipe',affectedLocation:'Service room',estateId:ids.estate};
    let jobId='',version=1,originalId='',supportTaskId='';
    await t.test('CH03-T01: actual command fails at outbox insertion and rolls back facts/version/audit/receipt',async()=>{
      const key=randomUUID();
      await db.exec(`CREATE FUNCTION fail_workspace_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.kind='workspace.changed' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END; $$;
        CREATE TRIGGER fail_workspace_outbox BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION fail_workspace_outbox();`);
      const response=await post('workspaces',body,cm,0,key);assert.equal(response.statusCode,500);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM job_records'))[0]!.n,0);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM job_versions'))[0]!.n,0);
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM audit_events WHERE action='workspace.create'"))[0]!.n,0);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM command_receipts WHERE operation_id=$1',[key]))[0]!.n,0);
      await db.exec('DROP TRIGGER fail_workspace_outbox ON outbox; DROP FUNCTION fail_workspace_outbox();');
    });
    await t.test('CH03-T02: concurrent lost-response retry has one job/outcome; changed payload rejected',async()=>{
      const key=randomUUID();
      const responses=await Promise.all([post('workspaces',body,cm,0,key),post('workspaces',body,cm,0,key)]);
      responses.forEach(r=>assert.equal(r.statusCode,200,r.body));assert.deepEqual(responses[0]!.json(),responses[1]!.json());
      jobId=responses[0]!.json().jobId;
      assert.equal((await get('operations/'+key,cm)).json().jobId,jobId);
      assert.equal((await post('workspaces',{...body,title:'Different'},cm,0,key)).statusCode,409);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM job_records'))[0]!.n,1);
      const forged=await post('workspaces/'+jobId+'/edit',{...body,stage:'authorised'},cm,1);assert.equal(forged.statusCode,422);
      assert.equal((await app.inject({method:'PATCH',url:'/api/v1/workspaces/'+jobId,payload:{stage:'authorised'},headers:{cookie:admin.cookie,origin:config.origin}})).statusCode,404);
    });
    async function upload(bytes:Buffer,mediaType='image/png',checksum=createHash('sha256').update(bytes).digest('hex')) {
      const intent=await post('workspaces/'+jobId+'/uploads',{purpose:'evidence',mediaType,byteSize:bytes.length,checksum},cm,version);
      assert.equal(intent.statusCode,200,intent.body);
      const id=intent.json().uploadId as string;
      for(let offset=0;offset<bytes.length;offset+=262144) {
        const chunk=await post('uploads/'+id+'/chunks',{offset,bytes:bytes.subarray(offset,offset+262144).toString('base64')},cm);
        assert.equal(chunk.statusCode,200,chunk.body);
      }
      return id;
    }
    const png=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).withMetadata({exif:{IFD0:{Artist:'Private estate name'}}}).png().toBuffer();
    await t.test('CH03-T04/T05/T06: upload expiry, renewal, immutable ready bytes, checksum/type/scan handling',async()=>{
      const id=await upload(png);
      clock=new Date(clock.getTime()+3600001);
      assert.equal((await post('uploads/'+id+'/chunks',{offset:0,bytes:png.toString('base64')},cm)).statusCode,410);
      assert.equal((await post('uploads/'+id+'/renew',{},cm)).statusCode,200);
      assert.equal((await post('uploads/'+id+'/chunks',{offset:0,bytes:png.toString('base64')},cm)).statusCode,200);
      const changed=Buffer.from(png);changed[changed.length-1]=changed[changed.length-1]!^1;
      assert.equal((await post('uploads/'+id+'/chunks',{offset:0,bytes:changed.toString('base64')},cm)).statusCode,409);
      const submitted=await post('uploads/'+id+'/finalize',{},cm);assert.equal(submitted.json().state,'verifying');
      assert.equal((await post('workspaces/'+jobId+'/attachments',{fileId:randomUUID()},cm)).statusCode,422);
      scan='unavailable';await worker.tick();
      assert.equal((await get('uploads/'+id,cm)).json().state,'verifying');
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM file_objects WHERE upload_id=$1',[id]))[0]!.n,0);
      scan='clean';clock=new Date(clock.getTime()+1001);await worker.tick();
      const ready=(await get('uploads/'+id,cm)).json();assert.equal(ready.state,'ready');
      originalId=ready.objects.find((f:{variant:string})=>f.variant==='original').id;
      const sanitizedId=ready.objects.find((f:{variant:string})=>f.variant==='sanitized').id;
      const original=await get('files/'+originalId,cm),sanitized=await get('files/'+sanitizedId,cm);
      assert.deepEqual(original.rawPayload,png);assert.ok((await sharp(original.rawPayload).metadata()).exif);
      assert.equal((await sharp(sanitized.rawPayload).metadata()).exif,undefined);
      assert.equal((await post('uploads/'+id+'/chunks',{offset:0,bytes:png.toString('base64')},cm)).statusCode,409);
      await assert.rejects(db.query('UPDATE file_objects SET bytes=$1 WHERE id=$2',[Buffer.from('tampered'),originalId]),/append-only/);
      const bad=await upload(png,'image/png','0'.repeat(64));
      assert.equal((await post('uploads/'+bad+'/finalize',{},cm)).json().state,'rejected');
      const corrupt=await upload(Buffer.from('not an image'));await post('uploads/'+corrupt+'/finalize',{},cm);await worker.tick();
      assert.equal((await get('uploads/'+corrupt,cm)).json().rejectionCode,'INVALID_FILE_TYPE');
      scan='infected';const infected=await upload(png);await post('uploads/'+infected+'/finalize',{},cm);await worker.tick();
      assert.equal((await get('uploads/'+infected,cm)).json().rejectionCode,'MALWARE_DETECTED');scan='clean';
      assert.equal((await post('workspaces/'+jobId+'/uploads',{purpose:'evidence',mediaType:'image/png',byteSize:10485761,checksum:'0'.repeat(64)},cm,version)).statusCode,422);
    });
    await t.test('CH03-T03: attachment does not advance scope version; concurrent edits require current facts',async()=>{
      await post('workspaces/'+jobId+'/attachments',{fileId:originalId},cm);
      await post('workspaces/'+jobId+'/attachments',{fileId:originalId},cm);
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM job_attachments'))[0]!.n,1);
      assert.equal((await get('workspaces/'+jobId,cm)).json().job.version,1);
      const edit={title:'Updated observations',observations:'Still leaking',affectedLocation:'Service room'};
      const responses=await Promise.all([post('workspaces/'+jobId+'/edit',edit,cm,1),post('workspaces/'+jobId+'/edit',{...edit,title:'Concurrent edit'},mcst,1)]);
      assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,412]);version=2;
      assert.equal((await get('workspaces/'+jobId+'/history',cm)).json().filter((e:{action:string})=>e.action==='file.attach').length,1);
    });
    await t.test('CH03-T07: contractor/cross-estate file, list, history and draft access are denied',async()=>{
      assert.deepEqual((await get('workspaces',contractor)).json(),[]);
      for(const route of ['workspaces/'+jobId,'workspaces/'+jobId+'/history','files/'+originalId])assert.equal((await get(route,contractor)).statusCode,404);
      assert.equal((await post('workspaces',{...body,estateId:ids.otherEstate},cm)).statusCode,404);
    });
    await t.test('CH03-T08: independent two-device drafts preserve overlapping fields; owner conflict is explicit',async()=>{
      const a=randomUUID(),b=randomUUID();
      const draft={estateId:ids.estate,jobId,baseVersion:version,fields:{title:'Draft A',observations:'',affectedLocation:'Room'}};
      assert.equal((await post('drafts',{id:a,...draft},cm)).statusCode,200);
      assert.equal((await post('drafts',{id:b,...draft,fields:{...draft.fields,title:'Draft B'}},cm)).statusCode,200);
      assert.equal((await post('drafts',{id:a,...draft},cm)).statusCode,412);
      assert.equal((await post('drafts',{id:a,...draft},mcst,1)).statusCode,404);
      assert.equal((await get('drafts',cm)).json().length,2);assert.deepEqual((await get('drafts',mcst)).json(),[]);
    });
    await t.test('CH04-T02/T03/T04/T05: durable first issuance, leased-crash replay, read versus explicit acknowledgment',async()=>{
      const support=await post('workspaces/'+jobId+'/support',{description:'Need sourcing guidance',privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[]},cm,version);
      assert.equal(support.statusCode,200,support.body);supportTaskId=support.json().taskId;
      assert.equal((await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[supportTaskId]))[0]!.first_issued_at,null);
      await worker.tick();
      const bells=(await get('notifications',admin)).json(),supportBells=bells.notifications.filter((n:{task_id:string})=>n.task_id===supportTaskId);assert.equal(supportBells.length,1);
      const anchor=(await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[supportTaskId]))[0]!.first_issued_at;
      await db.query("UPDATE outbox SET processed_at=NULL,available_at=$1 WHERE kind='notification.issue' AND resource_id=$2",[clock.toISOString(),supportTaskId]);
      await worker.tick();assert.equal((await get('notifications',admin)).json().notifications.filter((n:{task_id:string})=>n.task_id===supportTaskId).length,1);
      assert.deepEqual((await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[supportTaskId]))[0]!.first_issued_at,anchor);
      await post('notifications/'+supportBells[0].id+'/read',{},admin);
      assert.equal((await get('notifications',admin)).json().unreadCount,bells.unreadCount-1);
      assert.equal((await get('admin/attention',admin)).json().tasks.find((t:{id:string})=>t.id===supportTaskId).acknowledged_at,null);
      assert.equal((await post('admin/attention/'+supportTaskId+'/acknowledge',{nextAction:' ',followUpAt:new Date(clock.getTime()+3600000).toISOString()},admin,1)).statusCode,422);
      const followUpAt=new Date(clock.getTime()+3600000).toISOString();
      assert.equal((await post('admin/attention/'+supportTaskId+'/acknowledge',{nextAction:'Contact reporter',followUpAt},admin,1)).statusCode,200);
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM timer_jobs WHERE task_id=$1 AND rule='T18' AND status='pending'",[supportTaskId]))[0]!.n,0);
      clock=new Date(followUpAt);await worker.tick();
      assert.equal((await get('notifications',admin)).json().notifications.filter((n:{task_id:string})=>n.task_id===supportTaskId).length,2);
      assert.equal((await get('admin/attention',admin)).json().tasks.find((t:{id:string})=>t.id===supportTaskId).status,'open');
    });
    await t.test('CH04-T09: confidential subject, ordinary estate viewers and billing previews/counts',async()=>{
      const confidential=await post('workspaces/'+jobId+'/support',{description:'Private conduct concern',privacy:'confidential',subjectUserIds:[ids.mcst],subjectOrganisationIds:[]},cm,version);
      assert.equal(confidential.statusCode,200,confidential.body);await worker.tick();
      assert.equal((await get('workspaces/'+jobId+'/support',mcst)).json().length,1);
      assert.equal((await get('workspaces/'+jobId+'/support',mcst2)).json().length,1);
      assert.equal((await get('workspaces/'+jobId+'/support',cm)).json().length,2);
      assert.equal((await get('notifications',mcst)).json().unreadCount,0);
      assert.equal((await get('admin/attention',cm)).statusCode,403);
      const taskId=randomUUID();await db.query(`INSERT INTO tasks(id,kind,owner_role,status,rule_version,organisation_id,actionable_at)
        VALUES($1,'fee.payment','contractor','open','future',$2,$3)`,[taskId,ids.organisation,clock.toISOString()]);
      await db.query("INSERT INTO notifications VALUES($1,$2,$3,'Private fee balance','test',$4)",[randomUUID(),taskId,'fee-test',clock.toISOString()]);
      assert.equal((await get('notifications',cm)).json().notifications.length,0);
      assert.equal((await get('notifications',contractor)).json().notifications.length,1);
      const excluded=await post('workspaces/'+jobId+'/support',{description:'Fictional confidential Admin concern',privacy:'confidential',subjectUserIds:[ids.admin],subjectOrganisationIds:[]},cm,version);
      assert.equal(excluded.statusCode,200,excluded.body);
      const hiddenWork=randomUUID();await db.query("INSERT INTO outbox(id,kind,resource_id,payload,failed_at) VALUES($1,'task.changed',$2,$3,$4)",
        [hiddenWork,excluded.json().taskId,{},clock.toISOString()]);
      assert.equal((await get('admin/failed-work',admin)).json().some((w:{id:string})=>w.id===hiddenWork),false);
      assert.equal((await get('admin/attention',admin)).json().tasks.some((task:{id:string})=>task.id===excluded.json().taskId),false);
    });
    await t.test('CH04-T06/T07/T10: shared role anchor, per-user reads, obsolete timers, coalesced urgent outage',async()=>{
      const roleTask=randomUUID();await db.query(`INSERT INTO tasks(id,kind,resource_id,owner_role,status,rule_version,estate_id,action,actionable_at)
        VALUES($1,'test.response',$2,'mcst','open','T07-v1',$3,'Respond',$4)`,[roleTask,jobId,ids.estate,clock.toISOString()]);
      await db.query("INSERT INTO outbox(id,kind,resource_id,payload,available_at) VALUES($1,'notification.issue',$2,$3,$4)",
        [randomUUID(),roleTask,{step:'initial',message:'Respond to this task'},clock.toISOString()]);await worker.tick();
      const one=(await get('notifications',mcst)).json().notifications[0];
      assert.equal((await get('notifications',mcst2)).json().notifications[0].id,one.id);
      await post('notifications/'+one.id+'/read',{},mcst);
      assert.equal((await get('notifications',mcst)).json().unreadCount,0);assert.equal((await get('notifications',mcst2)).json().unreadCount,1);
      const urgent=randomUUID();await db.query(`INSERT INTO tasks(id,kind,resource_id,owner_role,status,rule_version,estate_id,action,actionable_at)
        VALUES($1,'urgent.attention',$2,'admin','open','T19-v1',$3,'Coordinate urgent sourcing',$4)`,[urgent,jobId,ids.estate,clock.toISOString()]);
      await db.query("INSERT INTO outbox(id,kind,resource_id,payload,available_at) VALUES($1,'notification.issue',$2,$3,$4)",
        [randomUUID(),urgent,{step:'initial',message:'Urgent coordination needed'},clock.toISOString()]);await worker.tick();
      const initial=clock;clock=new Date(initial.getTime()+25*3600000);await worker.tick();
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM notifications WHERE task_id=$1',[urgent]))[0]!.n,2);
      const next=(await db.query("SELECT due_at FROM timer_jobs WHERE task_id=$1 AND status='pending'",[urgent]))[0]!.due_at;
      assert.equal(new Date(next as string).getTime(),initial.getTime()+31*3600000);
      await post('admin/attention/'+urgent+'/acknowledge',{nextAction:'Call contractor',followUpAt:new Date(clock.getTime()+48*3600000).toISOString()},admin,1);
      clock=new Date(initial.getTime()+32*3600000);await worker.tick();
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM notifications WHERE task_id=$1',[urgent]))[0]!.n,2);
      await db.query("UPDATE tasks SET status='superseded',version=version+1 WHERE id=$1",[urgent]);
      clock=new Date(initial.getTime()+80*3600000);await worker.tick();
      assert.equal((await db.query('SELECT count(*)::integer AS n FROM notifications WHERE task_id=$1',[urgent]))[0]!.n,2);
      assert.equal((await db.query("SELECT count(*)::integer AS n FROM timer_jobs WHERE task_id=$1 AND status='pending'",[urgent]))[0]!.n,0);
    });
    await t.test('CH04-T05: expired worker lease recovers; late old worker cannot commit',async()=>{
      await worker.tick();const id=randomUUID();
      await db.query("INSERT INTO outbox(id,kind,resource_id,payload,available_at) VALUES($1,'workspace.changed',$2,$3,$4)",[id,jobId,{version},clock.toISOString()]);
      const old=await worker.claim();assert.equal(old?.id,id);assert.equal(await worker.claim(),undefined);
      clock=new Date(clock.getTime()+120001);
      let recovered=await worker.claim();
      while(recovered&&recovered.id!==id){await worker.process(recovered);recovered=await worker.claim();}
      assert.equal(recovered?.id,id);assert.notEqual(old!.lease_token,recovered!.lease_token);
      await worker.process(old!);assert.equal((await db.query('SELECT processed_at FROM outbox WHERE id=$1',[id]))[0]!.processed_at,null);
      await worker.process(recovered!);assert.ok((await db.query('SELECT processed_at FROM outbox WHERE id=$1',[id]))[0]!.processed_at);
    });
    await t.test('CH04-T02: no recipient causes durable retry/failure queue, never a false first-issued anchor',async()=>{
      const taskId=randomUUID(),workId=randomUUID();
      await db.query(`INSERT INTO tasks(id,kind,resource_id,owner_role,status,rule_version,estate_id,actionable_at)
        VALUES($1,'test.response',$2,'cm','open','T07-v1',$3,$4)`,[taskId,jobId,ids.otherEstate,clock.toISOString()]);
      await db.query("INSERT INTO outbox(id,kind,resource_id,payload,available_at,attempts) VALUES($1,'notification.issue',$2,$3,$4,7)",
        [workId,taskId,{step:'initial',message:'No recipient'},clock.toISOString()]);await worker.tick();
      const failed=(await get('admin/failed-work',admin)).json();assert.ok(failed.some((w:{id:string})=>w.id===workId));
      assert.equal((await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[taskId]))[0]!.first_issued_at,null);
      assert.equal((await get('admin/failed-work',cm)).statusCode,403);
      assert.equal((await post('admin/failed-work/'+workId+'/retry',{},admin)).statusCode,200);
      assert.equal((await db.query('SELECT failed_at,attempts FROM outbox WHERE id=$1',[workId]))[0]!.attempts,0);
    });
    await t.test('Chapter 03 receipt access is rechecked after membership revocation',async()=>{
      const key=randomUUID();await post('workspaces/'+jobId+'/edit',{title:'Final edit',observations:'Wet',affectedLocation:'Room'},cm,version,key);
      await db.query('UPDATE memberships SET active=false WHERE id=$1',[ids.cm]);
      assert.equal((await get('operations/'+key,cm)).statusCode,404);
      assert.equal((await post('workspaces/'+jobId+'/edit',{title:'Final edit',observations:'Wet',affectedLocation:'Room'},cm,version,key)).statusCode,403);
    });
  } finally {await app.close();}
});
