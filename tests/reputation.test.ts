import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {score,formulaVersion,type ScoreUnit,type Rubric} from '../packages/domain/reputation-model.js';
import {AdviceService} from '../packages/domain/advice-service.js';
import {CommandService} from '../packages/domain/commands.js';

const rubric:Rubric={workmanship:5,timeliness:4,customerService:3,valueForMoney:4,recommendation:5};
test('CH16-T03/T04/T05: approved golden cases, exact normalized priority and missing durability',()=>{
  const unit:ScoreUnit={id:'one',source:'quotefix',inspectionEntryId:'inspection',inspectionVersion:1,rubric:{workmanship:5,timeliness:1,customerService:1,valueForMoney:1,recommendation:1}};
  const pure=score([unit]);assert.equal(pure.pure,19.2);assert.equal(pure.adjusted,pure.pure);assert.equal(pure.breakdown.durability!.denominator,0);
  assert.equal(score([unit],'workmanship').adjusted,22.9);
  assert.equal(score([{...unit,rubric:{...unit.rubric,workmanship:1,timeliness:5}}],'workmanship').adjusted,18.3);
  assert.equal(score([{...unit,durability:5}]).pure,32.3);
  assert.equal(score([unit],'earlier_availability').adjusted,pure.pure);
  assert.equal(score([unit],'none','workmanship').adjusted,pure.pure);
  assert.equal(score([]).pure,null);
  const allFives={...unit,rubric:{workmanship:5,timeliness:5,customerService:5,valueForMoney:5,recommendation:5},durability:5};
  assert.equal(score([allFives],'workmanship','timeliness').adjusted,100);
  assert.equal(score([{...allFives,rubric:{workmanship:1,timeliness:1,customerService:1,valueForMoney:1,recommendation:1},durability:1}]).pure,0);
});

