# QuoteFix lifecycle review v9 — clarity, billing and durability feedback

Applies the owner's review of v8 and subsequent explicit answers. Other confirmed decisions remain. This is a planning revision, not application implementation.

## 1. P1 countdown: what happens at zero?

Admin is notified that **MCST has not recorded payment or a meaningful payment update**. Admin follows up to establish whether money has been sent and obtain either transfer proof or a progress update. The app cannot conclude that the bank transfer is unpaid just because the app record is missing.

Proposed clearer wording:

- MCST: **QuoteFix will follow up on this payment in {days}d {hours}h — {date/time SGT}.**
- Admin: **Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time SGT}.**

The approved events remain: payment task immediately on invoice confirmation; reminder/Admin alert after one business day without a record/update; another Admin alert after three business days unresolved; then Admin sets the next contact time. At zero, send the applicable alert and show the next scheduled follow-up. A missed human follow-up is identified in Admin's queue.

This is a support countdown, never a universal MCST bank-payment deadline, payment penalty or cancellation timer. Do not demand an invented expected payment date. Record a meaningful update and known timing if available; do not confuse it with payment.

## 2. P3: what Review payment discrepancy opens

The existing payment details panel, with no extra approval:

- Final confirmed invoice/settlement amount.
- Each recorded transfer: amount, actual transfer date, proof and reporting time.
- Each receipt: confirmed, assumed under T+7D, awaiting response or disputed.
- Remaining amount not recorded as sent, separately from sent money awaiting confirmation.
- MCST's partial-payment rationale and any existing support case.
- The actual next actor and available action.

Example: invoice **SGD 1,200**, **SGD 800** received, **SGD 400** not recorded as sent. MCST sees **Payment Sent** for the remainder; Contractor can use **Received payment / Payment Issue** for a recorded transfer. CM can view permitted records but cannot record payment. Admin follows up in the linked case. If the remaining SGD 400 was already transferred offline, upload its proof rather than transfer again.

QuoteFix fees do not appear in this panel.

## 3. Fees — five points

1. The charge is **4% platform fee + 4% lead fee** of the final confirmed payable invoice/settlement total. There is no extra flat SGD 8 fee.
2. A confirmed total of **SGD 1,200** produces **SGD 48 + SGD 48 = SGD 96 total fees**.
3. If an earlier SGD 1,000 total produced SGD 80 of fees, the revised total is still SGD 96. Any SGD 16 difference is reconciliation to that total, not a surcharge on top of it. Preserve the earlier assessment instead of creating duplicate full fees.
4. Already-paid fees count toward the total: SGD 80 paid leaves SGD 16; nothing paid leaves SGD 96. Refund/adjustment due-date mechanics remain O05 rather than silently becoming policy.
5. The owner explicitly reconfirmed that MCST invoice confirmation triggers assessment and the three-business-day fee deadline, even if MCST has paid only SGD 600 of the SGD 1,200 invoice. These obligations appear only in Contractor account billing; Admin handles collection separately. CM/MCST tickets show no fee controls or statements.

## 4. Durability feedback: three normal outcomes, one exception

At the existing 30-day due date, reveal **Give feedback**:

- **1–3 stars:** negative durability feedback, with a required open observation about deterioration, defects, wear or recurrence.
- **4–5 stars:** positive durability feedback, with a required open observation about continued performance or no recurrence.
- **No response:** remind CM, then alert Admin for continued silence. Keep it missing/unassessed, never favourable.

**Unable to assess** remains an explicitly reconfirmed exception, with no invented star rating or durability points. A negative rating does not automatically open a repair claim. Linked aftercare remains a separate deliberate request. Feedback does not block ticket closure.

The reputation chat's approved recommendation weight, scoring direction and publication moderation remain unchanged. Exact reminder cadence is tracked as FQ1 until answered.

## 5. D8: what it does and where it goes

D8 is the support case asking **“Has the agreed action actually happened, and has any required check already been done?”** It is not another compulsory ticket status or form.

**Example:** a contractor disputes the CM's rejection of a tap repair. Admin agrees a repeat repair; Contractor performs it. If the CM has not inspected that repeat repair, open the existing R1 inspection task. If R1 already accepted that exact repeat repair, reuse the acceptance and add no further inspection.

Entry: a resolution is performed, or payment is recorded, and its real obligations need to be checked. Routes:

- Missing work inspection -> **R1**, actual CM/MCST reviewer. Unsatisfactory work -> **R2**, Contractor remedies again.
- Missing invoice/settlement confirmation -> **R4/C6**, MCST (or explicitly attributed Admin override).
- Money remains unsent -> **P3/P1**, MCST; sent money needs receipt -> **P2**, Contractor.
- Evidence remains disputed -> **D2**, Admin investigates; the case stays unresolved.
- All obligations verified -> close the support case and resume the actual outstanding task. Keep a cancelled job **Cancelled**; resolve linked aftercare separately; close an ordinary job only when its already-approved closure guards pass.

An Admin verdict creates a decision or obligation; it cannot itself prove the repair or transfer happened. The uncomplicated work/payment path does not visit D8.

## 6. Cancellation cutoff

Approved: **seven calendar days from the first issued cancellation notification**. The notice and cancellation details show an exact SGT deadline/countdown. Reading, reminders or retries do not restart it.

Suggested notice: **This job has been cancelled. Submit any additional claim by {date/time SGT} — {days}d {hours}h remaining. Claims submitted in time will continue to be reviewed after that date.**

At cutoff, stop new ordinary additional claims. A timely submitted claim remains open until resolved; existing confirmed debts remain due. Silence does not produce the explicit “I accept … no additional claims” declaration. The approved two-business-day reminder/five-business-day Admin attention applies only while still inside the seven-calendar-day window. It never extends the cutoff. Exceptional record/access/payment issues remain available through support, with any override explicit and audited.

## 7. Other approvals recorded

- Rejection reason compulsory: short preset plus Other explanation, optional extra detail; withdrawal reason optional. Keep dated rationale in the permanent variation audit record.
- Admin backtracking previews consequences, retains financial history and clocks, and invalidates only affected tasks/acceptances. Reuse still-valid inspections. No second-admin approval. Financial adjustment due dates/refunds remain O05.
- Admin operating arrangements supplied privately. They do not appear in app copy or introduce another Admin account.

## 8. Remaining decisions

- **O05:** after an authorised post-confirmation financial correction, what deadline applies to any unpaid fee difference and how should excess fees already received be returned? Recommendation still under review: preserve the original deadline, give a newly assessed difference three business days from adjustment confirmation, and let Admin record an actual refund for excess already paid. Rates, full-invoice basis and ordinary trigger are settled.
- **FQ1:** exact Feedback reminder cadence, unless subsequently approved in the live question. Suggested due notice, reminder at two business days, Admin at five business days, then Admin-set follow-up.

Broader reputation aggregation/attribution and integrity warnings stay in their existing chats. Node wording not expressly approved remains marked as proposed copy; explanations here do not create extra lifecycle approvals.

**D7 / O29, deferred:** the pre-existing question of archiving an unresolved support case also remains open. Recommendation: defer archival for launch and keep the case explicitly unresolved with follow-up. Archiving later must never imply the obligations were fulfilled. This is separate from approving the current unresolved-case route.
