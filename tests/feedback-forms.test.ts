import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

type Data=Record<string,any>;
class Element {
  children:Element[]=[];parentElement:Element|null=null;dataset:Record<string,string>={};id='';name='';value='';type='';checked=false;disabled=false;readOnly=false;multiple=false;selected=false;hidden=false;files:Data[]=[];attributes=new Map<string,string>();listeners=new Map<string,(()=>unknown)[]>();onclick?:()=>Promise<void>;
  constructor(readonly tag:string,private text=''){}
  get tagName(){return this.tag.toUpperCase();}
  get nodeType(){return this.tag==='text'?3:1;}
  get childNodes():Element[]{return [...(this.text?[new Element('text',this.text)]:[]),...this.children];}
  get options(){return this.children;}
  get selectedOptions(){return this.children.filter(e=>e.selected||e.value===this.value);}
  get textContent():string{return this.text+this.children.map(e=>e.textContent).join('');}
  set textContent(value:string){this.text=value;this.children=[];}
  append(...items:Element[]){for(const item of items){item.parentElement=this;this.children.push(item);}}
  replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
  setAttribute(name:string,value:string){this.attributes.set(name,value);if(name==='data-input-scope')this.dataset.inputScope=value;}
  getAttribute(name:string){return this.attributes.get(name)??null;}
  closest(selector:string):Element|null{if(selector==='label'&&this.tag==='label'||selector==='[data-input-scope]'&&this.dataset.inputScope||selector==='details'&&this.tag==='details')return this;return this.parentElement?.closest(selector)??null;}
  querySelectorAll(selector:string):Element[]{const all=this.children.flatMap(e=>[e,...e.querySelectorAll('*')]);if(selector==='*')return all;if(selector==='[data-qf-dirty]')return all.filter(e=>'qfDirty' in e.dataset);return all.filter(e=>['input','select','textarea'].includes(e.tag));}
  addEventListener(name:string,action:()=>unknown){this.listeners.set(name,[...this.listeners.get(name)??[],action]);}
  async fire(name:string){for(const action of this.listeners.get(name)??[])await action();}
}
const source=await readFile('apps/web/ui.js','utf8')+'\n'+await readFile('apps/web/feedback.js','utf8');
const flush=async()=>{for(let i=0;i<5;i++)await new Promise<void>(r=>setImmediate(r));};
async function forms(options:{inspected?:boolean;aftercare?:boolean}={}){
  const main=new Element('main'),events=new Map<string,((e:Data)=>unknown)[]>(),commands:Data[]=[],values=new Map<string,string>();
  const data={jobId:'job',version:7,canSubmit:true,obligation:{version:2,status:'due',due_at:'2026-12-02T01:00Z',first_issued_at:'2026-12-02T01:00Z'},entries:[],cases:[],inspections:[]};
  const qf={context:{user:{id:'user'},context:{id:'context',role:'cm'}},job:{id:'job'},
    api:async(path:string)=>{if(path.endsWith('/feedback'))return structuredClone(data);if(path.endsWith('/completion'))return {rounds:options.inspected?[{round:1,outcome:'accepted'}]:[],completion:options.aftercare?{confirmed_version:1}:null};throw new Error('Unexpected '+path);},
    submit:async(path:string,body:Data,version:number)=>{commands.push({path,body,version});return {};},refreshLists:async()=>{}};
  const document={querySelector:()=>main,createElement:(tag:string)=>new Element(tag),createTextNode:(text:string)=>new Element('text',text),addEventListener:(name:string,action:(e:Data)=>unknown)=>events.set(name,[...events.get(name)??[],action])};
  class Option extends Element{constructor(label:string,value:string){super('option',label);this.value=value;}}
  const localStorage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
  const window:Data={qfWorkspace:qf,addEventListener:()=>{}};
  runInNewContext(source,{window,document,navigator:{onLine:true},localStorage,Option,console});
  const all=():Element[]=>{const visit=(e:Element):Element[]=>[e,...e.children.flatMap(visit)];return visit(main);};
  const field=(label:string)=>{const parent=all().find(e=>e.tag==='label'&&e.textContent.startsWith(label));assert.ok(parent,'Missing '+label);return parent.children.find(e=>['input','select','textarea'].includes(e.tag))!;};
  const click=async(label:string)=>{const button=all().find(e=>e.tag==='button'&&e.textContent===label);assert.ok(button,'Missing '+label);await button.onclick!();await flush();};
  const event=async(name:string,detail:Data={})=>{for(const handler of events.get(name)??[])await handler({detail});await flush();};
  await event('qf:context');await event('qf:job',{job:{id:'job'}});
  return {all,field,click,event,commands,qf,window,values};
}

