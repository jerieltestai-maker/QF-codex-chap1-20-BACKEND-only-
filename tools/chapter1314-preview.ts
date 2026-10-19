// Disposable fictional browser fixture, isolated memory database; never production collection.
import {completionFixture} from '../tests/completion-helper.js';
const port='3307',f=await completionFixture(port,false);
const billed=await f.prepared();await f.db.query("UPDATE job_records SET title='Fictional billing source' WHERE id=$1",[billed]);
const stopped=await f.job();await f.cmd(stopped,'cancel',{reason:'Fictional cancellation for browser verification',confirmed:true},f.cm);
await f.db.query("UPDATE job_records SET title='Fictional cancelled work' WHERE id=$1",[stopped]);await f.worker.tick(500);
const [cancel]=await f.db.query('SELECT id FROM cancellations WHERE job_id=$1',[stopped]);
await f.cmd(stopped,'cancellation/respond',{cancellationId:cancel!.id,outcome:'claim',description:'Fictional materials commitment for Admin review'},f.contractor);
let running:Promise<void>|undefined;
const timer=setInterval(()=>{if(!running)running=f.worker.tick(100).finally(()=>{running=undefined;});},1000);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{clearInterval(timer);await running;await f.close();process.exit(0);});
await f.app.listen({host:'127.0.0.1',port:Number(port)});
console.log('Disposable fictional Chapters 13/14 preview at http://localhost:'+port);
