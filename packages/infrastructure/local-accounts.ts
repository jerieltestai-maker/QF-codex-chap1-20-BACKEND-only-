import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import type {Config} from './config.js';
import type {Database,Sql} from './database.js';
import {AppError} from '../contracts/primitives.js';
import {checkPassword} from './local-identity.js';
import {ids,fixturePassword} from '../test-fixtures/fixtures.js';

const fixtureUsers = new Set([ids.admin,ids.cm,ids.cm2,ids.mcst,ids.mcst2,ids.contractor]);
export class LocalAccounts {
  private constructor(private readonly db:Database,private readonly key:Buffer) {}
  static async create(config:Config,db:Database):Promise<LocalAccounts|undefined> {
    if (!config.localAccountHelper) return undefined;
    if (config.environment !== 'development' || config.identityAdapter !== 'local')
      throw new Error('Local account helper requires isolated development identity');
    const [marker] = await db.query('SELECT environment FROM deployment_identity');
    if (marker?.environment !== 'development') throw new Error('Local account helper database mismatch');
    let key:Buffer;
    if (config.databasePath === 'memory://') key=randomBytes(32);
    else {
      const directory=join('work','local-account-keys');
      await mkdir(directory,{recursive:true});
      const identity=config.databaseAdapter==='postgres'?config.databaseUrl!:resolve(config.databasePath);
      const file=join(directory,createHash('sha256').update(identity).digest('hex')+'.key');
      try {await writeFile(file,randomBytes(32),{flag:'wx',mode:0o600});}
      catch(error) {if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;}
      key=await readFile(file);
      if (key.length !== 32) throw new Error('Invalid local account encryption key');
    }
    return new LocalAccounts(db,key);
  }
  async remember(tx:Sql,userId:string,password:string,passwordHash:string):Promise<void> {
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);
    cipher.setAAD(Buffer.from(userId));
    const encrypted=Buffer.concat([cipher.update(password,'utf8'),cipher.final()]);
    const envelope=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
    await tx.query(`INSERT INTO local_account_credentials(user_id,password_hash,encrypted_password) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET password_hash=$2,encrypted_password=$3,updated_at=now()`,[userId,passwordHash,envelope]);
  }
  async list() {
    const rows=await this.db.query(`SELECT u.id,u.name,u.email,u.email_verified,
      c.password_hash=u.password_hash AS remembered,
      COALESCE((SELECT string_agg(DISTINCT m.role,', ' ORDER BY m.role) FROM memberships m WHERE m.user_id=u.id AND m.active),'pending access') AS roles
      FROM users u LEFT JOIN local_account_credentials c ON c.user_id=u.id WHERE u.active ORDER BY u.name,u.id`);
    return rows.map(row=>({id:row.id,name:row.name,email:row.email,roles:row.roles,
      emailVerified:row.email_verified,passwordAvailable:row.remembered===true||fixtureUsers.has(String(row.id))}));
  }
  async credentials(userId:string) {
    const [row]=await this.db.query(`SELECT u.email,u.password_hash,c.encrypted_password,c.password_hash AS remembered_hash
      FROM users u LEFT JOIN local_account_credentials c ON c.user_id=u.id WHERE u.id=$1 AND u.active`,[userId]);
    if (!row) throw new AppError(404,'NOT_FOUND','Local account unavailable');
    let password:string|undefined;
    if (row.encrypted_password && row.remembered_hash === row.password_hash) {
      try {
        const bytes=Buffer.from(String(row.encrypted_password),'base64');
        const decipher=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12));
        decipher.setAAD(Buffer.from(userId));decipher.setAuthTag(bytes.subarray(12,28));
        password=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');
      } catch { /* A missing/replaced key must never produce an incorrect autofill. */ }
    } else if (fixtureUsers.has(userId)) password=fixturePassword;
    if (!password || !await checkPassword(password,String(row.password_hash)))
      throw new AppError(409,'LOCAL_PASSWORD_UNAVAILABLE','Enter this account’s password and sign in once to enable autofill.');
    return {email:row.email,password};
  }
}
