// One-way, non-destructive local adoption. A fresh PostgreSQL database is created;
// the original embedded database is never opened or edited. Private snapshot data
// stays under the current user's LocalAppData, outside the synced source tree.
import {readFile,writeFile,mkdir,readdir,cp,rename,access} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {parseEnv} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {loadConfig} from '../packages/infrastructure/config.js';
import {openDatabase,migrate,type Sql} from '../packages/infrastructure/database.js';
import {verifyEvidenceIntegrity} from '../packages/infrastructure/recovery.js';

const envBytes=await readFile('.env'),env=parseEnv(envBytes.toString()),config=loadConfig(env);
if(config.environment!=='development'||config.databaseAdapter!=='pglite'||config.databasePath==='memory://')throw new Error('Requires an existing local development PGlite source');
if(!process.env.LOCALAPPDATA)throw new Error('LocalAppData is required for this Windows prototype adoption');
const source=resolve(config.databasePath),localRoot=resolve(process.env.LOCALAPPDATA,'QuoteFix'),runId=randomUUID();
const directory=join(localRoot,'recovery',runId),copy=join(directory,'source-db');
if(!resolve(copy).startsWith(localRoot+sep))throw new Error('Invalid recovery destination');
const isAlive=(pid:number)=>{try{process.kill(pid,0);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')return false;throw e;}};
try{const marker=JSON.parse(await readFile(source+'.quotefix-runtime-lock','utf8')) as {pid:number};if(!Number.isInteger(marker.pid)||marker.pid<1||isAlive(marker.pid))throw new Error('Stop and inspect the source runtime before copying');}
catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
let ready=false;try{ready=(await fetch(config.origin+'/health/ready',{signal:AbortSignal.timeout(1500)})).ok;}catch{}
if(ready)throw new Error('Stop the existing application before a cold adoption');
await mkdir(directory,{recursive:true,mode:0o700});
async function fingerprints(path:string,prefix=''):Promise<Record<string,string>> {
  const result:Record<string,string>={};
  for(const entry of await readdir(path,{withFileTypes:true})){
    const name=prefix+entry.name;
    if(entry.isDirectory())Object.assign(result,await fingerprints(join(path,entry.name),name+'/'));
    else if(entry.isFile())result[name]=createHash('sha256').update(await readFile(join(path,entry.name))).digest('hex');
    else throw new Error('Unexpected source filesystem entry; inspect before adoption');
  }return result;
}
const original=await fingerprints(source);await cp(source,copy,{recursive:true,errorOnExist:true,force:false});
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function stable(v:unknown):unknown {return Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v;}
if(!same(original,await fingerprints(copy))||!same(original,await fingerprints(source)))throw new Error('Cold-copy checksum verification failed; original remains untouched');
try{
  const marker=join(copy,'postmaster.pid'),pid=Number((await readFile(marker,'utf8')).split('\n')[0]);
  if(pid!==-42&&(!Number.isInteger(pid)||pid<1||isAlive(pid)))throw new Error('Unexpected live copied engine marker');
  await rename(marker,join(directory,'preserved-engine-marker'));
}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const embedded=await openDatabase({...config,databasePath:copy});
const databaseName='quotefix_prototype_'+runId.replaceAll('-','')+'_development';
const admin=new pg.Client({connectionString:'postgresql://quotefix:local-only@127.0.0.1:5432/postgres'});
const targetUrl='postgresql://quotefix:local-only@127.0.0.1:5432/'+databaseName;
const quote=(name:string)=>{if(!/^[a-z][a-z0-9_]*$/.test(name))throw new Error('Unexpected SQL identifier');return '"'+name+'"';};
const rowHash=(rows:Record<string,unknown>[])=>createHash('sha256').update(rows.map(r=>JSON.stringify(stable(r))).sort().join('\n')).digest('hex');
async function tables(sql:Sql){return (await sql.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).map(r=>String(r.tablename));}
let target:Awaited<ReturnType<typeof openDatabase>>|undefined;
try {
  const migrations=await embedded.query('SELECT name,checksum FROM schema_migrations ORDER BY name');
  for(const row of migrations)if(createHash('sha256').update(await readFile(join('database/migrations',String(row.name)))).digest('hex')!==row.checksum)throw new Error('Source migration bytes differ');
  const names=await tables(embedded),snapshots:{name:string;rows:Record<string,unknown>[];columns:Record<string,unknown>[];hash:string}[]=[];
  for(const name of names){
    const rows=(await embedded.query(`SELECT to_jsonb(t) AS row FROM ${quote(name)} t`)).map(r=>r.row as Record<string,unknown>);
    const columns=await embedded.query("SELECT column_name,data_type,is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[name]);
    await writeFile(join(directory,name+'.json'),JSON.stringify(rows),{mode:0o600});snapshots.push({name,rows,columns,hash:rowHash(rows)});
  }
  await admin.connect();
  if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[databaseName])).rowCount)throw new Error('Target must be new; no existing database may be replaced');
  await admin.query('CREATE DATABASE '+quote(databaseName));
  target=await openDatabase(loadConfig({APP_ENV:'development',IDENTITY_ADAPTER:'local',DATABASE_ADAPTER:'postgres',DATABASE_URL:targetUrl}));
  await migrate(target,'development');if(!same(names,await tables(target)))throw new Error('Source and target application schemas differ');
  await target.transaction(async tx=>{
    await tx.exec("SET LOCAL session_replication_role='replica'");
    // Only this newly created, independently named target is cleared of migration defaults.
    await tx.exec('TRUNCATE '+names.map(quote).join(','));
    for(const table of snapshots){
      const columns=table.columns.filter(c=>c.is_generated!=='ALWAYS');
      for(const row of table.rows){
        const values=columns.map(c=>{
          const value=row[String(c.column_name)];if(value===null)return null;
          if(['json','jsonb'].includes(String(c.data_type)))return JSON.stringify(value);
          if(c.data_type==='bytea'){if(typeof value!=='string'||!value.startsWith('\\x'))throw new Error('Invalid evidence encoding');return Buffer.from(value.slice(2),'hex');}
          return value;
        });
        await tx.query('INSERT INTO '+quote(table.name)+' ('+columns.map(c=>quote(String(c.column_name))).join(',')+') OVERRIDING SYSTEM VALUE VALUES ('+values.map((_,i)=>'$'+(i+1)).join(',')+')',values);
      }
      for(const c of columns){const [sequence]=await tx.query('SELECT pg_get_serial_sequence($1,$2) AS name',[table.name,c.column_name]);if(sequence?.name){
        const [last]=await tx.query(`SELECT max(${quote(String(c.column_name))}) AS n FROM ${quote(table.name)}`);
        await tx.query('SELECT setval($1::regclass,$2,$3)',[sequence.name,last?.n??1,last?.n!==null&&last?.n!==undefined]);
      }}
    }
  });
  for(const table of snapshots){const rows=(await target.query(`SELECT to_jsonb(t) AS row FROM ${quote(table.name)} t`)).map(r=>r.row as Record<string,unknown>);if(rowHash(rows)!==table.hash)throw new Error('Restored table fingerprint differs: '+table.name);}
  const evidence=await verifyEvidenceIntegrity(target);
  if(config.localAccountHelper){
    const keyRoot=resolve('work/local-account-keys'),old=join(keyRoot,createHash('sha256').update(source).digest('hex')+'.key'),next=join(keyRoot,createHash('sha256').update(targetUrl).digest('hex')+'.key');
    await access(old);const key=await readFile(old);if(key.length!==32)throw new Error('Inspect the existing helper key before activation');
    await writeFile(next,key,{flag:'wx',mode:0o600});
  }
  if(!same(original,await fingerprints(source)))throw new Error('Original source changed during adoption; activation refused');
  await writeFile(join(directory,'env-before'),envBytes,{mode:0o600});
  const replace=(body:string,key:string,value:string)=>body.match(new RegExp('^'+key+'=.*$','m'))?body.replace(new RegExp('^'+key+'=.*$','m'),key+'='+value):body+'\n'+key+'='+value+'\n';
  const updated=replace(replace(envBytes.toString(),'DATABASE_ADAPTER','postgres'),'DATABASE_URL',targetUrl);
  const manifest={runId,source,copiedFiles:Object.keys(original).length,sourceFileHashes:original,databaseName,tables:snapshots.map(t=>({name:t.name,rows:t.rows.length,sha256:t.hash})),evidence,activated:true};
  await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  const nextEnv='.env.next-'+runId;await writeFile(nextEnv,updated,{mode:0o600,flag:'wx'});await rename(nextEnv,'.env');
  console.log(JSON.stringify({databaseName,copiedFiles:manifest.copiedFiles,tables:manifest.tables.length,rows:manifest.tables.reduce((n,t)=>n+t.rows,0),evidence,recoveryDirectory:directory,activated:true}));
} finally {await target?.close();await embedded.close();await admin.end();}
