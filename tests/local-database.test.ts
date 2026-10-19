import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,type Database} from '../packages/infrastructure/database.js';
test('Local persistent database clean restart preserves data and refuses a second writer',async()=>{
  // Disposable engine files belong outside the cloud-synced source checkout.
  const directory=await mkdtemp(join(tmpdir(),'quotefix-restart-'));
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:directory});
  let db:Database|undefined,succeeded=false;
  const close=async()=>{const current=db;db=undefined;await current?.close();};
  try {
    db=await openDatabase(config);
    await db.exec('CREATE TABLE restart_probe(value integer); INSERT INTO restart_probe VALUES (34);');
    await assert.rejects(openDatabase(config),/already open/);
    await close();db=await openDatabase(config);
    assert.equal((await db.query('SELECT value FROM restart_probe'))[0]!.value,34);
    await close();succeeded=true;
  } finally {
    await close();
    if(succeeded) {
      const target=resolve(directory);
      if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('quotefix-restart-'))throw new Error('Unexpected test temporary directory');
      await rm(target,{recursive:true,force:true});
    } else console.error('Fictional restart-test directory preserved for inspection: '+directory);
  }
});
