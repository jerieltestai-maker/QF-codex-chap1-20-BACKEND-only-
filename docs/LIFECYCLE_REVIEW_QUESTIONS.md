# QuoteFix lifecycle review questions — updated 12 October 2026

Current authority: latest owner decisions. [Timing register](TIMING_AND_NOTIFICATION_REGISTER.md) records event -> interval -> recipient/message -> outcome. The [v13 review](LIFECYCLE_REVIEW_2026-10-12_V13.md) explains the settled lifecycle boundaries; [implementation draft](IMPLEMENTATION_PLAN.md) records the next work and remaining gates. No application feature implemented.

## Settled through v13 — no further approval needed

| Item | Approved behavior |
| --- | --- |
| O31-A | Ordinary uncovered Q&A/visit/variation/invoice-correction tasks use 2 BD actor reminder / 5 BD Admin attention, without duplicate specific timers. CM may answer or decline. |
| O33 | Publication/new quotation round -> second following calendar date at noon Singapore time. Fewer than 3 distinct eligible contractors with current selectable quotes -> Admin sourcing attention. Zero included, revisions once. No three-quote selection gate. |
| O31-B | Unmade selection: 5 BD actual CM/MCST reminder / 10 BD Admin without progress or scheduled review. Starts on the third distinct current valid quote. Pause below three; resume remaining time. Early selection is still allowed. |
| O34-A | Pre-quote Q&A retained; CM may answer or decline. Initial quote still required for a site visit. |
| O34-B | Start with unknown completion requires reason, then completion date/time within 24 elapsed hours. Only Admin grants a reasoned extension with a new deadline. Missing estimate deadline -> Admin immediately. |
| O31-C | Missed completion target -> Admin immediately; CM/MCST +1D with hours late and Okay / Admin Intervention. +1D = 24 elapsed hours, both relevant CM/MCST only if still unfinished. Revised date + reason -> authorised Okay / Admin Intervention; retain audit. |
| O31-D | Cancellation Admin attention at earlier of 5 BD or claim cutoff minus 24h; seven-calendar-day claim window unchanged. |
| O31-E | Ordinary Admin queue +1 BD; urgent unacknowledged +15min/+1h/+3h, from first notice. Unresolved acknowledgment retains a dated follow-up. After +3h, repeat every 7h until explicit acknowledgment. |
| O31-F | Retryable notifications, failure monitoring and Admin-visible persistent failures approved; engineering thresholds to specify. Failed notification is not silence. |
| O32-A/B | Actions proceed alongside resolution acknowledgment. Detailed offline ledger is an external document; only restricted reference/permitted summary plus app audit in QuoteFix. |


## O35 and O36 — resolved in v13

Supersedes v12 O35 proposals; all four answers and both follow-up answers are confirmed. Planning only.

- **O35-A:** selection reminders start when the **third distinct eligible contractor** has a current valid selectable quotation in the active round, not the first. Responsible CM/MCST +5 business days; Admin +10 business days without meaningful progress or a scheduled review. Initial sourcing still uses publication +2 calendar dates at noon Singapore time.
- **O36-A explicitly resolved:** keep selection with fewer than three allowed under the previous limited-comparison warning/rationale. Only reminders wait for three; do not introduce a three-quote selection gate or assert a general legal procurement rule.
- **O36-B explicitly resolved:** if valid coverage drops below three, **pause** selection reminders, return attention to sourcing and **resume only the remaining time** when three valid distinct offers return. Preserve accrued time and history; no fresh full 5/10-BD reset. Reuse the Admin sourcing task. Revisions from one contractor count once.
- **O35-B:** +1D means **24 elapsed hours**; notify both relevant CM and MCST only if work remains outstanding. Okay acknowledges the notice only; Admin Intervention reuses support. Retain lateness only relative to the completion target: Monday 3pm due, Tuesday 10am done = 19h late, although before Tuesday 3pm reminder. Completion before Monday 3pm is not late. Do not conflate a late app update with independently established physical completion or invent reputation penalties.
- **O35-C:** Contractor proposes revised completion date/time plus reason -> notify CM/MCST -> authorised decision-maker chooses **Okay / Admin Intervention**. Okay accepts that exact date version; support or silence does not. Preserve the last authorised target until acceptance/override and audit old/new dates, reasons, actors, times and overdue events. Use existing variation decision/audit/reminder machinery for this compact schedule-only change; scope/money changes retain their full gates.
- **O34-B remains approved:** Start with Unable to estimate requires the first completion estimate within 24h. Only Admin can extend that estimate-submission deadline with reason/new due time. It is separate from accepting revisions to an already supplied completion date; the user requested context, not removal of this safeguard.
- **O35-D:** urgent reminders at +15min/+1h/+3h, then **every 7 hours after the three-hour mark**: +10h/+17h/+24h/+31h. Stop on explicit Admin acknowledgment/cancellation/supersession; unresolved acknowledged item follows Admin's saved next time. Same urgent item, no duplicate cases.

