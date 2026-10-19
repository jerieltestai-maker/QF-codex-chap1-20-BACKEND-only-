# QuoteFix lifecycle review v11 — 11 October 2026

This applies the owner's comments on v10. It is a planning revision, not a built application. The interactive review opens on **Admin resolution · revised sequence**. Existing node IDs are retained; D9 makes the offline coordination responsibility visible inside the same case.

## 1. Admin controls the resolution sequence

| Checkpoint | Who acts? | What permits the next action? |
| --- | --- | --- |
| E3 — support requested | Reporting participant, then Admin | Request creates/reuses the case and notifies Admin. |
| D2 — review | Admin | Review audit/evidence. Admin records that evidence is sufficient, or requests specific missing facts. |
| D3 — evidence response | The actual requested CM, MCST or Contractor | Submission returns to D2. Admin alone judges sufficiency; no D3 -> D4 edge. Other outstanding requests remain visible. |
| D9 — offline coordination | Admin | Contact relevant parties outside QuoteFix. Record separate coordination-ledger reference, permitted summary, outcome and obligations. Unsettled coordination stays unresolved; new facts can require D2 again. |
| D5 — binding verdict, when applicable | Admin | Existing binding/override power remains separately attributed; publish the recorded verdict through D4. No extra peer approval. |
| D4 — final resolution and acknowledgment | Admin issues; relevant parties acknowledge | Participant action: **Acknowledge resolution**. No Reject/Counterproposal control. Record exact version and each acknowledgment separately. |
| D6 — actual execution, if needed | Named Contractor / MCST / Admin | Do the outstanding repair, payment, refund or correction through the existing appropriate task. |
| D8 — verification | Existing evidence or the actual missing-check owner | Require actual execution and current-round physical inspection where applicable. Reuse valid evidence; do not add a duplicate approval. |
| D7 — unresolved follow-up, if needed | Admin | Record blocker, next actor/action/date until evidence, external outcome or actual execution permits progress. |

**Acknowledgment question resolved:** the owner explicitly chose proceeding with already-authorised actions while acknowledgments are collected. Acknowledgment is informational; it neither blocks execution/verified case resolution nor replaces work/financial authorisation. A silent participant remains truthfully recorded as not acknowledged. No new compulsory acknowledgment reminder loop is assumed.

## 2. Why D6 and D7 still apply

**D6 example:** the parties settle the argument in an offline meeting and the recorded outcome says Contractor will replace the valve on Friday. The disagreement is settled, but the valve has not been replaced. D6 tracks the real repair. After submission, CM inspects through R1. If the valve was already replaced and accepted before the final record was issued, reuse those facts and skip a new D6 action.

**D7 example:** the offline discussion cannot finish because a supplier receipt or external finding is still missing. Or the final agreed repair is not carried out. The case needs a truthful unresolved record and Admin follow-up. D7 does not give a participant a new rejection button on D4. It also does not reopen quoting, restore cancelled work or erase financial obligations. Archive remains KIV.

These are conditional tasks/outcomes in one case workspace, not compulsory separate screens after every resolution.

## 3. F5, D8 and inspection rounds

F5 means **the linked aftercare case** has been resolved. It follows a deliberate later-fault request, not every Feedback rating. A negative rating alone still opens no automatic claim.

Example:

1. Original repair is accepted and the ticket closes.
2. A leak returns; CM opens linked aftercare through F3.
3. Contractor performs the agreed repair.
4. CM inspects the current repair through R1. If unsatisfactory, record findings and return to R2; another physical repair requires another inspection.
5. D8 reuses the successful inspection of that exact repair and verifies any other applicable obligations.
6. F5 records the aftercare case resolved. The original ticket remains Closed; do not rerun its original invoice/fee/payment chain.

| Actual inspection number | Visible heading | Findings example |
| --- | --- | --- |
| 1 | Inspection | Leak persists at valve joint. |
| 2 | Inspection [2nd] | Joint repaired, but adjacent connection still leaks. |
| 3 | Inspection [3rd] | No leakage observed; current remedy accepted. |
| 4 and later | Inspection [4th], etc. | Preserve each actual inspection's own result. |

The existing ticket status **CM's Inspecting of work** stays. The heading identifies the round. The initial [1st] suffix is hidden. Keep original ticket ID, case ID where applicable, inspection ID/sequence, repair version, inspector, timestamps and findings. Display earlier unsatisfactory findings with their originating label; do not relabel them as findings from the next inspection. Opening a form or correcting an invoice alone does not increase the physical inspection count.

## 4. What your alert answers approve

