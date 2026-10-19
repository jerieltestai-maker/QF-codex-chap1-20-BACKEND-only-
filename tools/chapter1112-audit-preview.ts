// Disposable fictional UI test only. The clean scanner adapter belongs to this test fixture,
// never to normal development/production. No bank or external account is used.
import {completionFixture} from '../tests/completion-helper.js';
const port='3306',f=await completionFixture(port);
const started=await f.job();await f.db.query("UPDATE job_records SET title='Fictional completion form' WHERE id=$1",[started]);
const inspect=await f.job();await f.complete(inspect);await f.inspect(inspect,'unsatisfactory');await f.complete(inspect,{originatingRound:1,explanation:'Fictional repaired valve'});
await f.db.query("UPDATE job_records SET title='Fictional second inspection' WHERE id=$1",[inspect]);
const payment=await f.prepared();await f.transfer(payment);await f.worker.tick(500);
const p=(await f.detail(payment)).transfers[0];f.setNow(new Date(p.receipt_due_at));await f.worker.tick(500);
await f.db.query("UPDATE job_records SET title='Fictional assumed receipt' WHERE id=$1",[payment]);
let running:Promise<void>|undefined;
const timer=setInterval(()=>{if(!running)running=f.worker.tick(100).finally(()=>{running=undefined;});},1000);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{clearInterval(timer);await running;await f.close();process.exit(0);});
await f.app.listen({host:'127.0.0.1',port:Number(port)});
console.log('Disposable fictional Chapters 11/12 UI test at http://localhost:'+port);
