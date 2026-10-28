(() => {
  'use strict';
  const qf=window.qfWorkspace,n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const settingsPanel=n('section'),estateSettings=n('div'),status=n('p'),jobPanel=n('section'),jobBody=n('div');settingsPanel.hidden=jobPanel.hidden=true;status.setAttribute('role','status');
  settingsPanel.id='integrity-settings-shell';jobPanel.id='integrity-shell';settingsPanel.className=jobPanel.className='panel';status.setAttribute('aria-live','polite');
  settingsPanel.append(n('h2','Procurement warning settings'),status,estateSettings);document.querySelector('main').insertBefore(settingsPanel,document.getElementById('workspace-shell'));
  jobPanel.append(n('h2','MCST oversight and warning clearance'),jobBody);document.querySelector('main').append(jobPanel);
  let epoch=0,load=0,currentId=null,contextKey='';
  const role=()=>qf.context?.context?.role,permitted=()=>['mcst','admin'].includes(role());
  const stamp=v=>v?new Date(v).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT':'Not recorded';
  function field(p,label,type='textarea'){const l=n('label',label),i=n(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;l.append(i);p.append(l);return i;}
  function check(p,label){const l=n('label'),i=n('input');i.type='checkbox';l.append(i,document.createTextNode(label));p.append(l);return i;}
  function button(p,label,action){const b=n('button',label),message=n('p'),born=epoch;b.type='button';message.className='action-feedback';message.setAttribute('role','status');b.onclick=async()=>{if(born!==epoch)return;const generation=epoch;b.disabled=true;message.textContent='Working…';try{await action();if(generation===epoch)message.textContent='';}catch(e){if(generation===epoch){status.textContent=e.message;message.textContent=e.message;}}finally{if(b.isConnected)b.disabled=false;}};p.append(b,message);return b;}
  function facts(value) {
    if(window.qfUI?.facts)return window.qfUI.facts(value);
    if(value===null||value===undefined)return n('span','Not available');
    if(typeof value!=='object')return n('span',typeof value==='boolean'?(value?'Yes':'No'):String(value));
    if(Array.isArray(value)){const list=n('ul');list.className='data-list';if(!value.length)list.append(n('li','No recorded evidence.'));for(const item of value){const row=n('li');row.append(facts(item));list.append(row);}return list;}
    const list=n('dl');list.className='fact-list';for(const [key,item] of Object.entries(value)){const label=key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');list.append(n('dt',label.charAt(0).toUpperCase()+label.slice(1)));const row=n('dd');row.append(facts(item));list.append(row);}return list;
  }
  const pretty=(p,title,value)=>{const d=n('details');d.className='evidence-detail';d.append(n('summary',title),facts(value));p.append(d);return d;};
  const editorLoads=new WeakMap(),editorRoutes=new Map();
  async function editor(p,route,id) {
    const generation=epoch,attempt=(editorLoads.get(p)||0)+1;editorLoads.set(p,attempt);status.textContent='Loading current warning settings…';const s=await qf.api(route);if(generation!==epoch||editorLoads.get(p)!==attempt)return;const saved=editorRoutes.get(p)===route?(window.qfUI?.captureInputs?.(p)||[]):[];editorRoutes.set(p,route);p.setAttribute('data-input-scope',route);p.replaceChildren();status.textContent='';
    p.append(n('p',s.configured?'Saved configuration version '+s.version:'Confirm or edit the four defaults before opening an RFQ round.'));
    const controls={};for(const [key,label] of [['quoteRevisionPct','Quote revision up/down (%)'],['selectedPricePct','Selected price above lowest (%)'],['variationGrowthPct','Cumulative variation growth (%)'],['minimumQuotes','Minimum comparable quote count']]) {
      const i=field(p,label,'number');i.value=s.values[key];i.min=key==='minimumQuotes'?'1':'0';i.max=key==='minimumQuotes'?'100':'10000';i.step='1';controls[key]=i;
    }
    const reason=field(p,'Reason (required for Admin and ticket changes after bidding starts)');
    const ack=check(p,s.acknowledgment);
    const save=button(p,'Save warning settings',async()=>{
      if(!ack.checked)throw new Error('Tick the prospective-effect acknowledgment before saving.');
      for(const [key,i] of Object.entries(controls)){const value=Number(i.value);if(!i.value||!Number.isInteger(value)||value<Number(i.min)||value>Number(i.max))throw new Error(key==='minimumQuotes'?'Enter a whole comparable quote count from 1 to 100.':'Enter a whole warning percentage from 0 to 10000.');}
      await qf.submit(route,{values:Object.fromEntries(Object.entries(controls).map(([k,i])=>[k,Number(i.value)])),acknowledged:ack.checked,reason:reason.value},s.version);
      await editor(p,route,id);status.textContent='Settings saved prospectively. Earlier quotations, warnings and decisions retain their recorded parameters.';
      if(id)await qf.loadJob(id,false);
    });save.disabled=true;ack.addEventListener('change',()=>save.disabled=!ack.checked);
    window.qfUI?.restoreInputs?.(p,saved);
  }
  async function estates() {
    estateSettings.replaceChildren();if(!permitted())return;const generation=epoch;
    if(role()==='mcst')return editor(estateSettings,'estates/'+qf.context.context.estate_id+'/integrity-settings');
    const rows=await qf.api('admin/estates');if(generation!==epoch)return;
    const l=n('label','Estate warning settings'),select=n('select'),body=n('div');select.append(new Option('Choose an estate',''),...rows.map(e=>new Option(e.name,e.id)));l.append(select);estateSettings.append(l,body);
    select.onchange=()=>{body.replaceChildren();if(select.value)editor(body,'estates/'+select.value+'/integrity-settings').catch(e=>status.textContent=e.message);};
  }
  async function open(id) {
    if(!permitted())return;const attempt=++load,generation=epoch,sameJob=currentId===id;currentId=id;jobPanel.hidden=false;if(!sameJob)jobBody.replaceChildren(n('p','Loading authorised oversight evidence…'));
    const data=await qf.api('workspaces/'+id+'/integrity');if(generation!==epoch||attempt!==load||id!==currentId)return;
    const saved=sameJob?(window.qfUI?.captureInputs?.(jobBody)||[]):[];
    jobBody.replaceChildren(n('p','Ticket '+id),n('p',data.workPaused?'Ordinary work is paused until MCST explicitly clears every outstanding variation hold.':'No outstanding variation work hold.'),n('p',data.interpretation));
    const overrides=n('details'),overrideBody=n('div');overrides.append(n('summary','Ticket-only warning settings'),overrideBody);jobBody.append(overrides);
    button(overrideBody,'Load ticket-only settings',()=>editor(overrideBody,'workspaces/'+id+'/integrity-settings',id));
    for(const c of data.cards) {
      const row=n('article');row.setAttribute('data-input-scope','warning:'+c.id);row.className='data-row';row.append(n('h3',c.event_type+' · exact source version '+c.source_version),n('p','Recorded '+stamp(c.recorded_at)+' by '+c.actor_name));jobBody.append(row);
      pretty(row,'Grouped warning calculations and evidence',{policy:c.policy,triggers:c.triggers,evidence:c.evidence});
      if(c.cleared_at){row.append(n('p','Cleared by '+c.cleared_by+' · '+stamp(c.cleared_at)+' · '+c.clearance_explanation));continue;}
      const label=n('label','Review disposition'),disposition=n('select');disposition.append(new Option('Choose a disposition',''),...[['explained','Explained'],['needs_clarification','Needs clarification'],['escalated','Escalated to Admin'],['unresolved','Unresolved']].map(([v,t])=>new Option(t,v)));label.append(disposition);row.append(label);
      const note=field(row,'Review note (optional)');button(row,'Record review without clearance',async()=>{if(!disposition.value)throw new Error('Choose a review disposition. This does not clear work.');await qf.submit('workspaces/'+id+'/integrity/review',{cardId:c.id,sourceVersion:c.source_version,disposition:disposition.value,note:note.value},data.version);await qf.loadJob(id,false);});
      row.append(n('p','Recording a review disposition does not clear work, approve a pending variation or approve a nomination.'));
      const explanation=field(row,'Required explanation for allowing continuation'),confirmed=check(row,'Allow work to proceed after reviewing this exact warning and source version.');
      const clear=button(row,'Allow work to proceed',async()=>{if(!confirmed.checked||!explanation.value.trim())throw new Error('Confirm clearance and provide an explanation.');await qf.submit('workspaces/'+id+'/integrity/clear',{cardId:c.id,sourceVersion:c.source_version,explanation:explanation.value,confirmed:confirmed.checked},data.version);await qf.loadJob(id,false);await qf.refreshLists();});
      clear.disabled=true;for(const control of [confirmed,explanation])control.addEventListener('input',()=>clear.disabled=!confirmed.checked||!explanation.value.trim());
    }
    if(!data.cards.length)jobBody.append(n('p','No recorded procurement warnings on this ticket.'));
    pretty(jobBody,'Fair-information timeline',data.fairInformation);pretty(jobBody,'Decision-to-final price bridge',data.priceBridge);
    pretty(jobBody,'Admin-approved access summaries for this estate',data.accessSummaries);
    if(role()==='admin') {
      button(jobBody,'Load detailed protected-access events',async()=>{const rows=await qf.api('admin/protected-access?jobId='+id);if(generation===epoch&&currentId===id)pretty(jobBody,'Protected access (authorised viewing is not misconduct)',rows);});
      const p=n('details');p.append(n('summary','Publish a permitted access summary to MCST'));jobBody.append(p);
      const summary=field(p,'Permitted procurement summary'),confirmed=check(p,'I approve sharing this summary with MCST. It contains no protected allegations or subject-restricted information.');
      button(p,'Approve summary for MCST',async()=>{if(!confirmed.checked||!summary.value.trim())throw new Error('Enter the permitted summary and explicitly approve sharing with MCST.');await qf.submit('workspaces/'+id+'/integrity/access-summary',{summary:summary.value,confirmed:confirmed.checked},data.version);await open(id);});
    }
    window.qfUI?.restoreInputs?.(jobBody,saved);
  }
  document.addEventListener('qf:context',()=>{const next=qf.context?.context?[qf.context.user.id,qf.context.context.id,role(),qf.context.accessVersion??0].join(':'):'';if(next===contextKey)return;contextKey=next;
    epoch++;load++;currentId=null;editorRoutes.clear();estateSettings.replaceChildren();jobBody.replaceChildren();status.textContent='';settingsPanel.hidden=!permitted();jobPanel.hidden=true;if(permitted())estates().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:job',e=>{if(permitted())open(e.detail.job.id).catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:refresh',()=>{if(!permitted())return;for(const [parent,route] of editorRoutes)if(parent.isConnected&&!route.startsWith('workspaces/'))editor(parent,route).catch(error=>status.textContent=error.message);if(currentId)open(currentId).catch(error=>status.textContent=error.message);});
})();
