import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {businessDayDue,loadCalendar} from '../packages/domain/calendar.js';

test('Chapters 11/12 adversarial audit: missing paths and exact verification assertions',async t=>{
  const f=await completionFixture(),{db,worker,cm,mcst,contractor,admin,peer,rival,post,get,okay,detail,cmd,job,file,complete,inspect,confirm,prepared,transfer}=f;
  try {
    await t.test('CH11-T06/T09: scope changed before inspection permits a fresh physical round and suppresses obsolete review; actual old-review race cannot pass',async()=>{
      const id=await job();await complete(id);
      const v=await cmd(id,'variations',{kind:'scope_price',confirmed:true,proposal:{scope:'Repair valve and newly agreed joint',newTotalSgd:'100.00',reason:'New physical scope',timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},contractor);
      await cmd(id,'variations/decide',{variationId:v.variationId,proposalVersion:v.proposalVersion,outcome:'approved',confirmed:true},cm);
      assert.equal((await detail(id)).stage,'Addressing issues');
      assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.inspect' AND status='open'",[id])).length,0);
      await complete(id,{originatingRound:1,explanation:'Completed the newly authorised joint'});await inspect(id,'unsatisfactory');
      let d=await detail(id);assert.equal(d.rounds[0].outcome,null);assert.equal(d.rounds[1].findings,'Valve leaks');assert.equal(d.completion.accepted_round,null);
      const invoice=await file(id,'invoice');d=await detail(id);
      const review={round:2,outcome:'accepted',checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:'',satisfactory:true,confirmed:true};
      const results=await Promise.all([
        post('workspaces/'+id+'/completion/submit',{invoiceFileId:invoice,amountSgd:'100.00',completedAt:f.now().toISOString(),confirmed:true,originatingRound:2,explanation:'Further physical correction'},contractor,d.version),
        post('workspaces/'+id+'/completion/inspect',review,cm,d.version)
      ]);
      assert.equal(results[0]!.statusCode,200,results[0]!.body);assert.ok([409,412].includes(results[1]!.statusCode));
      d=await detail(id);assert.equal(d.completion.round,3);assert.equal(d.completion.accepted_round,null);assert.equal(d.rounds[2].originating_round,2);
      assert.equal(d.rounds[1].findings,'Valve leaks');
      assert.equal((await db.query('SELECT * FROM inspections WHERE job_id=$1',[id])).length,1);
    });
    await t.test('CH12-T07: receipt first at exact deadline commits actual receipt without an assumption; issue first excludes the transfer',async()=>{
      for(const kind of ['receipt','issue']) {
        const id=await prepared();await transfer(id);await worker.tick(500);const d=await detail(id,contractor),p=d.transfers[0];
        f.setNow(new Date(p.receipt_due_at));
        const body=kind==='receipt'?{transferId:p.id,amountSgd:'100.00',receiptDate:f.now().toISOString(),confirmed:true}:{transferId:p.id,description:'Credit missing at the response deadline'};
        okay(await post('workspaces/'+id+'/payments/'+kind,body,contractor,d.version));await worker.tick(500);
        const latest=await detail(id);assert.equal(latest.transfers[0].status,kind==='receipt'?'actual':'disputed');
        assert.equal((await db.query("SELECT id FROM payment_events WHERE job_id=$1 AND kind='receipt.assumed'",[id])).length,0);
        assert.equal(latest.balances.receivedCents,kind==='receipt'?'10000':'0');
      }
    });
    await t.test('CH12-T07: worker first makes stale receipt review fail; a refreshed post-assumption issue preserves history and reverses settlement',async()=>{
      const id=await prepared();await transfer(id);await worker.tick(500);const d=await detail(id,contractor),p=d.transfers[0];f.setNow(new Date(p.receipt_due_at));await worker.tick(500);
      const body={transferId:p.id,description:'Assumed receipt is incorrect'};
      assert.equal((await post('workspaces/'+id+'/payments/issue',body,contractor,d.version)).statusCode,412);
      await cmd(id,'payments/issue',body,contractor);const latest=await detail(id);
      assert.equal(latest.transfers[0].status,'disputed');assert.equal(latest.balances.receivedCents,'0');assert.equal(latest.stage,'Admin Intervention');
      assert.equal(latest.events.filter((e:Record<string,unknown>)=>e.kind==='receipt.assumed').length,1);
    });
    await t.test('CH11-T05/CH12-T09: no-transfer unpaid balance case is available, reused and blocks closure; exact accepted second round is reused on verified resolution',async()=>{
      const id=await job();await complete(id);await inspect(id,'unsatisfactory');await complete(id,{originatingRound:1,explanation:'Replaced failed seal'});await inspect(id);await confirm(id);
      await cmd(id,'payments/issue',{description:'Payment has not been sent'},contractor);await cmd(id,'payments/issue',{description:'The same unpaid balance remains outstanding'},contractor);
      const d=await detail(id,admin);assert.equal(d.balanceIssues.length,1);assert.equal(d.transfers.length,0);const support=d.balanceIssues[0].id;
      const verdict={supportId:support,reason:'Payment obligations verified',executionEvidence:'Bank/receipt facts checked against confirmed invoice'};
      assert.equal((await post('workspaces/'+id+'/payments/resolve-balance',verdict,admin,d.version)).statusCode,409);
      await transfer(id);await worker.tick(500);const p=(await detail(id)).transfers[0];await cmd(id,'payments/receipt',{transferId:p.id,amountSgd:'100.00',receiptDate:f.now().toISOString(),confirmed:true},contractor);
      assert.equal((await detail(id)).stage,'Admin Intervention');
      await cmd(id,'payments/resolve-balance',verdict,admin);const latest=await detail(id);assert.equal(latest.stage,'Closed');assert.equal(latest.completion.accepted_round,2);
      assert.equal(latest.rounds.length,2);assert.equal((await db.query('SELECT * FROM inspections WHERE job_id=$1',[id])).length,2);
      assert.equal(latest.events.find((e:Record<string,unknown>)=>e.kind==='payment.balance-resolved').details.acceptedRound,2);
      assert.equal((await get('workspaces/'+id+'/completion',rival)).statusCode,404);
    });
    await t.test('CH11-T01/T02/T04/T10: optional fields really optional; ready invoice required; ready optional evidence is linked; failed inspection notices start no timer',async()=>{
      const id=await job(),unready=await file(id,'invoice',false),v=(await detail(id)).version;
      const body={invoiceFileId:unready,amountSgd:'100.00',completedAt:f.now().toISOString(),confirmed:true};
      const invalid=await post('workspaces/'+id+'/completion/submit',body,contractor,v);assert.equal(invalid.statusCode,422);assert.equal(invalid.json().error.code,'FILE_NOT_READY');
      const noInvoice={amountSgd:'100.00',completedAt:f.now().toISOString(),confirmed:true};assert.equal((await post('workspaces/'+id+'/completion/submit',noInvoice,contractor,v)).statusCode,422);
      const invoice=await file(id,'invoice');assert.equal((await detail(id)).completion,null);assert.equal((await db.query("SELECT id FROM tasks WHERE resource_id=$1 AND kind='completion.inspect'",[id])).length,0);
      await db.query('UPDATE memberships SET active=false WHERE user_id IN ($1,$2)',[ids.cm,ids.cm2]);
      okay(await post('workspaces/'+id+'/completion/submit',{...body,invoiceFileId:invoice},contractor,v));await worker.tick(500);
      const [task]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='completion.inspect' AND status='open'",[id]);assert.equal(task!.first_issued_at,null);
      assert.equal((await db.query('SELECT id FROM timer_jobs WHERE task_id=$1',[task!.id])).length,0);
      await db.query('UPDATE memberships SET active=true WHERE user_id IN ($1,$2)',[ids.cm,ids.cm2]);f.setNow(new Date(f.now().getTime()+2000));await worker.tick(500);
      const [issued]=await db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[task!.id]),calendar=await loadCalendar(db);
      const dates=await db.query('SELECT due_at FROM timer_jobs WHERE task_id=$1 ORDER BY due_at',[task!.id]);
      assert.equal(new Date(dates[0]!.due_at as string).toISOString(),businessDayDue(new Date(issued!.first_issued_at as string),2,calendar).toISOString());
      assert.equal(new Date(dates[1]!.due_at as string).toISOString(),businessDayDue(new Date(issued!.first_issued_at as string),5,calendar).toISOString());
      await inspect(id,'unsatisfactory');const photo=await file(id,'evidence');await complete(id,{originatingRound:1,explanation:'Corrected physical repair with optional evidence',evidenceIds:[photo]});await inspect(id);
      const d=await detail(id);assert.deepEqual(d.rounds[1].evidence_ids,[photo]);assert.equal(d.completion.accepted_round,2);assert.equal((await get('files/'+photo,mcst)).statusCode,200);assert.equal((await get('files/'+photo,rival)).statusCode,404);
      assert.ok(!JSON.stringify(d).includes('reputationScore'));
    });
    await t.test('CH12-T01/T02/T03/T08: CM transfer denied, stale invoice/amount refused, provisional proof refused; optional reference omitted and recovered receipt rechecks authority',async()=>{
      const id=await prepared(),proof=await file(id,'payment_proof'),d=await detail(id,mcst);
      const body={invoiceVersion:1,proofId:proof,amountSgd:'100.00',transferDate:f.now().toISOString(),completedTransfer:true,confirmed:true};
      assert.equal((await post('workspaces/'+id+'/payments/transfer',body,cm,d.version)).statusCode,403);
      assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,invoiceVersion:2},mcst,d.version)).statusCode,412);
      assert.equal((await post('workspaces/'+id+'/payments/transfer',body,mcst,d.version-1)).statusCode,412);
      for(const amount of ['0.00','101.00','100.001','-1.00'])assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,amountSgd:amount},mcst,d.version)).statusCode,422);
      assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,completedTransfer:false},mcst,d.version)).statusCode,422);
      const unready=await file(id,'payment_proof',false);assert.equal((await post('workspaces/'+id+'/payments/transfer',{...body,proofId:unready},mcst,d.version)).statusCode,422);
      const key=randomUUID();okay(await post('workspaces/'+id+'/payments/transfer',body,mcst,d.version,key));assert.equal((await detail(id)).transfers[0].reference,'');
      assert.equal(okay(await get('operations/'+key,mcst)).jobId,id);
      await db.query('UPDATE memberships SET active=false WHERE user_id=$1',[ids.mcst]);const revoked=await get('operations/'+key,mcst);assert.ok([401,403,404].includes(revoked.statusCode));
      await db.query('UPDATE memberships SET active=true WHERE user_id=$1',[ids.mcst]);
      assert.equal((await get('files/'+proof,rival)).statusCode,404);
    });
    await t.test('CH12-T05/T11: replacement progress date supersedes its old timer without changing original chase; new device/read cannot reset receipt window',async()=>{
      const id=await prepared(),initial=await detail(id,mcst),first=new Date(f.now().getTime()+2*86400000),second=new Date(f.now().getTime()+4*86400000);
      await cmd(id,'payments/progress',{explanation:'Awaiting paperwork',nextUpdateAt:first.toISOString()},mcst);
      await cmd(id,'payments/progress',{explanation:'Paperwork review update',nextUpdateAt:second.toISOString()},peer);
      const [task]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='payment.follow-up.admin' AND status='open'",[id]);
      const timers=await db.query("SELECT * FROM timer_jobs WHERE task_id=$1 AND rule='T11' AND status='pending'",[task!.id]);assert.equal(timers.length,1);assert.equal(new Date(timers[0]!.due_at as string).toISOString(),second.toISOString());
      let d=await detail(id,mcst);assert.equal(d.followUp.oneBusinessDay,initial.followUp.oneBusinessDay);assert.equal(d.followUp.nextDueAt,second.toISOString());assert.equal(d.balances.unsentCents,'10000');assert.equal(d.transfers.length,0);
      await transfer(id,{amountSgd:'40.00',rationale:'Partial with remaining paperwork'});await worker.tick(500);d=await detail(id,contractor);const due=d.transfers[0].receipt_due_at;
      const device=await f.login('contractor@example.test');assert.equal((await detail(id,device)).transfers[0].receipt_due_at,due);
      await worker.tick(500);assert.equal((await detail(id,device)).transfers[0].receipt_due_at,due);assert.equal((await detail(id,cm)).followUp,null);
    });
    await t.test('CH12-T06/T12: instalments have distinct notice windows; actual date precision and assumed popup are retained without double settlement',async()=>{
      const id=await prepared();await transfer(id,{amountSgd:'40.00',rationale:'First instalment'});await worker.tick(500);let d=await detail(id),first=d.transfers[0];
      f.setNow(new Date(f.now().getTime()+86400000));await transfer(id,{amountSgd:'60.00'});await worker.tick(500);d=await detail(id);const second=d.transfers[1];assert.notEqual(first.receipt_due_at,second.receipt_due_at);
      await cmd(id,'payments/receipt',{transferId:first.id,amountSgd:'40.00',receiptDate:first.transfer_date.slice(0,10),confirmed:true},contractor);
      f.setNow(new Date(first.receipt_due_at));await worker.tick(500);assert.equal((await detail(id)).transfers[1].status,'pending');
      f.setNow(new Date(second.receipt_due_at));await worker.tick(500);d=await detail(id,contractor);assert.equal(d.balances.receivedCents,'10000');assert.equal(d.stage,'Closed');assert.equal(d.transfers[1].showAssumedPopup,true);
      const stamp=d.transfers[1].receipt_date;await cmd(id,'payments/understood',{transferId:second.id},contractor);d=await detail(id,contractor);assert.equal(d.transfers[1].receipt_date,stamp);assert.equal(d.transfers[1].status,'assumed');assert.equal(d.transfers[1].showAssumedPopup,false);
      const actual=new Date(f.now().getTime()-3600000).toISOString();await cmd(id,'payments/receipt',{transferId:second.id,amountSgd:'60.00',receiptDate:actual,confirmed:true},contractor);
      d=await detail(id);assert.equal(d.settlementAnchor.settled_at,actual);assert.equal(d.settlementAnchor.precision,'instant');assert.equal(d.balances.receivedCents,'10000');
      assert.equal((await db.query("SELECT * FROM closure_events WHERE job_id=$1 AND kind='closed'",[id])).length,1);
    });
    await t.test('CH11-T07/T22: one-cent mismatch still blocks; invoice correction that remains different creates a fresh response task and keeps immutable acceptance',async()=>{
      const id=await job();await complete(id);await inspect(id);
      await cmd(id,'completion/invoice',{invoiceVersion:1,invoiceFileId:await file(id,'invoice'),amountSgd:'100.01',explanation:'One cent discrepancy'},contractor);await worker.tick(500);
      const [old]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='completion.invoice' AND status='open'",[id]);
      await cmd(id,'completion/invoice',{invoiceVersion:2,invoiceFileId:await file(id,'invoice'),amountSgd:'100.02',explanation:'Further explicit correction still requiring reconciliation'},contractor);await worker.tick(500);
      const [fresh]=await db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='completion.invoice' AND status='open'",[id]);assert.notEqual(old!.id,fresh!.id);assert.equal(fresh!.required_version,3);
      const d=await detail(id);assert.equal(d.completion.accepted_round,1);assert.equal(d.invoices.length,3);
      assert.equal((await post('workspaces/'+id+'/payments/confirm-invoice',{invoiceVersion:3,amountSgd:'100.02',confirmed:true},mcst,d.version)).statusCode,409);
    });
  }finally{await f.close();}
});
