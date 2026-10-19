(() => {
  'use strict';
  // One payment surface for ordinary invoices and confirmed cancellation settlements.
  function render(data,ui) {
    const {content,node,form,field,check,choice,button,slide,documentUpload,command,stamp,cents,instant}=ui;
    const finance=data.finance,c=finance.completion,r=ui.role;
    if(c?.confirmed_version||finance.financialConfirmation) {
      const b=finance.balances;content.append(node('p','Confirmed payable '+cents(b.payableCents)+' · Transfers recorded '+cents(b.sentCents)+' · Actual / assumed receipts '+cents(b.receivedCents)+' · Disputed '+cents(b.disputedCents)+' · Unsent balance '+cents(b.unsentCents)+' · Outstanding settlement '+cents(b.outstandingCents)));
      if(finance.followUp?.nextDueAt) {const p=node('p');p.dataset.due=finance.followUp.nextDueAt;p.dataset.followupPrefix=r==='admin'?'Follow up with MCST about the missing payment update in':'QuoteFix will follow up on this payment in';content.append(p);}
      else if(finance.followUp)content.append(node('p','Payment follow-up is due. Admin must record the next action and follow-up time.'));
      if(r==='contractor'&&BigInt(b.unsentCents)>0n) {const f=form('Review payment discrepancy — remaining balance'),description=field(f,'Unpaid balance issue explanation','textarea');button(f,'Payment Issue',()=>command(data,'payments/issue',{description:description.value}));}
      for(const issue of finance.balanceIssues||[]) {
        const f=form('Unresolved balance issue');f.append(node('p',issue.description));
        if(r==='admin') {const reason=field(f,'Resolution reason','textarea'),evidence=field(f,'Actual execution / verification evidence','textarea');button(f,'Resolve verified balance case',()=>command(data,'payments/resolve-balance',{supportId:issue.id,reason:reason.value,executionEvidence:evidence.value}));}
      }
        if(r==='mcst'&&BigInt(b.unsentCents)>0n) {
        const f=form('Payment Sent'),proof=documentUpload(f,data,'payment_proof','Completed-transfer proof'),amount=field(f,'Transfer amount SGD'),at=field(f,'Actual bank transfer date','date'),reason=field(f,'Partial-payment rationale (required if balance remains)','textarea'),reference=field(f,'Optional bank reference'),completed=check(f,'This bank transfer has been completed.'),duplicate=check(f,'I reviewed existing transfers; this is a separate instalment if a possible duplicate is flagged.');
          slide(f,'Payment Sent',()=>command(data,'payments/transfer',{invoiceVersion:c?.confirmed_version??finance.financialConfirmation.version,...(finance.financialConfirmation?{financialVersion:finance.financialConfirmation.version}:{}),proofId:proof(),amountSgd:amount.value,transferDate:at.value,rationale:reason.value,reference:reference.value,completedTransfer:completed.checked,confirmed:true,duplicateAcknowledged:duplicate.checked}),()=>completed.checked&&!!amount.value&&!!at.value);
        const progress=form('Payment progress'),explanation=field(progress,'Actual payment / paperwork progress','textarea'),next=field(progress,'Next update if known — Singapore time','datetime-local');button(progress,'Record progress',()=>command(data,'payments/progress',{explanation:explanation.value,...(next.value?{nextUpdateAt:instant(next)}:{})}));
      }
      for(const t of finance.transfers) {
        const f=form('Transfer '+cents(t.amount_cents)+' · '+(t.status==='assumed'?'Assumed received':t.status));f.append(node('p','Bank transfer '+t.transfer_date+' · Reported '+stamp(t.reported_at)+' · First receipt notice '+stamp(t.first_issued_at)),node('p',t.rationale));
        if(t.proof_id){const a=node('a','View completed-transfer proof');a.href='/api/v1/files/'+t.proof_id;f.append(a);}
        if(t.receipt_date)f.append(node('p','Receipt: '+t.receipt_date+' ('+t.receipt_precision+')'));
        if(r==='contractor'&&t.status!=='void') {
          if(t.receipt_due_at&&t.status==='pending')f.append(node('p','Please confirm receipt of payment or report a Payment Issue by '+stamp(t.receipt_due_at)+'. Without a response, '+cents(t.amount_cents)+' will be recorded as assumed received on that date.'));
          if(t.showAssumedPopup) {f.open=true;f.append(node('p','Payment recorded automatically. No payment response was received by '+stamp(t.receipt_due_at)+', so QuoteFix recorded '+cents(t.amount_cents)+' as received on '+stamp(t.receipt_date)+', under T+7D. If this is incorrect, select Payment Issue.'));button(f,'Understood',()=>command(data,'payments/understood',{transferId:t.id}));}
          if(['pending','assumed'].includes(t.status)) {const at=field(f,'Actual receipt date','date'),confirm=check(f,'I confirm actual receipt of this exact transfer.');button(f,'Received payment',()=>command(data,'payments/receipt',{transferId:t.id,amountSgd:BigInt(t.amount_cents)/100n+'.'+String(BigInt(t.amount_cents)%100n).padStart(2,'0'),receiptDate:at.value,confirmed:confirm.checked}));}
          const description=field(f,'Payment issue explanation','textarea');button(f,'Payment Issue',()=>command(data,'payments/issue',{transferId:t.id,description:description.value}));
        }
        if(r==='admin'&&t.status==='disputed') {
          const outcome=choice(f,'Verified outcome',[['pending','Receipt remains unverified'],['actual','Actual receipt verified'],['void','Transfer record invalid / void']]),reason=field(f,'Decision reason','textarea'),evidence=field(f,'Actual execution / verification evidence','textarea'),at=field(f,'Actual receipt date if verified','date'),action=field(f,'Admin next action if unresolved'),followUp=field(f,'Admin follow-up if unresolved — Singapore time','datetime-local');
          button(f,'Record payment review',()=>command(data,'payments/resolve',{transferId:t.id,outcome:outcome.value,reason:reason.value,executionEvidence:evidence.value,...(outcome.value==='actual'?{receiptDate:at.value}:outcome.value==='pending'?{nextAction:action.value,followUpAt:instant(followUp)}:{})}));
        }
      }
    }
  }
  window.qfPayments={render};
})();
