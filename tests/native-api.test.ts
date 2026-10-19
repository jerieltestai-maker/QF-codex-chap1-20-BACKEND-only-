import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,fixturePassword,ids} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {buildApp} from '../apps/api/src/app.js';
import sharp from 'sharp';
import {NativeClient,resumeUpload,type PendingUpload} from '../packages/native-client/client.js';
import {Worker} from '../packages/infrastructure/worker.js';

test('Chapter 20: native PKCE, shared commands and current access through the actual HTTP/database boundary',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}),db=await testDatabase(config);
  await migrate(db,'test');await installFixtures(db,'test');let now=new Date('2026-11-02T04:00:00Z'),address=0;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>now);await identity.initialize();const app=await buildApp(config,db,identity);
  const post=(url:string,payload:Record<string,unknown>,headers:Record<string,string>={})=>app.inject({method:'POST',url:'/api/v1/'+url,payload,headers,remoteAddress:'127.0.0.'+(++address%240+1)});
  const get=(url:string,headers:Record<string,string>={})=>app.inject({url:'/api/v1/'+url,headers,remoteAddress:'127.0.0.'+(++address%240+1)});
  const okay=(r:Awaited<ReturnType<typeof post>>)=>{assert.equal(r.statusCode,200,r.body);return r.json();};
  async function browser(email='cm@example.test') {const r=await post('auth/login',{email,password:fixturePassword},{origin:config.origin});const v=okay(r);return {cookie:String(r.headers['set-cookie']).split(';')[0]!,origin:config.origin,'x-csrf-token':v.csrfToken as string};}
  async function grant(headers:Record<string,string>) {const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');const result=okay(await post('native/authorize',{challenge:createHash('sha256').update(verifier).digest('base64url'),state},headers));const link=new URL(result.redirectUri);assert.equal(link.searchParams.get('state'),state);return {code:link.searchParams.get('code')!,verifier,redirectUri:'quotefix://auth'};}
  try {
    const cm=await browser(),a=await grant(cm);let session:{token:string;csrfToken:string};
    await t.test('CH20-T06/T12: PKCE code is exact-redirect, short lived and one-use; wrong verifier never consumes it',async()=>{
      assert.equal((await post('native/token',{...a,verifier:randomBytes(32).toString('base64url')})).statusCode,400);
      assert.equal((await post('native/token',{...a,redirectUri:'evil://auth'})).statusCode,422);
      const results=await Promise.all([post('native/token',a),post('native/token',a)]);
      assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,400]);session=okay(results.find(r=>r.statusCode===200)!);
      const expired=await grant(cm);now=new Date(now.getTime()+60000);assert.equal((await post('native/token',expired)).statusCode,400);
      const bad=await post('native/authorize',{challenge:'x'.repeat(43),state:'s'.repeat(43)},{...cm,'x-csrf-token':'wrong'});assert.equal(bad.statusCode,403);
    });
    const headers=()=>({authorization:'Bearer '+session!.token,'x-csrf-token':session!.csrfToken});
    await t.test('CH20-T01/T09: supported old contract remains additive; all four roles use the same context API',async()=>{
      const capabilities=okay(await get('capabilities'));assert.equal(capabilities.minimumContractVersion,1);assert.equal(capabilities.offlineDecisions,false);assert.equal(capabilities.pushEnabled,false);
      for(const email of ['cm@example.test','mcst@example.test','contractor@example.test','admin@example.test']) {
        const b=await browser(email),s=okay(await post('native/token',await grant(b)));
        const native=okay(await get('me/context',{authorization:'Bearer '+s.token})),web=okay(await get('me/context',b));
        assert.deepEqual(native.user,web.user);assert.deepEqual(native.memberships,web.memberships);assert.deepEqual(native.capabilities,web.capabilities);
      }
    });
    await t.test('CH20-T04: lost native response retries the same command exactly once, with normal web operation recovery',async()=>{
      const key=randomUUID(),body={estateId:ids.estate,title:'Native fictional draft',observations:'Observed dripping',affectedLocation:'Private plant room'},command={...headers(),'idempotency-key':key,'x-access-version':'1','if-match':'"record-0"'};
      const responses=await Promise.all([post('workspaces',body,command),post('workspaces',body,command)]);
      assert.deepEqual(okay(responses[0]!),okay(responses[1]!));assert.deepEqual(okay(await get('operations/'+key,cm)),responses[0]!.json());
      assert.equal((await post('workspaces',{...body,title:'Changed'},command)).statusCode,409);
      assert.equal(Number((await db.query('SELECT count(*) AS n FROM job_records'))[0]!.n),1);
      const id=responses[0]!.json().jobId;assert.equal((await get('workspaces/'+id,headers())).statusCode,200);
      const rival=okay(await post('native/token',await grant(await browser('contractor@example.test'))));assert.equal((await get('workspaces/'+id,{authorization:'Bearer '+rival.token})).statusCode,404);
    });
    await t.test('Native bearer transport rejects browser tokens, mixed credentials, cross-origin mutation and missing CSRF',async()=>{
      assert.equal((await get('me/context',{authorization:'Bearer '+cm.cookie.slice('qf_session='.length)})).statusCode,401);
      assert.equal((await get('me/context',{...headers(),cookie:cm.cookie})).statusCode,401);
      assert.equal((await post('auth/logout',{}, {...headers(),origin:'https://attacker.test'})).statusCode,403);
      assert.equal((await post('auth/logout',{}, {authorization:'Bearer '+session!.token})).statusCode,403);
      assert.equal((await post('native/authorize',{challenge:'x'.repeat(43),state:'s'.repeat(43)},headers())).statusCode,403);
      assert.equal((await post('native/token',await grant(cm),{origin:'https://attacker.test'})).statusCode,403);
    });
    await t.test('CH20-T02/T05/T06: native upload resumes after a committed chunk response is lost; ready bytes never publish or declare work complete',async()=>{
      let loseChunk=true;
      const transport:ConstructorParameters<typeof NativeClient>[2]=async(url,init)=>{
        const r=await app.inject({method:init.method as 'POST'|'GET',url:new URL(url).pathname+new URL(url).search,headers:init.headers as Record<string,string>,...(init.body?{payload:JSON.parse(String(init.body))}:{}) ,remoteAddress:'127.0.0.'+(++address%240+1)});
        if(url.endsWith('/chunks')&&loseChunk){loseChunk=false;throw new Error('Response lost after commit');}
        return {ok:r.statusCode<400,status:r.statusCode,json:async()=>r.json()};
      };
      const client=new NativeClient(config.origin,{token:session!.token,csrfToken:session!.csrfToken,expiresAt:'2026-11-03T00:00Z'},transport),context=await client.context();
      const [job]=await db.query('SELECT id,version FROM job_records LIMIT 1');
      const bytes=await sharp({create:{width:4,height:4,channels:3,background:'blue'}}).png().toBuffer(),checksum=createHash('sha256').update(bytes).digest('hex');
      let record:PendingUpload={id:randomUUID(),accountId:context.user.id,contextId:context.context!.id,jobId:String(job!.id),purpose:'evidence',localUri:'file:///device-only.png',mediaType:'image/png',byteSize:bytes.length,checksum,
        intentPath:'workspaces/'+job!.id+'/uploads',intentBody:{purpose:'evidence',mediaType:'image/png',byteSize:bytes.length,checksum},baseVersion:Number(job!.version),intentOperationId:randomUUID(),finalizeOperationId:randomUUID(),state:'device-only'};
      const save=async(r:PendingUpload)=>{record=r;};
      await assert.rejects(resumeUpload(client,context,record,bytes,checksum,save),/Checking submission/);assert.ok(record.uploadId);
      assert.equal(Number((await db.query('SELECT count(*) AS n FROM upload_chunks WHERE upload_id=$1',[record.uploadId]))[0]!.n),1);
      const result=await resumeUpload(client,context,record,bytes,checksum,save);assert.equal(result.record.state,'verifying');
      await new Worker(db,{scan:async()=>'clean'},()=>now).tick(500);
      const ready=await resumeUpload(client,context,record,bytes,checksum,save);assert.equal(ready.record.state,'ready');
      assert.equal(Number((await db.query('SELECT count(*) AS n FROM job_attachments'))[0]!.n),0);
      assert.equal(Number((await db.query('SELECT count(*) AS n FROM rfq_publications'))[0]!.n),0);
      await assert.rejects(resumeUpload(client,{...context,user:{...context.user,id:ids.admin}},record,bytes,checksum,save),/another account/);
      await assert.rejects(resumeUpload(client,context,record,bytes,'0'.repeat(64),save),/local file changed/);
    });
    await t.test('CH20-T08: revocation changes refresh context and stale commands cannot act; logout revokes the native session',async()=>{
      const before=okay(await get('me/refresh-context',headers()));assert.equal(before.purgeServerCache,true);
      await db.query('UPDATE memberships SET active=false,version=version+1 WHERE user_id=$1',[ids.cm]);await db.query('UPDATE users SET access_version=access_version+1 WHERE id=$1',[ids.cm]);
      const after=okay(await get('me/refresh-context',headers()));assert.notEqual(after.accessContext,before.accessContext);
      const r=await post('workspaces',{estateId:ids.estate,title:'No access',observations:'',affectedLocation:'Private'}, {...headers(),'idempotency-key':randomUUID(),'x-access-version':'1','if-match':'"record-0"'});assert.ok([403,404,412].includes(r.statusCode),r.body);
      okay(await post('auth/logout',{},headers()));assert.equal((await get('me/context',headers())).statusCode,401);
    });
  }finally{await app.close();}
});
