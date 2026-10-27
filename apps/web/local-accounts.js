const localAccountPanel=document.getElementById('local-accounts');
const localAccountButtons=document.getElementById('local-account-buttons');
const signInForm=document.querySelector('form[data-route="auth/login"]');
let localAccountRefresh=0;
let localAccountSnapshot="";
async function refreshLocalAccounts() {
  const revision=++localAccountRefresh;
  try {
    const response=await fetch('/api/v1/dev/accounts',{credentials:'same-origin',cache:'no-store'});
    if (!response.ok) {localAccountPanel.hidden=true;return;}
    const accounts=await response.json();
    if (revision!==localAccountRefresh)return;
    const snapshot=JSON.stringify(accounts);
    if(snapshot===localAccountSnapshot){localAccountPanel.hidden=false;return;}
    localAccountSnapshot=snapshot;
    localAccountButtons.replaceChildren();
    for (const account of accounts) {
      const button=document.createElement('button');
      button.type='button';
      button.textContent=account.name+' · '+account.roles;
      button.title=account.email+(account.emailVerified?'':' · Verify email before signing in');
      button.addEventListener('click',async()=>{
        button.disabled=true;
        signInForm.elements.email.value=account.email;
        signInForm.elements.password.value='';
        try {
          const result=await fetch('/api/v1/dev/accounts/autofill',{method:'POST',
            headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:account.id}),credentials:'same-origin',cache:'no-store'});
          const data=await result.json();
          if (!result.ok) throw new Error(data.error?.message||'Enter the password manually.');
          signInForm.elements.email.value=data.email;
          signInForm.elements.password.value=data.password;
          document.getElementById('status').textContent='Filled '+account.email+'.'+(account.emailVerified?' Press Sign in to continue.':' Verify email before signing in.');
          signInForm.querySelector('button').focus();
        } catch(error) {
          document.getElementById('status').textContent=error.message;
          signInForm.elements.password.focus();
        } finally {button.disabled=false;}
      });
      localAccountButtons.append(button);
    }
    localAccountPanel.hidden=false;
  } catch {localAccountPanel.hidden=true;}
}
document.getElementById('refresh-local-accounts').addEventListener('click',refreshLocalAccounts);
document.addEventListener('qf:context',event=>{if(!event.detail)refreshLocalAccounts();});
document.addEventListener('qf:accounts-changed',refreshLocalAccounts);
window.addEventListener('focus',()=>{if(!document.getElementById('guest').hidden)refreshLocalAccounts();});
refreshLocalAccounts();

setInterval(()=>{if(!document.hidden&&!document.getElementById('guest').hidden)refreshLocalAccounts();},5000);
