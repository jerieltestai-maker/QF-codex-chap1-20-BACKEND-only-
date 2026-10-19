let current = null;
let accountEpoch = 0;
const $ = id => document.getElementById(id);
const say = message => {$('status').textContent = message;};
async function request(route, body, command = false, operationId) {
  const epoch = accountEpoch;
  const headers = {'Content-Type':'application/json'};
  if (current) headers['X-CSRF-Token'] = current.csrfToken;
  if (command) {
    headers['If-Match'] = '"access-' + current.accessVersion + '"';
    headers['Idempotency-Key'] = operationId;
  }
  const response = await fetch('/api/v1/' + route,{method:body ? 'POST' : 'GET',headers,credentials:'same-origin',...(body ? {body:JSON.stringify(body)} : {})});
  const result = await response.json();
  if (epoch !== accountEpoch) {
    const error = new Error('Account changed. Review again before submitting.');
    error.status = 409; throw error;
  }
  if (!response.ok) {
    if (response.status === 401 && route !== 'me/context') {accountEpoch++;current = null; clearInputs(); await refresh();}
    const error = new Error(result.error?.message || 'Unable to complete request');
    error.status = response.status;
    throw error;
  }
  return result;
}
function clearInputs() {document.querySelectorAll('form').forEach(form=>{form.reset();delete form.dataset.signature;delete form.dataset.operation;});$('accept-invite').hidden=true;$('invitation-summary').textContent='';}
async function refresh() {
  const previousUser = current?.user.id;
  const epoch = accountEpoch;
  try {
    const received = await request('me/context');
    if (epoch !== accountEpoch) return;
    current = received;
  } catch {if (epoch !== accountEpoch) return; current = null;}
  if (previousUser && previousUser !== current?.user.id) {accountEpoch++;clearInputs();}
  $('guest').hidden = !!current;
  $('account').hidden = !current;
  if (!current) {document.dispatchEvent(new CustomEvent('qf:context',{detail:null}));say('Sign in to continue.');return;}
  $('identity').textContent = current.user.name;
  const context = current.context;
  $('context-summary').textContent = context ? 'Current role: ' + context.role.toUpperCase() +
    (context.role === 'contractor' && !context.verified ? ' · Waiting for Admin verification. Quoting is unavailable.' : '') :
    (current.memberships.length ? 'Choose an authorised context.' : 'Your email is verified. Estate access is pending.');
  $('context-label').hidden = current.memberships.length < 2;
  $('contexts').replaceChildren();
  if (!context && current.memberships.length) $('contexts').add(new Option('Choose context',''));
  current.memberships.forEach(m=>$('contexts').add(new Option(m.role.toUpperCase() + ' · ' + (m.label || m.estate_id || m.organisation_id || 'Platform'),m.id)));
  if (context) $('contexts').value = context.id;
  $('pending').hidden = current.memberships.length > 0;
  $('admin').hidden = !current.capabilities['membership.manage'];
  $('capabilities').textContent = 'Available foundation capabilities: ' + Object.entries(current.capabilities).filter(([,allowed])=>allowed).map(([name])=>name).join(', ');
  if (!$('admin').hidden) {
    const estates = await request('admin/estates');
    $('estates').replaceChildren(...estates.map(e=>new Option(e.name,e.id)));
    const members = await request('admin/memberships');
    $('member-list').textContent = JSON.stringify(members,null,2);
  }
  document.dispatchEvent(new CustomEvent('qf:context',{detail:current}));
  say('Session and current access checked.');
}
document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();
  const command = form.hasAttribute('data-command');
  if (!navigator.onLine) {say('Connect to submit. No action has been queued.');return;}
  const data = Object.fromEntries(new FormData(form));
  let route = form.dataset.route;
  if (route === 'contractor/applications') data.trades = data.trades.split(',').map(s=>s.trim()).filter(Boolean);
  if (form.id === 'revoke') {
    route = 'admin/memberships/' + encodeURIComponent(data.membershipId) + '/revoke';
    delete data.membershipId; data.membershipVersion = Number(data.membershipVersion);
  }
  // Preserve identity/body after an uncertain response. Retrying this form resolves the same operation.
  const signature = JSON.stringify(data);
  if (form.dataset.signature !== signature) {form.dataset.operation = crypto.randomUUID();form.dataset.signature = signature;}
  const operationId = form.dataset.operation;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const result = await request(route,data,command,operationId);
    if (route === 'auth/login') accountEpoch++;
    delete form.dataset.signature; delete form.dataset.operation;
    form.reset(); await refresh();
    if (['auth/register','auth/recover/confirm'].includes(route)) document.dispatchEvent(new Event('qf:accounts-changed'));
    if (route === 'invitations/preview') {
      $('invitation-summary').textContent = 'Invitation: ' + result.role.toUpperCase() + ' for ' + result.estateName + '. Review before accepting.';
      $('accept-invite').elements.token.value = data.token;
      $('accept-invite').hidden = false;
    }
    if (route === 'invitations/accept') {$('accept-invite').hidden=true;$('invitation-summary').textContent='';}
    say(result.message || 'Submitted. Current access has been refreshed.');
  } catch(error) {
    if (error.status && error.status < 500) {delete form.dataset.signature;delete form.dataset.operation;}
    if (error.status === 412) await refresh();
    say(error.message + (!error.status || error.status >= 500 ? ' Result uncertain. Retry unchanged to check the same submission.' : ''));
  } finally {button.disabled = false;}
}));
$('logout').addEventListener('click',async()=>{try {await request('auth/logout',{});accountEpoch++;current=null;clearInputs();await refresh();}catch(error){say(error.message);}});
$('contexts').addEventListener('change',async event=>{if(!event.target.value)return;try{await request('me/context',{membershipId:event.target.value});await refresh();}catch(error){say(error.message);}});
window.addEventListener('online',()=>refresh());
window.addEventListener('focus',()=>{if(navigator.onLine)refresh();});
refresh();