- **Point 3:** approve closing the coverage gaps in principle: unanswered questions/visits, stalled procurement, variations, missed work/remedies, completion submission, invoice correction, remaining payment and Admin's own queues.
- **Point 4:** explicitly approve the cancellation safeguard. Admin attention occurs at the earlier of five business days or 24 hours before the seven-calendar-day cutoff, if unanswered. The claim window itself is unchanged.
- **Point 5:** approve the listed intentional exclusions. Unpublished drafts, optional offers/photos/ordinary updates, the 30-day observation period, internal outcomes and routine eligible receipt silence do not need redundant Admin age alerts.
- **Point 6:** you explicitly request context before deciding the additional defaults. The numbers in that list are therefore not all treated as approved. Existing approved payment, inspection, MCST approval, dispute, Feedback, fee and credential timers remain authoritative.

## 5. Remaining alert decisions — examples and recommendations

### O31-A — ordinary unanswered tasks

**Problem:** Contractor asks CM for a missing quantity on Monday. No reply means Contractor may be unable to price. The plan gives the question a recipient, but previously had no explicit Admin escalation for that category.

**Already accepted:** this gap should be covered. **Remaining timing question:** should the existing ordinary pattern also govern these additional tasks? Recommend **2 business days: remind the actual actor; 5 business days: alert Admin**. Apply it to Q&A, visit decisions, Contractor variation terms, CM variation decisions and ordinary invoice correction, unless a specific case date applies. No extra stage or auto-approval.

### O31-B — RFQ sourcing and selection stalls

**Problem:** an RFQ remains open for weeks with zero suitable offers, or CM receives offers but never selects/reselects. RFQs correctly do not expire; that does not have to mean nobody checks progress.

**Recommendation:** check in with the actual CM/MCST procurement owner after **5 business days**; alert Admin after **10 business days** without meaningful progress or a scheduled next review. Admin can help clarify scope/source a contractor or ask when selection will be reviewed. This does not require a contractor to quote, force selection, or expire the RFQ. These intervals remain open.

### O31-C — missed work targets and uncertain duration

**Problem:** Contractor says Completed by Friday 3pm, but Friday passes without completion. Alternatively, Contractor chose Unable to estimate with a valid reason, leaving no date at which anyone must update the others. A response such as “I will fix it” can also finish the response task while the promised repair remains undone.

**Recommendation:** notify the named owner and Admin once when a saved work/remedy/update target is missed. For Unable to estimate, ask for **Next progress update by**, not a fabricated completion date. If no start is arranged, chase arranging it through the ordinary task rule. These are follow-up commitments, not penalties or compulsory photo diaries. Confirm immediate missed-target alert versus a grace interval before implementation.

### O31-D — cancellation clash: resolved

Monday 10am notice -> next Monday 10am claim cutoff. Without holidays, +5 BD at 23:59 is after that cutoff. The owner approved alerting Admin at the **earlier of +5 BD or cutoff minus 24 hours**, provided still unanswered. No further decision requested.

### O31-E — who catches an untouched Admin item?

**Problem:** Contractor submits verification or fee-payment evidence; Admin gets a bell notice but never opens it. A saved follow-up cannot help if no follow-up was ever set. An urgent RFQ has the same discovery gap but needs faster attention.

**Recommendation:** ordinary untouched Admin item re-alerts after **1 business day**; urgent unacknowledged RFQ after **15 minutes**. Acknowledging an unresolved item must retain a dated action or next follow-up. This uses the same Admin account and adds no approval tier. These are attention intervals, not promised resolution/payment/refund deadlines. Both interval values remain open; repeated-overdue cadence remains O30.

### O31-F — the system fails to issue its notice

**Problem:** MCST records payment, but a server failure prevents creation of Contractor's bell notice. Contractor was never informed. The seven-day receipt clock correctly cannot start, so the system needs a way to recover the unsent job and flag persistent failure.

**Recommendation:** durable queued work, safe retries that do not duplicate notices, and an Admin-visible failure queue. Preserve the first successful issue time as the receipt/cancellation anchor. If the bell itself is unavailable, preserve recoverable logs and operational monitoring. This principle does not choose a retry interval or introduce email/WhatsApp; engineering thresholds remain to specify.

## 6. Separate offline ledger — O32-B

**Context:** the separate ledger could mean an external document you maintain, or a separate private coordination log within QuoteFix. The core flow works with either; its visibility/storage design must be explicit before building.

**Recommendation:** a separate **Admin-only coordination log linked to the case**, with references/attachments to external meeting or communication records where needed. Parties see the issued resolution and authorised summary, not automatically the full private negotiation history. Either way, preserve in-app evidence review, decision, acknowledgment and execution audit events. This does not authorise sharing confidential reports with their subject or sending messages externally.

**Decision requested:** use the separate Admin-only case log, or keep the detailed ledger externally and save only its reference/summary in QuoteFix?
