import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile('apps/web/ui.js','utf8');
type Control={id:string;name:string;type:string;tagName:string;value:string;dataset:Record<string,string>;disabled:boolean;readOnly:boolean;multiple:boolean;options:{value:string;selected?:boolean}[];closest:(selector:string)=>unknown;getAttribute:()=>null};
const field=(scope:string,value:string,extra:Partial<Control>={}):Control=>({id:'reason',name:'',type:'text',tagName:'INPUT',value,dataset:{qfDirty:'true'},disabled:false,readOnly:false,multiple:false,options:[],closest:selector=>selector==='[data-input-scope]'?{dataset:{inputScope:scope}}:null,getAttribute:()=>null,...extra});
function load(fetcher:typeof fetch=fetch){
  let timeout:(()=>void)|undefined,calls=0;
  const listeners:Record<string,(event:unknown)=>void>={};
  const window:Record<string,any>={};
  runInNewContext(source,{window,document:{addEventListener:(name:string,cb:(event:unknown)=>void)=>listeners[name]=cb},Intl,Date,Map,Array,Object,String,Number,AbortController,
    fetch:(...args:Parameters<typeof fetch>)=>{calls++;return fetcher(...args);},setTimeout:(callback:()=>void)=>{timeout=callback;return 1;},clearTimeout:()=>{}});
  return {ui:window.qfUI,expire:()=>timeout?.(),calls:()=>calls,listeners};
}

test('Unsent form restoration binds duplicate labels to the same record and excludes all final confirmations',()=>{
  const {ui}=load();
  const controls=[field('case-a','Private explanation A'),field('case-b','Private explanation B'),field('case-a','100',{type:'range'}),field('case-a','yes',{type:'checkbox'}),field('case-a','secret',{type:'password'}),field('case-a','invoice.pdf',{type:'file'})];
  const snapshot=ui.captureInputs({querySelectorAll:()=>controls});assert.equal(snapshot.length,2);
  const newer=[field('case-new',''),field('case-b',''),field('case-a','')];
  ui.restoreInputs({querySelectorAll:()=>newer},snapshot);
  assert.equal(newer[0]!.value,'');assert.equal(newer[1]!.value,'Private explanation B');assert.equal(newer[2]!.value,'Private explanation A');
  assert.ok(!JSON.stringify(snapshot).includes('secret'));
});

test('Restoration never invents a removed option or overwrites a server-disabled field',()=>{
  const {ui}=load(),prior=field('entry-a','old',{tagName:'SELECT',type:'select-one',options:[{value:'old'}]});
  const snapshot=ui.captureInputs({querySelectorAll:()=>[prior]});
  const changed=field('entry-a','new',{tagName:'SELECT',type:'select-one',options:[{value:'new'}]}),disabled=field('entry-a','server',{disabled:true});
  ui.restoreInputs({querySelectorAll:()=>[changed]},snapshot);assert.equal(changed.value,'new');
  ui.restoreInputs({querySelectorAll:()=>[disabled]},snapshot);assert.equal(disabled.value,'server');
});

test('A stalled request times out with recovery guidance and never retries a consequential submission',async()=>{
  const {ui,expire,calls}=load(((_url:unknown,options:RequestInit)=>new Promise((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))))) as typeof fetch);
  const pending=ui.fetch('/api/v1/workspaces/job/approve',{method:'POST',body:'exact input'});
  expire();await assert.rejects(pending,/Check your connection.*check pending submissions/i);assert.equal(calls(),1);
});
