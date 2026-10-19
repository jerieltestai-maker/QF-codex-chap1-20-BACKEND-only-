# QuoteFix node reference — review 2026-10-12-v14

Planning only. C = confirmed behaviour, P = proposed behaviour, ? = decision needed. Owner-confirmed wording is marked per node; other UI copy is proposed. These are workflow checkpoints and side tasks, not a request to create one backend status per node.

See [review questions](../LIFECYCLE_REVIEW_QUESTIONS.md). Node IDs are stable comment anchors.

## I1 — Report an issue

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Report an issue  
**Waiting-on bar:** Pending: RFQ author describes the issue  
**Action:** Improve description

**Entry trigger:** CM or MCST creates an issue report.

**Checkpoint:** Record observed facts in everyday language, affected location, urgency and available photos, or the agreed no-photo explanation.

**Exceptions / limits:** Original words and photos remain preserved. AI can clarify wording but cannot turn suspected causes into established facts.

**Owner-confirmed wording:** status.

**Workspace group:** UX6. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One draft editor; both AI assistance checkpoints and human privacy/accuracy review remain. Only human Publish publishes the RFQ.

- Improve with AI → **I2** (AI is refining your draft).
- Continue manually → **I3** (Approving AI input).

## I2 — AI is refining your draft

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** AI is refining your draft  
**Waiting-on bar:** AI is preparing your draft  
**Action:** Review draft / Continue manually

**Entry trigger:** The CM or MCST author asks AI to improve the observations.

**Checkpoint:** AI separates observations, requested outcome, supplied facts and unanswered questions; The human author checks added wording.

**Exceptions / limits:** AI may ask about missing pricing information. It must not invent dimensions, materials, quantities, fault diagnosis or work methods. Failed AI leaves the draft intact with a manual route.

**Owner-confirmed wording:** status.

**Workspace group:** UX6. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One draft editor; both AI assistance checkpoints and human privacy/accuracy review remain. Only human Publish publishes the RFQ.

- Draft available → **I3** (Approving AI input).

## I3 — Approving AI input

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Approving AI input  
**Waiting-on bar:** Pending: RFQ author checks and publishes the request  
**Action:** Publish request

**Entry trigger:** An AI-assisted or manually prepared draft is available.

**Checkpoint:** The CM or MCST author confirms accuracy, necessary pricing details, grouping, priorities and the contractor-visible privacy preview.

**Exceptions / limits:** This is the second AI checkpoint: highlight unclear statements and missing facts; offer another revision, then require CM confirmation. AI is assistance, not an approver. The owner-confirmed label refers to the AI-assisted path. CM still checks accuracy and privacy before publication; this wording does not make AI the approver or remove the manual route. Manual-route copy remains to be reviewed. Show the actual author role/name in the bar; MCST uses the same AI, accuracy and privacy checkpoints.

**Owner-confirmed wording:** status.

**Workspace group:** UX6. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One draft editor; both AI assistance checkpoints and human privacy/accuracy review remain. Only human Publish publishes the RFQ.

- Refine again → **I2** (AI is refining your draft).
- CM or MCST publishes → **Q1** (Requesting for quotes).

## Q1 — Requesting for quotes

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: Contractors submit quotes  
**Action:** View quotes / Edit request

**Entry trigger:** CM or MCST publishes a reviewed RFQ version.

**Checkpoint:** Only admin-verified eligible contractors may quote; RFQ remains open until selection or cancellation.

**Exceptions / limits:** Zero quotes: keep collecting and offer clarification/sourcing help. One quote: selection is allowed with limited-comparison warning and rationale. One accountable contractor may use disclosed, appropriately credentialed subcontractors. Unable to estimate yet requires a reason and is a prominent comparison caution, not a selection block. Approved sourcing checkpoint: at 12 noon Singapore time on the second calendar date after RFQ/new-round publication, fewer than three distinct eligible contractors with current selectable quotes alerts Admin to chase offline. Zero is included. Revisions count once; ineligible/expired/withdrawn/non-selectable offers are excluded. Preserve C35/C36/Q4: a minor correction does not invalidate a quote; a material scope change requires reconfirmation/revision before selection or inclusion in current valid coverage. Initial valid quotes need no site-visit/readiness gate. This is not a three-quote selection gate. Stop obsolete sourcing reminders after selection/cancellation; ordinary edits do not reset the clock. V13: the 5/10-business-day selection reminder clock starts only with three distinct valid quotes. Below three, continue sourcing; if coverage later drops, pause selection reminders and resume remaining time on restoration. Owner explicitly retained selection with fewer quotes using the existing warning/rationale.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

**Countdown — Admin:** Approved T16 / O33: publication date + 2 calendar dates, noon Singapore time.

- Admin: Quotation coverage check at {date} 12:00 — {count}/3 contractors with current selectable quotes.

At checkpoint, issue one Admin alert if count < 3 and the RFQ round still accepts quotes. Admin chases offline and sets the next follow-up. Quotes remain open; initial selection remains possible with fewer than three under existing rules.

- Valid quote arrives → **Q2** (Comparing quotations).
- Question received → **Q3** (CM answers questions).
- Scope change or expiry → **Q4** (Refreshing affected quotes).
- Visit requested → **Q5** (CM reviews visit request).
- CM or MCST cancels → **C1** (CM or MCST cancels directly).
- Urgent RFQ published → **U1** (Urgent job alerts admin).
- Request Admin Support → **E3** (Request Admin Support).
- Under 3 at sourcing checkpoint → **E1** (Following up on pending actions).

## Q2 — Comparing quotations

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Comparing quotations  
**Waiting-on bar:** Pending: CM compares and selects a contractor  
**Action:** Compare quotes

**Entry trigger:** At least one valid quote covers the current scope.

**Checkpoint:** Show comparable price and terms, unknown-cost warnings, AI preference fit and limitations; CM selects an exact version with rationale.

**Exceptions / limits:** A display condition within the open quotation phase, not a separate closure event. More quotes can still arrive. No preference adds no CM preference weighting. Prominently show Duration not estimated and its reason; never rank an unknown duration as fast or zero. Selection follow-up is separate: remind actual CM/MCST selection owner after five business days, alert Admin after ten without meaningful progress or a scheduled next review. O35-A resolved: start only when the third distinct eligible contractor has a current valid selectable quote. Pause below three and resume remaining time on restored coverage (O36-B). Selection with fewer quotes still allowed (O36-A); do not use this slower cadence for sourcing.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

**Countdown — CM, MCST, Admin:** Approved T17: third distinct current valid quote -> 5/10 business days; pause below three, resume remaining time.

- Before three: Selection reminders have not started — {count}/3 contractors with valid quotes.
- Paused: Selection reminders paused — {count}/3 contractors with valid quotes.
- Running: Next selection follow-up in {days}d {hours}h — {date/time}.

These are contextual alternatives, not simultaneous live bars. Do not block voluntary selection with fewer quotes. Count active distinct eligible contractors; retain accrued time across coverage pauses. Actual role and next event determine visibility.

**Open decisions:** Q11.

- CM selects with rationale → **S1** (CM freezes selection).
- MCST selects above threshold → **M1** (MCST acknowledges threshold).
- MCST confirms at/below threshold → **M2** (MCST selects and approves).
- Selection follow-up due → **E1** (Following up on pending actions).

## Q3 — CM answers questions

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: CM answers a job question  
**Action:** Answer question / Decline request

**Entry trigger:** A verified eligible contractor asks for needed information, including before their first quote.

**Checkpoint:** CM may publish a factual sanitised answer or explicitly decline the additional-information request. Protect identity, prices and proprietary information. An explicit decline is a response, not continuing silence. Material new scope facts still require the existing version/reconfirmation flow.

**Exceptions / limits:** This side task does not stop unrelated quote submissions. Material new information follows Q4; ordinary clarifications return to collecting quotes. Pre-quotation Q&A remains explicitly approved. Reminder at two business days and Admin alert at five chase an unanswered decision; they cannot force disclosure or create a site-visit permission. A refusal can leave a contractor with an explicit pricing limitation or unable to quote; never invent the missing facts.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Ordinary answer → **Q1** (Requesting for quotes).
- Material answer → **Q4** (Refreshing affected quotes).

## Q4 — Refreshing affected quotes

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: Affected contractors update their quotes  
**Action:** Prompt Contractor to Re-Quote

**Entry trigger:** A material RFQ change is published, or an unselected quote expires.

**Checkpoint:** Require reconfirmation or revision for material changes; renewal for expiry. Only current valid versions are selectable.

**Exceptions / limits:** Automatic notices plus the approved manual prompt. Minor corrections notify without requiring a new quote. RFQs never expire. This route applies only before selection. A date-only quote expiry means valid through that Singapore date, expiring at midnight starting the following day. Honour an explicit expiry timestamp. Selected-quote holds remain unaffected.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Valid update submitted → **Q2** (Comparing quotations).

## Q5 — CM reviews visit request

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: CM approves or declines a site visit  
**Action:** Review visit request

**Entry trigger:** A contractor who already submitted an initial quote requests a visit.

**Checkpoint:** CM approval reveals exact estate/location; decline keeps it hidden.

**Exceptions / limits:** No site visit is required for selection. A contractor may revise with reasons before selection; exact location is also revealed upon work authorisation. CM may intentionally decline. Unanswered decision: remind CM after two business days; alert Admin after five. Explicit decline completes the response task and retains the location/privacy gate.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Visit approved and held → **Q6** (Contractor updates quote).
- Visit declined → **Q1** (Requesting for quotes).

## Q6 — Contractor updates quote

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: Contractor updates the quote, if needed  
**Action:** Update quote

**Entry trigger:** The contractor decides to revise before selection, including after a visit.

**Checkpoint:** Create an attributable new quote version; latest valid version becomes eligible.

**Exceptions / limits:** Revision is optional after a visit unless scope changed materially or the quote expired. Selection remains immediately available under ordinary validity rules.

**Owner-confirmed wording:** status.

**Workspace group:** UX7. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Valid revision submitted → **Q2** (Comparing quotations).

## S1 — CM freezes selection

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Selecting contractor  
**Waiting-on bar:** Pending: CM to confirm selected Contractor  
**Action:** Confirm selection

**Entry trigger:** CM chooses an exact quote and enters a rationale.

**Checkpoint:** Check validity/current scope; freeze selection and comparison set; close quotation phase atomically. The contractor previously accepted the required selection-lock checkbox. MCST combined selection follows M1/M2; CM selection retains its existing threshold route.

**Exceptions / limits:** At/below GST-inclusive threshold authorises work. Above threshold goes to MCST with quotations frozen while awaiting approval. Confirmed Q19: rejection before authorisation permits same-ticket reselection or explicit reopening. After authorisation replacement requires a linked new ticket.

**Owner-confirmed wording:** pending.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Above threshold → **S2** (MCST Reviewing selected Contractor).
- At or below threshold → **W1** (Contractor prepares to start).

## S2 — MCST Reviewing selected Contractor

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** MCST Reviewing selected Contractor  
**Waiting-on bar:** Pending: MCST approves or rejects the selection  
**Action:** Review selection

**Entry trigger:** CM selects above the estate threshold.

**Checkpoint:** One named MCST account approves the exact selected version or rejects it.

**Exceptions / limits:** No work is authorised. Direct cancellation with a reason is now confirmed in this interval. Two/five-business-day reminders apply. Original quote expiry does not undo a valid selection or release the held scope and price.

**Owner-confirmed wording:** status.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- MCST approves → **W1** (Contractor prepares to start).
- MCST rejects → **S3** (Rejected Contractor).
- Cancel before authorisation → **C1** (CM or MCST cancels directly).
- No response → **E1** (Following up on pending actions).

## S3 — Rejected Contractor

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Rejected Contractor  
**Waiting-on bar:** Pending: CM selects another contractor  
**Action:** Compare quotations

**Entry trigger:** MCST explicitly rejects the contractor selected by CM while required MCST approval is pending.

**Checkpoint:** Record MCST rejection of this nominee, optional rationale, actor/time; notify CM and rejected contractor. No work is authorised for that rejected nomination.

**Exceptions / limits:** Confirmed preauthorisation exception: keep the same ticket for another CM nomination, MCST Select and approve, or an explicit new quotation round. Preserve the rejected nomination, comparison snapshot and decision. Rejected Contractor is a nomination outcome, not cancellation of the maintenance need. No work is authorised for the rejected contractor. Unmade reselection uses 5/10-business-day reminders only with three current valid distinct offers. Fewer offers need sourcing attention; early selection with warning/rationale remains permitted. Preserve task/round/nomination history.

**Owner-confirmed wording:** status.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

**Concrete pending lines by situation:**

