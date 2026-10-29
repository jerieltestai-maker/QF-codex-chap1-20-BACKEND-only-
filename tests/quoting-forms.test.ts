import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

type Data=Record<string,any>;
class Element {
  children:Element[]=[];parentElement:Element|null=null;attributes=new Map<string,string>();listeners=new Map<string,Array<()=>unknown>>();
  dataset:Data={};readOnly=false;multiple=false;selected=false;name='';
  id='';className='';type='';value='';checked=false;hidden=false;disabled=false;isConnected=true;maxLength=0;inputMode='';accept='';href='';files:unknown[]=[];
  onclick?:()=>Promise<void>;onchange?:()=>void;
  constructor(readonly tag:string,private text=''){}
  get tagName(){return this.tag.toUpperCase();}
  get classList(){
    const tokens=()=>this.className.split(/[\t\n\f\r ]+/).filter(Boolean);
    return {
      add:(...values:string[])=>{this.className=[...new Set([...tokens(),...values])].join(' ');},
      contains:(value:string)=>tokens().includes(value),
      remove:(...values:string[])=>{this.className=tokens().filter(value=>!values.includes(value)).join(' ');}
    };
  }
  get nodeType(){return this.tag==='text'?3:1;}
  get childNodes():Array<Element|{nodeType:number;textContent:string}>{return [...(this.text?[{nodeType:3,textContent:this.text}]:[]),...this.children];}
  get options(){return this.children.filter(n=>n.tag==='option');}
  get selectedOptions(){return this.options.filter(n=>this.multiple?n.selected:n.value===this.value);}
  get textContent():string{return this.text+this.children.map(n=>n.textContent).join('');}
  set textContent(value:string){this.text=value;this.children=[];}
  append(...nodes:Element[]){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  replaceChildren(...nodes:Element[]){this.children=[];this.append(...nodes);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.isConnected=false;}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  getAttribute(key:string){return this.attributes.get(key)??null;}
  addEventListener(name:string,callback:()=>unknown){this.listeners.set(name,[...this.listeners.get(name)??[],callback]);}
  async fire(name:string){for(const callback of this.listeners.get(name)??[])await callback();}
  dispatchEvent(event:{type:string}){if(event.type==='change')this.onchange?.();for(const callback of this.listeners.get(event.type)??[])callback();return true;}
  querySelector(selector:string):Element|null{return walk(this).find(n=>selector==='[role="status"]'?n.attributes.get('role')==='status':n.tag===selector)??null;}
  querySelectorAll(selector:string):Element[]{return walk(this).filter(n=>selector==='input,select,textarea'?['input','select','textarea'].includes(n.tag):selector==='[data-qf-dirty]'?n.dataset.qfDirty!==undefined:n.tag===selector);}
  closest(tag:string):Element|null{return this.tag===tag?this:this.parentElement?.closest(tag)??null;}
  focus(){}
}
const walk=(root:Element):Element[]=>[root,...root.children.flatMap(walk)];
const source=await readFile('apps/web/quoting.js','utf8');
const sharedUi=await readFile('apps/web/ui.js','utf8');
const flush=async()=>{for(let i=0;i<5;i++)await new Promise<void>(r=>setImmediate(r));};
const completeTerms={amountSgd:'125.30',wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',commitment:true,expiryConfirmed:true};
const quote={id:'quote',round_id:'round',version:3,status:'active',terms:completeTerms};
async function forms(options:{role?:string;quoted?:boolean;priorRound?:boolean;submitError?:string;comparison?:(route:string)=>Promise<unknown>}={}){
  const main=new Element('main'),detail=new Element('article'),opportunities=new Element('section');detail.id='workspace-detail';opportunities.id='opportunities-shell';main.append(detail,opportunities);
  const events=new Map<string,Array<(event:Data)=>unknown>>(),requests:Data[]=[],reads:string[]=[],storage=new Map<string,string>(),navigations:string[]=[];
  const opportunity={jobId:'job',revision:2,roundId:'round',description:'Leaking valve',location:'Service area',categories:['plumbing'],evidenceIds:[],accessEquipmentRequired:false};
  const own={quotes:options.quoted?[{quote:{...quote,round_id:options.priorRound?'old-round':'round'},versions:[]}]:[],suggestedExpiry:'2027-12-31',commitmentCopy:'My quote remains held after selection.'};
  const context={user:{id:'user'},context:{id:'membership',role:options.role??'contractor',estate_id:'estate'},accessVersion:1};
  const qf={context,job:{id:'job',estate_id:'estate'},api:async(route:string)=>{reads.push(route);if(route==='admin/estates')return [{id:'estate',name:'Fictional estate'}];if(route==='estates/estate/procurement-settings')return {estateId:'estate',name:'Fictional estate',version:5,thresholdCents:null,identitiesVisible:false,...(context.context.role==='admin'?{address:'Private estate address'}:{})};if(route==='contractor/jobs')return [];if(route==='opportunities/job')return opportunity;if(route.endsWith('/quotes'))return own;if(route.endsWith('/conversation'))return {questions:[],shared:[],visits:[],reveals:[],rfqRevision:2};if(route.endsWith('/comparison')&&options.comparison)return options.comparison(route);throw new Error('Unexpected '+route);},submit:async(route:string,body:unknown,version:number)=>{requests.push({route,body,version});if(options.submitError)throw new Error(options.submitError);return {};},loadJob:async()=>{},refreshLists:async()=>{}};
  const document={activeElement:null,body:main,querySelector:(selector:string)=>selector==='main'?main:null,getElementById:(id:string)=>walk(main).find(n=>n.id===id)??null,createElement:(tag:string)=>new Element(tag),createTextNode:(text:string)=>new Element('text',text),addEventListener:(name:string,callback:(event:Data)=>unknown)=>events.set(name,[...events.get(name)??[],callback]),dispatchEvent:(event:Data)=>{if(event.type==='qf:navigate')navigations.push(event.options.detail.screen);}};
  class Option extends Element{constructor(text:string,value:string){super('option',text);this.value=value;}}
  class CustomEvent{constructor(readonly type:string,readonly options:Data){}}
  class Event{constructor(readonly type:string){}}
  const window:Data={qfWorkspace:qf};
  runInNewContext(sharedUi+'\n'+source,{window,document,Option,CustomEvent,Event,console,localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)}});
  async function event(name:string,detail:Data){for(const callback of events.get(name)??[])await callback({detail});await flush();}
  await event('qf:context',context);
  const all=()=>walk(main),button=(label:string)=>{const found=all().find(n=>n.tag==='button'&&n.textContent===label);assert.ok(found,'Missing '+label);return found;};
  const field=(label:string)=>{const found=all().find(n=>n.tag==='label'&&n.textContent.startsWith(label));assert.ok(found,'Missing '+label);return found.children.find(n=>['input','select','textarea'].includes(n.tag))!;};
  const click=async(label:string)=>{await button(label).onclick!();await flush();};
  const fill=()=>{for(const [label,value] of [['Final SGD amount payable — includes all GST charged','125.30'],['Waste disposal included','yes'],['Warranty included','no'],['Making good included','yes'],['GST charged?','no'],['Earliest availability','next_day'],['Estimated work duration','1_day'],['Additional exclusions','none']])field(label!).value=value!;for(const label of ['I confirm this expiry date or date/time.','My quote remains held after selection.','I reviewed RFQ revision 2 and the current scope.'])field(label).checked=true;};
  return {main,all,field,button,click,fill,event,qf,window,reads,requests,navigations,open:()=>window.qfQuotes.open('job')};
}

