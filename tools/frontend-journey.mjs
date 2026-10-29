// Run with: TEST_DATABASE_URL=<local quotefix_test URL> node --import tsx tools/frontend-journey.mjs
// The existing test adapter creates and drops its own qf_test_<random> schema.
// No .env file, operational database, external provider or paid scanner is used.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {completionFixture} from '../tests/completion-helper.ts';
import {ids,fixturePassword} from '../packages/test-fixtures/fixtures.ts';
import {Browser} from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

let target;try{target=new URL(process.env.TEST_DATABASE_URL||'http://invalid');}catch{throw new Error('TEST_DATABASE_URL must identify the explicit localhost quotefix_test database.');}
assert.ok(['postgres:','postgresql:'].includes(target.protocol)&&['127.0.0.1','localhost'].includes(target.hostname)&&target.pathname==='/quotefix_test','Set TEST_DATABASE_URL to the explicit localhost quotefix_test database.');
const port=process.argv.find(v=>v.startsWith('--port='))?.slice(7)||'3012';
assert.match(port,/^\d{4,5}$/);
const output=resolve(process.argv.find(v=>v.startsWith('--out='))?.slice(6)||'work/frontend-journey/'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'-'+randomUUID());
await mkdir(output,{recursive:true});
const report={status:'running',scope:'Isolated fictional PostgreSQL schema; local desktop browser only',checks:[],screenshots:[],consoleErrors:[],rateLimitedRequests:[],boundaries:['The test fixture supplies named fictional accounts, the estate threshold and a permissive explicitly test-only integrity policy.','Invoice/payment image bytes use the real upload, checksum and transformation pipeline with the test worker scanner returning clean; actual malware-scanner certification is outside this test.','Physical-device/native transfer, hosted release, open product-policy branches and paid providers are outside this desktop journey.'],schemaCleaned:false};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let f,browser,page,timer,workerRun,jobId,stage='startup';
async function wait(predicate,message,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await sleep(120);}throw new Error(message);}
async function check(name,action){stage=name;process.stdout.write('[journey] '+name+'\n');await action();const caughtErrors=await evaluate(()=>[...document.querySelectorAll('[role="status"],[role="alert"],.form-status')].map(node=>node.textContent.trim()).filter(text=>/\b(?:ReferenceError|TypeError|SyntaxError)\b|\bis not defined\b|\bis not a function\b|Cannot (?:read|set) propert/i.test(text)));assert.deepEqual(caughtErrors,[],'A workflow caught and displayed a programming error');report.checks.push({name,status:'passed'});await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
async function evaluate(fn,arg){return page.eval(fn,arg);}
const requests=[];
async function pace(){for(const [group,budget] of Object.entries({read:520,command:100,identity:8})){const active=requests.filter(r=>r.group===group&&r.at>Date.now()-61000);if(active.length>=budget){process.stdout.write('[journey] Allowing the normal '+group+' rate-limit window to advance.\n');await sleep(Math.max(0,active[0].at+61500-Date.now()));}}}
async function mark(description){await pace();return evaluate(({description})=>{
  document.querySelectorAll('[data-journey-target]').forEach(n=>n.removeAttribute('data-journey-target'));
  let root=description.root?document.querySelector(description.root):document;
  if(!root)throw new Error('Journey target root missing: '+description.root);
  if(description.summary){root=[...root.querySelectorAll('details')].find(n=>n.querySelector(':scope > summary')?.textContent.trim()===description.summary);if(!root)throw new Error('Journey details missing: '+description.summary);root.open=true;}
  let target=description.selector?root.querySelector(description.selector):description.label?[...root.querySelectorAll('label')].find(n=>n.textContent.trim().startsWith(description.label))?.querySelector('input,textarea,select'):[...root.querySelectorAll('button,a')].find(n=>n.textContent.trim()===description.text);
  if(!target)throw new Error('Journey target missing: '+(description.text||description.label||description.selector));
  const ancestors=[];for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement)ancestors.unshift(ancestor);
  for(const ancestor of ancestors){
    if(ancestor.tagName==='DETAILS')ancestor.open=true;
    if(ancestor.classList.contains('qf-tab-panel'))document.querySelector('[role="tab"][aria-controls="'+ancestor.id+'"]')?.click();
    if(ancestor.classList.contains('qf-step-page')&&ancestor.hidden)document.querySelector('.qf-steps [aria-controls="'+ancestor.id+'"]')?.click();
  }
  target.setAttribute('data-journey-target','current');target.scrollIntoView({block:'center',inline:'nearest'});
  const box=target.getBoundingClientRect();if(!box.width||!box.height)throw new Error('Journey target is not visible: '+(description.text||description.label||description.selector));
  return {x:box.x+box.width/2,y:box.y+box.height/2,disabled:target.disabled===true};
},{description});}
async function click(description){const at=await mark(description);if(at.disabled)throw new Error('Journey target disabled: '+(description.text||description.selector));await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:at.x,y:at.y,button:'left',clickCount:1});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:at.x,y:at.y,button:'left',clickCount:1});await sleep(160);}
async function fill(description,value){await mark(description);await evaluate(({value})=>{const input=document.querySelector('[data-journey-target="current"]');if(input.type==='checkbox'){input.checked=!!value;}else if(input.tagName==='SELECT'&&input.multiple){for(const option of input.options)option.selected=value.includes(option.value);}else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.removeAttribute('data-journey-target');},{value});}
async function chooseScreen(screen){await evaluate(screen=>document.dispatchEvent(new CustomEvent('qf:navigate',{detail:{screen}})),screen);await sleep(100);}
async function keySlide(label,root='#work-shell'){await mark({root,label:label+' — slide to confirm'});await evaluate(()=>{document.querySelector('[data-journey-target="current"]').focus();});await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35,nativeVirtualKeyCode:35});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35,nativeVirtualKeyCode:35});await sleep(250);}
async function screenshot(name,width=1440){await page.setViewport({width,height:900});await evaluate(()=>window.scrollTo(0,0));if(report.status!=='failed')await wait(()=>evaluate(()=>[...document.querySelectorAll('main [data-screen]')].some(n=>n.getBoundingClientRect().height>0)&&![...document.querySelectorAll('[role="status"]')].filter(n=>n.getBoundingClientRect().height>0).some(n=>/^(Loading|Submitting|Working)/.test(n.textContent.trim()))),'Visible workflow did not finish loading before capture');await sleep(150);const file=join(output,name+'-'+width+'.png');await page.screenshot({path:file,format:'png'});report.screenshots.push(file);const dimensions=await evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(dimensions.scrollWidth<=dimensions.width+1,'Horizontal page overflow at '+width+'px');}
async function login(role){await pace();const logged=await evaluate(()=>!!window.qfWorkspace?.context);if(logged){await click({selector:'#logout'});await wait(()=>evaluate(()=>!window.qfWorkspace?.context),'Sign-out did not complete');}await fill({selector:'[data-route="auth/login"] [name="email"]'},role+'@example.test');await fill({selector:'[data-route="auth/login"] [name="password"]'},fixturePassword);await click({selector:'[data-route="auth/login"] button'});await wait(()=>evaluate(role=>window.qfWorkspace?.context?.context?.role===role,role),'The '+role+' session did not become ready');await sleep(350);}
async function openWork(){await evaluate(id=>window.qfWork.open(id),jobId);await wait(()=>evaluate(()=>!document.querySelector('#work-shell').hidden&&document.querySelector('#work-shell h3')),'Work details not rendered');}
async function openEstateJob(){await evaluate(id=>window.qfWorkspace.loadJob(id,true),jobId);await sleep(350);}
async function upload(label,buttonLabel){await wait(()=>evaluate(label=>[...document.querySelectorAll('#work-shell label')].some(n=>n.textContent.trim()===label&&n.querySelector('input[type=file]')),label),'Upload field not ready: '+label);await mark({root:'#work-shell',label});const doc=await page.send('DOM.getDocument');const {nodeId}=await page.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-journey-target="current"]'});await page.send('DOM.setFileInputFiles',{nodeId,files:[join(output,label==='Invoice'?'fictional-invoice.png':'fictional-transfer-proof.png')]});await sleep(150);await click({root:'#work-shell',text:buttonLabel});await sleep(300);await wait(async()=>{const [row]=await f.db.query("SELECT count(*)::integer AS count FROM upload_intents WHERE state='ready' AND job_id=$1 AND purpose=$2",[jobId,label==='Invoice'?'invoice':'payment_proof']);return row.count>0;},label+' processing did not become ready');await click({root:'#work-shell',text:'Check '+label.toLowerCase()+' attachment'});await wait(()=>evaluate(label=>document.querySelector('#work-shell').textContent.includes(label+' attached and checked.'),label),label+' readiness was not shown');}

