import {readFile,writeFile,mkdir,rename,unlink,open} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),env=parseEnv(await readFile(join(root,'.env'),'utf8'));
if(env.APP_ENV!=='development'||env.DATABASE_ADAPTER!=='postgres')throw new Error('Prototype supervisor requires local development PostgreSQL');
const database=new URL(env.DATABASE_URL),origin=new URL(env.APP_ORIGIN??'http://127.0.0.1:3000');
if(!['localhost','127.0.0.1'].includes(database.hostname)||!database.pathname.endsWith('_development')||!['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Prototype services must remain local');
const directory=join(process.env.LOCALAPPDATA??resolve('work'),'QuoteFix','runtime',createHash('sha256').update(root).digest('hex').slice(0,16));
await mkdir(directory,{recursive:true,mode:0o700});
const lock=join(directory,'supervisor.lock'),statePath=join(directory,'state.json'),stopPath=join(directory,'stop.json');
const json=async p=>{try{return JSON.parse(await readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const alive=pid=>{if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
const health=async()=>{try{return(await fetch(origin.origin+'/health/ready',{signal:AbortSignal.timeout(1500)})).ok;}catch{return false;}};
const delay=ms=>new Promise(done=>setTimeout(done,ms));
const action=process.argv[2]??'status';
if(action==='status'){
  const marker=await json(lock),state=await json(statePath);console.log(JSON.stringify({supervised:!!marker&&alive(marker.pid),ready:await health(),origin:origin.origin,state,logDirectory:directory}));
}else if(action==='stop'){
  const marker=await json(lock);if(!marker||!alive(marker.pid))throw new Error('No running owned supervisor; inspect any independently running API');
  await writeFile(stopPath,JSON.stringify({nonce:marker.nonce}),{mode:0o600});
  for(let i=0;i<100&&alive(marker.pid);i++)await delay(100);
  if(alive(marker.pid))throw new Error('Supervisor has not stopped; inspect its local log');
  console.log('Prototype API and worker stopped. PostgreSQL data retained.');
}else if(action==='start'){
  const marker=await json(lock);
  if(marker&&alive(marker.pid)){console.log(JSON.stringify({alreadyRunning:true,ready:await health(),origin:origin.origin}));process.exit(await health()?0:1);}
  if(await health())throw new Error('An independent API is already listening. Inspect it before starting another writer.');
  if(marker)await rename(lock,join(directory,'preserved-lock-'+Date.now()+'.json'));
  const log=await open(join(directory,'supervisor.log'),'a',0o600);
  const daemon=spawn(process.execPath,[fileURLToPath(import.meta.url),'run'],{cwd:root,env:{...process.env,...env},detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd]});daemon.unref();await log.close();
  for(let i=0;i<200;i++){if(await health()){console.log(JSON.stringify({ready:true,origin:origin.origin,supervisorPid:daemon.pid,logDirectory:directory}));process.exit(0);}await delay(100);}
  throw new Error('Prototype startup did not become ready. Inspect '+join(directory,'supervisor.log'));
}else if(action==='run'){
  const nonce=randomUUID();await writeFile(lock,JSON.stringify({pid:process.pid,nonce,root}),{flag:'wx',mode:0o600});
  let stopping=false,restarts=0,child;
  const stop=()=>{stopping=true;child?.kill();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  const poll=setInterval(()=>{void json(stopPath).then(value=>{if(value?.nonce===nonce)stop();}).catch(()=>{});},500);
  const save=async status=>{
    const temp=statePath+'.next';await writeFile(temp,JSON.stringify({status,pid:process.pid,childPid:child?.pid??null,restarts,at:new Date().toISOString()}),{mode:0o600});await rename(temp,statePath);
  };
  try{
    while(!stopping){
      const log=await open(join(directory,'api.log'),'a',0o600);
      child=spawn(process.execPath,['--import','tsx',join(root,'apps/api/src/main.ts')],{cwd:root,env:{...process.env,...env},windowsHide:true,stdio:['ignore',log.fd,log.fd]});await log.close();await save('running');
      const outcome=await new Promise(done=>{child.on('error',error=>done({error:error.code??'SPAWN_FAILED'}));child.on('close',(code,signal)=>done({code,signal}));});
      console.log(JSON.stringify({event:'api.exited',...outcome,at:new Date().toISOString(),stopping}));
      if(!stopping){restarts++;await save('restarting');await delay(Math.min(15000,1000*2**Math.min(restarts-1,4)));}
    }
  }finally{
    clearInterval(poll);await save('stopped');const marker=await json(lock);if(marker?.nonce===nonce)await unlink(lock);
    const request=await json(stopPath);if(request?.nonce===nonce)await unlink(stopPath);
  }
}else throw new Error('Use start, stop or status');
