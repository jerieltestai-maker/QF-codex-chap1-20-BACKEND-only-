import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,migrate} from '../packages/infrastructure/database.js';
import {LocalAccounts} from '../packages/infrastructure/local-accounts.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {buildApp} from '../apps/api/src/app.js';
import {hashPassword} from '../packages/infrastructure/local-identity.js';

test('Local account autofill updates on registration/reset and never weakens login or exposes stored plaintext',async()=>{
  const config=loadConfig({APP_ENV:'development',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://',LOCAL_ACCOUNT_HELPER:'true'});
  const db=await openDatabase(config);await migrate(db,'development');await installFixtures(db,'development');
  const messages:{to:string;purpose:string;token:string}[]=[];
  const identity=new IdentityService(db,config,{send:async mail=>{messages.push(mail);}});
  await identity.initialize();
  const app=await buildApp(config,db,identity);
  const headers={host:new URL(config.origin).host,origin:config.origin};
  const list=()=>app.inject({url:'/api/v1/dev/accounts',headers});
  const fill=(userId:string)=>app.inject({method:'POST',url:'/api/v1/dev/accounts/autofill',headers,payload:{userId}});
  try {
    const initial=await list();assert.equal(initial.statusCode,200);
    assert.equal(initial.json().length,6);assert.doesNotMatch(initial.body,/password_hash|encrypted_password|Fictional-dev-only/);
    const fixture=await fill(ids.cm);assert.equal(fixture.statusCode,200);assert.equal(fixture.json().password,fixturePassword);
    const password='New-local-test-passphrase!';
    const created=await app.inject({method:'POST',url:'/api/v1/auth/register',headers,payload:{email:'new-local@example.test',name:'New Local User',password}});
    assert.equal(created.statusCode,200,created.body);
    const accounts=(await list()).json() as {id:string;email:string;passwordAvailable:boolean;emailVerified:boolean}[];
    const newAccount=accounts.find(a=>a.email==='new-local@example.test')!;
    assert.ok(newAccount);assert.equal(newAccount.passwordAvailable,true);assert.equal(newAccount.emailVerified,false);
    const filled=await fill(newAccount.id);assert.equal(filled.statusCode,200);assert.equal(filled.json().password,password);
    const [stored]=await db.query('SELECT encrypted_password FROM local_account_credentials WHERE user_id=$1',[newAccount.id]);
    assert.ok(stored);assert.ok(!JSON.stringify(stored).includes(password));
    const deniedLogin=await app.inject({method:'POST',url:'/api/v1/auth/login',headers,payload:{email:'new-local@example.test',password}});
    assert.equal(deniedLogin.statusCode,401); // Autofill does not verify an account or sign in for the user.
    // Re-registering an existing address cannot replace the remembered password.
    await app.inject({method:'POST',url:'/api/v1/auth/register',headers,payload:{email:'new-local@example.test',name:'Replacement',password:'Incorrect-local-passphrase!'}});
    assert.equal((await fill(newAccount.id)).json().password,password);
    await identity.requestToken('new-local@example.test','recover');
    const reset='Reset-local-test-passphrase!';
    const token=messages.findLast(m=>m.purpose==='recover')!.token;
    const recovered=await app.inject({method:'POST',url:'/api/v1/auth/recover/confirm',headers,payload:{token,password:reset}});
    assert.equal(recovered.statusCode,200);assert.equal((await fill(newAccount.id)).json().password,reset);
    // A credential changed outside the helper must not result in incorrect autofill.
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await hashPassword('Externally-changed-passphrase!'),newAccount.id]);
    assert.equal((await fill(newAccount.id)).statusCode,409);
    assert.equal((await fill(randomUUID())).statusCode,404);
    const external=await app.inject({url:'/api/v1/dev/accounts',remoteAddress:'192.0.2.1',headers});
    assert.equal(external.statusCode,403);
    const rebound=await app.inject({url:'/api/v1/dev/accounts',headers:{host:'attacker.invalid'}});
    assert.equal(rebound.statusCode,403);
    const crossSite=await app.inject({url:'/api/v1/dev/accounts',headers:{...headers,'sec-fetch-site':'cross-site'}});
    assert.equal(crossSite.statusCode,403);
    assert.equal((await list()).headers['cache-control'],'no-store');
    // A prior custom account becomes fillable only after successful authenticated sign-in.
    const legacyId=randomUUID(),legacyPassword='Existing-local-passphrase!';
    await db.query('INSERT INTO users(id,email,name,password_hash,email_verified) VALUES($1,$2,$3,$4,true)',
      [legacyId,'existing@example.test','Existing User',await hashPassword(legacyPassword)]);
    assert.equal((await fill(legacyId)).statusCode,409);
    const login=await app.inject({method:'POST',url:'/api/v1/auth/login',headers,payload:{email:'existing@example.test',password:legacyPassword}});
    assert.equal(login.statusCode,200);assert.equal((await fill(legacyId)).json().password,legacyPassword);
    // File-backed keys survive helper reconstruction (the database remains in memory for this test).
    const fileConfig={...config,databasePath:'work/autofill-regression-'+randomUUID()};
    const first=await LocalAccounts.create(fileConfig,db);
    await first!.remember(db,legacyId,legacyPassword,String((await db.query('SELECT password_hash FROM users WHERE id=$1',[legacyId]))[0]!.password_hash));
    const reopened=await LocalAccounts.create(fileConfig,db);
    assert.equal((await reopened!.credentials(legacyId)).password,legacyPassword);
  } finally {await app.close();}
});
test('Local account helper is absent when disabled and refused for test/staging/production environments',async()=>{
  assert.throws(()=>loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',LOCAL_ACCOUNT_HELPER:'true'}),/only permitted in development/);
  assert.throws(()=>loadConfig({APP_ENV:'production',IDENTITY_ADAPTER:'local',LOCAL_ACCOUNT_HELPER:'true'}));
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'});
  const db=await openDatabase(config);await migrate(db,'test');
  const identity=new IdentityService(db,config,{send:async()=>{}});await identity.initialize();
  const app=await buildApp(config,db,identity);
  try{
    assert.equal((await app.inject({url:'/api/v1/dev/accounts'})).statusCode,404);
    assert.equal((await app.inject({method:'POST',url:'/api/v1/dev/accounts/autofill',headers:{origin:config.origin},payload:{userId:ids.admin}})).statusCode,404);
    const pretendDevelopment={...config,environment:'development' as const,localAccountHelper:true};
    await assert.rejects(LocalAccounts.create(pretendDevelopment,db),/database mismatch/);
  }finally{await app.close();}
});
