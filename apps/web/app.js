let current = null;
let accountEpoch = 0;
let refreshSequence = 0;
const $ = id => document.getElementById(id);
const say = message => {$('status').textContent = message;};
async function request(route, body, command = false, operationId) {
  const epoch = accountEpoch;
  const headers = {'Content-Type':'application/json'};
  if (current) headers['X-CSRF-Token'] = current.csrfToken;
  if (command) {
    if(!current)throw new Error('Sign in and review this action again.');
    headers['If-Match'] = '"access-' + current.accessVersion + '"';
    headers['Idempotency-Key'] = operationId;
  }
  const response = await window.qfUI.fetch('/api/v1/' + route,{method:body===undefined?'GET':'POST',headers,credentials:'same-origin',...(body===undefined?{}:{body:JSON.stringify(body)})});
  let result;
  try{result=await response.json();}catch{throw new Error('The server returned an unreadable response. Check pending submissions before sending a changed action.');}
  if (epoch !== accountEpoch) throw Object.assign(new Error('Account changed. Review again before submitting.'),{status:409});
  if (!response.ok) {
    if(response.status===429){const wait=Number(response.headers.get('retry-after'));throw Object.assign(new Error(Number.isFinite(wait)&&wait>0?'Too many requests. Try again in '+Math.ceil(wait)+' seconds. Your input has been kept.':'Too many requests. Wait briefly, then retry. Your input has been kept.'),{status:429});}
    if(response.status===401&&current){accountEpoch++;current=null;clearInputs();document.dispatchEvent(new CustomEvent('qf:context',{detail:null}));$('guest').hidden=false;$('account').hidden=true;}
    throw Object.assign(new Error(result.error?.message || 'Unable to complete request'),{status:response.status});
  }
  return result;
}
function clearInputs() {
  document.querySelectorAll('form').forEach(form=>{form.reset();delete form.dataset.signature;delete form.dataset.operation;});
  $('accept-invite').hidden=true;$('invitation-summary').textContent='';$('member-list').replaceChildren();
}
function renderMembers(members) {
  const select=$('membership-choice');select.replaceChildren(new Option('Choose a membership',''));
  $('member-list').replaceChildren();
  for(const member of members) {
    const row=document.createElement('article');row.className='data-row';
    const title=document.createElement('strong');title.textContent=member.name+' · '+member.role.toUpperCase();
    const state=document.createElement('p');state.textContent=(member.active?'Active':'Revoked')+' · Version '+member.version;
    row.append(title,state);$('member-list').append(row);
    if(member.active)select.add(new Option(member.name+' · '+member.role.toUpperCase(),member.id));
  }
  if(!members.length)$('member-list').textContent='No memberships are available.';
  select.onchange=()=>{$('revoke').elements.membershipVersion.value=members.find(m=>m.id===select.value)?.version||'';};
}
async function refresh() {
  const previousUser=current?.user.id,epoch=accountEpoch,sequence=++refreshSequence;
  try {
    const received=await request('me/context');
    if(epoch!==accountEpoch||sequence!==refreshSequence)return;
    current=received;
  }catch(error){
    if(epoch!==accountEpoch||sequence!==refreshSequence)return;
    if(current&&error.status!==401){say(error.message+' Your unsent drafts remain separate.');return;}
    current=null;if(error.status!==401)say(error.message);
  }
  if(previousUser&&previousUser!==current?.user.id){accountEpoch++;clearInputs();}
  $('guest').hidden=!!current;$('account').hidden=!current;
  if(!current){document.dispatchEvent(new CustomEvent('qf:context',{detail:null}));say(navigator.onLine?'Sign in to continue.':'You are offline. Connect to sign in.');return;}
  $('identity').textContent=current.user.name;
  const context=current.context;
  $('context-summary').textContent=context?context.role.toUpperCase()+(context.role==='contractor'&&!context.verified?' · Verification pending. Quoting is unavailable.':''):
    (current.memberships.length?'Choose an authorised context.':'Estate access is pending.');
  $('context-label').hidden=current.memberships.length===0||(current.memberships.length===1&&!!context);$('contexts').replaceChildren();
  if(!context&&current.memberships.length)$('contexts').add(new Option('Choose context',''));
  current.memberships.forEach(m=>$('contexts').add(new Option(m.role.toUpperCase()+' · '+(m.label||m.estate_id||m.organisation_id||'Platform'),m.id)));
  if(context)$('contexts').value=context.id;
  $('pending').hidden=current.memberships.length>0;$('admin').hidden=!current.capabilities['membership.manage'];$('capabilities').textContent='';
  document.dispatchEvent(new CustomEvent('qf:context',{detail:current}));
  if(!$('admin').hidden) {
    try{
      const [estates,members]=await Promise.all([request('admin/estates'),request('admin/memberships')]);
      if(sequence!==refreshSequence||!current?.capabilities['membership.manage'])return;
      $('estates').replaceChildren(...estates.map(e=>new Option(e.name,e.id)));renderMembers(members);
    }catch(error){say('Access management could not load. '+error.message);return;}
  }
  say('Access checked. All times are Singapore time.');
}
document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.dataset.busy==='true')return;
  const command=form.hasAttribute('data-command');
  if(!navigator.onLine){say('Connect to submit. No action has been queued.');return;}
  if(!form.reportValidity())return;
  const confirmation=form.querySelector('[data-confirmation]');if(confirmation&&!confirmation.checked){say('Review and check the acknowledgment before submitting.');confirmation.focus();return;}
  const data=Object.fromEntries(new FormData(form));let route=form.dataset.route;
  if(route==='contractor/applications')data.trades=data.trades.split(',').map(s=>s.trim()).filter(Boolean);
  if(form.id==='revoke'){route='admin/memberships/'+encodeURIComponent(data.membershipId)+'/revoke';delete data.membershipId;data.membershipVersion=Number(data.membershipVersion);}
  const signature=JSON.stringify(data);
  if(form.dataset.signature!==signature){
    if(form.dataset.operation){say('An earlier submission is uncertain. Retry with the original input before changing this action.');return;}
    form.dataset.operation=crypto.randomUUID();form.dataset.signature=signature;
  }
  const button=form.querySelector('button'),feedback=form.querySelector('[data-form-status]');
  form.dataset.busy='true';button.disabled=true;form.setAttribute('aria-busy','true');if(feedback)feedback.textContent='Submitting…';
  try{
    const result=await request(route,data,command,form.dataset.operation);
    if(route==='auth/login')accountEpoch++;
    delete form.dataset.signature;delete form.dataset.operation;form.reset();await refresh();
    if(['auth/register','auth/recover/confirm'].includes(route))document.dispatchEvent(new Event('qf:accounts-changed'));
    if(route==='invitations/preview'){
      $('invitation-summary').textContent='Invitation: '+result.role.toUpperCase()+' for '+result.estateName+'. Review before accepting.';
      $('accept-invite').elements.token.value=data.token;$('accept-invite').hidden=false;
    }
    if(route==='invitations/accept'){$('accept-invite').hidden=true;$('invitation-summary').textContent='';}
    const message=result.message||'Submitted. Current access has been refreshed.';say(message);if(feedback)feedback.textContent=message;
  }catch(error){
    if(error.status&&error.status<500&&error.status!==429){delete form.dataset.signature;delete form.dataset.operation;}
    if(error.status===412)await refresh();
    const message=error.message+(!error.status||error.status>=500?' Result uncertain. Retry unchanged to check the same submission.':'');say(message);if(feedback)feedback.textContent=message;
  }finally{button.disabled=false;delete form.dataset.busy;form.removeAttribute('aria-busy');}
}));
$('logout').addEventListener('click',async()=>{
  $('logout').disabled=true;try{await request('auth/logout',{});accountEpoch++;current=null;clearInputs();await refresh();}catch(error){say(error.message);}finally{$('logout').disabled=false;}
});
$('contexts').addEventListener('change',async event=>{
  if(!event.target.value)return;$('contexts').disabled=true;
  try{await request('me/context',{membershipId:event.target.value});accountEpoch++;await refresh();}catch(error){say(error.message);}finally{$('contexts').disabled=false;}
});
window.addEventListener('online',()=>refresh());
document.addEventListener('qf:refresh',()=>refresh());
document.addEventListener('qf:access-changed',()=>refresh());
document.addEventListener('qf:session-expired',()=>{if(!current)return;accountEpoch++;current=null;clearInputs();document.dispatchEvent(new CustomEvent('qf:context',{detail:null}));$('guest').hidden=false;$('account').hidden=true;say('Your session expired. Sign in again to review your saved drafts.');});
window.addEventListener('focus',()=>{if(navigator.onLine&&!document.querySelector('dialog[open]'))refresh();});
refresh();
