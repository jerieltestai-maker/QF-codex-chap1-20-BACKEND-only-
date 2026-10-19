import {readFile,readdir} from 'node:fs/promises';
import {Script} from 'node:vm';

for(const name of (await readdir('apps/web')).filter(name=>name.endsWith('.js'))) {
  new Script(await readFile('apps/web/'+name,'utf8'),{filename:name});
}
console.log('Browser scripts: syntax valid');
