import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {completionFixture} from './completion-helper.js';
import {ids} from '../packages/test-fixtures/fixtures.js';

test('Protected access evidence commits before the response is released, even with a delayed database',async()=>{
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