- CM handles reselection: **Pending: CM selects another contractor**; next stage Q2.
- MCST takes over selection: **Pending: MCST selects and approves another contractor**; next stage Q2.

- compare remaining valid offers → **Q2** (Comparing quotations).
- fresh offers needed → **S5** (Reopen quotation round).

## S4 — Selected quote terms held

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** MCST Reviewing selected Contractor  
**Waiting-on bar:** Pending: MCST reviews the selected contractor  
**Action:** Review selection

**Entry trigger:** A valid quote was selected and required MCST approval is pending.

**Checkpoint:** Check expiry at selection. Hold the selected scope and price throughout MCST approval. The original expiry creates no new stage.

**Exceptions / limits:** Required quotation checkbox: My quote will be valid when the CM selects it. Once selected, its price and scope remain held while awaiting MCST approval, if needed. A contractor unable to honour the commitment uses E2; no post-selection requote.

**Owner-confirmed wording:** status.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Rule: remain pending MCST → **S2** (MCST Reviewing selected Contractor).

## W1 — Contractor prepares to start

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Starting work  
**Waiting-on bar:** Pending: Contractor to begin the authorised work  
**Action:** Start

**Entry trigger:** At/below-threshold selection, or required MCST approval, creates work authorisation.

**Checkpoint:** Before Start is enabled, Contractor must supply either Completed by: date and time, or Unable to estimate yet with a nonblank reason. Validate the same requirement on submission. Start records actual commencement and the chosen estimate/reason together; no actual start event is recorded if validation fails. If Unable to estimate is used at Start, create a temporary estimate obligation due 24 elapsed hours after that actual Start event. By then provide Completed by date/time or obtain a reasoned Admin extension with a new deadline; Contractor cannot self-extend this exception. Missing the estimate-submission deadline alerts Admin immediately.

**Exceptions / limits:** A future agreed start shows Scheduled: Contractor starts on [date/time], with no implication of lateness before that date. Completed by is a target, not a completion event; changes record reasons/history. Q18 approved: estimate/date-time or Unable to estimate yet plus reason is a prerequisite to Start. Show a concise explanation alongside the unavailable Start control. Estimate choice does not bypass work authorisation. Access issue examples: CM arranges keys/entry or a site shutdown; Contractor supplies worker details/tools. Assign the actual party. Access does not automatically become an admin dispute. Quote-stage uncertainty can be genuine (for example extent unknown before diagnosis); after Start it is now time-limited under approved O34-B. Admin extension records author, reason, old/new deadline and time. This does not invent a completion date or bypass other work authorisation. The 24-hour obligation is to provide the first estimate, not to finish the job. Example: Start Monday 10:00 -> supply Completed by by Tuesday 10:00. Only Admin extends that submission deadline; normal later completion-date proposals go to the authorised CM/MCST. Approved missed-start follow-up: at an agreed scheduled start with no recorded Start, alert Admin using Start has not been recorded. After 24 elapsed hours notify relevant CM/MCST only if Start is still unrecorded. Stop obsolete notices after recorded Start, cancellation or an authorised superseding schedule. Do not infer that physical work has not begun merely because the update is missing; do not start the separate 24h estimate obligation before actual Start is recorded.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX9. Approved by owner: all streamlining changes, point 7.

**Fields:** Completed by: date and time OR Unable to estimate yet; Reason required when Unable to estimate yet; Start unavailable until the chosen alternative is complete; If unable to estimate: estimate submission due 24 hours after Start; Admin-only reasoned extension.

- Valid estimate or reason, then Start → **W2** (Contractor carries out work).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Change before start → **V1** (Contractor defines variation).
- Scheduled start not recorded → **E1** (Following up on pending actions).

## W2 — Contractor carries out work

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Carrying out work  
**Waiting-on bar:** Pending: Contractor to complete the work  
**Action:** Add update / Work is complete

**Entry trigger:** Contractor records the start.

**Checkpoint:** Work is complete opens one completion form: compulsory invoice, optional photos, final irreversible declaration and slide submission. Opening or saving the draft does not declare completion.

**Exceptions / limits:** Approved UX9 replaces the separate declare-completion then upload-invoice sequence. W2 wording and optional Add update remain. The contractor cannot undo the submitted declaration; Admin recovery preserves it. Estimate is distinct from actual completion. Temporary Unable to estimate expires as an allowed exception at Start + 24 elapsed hours unless Admin grants a reasoned new deadline. A missed Completed by target alerts Admin immediately. Both relevant CM and MCST receive the late-work notice 24 elapsed hours after the target only if completion remains outstanding; show hours late and Okay / Admin Intervention. Okay acknowledges that notice only. Completion before the reminder suppresses it but remains late if after the target; completion before the target is never late. Contractor proposes revised date/time and required reason; notify CM/MCST for authorised Okay (accept exact new date) or Admin Intervention (support, not acceptance). Keep the last authorised target until acceptance/override; retain all reasons, dates, decisions and overdue history. Use the existing variation decision machinery for this compact schedule-only change. The initial Start +24h obligation is a deadline to supply the first estimate; only Admin can extend that separate deadline.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX9. Approved by owner: all streamlining changes, point 7.

**Fields:** Completed by: date + time OR Unable to estimate yet + reason, carried forward from Start; Temporary estimate obligation and recorded deadline, or current Completed by target with revision history; Revised completion date/time + required reason; authorised CM/MCST response: Okay / Admin Intervention.

- Open completion form → **W3** (Contractor submits completion package).
- Change proposed → **V1** (Contractor defines variation).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Cannot continue → **E2** (Contractor cannot continue).
- Request Admin Support → **E3** (Request Admin Support).
- Admin chooses status change → **A1** (Admin backtracks job status).
- Work or estimate deadline missed → **E1** (Following up on pending actions).

## W3 — Contractor submits completion package

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Preparing Proof & Payment  
**Waiting-on bar:** Pending: Contractor submits the invoice and completion declaration  
**Action:** Submit completion

**Entry trigger:** Contractor selects Work is complete; open this form within the existing work workspace.

**Checkpoint:** Invoice required; photos optional. Final slide submits the invoice version and irreversible completion declaration together, then assigns CM review.

**Exceptions / limits:** Preparing Proof & Payment is the form heading, not another post-completion ticket phase. Drafts remain editable and do not record physical completion. Proposed replacement popup: Confirm that all work is finished. Once submitted, this completion declaration cannot be undone. Your invoice will be submitted with it, and the CM will then inspect the work.

**Owner-confirmed wording:** status.

**Workspace group:** UX9. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One completion form inside W2. No declared-complete-but-awaiting-invoice handover. New action/popup copy is proposed; consolidation is approved.

- Invoice and declaration submitted together → **R1** (CM reviews completion).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).

## R1 — CM reviews completion

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** CM's Inspecting of work  
**Waiting-on bar:** Pending: CM reviews the work and invoice  
**Action:** Approve Works / Unsatisfactory work

**Entry trigger:** Contractor submits the initial completion package, or submits completed corrections for a NEW remedy round after an unsatisfactory inspection.

**Checkpoint:** CM inspects the currently submitted work/repair round and reviews the invoice. EVERY corrective-work resubmission requires a fresh inspection. Approve Works applies only to that inspected round/version, with the positive checkbox and slide. Failed inspection returns to R2. Invoice mismatch or unapproved scope prevents advancement.

**Exceptions / limits:** Unsatisfactory work belongs to the CM here: incomplete/unsatisfactory work, defects or scope/invoice concerns. It leads to response/remedy instead of requiring a false positive checkbox. This is distinct from contractor Payment Issue. Admin backtracking preserves original declarations/review events. Unsatisfactory work is the CM completion-quality branch, available without the positive checkbox. It does not rename intake Report an issue, Payment Issue, or Request Admin Support. Invoice-only mismatches still route to R3. Example: 4 November inspection fails; Contractor submits corrected work on 8 November; CM must inspect the corrected work again before acceptance. A prior failed result is never reusable acceptance. Keep round ID, submitted repair version, inspection date, findings and inspector. The newly issued round starts its own two/five-business-day unanswered-review clock. Inspection sequence is recorded per original ticket, with linked aftercare case ID where applicable. Display Inspection for n=1; Inspection [2nd], Inspection [3rd], Inspection [4th] and the correct ordinal for n>=2. The first suffix [1st] is hidden. Each result and its unsatisfactory findings retain their own inspection ID, ordinal, actor, date/time and repair version. Carry prior findings forward by reference without relabelling them as a new finding. Opening a form, supplying photos or correcting only an invoice does not invent another physical inspection.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX10. Approved by owner: all streamlining changes, point 7.

**Concrete pending lines by situation:**

- Inspection · initial review: **Pending: CM reviews the work and invoice**; next stage R4.
- Inspection [2nd] · corrected work: **Pending: CM inspects the corrected work — Inspection [2nd]**; next stage R4.
- Inspection [3rd] · further correction: **Pending: CM inspects the corrected work — Inspection [3rd]**; next stage R4.
- Inspection [4th] · further correction: **Pending: CM inspects the corrected work — Inspection [4th]**; next stage R4.

**Fields:** Checkbox above Approve Works: I agree the works are Complete and Satisfactory; Inspection heading: Inspection / Inspection [2nd] / Inspection [3rd] / Inspection [4th]; Findings tagged to their originating inspection; current round links prior failures.

- Unsatisfactory work → **R2** (Contractor addresses issues).
- Invoice mismatch → **R3** (Explaining price change).
- Original job work accepted → **R4** (MCST confirms invoice).
- No response → **E1** (Following up on pending actions).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Aftercare pass → **D8** (Reuse or obtain the required verification).

## R2 — Contractor addresses issues

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Addressing issues  
**Waiting-on bar:** Pending: Contractor responds / to remedy the issue  
**Action:** Respond / Submit remedy

**Entry trigger:** CM identifies incomplete work, defects, scope or price concerns.

**Checkpoint:** Log the failed inspection and required remedy. Contractor completes and submits the corrections as a new remedy round, with evidence and any invoice revision. Notify CM and return to R1 for mandatory re-inspection. Never let repair submission, photos or an earlier inspection alone mark the corrected work accepted.

**Exceptions / limits:** Repeat R2 -> R1 until the current remedy round passes or a real dispute/cancellation route applies. If invoice details alone change and physical work/scope do not, separately approved invoice-only reconciliation can preserve the still-valid work acceptance. That exception cannot skip inspection of new physical corrections. Show each unsatisfactory item with the label of the inspection that found it. Example: Inspection [2nd] — leak persists at valve joint; the next submitted repair will require Inspection [3rd]. Preserve initial findings under Inspection, without [1st].

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX10. Approved by owner: all streamlining changes, point 7.

- Repair submitted → **R1** (CM reviews completion).
- Remedy disputed → **D1** (Contractor responds to concern).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).

## R3 — Explaining price change

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Explaining price change  
**Waiting-on bar:** Pending: Contractor explains or corrects the invoice  
**Action:** View Reason

**Entry trigger:** Invoice differs from authorised quote plus effective variations.

**Checkpoint:** Block final confirmation. Notify MCST and admin. Correct the invoice, approve a legitimate variation, or record an agreed reduction. Approved UX10: if only the invoice changed and work acceptance remains valid, go directly to R4 after reconciliation; repeat R1 only if inspection is outstanding or a relevant work/scope fact changed.

**Exceptions / limits:** MCST and admin are notified because an invoice mismatch was detected. Routine variation approval remains with the required CM/MCST approver. An admin notification is not an approval or a resolution. A rejected invoice-stage change returns here for correction, not to physical work. View Reason opens the discrepancy detail; Contractor can explain/correct there, while CM/MCST can read the reason when submitted. Until a reason exists show the detected difference and that an explanation is pending. Viewing is not resolution. Approved ordinary follow-up: remind the actual responsible actor after two business days unanswered and alert Admin after five, unless a specific applicable task/case rule supplies its date. No duplicate MCST-approval timer and no approval inferred from silence.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX10. Approved by owner: all streamlining changes, point 7.

- Inspection outstanding or acceptance affected → **R1** (CM reviews completion).
- Additional work claimed → **V1** (Contractor defines variation).
- Difference disputed → **D1** (Contractor responds to concern).
- Request Admin Support → **E3** (Request Admin Support).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Reconciled; work acceptance still valid → **R4** (MCST confirms invoice).

## R4 — MCST confirms invoice

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Confirming invoice  
**Waiting-on bar:** Pending: MCST to confirm invoice is correct  
**Action:** Confirm invoice

**Entry trigger:** CM review passes; invoice reconciles; all required approvals are complete.

**Checkpoint:** Named MCST confirms exactly the displayed invoice version and amount.

