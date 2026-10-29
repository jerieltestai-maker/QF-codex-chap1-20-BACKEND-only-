(() => {
  'use strict';
  const el=id=>document.getElementById(id),status=text=>{el('workspace-status').textContent=text;if(text)el('status').textContent=text;};
  let context=null,job=null,draft=null,epoch=0,serverOffset=0,jobLoad=0,listLoad=0,uploadBusy=false;
  const partition=()=>context.user.id+':'+context.context.id;
  const storageKey=()=> 'quotefix:web-drafts:'+partition();
  const empty=()=>({id:crypto.randomUUID(),revision:0,baseVersion:0,fields:{title:'',observations:'',affectedLocation:''}});
  const fields=()=>({title:el('draft-title').value,observations:el('draft-observations').value,affectedLocation:el('draft-location').value});
  const fill=values=>{el('draft-title').value=values.title;el('draft-observations').value=values.observations;el('draft-location').value=values.affectedLocation;};
  const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  function localDrafts() {try{return JSON.parse(localStorage.getItem(storageKey())||'[]');}catch{return [];}}
  function saveLocal() {
    if(!context?.context)return;
    draft={...draft,fields:fields()};const copies=localDrafts().filter(item=>item.id!==draft.id);copies.push(draft);
    localStorage.setItem(storageKey(),JSON.stringify(copies));status('Saved on this device. Server not updated.');
  }
  async function api(route,body,command) {
    const active=context,generation=epoch;
    if(!active)throw new Error('Sign in to continue');
    const headers={'Content-Type':'application/json','X-CSRF-Token':active.csrfToken};
    if(command)Object.assign(headers,{'Idempotency-Key':command.key,'X-Access-Version':String(command.accessVersion??active.accessVersion),'If-Match':'"record-'+command.version+'"'});
    const response=await (window.qfUI?.fetch||fetch)('/api/v1/'+route,{method:body===undefined?'GET':'POST',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();
    if(generation!==epoch)throw new Error('Account or context changed. Refresh this view.');
    if(!response.ok){const error=new Error(result.error?.message||'Request failed');error.status=response.status;if(response.status===429){const wait=Number(response.headers.get('retry-after'));error.message=Number.isFinite(wait)&&wait>0?'Too many requests. Try again in '+Math.ceil(wait)+' seconds. Your draft is preserved.':'Too many requests. Wait briefly, then retry. Your draft is preserved.';}if(response.status===401)document.dispatchEvent(new Event('qf:session-expired'));if(response.status===403)document.dispatchEvent(new Event('qf:access-changed'));if(response.status===412)error.message+=' Your draft is preserved. Refresh the view and review the current version before submitting again.';throw error;}
    if(result.serverTime)serverOffset=Date.parse(result.serverTime)-Date.now();
    return result;
  }
  async function all(route,field) {
    const items=[],generation=epoch;let result;
    for(let offset=0;;offset+=100) {
      if(generation!==epoch)throw new Error('Account or context changed. Refresh this list.');
      const query=new URLSearchParams({limit:'100',offset:String(offset)});
      result=await api(route+(route.includes('?')?'&':'?')+query);
      if(generation!==epoch)throw new Error('Account or context changed. Refresh this list.');
      const page=field?result[field]:result;
      if(!Array.isArray(page))throw new Error('The server returned an invalid list. Refresh and try again.');
      items.push(...page);if(page.length<100)break;
    }
    return field?{...result,[field]:items}:items;
  }
  const commandClient=window.qfCommands.create({api,partition,generation:()=>epoch,storage:sessionStorage,online:()=>navigator.onLine,digest});
  const submit=commandClient.submit;
  function button(label,action) {
    const node=document.createElement('button');node.textContent=label;
    node.type='button';node.addEventListener('click',async()=>{node.disabled=true;try{await action();}catch(error){status(error.message);}finally{node.disabled=false;}});return node;
  }
  function line(value) {const p=document.createElement('p');p.textContent=value;return p;}
  async function refreshDrafts() {
    const copies=localDrafts();
    if(navigator.onLine)for(const server of await all('drafts'))if(!copies.some(d=>d.id===server.id&&d.revision===server.revision&&window.qfCommands.sameInput(d.fields,server.fields)))copies.push({id:server.id,revision:server.revision,baseVersion:server.base_version,jobId:server.job_id,fields:server.fields,serverOnly:true});
    const choice=item=>(item.serverOnly?'server:':'device:')+item.id;
    el('saved-drafts').replaceChildren(new Option('Choose a draft',''),...copies.map(item=>new Option((item.fields.title||'Untitled draft')+' · '+(item.serverOnly?'server':'device'),choice(item))));
    el('saved-drafts').onchange=()=>{const chosen=copies.find(d=>choice(d)===el('saved-drafts').value);if(chosen){jobLoad++;job=null;el('workspace-detail').hidden=true;draft={...chosen};fill(draft.fields);el('workspace-submit').textContent=draft.jobId?'Save repair changes':'Create private repair';status(chosen.serverOnly?'Loaded server draft.':'Loaded device draft.');}};
  }
  async function loadJob(id,loadFields=true) {
    const load=++jobLoad,generation=epoch,result=await api('workspaces/'+id);
    if(load!==jobLoad||generation!==epoch)return;
    const [history,supports]=await Promise.all([all('workspaces/'+id+'/history'),all('workspaces/'+id+'/support')]);
    if(load!==jobLoad||generation!==epoch)return;
    job=result.job;
    el('workspace-detail').hidden=false;el('workspace-title').textContent=job.title;el('workspace-stage').textContent=job.stage;
    el('workspace-facts').textContent=job.observations+'\nAffected location: '+job.affected_location;
    if(loadFields){draft={...empty(),jobId:id,baseVersion:job.version,fields:{title:job.title,observations:job.observations,affectedLocation:job.affected_location}};fill(draft.fields);}
    el('workspace-submit').textContent='Save repair changes';
    const chronology=document.createElement('ol');chronology.className='chronology';
    for(const event of history){const item=document.createElement('li'),when=document.createElement('time');item.append(line((event.actor_name||event.actor_role?.toUpperCase()||'System')+' · '+(window.qfUI?.label(event.action)||event.action)+(event.reason?' · '+event.reason:'')));when.textContent=new Date(event.recorded_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT';item.append(when);chronology.append(item);}
    el('workspace-history').replaceChildren(history.length?chronology:line('No repair history recorded yet.'));
    el('attachment-list').replaceChildren(...result.attachments.map(file=>{const link=document.createElement('a');link.href='/api/v1/files/'+file.id;link.textContent='Download '+file.variant+' '+file.media_type;const p=line('');p.append(link);return p;}));
    if(!result.attachments.length)el('attachment-list').append(line('No evidence attached. Choose a file to add it to this repair.'));
    el('support-list').replaceChildren(...supports.map(s=>{const row=line(s.privacy+' support: '+s.description);if(window.qfSupport?.openCase)row.append(button('Open support case',()=>window.qfSupport.openCase(s.id)));return row;}));
    if(!supports.length)el('support-list').append(line('No support requests visible for this repair.'));
    el('workspace-waiting').textContent=[result.waitingOn,...result.secondaryActions].filter(Boolean).map(t=>t.role==='none'?t.action:'Waiting on '+t.role.toUpperCase()+': '+t.action).join(' · ');
    await renderUploads();
    if(load!==jobLoad||generation!==epoch)return;
    document.dispatchEvent(new CustomEvent('qf:job',{detail:result}));
    if(loadFields){el('workspace-compose').open=false;document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen:'workspace'}}));}
  }
  async function refreshLists() {
    if(!context?.context||!navigator.onLine)return;
    const load=++listLoad,generation=epoch;
    const jobs=await all('workspaces');if(load!==listLoad||generation!==epoch)return;
    el('workspace-list').replaceChildren(...jobs.map(item=>{const b=button('',()=>loadJob(item.id)),title=document.createElement('strong'),stage=document.createElement('span');b.className='repair-row';title.textContent=item.title;stage.textContent=item.stage;b.append(title,stage);return b;}));
    if(!jobs.length){const empty=line(context.context.role==='contractor'?'Your eligible RFQs and assigned work appear in their respective views.':'No private repairs yet. Choose New repair to record an observation.');empty.className='empty-state';el('workspace-list').append(empty);}
    const bells=await all('notifications','notifications');if(load!==listLoad||generation!==epoch)return;el('bell-count').textContent='('+bells.unreadCount+' unread)';
    el('bell-list').replaceChildren(...bells.notifications.map(n=>{const p=line(n.message+' · '+new Date(n.issued_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT');
      if(!n.read_at)p.append(button('Mark read',async()=>{await api('notifications/'+n.id+'/read',{});await refreshLists();}));return p;}));
    if(!bells.notifications.length)el('bell-list').append(line('No notifications for this account and role.'));
    const result=await all('tasks','tasks');if(load!==listLoad||generation!==epoch)return;
    el('task-list').replaceChildren(...result.tasks.map(t=>{const row=line(t.owner_role.toUpperCase()+': '+t.action);if(t.job_id&&context.context.role!=='contractor')row.append(button('Open repair',()=>loadJob(t.job_id)));else if(t.job_id)row.append(button('Open assigned work',()=>window.qfWork.open(t.job_id)));if(t.support_id&&window.qfSupport?.openCase)row.append(button('Open support case',()=>window.qfSupport.openCase(t.support_id)));return row;}));
    if(!result.tasks.length)el('task-list').append(line('No actions waiting for you in this role.'));
    if(context.context.role==='admin') {
      const attention=await all('admin/attention','tasks');if(load!==listLoad||generation!==epoch)return;el('attention-list').replaceChildren(...attention.tasks.filter(t=>t.owner_role==='admin').map(t=>{
        const p=line(t.action+(t.acknowledged_at?' · Acknowledged; follow-up remains open.':' · Unacknowledged.'));
        const action=document.createElement('input');action.placeholder='Next action';action.setAttribute('aria-label','Next action');action.value=t.next_action||'';
        const at=document.createElement('input');at.type='datetime-local';at.setAttribute('aria-label','Next follow-up in Singapore time');
        if(t.kind==='rfq.urgent') {
          const outcome=document.createElement('select');for(const value of ['attempted','attendance_arranged','unresolved'])outcome.append(new Option(value.replaceAll('_',' '),value));
          const summary=document.createElement('input');summary.placeholder='Actual contact attempt / outcome';summary.setAttribute('aria-label','Actual contact attempt or outcome');
          const eta=document.createElement('input');eta.type='datetime-local';eta.setAttribute('aria-label','Confirmed ETA in Singapore time, optional');
          p.append(outcome,summary,eta,action,at,button('Save coordination outcome',async()=>{
            if(!at.value)throw new Error('Choose the next follow-up date and time.');
            await submit('admin/urgency/'+t.id+'/coordinate',{outcome:outcome.value,summary:summary.value,nextAction:action.value,followUpAt:new Date(at.value+':00+08:00').toISOString(),...(eta.value?{eta:new Date(eta.value+':00+08:00').toISOString()}:{})},t.version);await refreshLists();
          }));
        } else p.append(action,at,button('Acknowledge and save follow-up',async()=>{
          if(!at.value)throw new Error('Supply a follow-up date and time.');
          await submit('admin/attention/'+t.id+'/acknowledge',{nextAction:action.value,followUpAt:new Date(at.value+':00+08:00').toISOString()},t.version);await refreshLists();
        }));
        if(t.follow_up_at){const countdown=line('');countdown.dataset.due=t.follow_up_at;p.append(countdown);}return p;
      }));
      if(!el('attention-list').children.length)el('attention-list').append(line('No Admin follow-ups are outstanding.'));
      const failures=await all('admin/failed-work');if(load!==listLoad||generation!==epoch)return;el('failed-list').replaceChildren(...failures.map(w=>{const p=line(w.kind+' · '+w.last_error_code+' · '+w.attempts+' attempts');p.append(button('Retry after fixing cause',async()=>{await api('admin/failed-work/'+w.id+'/retry',{});await refreshLists();}));return p;}));
      if(!failures.length)el('failed-list').append(line('No persistent processing failures.'));
    }
    document.dispatchEvent(new CustomEvent('qf:lists-refreshed'));
  }
  let database;
  function uploadDatabase(){return database??=new Promise((resolve,reject)=>{const opening=indexedDB.open('quotefix-web-uploads',1);opening.onupgradeneeded=()=>opening.result.createObjectStore('queue',{keyPath:'id'});opening.onsuccess=()=>resolve(opening.result);opening.onerror=()=>{database=null;reject(new Error('Device storage is unavailable. Enable local storage to queue evidence.'));};opening.onblocked=()=>{database=null;reject(new Error('Device storage is blocked by another tab. Close older QuoteFix tabs and try again.'));};});}
  async function queueStore(mode,action) {
    const db=await uploadDatabase();return new Promise((resolve,reject)=>{const transaction=db.transaction('queue',mode),request=action(transaction.objectStore('queue'));let value;
      request.onsuccess=()=>{value=request.result;};transaction.oncomplete=()=>resolve(value);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});
  }
  async function queueItems() {return (await queueStore('readonly',s=>s.getAll())).filter(row=>row.partition===partition()&&row.jobId===job?.id);}
  async function renderUploads() {
    if(!context?.context||!job)return;
    const generation=epoch,id=job.id,items=await queueItems();if(generation!==epoch||id!==job?.id)return;
    el('upload-list').replaceChildren(...items.map(row=>{const p=line(row.name+' · '+row.state);if(row.state==='attached'||row.state.startsWith('rejected'))p.append(button('Remove this device copy',async()=>{await queueStore('readwrite',s=>s.delete(row.id));await renderUploads();}));return p;}));
    if(!items.length)el('upload-list').append(line('No files queued on this device for this repair.'));
  }
  async function resumeUploads() {
    if(!navigator.onLine||!job||uploadBusy)return;
    uploadBusy=true;
    try{
    const activePartition=partition(),generation=epoch,id=job.id;
    for(const row of await queueItems()) {
      if(generation!==epoch||activePartition!==partition())return;
      try {
        const bytes=await row.file.arrayBuffer(),checksum=await digest(bytes);
        if(!row.uploadId) {
          const result=await submit('workspaces/'+row.jobId+'/uploads',{purpose:'evidence',mediaType:row.file.type,byteSize:row.file.size,checksum},job.version);
          row.uploadId=result.uploadId;await queueStore('readwrite',s=>s.put(row));
        }
        let server=await api('uploads/'+row.uploadId);
        if(server.state==='transferring') {
          await api('uploads/'+row.uploadId+'/renew',{});
          for(let offset=0;offset<bytes.byteLength;offset+=262144) {
            if(generation!==epoch||activePartition!==partition())return;
            if(server.chunks.some(c=>c.byte_offset===offset))continue;
            const chunk=new Uint8Array(bytes.slice(offset,offset+262144));let binary='';for(const byte of chunk)binary+=String.fromCharCode(byte);
            await api('uploads/'+row.uploadId+'/chunks',{offset,bytes:btoa(binary)});
          }
          await submit('uploads/'+row.uploadId+'/finalize',{},0);server=await api('uploads/'+row.uploadId);
        }
        row.state=server.state;
        if(server.state==='ready') {
          for(const object of server.objects)await submit('workspaces/'+row.jobId+'/attachments',{fileId:object.id},0);
          row.state='attached';
        }
        if(server.state==='rejected')row.state='rejected: '+server.rejectionCode;
      } catch(error) {if(generation!==epoch)return;row.state=error.message;}
      await queueStore('readwrite',s=>s.put(row));await renderUploads();
    }
    if(generation===epoch&&job?.id===id)await loadJob(id,false);
    }finally{uploadBusy=false;}
  }
  const bind=(id,action)=>el(id).addEventListener('click',async()=>{const node=el(id);node.disabled=true;try{await action();}catch(error){status(error.message);}finally{node.disabled=false;}});
  bind('draft-local',async()=>{saveLocal();await refreshDrafts();});
  bind('draft-server',async()=>{
    saveLocal();const estateId=context.context.estate_id||el('workspace-estate').value;
    const body={id:draft.id,estateId,baseVersion:draft.baseVersion,fields:draft.fields,...(draft.jobId?{jobId:draft.jobId}:{})};
    try{const result=await submit('drafts',body,draft.revision);draft.revision=result.revision;saveLocal();status('Draft saved on this device and server.');}
    catch(error){if(error.status===412){draft={...draft,id:crypto.randomUUID(),revision:0};saveLocal();error.message+=' Your conflicting draft was kept separately.';}throw error;}
    await refreshDrafts();
  });
  bind('workspace-submit',async()=>{
    if(!fields().title.trim()){el('draft-title').focus();throw new Error('Add a repair title. You can save an unfinished draft at any time.');}
    if(!fields().observations.trim()){el('draft-observations').focus();throw new Error('Describe the observed problem before creating the repair.');}
    if(!fields().affectedLocation.trim()){el('draft-location').focus();throw new Error('Add the affected location before creating the repair.');}
    saveLocal();const route=draft.jobId?'workspaces/'+draft.jobId+'/edit':'workspaces';
    const body=draft.jobId?draft.fields:{...draft.fields,estateId:context.context.estate_id||el('workspace-estate').value};
    const result=await submit(route,body,draft.baseVersion);await loadJob(result.jobId);await refreshLists();status('Private repair saved.');
  });
  bind('workspace-new',async()=>{jobLoad++;draft=empty();fill(draft.fields);job=null;el('workspace-detail').hidden=true;el('workspace-submit').textContent='Create private repair';});
  bind('upload-queue',async()=>{
    const file=el('evidence-file').files[0];if(!file||!job)throw new Error('Open a repair and choose an evidence file.');
    if(file.size<1||file.size>10485760||!['image/png','image/jpeg','application/pdf'].includes(file.type))throw new Error('Use PNG, JPEG or PDF up to 10 MiB.');
    await queueStore('readwrite',s=>s.put({id:crypto.randomUUID(),partition:partition(),jobId:job.id,name:file.name,file,state:'Device only; upload not submitted'}));
    el('evidence-file').value='';await renderUploads();status('File queued on this device. Resume queued uploads to attach it to the repair.');
  });
  bind('upload-resume',resumeUploads);
  bind('support-send',async()=>{
    if(!el('support-description').value.trim())throw new Error('Describe the help you need before sending the support request.');
    const result=await submit('workspaces/'+job.id+'/support',{description:el('support-description').value,privacy:el('support-privacy').value,
      subjectUserIds:el('support-subjects').value.split(',').map(s=>s.trim()).filter(Boolean),subjectOrganisationIds:[]},job.version);
    el('support-description').value='';el('support-subjects').value='';status(result.message||'Support request sent to Admin.');await loadJob(job.id,false);await refreshLists();
  });
  const recover=async()=>{
    const generation=epoch,results=await commandClient.recover();if(generation!==epoch)return;
    if(job)await loadJob(job.id,false);await refreshLists();
    status(results.length?results.map(r=>r.route+': '+(r.result?'submission confirmed; no new decision was sent':'no outcome recorded yet; retry the original unchanged input')).join(' · '):'No pending submissions for this account and role.');
  };
  document.addEventListener('qf:context',async event=>{
    const next=event.detail,changed=context?.user.id!==next?.user.id||context?.context?.id!==next?.context?.id||context?.accessVersion!==next?.accessVersion||context?.context?.role!==next?.context?.role;
    if(changed){
      epoch++;jobLoad++;listLoad++;job=null;draft=empty();fill(draft.fields);status('');
      for(const id of ['workspace-list','workspace-facts','workspace-history','attachment-list','upload-list','support-list','bell-list','task-list','attention-list','failed-list'])el(id).replaceChildren();
      el('support-description').value='';el('support-subjects').value='';el('evidence-file').value='';el('workspace-detail').hidden=true;
      el('saved-drafts').replaceChildren(new Option('Choose a draft',''));el('bell-count').textContent='';el('workspace-submit').textContent='Create private repair';
    }
    context=next;el('workspace-shell').hidden=!next?.context;el('notifications-panel').hidden=!next?.context;
    if(!next?.context)return;
    el('workspace-editor').hidden=!next.capabilities['rfq.manage'];el('attention-panel').hidden=next.context.role!=='admin';el('workspace-estate-label').hidden=next.context.role!=='admin';
    try{
      if(next.context.role==='admin')el('workspace-estate').replaceChildren(...(await api('admin/estates')).map(e=>new Option(e.name,e.id)));
      if(!el('workspace-editor').hidden&&(changed||!el('workspace-editor').contains(document.activeElement)))await refreshDrafts();await refreshLists();
    }catch(error){status(error.message);}
  });
  document.addEventListener('qf:refresh',()=>{if(context?.context){refreshLists().catch(error=>status(error.message));if(job)loadJob(job.id,false).catch(error=>status(error.message));}});
  setInterval(()=>{document.querySelectorAll('[data-due]').forEach(node=>{
    const milliseconds=Date.parse(node.dataset.due)-(Date.now()+serverOffset),hours=Math.max(0,Math.floor(milliseconds/3600000));
    node.textContent=(milliseconds<=0?(node.dataset.overdueLabel||'Follow-up is due'):(node.dataset.followupPrefix||'Follow up in')+' '+Math.floor(hours/24)+'d '+hours%24+'h')+' — '+new Date(node.dataset.due).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT';
  });},1000);
  window.addEventListener('online',()=>{if(context?.context&&job)resumeUploads().catch(error=>status(error.message));});
  if(window.qfFlow){
    const ui=window.qfUI,compose=el('workspace-compose'),field=id=>el(id).closest('label'),review=ui.node('div');
    compose.querySelector('summary').textContent='Report an issue';
    compose.querySelector(':scope > p').remove();
    const draftHelp=ui.node('details');draftHelp.append(ui.node('summary','Drafts & privacy'),el('repair-draft-note'),field('saved-drafts'));compose.append(draftHelp);
    const utilities=ui.node('div');utilities.className='draft-utilities';utilities.append(el('draft-local'),el('draft-server'),el('workspace-new'));compose.append(utilities);
    el('draft-local').textContent='Save on device';el('draft-server').textContent='Save to account';
    ['draft-title','draft-location','draft-observations'].forEach(id=>el(id).required=true);
    review.className='draft-review';
    const updateReview=()=>review.replaceChildren(ui.facts({title:el('draft-title').value||'Not entered',location:el('draft-location').value||'Not entered',observedProblem:el('draft-observations').value||'Not entered'}));
    compose.addEventListener('input',updateReview);
    const flow=window.qfFlow.wizard(compose,{id:'repair-draft',title:'Report an issue',steps:[
      {title:'Location',fields:[field('draft-title'),field('draft-location'),el('workspace-estate-label')]},
      {title:'Observation',fields:[field('draft-observations')]},
      {title:'Review',fields:[review,el('workspace-submit')]}
    ]});compose.append(utilities,draftHelp);for(const empty of compose.querySelectorAll(':scope > .field-grid,:scope > .action-row'))if(!empty.children.length)empty.remove();updateReview();
    const back=ui.node('button','All repairs');back.type='button';back.className='text-action';el('workspace-shell').prepend(back);back.hidden=true;
    const layout=()=>{const detail=!el('workspace-detail').hidden,editing=compose.open;el('workspace-list').hidden=detail||editing;back.hidden=!detail&&!editing;};
    compose.addEventListener('toggle',()=>{updateReview();layout();});
    back.onclick=()=>{compose.open=false;el('workspace-detail').hidden=true;layout();};
    el('workspace-new').addEventListener('click',()=>{flow.reset();updateReview();layout();});
    el('saved-drafts').addEventListener('change',()=>{flow.reset();updateReview();layout();});
    document.addEventListener('qf:job',()=>{updateReview();layout();});
    document.addEventListener('qf:context',()=>{layout();updateReview();});
    new MutationObserver(layout).observe(el('workspace-detail'),{attributes:true,attributeFilter:['hidden']});
  }
  window.qfWorkspace={api,all,submit,recover,loadJob,refreshLists,get context(){return context;},get job(){return job;}};
})();
