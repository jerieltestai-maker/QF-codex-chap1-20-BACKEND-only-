(() => {
  'use strict';
  const qf=window.qfWorkspace,node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const panel=node('section'),content=node('div'),status=node('p'),adminPanel=node('section');panel.hidden=true;adminPanel.hidden=true;status.setAttribute('role','status');
  panel.append(node('h2','Feedback and aftercare'),status,content);document.querySelector('main').append(panel,adminPanel);
  let epoch=0,load=0,currentId=null;
  const role=()=>qf.context?.context?.role,scope=()=>qf.context?.user?.id+':'+qf.context?.context?.id;
  const stamp=v=>v?new Date(v).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT':'Not issued';
  const pretty=v=>node('pre',JSON.stringify(v,null,2));
  const field=(p,label,type='textarea')=>{const l=node('label',label),i=node(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.maxLength=10000;l.append(i);p.append(l);return i;};
  const choice=(p,label,values)=>{const l=node('label',label),s=node('select');s.append(new Option('Choose explicitly',''),...values.map(([v,t])=>new Option(t,v)));l.append(s);p.append(l);return s;};
  const check=(p,label)=>{const l=node('label'),i=node('input');i.type='checkbox';l.append(i,document.createTextNode(label));p.append(l);return i;};
  function button(p,label,action) {const b=node('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;const generation=epoch;try{await action();}catch(e){if(generation===epoch)status.textContent=e.message;}finally{b.disabled=false;}};p.append(b);return b;}
  function form(title) {const d=node('details');d.append(node('summary',title));content.append(d);return d;}
  function draft(p,id,kind,version,controls) {
    const key='qf-feedback:'+scope()+':'+id+':'+kind,generation=epoch;let saved;
    try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{saved=null;}
    if(saved) {for(const [k,c] of Object.entries(controls))if(saved.fields[k]!==undefined)c.value=saved.fields[k];p.append(node('p',saved.version===version?'Saved on this device · not submitted':'Saved draft from an earlier version. Review current records before submitting.'));}
    for(const c of Object.values(controls))c.addEventListener('input',()=>{if(generation!==epoch)return;try{localStorage.setItem(key,JSON.stringify({version,fields:Object.fromEntries(Object.entries(controls).map(([k,c])=>[k,c.value]))}));}catch{status.textContent='Device draft storage is unavailable; keep this form open.';}});
    return ()=>localStorage.removeItem(key);
  }
  function rubric(p) {
    const labels=[['workmanship','Workmanship: How satisfactory was the finished repair?'],['timeliness','Timeliness: How well did the contractor keep the agreed start and finish commitments?'],['customerService','Customer service: How well did the contractor communicate and respond to the CM while working on site?'],['valueForMoney','Value for money: Considering the agreed final price and result, how good was the value?'],['recommendation','I would recommend this contractor for similar work.']];
    const controls={};for(const [k,label] of labels)controls[k]=choice(p,label,k==='recommendation'?[[1,'Strongly disagree'],[2,'Disagree'],[3,'Neutral'],[4,'Agree'],[5,'Strongly agree']]:[1,2,3,4,5].map(v=>[v,v+' stars']));
    p.append(node('p','Agreed schedule changes are recorded separately. Every question is required. Explain any 1–2-star or negative recommendation answer.'));
    return controls;
  }
  const answers=controls=>Object.fromEntries(Object.entries(controls).map(([k,c])=>[k,Number(c.value)]));
  async function command(data,path,body,clear) {
    if(!navigator.onLine)throw new Error('Saved drafts require an explicit online submission.');
    await qf.submit('workspaces/'+data.jobId+'/'+path,body,data.version);clear?.();await open(data.jobId);await qf.refreshLists();
  }
  function renderEntry(p,e,shared=false) {
    const box=node('article');if(e.muted)box.className='feedback-muted';box.append(node('h4',e.kind==='external'?'Verified external reference':e.kind==='inspection'?'Inspection feedback':'30-day durability'),node('p','Observed '+stamp(e.observedAt)),pretty(e.facts));
    for(const r of e.replies)box.append(node('p','Contractor reply: '+r.body));
    if(!shared&&role()==='contractor') {const text=field(box,'Your reply — Admin reviews before shared publication');button(box,'Submit reply for review',async()=>{await qf.submit('reputation/entries/'+e.id+'/reply',{entryVersion:e.entryVersion,text:text.value},e.version);await open(currentId);});}
    p.append(box);
  }
  async function open(id) {
    const attempt=++load,generation=epoch;currentId=id;
    const [data,finance]=await Promise.all([qf.api('workspaces/'+id+'/feedback'),qf.api('workspaces/'+id+'/completion')]);if(attempt!==load||generation!==epoch)return;
    panel.hidden=false;content.replaceChildren();status.textContent='';
    button(content,'Refresh current feedback and aftercare',()=>open(id));
    if(data.obligation)content.append(node('p','30-day feedback: '+data.obligation.status+' · Due '+stamp(data.obligation.due_at)+' · First notice '+stamp(data.obligation.first_issued_at)));
    if(data.canSubmit) {
      const f=form('Give feedback'),outcome=choice(f,'Can the repair be assessed?',[['rated','Assessable repair'],['unable','Unable to assess']]),rating=choice(f,'Durability rating — assessable repair only',[1,2,3,4,5].map(v=>[v,v+' stars'])),observation=field(f,'Observation about durability, or explanation if unable to assess');
      f.append(node('p','1–3 stars: describe wear, recurrence or another observed concern. 4–5 stars: describe what is still working. These examples are guidance. A low rating does not automatically request repair or establish liability.'));
      const clear=draft(f,id,'durability',data.version,{outcome,rating,observation}),confirmed=check(f,'I confirm this observation.');
      button(f,'Submit feedback',()=>command(data,'feedback/submit',{obligationVersion:data.obligation.version,outcome:outcome.value,...(outcome.value==='rated'?{rating:Number(rating.value)}:{}),observation:observation.value,confirmed:confirmed.checked},clear));
    }
    const inspectedRounds=finance.rounds.filter(r=>r.outcome);
    if(['cm','mcst'].includes(role())&&inspectedRounds.length) {
      const f=form('Inspection reputation questionnaire'),controls=rubric(f),reason=field(f,'Reason for low responses, or optional observation'),existing=data.entries.find(e=>e.kind==='inspection'),correction=existing?field(f,'Reason for correcting the previous feedback'):null;
      const clear=draft(f,id,'inspection',data.version,{...controls,reason,...(correction?{correction}: {})}),confirmed=check(f,'I confirm these five feedback answers. Work acceptance is recorded separately.');
      button(f,existing?'Submit corrected questionnaire':'Submit inspection questionnaire',()=>command(data,'reputation/inspection',{round:inspectedRounds.at(-1).round,rubric:answers(controls),reason:reason.value,confirmed:confirmed.checked,...(existing?{entryVersion:existing.entryVersion,correctionReason:correction.value}:{})},clear));
    }
    for(const e of data.entries)renderEntry(content,e);
    const durability=data.entries.find(e=>e.kind==='durability');
    if(durability&&['cm','mcst'].includes(role())) {
      const f=form('Correct a submitted durability observation'),outcome=choice(f,'Corrected assessment outcome',[['rated','Assessable repair'],['unable','Unable to assess']]),rating=choice(f,'Corrected durability rating',[1,2,3,4,5].map(v=>[v,v+' stars'])),observation=field(f,'Corrected observation'),reason=field(f,'Why is this correction needed?');
      f.append(node('p','This corrects the original observation and preserves its date and all earlier versions. For a new fault, request aftercare separately. Admin reviews the corrected version again.'));
      const clear=draft(f,id,'durability-correction',data.version,{outcome,rating,observation,reason}),confirmed=check(f,'I confirm this corrects the same original observation.');
      button(f,'Submit observation correction',()=>command(data,'feedback/correct',{entryVersion:durability.entryVersion,outcome:outcome.value,...(outcome.value==='rated'?{rating:Number(rating.value)}:{}),observation:observation.value,correctionReason:reason.value,confirmed:confirmed.checked},clear));
    }
    if(['cm','mcst'].includes(role())&&finance.completion?.confirmed_version&&!data.cases.some(c=>c.status!=='resolved')) {
      const f=form('Request aftercare / Admin Support'),concern=field(f,'Observed concern'),help=field(f,'What help are you requesting?');
      button(f,'Request aftercare',()=>command(data,'aftercare/request',{concern:concern.value,requestedHelp:help.value,evidenceIds:[]}));
    }
    for(const c of data.cases) {
      const f=form('Aftercare · '+c.status);f.append(node('p',c.description),node('p',c.requested_help));
      if(role()==='admin'&&c.status!=='resolved') {
        const reason=field(f,'Reason and findings'),evidence=field(f,'Evidence of the decision or actual execution');
        for(const [outcome,label] of [['physical_remedy','Request physical remedy'],['explanation','Resolve with explanation only'],['resolved','Verify accepted remedy and resolve']])button(f,label,()=>command(data,'aftercare/decide',{caseId:c.id,outcome,reason:reason.value,executionEvidence:evidence.value}));
      }
      if(role()==='contractor'&&c.status==='remedy') {
        const description=field(f,'Remedy and response to findings'),completedAt=field(f,'Actual remedy completion — Singapore time','datetime-local'),confirmed=check(f,'The physical remedy is complete and ready for a fresh inspection.');
        button(f,'Submit physical remedy',()=>{if(!completedAt.value)throw new Error('Supply actual completion time.');return command(data,'aftercare/remedy',{caseId:c.id,description:description.value,evidenceIds:[],completedAt:new Date(completedAt.value+':00+08:00').toISOString(),confirmed:confirmed.checked});});
      }
      if(['cm','mcst'].includes(role())&&c.status==='inspection') {
        const findings=field(f,'Inspection findings'),scopeReviewed=check(f,'I reviewed the corrected work against the originating findings.'),evidenceReviewed=check(f,'I reviewed the available evidence.'),confirmed=check(f,'I confirm the outcome of this exact inspection round.');
        for(const outcome of ['accepted','unsatisfactory'])button(f,outcome==='accepted'?'Accept remedy':'Unsatisfactory remedy',()=>command(data,'aftercare/inspect',{caseId:c.id,round:c.current_round,outcome,findings:findings.value,scopeReviewed:scopeReviewed.checked,evidenceReviewed:evidenceReviewed.checked,confirmed:confirmed.checked}));
      }
    }
    for(const i of data.inspections)content.append(node('p','Inspection ['+i.round+(i.round===2?'nd':i.round===3?'rd':'th')+'] · '+i.outcome+' · '+i.findings));
  }
  async function admin() {
    if(role()!=='admin')return;const generation=epoch,[entries,orgs]=await Promise.all([(qf.all||qf.api)('admin/reputation'),(qf.all||qf.api)('contractors')]);if(generation!==epoch)return;
    adminPanel.hidden=false;adminPanel.replaceChildren(node('h2','Reputation moderation and external references'));button(adminPanel,'Refresh moderation',admin);
    const f=node('details');f.append(node('summary','Enter an independently verified external reference'));adminPanel.append(f);
    const org=choice(f,'Contractor',orgs.map(o=>[o.id,o.name])),fields={};
    fields.workDate=field(f,'Actual work date','date');fields.trade=choice(f,'Trade',[['handyman','Handyman'],['plumbing','Plumbing'],['electrical','Electrical']]);
    for(const [key,label] of [['referenceKey','Unique work reference'],['workDescription','Completed work'],['source','Source organisation'],['refereeContact','Referee contact — Admin only'],['independentChannel','Independently verified contact channel — Admin only'],['interviewEvidence','Interview evidence — Admin only'],['uncertainty','Uncertainty / limitations — Admin only']])fields[key]=field(f,label);
    const controls=rubric(f),reason=field(f,'Reason for low responses, or optional observation'),verified=check(f,'I independently verified the referee/contact and the completed work.');
    button(f,'Record reference for moderation',async()=>{const selected=orgs.find(o=>o.id===org.value);if(!selected)throw new Error('Choose a contractor.');await qf.submit('admin/organisations/'+org.value+'/reputation/references',{...Object.fromEntries(Object.entries(fields).map(([k,c])=>[k,c.value])),referenceKey:fields.referenceKey.value,rubric:answers(controls),reason:reason.value,independentlyVerified:verified.checked},selected.version);await admin();});
    for(const e of entries) {
      const box=node('details');box.append(node('summary',e.kind+' · '+e.id+' · '+(e.moderation?.decision??'awaiting review')));adminPanel.append(box);renderEntry(box,e);
      const privateReason=field(box,'Private moderation reason'),redacted=field(box,'Replacement public text for redaction'),contested=check(box,'Durability causal attribution is contested — omit durability from scoring.');
      for(const [decision,label] of [['publish','Approve shared publication'],['reject','Withhold publication'],['void','Void scoring entry'],['redact','Publish with redacted text']])button(box,label,async()=>{await qf.submit('reputation/entries/'+e.id+'/moderate',{entryVersion:e.entryVersion,decision,reason:privateReason.value,durabilityContested:contested.checked,...(decision==='redact'?{publicText:{[e.kind==='durability'?'observation':'reason']:redacted.value}}:{})},e.version);await admin();});
      for(const r of e.replies)if(r.approved===null)for(const approved of [true,false])button(box,approved?'Approve reply':'Withhold reply',async()=>{await qf.submit('reputation/entries/'+e.id+'/moderate-reply',{replyVersion:r.version,approved,reason:privateReason.value},e.version);await admin();});
    }
  }
  window.qfReputation={async passport(id,quoteId,p){const generation=epoch,result=await qf.api('workspaces/'+id+'/quotes/'+quoteId+'/passport');if(generation!==epoch||qf.job?.id!==id)return;p.replaceChildren(node('h4',result.name),pretty({scores:result.scores,sourceCounts:result.sourceCounts,durability:result.durability}),...result.limitations.map(s=>node('p',s)));for(const e of result.entries)renderEntry(p,e,true);}};
  document.addEventListener('qf:job',e=>{if(role()==='contractor')return;panel.hidden=true;content.replaceChildren();open(e.detail.job.id).catch(e=>{if(e.status!==404)status.textContent=e.message;});});
  document.addEventListener('qf:work-loaded',e=>{if(role()==='contractor')open(e.detail.jobId).catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:context',()=>{epoch++;load++;currentId=null;panel.hidden=true;adminPanel.hidden=true;content.replaceChildren();adminPanel.replaceChildren();status.textContent='';admin().catch(e=>status.textContent=e.message);});
  window.addEventListener('online',()=>{if(currentId)open(currentId).catch(e=>status.textContent=e.message);});
})();