**Exceptions / limits:** Freeze version, actor and server time; assess each 4% fee and start three business days for contractor-to-QuoteFix fees. Invoice upload does not start that clock. Approved UX10: invoice confirmation and payment task share a workspace but remain separate actions/events. Invoice confirmation triggers fees; it never claims money was sent.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX10. Approved by owner: all streamlining changes, point 7.

- Work or acceptance concern → **R1** (CM reviews completion).
- Nonzero invoice confirmed → **P1** (MCST records payment).
- No response → **E1** (Following up on pending actions).
- Zero payable confirmed → **P0** (Zero payable derived).
- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Invoice-only correction → **R3** (Explaining price change).

## P1 — MCST records payment

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Arranging payment  
**Waiting-on bar:** Pending: MCST to send payment to the contractor  
**Action:** Payment Sent

**Entry trigger:** MCST confirms a nonzero reconciled invoice/settlement, or a cancelled job retains an already-confirmed unpaid amount.

**Checkpoint:** Before Payment Sent is enabled or accepted, require uploaded proof of a completed bank transfer, amount and actual transfer date. Partial-payment rationale is required when applicable; Note stays optional. MCST alone submits by slide. Save the transfer date separately from the server reporting timestamp, then issue the contractor notification.

**Exceptions / limits:** Payment Sent records an external transfer; it does not initiate or delay bank payment. Proof is compulsory; a scheduled/pending instruction is not completed-transfer proof. Preserve the file/version and submitting identity. No routine Admin approval or automatic claim of document authenticity is added. Missing/contradictory proof and payment concerns use the same Admin Support case. Existing reminders chase a missing MCST entry; cancellation settlement uses this same form with context retained.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** Approved A: ordinary payment form plus contextual support. The bell receipt window starts only when the payment notification is issued. Countdown is to a QuoteFix payment follow-up, never a deadline imposed on MCST to make the bank transfer.

**Countdown — MCST, Admin:** Follow-up timing and these two role-specific countdown lines explicitly approved in v10; no MCST bank-payment deadline.

- MCST: QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.
- Admin: Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.

Counts toward the next support reminder/contact event: one business day without a payment/update record, three business days still unresolved, then the Admin-set next follow-up. At the first event notify Admin that MCST has not recorded payment or a meaningful update, and remind MCST. Admin checks whether payment has actually been sent and helps obtain the record or progress update. A bank payment is not presumed unpaid merely because an app entry is missing. No app-imposed MCST payment deadline, penalty, cancellation, or payment extension. Stop obsolete missing-record reminders when supplied; keep real balance/receipt tasks. Do not restart on views, generic comments, reads or retries.

**Fields:** Proof of completed bank transfer (required before Payment Sent); Amount sent; Actual transfer date; Note (optional); Partial-payment rationale (required when partial); Reported at (server recorded, read-only).

- Proof and Payment Sent; notify → **P2** (Contractor checks receipt).
- Approved follow-up; same support case → **P8** (Admin follows up in payment case).
- Request Admin Support → **E3** (Request Admin Support).
- Record dates separately → **P10** (Transfer and notification dates recorded).

## P2 — Contractor checks receipt

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Confirming payment  
**Waiting-on bar:** Pending: Contractor to verify payment received  
**Action:** Received payment / Payment Issue

**Entry trigger:** MCST reports a transfer with compulsory completed-transfer proof and QuoteFix issues its payment notification.

**Checkpoint:** Contractor can confirm immediately with the actual credited amount/date or report Payment Issue. The response deadline is seven calendar days from the first issued in-app notification for this transfer, whether reported promptly or late.

**Exceptions / limits:** Approved contractor-only footer: Please confirm receipt of payment or report an issue by {date}. If there is no response by then, QuoteFix will record SGD {amount} as received on that date. Show actual receipt separately from Assumed received. Reading or dismissing a notice is not receipt confirmation. Payment Issue stops deeming for that transfer and opens/reuses one support case; ordinary silence follows P7. Notification means issued and durably available in the bell, not first read. Reminders/retries do not reset the clock.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

- Agreed partial balance → **P3** (Unresolved payment).
- Full receipt confirmed → **P4** (Payment received).
- Notification + 7 calendar days; no response → **P7** (Internal seven-day receipt rule).
- Payment Issue → **E3** (Request Admin Support).

## P3 — Unresolved payment

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Unresolved payment  
**Waiting-on bar:** Pending: MCST to send the remaining payment  
**Action:** Review payment discrepancy

**Entry trigger:** An agreed partial payment leaves a balance, or an undisputed recorded transfer still needs receipt confirmation.

**Checkpoint:** Preserve every transfer and partial-payment rationale. Show sent, actually/deemed received, disputed and outstanding amounts. MCST sends the remaining money and records it; Contractor confirms each receipt. A missing record is not proof of an unpaid bank balance.

**Exceptions / limits:** Approved A: simple balances remain in payment; evidence collection and disputed receipt belong inside the linked Admin Support case. Preserve each amount, rationale, actual/assumed receipt and outstanding balance. A Payment Issue stops the relevant automatic receipt. Do not require an investigation merely because both parties agree a balance remains. Example: invoice SGD 1,200, SGD 800 recorded and confirmed received, SGD 400 not recorded as sent. Show all three amounts, the partial-payment reason and Pending: MCST to send the remaining payment. If SGD 400 was already sent offline, MCST records its proof instead of paying twice. Separate remaining-unsent from sent-awaiting-receipt amounts; never subtract disputed money as finally settled.

**Owner-confirmed wording:** status, action.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** Review payment discrepancy opens the existing payment details panel, not another approval. MCST can record the remaining payment; Contractor can confirm a recorded transfer or raise Payment Issue; CM reads permitted records; Admin follows up through the linked case. The fee statement is excluded.

**Concrete pending lines by situation:**

- Remaining balance not sent: **Pending: MCST to send the remaining payment**; next stage P1.
- Receipt needs confirmation: **Pending: Contractor to verify payment received**; next stage P2.

**Fields:** Confirmed invoice / settlement total; Each recorded transfer: amount, date and completed-transfer proof; Actual / assumed / awaiting / disputed receipt labels; Remaining amount not recorded as sent; MCST partial-payment rationale; Current responsible party and linked support case, if any.

- Recorded transfer now needs receipt review → **P2** (Contractor checks receipt).
- Disputed payment → **E3** (Request Admin Support).
- MCST must send remaining balance → **P1** (MCST records payment).

## P4 — Payment received

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Payment received  
**Waiting-on bar:** No payment action due  
**Action:** View payment record

**Entry trigger:** The full payable amount is covered by confirmed actual receipts and/or labelled assumed receipts under the notification-based seven-calendar-day rule.

**Checkpoint:** Preserve the basis/date of every receipt. Actual full settlement anchors Feedback at its actual date; assumed settlement uses its response deadline. Mixed/partial payments require the full balance to be covered. Recheck existing closure conditions automatically.

**Exceptions / limits:** Payment received is a milestone, not another task. Display the actual/assumed basis clearly; never call an assumed receipt bank-confirmed. Closure still needs accepted work, confirmed invoice and no blocking case. Cancellation settlement returns to Cancelled. Feedback and QuoteFix fees do not block closure; fees remain invoice-triggered.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

- Full receipt or agreed fallback anchor → **F1** (Feedback scheduled).
- Cancellation claim: verify settlement → **D8** (Reuse or obtain the required verification).
- Ordinary job: existing conditions satisfied → **P6** (Closed).
- Existing blocking case remains open → **D2** (Admin reviews evidence).
- Cancellation accepted; existing payment settled → **C7** (Cancellation settled).

## P6 — Closed

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Closed  
**Waiting-on bar:** No outstanding job action  
**Action:** View record

**Entry trigger:** The last existing closure condition becomes satisfied: accepted work, confirmed invoice, settled full payment (or confirmed zero payable), and no blocking case.

**Checkpoint:** System closes automatically on the relevant event. No Finishing up screen, close button or repeated work approval. Preserve history/export and existing authorised-work contractor boundary.

**Exceptions / limits:** Feedback can remain scheduled or due after Closed. Later issues use a linked aftercare/admin support case. Never reopen quotations or overwrite financial history. If payment was settled before an active case was resolved, that case-resolution event re-evaluates closure. An unresolved case keeps its named actor/action; opening admin support does not itself satisfy a gate.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

- Later fault reported → **F3** (Addressing a later issue).
- Request Admin Support → **E3** (Request Admin Support).
- Admin reopens a review → **A1** (Admin backtracks job status).

## V1 — Contractor defines variation

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Modifying job scope  
**Waiting-on bar:** Pending: Contractor confirms scope, price and timing  
**Action:** Confirm change of terms

**Entry trigger:** Either party proposes a variation.

**Checkpoint:** Contractor specifies scope, price and schedule impact; preserve the proposed version.

**Exceptions / limits:** Linked variation task. Preserve the entry context: before start, work in progress, or invoice reconciliation. Either party may propose; contractor confirms terms. Pending extra work is not authorised. Approved ordinary follow-up: remind the actual responsible actor after two business days unanswered and alert Admin after five, unless a specific applicable task/case rule supplies its date. No duplicate MCST-approval timer and no approval inferred from silence. A schedule-only completion-date revision reuses this versioned decision/audit flow in a compact work-context form. Contractor supplies revised date/time and reason; notify relevant CM/MCST. Authorised Okay accepts the exact revision, Admin Intervention requests support without accepting it, silence keeps the last authorised target. Existing ordinary response timers apply; no new stage.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX2. Approved by owner: all streamlining changes, point 7.

**Fields:** Schedule-only variant: revised completion date/time, reason; CM/MCST Okay / Admin Intervention.

- Terms confirmed → **V2** (CM or MCST decides change).
- Proposer withdraws → **V4** (Rejected or withdrawn variation recorded).

## V2 — CM or MCST decides change

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Modifying job scope  
**Waiting-on bar:** Pending: CM approves the variation  
**Action:** Review variation

**Entry trigger:** Contractor confirms variation terms.

**Checkpoint:** At/below threshold CM approves; above it MCST approves increases beyond its previously authorised amount; reductions are explicitly agreed. Rejection requires a preset reason (Price, Scope, Timing, Not needed, or Other with a nonblank explanation); further detail is optional. Withdrawal reason remains optional. Save the reason, actor/role, server date/time SGT, decision, variation version, before/after terms and evidence permanently; corrections append history.

**Exceptions / limits:** Rejection requires a preset reason (Price, Scope, Timing, Not needed, or Other with a nonblank explanation); further detail is optional. Withdrawal reason remains optional. Save the reason, actor/role, server date/time SGT, decision, variation version, before/after terms and evidence permanently; corrections append history. Automatically return through V5 to the valid saved stage. Rejection does not authorise extra work, cancel the job, or itself require Admin. If original work cannot continue, route to E2. Approved ordinary follow-up: remind the actual responsible actor after two business days unanswered and alert Admin after five, unless a specific applicable task/case rule supplies its date. No duplicate MCST-approval timer and no approval inferred from silence. A schedule-only completion-date revision reuses this versioned decision/audit flow in a compact work-context form. Contractor supplies revised date/time and reason; notify relevant CM/MCST. Authorised Okay accepts the exact revision, Admin Intervention requests support without accepting it, silence keeps the last authorised target. Existing ordinary response timers apply; no new stage.

**Owner-confirmed wording:** status, pending, action.

**Audit record:** Permanent variation audit entry: named actor and role, server decision date/time (display SGT), variation ID/version, decision, before/after scope/price/timing, rationale supplied and linked evidence. A history link opens this record; the popup is only a summary. Corrections append an attributable follow-up instead of overwriting the original.

**Workspace group:** UX2. Approved by owner: all streamlining changes, point 7.

**Concrete pending lines by situation:**

- CM is required approver: **Pending: CM approves the variation**; next stage V3.
- MCST is required approver: **Pending: MCST approves the variation**; next stage V3.

**Fields:** Rejection reason (required preset; Other requires explanation); Additional rejection detail (optional); Withdrawal reason (optional); Schedule-only variant: revised completion date/time, reason; CM/MCST Okay / Admin Intervention.

- Required approval given → **V3** (Approved variation recorded).
- Approver rejects or proposer withdraws → **V4** (Rejected or withdrawn variation recorded).

## V3 — Approved variation recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** Required approver explicitly accepts the variation version.

**Checkpoint:** Make the approved version effective, preserve the prior authorisation and evaluate where the workflow can resume.

**Exceptions / limits:** Approved UX2: save the effective variation and audit event, show an outcome notice/history link, and automatically route using V5. No separate View approved change step. Approval does not itself perform work or confirm an invoice.

