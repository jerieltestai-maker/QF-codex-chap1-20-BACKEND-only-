import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {INTEGRITY_DEFAULTS} from '../packages/domain/integrity-settings.js';

test('Chapters 09–18 cross-chapter adversarial regressions',async t=>{
  const f=await completionFixture();
  const version=async(id:string)=>Number((await f.db.query('SELECT version FROM job_records WHERE id=$1',[id]))[0]!.version);
  const caseCommand=async(id:string,path:string,body:object,c=f.admin)=>{
    const d=f.okay(await f.get('support/'+id,c));return f.okay(await f.post('support/'+id+'/'+path,body,c,d.case?.version??1));
  };
  const quoteTerms=(amountSgd:string)=>({amountSgd,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true});
  const offer=async(amount:string)=>{
    const id=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Audit cancellation fixture',observations:'Observed leak',affectedLocation:'Private room'},f.cm)).jobId as string;
    f.okay(await f.post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to photograph',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Service room',evidenceIds:[]},f.cm,1));
    f.okay(await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.cm,2));
    const q=f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:quoteTerms(amount)},f.contractor));return {id,q};
  };
  const select=async(id:string,q:Record<string,any>,c=f.mcst)=>{
    const comparison=f.okay(await f.get('workspaces/'+id+'/comparison',c)),chosen=comparison.quotes.find((row:Record<string,any>)=>row.quoteId===q.quoteId);
    return f.okay(await f.post('workspaces/'+id+'/select',{quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:comparison.settingsVersion,rfqRevision:1,rationale:'Reviewed exact quote',confirmed:true,acknowledgedCautions:[...chosen.cautions,'limited_comparison'],thresholdAcknowledged:true,reputationFingerprint:comparison.reputationFingerprint},c,comparison.version));
  };
  try {
    await t.test('cancellation detail excludes losing bidders while their own support remains available',async()=>{
      const {id,q}=await offer('100.00');
      const [rival]=await f.db.query("SELECT organisation_id FROM memberships WHERE user_id=(SELECT id FROM users WHERE email='completionrival@example.test')");
      await f.db.query("INSERT INTO contractor_profiles VALUES($1,'Fictional rival contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[rival!.organisation_id,f.now().toISOString()]);
      f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:quoteTerms('110.00')},f.rival));
      await select(id,q);
      await f.cmd(id,'cancel',{reason:'Private cancellation reason',confirmed:true},f.cm);
      const ownJob=f.okay(await f.get('contractor/jobs',f.contractor)).find((j:Record<string,any>)=>j.jobId===id);assert.equal(ownJob.workCancelled,true);assert.equal(ownJob.selection.status,'authorised');
      const r=await f.get('workspaces/'+id+'/cancellation',f.rival);
      assert.equal(r.statusCode,200,r.body);assert.deepEqual(r.json().cancellations,[]);assert.deepEqual(r.json().events,[]);assert.ok(!r.body.includes('Private cancellation reason'));
      const own=f.okay(await f.post('workspaces/'+id+'/cases',{description:'Concern about my own historical bid',category:'quote_scope',privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[]},f.rival,await version(id)));
      assert.equal((await f.get('support/'+own.supportId,f.rival)).statusCode,200);
    });
    await t.test('a cancelled settlement without an invoice supports unpaid-balance issues, verified receipts and resolution',async()=>{
      const {id,q}=await offer('1200.00');await select(id,q,f.cm);
      f.okay(await f.post('workspaces/'+id+'/cancel',{reason:'Cancel before work authorisation',confirmed:true},f.cm,await version(id)));await f.worker.tick(500);
      const cancel=f.okay(await f.get('workspaces/'+id+'/cancellation',f.contractor));
      const claim=f.okay(await f.post('workspaces/'+id+'/cancellation/respond',{cancellationId:cancel.cancellations[0].id,outcome:'claim',description:'Already committed materials'},f.contractor,cancel.version));
      const proposal=await caseCommand(claim.supportId,'settlements',{amountSgd:'25.00',reason:'Verified cancellation expenses'});
      await caseCommand(claim.supportId,'confirm-settlement',{proposalId:proposal.proposalId,proposalVersion:proposal.proposalVersion,amountSgd:'25.00',confirmed:true,financialOverride:false,reason:'Exact expense settlement reviewed'},f.mcst);
      let d=await f.detail(id,f.contractor);assert.equal(d.completion,null);
      f.okay(await f.post('workspaces/'+id+'/payments/issue',{description:'Confirmed cancellation expenses remain unpaid'},f.contractor,d.version));
      d=await f.detail(id,f.admin);assert.equal(d.balanceIssues.length,1);
      assert.ok(d.followUp?.nextDueAt);assert.equal((await f.get('support/'+d.balanceIssues[0].id,f.contractor)).statusCode,200);
      const resolve={supportId:d.balanceIssues[0].id,reason:'Verified exact settlement',executionEvidence:'Bank transfer and actual receipt checked'};
      assert.equal((await f.post('workspaces/'+id+'/payments/resolve-balance',resolve,f.admin,d.version)).statusCode,409);
      const proof=await f.file(id,'payment_proof');d=await f.detail(id,f.mcst);
      f.okay(await f.post('workspaces/'+id+'/payments/transfer',{invoiceVersion:d.financialConfirmation.version,financialVersion:d.financialConfirmation.version,proofId:proof,amountSgd:'25.00',transferDate:f.now().toISOString(),completedTransfer:true,confirmed:true},f.mcst,d.version));
      await f.worker.tick(500);d=await f.detail(id,f.contractor);
      f.okay(await f.post('workspaces/'+id+'/payments/receipt',{transferId:d.transfers[0].id,amountSgd:'25.00',receiptDate:f.now().toISOString(),confirmed:true},f.contractor,d.version));
      d=await f.detail(id,f.admin);f.okay(await f.post('workspaces/'+id+'/payments/resolve-balance',resolve,f.admin,d.version));
      d=await f.detail(id);assert.equal(d.balances.outstandingCents,'0');assert.equal(d.balanceIssues.length,0);
      assert.equal((await f.db.query('SELECT * FROM completion_rounds WHERE job_id=$1',[id])).length,0);
      assert.equal((await f.db.query('SELECT * FROM feedback_obligations WHERE job_id=$1',[id])).length,0);
      assert.notEqual(d.stage,'Closed');
    });
    await t.test('clearing a warning restores the pending variation stage without approving its terms',async()=>{
      const s=f.okay(await f.get('estates/'+ids.estate+'/integrity-settings',f.mcst));
      f.okay(await f.post('estates/'+ids.estate+'/integrity-settings',{values:{...INTEGRITY_DEFAULTS,minimumQuotes:1},acknowledged:true,reason:'Explicit audit fixture policy'},f.mcst,s.version));
      const id=await f.job(),w=f.okay(await f.get('workspaces/'+id+'/work',f.contractor));
      await f.cmd(id,'variations',{kind:'scope_price',confirmed:true,proposal:{reason:'Additional authorised scope proposed',scope:w.state.scope+' and another valve',newTotalSgd:'120.00',timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},f.contractor);
      const integrity=f.okay(await f.get('workspaces/'+id+'/integrity',f.mcst)),card=integrity.cards[0];
      f.okay(await f.post('workspaces/'+id+'/integrity/clear',{cardId:card.id,sourceVersion:card.source_version,explanation:'Review permits original work while exact new terms await a decision',confirmed:true},f.mcst,await version(id)));
      const after=f.okay(await f.get('workspaces/'+id+'/work',f.contractor));
      assert.equal(after.state.stage,'Modifying job scope');assert.equal(String(after.state.amount_cents),'10000');
      assert.equal(after.variations[0].state,'decision');assert.equal(after.state.integrity_paused,false);
    });
  } finally {await f.close();}
});
