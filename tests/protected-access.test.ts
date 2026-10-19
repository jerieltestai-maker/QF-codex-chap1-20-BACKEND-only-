import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';

test('Protected access evidence commits before the response is released, even with a delayed database',{timeout:120000},async()=>{
  const f=await completionFixture();
  let release!:()=>void,entered!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;}),started=new Promise<void>(resolve=>{entered=resolve;});
  const transaction=f.db.transaction.bind(f.db);
  let response:ReturnType<typeof f.get>|undefined;
  try {
    const id=await f.job('100.00',false);
    f.db.transaction=fn=>transaction(tx=>fn({...tx,query:async<T extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>{
      if(sql.startsWith('INSERT INTO protected_access_events')) {entered();await gate;}
      return tx.query<T>(sql,params);
    }}));
    let completed=false;
    response=f.get('workspaces/'+id+'/comparison',f.mcst);
    void response.then(()=>{completed=true;});
    await Promise.race([started,response.then(()=>{throw new Error('Response completed before protected-access recording started');})]);await setImmediate();
    assert.equal(completed,false,'The caller must not receive protected content before its access evidence commits');
    release();f.okay(await response);
    const [event]=await f.db.query('SELECT outcome FROM protected_access_events WHERE job_id=$1 AND actor_id=$2 ORDER BY recorded_at DESC LIMIT 1',[id,ids.mcst]);
    assert.equal(event?.outcome,'allowed');
  } finally {
    release();await response;await f.close();
  }
});

test('A failed protected-access commit withholds content, exposes no database details and can be retried',{timeout:120000},async()=>{
  const f=await completionFixture();
  const transaction=f.db.transaction.bind(f.db);
  try {
    const malformed=await f.app.inject({method:'POST',url:'/api/v1/support/not-a-uuid/resolve',headers:{origin:'https://unrelated.invalid'},payload:{}});
    assert.equal(malformed.statusCode,403);
    assert.equal(malformed.json().error?.code,'ORIGIN_INVALID');
    assert.doesNotMatch(malformed.body,/22P02|invalid input syntax|uuid/i);
    const id=await f.job('100.00',false);
    const fileId=await f.file(id,'evidence');
    const count=async()=>Number((await f.db.query('SELECT count(*) AS n FROM protected_access_events WHERE job_id=$1',[id]))[0]!.n);
    const before=await count();
    f.db.transaction=fn=>transaction(tx=>fn({...tx,query:async<T extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>{
      if(sql.startsWith('INSERT INTO protected_access_events'))throw new Error('PRIVATE SQL PARAMETERS AND BANK DETAILS');
      return tx.query<T>(sql,params);
    }}));
    const failed=await f.get('workspaces/'+id+'/comparison',f.mcst);
    assert.equal(failed.statusCode,500);
    assert.equal(failed.json().error.code,'INTERNAL_ERROR');
    assert.doesNotMatch(failed.body,/PRIVATE|BANK|quotes|amountCents|plumbing/);
    const failedDenial=await f.get('workspaces/'+id+'/comparison',f.rival);
    assert.equal(failedDenial.statusCode,500);
    assert.equal(failedDenial.json().error?.code,'INTERNAL_ERROR');
    assert.doesNotMatch(failedDenial.body,/PRIVATE|BANK|quotes|amountCents|plumbing/);
    const failedDownload=await f.get('files/'+fileId,f.contractor);
    assert.equal(failedDownload.statusCode,500);
    assert.equal(failedDownload.json().error?.code,'INTERNAL_ERROR');
    assert.match(String(failedDownload.headers['content-type']),/^application\/json/);
    assert.equal(failedDownload.headers['content-disposition'],undefined,'An error must not retain download headers');
    if(failedDownload.headers['content-length'])assert.equal(Number(failedDownload.headers['content-length']),Buffer.byteLength(failedDownload.body));
    assert.doesNotMatch(failedDownload.body,/PRIVATE|BANK|PNG/);
    assert.equal(await count(),before,'The rejected access event must not be partially committed');
    f.db.transaction=transaction;
    f.okay(await f.get('workspaces/'+id+'/comparison',f.mcst));
    assert.equal(await count(),before+1,'A successful retry commits exactly one access event');
    const denied=await f.get('workspaces/'+id+'/comparison',f.rival);
    assert.ok([403,404].includes(denied.statusCode));
    const [event]=await f.db.query('SELECT outcome FROM protected_access_events WHERE job_id=$1 AND actor_id=(SELECT id FROM users WHERE email=$2)',[id,'completionrival@example.test']);
    assert.equal(event?.outcome,'denied');
  } finally {
    f.db.transaction=transaction;await f.close();
  }
});
