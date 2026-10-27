import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';

interface WebCommand {key:string;signature:string;version:number}
type Api=(route:string,body?:unknown,command?:WebCommand)=>Promise<Record<string,unknown>>;
interface Commands {submit(route:string,body:unknown,version?:number):Promise<Record<string,unknown>>;recover():Promise<{route:string;result:Record<string,unknown>|null}[]>}
interface Factory {sameInput(a:unknown,b:unknown):boolean;create(options:{api:Api;partition:()=>string;generation:()=>number;storage:Storage;online:()=>boolean;digest:(bytes:Uint8Array)=>Promise<string>}):Commands}
const window:{qfCommands?:Factory}={};
runInNewContext(await readFile('apps/web/commands.js','utf8'),{window,TextEncoder,crypto:{randomUUID}});
const factory=window.qfCommands!;
function store():Storage {
  const values=new Map<string,string>();
  return {get length(){return values.size;},getItem:key=>values.get(key)??null,key:index=>[...values.keys()][index]??null,setItem:(key,value)=>{values.set(key,value);},removeItem:key=>{values.delete(key);},clear:()=>values.clear()};
}
const digest=async(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const missing=()=>Object.assign(new Error('Unavailable'),{status:404});

test('RFQ preview accepts reordered fields while detecting changed scope, evidence order and equipment',()=>{
  const saved={categories:['plumbing'],publicDescription:'Observed leak',evidenceIds:['a','b'],accessEquipmentRequired:false};
  assert.equal(factory.sameInput(saved,{accessEquipmentRequired:false,evidenceIds:['a','b'],publicDescription:'Observed leak',categories:['plumbing']}),true);
  assert.equal(factory.sameInput(saved,{...saved,publicDescription:'Changed work'}),false);
  assert.equal(factory.sameInput(saved,{...saved,evidenceIds:['b','a']}),false);
  assert.equal(factory.sameInput(saved,{...saved,accessEquipmentRequired:true}),false);
});

test('Lost response recovers the committed operation after reload without resubmitting a decision or storing its private body',async()=>{
  const storage=store(),calls:string[]=[],scope='user:estate',receipts=new Map<string,Record<string,unknown>>();
  const api:Api=async(route,_body,command)=>{
    calls.push(route);
    if(route.startsWith('operations/')) {const result=receipts.get(route.slice(11));if(!result)throw missing();return result;}
    assert.ok(command);receipts.set(command.key,{jobId:'job',version:4});throw new Error('Response lost');
  };
  const options={api,partition:()=>scope,generation:()=>0,storage,online:()=>true,digest};
  const body={quoteId:'quote',rationale:'Private reasoning',confirmed:true};
  await assert.rejects(factory.create(options).submit('workspaces/job/select',body,3),/Result uncertain/);
  assert.equal(storage.length,1);assert.ok(!storage.getItem(storage.key(0)!)!.includes('Private reasoning'));
  await assert.rejects(factory.create(options).submit('workspaces/job/select',{...body,quoteId:'different'},4),/Check pending submissions/);
  const result=await factory.create(options).recover();assert.equal(result[0]!.result!.version,4);assert.equal(storage.length,0);
  assert.equal(calls.filter(c=>!c.startsWith('operations/')).length,1);
});

test('An uncommitted timeout retries the same operation/version and recovery leaves missing outcomes intact',async()=>{
  const storage=store(),keys:WebCommand[]=[],api:Api=async(route,_body,command)=>{
    if(route.startsWith('operations/'))throw missing();
    assert.ok(command);keys.push(command);if(keys.length===1)throw new Error('Timed out');return {version:8};
  };
  const commands=factory.create({api,partition:()=> 'user:estate',generation:()=>0,storage,online:()=>true,digest});
  await assert.rejects(commands.submit('workspaces/job/edit',{title:'Saved',observations:'Private'},7));
  assert.equal((await commands.recover())[0]!.result,null);assert.equal(storage.length,1);
  assert.equal((await commands.submit('workspaces/job/edit',{observations:'Private',title:'Saved'},99)).version,8);
  assert.equal(keys[0]!.key,keys[1]!.key);assert.equal(keys[1]!.version,7);assert.equal(storage.length,0);
});

test('Offline decisions, context switches during hashing and other accounts cannot submit or recover a pending operation',async()=>{
  const storage=store();let scope='user:estate',generation=0,online=false,calls=0,release:(value:string)=>void=()=>{};
  const options={api:async()=>{calls++;throw new Error('Lost');},partition:()=>scope,generation:()=>generation,storage,online:()=>online,digest};
  await assert.rejects(factory.create(options).submit('select',{confirmed:true}),/Connect/);assert.equal(calls,0);
  online=true;
  const hashing=factory.create({...options,digest:()=>new Promise<string>(resolve=>{release=resolve;})}).submit('select',{confirmed:true});
  scope='other:estate';generation++;release('hash');await assert.rejects(hashing,/context changed/);assert.equal(storage.length,0);assert.equal(calls,0);
  scope='user:estate';await assert.rejects(factory.create(options).submit('select',{confirmed:true}));assert.equal(storage.length,1);
  scope='other:estate';generation++;assert.equal((await factory.create(options).recover()).length,0);assert.equal(storage.length,1);assert.equal(calls,1);
});
