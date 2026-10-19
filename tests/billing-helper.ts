import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
type Response={statusCode:number;body:string;json:()=>any};
import {ids} from '../packages/test-fixtures/fixtures.js';
type Client={cookie:string;csrf:string};
// Legacy completion scenarios advance a shared clock for weeks. Keep their Contractor
// fee account current through the real report/verification API before sourcing a new job.
export async function settleFixtureFees(post:(path:string,body:unknown,c:Client,v?:number)=>Promise<Response>,get:(path:string,c:Client)=>Promise<Response>,contractor:Client,admin:Client,now:Date) {
  const okay=(r:Response)=>{assert.equal(r.statusCode,200,r.body);return r.json();},base='organisations/'+ids.organisation+'/billing';
  let statement=okay(await get(base,contractor));const n=BigInt(statement.outstandingCents);if(n===0n)return;
  const sgd=(c:bigint)=>`${c/100n}.${String(c%100n).padStart(2,'0')}`;
  const report=okay(await post(base+'/report',{amountSgd:sgd(n),paidDate:now.toISOString(),context:'Fictional fee payment for independent regression fixture'},contractor,statement.version));
  statement=okay(await get(base,admin));
  okay(await post(base+'/verify',{reportId:report.reportId,amountSgd:sgd(n),receivedDate:now.toISOString(),reference:randomUUID(),evidence:'Fictional verified bank collection',allocations:statement.liabilities.filter((d:Record<string,unknown>)=>BigInt(String(d.outstanding_cents))>0n).map((d:Record<string,unknown>)=>({debitId:d.id,amountSgd:sgd(BigInt(String(d.outstanding_cents)))}))},admin,statement.version));
}
