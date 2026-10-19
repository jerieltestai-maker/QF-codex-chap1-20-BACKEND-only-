import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {NativeClient,NativeError,encodeBase64} from '../packages/native-client/client.js';
import {ticketFromLink} from '../packages/native-client/links.js';
const session={token:'t'.repeat(43),csrfToken:'c'.repeat(43),expiresAt:'2026-11-03T00:00Z'};
test('CH20-T02: offline refresh prevents consequential commands from entering a background queue',async()=>{
  const methods:string[]=[];const client=new NativeClient('http://127.0.0.1:3000',session,async(_url,init)=>{methods.push(init.method!);throw new Error('offline');});
  await assert.rejects(client.command('workspaces/x/payments/transfer',{amountSgd:'100.00'},'same-operation',1,1),(e:unknown)=>e instanceof NativeError&&e.code==='OFFLINE');
  assert.deepEqual(methods,['GET']);
});
test('CH20-T04: post-commit transport/5xx/unreadable responses remain unknown; validation rejection stays explicit',async()=>{
  for(const failure of ['network','server','json','validation']) {
    const client=new NativeClient('https://api.example.test',session,async(_url,init)=>{
      if(init.method==='GET')return {ok:true,status:200,json:async()=>({})};
      if(failure==='network')throw new Error('lost');
      return {ok:failure==='json',status:failure==='server'?500:failure==='validation'?422:200,json:async()=>{if(failure==='json')throw new Error('truncated');return {error:{code:'FIELD_VALIDATION',message:'Review inputs'}};}};
    });
    await assert.rejects(client.command('workspaces',{title:'draft'},'op',0,1),(e:unknown)=>e instanceof NativeError&&e.code===(failure==='validation'?'FIELD_VALIDATION':'OUTCOME_UNKNOWN'));
  }
});
test('CH20-T06/T08: account changes suppress late reads and late JSON bodies',async()=>{
  let release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});
  const client=new NativeClient('https://api.example.test',session,async()=>({ok:true,status:200,json:async()=>{await waiting;return {private:'previous account'};}}));
  const request=client.request('me/context');await new Promise<void>(r=>setImmediate(r));client.replaceSession(undefined);release();
  await assert.rejects(request,(e:unknown)=>e instanceof NativeError&&e.code==='ACCOUNT_CHANGED');
});
test('CH20-T05: base64 chunk encoding preserves bytes at every remainder and transfer boundary',()=>{
  for(const length of [0,1,2,3,4,262143,262144]){const bytes=randomBytes(length);assert.equal(encodeBase64(bytes),bytes.toString('base64'));}
  assert.throws(()=>new NativeClient('http://untrusted.example.test',undefined),/HTTPS/);
  assert.throws(()=>new NativeClient('https://api.example.test/path',undefined),/HTTPS/);
});
test('CH20-T12: deep links carry only a resource ID and cannot trigger payment or accept injected details',()=>{
  const id='10000000-0000-4000-8000-000000000001';assert.equal(ticketFromLink('quotefix://ticket/'+id),id);
  for(const link of ['quotefix://ticket/'+id+'?amount=100','quotefix://ticket/'+id+'#private','quotefix://auth?code=secret','quotefix://payment/'+id,'https://attacker.test/ticket/'+id,'quotefix://ticket/not-a-uuid'])assert.equal(ticketFromLink(link),undefined);
});