test('actual quote form preserves explicit declarations and exact revision/version at submission',async()=>{
  const f=await forms();await f.open();
  for(const label of ['Waste disposal included','Warranty included','Making good included','GST charged?'])assert.equal(f.field(label).value,'');
  await f.click('Submit initial quote');assert.equal(f.requests.length,0);
  f.fill();f.field('My quote remains held after selection.').checked=false;await f.click('Submit initial quote');assert.equal(f.requests.length,0);
  f.field('My quote remains held after selection.').checked=true;await f.click('Submit initial quote');assert.equal(f.requests.length,1);
  assert.equal(f.requests[0]!.route,'opportunities/job/quotes');assert.equal(f.requests[0]!.body.rfqRevision,2);assert.equal(f.requests[0]!.version,0);assert.equal(f.requests[0]!.body.terms.amountSgd,'125.30');assert.equal(f.requests[0]!.body.terms.gstCharged,false);
});

test('actual quote form requires conditional explanations while accepting an explained unknown duration',async()=>{
  const f=await forms();await f.open();f.fill();f.field('Warranty included').value='yes';f.field('Warranty duration').value='other';await f.click('Submit initial quote');assert.equal(f.requests.length,0);
  f.field('Other warranty duration').value='18 months';f.field('Estimated work duration').value='unknown';await f.click('Submit initial quote');assert.equal(f.requests.length,0);
  f.field('Other duration / unable-to-estimate reason').value='Concealed pipe must be inspected';await f.click('Submit initial quote');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.body.terms.duration,'unknown');assert.equal(f.requests[0]!.body.terms.warrantyOther,'18 months');
});

