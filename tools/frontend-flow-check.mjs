// Exercises the actual shared browser controllers without creating any domain records.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const out='work/frontend-redesign/flow-check';await mkdir(out,{recursive:true});
const browser=await Browser.launch(),page=await browser.newPage();
try{
  await page.goto('http://127.0.0.1:3000',{settleMs:500});
  const result=await page.eval(()=>{
    const checks=[],assert=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
    const root=document.createElement('section');document.querySelector('main').append(root);
    const form=document.createElement('form'),fields=[];root.append(form);
    for(const text of ['Company','Contact','Confirm']){const label=document.createElement('label'),input=document.createElement('input');label.textContent=text;input.required=true;input.type=text==='Confirm'?'checkbox':'text';label.append(input);form.append(label);fields.push(label);}
    const send=document.createElement('button');send.textContent='Submit';form.append(send);let submitted=0;form.addEventListener('submit',event=>{event.preventDefault();submitted++;});
    const flow=window.qfFlow.wizard(form,{id:'browser-controller-check',steps:[{title:'Company',fields:[fields[0]]},{title:'Contact',fields:[fields[1]]},{title:'Review',fields:[fields[2],send]}]});
    const input=i=>fields[i].querySelector('input');
    form.querySelector('.qf-step-actions .primary').click();assert(flow.current===0,'Empty first step stays visible');assert(document.activeElement===input(0),'Invalid first field receives focus');
    input(0).value='Fictional company';form.querySelector('.qf-step-actions .primary').click();assert(flow.current===1,'Continue advances after required input');assert(location.hash.includes('step=2'),'Step has a navigable URL');
    input(1).value='Fictional contact';form.querySelector('.qf-step-actions .primary').click();assert(flow.current===2,'Third step follows contact');assert(submitted===0,'Changing steps sends no form submission');
    send.click();assert(submitted===0,'Final unchecked confirmation prevents submission');
    input(2).checked=true;send.click();assert(submitted===1,'Explicit valid final action submits once');
    flow.goTo(0);assert(input(0).value==='Fictional company'&&input(1).value==='Fictional contact','Back preserves entered fields');
    input(0).value='';flow.goTo(2);send.click();assert(flow.current===0&&submitted===1,'Final click rechecks prior-step requirements');
    const conditional=document.createElement('div'),optional=document.createElement('input');optional.required=true;conditional.hidden=true;conditional.append(optional);form.querySelector('.qf-step-page').append(conditional);input(0).value='Fictional company';assert(flow.goTo(1,{validate:true}),'Hidden conditional fields do not block progression');
    const host=document.createElement('div'),a=document.createElement('section'),b=document.createElement('section');a.textContent='First';b.textContent='Second';root.append(host);host.append(a,b);
    const tabs=window.qfFlow.tabs(host,{id:'browser-tab-check',items:[{title:'First',element:a},{title:'Second',element:b}]});
    assert(b.inert&&b.classList.contains('qf-tab-inactive'),'Inactive tab is hidden and inert');host.querySelector('[role=tab]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert(tabs.current===1&&document.activeElement.textContent==='Second','Arrow key selects and focuses the next tab');
    tabs.reset();assert(tabs.current===0&&new URLSearchParams(location.hash.split('?')[1]).get('tab')==='1','Reset aligns the selected tab and its URL');
    window.qfFlow.reveal(a);assert(tabs.current===0,'Error reveal selects the containing tab');
    host.replaceChildren(a,b);window.qfFlow.tabs(host,{id:'browser-tab-check',items:[{title:'First',element:a},{title:'Second',element:b}]});assert(host.querySelectorAll('[role=tablist]').length===1,'Re-render creates one tablist');
    form.replaceChildren(fields[0],fields[1]);window.qfFlow.wizard(form,{id:'replacement',steps:[{title:'One',fields:[fields[0]]},{title:'Two',fields:[fields[1]]}]});assert(form.querySelectorAll('.qf-wizard').length===1&&!form.contains(send),'Re-render discards stale wizard nodes and handlers');
    root.remove();return checks;
  });
  assert.deepEqual(page.consoleErrors,[]);
  await writeFile(out+'/report.json',JSON.stringify({checks:result,consoleErrors:page.consoleErrors},null,2));console.log(JSON.stringify({passed:result.length,consoleErrors:page.consoleErrors}));
}finally{await browser.close();}
