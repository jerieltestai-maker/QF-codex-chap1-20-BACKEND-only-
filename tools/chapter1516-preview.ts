// Isolated fictional test database. Never opens or modifies the development database.
import {completionFixture} from '../tests/completion-helper.js';
const f=await completionFixture('3186'),id=await f.prepared();
await f.transfer(id);const [transfer]=await f.db.query('SELECT id FROM payment_transfers WHERE job_id=$1',[id]);
await f.cmd(id,'payments/receipt',{transferId:transfer!.id,amountSgd:'100.00',receiptDate:'2026-11-02',confirmed:true},f.contractor);
f.setNow(new Date('2026-12-02T01:00:00Z'));await f.worker.tick(2000);
await f.app.listen({host:'127.0.0.1',port:3186});
console.log('Fictional Chapters 15–16 preview: http://127.0.0.1:3186 · job '+id);
const timer=setInterval(()=>f.worker.tick().catch(()=>{}),1000);
const stop=async()=>{clearInterval(timer);await f.close();};
process.once('SIGINT',()=>{void stop();});process.once('SIGTERM',()=>{void stop();});
