# QuoteFix lifecycle review v12 — 12 October 2026

**Historical v12:** O35 was subsequently resolved in [v13](LIFECYCLE_REVIEW_2026-10-12_V13.md). Its first-quote/hourly recommendations below were not adopted.

Planning decisions only. This revision separates prompt quotation sourcing from slower human selection and records the owner's latest approvals. Remaining ambiguities below are questions, not implemented assumptions.

## 1. Confirmed decisions

| Area | Confirmed rule |
| --- | --- |
| D6 / D7 | Retain conditional execution and unresolved follow-up. Offline agreement does not itself complete work or move money. |
| Inspections / aftercare | Number inspection headings from Inspection [2nd], retain each round's reasons/evidence and require fresh inspection of each new physical repair. Linked aftercare resolves only after its applicable obligations pass. |
| Ordinary unanswered tasks | Reuse 2 business days to remind the actual actor and 5 business days to alert Admin for the newly covered Q&A, site-visit decisions, variation terms/CM decisions and invoice-correction tasks. |
| CM discretion | CM may decline a site visit or intentionally decline additional information. Reminders request a response/decision; they do not force disclosure, grant access or imply wrongdoing. A recorded decline is a response, not continuing silence. |
| Insufficient quotations | At T+2 days, 12 noon, alert Admin if fewer than three contractors have quoted, including zero. Admin chases contractors offline. This replaces the earlier slow 5/10-business-day sourcing proposal. O33 explicitly confirms publication/new round, second following calendar date at noon Singapore time, and distinct eligible contractors with current selectable quotes; revisions count once. |
| Unmade selection | Remind the responsible CM/MCST at 5 business days and alert Admin at 10 business days without meaningful progress or a scheduled next review. This is a separate selection clock, not the sourcing clock. Exact actionable-start policy is O35-A below. |
| Missed completion target | Notify Admin immediately when the completion deadline passes without completion. Notify CM/MCST +1 day afterward, including hours late and **Okay / Admin Intervention**. O35-B clarifies elapsed-day, stop condition and recipient details. |
| Unable to estimate | Must be temporary; cannot provide an indefinite exemption from supplying a completion estimate. O34-B explicitly approves a completion date/time within 24 elapsed hours after Start, with reasoned Admin-only extensions to a new estimate-submission deadline. |
| Ordinary Admin queue | Unacknowledged ordinary Admin item re-alerts after 1 business day. Once acknowledged but unresolved, retain a dated next action/follow-up. |
| Urgent Admin queue | Initial alert, then re-alert at the 15-minute, 1-hour and 3-hour marks while unacknowledged. These are offsets from the initial issued urgent notice, not intervals added successively. After acknowledgment use the saved next follow-up. |
| Notification reliability | Durable retryable notification work, failure monitoring and an Admin-visible persistent-failure queue approved. Failed notice never counts as user silence. Exact technical retry thresholds still need specification. |
| Offline coordination ledger | Detailed ledger is an external document outside QuoteFix. QuoteFix retains the agreed restricted reference, permitted summary and its own decision/acknowledgment/execution audit. Do not build the previously proposed detailed in-app coordination log. |

An alert about fewer than three contractors does **not** introduce a three-quote selection gate. The existing ability to select one valid quote with the appropriate warning/rationale remains. RFQs still do not expire. An already selected/cancelled quotation round should not keep generating obsolete sourcing tasks.

## 2. Why Unable to estimate exists

The existing quote form allows a contractor to declare a genuine unknown rather than invent a duration. For example, the extent of a concealed fault may only become clear after initial diagnosis. Unknown duration remains prominent in comparisons and is never treated as fast/zero. Before Start, the current approved gate is Completed by date/time OR Unable to estimate with a nonblank reason.

The owner now requires this exception to be temporary. **Approved O34-B:** once work starts, supply a real completion date/time within 24 elapsed hours. If genuinely impossible because of diagnosis/access/parts information, Admin must record a reasoned extension and the next definite estimate-submission deadline. Contractor cannot self-renew indefinitely. If the estimate-submission deadline passes, alert Admin immediately. This is a deadline to provide an estimate, not an invented deadline to finish the repair.

Do not automatically pause or cancel work solely because the estimate is missing. Existing safety/eligibility/authorisation rules still determine whether work can proceed. Quote-stage uncertainty and the post-Start duty to resolve it must remain distinct.

## 3. Clarifications answered and approved

### O33 — quotation checkpoint and counting

**Approved O33:** first publication of the RFQ/explicit new quotation round starts the clock; check at 12:00 Singapore time on its second following calendar date. Publication on 1 December -> 3 December at noon, regardless of the publication hour. This is a calendar checkpoint, not necessarily exactly 48 elapsed hours.

