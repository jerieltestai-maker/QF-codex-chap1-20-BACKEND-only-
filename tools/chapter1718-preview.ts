// Isolated fictional preview: never opens the development database or calls Gemini.
import {completionFixture} from '../tests/completion-helper.js';
import {INTEGRITY_DEFAULTS} from '../packages/domain/integrity-settings.js';
import {ids} from '../packages/test-fixtures/fixtures.js';
const f=await completionFixture('3188'),id=await f.job();
f.okay(await f.post('estates/'+ids.estate+'/integrity-settings',{values:INTEGRITY_DEFAULTS,acknowledged:true,reason:'Explicit fictional estate defaults'},f.mcst,1));
f.okay(await f.post('workspaces/'+id+'/integrity-settings',{values:INTEGRITY_DEFAULTS,acknowledged:true,reason:'Explicit fictional future-event warning setup'},f.mcst));
const work=f.okay(await f.get('workspaces/'+id+'/work',f.contractor));
await f.cmd(id,'variations',{kind:'scope_price',confirmed:true,proposal:{reason:'Additional valve replacement',scope:work.state.scope+' and additional valve',newTotalSgd:'120.00',timing:'unchanged',canContinueOriginal:true,canContinueApproved:true}},f.contractor);
await f.worker.tick(2000);
await f.app.listen({host:'127.0.0.1',port:3188});
console.log('Fictional Chapters 17–18 preview: http://localhost:3188 · job '+id);
const timer=setInterval(()=>f.worker.tick().catch(()=>{}),1000);
const stop=async()=>{clearInterval(timer);await f.close();};
process.once('SIGINT',()=>{void stop();});process.once('SIGTERM',()=>{void stop();});
