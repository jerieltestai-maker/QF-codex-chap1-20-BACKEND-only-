import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {AdviceService} from '../packages/domain/advice-service.js';
import {CommandService} from '../packages/domain/commands.js';

test('CH16: current quote fit, secondary priority, stale evidence and immutable selection',async t=>{
  const f=await completionFixture();
  const terms=(amountSgd='150.00',availability='4_7_days')=>({amountSgd,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability,duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true});
  const comparison=async(id:string)=>f.okay(await f.get('workspaces/'+id+'/comparison',f.cm));
  const advise=async(id:string)=>f.okay(await f.post('workspaces/'+id+'/advice',{confirmed:true},f.cm,(await comparison(id)).version));
  async function open(primary='none',secondary?:string,equalPrice=false) {
    const id=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Fictional comparison',observations:'Observed fault',affectedLocation:'Private room'},f.cm)).jobId;
    f.okay(await f.post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Not accessible',grouping:'combined',primaryPriority:primary,...(secondary?{secondaryPriority:secondary}:{}),publicDescription:'Repair leaking valve',publicLocation:'Plant room',evidenceIds:[]},f.cm,1));
    f.okay(await f.post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},f.cm,2));
    const a=f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:terms(equalPrice?'100.00':'150.00')},f.contractor));
    const b=f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:terms('100.00','same_day')},f.rival));
    return {id,a,b};
  }
  const select=(id:string,c:Record<string,any>,quote:Record<string,any>)=>f.post('workspaces/'+id+'/select',{quoteId:quote.quoteId,quoteVersion:quote.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:c.rfqRevision,rationale:'Reviewed current facts',confirmed:true,acknowledgedCautions:[...quote.cautions,'limited_comparison'],thresholdAcknowledged:true,reputationFingerprint:c.reputationFingerprint},f.cm,c.version);
  try {
    const [rival]=await f.db.query('SELECT organisation_id FROM memberships WHERE user_id=(SELECT id FROM users WHERE email=$1)',['completionrival@example.test']);
    await f.db.query("INSERT INTO contractor_profiles VALUES($1,'Rival contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[rival!.organisation_id,f.now().toISOString()]);
    const history=await f.prepared(),questionnaire=await f.cmd(history,'reputation/inspection',{round:1,rubric:{workmanship:5,timeliness:5,customerService:5,valueForMoney:5,recommendation:5},reason:'Observed earlier job',confirmed:true},f.cm),entryId=questionnaire.entryId;
    async function moderate(decision='publish') {const e=f.okay(await f.get('reputation/entries/'+entryId,f.admin));f.okay(await f.post('reputation/entries/'+entryId+'/moderate',{entryVersion:e.entryVersion,decision,reason:'Audited review',durabilityContested:false},f.admin,e.version));}
    await moderate();
    await t.test('CH16-T10: no preference never becomes a cheapest-quote fallback',async()=>{
      const {id}=await open();const result=await advise(id);assert.equal(result.result.recommendedQuoteId,null);assert.equal(result.result.status,'ready');
    });
    await t.test('CH16-T10: current lower price and same-day availability can favour a newcomer over perfect historical ratings',async()=>{
      for(const priority of ['lower_total_price','earlier_availability']) {
        const {id,a,b}=await open(priority),result=await advise(id);assert.equal(result.result.recommendedQuoteId,b.quoteId);assert.deepEqual(result.result.citations,[b.quoteId]);
        const data=f.okay(await f.get('workspaces/'+id+'/advice',f.cm));
        assert.equal(data.evidence.quotes.find((q:{quoteId:string})=>q.quoteId===a.quoteId).pure,100);
        assert.equal(data.evidence.quotes.find((q:{quoteId:string})=>q.quoteId===b.quoteId).pure,null);
        assert.ok(result.result.limitations.some((v:string)=>v.includes('Historical timeliness')));
      }
    });
    await t.test('CH16-T04/T10: secondary priority breaks a primary tie; custom unknown facts withhold a winner',async()=>{
      const {id,b}=await open('lower_total_price','earlier_availability',true);assert.equal((await advise(id)).result.recommendedQuoteId,b.quoteId);
      const unknown=await open('earlier_availability');
      f.okay(await f.post('opportunities/'+unknown.id+'/quotes',{rfqRevision:1,terms:{...terms(),availability:'other',availabilityOther:'Subject to a separately confirmed site access date'}},f.contractor,1));
      assert.equal((await advise(unknown.id)).result.recommendedQuoteId,null);
    });
    await t.test('CH16-T09: quote revision during provider evaluation cannot overwrite a newer comparison',async()=>{
      const {id}=await open('lower_total_price');let started!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>started=r),wait=new Promise<void>(r=>release=r);
      const service=new AdviceService(new CommandService(f.db,f.identity,f.now),{name:'delayed-provider',evaluate:async()=>{started();await wait;return {recommendedQuoteId:null,citations:[]};}});
      const c=await comparison(id),pending=service.request(decodeURIComponent(f.cm.cookie.split('=')[1]!),{operationId:randomUUID(),accessVersion:1,expectedVersion:c.version,csrf:f.cm.csrf,requestId:randomUUID()},id,{confirmed:true});
      await entered;f.okay(await f.post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:terms('90.00','same_day')},f.rival,1));release();
      await assert.rejects(pending,(e:unknown)=>!!e&&typeof e==='object'&&'code' in e&&e.code==='ADVICE_STALE');
      assert.equal((await f.db.query('SELECT * FROM comparison_advice WHERE job_id=$1',[id])).length,0);
    });
    await t.test('Gemini cost boundary: bad/stale requests make no call, competing retries share one call, unchanged evidence reuses the saved result',async()=>{
      const {id,b}=await open('lower_total_price'),c=await comparison(id),token=decodeURIComponent(f.cm.cookie.split('=')[1]!);
      let calls=0,entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
      const service=new AdviceService(new CommandService(f.db,f.identity,f.now),{name:'counted-provider',evaluate:async()=>{calls++;entered();await hold;return {recommendedQuoteId:b.quoteId,citations:[b.quoteId]};}});
      const meta={operationId:randomUUID(),accessVersion:1,expectedVersion:c.version,csrf:f.cm.csrf,requestId:randomUUID()};
      await assert.rejects(()=>service.request(token,{...meta,csrf:'invalid'},id,{confirmed:true}));
      await assert.rejects(()=>service.request(token,{...meta,accessVersion:99},id,{confirmed:true}));
      await assert.rejects(()=>service.request(token,{...meta,expectedVersion:0},id,{confirmed:true}));
      await assert.rejects(()=>service.request(token,meta,id,{confirmed:false}));assert.equal(calls,0);
      const first=service.request(token,meta,id,{confirmed:true}),second=service.request(token,meta,id,{confirmed:true});await started;release();
      const results=await Promise.all([first,second]);assert.deepEqual(results[0],results[1]);assert.equal(calls,1);
      const repeat=await service.request(token,{...meta,operationId:randomUUID()},id,{confirmed:true});assert.equal(repeat.adviceId,results[0]!.adviceId);assert.equal(calls,1);
      assert.deepEqual(await service.request(token,meta,id,{confirmed:true}),results[0]);assert.equal(calls,1);
    });
    await t.test('CH16-T07/T11: changed reputation requires renewed selection review; selected evidence and verdict never change later',async()=>{
      const {id}=await open('lower_total_price');await advise(id);const before=await comparison(id);assert.ok(before.advice);
      await moderate('void');const stale=await select(id,before,before.quotes[0]);assert.equal(stale.statusCode,412);assert.equal(stale.json().error.code,'REPUTATION_CHANGED');
      await moderate('publish');await advise(id);const reviewed=await comparison(id);f.okay(await select(id,reviewed,reviewed.quotes[0]));
      const [frozen]=await f.db.query('SELECT snapshot FROM contractor_selections WHERE job_id=$1',[id]);assert.ok((frozen!.snapshot as {reputation:{advice:unknown}}).reputation.advice);
      await moderate('void');assert.deepEqual((await f.db.query('SELECT snapshot FROM contractor_selections WHERE job_id=$1',[id]))[0],frozen);
      const history=f.okay(await f.get('workspaces/'+id+'/selections',f.cm));assert.ok(history[0].reputation.advice);
      const [estate]=await f.db.query('SELECT version FROM estates WHERE id=$1',[ids.estate]);f.okay(await f.post('estates/'+ids.estate+'/procurement-settings',{identitiesVisible:false,reason:'Masked view'},f.mcst,Number(estate!.version)));
      const masked=f.okay(await f.get('workspaces/'+id+'/selections',f.cm));assert.ok(masked[0].reputation.quotes.every((q:{masked:boolean})=>q.masked));
      assert.ok(!JSON.stringify(masked).includes('Fictional Rival'));assert.ok(!JSON.stringify(masked).includes('Fictional Plumbing'));
    });
  } finally {await f.close();}
});
