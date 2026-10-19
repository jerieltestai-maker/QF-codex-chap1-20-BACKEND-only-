import {completionFixture} from '../tests/completion-helper.js';
// Isolated in-memory fictional preview. Never opens the owner's normal database/configuration.
if(process.env.TEST_DATABASE_URL)throw new Error('Preview uses memory only; unset TEST_DATABASE_URL');
const f=await completionFixture('3002');
await f.job();await f.worker.tick(500);
let running:Promise<void>|undefined;
const interval=setInterval(()=>{if(!running)running=f.worker.tick().catch(()=>{console.error('Preview worker needs attention');}).finally(()=>{running=undefined;});},1000);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{clearInterval(interval);await running;await f.close();process.exit(0);});
await f.app.listen({host:'127.0.0.1',port:3002});
console.log('Fictional Chapters 19–20 preview ready at http://localhost:3002');