test('Chapter 16: real evidence, moderation, passports, immutable calculations and grounded advice',async t=>{
  const f=await completionFixture(),pass=async(id:string,c=f.mcst)=>f.okay(await f.get('workspaces/'+id+'/passports/'+ids.organisation,c));
  const entry=async(id:string,c=f.admin)=>f.okay(await f.get('reputation/entries/'+id,c));
  async function moderate(id:string,decision='publish',extra:Record<string,unknown>={}) {
    const e=await entry(id);return f.okay(await f.post('reputation/entries/'+id+'/moderate',{entryVersion:e.entryVersion,decision,reason:'Private moderation evidence',durabilityContested:false,...extra},f.admin,e.version));
  }
  const questionnaire=async(id:string,extra:Record<string,unknown>={})=>f.cmd(id,'reputation/inspection',{round:1,rubric,reason:'Observed repair and communication',confirmed:true,...extra},f.cm);
  let id='',inspectionId='';
  try {
    await t.test('G10/CH16-T02/T07: complete required rubric, low reason and separate acceptance; submitted Contractor visibility precedes shared publication',async()=>{
      id=await f.prepared();assert.equal((await f.detail(id)).completion.accepted_round,1);
      assert.equal((await pass(id)).scores.pure,null);
      assert.equal((await f.post('workspaces/'+id+'/reputation/inspection',{round:1,rubric:{...rubric,workmanship:1},reason:' ',confirmed:true},f.cm,(await f.detail(id)).version)).statusCode,422);
      const incomplete={...rubric} as Partial<Rubric>;delete incomplete.timeliness;
      assert.equal((await f.post('workspaces/'+id+'/reputation/inspection',{round:1,rubric:incomplete,reason:'',confirmed:true},f.cm,(await f.detail(id)).version)).statusCode,422);
      inspectionId=(await questionnaire(id)).entryId;
      assert.equal((await entry(inspectionId,f.contractor)).facts.rubric.workmanship,5);
      assert.equal((await pass(id)).entries.length,0);assert.equal((await pass(id)).scores.pure,null);
      assert.equal((await f.get('reputation/entries/'+inspectionId,f.rival)).statusCode,404);
      assert.equal((await f.post('reputation/entries/'+inspectionId+'/moderate',{entryVersion:1,decision:'publish',reason:'No authority',durabilityContested:false},f.cm,1)).statusCode,403);
      await moderate(inspectionId);const p=await pass(id);assert.equal(p.scores.quoteFixCount,1);assert.equal(p.scores.pure,p.scores.adjusted);assert.equal(p.entries.length,1);
    });
    await t.test('CH16-T01/T02: four complete independently checked references do not seed a score; five become equal labelled evidence units',async()=>{
      for(let i=1;i<=5;i++) {
        const [org]=await f.db.query('SELECT version FROM organisations WHERE id=$1',[ids.organisation]);
        const body={workDate:'2026-09-01',trade:'plumbing',workDescription:'External valve repair '+i,source:'Private commissioning property '+i,refereeContact:'PRIVATE-CONTACT-'+i,independentChannel:'Directory telephone verified independently',interviewEvidence:'PRIVATE-INTERVIEW-'+i,uncertainty:'Retrospective account',independentlyVerified:true,rubric,reason:'Observed external repair',referenceKey:'external-'+i};
        const result=f.okay(await f.post('admin/organisations/'+ids.organisation+'/reputation/references',body,f.admin,Number(org!.version)));
        await moderate(result.entryId);const p=await pass(id);
        assert.equal(p.sourceCounts.verifiedExternal,i);assert.equal(p.sourceCounts.scoredExternal,i===5?5:0);assert.equal(p.sourceCounts.quoteFixJobs,1);
        assert.ok(!JSON.stringify(p).includes('PRIVATE-'));assert.ok(!JSON.stringify(p).includes('Private commissioning'));
        if(i===5)assert.equal((await f.post('admin/organisations/'+ids.organisation+'/reputation/references',body,f.admin,Number(org!.version)+1)).statusCode,409);
      }
      const p=await pass(id);assert.equal(p.scores.denominator,6);assert.equal(p.scores.pure,score([{id:'one',source:'external',inspectionEntryId:'x',inspectionVersion:1,rubric}]).pure);
    });
    await t.test('CH16-T06/T07/T11: one job unit through correction, new approval required, reply approval, private void reason and immutable history',async()=>{
      const before=await pass(id),[historical]=await f.db.query('SELECT * FROM reputation_snapshots WHERE id=$1',[before.snapshotId]);
      const e=await entry(inspectionId,f.contractor),reply=f.okay(await f.post('reputation/entries/'+inspectionId+'/reply',{entryVersion:e.entryVersion,text:'Contractor explanation reviewed separately.'},f.contractor,e.version));
      assert.equal((await pass(id)).entries.find((e:{id:string})=>e.id===inspectionId).replies.length,0);
      const latest=await entry(inspectionId);f.okay(await f.post('reputation/entries/'+inspectionId+'/moderate-reply',{replyVersion:reply.replyVersion,approved:true,reason:'Private reply review'},f.admin,latest.version));
      assert.equal((await pass(id)).entries.find((e:{id:string})=>e.id===inspectionId).replies.length,1);
      assert.equal((await pass(id)).scores.pure,before.scores.pure);
      await moderate(inspectionId,'void',{reason:'PRIVATE-VOID-REASON'});const voided=await pass(id);
      assert.equal(voided.scores.quoteFixCount,0);assert.equal(voided.entries.find((e:{id:string})=>e.id===inspectionId).muted,true);
      assert.ok(!JSON.stringify(voided).includes('PRIVATE-VOID'));assert.ok(!JSON.stringify(voided).includes('"decision":"void"'));
      assert.deepEqual((await f.db.query('SELECT * FROM reputation_snapshots WHERE id=$1',[before.snapshotId]))[0],historical);
      await questionnaire(id,{entryVersion:1,correctionReason:'Corrected factual assessment',reason:'Updated assessment'});
      assert.equal((await pass(id)).scores.quoteFixCount,0);assert.equal((await pass(id)).entries.some((e:{id:string})=>e.id===inspectionId),false);
      await moderate(inspectionId);assert.equal((await pass(id)).scores.quoteFixCount,1);
      assert.equal((await f.db.query("SELECT id FROM reputation_entries WHERE job_id=$1 AND kind='inspection'",[id])).length,1);
      await assert.rejects(()=>f.db.query("UPDATE reputation_entry_versions SET facts='{}' WHERE entry_id=$1",[inspectionId]),/immutable|append|audit|cannot/i);
      await assert.rejects(()=>f.db.query("UPDATE reputation_snapshots SET result='{}' WHERE id=$1",[before.snapshotId]),/immutable|append|audit|cannot/i);
      assert.equal(Number((await f.db.query('SELECT COUNT(*) AS n FROM reputation_entry_versions WHERE entry_id=$1',[inspectionId]))[0]!.n),2);
    });
    await t.test('CH16-T05: unavailable, contested and unmoderated durability never add clean points',async()=>{
      await f.transfer(id);const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
      await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
      const baseline=(await pass(id)).scores.pure;f.setNow(new Date('2026-12-02T01:00:00Z'));
      const due=f.okay(await f.get('workspaces/'+id+'/feedback',f.cm));assert.equal((await pass(id)).scores.pure,baseline);
      const feedback=await f.cmd(id,'feedback/submit',{obligationVersion:due.obligation.version,outcome:'rated',rating:1,observation:'Observed recurrence; cause requires review.',confirmed:true},f.cm);
      assert.equal((await pass(id)).scores.pure,baseline);await moderate(feedback.entryId,'publish',{durabilityContested:true});
      assert.equal((await pass(id)).scores.pure,baseline);assert.equal((await pass(id)).durability.contested,1);
      await moderate(feedback.entryId,'publish',{durabilityContested:false});assert.ok((await pass(id)).scores.pure<baseline);
      assert.equal((await pass(id)).scores.breakdown.durability.denominator,1);
      assert.ok(!Object.keys((await pass(id)).durability).some(k=>k.includes('percent')));
    });
    await t.test('CH16-T08: concealed CM receives no private contacts, free-text identity clues, raw Admin reasons or unsafe advice',async()=>{
      const current=await entry(inspectionId);await questionnaire(id,{entryVersion:current.entryVersion,correctionReason:'Add observation',reason:'Novel identity clue at Secret Copper Lodge'});await moderate(inspectionId);
      const [estate]=await f.db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);
      f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Confidential procurement'},f.mcst,Number(estate!.version)));
      const p=await pass(id,f.cm);assert.equal(p.masked,true);assert.ok(!JSON.stringify(p).includes('Secret Copper Lodge'));assert.ok(!JSON.stringify(p).includes('PRIVATE-'));
      assert.ok(!JSON.stringify(await entry(inspectionId,f.cm)).includes('Secret Copper Lodge'));
      const feedback=f.okay(await f.get('workspaces/'+id+'/feedback',f.cm));assert.ok(!JSON.stringify(feedback).includes('Secret Copper Lodge'));
      assert.ok(JSON.stringify(await pass(id,f.mcst)).includes('Secret Copper Lodge'));
      const version=(await f.detail(id)).version;
      f.okay(await f.post('workspaces/'+id+'/advice',{confirmed:true},f.cm,version));
      const advice=f.okay(await f.get('workspaces/'+id+'/advice',f.cm));assert.ok(!JSON.stringify(advice).includes('PRIVATE-'));assert.ok(!JSON.stringify(advice).includes('Secret Copper Lodge'));
      assert.equal((await f.get('workspaces/'+id+'/passports/'+ids.organisation,f.contractor)).statusCode,403);
    });
    await t.test('CH16-T09/T10: provider failure/unsupported output falls back; delayed result is rejected after access changes',async()=>{
      const token=decodeURIComponent(f.cm.cookie.split('=')[1]!),commands=new CommandService(f.db,f.identity,f.now),meta=()=>({operationId:randomUUID(),accessVersion:1,expectedVersion:0,csrf:f.cm.csrf,requestId:randomUUID()});
      const version=(await f.detail(id)).version;
      const failed=new AdviceService(commands,{name:'failing-test-provider',evaluate:async()=>{throw new Error('Provider unavailable');}});
      const result=await failed.request(token,{...meta(),expectedVersion:version},id,{confirmed:true});assert.equal((result.result as {status:string}).status,'unavailable');
      const unsupported=new AdviceService(commands,{name:'unsafe-provider',evaluate:async()=>({recommendedQuoteId:randomUUID(),citations:['private-contact']})});
      assert.equal(((await unsupported.request(token,{...meta(),expectedVersion:version},id,{confirmed:true})).result as {status:string}).status,'unavailable');
      const hung=new AdviceService(commands,{name:'hung-test-provider',evaluate:async()=>new Promise(()=>{})},10);
      assert.equal(((await hung.request(token,{...meta(),expectedVersion:version},id,{confirmed:true})).result as {status:string}).status,'unavailable');
      let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
      const delayed=new AdviceService(commands,{name:'delayed-test-provider',evaluate:async()=>{entered();await hold;return {recommendedQuoteId:null,citations:[]};}});
      const pending=delayed.request(token,{...meta(),expectedVersion:version},id,{confirmed:true});await started;
      const [estate]=await f.db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:true,reason:'Review visibility change'},f.mcst,Number(estate!.version)));
      release();await assert.rejects(pending,(e:unknown)=>!!e&&typeof e==='object'&&'code' in e&&e.code==='ADVICE_STALE');
      assert.equal(f.okay(await f.get('workspaces/'+id+'/advice',f.cm)).advice,null);
      assert.equal((await f.get('workspaces/'+id+'/comparison',f.cm)).statusCode,200);
    });
    await t.test('CH16-T11/T12: formula metadata and inputs retained, no periodic refresh or placeholder score policy',async()=>{
      const [snapshot]=await f.db.query('SELECT * FROM reputation_snapshots WHERE organisation_id=$1 ORDER BY recorded_at DESC LIMIT 1',[ids.organisation]);
      assert.equal(snapshot!.formula_version,formulaVersion);assert.equal((snapshot!.inputs as {formula:{recommendationWeight:number}}).formula.recommendationWeight,120);
      assert.ok((snapshot!.inputs as {moderationInputs:unknown[]}).moderationInputs.length>0);
      const archivedId=randomUUID();
      await f.db.query('INSERT INTO reputation_snapshots(id,organisation_id,formula_version,fingerprint,inputs,result,recorded_at) SELECT $1,organisation_id,$2,fingerprint,inputs,result,recorded_at FROM reputation_snapshots WHERE id=$3',[archivedId,'historical-test-v0',snapshot!.id]);
      const [archived]=await f.db.query('SELECT * FROM reputation_snapshots WHERE id=$1',[archivedId]);
      const current=await pass(id);assert.equal(current.scores.formulaVersion,formulaVersion);assert.notEqual(current.snapshotId,archivedId);
      assert.deepEqual((await f.db.query('SELECT * FROM reputation_snapshots WHERE id=$1',[archivedId]))[0],archived);
      assert.equal((await f.db.query("SELECT id FROM timer_jobs WHERE rule LIKE '%reputation%' OR rule LIKE '%passport%' ")).length,0);
      assert.equal((await f.db.query('SELECT * FROM contractor_selections WHERE job_id=$1',[id])).length,1);
      const [selection]=await f.db.query('SELECT snapshot FROM contractor_selections WHERE job_id=$1',[id]);
      assert.ok((selection!.snapshot as {reputation:unknown}).reputation);
    });
  } finally {await f.close();}
});
