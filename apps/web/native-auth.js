const params=new URLSearchParams(location.search),challenge=params.get('challenge'),state=params.get('state');
const status=document.getElementById('status'),approve=document.getElementById('authorize'),form=document.getElementById('login');
let context=null;
async function request(path,body) {
  const result=await fetch('/api/v1/'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json',...(context?{'X-CSRF-Token':context.csrfToken}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await result.json();if(!result.ok)throw new Error(value.error?.message||'Sign-in unavailable');return value;
}
async function refresh(){try{context=await request('me/context');form.hidden=true;approve.hidden=false;status.textContent='Continue as '+context.user.name;}catch{form.hidden=false;approve.hidden=true;}}
form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await request('auth/login',Object.fromEntries(new FormData(form)));form.reset();await refresh();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
approve.addEventListener('click',async()=>{approve.disabled=true;try{const result=await request('native/authorize',{challenge,state});location.href=result.redirectUri;}catch(error){status.textContent=error.message;approve.disabled=false;}});
if(!/^[A-Za-z0-9_-]{43}$/.test(challenge||'')||!/^[A-Za-z0-9_-]{43}$/.test(state||'')){form.hidden=true;status.textContent='Invalid device sign-in request. Start again in the app.';}else void refresh();