**Workspace group:** UX2. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal event/check only. Show the actual destination stage and its next actor; no separate user task.

**Concrete pending lines by situation:**

- Before work starts: **Pending: Contractor to begin the authorised work**; next stage W1.
- Physical work continuing: **Pending: Contractor to complete the work**; next stage W2.
- Invoice needs correction: **Pending: Contractor explains or corrects the invoice**; next stage R3.
- Completion review outstanding: **Pending: CM reviews the work and invoice**; next stage R1.
- MCST performs completion review: **Pending: MCST reviews the work and invoice**; next stage R1.
- Unable to continue: **Pending: Admin to review interruption of works**; next stage E2.

- Automatic context check → **V5** (Automatic variation return).

## C1 — CM or MCST cancels directly

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** No further work authorised  
**Action:** View cancellation

**Entry trigger:** CM/MCST explicitly cancels the job with a mandatory reason before work authorisation, including while selection awaits MCST approval.

**Checkpoint:** Cancel immediately; notify relevant parties; preserve history and frozen selection if one exists.

**Exceptions / limits:** Cancellation withdraws this job request rather than deciding against the selected contractor. After authorisation cancellation is now also immediate (C2 -> C4). If a selected contractor is affected, notify them and expose the response/claim route. No selected contractor means no contractor-response task.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

- Selected contractor needs notice → **C4** (Cancelled; contractor responds).

## C2 — CM or MCST confirms cancellation

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage until cancellation is confirmed  
**Waiting-on bar:** Pending: CM confirms cancellation  
**Action:** Cancel job / Back

**Entry trigger:** CM/MCST chooses cancellation on an active authorised job.

**Checkpoint:** Show mandatory cancellation reason and notice that work stops immediately but already-incurred costs may be claimed. Confirming cancels without waiting for admin.

**Exceptions / limits:** Proposed notice: Cancelling stops further work immediately. The contractor may still ask for payment for work already completed or costs already incurred, such as materials ordered for this job. Any claim can be reviewed by QuoteFix admin. Back leaves the job unchanged. Applies to active jobs, not a routine rewrite of already closed records.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

**Concrete pending lines by situation:**

- CM cancels: **Pending: CM confirms cancellation**; next stage C4.
- MCST cancels: **Pending: MCST confirms cancellation**; next stage C4.

**Fields:** Cancellation reason (required).

- CM or MCST confirms; immediate → **C4** (Cancelled; contractor responds).

## C3 — Contractor explains cancellation concern

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** Pending: Contractor submits the cancellation concern  
**Action:** Submit to Admin

**Entry trigger:** Before the claim cutoff, Contractor selects Admin Intervention from the cancellation notice without having accepted no additional claims.

**Checkpoint:** Open an explanation field and allow incurred-expense claim/evidence. Suggested structured amount and optional itemised supporting entries alongside the narrative. Submit, not merely open/save a draft, by the displayed cutoff. Record the server submission timestamp. A filed claim may continue to receive evidence in its existing case after cutoff.

**Exceptions / limits:** Information icon examples: completed work, nonreturnable/custom materials, cancellation/restocking charges, subcontractor commitments, mobilisation/transport or hired equipment, disputed payment already due. These are examples to explain a claim, not automatic entitlement. Draft/back does not restart work; submitted request moves to C8.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

**Fields:** Explain your concern; Incurred expenses and supporting evidence.

- Explanation submitted → **C8** (Cancellation claim opens intervention).

## C4 — Cancelled; contractor responds

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** Pending: Contractor reviews the cancellation  
**Action:** Okay / Admin Intervention

**Entry trigger:** CM/MCST confirms cancellation and reason; cancellation is immediately effective.

**Checkpoint:** Cancellation is immediate; notify Contractor with reason, exact SGT claim deadline and countdown. Contractor has seven calendar days from the FIRST issued cancellation notification to submit an additional claim/Admin Intervention; reading or reminders do not reset it. Okay still requires the explicit no-additional-claim declaration.

**Exceptions / limits:** No response leaves Cancelled. At cutoff, stop new ordinary additional cancellation claims and acknowledgment reminders; never fabricate acceptance/no-claims consent. A claim submitted in time stays open until resolved. Existing confirmed debt remains due. Notification failure cannot start the clock. Preserve necessary make-safe/evidence work. Claim submission does not authorise resumption. Exceptional record/access/payment problems remain Request Admin Support; Admin override must be explicit and audited, not an ordinary cutoff bypass.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

**Countdown — Contractor, Admin:** Seven calendar days from first issued cancellation notification confirmed by owner. Wording proposed.

- Contractor: Submit any additional claim by {date/time SGT} — {days}d {hours}h remaining.

One deadline per first issued cancellation notice, not per read/recipient. Contractor reminder after two business days while in-window. Admin alert at earlier of five business days or 24 hours before cutoff, only while unanswered. Neither extends the seven-calendar-day claim window. Preserve timely submitted cases and existing debts.

- Okay plus no-additional-claim confirmation → **C9** (Contractor accepts cancellation).
- Contractor selects Admin Intervention → **C3** (Contractor explains cancellation concern).
- Seven calendar days; internal cutoff → **C10** (Additional claim window ends).

## C6 — MCST confirms settlement

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** Pending: MCST confirms the agreed settlement  
**Action:** Confirm settlement

**Entry trigger:** Cancellation claim has an agreed/admin-decided settlement ready for financial confirmation.

**Checkpoint:** Confirm the exact payable settlement through named MCST confirmation or explicit admin financial override. Assess only applicable new fee entries/adjustments; do not duplicate existing invoice fees.

**Exceptions / limits:** Zero settlement means zero new fees. Preserve Cancelled/Works cancelled context even while Admin Intervention is the active display stage. Show the exact next payment actor. Replacement after authorisation uses a linked new ticket, as confirmed in Q16.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

**Concrete pending lines by situation:**

- Normal MCST confirmation: **Pending: MCST confirms the agreed settlement**; next stage P1.
- Explicit admin override: **Pending: Admin records the settlement confirmation override**; next stage P1.

- Nonzero settlement due → **P1** (MCST records payment).
- Zero settlement, no cases → **C7** (Cancellation settled).
- Confirmed zero; derive payment outcome → **P0** (Zero payable derived).

## D1 — Contractor responds to concern

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Resolving an issue  
**Waiting-on bar:** Pending: Contractor responds to the concern  
**Action:** Respond to concern

**Entry trigger:** A party raises a specific concern with requested resolution and available evidence.

**Checkpoint:** Reuse the existing R2 response/evidence when it addresses the same concern. Request only a missing response or new facts. An agreed remedy goes to R2; unresolved concerns use the same case.

**Exceptions / limits:** Ordinary unanswered cases: reminder at two business days; admin attention at five. Silence is not fault. Approved UX5: this is a contextual case task, not a repeated response form or separate ticket phase.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

- Remedy agreed → **R2** (Contractor addresses issues).
- Escalation or no response → **D2** (Admin reviews evidence).

## D2 — Admin reviews evidence

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Admin Intervention  
**Waiting-on bar:** Pending: Admin reviews the case and evidence  
**Action:** Review evidence / Request evidence

**Entry trigger:** Support escalation, new evidence submission or an unresolved follow-up returns the case to Admin.

**Checkpoint:** Admin checks the audit trail, existing evidence, missing facts and affected obligations. ONLY Admin records whether evidence is sufficient. Request specific missing records through D3; when sufficient, proceed to D9 offline coordination. Evidence upload cannot issue a resolution or decide sufficiency.

**Exceptions / limits:** Reuse existing records. Record the sufficiency decision, rationale, evidence versions, Admin identity and time. Other outstanding evidence tasks remain visible; only Admin may mark them no longer needed with a reason. Keep actual next actor and follow-up. Cancellation still stops work until explicit restoration; protect confidential conduct reports.

**Audit record:** Admin-only sufficiency decision; reviewer, timestamp, evidence/version references, rationale, outstanding requests and next action/date.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

- Request → **D3** (Parties supply evidence).
- Admin chooses status backtrack → **A1** (Admin backtracks job status).
- Sufficient → **D9** (Admin coordinates offline).

## D3 — Parties supply evidence

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Resolving an issue  
**Waiting-on bar:** Pending: Contractor supplies the requested evidence  
**Action:** Submit evidence

**Entry trigger:** Admin requests specific records from a party.

**Checkpoint:** Each requested party submits the specified evidence. Submission notifies Admin and returns that request for review at D2; it does not decide completeness, resolve the case or advance directly to D4.

**Exceptions / limits:** CM, MCST and Contractor can supply their own requested records, but cannot declare the investigation sufficient. Keep separate evidence tasks per actual actor. Partial submissions do not close other requests. Admin reviews, asks for more, or records why evidence is sufficient. Reuse compulsory transfer proof; request additional records only as needed.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

**Concrete pending lines by situation:**

- Contractor costs or work evidence: **Pending: Contractor supplies the requested evidence**; next stage D2.
- MCST payment or approval evidence: **Pending: MCST supplies the requested evidence**; next stage D2.
- CM site or cancellation evidence: **Pending: CM supplies the requested evidence**; next stage D2.
- Payment: MCST clarifies transfer proof: **Pending: MCST supplies the missing transfer details**; next stage D2.
- Payment: Contractor identifies credit: **Pending: Contractor supplies the payment issue details**; next stage D2.

- Submit evidence → **D2** (Admin reviews evidence).

## D9 — Admin coordinates offline

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Admin Intervention  
**Waiting-on bar:** Pending: Admin coordinates the resolution offline  
**Action:** Record outcome / Issue resolution

**Entry trigger:** Admin records that existing or supplied evidence is sufficient for coordination.

**Checkpoint:** Admin contacts the relevant parties outside QuoteFix by the appropriate chat, email, call, meeting or external process. Keep the detailed coordination audit ledger in an external document outside QuoteFix. Admin records its reference, dates, parties, outcome and agreed or decided obligations before issuing the final resolution. If coordination is already complete, record that fact and its ledger reference instead of repeating it.

**Exceptions / limits:** No in-app bargaining or party-controlled progression. Unsettled coordination remains D7; missing facts return to D2. Existing Admin binding powers remain an explicitly attributed route D5. Confidential reports and reporter identity remain restricted; linking a ledger does not make it public. No app email/chat/Zoom integration or automated external messaging is introduced. The owner selected an external ledger; do not build a detailed in-app coordination log. Preserve the restricted reference/permitted summary and the app decision audit.

**Audit record:** Admin, event/recording timestamps, ledger reference, authorised summary, participants, unresolved items, outcome basis and next follow-up.

**Workspace group:** UX5. Owner-directed offline coordination; one contextual case workspace.

**UI visibility:** Contextual Admin task inside the same case. Offline discussions are recorded by reference; they are not a new public discussion forum.

- More facts → **D2** (Admin reviews evidence).
- Admin issues resolution → **D4** (Acknowledge final resolution).
- Admin records binding verdict → **D5** (Admin issues binding decision).
- Offline outcome still unresolved → **D7** (Admin follows up on unresolved case).

## D4 — Acknowledge final resolution

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Resolving an issue  
**Waiting-on bar:** Pending: Contractor acknowledges the final resolution  
**Action:** Acknowledge resolution

**Entry trigger:** After offline coordination, Admin issues the recorded final resolution, or publishes an explicitly attributed binding decision.

**Checkpoint:** Show the final version, rationale, obligations, responsible actors and relevant dates. Each required party can acknowledge that version. No Reject or Counterproposal control exists here. Only Admin issues or corrects a resolution; corrections preserve the original version and prior acknowledgments.

**Exceptions / limits:** Acknowledgment records that the party has read this exact final version. It proceeds alongside already-authorised execution and never gates repair, payment or verified case resolution. Silence is never recorded as acknowledgment, work acceptance or payment receipt. If a party is silent, retain the truthful outstanding acknowledgment record; no separate mandatory chase cadence is approved for this informational action. Admin corrections preserve versions and prior acknowledgments.

**Audit record:** Immutable issued resolution/version, Admin identity/time, basis (offline agreement or explicit verdict), rationale, obligations and separate per-party acknowledgment events. New version never inherits a false acknowledgment.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual acknowledgment record. The main waiting-on bar continues to name the actual outstanding repair/payment actor; acknowledgment does not add a gate.

**Concrete pending lines by situation:**

- Contractor acknowledgment outstanding: **Pending: Contractor acknowledges the final resolution**; next stage D6.
- MCST acknowledgment outstanding: **Pending: MCST acknowledges the final resolution**; next stage D6.
- CM acknowledgment outstanding: **Pending: CM acknowledges the final resolution**; next stage D6.

