(() => {
  'use strict';
  const label=value=>String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_.-]+/g,' ').replace(/^./,c=>c.toUpperCase()).replace(/\b(cm|mcst|rfq|gst|sgd|ai|api|uuid)\b/gi,word=>word.toUpperCase());
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function facts(value) {
    if(value===null||value===undefined||value==='')return node('span','—');
    if(Array.isArray(value)) {
      const list=node('ul');list.className='fact-items';
      if(!value.length)list.append(node('li','None recorded.'));
      for(const item of value){const li=node('li');li.append(facts(item));list.append(li);}return list;
    }
    if(typeof value==='object') {
      const list=node('dl');list.className='fact-list';
      for(const [key,item] of Object.entries(value)) {
        const term=node('dt',label(key)),detail=node('dd');
        if(/(?:Cents|_cents)$/.test(key)&&item!==null&&/^-?\d+$/.test(String(item)))detail.textContent=new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD'}).format(Number(item)/100);
        else if(item&&/(?:At|_at|Time)$/.test(key)&&typeof item==='string'&&Number.isFinite(Date.parse(item)))detail.textContent=new Date(item).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT';
        else detail.append(facts(item));
        list.append(term,detail);
      }
      if(!list.children.length)return node('p','No details recorded.');return list;
    }
    return node('span',typeof value==='boolean'?(value?'Yes':'No'):String(value));
  }
  async function fetchBounded(url,options={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    const external=options.signal,abort=()=>controller.abort();external?.addEventListener('abort',abort,{once:true});
    if(external?.aborted)controller.abort();
    try{return await fetch(url,{...options,signal:controller.signal});}
    catch(error){if(error.name==='AbortError'||error.name==='TimeoutError')throw new Error('The request timed out. Check your connection. For a submission, check pending submissions before trying a changed action.');throw error;}
    finally{clearTimeout(timer);external?.removeEventListener('abort',abort);}
  }
  const navigate=screen=>document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen}}));
  const editable=control=>!['checkbox','radio','range','file','hidden','password'].includes(control.type)&&!control.readOnly&&!control.disabled;
  const inputKey=control=>{const name=control.id||control.name||control.getAttribute('aria-label')||Array.from(control.closest('label')?.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();return name?(control.closest('[data-input-scope]')?.dataset.inputScope||'')+'|'+name:'';};
  function captureInputs(root){
    const counts=new Map();return Array.from(root.querySelectorAll('input,select,textarea')).filter(editable).map(control=>{const key=inputKey(control),index=counts.get(key)||0;counts.set(key,index+1);return {key,index,dirty:control.dataset.qfDirty==='true',value:control.multiple?Array.from(control.selectedOptions,x=>x.value):control.value};}).filter(item=>item.key&&item.dirty);
  }
  function restoreInputs(root,snapshot){
    const counts=new Map();for(const control of root.querySelectorAll('input,select,textarea')){
      if(!editable(control))continue;const key=inputKey(control),index=counts.get(key)||0;counts.set(key,index+1);const prior=snapshot.find(item=>item.key===key&&item.index===index);if(!prior)continue;
      if(control.tagName==='SELECT'){
        const selected=Array.isArray(prior.value)?prior.value:[prior.value];if(!selected.every(value=>Array.from(control.options).some(option=>option.value===value)))continue;
        if(control.multiple)for(const option of control.options)option.selected=selected.includes(option.value);else control.value=prior.value;
      }else control.value=prior.value;
      control.dataset.qfDirty='true';
    }
  }
  for(const event of ['input','change'])document.addEventListener(event,event=>{if(event.target.matches?.('input,select,textarea')&&editable(event.target))event.target.dataset.qfDirty='true';});
  const clearDirty=root=>root.querySelectorAll('[data-qf-dirty]').forEach(control=>delete control.dataset.qfDirty);
  const artwork=new Set(['all-caught-up','admin-support','platform-fees','report-issue','request-quotes','compare-quotations','mcst-approval','schedule-work','work-in-progress','variation-request','inspection-round','invoice-review','payment','aftercare-feedback','decision-pack-export','contractor-verification','council-oversight','audit-record','admin','mcst','contractor','building','confidential-report','upload','shield','cancelled','reselection','ai-refining']);
  function illustration(name){if(!artwork.has(name))throw new Error('Unknown workflow illustration');const img=node('img');img.className='workflow-illustration';img.src='/assets/'+name+'.png';img.alt='';img.width=72;img.height=72;img.loading='lazy';img.setAttribute('aria-hidden','true');return img;}
  // Native validation retains its rules; its errors are also readable and reachable as a group.
  const pendingValidation=new WeakSet();let fieldSerial=0;
  function fieldError(control){
    const id=control.dataset.errorId;if(!id)return;
    document.getElementById(id)?.remove();control.removeAttribute('aria-invalid');
    const descriptions=(control.getAttribute('aria-describedby')||'').split(' ').filter(value=>value&&value!==id);if(descriptions.length)control.setAttribute('aria-describedby',descriptions.join(' '));else control.removeAttribute('aria-describedby');delete control.dataset.errorId;
  }
  function validationSummary(form,focus){
    form.querySelector('[data-validation-summary]')?.remove();const invalid=Array.from(form.querySelectorAll('input:invalid,select:invalid,textarea:invalid'));if(!invalid.length)return;
    const summary=node('div'),title=node('p','Check these fields'),list=node('ul');summary.dataset.validationSummary='';summary.className='field-errors';summary.tabIndex=-1;summary.setAttribute('role','alert');summary.append(title,list);
    for(const control of invalid){fieldError(control);if(!control.id)control.id='qf-field-'+(++fieldSerial);const id=control.id+'-error',error=node('p',control.validationMessage);error.id=id;error.className='field-error';control.dataset.errorId=id;control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',((control.getAttribute('aria-describedby')||'')+' '+id).trim());(control.closest('label')||control).after(error);const item=node('li'),link=node('a',(control.labels?.[0]?.textContent.trim()||control.name||'Required field')+': '+control.validationMessage);link.href='#'+control.id;link.onclick=event=>{event.preventDefault();control.focus();};item.append(link);list.append(item);}
    form.prepend(summary);if(focus)summary.focus();
  }
  document.addEventListener('invalid',event=>{const form=event.target.form;if(!form)return;event.preventDefault();if(pendingValidation.has(form))return;pendingValidation.add(form);setTimeout(()=>{pendingValidation.delete(form);validationSummary(form,true);},0);},true);
  document.addEventListener('input',event=>{const control=event.target;if(control.dataset?.errorId&&control.validity?.valid){fieldError(control);if(control.form)validationSummary(control.form,false);}});
  const clearValidation=form=>{form.querySelector('[data-validation-summary]')?.remove();form.querySelectorAll('[data-error-id]').forEach(fieldError);};
  document.addEventListener('reset',event=>clearValidation(event.target),true);
  document.addEventListener('submit',event=>{if(event.target.checkValidity())clearValidation(event.target);},true);
  window.qfUI={label,facts,node,fetch:fetchBounded,navigate,captureInputs,restoreInputs,clearDirty,illustration};
})();
