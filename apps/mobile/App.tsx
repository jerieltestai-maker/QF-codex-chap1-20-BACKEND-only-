import {useEffect,useRef,useState} from 'react';
import {AppState,Button,ScrollView,Text,TextInput,View,StyleSheet,Switch,Linking,Image} from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import {File} from 'expo-file-system';
import {NativeClient,NativeError,resumeUpload,consumeEvidence,type UploadStatus,type NativeContext,type PendingUpload} from '../../packages/native-client/client';
import {localRole,type LocalIdentity} from '../../packages/native-client/local-state';
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
  const [draftConfirmed,setDraftConfirmed]=useState(false),[retryConfirmed,setRetryConfirmed]=useState(false),[evidenceConfirmed,setEvidenceConfirmed]=useState(false);
  const binding=useRef('');
  const [localIdentity,setLocalIdentity]=useState<LocalIdentity|null>(null);
  const [review,setReview]=useState<{upload:PendingUpload;status:UploadStatus;workVersion:number}|null>(null),[evidenceNote,setEvidenceNote]=useState('');
  const [link,setLink]=useState<string|null>(null);
  const clearServer=()=>{setTickets([]);setTasks([]);setSelected(null);setWork(null);setHistory([]);setConfirmed(false);};
  async function local(c:LocalIdentity) {
    if(!store.current)return;const epoch=generation.current;
    const active=await store.current.identity(binding.current);if(!active||active.accountId!==c.accountId||active.contextId!==c.contextId)return;
    const [d,u]=await Promise.all([store.current.drafts(c.accountId,c.contextId),store.current.uploads(c.accountId,c.contextId)]);
    if(epoch===generation.current){setDrafts(d);setUploads(u);}
  }
  async function refresh() {
    const epoch=generation.current;
    try {
      const cap=await client.current.request<{minimumContractVersion:number}>('capabilities');
      if(cap.minimumContractVersion>1)throw new Error('Update QuoteFix before using this server.');
      await client.current.request('me/refresh-context');const c=await client.current.context();
      if(epoch!==generation.current)return;
      const owner=await store.current?.owner();if(epoch!==generation.current)return;
      if(owner&&owner!==c.user.id){await store.current?.clear();if(epoch!==generation.current)return;}
      await store.current?.setOwner(c.user.id);if(epoch!==generation.current)return;
      if(!c.context){await store.current?.clear();setLocalIdentity(null);setDraft(null);setDrafts([]);setUploads([]);setContext(c);clearServer();setMessage('Choose an authorised account context.');return;}
      if(!localRole(c.context.role))throw new Error('Update QuoteFix to use this account role.');
      const profile:LocalIdentity={accountId:c.user.id,contextId:c.context.id,role:c.context.role,sessionBinding:binding.current};
      await store.current?.rememberIdentity(profile);if(epoch!==generation.current)return;setLocalIdentity(profile);await local(profile);
      const [j,t]=await Promise.all([client.current.all<Ticket>('dashboard/tickets'),client.current.all<Task>('dashboard/tasks')]);
      if(epoch!==generation.current)return;setContext(c);setTickets(j);setTasks(t);setMessage('Current server access checked. Times below use Singapore time.');
    } catch(error){if(epoch!==generation.current)return;clearServer();setContext(null);setReview(null);
      const profile=await store.current?.identity(binding.current);setLocalIdentity(profile??null);if(profile)await local(profile);
      throw error;
    }
  }
  async function run(action:()=>Promise<void>) {setBusy(true);try{await action();}catch(error){setMessage(error instanceof Error?error.message:'Action unavailable');}finally{setBusy(false);}}
  useEffect(()=>{
    void run(async()=>{store.current=await deviceStore();setStoreReady(true);const s=await readSession();if(s){
      binding.current=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,s.token);client.current.replaceSession(s);
      const profile=await store.current.identity(binding.current);if(profile){setLocalIdentity(profile);await local(profile);setMessage('Device drafts available. Connect to refresh server access.');}
      await refresh();}});
    const sub=AppState.addEventListener('change',state=>{generation.current++;client.current.cancelResponses();clearServer();setContext(null);setReview(null);if(state==='active'&&binding.current)void run(refresh);});
    return()=>{generation.current++;sub.remove();client.current.cancelResponses();void store.current?.close();};
  },[]);
  useEffect(()=>{void Linking.getInitialURL().then(url=>{if(url)setLink(ticketFromLink(url)??null);});const sub=Linking.addEventListener('url',e=>setLink(ticketFromLink(e.url)??null));return()=>sub.remove();},[]);
  useEffect(()=>{if(!link||!context)return;const id=link;setLink(null);void run(async()=>{await client.current.request('me/refresh-context');const rows=await client.current.request<{items:Ticket[]}>('dashboard/tickets?q='+encodeURIComponent(id));const ticket=rows.items.find(j=>j.jobId===id);if(!ticket)throw new Error('This ticket is unavailable in your current account context.');await open(ticket);});},[link,context]);
  async function login(){
    if(draft&&localIdentity)await store.current!.saveDraft({...draft,updatedAt:new Date().toISOString()});
    const s=await signIn(baseUrl);generation.current++;binding.current=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,s.token);client.current.replaceSession(s);setLocalIdentity(null);
    setDraft(null);setDrafts([]);setUploads([]);setPending(null);clearServer();await refresh();
  }
  async function logout(){
    generation.current++;client.current.cancelResponses();let revoked=true;
    try{await client.current.request('auth/logout',{});}catch{revoked=false;}
    client.current.replaceSession(undefined);binding.current='';await forgetSession();await store.current?.clear();clearServer();setContext(null);setLocalIdentity(null);setReview(null);setDraft(null);setDrafts([]);setUploads([]);setPending(null);
    setMessage(revoked?'Signed out. Local drafts and files cleared.':'Signed out locally and cleared drafts/files. Server revocation was unavailable; the session still expires on the server.');
  }
  async function choose(c:string){
    if(!context)return;generation.current++;client.current.cancelResponses();clearServer();setLocalIdentity(null);setReview(null);setDraft(null);setDrafts([]);setUploads([]);setPending(null);await store.current?.clear();
    await client.current.request('me/context',{membershipId:c});await refresh();
  }
  async function open(ticket:Ticket){
    const epoch=++generation.current;client.current.cancelResponses();setSelected(ticket);setWork(null);setHistory([]);setConfirmed(false);
    const h=await client.current.all<{action:string;recorded_at:string}>('workspaces/'+ticket.jobId+'/chronology');
    let w:Work|null=null;try{w=await client.current.request<Work>('workspaces/'+ticket.jobId+'/work');}catch(error){if(!(error instanceof NativeError&&[403,404].includes(error.status)))throw error;}
    if(epoch===generation.current){setHistory(h);setWork(w);}
  }
  async function newDraft(){if(!localIdentity)return;
    if(draft)await store.current!.saveDraft({...draft,updatedAt:new Date().toISOString()});
    const next:Draft={id:Crypto.randomUUID(),accountId:localIdentity.accountId,contextId:localIdentity.contextId,jobId:selected?.jobId??null,kind:localIdentity.role==='contractor'?'quote':'issue',title:'',text:'',location:'',updatedAt:new Date().toISOString()};
    await store.current!.saveDraft(next);setDraft(next);setDraftConfirmed(false);await local(localIdentity);
  }
  async function saveDraft(){if(!draft||!localIdentity)return;await store.current!.saveDraft({...draft,updatedAt:new Date().toISOString()});await local(localIdentity);setMessage('Saved on this device · not submitted.');}
  async function createPrivateDraft(retry=false){
    if(!draft||!context?.context?.estate_id||!(retry?retryConfirmed:draftConfirmed)||draft.kind!=='issue')return;
    const operationId=draft.operationId??Crypto.randomUUID(),d={...draft,operationId};setDraft(d);await store.current!.saveDraft(d);
    setPending({id:operationId,description:'Creating private request draft'});
    try {
      const result=await client.current.command<{jobId:string}>('workspaces',{estateId:context.context.estate_id,title:d.title,observations:d.text,affectedLocation:d.location},operationId,0,context.accessVersion,{accountId:context.user.id,contextId:context.context.id});
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
    if(!draft?.operationId||!pending||!retryConfirmed||!context)return;
    if(draft.kind==='issue'){await createPrivateDraft(true);return;}
    if(draft.kind!=='start'||!draft.jobId||draft.baseVersion===undefined||draft.accessVersion===undefined)throw new Error('Original reviewed input is unavailable. Keep this operation ID for review.');
    try {
      await client.current.command('workspaces/'+draft.jobId+'/work/start',{mode:'known',completedBy:draft.text,confirmed:true},draft.operationId,draft.baseVersion,draft.accessVersion,{accountId:context.user.id,contextId:context.context!.id});
      await store.current!.removeDraft(draft.id);setDraft(null);setPending(null);await refresh();setMessage('Original Start submission confirmed.');
    }catch(error){await rejected(error,draft);throw error;}
  }
  async function capture(camera:boolean){
    if(!localIdentity)return;if(!selected&&!draft)throw new Error('Create or restore a device draft first.');
    let uri:string|undefined,mediaType:string|undefined;
    if(camera){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('Camera permission denied. Choose an existing JPEG, PNG or PDF instead.');const r=await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:1,exif:false});if(r.canceled)return;uri=r.assets[0]?.uri;mediaType=r.assets[0]?.mimeType??'image/jpeg';}
    else {const r=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','application/pdf'],copyToCacheDirectory:true});if(r.canceled)return;uri=r.assets[0]?.uri;mediaType=r.assets[0]?.mimeType;}
    if(!uri||!mediaType||!['image/jpeg','image/png','application/pdf'].includes(mediaType))throw new Error('Use JPEG, PNG or PDF. Convert HEIC to JPEG before attaching it.');
    const epoch=generation.current,file=new File(uri);if(file.size<=0||file.size>10485760)throw new Error('Use a file up to 10 MiB.');
    const bytes=await file.bytes(),digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(epoch!==generation.current)return;
    if(draft)await store.current!.saveDraft({...draft,updatedAt:new Date().toISOString()});
    const id=Crypto.randomUUID(),localUri=await store.current!.copyFile(uri,id,mediaType==='application/pdf'?'pdf':mediaType==='image/png'?'png':'jpg',localIdentity.accountId,localIdentity.contextId),jobId=draft?.jobId??selected?.jobId??'',contractor=localIdentity.role==='contractor';
    const body={mediaType,byteSize:bytes.length,checksum};
    const record:PendingUpload={id,accountId:localIdentity.accountId,contextId:localIdentity.contextId,jobId,purpose:'evidence',localUri,mediaType,byteSize:bytes.length,checksum,
      intentPath:jobId?'workspaces/'+jobId+(contractor?'/work/uploads':'/uploads'):'',intentBody:contractor?body:{...body,purpose:'evidence'},baseVersion:contractor?0:selected?.version??1,
      intentOperationId:Crypto.randomUUID(),finalizeOperationId:Crypto.randomUUID(),state:'device-only',...(draft?{draftId:draft.id}:{})};
    await store.current!.saveUpload(record);await local(localIdentity);setMessage('Saved on this device · not submitted. Resume upload explicitly when connected.');
  }
  async function resume(u:PendingUpload){
    if(u.consumed){await store.current!.removeUpload(u.id);if(localIdentity)await local(localIdentity);return;}
    if(!context||!u.jobId)throw new Error('Connect and create or open the private server request before uploading this capture.');
    const bytes=await new File(u.localUri).bytes(),digest=await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256,bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const result=await resumeUpload(client.current,context,u,bytes,checksum,r=>store.current!.saveUpload(r));if(localIdentity)await local(localIdentity);
    if(result.record.state==='ready') {
      const current=context.context?.role==='contractor'?await client.current.request<Work>('workspaces/'+u.jobId+'/work'):null;
      setReview({upload:result.record,status:result.status,workVersion:current?.version??0});setEvidenceNote(result.record.consumption?.note??'');setEvidenceConfirmed(false);
    }
    setMessage(result.record.state==='ready'?'Verified capture ready. Review below and attach explicitly; this does not publish or complete work.':'Upload state: '+result.record.state+'. Refresh later if scanning is pending.');
  }
  async function attachCapture(){
    if(!context||!review||!evidenceConfirmed)return;
    try {
      const result=await consumeEvidence(client.current,context,review.upload,review.status,{note:evidenceNote,workVersion:review.workVersion,newOperationId:Crypto.randomUUID},async r=>{await store.current!.saveUpload(r);setReview({...review,upload:r});});
      await store.current!.removeUpload(result.id);setReview(null);setEvidenceConfirmed(false);
      setMessage('Evidence attached to the server record. Local capture removed. RFQ publication and work completion remain separate actions.');
    } finally {if(localIdentity)await local(localIdentity);}
  }
  async function bindWorkDraft(){
    if(!draft||!localIdentity||!selected||!work||draft.jobId)return;
    const saved={...draft,jobId:selected.jobId};await store.current!.saveDraft(saved);setDraft(saved);
    for(const upload of uploads.filter(u=>u.draftId===draft.id&&!u.uploadId))await store.current!.saveUpload({...upload,jobId:selected.jobId,intentPath:'workspaces/'+selected.jobId+'/work/uploads',baseVersion:0});
    await local(localIdentity);setMessage('Device capture linked to this authorised work ticket. Upload and attachment still need explicit submission.');
  }
  async function start(){
    if(!selected||!work||!context?.context||!confirmed)return;const operationId=Crypto.randomUUID();
    const d:Draft={id:Crypto.randomUUID(),accountId:context.user.id,contextId:context.context.id,jobId:selected.jobId,kind:'start',title:'Start submission',text:target,location:'',updatedAt:new Date().toISOString(),operationId,baseVersion:work.version,accessVersion:context.accessVersion};
    await store.current!.saveDraft(d);setDraft(d);setPending({id:operationId,description:'Recording Start'});
    try {await client.current.command('workspaces/'+selected.jobId+'/work/start',{mode:'known',completedBy:target,confirmed:true},operationId,work.version,context.accessVersion,{accountId:context.user.id,contextId:context.context.id});await store.current!.removeDraft(d.id);setDraft(null);setPending(null);await open(selected);setMessage('Start recorded by the server.');}
    catch(error){await rejected(error,d);throw error;}
  }
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>QuoteFix</Text><Text>Native development · shared QuoteFix backend</Text>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</Text>
    {!context&&!localIdentity?<Button title="Sign in with external browser" disabled={busy||!storeReady} onPress={()=>void run(login)}/>:<>
      <Button title="Sign out and clear device drafts" disabled={busy} onPress={()=>void run(logout)}/>
      {!context&&<><Text>Device drafts only. Connect and sign in before accessing server records or submitting decisions.</Text><Button title="Reconnect to server" disabled={busy} onPress={()=>void run(refresh)}/><Button title="Sign in again" disabled={busy} onPress={()=>void run(login)}/></>}
      {context&&<>
      <Text>{context.user.name} · {context.context?.role.toUpperCase()??'Choose context'}</Text>
      <Button title="Refresh current server data" disabled={busy} onPress={()=>void run(refresh)}/>
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
      </>}
      {['cm','mcst','contractor'].includes(localIdentity?.role??'')&&<><Text accessibilityRole="header" style={styles.heading}>Device drafts and capture</Text><Text>Only unfinished drafts and pending uploads persist. Payment proof and confidential cases stay online. No background-transfer guarantee.</Text>
        <Button title="New device draft" disabled={busy||!!pending} onPress={()=>void run(newDraft)}/>
        {drafts.map(d=><Button key={d.id} title={'Restore '+(d.title||d.kind)+(d.operationId?' · checking submission':' · device draft')} disabled={busy||!!pending} onPress={()=>{setDraft(d);setDraftConfirmed(false);setRetryConfirmed(false);setPending(d.operationId?{id:d.operationId,description:'Check earlier submission'}:null);}}/>)}
        {draft&&<View style={styles.card}><Text>{draft.operationId?'Checking submission · check the original operation':'Device draft · not submitted. Save after editing.'}</Text><TextInput style={styles.input} accessibilityLabel="Draft title" value={draft.title} editable={!pending} onChangeText={title=>{setDraftConfirmed(false);setDraft({...draft,title,operationId:undefined});}} placeholder="Title"/><TextInput style={styles.input} accessibilityLabel="Draft observations or quote notes" value={draft.text} editable={!pending} multiline onChangeText={text=>{setDraftConfirmed(false);setDraft({...draft,text,operationId:undefined});}} placeholder="Observations or quote notes"/><TextInput style={styles.input} accessibilityLabel="Private affected location" value={draft.location} editable={!pending} onChangeText={location=>{setDraftConfirmed(false);setDraft({...draft,location,operationId:undefined});}} placeholder="Private affected location"/>
          <Button title="Save on this device" disabled={busy} onPress={()=>void run(saveDraft)}/>
          {context&&localIdentity?.role==='contractor'&&selected&&work&&!draft.jobId&&<Button title="Use selected authorised work ticket for this draft" disabled={busy} onPress={()=>void run(bindWorkDraft)}/>}
          {context&&draft.kind==='issue'&&!draft.jobId&&<><Text>I reviewed this private request draft</Text><Switch accessibilityLabel="Confirm private request draft" value={draftConfirmed} onValueChange={setDraftConfirmed}/><Button title="Create private server draft online" disabled={busy||!draftConfirmed||!!pending} onPress={()=>void run(()=>createPrivateDraft())}/></>}
        </View>}
        <Button title="Capture repair photo" disabled={busy} onPress={()=>void run(()=>capture(true))}/><Button title="Choose JPEG, PNG or PDF" disabled={busy} onPress={()=>void run(()=>capture(false))}/>
        {uploads.map(u=><View key={u.id} style={styles.card}><Text>{u.mediaType} · {u.consumed?'Attached; local cleanup pending':u.state} · {u.byteSize} bytes</Text><Button title={u.consumed?'Finish local cleanup':u.state==='ready'?'Review and attach verified capture':u.state==='verifying'?'Refresh verification':'Resume this upload online'} disabled={busy||u.state==='rejected'||!context&&!u.consumed} onPress={()=>void run(()=>resume(u))}/></View>)}
        {context&&review&&<View style={styles.card}><Text accessibilityRole="header">Review capture for ticket {review.upload.jobId}</Text>
          {review.upload.mediaType.startsWith('image/')&&<Image source={{uri:review.upload.localUri}} style={{width:240,height:240}} resizeMode="contain" accessibilityLabel="Selected repair capture"/>}
          <Text>This attaches evidence only. It does not publish an RFQ or declare work complete.</Text>
          {context.context?.role==='contractor'&&<TextInput accessibilityLabel="Optional evidence note" style={styles.input} value={evidenceNote} editable={!review.upload.consumption} onChangeText={v=>{setEvidenceNote(v);setEvidenceConfirmed(false);}} placeholder="Optional description of this repair evidence"/>}
          <Switch accessibilityLabel="I reviewed this capture and want to attach it" value={evidenceConfirmed} onValueChange={setEvidenceConfirmed}/>
          <Button title="Attach reviewed evidence online" disabled={busy||!evidenceConfirmed} onPress={()=>void run(attachCapture)}/>
        </View>}
      </>}
      {context&&pending&&<View style={styles.card}><Text>Checking submission: {pending.description}. Do not create another command.</Text><Button title="Check original submission" disabled={busy} onPress={()=>void run(checkPending)}/>
        <Text>I reviewed the unchanged saved input and want to retry this same operation online</Text><Switch accessibilityLabel="Confirm same-operation retry" value={retryConfirmed} onValueChange={setRetryConfirmed}/><Button title="Retry original unchanged submission online" disabled={busy||!retryConfirmed||draft?.operationId!==pending.id} onPress={()=>void run(retryPending)}/>
      </View>}
    </>}
  </ScrollView>;
}
const styles=StyleSheet.create({page:{padding:20,paddingTop:50,gap:14},title:{fontSize:28,fontWeight:'bold'},heading:{fontSize:21,fontWeight:'bold',marginTop:12},card:{padding:12,borderWidth:1,borderColor:'#777',gap:10},input:{borderWidth:1,borderColor:'#777',padding:12,fontSize:16,minHeight:48}});