**Fields:** Final resolution version and Admin issue time; Relevant offline coordination ledger reference and permitted summary; Required acknowledging parties and each acknowledgment timestamp; Each real obligation: actor, action and applicable date.

- Outstanding action proceeds → **D6** (Carrying out agreed resolution).
- Exact settlement needs confirmation → **C6** (MCST confirms settlement).
- Already performed; verify obligations → **D8** (Reuse or obtain the required verification).

## D5 — Admin issues binding decision

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Admin Intervention  
**Waiting-on bar:** Pending: Admin issues the recorded verdict  
**Action:** Record verdict

**Entry trigger:** After reviewing evidence and offline coordination, Admin exercises the already-approved binding/override authority.

**Checkpoint:** Record the explicit verdict, authority/basis, rationale, evidence, before/after effects and required actions. Publish it through D4 for party acknowledgment; no second Admin or party veto is introduced.

**Exceptions / limits:** Retain existing financial, credential, workflow and moderation powers. Record a binding verdict distinctly from an offline agreement. It does not prove execution, create a bank receipt or bypass actual inspection. Financial version/fee adjustment and linked replacement-ticket safeguards remain unchanged.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

- Unresolved external blocker → **D7** (Admin follows up on unresolved case).
- Admin publishes recorded verdict → **D4** (Acknowledge final resolution).

## D6 — Carrying out agreed resolution

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Carrying out a resolution  
**Waiting-on bar:** Pending: Contractor completes the recorded remedy  
**Action:** Submit resolution evidence

**Entry trigger:** Admin issues an operative resolution with an outstanding remedy, payment, refund or correction. Already-authorised actions proceed while acknowledgments are collected.

**Checkpoint:** Use the existing remedy/payment/correction task. If repair is needed, use R2 then mandatory R1 inspection. If payment is needed, preserve MCST settlement/invoice confirmation and P1/P2. If execution already happened and is verified, skip this task and use D8 to reuse those facts.

**Exceptions / limits:** D6 is conditional: agreeing on an outcome offline does not itself repair a leak or move money. Record actual execution. Failure to perform or new material facts returns to Admin review; this is not a participant Reject/Counterproposal button on the final resolution.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

**Concrete pending lines by situation:**

- Contractor remedy: **Pending: Contractor completes the recorded remedy**; next stage R2.
- MCST settlement payment: **Pending: MCST sends the confirmed settlement payment**; next stage P1.
- Contractor refund: **Pending: Contractor records the required refund**; next stage D8.
- Admin record correction: **Pending: Admin records the authorised correction**; next stage D8.

- Obligations performed → **D8** (Reuse or obtain the required verification).
- Resolution fails → **D2** (Admin reviews evidence).
- Physical remedy remains → **R2** (Contractor addresses issues).

## D7 — Admin follows up on unresolved case

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Issue unresolved  
**Waiting-on bar:** Pending: Admin records the next follow-up on the unresolved case  
**Action:** Add case update

**Entry trigger:** Offline coordination remains unsettled, evidence/external outcome is missing, or an issued obligation is not performed or fails verification.

**Checkpoint:** Admin records the actual blocker, named next actor/action, applicable hold and next follow-up. Return to evidence review/coordination when new facts or an external outcome arrive.

**Exceptions / limits:** This conditional unresolved route remains necessary before a final outcome exists and after failed execution. It is not an in-app Reject resolution route. Do not claim success merely because Admin intervened. Archive remains KIV/unresolved under O29; no archive button or automatic closure is introduced.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Contextual task/outcome inside one support case, not a compulsory sequence of separate screens. Reuse relevant existing evidence and decisions.

**Open decisions:** O29.

- New evidence or outcome → **D2** (Admin reviews evidence).

## D8 — Reuse or obtain the required verification

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** An Admin-supported resolution has actually been carried out, or settlement receipt is recorded, and the case needs to know whether each required obligation is verified.

**Checkpoint:** A corrected physical-work round must have its own successful R1 inspection before its remedy obligation can pass. If THAT SAME corrected round was already successfully inspected, reuse its acceptance for the support case; do not create a duplicate case-only inspection. Never reuse a failed inspection, an older repair round, or an acceptance invalidated by later physical changes. Reuse valid financial/receipt verification separately. D8 has no form or approval of its own. Reuse inspection by exact inspection/repair version and case obligation; display its Inspection [nth] label when n>=2. An aftercare check closes only that linked case and must not re-trigger the original job invoice/fee/payment chain.

**Exceptions / limits:** 4 November: R1 fails round 1. 8 November: Contractor resubmits round 2; CM must inspect again. Only successful R1 acceptance of round 2 can satisfy its case obligation. If CM has already performed and accepted that same round-2 inspection, D8 does not require a third inspection just for Admin paperwork. Missing acceptance routes to R1; failed inspection routes to R2; disputed evidence to D2. Actual balance/receipt tasks continue. Admin verdict alone never proves execution. Aftercare physical remedy: R1 passes current repair -> D8 verifies the linked obligations -> F5. No-work/explanation-only resolution can use existing valid evidence without inventing a physical inspection.

**Workspace group:** UX5. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal check only: require successful inspection of the current corrected round. Reuse only that SAME round's existing acceptance; never skip re-inspection after repairs.

**Concrete pending lines by situation:**

- Corrected round needs fresh inspection: **Pending: CM reviews the work and invoice**; next stage R1.
- Settlement needs confirmation: **Pending: MCST confirms the agreed settlement**; next stage C6.
- Recorded transfer needs receipt confirmation: **Pending: Contractor to verify payment received**; next stage P2.
- Execution evidence remains disputed: **Pending: Admin reviews the resolution evidence**; next stage D2.

- Inspect → **R1** (CM reviews completion).
- Settlement confirmation still needed → **C6** (MCST confirms settlement).
- Agreed balance remains → **P3** (Unresolved payment).
- Aftercare obligation verified → **F5** (Aftercare case resolved).
- Cancellation obligations verified → **C7** (Cancellation settled).
- Ordinary job: case resolved and all closure conditions hold → **P6** (Closed).
- Original invoice needs confirmation → **R4** (MCST confirms invoice).
- Evidence still disputed → **D2** (Admin reviews evidence).
- Undisputed recorded transfer; verify receipt → **P2** (Contractor checks receipt).

## F1 — Feedback scheduled

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** Scheduled: Feedback on [date]  
**Action:** None — no button

**Entry trigger:** Full payment is received, the seven-day fallback applies, or the accepted zero-payable/performed-work exception is recorded.

**Checkpoint:** Schedule compulsory Feedback 30 calendar days after the applicable payment anchor. Do not alter the ticket stage. Reveal Give feedback and create the actionable bell task only when due; do not show an early or disabled feedback button. This applies to 30-day durability Feedback, not the separate inspection-stage feedback. For an actual receipt date without time, dispatch at 09:00 Asia/Singapore on the 30-day due date. If a late entry makes the task already due, issue it immediately while preserving the true observation due date.

**Exceptions / limits:** Notification 2 November -> silence until 9 November -> assumed receipt 9 November -> Feedback 9 December. A transfer made 2 November but notified 15 November -> silence until 22 November -> Feedback 22 December. If Contractor instead confirms actual full receipt on 2 November, Feedback is due 2 December. Full settlement and accepted zero/performed-cancellation rules apply. Reputation scoring remains in its separate chat; fees remain invoice-triggered.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Separate Feedback/aftercare task, not a chain of job stages. Due-only action and existing moderation rules remain; reputation policy stays in its separate chat.

- 30 days pass → **F2** (CM provides feedback).

## F2 — CM provides feedback

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** Pending: CM provides feedback  
**Action:** Give feedback

**Entry trigger:** Thirty days pass from the approved payment anchor.

**Checkpoint:** Due-only form: 1–3 stars = negative durability feedback, 4–5 stars = positive. Both require a short open-ended observation. Retain Unable to assess as a non-rating exception with no durability points. Submission completes the feedback task; publication remains separately moderated.

**Exceptions / limits:** Three normal outcomes: negative submission, positive submission, or no response/reminders. Unable to assess is an explicitly retained exception. A low rating does not automatically open a fault claim/Admin case; aftercare is a separate deliberate request. Missing response is never favourable. Reputation formula and publication rules remain in their own specification. Unanswered reminders remain +2 business days to CM / +5 to Admin; for late-discovered already-due Feedback, count from the first successfully issued task notification. Never backdate the response allowance.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One compulsory 30-day durability task, independent of ticket status. Both positive and negative submissions record observations; silence enters reminders, not a rating. Unable to assess remains a separate exception.

**Fields:** Durability: 1–5 stars, or Unable to assess; For 1–3 stars: describe defects, discoloration, wear or recurrence (required); For 4–5 stars: describe lasting performance/no recurrence (required).

- No response → **F7** (Following up on missing feedback).
- 1–3 stars → **F8** (Negative durability feedback).
- 4–5 stars → **F9** (Positive durability feedback).
- Unable to assess → **F10** (Unable to assess recorded).

## F3 — Addressing a later issue

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket remains Closed, if already closed  
**Waiting-on bar:** Pending: Contractor responds to the linked issue  
**Action:** Report issue / Respond

**Entry trigger:** CM deliberately requests help for a later fault, through linked aftercare/Admin Support; this is independent of rating submission.

**Checkpoint:** Create a linked aftercare case with its own response/remedy/dispute workflow; the original job remains closed if already closed.

**Exceptions / limits:** A repaired earlier defect still counts as reported durability evidence subject to metric policy. A new report does not silently edit the invoice or reopen quoting. A 1–3-star assessment alone creates no automatic repair claim.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Separate Feedback/aftercare task, not a chain of job stages. Due-only action and existing moderation rules remain; reputation policy stays in its separate chat.

**Open decisions:** Q11.

- Contractor response required → **D1** (Contractor responds to concern).

## F4 — Admin reviews publication

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** Pending: Admin reviews feedback or contractor response  
**Action:** Review publication

**Entry trigger:** Feedback or a contractor response requires publication approval under the agreed policy.

**Checkpoint:** Feedback is recorded immediately and visible privately to Contractor; Admin reviews shared publication and contractor replies, preserving originals and moderation history.

**Exceptions / limits:** Publication review is separate from a repair case or completing the feedback task. Preserve the separately approved reputation model; unresolved scoring/attribution questions stay in that discussion.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Separate Feedback/aftercare task, not a chain of job stages. Due-only action and existing moderation rules remain; reputation policy stays in its separate chat.

**Open decisions:** Q11.

- Request Admin Support → **E3** (Request Admin Support).

## B1 — Contractor pays QuoteFix

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** Pending: Contractor pays QuoteFix fees  
**Action:** View fee statement

**Entry trigger:** MCST confirms the final invoice or cancellation settlement.

**Checkpoint:** At MCST confirmation, assess 4% platform + 4% lead on the final confirmed payable invoice/settlement total, including GST/approved variations. Payment to QuoteFix is due in three business days. A SGD 1,200 confirmed invoice assesses SGD 48 + SGD 48 even if MCST has paid only SGD 600 so far; owner explicitly reconfirmed.

**Exceptions / limits:** Explicitly reconfirmed: invoice/settlement confirmation remains the fee trigger, independent of actual/deemed contractor receipt and Feedback. Singapore weekdays excluding public holidays; skip trigger date; due 23:59 on third business day. Zero fees need no transfer. A corrected total of SGD 1,200 means total fees of SGD 96. Credit any already assessed/paid amounts rather than charging twice; SGD 80 already paid leaves SGD 16, not SGD 112 total. V10 approves adjustment mechanics: preserve the original fee/deadline; newly assessed unpaid differences get three business days from authorised adjustment confirmation. Reductions offset unpaid fees; Admin records refunds actually made for excess already paid. No fixed refund turnaround is imposed.

**Workspace group:** UX13. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Outside every ticket: Contractor-only QuoteFix billing/fee statement. CM and MCST have no fee access, ticket badge or fee notification. Admin manages collection in the separate internal billing workspace. Billing references the source invoice privately; fees never become a ticket stage or closure gate.

- Fee payment reported → **B2** (Admin reconciles fee payment).
- Deadline passes → **B3** (Collecting overdue fees).
- Zero fees assessed → **B4** (QuoteFix fees settled).

## B2 — Admin reconciles fee payment

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** Pending: Admin verifies the reported fee payment  
**Action:** Record fee receipt

**Entry trigger:** Contractor reports QuoteFix fee-payment evidence.

**Checkpoint:** Match received payment to both fee entries; record evidence and any balance.

**Exceptions / limits:** Admin manually verifies actual receipt and records allocation/balance. Evidence alone does not settle fees. No integration required for launch.

