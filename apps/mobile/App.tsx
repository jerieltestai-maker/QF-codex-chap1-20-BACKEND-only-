import {useEffect,useRef,useState} from 'react';
import {AppState,Button,ScrollView,Text,TextInput,View,StyleSheet,Switch,Linking} from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import {File} from 'expo-file-system';
import {NativeClient,NativeError,resumeUpload,type NativeContext,type PendingUpload} from '../../packages/native-client/client';
import {deviceStore,type DeviceStore,type Draft} from './storage';
import {forgetSession,readSession,signIn} from './auth';
import {ticketFromLink} from '../../packages/native-client/links';

const baseUrl=String(Constants.expoConfig?.extra?.apiUrl??'http://127.0.0.1:3000');
type Ticket={jobId:string;title:string;stage:string;version:number;waitingOn:{role:string;action:string}|null};
type Task={taskId:string;jobId:string|null;ownerRole:string;action:string;eventAt:string|null;state:string};
type Work={version:number;state:{started_at:string|null;status:string};terms:unknown;waitingOn:unknown};
const stamp=(at:string)=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(at));

export default function App() {
  const client=useRef(new NativeClient(baseUrl,undefined)),store=useRef<DeviceStore|undefined>(undefined),generation=useRef(0);
  const [context,setContext]=useState<NativeContext|null>(null),[tickets,setTickets]=useState<Ticket[]>([]),[tasks,setTasks]=useState<Task[]>([]);
  const [selected,setSelected]=useState<Ticket|null>(null),[work,setWork]=useState<Work|null>(null),[history,setHistory]=useState<{action:string;recorded_at:string}[]>([]);
  const [drafts,setDrafts]=useState<Draft[]>([]),[draft,setDraft]=useState<Draft|null>(null),[uploads,setUploads]=useState<PendingUpload[]>([]);
  const [message,setMessage]=useState('Local native development build. Connect to sign in.'),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[target,setTarget]=useState('');
  const [pending,setPending]=useState<{id:string;description:string}|null>(null);
  const [storeReady,setStoreReady]=useState(false);
  const [link,setLink]=useState<string|null>(null);
  const clearServer=()=>{setTickets([]);setTasks([]);setSelected(null);setWork(null);setHistory([]);setConfirmed(false);};
  async function local(c:NativeContext) {
    if(!store.current||!c.context)return;const epoch=generation.current;
    const [d,u]=await Promise.all([store.current.drafts(c.user.id,c.context.id),store.current.uploads(c.user.id,c.context.id)]);
    if(epoch===generation.current){setDrafts(d);setUploads(u);}
  }
  async function refresh() {
    const epoch=generation.current;
    try {
      const cap=await client.current.request<{minimumContractVersion:number}>('capabilities');
      if(cap.minimumContractVersion>1)throw new Error('Update QuoteFix before using this server.');
      await client.current.request('me/refresh-context');const c=await client.current.context();
      if(epoch!==generation.current)return;
      const owner=await store.current?.owner();if(owner&&owner!==c.user.id)await store.current?.clear();await store.current?.setOwner(c.user.id);
      if(!c.context){setContext(c);clearServer();setMessage('Choose an authorised account context.');return;}
      const [j,t]=await Promise.all([client.current.request<{items:Ticket[]}>('dashboard/tickets?limit=100'),client.current.request<{items:Task[]}>('dashboard/tasks?limit=100')]);
      if(epoch!==generation.current)return;setContext(c);setTickets(j.items);setTasks(t.items);await local(c);setMessage('Current server access checked. Times below use Singapore time.');
    } catch(error){if(epoch!==generation.current)return;clearServer();if(error instanceof NativeError&&error.status===401)setContext(null);throw error;}
  }
  async function run(action:()=>Promise<void>) {setBusy(true);try{await action();}catch(error){setMessage(error instanceof Error?error.message:'Action unavailable');}finally{setBusy(false);}}
  useEffect(()=>{
    void run(async()=>{store.current=await deviceStore();setStoreReady(true);const s=await readSession();if(s){client.current.replaceSession(s);await refresh();}});
    const sub=AppState.addEventListener('change',state=>{generation.current++;client.current.cancelResponses();clearServer();if(state==='active')void run(refresh);});
    return()=>{sub.remove();client.current.cancelResponses();void store.current?.close();};
  },[]);
  useEffect(()=>{void Linking.getInitialURL().then(url=>{if(url)setLink(ticketFromLink(url)??null);});const sub=Linking.addEventListener('url',e=>setLink(ticketFromLink(e.url)??null));return()=>sub.remove();},[]);
  useEffect(()=>{if(!link||!context)return;const id=link;setLink(null);void run(async()=>{await client.current.request('me/refresh-context');const rows=await client.current.request<{items:Ticket[]}>('dashboard/tickets?q='+encodeURIComponent(id));const ticket=rows.items.find(j=>j.jobId===id);if(!ticket)throw new Error('This ticket is unavailable in your current account context.');await open(ticket);});},[link,context]);
  async function login(){
    const s=await signIn(baseUrl);generation.current++;client.current.replaceSession(s);
    setDraft(null);setDrafts([]);setUploads([]);setPending(null);clearServer();await refresh();
  }
  async function logout(){
    generation.current++;client.current.cancelResponses();let revoked=true;
    try{await client.current.request('auth/logout',{});}catch{revoked=false;}
    client.current.replaceSession(undefined);await forgetSession();await store.current?.clear();clearServer();setContext(null);setDraft(null);setDrafts([]);setUploads([]);setPending(null);
    setMessage(revoked?'Signed out. Local drafts and files cleared.':'Signed out locally and cleared drafts/files. Server revocation was unavailable; the session still expires on the server.');
  }
  async function choose(c:string){
    if(!context)return;generation.current++;client.current.cancelResponses();clearServer();setDraft(null);setDrafts([]);setUploads([]);setPending(null);await store.current?.clear();
    await client.current.request('me/context',{membershipId:c});await refresh();
  }
  async function open(ticket:Ticket){
    const epoch=++generation.current;client.current.cancelResponses();setSelected(ticket);setWork(null);setHistory([]);setConfirmed(false);
    const h=await client.current.request<{items:{action:string;recorded_at:string}[]}>('workspaces/'+ticket.jobId+'/chronology');
    let w:Work|null=null;try{w=await client.current.request<Work>('workspaces/'+ticket.jobId+'/work');}catch(error){if(!(error instanceof NativeError&&[403,404].includes(error.status)))throw error;}
    if(epoch===generation.current){setHistory(h.items);setWork(w);}
  }
  function newDraft(){if(!context?.context)return;setDraft({id:Crypto.randomUUID(),accountId:context.user.id,contextId:context.context.id,jobId:selected?.jobId??null,kind:context.context.role==='contractor'?'quote':'issue',title:'',text:'',location:'',updatedAt:new Date().toISOString()});setConfirmed(false);}
  async function saveDraft(){if(!draft||!context)return;await store.current!.saveDraft({...draft,updatedAt:new Date().toISOString()});await local(context);setMessage('Saved on this device · not submitted.');}
  async function createPrivateDraft(){
    if(!draft||!context?.context?.estate_id||!confirmed||draft.kind!=='issue')return;
    const operationId=draft.operationId??Crypto.randomUUID(),d={...draft,operationId};setDraft(d);await store.current!.saveDraft(d);
    setPending({id:operationId,description:'Creating private request draft'});
    try {
      const result=await client.current.command<{jobId:string}>('workspaces',{estateId:context.context.estate_id,title:d.title,observations:d.text,affectedLocation:d.location},operationId,0,context.accessVersion);
      const saved={...d,jobId:result.jobId,operationId:undefined};await store.current!.saveDraft(saved);setDraft(saved);
      for(const u of uploads.filter(u=>u.draftId===d.id&&!u.uploadId))await store.current!.saveUpload({...u,jobId:result.jobId,intentPath:'workspaces/'+result.jobId+'/uploads',baseVersion:1});
      setPending(null);setMessage('Private server draft saved. Review the RFQ in the web workflow before publishing.');await refresh();
    }catch(error){await rejected(error,d);throw error;}
  }
  async function rejected(error:unknown,d:Draft){
    // These explicit rejections occurred before a receipt/effect for this exact operation.
    // Access loss and server/network failures retain the original identity for later recovery.
    if(error instanceof NativeError&&[412,422].includes(error.status)){
      const saved={...d,operationId:undefined};await store.current!.saveDraft(saved);setDraft(saved);setPending(null);setConfirmed(false);
    }
  }
  async function checkPending(){
    if(!pending)return;
    try {
      const result=await client.current.recover<{jobId?:string}>(pending.id);
      if(result.jobId&&draft?.operationId===pending.id){
        const saved={...draft,jobId:result.jobId,operationId:undefined};
        if(draft.kind==='start'){await store.current!.removeDraft(draft.id);setDraft(null);}else {await store.current!.saveDraft(saved);setDraft(saved);}
        if(draft.kind==='issue')for(const u of uploads.filter(u=>u.draftId===draft.id&&!u.uploadId))await store.current!.saveUpload({...u,jobId:result.jobId,intentPath:'workspaces/'+result.jobId+'/uploads',baseVersion:1});
      }
      setPending(null);await refresh();setMessage('Original submission confirmed.');
    }catch(error){
      if(error instanceof NativeError&&error.status===404)setMessage('No committed outcome is currently available. You may explicitly retry the same saved input and operation below. Do not create another submission.');
      else throw error;
    }
  }
  async function retryPending(){
    if(!draft?.operationId||!pending||!confirmed||!context)return;
    if(draft.kind==='issue'){await createPrivateDraft();return;}
    if(draft.kind!=='start'||!draft.jobId||draft.baseVersion===undefined||draft.accessVersion===undefined)throw new Error('Original reviewed input is unavailable. Keep this operation ID for review.');
    try {
      await client.current.command('workspaces/'+draft.jobId+'/work/start',{mode:'known',completedBy:draft.text,confirmed:true},draft.operationId,draft.baseVersion,draft.accessVersion);
      await store.current!.removeDraft(draft.id);setDraft(null);setPending(null);await refresh();setMessage('Original Start submission confirmed.');
    }catch(error){await rejected(error,draft);throw error;}
  }
  async function capture(camera:boolean){
    if(!context?.context)return;if(!selected&&!draft)throw new Error('Create or restore a device draft first.');
    let uri:string|undefined,mediaType:string|undefined;
    if(camera){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('Camera permission denied. Choose an existing JPEG, PNG or PDF instead.');const r=await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:1,exif:false});if(r.canceled)return;uri=r.assets[0]?.uri;mediaType=r.assets[0]?.mimeType??'image/jpeg';}
    else {const r=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','application/pdf'],copyToCacheDirectory:true});if(r.canceled)return;uri=r.assets[0]?.uri;mediaType=r.assets[0]?.mimeType;}
    if(!uri||!mediaType||!['image/jpeg','image/png','application/pdf'].includes(mediaType))throw new Error('Use JPEG, PNG or PDF. Convert HEIC to JPEG before attaching it.');
    const epoch=generation.current,file=new File(uri);if(file.size<=0||file.size>10485760)throw new Error('Use a file up to 10 MiB.');
    const bytes=await file.bytes(),digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(epoch!==generation.current)return;
    const id=Crypto.randomUUID(),localUri=await store.current!.copyFile(uri,id,mediaType==='application/pdf'?'pdf':mediaType==='image/png'?'png':'jpg'),jobId=selected?.jobId??draft?.jobId??'',contractor=context.context.role==='contractor';
    const body={mediaType,byteSize:bytes.length,checksum};
    const record:PendingUpload={id,accountId:context.user.id,contextId:context.context.id,jobId,purpose:'evidence',localUri,mediaType,byteSize:bytes.length,checksum,
      intentPath:jobId?'workspaces/'+jobId+(contractor?'/work/uploads':'/uploads'):'',intentBody:contractor?body:{...body,purpose:'evidence'},baseVersion:contractor?0:selected?.version??1,
      intentOperationId:Crypto.randomUUID(),finalizeOperationId:Crypto.randomUUID(),state:'device-only',...(draft?{draftId:draft.id}:{})};
    await store.current!.saveUpload(record);await local(context);setMessage('Saved on this device · not submitted. Resume upload explicitly when connected.');
  }
  async function resume(u:PendingUpload){
    if(!context||!u.jobId)throw new Error('Create the private server request draft before uploading this capture.');
    const bytes=await new File(u.localUri).bytes(),digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const result=await resumeUpload(client.current,context,u,bytes,checksum,r=>store.current!.saveUpload(r));await local(context);
    setMessage(result.record.state==='ready'?'Upload verified. It has not published a request or declared work complete.':'Upload state: '+result.record.state+'. Refresh later if scanning is pending.');
  }
  async function start(){
    if(!selected||!work||!context?.context||!confirmed)return;const operationId=Crypto.randomUUID();
    const d:Draft={id:Crypto.randomUUID(),accountId:context.user.id,contextId:context.context.id,jobId:selected.jobId,kind:'start',title:'Start submission',text:target,location:'',updatedAt:new Date().toISOString(),operationId,baseVersion:work.version,accessVersion:context.accessVersion};
    await store.current!.saveDraft(d);setDraft(d);setPending({id:operationId,description:'Recording Start'});
    try {await client.current.command('workspaces/'+selected.jobId+'/work/start',{mode:'known',completedBy:target,confirmed:true},operationId,work.version,context.accessVersion);await store.current!.removeDraft(d.id);setDraft(null);setPending(null);await open(selected);setMessage('Start recorded by the server.');}
    catch(error){await rejected(error,d);throw error;}
  }
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>QuoteFix</Text><Text>Native development · shared QuoteFix backend</Text>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</Text>
    {!context?<Button title="Sign in with external browser" disabled={busy||!storeReady} onPress={()=>void run(login)}/>:<>
      <Text>{context.user.name} · {context.context?.role.toUpperCase()??'Choose context'}</Text>
      <Button title="Refresh current server data" disabled={busy} onPress={()=>void run(refresh)}/><Button title="Sign out and clear device drafts" disabled={busy} onPress={()=>void run(logout)}/>
      {context.memberships.filter(m=>m.id!==context.context?.id).map(m=><Button key={m.id} title={'Switch to '+m.role.toUpperCase()} disabled={busy} onPress={()=>void run(()=>choose(m.id))}/>)}
      <Text accessibilityRole="header" style={styles.heading}>Outstanding actions</Text>
      {tasks.map(t=><View key={t.taskId} style={styles.card}><Text>{t.ownerRole.toUpperCase()}: {t.action}</Text><Text>{t.state}{t.eventAt?' · '+stamp(t.eventAt):''}</Text></View>)}
      <Text accessibilityRole="header" style={styles.heading}>Current tickets</Text>
      {tickets.map(j=><View key={j.jobId} style={styles.card}><Text>{j.title} · {j.stage}</Text><Text>{j.waitingOn?'Pending: '+j.waitingOn.role+' '+j.waitingOn.action:''}</Text><Button title="Review current ticket" disabled={busy} onPress={()=>void run(()=>open(j))}/></View>)}
      {selected&&<View style={styles.card}><Text accessibilityRole="header">{selected.title}</Text>{work&&<><Text>Current authorised terms</Text><Text>{JSON.stringify(work.terms,null,2)}</Text><Text>{JSON.stringify(work.waitingOn)}</Text></>}
        {history.map((h,i)=><Text key={i}>{h.action} · {stamp(h.recorded_at)}</Text>)}
        {context.context?.role==='contractor'&&work&&!work.state.started_at&&<><Text>Completed by (ISO date/time with timezone)</Text><TextInput accessibilityLabel="Completed by date and time" style={styles.input} value={target} onChangeText={setTarget} placeholder="2026-11-03T18:00:00+08:00"/><Text>I confirm Start of this authorised work</Text><Switch accessibilityLabel="Confirm Start" value={confirmed} onValueChange={setConfirmed}/><Button title="Record Start online" disabled={busy||!confirmed||!!pending} onPress={()=>void run(start)}/></>}
        <Button title="Continue the full workflow in external browser" disabled={busy} onPress={()=>void WebBrowser.openBrowserAsync(baseUrl)}/>
      </View>}
      {['cm','mcst','contractor'].includes(context.context?.role??'')&&<><Text accessibilityRole="header" style={styles.heading}>Device drafts and capture</Text><Text>Only unfinished drafts and pending uploads persist. Payment proof and confidential cases stay online. No background-transfer guarantee.</Text>
        <Button title="New device draft" disabled={busy||!!pending} onPress={newDraft}/>
        {drafts.map(d=><Button key={d.id} title={'Restore '+(d.title||d.kind)+(d.operationId?' · checking submission':' · device draft')} disabled={busy} onPress={()=>{setDraft(d);setPending(d.operationId?{id:d.operationId,description:'Check earlier submission'}:null);}}/>)}
        {draft&&<View style={styles.card}><Text>{draft.operationId?'Checking submission · check the original operation':'Saved on this device · not submitted'}</Text><TextInput style={styles.input} accessibilityLabel="Draft title" value={draft.title} editable={!pending} onChangeText={title=>setDraft({...draft,title,operationId:undefined})} placeholder="Title"/><TextInput style={styles.input} accessibilityLabel="Draft observations or quote notes" value={draft.text} editable={!pending} multiline onChangeText={text=>setDraft({...draft,text,operationId:undefined})} placeholder="Observations or quote notes"/><TextInput style={styles.input} accessibilityLabel="Private affected location" value={draft.location} editable={!pending} onChangeText={location=>setDraft({...draft,location,operationId:undefined})} placeholder="Private affected location"/>
          <Button title="Save on this device" disabled={busy} onPress={()=>void run(saveDraft)}/>
          {draft.kind==='issue'&&!draft.jobId&&<><Text>I reviewed this private request draft</Text><Switch accessibilityLabel="Confirm private request draft" value={confirmed} onValueChange={setConfirmed}/><Button title="Create private server draft online" disabled={busy||!confirmed||!!pending} onPress={()=>void run(createPrivateDraft)}/></>}
        </View>}
        <Button title="Capture repair photo" disabled={busy} onPress={()=>void run(()=>capture(true))}/><Button title="Choose JPEG, PNG or PDF" disabled={busy} onPress={()=>void run(()=>capture(false))}/>
        {uploads.map(u=><View key={u.id} style={styles.card}><Text>{u.mediaType} · {u.state} · {u.byteSize} bytes</Text><Button title={u.state==='verifying'?'Refresh verification':'Resume this upload online'} disabled={busy||u.state==='rejected'} onPress={()=>void run(()=>resume(u))}/></View>)}
      </>}
      {pending&&<View style={styles.card}><Text>Checking submission: {pending.description}. Do not create another command.</Text><Button title="Check original submission" disabled={busy} onPress={()=>void run(checkPending)}/>
        <Text>I reviewed the unchanged saved input and want to retry this same operation online</Text><Switch accessibilityLabel="Confirm same-operation retry" value={confirmed} onValueChange={setConfirmed}/><Button title="Retry original unchanged submission online" disabled={busy||!confirmed||draft?.operationId!==pending.id} onPress={()=>void run(retryPending)}/>
      </View>}
    </>}
  </ScrollView>;
}
const styles=StyleSheet.create({page:{padding:20,paddingTop:50,gap:14},title:{fontSize:28,fontWeight:'bold'},heading:{fontSize:21,fontWeight:'bold',marginTop:12},card:{padding:12,borderWidth:1,borderColor:'#777',gap:10},input:{borderWidth:1,borderColor:'#777',padding:12,fontSize:16,minHeight:48}});
