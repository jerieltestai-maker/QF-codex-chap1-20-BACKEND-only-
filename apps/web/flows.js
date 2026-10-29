(() => {
  'use strict';
  const memory=new Map(),controllers=new WeakMap();let scope='',serial=0;
  const node=(tag,text)=>window.qfUI.node(tag,text);
  const route=()=>new URLSearchParams(location.hash.split('?')[1]||'');
  const position=(id,kind,fallback=0)=>{const params=route();return params.get(kind)==id?Number(params.get(kind==='flow'?'step':'tab')||1)-1:(memory.get(kind+':'+id)??fallback);};
  function writeRoute(kind,id,index){
    const params=route();params.set(kind,id);params.set(kind==='flow'?'step':'tab',String(index+1));
    const url=location.pathname+location.search+(location.hash.split('?')[0]||'#dashboard')+'?'+params;
    if(url!==location.pathname+location.search+location.hash)history.pushState(null,'',url);
  }
  function resetRoute(kind,id,index){const params=route();if(params.get(kind)!==id)return;params.set(kind==='flow'?'step':'tab',String(index+1));history.replaceState(null,'',location.pathname+location.search+location.hash.split('?')[0]+'?'+params);}
  function reveal(control){
    for(let parent=control.parentElement;parent;parent=parent.parentElement){
      if(parent.tagName==='DETAILS')parent.open=true;
      controllers.get(parent)?.reveal(control);
    }
  }
  function relevant(control,page){
    if(control.disabled||control.type==='hidden')return false;
    for(let p=control.parentElement;p&&p!==page;p=p.parentElement)if(p.hidden)return false;
    return true;
  }
  function invalid(page){return Array.from(page.querySelectorAll('input,select,textarea')).find(c=>relevant(c,page)&&c.validity&&!c.validity.valid);}
  function wizard(container,{id,title='Steps',steps=[]}){
    if(!container||steps.length<2)return null;
    const existing=controllers.get(container);
    if(existing?.frame&&container.contains(existing.frame))return existing;
    existing?.destroy?.({restore:false});
    id=id||'flow-'+(++serial);
    const frame=node('div'),nav=node('nav'),pages=node('div'),footer=node('div'),back=node('button','Back'),next=node('button','Continue'),status=node('p');
    frame.className='qf-wizard';frame.dataset.flow=id;nav.className='qf-steps';nav.setAttribute('aria-label',title);footer.className='qf-step-actions';status.className='qf-step-status';status.setAttribute('aria-live','polite');
    back.type=next.type='button';next.className='primary';footer.append(back,status,next);frame.append(nav,pages,footer);
    let current=0;
    const entries=steps.map((step,i)=>{
      const page=node('section'),heading=node('h3',step.title),button=node('button');
      page.id='qf-step-'+(++serial);page.className='qf-step-page';page.setAttribute('aria-label',step.title);heading.tabIndex=-1;
      button.type='button';button.append(node('span',String(i+1)),node('span',step.title));button.setAttribute('aria-controls',page.id);
      page.append(heading,...step.fields.filter(Boolean));pages.append(page);nav.append(button);
      button.onclick=()=>goTo(i,{validate:true,focus:true,url:true});return {page,button,heading};
    });
    // Keep status messages and the disclosure's summary outside step pages.
    const summary=container.querySelector(':scope > summary');if(summary)summary.after(frame);else container.prepend(frame);
    const show=(i,{focus=false,url=false}={})=>{
      current=Math.max(0,Math.min(entries.length-1,Number.isFinite(i)?i:0));memory.set('flow:'+id,current);
      entries.forEach((entry,n)=>{entry.page.hidden=n!==current;entry.button.setAttribute('aria-current',n===current?'step':'false');entry.button.classList.toggle('is-complete',n<current);});
      back.hidden=current===0;next.hidden=current===entries.length-1;status.textContent='Step '+(current+1)+' of '+entries.length;
      if(url)writeRoute('flow',id,current);if(focus)entries[current].heading.focus();
    };
    function goTo(i,{validate=false,focus=true,url=false}={}){
      if(validate&&i>current){for(let n=0;n<i;n++){const bad=invalid(entries[n].page);if(bad){show(n);reveal(bad);bad.reportValidity();bad.focus();return false;}}}
      show(i,{focus,url});return true;
    }
    back.onclick=()=>goTo(current-1,{url:true});next.onclick=()=>goTo(current+1,{validate:true,url:true});
    const onKey=event=>{if(event.key==='Enter'&&current<entries.length-1&&event.target.matches('input:not([type=button]):not([type=submit])')){event.preventDefault();goTo(current+1,{validate:true,url:true});}};
    const onSubmit=event=>{for(let i=0;i<entries.length;i++){const bad=invalid(entries[i].page);if(bad){event.preventDefault();event.stopImmediatePropagation();show(i);reveal(bad);bad.reportValidity();bad.focus();return;}}};
    const onClick=event=>{if(current!==entries.length-1||!event.target.closest('button')||!entries[current].page.contains(event.target))return;for(let i=0;i<current;i++){const bad=invalid(entries[i].page);if(bad){event.preventDefault();event.stopImmediatePropagation();show(i);reveal(bad);bad.reportValidity();bad.focus();return;}}};
    container.addEventListener('keydown',onKey);container.addEventListener('submit',onSubmit,true);container.addEventListener('click',onClick,true);
    const api={id,frame,goTo,reset:()=>{show(0);resetRoute('flow',id,0);},get current(){return current;},reveal:control=>{const i=entries.findIndex(x=>x.page.contains(control));if(i>=0)show(i);},destroy({restore=true}={}){container.removeEventListener('keydown',onKey);container.removeEventListener('submit',onSubmit,true);container.removeEventListener('click',onClick,true);if(restore)entries.forEach(x=>container.append(...Array.from(x.page.children).slice(1)));frame.remove();controllers.delete(container);}};
    controllers.set(container,api);show(position(id,'flow'));return api;
  }
  function tabs(container,{id,items=[],initial=0,active=initial}){
    if(!container||items.length<2)return null;
    controllers.get(container)?.destroy?.();
    id=id||'tabs-'+(++serial);const nav=node('div');nav.className='qf-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label',id.replace(/[-_]/g,' '));
    let current=0;
    const entries=items.map((item,i)=>{const button=node('button',item.title),element=item.element;button.type='button';button.id='qf-tab-'+(++serial);if(!element.id)element.id=button.id+'-panel';button.setAttribute('role','tab');button.setAttribute('aria-controls',element.id);element.setAttribute('role','tabpanel');element.setAttribute('aria-labelledby',button.id);element.tabIndex=0;element.classList.add('qf-tab-panel');nav.append(button);button.onclick=()=>goTo(i,{url:true});button.onkeydown=event=>{const target=event.key==='ArrowRight'?(i+1)%items.length:event.key==='ArrowLeft'?(i+items.length-1)%items.length:event.key==='Home'?0:event.key==='End'?items.length-1:null;if(target!==null){event.preventDefault();goTo(target,{url:true,focus:true});}};return {button,element};});
    const summary=container.querySelector(':scope > summary');if(summary)summary.after(nav);else container.prepend(nav);items.forEach(item=>{if(!container.contains(item.element))container.append(item.element);});
    function goTo(index,{url=false,focus=false}={}){current=Math.max(0,Math.min(entries.length-1,Number.isFinite(index)?index:0));memory.set('panel:'+id,current);entries.forEach((entry,i)=>{entry.element.classList.toggle('qf-tab-inactive',i!==current);entry.element.inert=i!==current;entry.button.setAttribute('aria-selected',String(i===current));entry.button.tabIndex=i===current?0:-1;});if(url)writeRoute('panel',id,current);if(focus)entries[current].button.focus();}
    const api={id,goTo,reset:()=>{goTo(initial);resetRoute('panel',id,initial);},get current(){return current;},reveal:control=>{const i=entries.findIndex(x=>x.element.contains(control));if(i>=0)goTo(i);},destroy(){nav.remove();entries.forEach(x=>{x.element.classList.remove('qf-tab-inactive');x.element.inert=false;x.element.removeAttribute('role');x.element.removeAttribute('aria-labelledby');});controllers.delete(container);}};controllers.set(container,api);goTo(position(id,'panel',active));return api;
  }
  document.addEventListener('invalid',event=>reveal(event.target),true);
  window.addEventListener('hashchange',()=>{const params=route();for(const root of document.querySelectorAll('.qf-wizard,.qf-tabs')){const api=controllers.get(root.parentElement),kind=root.classList.contains('qf-wizard')?'flow':'panel';if(api&&params.get(kind)===api.id)api.goTo(position(api.id,kind),{focus:false});}});
  document.addEventListener('qf:context',event=>{const c=event.detail,key=c?[c.user?.id,c.context?.id,c.accessVersion].join(':'):'';if(scope!==key){scope=key;memory.clear();for(const root of document.querySelectorAll('.qf-wizard,.qf-tabs'))controllers.get(root.parentElement)?.reset();}});
  window.qfFlow={wizard,tabs,reveal};
})();