**Workspace group:** UX13. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Outside every ticket: Contractor-only QuoteFix billing/fee statement. CM and MCST have no fee access, ticket badge or fee notification. Admin manages collection in the separate internal billing workspace. Billing references the source invoice privately; fees never become a ticket stage or closure gate.

- Balance remains after deadline → **B3** (Collecting overdue fees).
- Full receipt verified → **B4** (QuoteFix fees settled).

## B3 — Collecting overdue fees

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** Pending: Contractor settles overdue QuoteFix fees  
**Action:** View outstanding balance

**Entry trigger:** Fee deadline passes without full verified settlement.

**Checkpoint:** Notify contractor/admin; freeze quoting for new jobs while unpaid fees remain. Reconcile payment evidence or disputes.

**Exceptions / limits:** Approved: block new quotations and selection of existing unselected offers while fee-restricted. Existing selected/authorised jobs continue with updates, variations, completion, invoicing, receipts and support. No full-account lock.

**Workspace group:** UX13. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Outside every ticket: Contractor-only QuoteFix billing/fee statement. CM and MCST have no fee access, ticket badge or fee notification. Admin manages collection in the separate internal billing workspace. Billing references the source invoice privately; fees never become a ticket stage or closure gate.

- Payment evidence supplied → **B2** (Admin reconciles fee payment).
- Request Admin Support → **E3** (Request Admin Support).

## U1 — Urgent job alerts admin

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage remains visible  
**Waiting-on bar:** Pending: Admin coordinates urgent attendance  
**Action:** View urgent job

**Entry trigger:** An urgent RFQ is published.

**Checkpoint:** In-app alert goes to admin as well as relevant job recipients; humans coordinate offline.

**Exceptions / limits:** Does not approve work, bypass verification or close quotations. No external notification channel is enabled. Urgent unacknowledged alert repeats at +15 minutes, +1 hour and +3 hours from the first issued notice, not cumulative waits. Explicit Take coordination stops unacknowledged reminders; unresolved attendance still needs the saved next update. O35-D resolved: after the three-hour reminder, repeat every seven hours until explicit acknowledgment (T+10h, T+17h, T+24h...). Reuse the same urgent item; avoid a burst of stale retries. After acknowledgment use Admin-set follow-up.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

**Countdown — Admin:** Approved initial urgent alert; +15min/+1h/+3h, then every 7 hours while unacknowledged.

- Admin: Urgent RFQ is unacknowledged. Next attention reminder at {time}.

Offsets share the first issued notice anchor; stop on explicit coordination acknowledgment, cancellation or supersession. Do not treat bell read as acknowledgment. Once acknowledged, use the recorded next follow-up. After the +3h reminder, repeat at T+10h, T+17h, T+24h and so on. A late dispatch must not issue all obsolete reminders at once.

- Admin takes coordination → **U2** (Admin takes coordination).

## U2 — Admin takes coordination

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage remains visible  
**Waiting-on bar:** Pending: Assigned admin coordinates attendance  
**Action:** Take coordination

**Entry trigger:** An admin acknowledges the urgent alert.

**Checkpoint:** A named admin claims coordination, records acknowledgment, contact attempts/ETA and the next update.

**Exceptions / limits:** Confirmed ownership action, not another approval. Operational staffing/coverage supplied privately; do not show those details as app copy. Urgent unacknowledged alert repeats at +15 minutes, +1 hour and +3 hours from the first issued notice, not cumulative waits. Explicit Take coordination stops unacknowledged reminders; unresolved attendance still needs the saved next update. O35-D resolved: after the three-hour reminder, repeat every seven hours until explicit acknowledgment (T+10h, T+17h, T+24h...). Reuse the same urgent item; avoid a burst of stale retries. After acknowledgment use Admin-set follow-up.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

- Attendance found → **U3** (Attendance arranged).
- No attendance confirmed → **U4** (Urgent sourcing unresolved).

## U3 — Attendance arranged

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage remains visible  
**Waiting-on bar:** Pending: CM selects the contractor  
**Action:** View coordination update

**Entry trigger:** Admin records an available contractor and expected attendance.

**Checkpoint:** Inform CM; verify that normal selection/approval gates are met before authorised work.

**Exceptions / limits:** Recording an ETA does not itself authorise work. If no contractor can attend, use U4.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

**Concrete pending lines by situation:**

- CM selection outstanding: **Pending: CM selects the contractor**; next stage S1.
- MCST approval outstanding: **Pending: MCST approves the selected contractor**; next stage S2.

- Normal selection applies → **S1** (CM freezes selection).

## U4 — Urgent sourcing unresolved

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage remains visible  
**Waiting-on bar:** Pending: Admin updates CM on alternatives  
**Action:** Add coordination update

**Entry trigger:** No contractor accepts attendance, or the response remains unconfirmed.

**Checkpoint:** Tell CM the current outcome and next human contact/plan; retain an accountable owner and next update time.

**Exceptions / limits:** Keep the sourcing issue unresolved with named next action/date. No response-time guarantee or extra external channel is introduced; private operating arrangements stay out of app copy. Urgent unacknowledged alert repeats at +15 minutes, +1 hour and +3 hours from the first issued notice, not cumulative waits. Explicit Take coordination stops unacknowledged reminders; unresolved attendance still needs the saved next update. O35-D resolved: after the three-hour reminder, repeat every seven hours until explicit acknowledgment (T+10h, T+17h, T+24h...). Reuse the same urgent item; avoid a burst of stale retries. After acknowledgment use Admin-set follow-up.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

- Continue human sourcing → **U2** (Admin takes coordination).

## E1 — Following up on pending actions

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current job stage remains visible  
**Waiting-on bar:** Pending: MCST decides the outstanding approval; Admin follows up  
**Action:** Review stalled action

**Entry trigger:** An approved age/coverage/commitment rule brings an outstanding action to Admin attention.

**Checkpoint:** Apply the task-specific policy: ordinary decision/response 2/5 business days; quotation sourcing T+2 calendar-date noon with fewer than three distinct current selectable contractors; unmade selection 5/10 business days starting at three distinct valid quotes, paused below three and resumed with remaining time; immediate missed work/temporary-estimate target. Name the actual actor and record the next follow-up. These reminders do not create new approval gates. An agreed start with no Start record alerts Admin at the scheduled time, then relevant CM/MCST after 24h only if still unrecorded.

**Exceptions / limits:** Use one contextual task per issue and supersede obsolete reminders when action is completed. CM may answer or decline information/visit requests. Admin chases contractor sourcing offline; quotations remain open and a one-quote selection stays permitted. A generic comment or bell read is not the required action. Preserve source event/version and original task age.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

**Concrete pending lines by situation:**

- MCST approval overdue: **Pending: MCST decides the outstanding approval; Admin follows up**; next stage S2.
- CM review overdue: **Pending: CM reviews completion; Admin follows up**; next stage R1.
- Contractor response overdue: **Pending: Contractor responds to the issue; Admin follows up**; next stage D1.
- Insufficient quotation coverage: **Pending: Admin follows up with contractors for quotations**; next stage Q1.
- CM selection outstanding: **Pending: CM selects a contractor; Admin follows up**; next stage Q2.
- MCST selection outstanding: **Pending: MCST selects and approves a contractor; Admin follows up**; next stage Q2.
- Completion target missed: **Pending: Contractor completes the work; Admin follows up**; next stage W2.
- Temporary completion estimate overdue: **Pending: Contractor supplies a completion estimate; Admin reviews any extension**; next stage W2.
- Scheduled start has not been recorded: **Pending: Contractor records Start or explains the delay; Admin follows up**; next stage W1.

- Substantive dispute identified → **D2** (Admin reviews evidence).
- Continue sourcing → **Q1** (Requesting for quotes).
- Selection action → **Q2** (Comparing quotations).
- Follow up on work → **W2** (Contractor carries out work).
- Follow up on start → **W1** (Contractor prepares to start).

## E2 — Contractor cannot continue

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Unable to continue work  
**Waiting-on bar:** Pending: Admin to review interruption of works  
**Action:** Review interruption

**Entry trigger:** After selection the contractor withdraws, loses eligibility or cannot perform.

**Checkpoint:** Admin records the reason, pauses affected work when needed, assesses completed work/costs, and records a verdict for properly authorised resumption or cancellation/settlement.

**Exceptions / limits:** Admin records reason, safe pause, completed work/costs and Admin's verdict. CM/MCST cancellation is immediate; claims use C3/C8. Admin can explicitly restore authorised work through A1. A selected contractor cannot silently substitute another company.

**Owner-confirmed wording:** status, pending, action.

**Workspace group:** UX15. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One coordination/support workspace with named owner, attempts and next follow-up. Reminders do not add approvals; unresolved sourcing/interruption remains explicit.

**Fields:** Admin's verdict: open-ended findings/conclusion.

- CM or MCST chooses Cancel job → **C2** (CM or MCST confirms cancellation).
- Previously started; authorised resumption → **W2** (Contractor carries out work).
- Work still unauthorised → **C1** (CM or MCST cancels directly).
- Not started; authorised to begin → **W1** (Contractor prepares to start).
- Evidence or outcome unresolved → **D2** (Admin reviews evidence).

## E3 — Request Admin Support

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Current ticket stage remains visible  
**Waiting-on bar:** Pending: Admin reviews the support request  
**Action:** Request Admin Support

**Entry trigger:** A permitted participant reports a quoting, work, payment, account, access, verification, track-record or conduct concern, before or after closure.

**Checkpoint:** Open or reuse one linked case for the same concern, prefilled with the job/invoice/transfer and existing evidence. Admin assigns only missing information or real action; decisions, execution and verification remain distinct. Payment Issue and escalated follow-up use this same mechanism.

**Exceptions / limits:** Approved notice: Your report is confidential. It will not be shown to the person or organisation you are reporting. Apply to sensitive conduct reports; report and reporter are hidden from the subject, including a reported MCST member despite ordinary estate rights. Enforce the same restriction on notifications, exports and subject-visible audit views. Routine operational support retains appropriate participant visibility.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

- Admin triages the same case → **D2** (Admin reviews evidence).

## C7 — Cancellation settled

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** No outstanding settlement action  
**Action:** View cancellation record

**Entry trigger:** Any agreed/admin-confirmed settlement is fulfilled and the cancellation intervention has no remaining obligation. Also applies when the claim window ends with no timely claim, existing debt or blocking obligation; this is an operational outcome, not a fabricated acceptance.

**Checkpoint:** Mark settlement complete while keeping the ticket Cancelled.

**Exceptions / limits:** Return the visible ticket to Cancelled when the intervention is resolved; preserve the claim and outcome. This is not automatically Closed or resumed work. Feedback on performed work follows the existing approved rule.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.


## B4 — QuoteFix fees settled

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** No outstanding fee action  
**Action:** View fee receipt

**Entry trigger:** Full fee receipt is verified, or assessed fees are zero.

**Checkpoint:** Settle the fee obligation and preserve the reconciliation record.

**Exceptions / limits:** Admin-verified full fee receipt lifts only the fee restriction. Evidence upload alone does not. Other restrictions remain; no change to estate payment, Feedback or ticket closure.

**Workspace group:** UX13. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Outside every ticket: Contractor-only QuoteFix billing/fee statement. CM and MCST have no fee access, ticket badge or fee notification. Admin manages collection in the separate internal billing workspace. Billing references the source invoice privately; fees never become a ticket stage or closure gate.


## F5 — Aftercare case resolved

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** No outstanding action on this aftercare case  
**Action:** View case record

**Entry trigger:** All applicable obligations of a deliberately opened linked aftercare case have actually been performed and verified.

**Checkpoint:** For a physical repair, require CM acceptance of the current corrected round at R1; failed inspection loops to R2. D8 reuses that acceptance and any required financial verification. Only then record this linked case resolved. If the recorded outcome needs no new physical work, no fresh inspection is invented.

**Exceptions / limits:** Example: a leak returns after the original job closed; CM opens F3; a repair is agreed/performed; CM inspects it and repeats failed rounds as needed; D8 then records F5 once all case obligations pass. The original ticket remains Closed if already closed. Keep numbered inspection records and failure reasons, including links to the original ticket/case. No automatic new invoice, fee or Feedback cycle is triggered by this case outcome. Reputation metric policy remains in the separate discussion.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Recorded outcome of the linked aftercare case, not another inspection or a mandatory stage for every Feedback submission.

**Open decisions:** Q11.


## F6 — Feedback recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** No outstanding feedback-submission action  
**Action:** View feedback

**Entry trigger:** CM submits 1–3 stars with observation, 4–5 stars with observation, or Unable to assess.

**Checkpoint:** Save the rated observation or explicit unassessable outcome and finish the submission/reminder task. Do not invent a star value for Unable to assess. Admin moderation does not undo submission.

