import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completionFixture} from './completion-helper.js';

test('Interface assets and authorised reads do not consume command or strict identity budgets',async()=>{
  const f=await completionFixture();
  try{
    const remoteAddress='127.0.0.249',headers={origin:'http://127.0.0.1:3000'};
    for(let i=0;i<130;i++)assert.equal((await f.app.inject({url:'/style.css',remoteAddress})).statusCode,200);
    for(let i=0;i<600;i++)assert.equal((await f.app.inject({url:'/api/v1/me/context',remoteAddress})).statusCode,401);
    assert.equal((await f.app.inject({url:'/api/v1/me/context',remoteAddress})).statusCode,429);
    for(let i=0;i<120;i++)assert.equal((await f.app.inject({method:'POST',url:'/api/v1/auth/logout',remoteAddress,headers,payload:{}})).statusCode,401);
    const commandLimit=await f.app.inject({method:'POST',url:'/api/v1/auth/logout',remoteAddress,headers,payload:{}});assert.equal(commandLimit.statusCode,429);assert.ok(commandLimit.headers['retry-after']);
    for(let i=0;i<10;i++)assert.equal((await f.app.inject({method:'POST',url:'/api/v1/auth/login',remoteAddress,headers,payload:{email:'unavailable@example.test',password:'Wrong-password-for-rate-test'}})).statusCode,401);
    assert.equal((await f.app.inject({method:'POST',url:'/api/v1/auth/login',remoteAddress,headers,payload:{email:'unavailable@example.test',password:'Wrong-password-for-rate-test'}})).statusCode,429);
  }finally{await f.close();}
});
