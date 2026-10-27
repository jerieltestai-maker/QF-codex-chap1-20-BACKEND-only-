import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {INTEGRITY_DEFAULTS,ESTATE_ACK} from '../packages/domain/integrity-settings.js';
type Data=Record<string,any>;
class Element {
  children:Element[]=[];parentElement:Element|null=null;listeners=new Map<string,(()=>unknown)[]>();
  value='';type='';checked=false;disabled=false;hidden=false;isConnected=true;min='';max='';step='';maxLength=0;onclick?:()=>Promise<void>;
  constructor(readonly tag:string,private text=''){}
  get textContent():string{return this.text+this.children.map(x=>x.textContent).join('');}
  set textContent(v:string){this.text=v;this.children=[];}
  append(...items:Element[]){for(const i of items){i.parentElement=this;this.children.push(i);}}
  insertBefore(i:Element,b:Element){i.parentElement=this;const index=this.children.indexOf(b);if(index<0)this.children.push(i);else this.children.splice(index,0,i);}
  replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
  setAttribute(){}
  scrollIntoView(){}
  addEventListener(n:string,f:()=>unknown){this.listeners.set(n,[...this.listeners.get(n)??[],f]);}
  async fire(n:string){for(const f of this.listeners.get(n)??[])await f();}
}
const flush=async()=>{for(let i=0;i<5;i++)await new Promise<void>(r=>setImmediate(r));};
async function forms(file:string) {
  const main=new Element('main'),shell=new Element('section');main.append(shell);const events=new Map<string,((e:Data)=>unknown)[]>(),requests:Data[]=[],reads:string[]=[];
  const card={id:'card',event_type:'variation.proposal',source_version:2,actor_name:'Contractor',recorded_at:'2026-11-02T04:00Z',policy:INTEGRITY_DEFAULTS,triggers:[{rule:'variation_growth',threshold:20,percentage:'20.00'}],evidence:{}};
  let tasks:Data[]=[];
  const qf={context:{user:{id:'user'},context:{id:'mcst-context',role:'mcst',estate_id:'estate'}},
    api:async(route:string)=>{reads.push(route);if(route.endsWith('integrity-settings'))return {version:1,values:INTEGRITY_DEFAULTS,configured:true,acknowledgment:ESTATE_ACK};
      if(route.endsWith('/integrity'))return {version:7,cards:[card],workPaused:true,interpretation:'No misconduct finding',fairInformation:{},priceBridge:{},accessSummaries:[]};
      if(route.includes('dashboard/tasks'))return {items:tasks,total:tasks.length};
      if(route.includes('dashboard/'))return {items:route.includes('tickets?q=')?[{jobId:'job',version:7}]:[],total:0};
      if(route.endsWith('/exports'))return {exports:[]};throw new Error('Unexpected '+route);},
    submit:async(route:string,body:Data,version:number)=>{requests.push({route,body,version});return {exportId:'export'};},loadJob:async()=>{},refreshLists:async()=>{}};
  const document={querySelector:()=>main,getElementById:()=>shell,createElement:(tag:string)=>new Element(tag),createTextNode:(text:string)=>new Element('text',text),addEventListener:(name:string,f:(e:Data)=>unknown)=>events.set(name,[...events.get(name)??[],f])};
  class Option extends Element{constructor(text:string,value:string){super('option',text);this.value=value;}}
  runInNewContext(await readFile('apps/web/'+file,'utf8'),{window:{qfWorkspace:qf},document,Option,URLSearchParams,console});
  const all=():Element[]=>{const visit=(e:Element):Element[]=>[e,...e.children.flatMap(visit)];return visit(main);};
  const button=(label:string)=>{const b=all().find(x=>x.tag==='button'&&x.textContent===label);assert.ok(b,'Missing '+label);return b;};
  const field=(label:string)=>{const p=all().find(x=>x.tag==='label'&&x.textContent.startsWith(label));assert.ok(p,'Missing '+label);return p.children.find(x=>['input','select','textarea'].includes(x.tag))!;};
  const event=async(name:string,detail:Data={})=>{for(const f of events.get(name)??[])await f({detail});await flush();};
  await event('qf:context');return {qf,requests,reads,all,button,field,event,setTasks:(rows:Data[])=>{tasks=rows;}};
}

