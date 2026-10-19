(() => {
  'use strict';
  const el=id=>document.getElementById(id),qf=window.qfWorkspace;
  let profile=null,rules=null,upload=null,epoch=0,previewVersion=null,contextKey='';
  const selected=id=>Array.from(el(id).selectedOptions,o=>o.value);
  const select=(id,values)=>Array.from(el(id).options).forEach(o=>{o.selected=values.includes(o.value);});
  const status=(id,message)=>{el(id).textContent=message;};
  function button(label,action) {const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){status('verification-status',e.message);}finally{b.disabled=false;}};return b;}
  function bind(id,statusId,action) {el(id).onclick=async()=>{el(id).disabled=true;try{await action();}catch(e){status(statusId,e.message);}finally{el(id).disabled=['rfq-publish','rfq-refine','rfq-separate'].includes(id)&&qf.job?.stage==='Requesting for quotes';}};}
  async function loadOrganisation(id) {
    const generation=epoch,result=await qf.api('contractors/'+id);if(generation!==epoch)return;
    if(profile?.organisation.id!==id){upload=null;el('credential-file').value='';status('credential-upload-status','');}
    profile=result;el('verification-detail').hidden=false;el('verification-facts').textContent=JSON.stringify({state:result.profile?.state??'Draft',eligibility:result.eligibility,credentials:result.credentials,decisions:result.decisions,restrictions:result.restrictions},null,2);
    const companyButton=el('verification-list').querySelector('[data-organisation="'+id+'"]');if(companyButton)companyButton.textContent=result.organisation.name+' · '+(result.profile?.state??'Draft');
    el('restriction-current').replaceChildren(...result.restrictions.filter(r=>r.active&&r.source==='admin').map(r=>new Option(r.reason,r.id)));
    el('verification-name').value=result.organisation.name;el('verification-contact').value=result.profile?.contact??result.application?.contact??'';
    el('verification-description').value=result.profile?.description??'';select('verification-categories',result.profile?.categories??result.application?.trades??[]);
    el('credential-renew').replaceChildren(new Option('New credential',''),...result.credentials.map(c=>new Option(c.name+' · '+c.state,c.id)));
    el('verification-target').replaceChildren(new Option('Company profile',''),...result.credentials.map(c=>new Option(c.name+' · '+c.state,c.id)));
    select('verification-approved',result.profile?.approved_categories??[]);el('verification-admin').hidden=qf.context?.context?.role!=='admin';
  }
  async function refreshVerification() {
    const generation=epoch,role=qf.context?.context?.role;
    if(!['admin','contractor'].includes(role))return;
    const data=await qf.api('verification/rules'),companies=await qf.api('contractors');if(generation!==epoch)return;
    rules=data;el('credential-type').replaceChildren(...data.types.map(t=>new Option(t.name+' · '+t.holder_kind,t.id)));
    showTrade();
    el('verification-list').replaceChildren(...companies.map(c=>{const b=button(c.name+' · '+(c.state??'Draft'),()=>loadOrganisation(c.id));b.dataset.organisation=c.id;return b;}));
    if(role==='contractor'&&companies[0])await loadOrganisation(companies[0].id);
  }
  function showTrade() {
    if(!rules)return;const category=el('trade-category').value,rule=rules.rules.find(r=>r.category===category);
    el('trade-required').replaceChildren(...rules.types.filter(t=>t.categories.includes(category)).map(t=>new Option(t.name+' · '+t.holder_kind,t.id)));
    select('trade-required',rule?.required_type_ids??[]);status('trade-current',(rule?.configured?'Configured':'Not configured')+' · Version '+(rule?.version??1));
  }
  el('trade-category').onchange=showTrade;
  el('credential-expiry').type='text';el('credential-expiry').placeholder='YYYY-MM-DD or date/time with timezone';
  el('credential-file').addEventListener('change',()=>{upload=null;status('credential-upload-status','Selected file changed. Upload and verify it before submitting.');});
  bind('trade-configure','verification-status',async()=>{
    const category=el('trade-category').value,rule=rules.rules.find(r=>r.category===category);
    await qf.submit('admin/trades/'+category+'/configure',{requiredTypeIds:selected('trade-required'),reason:el('trade-reason').value},rule.version);
    el('trade-reason').value='';await refreshVerification();status('verification-status','Trade requirement matrix recorded with named Admin and reason.');
  });
  async function refreshOpportunities() {
    const generation=epoch,result=await qf.api('opportunities');if(generation!==epoch)return;
    el('opportunities-list').replaceChildren(...result.map(r=>{const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=r.description;p.textContent=r.location+' · '+r.categories.join(', ')+' · Revision '+r.revision;
      article.dataset.opportunity=r.jobId;article.append(h,p);for(const id of r.evidenceIds){const a=document.createElement('a');a.href='/api/v1/files/'+id;a.textContent='View reviewed photo';article.append(a);}return article;}));
    document.dispatchEvent(new CustomEvent('qf:opportunities',{detail:result}));
    if(!result.length)el('opportunities-list').textContent='No currently eligible opportunities. Review your verification and trade eligibility.';
  }
  bind('verification-save','verification-status',async()=>{
    const result=await qf.submit('contractors/'+profile.organisation.id+'/profile',{name:el('verification-name').value,contact:el('verification-contact').value,categories:selected('verification-categories'),description:el('verification-description').value},profile.organisation.version);
    await loadOrganisation(result.organisationId);status('verification-status','Saved. Submit the profile for Admin review.');
  });
  bind('verification-submit','verification-status',async()=>{await qf.submit('contractors/'+profile.organisation.id+'/submit',{},profile.organisation.version);await loadOrganisation(profile.organisation.id);await qf.refreshLists();status('verification-status','Submitted for offline Admin verification.');});
  bind('credential-type-create','verification-status',async()=>{await qf.submit('admin/credential-types',{name:el('credential-type-name').value,holderKind:el('credential-type-holder').value,categories:selected('credential-type-trades')},0);el('credential-type-name').value='';await refreshVerification();status('verification-status','Credential type recorded. Trade prerequisites remain a separate configuration.');});
  bind('credential-upload','verification-status',async()=>{
    const generation=epoch,orgId=profile.organisation.id,file=el('credential-file').files[0];
    if(!file||file.size>10485760||!['image/png','image/jpeg','application/pdf'].includes(file.type))throw new Error('Choose PNG, JPEG or PDF up to 10 MiB.');
    const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(generation!==epoch)return;
    // Retain this upload identity on uncertain responses; never submit the credential form automatically.
    if(!upload||upload.checksum!==checksum||upload.orgId!==orgId)upload={orgId,checksum};
    if(!upload.id)upload.id=(await qf.submit('contractors/'+orgId+'/uploads',{mediaType:file.type,byteSize:file.size,checksum},profile.organisation.version)).uploadId;
    let server=await qf.api('uploads/'+upload.id);
    if(server.state==='transferring') {
      await qf.api('uploads/'+upload.id+'/renew',{});
      for(let offset=0;offset<bytes.byteLength;offset+=262144) {
        if(generation!==epoch)return;if(server.chunks.some(c=>c.byte_offset===offset))continue;
        let binary='';for(const byte of new Uint8Array(bytes.slice(offset,offset+262144)))binary+=String.fromCharCode(byte);
        await qf.api('uploads/'+upload.id+'/chunks',{offset,bytes:btoa(binary)});
      }
      await qf.submit('uploads/'+upload.id+'/finalize',{},0);server=await qf.api('uploads/'+upload.id);
    }
    if(generation!==epoch)return;
    upload.fileId=server.objects.find(o=>o.variant==='original')?.id;
    status('credential-upload-status',server.state==='ready'?'Verified private evidence ready. Submit the credential separately.':'Processing: '+server.state+'. Press upload again to check readiness.');
  });
  bind('credential-submit','verification-status',async()=>{
    if(el('credential-file').files.length&&!upload?.fileId)throw new Error('Wait for your private file to become ready.');
    const credentialId=el('credential-renew').value,c=profile.credentials.find(c=>c.id===credentialId);
    await qf.submit('contractors/'+profile.organisation.id+'/credentials',{...(credentialId?{credentialId}:{}),typeId:el('credential-type').value,holderName:el('credential-holder').value,reference:el('credential-reference').value,...(el('credential-expiry').value?{expiry:el('credential-expiry').value}:{}),...(upload?.fileId?{fileId:upload.fileId}:{})},c?.version??0);
    upload=null;el('credential-file').value='';status('credential-upload-status','');await loadOrganisation(profile.organisation.id);status('verification-status','Credential submitted. Eligibility still requires Admin verification.');
  });
  el('credential-renew').onchange=()=>{upload=null;el('credential-file').value='';status('credential-upload-status','');const c=profile?.credentials.find(c=>c.id===el('credential-renew').value);if(c){el('credential-type').value=c.type_id;el('credential-holder').value=c.holder_name;el('credential-reference').value=c.reference;el('credential-expiry').value=c.expiry_value??'';}else{for(const id of ['credential-holder','credential-reference','credential-expiry'])el(id).value='';}};
  bind('verification-decide','verification-status',async()=>{
    const credentialId=el('verification-target').value,c=profile.credentials.find(c=>c.id===credentialId);
    await qf.submit('admin/contractors/'+profile.organisation.id+'/decision',{...(credentialId?{credentialId}:{}),outcome:el('verification-outcome').value,categories:credentialId?[]:selected('verification-approved'),reason:el('verification-reason').value,internalNotes:el('verification-notes').value},c?.version??profile.profile?.version??profile.organisation.version);
    el('verification-reason').value='';el('verification-notes').value='';await loadOrganisation(profile.organisation.id);await qf.refreshLists();status('verification-status','Recorded with named Admin and immutable decision history.');
  });
  bind('restriction-create','verification-status',async()=>{await qf.submit('admin/contractors/'+profile.organisation.id+'/restrictions',{categories:selected('restriction-categories'),reason:el('restriction-reason').value},0);el('restriction-reason').value='';await loadOrganisation(profile.organisation.id);});
  bind('restriction-lift','verification-status',async()=>{const id=el('restriction-current').value,r=profile.restrictions.find(r=>r.id===id);if(!r)throw new Error('Choose an active Admin restriction.');await qf.submit('admin/contractors/'+profile.organisation.id+'/restrictions/'+id+'/lift',{reason:el('restriction-lift-reason').value},r.version);el('restriction-lift-reason').value='';await loadOrganisation(profile.organisation.id);});
  const intakeBody=()=>({accessEquipmentRequired:el('rfq-access-equipment').checked,categories:selected('rfq-categories'),urgency:el('rfq-urgency').value,noPhotoReason:el('rfq-no-photo').value,grouping:el('rfq-grouping').value,primaryPriority:el('rfq-primary').value,...(el('rfq-secondary').value?{secondaryPriority:el('rfq-secondary').value}:{}),publicDescription:el('rfq-description').value,publicLocation:el('rfq-location').value,evidenceIds:selected('rfq-evidence')});
  function clearPreview(){previewVersion=null;el('rfq-preview-content').textContent='';el('rfq-preview-images').replaceChildren();el('rfq-facts').checked=false;el('rfq-privacy').checked=false;}
  const rfqDraftKey=()=> 'quotefix:rfq-draft:'+qf.context.user.id+':'+qf.context.context.id+':'+qf.job.id;
  el('rfq-panel').append(button('Save RFQ draft on this device',()=>{localStorage.setItem(rfqDraftKey(),JSON.stringify(intakeBody()));status('rfq-status','RFQ draft saved on this device. Server scope and publication are unchanged.');}),button('Restore device RFQ draft',()=>{
    const saved=JSON.parse(localStorage.getItem(rfqDraftKey())||'null');if(!saved)throw new Error('No device RFQ draft for this account and job.');
    select('rfq-categories',saved.categories);select('rfq-evidence',saved.evidenceIds);el('rfq-access-equipment').checked=saved.accessEquipmentRequired??false;
    for(const [id,key] of [['rfq-urgency','urgency'],['rfq-no-photo','noPhotoReason'],['rfq-grouping','grouping'],['rfq-primary','primaryPriority'],['rfq-secondary','secondaryPriority'],['rfq-description','publicDescription'],['rfq-location','publicLocation']])el(id).value=saved[key]??'';
    clearPreview();status('rfq-status','Device RFQ draft restored. Review current server scope, save explicitly, then preview before publishing.');
  }));
  for(const id of ['rfq-access-equipment','rfq-categories','rfq-urgency','rfq-grouping','rfq-primary','rfq-secondary','rfq-no-photo','rfq-description','rfq-location','rfq-evidence'])el(id).addEventListener('input',clearPreview);
  async function loadRfq(result) {
    const generation=epoch,id=result.job.id,data=await qf.api('workspaces/'+id+'/rfq');if(generation!==epoch||qf.job?.id!==id)return;
    const intake=data.intake;el('rfq-access-equipment').checked=intake?.accessEquipmentRequired??false;select('rfq-categories',intake?.categories??[]);el('rfq-urgency').value=intake?.urgency??'ordinary';el('rfq-grouping').value=intake?.grouping??'combined';el('rfq-primary').value=intake?.primaryPriority??'none';el('rfq-secondary').value=intake?.secondaryPriority??'';
    el('rfq-description').value=intake?.publicDescription??'';el('rfq-location').value=intake?.publicLocation??'';el('rfq-no-photo').value=intake?.noPhotoReason??'';
    el('rfq-evidence').replaceChildren(...result.attachments.filter(f=>f.variant==='sanitized'&&f.media_type==='image/png').map(f=>new Option('Reviewed sanitized photo '+f.id.slice(0,8),f.id)));select('rfq-evidence',intake?.evidenceIds??[]);clearPreview();
    el('rfq-publish').disabled=!!data.published;el('rfq-refine').disabled=!!data.published;el('rfq-separate').disabled=!!data.published;
    el('rfq-revision').hidden=!data.published;
    status('rfq-status',data.published?'Published revision '+data.published.revision+'. Saved draft changes do not alter this published snapshot.':'Unpublished draft. Publication needs configured trade rules and explicit accuracy/privacy confirmation.');
    el('rfq-suggestions').replaceChildren(...data.ai.map(a=>{const p=document.createElement('pre');p.textContent=JSON.stringify({model:a.model,state:a.state,output:a.output},null,2);if(a.state==='pending_review'&&!a.output.pending)p.append(button('Accept suggestion into editable draft',async()=>{await qf.submit('workspaces/'+id+'/rfq/accept-refinement',{refinementId:a.id},qf.job.version);await qf.loadJob(id,false);}));return p;}));
  }
  bind('rfq-save','rfq-status',async()=>{await qf.submit('workspaces/'+qf.job.id+'/rfq/intake',intakeBody(),qf.job.version);await qf.loadJob(qf.job.id,false);});
  bind('rfq-refine','rfq-status',async()=>{await qf.submit('workspaces/'+qf.job.id+'/rfq/refine',{},qf.job.version);await qf.loadJob(qf.job.id,false);});
  bind('rfq-refresh','rfq-status',async()=>{await qf.loadJob(qf.job.id,false);});
  bind('rfq-preview','rfq-status',async()=>{
    const data=await qf.api('workspaces/'+qf.job.id+'/rfq/preview');
    if(!window.qfCommands.sameInput(data.contractorView,intakeBody()))throw new Error('Save your current draft fields before previewing.');
    previewVersion=data.version;el('rfq-preview-content').textContent=JSON.stringify(data.contractorView,null,2);status('rfq-status',data.reviewNotice);
    el('rfq-preview-images').replaceChildren(...data.contractorView.evidenceIds.map(id=>{const image=document.createElement('img');image.src='/api/v1/files/'+id;image.alt='Contractor-visible reviewed evidence';image.style.maxWidth='100%';return image;}));
  });
  bind('rfq-revise','rfq-status',async()=>{
    if(previewVersion!==qf.job.version)throw new Error('Preview the exact saved revision before publication.');
    const result=await qf.submit('workspaces/'+qf.job.id+'/rfq/revise',{classification:el('rfq-classification').value,changeKinds:selected('rfq-change-kinds'),reason:el('rfq-revision-reason').value,privacyConfirmed:el('rfq-privacy').checked,factsConfirmed:el('rfq-facts').checked},qf.job.version);
    await qf.loadJob(qf.job.id,false);await qf.refreshLists();status('rfq-status','Revision '+result.revision+' published. '+(result.requiresReconfirmation?'Old quotes require reconfirmation.':'Current scope validity retained.'));
  });
  bind('rfq-publish','rfq-status',async()=>{
    if(previewVersion!==qf.job.version)throw new Error('Preview the exact saved version before publication.');
    await qf.submit('workspaces/'+qf.job.id+'/rfq/publish',{privacyConfirmed:el('rfq-privacy').checked,factsConfirmed:el('rfq-facts').checked},qf.job.version);await qf.loadJob(qf.job.id,false);await qf.refreshLists();
  });
  bind('rfq-separate','rfq-status',async()=>{
    const repairs=el('rfq-repairs').value.split('\n').filter(s=>s.trim()).map(line=>{const parts=line.split('|').map(s=>s.trim());if(parts.length!==3)throw new Error('Use title | observations | affected location on each line.');return {title:parts[0],observations:parts[1],affectedLocation:parts[2]};});
    const result=await qf.submit('workspaces/'+qf.job.id+'/rfq/separate',{repairs},qf.job.version);await qf.loadJob(qf.job.id,false);await qf.refreshLists();status('rfq-status',result.message);
  });
  bind('opportunities-refresh','verification-status',refreshOpportunities);
  document.addEventListener('qf:job',e=>{el('rfq-panel').hidden=!qf.context?.capabilities['rfq.manage'];if(!el('rfq-panel').hidden)loadRfq(e.detail).catch(error=>status('rfq-status',error.message));});
  document.addEventListener('qf:context',async e=>{
    const key=e.detail?.context?[e.detail.user.id,e.detail.context.id,e.detail.accessVersion].join(':'):'';
    if(key===contextKey)return;contextKey=key;
    epoch++;profile=null;rules=null;upload=null;clearPreview();
    for(const id of ['verification-list','verification-facts','opportunities-list','rfq-suggestions'])el(id).replaceChildren();
    for(const id of ['verification-name','verification-contact','verification-description','credential-holder','credential-reference','credential-expiry','credential-file','verification-reason','verification-notes','rfq-description','rfq-location','rfq-no-photo','rfq-repairs','rfq-revision-reason','restriction-reason','restriction-lift-reason','trade-reason','credential-type-name'])el(id).value='';
    for(const id of ['verification-categories','verification-approved','credential-type-trades','rfq-categories','rfq-evidence'])select(id,[]);
    for(const id of ['credential-type','credential-renew','verification-target'])el(id).replaceChildren();
    const role=e.detail?.context?.role;el('verification-shell').hidden=!['admin','contractor'].includes(role);el('verification-detail').hidden=true;el('credential-types-panel').hidden=role!=='admin';el('opportunities-shell').hidden=role!=='contractor';status('verification-status','');status('credential-upload-status','');
    try{if(!el('verification-shell').hidden)await refreshVerification();if(role==='contractor')await refreshOpportunities();}catch(error){status('verification-status',error.message);}
  });
})();
