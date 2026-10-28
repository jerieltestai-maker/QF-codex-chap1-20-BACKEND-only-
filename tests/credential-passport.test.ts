import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
import {eligibility} from '../packages/domain/verification-service.js';

test('Quote passports expose only approved public credential evidence within existing estate authority',async t=>{
  const f=await completionFixture();
  try {
    const id=await f.job('100.00',false),[quote]=await f.db.query('SELECT id FROM quotes WHERE job_id=$1',[id]);
    await f.db.query('UPDATE estates SET contractor_identities_visible=false WHERE id=$1',[ids.estate]);
    const path='workspaces/'+id+'/quotes/'+quote!.id+'/passport',profilePath='workspaces/'+id+'/contractor-profiles/'+ids.organisation;
    const privateValues=['PRIVATE-HOLDER','PRIVATE-REFERENCE','PRIVATE-AUTHENTICITY'];
    async function credential(name:string,expiry?:string,approved=true) {
      const type=f.okay(await f.post('admin/credential-types',{name,holderKind:'company',categories:['plumbing']},f.admin));
      const body={typeId:type.typeId,holderName:privateValues[0],reference:privateValues[1],...(expiry?{expiry}:{})};
      const submitted=f.okay(await f.post('contractors/'+ids.organisation+'/credentials',body,f.contractor));
      const decision=approved?f.okay(await f.post('admin/contractors/'+ids.organisation+'/decision',{credentialId:submitted.credentialId,outcome:'approved',categories:[],reason:'Offline evidence checked',internalNotes:privateValues[2]},f.admin,submitted.version)):submitted;
      return {typeId:type.typeId,credentialId:submitted.credentialId,version:decision.version,body};
    }
    const required=await credential('Required plumbing licence','2026-11-03'),optional=await credential('Optional training','2026-11-02');
    await credential('No expiry qualification');await credential('Unreviewed badge','2027-12-31',false);
    f.okay(await f.post('admin/trades/plumbing/configure',{requiredTypeIds:[required.typeId],reason:'Fictional required evidence setup'},f.admin,2));
    // A pending renewal must never replace the approved submission in public views.
    f.okay(await f.post('contractors/'+ids.organisation+'/credentials',{...optional.body,credentialId:optional.credentialId,expiry:'2027-12-31'},f.contractor,optional.version));
    await t.test('CM identity masking and MCST/Admin visibility share the same badge-only projector',async()=>{
      for(const client of [f.cm,f.mcst,f.admin]) {
        const passport=f.okay(await f.get(path,client)),profile=f.okay(await f.get(profilePath,client));
        assert.deepEqual(passport.badges,profile.badges);assert.equal(passport.badges.length,3);
        assert.equal(passport.masked,client===f.cm);assert.equal(passport.name,profile.name);
        assert.deepEqual(passport.badges.find((b:{name:string})=>b.name==='Optional training'),{name:'Optional training',expiry:'2026-11-02',expired:false});
        assert.deepEqual(passport.badges.find((b:{name:string})=>b.name==='No expiry qualification'),{name:'No expiry qualification',expiry:null,expired:false});
        for(const badge of passport.badges)assert.deepEqual(Object.keys(badge).sort(),['expired','expiry','name']);
        const json=JSON.stringify(passport);for(const secret of [...privateValues,ids.organisation,required.typeId,required.credentialId,optional.credentialId,'Unreviewed badge'])assert.ok(!json.includes(secret),secret);
      }
    });
    await t.test('Contractors, unrelated estates, unknown quotes and mismatched quote/job pairs cannot fetch a passport',async()=>{
      for(const client of [f.contractor,f.rival])assert.equal((await f.get(path,client)).statusCode,403);
      const unrelated=await f.login('cmtwo@example.test');await f.db.query('UPDATE memberships SET estate_id=$1 WHERE id=$2',[ids.otherEstate,ids.cm2]);
      assert.equal((await f.get(path,unrelated)).statusCode,404);
      assert.equal((await f.get('workspaces/'+id+'/quotes/'+randomUUID()+'/passport',f.cm)).statusCode,404);
      const otherId=f.okay(await f.post('workspaces',{estateId:ids.estate,title:'Different quote scope',observations:'Fictional observation',affectedLocation:'Another room'},f.cm)).jobId;
      assert.equal((await f.get('workspaces/'+otherId+'/quotes/'+quote!.id+'/passport',f.cm)).statusCode,404);
      const signedOut=await f.app.inject({url:'/api/v1/'+path});assert.equal(signedOut.statusCode,401);
    });
    await t.test('Expiry changes badge status at the effective Singapore boundary without changing required eligibility or bidder access',async()=>{
      f.setNow(new Date('2026-11-02T15:59:59.999Z'));assert.equal(f.okay(await f.get(path,f.cm)).badges.find((b:{name:string})=>b.name==='Optional training').expired,false);
      f.setNow(new Date('2026-11-02T16:00:00Z'));const optionalExpired=f.okay(await f.get(path,f.cm));
      assert.equal(optionalExpired.badges.find((b:{name:string})=>b.name==='Optional training').expired,true);
      assert.equal((await eligibility(f.db,ids.organisation,['plumbing'],f.now())).eligible,true);
      assert.deepEqual(optionalExpired.badges,f.okay(await f.get(profilePath,f.cm)).badges);
      f.setNow(new Date('2026-11-03T16:00:00Z'));
      assert.equal((await eligibility(f.db,ids.organisation,['plumbing'],f.now())).eligible,false);
      assert.equal((await f.get(profilePath,f.cm)).statusCode,404);
      assert.equal(f.okay(await f.get(path,f.cm)).badges.find((b:{name:string})=>b.name==='Required plumbing licence').expired,true);
      for(const client of [f.contractor,f.rival])assert.equal((await f.get(path,client)).statusCode,403);
    });
  } finally {await f.close();}
});

