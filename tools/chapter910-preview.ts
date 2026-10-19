// Disposable fictional browser preview; never touches the normal local database.
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids,fixturePassword} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {Worker} from '../packages/infrastructure/worker.js';
import {localFileInspector} from '../packages/infrastructure/file-inspection.js';
import {buildApp} from '../apps/api/src/app.js';
const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://',PORT:process.env.QF_PREVIEW_PORT??'3304'});
const db=await openDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
const identity=new IdentityService(db,config,{send:async()=>{}});await identity.initialize();const app=await buildApp(config,db,identity);
const worker=new Worker(db,localFileInspector());let running:Promise<void>|undefined,interval:ReturnType<typeof setInterval>|undefined;
app.addHook('preClose',async()=>{if(interval)clearInterval(interval);await running;});
async function login(email:string){const r=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email,password:fixturePassword},headers:{origin:config.origin}});if(r.statusCode!==200)throw new Error(r.body);return {cookie:String(r.headers['set-cookie']).split(';')[0]!,csrf:r.json().csrfToken};}
async function post(path:string,body:Record<string,unknown>,client:{cookie:string;csrf:string},version=0){const r=await app.inject({method:'POST',url:'/api/v1/'+path,payload:body,headers:{origin:config.origin,cookie:client.cookie,'x-csrf-token':client.csrf,'x-access-version':'1','if-match':`"record-${version}"`,'idempotency-key':randomUUID()}});if(r.statusCode!==200)throw new Error(path+': '+r.body);return r.json();}
const admin=await login('admin@example.test'),cm=await login('cm@example.test'),contractor=await login('contractor@example.test');
await post('admin/trades/plumbing/configure',{requiredTypeIds:[],reason:'Fictional preview configuration'},admin,1);
await post('contractors/'+ids.organisation+'/profile',{name:'Fictional Plumbing Company',contact:'Fictional private contact',categories:['plumbing'],description:'Fictional preview'},contractor,1);
await post('contractors/'+ids.organisation+'/submit',{},contractor,2);
await post('admin/contractors/'+ids.organisation+'/decision',{outcome:'approved',categories:['plumbing'],reason:'Fictional verification',internalNotes:''},admin,3);
await post('estates/'+ids.estate+'/procurement-settings',{thresholdSgd:'1000.00',address:'Fictional estate address',reason:'Fictional preview setup'},admin,1);
const job=await post('workspaces',{estateId:ids.estate,title:'Fictional authorised valve repair',observations:'Water observed near valve',affectedLocation:'Private service room'},cm);
await post('workspaces/'+job.jobId+'/rfq/intake',{categories:['plumbing'],urgency:'ordinary',noPhotoReason:'Fictional no-photo explanation',grouping:'combined',primaryPriority:'none',publicDescription:'Fictional valve repair',publicLocation:'Service room',evidenceIds:[]},cm,1);
await post('workspaces/'+job.jobId+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},cm,2);
const quote=await post('opportunities/'+job.jobId+'/quotes',{rfqRevision:1,terms:{amountSgd:'100.00',wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:new Date(Date.now()+30*86400000).toISOString(),expiryConfirmed:true,commitment:true}},contractor);
const comparison=(await app.inject({url:'/api/v1/workspaces/'+job.jobId+'/comparison',headers:{cookie:cm.cookie}})).json();
await post('workspaces/'+job.jobId+'/select',{quoteId:quote.quoteId,quoteVersion:quote.quoteVersion,settingsVersion:comparison.settingsVersion,rfqRevision:1,rationale:'Fictional chosen repair',confirmed:true,acknowledgedCautions:[...comparison.quotes[0].cautions,'limited_comparison'],thresholdAcknowledged:false},cm,comparison.version);
interval=setInterval(()=>{if(!running)running=worker.tick(50).catch(()=>{}).finally(()=>{running=undefined;});},1000);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{await app.close();process.exit(0);});
await app.listen({host:config.host,port:config.port});console.log('Fictional Chapters 09–10 preview at '+config.origin);
