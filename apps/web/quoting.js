(() => {

  const qf=window.qfWorkspace;

  let epoch=0,contextKey='',activeOpportunity=null;

  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};

  const panel=node('section');panel.hidden=true;document.querySelector('main').append(panel);

  const comparisonPanel=node('details');comparisonPanel.append(node('summary','Quotes, comparison and contractor selection'));document.getElementById('workspace-detail').append(comparisonPanel);

  const message=node('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');

  const quoteContent=node('div');panel.append(node('h2','Your quotes and job questions'),message,quoteContent);

  const comparisonContent=node('div');comparisonPanel.append(comparisonContent);

  const field=(parent,label,type='text',value='')=>{const wrapper=node('label',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.maxLength=10000;wrapper.append(input);parent.append(wrapper);return input;};

  const choice=(parent,label,options,value='')=>{const wrapper=node('label',label),select=node('select');select.append(new Option('Choose explicitly',''),...options.map(([key,text])=>new Option(text,key)));select.value=value;wrapper.append(select);parent.append(wrapper);return select;};

  const check=(parent,label)=>{const wrapper=node('label'),input=node('input');input.type='checkbox';wrapper.append(input,document.createTextNode(label));parent.append(wrapper);return input;};

  function button(parent,label,action) {const b=node('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){message.textContent=e.message;const m=parent.querySelector('[role="status"]');if(m)m.textContent=e.message;}finally{b.disabled=false;}};parent.append(b);return b;}

  const pretty=value=>{const p=node('pre');p.textContent=JSON.stringify(value,null,2);return p;};
  function confirmThreshold(amount,threshold) {
    return new Promise(resolve=>{
      const dialog=node('dialog');dialog.append(node('h3','Select and approve above the estate threshold'),node('p','Quote: '+money(amount)+'. Estate threshold: '+money(threshold)+'. This confirmation authorises the selected work.'));
      const finish=value=>{dialog.close();dialog.remove();resolve(value);};
      button(dialog,'Back',()=>finish(false));button(dialog,'Yes I know',()=>finish(true));dialog.addEventListener('cancel',()=>finish(false),{once:true});document.body.append(dialog);dialog.showModal();
    });
  }

  function termView(t,narrativeWithheld=false) {

    const list=node('dl'),rows=[['Final amount payable','SGD '+t.amountSgd],...Object.entries(explanations).filter(([key])=>t[key]!==undefined).map(([key,v])=>[v[0],t[key]?'Yes':'No']),['Earliest availability after authorisation and site access',options.availability.find(o=>o[0]===t.availability)?.[1]??'Not stated'],['Estimated duration',options.duration.find(o=>o[0]===t.duration)?.[1]??'Not stated'],['Additional exclusions',t.exclusions.includes('other')?t.exclusionsOther:'No additional exclusions'],['Expiry chosen by contractor',t.expiry],['Optional narrative',narrativeWithheld?'Withheld while contractor identities are concealed; MCST can review':t.narrative??'Not stated']];

    if(t.warranty)rows.push(['Warranty duration',options.warranty.find(o=>o[0]===t.warrantyDuration)?.[1]??'Not stated']);

    for(const [key,label] of [['warrantyOther','Other warranty duration'],['availabilityOther','Other availability'],['durationReason','Duration explanation']])if(t[key])rows.push([label,t[key]]);

    for(const [label,value] of rows)list.append(node('dt',label),node('dd',value));return list;

  }

  function ownHistory(records) {

    const box=node('div');if(!records.length)box.append(node('p','No submitted quote yet.'));

    for(const record of records)for(const v of record.versions){const item=node('article');item.append(node('h4','Quote version '+v.version+' · RFQ revision '+v.rfq_revision),termView(v.terms),node('p','Recorded '+new Date(v.recorded_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT'+(v.revision_reason?' · '+v.revision_reason:'')));if(v.pdf_id){const link=node('a','View your quotation PDF');link.href='/api/v1/files/'+v.pdf_id;item.append(link);}box.append(item);}return box;

  }

  function selectionHistory(records) {

    const box=node('div');if(!records.length)box.append(node('p','No recorded selection yet.'));

    for(const record of records){const item=node('article');item.append(node('h4',record.name+' · selected quote version '+record.quoteVersion+' · '+money(record.amountCents)),node('p','Threshold at selection: '+money(record.thresholdCents)+' · '+record.comparison.count+' received offers in the frozen comparison.'),node('p',record.rationale),termView(record.terms,record.narrativeWithheld));for(const d of record.decisions)item.append(node('p',d.outcome.replaceAll('_',' ')+' · '+d.reason+' · '+new Date(d.recorded_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT'));const frozen=node('details');frozen.append(node('summary','Frozen comparison offers'));for(const q of record.frozenQuotes)frozen.append(node('h4',q.name+' · quote version '+q.quoteVersion+' · '+money(q.amountCents)),termView(q.terms,q.narrativeWithheld));item.append(frozen);if(record.reputation){const reputation=node('details');reputation.append(node('summary','Reputation and advice saved at selection'),pretty(record.reputation));item.append(reputation);}box.append(item);}return box;

  }

  const options={warranty:[['7_days','7 days'],['14_days','14 days'],['1_month','1 month'],['3_months','3 months'],['1_year','1 year'],['other','Other']],availability:[['same_day','Same day'],['next_day','Next day'],['2_3_days','Within 2–3 days'],['4_7_days','Within 4–7 days'],['other','Other']],duration:[['half_day','Up to half a day'],['1_day','1 day'],['2_3_days','2–3 days'],['4_7_days','4–7 days'],['other','Other'],['unknown','Unable to estimate yet — reason required']]};

  function money(cents,denominator=1) {let n=BigInt(cents),d=BigInt(denominator),sign=n<0n?'-':'';if(n<0n)n=-n;const rounded=(n+d/2n)/d;return sign+'SGD '+(rounded/100n)+'.'+String(rounded%100n).padStart(2,'0');}

  const explanations={wasteDisposal:['Waste disposal included','Yes means your final quoted amount covers collection, removal, and disposal of all waste generated by this job. No means waste disposal is excluded from your quote and must be arranged and paid for separately.'],warranty:['Warranty included','Yes means a warranty for the completed work is included in your final quoted amount. No means this quote offers no warranty for the completed work.'],makingGood:['Making good included','Yes means your final quoted amount covers restoring every surface or fixture disturbed by your work to its prior condition. No means that restoration is excluded and must be arranged and paid for separately.'],gstCharged:['GST charged?','Yes means your final quoted amount includes every GST charge you will bill for this job. No means you declare that no GST will be charged for this job.'],accessEquipment:['Access equipment included','Yes means your final quoted amount covers all access equipment needed to perform the work described in this RFQ. No means access equipment is excluded and must be arranged and paid for separately.']};

  const draftKey=id=>'qf-quote:'+contextKey+':'+id;

  async function refreshJobs() {

    const generation=epoch,jobs=await qf.api('contractor/jobs');if(generation!==epoch)return;

    let list=document.getElementById('own-quote-jobs');if(!list){list=node('div');list.id='own-quote-jobs';document.getElementById('opportunities-shell').append(list);}list.replaceChildren(node('h3','Your submitted jobs'));

    for(const job of jobs)button(list,job.rfq.publicDescription+' · '+(job.workCancelled?'Works cancelled':job.selection?.status??job.roundStatus),()=>openOpportunity({jobId:job.jobId,revision:job.rfqRevision,roundId:job.roundId,description:job.rfq.publicDescription,accessEquipmentRequired:job.rfq.accessEquipmentRequired??false},job));

  }

  async function openOpportunity(r,knownJob) {

    const generation=epoch;activeOpportunity=r;panel.hidden=false;quoteContent.replaceChildren();message.textContent='Loading your current quote record…';

    const [own,conversation]=await Promise.all([qf.api('opportunities/'+r.jobId+'/quotes'),qf.api('opportunities/'+r.jobId+'/conversation')]);if(generation!==epoch||activeOpportunity?.jobId!==r.jobId)return;

    quoteContent.append(node('h3',r.description));
    for(const id of knownJob?.rfq.evidenceIds??r.evidenceIds??[]){const a=node('a','View reviewed RFQ photo');a.href='/api/v1/files/'+id;quoteContent.append(a);}

    let open=true;try{r=await qf.api('opportunities/'+r.jobId);}catch(e){if(e.status===404)open=false;else throw e;}if(generation!==epoch)return;

    const current=own.quotes.find(q=>q.quote.round_id===r.roundId)?.quote;

    if(knownJob?.workCancelled)quoteContent.append(node('p','Works cancelled. Further ordinary work must stop; existing confirmed payments and claims remain separate.'));
    else if(knownJob?.selection)quoteContent.append(node('p',knownJob.selection.status==='pending'?'Your selected quote is held while awaiting MCST approval. Work is not authorised.':knownJob.selection.status==='authorised'?'Work is authorised for the selected quote version.':'This nomination was rejected; review current valid offers.'));

    for(const reveal of conversation.reveals)quoteContent.append(pretty({locationReveal:reveal.snapshot,cause:reveal.cause}));

    if(open)renderQuoteForm(r,current,own);

    else quoteContent.append(node('p','This job currently accepts no quote changes. Your submitted records remain available below.'));

    const history=node('details');history.append(node('summary','Your immutable quote versions'),ownHistory(own.quotes));quoteContent.append(history);

    renderConversation(quoteContent,r,conversation,true,open);

    message.textContent='Only your company’s quotations are shown here. Submission requires a connection and a fresh review.';

  }

  function renderQuoteForm(r,current,own) {

    const editor=node('div');quoteContent.append(editor);let saved=null;try{saved=JSON.parse(localStorage.getItem(draftKey(r.jobId)));}catch{}

    const old=saved?.terms??current?.terms??{},controls={};

    if(saved)editor.append(node('p','Restored your device draft. Confirm current scope and expiry again before submitting.'));

    controls.amountSgd=field(editor,'Final SGD amount payable — includes all GST charged','text',old.amountSgd??'');
    editor.append(node('p','Quotation total must be at least SGD 0.01.'));

    for(const [key,[label,copy]] of Object.entries(explanations)) {

      if(key==='accessEquipment'&&!r.accessEquipmentRequired)continue;

      controls[key]=choice(editor,label,[['yes','Yes'],['no','No']],typeof old[key]==='boolean'?(old[key]?'yes':'no'):'');

      const info=node('details');info.append(node('summary',label+' — information'),node('p',copy));editor.append(info);

    }

    const warranty=node('div');editor.append(warranty);controls.warrantyDuration=choice(warranty,'Warranty duration',options.warranty,old.warrantyDuration??'');controls.warrantyOther=field(warranty,'Other warranty duration','text',old.warrantyOther??'');

    const syncWarranty=()=>{warranty.hidden=controls.warranty.value!=='yes';controls.warrantyOther.parentElement.hidden=controls.warrantyDuration.value!=='other';};controls.warranty.onchange=syncWarranty;controls.warrantyDuration.onchange=syncWarranty;syncWarranty();

    editor.append(node('p','Earliest availability starts after work authorisation AND available site access.'));

    controls.availability=choice(editor,'Earliest availability',options.availability,old.availability??'');controls.availabilityOther=field(editor,'Other earliest availability','text',old.availabilityOther??'');

    controls.duration=choice(editor,'Estimated work duration',options.duration,old.duration??'');controls.durationReason=field(editor,'Other duration / unable-to-estimate reason','textarea',old.durationReason??'');

    const sync=()=>{controls.availabilityOther.parentElement.hidden=controls.availability.value!=='other';controls.durationReason.parentElement.hidden=!['other','unknown'].includes(controls.duration.value);};controls.availability.onchange=sync;controls.duration.onchange=sync;sync();

    const inherited=node('p');editor.append(inherited);const showExcluded=()=>{const excluded=Object.entries(explanations).filter(([key])=>!['gstCharged','warranty'].includes(key)&&controls[key]?.value==='no').map(([,v])=>v[0].replace(' included',''));inherited.textContent=(controls.warranty.value==='no'?'No warranty is offered. ':'')+(excluded.length?'Carried-forward service exclusions: '+excluded.join(', ')+'. Excluded third-party service costs are unknown.':'No service exclusions declared above. Answer additional exclusions separately.');};for(const key of ['wasteDisposal','warranty','makingGood','accessEquipment'])controls[key]?.addEventListener('change',showExcluded);showExcluded();

    controls.exclusions=choice(editor,'Additional exclusions',[['none','No additional exclusions'],['other','Other — specify']],old.exclusions?.[0]??'');controls.exclusionsOther=field(editor,'Other exclusions','textarea',old.exclusionsOther??'');const syncExclusions=()=>controls.exclusionsOther.parentElement.hidden=controls.exclusions.value!=='other';controls.exclusions.onchange=syncExclusions;syncExclusions();

    controls.narrative=field(editor,'Additional narrative — optional','textarea',old.narrative??'');controls.expiry=field(editor,'Expiry — YYYY-MM-DD or date/time with timezone; date-only valid through that Singapore date','text',old.expiry??own.suggestedExpiry);

    const expiryConfirmed=check(editor,'I confirm this expiry date or date/time.'),commitment=check(editor,own.commitmentCopy),scopeConfirmed=check(editor,'I reviewed RFQ revision '+r.revision+' and the current scope.');

    controls.revisionReason=field(editor,'Revision reason — mandatory after an approved site visit','textarea','');

    const file=field(editor,'Quotation PDF — optional','file');file.accept='application/pdf';let uploadedId=current?.pdf_id??null,uploadState=null;

    file.onchange=()=>{uploadedId=null;uploadState=null;};

    const uploadMessage=node('p');editor.append(uploadMessage);

    button(editor,'Upload / check optional quotation PDF',async()=>{

      const generation=epoch,chosen=file.files[0];if(!chosen||chosen.type!=='application/pdf'||chosen.size>10485760)throw new Error('Choose a PDF up to 10 MiB.');

      const bytes=await chosen.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),checksum=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');

      if(generation!==epoch)return;const org=qf.context.context.organisation_id,profile=await qf.api('contractors/'+org);

      if(!uploadState||uploadState.checksum!==checksum)uploadState={checksum};

      if(!uploadState.id)uploadState.id=(await qf.submit('contractors/'+org+'/quote-uploads',{mediaType:'application/pdf',byteSize:bytes.byteLength,checksum},profile.organisation.version)).uploadId;

      let state=await qf.api('uploads/'+uploadState.id);

      if(state.state==='transferring') {await qf.api('uploads/'+uploadState.id+'/renew',{});for(let offset=0;offset<bytes.byteLength;offset+=262144){if(generation!==epoch)return;if(state.chunks.some(c=>c.byte_offset===offset))continue;let binary='';for(const byte of new Uint8Array(bytes.slice(offset,offset+262144)))binary+=String.fromCharCode(byte);await qf.api('uploads/'+uploadState.id+'/chunks',{offset,bytes:btoa(binary)});}await qf.submit('uploads/'+uploadState.id+'/finalize',{},0);state=await qf.api('uploads/'+uploadState.id);}

      if(generation!==epoch)return;uploadedId=state.objects.find(o=>o.variant==='original')?.id??null;uploadMessage.textContent=state.state==='ready'?'Quotation PDF is ready. Submit the quote separately.':'PDF processing: '+state.state+'. Press again to check.';

    });

    function collect(confirmed) {

      const t={amountSgd:controls.amountSgd.value,availability:controls.availability.value,duration:controls.duration.value,exclusions:[controls.exclusions.value],expiry:controls.expiry.value,expiryConfirmed:confirmed&&expiryConfirmed.checked,commitment:confirmed&&commitment.checked};

      for(const key of Object.keys(explanations))if(controls[key]){if(!controls[key].value){if(confirmed)throw new Error('Choose Yes or No for '+explanations[key][0]);continue;}t[key]=controls[key].value==='yes';}

      if(t.warranty){t.warrantyDuration=controls.warrantyDuration.value;if(t.warrantyDuration==='other')t.warrantyOther=controls.warrantyOther.value;}

      if(t.availability==='other')t.availabilityOther=controls.availabilityOther.value;

      if(['other','unknown'].includes(t.duration))t.durationReason=controls.durationReason.value;

      if(t.exclusions[0]==='other')t.exclusionsOther=controls.exclusionsOther.value;

      if(controls.narrative.value)t.narrative=controls.narrative.value;return t;

    }

    button(editor,'Save device draft',()=>{localStorage.setItem(draftKey(r.jobId),JSON.stringify({terms:collect(false),rfqRevision:r.revision}));message.textContent='Saved on this device. No quote was submitted.';});

    button(editor,current?'Submit revised quote':'Submit initial quote',async()=>{

      if(!scopeConfirmed.checked)throw new Error('Review and confirm the current RFQ scope.');if(file.files.length&&!uploadedId)throw new Error('Wait for the quotation PDF to become ready.');

      const latest=await qf.api('opportunities/'+r.jobId);if(latest.revision!==r.revision)throw new Error('The RFQ changed. Save your device draft and review the latest revision.');

      await qf.submit('opportunities/'+r.jobId+'/quotes',{rfqRevision:r.revision,terms:collect(true),...(uploadedId?{pdfId:uploadedId}:{}),...(controls.revisionReason.value?{revisionReason:controls.revisionReason.value}:{})},current?.version??0);

      localStorage.removeItem(draftKey(r.jobId));await openOpportunity(r);await refreshJobs();await qf.refreshLists();

    });

    if(current?.status==='active') {

      const reconfirm=check(editor,'Reconfirm my existing exact terms against this RFQ revision; expiry remains unchanged.');

      button(editor,'Reconfirm existing quote',async()=>{await qf.submit('quotes/'+current.id+'/reconfirm',{rfqRevision:r.revision,confirmed:reconfirm.checked},current.version);await openOpportunity(r);});

      const reason=field(editor,'Withdrawal reason','text');button(editor,'Withdraw my current offer',async()=>{await qf.submit('quotes/'+current.id+'/withdraw',{reason:reason.value},current.version);await openOpportunity(r);await refreshJobs();});

    }

  }

  function renderConversation(parent,r,data,contractor,open=true) {

    const details=node('details');details.append(node('summary','Questions about this job and site visits'));parent.append(details);

    for(const answer of data.shared)details.append(node('p',answer.public_question+' — '+answer.public_answer));

    for(const question of data.questions) {

      const item=node('article');item.append(node('p',question.name+' · '+question.question+' · '+question.state));details.append(item);

      if(!contractor&&question.state==='pending'&&open){const publicQuestion=field(item,'Sanitized shared question','textarea'),publicAnswer=field(item,'Sanitized factual answer','textarea'),classification=choice(item,'Revision classification',[['material','Material — reconfirmation required'],['minor','Minor spelling/formatting']],'material'),kind=choice(item,'What changed?',[['access','Access'],['scope','Scope'],['quantities','Quantities'],['price_terms','Price terms'],['safety','Safety'],['uncertain','Uncertain — material'],['spelling','Spelling'],['formatting','Formatting']],'uncertain'),reason=field(item,'Classification reason','text'),privacy=check(item,'I removed estate identifiers, contractor identities, prices and proprietary content.'),facts=check(item,'I confirm the shared answer is factual.');

        for(const outcome of ['answered','declined'])button(item,outcome==='answered'?'Publish reviewed factual answer':'Decline this request',async()=>{await qf.submit(`workspaces/${r.jobId}/questions/${question.id}/respond`,{rfqRevision:data.rfqRevision,outcome,publicQuestion:publicQuestion.value,publicAnswer:publicAnswer.value,classification:classification.value,changeKinds:[kind.value],reason:reason.value,privacyConfirmed:privacy.checked,factsConfirmed:facts.checked},question.version);await qf.loadJob(r.jobId,false);await qf.refreshLists();});}

    }

    for(const visit of data.visits) {const item=node('article');item.append(node('p','Site visit · '+visit.reason+' · '+visit.state));details.append(item);if(!contractor&&visit.state==='pending'&&open){const reason=field(item,'Decision reason — optional','text'),time=field(item,'Agreed visit time — optional (Singapore local time)','datetime-local'),confirmed=check(item,'I confirm the decision; approval reveals the exact estate location to this company.');for(const outcome of ['approved','declined'])button(item,outcome==='approved'?'Approve site visit':'Decline site visit',async()=>{await qf.submit(`workspaces/${r.jobId}/visits/${visit.id}/decide`,{outcome,reason:reason.value,confirmed:confirmed.checked,...(time.value?{visitAt:new Date(time.value+':00+08:00').toISOString()}: {})},visit.version);await qf.loadJob(r.jobId,false);await qf.refreshLists();});}}

    if(contractor&&open){const question=field(details,'Private factual question — before your first quote','textarea');button(details,'Ask before quoting',async()=>{await qf.submit('opportunities/'+r.jobId+'/questions',{rfqRevision:r.revision,question:question.value},0);await openOpportunity(r);});const reason=field(details,'Site-visit request reason — initial quote required','text');button(details,'Request a site visit',async()=>{await qf.submit('opportunities/'+r.jobId+'/visits',{rfqRevision:r.revision,reason:reason.value},0);await openOpportunity(r);});}

  }

  async function loadComparison(id) {

    const generation=epoch;comparisonContent.replaceChildren();

    const [c,data]=await Promise.all([qf.api('workspaces/'+id+'/comparison'),qf.api('workspaces/'+id+'/conversation')]);if(generation!==epoch||qf.job?.id!==id)return;

    const status=node('p');status.setAttribute('role','status');comparisonContent.append(status);const role=qf.context.context.role,open=c.roundStatus==='open';

    const frozenComparison=c.history.find(h=>h.selectionId===c.selection?.selection_id)?.comparison;
    const displayedComparison=open?c.comparison:(frozenComparison??c.comparison);
    comparisonContent.append(node('p',(open?displayedComparison.count+' current selectable offers.':'Quoting '+c.roundStatus+'. '+displayedComparison.count+' offers captured at selection.')+' Current approval threshold: '+(c.thresholdCents===null?'Admin configuration required':money(c.thresholdCents))+'.'));
    if(displayedComparison.average)comparisonContent.append(node('p','Highest received quote: '+money(displayedComparison.highestCents)+' | Average received quote: '+money(displayedComparison.average.numeratorCents,displayedComparison.average.denominator)+' (rounded for display).'));
    if(c.clock)comparisonContent.append(node('p','Selection follow-up: '+c.clock.status+(c.clock.scheduled_review_at?' · Scheduled review '+new Date(c.clock.scheduled_review_at).toLocaleString('en-SG',{timeZone:'Asia/Singapore'})+' SGT':'')));
    if(open){const advice=node('details');advice.append(node('summary','Evidence-based comparison advice'));comparisonContent.append(advice);
      button(advice,'Request current comparison advice',async()=>{const result=await qf.submit('workspaces/'+id+'/advice',{confirmed:true},c.version);const output=advice.querySelector('pre')||node('pre');output.textContent=JSON.stringify(result.result,null,2);advice.append(output);});
      advice.append(node('p','Advice uses the configured server provider. Current factual comparison remains available if AI is unavailable. No preference does not imply choosing the cheapest quote.'));
    }

    for(const quote of c.quotes) {

      const item=node('article');item.append(node('h3',quote.name+' · '+money(quote.amountCents)+' · '+(quote.selectable?'Selectable':quote.held?(c.selection?.status==='authorised'?'Authorised quote terms':'Held selected terms'):quote.expired?'Expired':quote.status==='withdrawn'?'Withdrawn':quote.requiresReconfirmation?'Scope reconfirmation required':'Currently unselectable')),termView(quote.terms,quote.narrativeWithheld));comparisonContent.append(item);
      const reputation=quote.reputation;item.append(node('p','Pure reputation score: '+(reputation.pure===null?'Not enough approved evidence':reputation.pure.toFixed(1))+' · Reputation score with CM priorities: '+(reputation.adjusted===null?'Not enough approved evidence':reputation.adjusted.toFixed(1))+' · '+reputation.quoteFixCount+' QuoteFix jobs / '+reputation.externalCount+' external references.'));
      const passport=node('details'),passportContent=node('div');passport.append(node('summary','Expanded contractor passport'),passportContent);item.append(passport);
      button(passport,'Load current passport',()=>window.qfReputation.passport(id,quote.quoteId,passportContent));

      if(quote.pdfId){const a=node('a','View quotation PDF');a.href='/api/v1/files/'+quote.pdfId;item.append(a);}if(quote.pdfWithheld)item.append(node('p','Quotation PDF withheld while contractor identities are concealed. MCST can review it.'));

      if(quote.selectable&&c.comparison.average){const sum=BigInt(c.comparison.average.numeratorCents),count=BigInt(c.comparison.average.denominator),price=BigInt(quote.amountCents);item.append(node('p',quote.name+"’s price vs Highest Quote: "+money(price-BigInt(c.comparison.highestCents))+'. Price vs Average Quote: '+money(price*count-sum,Number(count))+'. These are received-price differences.'));}

      if(open){button(item,'Prompt Contractor to Re-Quote',async()=>{await qf.submit('workspaces/'+id+'/quotes/prompt',{quoteId:quote.quoteId},c.version);status.textContent='Prompt sent. The expiry and round remain as recorded.';});}

      if(!quote.selectable)continue;

      const warning=c.integrityPreviews?.[quote.quoteId],flagged=warning?.triggers.some(t=>!t.previouslyCleared),above=c.thresholdCents!==null&&quote.amountCents>c.thresholdCents,thresholdAck=above&&role!=='cm';
      let clearWarning,warningExplanation;
      if(warning?.triggers.length){item.append(node('p','Procurement warnings: review the exact amounts, terms and configured thresholds.'),node('pre',JSON.stringify(warning.triggers,null,2)));
        if(flagged&&role!=='cm'){warningExplanation=field(item,'Required explanation for warning clearance','textarea');clearWarning=check(item,'Allow work to proceed after reviewing these exact quote and count warnings.');}}
      const disclosure=(above||flagged)&&role==='cm'?'Select '+quote.name+' for MCST approval and any required warning clearance? Quotations will pause while MCST reviews this selection. Work can begin only after approval. If MCST rejects the selection, you can choose another contractor or reopen quotations on this ticket.':'Select '+quote.name+" for this job? Your selection authorizes this contractor to proceed and closes this ticket's quotation phase. This action cannot be reversed. To select another contractor, create a new ticket.";
      const cautions=[...quote.cautions,...(c.comparison.count<3?['limited_comparison']:[])],acks=cautions.map(code=>({code,input:check(item,'I acknowledge: '+code.replaceAll('_',' '))})),rationale=field(item,'Written selection rationale','textarea');
      item.append(node('p',disclosure));const confirmed=check(item,'I confirm selection of quote version '+quote.quoteVersion+' at '+money(quote.amountCents)+'.');

      if(above&&role==='cm')item.append(node('p','This nomination will require MCST approval. Work remains unauthorised until approved.'));

      button(item,role==='cm'?'Select this exact quote':'Select and approve this exact quote',async()=>{if(!confirmed.checked||acks.some(a=>!a.input.checked))throw new Error('Confirm the exact selection and acknowledge every caution.');const thresholdAcknowledged=thresholdAck?await confirmThreshold(quote.amountCents,c.thresholdCents):false;if(thresholdAck&&!thresholdAcknowledged)return;await qf.submit('workspaces/'+id+'/select',{quoteId:quote.quoteId,quoteVersion:quote.quoteVersion,settingsVersion:c.settingsVersion,rfqRevision:c.rfqRevision,rationale:rationale.value,confirmed:confirmed.checked,reputationFingerprint:c.reputationFingerprint,acknowledgedCautions:acks.filter(a=>a.input.checked).map(a=>a.code),thresholdAcknowledged,...(clearWarning?{clearWarning:clearWarning.checked,warningExplanation:warningExplanation.value}:{})},c.version);await qf.loadJob(id,false);await qf.refreshLists();});

    }

    if(c.selection?.status==='pending') {
      const selected=c.history.find(h=>h.selectionId===c.selection.selection_id),warning=c.integrityPreviews?.pending;
      comparisonContent.append(node('h3','Held nomination — '+selected.name+' · '+money(selected.amountCents)),termView(selected.terms,selected.narrativeWithheld),node('p','Threshold recorded at selection: '+money(selected.thresholdCents)),node('p','Selection rationale: '+selected.rationale));
      if(warning?.triggers.length)comparisonContent.append(node('p','Warnings recorded at this exact selection:'),node('pre',JSON.stringify(warning.triggers,null,2)));
      if(['mcst','admin'].includes(role)) {
        const acks=selected.cautions.map(code=>({code,input:check(comparisonContent,'I acknowledge: '+code.replaceAll('_',' '))})),reason=field(comparisonContent,'Decision reason — optional for rejection','textarea'),confirmed=check(comparisonContent,'I confirm this exact pending nomination.');
        let clearWarning,warningExplanation;
        if(warning?.triggers.some(t=>!t.previouslyCleared)){warningExplanation=field(comparisonContent,'Required explanation for clearing the exact selection warnings','textarea');clearWarning=check(comparisonContent,'Allow work to proceed after reviewing the recorded warnings.');}
        for(const outcome of ['approved','rejected'])button(comparisonContent,outcome==='approved'?'Approve and authorise work':'Reject nomination',async()=>{
          await qf.submit('workspaces/'+id+'/selection/decide',{selectionId:c.selection.selection_id,outcome,reason:reason.value,confirmed:confirmed.checked,acknowledgedCautions:acks.filter(a=>a.input.checked).map(a=>a.code),...(clearWarning?{clearWarning:clearWarning.checked,warningExplanation:warningExplanation.value}:{})},c.version);await qf.loadJob(id,false);await qf.refreshLists();
        });
      }
    }

    if(c.selection?.status==='rejected'){const reason=field(comparisonContent,'Reason to open a new quotation round','text');button(comparisonContent,'Explicitly reopen quotations',async()=>{await qf.submit('workspaces/'+id+'/selection/reopen',{reason:reason.value},c.version);await qf.loadJob(id,false);await qf.refreshLists();});}

    if(open&&c.clock&&c.clock.status!=='stopped'){const at=field(comparisonContent,'Schedule the next selection review — Singapore local time','datetime-local');button(comparisonContent,'Save scheduled review',async()=>{if(!at.value)throw new Error('Choose a future review time.');await qf.submit('workspaces/'+id+'/selection/schedule',{at:new Date(at.value+':00+08:00').toISOString()},c.version);await qf.loadJob(id,false);});}

    if(c.selection?.status==='authorised'){const replacement=node('details');replacement.append(node('summary','Create a linked replacement ticket'));comparisonContent.append(replacement);const title=field(replacement,'New ticket title'),observations=field(replacement,'New private observations','textarea'),location=field(replacement,'New private affected location'),reason=field(replacement,'Replacement reason');button(replacement,'Create linked private replacement ticket',async()=>{const result=await qf.submit('workspaces/'+id+'/selection/replacement',{title:title.value,observations:observations.value,affectedLocation:location.value,reason:reason.value},c.version);await qf.loadJob(result.jobId,false);await qf.refreshLists();});}

    renderConversation(comparisonContent,{jobId:id},data,false,open);

    const history=node('details');history.append(node('summary','Recorded selections and frozen comparisons'),selectionHistory(c.history));comparisonContent.append(history);

    if(['admin','mcst'].includes(role)){const settings=node('details');settings.append(node('summary','Estate procurement settings'));comparisonContent.append(settings);const reason=field(settings,'Setting change reason');let threshold,address,visibility;

      if(role==='admin'){threshold=field(settings,'Approval threshold SGD — explicit configuration','text',c.thresholdCents===null?'':(c.thresholdCents/100).toFixed(2));address=field(settings,'Private estate address — revealed only on approved visit or authorisation');}

      visibility=choice(settings,'CM contractor identity visibility',[['yes','Visible'],['no','Concealed']]);button(settings,'Save explicit estate settings',async()=>{const body={reason:reason.value};if(threshold?.value)body.thresholdSgd=threshold.value;if(address?.value)body.address=address.value;if(visibility.value)body.identitiesVisible=visibility.value==='yes';await qf.submit('estates/'+qf.job.estate_id+'/procurement-settings',body,c.settingsVersion);await qf.loadJob(id,false);});}

  }

  document.addEventListener('qf:opportunities',e=>{for(const r of e.detail){const article=document.querySelector('[data-opportunity="'+r.jobId+'"]');if(article)button(article,'Open my quote / questions',()=>openOpportunity(r));}refreshJobs().catch(e=>message.textContent=e.message);});

  document.addEventListener('qf:job',e=>{comparisonPanel.hidden=true;comparisonContent.replaceChildren();if(e.detail.job.stage!=='Report an issue'&&e.detail.job.stage!=='AI is refining your draft'&&e.detail.job.stage!=='Approving AI input'){comparisonPanel.hidden=false;loadComparison(e.detail.job.id).catch(error=>comparisonContent.append(node('p',error.message)));}});

  document.addEventListener('qf:context',e=>{const next=e.detail?.context?[e.detail.user.id,e.detail.context.id].join(':'):'';if(next===contextKey)return;contextKey=next;epoch++;activeOpportunity=null;panel.hidden=true;quoteContent.replaceChildren();comparisonContent.replaceChildren();message.textContent='';document.getElementById('own-quote-jobs')?.remove();});

  window.qfQuotes={async open(id){const generation=epoch,jobs=await qf.api('contractor/jobs');if(generation!==epoch)return;const job=jobs.find(j=>j.jobId===id);
    if(job)return openOpportunity({jobId:id,revision:job.rfqRevision,roundId:job.roundId,description:job.rfq.publicDescription,accessEquipmentRequired:job.rfq.accessEquipmentRequired??false},job);
    return openOpportunity(await qf.api('opportunities/'+id));}};
})();
