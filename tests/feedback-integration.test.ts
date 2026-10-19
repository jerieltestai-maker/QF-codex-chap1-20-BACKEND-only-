import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completionFixture,type Client} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';

test('Chapters 14/15: real cancellation settlements and shared aftercare support invariants',async t=>{
  const f=await completionFixture();
  const feedback=async(id:string)=>f.okay(await f.get('workspaces/'+id+'/feedback',f.cm));
  async function support(sid:string,path:string,body:unknown,c:Client=f.admin) {
    const detail=f.okay(await f.get('support/'+sid,c));return f.okay(await f.post('support/'+sid+'/'+path,body,c,detail.case.version));
  }
  async function cancelZero(startWork:boolean) {
    const id=await f.job('100.00',startWork),c=await f.cmd(id,'cancel',{reason:'Stop ordinary work',confirmed:true},f.cm);await f.worker.tick(2000);
    const claim=await f.cmd(id,'cancellation/respond',{cancellationId:c.cancellationId,outcome:'claim',description:'Review completed work and actual payable costs'},f.contractor);
    const proposal=await support(claim.supportId,'settlements',{amountSgd:'0.00',reason:'Confirmed no payable amount'});
    await support(claim.supportId,'confirm-settlement',{proposalId:proposal.proposalId,proposalVersion:proposal.proposalVersion,amountSgd:'0.00',confirmed:true,financialOverride:false,reason:'MCST confirms the exact zero outcome'},f.mcst);
    return id;
  }
  try {
    await t.test('CH15-T09: authorised but unstarted cancellation with confirmed zero creates no durability assessment or fake transfer',async()=>{
      const id=await cancelZero(false);await f.worker.tick(2000);
      assert.equal((await feedback(id)).obligation,null);assert.equal((await f.detail(id)).transfers.length,0);assert.equal((await f.db.query('SELECT * FROM settlement_anchors WHERE job_id=$1',[id])).length,0);
    });
    await t.test('CH15-T09: recorded performed work with exact zero cancellation settlement supplies the authorised 30-day anchor without a transfer',async()=>{
      const id=await cancelZero(true),data=await feedback(id);assert.equal(data.obligation.anchor.source,'cancelled performed-work settlement');
      assert.equal(data.obligation.due_at,'2026-12-02T04:00:00.000Z');assert.equal((await f.detail(id)).transfers.length,0);
      f.setNow(new Date('2026-12-02T04:00:00Z'));const due=await feedback(id);assert.equal(due.canSubmit,true);
      await f.cmd(id,'feedback/submit',{obligationVersion:due.obligation.version,outcome:'unable',observation:'The partially performed item cannot be assessed as a repair.',confirmed:true},f.mcst);
      assert.equal((await feedback(id)).obligation.status,'submitted');assert.equal((await f.detail(id)).stage,'Admin Intervention');
    });
    await t.test('CH15-T08: aftercare appears in shared support with evidence/follow-up; generic verdicts cannot bypass physical inspection',async()=>{
      f.setNow(new Date('2026-11-02T04:00:00Z'));const id=await f.prepared();await f.transfer(id);
      const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      const request=await f.cmd(id,'aftercare/request',{concern:'Recurrence observed',requestedHelp:'Inspect the recurring fault',evidenceIds:[]},f.cm),sid=request.caseId;
      const admin=f.okay(await f.get('support/'+sid,f.admin));assert.equal(admin.case.blocking,false);assert.equal(admin.case.category,'quality_remedy');assert.equal((await f.get('support/'+sid,f.contractor)).statusCode,200);
      assert.equal((await f.post('support/'+sid+'/resolve',{outcome:'Claimed complete',reason:'No new inspection',obligations:[]},f.admin,admin.case.version)).statusCode,409);
      assert.equal((await f.post('support/'+sid+'/finish',{reason:'Bypass attempt'},f.admin,admin.case.version)).statusCode,409);
      await support(sid,'follow-up',{nextAction:'Review the concern with Contractor',followUpAt:'2026-11-04T04:00:00Z'});
      await f.cmd(id,'aftercare/decide',{caseId:sid,outcome:'physical_remedy',reason:'Physical correction required',executionEvidence:'Findings reviewed'},f.admin);
      await f.cmd(id,'aftercare/remedy',{caseId:sid,description:'Physical correction completed',evidenceIds:[],completedAt:f.now().toISOString(),confirmed:true},f.contractor);
      await f.cmd(id,'aftercare/inspect',{caseId:sid,round:2,outcome:'accepted',findings:'Accepted corrected work',scopeReviewed:true,evidenceReviewed:true,confirmed:true},f.cm);
      await f.cmd(id,'aftercare/decide',{caseId:sid,outcome:'resolved',reason:'Verified same accepted round',executionEvidence:'Inspection 2 accepted'},f.admin);
      const resolved=f.okay(await f.get('support/'+sid,f.admin));assert.equal(resolved.case.state,'resolved');assert.ok(resolved.events.some((e:{kind:string})=>e.kind==='aftercare.inspected'));assert.equal((await f.detail(id)).stage,'Closed');
      // A later generic repair must allocate after all retained aftercare rounds, without reissuing an invoice.
      const later=f.okay(await f.post('workspaces/'+id+'/cases',{description:'A separately reviewed later concern',category:'quality_remedy',privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[]},f.cm,(await f.detail(id)).version));
      await support(later.supportId,'resolve',{outcome:'A distinct correction is required',reason:'New findings',obligations:[{kind:'repair',ownerRole:'contractor',description:'Correct the distinct later fault',followUpAt:'2026-11-05T04:00:00Z'}]});
      const state=f.okay(await f.get('support/'+later.supportId,f.contractor)),obligation=state.obligations.find((o:{kind:string})=>o.kind==='repair');
      const repair=await support(later.supportId,'repair',{obligationId:obligation.id,completedAt:f.now().toISOString(),explanation:'Distinct later fault corrected',evidenceIds:[],confirmed:true},f.contractor);assert.equal(repair.round,3);
      assert.equal((await f.db.query('SELECT * FROM invoice_versions WHERE job_id=$1',[id])).length,1);
    });
    await t.test('Owner late-observation rule: February submission retains December due time and true February observation; no first-month fault percentage',async()=>{
      f.setNow(new Date('2026-11-02T04:00:00Z'));const id=await f.prepared();await f.transfer(id);const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
      await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      f.setNow(new Date('2027-02-01T04:00:00Z'));const due=await feedback(id);
      const submitted=await f.cmd(id,'feedback/submit',{obligationVersion:due.obligation.version,outcome:'rated',rating:5,observation:'At the February observation the repair is working.',confirmed:true},f.cm);
      const [entry]=await f.db.query('SELECT * FROM reputation_entry_versions WHERE entry_id=$1',[submitted.entryId]);
      assert.equal(new Date(entry!.observed_at as string).toISOString(),'2027-02-01T04:00:00.000Z');assert.equal((entry!.facts as {dueAt:string}).dueAt,'2026-12-02T01:00:00.000Z');
      assert.equal((await feedback(id)).obligation.status,'submitted');assert.ok(!JSON.stringify(await feedback(id)).includes('faultPercentage'));
      const inspection=await f.cmd(id,'reputation/inspection',{round:1,rubric:{workmanship:1,timeliness:1,customerService:1,valueForMoney:1,recommendation:1},reason:'Observed inspection shortcomings',confirmed:true},f.cm);
      const passport=async()=>f.okay(await f.get('workspaces/'+id+'/passports/'+ids.organisation,f.mcst));
      const publish=async(entryId:string)=>{const e=f.okay(await f.get('reputation/entries/'+entryId,f.admin));f.okay(await f.post('reputation/entries/'+entryId+'/moderate',{entryVersion:e.entryVersion,decision:'publish',reason:'Verified the observation',durabilityContested:false},f.admin,e.version));};
      await publish(inspection.entryId);assert.equal((await passport()).scores.pure,0);
      await publish(submitted.entryId);const scored=await passport();assert.equal(scored.scores.pure,16.1);assert.equal(scored.scores.quoteFixCount,1);assert.equal(scored.scores.breakdown.durability.denominator,1);
    });
  } finally {await f.close();}
});
