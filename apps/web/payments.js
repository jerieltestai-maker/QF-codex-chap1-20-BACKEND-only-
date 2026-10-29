(() => {
  'use strict';
  // One payment surface for ordinary invoices and confirmed cancellation settlements.
  function render(data,ui) {
    const {content,node,form,field,check,choice,button,slide,documentUpload,command,stamp,cents,instant}=ui;
    const finance=data.finance,c=finance.completion,r=ui.role;
    const children=parent=>Array.from(parent.children),bodyChildren=parent=>children(parent).filter(child=>child!==parent._qfStatus&&child.tagName!=='SUMMARY'&&child.tag!=='summary');
    const wizard=(parent,id,title,steps)=>window.qfFlow?.wizard(parent,{id:'payment-'+(window.qfWorkspace?.context?.user?.id||'')+':'+(window.qfWorkspace?.context?.context?.id||'')+':'+data.jobId+':'+id,title,steps});
    const amountValue=value=>{if(!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(value.trim()))return null;const [whole,fraction='']=value.trim().split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));};
    const required=(value,message)=>{if(!String(value??'').trim())throw new Error(message);};
    const serverInstant=Date.parse(finance.serverTime||'');
    const today=Number.isFinite(serverInstant)?new Date(serverInstant+8*3600000).toISOString().slice(0,10):'';
    const facts=(parent,values)=>{const dl=node('dl');dl.className='facts-grid payment-balances';for(const [label,value] of values)dl.append(node('dt',label),node('dd',value));parent.append(dl);};
    const bind=(control,inputs,valid)=>{const update=()=>{control.disabled=!valid();};for(const input of inputs)for(const event of ['input','change'])input.addEventListener(event,update);update();};
    if(c?.confirmed_version||finance.financialConfirmation) {
      const b=finance.balances;facts(content,[['Confirmed payable',cents(b.payableCents)],['Outstanding settlement',cents(b.outstandingCents)]]);
      const balanceDetails=node('details');balanceDetails.className='payment-breakdown';balanceDetails.append(node('summary','Payment breakdown'));facts(balanceDetails,[['Transfers recorded',cents(b.sentCents)],['Actual / assumed receipts',cents(b.receivedCents)],['Disputed',cents(b.disputedCents)],['Unsent balance',cents(b.unsentCents)]]);content.append(balanceDetails);
      if(['mcst','admin'].includes(r)&&finance.followUp?.nextDueAt) {const p=node('p');p.className='state-note';p.dataset.due=finance.followUp.nextDueAt;p.dataset.followupPrefix=r==='admin'?'Follow up with MCST about the missing payment update in':'QuoteFix will follow up on this payment in';content.append(p);}
      else if(['mcst','admin'].includes(r)&&finance.followUp)content.append(node('p','Payment follow-up due. Admin must record the next action and time.'));
      if(BigInt(b.payableCents)===0n)content.append(node('p','No payment due. Remaining obligations must be met before closure.'));
      if(r==='contractor'&&BigInt(b.unsentCents)>0n) {const f=form('Review payment discrepancy — remaining balance'),description=field(f,'Unpaid balance issue explanation','textarea');button(f,'Payment Issue',()=>{required(description.value,'Explain the issue with the unpaid balance.');return command(data,'payments/issue',{description:description.value});});}
      for(const issue of finance.balanceIssues||[]) {
        const f=form('Unresolved balance issue');f.append(node('p',issue.description));
        if(r==='admin') {const reason=field(f,'Resolution reason','textarea'),evidence=field(f,'Actual execution / verification evidence','textarea');button(f,'Resolve verified balance case',()=>{required(reason.value,'Explain the balance-case resolution.');required(evidence.value,'Record the actual execution or verification evidence.');return command(data,'payments/resolve-balance',{supportId:issue.id,reason:reason.value,executionEvidence:evidence.value});});}
      }
        if(r==='mcst'&&BigInt(b.unsentCents)>0n) {
        const f=form('Payment Sent');f.open=true;const notice=node('p','Record a completed bank transfer. QuoteFix does not send money.');f.append(notice);const proofStart=children(f).length;
        const proof=documentUpload(f,data,'payment_proof','Completed-transfer proof'),amount=field(f,'Transfer amount SGD'),at=field(f,'Actual bank transfer date','date'),reason=field(f,'Partial-payment rationale (required if balance remains)','textarea'),reference=field(f,'Optional bank reference'),completed=check(f,'This bank transfer has been completed.'),duplicate=check(f,'I reviewed existing transfers; this is a separate instalment if a possible duplicate is flagged.');
        amount.inputMode='decimal';amount.required=true;amount.pattern='(0|[1-9][0-9]*)(\\.[0-9]{1,2})?';at.required=true;at.max=today;reference.maxLength=200;
        const partial=()=>{const value=amountValue(amount.value);reason.required=value!==null&&value>0n&&value<BigInt(b.unsentCents);reason.parentElement.hidden=!reason.required&&!reason.value;};amount.addEventListener('input',partial);partial();
        const valid=()=>{const value=amountValue(amount.value);return completed.checked&&value!==null&&value>0n&&value<=BigInt(b.unsentCents)&&!!at.value&&(!today||at.value<=today)&&(value===BigInt(b.unsentCents)||!!reason.value.trim());};
        slide(f,'Payment Sent',()=>{if(!valid())throw new Error('Enter a positive transfer amount no greater than the unsent balance, its actual date, completed-transfer confirmation and a rationale for any partial payment.');return command(data,'payments/transfer',{invoiceVersion:c?.confirmed_version??finance.financialConfirmation.version,...(finance.financialConfirmation?{financialVersion:finance.financialConfirmation.version}:{}),proofId:proof(),amountSgd:amount.value.trim(),transferDate:at.value,rationale:reason.value,reference:reference.value,completedTransfer:completed.checked,confirmed:true,duplicateAcknowledged:duplicate.checked});},valid);
        const all=bodyChildren(f),transfer=[notice,amount.parentElement,at.parentElement,reason.parentElement,reference.parentElement],proofFields=children(f).slice(proofStart,children(f).indexOf(amount.parentElement));
        const review=node('dl');review.className='facts-grid payment-review';const reviewAmount=node('dd'),reviewDate=node('dd');review.append(node('dt','Transfer amount'),reviewAmount,node('dt','Transfer date'),reviewDate);
        const preview=()=>{const value=amountValue(amount.value);reviewAmount.textContent=value===null?'Enter an amount':cents(value);reviewDate.textContent=at.value||'Enter a date';};amount.addEventListener('input',preview);at.addEventListener('input',preview);preview();f.append(review);
        wizard(f,'transfer','Record payment',[
          {title:'Transfer',fields:transfer},
          {title:'Proof',fields:proofFields},
          {title:'Confirm',fields:[review,...all.filter(el=>!transfer.includes(el)&&!proofFields.includes(el))]}
        ]);
        const progress=form('Payment progress'),explanation=field(progress,'Actual payment / paperwork progress','textarea'),next=field(progress,'Next update if known — Singapore time','datetime-local');button(progress,'Record progress',()=>{required(explanation.value,'Describe the actual payment or paperwork progress.');return command(data,'payments/progress',{explanation:explanation.value,...(next.value?{nextUpdateAt:instant(next)}:{})});});
      }
      for(const t of finance.transfers) {
        const labels={pending:'Awaiting receipt confirmation',actual:'Actual receipt confirmed',assumed:'Assumed received',disputed:'Payment Issue under review',void:'Voided transfer record'};
        const f=form('Transfer '+cents(t.amount_cents)+' · '+(labels[t.status]||t.status));facts(f,[['Bank transfer date',t.transfer_date],['Reported in QuoteFix',stamp(t.reported_at)],['First receipt notice',stamp(t.first_issued_at)]]);if(t.rationale)f.append(node('p','Partial-payment rationale: '+t.rationale));if(t.reference)f.append(node('p','Bank reference: '+t.reference));
        if(t.proof_id){const a=node('a','View completed-transfer proof');a.href='/api/v1/files/'+t.proof_id;f.append(a);}
        if(t.receipt_date)f.append(node('p','Receipt: '+t.receipt_date+' ('+t.receipt_precision+')'));
        if(r==='contractor'&&t.status!=='void') {
          if(t.receipt_due_at&&t.status==='pending')f.append(node('p','Please confirm receipt of payment or report a Payment Issue by '+stamp(t.receipt_due_at)+'. Without a response, '+cents(t.amount_cents)+' will be recorded as assumed received on that date.'));
          if(t.showAssumedPopup) {f.open=true;f.append(node('p','Payment recorded automatically. No payment response was received by '+stamp(t.receipt_due_at)+', so QuoteFix recorded '+cents(t.amount_cents)+' as received on '+stamp(t.receipt_date)+', under T+7D. If this is incorrect, select Payment Issue.'));button(f,'Understood',()=>command(data,'payments/understood',{transferId:t.id}));}
          if(['pending','assumed'].includes(t.status)) {const at=field(f,'Actual receipt date','date'),confirm=check(f,'I confirm actual receipt of this exact transfer.');at.max=today;at.min=String(t.transfer_date||'').slice(0,10);const valid=()=>confirm.checked&&!!at.value&&(!today||at.value<=today)&&(!at.min||at.value>=at.min);const received=button(f,'Received payment',()=>{if(!valid())throw new Error('Enter the actual receipt date and confirm this exact transfer amount.');return command(data,'payments/receipt',{transferId:t.id,amountSgd:BigInt(t.amount_cents)/100n+'.'+String(BigInt(t.amount_cents)%100n).padStart(2,'0'),receiptDate:at.value,confirmed:confirm.checked});});bind(received,[at,confirm],valid);}
          const issue=node('details');issue.className='payment-issue';issue.append(node('summary','Report a payment issue'));f.append(issue);const description=field(issue,'Payment issue explanation','textarea');button(issue,'Payment Issue',()=>{required(description.value,'Explain the issue with this transfer.');return command(data,'payments/issue',{transferId:t.id,description:description.value});});
        }
        if(r==='admin'&&t.status==='disputed') {
          const outcome=choice(f,'Verified outcome',[['pending','Receipt remains unverified'],['actual','Actual receipt verified'],['void','Transfer record invalid / void']]),reason=field(f,'Decision reason','textarea'),evidence=field(f,'Actual execution / verification evidence','textarea'),at=field(f,'Actual receipt date if verified','date'),action=field(f,'Admin next action if unresolved'),followUp=field(f,'Admin follow-up if unresolved — Singapore time','datetime-local');
          const fields=()=>{at.parentElement.hidden=outcome.value!=='actual';action.parentElement.hidden=followUp.parentElement.hidden=outcome.value!=='pending';};outcome.addEventListener('change',fields);fields();
          button(f,'Record payment review',()=>{required(outcome.value,'Choose the verified outcome.');required(reason.value,'Explain the review decision.');required(evidence.value,'Record actual execution or verification evidence.');if(outcome.value==='actual')required(at.value,'Enter the actual receipt date.');if(outcome.value==='pending')required(action.value,'Record the next action for this unresolved issue.');return command(data,'payments/resolve',{transferId:t.id,outcome:outcome.value,reason:reason.value,executionEvidence:evidence.value,...(outcome.value==='actual'?{receiptDate:at.value}:outcome.value==='pending'?{nextAction:action.value,followUpAt:instant(followUp)}:{})});});
        }
      }
    }
  }
  window.qfPayments={render};
})();