class Element {
  children:Element[]=[];attributes=new Map<string,string>();hidden=false;id='';className='';
  constructor(readonly tag:string,private text=''){}
  get textContent():string{return this.text+this.children.map(e=>e.textContent).join('');}
  set textContent(value:string){this.text=value;this.children=[];}
  append(...items:Element[]){this.children.push(...items);}
  replaceChildren(...items:Element[]){this.children=items;}
  setAttribute(name:string,value:string){this.attributes.set(name,value);}
}
test('Passport renders public badge names, explicit status, semantic expiry and an honest empty state',async()=>{
  const source=await readFile('apps/web/feedback.js','utf8'),main=new Element('main'),requested:string[]=[];
  let badges=[{name:'Plumbing <script>licence</script>',expiry:'2026-11-03',expired:false},{name:'Optional training',expiry:'2026-11-02',expired:true},{name:'Qualification',expiry:null,expired:false}];
  const qf={job:{id:'job'},context:{context:{role:'cm'}},api:async(path:string)=>{requested.push(path);return {name:'Contractor masked',badges,scores:{},sourceCounts:{},durability:[],limitations:[],entries:[]};}};
  const document={querySelector:()=>main,createElement:(tag:string)=>new Element(tag),addEventListener:()=>{}};
  const window:Record<string,any>={qfWorkspace:qf,addEventListener:()=>{}};
  runInNewContext(source,{window,document,navigator:{onLine:true}});
  const target=new Element('div');await window.qfReputation.passport('job','quote',target);
  const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],elements=all(target);
  assert.deepEqual(requested,['workspaces/job/quotes/quote/passport']);
  assert.equal(all(target.children[1]!).filter(e=>e.tag==='li').length,3);assert.ok(target.textContent.includes('Plumbing <script>licence</script>Verified'));
  assert.ok(target.textContent.includes('Optional trainingExpired'));assert.ok(target.textContent.includes('QualificationVerified · No expiry recorded'));
  assert.deepEqual(elements.filter(e=>e.tag==='time').map(e=>e.attributes.get('datetime')),['2026-11-03','2026-11-02']);
  assert.equal(elements.some(e=>e.tag==='script'),false);
  badges=[];await window.qfReputation.passport('job','quote',target);assert.ok(target.textContent.includes('No verified credential badges recorded.'));
  assert.equal(all(target.children[1]!).some(e=>e.tag==='li'),false);
});