test('CH18 a support-panel list refresh updates the canonical queue after an action is fulfilled',async()=>{
  const f=await forms('oversight.js');
  f.setTasks([{taskId:'receipt',ownerRole:'contractor',action:'Confirm the cancellation settlement receipt',state:'actionable',nextEvent:'Action available'}]);
  await f.event('qf:lists-refreshed');assert.ok(f.all().some(e=>e.tag==='p'&&e.textContent==='1 outstanding actions · 0 matching tickets'));
  f.setTasks([]);await f.event('qf:lists-refreshed');
  assert.ok(f.all().some(e=>e.tag==='p'&&e.textContent==='0 outstanding actions · 0 matching tickets'));
  assert.equal(f.all().some(e=>e.tag==='p'&&e.textContent.includes('Confirm the cancellation settlement receipt')),false);
});
test('CH17 actual settings require an initially unchecked prospective acknowledgment immediately before Save',async()=>{
  const f=await forms('integrity.js'),ack=f.field(ESTATE_ACK),save=f.button('Save warning settings');
  assert.equal(ack.checked,false);assert.equal(save.disabled,true);const p=save.parentElement!;assert.equal(p.children[p.children.indexOf(save)-1]!.textContent,ESTATE_ACK);
  await save.onclick!();assert.equal(f.requests.length,0);
  ack.checked=true;await ack.fire('change');assert.equal(save.disabled,false);await save.onclick!();await flush();
  assert.equal(f.requests.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0]!.body.values)),INTEGRITY_DEFAULTS);assert.equal(f.requests[0]!.body.acknowledged,true);
  assert.equal(f.field(ESTATE_ACK).checked,false);assert.equal(f.button('Save warning settings').disabled,true);
});
test('CH17 actual clearance requires explanation plus its own unchecked confirmation; review disposition does not clear',async()=>{
  const f=await forms('integrity.js');await f.event('qf:job',{job:{id:'job'}});
  const label='Allow work to proceed after reviewing this exact warning and source version.',ack=f.field(label),reason=f.field('Required explanation for allowing continuation'),clear=f.button('Allow work to proceed');
  assert.equal(ack.checked,false);assert.equal(clear.disabled,true);reason.value='Reviewed exact evidence';await reason.fire('input');assert.equal(clear.disabled,true);await clear.onclick!();assert.equal(f.requests.length,0);
  f.field('Review disposition').value='explained';await f.button('Record review without clearance').onclick!();assert.equal(f.requests[0]!.route,'workspaces/job/integrity/review');assert.equal(f.requests[0]!.body.disposition,'explained');
  ack.checked=true;await ack.fire('input');assert.equal(clear.disabled,false);await clear.onclick!();assert.equal(f.requests[1]!.route,'workspaces/job/integrity/clear');assert.equal(f.requests[1]!.body.sourceVersion,2);assert.equal(f.requests[1]!.body.confirmed,true);
});
test('CH17 switching to CM removes oversight data and settings controls from the rendered role journey',async()=>{
  const f=await forms('integrity.js');await f.event('qf:job',{job:{id:'job'}});assert.ok(f.all().some(x=>x.textContent==='variation.proposal · exact source version 2'));
  f.qf.context.context.role='cm';await f.event('qf:context');assert.equal(f.all().some(x=>x.textContent==='variation.proposal · exact source version 2'),false);assert.equal(f.all().some(x=>x.tag==='button'&&x.textContent==='Save warning settings'),false);
});
test('CH17 routine same-context refresh preserves unsaved settings and unchecked confirmation state',async()=>{
  const f=await forms('integrity.js'),reason=f.field('Reason (required for Admin and ticket changes after bidding starts)');reason.value='Unsaved explanation';
  await f.event('qf:context');assert.equal(f.field('Reason (required for Admin and ticket changes after bidding starts)').value,'Unsaved explanation');assert.equal(f.field(ESTATE_ACK).checked,false);
});
test('CH18 racing job loads render one export action; requesting a snapshot never creates a download grant',async()=>{
  const f=await forms('oversight.js');await Promise.all([f.event('qf:job',{job:{id:'job'}}),f.event('qf:job',{job:{id:'job'}})]);
  assert.equal(f.all().filter(x=>x.tag==='button'&&x.textContent==='Request HTML decision pack').length,1);
  await f.button('Request HTML decision pack').onclick!();await flush();assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.route,'workspaces/job/exports');assert.equal(f.requests[0]!.body.format,'html');assert.equal(f.requests[0]!.version,7);assert.ok(f.reads.every(route=>!route.includes('/grant')));
});
