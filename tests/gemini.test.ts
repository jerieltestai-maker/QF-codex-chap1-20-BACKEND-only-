import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {GeminiAdviceProvider} from '../packages/infrastructure/gemini-advice.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import type {Evidence} from '../packages/domain/advice-service.js';

const evidence:Evidence={jobVersion:1,rfqRevision:1,roundId:'PRIVATE-ROUND',settingsVersion:1,contextId:'PRIVATE-MEMBERSHIP',role:'mcst',primary:'lower_total_price',secondary:null,
  quotes:[{quoteId:'PRIVATE-QUOTE-A',quoteVersion:1,name:'PRIVATE-CONTRACTOR-NAME',masked:false,amountCents:'10000',availability:'next_day',duration:'1_day',snapshotId:'PRIVATE-SNAPSHOT',pure:90,adjusted:90,externalCount:5,quoteFixCount:2},
    {quoteId:'PRIVATE-QUOTE-B',quoteVersion:1,name:'OTHER-PRIVATE-NAME',masked:false,amountCents:'12000',availability:'same_day',duration:'1_day',snapshotId:'PRIVATE-SNAPSHOT-2',pure:null,adjusted:null,externalCount:0,quoteFixCount:0}]};
const response=(result:unknown)=>new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(result)}]}]}),{headers:{'content-type':'application/json'}});

test('Gemini: server-only key, fixed endpoint, minimized anonymous facts, bounded JSON output and original citation mapping',async()=>{
  let calls=0;
  const request:typeof fetch=async(url,init)=>{
    calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1/interactions');assert.equal(init!.redirect,'error');
    assert.equal(new Headers(init!.headers).get('x-goog-api-key'),'fictional-key-only');assert.ok(!String(url).includes('fictional-key'));
    const text=String(init!.body),body=JSON.parse(text);assert.ok(!text.includes('PRIVATE-'));assert.equal(body.store,false);
    assert.equal(body.model,'gemini-3.5-flash-lite');assert.equal(body.generation_config.max_output_tokens,256);assert.equal(body.generation_config.thinking_level,'minimal');
    assert.equal(body.tools,undefined);assert.equal(body.response_format.mime_type,'application/json');assert.equal(body.response_format.schema.additionalProperties,false);
    return response({recommendedQuoteId:'q1',citations:['q1']});
  };
  const result=await new GeminiAdviceProvider('fictional-key-only',undefined,request).evaluate(evidence);
  assert.equal(calls,1);assert.equal(result.recommendedQuoteId,'PRIVATE-QUOTE-A');assert.deepEqual(result.citations,['PRIVATE-QUOTE-A']);assert.equal(result.origin,'provider');
});
test('Gemini: no preference and fewer than two quotes cost no provider calls',async()=>{
  let calls=0;const request:typeof fetch=async()=>{calls++;throw new Error('Must not call provider');},provider=new GeminiAdviceProvider('fictional-key-only',undefined,request);
  assert.equal((await provider.evaluate({...evidence,primary:'none'})).origin,'local');
  assert.equal((await provider.evaluate({...evidence,quotes:evidence.quotes.slice(0,1)})).recommendedQuoteId,null);assert.equal(calls,0);
});
test('Gemini: HTTP errors, malformed/truncated/blocked output, invented IDs and extra narrative fail closed without echoing provider secrets',async()=>{
  const cases=[new Response('PRIVATE provider error with fictional-key-only',{status:401}),new Response('invalid json'),
    new Response(JSON.stringify({status:'failed',steps:[]})),new Response(JSON.stringify({status:'completed',steps:[]})),
    response({recommendedQuoteId:'unknown',citations:['q1']}),response({recommendedQuoteId:'q1',citations:['private-contact']}),response({recommendedQuoteId:'q1',citations:['q1'],narrative:'PRIVATE text'}),
    new Response('x'.repeat(70000))];
  for(const output of cases) {
    const request:typeof fetch=async()=>output;
    await assert.rejects(()=>new GeminiAdviceProvider('fictional-key-only',undefined,request).evaluate(evidence),(e:unknown)=>e instanceof Error&&!e.message.includes('fictional-key-only')&&!e.message.includes('PRIVATE'));
  }
});
test('Gemini: request input cap, cancellation signal and model endpoint validation',async()=>{
  let calls=0;const controller=new AbortController();
  const request:typeof fetch=async(_url,init)=>{calls++;assert.equal(init!.signal,controller.signal);return response({recommendedQuoteId:null,citations:[]});};
  const provider=new GeminiAdviceProvider('fictional-key-only',undefined,request);await provider.evaluate(evidence,controller.signal);assert.equal(calls,1);
  await assert.rejects(()=>provider.evaluate({...evidence,quotes:Array.from({length:101},()=>evidence.quotes[0]!)}),/bounded/);assert.equal(calls,1);
  assert.throws(()=>new GeminiAdviceProvider('fictional-key-only','../../private-endpoint'),/configuration/);
});
test('Gemini config: opt-in only, missing keys refused, ignored server key file accepted without secret in .env',async()=>{
  const base={APP_ENV:'test',IDENTITY_ADAPTER:'local'};
  assert.equal(loadConfig({...base,GEMINI_API_KEY:'fictional-unused-key'}).adviceProvider,'local');
  assert.equal(loadConfig({...base,GEMINI_API_KEY:'fictional-unused-key'}).geminiApiKey,undefined);
  assert.throws(()=>loadConfig({...base,ADVICE_PROVIDER:'gemini'}),/server-side/);
  assert.throws(()=>loadConfig({...base,ADVICE_PROVIDER:'gemini',GEMINI_API_KEY_FILE:'missing-fictional-file'}),/unavailable/);
  const directory=await mkdtemp(join(tmpdir(),'qf-gemini-'));
  try {const path=join(directory,'key');await writeFile(path,'fictional-key-file\n');const config=loadConfig({...base,ADVICE_PROVIDER:'gemini',GEMINI_API_KEY_FILE:path});assert.equal(config.geminiApiKey,'fictional-key-file');assert.equal(config.geminiModel,'gemini-3.5-flash-lite');}
  finally {if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith('qf-gemini-'))throw new Error('Unexpected test cleanup path');await rm(directory,{recursive:true,force:true});}
});
