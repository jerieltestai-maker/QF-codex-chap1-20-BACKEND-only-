(() => {
  'use strict';
  const el=id=>document.getElementById(id),qf=window.qfWorkspace;
  let profile=null,rules=null,upload=null,epoch=0,previewVersion=null,contextKey='',organisationLoad=0,rfqLoad=0,rfqJobId=null,rfqEquipmentDirty=false,companyFlow=null,credentialFlow=null,verificationFlow=null;
  const selected=id=>Array.from(el(id).selectedOptions,o=>o.value);
  const select=(id,values)=>Array.from(el(id).options).forEach(o=>{o.selected=values.includes(o.value);});
  const status=(id,message)=>{el(id).textContent=message;};
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const words=value=>String(value??'Not recorded').replaceAll('_',' ');
  const date=value=>value?new Date(value).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT':'Not recorded';
  const opportunityStatus=node('p');opportunityStatus.id='opportunities-status';opportunityStatus.setAttribute('role','status');opportunityStatus.setAttribute('aria-live','polite');el('opportunities-refresh').before(opportunityStatus);
  function facts(rows) {const list=node('dl');list.className='fact-list';for(const [label,value] of rows)list.append(node('dt',label),node('dd',value===true?'Yes':value===false?'No':value??'Not recorded'));return list;}
  function reviewedAction(id,label) {const wrapper=node('label'),input=node('input');wrapper.className='confirmation';input.type='checkbox';wrapper.append(input,document.createTextNode(label));el(id).before(wrapper);return input;}
  function button(label,action,statusId='verification-status') {const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{if(b.disabled)return;b.disabled=true;status(statusId,'Working…');try{await action();}catch(e){status(statusId,e.message);}finally{b.disabled=false;}};return b;}
  function bind(id,statusId,action) {el(id).onclick=async()=>{if(el(id).disabled)return;el(id).disabled=true;el(id).setAttribute('aria-busy','true');status(statusId,'Working…');try{await action();}catch(e){status(statusId,e.message);}finally{el(id).setAttribute('aria-busy','false');el(id).disabled=(['rfq-publish','rfq-refine','rfq-separate'].includes(id)&&qf.job?.stage==='Requesting for quotes')||(id==='verification-submit'&&!['draft','needs_evidence','rejected'].includes(profile?.profile?.state))||(id==='credential-submit'&&!rules?.types.length);}};}
  function requireFields(fields) {for(const [id,label] of fields)if(!el(id).value.trim()){window.qfFlow?.reveal(el(id));el(id).focus();throw new Error(label+' is required.');}}
  const verificationConfirm=reviewedAction('verification-decide','I confirm this verification decision for the displayed company or credential and reviewed its current evidence.');
  verificationConfirm.setAttribute('aria-describedby','verification-decision-company');
  el('verification-decide').setAttribute('aria-describedby','verification-decision-company');
  function showDecisionCompany() {
    el('verification-decision-company').textContent=profile?'Decision for '+profile.organisation.name+' · '+(el('verification-target').selectedOptions[0]?.textContent||'Company profile'):'';
  }
  el('verification-target').addEventListener('change',showDecisionCompany);
  const tradeConfirm=reviewedAction('trade-configure','I confirm these trade requirements, including an empty required list if selected.');
  const restrictConfirm=reviewedAction('restriction-create','I confirm this specific restriction and its affected trades.');
  const liftConfirm=reviewedAction('restriction-lift','I confirm lifting this specific Admin restriction only.');
  for(const [ids,input] of [[['verification-target','verification-outcome','verification-approved','verification-reason','verification-notes'],verificationConfirm],[['trade-required','trade-reason'],tradeConfirm],[['restriction-categories','restriction-reason'],restrictConfirm],[['restriction-current','restriction-lift-reason'],liftConfirm]])for(const id of ids)el(id).addEventListener('input',()=>{input.checked=false;});
  function renderVerification(result) {
    const container=el('verification-facts');container.replaceChildren();
    el('verification-company').textContent=result.organisation.name;
    const eligibility=node('p',result.eligibility.eligible?'Eligible for approved trades: '+result.eligibility.categories.join(', '):'Not currently eligible to quote.');eligibility.className='state-note';container.append(eligibility,facts([['Profile state',words(result.profile?.state??'Draft')],['Requested trades',(result.profile?.categories??result.application?.trades??[]).join(', ')||'Not supplied'],['Approved trades',(result.profile?.approved_categories??[]).join(', ')||'None']]));
    container.append(facts([['Company description',result.profile?.description||'Not supplied'],['Private contact details',result.profile?.contact??result.application?.contact??'Not supplied']]));
    if(result.eligibility.reasons.length){const list=node('ul');for(const reason of result.eligibility.reasons)list.append(node('li',reason));container.append(list);}
    const credentials=node('details');credentials.append(node('summary','Credential evidence and verification ('+result.credentials.length+')'));
    if(!result.credentials.length)credentials.append(node('p','No credentials submitted. Admin configures the evidence required for each trade.'));
    for(const c of result.credentials){const card=node('article');card.className='data-row';card.append(node('h4',c.name),facts([['Holder',c.holder_name],['Review state',words(c.state)],['Verified submission',c.verified?'Yes'+(c.expired?' — expired':''):'No'],['Expiry supplied',c.expiry_value||'No expiry supplied'],['Evidence reference',c.reference]]));if(c.file_id){const link=node('a','Open private credential evidence');link.href='/api/v1/files/'+encodeURIComponent(c.file_id);card.append(link);}credentials.append(card);}container.append(credentials);
    const history=node('details');history.append(node('summary','Verification decision history ('+result.decisions.length+')'));
    for(const d of result.decisions){const card=node('article');card.className='data-row';card.append(facts([['Decision',words(d.outcome)],['Applies to',d.credential_id?'Credential evidence':'Company profile'],['Reason',d.reason||'No reason recorded'],['Recorded',date(d.recorded_at)]]));if(d.internal_notes)card.append(node('p','Admin-only notes: '+d.internal_notes));history.append(card);}if(!result.decisions.length)history.append(node('p','No verification decision has been recorded.'));container.append(history);
    const restrictions=result.restrictions.filter(r=>r.active);if(restrictions.length){const list=node('ul');for(const r of restrictions)list.append(node('li',words(r.source)+' restriction: '+r.reason+' · '+(r.categories.length?r.categories.join(', '):'All trades')));container.append(node('h4','Active restrictions'),list);}
  }
  async function loadOrganisation(id) {
    const generation=epoch,loading=++organisationLoad,unsent=profile?.organisation.id===id?(window.qfUI?.captureInputs?.(el('verification-detail'))??[]):[];status('verification-status','Loading company verification…');const result=await qf.api('contractors/'+id);if(generation!==epoch||loading!==organisationLoad)return;
    if(profile?.organisation.id!==id){upload=null;el('credential-file').value='';status('credential-upload-status','');el('verification-editor').open=qf.context?.context?.role==='contractor';el('verification-reason').value='';el('verification-notes').value='';companyFlow?.reset();credentialFlow?.reset();verificationFlow?.reset();}
    profile=result;el('verification-detail').hidden=false;renderVerification(result);
    for(const input of [verificationConfirm,restrictConfirm,liftConfirm])input.checked=false;
    const companyButton=el('verification-list').querySelector('[data-organisation="'+id+'"]');if(companyButton)companyButton.textContent=result.organisation.name+' · '+(result.profile?.state??'Draft');
    el('restriction-current').replaceChildren(...result.restrictions.filter(r=>r.active&&r.source==='admin').map(r=>new Option(r.reason,r.id)));
    el('verification-name').value=result.organisation.name;el('verification-contact').value=result.profile?.contact??result.application?.contact??'';
    el('verification-description').value=result.profile?.description??'';select('verification-categories',result.profile?.categories??result.application?.trades??[]);
    el('credential-renew').replaceChildren(new Option('New credential',''),...result.credentials.map(c=>new Option(c.name+' · '+c.state,c.id)));
    el('verification-target').replaceChildren(new Option('Company profile',''),...result.credentials.map(c=>new Option(c.name+' · '+c.state,c.id)));
    select('verification-approved',result.profile?.approved_categories??[]);el('verification-admin').hidden=qf.context?.context?.role!=='admin';
    el('verification-submit').disabled=!['draft','needs_evidence','rejected'].includes(result.profile?.state);
    el('credential-submit').disabled=!rules?.types.length;
    status('verification-status','Company profile and eligibility refreshed.');
    if(unsent.length){window.qfUI?.restoreInputs?.(el('verification-detail'),unsent);status('verification-status','Verification refreshed. Your unsent text is preserved. Review current evidence and confirm the decision again.');}
    showDecisionCompany();
  }
  async function refreshVerification() {
    const generation=epoch,role=qf.context?.context?.role;
    if(!['admin','contractor'].includes(role))return;
    const data=await qf.api('verification/rules'),companies=await (qf.all||qf.api)('contractors');if(generation!==epoch)return;
    rules=data;el('credential-type').replaceChildren(...data.types.map(t=>new Option(t.name+' · '+t.holder_kind,t.id)));
    showTrade();
    el('verification-list').replaceChildren(...companies.map(c=>{const b=button(c.name+' · '+(c.state??'Draft'),()=>loadOrganisation(c.id));b.dataset.organisation=c.id;return b;}));
    if(!companies.length)el('verification-list').append(node('p','No contractor applications are awaiting review.'));
    if(role==='contractor'&&companies[0])await loadOrganisation(companies[0].id);
    else if(profile&&companies.some(company=>company.id===profile.organisation.id))await loadOrganisation(profile.organisation.id);
  }
  function showTrade() {
    if(!rules)return;const category=el('trade-category').value,rule=rules.rules.find(r=>r.category===category);
    el('trade-required').replaceChildren(...rules.types.filter(t=>t.categories.includes(category)).map(t=>new Option(t.name+' · '+t.holder_kind,t.id)));
    select('trade-required',rule?.required_type_ids??[]);tradeConfirm.checked=false;status('trade-current',(rule?.configured?'Configured':'Not configured')+' · Version '+(rule?.version??1));
  }
  el('trade-category').onchange=showTrade;
  el('credential-expiry').type='text';el('credential-expiry').placeholder='YYYY-MM-DD or date/time with timezone';
  el('credential-file').addEventListener('change',()=>{upload=null;status('credential-upload-status','Selected file changed. Upload and verify it before submitting.');});
  bind('trade-configure','verification-status',async()=>{
    const category=el('trade-category').value,rule=rules.rules.find(r=>r.category===category);
    if(!tradeConfirm.checked)throw new Error('Review and confirm the trade requirements.');requireFields([['trade-reason','Configuration reason']]);
    await qf.submit('admin/trades/'+category+'/configure',{requiredTypeIds:selected('trade-required'),reason:el('trade-reason').value},rule.version);
    el('trade-reason').value='';await refreshVerification();status('verification-status','Trade requirements saved with your name and reason.');
  });
  async function refreshOpportunities() {
    const generation=epoch,result=await (qf.all||qf.api)('opportunities');if(generation!==epoch)return;
    el('opportunities-list').replaceChildren(...result.map(r=>{const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');article.className='panel opportunity-card';h.textContent=r.description;p.textContent=r.location+' · '+r.categories.join(', ')+' · Revision '+r.revision;
      article.dataset.opportunity=r.jobId;article.append(h,p);for(const id of r.evidenceIds){const a=document.createElement('a');a.href='/api/v1/files/'+id;a.textContent='View reviewed photo';article.append(a);}return article;}));
    document.dispatchEvent(new CustomEvent('qf:opportunities',{detail:result}));
    if(!result.length){
      const review=node('button','Review contractor verification');review.type='button';review.onclick=()=>{if(window.qfUI?.navigate)window.qfUI.navigate('verification');else document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen:'verification'}}));};
      el('opportunities-list').replaceChildren(node('p','No eligible RFQs available. Review your verification and approved trades.'),review);
    }
  }
  bind('verification-save','verification-status',async()=>{
    requireFields([['verification-name','Organisation name'],['verification-contact','Private contact details']]);if(!selected('verification-categories').length)throw new Error('Choose at least one requested trade.');
    const result=await qf.submit('contractors/'+profile.organisation.id+'/profile',{name:el('verification-name').value,contact:el('verification-contact').value,categories:selected('verification-categories'),description:el('verification-description').value},profile.organisation.version);
    for(const id of ['verification-name','verification-contact','verification-categories','verification-description'])delete el(id).dataset.qfDirty;
    await loadOrganisation(result.organisationId);status('verification-status','Saved. Submit the profile for Admin review.');
  });
  bind('verification-submit','verification-status',async()=>{await qf.submit('contractors/'+profile.organisation.id+'/submit',{},profile.organisation.version);await loadOrganisation(profile.organisation.id);await qf.refreshLists();status('verification-status','Submitted for Admin verification.');});
  bind('credential-type-create','verification-status',async()=>{await qf.submit('admin/credential-types',{name:el('credential-type-name').value,holderKind:el('credential-type-holder').value,categories:selected('credential-type-trades')},0);el('credential-type-name').value='';await refreshVerification();status('verification-status','Credential type recorded. Trade prerequisites remain a separate configuration.');});
  bind('credential-upload','verification-status',async()=>{
    const generation=epoch,orgId=profile.organisation.id,file=el('credential-file').files[0];
    if(!file||file.size>10485760||!['image/png','image/jpeg','application/pdf'].includes(file.type))throw new Error('Choose PNG, JPEG or PDF up to 10 MiB.');
    const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(generation!==epoch)return;
    // Retain this upload identity on uncertain responses; never submit the credential form automatically.
    if(el('credential-file').files[0]!==file)return;
    if(!upload||upload.checksum!==checksum||upload.orgId!==orgId)upload={orgId,checksum};const transfer=upload;
    if(!transfer.id)transfer.id=(await qf.submit('contractors/'+orgId+'/uploads',{mediaType:file.type,byteSize:file.size,checksum},profile.organisation.version)).uploadId;
    if(generation!==epoch||upload!==transfer)return;let server=await qf.api('uploads/'+transfer.id);
    if(server.state==='transferring') {
      await qf.api('uploads/'+transfer.id+'/renew',{});
      for(let offset=0;offset<bytes.byteLength;offset+=262144) {
        if(generation!==epoch||upload!==transfer)return;if(server.chunks.some(c=>c.byte_offset===offset))continue;
        let binary='';for(const byte of new Uint8Array(bytes.slice(offset,offset+262144)))binary+=String.fromCharCode(byte);
        await qf.api('uploads/'+transfer.id+'/chunks',{offset,bytes:btoa(binary)});
      }
      if(generation!==epoch||upload!==transfer)return;await qf.submit('uploads/'+transfer.id+'/finalize',{},0);server=await qf.api('uploads/'+transfer.id);
    }
    if(generation!==epoch||upload!==transfer)return;
    transfer.fileId=server.state==='ready'?server.objects.find(o=>o.variant==='original')?.id:undefined;
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
    if(!verificationConfirm.checked)throw new Error('Review and confirm the exact verification decision.');
    requireFields([['verification-reason','Verification reason or evidence request']]);
    const credentialId=el('verification-target').value,c=profile.credentials.find(c=>c.id===credentialId);
    if(!credentialId&&el('verification-outcome').value==='approved'&&!selected('verification-approved').length)throw new Error('Choose the company trade categories being approved.');
    await qf.submit('admin/contractors/'+profile.organisation.id+'/decision',{...(credentialId?{credentialId}:{}),outcome:el('verification-outcome').value,categories:credentialId?[]:selected('verification-approved'),reason:el('verification-reason').value,internalNotes:el('verification-notes').value},c?.version??profile.profile?.version??profile.organisation.version);
    el('verification-reason').value='';el('verification-notes').value='';await loadOrganisation(profile.organisation.id);await qf.refreshLists();status('verification-status','Verification decision recorded with your name in the decision history.');
  });
  bind('restriction-create','verification-status',async()=>{if(!restrictConfirm.checked)throw new Error('Confirm the specific restriction.');requireFields([['restriction-reason','Restriction reason']]);await qf.submit('admin/contractors/'+profile.organisation.id+'/restrictions',{categories:selected('restriction-categories'),reason:el('restriction-reason').value},0);el('restriction-reason').value='';await loadOrganisation(profile.organisation.id);});
  bind('restriction-lift','verification-status',async()=>{const id=el('restriction-current').value,r=profile.restrictions.find(r=>r.id===id);if(!r)throw new Error('Choose an active Admin restriction.');if(!liftConfirm.checked)throw new Error('Confirm lifting this specific restriction.');requireFields([['restriction-lift-reason','Reason for lifting']]);await qf.submit('admin/contractors/'+profile.organisation.id+'/restrictions/'+id+'/lift',{reason:el('restriction-lift-reason').value},r.version);el('restriction-lift-reason').value='';await loadOrganisation(profile.organisation.id);});
  const intakeBody=()=>({accessEquipmentRequired:el('rfq-access-equipment').checked,categories:selected('rfq-categories'),urgency:el('rfq-urgency').value,noPhotoReason:el('rfq-no-photo').value,grouping:el('rfq-grouping').value,primaryPriority:el('rfq-primary').value,...(el('rfq-secondary').value?{secondaryPriority:el('rfq-secondary').value}:{}),publicDescription:el('rfq-description').value,publicLocation:el('rfq-location').value,evidenceIds:selected('rfq-evidence')});
  function clearPreview(){previewVersion=null;el('rfq-preview-content').textContent='';el('rfq-preview-images').replaceChildren();el('rfq-facts').checked=false;el('rfq-privacy').checked=false;}
  const rfqDraftKey=()=> 'quotefix:rfq-draft:'+qf.context.user.id+':'+qf.context.context.id+':'+qf.job.id;
  el('rfq-panel').append(button('Save RFQ draft on this device',()=>{localStorage.setItem(rfqDraftKey(),JSON.stringify(intakeBody()));status('rfq-status','RFQ draft saved on this device. The saved server draft and published RFQ are unchanged.');},'rfq-status'),button('Restore device RFQ draft',()=>{
    const saved=JSON.parse(localStorage.getItem(rfqDraftKey())||'null');if(!saved)throw new Error('No device RFQ draft for this account and job.');
    select('rfq-categories',saved.categories);select('rfq-evidence',saved.evidenceIds);el('rfq-access-equipment').checked=saved.accessEquipmentRequired??false;
    for(const [id,key] of [['rfq-urgency','urgency'],['rfq-no-photo','noPhotoReason'],['rfq-grouping','grouping'],['rfq-primary','primaryPriority'],['rfq-secondary','secondaryPriority'],['rfq-description','publicDescription'],['rfq-location','publicLocation']])el(id).value=saved[key]??'';
    for(const id of ['rfq-categories','rfq-evidence','rfq-urgency','rfq-no-photo','rfq-grouping','rfq-primary','rfq-secondary','rfq-description','rfq-location'])el(id).dataset.qfDirty='true';rfqEquipmentDirty=true;
    el('rfq-no-photo').required=selected('rfq-evidence').length===0;
    clearPreview();status('rfq-status','Device draft restored. Review the current scope, save the draft, then preview before publishing.');
  },'rfq-status'));
  for(const id of ['rfq-access-equipment','rfq-categories','rfq-urgency','rfq-grouping','rfq-primary','rfq-secondary','rfq-no-photo','rfq-description','rfq-location','rfq-evidence'])el(id).addEventListener('input',clearPreview);
  el('rfq-access-equipment').addEventListener('input',()=>{rfqEquipmentDirty=true;});
  async function loadRfq(result) {
    const generation=epoch,id=result.job.id,loading=++rfqLoad,unsent=rfqJobId===id?(window.qfUI?.captureInputs?.(el('rfq-panel'))??[]):[],equipment=rfqJobId===id&&rfqEquipmentDirty?el('rfq-access-equipment').checked:null;rfqJobId=id;const data=await qf.api('workspaces/'+id+'/rfq');if(generation!==epoch||loading!==rfqLoad||qf.job?.id!==id)return;
    const intake=data.intake;el('rfq-access-equipment').checked=intake?.accessEquipmentRequired??false;select('rfq-categories',intake?.categories??[]);el('rfq-urgency').value=intake?.urgency??'ordinary';el('rfq-grouping').value=intake?.grouping??'combined';el('rfq-primary').value=intake?.primaryPriority??'none';el('rfq-secondary').value=intake?.secondaryPriority??'';
    el('rfq-description').value=intake?.publicDescription??'';el('rfq-location').value=intake?.publicLocation??'';el('rfq-no-photo').value=intake?.noPhotoReason??'';
    el('rfq-evidence').replaceChildren(...result.attachments.filter(f=>f.variant==='sanitized'&&f.media_type==='image/png').map(f=>new Option('Reviewed sanitized photo '+f.id.slice(0,8),f.id)));select('rfq-evidence',intake?.evidenceIds??[]);clearPreview();
    if(unsent.length)window.qfUI?.restoreInputs?.(el('rfq-panel'),unsent);if(equipment!==null)el('rfq-access-equipment').checked=equipment;el('rfq-no-photo').required=selected('rfq-evidence').length===0;
    el('rfq-publish').disabled=!!data.published;el('rfq-refine').disabled=!!data.published;el('rfq-separate').disabled=!!data.published;
    el('rfq-revision').hidden=!data.published;
    status('rfq-status',data.published?'Published revision '+data.published.revision+'. Saved draft changes do not alter this published snapshot.':'Unpublished draft. Publication needs configured trade rules and explicit accuracy/privacy confirmation.');
    if(unsent.length||equipment!==null)status('rfq-status',el('rfq-status').textContent+' Your unsent edits are preserved. Save the draft, then preview before publishing.');
    el('rfq-suggestions').replaceChildren(...data.ai.map(a=>{const card=node('article');card.className='panel';card.append(node('h4','Draft assistance · '+words(a.state)),node('p','Source: '+a.model));if(a.output?.pending)card.append(node('p','Assistance is processing. Refresh the suggestion to check its progress.'));else{if(a.output?.observations)card.append(node('p',a.output.observations));if(a.output?.notice)card.append(node('p',a.output.notice));card.append(node('p','Check the suggested text against your original observations, then review privacy before publication.'));}if(a.state==='pending_review'&&!a.output.pending)card.append(button('Use suggestion in draft',async()=>{await qf.submit('workspaces/'+id+'/rfq/accept-refinement',{refinementId:a.id},qf.job.version);await qf.loadJob(id,false);},'rfq-status'));return card;}));
  }
  bind('rfq-save','rfq-status',async()=>{await qf.submit('workspaces/'+qf.job.id+'/rfq/intake',intakeBody(),qf.job.version);window.qfUI?.clearDirty?.(el('rfq-panel'));rfqEquipmentDirty=false;await qf.loadJob(qf.job.id,false);});
  bind('rfq-refine','rfq-status',async()=>{await qf.submit('workspaces/'+qf.job.id+'/rfq/refine',{},qf.job.version);await qf.loadJob(qf.job.id,false);});
  bind('rfq-refresh','rfq-status',async()=>{await qf.loadJob(qf.job.id,false);});
  bind('rfq-preview','rfq-status',async()=>{
    const id=qf.job.id,generation=epoch,data=await qf.api('workspaces/'+id+'/rfq/preview');if(generation!==epoch||qf.job?.id!==id)return;
    if(!window.qfCommands.sameInput(data.contractorView,intakeBody()))throw new Error('Save your current draft fields before previewing.');
    previewVersion=data.version;const view=data.contractorView;el('rfq-preview-content').replaceChildren(node('h4','Exact contractor view'),node('p',view.publicDescription),facts([['Affected location',view.publicLocation],['Trades',view.categories.join(', ')],['Urgency',words(view.urgency)],['Repair arrangement',words(view.grouping)],['Primary priority',words(view.primaryPriority)],['Secondary priority',view.secondaryPriority?words(view.secondaryPriority):'None'],['Access equipment required',view.accessEquipmentRequired??false],['Photo explanation',view.noPhotoReason||'Reviewed photos supplied']]));status('rfq-status',data.reviewNotice);
    el('rfq-preview-images').replaceChildren(...data.contractorView.evidenceIds.map(id=>{const image=document.createElement('img');image.src='/api/v1/files/'+id;image.alt='Contractor-visible reviewed evidence';image.style.maxWidth='100%';return image;}));
  });
  bind('rfq-revise','rfq-status',async()=>{
    if(previewVersion!==qf.job.version)throw new Error('Preview the exact saved revision before publication.');
    const result=await qf.submit('workspaces/'+qf.job.id+'/rfq/revise',{classification:el('rfq-classification').value,changeKinds:selected('rfq-change-kinds'),reason:el('rfq-revision-reason').value,privacyConfirmed:el('rfq-privacy').checked,factsConfirmed:el('rfq-facts').checked},qf.job.version);
    await qf.loadJob(qf.job.id,false);await qf.refreshLists();status('rfq-status','Revision '+result.revision+' published. '+(result.requiresReconfirmation?'Old quotes require reconfirmation.':'Existing quotes remain valid for this scope.'));
  });
  bind('rfq-publish','rfq-status',async()=>{
    if(previewVersion!==qf.job.version)throw new Error('Preview the exact saved version before publication.');
    await qf.submit('workspaces/'+qf.job.id+'/rfq/publish',{privacyConfirmed:el('rfq-privacy').checked,factsConfirmed:el('rfq-facts').checked},qf.job.version);await qf.loadJob(qf.job.id,false);await qf.refreshLists();
  });
  bind('rfq-separate','rfq-status',async()=>{
    const repairs=el('rfq-repairs').value.split('\n').filter(s=>s.trim()).map(line=>{const parts=line.split('|').map(s=>s.trim());if(parts.length!==3)throw new Error('Use title | observations | affected location on each line.');return {title:parts[0],observations:parts[1],affectedLocation:parts[2]};});
    const result=await qf.submit('workspaces/'+qf.job.id+'/rfq/separate',{repairs},qf.job.version);await qf.loadJob(qf.job.id,false);await qf.refreshLists();status('rfq-status',result.message);
  });
  bind('opportunities-refresh','opportunities-status',async()=>{await refreshOpportunities();status('opportunities-status','Current opportunities refreshed.');});
  // Keep the existing commands and their exact versions; reveal one decision at a time.
  function arrangeProcurementFlows() {
    if(!window.qfFlow)return;
    const field=id=>el(id).closest('label')||el(id);
    const rfq=el('rfq-panel');rfq.querySelector('summary').textContent='Prepare RFQ';
    const guidance=node('details');guidance.append(node('summary','RFQ guidance'));
    for(const child of Array.from(rfq.children))if(child.tagName==='P'&&!child.id)guidance.append(child);
    rfq.append(guidance);
    const assistance=node('details');assistance.append(node('summary','Draft assistance'),el('rfq-refine'),el('rfq-refresh'),el('rfq-suggestions'));
    const devices=node('details');devices.append(node('summary','Device draft'));
    for(const child of Array.from(rfq.children))if(child.tagName==='BUTTON'&&!child.id)devices.append(child);
    rfq.append(devices);
    for(const id of ['rfq-categories','rfq-description','rfq-location'])el(id).required=true;
    const photoRequired=()=>{el('rfq-no-photo').required=selected('rfq-evidence').length===0;};el('rfq-evidence').addEventListener('change',photoRequired);photoRequired();
    el('rfq-save').textContent='Save draft';el('rfq-preview').textContent='Preview contractor view';
    const rfqWizard=window.qfFlow.wizard(rfq,{id:'rfq-intake',title:'Prepare RFQ',steps:[
      {title:'Scope',fields:['rfq-categories','rfq-urgency','rfq-description','rfq-location','rfq-access-equipment'].map(field)},
      {title:'Evidence',fields:['rfq-evidence','rfq-no-photo'].map(field)},
      {title:'Preferences',fields:['rfq-grouping','rfq-primary','rfq-secondary'].map(field)},
      {title:'Review & publish',fields:[el('rfq-save'),assistance,el('rfq-preview'),el('rfq-preview-content'),el('rfq-preview-images'),field('rfq-facts'),field('rfq-privacy'),el('rfq-publish'),el('rfq-revision')]}
    ]});
    let flowJob=null;document.addEventListener('qf:job',event=>{photoRequired();if(flowJob!==event.detail.job.id){flowJob=event.detail.job.id;rfqWizard.reset();}});
    let flowContext='';document.addEventListener('qf:context',event=>{const c=event.detail,key=c?[c.user?.id,c.context?.id,c.accessVersion].join(':'):'';if(key!==flowContext){flowContext=key;flowJob=null;rfqWizard.reset();}});

    const editor=el('verification-editor'),company=node('section'),credential=el('credential-type').closest('details');
    editor.querySelector('summary').textContent='Company & credentials';
    for(const id of ['verification-name','verification-contact','verification-categories','verification-description'])company.append(field(id));
    const companyActions=el('verification-save').parentElement;company.append(companyActions);editor.append(company);
    companyFlow=window.qfFlow.wizard(company,{id:'company-profile',title:'Company profile',steps:[
      {title:'Company details',fields:['verification-name','verification-contact','verification-categories','verification-description'].map(field)},
      {title:'Save & submit',fields:[companyActions]}
    ]});
    for(const id of ['verification-name','verification-contact','verification-categories','credential-holder','credential-reference'])el(id).required=true;
    credentialFlow=window.qfFlow.wizard(credential,{id:'credential-evidence',title:'Submit credential',steps:[
      {title:'Credential',fields:['credential-renew','credential-type','credential-holder','credential-reference'].map(field)},
      {title:'Evidence',fields:[field('credential-expiry'),field('credential-file'),el('credential-upload'),el('credential-upload-status')]},
      {title:'Submit',fields:[el('credential-submit')]}
    ]});
    credential.open=true;
    window.qfFlow.tabs(editor,{id:'company-setup',items:[{title:'Company profile',element:company},{title:'Credentials',element:credential}]});
    const review=el('verification-admin');el('verification-reason').required=true;
    verificationFlow=window.qfFlow.wizard(review,{id:'verification-decision',title:'Verification review',steps:[
      {title:'Review outcome',fields:['verification-target','verification-outcome','verification-approved','verification-reason','verification-notes'].map(field)},
      {title:'Confirm decision',fields:[el('verification-decision-company'),verificationConfirm.parentElement,el('verification-decide')]}
    ]});
  }
  arrangeProcurementFlows();
  for(const id of ['rfq-publish','rfq-revise','verification-submit','credential-submit','verification-decide'])el(id).classList.add('primary');
  document.addEventListener('qf:job',e=>{el('rfq-panel').hidden=!qf.context?.capabilities['rfq.manage'];if(!el('rfq-panel').hidden)loadRfq(e.detail).catch(error=>status('rfq-status',error.message));});
  document.addEventListener('qf:context',async e=>{
    const key=e.detail?.context?[e.detail.user.id,e.detail.context.id,e.detail.accessVersion].join(':'):'';
    if(key===contextKey)return;contextKey=key;
    epoch++;organisationLoad++;rfqLoad++;rfqJobId=null;rfqEquipmentDirty=false;profile=null;rules=null;upload=null;window.qfUI?.clearDirty?.(el('rfq-panel'));window.qfUI?.clearDirty?.(el('verification-detail'));clearPreview();
    for(const input of [verificationConfirm,tradeConfirm,restrictConfirm,liftConfirm])input.checked=false;
    for(const id of ['verification-list','verification-facts','opportunities-list','rfq-suggestions'])el(id).replaceChildren();
    el('verification-company').textContent='';showDecisionCompany();el('verification-editor').open=false;
    for(const id of ['verification-name','verification-contact','verification-description','credential-holder','credential-reference','credential-expiry','credential-file','verification-reason','verification-notes','rfq-description','rfq-location','rfq-no-photo','rfq-repairs','rfq-revision-reason','restriction-reason','restriction-lift-reason','trade-reason','credential-type-name'])el(id).value='';
    for(const id of ['verification-categories','verification-approved','credential-type-trades','rfq-categories','rfq-evidence'])select(id,[]);
    for(const id of ['credential-type','credential-renew','verification-target'])el(id).replaceChildren();
    const role=e.detail?.context?.role;el('verification-shell').hidden=!['admin','contractor'].includes(role);el('verification-detail').hidden=true;el('credential-types-panel').hidden=role!=='admin';el('opportunities-shell').hidden=role!=='contractor';status('verification-status','');status('credential-upload-status','');
    try{if(!el('verification-shell').hidden)await refreshVerification();if(role==='contractor')await refreshOpportunities();}catch(error){status('verification-status',error.message);if(role==='contractor')status('opportunities-status',error.message);}
  });
  document.addEventListener('qf:refresh',async()=>{const generation=epoch;try{if(['admin','contractor'].includes(qf.context?.context?.role))await refreshVerification();if(qf.context?.context?.role==='contractor')await refreshOpportunities();}catch(error){if(generation===epoch){status('verification-status',error.message);status('opportunities-status',error.message);}}});
})();
