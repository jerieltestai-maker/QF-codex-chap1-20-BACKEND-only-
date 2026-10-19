import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {percentageRule} from '../packages/domain/integrity-core.js';
import {INTEGRITY_DEFAULTS,ESTATE_ACK,TICKET_ACK} from '../packages/domain/integrity-settings.js';

test('CH17 exact percentage arithmetic, zero evidence and final owner defaults',()=>{
  assert.deepEqual(INTEGRITY_DEFAULTS,{quoteRevisionPct:20,selectedPricePct:30,variationGrowthPct:20,minimumQuotes:3});
  assert.equal(percentageRule('revision',5n,6n,20,true)?.percentage,'20.00');
  assert.equal(percentageRule('revision',5n,4n,20,true)?.percentage,'20.00');
  assert.equal(percentageRule('gap',10000n,12999n,30),null);
  assert.equal(percentageRule('gap',10000n,13000n,30)?.percentage,'30.00');
  assert.equal(percentageRule('growth',9007199254740000n,9007199254740001n,1),null);
  assert.equal(percentageRule('gap',100n,100n,0),null);
  assert.equal(percentageRule('legacy',0n,10n,20)?.percentage,null);
  assert.equal(percentageRule('legacy',null,10n,20)?.percentage,null);
});

test('CH17 settings, exact warning sources, hard clearances and protected evidence',async t=>{
  const f=await completionFixture();
  const v=async(id:string,c=f.cm)=>f.okay(await f.get('workspaces/'+id,c)).job.version;
  const oversight=async(id:string,c=f.mcst)=>f.okay(await f.get('workspaces/'+id+'/integrity',c));
  const values={...INTEGRITY_DEFAULTS,minimumQuotes:1};
  const settings=async(input=values)=>{const s=f.okay(await f.get('estates/'+ids.estate+'/integrity-settings',f.mcst));return f.okay(await f.post('estates/'+ids.estate+'/integrity-settings',{values:input,acknowledged:true,reason:'Explicit test policy'},f.mcst,s.version));};
  const terms=(amountSgd:string)=>({amountSgd,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true});
  async function open() {
    const id=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Integrity example',observations:'Observed valve leak',affectedLocation:'Private location'},f.cm)).jobId;
    f.okay(await f.post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Not accessible safely',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Plant room',evidenceIds:[]},f.cm,1));
    f.okay(await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.cm,2));return id as string;
  }
  const quote=async(id:string,amount:string,c=f.contractor,version=0,revision=1)=>f.post('opportunities/'+id+'/quotes',{rfqRevision:revision,terms:terms(amount),revisionReason:'Reviewed updated facts'},c,version);
  async function select(id:string,quoteId:string,c=f.cm,clear=false) {
    const comparison=f.okay(await f.get('workspaces/'+id+'/comparison',c)),q=comparison.quotes.find((q:{quoteId:string})=>q.quoteId===quoteId);
    return f.post('workspaces/'+id+'/select',{quoteId,quoteVersion:q.quoteVersion,settingsVersion:comparison.settingsVersion,rfqRevision:comparison.rfqRevision,rationale:'Reviewed scope and exact warnings',confirmed:true,acknowledgedCautions:[...q.cautions,'limited_comparison'],thresholdAcknowledged:true,reputationFingerprint:comparison.reputationFingerprint,...(clear?{clearWarning:true,warningExplanation:'Reviewed legitimate differences and approve continuation'}:{})},c,comparison.version);
  }
  const clear=async(id:string,card:Record<string,any>,c=f.mcst)=>f.post('workspaces/'+id+'/integrity/clear',{cardId:card.id,sourceVersion:card.source_version,explanation:'Reviewed exact scope, amounts and evidence; allow continuation',confirmed:true},c,await v(id));
  const drain=async()=>{for(let i=0;i<1000;i++){const w=await f.worker.claim();if(!w)break;await f.worker.process(w);}};
  try {
    const estate=f.okay(await f.get('estates/'+ids.estate,f.admin));f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'1000.00',reason:'Keep monetary approval separate from warning tests'},f.admin,estate.version));
    await settings();
    const [rival]=await f.db.query('SELECT organisation_id FROM memberships WHERE user_id=(SELECT id FROM users WHERE email=$1)',['completionrival@example.test']);
    await f.db.query("INSERT INTO contractor_profiles VALUES($1,'Verified fictional rival contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[rival!.organisation_id,f.now().toISOString()]);
    await t.test('CH17-T05/T06: acknowledged versioned settings and no authority escalation',async()=>{
      const s=f.okay(await f.get('estates/'+ids.estate+'/integrity-settings',f.mcst));assert.equal(s.acknowledgment,ESTATE_ACK);
      assert.equal((await f.post('estates/'+ids.estate+'/integrity-settings',{values,acknowledged:false,reason:'No checkbox'},f.mcst,s.version)).statusCode,422);
      assert.equal((await f.get('estates/'+ids.estate+'/integrity-settings',f.cm)).statusCode,403);
      const id=await open();f.okay(await quote(id,'100.00'));
      for(const body of [{values,acknowledged:false,reason:'Reviewed'},{values,acknowledged:true,reason:' '}])assert.equal((await f.post('workspaces/'+id+'/integrity-settings',body,f.mcst,0)).statusCode,422);
      const override=f.okay(await f.post('workspaces/'+id+'/integrity-settings',{values:{...values,quoteRevisionPct:40},acknowledged:true,reason:'Legitimate ticket-specific circumstances'},f.mcst));
      const ts=f.okay(await f.get('workspaces/'+id+'/integrity-settings',f.mcst));assert.equal(ts.acknowledgment,TICKET_ACK);assert.equal(ts.version,override.version);assert.equal(ts.versions[0].reason,'Legitimate ticket-specific circumstances');
      f.okay(await quote(id,'120.00',f.contractor,1));assert.equal((await oversight(id)).cards.length,0);
      f.okay(await quote(id,'140.00',f.contractor,2));assert.equal((await oversight(id)).cards[0].triggers[0].percentage,'40.00');
    });
    await t.test('CH17-T01/T05/T07: same-scope first baseline, immutable old policy, delayed bell, new material scope',async()=>{
      await settings();const id=await open(),first=f.okay(await quote(id,'100.00'));f.okay(await quote(id,'120.00',f.contractor,1));
      const card=(await oversight(id)).cards[0];assert.equal(card.triggers[0].basisCents,'10000');assert.equal(card.triggers[0].threshold,20);
      await settings({...values,quoteRevisionPct:50});
      const before=f.okay(await f.get('workspaces/'+id+'/integrity-settings',f.mcst));
      f.okay(await f.post('workspaces/'+id+'/integrity-settings',{values:{...values,quoteRevisionPct:80},acknowledged:true,reason:'Future events only'},f.mcst,before.version));
      await drain();const preserved=(await oversight(id)).cards.find((c:{id:string})=>c.id===card.id);assert.deepEqual(preserved.triggers,card.triggers);assert.deepEqual(preserved.policy,card.policy);
      const notices=await f.db.query("SELECT n.id FROM notifications n JOIN tasks t ON t.id=n.task_id WHERE t.resource_id=$1 AND t.owner_role='mcst'",[card.id]);assert.equal(notices.length,1);
      const current=f.okay(await f.get('workspaces/'+id+'/rfq',f.cm));const fields={...current.intake,publicDescription:'Repair valve and replace another leaking valve'};
      f.okay(await f.post('workspaces/'+id+'/rfq/intake',fields,f.cm,await v(id)));
      f.okay(await f.post('workspaces/'+id+'/rfq/revise',{classification:'material',changeKinds:['scope'],reason:'Additional valve',privacyConfirmed:true,factsConfirmed:true},f.cm,await v(id)));
      f.okay(await quote(id,'300.00',f.contractor,2,2));assert.equal((await oversight(id)).cards.length,1,'new material scope has its own first baseline');
      assert.ok(first.quoteId);
    });
    await t.test('CH17-T02/T04/T08/T09: small-dollar grouped warning forces below-threshold MCST clearance',async()=>{
      await settings({...INTEGRITY_DEFAULTS});const id=await open(),chosen=f.okay(await quote(id,'1.30'));f.okay(await quote(id,'1.00',f.rival));
      const result=f.okay(await select(id,chosen.quoteId));assert.equal(result.pendingMcst,true);assert.equal(result.authorisationId,null);
      const card=(await oversight(id)).cards.find((c:{event_type:string})=>c.event_type==='selection');assert.equal(card.triggers.length,2);assert.equal(card.triggers.find((x:{rule:string})=>x.rule==='selected_price').percentage,'30.00');
      assert.equal((await f.db.query('SELECT * FROM work_authorisations WHERE job_id=$1',[id])).length,0);
      const d=f.okay(await f.get('workspaces/'+id+'/comparison',f.mcst)),body={selectionId:result.selectionId,outcome:'approved',reason:'Scope justified',confirmed:true,acknowledgedCautions:d.history[0].cautions};
      assert.equal((await f.post('workspaces/'+id+'/selection/decide',body,f.mcst,d.version)).statusCode,422);
      f.okay(await f.post('workspaces/'+id+'/selection/decide',{...body,clearWarning:true,warningExplanation:'Chosen warranty and access arrangements reviewed'},f.mcst,d.version));
      assert.equal((await oversight(id)).cards[0].cleared_by,'MCST');
      await drain();for(const role of ['admin','mcst'])assert.equal((await f.db.query("SELECT id FROM tasks WHERE resource_id=$1 AND owner_role=$2 AND kind='integrity.warning'",[card.id,role])).length,1);
    });
    await t.test('CH17-T08: MCST combines explicit clearance and selection; unchecked or blank explanation fails',async()=>{
      const id=await open(),q=f.okay(await quote(id,'100.00'));
      assert.equal((await select(id,q.quoteId,f.mcst)).statusCode,422);
      const s=f.okay(await select(id,q.quoteId,f.mcst,true));assert.equal(s.pendingMcst,false);assert.ok(s.authorisationId);
      assert.ok((await oversight(id)).cards[0].cleared_at);
    });
    await t.test('CH17-T03/T12: cumulative variations pause ordinary work, withdrawal cannot clear, make-safe preserved',async()=>{
      await settings(values);const id=await f.job('100.00');
      const w=f.okay(await f.get('workspaces/'+id+'/work',f.contractor));
      const change=async(total:string)=>f.cmd(id,'variations',{kind:'scope_price',confirmed:true,proposal:{reason:'Additional valve scope',scope:w.state.scope+' plus additional work',newTotalSgd:total,timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},f.contractor);
      let p=await change('110.00');await f.cmd(id,'variations/decide',{variationId:p.variationId,proposalVersion:p.proposalVersion,outcome:'approved',confirmed:true},f.cm);
      p=await change('120.00');const o=await oversight(id),card=o.cards.find((c:{event_type:string})=>c.event_type==='variation.proposal');assert.equal(card.triggers[0].percentage,'20.00');assert.equal(card.evidence.approvedTotalCents,'11000');assert.equal(card.evidence.prospectiveTotalCents,'12000');assert.equal(o.workPaused,true);
      assert.equal((await f.post('workspaces/'+id+'/work/update',{note:'Ordinary progress',fileIds:[]},f.contractor,await v(id))).statusCode,409);
      const safe=f.okay(await f.post('workspaces/'+id+'/integrity/make-safe',{description:'Isolated leaking pipe to prevent further water loss',evidenceIds:[]},f.contractor,await v(id)));assert.ok(safe.eventId);
      await f.cmd(id,'variations/decide',{variationId:p.variationId,proposalVersion:p.proposalVersion,outcome:'withdrawn',confirmed:true},f.contractor);
      assert.equal((await oversight(id)).workPaused,true);
      const review=f.okay(await f.post('workspaces/'+id+'/integrity/review',{cardId:card.id,sourceVersion:card.source_version,disposition:'explained',note:'Plausible explanation'},f.mcst,await v(id)));assert.equal(review.cleared,false);assert.equal((await oversight(id)).workPaused,true);
      assert.equal((await clear(id,card,f.cm)).statusCode,403);f.okay(await clear(id,card));assert.equal((await oversight(id)).workPaused,false);
      f.okay(await f.post('workspaces/'+id+'/work/update',{note:'Approved original work resumes',fileIds:[]},f.contractor,await v(id)));
      const [effective]=await f.db.query('SELECT amount_cents FROM work_terms WHERE job_id=$1 ORDER BY version DESC LIMIT 1',[id]);assert.equal(String(effective!.amount_cents),'11000');
    });
    await t.test('CH17-T10/T11: positive quotations and protected access do not invent misconduct',async()=>{
      const id=await open();for(const amount of ['0','0.00','-1.00'])assert.equal((await quote(id,amount)).statusCode,422);
      f.okay(await quote(id,'0.01'));assert.equal((await f.get('workspaces/'+id+'/comparison',f.contractor)).statusCode,403);
      f.okay(await f.get('workspaces/'+id+'/comparison',f.cm));
      const events=f.okay(await f.get('admin/protected-access?jobId='+id,f.admin));assert.ok(events.items.some((e:{outcome:string})=>e.outcome==='denied'));assert.ok(events.items.some((e:{outcome:string})=>e.outcome==='allowed'));assert.ok(events.interpretation.includes('not evidence of misconduct'));
      assert.equal((await f.get('admin/protected-access?jobId='+id,f.mcst)).statusCode,403);
      f.okay(await f.post('workspaces/'+id+'/integrity/access-summary',{summary:'The recorded access was reviewed; no further procurement action is required.',confirmed:true},f.admin,await v(id)));
      assert.equal((await oversight(id)).accessSummaries.length,1);
    });
    await t.test('CH17-T01/T12: an under-threshold rival revision does not inherit another bidder flag',async()=>{
      await settings({...values,selectedPricePct:10000});const id=await open();
      f.okay(await quote(id,'100.00'));f.okay(await quote(id,'100.00',f.rival));
      f.okay(await quote(id,'120.00',f.contractor,1));const rivalQuote=f.okay(await quote(id,'119.99',f.rival,1));
      const c=f.okay(await f.get('workspaces/'+id+'/comparison',f.cm));assert.equal(c.integrityPreviews[rivalQuote.quoteId].triggers.length,0);
      const r=f.okay(await select(id,rivalQuote.quoteId));assert.equal(r.pendingMcst,false);assert.ok(r.authorisationId);
      assert.equal((await oversight(id)).cards.length,1,'only the other exact bidder revision is flagged');
    });
    await t.test('CH17-T05/T07: estate versions bind a future round; ticket edits reject stale selections',async()=>{
      await settings(values);const old=await open(),q=f.okay(await quote(old,'100.00'));
      const before=f.okay(await f.get('workspaces/'+old+'/comparison',f.mcst));
      await settings({...values,quoteRevisionPct:50});f.okay(await quote(old,'120.00',f.contractor,1));assert.equal((await oversight(old)).cards[0].triggers[0].threshold,20);
      const fresh=await open();f.okay(await quote(fresh,'100.00'));f.okay(await quote(fresh,'120.00',f.contractor,1));assert.equal((await oversight(fresh)).cards.length,0);
      const body={values,acknowledged:true,reason:'Future ticket events only'};f.okay(await f.post('workspaces/'+old+'/integrity-settings',body,f.mcst));
      assert.equal((await f.post('workspaces/'+old+'/select',{quoteId:q.quoteId,quoteVersion:1,settingsVersion:before.settingsVersion,rfqRevision:1,rationale:'Old view',confirmed:true,acknowledgedCautions:before.quotes[0].cautions,thresholdAcknowledged:true,reputationFingerprint:before.reputationFingerprint},f.mcst,before.version)).statusCode,412);
    });
    await t.test('CH17-T09: warning insertion failure rolls back quote, card, tasks and receipt; retry commits once',async()=>{
      await settings(values);const id=await open(),q=f.okay(await quote(id,'100.00'));
      await f.db.exec("CREATE FUNCTION fail_warning_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='integrity.warning' THEN RAISE EXCEPTION 'fictional injected failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_warning_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_warning_audit();");
      const key=randomUUID(),body={rfqRevision:1,terms:terms('120.00'),revisionReason:'Explicit revision'};
      assert.equal((await f.post('opportunities/'+id+'/quotes',body,f.contractor,1,key)).statusCode,500);
      assert.equal((await oversight(id)).cards.length,0);assert.equal((await f.db.query('SELECT current_version FROM quotes WHERE id=$1',[q.quoteId]))[0]!.current_version,1);
      assert.equal((await f.db.query('SELECT operation_id FROM command_receipts WHERE operation_id=$1',[key])).length,0);
      await f.db.exec('DROP TRIGGER fail_warning_audit ON audit_events; DROP FUNCTION fail_warning_audit();');
      const first=f.okay(await f.post('opportunities/'+id+'/quotes',body,f.contractor,1,key));assert.deepEqual(f.okay(await f.post('opportunities/'+id+'/quotes',body,f.contractor,1,key)),first);assert.equal((await oversight(id)).cards.length,1);
    });
    await t.test('CH17-T05: onboarding requires explicit settings and acknowledgment before first publication',async()=>{
      const estateId=randomUUID();await f.db.query("INSERT INTO estates(id,name) VALUES($1,'New fictional estate')",[estateId]);
      const id=f.okay(await f.post('workspaces',{estateId,title:'New policy setup',observations:'Valve leak',affectedLocation:'Private location'},f.admin)).jobId;
      f.okay(await f.post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unavailable',grouping:'combined',primaryPriority:'none',publicDescription:'Repair valve',publicLocation:'Plant room',evidenceIds:[]},f.admin,1));
      assert.equal((await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.admin,2)).statusCode,409);
      assert.equal((await f.db.query('SELECT * FROM quotation_rounds WHERE job_id=$1',[id])).length,0);
      f.okay(await f.post('estates/'+estateId+'/integrity-settings',{values:INTEGRITY_DEFAULTS,acknowledged:true,reason:'Admin-authorised explicit setup'},f.admin));
      f.okay(await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.admin,2));
    });
  }finally{await f.close();}
});
