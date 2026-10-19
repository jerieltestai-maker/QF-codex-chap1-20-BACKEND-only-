import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

// PGlite has no multi-process server. Guard the local directory with a real OS process ID.
export async function lockLocalDatabase(directory:string):Promise<()=>Promise<void>> {
  const root=resolve(directory),lockPath=root+'.quotefix-runtime-lock',pidPath=join(root,'postmaster.pid');
  // PostgreSQL requires an empty directory at initialization; keep our lock beside it.
  await mkdir(dirname(root),{recursive:true});
  const marker=JSON.stringify({pid:process.pid,nonce:randomUUID()});
  try {await writeFile(lockPath,marker,{flag:'wx',mode:0o600});}
  catch(error) {
    if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
    let prior:{pid:number};
    try {prior=JSON.parse(await readFile(lockPath,'utf8'));}catch{throw new Error('Local database lock needs inspection; refusing a second writer');}
    if(!Number.isInteger(prior.pid)||prior.pid<=0)throw new Error('Invalid local database lock; refusing to open');
    try {process.kill(prior.pid,0);throw new Error('Local database is already open. Stop that process before migration or startup.');}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;}
    throw new Error('A stale local database runtime lock needs inspection before recovery. No data was changed.');
  }
  try {
    await readFile(pidPath,'utf8');
    await unlink(lockPath);
    throw new Error('Existing engine runtime lock needs inspection. Stop any older app before reopening; no database data was removed.');
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  return async()=>{
    // A cleanly closed engine can leave a Windows-only sentinel behind.
    // Called only after the engine closes. Never delete database/evidence files.
    await removeEnginePid(pidPath);
    if(await readFile(lockPath,'utf8')!==marker)throw new Error('Local database lock ownership changed');
    await unlink(lockPath);
  };
}
async function removeEnginePid(path:string) {
  try {
    const pid=(await readFile(path,'utf8')).split('\n')[0]?.trim();
    if(pid!=='-42')throw new Error('Unexpected engine lock; preserve it for inspection');
    await unlink(path);
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
