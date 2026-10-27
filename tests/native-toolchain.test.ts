import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,dirname,join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';

test('Security overrides preserve the actual Expo plugin/MCP schema and signing APIs',()=>{
  const mobile=createRequire(resolve('apps/mobile/package.json')),expo=createRequire(mobile.resolve('expo/package.json'));
  const cliPath=expo.resolve('@expo/cli/package.json'),cli=createRequire(cliPath),root=dirname(cliPath);
  assert.equal(cli('zod/package.json').version,'4.6.7');assert.equal(cli('node-forge/package.json').version,'1.4.1');
  const {PluginSchema,DevToolsPluginOutputSchema}=cli(join(root,'build/src/start/server/DevToolsPlugin.schema.js'));
  const {createMCPDevToolsExtensionSchema}=cli(join(root,'build/src/start/server/createMCPDevToolsExtensionSchema.js'));
  const plugin={packageName:'fictional-plugin',packageRoot:'.',cliExtensions:{description:'Fictional test',entryPoint:'unused.js',commands:[{name:'inspect',title:'Inspect',environments:['mcp'],parameters:[{name:'count',type:'number',description:'Count'}]}]}};
  assert.equal(PluginSchema.safeParse(plugin).success,true);assert.equal(PluginSchema.safeParse({...plugin,packageName:''}).success,false);
  const schema=createMCPDevToolsExtensionSchema(plugin);
  assert.deepEqual(schema.parse({command:'inspect',count:2}),{command:'inspect',count:2});
  assert.equal(schema.safeParse({command:'unknown'}).success,false);assert.equal(schema.safeParse({command:'inspect',count:'wrong'}).success,false);assert.equal(schema.safeParse({command:'inspect',extra:true}).success,false);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{type:'text',text:'Fictional result',level:'info'}]).success,true);
  assert.equal(DevToolsPluginOutputSchema.safeParse([{type:'image',url:'not-a-url'}]).success,false);
  const forge=cli('node-forge'),keys=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const privateKey=forge.pki.privateKeyFromPem(keys.privateKey),publicKey=forge.pki.publicKeyFromPem(keys.publicKey);
  const message=forge.md.sha256.create();message.update('Fictional signing compatibility check','utf8');const signature=privateKey.sign(message);
  assert.equal(publicKey.verify(message.digest().bytes(),signature),true);
  const changed=forge.md.sha256.create();changed.update('Changed message','utf8');assert.equal(publicKey.verify(changed.digest().bytes(),signature),false);
});
