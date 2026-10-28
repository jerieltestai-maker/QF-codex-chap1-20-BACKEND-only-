(function(){
  const panel=document.createElement('section'),title=document.createElement('h2'),status=document.createElement('p'),refresh=document.createElement('button'),metrics=document.createElement('div'),updated=document.createElement('p');
  panel.id='operations-health';panel.className='panel';metrics.className='metrics-strip';refresh.type='button';title.textContent='Processing health';refresh.textContent='Refresh processing health';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(title,status,refresh,updated,metrics);panel.hidden=true;
  document.querySelector('main').append(panel);let context=null,epoch=0;
  const messages={WORKER_UNHEALTHY:'Background processing is unavailable or delayed. Check the worker before retrying failed items.',FAILED_WORK:'Some processing needs attention. Fix the cause, then use the failed-item retry controls.',QUEUE_DELAY:'Ready work is waiting longer than expected.',TIMER_DELAY:'Scheduled actions are delayed. Restore the worker; do not change customer deadlines.',INITIAL_NOTICE_DELAY:'An initial notice has not issued. Its response clock must not be started manually.',MISSING_ADMIN_FOLLOW_UP:'An acknowledged unresolved Admin action lacks a dated next step.',SCAN_UNAVAILABLE:'File verification needs attention. Restore scanning before retrying; do not bypass verification.'};
  async function load(){
    const generation=epoch;if(!context||panel.hidden||refresh.disabled)return;refresh.disabled=true;
    try{const value=await window.qfWorkspace.api('admin/operations');if(generation!==epoch)return;
      status.textContent=value.alerts.length?value.alerts.map(a=>messages[a]||'Processing needs review.').join(' '):'Worker is current; no processing alerts.';
      updated.textContent='Checked '+new Date(value.serverTime).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT';metrics.replaceChildren();
      for(const [key,label,suffix] of [['pendingWork','Pending processing',''],['failedWork','Failed processing',''],['oldestWorkSeconds','Oldest ready work',' s'],['timerLagSeconds','Timer delay',' s'],['unissuedNotices','Unissued initial notices',''],['missingAdminFollowUp','Missing Admin follow-ups',''],['scanFailures','File verification failures',''],['workerAgeSeconds','Last worker success',' s ago']]){const item=document.createElement('dl'),name=document.createElement('dt'),number=document.createElement('dd');name.textContent=label;number.textContent=value.metrics[key]===null?'No heartbeat recorded':String(value.metrics[key])+suffix;item.append(name,number);metrics.append(item);}
    }catch(error){if(generation===epoch)status.textContent=error.message;}finally{if(generation===epoch)refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void load());
  document.addEventListener('qf:refresh',()=>void load());
  document.addEventListener('qf:context',event=>{epoch++;context=event.detail;panel.hidden=context?.context?.role!=='admin';status.textContent='';metrics.replaceChildren();updated.textContent='';refresh.disabled=false;if(!panel.hidden)void load();});
  setInterval(()=>{if(document.visibilityState==='visible')void load();},15000);
})();
