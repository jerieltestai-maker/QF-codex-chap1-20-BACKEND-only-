import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
type Row=Record<string,any>;
interface Store {get(key:string):Promise<Row|undefined>;put(row:Row):Promise<void>;remove(key:string):Promise<void>}
interface Queue {get(id:string,purpose:string,slot:string):Promise<Row|undefined>;queue(id:string,purpose:string,slot:string,file:File):Promise<Row>;resume(id:string,purpose:string,slot:string):Promise<Row>;remove(id:string,purpose:string,slot:string):Promise<void>}
const window:{qfWorkUploads?:{create(options:Row):Queue}}={};
runInNewContext(await readFile('apps/web/work-uploads.js','utf8'),{window,crypto:webcrypto,Uint8Array,btoa});
function memory():Store {const rows=new Map<string,Row>();return {get:async k=>rows.has(k)?structuredClone(rows.get(k)):undefined,put:async row=>{rows.set(row.key,structuredClone(row));},remove:async k=>{rows.delete(k);}};}
function server() {
  const calls:{route:string;body?:Row}[]=[],chunks=new Map<number,Buffer>();let intents=0,state='transferring',checksum='',loseChunk=false;
  const api=async(route:string,body?:Row):Promise<Row>=>{
    calls.push({route,...(body?{body}:{})});
    if(route.endsWith('/renew'))return {};
    if(route.endsWith('/chunks')) {chunks.set(body!.offset,Buffer.from(body!.bytes,'base64'));if(loseChunk){loseChunk=false;throw new Error('Chunk response lost after server commit');}return {};}
    return {state,chunks:[...chunks].map(([byte_offset,bytes])=>({byte_offset,size:bytes.length})),objects:state==='ready'?[{id:'ready-file',variant:'original'}]:[]};
  };
  const submit=async(route:string,body:Row):Promise<Row>=>{
    calls.push({route,body});
    if(route.endsWith('/finalize')) {assert.equal(createHash('sha256').update(Buffer.concat([...chunks].sort(([a],[b])=>a-b).map(([,b])=>b))).digest('hex'),checksum);state='ready';return {state};}
    intents++;checksum=body.checksum;return {uploadId:'upload-'+intents};
  };
  return {api,submit,calls,lose:()=>{loseChunk=true;},intents:()=>intents};
}
test('O37/CH11-T02: offline invoice bytes survive reload, interrupted committed chunk resumes without duplication or completion submission',async()=>{
  const store=memory(),s=server();let online=false;
  const opts={...s,store,scope:()=> 'user:contractor',current:(id:string)=>id==='job',online:()=>online};
  const file=new File([new Uint8Array(300000).fill(7)],'fictional-invoice.png',{type:'image/png'});
  const first=window.qfWorkUploads!.create(opts);await first.queue('job','invoice','Invoice',file);
  await assert.rejects(first.resume('job','invoice','Invoice'),/Connect/);assert.equal(s.calls.length,0);
  online=true;s.lose();await assert.rejects(first.resume('job','invoice','Invoice'),/response lost/);
  const reloaded=window.qfWorkUploads!.create(opts),result=await reloaded.resume('job','invoice','Invoice');
  assert.equal(result.state,'ready');assert.equal(result.objects[0].id,'ready-file');assert.equal(result.file,undefined);assert.equal(s.intents(),1);
  assert.equal(s.calls.filter(c=>c.route.endsWith('/chunks')&&c.body?.offset===0).length,1);
  assert.ok(s.calls.every(c=>c.route.includes('/uploads')||c.route.startsWith('uploads/')));
});
test('Upload drafts cannot cross accounts/roles/jobs; switching context during hashing prevents persistence or network submission',async()=>{
  const store=memory(),s=server();let scope='user:mcst',job='job';
  const opts={...s,store,scope:()=>scope,current:(id:string)=>id===job,online:()=>true};
  const q=window.qfWorkUploads!.create(opts),file=new File(['fixture'],'proof.png',{type:'image/png'});await q.queue(job,'payment_proof','Proof',file);
  scope='other:mcst';assert.equal(await q.get(job,'payment_proof','Proof'),undefined);await assert.rejects(q.resume(job,'payment_proof','Proof'),/Choose/);assert.equal(s.calls.length,0);
  scope='user:mcst';job='other-job';await assert.rejects(q.resume('job','payment_proof','Proof'),/changed/);assert.equal(s.calls.length,0);
  job='job';let release:(v:ArrayBuffer)=>void=()=>{};
  const waiting={type:'image/png',size:1,arrayBuffer:()=>new Promise<ArrayBuffer>(r=>{release=r;})} as File;
  const pending=q.queue(job,'invoice','Invoice',waiting);await new Promise<void>(r=>setImmediate(r));scope='switched:contractor';release(new ArrayBuffer(1));await assert.rejects(pending,/changed/);
  scope='user:mcst';assert.equal(await q.get(job,'invoice','Invoice'),undefined);
});
test('Concurrent attachment resume creates one intent; invoice, correction and optional evidence use separate resumable slots',async()=>{
  const store=memory(),s=server(),q=window.qfWorkUploads!.create({...s,store,scope:()=> 'user:contractor',current:()=>true,online:()=>true});
  const file=new File(['same fixture'],'invoice.png',{type:'image/png'});await q.queue('job','invoice','Invoice',file);
  const [a,b]=await Promise.all([q.resume('job','invoice','Invoice'),q.resume('job','invoice','Invoice')]);assert.equal(a.uploadId,b.uploadId);assert.equal(s.intents(),1);
  assert.equal(await q.get('job','invoice','Corrected invoice'),undefined);assert.equal(await q.get('job','evidence','Completion evidence'),undefined);
  await q.queue('job','evidence','Completion evidence',file);assert.equal((await q.get('job','invoice','Invoice'))!.state,'ready');
  await q.remove('job','evidence','Completion evidence');assert.equal((await q.get('job','invoice','Invoice'))!.state,'ready');
});
