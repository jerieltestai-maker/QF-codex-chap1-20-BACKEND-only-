import {test} from 'node:test';
import {readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {testDatabase} from './database-helper.js';
import {loadConfig} from '../packages/infrastructure/config.js';
import {migrate} from '../packages/infrastructure/database.js';
import {installFixtures,ids} from '../packages/test-fixtures/fixtures.js';
import {sgdCents,dateOnly,utcInstant} from '../packages/contracts/primitives.js';
const config = () => loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_PATH:'memory://'});
test('CH01-T01/T06: clean migration and repeat upgrade preserve records',async()=>{
  const db=await testDatabase(config());
  try {
    await migrate(db,'test','001_foundations.sql'); await installFixtures(db,'test');
    const before=await db.query('SELECT id FROM users ORDER BY id');
    await migrate(db,'test'); await installFixtures(db,'test');
    assert.deepEqual(await db.query('SELECT id FROM users ORDER BY id'),before);
    const expected=(await readdir('database/migrations')).filter(name=>name.endsWith('.sql')).sort();
    assert.deepEqual((await db.query('SELECT name FROM schema_migrations ORDER BY name')).map(row=>row.name),expected);
    await assert.rejects(migrate(db,'development'),/environment mismatch/);
  }finally{await db.close();}
});
test('CH01-T02: production config and fixture targets are refused before mutations',async()=>{
  assert.throws(()=>loadConfig({APP_ENV:'production',IDENTITY_ADAPTER:'local'}),/Managed identity/);
  assert.throws(()=>loadConfig({IDENTITY_ADAPTER:'local'}),/APP_ENV/);
  assert.throws(()=>loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',HOST:'0.0.0.0'}),/loopback/);
  const db=await testDatabase(config());
  try{
    await migrate(db,'test');
    await assert.rejects(installFixtures(db,'production'),/forbidden/);
    await assert.rejects(installFixtures(db,'development'),/mismatch/);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM users'))[0]!.count,0);
  }finally{await db.close();}
});
test('CH01-T04: business/audit/outbox/receipt roll back together; audit cannot be rewritten',async()=>{
  const db=await testDatabase(config());
  try{
    await migrate(db,'test');await installFixtures(db,'test');
    await assert.rejects(db.transaction(async tx=>{
      await tx.query('UPDATE users SET name=$1 WHERE id=$2',['Changed',ids.cm]);
      await tx.query('INSERT INTO audit_events(id,actor_id,action,request_id) VALUES($1,$2,$3,$4)',[ids.cm,ids.cm,'test','req']);
      await tx.query('INSERT INTO outbox(id,kind,payload) VALUES($1,$2,$3)',[ids.cm,'test',{}]);
      await tx.query('INSERT INTO command_receipts(actor_id,operation_id,intent,fingerprint,result) VALUES($1,$2,$3,$4,$5)',[ids.cm,ids.cm,'test','hash',{}]);
      throw new Error('simulated failure');
    }),/simulated failure/);
    assert.equal((await db.query('SELECT name FROM users WHERE id=$1',[ids.cm]))[0]!.name,'CM');
    for(const table of ['audit_events','outbox','command_receipts'])
      assert.equal((await db.query(`SELECT count(*)::integer AS count FROM ${table}`))[0]!.count,0);
    await db.query('INSERT INTO audit_events(id,actor_id,action,request_id) VALUES($1,$2,$3,$4)',[ids.cm,ids.cm,'test','req']);
    await assert.rejects(db.query('DELETE FROM audit_events'),/append-only/);
  }finally{await db.close();}
});
test('CH01-T07: money/date precision survives serialization without floating point',()=>{
  assert.equal(sgdCents('0.29'),29); assert.equal(sgdCents('123456.01'),12345601);
  assert.throws(()=>sgdCents('1.001'));assert.throws(()=>sgdCents('999999999999999999'));
  assert.equal(dateOnly('2026-10-13'),'2026-10-13');assert.throws(()=>dateOnly('2026-02-30'));
  assert.equal(utcInstant('2026-10-13T00:00:00+08:00'),'2026-10-12T16:00:00.000Z');
  assert.throws(()=>utcInstant('2026-10-13T00:00:00'));
});
