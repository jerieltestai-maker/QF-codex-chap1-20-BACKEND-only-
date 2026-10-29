(() => {

  const qf=window.qfWorkspace;

  let epoch=0,contextKey='',activeOpportunity=null,opportunityLoad=0,comparisonLoad=0,settingsLoad=0,comparisonJobId=null,settingsEstateId=null,settingsEditor=null;

  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};

  const panel=node('section');panel.id='quotes-shell';panel.hidden=true;document.querySelector('main').append(panel);

  const comparisonPanel=node('section');comparisonPanel.id='comparison-shell';comparisonPanel.hidden=true;comparisonPanel.append(node('h2','Compare quotations'));document.querySelector('main').append(comparisonPanel);

  const message=node('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');

  const quoteContent=node('div');panel.append(node('h2','My quotation'),message,quoteContent);

  const comparisonContent=node('div');comparisonPanel.append(comparisonContent);
  const settingsPanel=node('section'),settingsStatus=node('p'),settingsBody=node('div');settingsPanel.id='procurement-settings-shell';settingsPanel.className='panel';settingsPanel.hidden=true;settingsStatus.setAttribute('role','status');settingsStatus.setAttribute('aria-live','polite');settingsPanel.append(node('h2','Procurement settings'),settingsStatus,settingsBody);document.querySelector('main').append(settingsPanel);

  const field=(parent,label,type='text',value='')=>{const wrapper=node('label',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.maxLength=10000;wrapper.append(input);parent.append(wrapper);return input;};

  const choice=(parent,label,options,value='')=>{const wrapper=node('label',label),select=node('select');select.append(new Option('Choose an option',''),...options.map(([key,text])=>new Option(text,key)));select.value=value;wrapper.append(select);parent.append(wrapper);return select;};

  const check=(parent,label)=>{const wrapper=node('label'),input=node('input');wrapper.className='confirmation';input.type='checkbox';wrapper.append(input,document.createTextNode(label));parent.append(wrapper);return input;};

  function button(parent,label,action) {const b=node('button',label);b.type='button';b.onclick=async()=>{if(b.disabled)return;const generation=epoch;b.disabled=true;b.setAttribute('aria-busy','true');let feedback=parent.querySelector('[role="status"]');if(!feedback){feedback=node('p');feedback.className='action-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');parent.append(feedback);}feedback.textContent='Working…';try{await action();if(generation===epoch&&feedback.isConnected&&feedback.textContent==='Working…')feedback.textContent='Action recorded. Current details refreshed.';}catch(e){if(generation!==epoch)return;feedback.textContent=e.message;message.textContent=e.message;if(e.status===412)feedback.append(document.createTextNode(' Refresh this job and review the current version before submitting again.'));}finally{b.disabled=false;b.setAttribute('aria-busy','false');}};parent.append(b);return b;}

  const label=value=>String(value).replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,s=>s.toUpperCase());
  function pretty(value) {if(value===null||value===undefined)return node('p','Not recorded');if(Array.isArray(value)){const list=node('ul');for(const entry of value){const item=node('li');item.append(typeof entry==='object'?pretty(entry):node('span',String(entry)));list.append(item);}return list;}if(typeof value==='object'){const list=node('dl');list.className='fact-list';for(const [key,item] of Object.entries(value)){const description=node('dd');description.append(item&&typeof item==='object'?pretty(item):node('span',item===true?'Yes':item===false?'No':item??'Not recorded'));list.append(node('dt',label(key)),description);}return list;}return node('p',String(value));}
  const required=(control,name)=>{if(!control.value.trim()){window.qfFlow?.reveal(control);control.focus();throw new Error(name+' is required.');}return control.value.trim();};
  function adviceView(result) {const box=node('div');box.className='state-note';box.append(node('p',result.preferenceFit||'No current comparison advice is available.'));if(result.status==='unavailable')box.append(node('p','Advice is unavailable. You can continue using the factual quotation comparison.'));const list=node('ul');for(const text of result.limitations??[])list.append(node('li',text));box.append(list);return box;}
  function confirmThreshold(amount,threshold) {
    return new Promise(resolve=>{
      const dialog=node('dialog'),title=node('h3','Select and approve above the estate threshold');title.id='threshold-dialog-title';dialog.setAttribute('aria-labelledby',title.id);dialog.append(title,node('p','Quote: '+money(amount)+'. Estate threshold: '+money(threshold)+'. This confirmation authorises the selected work.'));
      let finished=false;const previousFocus=document.activeElement;const finish=value=>{if(finished)return;finished=true;dialog.close();dialog.remove();previousFocus?.focus();resolve(value);};
      const back=button(dialog,'Back',()=>finish(false));button(dialog,'Yes I know',()=>finish(true));dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);},{once:true});document.body.append(dialog);dialog.showModal();back.focus();
    });
  }

  function termView(t,narrativeWithheld=false) {

    const list=node('dl');list.className='fact-list';const rows=[['Final amount payable','SGD '+t.amountSgd],...Object.entries(explanations).filter(([key])=>t[key]!==undefined).map(([key,v])=>[v[0],t[key]?'Yes':'No']),['Earliest availability after authorisation and site access',options.availability.find(o=>o[0]===t.availability)?.[1]??'Not stated'],['Estimated duration',options.duration.find(o=>o[0]===t.duration)?.[1]??'Not stated'],['Additional exclusions',t.exclusions?.includes('other')?t.exclusionsOther:'No additional exclusions'],['Expiry chosen by contractor',t.expiry],['Optional narrative',narrativeWithheld?'Withheld while contractor identities are concealed; MCST can review':t.narrative??'Not stated']];

    if(t.warranty)rows.push(['Warranty duration',options.warranty.find(o=>o[0]===t.warrantyDuration)?.[1]??'Not stated']);

    for(const [key,label] of [['warrantyOther','Other warranty duration'],['availabilityOther','Other availability'],['durationReason','Duration explanation']])if(t[key])rows.push([label,t[key]]);

    for(const [label,value] of rows)list.append(node('dt',label),node('dd',value));return list;

  }

  function ownHistory(records) {

    const box=node('div');if(!records.length)box.append(node('p','No submitted quote yet.'));

    for(const record of records)for(const v of record.versions){const item=node('article');item.append(node('h4','Quote version '+v.version+' · RFQ revision '+v.rfq_revision),termView(v.terms),node('p','Recorded '+new Date(v.recorded_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT'+(v.revision_reason?' · '+v.revision_reason:'')));if(v.pdf_id){const link=node('a','View your quotation PDF');link.href='/api/v1/files/'+v.pdf_id;item.append(link);}box.append(item);}return box;

  }

  function selectionHistory(records) {

    const box=node('div');if(!records.length)box.append(node('p','No recorded selection yet.'));

    for(const record of records){const item=node('article');item.append(node('h4',record.name+' · selected quote version '+record.quoteVersion+' · '+money(record.amountCents)),node('p','Threshold at selection: '+money(record.thresholdCents)+' · '+record.comparison.count+' received offers in the frozen comparison.'),node('p',record.rationale),termView(record.terms,record.narrativeWithheld));for(const d of record.decisions)item.append(node('p',d.outcome.replaceAll('_',' ')+' · '+d.reason+' · '+new Date(d.recorded_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT'));const frozen=node('details');frozen.append(node('summary','Frozen comparison offers'));for(const q of record.frozenQuotes)frozen.append(node('h4',q.name+' · quote version '+q.quoteVersion+' · '+money(q.amountCents)),termView(q.terms,q.narrativeWithheld));item.append(frozen);if(record.reputation){const reputation=node('details');reputation.append(node('summary','Reputation and advice saved at selection'),pretty(record.reputation));item.append(reputation);}box.append(item);}return box;

  }

  const options={warranty:[['7_days','7 days'],['14_days','14 days'],['1_month','1 month'],['3_months','3 months'],['1_year','1 year'],['other','Other']],availability:[['same_day','Same day'],['next_day','Next day'],['2_3_days','Within 2–3 days'],['4_7_days','Within 4–7 days'],['other','Other']],duration:[['half_day','Up to half a day'],['1_day','1 day'],['2_3_days','2–3 days'],['4_7_days','4–7 days'],['other','Other'],['unknown','Unable to estimate yet — reason required']]};

  function money(cents,denominator=1) {if(cents===null||cents===undefined||!denominator)return 'Not available';let n=BigInt(cents),d=BigInt(denominator),sign=n<0n?'-':'';if(n<0n)n=-n;const rounded=(n+d/2n)/d;return sign+'SGD '+(rounded/100n)+'.'+String(rounded%100n).padStart(2,'0');}

  const explanations={wasteDisposal:['Waste disposal included','Yes means your final quoted amount covers collection, removal, and disposal of all waste generated by this job. No means waste disposal is excluded from your quote and must be arranged and paid for separately.'],warranty:['Warranty included','Yes means a warranty for the completed work is included in your final quoted amount. No means this quote offers no warranty for the completed work.'],makingGood:['Making good included','Yes means your final quoted amount covers restoring every surface or fixture disturbed by your work to its prior condition. No means that restoration is excluded and must be arranged and paid for separately.'],gstCharged:['GST charged?','Yes means your final quoted amount includes every GST charge you will bill for this job. No means you declare that no GST will be charged for this job.'],accessEquipment:['Access equipment included','Yes means your final quoted amount covers all access equipment needed to perform the work described in this RFQ. No means access equipment is excluded and must be arranged and paid for separately.']};

  const draftKey=id=>'qf-quote:'+qf.context.user.id+':'+qf.context.context.id+':'+id;
  const settingsAck='I understand that approval thresholds apply to future selection decisions, identity visibility applies to permitted current views, and recorded quotations, decisions and work authority remain preserved.';
  async function loadProcurementEditor(parent,id) {
    const generation=epoch,loading=++settingsLoad,unsent=settingsEditor===parent&&settingsEstateId===id?(window.qfUI?.captureInputs?.(parent)??[]):[];settingsEditor=parent;settingsEstateId=id;parent.replaceChildren(node('p','Loading current estate procurement settings…'));
    const data=await qf.api('estates/'+id+'/procurement-settings');if(generation!==epoch||loading!==settingsLoad)return;
    parent.replaceChildren(node('h3',data.name),pretty({approvalThreshold:data.thresholdCents===null?'Not configured':money(data.thresholdCents),cmContractorIdentityVisibility:data.identitiesVisible?'Visible':'Concealed',configurationVersion:data.version}));
    const admin=qf.context.context.role==='admin';let threshold,address;
    if(admin){threshold=field(parent,'Estate approval threshold — SGD','text',data.thresholdCents===null?'':(BigInt(data.thresholdCents)/100n)+'.'+String(BigInt(data.thresholdCents)%100n).padStart(2,'0'));threshold.inputMode='decimal';threshold.maxLength=18;address=field(parent,'Private estate address','textarea',data.address??'');}
    else parent.append(node('p','Admin configures the approval threshold and private estate address. MCST controls whether CM sees contractor identities.'));
    const visibility=choice(parent,'CM contractor identity visibility for this estate',[['yes','Visible'],['no','Concealed']],data.identitiesVisible?'yes':'no'),reason=field(parent,'Reason for procurement setting changes','textarea'),ack=check(parent,settingsAck);
    const save=button(parent,'Save estate procurement settings',async()=>{
      if(!ack.checked)throw new Error('Review and acknowledge the effect of these setting changes.');required(reason,'Reason for procurement setting changes');
      const body={reason:reason.value};if(threshold&&threshold.value.trim()!==''){const value=threshold.value.trim();if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(value))throw new Error('Use an exact nonnegative SGD threshold with no more than two decimal places.');const [whole,fraction='']=value.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));if(cents!==BigInt(data.thresholdCents??-1))body.thresholdSgd=value;}
      if(address&&address.value!==(data.address??''))body.address=address.value;
      if(!visibility.value)throw new Error('Choose whether CM can see contractor identities.');if((visibility.value==='yes')!==data.identitiesVisible)body.identitiesVisible=visibility.value==='yes';
      if(Object.keys(body).length===1)throw new Error('Change at least one procurement setting before saving.');
      await qf.submit('estates/'+id+'/procurement-settings',body,data.version);if(generation!==epoch)return;window.qfUI?.clearDirty?.(parent);await loadProcurementEditor(parent,id);settingsStatus.textContent='Procurement settings saved. Earlier decisions and work authority retain their recorded terms. Review any current comparison again before a new selection.';await qf.refreshLists();
    });save.classList.add('primary');save.disabled=true;ack.addEventListener('change',()=>{save.disabled=!ack.checked;});
    for(const control of [threshold,address,visibility,reason].filter(Boolean))control.addEventListener('input',()=>{ack.checked=false;save.disabled=true;});
    reason.required=true;visibility.required=true;
    window.qfFlow?.wizard(parent,{id:'procurement-'+id,title:'Estate setup',steps:[
      {title:'Configure',fields:[threshold?.parentElement,address?.parentElement,visibility.parentElement].filter(Boolean)},
      {title:'Review & save',fields:[reason.parentElement,ack.parentElement,save]}
    ]});
    button(parent,'Refresh estate procurement settings',()=>loadProcurementEditor(parent,id));
    if(unsent.length){window.qfUI?.restoreInputs?.(parent,unsent);settingsStatus.textContent='Current saved values refreshed above. Your unsent changes remain in the fields. Review them and acknowledge the changes again before saving.';}
  }
  async function loadProcurementSettings(initialEstateId='') {
    const generation=epoch,role=qf.context?.context?.role;settingsBody.replaceChildren();settingsStatus.textContent='';if(!['mcst','admin'].includes(role))return;
    if(role==='mcst')return loadProcurementEditor(settingsBody,qf.context.context.estate_id);
    const estates=await qf.api('admin/estates');if(generation!==epoch)return;
    if(!estates.length){settingsBody.append(node('p','No estates are available. Estate access must be configured before procurement.'));return;}
    const selector=choice(settingsBody,'Estate for procurement settings',estates.map(estate=>[estate.id,estate.name])),editor=node('div');settingsBody.append(editor);
    selector.onchange=()=>{settingsLoad++;editor.replaceChildren();settingsStatus.textContent='';if(selector.value)loadProcurementEditor(editor,selector.value).catch(error=>{if(generation===epoch)settingsStatus.textContent=error.message;});};
    if(initialEstateId&&estates.some(estate=>estate.id===initialEstateId)){selector.value=initialEstateId;await loadProcurementEditor(editor,initialEstateId);}
  }

  async function refreshJobs() {

    const generation=epoch,jobs=await qf.api('contractor/jobs');if(generation!==epoch)return;

    let list=document.getElementById('own-quote-jobs');if(!list){list=node('div');list.id='own-quote-jobs';document.getElementById('opportunities-shell').append(list);}list.replaceChildren(node('h3','Your submitted quotations'));

    if(!jobs.length)list.append(node('p','Your submitted quotations will appear here, including held terms and authorised jobs.'));
    for(const job of jobs)button(list,job.rfq.publicDescription+' · '+(job.workCancelled?'Works cancelled':label(job.selection?.status??job.roundStatus)),()=>openOpportunity({jobId:job.jobId,revision:job.rfqRevision,roundId:job.roundId,description:job.rfq.publicDescription,accessEquipmentRequired:job.rfq.accessEquipmentRequired??false},job));

  }

  async function openOpportunity(r,knownJob,navigate=true) {

    const generation=epoch,loading=++opportunityLoad,unsent=activeOpportunity?.jobId===r.jobId?(window.qfUI?.captureInputs?.(quoteContent)??[]):[];activeOpportunity=r;panel.hidden=false;quoteContent.replaceChildren();message.textContent='Loading your current quote record…';if(navigate)document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen:'quotes'}}));

    const [own,conversation]=await Promise.all([qf.api('opportunities/'+r.jobId+'/quotes'),qf.api('opportunities/'+r.jobId+'/conversation')]);if(generation!==epoch||loading!==opportunityLoad||activeOpportunity?.jobId!==r.jobId)return;

    quoteContent.append(node('h3',r.description));
    for(const id of knownJob?.rfq.evidenceIds??r.evidenceIds??[]){const a=node('a','View reviewed RFQ photo');a.href='/api/v1/files/'+id;quoteContent.append(a);}

    let open=true;try{r=await qf.api('opportunities/'+r.jobId);}catch(e){if(e.status===404)open=false;else throw e;}if(generation!==epoch||loading!==opportunityLoad)return;
    if(open)quoteContent.append(node('p','Affected location: '+r.location+' · '+r.categories.join(', ')+' · RFQ revision '+r.revision));

    const current=own.quotes.find(q=>q.quote.round_id===r.roundId)?.quote;

    if(knownJob?.workCancelled)quoteContent.append(node('p','Works cancelled. Further ordinary work must stop; existing confirmed payments and claims remain separate.'));
    else if(knownJob?.selection)quoteContent.append(node('p',knownJob.selection.status==='pending'?'Your selected quote is held while awaiting MCST approval. Work is not authorised.':knownJob.selection.status==='authorised'?'Work is authorised for the selected quote version.':'This nomination was rejected; review current valid offers.'));

    for(const reveal of conversation.reveals){const card=node('article');card.className='state-note';card.append(node('h4','Authorised location reveal'),pretty(reveal.snapshot),node('p','Reason: '+label(reveal.cause)));quoteContent.append(card);}

    if(open)renderQuoteForm(r,current,own,conversation.visits.some(v=>v.state==='approved'));

    else quoteContent.append(node('p','This job currently accepts no quote changes. Your submitted records remain available below.'));

    const history=node('details');history.append(node('summary','Your submitted quote versions'),ownHistory(own.quotes));quoteContent.append(history);

    renderConversation(quoteContent,r,conversation,true,open,own.quotes.some(record=>record.quote.round_id===r.roundId),own.quotes.length>0);

    message.textContent='Quotes are sealed. Only your company’s quotes appear here.';
    if(unsent.length){window.qfUI?.restoreInputs?.(quoteContent,unsent);for(const select of quoteContent.querySelectorAll('select'))select.dispatchEvent(new Event('change'));message.textContent+=' Your unsent text is preserved. Review current scope and confirm the expiry and commitment again.';}

  }

  function renderQuoteForm(r,current,own,afterVisit=false) {

    const editor=node('div');editor.className='panel quote-editor';quoteContent.append(editor);let saved=null;try{saved=JSON.parse(localStorage.getItem(draftKey(r.jobId)));}catch{}

    const old=saved?.terms??current?.terms??{},controls={};
    const stepFields={};let stepStart=editor.children.length;

    if(saved)editor.append(node('p','Restored your device draft. Confirm current scope and expiry again before submitting.'));

    controls.amountSgd=field(editor,'Final SGD amount payable — includes all GST charged','text',old.amountSgd??'');
    controls.amountSgd.inputMode='decimal';controls.amountSgd.maxLength=18;
    editor.append(node('p','Quotation total must be at least SGD 0.01.'));

    for(const [key,[label,copy]] of Object.entries(explanations)) {

      if(key==='accessEquipment'&&!r.accessEquipmentRequired)continue;

      controls[key]=choice(editor,label,[['yes','Yes'],['no','No']],typeof old[key]==='boolean'?(old[key]?'yes':'no'):'');

      const info=node('details');info.append(node('summary',label+' — information'),node('p',copy));editor.append(info);

    }

    const warranty=node('div');editor.append(warranty);controls.warrantyDuration=choice(warranty,'Warranty duration',options.warranty,old.warrantyDuration??'');controls.warrantyOther=field(warranty,'Other warranty duration','text',old.warrantyOther??'');

    const syncWarranty=()=>{warranty.hidden=controls.warranty.value!=='yes';controls.warrantyOther.parentElement.hidden=controls.warrantyDuration.value!=='other';};controls.warranty.onchange=syncWarranty;controls.warrantyDuration.onchange=syncWarranty;syncWarranty();
    stepFields.price=Array.from(editor.children).slice(stepStart);stepStart=editor.children.length;

    editor.append(node('p','Earliest availability starts after work authorisation AND available site access.'));

    controls.availability=choice(editor,'Earliest availability',options.availability,old.availability??'');controls.availabilityOther=field(editor,'Other earliest availability','text',old.availabilityOther??'');

    controls.duration=choice(editor,'Estimated work duration',options.duration,old.duration??'');controls.durationReason=field(editor,'Other duration / unable-to-estimate reason','textarea',old.durationReason??'');

    const sync=()=>{controls.availabilityOther.parentElement.hidden=controls.availability.value!=='other';controls.durationReason.parentElement.hidden=!['other','unknown'].includes(controls.duration.value);};controls.availability.onchange=sync;controls.duration.onchange=sync;sync();

    const inherited=node('p');editor.append(inherited);const showExcluded=()=>{const excluded=Object.entries(explanations).filter(([key])=>!['gstCharged','warranty'].includes(key)&&controls[key]?.value==='no').map(([,v])=>v[0].replace(' included',''));inherited.textContent=(controls.warranty.value==='no'?'No warranty is offered. ':'')+(excluded.length?'Excluded services: '+excluded.join(', ')+'. Excluded third-party service costs are unknown.':'No service exclusions declared above. Answer additional exclusions separately.');};for(const key of ['wasteDisposal','warranty','makingGood','accessEquipment'])controls[key]?.addEventListener('change',showExcluded);showExcluded();

    controls.exclusions=choice(editor,'Additional exclusions',[['none','No additional exclusions'],['other','Other — specify']],old.exclusions?.[0]??'');controls.exclusionsOther=field(editor,'Other exclusions','textarea',old.exclusionsOther??'');const syncExclusions=()=>controls.exclusionsOther.parentElement.hidden=controls.exclusions.value!=='other';controls.exclusions.onchange=syncExclusions;syncExclusions();
    stepFields.schedule=Array.from(editor.children).slice(stepStart);stepStart=editor.children.length;

    controls.narrative=field(editor,'Additional details — optional','textarea',old.narrative??'');controls.expiry=field(editor,'Quote expiry','text',old.expiry??own.suggestedExpiry);
    const expiryHelp=node('p','Use YYYY-MM-DD or a date/time with timezone. A date alone remains valid through that date in Singapore.');expiryHelp.id='quote-expiry-help-'+r.jobId;expiryHelp.className='field-hint';controls.expiry.setAttribute('aria-describedby',expiryHelp.id);controls.expiry.parentElement.append(expiryHelp);

    const expiryConfirmed=check(editor,'I confirm this expiry date or date/time.'),commitment=check(editor,own.commitmentCopy),scopeConfirmed=check(editor,'I reviewed RFQ revision '+r.revision+' and the current scope.');
    controls.expiry.addEventListener('input',()=>{expiryConfirmed.checked=false;});

    controls.revisionReason=field(editor,'Revision reason — mandatory after an approved site visit','textarea','');controls.revisionReason.parentElement.hidden=!current;

    const file=field(editor,'Quotation PDF — optional','file');file.accept='application/pdf';let uploadedId=current?.pdf_id??null,uploadState=null;

    file.onchange=()=>{uploadedId=null;uploadState=null;uploadMessage.textContent='Selected PDF changed. Upload and check this file before submitting.';};

    const uploadMessage=node('p');editor.append(uploadMessage);

    button(editor,'Upload / check optional quotation PDF',async()=>{

      const generation=epoch,chosen=file.files[0];if(!chosen||chosen.type!=='application/pdf'||chosen.size>10485760)throw new Error('Choose a PDF up to 10 MiB.');

      const bytes=await chosen.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');

      if(generation!==epoch||file.files[0]!==chosen)return;const org=qf.context.context.organisation_id,profile=await qf.api('contractors/'+org);if(generation!==epoch||file.files[0]!==chosen)return;

      if(!uploadState||uploadState.checksum!==checksum)uploadState={checksum};const transfer=uploadState;

      if(!transfer.id)transfer.id=(await qf.submit('contractors/'+org+'/quote-uploads',{mediaType:'application/pdf',byteSize:bytes.byteLength,checksum},profile.organisation.version)).uploadId;

      if(generation!==epoch||uploadState!==transfer)return;let state=await qf.api('uploads/'+transfer.id);

      if(state.state==='transferring') {await qf.api('uploads/'+transfer.id+'/renew',{});for(let offset=0;offset<bytes.byteLength;offset+=262144){if(generation!==epoch||uploadState!==transfer)return;if(state.chunks.some(c=>c.byte_offset===offset))continue;let binary='';for(const byte of new Uint8Array(bytes.slice(offset,offset+262144)))binary+=String.fromCharCode(byte);await qf.api('uploads/'+transfer.id+'/chunks',{offset,bytes:btoa(binary)});}if(generation!==epoch||uploadState!==transfer)return;await qf.submit('uploads/'+transfer.id+'/finalize',{},0);state=await qf.api('uploads/'+transfer.id);}

      if(generation!==epoch||uploadState!==transfer)return;uploadedId=state.state==='ready'?state.objects.find(o=>o.variant==='original')?.id??null:null;uploadMessage.textContent=state.state==='ready'?'Quotation PDF is ready. Submit the quote separately.':'PDF processing: '+state.state+'. Press again to check.';

    });

    function collect(confirmed) {

      if(confirmed){
        const amount=required(controls.amountSgd,'Final SGD amount');if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(amount)||!/[1-9]/.test(amount))throw new Error('Enter a final amount of at least SGD 0.01 using no more than two decimal places.');
        for(const [key,name] of [['availability','Earliest availability'],['duration','Estimated work duration'],['exclusions','Additional exclusions'],['expiry','Expiry']])required(controls[key],name);
        if(!expiryConfirmed.checked||!commitment.checked)throw new Error('Confirm your chosen expiry and quote commitment.');
        if(controls.warranty.value==='yes'){required(controls.warrantyDuration,'Warranty duration');if(controls.warrantyDuration.value==='other')required(controls.warrantyOther,'Other warranty duration');}
        if(controls.availability.value==='other')required(controls.availabilityOther,'Other earliest availability');
        if(['other','unknown'].includes(controls.duration.value))required(controls.durationReason,'Duration explanation');
        if(controls.exclusions.value==='other')required(controls.exclusionsOther,'Other exclusions');
      }

      const t={amountSgd:controls.amountSgd.value.trim(),availability:controls.availability.value,duration:controls.duration.value,exclusions:[controls.exclusions.value],expiry:controls.expiry.value.trim(),expiryConfirmed:confirmed&&expiryConfirmed.checked,commitment:confirmed&&commitment.checked};

      for(const key of Object.keys(explanations))if(controls[key]){if(!controls[key].value){if(confirmed)throw new Error('Choose Yes or No for '+explanations[key][0]);continue;}t[key]=controls[key].value==='yes';}

      if(t.warranty){t.warrantyDuration=controls.warrantyDuration.value;if(t.warrantyDuration==='other')t.warrantyOther=controls.warrantyOther.value;}

      if(t.availability==='other')t.availabilityOther=controls.availabilityOther.value;

      if(['other','unknown'].includes(t.duration))t.durationReason=controls.durationReason.value;

      if(t.exclusions[0]==='other')t.exclusionsOther=controls.exclusionsOther.value;

      if(controls.narrative.value)t.narrative=controls.narrative.value;return t;

    }

    const saveDraft=button(editor,'Save device draft',()=>{localStorage.setItem(draftKey(r.jobId),JSON.stringify({terms:collect(false),rfqRevision:r.revision}));message.textContent='Saved on this device. No quote was submitted.';});

    const submitQuote=button(editor,current?'Submit revised quote':'Submit initial quote',async()=>{

      if(!scopeConfirmed.checked)throw new Error('Review and confirm the current RFQ scope.');if(file.files.length&&!uploadedId)throw new Error('Wait for the quotation PDF to become ready.');
      const terms=collect(true);
      if(current&&afterVisit)required(controls.revisionReason,'Post-visit revision reason');

      const latest=await qf.api('opportunities/'+r.jobId);if(latest.revision!==r.revision)throw new Error('The RFQ changed. Save your device draft and review the latest revision.');

      await qf.submit('opportunities/'+r.jobId+'/quotes',{rfqRevision:r.revision,terms,...(uploadedId?{pdfId:uploadedId}:{}),...(controls.revisionReason.value?{revisionReason:controls.revisionReason.value}:{})},current?.version??0);

      localStorage.removeItem(draftKey(r.jobId));window.qfUI?.clearDirty?.(quoteContent);await openOpportunity(r);await refreshJobs();await qf.refreshLists();

    });

    submitQuote.classList.add('primary');
    stepFields.confirm=[controls.expiry.parentElement,expiryConfirmed.parentElement,scopeConfirmed.parentElement,commitment.parentElement,submitQuote];
    stepFields.files=Array.from(editor.children).slice(stepStart).filter(element=>!stepFields.confirm.includes(element)&&element!==saveDraft);
    for(const key of ['amountSgd','availability','duration','exclusions','expiry',...Object.keys(explanations)])if(controls[key])controls[key].required=true;
    controls.amountSgd.pattern='(?=.*[1-9])(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,2})?';
    for(const key of ['warrantyDuration','warrantyOther','availabilityOther','durationReason','exclusionsOther'])controls[key].required=true;
    if(current&&afterVisit)controls.revisionReason.required=true;
    window.qfFlow?.wizard(editor,{id:'quote-'+r.jobId,title:current?'Revise quotation':'Prepare quotation',steps:[
      {title:'Price & inclusions',fields:stepFields.price},
      {title:'Timing & exclusions',fields:stepFields.schedule},
      {title:'Supporting details',fields:stepFields.files},
      {title:'Review & submit',fields:stepFields.confirm}
    ]});

    if(current?.status==='active') {

      const changes=node('details');changes.append(node('summary','Existing quote actions'));editor.append(changes);
      const reconfirm=check(changes,'Reconfirm my existing exact terms against this RFQ revision; expiry remains unchanged.');

      button(changes,'Reconfirm existing quote',async()=>{if(!reconfirm.checked)throw new Error('Confirm the existing exact terms against this RFQ revision.');await qf.submit('quotes/'+current.id+'/reconfirm',{rfqRevision:r.revision,confirmed:reconfirm.checked},current.version);await openOpportunity(r);await qf.refreshLists();});

      const reason=field(changes,'Withdrawal reason','text'),withdraw=check(changes,'I confirm withdrawal of this current offer.');button(changes,'Withdraw my current offer',async()=>{required(reason,'Withdrawal reason');if(!withdraw.checked)throw new Error('Confirm withdrawal of your current offer.');await qf.submit('quotes/'+current.id+'/withdraw',{reason:reason.value},current.version);await openOpportunity(r);await refreshJobs();await qf.refreshLists();});

    }

  }

  function renderConversation(parent,r,data,contractor,open=true,hasQuote=false,hasAnyQuote=hasQuote) {

    const details=node('details');details.append(node('summary','Questions about this job and site visits'));parent.append(details);

    if(!data.shared.length&&!data.questions.length&&!data.visits.length)details.append(node('p','No questions or site visits recorded.'));
    for(const answer of data.shared){const answerBox=node('article');answerBox.className='data-row';answerBox.append(node('h4',answer.public_question),node('p',answer.public_answer));details.append(answerBox);}

    for(const question of data.questions) {

      const item=node('article');item.className='data-row';item.append(node('p',question.name+' · '+question.question+' · '+label(question.state)));details.append(item);

      if(!contractor&&question.state==='pending'&&open){const publicQuestion=field(item,'Sanitized shared question','textarea'),publicAnswer=field(item,'Sanitized factual answer','textarea'),classification=choice(item,'Revision classification',[['material','Material — reconfirmation required'],['minor','Minor spelling/formatting']],'material'),kind=choice(item,'What changed?',[['access','Access'],['scope','Scope'],['quantities','Quantities'],['price_terms','Price terms'],['safety','Safety'],['uncertain','Uncertain — material'],['spelling','Spelling'],['formatting','Formatting']],'uncertain'),reason=field(item,'Classification reason','text'),privacy=check(item,'I removed estate identifiers, contractor identities, prices and proprietary content.'),facts=check(item,'I confirm the shared answer is factual.');
        for(const [name,control] of Object.entries({publicQuestion,publicAnswer,classification,kind,reason}))control.id='question-'+question.id+'-'+name;

        for(const outcome of ['answered','declined'])button(item,outcome==='answered'?'Publish reviewed factual answer':'Decline this request',async()=>{if(outcome==='answered'){required(publicQuestion,'Sanitized shared question');required(publicAnswer,'Sanitized factual answer');required(reason,'Classification reason');if(!privacy.checked||!facts.checked)throw new Error('Review and confirm the privacy and accuracy of this exact shared answer.');}await qf.submit(`workspaces/${r.jobId}/questions/${question.id}/respond`,{rfqRevision:data.rfqRevision,outcome,publicQuestion:publicQuestion.value,publicAnswer:publicAnswer.value,classification:classification.value,changeKinds:[kind.value],reason:reason.value,privacyConfirmed:privacy.checked,factsConfirmed:facts.checked},question.version);await qf.loadJob(r.jobId,false);await qf.refreshLists();});}

    }

    for(const visit of data.visits) {const item=node('article');item.className='data-row';item.append(node('p','Site visit · '+visit.reason+' · '+label(visit.state)));details.append(item);if(!contractor&&visit.state==='pending'&&open){const reason=field(item,'Decision reason — optional','text'),time=field(item,'Agreed visit time — optional (Singapore local time)','datetime-local'),confirmed=check(item,'I confirm the decision; approval reveals the exact estate location to this company.');reason.id='visit-reason-'+visit.id;time.id='visit-time-'+visit.id;for(const outcome of ['approved','declined'])button(item,outcome==='approved'?'Approve site visit':'Decline site visit',async()=>{if(!confirmed.checked)throw new Error('Confirm the visit decision and any location reveal.');await qf.submit(`workspaces/${r.jobId}/visits/${visit.id}/decide`,{outcome,reason:reason.value,confirmed:confirmed.checked,...(outcome==='approved'&&time.value?{visitAt:new Date(time.value+':00+08:00').toISOString()}: {})},visit.version);await qf.loadJob(r.jobId,false);await qf.refreshLists();});}}

    if(contractor&&open){if(!hasAnyQuote){const question=field(details,'Private factual question — before your first quote','textarea');button(details,'Ask before quoting',async()=>{required(question,'Private factual question');await qf.submit('opportunities/'+r.jobId+'/questions',{rfqRevision:r.revision,question:question.value},0);await openOpportunity(r);await qf.refreshLists();});}if(!hasQuote)details.append(node('p','Submit an initial quote for this round before requesting a site visit. A current valid quote can be selected without a visit.'));else if(data.visits.some(v=>v.state==='pending'))details.append(node('p','Your site-visit request is awaiting the estate’s decision.'));else{const reason=field(details,'Site-visit request reason','text');button(details,'Request a site visit',async()=>{required(reason,'Site-visit request reason');await qf.submit('opportunities/'+r.jobId+'/visits',{rfqRevision:r.revision,reason:reason.value},0);await openOpportunity(r);await qf.refreshLists();});}}

  }

  async function loadComparison(id) {

    const generation=epoch,loading=++comparisonLoad,unsent=comparisonJobId===id?(window.qfUI?.captureInputs?.(comparisonContent)??[]):[];comparisonJobId=id;comparisonContent.replaceChildren(node('p','Loading current quotes and procurement context…'));

    const [c,data]=await Promise.all([qf.api('workspaces/'+id+'/comparison'),qf.api('workspaces/'+id+'/conversation')]);if(generation!==epoch||loading!==comparisonLoad||qf.job?.id!==id)return;comparisonContent.replaceChildren();

    const status=node('p');status.setAttribute('role','status');comparisonContent.append(status);const role=qf.context.context.role,open=c.roundStatus==='open';
    button(comparisonContent,'Refresh quotation comparison',()=>loadComparison(id));

    const frozenComparison=c.history.find(h=>h.selectionId===c.selection?.selection_id)?.comparison;
    const displayedComparison=open?c.comparison:(frozenComparison??c.comparison);
    comparisonContent.append(node('p',(open?displayedComparison.count+(displayedComparison.count===1?' current selectable offer.':' current selectable offers.'):'Quoting '+c.roundStatus+'. '+displayedComparison.count+(displayedComparison.count===1?' offer captured at selection.':' offers captured at selection.'))+' Current approval threshold: '+(c.thresholdCents===null?'Admin configuration required':money(c.thresholdCents))+'.'));
    if(displayedComparison.average)comparisonContent.append(node('p','Highest received quote: '+money(displayedComparison.highestCents)+' | Average received quote: '+money(displayedComparison.average.numeratorCents,displayedComparison.average.denominator)+' (rounded for display).'));
    if(c.clock)comparisonContent.append(node('p','Selection follow-up: '+c.clock.status+(c.clock.scheduled_review_at?' · Scheduled review '+new Date(c.clock.scheduled_review_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT':'')));
    if(!c.quotes.length){const empty=node('p','No quotations received yet. Eligible contractors can submit offers. Admin sourcing follows the published RFQ checkpoint.');empty.className='empty-state';comparisonContent.append(empty);}
    if(open&&c.thresholdCents===null)comparisonContent.append(node('p','Selection needs an explicitly configured estate approval threshold. Ask Admin to configure it before reviewing a final selection.'));
    if(open){const advice=node('details');advice.append(node('summary','Evidence-based comparison advice'));comparisonContent.append(advice);
      const output=node('div');advice.append(output);if(c.advice?.result)output.append(adviceView(c.advice.result));
      button(advice,'Request current comparison advice',async()=>{const result=await qf.submit('workspaces/'+id+'/advice',{confirmed:true},c.version);output.replaceChildren(adviceView(result.result));});
      advice.append(node('p','Advice uses the configured server provider. Current factual comparison remains available if AI is unavailable. No preference does not imply choosing the cheapest quote.'));
    }

    for(const quote of c.quotes) {

      const item=node('article');item.className='panel quote-card';item.append(node('h3',quote.name+' · '+money(quote.amountCents)),node('p',quote.selectable?'Selectable':quote.held?(c.selection?.status==='authorised'?'Authorised quote terms':'Held selected terms'):quote.expired?'Expired':quote.status==='withdrawn'?'Withdrawn':quote.requiresReconfirmation?'Scope reconfirmation required':'Currently unselectable'));const terms=node('details');terms.append(node('summary','Quote terms · v'+quote.quoteVersion),termView(quote.terms,quote.narrativeWithheld));item.append(terms);comparisonContent.append(item);
      const reputation=quote.reputation;item.append(node('p','Pure reputation score: '+(reputation.pure===null?'Not enough approved evidence':reputation.pure.toFixed(1))+' · Reputation score with CM priorities: '+(reputation.adjusted===null?'Not enough approved evidence':reputation.adjusted.toFixed(1))+' · '+reputation.quoteFixCount+' QuoteFix jobs / '+reputation.externalCount+' external references.'));
      const passport=node('details'),passportContent=node('div');passport.append(node('summary','Contractor passport'),passportContent);item.append(passport);
      button(passport,'Load current passport',()=>{if(!window.qfReputation?.passport)throw new Error('Passport is unavailable. Refresh the page and try again.');return window.qfReputation.passport(id,quote.quoteId,passportContent);});

      if(quote.pdfId){const a=node('a','View quotation PDF');a.href='/api/v1/files/'+quote.pdfId;item.append(a);}if(quote.pdfWithheld)item.append(node('p','Quotation PDF withheld while contractor identities are concealed. MCST can review it.'));

      if(quote.selectable&&c.comparison.average){const sum=BigInt(c.comparison.average.numeratorCents),count=BigInt(c.comparison.average.denominator),price=BigInt(quote.amountCents);item.append(node('p',quote.name+"’s price vs Highest Quote: "+money(price-BigInt(c.comparison.highestCents))+'. Price vs Average Quote: '+money(price*count-sum,Number(count))+'. These are received-price differences.'));}

      if(open){button(item,'Prompt Contractor to Re-Quote',async()=>{await qf.submit('workspaces/'+id+'/quotes/prompt',{quoteId:quote.quoteId},c.version);status.textContent='Prompt sent. The expiry and round remain as recorded.';});}

      if(!quote.selectable)continue;
      if(c.thresholdCents===null)continue;

      const selection=node('details');selection.append(node('summary','Review selection'));item.append(selection);
      const selectionStart=Array.from(item.children);
      const warning=c.integrityPreviews?.[quote.quoteId],flagged=warning?.triggers.some(t=>!t.previouslyCleared),above=c.thresholdCents!==null&&quote.amountCents>c.thresholdCents,thresholdAck=above&&role!=='cm';
      let clearWarning,warningExplanation;
      if(warning?.triggers.length){item.append(node('p','Procurement warnings: review the exact amounts, terms and configured thresholds.'),pretty(warning.triggers));
        if(flagged&&role!=='cm'){warningExplanation=field(item,'Required explanation for warning clearance','textarea');warningExplanation.id='quote-warning-explanation-'+quote.quoteId;clearWarning=check(item,'Allow work to proceed after reviewing these exact quote and count warnings.');}}
      const disclosure=(above||flagged)&&role==='cm'?'Select '+quote.name+' for MCST approval and any required warning clearance? Quotations will pause while MCST reviews this selection. Work can begin only after approval. If MCST rejects the selection, you can choose another contractor or reopen quotations on this ticket.':'Select '+quote.name+" for this job? Your selection authorizes this contractor to proceed and closes this ticket's quotation phase. This action cannot be reversed. To select another contractor, create a new ticket.";
      const cautions=[...quote.cautions,...(c.comparison.count<3?['limited_comparison']:[])],acks=cautions.map(code=>({code,input:check(item,'I acknowledge: '+code.replaceAll('_',' '))})),rationale=field(item,'Written selection rationale','textarea');
      rationale.id='selection-rationale-'+quote.quoteId;
      item.append(node('p',disclosure));const confirmed=check(item,'I confirm selection of quote version '+quote.quoteVersion+' at '+money(quote.amountCents)+'.');

      if(above&&role==='cm')item.append(node('p','This nomination will require MCST approval. Work remains unauthorised until approved.'));

      button(item,role==='cm'?'Select this exact quote':'Select and approve this exact quote',async()=>{required(rationale,'Written selection rationale');if(!confirmed.checked||acks.some(a=>!a.input.checked))throw new Error('Confirm the exact selection and acknowledge every caution.');if(clearWarning){required(warningExplanation,'Warning clearance explanation');if(!clearWarning.checked)throw new Error('Explicitly clear the recorded warnings before authorising this work.');}const confirmationEpoch=epoch,thresholdAcknowledged=thresholdAck?await confirmThreshold(quote.amountCents,c.thresholdCents):false;if(confirmationEpoch!==epoch)throw new Error('Account or access changed. Review the current selection again.');if(thresholdAck&&!thresholdAcknowledged)return;await qf.submit('workspaces/'+id+'/select',{quoteId:quote.quoteId,quoteVersion:quote.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:c.rfqRevision,rationale:rationale.value,confirmed:confirmed.checked,reputationFingerprint:c.reputationFingerprint,acknowledgedCautions:acks.filter(a=>a.input.checked).map(a=>a.code),thresholdAcknowledged,...(clearWarning?{clearWarning:clearWarning.checked,warningExplanation:warningExplanation.value}:{})},c.version);await qf.loadJob(id,false);await qf.refreshLists();}).classList.add('primary');

      for(const child of Array.from(item.children))if(!selectionStart.includes(child))selection.append(child);
    }

    if(c.selection?.status==='pending') {
      const selected=c.history.find(h=>h.selectionId===c.selection.selection_id),warning=c.integrityPreviews?.pending;
      comparisonContent.append(node('h3','Held nomination — '+selected.name+' · '+money(selected.amountCents)),termView(selected.terms,selected.narrativeWithheld),node('p','Threshold recorded at selection: '+money(selected.thresholdCents)),node('p','Selection rationale: '+selected.rationale));
      if(warning?.triggers.length)comparisonContent.append(node('p','Warnings recorded at this exact selection:'),pretty(warning.triggers));
      if(['mcst','admin'].includes(role)) {
        const acks=selected.cautions.map(code=>({code,input:check(comparisonContent,'I acknowledge: '+code.replaceAll('_',' '))})),reason=field(comparisonContent,'Decision reason — optional for rejection','textarea'),confirmed=check(comparisonContent,'I confirm this exact pending nomination.');
        reason.id='nomination-decision-reason-'+c.selection.selection_id;
        let clearWarning,warningExplanation;
        if(warning?.triggers.some(t=>!t.previouslyCleared)){warningExplanation=field(comparisonContent,'Required explanation for clearing the exact selection warnings','textarea');clearWarning=check(comparisonContent,'Allow work to proceed after reviewing the recorded warnings.');}
        for(const outcome of ['approved','rejected'])button(comparisonContent,outcome==='approved'?'Approve and authorise work':'Reject nomination',async()=>{
          if(!confirmed.checked)throw new Error('Confirm this exact pending nomination.');if(outcome==='approved'){if(acks.some(a=>!a.input.checked))throw new Error('Acknowledge every selection caution.');if(clearWarning){required(warningExplanation,'Warning clearance explanation');if(!clearWarning.checked)throw new Error('Explicitly clear the recorded warnings before authorising work.');}}
          await qf.submit('workspaces/'+id+'/selection/decide',{selectionId:c.selection.selection_id,outcome,reason:reason.value,confirmed:confirmed.checked,acknowledgedCautions:acks.filter(a=>a.input.checked).map(a=>a.code),...(clearWarning?{clearWarning:clearWarning.checked,warningExplanation:warningExplanation.value}:{})},c.version);await qf.loadJob(id,false);await qf.refreshLists();
        });
      }
    }

    if(c.selection?.status==='rejected'){const reason=field(comparisonContent,'Reason to open a new quotation round','text');button(comparisonContent,'Reopen quotations',async()=>{required(reason,'Reason to reopen quotations');await qf.submit('workspaces/'+id+'/selection/reopen',{reason:reason.value},c.version);await qf.loadJob(id,false);await qf.refreshLists();});}

    if(open&&c.clock&&c.clock.status!=='stopped'){const at=field(comparisonContent,'Schedule the next selection review — Singapore local time','datetime-local');button(comparisonContent,'Save scheduled review',async()=>{if(!at.value)throw new Error('Choose a future review time.');await qf.submit('workspaces/'+id+'/selection/schedule',{at:new Date(at.value+':00+08:00').toISOString()},c.version);await qf.loadJob(id,false);});}

    if(c.selection?.status==='authorised'){const replacement=node('details');replacement.append(node('summary','Create a linked replacement ticket'));comparisonContent.append(replacement);const title=field(replacement,'New ticket title'),observations=field(replacement,'New private observations','textarea'),location=field(replacement,'New private affected location'),reason=field(replacement,'Replacement reason');button(replacement,'Create linked private replacement ticket',async()=>{for(const [control,name] of [[title,'New ticket title'],[observations,'New private observations'],[location,'New private affected location'],[reason,'Replacement reason']])required(control,name);const result=await qf.submit('workspaces/'+id+'/selection/replacement',{title:title.value,observations:observations.value,affectedLocation:location.value,reason:reason.value},c.version);await qf.loadJob(result.jobId,true);await qf.refreshLists();});}

    renderConversation(comparisonContent,{jobId:id},data,false,open);

    const history=node('details');history.append(node('summary','Recorded selections and frozen comparisons'),selectionHistory(c.history));comparisonContent.append(history);

    if(['admin','mcst'].includes(role)){const settings=node('details');settings.append(node('summary','Estate procurement settings'),node('p','Configure approval thresholds and CM identity visibility in the estate settings screen. Recorded selections retain their saved thresholds.'));comparisonContent.append(settings);button(settings,'Open estate procurement settings',async()=>{const estateId=qf.job.estate_id;document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen:'procurement-settings'}}));await loadProcurementSettings(estateId);});}
    if(unsent.length){window.qfUI?.restoreInputs?.(comparisonContent,unsent);status.textContent='Quotations refreshed; unsent text kept. Review current versions and confirm the cautions again.';}

  }

  document.addEventListener('qf:opportunities',e=>{for(const r of e.detail){const article=document.querySelector('[data-opportunity="'+r.jobId+'"]');if(article)button(article,'Open quote and questions',()=>openOpportunity(r));}refreshJobs().catch(e=>message.textContent=e.message);});

  document.addEventListener('qf:job',e=>{comparisonPanel.hidden=true;if(e.detail.job.stage!=='Report an issue'&&e.detail.job.stage!=='AI is refining your draft'&&e.detail.job.stage!=='Approving AI input'){comparisonPanel.hidden=false;loadComparison(e.detail.job.id).catch(error=>comparisonContent.append(node('p',error.message)));}else{comparisonContent.replaceChildren();comparisonJobId=null;}});

  document.addEventListener('qf:context',e=>{const next=e.detail?.context?[e.detail.user.id,e.detail.context.id,e.detail.accessVersion].join(':'):'';if(next===contextKey)return;contextKey=next;epoch++;opportunityLoad++;comparisonLoad++;settingsLoad++;activeOpportunity=null;comparisonJobId=null;settingsEstateId=null;settingsEditor=null;panel.hidden=true;quoteContent.replaceChildren();comparisonContent.replaceChildren();message.textContent='';document.getElementById('own-quote-jobs')?.remove();settingsPanel.hidden=!['mcst','admin'].includes(e.detail?.context?.role);settingsBody.replaceChildren();settingsStatus.textContent='';const generation=epoch;if(!settingsPanel.hidden)loadProcurementSettings().catch(error=>{if(generation===epoch)settingsStatus.textContent=error.message;});});
  document.addEventListener('qf:refresh',()=>{const generation=epoch;if(settingsEstateId&&settingsEditor&&!settingsPanel.hidden)loadProcurementEditor(settingsEditor,settingsEstateId).catch(error=>{if(generation===epoch)settingsStatus.textContent=error.message;});if(activeOpportunity&&qf.context?.context?.role==='contractor')window.qfQuotes.open(activeOpportunity.jobId,false).catch(error=>{if(generation===epoch)message.textContent=error.message;});});

  window.qfQuotes={async open(id,navigate=true){const generation=epoch,jobs=await qf.api('contractor/jobs');if(generation!==epoch)return;const job=jobs.find(j=>j.jobId===id);
    if(job)return openOpportunity({jobId:id,revision:job.rfqRevision,roundId:job.roundId,description:job.rfq.publicDescription,accessEquipmentRequired:job.rfq.accessEquipmentRequired??false},job,navigate);
    return openOpportunity(await qf.api('opportunities/'+id),undefined,navigate);}};
})();
