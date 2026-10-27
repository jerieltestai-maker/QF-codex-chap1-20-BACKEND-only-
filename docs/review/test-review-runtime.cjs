// Regression coverage for the embedded review, not QuoteFix application behavior.
// Run against scripts/render.py --serve. No comments are sent to a conversation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/jerie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url = process.argv[2] || 'http://127.0.0.1:8777';
const shell = fs.readFileSync(path.join(__dirname, 'review-shell.html'), 'utf8');
assert(!/new\s+ResizeObserver/.test(shell), 'Do not reintroduce fragment resize callbacks');
assert(shell.includes('container-type:inline-size'), 'Responsive mode must use CSS containment');
const model = JSON.parse(fs.readFileSync(path.join(__dirname,'flow-model.json'),'utf8'));
const ids = new Set(model.nodes.map(n=>n.id));
assert.equal(ids.size,model.nodes.length);
for (const e of model.edges) assert(ids.has(e.from)&&ids.has(e.to),JSON.stringify(e));
for (const c of model.chapters) for (const id of c.ids) assert(ids.has(id),id);
assert(!model.edges.some(e=>e.from==='f2'&&e.to==='f3'),'Low rating must not auto-open aftercare');
assert.deepEqual(model.chapters.find(c=>c.id==='fees').ids,['b1','b2','b3','b4']);
assert(!fs.readFileSync(path.join(__dirname,'quotefix-full-flow.mmd'),'utf8').includes('b1['),'Ticket flow must omit billing');
const nodes=Object.fromEntries(model.nodes.map(n=>[n.id,n]));
assert(!model.edges.some(e=>e.from==='d3'&&e.to==='d4'),'Evidence submission cannot advance to final resolution');
assert(model.edges.some(e=>e.from==='d3'&&e.to==='d2'),'Evidence must return to Admin review');
assert(nodes.d3.pendingVariants.every(v=>v.next==='d2'),'Every evidence situation returns to Admin');
assert(model.edges.filter(e=>e.to==='d4').every(e=>['d9','d5'].includes(e.from)),'Only Admin can issue final outcome');
assert.equal(nodes.d4.action,'Acknowledge resolution');
assert(!model.edges.some(e=>e.from==='d4'&&['d2','d5','d7'].includes(e.to)),'No final-resolution reject/counterproposal route');
assert.match(model.supportResolutionPolicy.acknowledgmentGate,/parallel/);
assert.deepEqual(model.inspectionPolicy.numberingExamples,['Inspection','Inspection [2nd]','Inspection [3rd]','Inspection [4th]']);

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:768,height:1000}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__reviewErrors=[];
   window.addEventListener('error',e=>window.__reviewErrors.push(e.message));
  });
  await page.goto(url);
  const frame=await (async()=>{for(let i=0;i<100;i++){const f=page.frames().find(f=>f!==page.mainFrame());if(f&&await f.locator('#qf-section').count())return f;await new Promise(r=>setTimeout(r,100));}throw Error('No preview iframe');})();
  const ready=async()=>{await frame.waitForFunction(()=>document.querySelector('#qf-graph svg'));};
  await ready();
  assert(await frame.evaluate(()=>CSS.supports('container-type','inline-size')));
  const widths=[352,512,768,1056,767,768,769,736,1056,352];
  let checks=0;
  for(const section of ['admin-resolution','dispute','aftercare','inspection-rounds','outcome','cancel']){
   await frame.locator('#qf-section').selectOption(section);await ready();
   for(const width of widths){
    await page.setViewportSize({width,height:1000});
    await page.waitForTimeout(60);
    const size=await frame.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,graph:getComputedStyle(document.querySelector('#qf-graph')).display,list:getComputedStyle(document.querySelector('#qf-compact')).display,height:document.body.getBoundingClientRect().height}));
    assert(size.scroll<=size.width+1,`${section}: horizontal overflow at ${width}: ${JSON.stringify(size)}`);
    assert.notEqual(size.graph==='none',size.list==='none',`${section}: exactly one presentation must be visible`);
    checks++;
   }
  }
  await page.setViewportSize({width:768,height:1000});
  await frame.locator('#qf-section').selectOption('inspection-rounds');await ready();
  await frame.locator('#qf-step').selectOption('r1');
  for(const [value,heading] of [['0','Inspection'],['1','Inspection [2nd]'],['2','Inspection [3rd]'],['3','Inspection [4th]']]){
   await frame.locator('#qf-situation').selectOption(value);
   assert.equal(await frame.locator('#qf-inspection-heading').textContent(),heading);
  }
  await frame.locator('#qf-section').selectOption('admin-resolution');await ready();
  await frame.locator('#qf-step').selectOption('d3');
  await frame.locator('#qf-situation').selectOption('4');
  assert.match(await frame.locator('#qf-next').textContent(),/Submit evidence.*D2/);
  await frame.locator('#qf-step').selectOption('d4');
  await frame.locator('#qf-situation').selectOption('2');
  assert.equal(await frame.locator('#qf-action').textContent(),'Acknowledge resolution');
  assert.match(await frame.locator('#qf-pending').textContent(),/CM acknowledges/);
  // Rapid section changes while Mermaid has queued renders; only latest wins.
  await frame.evaluate(()=>{const select=document.querySelector('#qf-section');for(const value of ['work','selection','receipt-fallback','variation-return','feedback']){select.value=value;select.dispatchEvent(new Event('change'));}});
  await ready();
  assert.equal(await frame.locator('#qf-section').inputValue(),'feedback');
  assert.match(await frame.locator('#qf-graph').textContent(),/F2/);
  await frame.locator('#qf-step').selectOption('f2');
  await frame.locator('#qf-comment').fill('Regression draft for F2');
  await page.waitForTimeout(500);
  await frame.locator('#qf-save').click();
  await page.waitForTimeout(200);
  const echo=await frame.evaluate(()=>JSON.parse(JSON.stringify(window.openai.widgetState)));
  const svgId=await frame.locator('#qf-graph svg').getAttribute('id');
  await frame.locator('#qf-comment').fill('Newer draft must survive a delayed host echo');
  await frame.evaluate(state=>{for(let i=0;i<20;i++)window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:state}}}));},echo);
  assert.equal(await frame.locator('#qf-comment').inputValue(),'Newer draft must survive a delayed host echo');
  assert.equal(await frame.locator('#qf-graph svg').getAttribute('id'),svgId,'State echo must not render Mermaid again');
  await frame.locator('#qf-copy').click();
  assert.match(await frame.locator('#qf-copytext').inputValue(),/F2 — CM provides feedback/);
  assert.match(await frame.locator('#qf-copytext').inputValue(),/Newer draft must survive/);
  await frame.locator('#qf-detail summary').click();
  await page.waitForTimeout(200);
  // Genuine external state still restores, but must not save back in an event loop.
  await frame.evaluate(()=>{
   const version=JSON.parse(document.querySelector('#qf-flow-data').textContent).version;
   const widgetState={modelContent:{version,comments:{f2:'External restored note'}},privateContent:{version,section:'feedback',selected:'f2',drafts:{},situations:{},commentSituations:{}}};
   window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState}}}));
  });
  assert.equal(await frame.locator('#qf-comment').inputValue(),'External restored note');
  assert.equal(await frame.locator('#qf-graph svg').getAttribute('id'),svgId);
  // Restored same-version comments also survive a preview reload.
  await frame.locator('#qf-save').click();await page.waitForTimeout(500);
  assert.deepEqual(await frame.evaluate(()=>window.__reviewErrors),[]);
  await page.reload();await page.waitForTimeout(800);
  const reloaded=page.frames().find(f=>f!==page.mainFrame());
  await reloaded.waitForFunction(()=>document.querySelector('#qf-comment')?.value==='External restored note');
  await reloaded.waitForFunction(()=>document.querySelector('#qf-graph svg'));
  await reloaded.waitForFunction(()=>document.querySelector('#qf-send').getBoundingClientRect().bottom<=innerHeight);
  await page.waitForTimeout(300);
  const frameLayout=await reloaded.evaluate(()=>({viewport:innerHeight,body:document.body.getBoundingClientRect().height,scroll:document.body.scrollHeight,root:document.querySelector('#qf-status-review').getBoundingClientRect().bottom,send:document.querySelector('#qf-send').getBoundingClientRect().bottom}));
  const frameErrors=await reloaded.evaluate(()=>window.__reviewErrors);
  assert.deepEqual(errors,[]);assert.deepEqual(frameErrors,[]);
  await reloaded.locator('#qf-section').selectOption('admin-resolution');
  await reloaded.waitForFunction(()=>document.querySelector('#qf-graph')?.textContent.includes('D9'));
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(__dirname,'../../work/review-v11-admin.png'),fullPage:true});
  await context.close();
  console.log(JSON.stringify({viewportChecks:checks,pageErrors:errors,frameLayout,modelNodes:ids.size,edges:model.edges.length,passed:['CSS responsive layout','rapid navigation','no duplicate render on echo','draft retention','external restore','comment export','reload persistence','no billing in ticket diagram']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
