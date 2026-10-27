import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {evaluateRelease} from '../packages/infrastructure/release-gate.js';
const file=process.argv[2]??'docs/implementation/release-evidence.json';
try {
  const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
  const result=evaluateRelease(JSON.parse(await readFile(file,'utf8')),commit);
  console.log(JSON.stringify(result,null,2));
  if(!result.ready)process.exitCode=1;
}catch {console.error('Release check refused: valid source-bound evidence manifest required.');process.exitCode=1;}
