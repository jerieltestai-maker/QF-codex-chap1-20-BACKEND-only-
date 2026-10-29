(() => {
  'use strict';
  const qf=window.qfWorkspace,node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const dashboard=node('section'),status=node('p'),queue=node('div'),tickets=node('div'),detail=node('section'),detailStatus=node('p'),packs=node('div'),secondary=node('div');
  dashboard.id='dashboard-shell';detail.id='exports-shell';dashboard.className=detail.className='panel';queue.className='data-list';tickets.className='data-list';
  dashboard.hidden=true;detail.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');detailStatus.setAttribute('role','status');
  dashboard.append(node('h2','Work queue'),status);document.querySelector('main').insertBefore(dashboard,document.getElementById('workspace-shell'));
  detail.append(node('h2','Records'),detailStatus,packs,secondary);document.querySelector('main').append(detail);
  let epoch=0,load=0,detailLoad=0,jobId=null,offset=0,taskOffset=0,contextKey='';
  const role=()=>qf.context?.context?.role;
  const stamp=v=>v?new Date(v).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hourCycle:'h23'})+' SGT':'No deadline';
  function button(p,label,action){const b=node('button',label),message=node('p'),born=epoch;b.type='button';message.className='action-feedback';message.setAttribute('role','status');b.onclick=async()=>{if(b.disabled||born!==epoch)return;const generation=epoch;b.disabled=true;message.textContent='Loading…';try{await action();if(generation===epoch)message.textContent='';}catch(e){if(generation===epoch){status.textContent=detailStatus.textContent=e.message;message.textContent=e.message;}}finally{b.disabled=false;}};p.append(b,message);return b;}
  function navigate(screen){if(typeof CustomEvent!=='undefined')document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen}}));}
  function taskScreen(kind='') {
    if(/(?:feedback|aftercare|reputation)/.test(kind))return 'feedback';
    if(/(?:verification|credential|contractor\.application)/.test(kind))return 'verification';
    if(/(?:billing|fee\.|refund)/.test(kind))return 'billing';
    if(/integrity/.test(kind))return 'integrity';
    if(/(?:support|cancellation)/.test(kind))return 'support';
    if(/(?:completion|payment|work\.|variation|schedule)/.test(kind))return 'work';
    if(/(?:rfq|quote|selection)/.test(kind))return 'quotes';
    return 'operations';
  }
  function facts(value){
    if(window.qfUI?.facts)return window.qfUI.facts(value);
    if(value===null||value===undefined)return node('span','Not available');
    if(typeof value!=='object')return node('span',typeof value==='boolean'?(value?'Yes':'No'):String(value));
    if(Array.isArray(value)){const list=node('ul');list.className='data-list';if(!value.length)list.append(node('li','No records.'));for(const item of value){const row=node('li');row.append(facts(item));list.append(row);}return list;}
    const list=node('dl');list.className='fact-list';for(const [key,item] of Object.entries(value)){const label=key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');list.append(node('dt',label.charAt(0).toUpperCase()+label.slice(1)));const row=node('dd');row.append(facts(item));list.append(row);}return list;
  }
  function input(p,label,type='input') {const l=node('label',label),i=node(type);l.append(i);p.append(l);return i;}
  const filters=node('div'),ticketPage=node('section');filters.className='filter-bar';
  const search=input(filters,'Search repairs'),stage=input(filters,'Stage','select');
  stage.append(new Option('All stages',''),...['Report an issue','AI is refining your draft','Approving AI input','Requesting for quotes','MCST Reviewing selected Contractor','Starting work','Carrying out work','Modifying job scope','Unable to continue work',"CM's Inspecting of work",'Addressing issues','Explaining price change','Confirming invoice','Arranging payment','Unresolved payment','Confirming payment','Admin Intervention','Cancelled','Closed'].map(v=>new Option(v,v)));
  const category=input(filters,'Trade','select');category.append(new Option('All trades',''),...['handyman','plumbing','electrical'].map(v=>new Option(v,v)));
  button(filters,'Search',async()=>{offset=taskOffset=0;await refresh();});ticketPage.append(filters,tickets);dashboard.append(queue,ticketPage);
  window.qfFlow?.tabs(dashboard,{id:'queue-pages',items:[{title:'Your actions',element:queue},{title:'All repairs',element:ticketPage}]});
  search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();offset=taskOffset=0;refresh().catch(error=>status.textContent=error.message);}});
  function params(extra={}) {const p=new URLSearchParams({limit:'25',...extra});if(search.value.trim())p.set('q',search.value.trim());if(stage.value.trim())p.set('stage',stage.value.trim());if(category.value)p.set('category',category.value);return p;}
  async function refresh() {
    if(!qf.context?.context)return;const attempt=++load,generation=epoch;
    status.textContent='Loading current authorised tasks and tickets…';
    const [tasks,rows]=await Promise.all([qf.api('dashboard/tasks?'+new URLSearchParams({limit:'25',offset:String(taskOffset)})),qf.api('dashboard/tickets?'+params({offset:String(offset)}))]);
    if(attempt!==load||generation!==epoch)return;
    status.textContent=tasks.total+' outstanding actions · '+rows.total+' matching tickets';queue.replaceChildren(node('h3','Outstanding actions'));
    if(tasks.total===0&&window.qfUI?.illustration)queue.append(window.qfUI.illustration('all-caught-up'));
    if(!tasks.items.length)queue.append(node('p',tasks.total===0?'No outstanding actions for this account.':'No actions on this page. Use Previous actions to return to current work.'));
    for(const t of tasks.items) {const row=node('article');row.className='data-row';row.append(node('h4',t.action),node('p',t.ownerRole.toUpperCase()+' · '+t.nextEvent+(t.eventAt?' · '+stamp(t.eventAt):'')));
      if(t.jobId)button(row,'Review repair',async()=>{await open(t.jobId);navigate(taskScreen(t.kind));});if(t.supportId)button(row,'Review case',async()=>{await window.qfSupport.openCase(t.supportId);navigate('support');});if(!t.jobId&&!t.supportId)button(row,'Open '+({verification:'contractor verification',billing:'fee accounts',feedback:'reputation moderation',operations:'Admin follow-ups'}[taskScreen(t.kind)]||'related workflow'),()=>navigate(taskScreen(t.kind)));queue.append(row);}
    if(taskOffset>0)button(queue,'Previous actions',async()=>{taskOffset=Math.max(0,taskOffset-25);await refresh();});
    if(taskOffset+25<tasks.total)button(queue,'Next actions',async()=>{taskOffset+=25;await refresh();});
    tickets.replaceChildren(node('h3','Tickets'));
    if(!rows.items.length)tickets.append(node('p','No permitted tickets match these filters.'));
    for(const j of rows.items){const row=node('article');row.className='data-row';button(row,j.title,()=>open(j.jobId));row.append(node('p',j.stage));button(row,'Records',async()=>{await show(j.jobId);navigate('exports');});if(j.waitingOn)row.append(node('p','Waiting on '+j.waitingOn.role.toUpperCase()+': '+j.waitingOn.action));
      else if(j.pendingActions.length)row.append(node('p','Pending: '+j.pendingActions[0].ownerRole.toUpperCase()+' '+j.pendingActions[0].action));else row.append(node('p',j.kind==='eligible_opportunity'?'Open RFQ':'No action assigned to you.'));tickets.append(row);}
    if(offset>0)button(tickets,'Previous tickets',async()=>{offset=Math.max(0,offset-25);await refresh();});
    if(offset+25<rows.total)button(tickets,'Next tickets',async()=>{offset+=25;await refresh();});
  }
  async function open(id) {
    const generation=epoch;jobId=id;
    if(role()!=='contractor')await qf.loadJob(id);else {
      await window.qfQuotes.open(id);
      if(generation!==epoch||jobId!==id)return;navigate('quotes');
      const jobs=await qf.api('contractor/jobs'),own=jobs.find(j=>j.jobId===id);
      if(generation!==epoch||jobId!==id)return;
      if(own?.selection?.status==='authorised'){await window.qfWork.open(id);navigate('work');}
      else if(own&&own.stage==='Cancelled'){await window.qfSupport.openJob(id);navigate('support');}
    }
    if(generation===epoch&&jobId===id)await show(id);
  }
  async function show(id) {
    const generation=epoch,attempt=++detailLoad;jobId=id;detail.hidden=false;detailStatus.textContent='Ticket '+id;packs.replaceChildren();secondary.replaceChildren();
    const data=await qf.api('workspaces/'+id+'/exports');if(generation!==epoch||jobId!==id||attempt!==detailLoad)return;
    packs.append(node('p','Export your authorised record. Confidential conduct reports and QuoteFix fees are excluded.'));
    for(const format of ['html','json'])button(packs,'Request '+format.toUpperCase()+' decision pack',async()=>{
      // Fetch current version just before requesting; consequential workflow commands still enforce their own versions.
      const rows=await qf.api('dashboard/tickets?q='+id),row=rows.items.find(j=>j.jobId===id);if(!row)throw new Error('Ticket access changed. Refresh.');
      await qf.submit('workspaces/'+id+'/exports',{format},row.version);if(generation!==epoch||jobId!==id)return;await show(id);
    });
    button(packs,'Refresh export status',()=>show(id));
    if(!data.exports.length)packs.append(node('p','No export snapshots requested for this account.'));
    for(const e of data.exports) {const row=node('article');row.append(node('p',e.format.toUpperCase()+' · '+e.status+' · captured '+stamp(e.capturedAt)+(e.hasLaterChanges?' · Later changes exist; this snapshot is preserved.':'')));
      if(e.status==='ready') {button(row,'Download this snapshot',async()=>{const g=await qf.api('exports/'+e.exportId+'/grant',{});if(generation!==epoch||jobId!==id)return;const link=node('a','Download '+e.format.toUpperCase()+' (expires '+stamp(g.expiresAt)+')');link.href=g.url;link.download='decision-pack-'+e.exportId+'.'+e.format;row.append(link);link.click();});
        button(row,'Revoke existing download links',async()=>{await qf.api('exports/'+e.exportId+'/revoke',{});row.querySelectorAll('a').forEach(a=>a.remove());detailStatus.textContent='Existing download links revoked.';});}
      if(e.status==='failed')row.append(node('p','Generation failed. Admin can inspect the persistent processing failure queue.'));packs.append(row);}
    const history=node('div'),analytics=node('div'),historyPage=node('section'),analyticsPage=node('section');history.className=analytics.className='evidence-detail';
    button(historyPage,'Load history',async()=>{const h=await qf.all('workspaces/'+id+'/chronology','items');if(generation===epoch&&jobId===id){history.replaceChildren(node('h3','History'));for(const e of h.items){const row=node('article');row.className='data-row';row.append(node('p',(e.actor_name||e.actor_role||'System')+' · '+(e.action||'Quote version '+e.version)+' · '+stamp(e.recorded_at)+(e.reason?' · '+e.reason:'')));history.append(row);}if(!h.items.length)history.append(node('p','No permitted history recorded.'));}});
    button(analyticsPage,'Load price and outcomes',async()=>{const a=await qf.api('workspaces/'+id+'/analytics');if(generation===epoch&&jobId===id){analytics.replaceChildren(node('h3','Price and recorded outcomes'));if(a.excluded){analytics.append(node('p',a.reason));return;}analytics.append(node('p','Recorded from '+stamp(a.dateRange?.from)+' to '+stamp(a.dateRange?.to)),node('p',a.metrics?.definition||'Recorded outcomes only.'),facts(a.metrics));}});historyPage.append(history);analyticsPage.append(analytics);secondary.append(historyPage,analyticsPage);
    window.qfFlow?.tabs(detail,{id:'record-pages:'+id,items:[{title:'Decision packs',element:packs},{title:'History',element:historyPage},{title:'Price & outcomes',element:analyticsPage}]});
  }
  document.addEventListener('qf:context',()=>{const next=qf.context?.context?[qf.context.user.id,qf.context.context.id,role(),qf.context.accessVersion??0].join(':'):'';
    if(next===contextKey){if(next)refresh().catch(e=>status.textContent=e.message);return;}contextKey=next;
    epoch++;load++;detailLoad++;jobId=null;offset=taskOffset=0;search.value=stage.value=category.value='';queue.replaceChildren();tickets.replaceChildren();packs.replaceChildren();secondary.replaceChildren();detail.hidden=!qf.context?.context;detailStatus.textContent='Choose a repair to view its history, analytics and decision packs.';dashboard.hidden=!qf.context?.context;status.textContent='';if(!dashboard.hidden)refresh().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:job',e=>{show(e.detail.job.id).catch(e=>detailStatus.textContent=e.message);refresh().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:work-loaded',e=>{if(role()==='contractor'){show(e.detail.jobId).catch(e=>detailStatus.textContent=e.message);refresh().catch(e=>status.textContent=e.message);}});
  document.addEventListener('qf:lists-refreshed',()=>{if(qf.context?.context)refresh().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:refresh',()=>{if(qf.context?.context)refresh().catch(error=>status.textContent=error.message);if(jobId)show(jobId).catch(error=>detailStatus.textContent=error.message);});
})();
