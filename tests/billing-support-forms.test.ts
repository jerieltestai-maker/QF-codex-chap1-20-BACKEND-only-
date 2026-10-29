import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
type Data=Record<string,any>;
class Element {
  parentElement:Element|null=null;children:Element[]=[];type='';value='';checked=false;hidden=false;disabled=false;dataset:Data={};files:File[]=[];onclick?:()=>Promise<void>;onchange?:()=>Promise<void>;
  constructor(readonly tag:string,private text=''){}
  get textContent():string{return this.text+this.children.map(c=>c.textContent).join('');}
  set textContent(v:string){this.text=v;this.children=[];}
  append(...nodes:Element[]){for(const node of nodes){node.parentElement=this;this.children.push(node);if(this.tag==='select'&&this.children.length===1)this.value=node.value;}}
  replaceChildren(...nodes:Element[]){this.children=[];this.append(...nodes);}
  attributes:Record<string,string>={};
  setAttribute(name:string,value:string){this.attributes[name]=value;}
  listeners=new Map<string,()=>Promise<void>>();
  addEventListener(name:string,fn:()=>Promise<void>){this.listeners.set(name,fn);}
}
const source=await readFile('apps/web/payments.js','utf8')+'\n'+await readFile('apps/web/billing-support.js','utf8');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise<void>(r=>setImmediate(r));};
async function forms(role:string,cancelled=false,finance?:Data,caseDetail?:Data) {
  const main=new Element('main'),events=new Map<string,(e:Data)=>unknown>(),requests:Data[]=[],reads:string[]=[];
  const statement={version:3,outstandingCents:'800',refundDueCents:'0',liabilities:[{id:'platform-debt',component:'platform',amount_cents:'400',outstanding_cents:'400',due_at:'2026-11-05T15:59:00Z'},{id:'lead-debt',component:'lead',amount_cents:'400',outstanding_cents:'400',due_at:'2026-11-05T15:59:00Z'}],credits:[],reports:role==='admin'?[{id:'report',amount_cents:'800',context:'Payment reported'}]:[],refunds:[]};
  const declaration='I accept the cancellation and do not have any additional claims.';
  const context={user:{id:'user'},context:{id:role+'-context',role}},qf={context,api:async(path:string)=>{
    reads.push(path);if(path==='contractors')return [{id:'org',name:'Fictional company'}];if(path==='contractor/jobs')return [];
    if(path.endsWith('/billing'))return structuredClone(statement);
    if(path.endsWith('/cancellation'))return {version:7,stage:cancelled?'Cancelled':'Carrying out work',warning:'Work stops immediately; confirmed debts survive.',declaration,cancellations:cancelled?[{id:'cancel',reason:'Factual stop',response:null,claim_due_at:'2026-11-09T04:00:00Z',restored_at:null}]:[]};
    if(path==='support/legacy'&&caseDetail)return structuredClone(caseDetail);
    if(path.endsWith('/cases'))return {cases:caseDetail?[{id:'legacy',description:'Legacy concern'}]:[]};if(path.endsWith('/support-subjects'))return [{kind:'user',id:'subject',name:'Council account',role:'mcst'}];
    if(path.endsWith('/completion'))return finance??{version:7,balances:{unsentCents:'0'}};throw new Error('Unexpected read '+path);
  },submit:async(path:string,body:Data,version:number)=>{requests.push({path,body,version});return {};},refreshLists:async()=>{}};
  const doc={querySelector:()=>main,createElement:(tag:string)=>new Element(tag),createTextNode:(text:string)=>new Element('text',text),addEventListener:(name:string,fn:(e:Data)=>unknown)=>events.set(name,fn)};
  const window={qfWorkspace:qf,addEventListener:()=>{},qfWorkUploads:{create:()=>({queue:async()=>({}),resume:async()=>({state:'ready',objects:[{id:'ready-file',variant:'original'}]})})}};
  runInNewContext(source,{window,document:doc,Option:class extends Element{constructor(text:string,value:string){super('option',text);this.value=value;}},navigator:{onLine:true},console,Date,BigInt,Map,Set});
  const all=():Element[]=>{const visit=(e:Element):Element[]=>[e,...e.children.flatMap(visit)];return visit(main);};
  const field=(label:string)=>{const parent=all().find(e=>e.tag==='label'&&e.textContent===label);assert.ok(parent,'Missing '+label);return parent.children.find(e=>['input','textarea','select'].includes(e.tag))!;};
  const click=async(label:string)=>{const e=all().find(e=>e.tag==='button'&&e.textContent===label);assert.ok(e,'Missing '+label);await e.onclick!();await flush();};
  const event=async(name:string,detail:Data={})=>{await events.get(name)?.({detail});await flush();assert.equal(all().filter(e=>e.attributes.role==='status').some(e=>/is not defined|is not a function|Cannot (?:read|set)/.test(e.textContent)),false,'Rendering errors caught by the UI must fail the harness');};
  const slide=async(label:string)=>{const input=field(label+' — slide to confirm');input.value='100';await input.listeners.get('change')!();await flush();};
  await event('qf:context');await event('qf:job',{job:{id:'job'}});return {all,field,click,event,slide,requests,reads,declaration,context};
}

