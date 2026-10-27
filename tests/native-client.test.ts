import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {NativeClient,NativeError,encodeBase64,consumeEvidence,type NativeContext,type PendingUpload} from '../packages/native-client/client.js';
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
test('Account switch between the live refresh and command POST cannot reuse another account session',async()=>{
  const methods:string[]=[],client=new NativeClient('https://api.example.test',session,async(_url,init)=>{methods.push(init.method!);return {ok:true,status:200,json:async()=>({})};});
  const original=client.request.bind(client);
  client.request=async<T>(path:string,body?:unknown,headers?:Record<string,string>)=>{const result=await original<T>(path,body,headers);if(path==='me/refresh-context')client.replaceSession(undefined);return result;};
  await assert.rejects(client.command('workspaces',{},'same-op',0,1),(e:unknown)=>e instanceof NativeError&&e.code==='ACCOUNT_CHANGED');
  assert.deepEqual(methods,['GET']);
});
test('A capture persisted just as account changes keeps its frozen intent without posting under the new account',async()=>{
  let posts=0;const client=new NativeClient('https://api.example.test',session,async()=>{posts++;throw new Error('Must not post');});
  const context:NativeContext={user:{id:'owner',name:'Owner'},accessVersion:1,csrfToken:'csrf',context:{id:'estate',role:'cm',estate_id:'estate',organisation_id:null},memberships:[]};
  const record:PendingUpload={id:'capture',accountId:'owner',contextId:'estate',jobId:'job',purpose:'evidence',localUri:'file:///capture',mediaType:'image/png',byteSize:1,checksum:'hash',intentPath:'unused',intentBody:{},baseVersion:0,intentOperationId:'intent',finalizeOperationId:'finalize',state:'ready'};
  let saved:PendingUpload|undefined;
  await assert.rejects(consumeEvidence(client,context,record,{state:'ready',chunks:[],objects:[{id:'file',variant:'sanitized'}]},{note:'',workVersion:0,newOperationId:()=> 'operation'},async r=>{saved=r;client.replaceSession(undefined);}),(e:unknown)=>e instanceof NativeError&&e.code==='ACCOUNT_CHANGED');
  assert.equal(posts,0);assert.equal(saved?.consumed,undefined);assert.equal(saved?.consumption?.operations.file,'operation');
});
