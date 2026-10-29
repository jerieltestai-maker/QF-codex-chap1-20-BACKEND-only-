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
  append(...items:Element[]){for(const item of items){if(item.parentElement)item.parentElement.children=item.parentElement.children.filter(child=>child!==item);item.parentElement=this;this.children.push(item);}}
  replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
  setAttribute(){}
  addEventListener(name:string,callback:()=>unknown){const list=this.listeners.get(name)||[];list.push(callback);this.listeners.set(name,list);}
  async fire(name:string){for(const cb of this.listeners.get(name)||[])await cb();}
  closest(tag:string):Element|null {return this.tag===tag?this:this.parentElement?.closest(tag)||null;}
}
const source=await readFile('apps/web/payments.js','utf8')+'\n'+await readFile('apps/web/work.js','utf8');
function storage(){const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);},values};}
const flush=async()=>{for(let i=0;i<4;i++)await new Promise<void>(r=>setImmediate(r));};
async function forms(role:string,finance:Data,shared=storage(),user='fictional-user',workOverrides:Data={},flowEnabled=false) {
  const main=new Element('main'),events=new Map<string,Array<(e:Data)=>unknown>>(),requests:Data[]=[],attachments=new Map<string,Data>();
  const doc={activeElement:null as Element|null,querySelector:()=>main,createElement:(tag:string)=>new Element(tag),createTextNode:(s:string)=>new Element('text',s),addEventListener:(name:string,cb:(e:Data)=>unknown)=>{const list=events.get(name)||[];list.push(cb);events.set(name,list);}};
  const context={user:{id:user},context:{id:role+'-membership',role}},version=finance.version||10;
  const work={jobId:'job',version,contractor:{name:'Fictional Contractor'},state:{status:'active',stage:finance.stage||'Carrying out work',started_at:'2026-11-02T04:00:00Z',completed_at:finance.completion?.completed_at||null,scope:'Agreed valve repair',amount_cents:'10000',completion_target_at:'2026-11-03T04:00:00Z'},variations:[],events:[],terms:[],variationVersions:[],decisions:[],notices:[],waitingOn:{role:'contractor',action:'complete work'},...workOverrides};
  const details={jobId:'job',version,completion:null,rounds:[],invoices:[],confirmations:[],transfers:[],balanceIssues:[],events:[],balances:{payableCents:'10000',sentCents:'0',receivedCents:'0',disputedCents:'0',unsentCents:'10000',outstandingCents:'10000'},...finance};
  const qf={context,api:async(path:string)=>path==='contractor/jobs'?[{jobId:'job',rfq:{publicDescription:'Fictional selected job'},selection:{status:'authorised'}}]:path.endsWith('/completion')?structuredClone(details):structuredClone(work),submit:async(path:string,body:unknown,v:number)=>{requests.push({path,body,version:v});return {version:v+1};},loadJob:async()=>{},refreshLists:async()=>{}};
  const upload={get:async(_id:string,purpose:string,slot:string)=>attachments.get(slot)||(purpose==='evidence'?undefined:{state:'ready',objects:[{id:purpose+'-ready',variant:'original'}]}),resume:async(_id:string,purpose:string,slot:string)=>upload.get(_id,purpose,slot),queue:async(_id:string,purpose:string,slot:string)=>{const row={state:'ready',objects:[{id:purpose+'-selected',variant:'original'}]};attachments.set(slot,row);return row;},remove:async(_id:string,_p:string,slot:string)=>{attachments.delete(slot);},remember:async()=>{}};
  const flowCalls:Array<{kind:string;parent:Element;config:Data}>=[];
  const flow={wizard:(parent:Element,config:Data)=>{flowCalls.push({kind:'wizard',parent,config});},tabs:(parent:Element,config:Data)=>{flowCalls.push({kind:'tabs',parent,config});for(const item of config.items)parent.append(item.element);}};
  const window={qfWorkspace:qf,qfWorkUploads:{create:()=>upload},addEventListener:()=>{},...(flowEnabled?{qfFlow:flow}:{})};
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
  return {all,field,click,value,check,slide,requests,storage:shared,context,event,main,flowCalls};
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
test('Exact invoice confirmation stays disabled until its own unchecked acknowledgment is made',async()=>{
  const f=await forms('mcst',{completion:{round:1,scope:'Agreed valve repair',invoice_version:3,confirmed_version:null,accepted_round:1,amount_cents:'10000'},rounds:[{round:1,outcome:'accepted'}]});
  const control=f.all().find(n=>n.tag==='button'&&n.textContent==='Confirm invoice')!;assert.ok(control);assert.equal(control.disabled,true);
  await f.click('Confirm invoice');assert.equal(f.requests.length,0);
  await f.check('I confirm this exact reconciled invoice version and amount.');assert.equal(control.disabled,false);await f.click('Confirm invoice');
  assert.equal(f.requests.length,1);const request=f.requests[0];assert.ok(request);assert.equal(request.path,'workspaces/job/payments/confirm-invoice');assert.equal(request.body.invoiceVersion,3);assert.equal(request.body.amountSgd,'100.00');
  assert.equal(f.field('I confirm this exact reconciled invoice version and amount.').checked,false);
});
test('Partial Payment Sent requires rationale before either final gesture and preserves an optional bank reference',async()=>{
  const f=await forms('mcst',{serverTime:'2026-11-20T04:00:00Z',completion:{round:1,scope:'Agreed valve repair',invoice_version:1,confirmed_version:1,accepted_round:1,amount_cents:'10000'}});
  await f.value('Transfer amount SGD','40.00');await f.value('Actual bank transfer date','2026-11-19');await f.check('This bank transfer has been completed.');
  await f.slide('Payment Sent');assert.equal(f.requests.length,0);await f.click('Confirm — Payment Sent');assert.equal(f.requests.length,0);
  await f.value('Partial-payment rationale (required if balance remains)','Balance follows the agreed paperwork check.');await f.click('Confirm — Payment Sent');
  assert.equal(f.requests.length,1);const request=f.requests[0];assert.ok(request);assert.equal(request.body.amountSgd,'40.00');assert.equal(request.body.reference,'');assert.equal(request.body.confirmed,true);
});
test('Keyboard confirmation of completion enforces the same declaration and exact-money guards as its slider',async()=>{
  const f=await forms('contractor',{});await f.value('Actual physical completion — Singapore time','2026-11-02T12:00');
  await f.click('Confirm — Submit completion and invoice together');assert.equal(f.requests.length,0);
  await f.check('All work is finished and the invoice is attached. This completion declaration cannot be undone. The CM will inspect the work.');
  await f.value('Final GST-inclusive invoice amount SGD','1e2');await f.click('Confirm — Submit completion and invoice together');assert.equal(f.requests.length,0);
  await f.value('Final GST-inclusive invoice amount SGD','100.00');await f.click('Confirm — Submit completion and invoice together');
  assert.equal(f.requests.length,1);const request=f.requests[0];assert.ok(request);assert.equal(request.body.confirmed,true);assert.equal(request.body.invoiceFileId,'invoice-ready');
});
test('A routine same-context refresh preserves the current work form; authoritative history renders without JSON',async()=>{
  const f=await forms('contractor',{});const original=f.field('Invoice details / explanation');await f.value('Invoice details / explanation','Unsaved in-progress context');
  await f.event('qf:context');assert.equal(f.field('Invoice details / explanation'),original);assert.equal(original.value,'Unsaved in-progress context');
  assert.equal(f.all().some(n=>n.tag==='pre'),false);assert.ok(f.all().some(n=>n.tag==='dl'));assert.ok(f.main.textContent.includes('No dated events recorded.'));
});
test('A pending exact-version variation removes completion submit until its terms have been resolved',async()=>{
  const pending={id:'variation',kind:'completion_schedule',current_version:1,state:'terms',approver_role:'cm',proposal:{reason:'Access coordination',timing:'changed',targetAt:'2026-11-22T04:00:00Z',timingReason:'Keys pending',canContinueOriginal:true,canContinueApproved:true},canWithdraw:false,canRevise:false};
  const f=await forms('contractor',{},storage(),'fictional-user',{variations:[pending]});
  assert.equal(f.all().some(n=>n.tag==='summary'&&n.textContent==='Work is complete'),false);assert.ok(f.main.textContent.includes('Resolve the pending variation before declaring completion'));
  await f.click('Confirm change of terms');assert.equal(f.requests.length,0);await f.check('I reviewed this exact proposal version.');await f.click('Confirm change of terms');
  assert.equal(f.requests.length,1);const request=f.requests[0];assert.ok(request);assert.equal(request.body.proposalVersion,1);
});


test('Work forms compose chronological steps and keep completion declarations only at the final action',async()=>{
  const f=await forms('contractor',{},storage(),'fictional-user',{},true);
  const wizard=f.flowCalls.find(call=>call.config.id.endsWith(':completion'));
  assert.ok(wizard);assert.deepEqual(Array.from(wizard.config.steps,(step:Data)=>step.title),['Invoice','Completion','Confirm']);
  const allFields=wizard.config.steps.flatMap((step:Data)=>Array.from(step.fields));
  assert.equal(new Set(allFields).size,allFields.length,'A control cannot appear in multiple steps');
  assert.ok(wizard.config.steps[0].fields.some((field:Element)=>field.textContent==='Invoice'));
  assert.ok(wizard.config.steps[1].fields.some((field:Element)=>field.textContent.includes('Actual physical completion')));
  assert.ok(wizard.config.steps[2].fields.some((field:Element)=>field.textContent.includes('This completion declaration cannot be undone')));
  assert.ok(wizard.config.steps[2].fields.some((field:Element)=>field.textContent==='Confirm — Submit completion and invoice together'));
  const tabs=f.flowCalls.find(call=>call.kind==='tabs');assert.ok(tabs);
  assert.deepEqual(Array.from(tabs.config.items,(item:Data)=>item.title),['Work','Inspection','History']);assert.equal(tabs.config.initial,0);
  assert.equal(f.requests.length,0);
});

test('Inspection review precedes outcome while Payment Sent separates completed-transfer facts, proof and consent',async()=>{
  const c={round:1,scope:'Agreed valve repair',invoice_version:1,confirmed_version:null,accepted_round:null,amount_cents:'10000'};
  const inspect=await forms('cm',{completion:c,rounds:[{round:1,outcome:null}]},storage(),'fictional-user',{},true);
  const inspection=inspect.flowCalls.find(call=>call.config.id.endsWith(':inspection-1'));assert.ok(inspection);
  assert.deepEqual(Array.from(inspection.config.steps,(step:Data)=>step.title),['Review','Outcome']);
  assert.equal(inspection.config.steps[0].fields.length,4);
  assert.ok(inspection.config.steps[1].fields.some((field:Element)=>field.textContent==='Unsatisfactory work'));
  assert.equal(inspect.flowCalls.find(call=>call.kind==='tabs')?.config.initial,1);
  const payment=await forms('mcst',{completion:{...c,confirmed_version:1,accepted_round:1}},storage(),'fictional-user',{},true);
  const transfer=payment.flowCalls.find(call=>call.config.id.endsWith(':transfer'));assert.ok(transfer);
  assert.deepEqual(Array.from(transfer.config.steps,(step:Data)=>step.title),['Transfer','Proof','Confirm']);
  assert.ok(transfer.config.steps[0].fields.some((field:Element)=>field.textContent==='Transfer amount SGD'));
  assert.ok(transfer.config.steps[1].fields.some((field:Element)=>field.textContent==='Completed-transfer proof'));
  assert.ok(transfer.config.steps[2].fields.some((field:Element)=>field.textContent==='This bank transfer has been completed.'));
  assert.ok(transfer.config.steps[2].fields.some((field:Element)=>field.textContent==='Confirm — Payment Sent'));
  const fields=transfer.config.steps.flatMap((step:Data)=>Array.from(step.fields));assert.equal(new Set(fields).size,fields.length);
  assert.equal(payment.flowCalls.find(call=>call.kind==='tabs')?.config.initial,2);
  await payment.value('Transfer amount SGD','40.00');await payment.value('Actual bank transfer date','2026-11-19');
  assert.ok(transfer.config.steps[2].fields[0].textContent.includes('SGD 40.00'));
  assert.equal(payment.requests.length,0);
});