**Exceptions / limits:** Preserve negative/positive classifications and source evidence. Contractor sees feedback privately and can respond; Admin reviews shared publication and contractor replies. Broader scoring/attribution policy remains in the reputation work.

**Workspace group:** UX12. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Separate Feedback/aftercare task, not a chain of job stages. Due-only action and existing moderation rules remain; reputation policy stays in its separate chat.

**Open decisions:** Q11.

- Publication review needed → **F4** (Admin reviews publication).

## P0 — Zero payable derived

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** R4 or C6 records the exact confirmed zero-payable outcome.

**Checkpoint:** Reuse that confirmation once; check the existing closure conditions and appropriate performed-work Feedback rule.

**Exceptions / limits:** Approved UX3: derive no payment due from the exact already-confirmed zero invoice/settlement. Do not ask MCST to confirm the same zero twice. If no valid confirmation exists, keep the original R4/C6 task. No fictitious transfer; performed-work Feedback uses the confirmed zero outcome.

**Workspace group:** UX3. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal event/check only. Show the actual destination stage and its next actor; no separate user task.

- Performed work: zero-payable anchor → **F1** (Feedback scheduled).
- Ordinary job: existing conditions satisfied → **P6** (Closed).
- Existing blocking case remains open → **D2** (Admin reviews evidence).

## V4 — Rejected or withdrawn variation recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** Required approver rejects, or proposer withdraws the pending variation.

**Checkpoint:** Preserve original authorisation. Rejection requires a preset reason (Price, Scope, Timing, Not needed, or Other with a nonblank explanation); further detail is optional. Withdrawal reason remains optional. Save the reason, actor/role, server date/time SGT, decision, variation version, before/after terms and evidence permanently; corrections append history.

**Exceptions / limits:** Rejection requires a preset reason (Price, Scope, Timing, Not needed, or Other with a nonblank explanation); further detail is optional. Withdrawal reason remains optional. Save the reason, actor/role, server date/time SGT, decision, variation version, before/after terms and evidence permanently; corrections append history. Automatically return through V5 to the valid saved stage. Rejection does not authorise extra work, cancel the job, or itself require Admin. If original work cannot continue, route to E2.

**Audit record:** Permanent variation audit entry: named actor and role, server decision date/time (display SGT), variation ID/version, decision, before/after scope/price/timing, rationale supplied and linked evidence. A history link opens this record; the popup is only a summary. Corrections append an attributable follow-up instead of overwriting the original.

**Workspace group:** UX2. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal event/check only. Show the actual destination stage and its next actor; no separate user task.

**Concrete pending lines by situation:**

- Before work starts: **Pending: Contractor to begin the authorised work**; next stage W1.
- Physical work continuing: **Pending: Contractor to complete the work**; next stage W2.
- Invoice needs correction: **Pending: Contractor explains or corrects the invoice**; next stage R3.
- Completion review outstanding: **Pending: CM reviews the work and invoice**; next stage R1.
- MCST performs completion review: **Pending: MCST reviews the work and invoice**; next stage R1.
- Unable to continue: **Pending: Admin to review interruption of works**; next stage E2.

**Fields:** Rejection reason (required preset; Other requires explanation); Additional rejection detail (optional); Withdrawal reason (optional).

- Automatic context check → **V5** (Automatic variation return).

## V5 — Automatic variation return

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** An approved, rejected or withdrawn variation has a recorded outcome.

**Checkpoint:** Approved return routes: W1 before start; W2 only for safely continuing physical work; R3 for invoice reconciliation; R1 for completion review; E2 if the authorised work cannot continue.

**Exceptions / limits:** Approved UX2 replaces Resuming works / Next. Use the current valid saved stage and actual obligations. W1 before start, W2 only for safe ongoing work, R3 for invoice reconciliation, R1 for outstanding completion review, E2 for inability. Show the destination actor/action immediately. No routine Admin gate.

**Workspace group:** UX2. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal event/check only. Show the actual destination stage and its next actor; no separate user task.

**Concrete pending lines by situation:**

- Before work starts: **Pending: Contractor to begin the authorised work**; next stage W1.
- Physical work continuing: **Pending: Contractor to complete the work**; next stage W2.
- Invoice needs correction: **Pending: Contractor explains or corrects the invoice**; next stage R3.
- Completion review outstanding: **Pending: CM reviews the work and invoice**; next stage R1.
- MCST performs completion review: **Pending: MCST reviews the work and invoice**; next stage R1.
- Unable to continue: **Pending: Admin to review interruption of works**; next stage E2.

- Before start; able to proceed → **W1** (Contractor prepares to start).
- Work ongoing; safe and feasible → **W2** (Contractor carries out work).
- Invoice context: reconcile first → **R3** (Explaining price change).
- Review context; invoice already reconciled → **R1** (CM reviews completion).
- Authorised work cannot continue → **E2** (Contractor cannot continue).

## P7 — Internal seven-day receipt rule

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** Seven calendar days elapse from the first issued payment notification for an eligible transfer, with no receipt response or Payment Issue.

**Checkpoint:** Record Assumed received for this transfer only, dated at its response deadline. Do not backdate to transfer date + seven. Exclude disputed, corrected/invalidated or already settled transfers and retain any balance. Full settlement anchors Feedback and may satisfy closure only when all other gates pass.

**Exceptions / limits:** The owner’s v8 rule supersedes the former refusal of notification-based timing: prompt and late entries use the same first-notification anchor. First issuance is recorded when the in-app notice is durably available; failed creation cannot start the clock. Repeated delivery attempts, reminders, reads and reopenings never restart it. P7 remains internal. After an actual assumed-receipt event, show the approved popup once per recipient/event; Understood dismisses it and Payment Issue opens the linked case. Original events remain after correction. The fee clock is unchanged.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** Internal process only: no ticket stage, pending bar or action button. The contractor sees a notice after automatic receipt has actually been recorded.

**Fields:** Payment recorded automatically. No payment response was received by {deadline}, so QuoteFix recorded SGD {amount} as received on {date}, under T+7D. If this is incorrect, select Payment Issue.; Approved controls: Understood / Payment Issue. Understood dismisses the notice only.; T = first issued payment notification, for this transfer; D = calendar days; Receipt record label: Assumed received.

- full balance covered → **P4** (Payment received).
- Undisputed amount assumed; balance remains → **P3** (Unresolved payment).

## G1 — Admin verifies credentials

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Account verification; job stage stays visible  
**Waiting-on bar:** Pending: Admin verifies contractor credentials  
**Action:** Review verification

**Entry trigger:** Contractor requests verification or supplies a new credential.

**Checkpoint:** Admin checks authenticity offline, records checker/evidence/category/expiry, then manually approves or rejects. Quoting requires admin verification. Admin-configured mandatory category/scope prerequisites and distinct company/person holders are accepted.

**Exceptions / limits:** Admin may create fresh credential types and configure category/scope prerequisites. Company and individual credential holders remain distinct.

**Workspace group:** UX14. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One verification dashboard/record. Renewal task and expiry badge stay here; job-level attention appears only for a relevant eligibility or work issue.

- Admin approves → **G2** (Verified credentials recorded).

## G2 — Verified credentials recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Account verification; job stage stays visible  
**Waiting-on bar:** No verification action due  
**Action:** View verification

**Entry trigger:** Admin approves the record.

**Checkpoint:** Display factual credential, holder/scope and validity; preserve decision history.

**Exceptions / limits:** Verification is separate from reputation. No automatic authenticity integration or invented expiry date.

**Workspace group:** UX14. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One verification dashboard/record. Renewal task and expiry badge stay here; job-level attention appears only for a relevant eligibility or work issue.

- One month before expiry → **G3** (Credential renewal reminder).

## G3 — Credential renewal reminder

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Account verification; job stage stays visible  
**Waiting-on bar:** Pending: Admin reviews upcoming credential expiry  
**Action:** Review expiring credential

**Entry trigger:** One calendar month before a recorded expiry.

**Checkpoint:** Send admin an in-app notice; show the exact upcoming expiry and request renewal evidence if needed.

**Exceptions / limits:** Calendar-month reminder, clamp month end; if a record is added inside the window notify immediately. No expiry is forced where none exists. Date-only credential expiry means valid through that Singapore date; grey/restrict as applicable at midnight beginning the next day. Honour an explicit expiry timestamp.

**Workspace group:** UX14. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One verification dashboard/record. Renewal task and expiry badge stay here; job-level attention appears only for a relevant eligibility or work issue.

- Renewal evidence supplied → **G1** (Admin verifies credentials).
- Expiry reached → **G4** (Credential expired).

## G4 — Credential expired

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Account verification; job stage stays visible  
**Waiting-on bar:** Pending: Admin reviews expired credential  
**Action:** Review expired credential

**Entry trigger:** Recorded expiry passes without approved renewal.

**Checkpoint:** Grey the expired badge. Admin reviews the affected contractor/credential.

**Exceptions / limits:** Accepted: optional badge expiry greys that badge; required category expiry/revocation restricts affected new eligibility and prompts relevant active-work review. Fee restriction and credential/safety hold are separate reasons. For date-only expiry, the effective boundary is 00:00 Asia/Singapore on the following calendar date; the stated date itself remains valid.

**Workspace group:** UX14. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One verification dashboard/record. Renewal task and expiry badge stay here; job-level attention appears only for a relevant eligibility or work issue.

- Renewal submitted → **G1** (Admin verifies credentials).
- active work affected → **E2** (Contractor cannot continue).

## C8 — Cancellation claim opens intervention

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Admin Intervention  
**Waiting-on bar:** Pending: Admin reviews the contractor cancellation concern  
**Action:** Review cancellation concern

**Entry trigger:** Contractor submits the intervention request and explanation.

**Checkpoint:** Reopen the ticket for the intervention pipeline, preserving the cancellation event and an explicit Works cancelled indicator. Assign admin review and any evidence tasks.

**Exceptions / limits:** The pending role changes as evidence, decisions or payments are required. Ordinary work stays cancelled unless an admin explicitly restores authorised work through A1.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

- Admin reviews case → **D2** (Admin reviews evidence).
- Explicit admin restoration → **A1** (Admin backtracks job status).

## C9 — Contractor accepts cancellation

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Cancelled  
**Waiting-on bar:** No cancellation response pending  
**Action:** View cancellation

**Entry trigger:** Contractor selects Okay and confirms: I accept the cancellation and do not have any additional claims.

**Checkpoint:** Record the explicit no-additional-cancellation-claim declaration with actor/time. Preserve any already-confirmed payable amount; accepting cancellation does not mark that money paid.

**Exceptions / limits:** Use the owner's exact declaration and information-icon copy above. Existing confirmed payment remains due; do not fold that explanatory rule into or expand the owner's icon text. Record actor/time; no acceptance inferred from silence. Exceptional erroneous records can use Request Admin Support. The separate automatic seven-day cutoff is not this explicit acceptance event.

**Workspace group:** UX11. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One cancellation surface. Confirm cancellation once; show the contractor response/claim when needed. Outcomes are history, not additional approvals. Existing debt and any real settlement remain explicit.

**Fields:** Required confirmation: I accept the cancellation and do not have any additional claims.; Information icon: For e.g, materials already ordered for the job, subcontractor commitments, labour fee or equipment hire..

- Existing confirmed amount still unpaid → **P1** (MCST records payment).
- No outstanding payment or blocking obligation → **C7** (Cancellation settled).

## A1 — Admin backtracks job status

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Admin Intervention  
**Waiting-on bar:** Pending: Admin records the status change  
**Action:** Change job status

**Entry trigger:** Admin chooses to restore an earlier job stage under the approved permissions.

**Checkpoint:** Record old/new stage, reason, evidence, actor/time and required next tasks. Preserve original cancellation/completion/approval/financial events and notify affected parties. Before applying, show Admin an impact summary. Preserve original financial events, payments, assessments and clocks. Invalidate only acceptance/tasks affected by changed facts; retain still-valid inspection and approvals. Changed amounts require a distinct adjustment, never another full assessment. Create only genuinely needed next tasks. No second-admin review.

**Exceptions / limits:** Approved backtracking dependency rule: Before applying, show Admin an impact summary. Preserve original financial events, payments, assessments and clocks. Invalidate only acceptance/tasks affected by changed facts; retain still-valid inspection and approvals. Changed amounts require a distinct adjustment, never another full assessment. Create only genuinely needed next tasks. No second-admin review. Contractor replacement after work authorisation still needs a linked new ticket. V10 approves separate adjustment deadlines/refunds; ordinary backtracking never resets the original clock.

