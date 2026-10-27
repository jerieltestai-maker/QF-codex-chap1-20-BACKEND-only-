import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {completionFixture,type Client} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {feeComponent} from '../packages/domain/billing-service.js';
import {okayDeclaration} from '../packages/domain/cancellation-service.js';
import {businessDayDue,loadCalendar} from '../packages/domain/calendar.js';
type Fixture=Awaited<ReturnType<typeof completionFixture>>;
const base='organisations/'+ids.organisation+'/billing';
const sgd=(n:bigint)=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
async function offered(f:Fixture,select=false) {
  const id=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Pending approval fixture',observations:'Factual observation',affectedLocation:'Private room'},f.cm)).jobId as string;
  f.okay(await f.post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to photograph',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping joint',publicLocation:'Service room',evidenceIds:[]},f.cm,1));
  f.okay(await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.cm,2));
  const q=f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:'1200.00',wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true}},f.contractor));
  const c=f.okay(await f.get('workspaces/'+id+'/comparison',f.cm)),body={quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:1,rationale:'Exact scope and terms reviewed',confirmed:true,acknowledgedCautions:[...c.quotes[0].cautions,'limited_comparison'],thresholdAcknowledged:false};
  const selection=select?f.okay(await f.post('workspaces/'+id+'/select',body,f.cm,c.version)):null;return {id,body,selection};
}
async function scenario(work:(f:Fixture)=>Promise<void>){const f=await completionFixture(undefined,false);try{await work(f);}finally{await f.close();}}
async function confirmed(f:Fixture,amount='100.00') {
  const id=await f.job(amount);await f.complete(id,{amountSgd:amount});await f.inspect(id);
  await f.cmd(id,'payments/confirm-invoice',{invoiceVersion:(await f.detail(id)).completion.invoice_version,amountSgd:amount,confirmed:true},f.mcst);return id;
}
const statement=async(f:Fixture,c=f.admin)=>f.okay(await f.get(base,c));
async function caseCommand(f:Fixture,id:string,path:string,body:unknown,c=f.admin) {
  const d=f.okay(await f.get('support/'+id,c));return f.okay(await f.post('support/'+id+'/'+path,body,c,d.case.version));
}
async function openCase(f:Fixture,id:string,category='invoice_payment',c=f.cm,extra:object={}) {
  const [j]=await f.db.query('SELECT version FROM job_records WHERE id=$1',[id]);
  return f.okay(await f.post('workspaces/'+id+'/cases',{description:'Factual support request',category,privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[],...extra},c,Number(j!.version))).supportId as string;
}
async function adjust(f:Fixture,id:string,amount:string,override=false) {
  const sid=await openCase(f,id),p=await caseCommand(f,sid,'settlements',{amountSgd:amount,reason:'Authorised correction to exact total'});
  await caseCommand(f,sid,'confirm-settlement',{proposalId:p.proposalId,proposalVersion:p.proposalVersion,amountSgd:amount,confirmed:true,financialOverride:override,reason:'Exact total reviewed'},override?f.admin:f.mcst);return sid;
}
async function payFees(f:Fixture) {
  let s=await statement(f);const amount=BigInt(s.outstandingCents);
  const r=f.okay(await f.post(base+'/report',{amountSgd:sgd(amount),paidDate:f.now().toISOString(),context:'Bank payment reference supplied for verification'},f.contractor,s.version));
  s=await statement(f);f.okay(await f.post(base+'/verify',{reportId:r.reportId,amountSgd:sgd(amount),receivedDate:f.now().toISOString(),reference:randomUUID(),evidence:'Bank statement checked',allocations:s.liabilities.filter((d:Record<string,unknown>)=>BigInt(String(d.outstanding_cents))>0n).map((d:Record<string,unknown>)=>({debitId:d.id,amountSgd:sgd(BigInt(String(d.outstanding_cents)))}))},f.admin,s.version));
}
async function privateFile(f:Fixture,route:string,c:Client) {
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:{r:40,g:90,b:120}}}).png().toBuffer();
  const u=f.okay(await f.post(route,{mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},c));
  f.okay(await f.post('uploads/'+u.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},c));f.okay(await f.post('uploads/'+u.uploadId+'/finalize',{},c));
  for(let i=0;i<500;i++){const w=await f.worker.claim();if(!w)break;await f.worker.process(w);const [s]=await f.db.query('SELECT state FROM upload_intents WHERE id=$1',[u.uploadId]);if(s!.state==='ready')break;}
  const status=f.okay(await f.get('uploads/'+u.uploadId,c));assert.equal(status.state,'ready');return status.objects.find((o:Record<string,unknown>)=>o.variant==='original').id as string;
}