test('actual conversation controls follow prequote Q&A and initial-quote visit prerequisites',async()=>{
  const unquoted=await forms();await unquoted.open();assert.ok(unquoted.all().some(n=>n.tag==='button'&&n.textContent==='Ask before quoting'));assert.equal(unquoted.all().some(n=>n.tag==='button'&&n.textContent==='Request a site visit'),false);
  const quoted=await forms({quoted:true});await quoted.open();assert.equal(quoted.all().some(n=>n.tag==='button'&&n.textContent==='Ask before quoting'),false);assert.ok(quoted.button('Request a site visit'));await quoted.click('Request a site visit');assert.equal(quoted.requests.length,0);quoted.field('Site-visit request reason').value='Check concealed access';await quoted.click('Request a site visit');assert.equal(quoted.requests[0]!.route,'opportunities/job/visits');assert.equal(quoted.requests[0]!.body.rfqRevision,2);
  const prior=await forms({quoted:true,priorRound:true});await prior.open();assert.equal(prior.all().some(n=>n.tag==='button'&&['Ask before quoting','Request a site visit'].includes(n.textContent)),false);
});

test('changing a quote expiry requires a fresh explicit expiry acknowledgment',async()=>{
  const f=await forms();await f.open();f.fill();const expiry=f.field('Quote expiry');expiry.value='2028-01-01';await expiry.fire('input');assert.equal(f.field('I confirm this expiry date or date/time.').checked,false);await f.click('Submit initial quote');assert.equal(f.requests.length,0);
});

test('same-job comparison refresh cannot be overwritten by an older result',async()=>{
  let resolveOlder!:(value:unknown)=>void,calls=0;
  const snapshot=(count:number)=>({version:count,roundStatus:'open',history:[],quotes:[],comparison:{count,average:null},thresholdCents:10000,selection:null,clock:null});
  const f=await forms({role:'cm',comparison:async()=>{calls++;return calls===1?new Promise(resolve=>{resolveOlder=resolve;}):snapshot(2);}});
  await f.event('qf:job',{job:{id:'job',stage:'Requesting for quotes'}});await f.event('qf:job',{job:{id:'job',stage:'Requesting for quotes'}});resolveOlder(snapshot(1));await flush();
  const text=f.main.textContent;assert.ok(text.includes('2 current selectable offers.'));assert.equal(text.includes('1 current selectable offers.'),false);
});

test('comparison selection errors remain visible beside their action while the contractor quote panel is hidden',async()=>{
  const f=await forms({role:'cm',submitError:'Current terms changed. Review again.',comparison:async()=>({version:8,roundStatus:'open',history:[],quotes:[{...quote,quoteId:'quote',quoteVersion:3,name:'Contractor A',amountCents:12530,selectable:true,cautions:[],reputation:{pure:null,adjusted:null,quoteFixCount:0,externalCount:0}}],comparison:{count:1,average:null},thresholdCents:20000,settingsVersion:2,rfqRevision:2,selection:null,clock:null})});
  await f.event('qf:job',{job:{id:'job',stage:'Requesting for quotes'}});f.field('Written selection rationale').value='Reviewed the exact scope';f.field('I acknowledge: limited comparison').checked=true;f.field('I confirm selection of quote version 3 at SGD 125.30.').checked=true;await f.click('Select this exact quote');
  assert.equal(f.requests[0]!.version,8);const feedback=f.all().find(n=>n.attributes.get('role')==='status'&&n.textContent==='Current terms changed. Review again.'&&n.parentElement?.className==='panel quote-card');assert.ok(feedback,'Selection error must be visible in its quote card');
});

const procurementAck='I understand that approval thresholds apply to future selection decisions, identity visibility applies to permitted current views, and recorded quotations, decisions and work authority remain preserved.';
test('MCST procurement onboarding uses its estate without a job and cannot edit Admin-only fields',async()=>{
  const f=await forms({role:'mcst'});assert.ok(f.reads.includes('estates/estate/procurement-settings'));assert.equal(f.all().some(n=>n.tag==='label'&&n.textContent.startsWith('Estate approval threshold — SGD')),false);assert.equal(f.all().some(n=>n.tag==='label'&&n.textContent.startsWith('Private estate address')),false);
  const save=f.button('Save estate procurement settings');assert.equal(save.disabled,true);assert.equal(f.field(procurementAck).checked,false);await f.click('Save estate procurement settings');assert.equal(f.requests.length,0);
  f.field('CM contractor identity visibility for this estate').value='yes';f.field('Reason for procurement setting changes').value='MCST approval of visible identities';const ack=f.field(procurementAck);ack.checked=true;await ack.fire('change');await f.click('Save estate procurement settings');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.route,'estates/estate/procurement-settings');assert.equal(f.requests[0]!.version,5);assert.equal(f.requests[0]!.body.identitiesVisible,true);assert.equal('thresholdSgd' in f.requests[0]!.body,false);assert.equal('address' in f.requests[0]!.body,false);assert.equal(f.field(procurementAck).checked,false);
});