test('Due durability feedback requires deliberate confirmation and the exact observed rating, without sending incomplete decisions',async()=>{
  const f=await forms();f.field('Can the repair be assessed?').value='rated';f.field('Durability rating — assessable repair only').value='4';f.field('Observation about durability, or explanation if unable to assess').value='The repair is still working.';
  await f.click('Submit feedback');assert.equal(f.commands.length,0);
  f.field('I confirm this observation.').checked=true;await f.click('Submit feedback');assert.equal(f.commands.length,1);assert.equal(f.commands[0]!.path,'workspaces/job/feedback/submit');assert.equal(f.commands[0]!.version,7);assert.equal(f.commands[0]!.body.obligationVersion,2);assert.equal(f.commands[0]!.body.confirmed,true);assert.equal(f.commands[0]!.body.rating,4);
});

test('Unable to assess disables the star control and submits no invented rating',async()=>{
  const f=await forms(),outcome=f.field('Can the repair be assessed?'),rating=f.field('Durability rating — assessable repair only');
  assert.equal(rating.disabled,true);outcome.value='rated';await outcome.fire('change');assert.equal(rating.disabled,false);rating.value='5';outcome.value='unable';await outcome.fire('change');assert.equal(rating.disabled,true);
  f.field('Observation about durability, or explanation if unable to assess').value='The equipment has not been used.';f.field('I confirm this observation.').checked=true;await f.click('Submit feedback');assert.equal(f.commands.length,1);assert.equal(f.commands[0]!.body.outcome,'unable');assert.equal('rating' in f.commands[0]!.body,false);
});

test('Inspection questionnaire rejects omitted questions and requires an explanation for every negative response',async()=>{
  const f=await forms({inspected:true});f.field('I confirm these five feedback answers. Work acceptance is recorded separately.').checked=true;
  await f.click('Submit inspection questionnaire');assert.equal(f.commands.length,0);
  const questions=['Workmanship: How satisfactory was the finished repair?','Timeliness: How well did the contractor keep the agreed start and finish commitments?','Customer service: How well did the contractor communicate and respond to the CM while working on site?','Value for money: Considering the agreed final price and result, how good was the value?','I would recommend this contractor for similar work.'];
  for(const label of questions)f.field(label).value='5';f.field(questions[0]!).value='2';await f.click('Submit inspection questionnaire');assert.equal(f.commands.length,0);
  f.field('Reason for low responses, or optional observation').value='The finished joint is visibly uneven.';await f.click('Submit inspection questionnaire');assert.equal(f.commands.length,1);assert.equal(f.commands[0]!.path,'workspaces/job/reputation/inspection');assert.equal(f.commands[0]!.body.rubric.workmanship,2);assert.equal(f.commands[0]!.body.round,1);
});

test('Routine same-context refresh preserves unfinished feedback and its unchecked review control; account changes remove it',async()=>{
  const f=await forms(),observation=f.field('Observation about durability, or explanation if unable to assess');observation.value='Unfinished observation';await observation.fire('input');assert.equal(f.values.size,1);
  await f.event('qf:context');assert.equal(f.field('Observation about durability, or explanation if unable to assess'),observation);assert.equal(f.field('I confirm this observation.').checked,false);
  f.qf.context.context.id='different-context';await f.event('qf:context');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Submit feedback'),false);
});

test('Aftercare request requires both concern and requested help and does not alter Feedback by itself',async()=>{
  const f=await forms({aftercare:true});await f.click('Request aftercare');assert.equal(f.commands.length,0);f.field('Observed concern').value='A drip returned';await f.click('Request aftercare');assert.equal(f.commands.length,0);f.field('What help are you requesting?').value='Inspect the joint';await f.click('Request aftercare');assert.equal(f.commands.length,1);assert.equal(f.commands[0]!.path,'workspaces/job/aftercare/request');assert.deepEqual(JSON.parse(JSON.stringify(f.commands[0]!.body.evidenceIds)),[]);
});

test('Feedback shown before work is authorised gives a recoverable empty state instead of an unhandled load failure',async()=>{
  const f=await forms();f.qf.api=async()=>{throw Object.assign(new Error('Unavailable'),{status:404});};await f.window.qfFeedback.open('private-job');assert.ok(f.all().some(e=>e.tag==='p'&&e.textContent.includes('available after this job has an authorised completion record')));
});
test('Explicit view refresh preserves an unfinished aftercare draft through the shared helper while resetting consequential confirmation',async()=>{
  const f=await forms({aftercare:true}),concern=f.field('Observed concern'),help=f.field('What help are you requesting?');concern.value='Unsubmitted recurrence';help.value='Please inspect';concern.dataset.qfDirty=help.dataset.qfDirty='true';f.field('I confirm this observation.').checked=true;
  await f.event('qf:refresh');assert.equal(f.field('Observed concern').value,'Unsubmitted recurrence');assert.equal(f.field('What help are you requesting?').value,'Please inspect');assert.equal(f.field('I confirm this observation.').checked,false);assert.equal(f.commands.length,0);
});
