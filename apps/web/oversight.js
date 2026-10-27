(() => {
  'use strict';
  const qf=window.qfWorkspace,node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const dashboard=node('section'),status=node('p'),queue=node('div'),tickets=node('div'),detail=node('section'),detailStatus=node('p'),packs=node('div'),secondary=node('div');
  dashboard.hidden=true;detail.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');detailStatus.setAttribute('role','status');
  dashboard.append(node('h2','Your work queue'),status);document.querySelector('main').insertBefore(dashboard,document.getElementById('workspace-shell'));
  detail.append(node('h2','History, analytics and decision packs'),detailStatus,packs,secondary);document.querySelector('main').append(detail);
  let epoch=0,load=0,detailLoad=0,jobId=null,offset=0,taskOffset=0,contextKey='';
  const role=()=>qf.context?.context?.role;
  const stamp=v=>v?new Date(v).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT':'No deadline';
  function button(p,label,action){const b=node('button',label);b.type='button';b.onclick=async()=>{const generation=epoch;b.disabled=true;try{await action();}catch(e){if(generation===epoch)status.textContent=detailStatus.textContent=e.message;}finally{b.disabled=false;}};p.append(b);return b;}
  function input(p,label,type='input') {const l=node('label',label),i=node(type);l.append(i);p.append(l);return i;}
  const search=input(dashboard,'Search ticket ID or issue'),stage=input(dashboard,'Filter by stage (optional)');
  const category=input(dashboard,'Trade','select');category.append(new Option('All trades',''),...['handyman','plumbing','electrical'].map(v=>new Option(v,v)));
  button(dashboard,'Search / refresh queue',async()=>{offset=taskOffset=0;await refresh();});dashboard.append(queue,tickets);
  function params(extra={}) {const p=new URLSearchParams({limit:'25',...extra});if(search.value.trim())p.set('q',search.value.trim());if(stage.value.trim())p.set('stage',stage.value.trim());if(category.value)p.set('category',category.value);return p;}
  async function refresh() {
    if(!qf.context?.context)return;const attempt=++load,generation=epoch;
    status.textContent='Loading current authorised tasks and tickets…';
    const [tasks,rows]=await Promise.all([qf.api('dashboard/tasks?'+new URLSearchParams({limit:'25',offset:String(taskOffset)})),qf.api('dashboard/tickets?'+params({offset:String(offset)}))]);
    if(attempt!==load||generation!==epoch)return;
    status.textContent=tasks.total+' outstanding actions · '+rows.total+' matching tickets';queue.replaceChildren(node('h3','Outstanding actions'));
    if(!tasks.items.length)queue.append(node('p','No outstanding actions for this account context.'));
    for(const t of tasks.items) {const row=node('article');row.append(node('p','Waiting on '+t.ownerRole.toUpperCase()+': '+t.action),node('p',t.state+' · '+t.nextEvent+' · '+stamp(t.eventAt)));
      if(t.jobId)button(row,'Open ticket '+t.jobId,()=>open(t.jobId));if(t.supportId)button(row,'Open Admin Support case',()=>window.qfSupport.openCase(t.supportId));queue.append(row);}
    if(taskOffset>0)button(queue,'Previous actions',async()=>{taskOffset=Math.max(0,taskOffset-25);await refresh();});
    if(taskOffset+25<tasks.total)button(queue,'Next actions',async()=>{taskOffset+=25;await refresh();});
    tickets.replaceChildren(node('h3','Tickets'));
    if(!rows.items.length)tickets.append(node('p','No permitted tickets match these filters.'));
    for(const j of rows.items){const row=node('article');button(row,j.title+' · '+j.stage,()=>open(j.jobId));row.append(node('p','Ticket '+j.jobId));if(j.waitingOn)row.append(node('p','Waiting on '+j.waitingOn.role.toUpperCase()+': '+j.waitingOn.action));
      if(j.pendingActions.length)for(const a of j.pendingActions)row.append(node('p','Pending: '+a.ownerRole.toUpperCase()+' '+a.action));else row.append(node('p',j.kind==='eligible_opportunity'?'Eligible opportunity: review the RFQ and submit a quote.':'No action assigned to your role. Open the ticket for its current workflow.'));tickets.append(row);}
    if(offset>0)button(tickets,'Previous tickets',async()=>{offset=Math.max(0,offset-25);await refresh();});
    if(offset+25<rows.total)button(tickets,'Next tickets',async()=>{offset+=25;await refresh();});
  }
  async function open(id) {
    jobId=id;
    if(role()!=='contractor')await qf.loadJob(id);else {
      await window.qfQuotes.open(id);
      const jobs=await qf.api('contractor/jobs'),own=jobs.find(j=>j.jobId===id);
      if(own?.selection?.status==='authorised')await window.qfWork.open(id);
      else if(own)await window.qfSupport.openJob(id);
    }
    await show(id);detail.scrollIntoView({block:'start',behavior:'smooth'});
  }
  async function show(id) {
    const generation=epoch,attempt=++detailLoad;jobId=id;detail.hidden=false;detailStatus.textContent='Ticket '+id;packs.replaceChildren();secondary.replaceChildren();
    const data=await qf.api('workspaces/'+id+'/exports');if(generation!==epoch||jobId!==id||attempt!==detailLoad)return;
    packs.append(node('p','Export a snapshot for your current authorised role. HTML is printable; JSON preserves the structured record. Confidential conduct material and QuoteFix fees are excluded.'));
    for(const format of ['html','json'])button(packs,'Request '+format.toUpperCase()+' decision pack',async()=>{
      // Fetch current version just before requesting; consequential workflow commands still enforce their own versions.
      const rows=await qf.api('dashboard/tickets?q='+id),row=rows.items.find(j=>j.jobId===id);if(!row)throw new Error('Ticket access changed. Refresh.');
      await qf.submit('workspaces/'+id+'/exports',{format},row.version);if(generation!==epoch||jobId!==id)return;await show(id);
    });
    button(packs,'Refresh export status',()=>show(id));
    if(!data.exports.length)packs.append(node('p','No export snapshots requested in this account context.'));
    for(const e of data.exports) {const row=node('article');row.append(node('p',e.format.toUpperCase()+' · '+e.status+' · captured '+stamp(e.capturedAt)+(e.hasLaterChanges?' · Later changes exist; this snapshot is preserved.':'')));
      if(e.status==='ready') {button(row,'Download this snapshot',async()=>{const g=await qf.api('exports/'+e.exportId+'/grant',{});if(generation!==epoch||jobId!==id)return;const link=node('a','Download '+e.format.toUpperCase()+' (expires '+stamp(g.expiresAt)+')');link.href=g.url;link.download='decision-pack-'+e.exportId+'.'+e.format;row.append(link);link.click();});
        button(row,'Revoke existing download links',async()=>{await qf.api('exports/'+e.exportId+'/revoke',{});row.querySelectorAll('a').forEach(a=>a.remove());detailStatus.textContent='Existing download links revoked.';});}
      if(e.status==='failed')row.append(node('p','Generation failed. Admin can inspect the persistent processing failure queue.'));packs.append(row);}
    button(secondary,'Load named history',async()=>{const h=await qf.all('workspaces/'+id+'/chronology','items');if(generation===epoch&&jobId===id){const box=node('div');for(const e of h.items)box.append(node('p',(e.actor_name||e.actor_role||'System')+' · '+(e.action||'Quote version '+e.version)+' · '+stamp(e.recorded_at)+(e.reason?' · '+e.reason:'')));if(!h.items.length)box.append(node('p','No permitted history recorded.'));secondary.append(box);}});
    button(secondary,'Load price and recorded-outcome analytics',async()=>{const a=await qf.api('workspaces/'+id+'/analytics');if(generation===epoch&&jobId===id)secondary.append(node('pre',JSON.stringify(a,null,2)));});
  }
  document.addEventListener('qf:context',()=>{const next=qf.context?.context?[qf.context.user.id,qf.context.context.id,role(),qf.context.accessVersion??0].join(':'):'';
    if(next===contextKey){if(next)refresh().catch(e=>status.textContent=e.message);return;}contextKey=next;
    epoch++;load++;detailLoad++;jobId=null;offset=taskOffset=0;search.value=stage.value=category.value='';queue.replaceChildren();tickets.replaceChildren();packs.replaceChildren();secondary.replaceChildren();detail.hidden=true;dashboard.hidden=!qf.context?.context;status.textContent='';if(!dashboard.hidden)refresh().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:job',e=>{show(e.detail.job.id).catch(e=>detailStatus.textContent=e.message);refresh().catch(e=>status.textContent=e.message);});
  document.addEventListener('qf:work-loaded',e=>{if(role()==='contractor'){show(e.detail.jobId).catch(e=>detailStatus.textContent=e.message);refresh().catch(e=>status.textContent=e.message);}});
  document.addEventListener('qf:lists-refreshed',()=>{if(qf.context?.context)refresh().catch(e=>status.textContent=e.message);});
})();