const settlementFinance=(extra:Data={})=>({version:7,completion:null,financialConfirmation:{version:1,amount_cents:'2500'},transfers:[],balanceIssues:[],balances:{payableCents:'2500',sentCents:'0',receivedCents:'0',disputedCents:'0',unsentCents:'2500',outstandingCents:'2500'},...extra});

test('Support renders without caught errors and reveals confidentiality guidance only for confidential reports',async()=>{
  const f=await forms('mcst');
  const notice=f.all().find(e=>e.tag==='p'&&e.textContent==='Confidential reports are hidden from the person or organisation reported.');
  assert.ok(notice);assert.equal(notice.hidden,true);
  const confidential=f.field('Confidential conduct report');confidential.checked=true;await confidential.listeners.get('change')!();
  assert.equal(notice.hidden,false);assert.equal(f.all().find(e=>e.tag==='select'&&e.parentElement?.textContent.startsWith('Reported person or organisation'))?.disabled,false);
  confidential.checked=false;await confidential.listeners.get('change')!();assert.equal(notice.hidden,true);
  const category=f.all().find(e=>e.tag==='select'&&e.parentElement?.textContent.startsWith('Concern category'))!;category.value='confidential_conduct';await category.listeners.get('change')!();assert.equal(notice.hidden,false);
  assert.equal(f.requests.length,0,'Changing privacy never submits a report');
});

test('Cancelled settlement without an invoice exposes the Contractor balance issue and deliberately confirmed actual receipt',async()=>{
  let f=await forms('contractor',true,settlementFinance());
  f.field('Unpaid balance issue explanation').value='Confirmed cancellation costs are still unpaid';await f.click('Payment Issue');
  assert.equal(f.requests[0]!.path,'workspaces/job/payments/issue');assert.equal(f.requests[0]!.version,7);
  f=await forms('contractor',true,settlementFinance({balances:{payableCents:'2500',sentCents:'2500',receivedCents:'0',disputedCents:'0',unsentCents:'0',outstandingCents:'2500'},transfers:[{id:'transfer',amount_cents:'2500',status:'pending',transfer_date:'2026-11-02',receipt_due_at:'2026-11-09T04:00:00Z'}]}));
  f.field('Actual receipt date').value='2026-11-02';await f.click('Received payment');assert.equal(f.requests.length,0);
  // Both the deliberate checkbox and a valid observed date are required before the client submits.
  f.field('I confirm actual receipt of this exact transfer.').checked=true;await f.field('I confirm actual receipt of this exact transfer.').listeners.get('change')!();await f.click('Received payment');
  assert.equal(f.requests.at(-1)!.path,'workspaces/job/payments/receipt');assert.equal(f.requests.at(-1)!.body.confirmed,true);assert.equal(f.requests.at(-1)!.body.amountSgd,'25.00');
});