O35/O36 require no further approval. Other O30 scheduling precision and notification engineering thresholds remain recorded; reputation/risk stay separate and archive O29 remains KIV. See [v13 explanation](LIFECYCLE_REVIEW_2026-10-12_V13.md) and the current [timing register](TIMING_AND_NOTIFICATION_REGISTER.md). No QuoteFix backend or production scheduler implemented.

## Resolved: O05 — adjustment due dates and refunds

**Settled:** fees are 4% + 4% of the final confirmed payable invoice/settlement total. MCST confirmation triggers assessment, due in three business days. A confirmed SGD 1,200 invoice produces SGD 48 + SGD 48 even if MCST has paid only SGD 600. No random charge or duplicate full assessment. Fees sit outside tickets in Contractor billing, with separate internal Admin collection.

**Example:** fees on SGD 1,000 were SGD 80. An authorised correction changes the total to SGD 1,200, so total fees become SGD 96. If SGD 80 was already paid, only SGD 16 remains. That difference is reconciliation, not a new fee type or a total of SGD 112.

**Approved in v10:** keep the original assessment/deadline; give a newly assessed difference three business days from authorised adjustment confirmation. Apply reductions against unpaid fees; where excess was already paid, Admin records the refund actually made. Preserve the adjustment/refund audit record. This does not change the ordinary invoice trigger or rates. No fixed refund-turnaround interval is imposed.

## Resolved: FQ1 — Feedback reminder cadence

**Settled:** compulsory 30-day durability task; 1–3 stars negative and 4–5 positive, both with required open observation. Unable to assess is retained with no durability points. Missing feedback triggers CM reminders and eventual Admin follow-up, never an inferred favourable rating. Feedback does not block closure.

**Approved in v10:** notify when due; remind CM after two business days; alert Admin after five business days; then Admin sets the next follow-up. Stop reminders on either a rated submission or Unable to assess. Do not require another approval of this cadence.

## Deferred policy: O29 — archiving an unresolved support case

D7 identifies this as open: a case can remain unresolved despite Admin intervention. **11 October: the owner expressly keeps the archive feature KIV / unresolved.** Do not implement archive behavior or request another archive decision now. Retain the existing named-next-action/follow-up model. A future archive policy would need its own decision and must not silently count unresolved obligations as successful resolution.

**Historical v10 context:** for example, a cancellation-cost dispute still lacks receipts after both parties stop replying. Archive would move that unresolved case out of the active queue; it would not prove the claim was settled. The issue is queue visibility and follow-up. The owner has now deferred this feature; no further archival clarification is requested in this review.

## O30 — remaining timing details and latest resolutions

**Resolved by explicit 12 October answers:** date-only actual receipt -> Feedback at 09:00 Singapore time on the 30-day due date; late-discovered due Feedback -> immediate notice with the existing 2/5-business-day reminder allowance from first issue. Date-only quote/credential expiry -> valid through the stated day, expire next midnight. Missed agreed start with no Start recorded -> Admin immediately, relevant CM/MCST +24h only if still unrecorded. See timing register section 15.

**Still open:** unspecified ordinary Admin repeated-overdue cadence and extra optional advance reminders; warranty-start/expiry automation; treatment of an authorised job with no agreed start date. Propose the bounded defaults during the timer-contract pass; do not silently create them. Technical retry/backoff and calendar precision are engineering specification work. Archive remains KIV; O35/O36 are settled.

These details do not prevent drafting implementation plans. They are explicit gates before implementing the affected behavior.

## V10 inspection clarification — confirmed, no question

4 November failed inspection -> Contractor corrects and resubmits on 8 November -> CM MUST inspect again. Repeat R2/R1 until the current round passes or another explicit route applies. D8 may reuse only the successful inspection of that same corrected round for its support-case obligation; it cannot reuse a failed/older inspection. No third inspection solely for duplicate case paperwork. A new remedy round gets its own unanswered-review timer.

## Resolved in v9 — no repeat approval needed