Count distinct eligible contractor organisations with a current, selectable quotation for the current scope/round. Versions/revisions from one contractor count once. Expired, withdrawn or otherwise non-selectable quotes do not count. A scope edit does not silently disqualify a still-selectable quote: preserve the existing scope-change warning and immediate-selectability rule. The single condition count < 3 includes both zero and one/two; send one Admin alert, not two because zero also satisfies <3.

**Resolved:** the owner explicitly approved this anchor, day and distinct-contractor count. An RFQ draft has not yet invited anyone to quote, so draft creation is not the recommended anchor. Ordinary editing should not reset the sourcing clock. A genuinely reopened round can have its own audited checkpoint.

### O34-A — pre-quotation questions

Earlier confirmed policy allows Q&A before the first quotation; site visits require an initial quotation. The latest wording says CM should already have a quote. **Approved O34-A:** retain pre-quote Q&A while allowing CM to answer or decline; retain the existing initial-quote prerequisite for visits. A concern about withheld essential scope information can remain an explicit pricing assumption/unknown or a reason not to quote; AI cannot invent it.

**Resolved:** retain pre-quote Q&A; CM may answer or decline. Site visits still require an initial quote. No further approval is needed on this distinction.

### O34-B — temporary estimate limit

**Resolved:** the owner approved the 24-hour-after-Start limit and Admin-controlled exceptions in section 2. The pre-Start date/time-or-reason gate remains; the temporary reason now creates a timed duty to supply the completion estimate.

## 4. Other remaining lifecycle details, with recommendations

### O35-A — when does the selection clock start?

**Problem:** if quotations take time to arrive, starting CM's selection clock at publication could blame CM while there is nothing selectable.

**Recommendation:** start the 5/10-business-day selection clock when the first current valid quote makes selection actionable. After MCST rejects a nomination, start a new reselection task when a valid alternative exists. If no valid option remains, route attention to sourcing; preserve the old task history. A generic comment, another quote or a page view must not repeatedly reset the same unanswered selection task. A concrete scheduled review replaces only the next reminder with a dated follow-up; it does not erase elapsed waiting time.

### O35-B — the +1 day overdue-work notification

**Problem:** work may finish between the immediate Admin alert and the later CM/MCST notice. A notice claiming it is still unfinished would then be inaccurate. CM/MCST can also mean both roles or just the assigned owner.

**Recommendation:** interpret +1D as 24 elapsed hours; notify both relevant estate roles only if completion is still outstanding then. Keep the actual late completion in history if it finishes earlier. Example copy: **The contractor has missed the completion target by {hours} hours. Work is still awaiting completion.** Controls: **Okay / Admin Intervention**. Okay acknowledges that notice only; it never accepts work, waives a remedy, extends the target or stops an unresolved Admin follow-up. Admin Intervention opens/reuses the same contextual case.

**Awaiting confirmation:** 24 elapsed hours, still-outstanding condition and both-role recipients. The immediate Admin alert is already approved.

### O35-C — revisions to a completion target

**Problem:** if Contractor can repeatedly replace Friday 3pm with a later date, the late-work trigger could be evaded.

**Recommendation:** retain the original commitment and every reasoned revision; an overdue event/alert is never deleted. Proposed extensions that change the accountable deadline need explicit acceptance by the authorised CM/MCST or Admin; Contractor can report a revised forecast without silently changing that accountability. This approval rule is not yet settled and should not be introduced as a new mandatory screen without confirmation.

### O35-D — urgency after three hours with no acknowledgment

**Problem:** the approved 15-minute/1-hour/3-hour notices do not define what happens if the alert is still untouched after the third reminder.

**Recommendation:** keep it prominently overdue and continue one reminder per hour until explicit acknowledgment; reuse one urgent item rather than create multiple cases. This extra cadence is proposed, not approved. No email/WhatsApp is introduced. Once acknowledged, use Admin-set subsequent follow-up.

## 5. Confidence assessment scope

The lifecycle, role handoffs, authorisation, variation, cancellation, inspection, invoice, actual/assumed receipt and Admin-resolution model are substantially specified. Confidence percentages in the conversation are subjective planning judgments, not test-derived reliability estimates.

Before implementation is considered fully specified, resolve the remaining O35 start/stop and target-change details below the settled O33/O34 rules, turn the confirmed policies into a permission/transition matrix and concrete data/event contracts, and validate duplicate submissions, racing actions, failed notification jobs, partial payment/corrections and backtracking. The repository still contains the blueprint/review tools, not an implemented or production-tested QuoteFix backend. Reputation/risk policies remain in their separate discussions; archive remains KIV.