test('Cancelled settlement Payment Sent shares the invoice payment guards, proof attachment and exact financial version',async()=>{
  const f=await forms('mcst',true,settlementFinance());
  f.field('Transfer amount SGD').value='25.00';f.field('Actual bank transfer date').value='2026-11-02';await f.slide('Payment Sent');assert.equal(f.requests.length,0);
  f.field('This bank transfer has been completed.').checked=true;await f.slide('Payment Sent');assert.equal(f.requests.length,0,'No ready proof');
  await f.click('Attach / resume private file');assert.equal(f.requests.length,0);await f.slide('Payment Sent');
  assert.equal(f.requests[0]!.path,'workspaces/job/payments/transfer');assert.equal(f.requests[0]!.body.proofId,'ready-file');assert.equal(f.requests[0]!.body.invoiceVersion,1);assert.equal(f.requests[0]!.body.financialVersion,1);assert.equal(f.requests[0]!.version,7);
});
test('Payment Sent alternative confirmation preserves the same completed-transfer, evidence and version guards as the slider',async()=>{
  const f=await forms('mcst',true,settlementFinance());f.field('Transfer amount SGD').value='25.00';f.field('Actual bank transfer date').value='2026-11-02';await f.click('Confirm — Payment Sent');assert.equal(f.requests.length,0);
  f.field('This bank transfer has been completed.').checked=true;await f.click('Confirm — Payment Sent');assert.equal(f.requests.length,0);await f.click('Attach / resume private file');await f.click('Confirm — Payment Sent');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.path,'workspaces/job/payments/transfer');assert.equal(f.requests[0]!.body.proofId,'ready-file');assert.equal(f.requests[0]!.body.confirmed,true);assert.equal(f.requests[0]!.version,7);
});
test('Chapter 14 web cancellation and Okay each require their own unchecked explicit confirmation',async()=>{
  let f=await forms('cm');f.field('Cancellation reason').value='Recorded reason';await f.click('Confirm cancellation — stop ordinary work');assert.equal(f.requests.length,0);
  f.field('Work stops immediately; confirmed debts survive.').checked=true;await f.click('Confirm cancellation — stop ordinary work');assert.equal(f.requests[0]!.path,'workspaces/job/cancel');assert.equal(f.requests[0]!.version,7);assert.equal(f.requests[0]!.body.reason,'Recorded reason');
  f=await forms('contractor',true);await f.click('Okay');assert.equal(f.requests.length,0);f.field(f.declaration).checked=true;await f.click('Okay');assert.equal(f.requests[0]!.body.declaration,f.declaration);assert.equal(f.requests[0]!.body.outcome,'okay');
});
test('Chapter 14 claim drafts and uploaded evidence cannot submit a claim; only explicit Submit claim calls the response command',async()=>{
  const f=await forms('contractor',true);f.field('Claim or concern explanation').value='Materials already committed';assert.equal(f.requests.length,0);await f.click('Submit claim — Admin Intervention');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.body.description,'Materials already committed');assert.equal(f.requests[0]!.body.outcome,'claim');
});
test('Chapter 13 fee account is absent from estate fetches; ready proof cannot report or verify money',async()=>{
  const estate=await forms('mcst');assert.equal(estate.reads.some(p=>p.includes('/billing')),false);
  const f=await forms('contractor');assert.ok(f.all().some(e=>e.dataset.followupPrefix==='Fees due in'&&e.dataset.overdueLabel==='Fees overdue'));await f.click('Attach / resume private file');assert.equal(f.requests.length,0);f.field('Claimed payment SGD').value='8.00';f.field('Actual payment date').value='2026-11-02';await f.click('Submit payment for verification');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.path,'organisations/org/billing/report');assert.equal(f.requests[0]!.body.proofId,'ready-file');assert.equal(f.requests[0]!.version,3);
});
test('Chapter 13 Admin verifies exact collection with bounded displayed allocations and an explicit evidence check',async()=>{
  const f=await forms('admin');await f.click('Fictional company');f.field('Actual receipt date').value='2026-11-02';f.field('Unique bank collection reference').value='Actual-reference';f.field('Verification evidence / findings').value='Actual bank check';
  await f.click('Verify collection and allocate oldest liabilities');assert.equal(f.requests.length,0);f.field('I checked actual collection and the allocations shown in the statement.').checked=true;await f.click('Verify collection and allocate oldest liabilities');assert.equal(f.requests.length,1);assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0]!.body.allocations)),[{debitId:'platform-debt',amountSgd:'4.00'},{debitId:'lead-debt',amountSgd:'4.00'}]);
});
test('Legacy workspace support without a domain-case row permits direct Admin resolution at its bootstrapped version',async()=>{
  const f=await forms('admin',false,undefined,{support:{id:'legacy',job_id:'job',description:'Existing evidence is sufficient.',privacy:'ordinary'},case:null,attachments:[],resolutions:[],acknowledgments:[],responders:[],settlementProposals:[],obligations:[],events:[]});
  await f.click('Support request');f.field('Outcome').value='The concern is resolved with this explanation.';f.field('Reasons and evidence').value='Existing retained evidence was checked.';await f.click('Issue final resolution');assert.equal(f.requests.length,1);assert.equal(f.requests[0]!.path,'support/legacy/resolve');assert.equal(f.requests[0]!.version,1);assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0]!.body.obligations)),[]);
});
test('Support case readers see evidence submission only when they are the reporter, named responder or Admin',async()=>{
  const detail={support:{id:'legacy',job_id:'job',reporter_id:'someone-else',description:'Ordinary concern',privacy:'ordinary'},case:{state:'review',version:2},attachments:[],resolutions:[],acknowledgments:[],responders:[],settlementProposals:[],obligations:[],events:[]};
  let f=await forms('mcst',false,undefined,detail);await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Submit evidence to Admin review'),false);
  f=await forms('mcst',false,undefined,{...detail,case:{...detail.case,responding_user_id:'user'}});await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Submit evidence to Admin review'),true);
});
test('Support repair inspection waits for execution and the exact uninspected physical round',async()=>{
  const detail={support:{id:'legacy',job_id:'job',reporter_id:'user',description:'Inspect the actual authorised remedy.',privacy:'ordinary'},case:{state:'review',version:3,resolution_version:1},attachments:[],resolutions:[],acknowledgments:[],responders:[],settlementProposals:[],obligations:[{id:'repair',kind:'repair',description:'Replace failed valve',required_round:2,resolution_version:1}],events:[]};
  const finance={version:7,completion:{round:1},rounds:[{round:1,outcome:'accepted'}],balances:{unsentCents:'0'}};
  let f=await forms('mcst',false,finance,detail);await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Accept this corrected physical round'),false);
  const execution={...detail,case:{...detail.case,state:'execution'}};
  f=await forms('mcst',false,finance,execution);await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Accept this corrected physical round'),false);
  f=await forms('mcst',false,{...finance,completion:{round:2},rounds:[...finance.rounds,{round:2,outcome:null}]},execution);await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Accept this corrected physical round'),true);
  f=await forms('mcst',false,{...finance,completion:{round:2},rounds:[...finance.rounds,{round:2,outcome:'accepted'}]},execution);await f.click('Support request');assert.equal(f.all().some(e=>e.tag==='button'&&e.textContent==='Accept this corrected physical round'),false);assert.ok(f.all().some(e=>e.textContent.includes('Waiting for Admin to verify fulfilment.')));
});
