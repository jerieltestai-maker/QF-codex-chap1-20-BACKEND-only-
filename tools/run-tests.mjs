import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {freemem,totalmem} from 'node:os';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';

const arg=process.argv.find(v=>v.startsWith('--concurrency='));
const concurrency=Number(arg?.split('=')[1]??process.env.TEST_CONCURRENCY??(process.env.TEST_DATABASE_URL?'2':'1'));
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new Error('Test concurrency must be 1–4');
const directory=resolve('work/test-runs/'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'-'+randomUUID());
await mkdir(directory,{recursive:true});
const files=(await readdir('tests')).filter(v=>v.endsWith('.test.ts')).sort();
const report={database:process.env.TEST_DATABASE_URL?'postgres':'pglite',concurrency,node:process.version,totalMemory:totalmem(),files:[]};
let next=0;
async function worker(){
  while(next<files.length){
    const file=files[next++],started=Date.now(),freeMemoryBefore=freemem();let stderr='',output='';
    console.log('[test-run] '+file);
    const child=spawn(process.execPath,['--report-on-fatalerror','--report-exclude-env','--report-exclude-network','--report-directory='+directory,
      '--import','tsx','--test','--test-concurrency=1','--test-reporter=spec',join('tests',file)],{stdio:['ignore','pipe','pipe'],windowsHide:true});
    child.stdout.on('data',bytes=>{process.stdout.write(bytes);output=(output+bytes.toString()).slice(-1048576);});
    child.stderr.on('data',bytes=>{process.stderr.write(bytes);stderr=(stderr+bytes.toString()).slice(-65536);});
    const outcome=await new Promise(done=>{child.on('error',error=>done({code:null,signal:null,error:error.message}));child.on('close',(code,signal)=>done({code,signal}));});
    const counts=Object.fromEntries([...output.replace(/\u001b\[[0-9;]*m/g,'').matchAll(/ℹ (tests|pass|fail|cancelled|skipped|todo) (\d+)/g)].map(m=>[m[1],Number(m[2])]));
    report.files.push({file,...outcome,durationMs:Date.now()-started,freeMemoryBefore,freeMemoryAfter:freemem(),counts,stderr});
    await writeFile(join(directory,'results.json'),JSON.stringify(report,null,2)+'\n');
  }
}
console.log('[test-run] '+report.database+', '+concurrency+' file worker(s); no automatic retries');
await Promise.all(Array.from({length:concurrency},worker));
const failed=report.files.filter(v=>v.code!==0);
console.log('[test-run] '+(files.length-failed.length)+'/'+files.length+' files passed. Diagnostics: '+directory);
if(failed.length){console.error('[test-run] Failed: '+failed.map(v=>v.file+' (exit '+v.code+', signal '+v.signal+')').join(', '));process.exitCode=1;}
