(() => {
  'use strict';
  const $=id=>document.getElementById(id),main=document.querySelector('main');
  const screens={
    dashboard:{title:'Work queue',description:'The next action, the responsible person, and the repair it belongs to.',ids:['dashboard-shell']},
    workspace:{title:'Repairs',description:'Private observations, evidence, and reviewed RFQs.',ids:['workspace-shell']},
    quotes:{title:'RFQs and quotations',description:'Current opportunities, questions, visits, and exact quotation versions.',ids:['opportunities-shell','quotes-shell','comparison-shell']},
    work:{title:'Work and payment',description:'Authorised work, changes, inspection, and payment records.',ids:['work-shell']},
    support:{title:'Admin Support',description:'Requests, cancellation, and accountable follow-through.',ids:['account-support-shell','cancellation-support-shell']},
    billing:{title:'QuoteFix fees',description:'Your organisation’s fee statement and verified payments.',ids:['billing-account-shell']},
    feedback:{title:'Feedback and reputation',description:'Recorded outcomes, aftercare, and evidence behind the passport.',ids:['feedback-shell','reputation-admin-shell']},
    verification:{title:'Contractor verification',description:'Company profiles, credentials, and human eligibility review.',ids:['verification-shell']},
    'procurement-settings':{title:'Procurement settings',description:'Estate selection thresholds and contractor identity visibility.',ids:['procurement-settings-shell']},
    integrity:{title:'Review and safeguards',description:'Prospective warning settings and explicit clearance of the exact decision.',ids:['integrity-settings-shell','integrity-shell']},
    exports:{title:'History and decision packs',description:'Named history and permission-filtered snapshots for the selected repair.',ids:['exports-shell']},
    notifications:{title:'Notifications',description:'Reading a notice acknowledges the notice. The required action remains separate.',ids:['notifications-panel']},
    attention:{title:'Admin attention',description:'Urgent coordination, dated follow-ups, and processing failures.',ids:['attention-panel']},
    operations:{title:'Processing health',description:'Current worker, storage, and recovery signals.',ids:['operations-health']},
    account:{title:'Account and access',description:'Named memberships, invitations, and authorised estate access.',ids:['account']},
    guide:{title:'Evidence guide',description:'Useful photographs show the location, the fault, and the result.',ids:['evidence-guide']}
  };
  let context=null,active='dashboard',scope='',selectedJob=null;
  const illustrations={workspace:'report-issue',quotes:'compare-quotations',work:'schedule-work',support:'admin-support',billing:'platform-fees',feedback:'aftercare-feedback',verification:'contractor-verification',integrity:'council-oversight',exports:'decision-pack-export',notifications:'audit-record',attention:'admin-support',operations:'shield','procurement-settings':'council-oversight',account:'building'};
  const headingArt=window.qfUI.illustration('audit-record');headingArt.classList.add('heading-illustration');$('page-heading').prepend(headingArt);
  for(const brand of document.querySelectorAll('.brand')){const logo=window.qfUI.node('img');logo.src='/assets/quotefix-logo.png';logo.alt='QuoteFix';logo.width=180;logo.height=60;logo.className='brand-logo';brand.replaceChildren(logo);}
  const general=['dashboard','workspace','quotes','work','support','feedback','exports','notifications'];
  function permitted(screen){
    if(!context)return false;const role=context.context?.role;
    if(!role)return screen==='account';
    if(['billing','verification'].includes(screen))return ['admin','contractor'].includes(role);
    if(['attention','operations'].includes(screen))return role==='admin';
    if(['integrity','procurement-settings'].includes(screen))return ['admin','mcst'].includes(role);
    if(screen==='workspace'&&role==='contractor')return false;
    return screen in screens;
  }
  function setScreen(screen,{history=true,focus=true}={}) {
    const previous=active;
    active=permitted(screen)?screen:(context?.context?'dashboard':'account');
    if(previous!==active&&/^(Submitted\. Current access|Access checked\.)/.test($('status').textContent))$('status').textContent='';
    if(history&&context&&location.hash!=='#'+active)location.hash=active;
    sync();$('navigation').classList.remove('is-open');$('menu-toggle').setAttribute('aria-expanded','false');main.inert=false;
    if(focus&&context){$('view-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  }
  function sync(){
    const signed=!!context,config=screens[active];document.body.classList.toggle('signed-in',signed);
    $('navigation').hidden=!signed;$('page-heading').hidden=false;$('guest-heading').hidden=signed;
    if(signed&&$('page-heading').parentElement!==main)main.insertBefore($('page-heading'),$('status'));
    if(!signed&&$('page-heading').parentElement!==$('guest'))$('guest').prepend($('page-heading'));
    $('page-heading').querySelector('.heading-actions').hidden=!signed;$('connection-state').hidden=!signed;
    headingArt.hidden=!signed||!illustrations[active];if(illustrations[active])headingArt.src='/assets/'+illustrations[active]+'.png';
    $('evidence-guide').hidden=!signed;
    $('view-title').textContent=signed?config.title:'Sign in to QuoteFix';$('view-description').textContent=signed?config.description:'Use your named account to open your authorised workspace.';
    $('scope-name').textContent=context?.context?.role==='admin'?'Platform workspace':context?.context?.role==='contractor'?'Contractor workspace':context?.context?.estate_id?'Estate workspace':'Access pending';
    $('new-repair').hidden=!context?.capabilities?.['rfq.manage'];
    $('connection-state').textContent=navigator.onLine?'Connected · Singapore time':'Offline · submissions unavailable';
    for(const [name,screen] of Object.entries(screens))for(const id of screen.ids){const root=$(id);if(root){root.dataset.screen=name;root.classList.toggle('view-inactive',!signed||name!==active);if(!watched.has(root)){watched.add(root);visibility.observe(root,{attributes:true,attributeFilter:['hidden'],attributeOldValue:true});}}}
    for(const link of $('primary-nav').querySelectorAll('a')){link.hidden=!permitted(link.dataset.view);if(link.dataset.view===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
    for(const link of $('utility-nav').querySelectorAll('a')){link.hidden=!permitted(link.dataset.view);if(link.dataset.view===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
    const roots=config.ids.map($).filter(Boolean);$('view-empty').hidden=!signed||roots.some(n=>!n.hidden);
    if(!$('view-empty').hidden){$('view-empty-message').textContent=['quotes','work','exports','feedback','support','integrity'].includes(active)?'Choose a repair from your work queue to open its '+config.title.toLowerCase()+'.':'This view has no available actions in your current account context.';}
    for(const group of $('primary-nav').querySelectorAll('.nav-group'))group.hidden=!Array.from(group.querySelectorAll('a')).some(link=>!link.hidden);
    $('ticket-context').hidden=!signed||!selectedJob||!['workspace','quotes','work','support','feedback','exports','integrity'].includes(active);
  }
  for(const id of ['identity','context-summary','context-label','logout'])$('account-profile').append($(id));
  $('account').prepend(window.qfUI.node('h2','Account and access'));
  const watched=new WeakSet(),visibility=new MutationObserver(changes=>{if(changes.some(change=>change.oldValue!==change.target.getAttribute('hidden')))sync();});
  for(const [label,names] of [['Repair workflow',['dashboard','workspace','quotes','work','support']],['Records',['feedback','exports','notifications']],['Oversight',['verification','integrity','attention']],['Account and setup',['billing','procurement-settings','operations']]]){
    const group=window.qfUI.node('div'),heading=window.qfUI.node('p',label);group.className='nav-group';heading.className='nav-group-label';group.append(heading);
    for(const name of names){const link=document.createElement('a');link.href='#'+name;link.dataset.view=name;link.textContent=screens[name].title;group.append(link);}$('primary-nav').append(group);
  }
  for(const name of ['guide','account']){const link=document.createElement('a');link.href='#'+name;link.dataset.view=name;link.textContent=screens[name].title;$('utility-nav').append(link);}
  document.addEventListener('qf:context',event=>{
    const next=event.detail,key=next?[next.user.id,next.context?.id,next.accessVersion].join(':'):'';
    if(key!==scope){selectedJob=null;$('ticket-title').textContent='';scope=key;}
    context=next;
    const requested=location.hash.slice(1);setScreen(requested in screens?requested:'dashboard',{history:false,focus:false});
  });
  document.addEventListener('qf:navigate',event=>setScreen(event.detail?.screen));
  document.addEventListener('qf:job',event=>{selectedJob=event.detail.job.id;$('ticket-title').textContent=event.detail.job.title;$('ticket-stage').textContent=window.qfUI.label(event.detail.job.stage);sync();});
  window.addEventListener('hashchange',()=>{if(context)setScreen(location.hash.slice(1),{history:false});});
  $('new-repair').onclick=()=>{selectedJob=null;setScreen('workspace');$('workspace-compose').open=true;$('workspace-new').click();$('draft-title').focus();};
  $('queue-return').onclick=()=>setScreen('dashboard');
  $('retry-view').onclick=()=>document.dispatchEvent(new Event('qf:refresh'));
  const pending=window.qfUI.node('button','Check pending submissions');pending.id='check-pending';pending.type='button';pending.onclick=async()=>{pending.disabled=true;try{await window.qfWorkspace.recover();document.dispatchEvent(new Event('qf:refresh'));}catch(error){$('status').textContent=error.message;}finally{pending.disabled=false;}};$('utility-nav').after(pending);
  $('menu-toggle').onclick=()=>{const open=$('navigation').classList.toggle('is-open');$('menu-toggle').setAttribute('aria-expanded',String(open));main.inert=open;if(open)$('primary-nav').querySelector('a:not([hidden])')?.focus();};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('navigation').classList.contains('is-open')){$('navigation').classList.remove('is-open');$('menu-toggle').setAttribute('aria-expanded','false');main.inert=false;$('menu-toggle').focus();}});
  window.addEventListener('resize',()=>{if(innerWidth>800){main.inert=false;$('navigation').classList.remove('is-open');$('menu-toggle').setAttribute('aria-expanded','false');}});
  $('workspace-new').addEventListener('click',()=>{selectedJob=null;sync();});
  window.addEventListener('online',sync);window.addEventListener('offline',sync);
  new MutationObserver(sync).observe(main,{childList:true});
  for(const name of ['workspace','quotes','work','support','feedback','exports']){const button=window.qfUI.node('button',screens[name].title);button.type='button';button.onclick=()=>setScreen(name);$('ticket-actions').append(button);}
  for(const form of document.querySelectorAll('form')){const feedback=window.qfUI.node('p');feedback.dataset.formStatus='';feedback.className='form-feedback';feedback.setAttribute('role','status');form.append(feedback);}
  sync();
})();
