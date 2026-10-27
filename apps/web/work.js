(() => {
  'use strict';
  const qf=window.qfWorkspace,node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const panel=node('section'),list=node('div'),content=node('div'),status=node('p');panel.hidden=true;status.setAttribute('role','status');
  panel.append(node('h2','Authorised work and variations'),list,status,content);document.querySelector('main').append(panel);
  let epoch=0,load=0,currentId=null;
  let currentVersion=0;
  const scope=()=>qf.context?.user?.id+':'+qf.context?.context?.id;
  const uploads=window.qfWorkUploads.create({api:qf.api,submit:qf.submit,scope,current:id=>currentId===id,online:()=>navigator.onLine});
  const role=()=>qf.context?.context?.role,stamp=value=>value?new Date(value).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT':'Not recorded';
  const cents=value=>{let n=BigInt(value);const sign=n<0n?'-':'';if(n<0n)n=-n;return sign+'SGD '+n/100n+'.'+String(n%100n).padStart(2,'0');};
  const local=value=>value?new Date(Date.parse(value)+8*3600000).toISOString().slice(0,16):'';
  const instant=input=>{if(!input.value)throw new Error('Supply the date and time.');return new Date(input.value+':00+08:00').toISOString();};
  function retain(parent,label,input) {
    const key=parent.dataset.draftKey;if(!key||input.type==='file')return;
    const generation=epoch,version=currentVersion;
    let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{saved=null;}
    if(saved?.fields&&Object.hasOwn(saved.fields,label))input.value=saved.fields[label];
    if(saved&&saved.version!==currentVersion&&!parent.dataset.staleDraft) {parent.dataset.staleDraft='true';parent.append(node('p','Saved draft from an earlier job version. Review the current scope, invoice and balance before submitting.'));}
    input.addEventListener('input',()=>{
      if(generation!==epoch)return;
      let latest;try{latest=JSON.parse(localStorage.getItem(key)||'null');}catch{latest=null;}
      const fields=latest?.fields||{};fields[label]=input.value;saved={version,fields};localStorage.setItem(key,JSON.stringify(saved));
    });
  }
  function field(parent,label,type='text',value='') {const wrapper=node('label',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.maxLength=10000;retain(parent,label,input);wrapper.append(input);parent.append(wrapper);return input;}
  function choice(parent,label,options,value='') {const wrapper=node('label',label),select=node('select');select.append(new Option('Choose explicitly',''),...options.map(([v,t])=>new Option(t,v)));select.value=value;retain(parent,label,select);wrapper.append(select);parent.append(wrapper);return select;}
  function check(parent,label) {const wrapper=node('label'),input=node('input');input.type='checkbox';wrapper.append(input,document.createTextNode(label));parent.append(wrapper);return input;}
  function button(parent,label,action) {const b=node('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};parent.append(b);return b;}
  function form(label) {const f=node('details');f.dataset.draftKey='qf-work-draft:'+JSON.stringify([scope(),currentId,label]);f.append(node('summary',label));content.append(f);return f;}
  const pretty=value=>{const p=node('pre');p.textContent=JSON.stringify(value,null,2);return p;};
  async function command(data,path,body,version=data.version) {
    const generation=epoch,draftKey=document.activeElement?.closest('details')?.dataset.draftKey;await qf.submit('workspaces/'+data.jobId+'/'+path,body,version);
    if(draftKey)localStorage.removeItem(draftKey);
    if(generation!==epoch)return;status.textContent='Recorded. Review the updated effective terms and history.';
    if(role()!=='contractor')await qf.loadJob(data.jobId,false);
    await open(data.jobId);await qf.refreshLists();
  }
  async function uploadEvidence(id,input) {
    const file=input.files[0];if(!file)return [];
    if(file.size>10485760)throw new Error('Use an evidence file up to 10 MiB.');
    const bytes=new Uint8Array(await file.arrayBuffer()),checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    const intent=await qf.submit('workspaces/'+id+'/work/uploads',{mediaType:file.type,byteSize:file.size,checksum},0);
    for(let offset=0;offset<bytes.length;offset+=intent.chunkLimit) {
      let binary='';for(const byte of bytes.slice(offset,offset+intent.chunkLimit))binary+=String.fromCharCode(byte);
      await qf.api('uploads/'+intent.uploadId+'/chunks',{offset,bytes:btoa(binary)});
    }
    await qf.submit('uploads/'+intent.uploadId+'/finalize',{},0);
    const result=await qf.api('uploads/'+intent.uploadId);
    if(result.state!=='ready')throw new Error('Evidence is still being checked. Upload ID '+intent.uploadId+'. Use Check uploaded evidence when ready.');
    return [result.objects.find(o=>o.variant==='original').id];
  }
  function slide(parent,label,action,valid=()=>true) {
    const wrapper=node('label',label+' — slide to confirm'),input=node('input');input.type='range';input.min='0';input.max='100';input.value='0';wrapper.append(input);parent.append(wrapper);
    input.addEventListener('change',async()=>{if(input.value!=='100')return;input.value='0';if(!valid()){status.textContent='Complete the required inputs and confirmation first.';return;}input.disabled=true;try{await action();}catch(e){status.textContent=e.message;}finally{input.disabled=false;}});
  }
  function documentUpload(parent,data,purpose,label,optional=false) {
    const input=field(parent,label,'file');input.accept='application/pdf,image/png,image/jpeg';const message=node('p');parent.append(message);
    const slot=label+':'+(data.finance.completion?.round??0);
    let ready=null,selected=false,serial=0;const generation=epoch,partition=scope();
    const valid=()=>generation===epoch&&scope()===partition&&currentId===data.jobId;
    async function show(row,attempt=serial) {
      if(!valid()||attempt!==serial)return;selected=!!row;
      if(row?.state==='ready') {
        ready=row.objects.find(o=>o.variant==='original').id;
        if(purpose==='payment_proof'&&data.finance.transfers.some(t=>t.proof_id===ready)) {await uploads.remove(data.jobId,purpose,slot);ready=null;selected=false;message.textContent='This proof already records a transfer. Choose proof for a separate transfer.';return;}
        message.textContent=label+' attached and checked.';
      } else {ready=null;message.textContent=row?label+': '+row.state+'. Saved on this device; attach / resume when connected.':'';}
    }
    input.addEventListener('change',async()=>{const attempt=++serial;ready=null;selected=!!input.files[0];try{if(input.files[0])await show(await uploads.queue(data.jobId,purpose,slot,input.files[0]),attempt);}catch(e){if(valid()&&attempt===serial)message.textContent=e.message;}});
    async function checkReady() {
      const attempt=serial;
      const row=await uploads.get(data.jobId,purpose,slot);if(!valid())return;
      await show(row?.uploadId&&navigator.onLine?await uploads.resume(data.jobId,purpose,slot):row,attempt);
    }
    button(parent,'Attach / resume '+label.toLowerCase(),async()=>{
      const attempt=serial;
      if(input.files[0])await show(await uploads.queue(data.jobId,purpose,slot,input.files[0]),attempt);
      await show(await uploads.resume(data.jobId,purpose,slot),attempt);
    });
    button(parent,'Check '+label.toLowerCase()+' attachment',checkReady);
    button(parent,'Remove '+label.toLowerCase()+' from this draft',async()=>{serial++;await uploads.remove(data.jobId,purpose,slot);ready=null;selected=false;input.value='';message.textContent='Removed from this draft. Uploaded server history is preserved.';});
    const legacyKey='qf-document:'+JSON.stringify([qf.context?.user?.id,qf.context?.context?.id,data.jobId,purpose]);
    (async()=>{let row=await uploads.get(data.jobId,purpose,slot);if(!valid())return;
      if(!row) {let legacy;try{legacy=JSON.parse(sessionStorage.getItem(legacyKey)||'null');}catch{legacy=null;}
        if(legacy?.uploadId) {row=await uploads.remember(data.jobId,purpose,slot,{...legacy,state:'verifying'});sessionStorage.removeItem(legacyKey);}}
      await show(row,0);if(serial===0&&row?.uploadId&&navigator.onLine)await checkReady();
    })().catch(e=>{if(valid())message.textContent=e.message;});
    return ()=>{if(optional&&!selected)return null;if(!ready)throw new Error('Attach and check the '+label.toLowerCase()+' first.');return ready;};
  }
  function completionForms(data) {
    const finance=data.finance,c=finance.completion,r=role(),w=data.state;
    if(!finance)return;
    content.append(node('h3','Completion, inspections and payment'));
    if(c) {
      content.append(node('p','Contractor-declared physical completion: '+stamp(c.completed_at)+' · Current round '+c.round),node('p','Invoice v'+c.invoice_version+': '+cents(c.amount_cents)+' · Authorised total: '+cents(w.amount_cents)));
      if(c.file_id){const a=node('a','View current invoice');a.href='/api/v1/files/'+c.file_id;content.append(a);}
    }
    const latest=finance.rounds.at(-1);
    if(r==='contractor'&&w.status==='active'&&!w.integrity_paused&&w.started_at&&!c?.confirmed_version&&(!c||latest?.outcome||c.scope!==w.scope)) {
      const f=form(c?'Submit corrected work':'Work is complete'),invoice=documentUpload(f,data,'invoice','Invoice'),amount=field(f,'Final GST-inclusive invoice amount SGD','text',(BigInt(w.amount_cents)/100n+'.'+String(BigInt(w.amount_cents)%100n).padStart(2,'0'))),at=field(f,'Actual physical completion — Singapore time','datetime-local'),explanation=field(f,c?'Response to originating findings / changed scope':'Invoice details / explanation','textarea');
      const confirmed=check(f,'All work is finished and the invoice is attached. This completion declaration cannot be undone. The CM will inspect the work.');
      const extra=node('details');extra.append(node('summary','Optional completion evidence'));f.append(extra);const evidence=documentUpload(extra,data,'evidence','Completion evidence',true);
      slide(f,'Submit completion and invoice together',()=>{const fileId=evidence();return command(data,'completion/submit',{invoiceFileId:invoice(),amountSgd:amount.value,completedAt:instant(at),explanation:explanation.value,evidenceIds:fileId?[fileId]:[],confirmed:confirmed.checked,...(c?{originatingRound:c.round}:{})});},()=>confirmed.checked&&!!amount.value&&!!at.value&&(!c||!!explanation.value.trim()));
      f.append(node('p','Completion photos are optional. Existing progress evidence remains available below.'));
    }
    if(c&&!latest?.outcome&&c.scope===w.scope&&['cm','mcst'].includes(r)&&w.status==='active') {
      const f=form('Inspection'+(c.round>1?' ['+c.round+(c.round===2?'nd':c.round===3?'rd':'th')+']':''));f.open=true;
      const scope=check(f,'I reviewed the agreed scope and approved variations.'),issues=check(f,'I reviewed completion and visible issues.'),evidence=check(f,'I reviewed available evidence (photos are optional).'),invoice=check(f,'I reviewed the invoice and charges.'),findings=field(f,'Specific incomplete / defective scope and findings','textarea'),satisfactory=check(f,'I agree the works are Complete and Satisfactory');
      const review=outcome=>command(data,'completion/inspect',{round:c.round,outcome,checklist:{scopeReviewed:scope.checked,issuesReviewed:issues.checked,evidenceReviewed:evidence.checked,invoiceReviewed:invoice.checked},findings:findings.value,satisfactory:satisfactory.checked,confirmed:true});
      slide(f,'Approve Works',()=>review('accepted'),()=>satisfactory.checked&&scope.checked&&issues.checked&&evidence.checked&&invoice.checked);
      button(f,'Unsatisfactory work',()=>review('unsatisfactory'));
    }
    if(c&&!c.accepted_round&&latest?.outcome==='unsatisfactory'&&r==='contractor') {
      const f=form('Respond to inspection findings');f.append(node('p',latest.findings));const response=field(f,'Response / proposed remedy','textarea');button(f,'Respond',()=>command(data,'completion/respond',{round:c.round,response:response.value}));
    }
    if(c&&!c.confirmed_version) {
      const f=form('View Reason — invoice reconciliation');f.append(node('p','Authorised total '+cents(w.amount_cents)+' · Invoice '+cents(c.amount_cents)+' · Difference '+cents(BigInt(c.amount_cents)-BigInt(w.amount_cents))),node('p',c.explanation||'No explanation recorded.'));
      if(r==='contractor') {const invoice=documentUpload(f,data,'invoice','Corrected invoice'),amount=field(f,'Corrected invoice SGD'),explanation=field(f,'Correction reason','textarea');button(f,'Submit invoice-only correction',()=>command(data,'completion/invoice',{invoiceVersion:c.invoice_version,invoiceFileId:invoice(),amountSgd:amount.value,explanation:explanation.value}));}
      if(r==='mcst'&&c.accepted_round&&BigInt(c.amount_cents)===BigInt(w.amount_cents)) {const confirmed=check(f,'I confirm this exact reconciled invoice version and amount.');button(f,'Confirm invoice',()=>command(data,'payments/confirm-invoice',{invoiceVersion:c.invoice_version,amountSgd:BigInt(c.amount_cents)/100n+'.'+String(BigInt(c.amount_cents)%100n).padStart(2,'0'),confirmed:confirmed.checked}));}
    }
    if(w.status!=='cancelled')window.qfPayments.render(data,{content,node,form,field,check,choice,button,slide,documentUpload,command,stamp,cents,instant,role:r});
    const history=form('Completion, inspection, invoice and payment history');history.append(pretty({rounds:finance.rounds,invoices:finance.invoices,confirmations:finance.confirmations,events:finance.events}));
    for(const round of finance.rounds)for(const id of round.evidence_ids||[]){const a=node('a','View completion evidence');a.href='/api/v1/files/'+id;history.append(a);}
  }
  function proposalForm(data,kind,existing) {
    const w=data.state,p=existing?.proposal,f=form(existing?'Revise proposed terms':'Propose '+(kind==='start_schedule'?'an agreed start date':kind==='completion_schedule'?'a revised completion date':'a scope / price variation'));
    const reason=field(f,'Change reason','textarea',p?.reason||''),scope=kind==='scope_price'?field(f,'Full effective scope after this change','textarea',p?.scope||w.scope):null;
    const amount=kind==='scope_price'?field(f,'New final GST-inclusive total SGD','text',p?.newTotalSgd||(BigInt(w.amount_cents)/100n+'.'+String(BigInt(w.amount_cents)%100n).padStart(2,'0'))):null;
    const timing=choice(f,'Timing impact',[['unchanged','Unchanged'],['changed','New agreed target date and time']],p?.timing||(kind==='scope_price'?'unchanged':'changed'));
    const at=field(f,kind==='start_schedule'?'Proposed start — Singapore time':'Proposed completion — Singapore time','datetime-local',local(p?.targetAt));
    const timingReason=field(f,'Reason for changed timing','textarea',p?.timingReason||'');
    const timingFields=()=>{at.parentElement.hidden=timing.value!=='changed';timingReason.parentElement.hidden=timing.value!=='changed';};timing.addEventListener('change',timingFields);timingFields();
    const feasible=choice(f,'Can the original authorised work safely and feasibly continue?',[['yes','Yes'],['no','No — needs interruption review']],p?(p.canContinueOriginal?'yes':'no'):'');
    const proposed=choice(f,'Can the proposed work safely and feasibly continue?',[['yes','Yes'],['no','No — needs interruption review']],p?(p.canContinueApproved?'yes':'no'):'');
    const confirmed=check(f,role()==='contractor'?'I confirm these exact scope, price, timing and feasibility terms.':'I confirm this request. The Contractor must confirm its terms before approval.');
    button(f,'Submit proposed terms',async()=>{
      if(!feasible.value||!proposed.value)throw new Error('Assess both original and proposed work explicitly.');
      const proposal={reason:reason.value,timing:timing.value,canContinueOriginal:feasible.value==='yes',canContinueApproved:proposed.value==='yes',...(scope?{scope:scope.value,newTotalSgd:amount.value}:{})};
      if(timing.value==='changed')Object.assign(proposal,{targetAt:instant(at),timingReason:timingReason.value});
      await command(data,'variations',{kind,proposal,confirmed:confirmed.checked,...(existing?{variationId:existing.id,proposalVersion:existing.current_version}:{})});
    });
  }
  function render(data) {
    content.replaceChildren();currentVersion=data.version;const w=data.state,r=role(),pending=data.variations.find(v=>['terms','decision'].includes(v.state));
    content.append(node('h3',w.stage+' · '+data.contractor.name),node('p',"Waiting on "+String(data.waitingOn.role).toUpperCase()+"'s action: "+data.waitingOn.action),node('p','Authorised total: '+cents(w.amount_cents)),node('p','Authorised scope: '+w.scope),node('p','Actual Start: '+stamp(w.started_at)),node('p','Completed by: '+stamp(w.completion_target_at)));
    if(w.scheduled_start_at&&!w.started_at)content.append(node('p','Scheduled: Contractor starts on '+stamp(w.scheduled_start_at)));
    if(w.unknown_reason)content.append(node('p','Initial unknown-estimate reason: '+w.unknown_reason+' · First estimate submission deadline: '+stamp(w.estimate_due_at)));
    if(w.integrity_paused) {
      content.append(node('p','Ordinary work is paused pending explicit MCST warning clearance. Withdrawing or rejecting a variation does not lift this pause.'));
      const f=form('Document necessary make-safe action'),description=field(f,'Necessary action, reason and incurred costs (does not authorise ordinary work)','textarea');
      button(f,'Record make-safe information',()=>command(data,'integrity/make-safe',{description:description.value,evidenceIds:[]}));
    }
    if(r==='contractor'&&w.status==='active'&&!w.integrity_paused&&!w.started_at) {
      const f=form('Start'),mode=choice(f,'Completion estimate',[['known','Completed by date and time'],['unknown','Unable to estimate yet — reason required']]),at=field(f,'Completed by — Singapore time','datetime-local'),reason=field(f,'Unable to estimate reason','textarea'),confirmed=check(f,'I confirm I am starting the authorised work now.');
      const b=button(f,'Start',()=>command(data,'work/start',{mode:mode.value,confirmed:confirmed.checked,...(mode.value==='known'?{completedBy:instant(at)}:{reason:reason.value})}));
      const validate=()=>{at.parentElement.hidden=mode.value!=='known';reason.parentElement.hidden=mode.value!=='unknown';b.disabled=!confirmed.checked||!(mode.value==='known'?at.value:mode.value==='unknown'&&reason.value.trim());};
      [mode,at,reason,confirmed].forEach(input=>input.addEventListener('input',validate));validate();
    }
    if(r==='contractor'&&w.status==='active'&&!w.integrity_paused&&w.started_at&&!w.completed_at) {
      if(!w.completion_target_at) {const f=form('Supply the first completion estimate'),at=field(f,'Completed by — Singapore time','datetime-local');button(f,'Supply completion estimate',()=>command(data,'work/estimate',{completedBy:instant(at)}));}
      const f=form('Add update'),note=field(f,'Optional progress note','textarea'),at=field(f,'Optional occurrence time — Singapore time','datetime-local'),photo=field(f,'Optional photo or PDF','file');photo.accept='image/png,image/jpeg,application/pdf';
      const ids=field(f,'Ready evidence file IDs (optional, comma separated)');
      const uploadId=field(f,'Upload ID to check after verification');
      button(f,'Check uploaded evidence',async()=>{const result=await qf.api('uploads/'+uploadId.value);if(result.state!=='ready')throw new Error('Evidence state: '+result.state);ids.value=result.objects.find(o=>o.variant==='original').id;status.textContent='Evidence ready; submit the update explicitly.';});
      button(f,'Add update',async()=>{const fileIds=photo.files.length?await uploadEvidence(data.jobId,photo):ids.value.split(',').map(s=>s.trim()).filter(Boolean);await command(data,'work/update',{note:note.value,fileIds,...(at.value?{occurredAt:instant(at)}:{})});});
    }
    if(r==='admin'&&w.started_at&&!w.completion_target_at&&w.status!=='cancelled') {const f=form('Extend first-estimate submission deadline'),at=field(f,'New submission deadline — Singapore time','datetime-local'),reason=field(f,'Admin extension reason','textarea');button(f,'Record estimate-deadline extension',()=>command(data,'work/estimate/extend',{dueAt:instant(at),reason:reason.value}));}
    if(!pending&&w.status!=='cancelled'&&!data.finance?.completion?.confirmed_version) {
      if(!w.started_at)proposalForm(data,'start_schedule');
      if(w.completion_target_at&&!w.completed_at)proposalForm(data,'completion_schedule');
      proposalForm(data,'scope_price');
    }
    if(pending) {
      const f=form('Pending '+pending.kind.replaceAll('_',' ')+' · version '+pending.current_version);f.open=true;const p=pending.proposal;
      f.append(node('p','Change reason: '+p.reason));
      if(pending.kind==='scope_price')f.append(node('p','Current authorised amount: '+cents(p.before.amountCents)),node('p','Proposed final GST-inclusive total: '+cents(p.newTotalCents)+' · Price change: '+cents(p.deltaCents)),node('p','Current scope: '+p.before.scope),node('p','Proposed effective scope: '+p.scope),node('p','Estate threshold: '+cents(p.thresholdCents)+' · Last MCST-approved limit: '+(p.before.mcstAuthorisedCents===null?'None':cents(p.before.mcstAuthorisedCents))));
      f.append(node('p',p.timing==='changed'?'Proposed '+(pending.kind==='start_schedule'?'start':'completion')+': '+stamp(p.targetAt)+' · '+p.timingReason:'Timing remains unchanged.'),node('p','Original work can safely and feasibly continue: '+(p.canContinueOriginal?'Yes':'No')),node('p','Proposed work can safely and feasibly continue: '+(p.canContinueApproved?'Yes':'No')));
      f.append(node('p','Pending changes authorise no extra work. Decision: '+String(pending.approver_role).toUpperCase()));
      const confirmed=check(f,'I reviewed this exact proposal version.'),reason=field(f,'Decision reason / additional detail','textarea'),reasonCode=choice(f,'Rejection reason',[['price','Price'],['scope','Scope'],['timing','Timing'],['not_needed','Not needed'],['other','Other — explanation required']]);
      if(r==='contractor'&&pending.state==='terms')button(f,'Confirm change of terms',()=>command(data,'variations/confirm',{variationId:pending.id,proposalVersion:pending.current_version,confirmed:confirmed.checked}));
      const warnings=pending.integrityPreview?.triggers??[];
      let clearWarning,warningExplanation;
      if(warnings.length){f.append(node('p','Procurement warnings require explicit MCST clearance. Proposed work remains unauthorised.'),node('pre',JSON.stringify(warnings,null,2)));
        if(['mcst','admin'].includes(r)){warningExplanation=field(f,'Explanation for clearing these exact warnings','textarea');clearWarning=check(f,'Allow work to proceed after reviewing these exact warning calculations.');}}
      const decide=outcome=>command(data,'variations/decide',{variationId:pending.id,proposalVersion:pending.current_version,outcome,confirmed:confirmed.checked,reason:reason.value,...(clearWarning?{clearWarning:clearWarning.checked,warningExplanation:warningExplanation.value}:{}),...(outcome==='rejected'?{reasonCode:reasonCode.value}:{})});
      if(pending.state==='decision'&&[pending.approver_role,'mcst','admin'].includes(r)) {button(f,pending.kind==='scope_price'?'Approve variation':'Okay — accept this exact date',()=>decide('approved'));button(f,'Reject variation',()=>decide('rejected'));button(f,'Admin Intervention',()=>decide('intervention'));}
      if(pending.canWithdraw)button(f,'Withdraw proposal',()=>decide('withdrawn'));
      if(pending.canRevise)proposalForm(data,pending.kind,pending);
    }
    if(w.status!=='cancelled'&&!data.finance?.completion?.confirmed_version) {
      const f=form('Unable to continue work / access problem'),reason=field(f,'Reason and safety / access issue','textarea'),affectedWork=field(f,'Affected work','textarea');button(f,'Request interruption review',()=>command(data,'work/interrupt',{reason:reason.value,affectedWork:affectedWork.value}));
    }
    if(r==='admin'&&w.status==='interrupted') {
      const f=form("Admin's verdict"),reason=field(f,'Verdict and reason','textarea'),safe=check(f,'Authorised work can safely and feasibly resume.'),action=field(f,'Next action for unresolved work'),owner=choice(f,'Actual next actor',[['admin','Admin'],['cm','CM'],['mcst','MCST'],['contractor','Contractor']]),at=field(f,'Dated follow-up — Singapore time','datetime-local');
      button(f,'Record explicit resumption',()=>command(data,'work/verdict',{outcome:'resume',reason:reason.value,safeAndFeasible:safe.checked}));
      button(f,'Keep unresolved with dated action',()=>command(data,'work/verdict',{outcome:'follow_up',reason:reason.value,safeAndFeasible:false,nextAction:action.value,ownerRole:owner.value,followUpAt:instant(at)}));
    }
    for(const notice of data.notices.filter(n=>n.owner_role===r&&['work.T20.estate','work.T23.estate'].includes(n.kind))) {
      const f=form(notice.action),reason=field(f,'Reason for requested support','textarea');
      button(f,'Okay — acknowledge notice only',()=>command(data,'work/notice',{taskId:notice.id,outcome:'okay'},notice.version));
      button(f,'Admin Intervention',()=>command(data,'work/notice',{taskId:notice.id,outcome:'intervention',reason:reason.value},notice.version));
    }
    completionForms(data);
    const history=form('Dated work history and every variation version');history.append(pretty({events:data.events,terms:data.terms,proposals:data.variationVersions,decisions:data.decisions}));
    for(const file of data.evidence||[]){const a=node('a','View attached repair evidence · '+file.variant);a.href='/api/v1/files/'+file.id;history.append(a);}
    for(const e of data.events)for(const id of e.details?.fileIds||[]){const a=node('a','View progress evidence');a.href='/api/v1/files/'+id;history.append(a);}
  }
  async function open(id) {
    const attempt=++load,generation=epoch;currentId=id;let data,finance;
    for(let retries=0;retries<3;retries++) {
      [data,finance]=await Promise.all([qf.api('workspaces/'+id+'/work'),qf.api('workspaces/'+id+'/completion')]);
      if(attempt!==load||generation!==epoch)return;if(data.version===finance.version)break;
    }
    if(data.version!==finance.version)throw new Error('This job changed while loading. Reopen it to review the current completion and payment records.');data.finance=finance;
    if(attempt!==load||generation!==epoch)return;panel.hidden=false;render(data);document.dispatchEvent(new CustomEvent('qf:work-loaded',{detail:{jobId:id}}));
  }
  async function jobs() {
    const generation=epoch;if(role()!=='contractor')return;
    const records=await qf.api('contractor/jobs');if(generation!==epoch)return;
    const assigned=records.filter(j=>j.selection?.status==='authorised');panel.hidden=!assigned.length;list.replaceChildren(node('h3','Your authorised jobs'));
    for(const job of assigned)button(list,job.rfq.publicDescription,()=>open(job.jobId));
  }
  document.addEventListener('qf:job',e=>{if(role()==='contractor')return;content.replaceChildren();panel.hidden=true;open(e.detail.job.id).catch(error=>{if(error.status!==404)status.textContent=error.message;});});
  document.addEventListener('qf:context',()=>{epoch++;load++;currentId=null;content.replaceChildren();list.replaceChildren();status.textContent='';panel.hidden=true;jobs().catch(error=>status.textContent=error.message);});
  document.addEventListener('qf:opportunities',()=>jobs().catch(error=>status.textContent=error.message));
  window.qfWork={open};
  window.addEventListener('online',()=>{if(currentId)open(currentId).catch(error=>status.textContent=error.message);});
})();
