(() => {
  'use strict';
  const qf=window.qfWorkspace,node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const panel=node('section'),content=node('div'),status=node('p'),adminPanel=node('section');panel.hidden=true;adminPanel.hidden=true;status.setAttribute('role','status');
  panel.id='feedback-shell';adminPanel.id='reputation-admin-shell';panel.className=adminPanel.className='panel';status.setAttribute('aria-live','polite');
  panel.append(node('h2','Feedback and aftercare'),status,content);document.querySelector('main').append(panel,adminPanel);
  let epoch=0,load=0,currentId=null,contextKey='',adminLoad=0;
  const role=()=>qf.context?.context?.role,scope=()=>qf.context?.user?.id+':'+qf.context?.context?.id;
  const stamp=v=>v?new Date(v).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT':'Not issued';
  function pretty(value) {
    if(window.qfUI?.facts)return window.qfUI.facts(value);
    if(value===null||value===undefined)return node('span','Not available');
    if(typeof value!=='object')return node('span',typeof value==='boolean'?(value?'Yes':'No'):String(value));
    if(Array.isArray(value)){const list=node('ul');list.className='data-list';if(!value.length)list.append(node('li','No recorded evidence.'));for(const v of value){const item=node('li');item.append(pretty(v));list.append(item);}return list;}
    const list=node('dl');list.className='fact-list';for(const [key,v] of Object.entries(value)){const label=key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');list.append(node('dt',label.charAt(0).toUpperCase()+label.slice(1)));const item=node('dd');item.append(pretty(v));list.append(item);}return list;
  }
  const field=(p,label,type='textarea')=>{const l=node('label',label),i=node(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.maxLength=10000;l.append(i);p.append(l);return i;};
  const choice=(p,label,values)=>{const l=node('label',label),s=node('select');s.append(new Option('Choose explicitly',''),...values.map(([v,t])=>new Option(t,v)));l.append(s);p.append(l);return s;};
  const check=(p,label)=>{const l=node('label'),i=node('input');i.type='checkbox';l.append(i,document.createTextNode(label));p.append(l);return i;};
  function button(p,label,action) {const b=node('button',label),message=node('p'),born=epoch;b.type='button';message.className='action-feedback';message.setAttribute('role','status');b.onclick=async()=>{if(b.disabled||born!==epoch)return;b.disabled=true;const generation=epoch;message.textContent='Working…';try{if(!navigator.onLine)throw new Error('Connect before submitting. Your form remains unsubmitted.');await action();if(generation===epoch)message.textContent='Updated.';}catch(e){if(generation===epoch){status.textContent=e.message;message.textContent=e.message;}}finally{b.disabled=false;}};p.append(b,message);return b;}
  let feedbackTarget=content,aftercareTarget=content;
  function form(title,parent=feedbackTarget) {const d=node('details');d.className='workflow-form';d.setAttribute('data-input-scope',title);d.append(node('summary',title));parent.append(d);return d;}
  function steps(parent,id,sections) {
    if(!window.qfFlow)return;
    const children=Array.from(parent.children).filter(child=>child.tagName!=='SUMMARY');let start=0;
    window.qfFlow.wizard(parent,{id,title:id,steps:sections.map(([title,last])=>{const end=last?children.indexOf(last)+1:children.length,fields=children.slice(start,end);start=end;return {title,fields};})});
  }
  function draft(p,id,kind,version,controls) {
    const key='qf-feedback:'+scope()+':'+id+':'+kind,generation=epoch;let saved;
    try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{saved=null;}
    if(saved) {for(const [k,c] of Object.entries(controls))if(saved.fields[k]!==undefined)c.value=saved.fields[k];p.append(node('p',saved.version===version?'Saved on this device · not submitted':'Saved draft from an earlier version. Review current records before submitting.'));}
    for(const c of Object.values(controls))c.addEventListener('input',()=>{if(generation!==epoch)return;try{localStorage.setItem(key,JSON.stringify({version,fields:Object.fromEntries(Object.entries(controls).map(([k,c])=>[k,c.value]))}));}catch{status.textContent='Device draft storage is unavailable; keep this form open.';}});
    return ()=>localStorage.removeItem(key);
  }
  function rubric(p) {
    const labels=[['workmanship','Workmanship: How satisfactory was the finished repair?'],['timeliness','Timeliness: How well did the contractor keep the agreed start and finish commitments?'],['customerService','Customer service: How well did the contractor communicate and respond to the CM while working on site?'],['valueForMoney','Value for money: Considering the agreed final price and result, how good was the value?'],['recommendation','I would recommend this contractor for similar work.']];
    const controls={};for(const [k,label] of labels){controls[k]=choice(p,label,k==='recommendation'?[[1,'Strongly disagree'],[2,'Disagree'],[3,'Neutral'],[4,'Agree'],[5,'Strongly agree']]:[1,2,3,4,5].map(v=>[v,v+' stars']));controls[k].required=true;}
    p.append(node('p','Agreed schedule changes are recorded separately. Every question is required. Explain any 1–2-star or negative recommendation answer.'));
    return controls;
  }
  const answers=controls=>Object.fromEntries(Object.entries(controls).map(([k,c])=>[k,Number(c.value)]));
  function reviewed(confirmed,message='Tick the confirmation before submitting.') {if(!confirmed)throw new Error(message);}
  function validateRubric(controls,reason) {const values=answers(controls);if(Object.values(values).some(v=>!Number.isInteger(v)||v<1||v>5))throw new Error('Answer all five feedback questions.');if(Object.values(values).some(v=>v<=2)&&!reason.trim())throw new Error('Explain any 1–2-star or negative recommendation answer.');return values;}
  function durabilityInput(outcome,rating,observation,confirmed) {reviewed(confirmed);if(!['rated','unable'].includes(outcome))throw new Error('Choose whether the repair can be assessed.');if(!observation.trim())throw new Error('Enter your observation or explain why you are unable to assess.');if(outcome==='rated'&&(!Number.isInteger(Number(rating))||Number(rating)<1||Number(rating)>5))throw new Error('Choose a durability rating.');return {outcome,...(outcome==='rated'?{rating:Number(rating)}:{}),observation,confirmed};}
  const fileCache=new Map(),versions=new Map();
  const upload=window.qfWorkUploads?.create({api:qf.api,submit:qf.submit,scope,current:id=>id===currentId,online:()=>navigator.onLine,
    store:{get:async key=>fileCache.get(key),put:async row=>{fileCache.set(row.key,row);return row;},remove:async key=>fileCache.delete(key)},
    intent:(id,_purpose,body)=>role()==='contractor'?qf.submit('workspaces/'+id+'/work/uploads',body,0):qf.submit('workspaces/'+id+'/uploads',{...body,purpose:'evidence'},versions.get(id))});
  function attachment(parent,data,slot){
    if(!upload)return ()=>[];versions.set(data.jobId,data.version);
    const file=field(parent,'Optional repair evidence · PNG, JPEG or PDF up to 10 MiB','file'),message=node('p');file.accept='image/png,image/jpeg,application/pdf';parent.append(message);let ready=null,selected=false;
    file.onchange=async()=>{ready=null;selected=!!file.files?.length;if(!selected){message.textContent='No evidence selected.';return;}try{await upload.queue(data.jobId,'evidence',slot,file.files[0]);message.textContent='Selected in this session. Attach / resume before submitting.';}catch(error){message.textContent=error.message;}};
    button(parent,'Attach / resume repair evidence',async()=>{const result=await upload.resume(data.jobId,'evidence',slot);ready=result.state==='ready'?result.objects?.find(o=>o.variant==='original')?.id:null;message.textContent=ready?'Evidence is ready to include.':'File verification is '+result.state+'. Use Attach / resume to check again.';});
    const generation=epoch;upload.get?.(data.jobId,'evidence',slot)?.then(row=>{if(generation!==epoch||currentId!==data.jobId||!row)return;selected=true;ready=row.state==='ready'?row.objects?.find(o=>o.variant==='original')?.id:null;message.textContent=ready?'Attached evidence is ready to include.':'An unfinished file is retained in this session. Use Attach / resume before submitting.';}).catch(error=>{if(generation===epoch)message.textContent=error.message;});
    return ()=>{if(selected&&!ready)throw new Error('Attach and verify the selected evidence, or clear the file selection before submitting.');return ready?[ready]:[];};
  }
  async function command(data,path,body,clear) {
    if(!navigator.onLine)throw new Error('Saved drafts require an explicit online submission.');
    await qf.submit('workspaces/'+data.jobId+'/'+path,body,data.version);clear?.();const submitted=document.activeElement?.closest?.('details');if(submitted)window.qfUI?.clearDirty?.(submitted);await open(data.jobId);await qf.refreshLists();
  }
  function renderEntry(p,e,shared=false) {
    const box=node('article'),evidence=node('details');evidence.append(node('summary','Recorded answers'),pretty(e.facts));box.setAttribute('data-input-scope','reputation-entry:'+e.id);box.className=e.muted?'data-row feedback-muted':'data-row';box.append(node('h4',e.kind==='external'?'Verified external reference':e.kind==='inspection'?'Inspection feedback':'30-day durability'),node('p','Observed '+stamp(e.observedAt)),evidence);
    for(const r of e.replies)box.append(node('p','Contractor reply: '+r.body));
    if(!shared&&role()==='contractor') {const text=field(box,'Your reply — Admin reviews before shared publication');button(box,'Submit reply for review',async()=>{await qf.submit('reputation/entries/'+e.id+'/reply',{entryVersion:e.entryVersion,text:text.value},e.version);await open(currentId);});}
    p.append(box);
  }
  async function open(id) {
    const attempt=++load,generation=epoch,sameJob=currentId===id;currentId=id;
    panel.hidden=false;status.textContent='Loading current feedback and aftercare…';
    let data,finance;try{[data,finance]=await Promise.all([qf.api('workspaces/'+id+'/feedback'),qf.api('workspaces/'+id+'/completion')]);}catch(error){if(attempt!==load||generation!==epoch)return;if(error.status===404||!sameJob)content.replaceChildren(node('p',error.status===404?'Feedback and aftercare are available after this job has an authorised completion record.':'Feedback could not load. Saved drafts are preserved.'));if(error.status===404){status.textContent='';return;}throw error;}if(attempt!==load||generation!==epoch)return;
    const saved=sameJob?(window.qfUI?.captureInputs?.(content)||[]):[],adaptors=[];
    panel.hidden=false;content.replaceChildren();status.textContent='';feedbackTarget=node('section');aftercareTarget=node('section');content.append(feedbackTarget,aftercareTarget);
    button(content,'Refresh current feedback and aftercare',()=>open(id));
    if(data.obligation)feedbackTarget.append(node('p','30-day feedback · '+data.obligation.status+' · Due '+stamp(data.obligation.due_at)));
    if(data.canSubmit) {
      const f=form('Give feedback'),outcome=choice(f,'Can the repair be assessed?',[['rated','Assessable repair'],['unable','Unable to assess']]),rating=choice(f,'Durability rating — assessable repair only',[1,2,3,4,5].map(v=>[v,v+' stars'])),observation=field(f,'Observation about durability, or explanation if unable to assess');
      f.append(node('p','1–3 stars: describe wear, recurrence or another observed concern. 4–5 stars: describe what is still working. These examples are guidance. A low rating does not automatically request repair or establish liability.'));
      const clear=draft(f,id,'durability',data.version,{outcome,rating,observation}),confirmed=check(f,'I confirm this observation.');
      const adapt=()=>{rating.disabled=outcome.value!=='rated';};adaptors.push(adapt);outcome.addEventListener('change',adapt);adapt();
      button(f,'Submit feedback',()=>command(data,'feedback/submit',{obligationVersion:data.obligation.version,...durabilityInput(outcome.value,rating.value,observation.value,confirmed.checked)},clear));
      outcome.required=observation.required=true;steps(f,'durability:'+id,[['Assessment',rating.parentElement],['Observation & confirm',null]]);
    }
    const inspectedRounds=finance.rounds.filter(r=>r.outcome);
    if(['cm','mcst'].includes(role())&&inspectedRounds.length) {
      const f=form('Inspection reputation questionnaire'),controls=rubric(f),reason=field(f,'Reason for low responses, or optional observation'),existing=data.entries.find(e=>e.kind==='inspection'),correction=existing?field(f,'Reason for correcting the previous feedback'):null;
      const clear=draft(f,id,'inspection',data.version,{...controls,reason,...(correction?{correction}: {})}),confirmed=check(f,'I confirm these five feedback answers. Work acceptance is recorded separately.');
      button(f,existing?'Submit corrected questionnaire':'Submit inspection questionnaire',()=>{reviewed(confirmed.checked);if(existing&&!correction.value.trim())throw new Error('Explain why the earlier feedback is being corrected.');return command(data,'reputation/inspection',{round:inspectedRounds.at(-1).round,rubric:validateRubric(controls,reason.value),reason:reason.value,confirmed:confirmed.checked,...(existing?{entryVersion:existing.entryVersion,correctionReason:correction.value}:{})},clear);});
      steps(f,'inspection-feedback:'+id,[['Work',controls.timeliness.parentElement],['Service & value',controls.recommendation.parentElement],['Review & confirm',null]]);
    }
    for(const e of data.entries)renderEntry(feedbackTarget,e);
    const durability=data.entries.find(e=>e.kind==='durability');
    if(durability&&['cm','mcst'].includes(role())) {
      const f=form('Correct a submitted durability observation'),outcome=choice(f,'Corrected assessment outcome',[['rated','Assessable repair'],['unable','Unable to assess']]),rating=choice(f,'Corrected durability rating',[1,2,3,4,5].map(v=>[v,v+' stars'])),observation=field(f,'Corrected observation'),reason=field(f,'Why is this correction needed?');
      f.append(node('p','Corrections preserve the observation date and earlier versions. Admin reviews them again. Request aftercare separately for a new fault.'));
      const clear=draft(f,id,'durability-correction',data.version,{outcome,rating,observation,reason}),confirmed=check(f,'I confirm this corrects the same original observation.');
      const adapt=()=>{rating.disabled=outcome.value!=='rated';};adaptors.push(adapt);outcome.addEventListener('change',adapt);adapt();
      button(f,'Submit observation correction',()=>{if(!reason.value.trim())throw new Error('Explain why the observation is being corrected.');return command(data,'feedback/correct',{entryVersion:durability.entryVersion,...durabilityInput(outcome.value,rating.value,observation.value,confirmed.checked),correctionReason:reason.value},clear);});
      outcome.required=observation.required=reason.required=true;steps(f,'correct-durability:'+id,[['Assessment',rating.parentElement],['Observation & reason',reason.parentElement],['Confirm',null]]);
    }
    if(['cm','mcst'].includes(role())&&finance.completion?.confirmed_version&&!data.cases.some(c=>c.status!=='resolved')) {
      const f=form('Request aftercare / Admin Support',aftercareTarget),concern=field(f,'Observed concern'),help=field(f,'What help are you requesting?'),evidence=attachment(f,data,'aftercare-request');
      button(f,'Request aftercare',()=>{if(!concern.value.trim()||!help.value.trim())throw new Error('Describe the observed concern and the help you are requesting.');return command(data,'aftercare/request',{concern:concern.value,requestedHelp:help.value,evidenceIds:evidence()});});
      concern.required=help.required=true;steps(f,'request-aftercare:'+id,[['Concern',help.parentElement],['Evidence & send',null]]);
    }
    for(const c of data.cases) {
      const f=form('Aftercare · '+c.status,aftercareTarget);f.setAttribute('data-input-scope','aftercare:'+c.id);f.append(node('p',c.description),node('p',c.requested_help));
      for(const id of c.evidence_ids||[]){const link=node('a','View private aftercare evidence');link.href='/api/v1/files/'+encodeURIComponent(id);f.append(link);}
      if(role()==='admin'&&c.status!=='resolved') {
        const reason=field(f,'Reason and findings'),evidence=field(f,'Evidence of the decision or actual execution');
        for(const [outcome,label] of [['physical_remedy','Request physical remedy'],['explanation','Resolve with explanation only'],['resolved','Verify accepted remedy and resolve']])button(f,label,()=>command(data,'aftercare/decide',{caseId:c.id,outcome,reason:reason.value,executionEvidence:evidence.value}));
      }
      if(role()==='contractor'&&c.status==='remedy') {
        const description=field(f,'Remedy and response to findings'),completedAt=field(f,'Actual remedy completion — Singapore time','datetime-local'),evidence=attachment(f,data,'aftercare-remedy:'+c.id),confirmed=check(f,'The physical remedy is complete and ready for a fresh inspection.');
        button(f,'Submit physical remedy',()=>{reviewed(confirmed.checked,'Confirm the physical remedy is complete.');if(!completedAt.value)throw new Error('Supply actual completion time.');return command(data,'aftercare/remedy',{caseId:c.id,description:description.value,evidenceIds:evidence(),completedAt:new Date(completedAt.value+':00+08:00').toISOString(),confirmed:confirmed.checked});});
      }
      if(['cm','mcst'].includes(role())&&c.status==='inspection') {
        const findings=field(f,'Inspection findings'),scopeReviewed=check(f,'I reviewed the corrected work against the originating findings.'),evidenceReviewed=check(f,'I reviewed the available evidence.'),confirmed=check(f,'I confirm the outcome of this exact inspection round.');
        for(const outcome of ['accepted','unsatisfactory'])button(f,outcome==='accepted'?'Accept remedy':'Unsatisfactory remedy',()=>{reviewed(scopeReviewed.checked&&evidenceReviewed.checked&&confirmed.checked,'Review the corrected scope, available evidence and this exact inspection outcome.');return command(data,'aftercare/inspect',{caseId:c.id,round:c.current_round,outcome,findings:findings.value,scopeReviewed:scopeReviewed.checked,evidenceReviewed:evidenceReviewed.checked,confirmed:confirmed.checked});});
      }
    }
    for(const i of data.inspections)aftercareTarget.append(node('p','Inspection '+i.round+' · '+i.outcome+' · '+i.findings));
    if(!aftercareTarget.children.length)aftercareTarget.append(node('p','No aftercare request.'));
    if(!feedbackTarget.children.length)feedbackTarget.append(node('p','No feedback recorded.'));
    window.qfFlow?.tabs(content,{id:'feedback-pages:'+id,items:[{title:'Feedback',element:feedbackTarget},{title:'Aftercare',element:aftercareTarget}]});
    window.qfUI?.restoreInputs?.(content,saved);for(const adapt of adaptors)adapt();window.qfUI?.restoreInputs?.(content,saved);
  }
  async function admin() {
    if(role()!=='admin')return;const generation=epoch,attempt=++adminLoad;adminPanel.hidden=false;const [entries,orgs]=await Promise.all([(qf.all||qf.api)('admin/reputation'),(qf.all||qf.api)('contractors')]);if(generation!==epoch||attempt!==adminLoad)return;
    const saved=window.qfUI?.captureInputs?.(adminPanel)||[];adminPanel.hidden=false;adminPanel.replaceChildren(node('h2','Reputation moderation and external references'));button(adminPanel,'Refresh moderation',admin);
    const f=node('details');f.setAttribute('data-input-scope','new-external-reference');f.append(node('summary','Enter an independently verified external reference'));adminPanel.append(f);
    const org=choice(f,'Contractor',orgs.map(o=>[o.id,o.name])),fields={};
    fields.workDate=field(f,'Actual work date','date');fields.trade=choice(f,'Trade',[['handyman','Handyman'],['plumbing','Plumbing'],['electrical','Electrical']]);
    for(const [key,label] of [['referenceKey','Unique work reference'],['workDescription','Completed work'],['source','Source organisation'],['refereeContact','Referee contact — Admin only'],['independentChannel','Independently verified contact channel — Admin only'],['interviewEvidence','Interview evidence — Admin only'],['uncertainty','Uncertainty / limitations — Admin only']])fields[key]=field(f,label);
    const controls=rubric(f),reason=field(f,'Reason for low responses, or optional observation'),verified=check(f,'I independently verified the referee/contact and the completed work.');
    button(f,'Record reference for moderation',async()=>{const selected=orgs.find(o=>o.id===org.value);if(!selected)throw new Error('Choose a contractor.');reviewed(verified.checked,'Confirm independent verification of this external reference.');await qf.submit('admin/organisations/'+org.value+'/reputation/references',{...Object.fromEntries(Object.entries(fields).map(([k,c])=>[k,c.value])),referenceKey:fields.referenceKey.value,rubric:validateRubric(controls,reason.value),reason:reason.value,independentlyVerified:verified.checked},selected.version);await admin();});
    org.required=fields.workDate.required=fields.trade.required=true;
    steps(f,'external-reference',[['Completed work',fields.workDescription.parentElement],['Verification',fields.uncertainty.parentElement],['Work & service',controls.customerService.parentElement],['Value & recommendation',controls.recommendation.parentElement],['Review & confirm',null]]);
    if(!entries.length){const empty=node('p','No feedback or contractor replies are awaiting moderation.');empty.className='empty-state';adminPanel.append(empty);}
    for(const e of entries) {
      const box=node('details');box.setAttribute('data-input-scope','reputation:'+e.id);box.append(node('summary',e.kind+' · '+e.id+' · '+(e.moderation?.decision??'awaiting review')));adminPanel.append(box);renderEntry(box,e);
      const privateReason=field(box,'Private moderation reason'),redacted=field(box,'Replacement public text for redaction'),contested=check(box,'Durability causal attribution is contested — omit durability from scoring.');
      for(const [decision,label] of [['publish','Approve shared publication'],['reject','Withhold publication'],['void','Void scoring entry'],['redact','Publish with redacted text']])button(box,label,async()=>{await qf.submit('reputation/entries/'+e.id+'/moderate',{entryVersion:e.entryVersion,decision,reason:privateReason.value,durabilityContested:contested.checked,...(decision==='redact'?{publicText:{[e.kind==='durability'?'observation':'reason']:redacted.value}}:{})},e.version);await admin();});
      for(const r of e.replies)if(r.approved===null)for(const approved of [true,false])button(box,approved?'Approve reply':'Withhold reply',async()=>{await qf.submit('reputation/entries/'+e.id+'/moderate-reply',{replyVersion:r.version,approved,reason:privateReason.value},e.version);await admin();});
    }
    window.qfUI?.restoreInputs?.(adminPanel,saved);
  }
  function credentialBadges(badges) {
    const section=node('section');section.append(node('h5','Credential badges'));
    if(!badges.length){section.append(node('p','No verified credential badges recorded.'));return section;}
    const list=node('ul');list.className='data-list';section.append(list);
    for(const badge of badges) {
      const item=node('li'),details=node('p',badge.expired?'Expired':'Verified');item.append(node('strong',badge.name),details);
      if(badge.expiry) {
        const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(badge.expiry),date=new Date(dateOnly?badge.expiry+'T00:00:00+08:00':badge.expiry);
        const expiry=node('time',dateOnly?date.toLocaleDateString('en-SG',{timeZone:'Asia/Singapore',day:'numeric',month:'short',year:'numeric'}):stamp(badge.expiry));expiry.setAttribute('datetime',badge.expiry);
        details.append(node('span',' · Expiry '),expiry);
      } else details.append(node('span',' · No expiry recorded'));
      list.append(item);
    }
    return section;
  }
  window.qfReputation={async passport(id,quoteId,p){const generation=epoch,result=await qf.api('workspaces/'+id+'/quotes/'+quoteId+'/passport');if(generation!==epoch||qf.job?.id!==id)return;p.replaceChildren(node('h4',result.name),credentialBadges(result.badges||[]),pretty({scores:result.scores,sourceCounts:result.sourceCounts,durability:result.durability}),...result.limitations.map(s=>node('p',s)));for(const e of result.entries)renderEntry(p,e,true);}};
  document.addEventListener('qf:job',e=>{if(role()==='contractor')return;if(currentId!==e.detail.job.id){panel.hidden=true;content.replaceChildren();}open(e.detail.job.id).catch(e=>{if(e.status!==404)status.textContent=e.message;});});
  document.addEventListener('qf:work-loaded',e=>{if(role()==='contractor')open(e.detail.jobId).catch(e=>status.textContent=e.message);});
  window.qfFeedback={open};
  document.addEventListener('qf:refresh',()=>{if(currentId)open(currentId).catch(error=>status.textContent=error.message);if(role()==='admin')admin().catch(error=>status.textContent=error.message);});
  document.addEventListener('qf:context',()=>{const next=qf.context?.context?[qf.context.user.id,qf.context.context.id,role(),qf.context.accessVersion??0].join(':'):'';if(next===contextKey)return;contextKey=next;epoch++;load++;adminLoad++;currentId=null;fileCache.clear();versions.clear();panel.hidden=true;adminPanel.hidden=true;content.replaceChildren();adminPanel.replaceChildren();status.textContent='';admin().catch(e=>{status.textContent=e.message;adminPanel.append(node('p','Moderation could not be loaded. Refresh to try again.'));button(adminPanel,'Retry moderation',admin);});});
  window.addEventListener('online',()=>{if(currentId)open(currentId).catch(e=>status.textContent=e.message);});
})();
