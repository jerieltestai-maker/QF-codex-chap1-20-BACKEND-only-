import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {feedbackDue} from '../packages/domain/feedback-core.js';

test('CH15: feedback calendar arithmetic retains precision across month/year boundaries',()=>{
  assert.equal(feedbackDue('2026-11-02','date').toISOString(),'2026-12-02T01:00:00.000Z');
  assert.equal(feedbackDue('2026-12-15','date').toISOString(),'2027-01-14T01:00:00.000Z');
  assert.equal(feedbackDue('2026-11-02T05:23:01Z','instant').toISOString(),'2026-12-02T05:23:01.000Z');
});

test('Chapter 15: due-only durability, response clocks, corrections and aftercare',async t=>{
  const f=await completionFixture();const start=()=>f.setNow(new Date('2026-11-02T04:00:00Z'));
  const feedback=async(id:string,c=f.cm)=>f.okay(await f.get('workspaces/'+id+'/feedback',c));
  const send=async(id:string,body:unknown,c=f.cm,key=randomUUID(),v?:number)=>f.post('workspaces/'+id+'/feedback/submit',body,c,v??(await f.detail(id,c)).version,key);
  async function settled(precision='date') {
    start();const id=await f.prepared();await f.transfer(id);const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
    await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:precision==='date'?'2026-11-02':f.now().toISOString(),confirmed:true},f.contractor);return id;
  }
  const rated=(v:number,extra:Record<string,unknown>={})=>({obligationVersion:v,outcome:'rated',rating:5,observation:'Still working as intended.',confirmed:true,...extra});
  try {
    await t.test('CH15-T01: partial receipt never schedules a full-settlement observation',async()=>{
      start();const id=await f.prepared();await f.transfer(id,{amountSgd:'40.00',rationale:'Part payment'});
      const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
      await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'40.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      assert.equal((await feedback(id)).obligation,null);
      assert.equal((await send(id,rated(1))).statusCode,409);
    });
    await t.test('CH15-T02/T03/T04: actual date-only anchor, exact due boundary, Closed unchanged and inherited MCST authority',async()=>{
      const id=await settled(),initial=await feedback(id);assert.equal(initial.stage,'Closed');assert.equal(initial.obligation.status,'scheduled');
      assert.equal(initial.obligation.due_at,'2026-12-02T01:00:00.000Z');assert.equal(initial.canSubmit,false);
      f.setNow(new Date('2026-12-02T00:59:59.999Z'));assert.equal((await feedback(id)).canSubmit,false);assert.equal((await send(id,rated(1))).statusCode,409);
      f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id);assert.equal(due.canSubmit,true);assert.equal(due.stage,'Closed');
      const key=randomUUID(),v=(await f.detail(id)).version,body=rated(due.obligation.version);
      const response=f.okay(await send(id,body,f.mcst,key,v));assert.deepEqual(f.okay(await send(id,body,f.mcst,key,v)),response);
      assert.equal((await feedback(id)).stage,'Closed');assert.equal((await feedback(id)).obligation.status,'submitted');
      assert.equal((await send(id,body)).statusCode,409);
      const [entry]=await f.db.query('SELECT actor_role FROM reputation_entry_versions WHERE entry_id=$1',[response.entryId]);assert.equal(entry!.actor_role,'mcst');
    });
    await t.test('CH15-T02: assumed settlement uses first successful receipt notice plus 7 days, then 30 days',async()=>{
      start();const id=await f.prepared();await f.transfer(id);
      await f.worker.tick(1000);const [transfer]=await f.db.query('SELECT * FROM payment_transfers WHERE job_id=$1',[id]);
      const due=new Date(new Date(transfer!.first_issued_at as string).getTime()+37*86400000);
      f.setNow(new Date(new Date(transfer!.first_issued_at as string).getTime()+7*86400000));await f.worker.tick(1000);
      assert.equal((await feedback(id)).obligation.due_at,due.toISOString());
    });
    await t.test('CH15-T03/T06: late-discovered due task issues now; 2/5 BD runs from durable notice and stops on Unable',async()=>{
      const id=await settled();f.setNow(new Date('2026-12-08T04:00:00Z'));const due=await feedback(id);
      assert.equal(due.obligation.due_at,'2026-12-02T01:00:00.000Z');assert.equal(due.obligation.first_issued_at,null);
      await f.worker.tick(2000);const issued=await feedback(id);assert.equal(issued.obligation.first_issued_at,'2026-12-08T04:00:00.000Z');
      const timers=await f.db.query('SELECT rule,due_at,anchor_at FROM timer_jobs WHERE task_id=$1 ORDER BY due_at',[issued.obligation.task_id]);
      assert.equal(timers.length,2);assert.equal(new Date(timers[0]!.due_at as string).toISOString(),'2026-12-10T15:59:00.000Z');
      assert.ok(timers.every(t=>new Date(t.anchor_at as string).toISOString()==='2026-12-08T04:00:00.000Z'));
      f.okay(await send(id,{obligationVersion:due.obligation.version,outcome:'unable',observation:'The plant room has been inaccessible.',confirmed:true}));
      assert.equal((await feedback(id)).obligation.status,'submitted');
      assert.equal((await f.db.query("SELECT id FROM timer_jobs WHERE task_id=$1 AND status='pending'",[issued.obligation.task_id])).length,0);
      const [e]=await f.db.query("SELECT facts FROM reputation_entry_versions v JOIN reputation_entries e ON e.id=v.entry_id WHERE e.job_id=$1 AND e.kind='durability'",[id]);assert.equal((e!.facts as Record<string,unknown>).rating,undefined);
    });
    await t.test('CH15-T05/T07: positive/negative require real observations; low rating alone has no repair or financial side effects',async()=>{
      const id=await settled();f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id);
      for(const rating of [1,3,4,5])assert.equal((await send(id,rated(due.obligation.version,{rating,observation:' \n '}))).statusCode,422);
      assert.equal((await send(id,rated(due.obligation.version,{rating:0}))).statusCode,422);
      assert.equal((await send(id,rated(due.obligation.version),f.contractor)).statusCode,403);
      assert.equal((await f.get('workspaces/'+id+'/feedback',f.rival)).statusCode,404);
      f.okay(await send(id,rated(due.obligation.version,{rating:2,observation:'The same leak returned.'})));
      assert.equal((await f.db.query('SELECT id FROM aftercare_cases WHERE job_id=$1',[id])).length,0);
      assert.equal((await f.db.query('SELECT * FROM billing_sources WHERE job_id=$1',[id])).length,1);
      assert.equal((await f.detail(id)).stage,'Closed');
    });
    await t.test('CH15-T06: no response escalates; silence produces no entry and Admin follow-up remains dated',async()=>{
      const id=await settled();f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id);await f.worker.tick(2000);
      f.setNow(new Date('2026-12-09T16:00:00Z'));await f.worker.tick(2000);
      const [task]=await f.db.query("SELECT * FROM tasks WHERE resource_id=$1 AND kind='response.escalation' AND status='open'",[due.obligation.task_id]);assert.ok(task);
      assert.equal((await f.db.query("SELECT id FROM reputation_entries WHERE job_id=$1 AND kind='durability'",[id])).length,0);
      f.okay(await f.post('admin/attention/'+task!.id+'/acknowledge',{nextAction:'Contact the responsible CM',followUpAt:'2026-12-11T04:00:00Z'},f.admin,Number(task!.version)));
      const [timer]=await f.db.query("SELECT rule,status FROM timer_jobs WHERE task_id=$1 AND status='pending'",[task!.id]);assert.equal(timer!.rule,'T11');
    });
    await t.test('CH15-T08: physical aftercare requires fresh same-round inspection; no repeated invoice/fee/payment cycle',async()=>{
      const id=await settled(),before=await f.detail(id),originalCounts=await f.db.query('SELECT COUNT(*) AS n FROM invoice_versions WHERE job_id=$1',[id]);
      const financialRecords=()=>f.db.query('SELECT (SELECT COUNT(*) FROM financial_confirmations WHERE job_id=$1) AS confirmations,(SELECT COUNT(*) FROM fee_entries WHERE job_id=$1) AS fees,(SELECT COUNT(*) FROM payment_transfers WHERE job_id=$1) AS transfers',[id]),originalFinancial=await financialRecords();
      const request=await f.cmd(id,'aftercare/request',{concern:'Leak returned',requestedHelp:'Inspect and repair if appropriate',evidenceIds:[]},f.cm),caseId=request.caseId;
      assert.equal((await f.detail(id)).stage,'Closed');
      await f.cmd(id,'aftercare/decide',{caseId,outcome:'physical_remedy',reason:'Physical correction agreed',executionEvidence:'Offline findings reviewed'},f.admin);
      const remedy=await f.cmd(id,'aftercare/remedy',{caseId,description:'Replaced leaking seal',evidenceIds:[],completedAt:f.now().toISOString(),confirmed:true},f.contractor);assert.equal(remedy.round,2);
      const resolve={caseId,outcome:'resolved',reason:'Physical correction complete',executionEvidence:'Matched inspection'};
      assert.equal((await f.post('workspaces/'+id+'/aftercare/decide',resolve,f.admin,(await f.detail(id)).version)).statusCode,409);
      await f.cmd(id,'aftercare/inspect',{caseId,round:2,outcome:'unsatisfactory',findings:'Still drips',scopeReviewed:true,evidenceReviewed:true,confirmed:true},f.cm);
      const next=await f.cmd(id,'aftercare/remedy',{caseId,description:'Corrected the remaining leak',evidenceIds:[],completedAt:f.now().toISOString(),confirmed:true},f.contractor);assert.equal(next.round,3);
      assert.equal((await f.post('workspaces/'+id+'/aftercare/inspect',{caseId,round:2,outcome:'accepted',findings:'',scopeReviewed:true,evidenceReviewed:true,confirmed:true},f.cm,(await f.detail(id)).version)).statusCode,412);
      await f.cmd(id,'aftercare/inspect',{caseId,round:3,outcome:'accepted',findings:'No leak observed',scopeReviewed:true,evidenceReviewed:true,confirmed:true},f.mcst);
      await f.cmd(id,'aftercare/decide',resolve,f.admin);
      assert.equal((await feedback(id)).cases[0].status,'resolved');assert.equal((await f.detail(id)).completion.round,before.completion.round);
      assert.deepEqual(await f.db.query('SELECT COUNT(*) AS n FROM invoice_versions WHERE job_id=$1',[id]),originalCounts);
      assert.deepEqual(await financialRecords(),originalFinancial);
      assert.equal((await f.db.query('SELECT * FROM billing_sources WHERE job_id=$1',[id])).length,1);assert.equal((await f.detail(id)).stage,'Closed');
      assert.equal((await f.db.query('SELECT * FROM inspections WHERE job_id=$1',[id])).length,3);
    });
    await t.test('CH15-T10: assumed-to-actual correction reschedules pending only and preserves completed observation time/history',async()=>{
      start();const id=await f.prepared();await f.transfer(id);await f.worker.tick(2000);
      f.setNow(new Date('2026-11-09T04:00:00Z'));await f.worker.tick(2000);const old=await feedback(id);
      const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
      await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      const revised=await feedback(id);assert.notEqual(revised.obligation.version,old.obligation.version);assert.equal(revised.obligation.due_at,'2026-12-02T01:00:00.000Z');
      f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id);f.okay(await send(id,rated(due.obligation.version)));
      const [entry]=await f.db.query('SELECT v.* FROM reputation_entry_versions v JOIN reputation_entries e ON e.id=v.entry_id WHERE e.job_id=$1',[id]);
      await f.db.query("UPDATE settlement_anchors SET settled_at='2026-11-03' WHERE job_id=$1",[id]);await feedback(id);await feedback(id);
      const entries=await f.db.query('SELECT v.* FROM reputation_entry_versions v JOIN reputation_entries e ON e.id=v.entry_id WHERE e.job_id=$1',[id]);assert.equal(entries.length,1);assert.deepEqual(entries[0],entry);
      assert.equal((await f.db.query("SELECT * FROM feedback_events WHERE job_id=$1 AND kind='feedback.completed-anchor-corrected'",[id])).length,1);
      const original=await feedback(id);f.setNow(new Date('2026-12-03T04:00:00Z'));
      await f.cmd(id,'feedback/correct',{entryVersion:1,outcome:'rated',rating:4,observation:'Corrected description of the same observation.',correctionReason:'An earlier wording error',confirmed:true},f.cm);
      const corrected=await feedback(id),versions=await f.db.query('SELECT v.* FROM reputation_entry_versions v JOIN reputation_entries e ON e.id=v.entry_id WHERE e.job_id=$1 ORDER BY v.version',[id]);
      assert.equal(versions.length,2);assert.equal(corrected.obligation.submitted_at,original.obligation.submitted_at);assert.equal(new Date(versions[0]!.observed_at as string).toISOString(),new Date(versions[1]!.observed_at as string).toISOString());
      assert.notEqual(new Date(versions[0]!.recorded_at as string).toISOString(),new Date(versions[1]!.recorded_at as string).toISOString());assert.equal(corrected.entries.length,1);
    });
    await t.test('CH15-T03/T10: failed due notice cannot start response clocks; retries, competing submissions and operation recovery are safe',async()=>{
      const id=await settled();f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id);
      await f.db.query("UPDATE memberships SET active=false WHERE role='cm' AND estate_id=(SELECT estate_id FROM job_records WHERE id=$1)",[id]);
      await f.worker.tick(2000);
      const [unissued]=await f.db.query('SELECT first_issued_at FROM tasks WHERE id=$1',[due.obligation.task_id]);assert.equal(unissued!.first_issued_at,null);
      assert.equal((await f.db.query('SELECT id FROM timer_jobs WHERE task_id=$1',[due.obligation.task_id])).length,0);
      await f.db.query("UPDATE memberships SET active=true WHERE role='cm' AND estate_id=(SELECT estate_id FROM job_records WHERE id=$1)",[id]);
      f.setNow(new Date('2026-12-02T01:01:00Z'));await f.worker.tick(2000);
      const ready=await feedback(id);assert.equal(ready.obligation.first_issued_at,'2026-12-02T01:01:00.000Z');
      const version=(await f.detail(id)).version,key=randomUUID(),body=rated(ready.obligation.version);
      const replies=await Promise.all([send(id,body,f.cm,key,version),send(id,body,f.mcst,randomUUID(),version)]);
      assert.equal(replies.filter(r=>r.statusCode===200).length,1);assert.ok(replies.some(r=>[409,412].includes(r.statusCode)));
      if(replies[0]!.statusCode===200)assert.deepEqual(f.okay(await f.get('operations/'+key,f.cm)),replies[0]!.json());
      assert.equal((await f.db.query("SELECT id FROM reputation_entries WHERE job_id=$1 AND kind='durability'",[id])).length,1);
    });
    await t.test('CH15 atomicity: failed durable evidence insert leaves no submission, audit, task completion or idempotency receipt',async()=>{
      const id=await settled();f.setNow(new Date('2026-12-02T01:00:00Z'));const due=await feedback(id),key=randomUUID();
      await f.db.exec("CREATE FUNCTION reject_feedback_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected durable write failure'; END; $$; CREATE TRIGGER reject_feedback_test BEFORE INSERT ON reputation_entry_versions FOR EACH ROW EXECUTE FUNCTION reject_feedback_test();");
      const version=(await f.detail(id)).version,body=rated(due.obligation.version),failed=await send(id,body,f.cm,key,version);assert.equal(failed.statusCode,500);
      await f.db.exec('DROP TRIGGER reject_feedback_test ON reputation_entry_versions; DROP FUNCTION reject_feedback_test();');
      assert.equal((await feedback(id)).obligation.status,'due');assert.equal((await f.db.query('SELECT id FROM reputation_entries WHERE job_id=$1',[id])).length,0);
      assert.equal((await f.db.query('SELECT operation_id FROM command_receipts WHERE operation_id=$1',[key])).length,0);
      const [task]=await f.db.query('SELECT status FROM tasks WHERE id=$1',[due.obligation.task_id]);assert.equal(task!.status,'open');
      f.okay(await send(id,body,f.cm,key,version));
    });
  } finally {await f.close();}
});