test('Admin chooses an estate and explicitly confirms exact-cent first procurement configuration',async()=>{
  const f=await forms({role:'admin'}),estate=f.field('Estate for procurement settings');estate.value='estate';estate.onchange!();await flush();assert.ok(f.main.textContent.includes('Not configured'));const ack=f.field(procurementAck);ack.checked=true;await ack.fire('change');assert.equal(f.button('Save estate procurement settings').disabled,false);
  const threshold=f.field('Estate approval threshold — SGD');threshold.value='125.30';await threshold.fire('input');assert.equal(ack.checked,false);assert.equal(f.button('Save estate procurement settings').disabled,true);f.field('Private estate address').value='Updated private estate address';f.field('Reason for procurement setting changes').value='Initial explicit setup';ack.checked=true;await ack.fire('change');await f.click('Save estate procurement settings');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.body.thresholdSgd,'125.30');assert.equal(f.requests[0]!.body.address,'Updated private estate address');assert.equal(f.requests[0]!.version,5);assert.equal(f.field(procurementAck).checked,false);
});

test('passive procurement-settings refresh preserves unsent fields and requires a fresh acknowledgment',async()=>{
  const f=await forms({role:'mcst'}),visibility=f.field('CM contractor identity visibility for this estate'),reason=f.field('Reason for procurement setting changes');visibility.value='yes';visibility.dataset.qfDirty='true';reason.value='Unsent MCST reasoning';reason.dataset.qfDirty='true';const ack=f.field(procurementAck);ack.checked=true;await ack.fire('change');await f.event('qf:refresh',{});
  assert.equal(f.field('CM contractor identity visibility for this estate').value,'yes');assert.equal(f.field('Reason for procurement setting changes').value,'Unsent MCST reasoning');assert.equal(f.field(procurementAck).checked,false);assert.equal(f.button('Save estate procurement settings').disabled,true);assert.equal(f.requests.length,0);
});

test('passive quote refresh preserves unsent amounts and conditional text without navigating or carrying confirmations',async()=>{
  const f=await forms();await f.open();f.fill();for(const [name,value] of [['Final SGD amount payable — includes all GST charged','150.88'],['Estimated work duration','unknown'],['Other duration / unable-to-estimate reason','Unsent concealed-access explanation']]){const input=f.field(name!);input.value=value!;input.dataset.qfDirty='true';}await f.event('qf:refresh',{});
  assert.equal(f.field('Final SGD amount payable — includes all GST charged').value,'150.88');assert.equal(f.field('Estimated work duration').value,'unknown');assert.equal(f.field('Other duration / unable-to-estimate reason').value,'Unsent concealed-access explanation');assert.equal(f.field('Other duration / unable-to-estimate reason').parentElement!.hidden,false);assert.equal(f.field('My quote remains held after selection.').checked,false);assert.equal(f.field('I confirm this expiry date or date/time.').checked,false);assert.deepEqual(f.navigations,['quotes']);assert.equal(f.requests.length,0);
});

test('same-job comparison refresh preserves the rationale for its exact quote and resets consequential acknowledgments',async()=>{
  const f=await forms({role:'cm',comparison:async()=>({version:8,roundStatus:'open',history:[],quotes:[{...quote,quoteId:'quote',quoteVersion:3,name:'Contractor A',amountCents:12530,selectable:true,cautions:[],reputation:{pure:null,adjusted:null,quoteFixCount:0,externalCount:0}}],comparison:{count:1,average:null},thresholdCents:20000,settingsVersion:2,rfqRevision:2,selection:null,clock:null})});await f.event('qf:job',{job:{id:'job',stage:'Requesting for quotes'}});const rationale=f.field('Written selection rationale');rationale.value='Unsent evidence-specific choice';rationale.dataset.qfDirty='true';f.field('I acknowledge: limited comparison').checked=true;f.field('I confirm selection of quote version 3 at SGD 125.30.').checked=true;await f.event('qf:job',{job:{id:'job',stage:'Requesting for quotes'}});
  assert.equal(f.field('Written selection rationale').value,'Unsent evidence-specific choice');assert.equal(f.field('I acknowledge: limited comparison').checked,false);assert.equal(f.field('I confirm selection of quote version 3 at SGD 125.30.').checked,false);assert.equal(f.requests.length,0);assert.equal(f.navigations.length,0);
});
