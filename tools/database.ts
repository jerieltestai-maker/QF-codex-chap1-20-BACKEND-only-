import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,migrate} from '../packages/infrastructure/database.js';
import {installFixtures} from '../packages/test-fixtures/fixtures.js';
if (existsSync('.env')) loadEnvFile('.env');
const config = loadConfig();
const command = process.argv[2];
if (!['migrate','fixtures'].includes(command ?? '')) throw new Error('Use migrate or fixtures');
const db = await openDatabase(config);
try {
  await migrate(db,config.environment);
  if (command === 'fixtures') await installFixtures(db,config.environment);
  console.log(command === 'fixtures' ? 'Fictional local fixtures installed' : 'Migrations verified');
} finally {await db.close();}
