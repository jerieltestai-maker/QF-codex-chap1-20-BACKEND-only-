import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {buildApp} from '../apps/api/src/app.js';
import {Worker} from '../packages/infrastructure/worker.js';
import {settleFixtureFees} from './billing-helper.js';
export type Client={cookie:string;csrf:string};
export async function completionFixture(port?:string,keepFeesCurrent=true) {
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://',...(port?{PORT:port,APP_ORIGIN:'http://localhost:'+port}:{})}),db=await testDatabase(config);
  await migrate(db,'test');await installFixtures(db,'test');let now=new Date('2026-11-02T04:00:00Z'),address=0,color=0;
  const identity=new IdentityService(db,config,{send:async()=>{}},()=>now);await identity.initialize();
  const app=await buildApp(config,db,identity),worker=new Worker(db,{scan:async()=>'clean'},()=>now);
  const post=(path:string,body:unknown,c:Client,v=0,key=randomUUID())=>app.inject({method:'POST',url:'/api/v1/'+path,payload:body as Record<string,unknown>,remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin,cookie:c.cookie,'x-csrf-token':c.csrf,'x-access-version':'1','if-match':`"record-${v}"`,'idempotency-key':key}});
  const get=(path:string,c:Client)=>app.inject({url:'/api/v1/'+path,remoteAddress:'127.0.0.'+(++address%240+1),headers:{cookie:c.cookie}});
  const okay=(r:Awaited<ReturnType<typeof post>>)=>{assert.equal(r.statusCode,200,r.body);return r.json();};
  async function login(email:string) {const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},remoteAddress:'127.0.0.'+(++address%240+1),headers:{origin:config.origin}});okay(r);await db.query("UPDATE sessions SET expires_at='2027-12-31T00:00Z'");return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
  const cm=await login('cm@example.test'),mcst=await login('mcst@example.test'),contractor=await login('contractor@example.test'),admin=await login('admin@example.test'),peer=await login('mcsttwo@example.test');
  okay(await post('admin/trades/plumbing/configure',{requiredTypeIds:[],reason:'Explicit fictional setup'},admin,1));
  okay(await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'100.00',reason:'Fictional threshold'},admin,1));
  await db.query('UPDATE organisations SET verified=true WHERE id=$1',[ids.organisation]);
  await db.query("INSERT INTO contractor_profiles VALUES($1,'Fictional contact',ARRAY['plumbing'],'',1,'approved',ARRAY['plumbing'],$2)",[ids.organisation,now.toISOString()]);
  const org=randomUUID(),user=randomUUID(),[hash]=await db.query('SELECT password_hash FROM users WHERE id=$1',[ids.contractor]);
  await db.query("INSERT INTO organisations(id,name,verified) VALUES($1,'Fictional Rival',true)",[org]);
  await db.query("INSERT INTO users(id,email,name,password_hash,email_verified) VALUES($1,'completionrival@example.test','Rival user',$2,true)",[user,hash!.password_hash]);
  await db.query("INSERT INTO memberships(id,user_id,role,organisation_id) VALUES($1,$2,'contractor',$3)",[randomUUID(),user,org]);const rival=await login('completionrival@example.test');
  const detail=async(id:string,c=cm)=>okay(await get('workspaces/'+id+'/completion',c));
  const cmd=async(id:string,path:string,body:unknown,c:Client)=>okay(await post('workspaces/'+id+'/'+path,body,c,(await detail(id,c)).version));
  async function job(amount='100.00',startWork=true) {
    if(keepFeesCurrent)await settleFixtureFees(post,get,contractor,admin,now);
    const id=okay(await post('workspaces',{estateId:ids.estate,title:'Fictional audited job',observations:'Fictional observation',affectedLocation:'Private plant room'},cm)).jobId as string;
    okay(await post('workspaces/'+id+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Unsafe to photograph',grouping:'combined',primaryPriority:'none',publicDescription:'Repair dripping valve',publicLocation:'Plant room',evidenceIds:[]},cm,1));
    okay(await post('workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,2));
    const q=okay(await post('opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:amount,wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:'2027-12-31',expiryConfirmed:true,commitment:true}},contractor));
    const c=okay(await get('workspaces/'+id+'/comparison',mcst));
    okay(await post('workspaces/'+id+'/select',{quoteId:q.quoteId,quoteVersion:q.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:1,rationale:'Factual selection',confirmed:true,acknowledgedCautions:[...c.quotes[0].cautions,'limited_comparison'],thresholdAcknowledged:true,reputationFingerprint:c.reputationFingerprint},mcst,c.version));
    if(startWork)await cmd(id,'work/start',{mode:'known',completedBy:new Date(now.getTime()+86400000).toISOString(),confirmed:true},contractor);return id;
  }
  async function file(id:string,purpose:'invoice'|'payment_proof'|'evidence',ready=true) {
    const who=purpose==='payment_proof'?mcst:contractor;
    const bytes=await sharp({create:{width:2,height:2,channels:3,background:{r:++color%255,g:60,b:90}}}).png().toBuffer();
    const upload=okay(await post('workspaces/'+id+'/'+(purpose==='evidence'?'work/uploads':'completion/uploads'),{...(purpose==='evidence'?{}:{purpose}),mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},who));
    okay(await post('uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},who));okay(await post('uploads/'+upload.uploadId+'/finalize',{},who));
    if(!ready)return upload.uploadId as string;
    for(let i=0;i<500;i++){const w=await worker.claim();if(!w)break;await worker.process(w);const [state]=await db.query('SELECT state FROM upload_intents WHERE id=$1',[upload.uploadId]);if(state!.state==='ready')break;}
    const result=okay(await get('uploads/'+upload.uploadId,who));assert.equal(result.state,'ready');return result.objects.find((o:Record<string,unknown>)=>o.variant==='original').id as string;
  }
  const complete=async(id:string,extra:Record<string,unknown>={})=>cmd(id,'completion/submit',{invoiceFileId:await file(id,'invoice'),amountSgd:'100.00',completedAt:now.toISOString(),confirmed:true,...extra},contractor);
  const inspect=async(id:string,outcome='accepted',extra:Record<string,unknown>={})=>cmd(id,'completion/inspect',{round:(await detail(id)).completion.round,outcome,checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:outcome==='accepted'?'':'Valve leaks',satisfactory:outcome==='accepted',confirmed:true,...extra},cm);
  const confirm=async(id:string)=>cmd(id,'payments/confirm-invoice',{invoiceVersion:(await detail(id)).completion.invoice_version,amountSgd:'100.00',confirmed:true},mcst);
  const transfer=async(id:string,extra:Record<string,unknown>={})=>cmd(id,'payments/transfer',{invoiceVersion:(await detail(id)).completion.confirmed_version,proofId:await file(id,'payment_proof'),amountSgd:'100.00',transferDate:now.toISOString().slice(0,10),completedTransfer:true,confirmed:true,...extra},mcst);
  const prepared=async()=>{const id=await job();await complete(id);await inspect(id);await confirm(id);return id;};
  return {db,app,identity,worker,cm,mcst,contractor,admin,peer,rival,post,get,okay,login,detail,cmd,job,file,complete,inspect,confirm,transfer,prepared,now:()=>now,setNow:(at:Date)=>{now=at;},close:()=>app.close()};
}
