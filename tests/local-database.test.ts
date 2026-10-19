import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase} from '../packages/infrastructure/database.js';
test('Local persistent database clean restart preserves data and refuses a second writer',async()=>{
  const config=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'work/restart-tests/'+randomUUID()});
  const db=await openDatabase(config);
  await db.exec('CREATE TABLE restart_probe(value integer); INSERT INTO restart_probe VALUES (34);');
  await assert.rejects(openDatabase(config),/already open/);
  await db.close();
  const reopened=await openDatabase(config);
  try {assert.equal((await reopened.query('SELECT value FROM restart_probe'))[0]!.value,34);}
  finally {await reopened.close();}
  // Keep the isolated fictional test directory; no user retention/deletion policy is implied.
});