**Workspace group:** UX4. Approved by owner: all streamlining changes, point 7.

- Saved; route automatically → **A2** (Automatic restoration route).

## A2 — Automatic restoration route

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** Admin records a valid status-restoration decision.

**Checkpoint:** Recompute outstanding tasks from retained decisions and explicit changes. Route to the applicable stage; supersede stale tasks without deleting history. Before applying, show Admin an impact summary. Preserve original financial events, payments, assessments and clocks. Invalidate only acceptance/tasks affected by changed facts; retain still-valid inspection and approvals. Changed amounts require a distinct adjustment, never another full assessment. Create only genuinely needed next tasks. No second-admin review.

**Exceptions / limits:** Approved backtracking dependency rule: Before applying, show Admin an impact summary. Preserve original financial events, payments, assessments and clocks. Invalidate only acceptance/tasks affected by changed facts; retain still-valid inspection and approvals. Changed amounts require a distinct adjustment, never another full assessment. Create only genuinely needed next tasks. No second-admin review. Contractor replacement after work authorisation still needs a linked new ticket. V10 approves separate adjustment deadlines/refunds; ordinary backtracking never resets the original clock.

**Workspace group:** UX4. Approved by owner: all streamlining changes, point 7.

**UI visibility:** Internal event/check only. Show the actual destination stage and its next actor; no separate user task.

**Concrete pending lines by situation:**

- Restore before start: **Pending: Contractor to begin the authorised work**; next stage W1.
- Restore active work: **Pending: Contractor to complete the work**; next stage W2.
- Return to completion review: **Pending: CM reviews the work and invoice**; next stage R1.
- Return to invoice reconciliation: **Pending: Contractor explains or corrects the invoice**; next stage R3.
- Return to financial confirmation: **Pending: MCST to confirm invoice is correct**; next stage R4.

- Before start → **W1** (Contractor prepares to start).
- Work → **W2** (Contractor carries out work).
- Work review → **R1** (CM reviews completion).
- Invoice correction → **R3** (Explaining price change).
- Invoice confirmation → **R4** (MCST confirms invoice).

## M1 — MCST acknowledges threshold

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Comparing quotations  
**Waiting-on bar:** Pending: MCST acknowledges the threshold exceedance  
**Action:** Yes I know / Back

**Entry trigger:** MCST selects Select and approve for an offer above the estate threshold.

**Checkpoint:** Popup states quote total and threshold. Yes I know confirms the combined selection/approval with normal final confirmation disclosures; Back returns to comparison without committing either.

**Exceptions / limits:** No second MCST user required. Include the ordinary irreversibility/scope notice so acknowledgment is not mistaken for an informational click. Quote validity and version are rechecked atomically. Amounts shown include GST.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Back; nothing committed → **Q2** (Comparing quotations).
- Yes I know; select and approve → **M2** (MCST selects and approves).

## M2 — MCST selects and approves

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Starting work  
**Waiting-on bar:** Pending: Contractor to begin the authorised work  
**Action:** Start

**Entry trigger:** MCST confirms Select and approve; above threshold also acknowledges M1.

**Checkpoint:** Record selected offer, rationale and MCST authorisation together, close quoting and authorise work.

**Exceptions / limits:** MCST authoring means creating/publishing an RFQ description, not writing a report for its own sake. Same AI/privacy checks apply. MCST selection uses this combined route rather than pretending a CM selected.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

- Work authorised → **W1** (Contractor prepares to start).

## S5 — Reopen quotation round

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Requesting for quotes  
**Waiting-on bar:** Pending: CM reopens quotations  
**Action:** Reopen quotations

**Entry trigger:** After rejected nomination, no suitable valid offer remains, or fresh quotes are needed.

**Checkpoint:** CM or MCST explicitly reopens quotations before any work authorisation following MCST rejection. Preserve prior rounds, quote versions and nomination decisions; use the current approved brief and notify eligible contractors. No silent extension of quote validity or reuse of outdated prices.

**Exceptions / limits:** Approved Q19. No automatic new round: compare existing valid offers first or explicitly reopen. During a pending selection, quoting remains frozen. Once work is authorised, replacement requires a linked new ticket. MCST has the same reopening permission; live pending copy names the actor initiating it. Publication of an explicit new round starts its own T16 sourcing checkpoint at noon on the second following Singapore calendar date.

**Workspace group:** UX8. Approved by owner: all streamlining changes, point 7.

**UI visibility:** One quotation/selection workspace with contextual tasks. Collection and comparison can coexist before selection. Preserve site-visit, privacy, validity and MCST approval gates.

**Concrete pending lines by situation:**

- CM reopens quotations: **Pending: CM reopens quotations**; next stage Q1.
- MCST reopens quotations: **Pending: MCST reopens quotations**; next stage Q1.

- explicitly publish next round → **Q1** (Requesting for quotes).

## P8 — Admin follows up in payment case

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Arranging payment  
**Waiting-on bar:** Pending: Admin follows up with MCST  
**Action:** Review payment progress

**Entry trigger:** Approved reminder timing is reached while the relevant payment/update obligation remains unresolved.

**Checkpoint:** Approved Q20: immediately create the MCST payment task at invoice confirmation; one business day without payment/update record alerts Admin and reminds MCST; three business days unresolved alerts the assigned Admin again. Admin records next follow-up date/time; a missed update triggers another alert.

**Exceptions / limits:** Approved A: reminders/escalations create or update one linked payment support case and specific tasks. Preserve MCST/Admin countdown. Stop obsolete missing-record reminders when a valid entry is supplied; keep actual balance/receipt tasks. A generic message or viewing the ticket does not complete payment or restart deadlines.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** A / UX1 approved: task inside the same payment support case. Underlying payment stage remains visible; no separate ticket stage, repeated form or additional payment approval.

**Countdown — MCST, Admin:** Follow-up timing and these two role-specific countdown lines explicitly approved in v10; no MCST bank-payment deadline.

- MCST: QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.
- Admin: Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.

Counts toward the next support reminder/contact event: one business day without a payment/update record, three business days still unresolved, then the Admin-set next follow-up. At the first event notify Admin that MCST has not recorded payment or a meaningful update, and remind MCST. Admin checks whether payment has actually been sent and helps obtain the record or progress update. A bank payment is not presumed unpaid merely because an app entry is missing. No app-imposed MCST payment deadline, penalty, cancellation, or payment extension. Stop obsolete missing-record reminders when supplied; keep real balance/receipt tasks. Do not restart on views, generic comments, reads or retries.

- Admin requests concrete payment update → **P9** (MCST responds in payment case).

## P9 — MCST responds in payment case

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Arranging payment  
**Waiting-on bar:** Pending: MCST updates the payment progress  
**Action:** Reply / Payment Sent

**Entry trigger:** Admin requests the missing payment record or a concrete unpaid-payment update.

**Checkpoint:** If already paid, use the same Payment Sent form with compulsory completed-transfer proof and actual amount/date. If not paid, reply in the case with the reason and expected timing if known; do not force an invented payment date. Retain Admin follow-up and existing payment obligations; a reply is not payment.

**Exceptions / limits:** One reply in the existing case, not a second progress form. Reuse all documents and the ordinary payment form. Prompt and late transfer entries both go to P2 with a first-notification-based seven-day deadline; late entry alone does not require Admin receipt adjudication.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** A / UX1 approved: task inside the same payment support case. Underlying payment stage remains visible; no separate ticket stage, repeated form or additional payment approval.

**Countdown — MCST, Admin:** Follow-up timing and these two role-specific countdown lines explicitly approved in v10; no MCST bank-payment deadline.

- MCST: QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.
- Admin: Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.

Counts toward the next support reminder/contact event: one business day without a payment/update record, three business days still unresolved, then the Admin-set next follow-up. At the first event notify Admin that MCST has not recorded payment or a meaningful update, and remind MCST. Admin checks whether payment has actually been sent and helps obtain the record or progress update. A bank payment is not presumed unpaid merely because an app entry is missing. No app-imposed MCST payment deadline, penalty, cancellation, or payment extension. Stop obsolete missing-record reminders when supplied; keep real balance/receipt tasks. Do not restart on views, generic comments, reads or retries.

- Not sent: MCST still owes payment → **P1** (MCST records payment).
- Proof and Payment Sent; notify → **P2** (Contractor checks receipt).
- Promised update missed → **P8** (Admin follows up in payment case).
- Payment concern needs review → **D2** (Admin reviews evidence).

## P10 — Transfer and notification dates recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** MCST submits Payment Sent with completed-transfer proof; QuoteFix records the entry and issues the contractor notice.

**Checkpoint:** Store actual transfer date, reporting timestamp and first issued notification timestamp separately. Compute T+7D from first notification, never from transfer date. Same rule for late entries.

**Exceptions / limits:** This replaces the old late-record Admin exception. No separate P10 ticket stage or compulsory late-entry investigation. A transfer on 2 November reported/notified on 15 November has a 22 November response deadline. Actual confirmation can arrive immediately; only silence uses assumed receipt. No bank payment is delayed.

**Workspace group:** UX1. A / UX1 approved by owner in v8; integrated with one payment support case.

**UI visibility:** Internal date/provenance rule; no ticket state, pending bar or user action.

**Fields:** Actual transfer date; MCST report recorded_at; First payment notice issued_at; Response deadline; Actual versus assumed receipt basis.

- First notification anchors T+7D → **P7** (Internal seven-day receipt rule).

## C10 — Additional claim window ends

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** Seven calendar days pass from the first issued cancellation notification.

**Checkpoint:** Stop accepting new ordinary additional cancellation claims; preserve timely submitted claims and existing confirmed debts. Record the expiry event and its notice/deadline provenance.

**Exceptions / limits:** Keep Cancelled. Do not generate the contractor no-additional-claims declaration from silence. A live claim continues with Admin; an existing debt continues through payment. A recorded exception requires explicit Admin action.

**Workspace group:** UX11. 

**UI visibility:** Internal cutoff; show Claim window ended within cancellation details, not a new ticket status.

- Timely claim remains open → **C8** (Cancellation claim opens intervention).
- Existing confirmed debt remains due → **P1** (MCST records payment).
- No claim, debt or blocking obligation → **C7** (Cancellation settled).

## F7 — Following up on missing feedback

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** Original ticket status remains unchanged  
**Waiting-on bar:** Pending: CM provides feedback  
**Action:** Give feedback

**Entry trigger:** CM has not submitted the due durability assessment.

**Checkpoint:** Remind CM; persistent nonresponse alerts Admin to follow up. Keep a single linked feedback task and stop reminders after a rated submission or Unable to assess.

**Exceptions / limits:** Approved in v10: notify CM when Feedback becomes due, remind after two business days unanswered, alert Admin after five business days unanswered, then use Admin-set follow-up. Stop after rated submission or Unable to assess. Silence remains missing/unassessed, never positive. Ticket closure is unaffected. See the timing register for date-only/late-entry dispatch details still to finalise.

**Workspace group:** UX12. 

**UI visibility:** Notification loop on the existing Feedback task, not another job phase.

- CM responds → **F2** (CM provides feedback).

## F8 — Negative durability feedback

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** CM submits 1–3 stars and the required observation.

**Checkpoint:** Save this outcome in the same Feedback submission; no extra screen, action or job state.

**Exceptions / limits:** Positive/negative submissions require the observation. Unable to assess contributes no durability rating. The same F6 record completes the task; moderation is separate.

**Workspace group:** UX12. 

**UI visibility:** Recorded outcome of the one Feedback form, not another user step.

- Saved → **F6** (Feedback recorded).

## F9 — Positive durability feedback

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** CM submits 4–5 stars and the required observation.

**Checkpoint:** Save this outcome in the same Feedback submission; no extra screen, action or job state.

**Exceptions / limits:** Positive/negative submissions require the observation. Unable to assess contributes no durability rating. The same F6 record completes the task; moderation is separate.

**Workspace group:** UX12. 

**UI visibility:** Recorded outcome of the one Feedback form, not another user step.

- Saved → **F6** (Feedback recorded).

## F10 — Unable to assess recorded

**Authority:** Confirmed behaviour; copy approval shown per field.

**Ticket label:** None — internal process  
**Waiting-on bar:** None  
**Action:** None — no button

**Entry trigger:** CM selects Unable to assess; no durability points are invented.

**Checkpoint:** Save this outcome in the same Feedback submission; no extra screen, action or job state.

**Exceptions / limits:** Positive/negative submissions require the observation. Unable to assess contributes no durability rating. The same F6 record completes the task; moderation is separate.

**Workspace group:** UX12. 

**UI visibility:** Recorded outcome of the one Feedback form, not another user step.

- Saved → **F6** (Feedback recorded).
