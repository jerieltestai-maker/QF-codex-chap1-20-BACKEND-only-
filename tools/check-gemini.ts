import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {loadConfig} from '../packages/infrastructure/config.js';
import {GeminiAdviceProvider} from '../packages/infrastructure/gemini-advice.js';
if(existsSync('.env'))loadEnvFile('.env');
const c=loadConfig();
if(c.adviceProvider!=='gemini'||!c.geminiApiKey)throw new Error('Run tools/setup-gemini.ps1, or configure the server Gemini environment first');
try {
  const provider=new GeminiAdviceProvider(c.geminiApiKey,c.geminiModel),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    const result=await provider.evaluate({jobVersion:1,rfqRevision:1,roundId:'fictional',settingsVersion:1,contextId:'fictional',role:'cm',primary:'lower_total_price',secondary:null,
      quotes:[{quoteId:'fictional-a',quoteVersion:1,name:'Fictional A',masked:true,amountCents:'10000',availability:'next_day',duration:'1_day',snapshotId:'fictional',pure:null,adjusted:null,externalCount:0,quoteFixCount:0},
        {quoteId:'fictional-b',quoteVersion:1,name:'Fictional B',masked:true,amountCents:'12000',availability:'same_day',duration:'1_day',snapshotId:'fictional',pure:null,adjusted:null,externalCount:0,quoteFixCount:0}]},controller.signal);
    if(result.recommendedQuoteId!=='fictional-a'||!result.citations.includes('fictional-a'))throw new Error('Unexpected comparison answer');
    console.log('Gemini fictional structured-comparison verification passed for '+c.geminiModel+'. No key or private job data was printed.');
  } finally {clearTimeout(timer);}
} catch {console.error('Gemini verification failed. Check the server key, model access and quota. No provider body or key was printed.');process.exitCode=1;}
