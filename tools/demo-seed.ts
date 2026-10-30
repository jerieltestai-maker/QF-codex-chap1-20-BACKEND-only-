/** Additive fictional local demo. Never runs migrations or installs/reset fixtures. */
import {existsSync} from 'node:fs';
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase} from '../packages/infrastructure/database.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {localMailbox} from '../packages/infrastructure/local-identity.js';
import {singaporeDate} from '../packages/domain/calendar.js';
import {ensureDemoContractors} from './demo-accounts.js';
import {buildApp} from '../apps/api/src/app.js';
const expectedDatabase='quotefix_prototype_9aca09705ab8455192762decfd2a1d0a_development';
const estateId='20000000-0000-4000-8000-000000000001',orgId='30000000-0000-4000-8000-000000000001';
const args=process.argv.slice(2);
if(args.some(a=>!['--apply','--check'].includes(a))||args.length!==1)throw new Error('Use --check (read-only) or --apply');
if(existsSync('.env'))loadEnvFile('.env');
const config=loadConfig({...process.env,ADVICE_PROVIDER:'local'}),target=new URL(config.databaseUrl??'http://invalid');
if(config.environment!=='development'||config.databaseAdapter!=='postgres'||target.hostname!=='127.0.0.1'||target.port!=='5432'||decodeURIComponent(target.pathname.slice(1))!==expectedDatabase||config.origin!=='http://127.0.0.1:3000')throw new Error('Demo requires the inspected local development database and app origin');
if(!config.localAccountHelper)throw new Error('Demo requires the existing encrypted local account helper; no password will be reset');
const db=await openDatabase(config);let databaseClosed=false;
try {
 const [identity]=await db.query('SELECT environment FROM deployment_identity'),[database]=await db.query('SELECT current_database() AS name,inet_server_port() AS port');
 if(identity?.environment!=='development'||database?.name!==expectedDatabase||Number(database?.port)!==5432)throw new Error('Database identity mismatch');
 const [estate]=await db.query('SELECT name,approval_threshold_cents FROM estates WHERE id=$1',[estateId]);
 const rules=await db.query("SELECT category,configured FROM trade_rules WHERE configured=true AND NOT EXISTS(SELECT 1 FROM trade_requirements t WHERE t.category=trade_rules.category) ORDER BY category");
 const category=rules.some(r=>r.category==='plumbing')?'plumbing':'';
 if(!estate)throw new Error('Expected estate unavailable');
 if(!category&&(await db.query("SELECT category FROM trade_rules WHERE category='plumbing' AND configured=false AND NOT EXISTS(SELECT 1 FROM trade_requirements WHERE category='plumbing')")).length===0)throw new Error('Existing trade configuration requires credentials; no settings changed');
 const accounts=await db.query("SELECT email FROM users WHERE email IN ('cm@example.test','mcst@example.test','admin@example.test','contractor@example.test') AND active=true AND email_verified=true");
 if(accounts.length!==4)throw new Error('Expected active fictional accounts unavailable');
 const expected=[['10000000-0000-4000-8000-000000000001','admin',null,null],['10000000-0000-4000-8000-000000000002','cm',estateId,null],['10000000-0000-4000-8000-000000000003','mcst',estateId,null],['10000000-0000-4000-8000-000000000004','contractor',null,orgId]];
 for(const [id,role,estate,org] of expected)if((await db.query('SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.id=$1 AND m.role=$2 AND m.active=true AND m.estate_id IS NOT DISTINCT FROM $3::uuid AND m.organisation_id IS NOT DISTINCT FROM $4::uuid',[id,role,estate,org])).length!==1)throw new Error('Expected fictional account membership mismatch');
 console.log(JSON.stringify({database:database.name,estate:estate.name,category:category||'plumbing (initial setup required)',mode:args[0]}));
 if(args[0]==='--apply')await apply(category||'plumbing');
} finally {if(!databaseClosed)await db.close();}
function operationId(key:string){const h=createHash('sha256').update('qf-demo-v1:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
async function apply(category:string) {
 await mkdir('work/demo-seed',{recursive:true});
 const lock=await open('work/demo-seed/seed.lock','wx').catch(()=>{throw new Error('Demo seed lock exists; verify no seeder is running before recovering the local lock');});
 try{await seed(category);}finally{await lock.close();await unlink('work/demo-seed/seed.lock');}
}
async function seed(category:string) {
 type Json=Record<string,any>;
 type Entry={path:string;body:Json;version:number;role:string;result?:Json};
 type Manifest={format:1;database:string;origin:string;environment:string;createdAt:string;completed:string[];entries:Record<string,Entry>};
 const directory='work/demo-seed',manifestPath=directory+'/manifest-v1.json';await mkdir(directory,{recursive:true});
 if(!existsSync(manifestPath)&&(await db.query("SELECT id FROM job_records WHERE title LIKE '[Demo] %' LIMIT 1")).length)throw new Error('Demo records exist without manifest; refusing duplication');
 const manifest:Manifest=existsSync(manifestPath)?JSON.parse(await readFile(manifestPath,'utf8')):{format:1,database:expectedDatabase,origin:config.origin,environment:config.environment,createdAt:new Date().toISOString(),completed:[],entries:{}};
 if(manifest.format!==1||manifest.database!==expectedDatabase||manifest.origin!==config.origin||manifest.environment!==config.environment||!Array.isArray(manifest.completed))throw new Error('Manifest identity mismatch');
 const save=async()=>{
  await writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2));
  for(let attempt=0;;attempt++){
   try{await rename(manifestPath+'.tmp',manifestPath);return;}
   catch(error){
    if(attempt>=9||!['EPERM','EACCES','EBUSY'].includes(String((error as NodeJS.ErrnoException).code)))throw error;
    // OneDrive/Windows may hold a brief file handle. Preserve the prior manifest
    // and atomically replace it only when the handle is released.
    await new Promise(resolve=>setTimeout(resolve,Math.min(500,100*(attempt+1))));
   }
  }
 };
 const identity=new IdentityService(db,config,localMailbox(config));await identity.initialize();
 const app=await buildApp(config,db,identity),clients:Record<string,{cookie:string;csrf:string;access:number}>={};
 async function retry<T extends {statusCode:number}>(action:()=>Promise<T>):Promise<T>{for(let attempt=0;attempt<14;attempt++){const response=await action();if(response.statusCode!==429)return response;console.log('Local request budget reached; waiting to retry the same operation.');await new Promise(resolve=>setTimeout(resolve,10000));}throw new Error('Local request budget did not recover; rerun safely');}
 const okay=(r:{statusCode:number;body:string;json:()=>any})=>{if(r.statusCode!==200)throw new Error('Demo API failed: '+r.body);return r.json() as Json;};
 try {
  for(const role of ['cm','mcst','admin','contractor']) {
   const [user]=await db.query('SELECT id FROM users WHERE email=$1',[role+'@example.test']);
   const credentials=okay(await retry(()=>app.inject({method:'POST',url:'/api/v1/dev/accounts/autofill',remoteAddress:'127.0.0.1',headers:{host:new URL(config.origin).host,origin:config.origin},payload:{userId:user!.id}})));
   const r=await app.inject({method:'POST',url:'/api/v1/auth/login',headers:{origin:config.origin},payload:{email:role+'@example.test',password:String(credentials.password)}}),data=okay(r);
   const cookie=String(r.headers['set-cookie']).split(';')[0]!;
   const token=decodeURIComponent(cookie.slice(cookie.indexOf('=')+1)),actor=await identity.actor(token);
   clients[role]={cookie,csrf:String(data.csrfToken),access:actor.accessVersion};
  }
  const get=async(path:string,role='cm')=>okay(await retry(()=>app.inject({url:'/api/v1/'+path,headers:{cookie:clients[role]!.cookie}})));
  const command=async(key:string,path:string,body:Json,role='cm',version=0):Promise<Json>=>{
   let entry=manifest.entries[key];
   if(entry?.result)return entry.result;
   if(!entry){entry={path,body,version,role};manifest.entries[key]=entry;await save();}
   const client=clients[entry.role]!;
   const versionKind=entry.path==='contractor/applications'?'access':'record';
   const result=okay(await retry(()=>app.inject({method:'POST',url:'/api/v1/'+entry.path,payload:entry.body,headers:{origin:config.origin,cookie:client.cookie,'x-csrf-token':client.csrf,'x-access-version':String(client.access),'if-match':`"${versionKind}-${entry.version}"`,'idempotency-key':operationId(key)}})));
   entry.result=result;await save();return result;
  };
  const detail=(id:string,role='cm')=>get('workspaces/'+id+'/completion',role);
  const cmd=async(key:string,id:string,path:string,body:Json,role='cm')=>command(key,'workspaces/'+id+'/'+path,body,role,Number((await detail(id,role)).version));
  const settings=await get('estates/'+estateId+'/procurement-settings','admin');
  if(settings.thresholdCents===null)await command('setup/threshold','estates/'+estateId+'/procurement-settings',{thresholdSgd:'3000.00',reason:'[Demo] Owner-authorised absent-only fictional local procurement setup.'},'admin',Number(settings.version));
  const rules=await get('verification/rules','admin'),rule=rules.rules.find((r:Json)=>r.category===category);
  if(!rule?.configured)await command('setup/trade','admin/trades/'+category+'/configure',{requiredTypeIds:[],reason:'[Demo] Owner-authorised fictional local demonstration; no real credential policy.'},'admin',Number(rule?.version??1));
  const integrity=await get('estates/'+estateId+'/integrity-settings','admin');
  if(!integrity.configured)await command('setup/integrity','estates/'+estateId+'/integrity-settings',{values:{quoteRevisionPct:20,selectedPricePct:30,variationGrowthPct:20,minimumQuotes:3},acknowledged:true,reason:'[Demo] Owner-authorised absent-only local warning settings.'},'admin',0);
  const contractor=await get('contractors/'+orgId,'admin');
  if(contractor.profile?.state!=='approved') {
   await command('contractor/profile','contractors/'+orgId+'/profile',{name:String(contractor.organisation.name),contact:'Fictional local demo contact',categories:[category],description:'Fictional local demonstration contractor; no real service or credentials.'},'contractor',Number(contractor.organisation.version));
   let current=await get('contractors/'+orgId,'admin');
   if(current.profile?.state!=='pending')await command('contractor/submit','contractors/'+orgId+'/submit',{},'contractor',Number(current.organisation.version));
   current=await get('contractors/'+orgId,'admin');
   await command('contractor/approve','admin/contractors/'+orgId+'/decision',{outcome:'approved',categories:[category],reason:'Owner-authorised fictional local demonstration only',internalNotes:'No genuine contractor credential claim.'},'admin',Number(current.organisation.version));
  }
  const rivals=await ensureDemoContractors(app,db,config,clients,get,command);
  // An application may commit before its result reaches the local manifest.
  // The resulting membership makes bootstrap skip creation; replay the saved
  // request to retrieve its server receipt without creating another account.
  for(const [key,entry] of Object.entries(manifest.entries))if(entry.path==='contractor/applications'&&!entry.result){
   await command(key,entry.path,entry.body,entry.role,entry.version);
  }
  const scenarios=[['draft','Lobby washroom tap',0],['quoting','Car park drain',1],['approval','Pump-room valve',2],['scheduled','Service-room tap',3],['progress','Corridor pipe leak',4],['inspection','Bin centre pipe',5],['payment','Pool shower valve',6],['receipt','Clubhouse tap',7],['settled','Completed garden tap repair',8]] as const;
  async function file(key:string,id:string,purpose:'invoice'|'payment_proof') {
   const text=`<svg width="900" height="460"><rect width="900" height="460" fill="white"/><g font-family="sans-serif" fill="#172c45"><text x="45" y="70" font-size="32">[Demo] FICTIONAL ${purpose==='invoice'?'INVOICE':'TRANSFER PROOF'}</text><text x="45" y="130" font-size="23">QuoteFix local demonstration — no real transaction</text><text x="45" y="195" font-size="23">Scenario: ${key}</text><text x="45" y="255" font-size="23">Amount: SGD 900.00</text><text x="45" y="320" font-size="20">Not a tax invoice, bank receipt or operational evidence</text><text x="45" y="385" font-size="16">${id}</text></g></svg>`;
   const bytes=await sharp(Buffer.from(text)).png().toBuffer(),role=purpose==='invoice'?'contractor':'mcst';
   const upload=await command(key+'/intent','workspaces/'+id+'/completion/uploads',{purpose,mediaType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')},role);
   await command(key+'/chunk','uploads/'+upload.uploadId+'/chunks',{offset:0,bytes:bytes.toString('base64')},role);
   await command(key+'/finalize','uploads/'+upload.uploadId+'/finalize',{},role);
   for(let i=0;i<120;i++) {const status=await get('uploads/'+upload.uploadId,role);if(status.state==='ready')return String(status.objects.find((o:Json)=>o.variant==='original').id);if(['rejected','failed'].includes(status.state))throw new Error('Real file processing rejected demo upload');await new Promise(resolve=>setTimeout(resolve,1000));}
   throw new Error('Waiting for normal application worker/scanner; rerun safely after processing is available');
  }
  const finish=async(key:string)=>{if(!manifest.completed.includes(key)){manifest.completed.push(key);await save();}};
  for(const [key,title,level] of scenarios) {
   if(manifest.completed.includes(key)){const e=manifest.entries[key+'/create'];if(!e?.result||(await db.query('SELECT id FROM job_records WHERE id=$1',[e.result.jobId])).length!==1)throw new Error('Completed demo record missing; refusing recreation');continue;}
   const created=await command(key+'/create','workspaces',{estateId,title:'[Demo] '+title,observations:'FICTIONAL demo: '+title+' requires a small plumbing repair. No real defect is reported.',affectedLocation:'Fictional '+title});const id=String(created.jobId);
   if(level===0){await finish(key);continue;}
   await command(key+'/intake','workspaces/'+id+'/rfq/intake',{categories:[category],urgency:'ordinary',noPhotoReason:'Fictional demonstration; no real site photo exists.',grouping:'combined',primaryPriority:'none',publicDescription:'[Demo] '+title+': replace the fictional faulty fitting, test the connection for leaks and make good the immediate work area.',publicLocation:'Fictional common area',evidenceIds:[]},'cm',1);
   await command(key+'/publish','workspaces/'+id+'/rfq/publish',{privacyConfirmed:true,factsConfirmed:true},'cm',2);
   const quote=await command(key+'/quote','opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:level===2?'4800.00':'900.00',wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:singaporeDate(new Date(Date.now()+30*86400000)),expiryConfirmed:true,commitment:true}},'contractor');
   if(level===1){for(const [index,rival] of rivals.entries())await command(key+'/quote/'+rival.role,'opportunities/'+id+'/quotes',{rfqRevision:1,terms:{amountSgd:index===0?'950.00':'1020.00',wasteDisposal:true,warranty:false,makingGood:true,gstCharged:false,availability:'next_day',duration:'1_day',exclusions:['none'],expiry:singaporeDate(new Date(Date.now()+30*86400000)),expiryConfirmed:true,commitment:true}},rival.role);await finish(key);continue;}
   // Comparison fingerprints include the actor's role, context and masked identities.
   const comparison=await get('workspaces/'+id+'/comparison',level===2?'cm':'mcst'),cautions=[...new Set([...comparison.quotes.flatMap((q:Json)=>q.cautions), 'limited_comparison'])];
   const selection=await command(key+'/select','workspaces/'+id+'/select',{quoteId:quote.quoteId,quoteVersion:quote.quoteVersion,settingsVersion:comparison.settingsVersion,rfqRevision:1,rationale:'[Demo] Fictional plumbing offer; limited comparison explicitly reviewed.',confirmed:true,acknowledgedCautions:cautions,thresholdAcknowledged:true,reputationFingerprint:comparison.reputationFingerprint,clearWarning:true,warningExplanation:'[Demo] Single fictional offer is deliberately used for workflow demonstration; no real procurement.'},level===2?'cm':'mcst',Number(comparison.version));
   if(level===2){if(!selection.pendingMcst)throw new Error('Existing settings did not produce MCST approval; no settings changed');await finish(key);continue;}
   if(level===3){const proposal=await cmd(key+'/schedule-proposal',id,'variations',{kind:'start_schedule',proposal:{reason:'[Demo] Agree a fictional access slot.',timing:'changed',targetAt:new Date(Date.now()+2*86400000).toISOString(),timingReason:'[Demo] Common-area access slot.',canContinueOriginal:true,canContinueApproved:true},confirmed:true},'contractor');await cmd(key+'/schedule-approve',id,'variations/decide',{variationId:proposal.variationId,proposalVersion:proposal.proposalVersion,outcome:'approved',confirmed:true,reason:'[Demo] Fictional access slot agreed.'},'cm');await finish(key);continue;}
   await cmd(key+'/start',id,'work/start',{mode:'known',completedBy:new Date(Date.now()+86400000).toISOString(),confirmed:true},'contractor');
   await cmd(key+'/update',id,'work/update',{note:'[Demo] Fictional fitting isolated and replacement work underway.',fileIds:[]},'contractor');
   if(level===4){await cmd(key+'/support',id,'cases',{description:'[Demo] Please clarify the fictional common-area access arrangement; no genuine incident.',category:'general',privacy:'ordinary',subjectUserIds:[],subjectOrganisationIds:[]});await finish(key);continue;}
   await cmd(key+'/complete',id,'completion/submit',{invoiceFileId:await file(key+'/invoice',id,'invoice'),amountSgd:'900.00',completedAt:new Date().toISOString(),confirmed:true},'contractor');
   if(level===5){await finish(key);continue;}
   const completion=await detail(id);
   await cmd(key+'/inspect',id,'completion/inspect',{round:completion.completion.round,outcome:'accepted',checklist:{scopeReviewed:true,issuesReviewed:true,evidenceReviewed:true,invoiceReviewed:true},findings:'',satisfactory:true,confirmed:true});
   await cmd(key+'/confirm',id,'payments/confirm-invoice',{invoiceVersion:(await detail(id)).completion.invoice_version,amountSgd:'900.00',confirmed:true},'mcst');
   if(level===6){await finish(key);continue;}
   await cmd(key+'/transfer',id,'payments/transfer',{invoiceVersion:(await detail(id)).completion.confirmed_version,proofId:await file(key+'/proof',id,'payment_proof'),amountSgd:'900.00',transferDate:singaporeDate(new Date()),reference:'DEMO-'+key,completedTransfer:true,confirmed:true},'mcst');
   if(level===7){await finish(key);continue;}
   const transferred=await detail(id,'contractor');
   await cmd(key+'/receipt',id,'payments/receipt',{transferId:transferred.transfers[0].id,amountSgd:'900.00',receiptDate:singaporeDate(new Date()),confirmed:true},'contractor');
   await finish(key);
  }
  console.log('Demo scenarios populated. Manifest: '+manifestPath);
 } finally {for(const c of Object.values(clients)){const token=decodeURIComponent(c.cookie.slice(c.cookie.indexOf('=')+1));await identity.logout(token,c.csrf).catch(()=>{});}await app.close();databaseClosed=true;}
}
