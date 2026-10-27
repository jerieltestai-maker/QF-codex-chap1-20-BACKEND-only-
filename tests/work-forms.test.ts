import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
type Data=Record<string,any>;
class Element {
  children:Element[]=[];parentElement:Element|null=null;dataset:Data={};listeners=new Map<string,Array<()=>unknown>>();
  type='';value='';checked=false;hidden=false;open=false;disabled=false;maxLength=0;min='';max='';accept='';href='';files:unknown[]=[];onclick?:()=>Promise<void>;
  constructor(readonly tag:string,private text='') {}
  get textContent():string{return this.text+this.children.map(n=>n.textContent).join('');}
  set textContent(value:string){this.text=value;this.children=[];}
  append(...items:Element[]){for(const item of items){item.parentElement=this;this.children.push(item);}}
  replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
  setAttribute(){}
  addEventListener(name:string,callback:()=>unknown){const list=this.listeners.get(name)||[];list.push(callback);this.listeners.set(name,list);}
  async fire(name:string){for(const cb of this.listeners.get(name)||[])await cb();}
  closest(tag:string):Element|null {return this.tag===tag?this:this.parentElement?.closest(tag)||null;}
}
const source=await readFile('apps/web/payments.js','utf8')+'\n'+await readFile('apps/web/work.js','utf8');
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);},values};}
const flush=async()=>{for(let i=0;i<4;i++)await new Promise<void>(r=>setImmediate(r));};
async function forms(role:string,finance:Data,shared=storage(),user='fictional-user') {
  const main=new Element('main'),events=new Map<string,Array<(e:Data)=>unknown>>(),requests:Data[]=[],attachments=new Map<string,Data>();
  const doc={activeElement:null as Element|null,querySelector:()=>main,createElement:(tag:string)=>new Element(tag),createTextNode:(s:string)=>new Element('text',s),addEventListener:(name:string,cb:(e:Data)=>unknown)=>{const list=events.get(name)||[];list.push(cb);events.set(name,list);}};
  const context={user:{id:user},context:{id:role+'-membership',role}},version=finance.version||10;
  const work={jobId:'job',version,contractor:{name:'Fictional Contractor'},state:{status:'active',stage:finance.stage||'Carrying out work',started_at:'2026-11-02T04:00:00Z',completed_at:finance.completion?.completed_at||null,scope:'Agreed valve repair',amount_cents:'10000',completion_target_at:'2026-11-03T04:00:00Z'},variations:[],events:[],terms:[],variationVersions:[],decisions:[],notices:[],waitingOn:{role:'contractor',action:'complete work'}};
  const details={jobId:'job',version,completion:null,rounds:[],invoices:[],confirmations:[],transfers:[],balanceIssues:[],events:[],balances:{payableCents:'10000',sentCents:'0',receivedCents:'0',disputedCents:'0',unsentCents:'10000',outstandingCents:'10000'},...finance};
  const qf={context,api:async(path:string)=>path==='contractor/jobs'?[{jobId:'job',rfq:{publicDescription:'Fictional selected job'},selection:{status:'authorised'}}]:path.endsWith('/completion')?structuredClone(details):structuredClone(work),submit:async(path:string,body:unknown,v:number)=>{requests.push({path,body,version:v});return {version:v+1};},loadJob:async()=>{},refreshLists:async()=>{}};
  const upload={get:async(_id:string,purpose:string,slot:string)=>attachments.get(slot)||(purpose==='evidence'?undefined:{state:'ready',objects:[{id:purpose+'-ready',variant:'original'}]}),resume:async(_id:string,purpose:string,slot:string)=>upload.get(_id,purpose,slot),queue:async(_id:string,purpose:string,slot:string)=>{const row={state:'ready',objects:[{id:purpose+'-selected',variant:'original'}]};attachments.set(slot,row);return row;},remove:async(_id:string,_p:string,slot:string)=>{attachments.delete(slot);},remember:async()=>{}};
  const window={qfWorkspace:qf,qfWorkUploads:{create:()=>upload},addEventListener:()=>{}};
  class Option extends Element{constructor(text:string,value:string){super('option',text);this.value=value;}}
  runInNewContext(source,{window,document:doc,navigator:{onLine:true},localStorage:shared,sessionStorage:storage(),Option,crypto:{},console});
  async function event(name:string,data:Data={}){for(const cb of events.get(name)||[])await cb(data);await flush();}
  const walk=(root:Element):Element[]=>[root,...root.children.flatMap(walk)];
  const all=()=>walk(main),button=(name:string)=>{const b=all().find(n=>n.tag==='button'&&n.textContent===name);assert.ok(b,'Missing button '+name);return b;};
  async function click(name:string){const b=button(name);doc.activeElement=b;await b.onclick!();await flush();}
  const field=(label:string)=>{const wrapper=all().find(n=>n.tag==='label'&&n.textContent===label);assert.ok(wrapper,'Missing field '+label);return wrapper.children.find(n=>['input','textarea','select'].includes(n.tag))!;};
  async function value(label:string,value:string){const input=field(label);input.value=value;doc.activeElement=input;await input.fire('input');await flush();}
  async function check(label:string){const input=field(label);input.checked=true;await input.fire('input');}
  async function slide(label:string){const input=field(label+' — slide to confirm');input.value='100';doc.activeElement=input;await input.fire('change');await flush();}
  await event('qf:context');if(role==='contractor')await click('Fictional selected job');else await event('qf:job',{detail:{job:{id:'job'}}});
  return {all,field,click,value,check,slide,requests,storage:shared,context,event,main};
}
test('CH11-T02: actual completion form has optional evidence; upload readiness alone sends nothing and unchecked declaration cannot slide-submit',async()=>{
  const f=await forms('contractor',{});
  assert.equal(f.requests.length,0);await f.value('Actual physical completion — Singapore time','2026-11-02T12:00');
  await f.slide('Submit completion and invoice together');assert.equal(f.requests.length,0);
  assert.ok(f.all().some(n=>n.tag==='summary'&&n.textContent==='Optional completion evidence'));
  const photo=f.field('Completion evidence');photo.files=[{}];await photo.fire('change');await flush();
  await f.check('All work is finished and the invoice is attached. This completion declaration cannot be undone. The CM will inspect the work.');
  await f.slide('Submit completion and invoice together');
  const request=f.requests.find(r=>r.path.endsWith('/completion/submit'));assert.ok(request);assert.deepEqual(Array.from(request.body.evidenceIds),['evidence-selected']);assert.equal(request.body.confirmed,true);
});
test('CH11-T03/T04: second-inspection heading, unchecked positive acceptance guard and independent unsatisfactory route are actually wired',async()=>{
  const f=await forms('cm',{completion:{round:2,scope:'Agreed valve repair',invoice_version:2,amount_cents:'10000',accepted_round:null,confirmed_version:null},rounds:[{round:1,outcome:'unsatisfactory'},{round:2,outcome:null}]});
  assert.ok(f.all().some(n=>n.tag==='summary'&&n.textContent==='Inspection [2nd]'));
  await f.slide('Approve Works');assert.equal(f.requests.length,0);
  for(const label of ['I reviewed the agreed scope and approved variations.','I reviewed completion and visible issues.','I reviewed available evidence (photos are optional).','I reviewed the invoice and charges.'])await f.check(label);
  await f.value('Specific incomplete / defective scope and findings','The valve still leaks');await f.click('Unsatisfactory work');
  const request=f.requests[0];assert.ok(request);assert.equal(request.body.outcome,'unsatisfactory');assert.equal(request.body.satisfactory,false);assert.equal(request.body.round,2);
});
test('O37: multiple form fields survive reload, prior-version drafts demand review, confirmation resets, and another account sees none',async()=>{
  const initial=await forms('contractor',{});
  await initial.value('Final GST-inclusive invoice amount SGD','90.00');await initial.value('Invoice details / explanation','Fictional draft observation');
  await initial.check('All work is finished and the invoice is attached. This completion declaration cannot be undone. The CM will inspect the work.');
  const restored=await forms('contractor',{version:11},initial.storage);
  assert.equal(restored.field('Final GST-inclusive invoice amount SGD').value,'90.00');assert.equal(restored.field('Invoice details / explanation').value,'Fictional draft observation');
  assert.equal(restored.field('All work is finished and the invoice is attached. This completion declaration cannot be undone. The CM will inspect the work.').checked,false);
  assert.ok(restored.main.textContent.includes('Saved draft from an earlier job version'));
  const other=await forms('contractor',{},initial.storage,'other-user');assert.equal(other.field('Invoice details / explanation').value,'');assert.equal(other.field('Final GST-inclusive invoice amount SGD').value,'100.00');
});
test('CH12-T12: actual assumed-popup controls are present; Understood calls acknowledgment, never actual receipt',async()=>{
  const f=await forms('contractor',{completion:{round:1,scope:'Agreed valve repair',invoice_version:1,confirmed_version:1,accepted_round:1,amount_cents:'10000'},transfers:[{id:'transfer',amount_cents:'10000',status:'assumed',showAssumedPopup:true,receipt_due_at:'2026-11-09T04:00:00Z',receipt_date:'2026-11-09T04:00:00Z',receipt_precision:'instant',rationale:''}],balances:{payableCents:'10000',sentCents:'10000',receivedCents:'10000',disputedCents:'0',unsentCents:'0',outstandingCents:'0'}});
  assert.ok(f.main.textContent.includes('Payment recorded automatically.'));assert.ok(f.main.textContent.includes('Assumed received'));
  await f.click('Understood');const request=f.requests[0];assert.ok(request);assert.equal(request.path,'workspaces/job/payments/understood');assert.equal(request.body.transferId,'transfer');assert.ok(!f.requests.some(r=>r.path.endsWith('/receipt')));
});
test('CH12-T11: payment countdown names the responsible role; no-transfer contractor balance issue is a real control',async()=>{
  const finance={completion:{round:1,scope:'Agreed valve repair',invoice_version:1,confirmed_version:1,accepted_round:1,amount_cents:'10000'},followUp:{nextDueAt:'2026-11-05T15:59:00Z'}};
  const f=await forms('mcst',finance);const due=f.all().find(n=>n.dataset.due);assert.ok(due);assert.equal(due.dataset.followupPrefix,'QuoteFix will follow up on this payment in');
  const contractor=await forms('contractor',{...finance,followUp:null});await contractor.value('Unpaid balance issue explanation','Nothing has been sent yet');await contractor.click('Payment Issue');
  const request=contractor.requests[0];assert.ok(request);assert.equal(request.path,'workspaces/job/payments/issue');assert.equal(request.body.transferId,undefined);assert.equal(request.body.description,'Nothing has been sent yet');
});