| Item | Confirmed decision |
| --- | --- |
| Q21 | Rejection reason required via short preset plus Other explanation; extra detail optional. Withdrawal reason optional. Permanent audit includes rationale, actor/role/time/version and before/after terms. |
| O24 | Preview impacts; preserve financial facts/clocks and still-valid approvals; invalidate only affected tasks/acceptances. Changed amounts use a distinct adjustment. No second-admin review. O05 retains adjustment timing/refunds only. |
| O25 | Seven calendar days from first issued cancellation notification to submit an additional claim. Exact SGT deadline/countdown. Timely claims stay open; existing debt stays due. Expiry does not fabricate no-claims acceptance. |
| O28 | No universal app-imposed MCST bank-payment deadline. Countdown is to a specific QuoteFix follow-up on a missing record/update, not payment expiry or penalty. |
| O14 / Q12 | Operating information supplied privately. Keep staffing/coverage details out of app copy; no extra Admin account or peer approval. |
| Fee clarification | Full confirmed invoice basis and three-business-day invoice-triggered deadline reconfirmed, including partial MCST payment. |
| F2 exception | Unable to assess expressly retained alongside the three normal outcomes, with no rating points. |
| B1 | Contractor account billing outside tickets; Admin collection internal; CM/MCST have no fee access. |

## Explanations, not approval requests

- **P1:** Admin is notified that the payment record or useful update is missing. The countdown schedules assistance/follow-up, not a payment deadline.
- **P3:** Review payment discrepancy opens existing amounts, transfer proof, receipt status, partial-payment rationale and next action. No new approval or automatic investigation for an agreed balance.
- **D8:** reuse the real inspection/financial/receipt check. Only a missing verification sends the relevant stakeholder to the existing task. Admin deciding a remedy does not prove execution.

## Previously accepted decisions retained

| Item | Current rule |
| --- | --- |
| Q1 / P5 | Existing work/invoice/full-settlement/no-blocker guards close automatically. No Finishing up task. Feedback/fees do not block closure. |
| Q2 | MCST alone records payment; completed-transfer proof required before Payment Sent; partial rationale compulsory; slide confirmation and optional Note retained. |
| Q3 / O18 | Actual transfer date, reported_at and first issued notification separate. Every transfer gets seven calendar days from first notification, including late entries. Confirmation uses actual receipt date; disputed transfer is not deemed; partial balance remains due. |
| Q4 | Valid selected quote's scope/price held through MCST approval; required checkbox. |
| Q5 / Q17 | Cancellation immediate, with reason; Okay requires the exact no-additional-claim declaration, or Contractor may claim within the new seven-day window. Existing debt remains due. |
| Q6 / Q16 | Full Admin powers/backtracking, attributable audit, no peer review. Replacement after work authorisation uses a linked new ticket. |
| Q7 | Contextual Request Admin Support and confidential conduct handling; reports hidden from their subject across surfaces. |
| Q8 / UX9 | Combined completion form: compulsory invoice, optional photos, irreversible declaration; CM positive checkbox/slide or Unsatisfactory work. |
| Q9 | Offline manual credential verification, configurable prerequisites, optional badge expiry versus required credential restrictions; one-month Admin reminder. |
| Q10 | Accountable contractor/disclosed subcontracting; reasoned unknown duration flagged in comparison. |
| Q13 / Q19 | MCST may publish RFQs and Select and approve with threshold acknowledgment. MCST preauthorisation rejection permits same-ticket reselection and an explicit new quote round. |
| Q14 | Fee restriction blocks new quotes/selection of unselected offers; existing jobs continue. Full verified fee receipt removes only that restriction. |
| Q15 / B | Variation outcomes audited and automatically routed to W1/W2/R3/R1/E2 according to context. Rejection alone does not require Admin. |
| Q18 | Completed by date/time OR Unable to estimate with reason before Start is enabled. |
| Q20 / A | Payment follow-up immediately/one business day/three business days/Admin-set next time, in one support case. No payment-stage chain. |
| P7 / F1 | Receipt fallback internal with approved notice; no Feedback action until 30 days. |
| UX1–UX15 | All consolidation proposals approved, preserving real gates/evidence/role authority. |

Reputation aggregation/attribution and refresh policy remain in chat 01a0e886-1f17-7733-9ef6-47fc795f2792; integrity/risk remains in 01a0fbec-86d8-7db3-9a71-d18613c0e471. No new chat or repeat approval is needed for those established workstreams.


## V11 resolution questions

**O32-A resolved:** already-authorised actions proceed while parties acknowledge the final resolution. No execution/verified-resolution gate and no assumed acknowledgment from silence.

**O32-B resolved in v12:** owner selected an external document outside QuoteFix. Retain the restricted reference/permitted summary and app decision/event audit; do not build a detailed in-app negotiation log. The v11 alternative was not selected.