test('CH13-T01/T02/T09: full basis, independently rounded components, exact business deadline and permanent source uniqueness',()=>scenario(async f=>{
  const id=await confirmed(f,'1200.00'),s=await statement(f);assert.equal(s.outstandingCents,'9600');assert.deepEqual(s.liabilities.map((l:Record<string,unknown>)=>String(l.amount_cents)),['4800','4800']);
  const due=businessDayDue(f.now(),3,await loadCalendar(f.db)).toISOString();assert.ok(s.liabilities.every((l:Record<string,unknown>)=>l.due_at===due));
  await f.transfer(id,{amountSgd:'600.00',rationale:'Partial bank transfer'});assert.equal((await statement(f)).outstandingCents,'9600');
  await f.worker.tick(500);await f.worker.tick(500);assert.equal((await f.db.query('SELECT id FROM fee_entries WHERE job_id=$1',[id])).length,2);
  for(const [basis,expected] of [[0n,0n],[1n,0n],[12n,0n],[13n,1n],[112n,4n],[113n,5n],[9007199254740991n,360287970189640n]])assert.equal(feeComponent(basis!),expected);
  await assert.rejects(f.db.query("UPDATE fee_entries SET amount_cents=1 WHERE job_id=$1",[id]),/immutable|append|alter|preserv/i);
  const j=await confirmed(f,'1.13');assert.deepEqual((await statement(f)).liabilities.filter((l:Record<string,unknown>)=>l.job_id===j).map((l:Record<string,unknown>)=>String(l.amount_cents)),['5','5']);
}));
test('CH13-T03: unpaid increase preserves original deadlines; same total/retry creates no additional positive charge',()=>scenario(async f=>{
  const id=await confirmed(f,'1000.00'),original=(await statement(f)).liabilities;
  f.setNow(new Date(f.now().getTime()+86400000));const sid=await adjust(f,id,'1200.00');let s=await statement(f);
  assert.equal(s.outstandingCents,'9600');assert.equal(s.liabilities.filter((d:Record<string,unknown>)=>String(d.amount_cents)==='800').length,2);
  for(const d of original)assert.equal(s.liabilities.find((n:Record<string,unknown>)=>n.id===d.id).due_at,d.due_at);
  const p=await caseCommand(f,sid,'settlements',{amountSgd:'1200.00',reason:'Reconfirm unchanged payable total'});
  const d=f.okay(await f.get('support/'+sid,f.mcst)),body={proposalId:p.proposalId,proposalVersion:p.proposalVersion,amountSgd:'1200.00',confirmed:true,financialOverride:false,reason:'Same payable amount'},key=randomUUID();
  const first=f.okay(await f.post('support/'+sid+'/confirm-settlement',body,f.mcst,d.case.version,key));assert.deepEqual(f.okay(await f.post('support/'+sid+'/confirm-settlement',body,f.mcst,d.case.version,key)),first);
  s=await statement(f);assert.equal(s.outstandingCents,'9600');assert.equal(s.liabilities.length,4);
}));
test('CH13-T03/T04: paid increase charges only differences; reductions offset debts then create separately executable refunds',()=>scenario(async f=>{
  const id=await confirmed(f,'1000.00');await payFees(f);await adjust(f,id,'1200.00');assert.equal((await statement(f)).outstandingCents,'1600');
  await adjust(f,id,'900.00');let s=await statement(f);assert.equal(s.outstandingCents,'0');assert.equal(s.refundDueCents,'800');assert.equal(s.refunds.length,0);
  const credit=s.credits.find((c:Record<string,unknown>)=>BigInt(String(c.available_cents))>0n),body={creditId:credit.id,amountSgd:'4.00',refundedDate:f.now().toISOString(),reference:'refund-'+randomUUID(),evidence:'Completed bank refund checked'};
  const key=randomUUID(),result=f.okay(await f.post(base+'/refund',body,f.admin,s.version,key));assert.deepEqual(f.okay(await f.post(base+'/refund',body,f.admin,s.version,key)),result);
  s=await statement(f);assert.equal(s.refundDueCents,'400');assert.equal(s.refunds.length,1);
  assert.equal((await f.post(base+'/refund',{...body,reference:randomUUID()},f.admin,s.version)).statusCode,422);
  await assert.rejects(f.db.query('INSERT INTO fee_refunds VALUES($1,$2,999999,$3,$4,$5,$6,$7)',[randomUUID(),credit.id,f.now().toISOString(),randomUUID(),'Invalid excess',ids.admin,f.now().toISOString()]),/credit/i);
}));
test('CH13-T05/T06/T07: overdue restrictions preserve selected work; proof is unverified; full verified payment lifts only fee hold',()=>scenario(async f=>{
  const id=await confirmed(f),due=(await statement(f)).liabilities[0].due_at;
  f.setNow(new Date(Date.parse(due)+1));await f.worker.tick(500);
  assert.equal((await f.db.query("SELECT id FROM contractor_restrictions WHERE source='fee' AND active=true")).length,1);
  assert.equal((await f.get('workspaces/'+id+'/work',f.contractor)).statusCode,200);
  const [j]=await f.db.query('SELECT version FROM job_records WHERE id=$1',[id]);assert.ok(Number(j!.version)>0);await f.transfer(id);
  const proof=await privateFile(f,base+'/uploads',f.contractor),s=await statement(f);
  f.okay(await f.post(base+'/report',{amountSgd:'8.00',paidDate:f.now().toISOString(),proofId:proof,context:''},f.contractor,s.version));
  assert.equal((await statement(f)).outstandingCents,'800');assert.equal((await f.db.query('SELECT id FROM fee_verifications')).length,0);
  assert.equal((await f.get('files/'+proof,f.cm)).statusCode,404);
  await f.db.query("INSERT INTO contractor_restrictions(id,organisation_id,source,reason,created_at) VALUES($1,$2,'credential','Invalid required credential',$3)",[randomUUID(),ids.organisation,f.now().toISOString()]);
  await payFees(f);assert.equal((await f.db.query("SELECT source FROM contractor_restrictions WHERE active=true")).some(r=>r.source==='fee'),false);assert.equal((await f.db.query("SELECT source FROM contractor_restrictions WHERE active=true")).some(r=>r.source==='credential'),true);
}));
test('CH13-T08/T10: account, operation, proof, bells/history privacy and fee-independent job closure',()=>scenario(async f=>{
  const id=await confirmed(f);for(const c of [f.cm,f.mcst,f.peer,f.rival])assert.equal((await f.get(base,c)).statusCode,404);
  await f.transfer(id);let d=await f.detail(id,f.contractor);await f.cmd(id,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'100.00',receiptDate:f.now().toISOString(),confirmed:true},f.contractor);
  assert.equal((await f.detail(id)).stage,'Closed');assert.equal((await statement(f)).outstandingCents,'800');
  await f.worker.tick(500);for(const c of [f.cm,f.mcst])for(const route of ['notifications','tasks','workspaces/'+id+'/history','workspaces/'+id+'/completion'])assert.doesNotMatch((await f.get(route,c)).body,/billing\.|fee_entries|calculation_version|Fees due|refundDueCents/);
}));
test('CH13 ledger race: competing Admin allocations commit once; immutable history and over-allocation constraints survive cache loss',()=>scenario(async f=>{
  await confirmed(f);let s=await statement(f);const report=f.okay(await f.post(base+'/report',{amountSgd:'8.00',paidDate:f.now().toISOString(),context:'Paid to QuoteFix'},f.contractor,s.version));s=await statement(f);
  const body={reportId:report.reportId,amountSgd:'8.00',receivedDate:f.now().toISOString(),reference:randomUUID(),evidence:'Actual bank collection',allocations:s.liabilities.map((d:Record<string,unknown>)=>({debitId:d.id,amountSgd:'4.00'}))};
  const results=await Promise.all([f.post(base+'/verify',body,f.admin,s.version),f.post(base+'/verify',body,f.admin,s.version)]);assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,412]);assert.equal((await statement(f)).outstandingCents,'0');
  const [v]=await f.db.query('SELECT id FROM fee_verifications');await assert.rejects(f.db.query('INSERT INTO fee_allocations VALUES($1,$2,NULL,$3,1,$4)',[randomUUID(),s.liabilities[0].id,v!.id,f.now().toISOString()]),/exceeds debit/i);
  await assert.rejects(f.db.query('DELETE FROM fee_verifications'),/immutable|append|alter|preserv/i);
}));
test('CH14-T01/T02: immediate cancellation, exact Okay declaration, current authority and existing debts retained',()=>scenario(async f=>{
  const id=await confirmed(f),d=await f.detail(id),body={reason:'Stop ordinary work',confirmed:true};
  assert.equal((await f.post('workspaces/'+id+'/cancel',body,f.contractor,d.version)).statusCode,403);
  assert.equal((await f.post('workspaces/'+id+'/cancel',{...body,reason:' '},f.cm,d.version)).statusCode,422);
  const cancel=f.okay(await f.post('workspaces/'+id+'/cancel',body,f.cm,d.version));assert.equal((await f.detail(id)).stage,'Cancelled');await f.worker.tick(500);
  let view=f.okay(await f.get('workspaces/'+id+'/cancellation',f.contractor));
  assert.equal((await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:cancel.cancellationId,outcome:'okay'},f.contractor,view.version)).statusCode,422);
  f.okay(await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:cancel.cancellationId,outcome:'okay',declaration:okayDeclaration},f.contractor,view.version));
  assert.equal((await f.detail(id)).balances.payableCents,'10000');assert.equal((await statement(f)).outstandingCents,'800');
  view=f.okay(await f.get('workspaces/'+id+'/cancellation',f.contractor));assert.equal(view.cancellations[0].response,'okay');
  assert.equal((await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:cancel.cancellationId,outcome:'claim',description:'Later ordinary extra claim'},f.contractor,view.version)).statusCode,409);
  assert.ok(await openCase(f,id,'general',f.contractor));
}));
test('CH14-T01/T03: unselected cancellation has no response clock; failed notice cannot start the selected Contractor claim window',()=>scenario(async f=>{
  const draft=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Private job',observations:'Factual issue',affectedLocation:'Private location'},f.cm));
  f.okay(await f.post('workspaces/'+draft.jobId+'/cancel',{reason:'No longer required',confirmed:true},f.cm,1));
  let [c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[draft.jobId]);assert.equal(c!.task_id,null);assert.equal(c!.claim_due_at,null);
  const id=await f.job();await f.cmd(id,'cancel',{reason:'Cancelled after authority',confirmed:true},f.cm);
  await f.db.query('UPDATE memberships SET active=false WHERE organisation_id=$1',[ids.organisation]);await f.worker.tick(500);[c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[id]);assert.equal(c!.first_issued_at,null);
  f.setNow(new Date(f.now().getTime()+86400000*2));await f.db.query('UPDATE memberships SET active=true WHERE organisation_id=$1',[ids.organisation]);await f.worker.tick(500);
  [c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[id]);assert.equal(new Date(c!.claim_due_at as string).getTime()-new Date(c!.first_issued_at as string).getTime(),7*86400000);
  const first=String(c!.first_issued_at);await f.worker.tick(500);[c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[id]);assert.equal(String(c!.first_issued_at),first);
  await assert.rejects(f.db.query('UPDATE cancellations SET reason=$1 WHERE job_id=$2',['Rewrite',id]),/immutable/i);
}));
test('CH14-T04/T05: cutoff-minus-24h escalation, timely claim with later evidence, and draft-only expiry without consent',()=>scenario(async f=>{
  const id=await f.job();await f.cmd(id,'cancel',{reason:'Stop work',confirmed:true},f.cm);await f.worker.tick(500);
  let [c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[id]);
  f.setNow(new Date(Date.parse(String(c!.claim_due_at))-86400000));await f.worker.tick(500);
  const [checkpoint]=await f.db.query("SELECT due_at FROM cancellation_checkpoints WHERE cancellation_id=$1 AND kind='admin'",[c!.id]);assert.ok(checkpoint);assert.equal(new Date(checkpoint!.due_at as string).getTime(),f.now().getTime());
  let d=f.okay(await f.get('workspaces/'+id+'/cancellation',f.contractor));const response=f.okay(await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:c!.id,outcome:'claim',description:'Materials committed; available proof will follow'},f.contractor,d.version));
  f.setNow(new Date(Date.parse(String(c!.claim_due_at))+86400000));await caseCommand(f,response.supportId,'evidence',{explanation:'Later evidence on the timely submitted claim',fileIds:[]},f.contractor);
  d=f.okay(await f.get('support/'+response.supportId,f.admin));assert.equal(d.case.state,'review');assert.equal((await f.detail(id)).stage,'Admin Intervention');
  const other=await f.job();await f.cmd(other,'cancel',{reason:'Stop second job',confirmed:true},f.cm);await f.worker.tick(500);[c]=await f.db.query('SELECT * FROM cancellations WHERE job_id=$1',[other]);
  // Reading the form is not submission.
  await f.get('workspaces/'+other+'/cancellation',f.contractor);f.setNow(new Date(c!.claim_due_at as string));await f.worker.tick(500);
  const [expired]=await f.db.query('SELECT response FROM cancellations WHERE id=$1',[c!.id]);assert.equal(expired!.response,'expired');assert.equal((await f.db.query("SELECT id FROM cancellation_events WHERE cancellation_id=$1 AND kind='okay'",[c!.id])).length,0);
}));
test('CH14-T06/T12: named evidence response returns to Admin review; offline contact retains dated follow-up and never resolves',()=>scenario(async f=>{
  const id=await f.job(),sid=await openCase(f,id,'quality_remedy');
  await caseCommand(f,sid,'request-evidence',{request:'Provide observed facts',respondingRole:'contractor',respondingUserId:ids.contractor});await f.worker.tick(500);
  let d=f.okay(await f.get('support/'+sid,f.contractor));assert.equal(d.case.state,'evidence');
  const file=await privateFile(f,'support/'+sid+'/uploads',f.contractor);assert.equal((await f.get('files/'+file,f.admin)).statusCode,404,'Ready upload is not submitted evidence');
  await caseCommand(f,sid,'evidence',{explanation:'Actual observations supplied',fileIds:[file]},f.contractor);
  d=f.okay(await f.get('support/'+sid,f.admin));assert.equal(d.case.state,'review');assert.equal(d.resolutions.length,0);assert.equal((await f.get('files/'+file,f.admin)).statusCode,200);
  await caseCommand(f,sid,'follow-up',{nextAction:'Admin checks supplier records',followUpAt:new Date(f.now().getTime()+86400000).toISOString(),externalReference:'Restricted offline ledger QF-123',permittedSummary:'Further facts requested'});
  d=f.okay(await f.get('support/'+sid,f.contractor));assert.doesNotMatch(JSON.stringify(d),/QF-123/);assert.notEqual(d.case.state,'resolved');
  const [task]=await f.db.query("SELECT follow_up_at FROM tasks WHERE support_id=$1 AND kind='support.review' AND status='open'",[sid]);assert.ok(task!.follow_up_at);
}));
test('CH14-T07/T11: exact zero cancellation settlement and nonblocking acknowledgments retain Cancelled without fake fees or transfers',()=>scenario(async f=>{
  const id=await f.job();await f.cmd(id,'cancel',{reason:'No payable expenses',confirmed:true},f.cm);await f.worker.tick(500);const [c]=await f.db.query('SELECT id FROM cancellations WHERE job_id=$1',[id]);
  const claim=await f.cmd(id,'cancellation/respond',{cancellationId:c!.id,outcome:'claim',description:'Please determine the actual payable total'},f.contractor),sid=claim.supportId as string;
  const p=await caseCommand(f,sid,'settlements',{amountSgd:'0.00',reason:'No completed work or incurred payable cost'});
  const body={proposalId:p.proposalId,proposalVersion:p.proposalVersion,amountSgd:'0.00',confirmed:true,financialOverride:false,reason:'Exact zero reviewed'};
  let d=f.okay(await f.get('support/'+sid,f.cm));assert.equal((await f.post('support/'+sid+'/confirm-settlement',body,f.cm,d.case.version)).statusCode,403);await caseCommand(f,sid,'confirm-settlement',body,f.mcst);
  await caseCommand(f,sid,'resolve',{outcome:'Zero settlement',reason:'Verified no payable liability',obligations:[]});await caseCommand(f,sid,'finish',{reason:'No execution outstanding'});
  assert.equal((await f.detail(id)).stage,'Cancelled');assert.equal((await f.detail(id)).transfers.length,0);assert.equal((await statement(f)).outstandingCents,'0');assert.equal((await f.db.query('SELECT * FROM support_acknowledgments WHERE support_id=$1',[sid])).length,0);
}));
test('CH14-T08: final repair uses fresh physical rounds, failed inspection cannot fulfil it, and acceptance reuses the same successful round',()=>scenario(async f=>{
  const id=await confirmed(f),sid=await openCase(f,id,'quality_remedy');await caseCommand(f,sid,'resolve',{outcome:'Repair authorised',reason:'New physical remedy needed',obligations:[{kind:'repair',ownerRole:'contractor',description:'Correct the failed joint',followUpAt:new Date(f.now().getTime()+86400000).toISOString()}]});
  let d=f.okay(await f.get('support/'+sid,f.admin)),ob=d.obligations[0];
  assert.equal((await f.post('support/'+sid+'/verify',{obligationId:ob.id,evidence:'Old accepted round'},f.admin,d.case.version)).statusCode,409);
  await caseCommand(f,sid,'repair',{obligationId:ob.id,completedAt:f.now().toISOString(),explanation:'Joint corrected',evidenceIds:[],confirmed:true},f.contractor);
  const review={obligationId:ob.id,round:2,outcome:'unsatisfactory',findings:'Joint still leaks',checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},satisfactory:false,confirmed:true};
  await caseCommand(f,sid,'inspect-repair',review,f.cm);d=f.okay(await f.get('support/'+sid,f.admin));assert.equal((await f.post('support/'+sid+'/verify',{obligationId:ob.id,evidence:'Failed repair'},f.admin,d.case.version)).statusCode,409);
  await caseCommand(f,sid,'repair',{obligationId:ob.id,completedAt:f.now().toISOString(),explanation:'Further physical correction',evidenceIds:[],confirmed:true},f.contractor);
  await caseCommand(f,sid,'inspect-repair',{...review,round:3,outcome:'accepted',findings:'',satisfactory:true},f.cm);await caseCommand(f,sid,'verify',{obligationId:ob.id,evidence:'Exact corrected round 3 accepted'});
  d=f.okay(await f.get('support/'+sid,f.admin));assert.equal(d.obligations[0].required_round,3);assert.ok(d.obligations[0].verified_at);assert.equal((await f.detail(id)).rounds.length,3);assert.equal((await statement(f)).liabilities.length,2);
}));
test('CH14-T09: reported MCST subject excluded from case, counts, files, operations, reminders and explicit grants',()=>scenario(async f=>{
  const id=await f.job(),sid=await openCase(f,id,'confidential_conduct',f.cm,{privacy:'confidential',subjectUserIds:[ids.mcst],description:'Private reported conduct'});
  const file=await privateFile(f,'support/'+sid+'/uploads',f.cm);await caseCommand(f,sid,'evidence',{explanation:'Private report evidence',fileIds:[file]},f.cm);await f.worker.tick(500);
  assert.equal((await f.get('support/'+sid,f.mcst)).statusCode,404);assert.equal((await f.get('files/'+file,f.mcst)).statusCode,404);
  assert.doesNotMatch((await f.get('workspaces/'+id+'/cases',f.mcst)).body,/Private reported|Private report|confidential_conduct/);
  let d=f.okay(await f.get('support/'+sid,f.admin));assert.equal((await f.post('support/'+sid+'/grant',{userId:ids.mcst,reason:'Subject cannot be authorised'},f.admin,d.case.version)).statusCode,422);
  await caseCommand(f,sid,'grant',{userId:ids.mcst2,reason:'Uninvolved estate oversight'});
  const peer=await f.login('mcsttwo@example.test');assert.equal((await f.get('support/'+sid,peer)).statusCode,200);
  await caseCommand(f,sid,'request-evidence',{request:'Supply permitted facts',respondingRole:'mcst',respondingUserId:ids.mcst2});await f.worker.tick(500);
  f.setNow(businessDayDue(f.now(),5,await loadCalendar(f.db)));await f.worker.tick(500);await f.worker.tick(500);
  for(const route of ['notifications','tasks','workspaces/'+id+'/history','workspaces/'+id+'/support'])assert.doesNotMatch((await f.get(route,f.mcst)).body,new RegExp(sid+'|Private reported|Private report|Supply permitted'));
}));
test('CH14-T10/T13: Admin correction previews exact dependencies, preserves paid history and requires a linked Contractor replacement',()=>scenario(async f=>{
  const id=await confirmed(f);await payFees(f);await f.cmd(id,'cancel',{reason:'Cancelled after financial confirmation',confirmed:true},f.cm);
  const before=await statement(f),v=(await f.detail(id)).version;
  const p=f.okay(await f.post('workspaces/'+id+'/correction/preview',{target:'restore_work'},f.admin,v));assert.equal(p.impact.invalidatesAcceptance,true);
  assert.equal((await f.post('workspaces/'+id+'/correction/execute',{previewId:p.previewId,reason:'Safe restoration',feasibleConfirmed:false},f.admin,v)).statusCode,422);
  const result=f.okay(await f.post('workspaces/'+id+'/correction/execute',{previewId:p.previewId,reason:'Safe restoration with a fresh remedy',feasibleConfirmed:true,followUpAt:new Date(f.now().getTime()+86400000).toISOString()},f.admin,v));
  assert.equal((await statement(f)).outstandingCents,before.outstandingCents);assert.equal((await statement(f)).reports.length,before.reports.length);assert.equal((await f.detail(id)).completion.accepted_round,null);
  const [original]=await f.db.query('SELECT restored_at,reason FROM cancellations WHERE job_id=$1',[id]);assert.ok(original!.restored_at);assert.equal(original!.reason,'Cancelled after financial confirmation');
  const d=f.okay(await f.get('support/'+result.supportId,f.admin));assert.equal(d.obligations[0].kind,'repair');
  assert.equal((await f.post('workspaces/'+id+'/correction/preview',{target:'restore_procurement'},f.admin,(await f.detail(id)).version)).statusCode,409);
}));
test('CH14-T01/T11: cancellation while awaiting MCST approval rejects later approval and settles incurred costs without inventing work/invoice',()=>scenario(async f=>{
  const {id,selection}=await offered(f,true),[j]=await f.db.query('SELECT version FROM job_records WHERE id=$1',[id]);
  f.okay(await f.post('workspaces/'+id+'/cancel',{reason:'Cancelled before work authority',confirmed:true},f.mcst,Number(j!.version)));await f.worker.tick(500);
  const [latest]=await f.db.query('SELECT version FROM job_records WHERE id=$1',[id]);
  assert.equal((await f.post('workspaces/'+id+'/selection/decide',{selectionId:selection.selectionId,outcome:'approved',reason:'Attempt approval after cancellation',confirmed:true,acknowledgedCautions:[]},f.mcst,Number(latest!.version))).statusCode,409);
  const [cancel]=await f.db.query('SELECT id FROM cancellations WHERE job_id=$1',[id]);const claim=f.okay(await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:cancel!.id,outcome:'claim',description:'Nonreturnable committed materials'},f.contractor,Number(latest!.version))),sid=claim.supportId as string;
  const p=await caseCommand(f,sid,'settlements',{amountSgd:'100.00',reason:'Exact incurred cost verified'});await caseCommand(f,sid,'confirm-settlement',{proposalId:p.proposalId,proposalVersion:p.proposalVersion,amountSgd:'100.00',confirmed:true,financialOverride:true,reason:'Explicit Admin financial override'},f.admin);
  assert.equal((await f.db.query('SELECT job_id FROM work_state WHERE job_id=$1',[id])).length,0);assert.equal((await f.db.query('SELECT job_id FROM invoice_confirmations WHERE job_id=$1',[id])).length,0);
  const proof=await f.file(id,'payment_proof'),d=await f.detail(id,f.mcst);f.okay(await f.post('workspaces/'+id+'/payments/transfer',{invoiceVersion:1,financialVersion:1,proofId:proof,amountSgd:'100.00',transferDate:f.now().toISOString(),completedTransfer:true,confirmed:true},f.mcst,d.version));
  const receipt=await f.detail(id,f.contractor);await f.cmd(id,'payments/receipt',{transferId:receipt.transfers[0].id,amountSgd:'100.00',receiptDate:f.now().toISOString(),confirmed:true},f.contractor);
  await caseCommand(f,sid,'resolve',{outcome:'Incurred cost settlement',reason:'Actual settlement verified',obligations:[{kind:'payment',ownerRole:'mcst',description:'Settle the exact incurred-cost amount'}]});
  const sd=f.okay(await f.get('support/'+sid,f.admin));await caseCommand(f,sid,'verify',{obligationId:sd.obligations[0].id,evidence:'Matching actual bank receipt'});await caseCommand(f,sid,'finish',{reason:'All execution verified'});
  assert.equal((await f.detail(id)).stage,'Cancelled');assert.equal((await statement(f)).outstandingCents,'800');assert.equal((await f.db.query('SELECT job_id FROM settlement_anchors WHERE job_id=$1',[id])).length,0);
}));
test('CH13-T05: an overdue account blocks new quoting and selection of existing unselected offers while a held selection continues',()=>scenario(async f=>{
  const paidJob=await confirmed(f),unselected=await offered(f),held=await offered(f,true),due=(await statement(f)).liabilities[0].due_at;f.setNow(new Date(Date.parse(due)+1));await f.worker.tick(500);
  let c=f.okay(await f.get('workspaces/'+unselected.id+'/comparison',f.cm));assert.equal(c.quotes[0].selectable,false);
  assert.equal((await f.post('workspaces/'+unselected.id+'/select',unselected.body,f.cm,c.version)).statusCode,412);
  assert.equal((await f.get('opportunities/'+unselected.id,f.contractor)).statusCode,404);
  c=f.okay(await f.get('workspaces/'+held.id+'/comparison',f.mcst));
  f.okay(await f.post('workspaces/'+held.id+'/selection/decide',{selectionId:held.selection.selectionId,outcome:'approved',reason:'Held quote still valid',confirmed:true,acknowledgedCautions:held.body.acknowledgedCautions},f.mcst,c.version));
  assert.equal((await f.get('workspaces/'+paidJob+'/completion',f.contractor)).statusCode,200);
}));
test('CH14 exact corrected debt: estate refund requires actual execution, original transfers survive, and prior financial obligations cannot be silently rebound',()=>scenario(async f=>{
  const id=await confirmed(f);await f.transfer(id);let d=await f.detail(id,f.contractor);await f.cmd(id,'payments/receipt',{transferId:d.transfers[0].id,amountSgd:'100.00',receiptDate:f.now().toISOString(),confirmed:true},f.contractor);
  const sid=await adjust(f,id,'80.00');await caseCommand(f,sid,'resolve',{outcome:'Corrected overpayment',reason:'Payable reduced by authorised decision',obligations:[{kind:'refund',ownerRole:'admin',description:'Return the exact overpaid estate amount'}]});
  let sd=f.okay(await f.get('support/'+sid,f.admin)),ob=sd.obligations[0];assert.equal((await f.post('support/'+sid+'/verify',{obligationId:ob.id,evidence:'Verdict alone'},f.admin,sd.case.version)).statusCode,409);
  f.setNow(new Date(f.now().getTime()+86400000));await caseCommand(f,sid,'estate-refund',{amountSgd:'20.00',refundedDate:f.now().toISOString(),reference:randomUUID(),evidence:'Completed bank refund to estate checked'});await caseCommand(f,sid,'verify',{obligationId:ob.id,evidence:'Actual refund verified against original transfer and corrected total'});
  d=await f.detail(id);assert.equal(d.balances.outstandingCents,'0');assert.equal(d.transfers.length,1);assert.equal(String(d.transfers[0].amount_cents),'10000');
  await caseCommand(f,sid,'finish',{reason:'Matching refund actually executed'});assert.equal((await f.detail(id)).stage,'Closed');
  assert.equal((await f.detail(id)).settlementAnchor.settled_at,f.now().toISOString());
  assert.equal((await statement(f)).outstandingCents,'640');
}));
test('Admin correction dependency preview becomes stale on a task update; no original deadline/payment/acceptance is rewritten',()=>scenario(async f=>{
  const id=await confirmed(f),v=(await f.detail(id)).version,p=f.okay(await f.post('workspaces/'+id+'/correction/preview',{target:'review_payment'},f.admin,v));
  const [task]=await f.db.query("SELECT id,version FROM tasks WHERE resource_id=$1 AND owner_role='mcst' AND status='open' LIMIT 1",[id]);assert.ok(task);
  await f.db.query('UPDATE tasks SET version=version+1 WHERE id=$1',[task!.id]);
  const r=await f.post('workspaces/'+id+'/correction/execute',{previewId:p.previewId,reason:'Needs refreshed dependency review',feasibleConfirmed:true},f.admin,v);assert.equal(r.statusCode,412);assert.equal(r.json().error.code,'DEPENDENCIES_CHANGED');
  assert.equal((await f.db.query("SELECT id FROM audit_events WHERE resource_id=$1 AND action='correction.execute'",[id])).length,0);
}));
test('Billing transaction failure rolls back allocation, audit, task completion and command receipt; private bank findings stay Admin-only',()=>scenario(async f=>{
  await confirmed(f);let s=await statement(f);const report=f.okay(await f.post(base+'/report',{amountSgd:'8.00',paidDate:f.now().toISOString(),context:'Claimed collection'},f.contractor,s.version));s=await statement(f);
  const key=randomUUID(),body={reportId:report.reportId,amountSgd:'8.00',receivedDate:f.now().toISOString(),reference:randomUUID(),evidence:'PRIVATE BANK FINDING',allocations:s.liabilities.map((d:Record<string,unknown>)=>({debitId:d.id,amountSgd:'4.00'}))};
  await f.db.exec("CREATE FUNCTION reject_fixture_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected transaction failure'; END; $$; CREATE TRIGGER fixture_failure BEFORE INSERT ON fee_allocations FOR EACH ROW EXECUTE FUNCTION reject_fixture_allocation();");
  assert.equal((await f.post(base+'/verify',body,f.admin,s.version,key)).statusCode,500);assert.equal((await f.db.query('SELECT id FROM fee_verifications')).length,0);assert.equal((await f.db.query('SELECT * FROM command_receipts WHERE operation_id=$1',[key])).length,0);
  await f.db.exec('DROP TRIGGER fixture_failure ON fee_allocations; DROP FUNCTION reject_fixture_allocation();');f.okay(await f.post(base+'/verify',body,f.admin,s.version,key));
  assert.doesNotMatch(JSON.stringify(await statement(f,f.contractor)),/PRIVATE BANK FINDING/);assert.match(JSON.stringify(await statement(f)),/PRIVATE BANK FINDING/);
}));
test('Financial execution is bound to its exact confirmed debt; a later correction requires a recorded superseding resolution',()=>scenario(async f=>{
  const id=await confirmed(f),sid=await openCase(f,id);await caseCommand(f,sid,'resolve',{outcome:'Pay the confirmed invoice',reason:'Original exact payable debt',obligations:[{kind:'payment',ownerRole:'mcst',description:'Settle this exact confirmation'}]});
  let d=f.okay(await f.get('support/'+sid,f.admin));const original=d.obligations[0];await adjust(f,id,'120.00');
  d=f.okay(await f.get('support/'+sid,f.admin));const result=await f.post('support/'+sid+'/verify',{obligationId:original.id,evidence:'Prior confirmation is insufficient'},f.admin,d.case.version);assert.equal(result.statusCode,409);assert.equal(result.json().error.code,'FINANCIAL_OBLIGATION_CHANGED');
  await caseCommand(f,sid,'dispute-execution',{description:'The binding payable confirmation changed'});
  d=f.okay(await f.get('support/'+sid,f.admin));const body={outcome:'Pay corrected exact total',reason:'Review authorised correction without erasing prior execution',obligations:[{kind:'payment',ownerRole:'mcst',description:'Settle the corrected confirmation'}]};
  assert.equal((await f.post('support/'+sid+'/resolve',body,f.admin,d.case.version)).statusCode,409);await caseCommand(f,sid,'resolve',{...body,supersedeOutstanding:true});
  d=f.okay(await f.get('support/'+sid,f.admin));const old=d.obligations.find((o:Record<string,unknown>)=>o.id===original.id),current=d.obligations.find((o:Record<string,unknown>)=>o.resolution_version===2);assert.ok(old.superseded_at);assert.equal(old.verified_at,null);assert.notEqual(current.financial_confirmation_id,old.financial_confirmation_id);assert.equal(d.resolutions.length,2);
}));
test('Verification/access support works before any job, preserves organisation/estate privacy and records actual evidence/execution without financial side effects',()=>scenario(async f=>{
  const route='organisations/'+ids.organisation+'/cases',sid=f.okay(await f.post(route,{description:'Need human help with company verification'},f.contractor)).supportId as string;
  assert.equal((await f.get(route,f.mcst)).statusCode,404);assert.equal((await f.get(route,f.rival)).statusCode,404);assert.equal((await f.get('support/'+sid,f.cm)).statusCode,404);
  await caseCommand(f,sid,'request-evidence',{request:'Supply company authenticity context',respondingRole:'contractor',respondingUserId:ids.contractor});
  const proof=await privateFile(f,'support/'+sid+'/uploads',f.contractor);assert.equal((await f.get('files/'+proof,f.admin)).statusCode,404);await caseCommand(f,sid,'evidence',{explanation:'Supporting context submitted',fileIds:[proof]},f.contractor);assert.equal((await f.get('files/'+proof,f.admin)).statusCode,200);
  let d=f.okay(await f.get('support/'+sid,f.admin));assert.equal(d.support.job_id,null);assert.equal(d.case.state,'review');
  assert.equal((await f.post('support/'+sid+'/settlements',{amountSgd:'1.00',reason:'No fabricated job finance'},f.admin,d.case.version)).statusCode,409);
  await caseCommand(f,sid,'resolve',{outcome:'Review actual account verification',reason:'Separate account decision retains evidence',obligations:[{kind:'action',ownerRole:'admin',description:'Verify current approved company record',followUpAt:new Date(f.now().getTime()+86400000).toISOString()}]});
  d=f.okay(await f.get('support/'+sid,f.admin));assert.equal((await f.post('support/'+sid+'/finish',{reason:'Verdict alone is insufficient'},f.admin,d.case.version)).statusCode,409);
  await caseCommand(f,sid,'verify',{obligationId:d.obligations[0].id,evidence:'Current approved company profile and access checked'});await caseCommand(f,sid,'finish',{reason:'Actual account review complete'});
  const estate='estates/'+ids.estate+'/cases',esid=f.okay(await f.post(estate,{description:'CM account access query'},f.cm)).supportId as string;assert.equal((await f.get('support/'+esid,f.peer)).statusCode,200);assert.equal((await f.get('support/'+esid,f.contractor)).statusCode,404);
  const file=await privateFile(f,'support/'+esid+'/uploads',f.cm);await caseCommand(f,esid,'evidence',{explanation:'Estate account evidence',fileIds:[file]},f.cm);assert.equal((await f.get('files/'+file,f.peer)).statusCode,200);
  assert.equal((await f.db.query('SELECT id FROM job_records')).length,0);assert.equal((await f.db.query('SELECT id FROM fee_entries')).length,0);assert.equal((await f.db.query('SELECT id FROM financial_confirmations')).length,0);
}));
test('A quoting Contractor’s support directory/case cannot reveal rival identities, prices or evidence recipients',()=>scenario(async f=>{
  const {id}=await offered(f),[rival]=await f.db.query("SELECT m.organisation_id,m.user_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.email='completionrival@example.test'");
  await f.db.query("INSERT INTO contractor_profiles VALUES($1,'Fictional rival contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[rival!.organisation_id,f.now().toISOString()]);
  const [quote]=await f.db.query('SELECT v.terms FROM quote_versions v JOIN quotes q ON q.id=v.quote_id WHERE q.job_id=$1 LIMIT 1',[id]);
  f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:quote!.terms},f.rival));
  const subjects=f.okay(await f.get('workspaces/'+id+'/support-subjects',f.rival));assert.doesNotMatch(JSON.stringify(subjects),/Fictional Pending Contractor/);assert.ok(subjects.filter((s:Record<string,unknown>)=>s.kind==='organisation').every((s:Record<string,unknown>)=>s.id===rival!.organisation_id));
  const sid=await openCase(f,id,'quote_scope',f.rival,{description:'My sealed price and commercial context'});assert.equal((await f.get('support/'+sid,f.contractor)).statusCode,404);assert.doesNotMatch((await f.get('workspaces/'+id+'/cases',f.contractor)).body,/sealed price/);
  const d=f.okay(await f.get('support/'+sid,f.admin));assert.equal((await f.post('support/'+sid+'/request-evidence',{request:'Only the actual company responds',respondingRole:'contractor',respondingUserId:ids.contractor},f.admin,d.case.version)).statusCode,422);
  await caseCommand(f,sid,'request-evidence',{request:'Actual bidder supplies its own evidence',respondingRole:'contractor',respondingUserId:rival!.user_id});
}));
