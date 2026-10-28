import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {buildApp} from '../apps/api/src/app.js';

test('estate procurement onboarding works without a job and keeps exact versions and private address boundaries',async()=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'}),db=await testDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
  const identity=new IdentityService(db,config,{send:async()=>{}});await identity.initialize();const app=await buildApp(config,db,identity);let address=0;
  type Client={cookie:string;csrf:string};
  const get=(route:string,client:Client)=>app.inject({url:'/api/v1/'+route,headers:{cookie:client.cookie},remoteAddress:'127.0.0.'+(++address%240+1)});
  const post=(route:string,body:unknown,client:Client,version:number)=>app.inject({method:'POST',url:'/api/v1/'+route,payload:body as Record<string,unknown>,headers:{cookie:client.cookie,origin:config.origin,'x-csrf-token':client.csrf,'x-access-version':'1','if-match':'"record-'+version+'"','idempotency-key':randomUUID()},remoteAddress:'127.0.0.'+(++address%240+1)});
  async function login(email:string):Promise<Client>{const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},headers:{origin:config.origin},remoteAddress:'127.0.0.'+(++address%240+1)});assert.equal(r.statusCode,200,r.body);return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
  try {
    const admin=await login('admin@example.test'),mcst=await login('mcst@example.test'),cm=await login('cm@example.test'),contractor=await login('contractor@example.test'),route='estates/'+ids.estate+'/procurement-settings';
    const initial=await get(route,admin);assert.equal(initial.statusCode,200,initial.body);assert.equal(initial.json().thresholdCents,null);assert.equal(initial.json().version,1);assert.equal(initial.json().estateId,ids.estate);assert.ok('address' in initial.json());
    const saved=await post(route,{thresholdSgd:'123.45',address:'Private estate address',identitiesVisible:false,reason:'Explicit fictional first-estate configuration'},admin,1);assert.equal(saved.statusCode,200,saved.body);
    const adminView=await get(route,admin),mcstView=await get(route,mcst);assert.equal(adminView.json().thresholdCents,12345);assert.equal(adminView.json().version,2);assert.equal(adminView.json().address,'Private estate address');assert.equal(mcstView.statusCode,200,mcstView.body);assert.equal(mcstView.json().thresholdCents,12345);assert.equal(mcstView.json().identitiesVisible,false);assert.equal('address' in mcstView.json(),false);
    const stale=await post(route,{identitiesVisible:true,reason:'An outdated configuration'},mcst,1);assert.equal(stale.statusCode,412,stale.body);
    const change=await post(route,{identitiesVisible:true,reason:'MCST changes permitted identity visibility'},mcst,2);assert.equal(change.statusCode,200,change.body);assert.equal((await get(route,mcst)).json().version,3);
    assert.equal((await post(route,{thresholdSgd:'0.00',reason:'Not permitted'},mcst,3)).statusCode,403);assert.equal((await post(route,{address:'Not permitted',reason:'Not permitted'},mcst,3)).statusCode,403);
    for(const client of [cm,contractor])assert.equal((await get(route,client)).statusCode,404);assert.equal((await get('estates/'+ids.otherEstate+'/procurement-settings',mcst)).statusCode,404);assert.equal((await get('estates/'+ids.otherEstate+'/procurement-settings',admin)).statusCode,200);assert.equal((await get('estates/'+randomUUID()+'/procurement-settings',admin)).statusCode,404);
    assert.equal((await app.inject({url:'/api/v1/'+route})).statusCode,401);assert.equal((await db.query('SELECT id FROM job_records')).length,0);
    const [savedEstate]=await db.query('SELECT approval_threshold_cents,private_address FROM estates WHERE id=$1',[ids.estate]);assert.equal(Number(savedEstate!.approval_threshold_cents),12345);assert.equal(savedEstate!.private_address,'Private estate address');
  } finally {await app.close();}
});
