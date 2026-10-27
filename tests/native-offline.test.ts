import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as native from '../packages/native-client/client.js';
import * as localState from '../packages/native-client/local-state.js';
import * as links from '../packages/native-client/links.js';

type Value=any;
const source=ts.transpileModule(await readFile('apps/mobile/App.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const session={token:'t'.repeat(43),csrfToken:'c'.repeat(43),expiresAt:'2027-01-01T00:00Z'};
const binding=createHash('sha256').update(session.token).digest('hex');
function storage(bindingValue=binding) {
  const profile={accountId:'owner',contextId:'context',role:'cm' as const,sessionBinding:bindingValue};
  const rows=new Map<string,Value>([['saved',{id:'saved',accountId:'owner',contextId:'context',kind:'issue',title:'Unfinished repair',text:'Observed drip',location:'',jobId:null,updatedAt:'2026-10-27T00:00:00Z'}]]);
  return {rows,owner:async()=>profile.accountId,identity:async(value:string)=>localState.sameLocalOwner(profile,value,profile.accountId)?profile:undefined,
    drafts:async(a:string,c:string)=>[...rows.values()].filter(d=>d.accountId===a&&d.contextId===c).map(d=>structuredClone(d)),uploads:async()=>[],
    saveDraft:async(d:Value)=>{rows.set(d.id,structuredClone(d));},close:async()=>{},clear:async()=>{rows.clear();}};
}
async function mount(store:ReturnType<typeof storage>) {
  let index=0,active=true,queued=false,tree:Value;
  const slots:Value[]=[],effects:(()=>void)[]=[],calls:string[]=[];
  let App:()=>Value;
  const schedule=()=>{if(!queued&&active){queued=true;queueMicrotask(()=>{queued=false;if(active)render();});}};
  const hooks={
    useState:(initial:Value)=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],(v:Value)=>{slots[i]=typeof v==='function'?v(slots[i]):v;schedule();}];},
    useRef:(initial:Value)=>{const i=index++;return slots[i]??(slots[i]={current:initial});},
    useEffect:(effect:()=>Value,deps:Value[])=>{const i=index++,prior=slots[i];if(prior&&deps.every((d,j)=>Object.is(d,prior.deps[j])))return;
      effects.push(()=>{prior?.cleanup?.();slots[i]={deps,cleanup:effect()};});}
  };
  const transport:native.Transport=async(_url,init)=>{calls.push(init.method!);throw new Error('airplane mode');};
  const modules:Record<string,Value>={
    react:hooks,'react/jsx-runtime':{jsx:(type:Value,props:Value)=>({type,props}),jsxs:(type:Value,props:Value)=>({type,props}),Fragment:'fragment'},
    'react-native':Object.fromEntries(['Button','ScrollView','Text','TextInput','View','Switch','Image'].map(n=>[n,n])),
    'expo-constants':{__esModule:true,default:{expoConfig:{extra:{apiUrl:'http://127.0.0.1:3000'}}}},
    'expo-crypto':{randomUUID,CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_kind:string,v:string)=>createHash('sha256').update(v).digest('hex')},
    'expo-image-picker':{},'expo-document-picker':{},'expo-web-browser':{},'expo-file-system':{File:class {}},
    '../../packages/native-client/client':{...native,NativeClient:class extends native.NativeClient{constructor(url:string,s:native.NativeSession|undefined){super(url,s,transport);}}},
    '../../packages/native-client/local-state':localState,'../../packages/native-client/links':links,
    './storage':{deviceStore:async()=>store},'./auth':{readSession:async()=>session,forgetSession:async()=>{},signIn:async()=>session}
  };
  Object.assign(modules['react-native'],{StyleSheet:{create:(v:Value)=>v},AppState:{addEventListener:()=>({remove(){}})},Linking:{getInitialURL:async()=>null,addEventListener:()=>({remove(){}})}});
  const exports:Value={};runInNewContext(source,{exports,require:(id:string)=>{assert.ok(id in modules,'Unmocked native boundary '+id);return modules[id];},console,URL,Intl,setTimeout,clearTimeout});
  App=exports.default;
  function render(){index=0;tree=App();while(effects.length)effects.shift()!();}
  const flush=async()=>{for(let i=0;i<15;i++)await new Promise<void>(resolve=>setImmediate(resolve));};
  const nodes=():Value[]=>{const visit=(v:Value):Value[]=>Array.isArray(v)?v.flatMap(visit):v&&typeof v==='object'&&v.props?[v,...visit(v.props.children)]:[];return visit(tree);};
  const find=(key:string,value:string)=>nodes().find(n=>n.props[key]===value);
  render();await flush();return {find,flush,calls,unmount(){active=false;for(const slot of slots)slot?.cleanup?.();}};
}
test('Actual native component cold-launches offline, restores incomplete drafts and saves edited fields across remount without a POST',async()=>{
  const store=storage();let app=await mount(store);
  try {
    const restore=app.find('title','Restore Unfinished repair · device draft');assert.ok(restore,'Saved draft must be reachable before any network refresh succeeds');restore.props.onPress();await app.flush();
    const text=app.find('accessibilityLabel','Draft observations or quote notes');assert.equal(text.props.value,'Observed drip');
    text.props.onChangeText('Edited while offline');await app.flush();app.find('title','Save on this device').props.onPress();await app.flush();
    assert.equal(store.rows.get('saved').text,'Edited while offline');assert.equal(store.rows.get('saved').location,'');
    assert.ok(!app.calls.includes('POST'));assert.equal(app.find('title','Create private server draft online'),undefined);
    app.unmount();app=await mount(store);app.find('title','Restore Unfinished repair · device draft').props.onPress();await app.flush();
    assert.equal(app.find('accessibilityLabel','Draft observations or quote notes').props.value,'Edited while offline');
  }finally{app.unmount();}
});
test('A different secure-session binding cannot expose the previous local owner draft interface',async()=>{
  const app=await mount(storage('different-session'));
  try{assert.equal(app.find('title','Restore Unfinished repair · device draft'),undefined);assert.equal(app.find('title','New device draft'),undefined);assert.ok(app.find('title','Sign in with external browser'));}
  finally{app.unmount();}
});
