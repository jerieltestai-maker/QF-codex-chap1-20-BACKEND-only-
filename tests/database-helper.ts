import {randomBytes} from 'node:crypto';
import {loadConfig,type Config} from '../packages/infrastructure/config.js';
import {openDatabase} from '../packages/infrastructure/database.js';
export async function testDatabase(config:Config) {
  const url=process.env.TEST_DATABASE_URL;
  if (!url) return openDatabase(config);
  const postgres=loadConfig({APP_ENV:'test',IDENTITY_ADAPTER:'local',DATABASE_ADAPTER:'postgres',DATABASE_URL:url});
  return openDatabase(postgres,'qf_test_'+randomBytes(8).toString('hex'));
}
