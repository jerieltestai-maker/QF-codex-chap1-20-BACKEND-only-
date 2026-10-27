import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {can,canRead} from '../packages/domain/access.js';
import type {SecurityMail} from '../packages/infrastructure/local-identity.js';
import {buildApp} from '../apps/api/src/app.js';

test('Chapter 2: real SQL/API login, onboarding and denied access scenarios',async t=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'});
  const db=await testDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
  const mail:SecurityMail[]=[];
  let clock=new Date('2026-10-13T04:00:00Z');
  const identity=new IdentityService(db,config,{send:async message=>{mail.push(message);}},()=>clock);
  await identity.initialize();
  const app=await buildApp(config,db,identity);
  let clientNumber=1;
  const post=async(route:string,body:unknown,cookie?:string,csrf?:string,version?:number,key?:string)=>
    app.inject({method:'POST',remoteAddress:'127.0.0.'+(clientNumber++),url:'/api/v1/'+route,payload:body as Record<string,unknown>,
      headers:{origin:config.origin,...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),
        ...(version?{'if-match':`"access-${version}"`}:{}),...(key?{'idempotency-key':key}:{})}});
  async function login(email:string,password=fixturePassword){
    const response=await post('auth/login',{email,password});assert.equal(response.statusCode,200,response.body);
    const cookie=response.headers['set-cookie']!.toString().split(';')[0]!;
    const context=await app.inject({url:'/api/v1/me/context',headers:{cookie}});
    return {cookie,csrf:response.json().csrfToken as string,context:context.json()};
  }
  try{
    await t.test('CH02-T01: invalid/unverified login, token replay, and enumeration-safe registration',async()=>{
      assert.equal((await post('auth/login',{email:'missing@example.test',password:fixturePassword})).statusCode,401);
      const created=await post('auth/register',{email:'new@example.test',name:'New User',password:fixturePassword});
      const repeated=await post('auth/register',{email:'new@example.test',name:'New User',password:fixturePassword});
      assert.equal(created.body,repeated.body);
      assert.equal((await post('auth/login',{email:'new@example.test',password:fixturePassword})).statusCode,401);
      const verify=mail.find(m=>m.to==='new@example.test'&&m.purpose==='verify')!;
      assert.equal((await post('auth/verify/confirm',{token:verify.token})).statusCode,200);
      assert.equal((await post('auth/verify/confirm',{token:verify.token})).statusCode,422);
      assert.equal((await login('new@example.test')).context.memberships.length,0);
    });
    const cm=await login('cm@example.test'),mcst=await login('mcst@example.test'),
      cm2=await login('cmtwo@example.test'),mcst2=await login('mcsttwo@example.test'),
      admin=await login('admin@example.test'),contractor=await login('contractor@example.test');
    await t.test('CH02-T02/T03: equal-role titles and labels, forged role and CSRF denied',async()=>{
      assert.equal(cm.context.capabilities['payment.record'],false);
      assert.equal(mcst.context.capabilities['payment.record'],true);
      assert.deepEqual(cm.context.capabilities,cm2.context.capabilities);
      assert.deepEqual(mcst.context.capabilities,mcst2.context.capabilities);
      const actor=await identity.actor(cm.cookie.split('=')[1]); assert.equal(can(actor,'payment.record'),false);
      const invite={email:'other@example.test',estateId:ids.estate,role:'mcst'};
      assert.equal((await post('admin/invitations',invite,cm.cookie,cm.csrf,1,randomUUID())).statusCode,403);
      assert.equal((await post('admin/invitations',invite,admin.cookie,'tampered',1,randomUUID())).statusCode,403);
      assert.equal((await post('admin/invitations',{...invite,role:'admin'},admin.cookie,admin.csrf,1,randomUUID())).statusCode,422);
      assert.equal((await post('me/context',{membershipId:ids.admin},cm.cookie,cm.csrf)).statusCode,404);
      const badOrigin=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email:'cm@example.test',password:fixturePassword},headers:{origin:'https://attacker.invalid'}});
      assert.equal(badOrigin.statusCode,403);
      assert.match((await app.inject({url:'/api/v1/me/context',headers:{cookie:cm.cookie}})).headers['cache-control']!,/no-store/);
    });
    await t.test('CH02-T04: cross-estate identifiers return the same non-disclosing 404',async()=>{
      assert.equal((await app.inject({url:'/api/v1/estates/'+ids.estate,headers:{cookie:cm.cookie}})).statusCode,200);
      const existing=await app.inject({url:'/api/v1/estates/'+ids.otherEstate,headers:{cookie:cm.cookie}});
      const missing=await app.inject({url:'/api/v1/estates/'+randomUUID(),headers:{cookie:cm.cookie}});
      assert.equal(existing.statusCode,404);assert.equal(missing.statusCode,404);
      assert.deepEqual(existing.json().error.message,missing.json().error.message);
      assert.equal((await app.inject({url:'/api/v1/estates/'+ids.estate,headers:{cookie:contractor.cookie}})).statusCode,404);
      assert.equal((await app.inject({url:'/api/v1/estates/'+ids.estate})).statusCode,401);
    });
    await t.test('CH02-T05: confidential subject exclusion overrides same-estate permissions',async()=>{
      const subject=await identity.actor(mcst.cookie.split('=')[1]),other=await identity.actor(mcst2.cookie.split('=')[1]);
      const report={estateId:ids.estate,subjectUserIds:[ids.mcst]};
      assert.equal(canRead(subject,report),false);assert.equal(canRead(other,report),true);
      assert.equal(canRead(await identity.actor(contractor.cookie.split('=')[1]),{organisationId:ids.organisation,subjectOrganisationIds:[ids.organisation]}),false);
    });
    await t.test('Invitation matching, expiry, duplicate concurrent retry, and changed-body conflict',async()=>{
      const invite={email:'new@example.test',estateId:ids.estate,role:'cm'};
      const operation=randomUUID();
      const issued=await post('admin/invitations',invite,admin.cookie,admin.csrf,1,operation);
      assert.equal(issued.statusCode,200,issued.body);
      assert.deepEqual((await post('admin/invitations',invite,admin.cookie,admin.csrf,1,operation)).json(),issued.json());
      assert.equal((await post('admin/invitations',{...invite,email:'changed@example.test'},admin.cookie,admin.csrf,1,operation)).statusCode,409);
      const inviteToken=mail.findLast(m=>m.purpose==='invite')!.token;
      assert.equal((await post('invitations/accept',{token:inviteToken},cm.cookie,cm.csrf,1,randomUUID())).statusCode,422);
      const pending=await login('new@example.test'),key=randomUUID();
      assert.equal((await post('invitations/preview',{token:inviteToken},cm.cookie,cm.csrf)).statusCode,422);
      const preview=await post('invitations/preview',{token:inviteToken},pending.cookie,pending.csrf);
      assert.equal(preview.statusCode,200);
      assert.equal(preview.json().role,'cm');assert.equal(preview.json().estateName,'Fictional Estate Alpha');
      const results=await Promise.all([post('invitations/accept',{token:inviteToken},pending.cookie,pending.csrf,1,key),
        post('invitations/accept',{token:inviteToken},pending.cookie,pending.csrf,1,key)]);
      assert.ok(results.every((r: {statusCode:number})=>r.statusCode===200),results.map((r: {body:string})=>r.body).join('\n'));
      assert.deepEqual(results[0]!.json(),results[1]!.json());
      assert.equal((await post('invitations/accept',{token:inviteToken},pending.cookie,pending.csrf,2,randomUUID())).statusCode,422);
      await post('admin/invitations',{email:'new@example.test',estateId:ids.otherEstate,role:'mcst'},admin.cookie,admin.csrf,1,randomUUID());
      const expiredToken=mail.findLast(m=>m.purpose==='invite')!.token;
      await db.query("UPDATE invitations SET expires_at=$1 WHERE email='new@example.test'",[new Date(clock.getTime()-1000).toISOString()]);
      assert.equal((await post('invitations/accept',{token:expiredToken},pending.cookie,pending.csrf,2,randomUUID())).statusCode,422);
    });
    await t.test('CH02-T08: contractor application permits onboarding and never quoting',async()=>{
      await post('auth/register',{email:'applicant@example.test',name:'Applicant',password:fixturePassword});
      const verify=mail.findLast(m=>m.purpose==='verify')!;
      await post('auth/verify/confirm',{token:verify.token});
      const applicant=await login('applicant@example.test');
      const body={organisationName:'Fictional Applicant',contact:'contact@example.test',trades:['handyman']},key=randomUUID();
      const result=await post('contractor/applications',body,applicant.cookie,applicant.csrf,1,key);
      assert.equal(result.statusCode,200,result.body);assert.equal(result.json().canQuote,false);
      assert.deepEqual((await post('contractor/applications',body,applicant.cookie,applicant.csrf,1,key)).json(),result.json());
      const context=await app.inject({url:'/api/v1/me/context',headers:{cookie:applicant.cookie}});
      assert.equal(context.json().capabilities['contractor.account'],true);
      assert.equal(context.json().capabilities['quote.submit'],false);
      assert.equal((await post('contractor/applications',{...body,role:'admin'},applicant.cookie,applicant.csrf,2,randomUUID())).statusCode,422);
    });
    await t.test('CH02-T06: revocation invalidates old session capabilities immediately and is audited',async()=>{
      const key=randomUUID(),body={membershipVersion:1,reason:'Fictional access test'};
      assert.equal((await post('admin/memberships/'+ids.cm+'/revoke',body,admin.cookie,admin.csrf,1,key)).statusCode,200);
      const result=await app.inject({url:'/api/v1/me/context',headers:{cookie:cm.cookie}});
      assert.equal(result.json().context,null);assert.equal(result.json().accessVersion,2);
      assert.equal((await app.inject({url:'/api/v1/estates/'+ids.estate,headers:{cookie:cm.cookie}})).statusCode,404);
      assert.equal((await post('admin/memberships/'+ids.cm+'/revoke',body,admin.cookie,admin.csrf,1,randomUUID())).statusCode,412);
      const [audit]=await db.query("SELECT before_value,after_value,reason FROM audit_events WHERE action='membership.revoke'");
      assert.equal(audit!.reason,body.reason);
      assert.equal((audit!.before_value as {active:boolean}).active,true);
      assert.equal((audit!.after_value as {active:boolean}).active,false);
    });
    await t.test('CH02-T07: recovery invalidates sessions; expired/replayed reset cannot change credentials',async()=>{
      const unknown=await post('auth/recover/request',{email:'unknown@example.test'});
      const known=await post('auth/recover/request',{email:'mcst@example.test'});
      assert.equal(unknown.body,known.body);
      const recovery=mail.findLast(m=>m.purpose==='recover')!;
      const changed='A-new-fictional-passphrase!';
      assert.equal((await post('auth/recover/confirm',{token:recovery.token,password:changed})).statusCode,200);
      assert.equal((await post('auth/recover/confirm',{token:recovery.token,password:changed})).statusCode,422);
      assert.equal((await app.inject({url:'/api/v1/me/context',headers:{cookie:mcst.cookie}})).statusCode,401);
      assert.equal((await post('auth/login',{email:'mcst@example.test',password:fixturePassword})).statusCode,401);
      const next=await login('mcst@example.test',changed);
      clock=new Date(clock.getTime()+9*3600000);
      assert.equal((await app.inject({url:'/api/v1/me/context',headers:{cookie:next.cookie}})).statusCode,401);
      await post('auth/recover/request',{email:'mcsttwo@example.test'});
      const expired=mail.findLast(m=>m.purpose==='recover')!;
      clock=new Date(clock.getTime()+31*60000);
      assert.equal((await post('auth/recover/confirm',{token:expired.token,password:changed})).statusCode,422);
      const signed=await login('mcsttwo@example.test');
      assert.equal((await post('auth/logout',{},signed.cookie,signed.csrf)).statusCode,200);
      assert.equal((await app.inject({url:'/api/v1/me/context',headers:{cookie:signed.cookie}})).statusCode,401);
    });
    await t.test('Login rate limiting blocks repeated attempts from the same client',async()=>{
      for (let i=0;i<11;i++) {
        const result=await app.inject({method:'POST',remoteAddress:'192.0.2.10',url:'/api/v1/auth/login',
          headers:{origin:config.origin},payload:{email:'missing@example.test',password:fixturePassword}});
        assert.equal(result.statusCode,i<10?401:429);
      }
    });
    await t.test('CH01-T05: public assets/error envelopes contain no privileged secrets',async()=>{
      const js=await app.inject({url:'/app.js'});
      assert.doesNotMatch(js.body,/DATABASE_URL|password_hash|signingKey|postgresql:\/\//);
      const response=await post('auth/register',{email:'bad',name:'x',password:'short'});
      assert.equal(response.statusCode,422);
      assert.ok(response.json().error.requestId);
      assert.doesNotMatch(response.body,/short|password_hash|INSERT INTO/);
      assert.equal((await app.inject({url:'/health/ready'})).json().status,'ready');
    });
  }finally{await app.close();}
});