try {
  f=await completionFixture(port);
  const [schema]=await f.db.query('SELECT current_schema() AS name');assert.match(schema.name,/^qf_test_[0-9a-f]{16}$/);report.isolatedSchema=schema.name;
  // Convert the fixture-only company to pending so the browser performs the actual approval.
  await f.db.query('UPDATE organisations SET verified=false WHERE id=$1',[ids.organisation]);
  await f.db.query("UPDATE contractor_profiles SET state='pending',approved_categories=ARRAY[]::text[] WHERE organisation_id=$1",[ids.organisation]);
  await f.app.listen({host:'127.0.0.1',port:Number(port)});
  timer=setInterval(()=>{if(!workerRun)workerRun=f.worker.tick().catch(error=>{report.workerError=error.message;}).finally(()=>{workerRun=undefined;});},600);
  await sharp({create:{width:80,height:80,channels:3,background:'#d4ddd8'}}).png().toFile(join(output,'fictional-invoice.png'));
  await sharp({create:{width:80,height:80,channels:3,background:'#a1c3d5'}}).png().toFile(join(output,'fictional-transfer-proof.png'));
  browser=await Browser.launch();page=await browser.newPage();await page.send('Network.enable');browser.on(page.sessionId,'Network.requestWillBeSent',event=>{const path=new URL(event.request.url).pathname;if(path.startsWith('/api/v1/'))requests.push({at:Date.now(),group:path.startsWith('/api/v1/auth/')&&!path.startsWith('/api/v1/auth/logout')?'identity':event.request.method==='GET'?'read':'command'});});browser.on(page.sessionId,'Network.responseReceived',event=>{if(event.response.status===429)report.rateLimitedRequests.push(new URL(event.response.url).pathname);});
  await page.goto('http://localhost:'+port,{settleMs:350});await wait(()=>evaluate(()=>!!window.qfWorkspace),'Web modules did not initialise');
  await check('CM creates private workspace without publishing a repair',async()=>{
    await login('cm');await click({selector:'#new-repair'});
    await click({root:'#workspace-compose .qf-step-actions',text:'Continue'});
    assert.equal(await evaluate(()=>document.querySelector('#workspace-compose .qf-steps [aria-current=step]').textContent.trim()),'1Location','An empty location step must not advance');
    await fill({selector:'#draft-title'},'Fictional valve repair — browser journey');await fill({selector:'#draft-location'},'Private service room');await fill({selector:'#draft-observations'},'Observed a steady drip at an accessible isolation valve.');
    await click({root:'#workspace-compose .qf-step-actions',text:'Back'});
    assert.equal(await evaluate(()=>document.querySelector('#draft-observations').value),'Observed a steady drip at an accessible isolation valve.','Back lost the observation draft');
    assert.match(await evaluate(()=>location.hash),/flow=repair-draft.*step=1/);
    await click({selector:'#workspace-submit'});await wait(async()=>{const rows=await f.db.query('SELECT id FROM job_records');if(rows.length===1){jobId=rows[0].id;return true;}return false;},'Private workspace not created');
    const [publication]=await f.db.query('SELECT count(*)::integer AS count FROM rfq_publications WHERE job_id=$1',[jobId]);assert.equal(publication.count,0);
    await wait(()=>evaluate(()=>window.qfWorkspace.job?.id===window.__journeyJobId||!!window.qfWorkspace.job),'Created workspace did not open');await screenshot('cm-private-repair');
  });
  await check('CM reviews contractor preview and publishes with both explicit acknowledgments',async()=>{
    await fill({selector:'#rfq-categories'},['plumbing']);await fill({selector:'#rfq-description'},'Repair a dripping isolation valve, including testing and making good.');await fill({selector:'#rfq-location'},'Accessible service room');await fill({selector:'#rfq-no-photo'},'The location is safe to describe, but no photograph is available for this fictional test.');
    assert.equal(await evaluate(()=>{const current=()=>document.querySelector('#rfq-panel .qf-steps [aria-current=step]')?.textContent,before=current();document.dispatchEvent(new CustomEvent('qf:context',{detail:window.qfWorkspace.context}));return current()===before;}),true,'Refreshing the same context reset the RFQ step');
    await click({selector:'#rfq-save'});await wait(async()=>{const [row]=await f.db.query('SELECT version FROM job_records WHERE id=$1',[jobId]);return row.version===2;},'RFQ intake save not acknowledged');await sleep(200);
    await click({selector:'#rfq-preview'});await wait(()=>evaluate(()=>document.querySelector('#rfq-preview-content').textContent.includes('dripping isolation valve')),'Contractor preview did not render');
    await fill({selector:'#rfq-facts'},true);await fill({selector:'#rfq-privacy'},true);await click({selector:'#rfq-publish'});
    await wait(async()=>{const rows=await f.db.query('SELECT job_id FROM rfq_publications WHERE job_id=$1',[jobId]);return rows.length===1;},'Reviewed RFQ was not published');await screenshot('cm-published-rfq');
  });
  await check('Admin explicitly configures trade matrix and approves company evidence',async()=>{
    await login('admin');await chooseScreen('verification');await wait(()=>evaluate(()=>document.querySelector('#verification-list [data-organisation]')),'Admin verification list not ready');
    await click({selector:'#verification-list [data-organisation="'+ids.organisation+'"]'});await wait(()=>evaluate(()=>!document.querySelector('#verification-detail').hidden),'Verification detail did not open');
    await fill({selector:'#trade-category'},'plumbing');await fill({selector:'#trade-reason'},'Explicit fictional browser review: this test trade has no additional credentials.');await fill({root:'#verification-shell',label:'I confirm these trade requirements, including an empty required list if selected.'},true);await click({selector:'#trade-configure'});await wait(()=>evaluate(()=>document.querySelector('#verification-status').textContent.includes('Trade requirements saved')),'Trade configuration not acknowledged');
    await fill({selector:'#verification-outcome'},'approved');await fill({selector:'#verification-approved'},['plumbing']);await fill({selector:'#verification-reason'},'Offline company authenticity checks represented by this isolated fictional test.');await fill({root:'#verification-shell',label:'I confirm this verification decision for the displayed company or credential and reviewed its current evidence.'},true);await click({selector:'#verification-decide'});
    await wait(async()=>{const [row]=await f.db.query('SELECT verified FROM organisations WHERE id=$1',[ids.organisation]);return row.verified===true;},'Company approval was not recorded');await screenshot('admin-verification');
  });
  await check('Contractor submits sealed quote with scope, expiry and commitment confirmations',async()=>{
    await login('contractor');await chooseScreen('quotes');await evaluate(id=>window.qfQuotes.open(id),jobId);await wait(()=>evaluate(()=>document.querySelector('.quote-editor')),'Quote editor did not open');
    const root='.quote-editor';await fill({root,label:'Final SGD amount payable'},'90.00');for(const [label,value] of [['Waste disposal included','yes'],['Warranty included','no'],['Making good included','yes'],['GST charged','no'],['Earliest availability','next_day'],['Estimated work duration','1_day'],['Additional exclusions','none']])await fill({root,label},value);
    await fill({root,label:'I reviewed RFQ revision 1 and the current scope.'},true);await fill({root,label:'My quote will be valid when the CM selects it.'},true);await fill({root,label:'I confirm this expiry date or date/time.'},true);await click({root,text:'Submit initial quote'});
    await wait(async()=>{const [row]=await f.db.query('SELECT count(*)::integer AS count FROM quotes WHERE job_id=$1',[jobId]);return row.count===1;},'Contractor quote was not submitted');await screenshot('contractor-quote');
  });
  await check('CM selects the current quotation below the configured threshold',async()=>{
    await login('cm');await openEstateJob();await chooseScreen('quotes');await wait(()=>evaluate(()=>[...document.querySelectorAll('#comparison-shell button')].some(b=>b.textContent==='Select this exact quote')),'Selectable quotation not shown');
    await fill({root:'.quote-card',label:'Written selection rationale'},'The current offer covers the stated valve repair, tests and making good within the configured threshold.');
    const acknowledgments=await evaluate(()=>[...document.querySelectorAll('.quote-card label')].filter(n=>n.querySelector('input[type="checkbox"]')).map(n=>n.textContent.trim()));for(const label of acknowledgments)await fill({root:'.quote-card',label},true);
    await click({root:'.quote-card',text:'Select this exact quote'});await wait(async()=>{const [row]=await f.db.query('SELECT count(*)::integer AS count FROM work_state WHERE job_id=$1',[jobId]);return row.count===1;},'Selection did not authorise the work');await screenshot('cm-selected-work');
  });
  await check('Contractor proposes a specific agreed start without recording actual Start',async()=>{
    await login('contractor');await openWork();const summary='Propose an agreed start date';
    await fill({root:'#work-shell',summary,label:'Change reason'},'Agree service-room access before commencement.');await fill({root:'#work-shell',summary,label:'Proposed start — Singapore time'},'2026-11-02T12:01');await fill({root:'#work-shell',summary,label:'Reason for changed timing'},'CM will provide the agreed access.');
    for(const label of ['Can the original authorised work safely and feasibly continue?','Can the proposed work safely and feasibly continue?'])await fill({root:'#work-shell',summary,label},'yes');await fill({root:'#work-shell',summary,label:'I confirm these exact scope, price, timing and feasibility terms.'},true);await click({root:'#work-shell',summary,text:'Submit proposed terms'});
    await wait(async()=>{const [row]=await f.db.query("SELECT count(*)::integer AS count FROM variations WHERE job_id=$1 AND kind='start_schedule' AND state='decision'",[jobId]);return row.count===1;},'Start schedule proposal not recorded');const [work]=await f.db.query('SELECT started_at FROM work_state WHERE job_id=$1',[jobId]);assert.equal(work.started_at,null);
  });
  await check('CM accepts the exact proposed schedule without auto-starting work',async()=>{
    await login('cm');await openEstateJob();await openWork();await fill({root:'#work-shell',label:'I reviewed this exact proposal version.'},true);await click({root:'#work-shell',text:'Okay — accept this exact date'});
    await wait(async()=>{const [row]=await f.db.query('SELECT scheduled_start_at,started_at FROM work_state WHERE job_id=$1',[jobId]);return row.scheduled_start_at!==null&&row.started_at===null;},'Schedule acceptance did not preserve the separate Start gate');
  });
  await check('Contractor records deliberate Start then combines checked invoice with irreversible completion',async()=>{
    f.setNow(new Date('2026-11-02T04:02:00Z'));await login('contractor');await openWork();
    await fill({root:'#work-shell',summary:'Start',label:'Completion estimate'},'known');await fill({root:'#work-shell',summary:'Start',label:'Completed by — Singapore time'},'2026-11-03T12:00');await fill({root:'#work-shell',summary:'Start',label:'I confirm I am starting the authorised work now.'},true);await click({root:'#work-shell',summary:'Start',text:'Start'});
    await wait(async()=>{const [row]=await f.db.query('SELECT started_at FROM work_state WHERE job_id=$1',[jobId]);return !!row.started_at;},'Actual Start was not recorded');f.setNow(new Date('2026-11-02T04:10:00Z'));
    await upload('Invoice','Attach / resume invoice');await fill({root:'#work-shell',label:'Actual physical completion — Singapore time'},'2026-11-02T12:10');
    await keySlide('Submit completion and invoice together');assert.equal((await f.db.query('SELECT count(*)::integer AS count FROM completion_rounds WHERE job_id=$1',[jobId]))[0].count,0,'Unchecked completion declaration was submitted');
    await fill({root:'#work-shell',label:'All work is finished and the invoice is attached.'},true);await keySlide('Submit completion and invoice together');
    await wait(async()=>{const [row]=await f.db.query('SELECT count(*)::integer AS count FROM completion_rounds WHERE job_id=$1',[jobId]);return row.count===1;},'Combined completion package was not submitted');await screenshot('contractor-completion');
  });
  await check('CM inspects the current round and explicitly approves satisfactory works',async()=>{
    await login('cm');await openEstateJob();await openWork();
    await mark({root:'#work-shell',summary:'Inspection',label:'I reviewed the agreed scope and approved variations.'});
    await click({root:'#work-shell details:has(.qf-wizard[data-flow*="inspection-"]) .qf-step-actions',text:'Continue'});
    assert.equal(await evaluate(()=>document.querySelector('#work-shell .qf-wizard[data-flow*="inspection-"] .qf-steps [aria-current=step]').textContent.trim()),'1Review');
    assert.equal((await f.db.query('SELECT count(*)::integer AS count FROM inspections WHERE job_id=$1',[jobId]))[0].count,0,'Unchecked inspection was accepted');
    for(const label of ['I reviewed the agreed scope and approved variations.','I reviewed completion and visible issues.','I reviewed available evidence (photos are optional).','I reviewed the invoice and charges.','I agree the works are Complete and Satisfactory'])await fill({root:'#work-shell',summary:'Inspection',label},true);
    await screenshot('cm-inspection');await click({root:'#work-shell',summary:'Inspection',text:'Confirm — Approve Works'});await wait(async()=>{const [row]=await f.db.query('SELECT accepted_round FROM completion_state WHERE job_id=$1',[jobId]);return row.accepted_round===1;},'Exact inspection approval was not recorded');
  });
  await check('MCST confirms the exact reconciled invoice and records external bank payment',async()=>{
    await login('mcst');await openEstateJob();await openWork();await fill({root:'#work-shell',label:'I confirm this exact reconciled invoice version and amount.'},true);await click({root:'#work-shell',text:'Confirm invoice'});
    await wait(async()=>{const [row]=await f.db.query('SELECT confirmed_version FROM completion_state WHERE job_id=$1',[jobId]);return row.confirmed_version===1;},'MCST invoice confirmation not recorded');
    await wait(()=>evaluate(()=>[...document.querySelectorAll('#work-shell summary')].some(n=>n.textContent==='Payment Sent')),'Payment form did not render after invoice confirmation');
    await fill({root:'#work-shell',summary:'Payment Sent',label:'Transfer amount SGD'},'90.00');await fill({root:'#work-shell',summary:'Payment Sent',label:'Actual bank transfer date'},'2026-11-02');await upload('Completed-transfer proof','Attach / resume completed-transfer proof');await fill({root:'#work-shell',summary:'Payment Sent',label:'This bank transfer has been completed.'},true);await keySlide('Payment Sent');
    await wait(async()=>{const [row]=await f.db.query('SELECT count(*)::integer AS count FROM payment_transfers WHERE job_id=$1',[jobId]);return row.count===1;},'Completed payment record not created');await screenshot('mcst-payment');
  });
  await check('Contractor confirms actual receipt and server closes fully settled work',async()=>{
    await login('contractor');await openWork();await fill({root:'#work-shell',label:'Actual receipt date'},'2026-11-02');await fill({root:'#work-shell',label:'I confirm actual receipt of this exact transfer.'},true);await click({root:'#work-shell',text:'Received payment'});
    await wait(async()=>{const [row]=await f.db.query('SELECT stage FROM job_records WHERE id=$1',[jobId]);return row.stage==='Closed';},'Fully accepted and settled job did not close');const [transfer]=await f.db.query('SELECT status,receipt_precision FROM payment_transfers WHERE job_id=$1',[jobId]);assert.equal(transfer.status,'actual');assert.equal(transfer.receipt_precision,'date');await screenshot('contractor-closed');
  });
  await check('Role-filtered decision pack generates and populated layouts fit narrower browser widths',async()=>{
    await chooseScreen('exports');await click({root:'#exports-shell',text:'Request HTML decision pack'});await wait(async()=>{const [row]=await f.db.query('SELECT count(*)::integer AS count FROM decision_exports e JOIN export_results r ON r.export_id=e.id WHERE e.job_id=$1',[jobId]);return row.count>0;},'Decision pack did not become ready');await click({root:'#exports-shell',text:'Refresh export status'});await wait(()=>evaluate(()=>document.querySelector('#exports-shell').textContent.includes('Download this snapshot')),'Ready decision-pack download control not shown');await screenshot('contractor-export');
    await chooseScreen('work');await screenshot('contractor-work',768);await screenshot('contractor-work',390);await page.setViewport({width:1440,height:900});
  });
  report.consoleErrors=page.consoleErrors;assert.deepEqual(report.consoleErrors,[],'Browser raised unhandled exceptions');assert.deepEqual(report.rateLimitedRequests,[],'The journey exceeded a normal API rate limit');assert.equal(report.workerError,undefined,'Isolated worker failed');report.status='passed';
} catch(error) {
  report.status='failed';report.failedStage=stage;report.error=error.message;report.consoleErrors=page?.consoleErrors||[];
  if(page){try{await screenshot('failure');report.visibleStatus=await evaluate(()=>[...document.querySelectorAll('[role="status"]')].filter(n=>n.getBoundingClientRect().height).map(n=>n.textContent).filter(Boolean).slice(0,15));}catch{}}
  process.exitCode=1;
} finally {
  if(timer)clearInterval(timer);await workerRun;await browser?.close();if(f){try{await f.close();report.schemaCleaned=true;}catch{report.status='failed';report.cleanupError='The isolated schema could not be dropped. Inspect only the recorded isolatedSchema before retrying.';process.exitCode=1;}}await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({status:report.status,checks:report.checks.length,failedStage:report.failedStage,error:report.error,output,schemaCleaned:report.schemaCleaned})+'\n');
}
