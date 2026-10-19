(function(){
  const panel=document.createElement('section'),title=document.createElement('h3'),status=document.createElement('p'),refresh=document.createElement('button');
  title.textContent='Processing health';refresh.textContent='Refresh processing health';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(title,status,refresh);panel.hidden=true;
  document.getElementById('attention-panel').append(panel);let context=null,epoch=0;
  const messages={WORKER_UNHEALTHY:'Background processing is unavailable or delayed. Check the worker before retrying failed items.',FAILED_WORK:'Some processing needs attention. Fix the cause, then use the failed-item retry controls.',QUEUE_DELAY:'Ready work is waiting longer than expected.',TIMER_DELAY:'Scheduled actions are delayed. Restore the worker; do not change customer deadlines.',INITIAL_NOTICE_DELAY:'An initial notice has not issued. Its response clock must not be started manually.',MISSING_ADMIN_FOLLOW_UP:'An acknowledged unresolved Admin action lacks a dated next step.',SCAN_UNAVAILABLE:'File verification needs attention. Restore scanning before retrying; do not bypass verification.'};
  async function load(){
    const generation=epoch;if(!context||panel.hidden||refresh.disabled)return;refresh.disabled=true;
    try{const response=await fetch('/api/v1/admin/operations',{credentials:'same-origin'}),value=await response.json();if(generation!==epoch)return;if(!response.ok)throw new Error(value.error?.message||'Processing health unavailable');
      status.textContent=value.alerts.length?value.alerts.map(a=>messages[a]||'Processing needs review.').join(' '):'Worker is current; no processing alerts.';
    }catch(error){if(generation===epoch)status.textContent=error.message;}finally{if(generation===epoch)refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void load());
  document.addEventListener('qf:context',event=>{epoch++;context=event.detail;panel.hidden=context?.context?.role!=='admin';status.textContent='';refresh.disabled=false;if(!panel.hidden)void load();});
  setInterval(()=>{if(document.visibilityState==='visible')void load();},15000);
})();
