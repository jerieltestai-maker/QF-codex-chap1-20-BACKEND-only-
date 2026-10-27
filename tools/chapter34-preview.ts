// Explicit ephemeral preview: fictional data only; normal development remains persistent.
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,migrate} from '../packages/infrastructure/database.js';
import {installFixtures} from '../packages/test-fixtures/fixtures.js';
import {IdentityService} from '../packages/domain/identity-service.js';
import {Worker} from '../packages/infrastructure/worker.js';
import {localFileInspector} from '../packages/infrastructure/file-inspection.js';
import {buildApp} from '../apps/api/src/app.js';
const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://',PORT:'3303'});
const db=await openDatabase(config);await migrate(db,'test');await installFixtures(db,'test');
const identity=new IdentityService(db,config,{send:async()=>{}});await identity.initialize();
const app=await buildApp(config,db,identity);
const worker=new Worker(db,localFileInspector());let running:Promise<void>|undefined;
const interval=setInterval(()=>{if(!running)running=worker.tick().catch(()=>{}).finally(()=>{running=undefined;});},1000);
app.addHook('preClose',async()=>{clearInterval(interval);await running;});
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{await app.close();process.exit(0);});
await app.listen({host:config.host,port:config.port});console.log('Fictional ephemeral chapter preview at '+config.origin);
