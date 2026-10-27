# QuoteFix lifecycle review v4 — pipeline and next actor

> Historical review. The owner's subsequent answers supersede its open questions and proposals. Use [v5 review](LIFECYCLE_REVIEW_2026-10-05_V5.md), [current blueprint](TICKET_LIFECYCLE.md) and [current questions](LIFECYCLE_REVIEW_QUESTIONS.md) for the active design.

Updated from the owner's review of v3 on 2 October. Planning only. This document explains the new flow and remaining decisions; the diagrams and memory carry the same rules.

## 1. Q15 — A decision request, now made explicit

The earlier explanation was asking for approval of the return after a variation. The owner understood it as informational, so approval must not be inferred from their copy edits.

**Question:** after a change is approved/rejected/withdrawn, return to the correct saved stage: W1 before start, W2 for feasible ongoing work, R3 for invoice reconciliation, R1 for completion review, E2 if work cannot continue?

**Recommendation:** yes. A rejected extra scope is never authorised; an invoice-stage change must not send the job back to physical work automatically. The actual actor appears in the bar. Await explicit answer; no new feature is implemented.

V5 has owner copy **Resuming works** / **Next**, with concrete context variants. Next navigates to the existing stage and does not approve a change or introduce a new handover. V3/V4 are outcome summaries; their generic template phrases resolve to the actual actor/action in live copy.

## 2. S3 versus C1

| | S3: Rejected Contractor | C1: Cancelled before authorisation |
| --- | --- | --- |
| Trigger | MCST selects Reject during review of the CM-selected offer. | CM/MCST deliberately selects Cancel job and supplies a reason. |
| Meaning | That contractor/offer is not approved for this ticket. | The job request is withdrawn/stopped. |
| Example | CM chooses a SGD 5,000 offer above threshold; MCST rejects the choice because its terms are unsuitable. | A duplicate issue was reported, the work is no longer required, or the estate decides not to proceed. |
| Next | Ticket ends under the existing rule; another contractor needs a linked new ticket. | Ticket is cancelled; preserve reason/history. Notify a selected contractor if one exists. |

MCST rejection does not blacklist the contractor or cancel their platform verification. Both paths end the current ticket's ordinary procurement, but record different decisions. After authorisation, cancellation is also immediate through C2/C4; no admin approval is needed.

## 3. Start, completion target and access

After **Start**, show **Completed by: [date] [time]**, e.g. **2 Oct, 3:00 pm**. This records a target in Singapore time, not a claim that work is already complete. Actual start and completion declarations remain separate. Preserve changed target/reason history. A future agreed start displays **Scheduled: Contractor starts on [date/time]** until it is due.

“Name the party who can resolve an access issue” means assign an actionable task, not a generic Access issue label:

- Locked plant room / keys / booking a shutdown -> **Pending: CM arranges site access**.
- Required worker list or contractor documents missing -> **Pending: Contractor provides access details**.
- A genuine estate approval for restricted access -> **Pending: MCST approves the access arrangement**, only if that approval is actually required.

Security staff do not need a new QuoteFix role; the accountable CM can liaise with them offline. Do not automatically escalate every logistical issue to admin.

Q18 remains a small field-policy detail: mandatory target versus a reasoned Unable to estimate yet option. Presence of the requested field is approved; no new blocking gate has been assumed.

## 4. Completion declarations and the CM's issue route

Approved contractor popup:

> Confirm that all work is finished. Once submitted, this completion declaration cannot be undone. Upload the invoice next, and the CM will then inspect the work.

Slide confirmation records contractor's declaration. The contractor cannot undo it; an admin may backtrack workflow using a distinct attributed event, preserving the original declaration.

At **R1**, the **CM** chooses:

- **Approve Works** with checkbox **I agree the works are Complete and Satisfactory** and slide confirmation; or
- **Report an issue**, without ticking that positive checkbox, for defects, incomplete work, scope mismatch or invoice concerns.

Report an issue creates the contractor response/remedy round. Example: the tap still leaks after the contractor says finished. It is separate from **Payment Issue**, which is the contractor's receipt problem.

## 5. Immediate cancellation and optional contractor intervention

**Confirmed:** CM/MCST can cancel active work immediately even after authorisation. No prior admin acceptance/rejection. The cancellation reason is mandatory and visible to the selected contractor.

Proposed confirmation notice:

> Cancelling stops further work immediately. The contractor may still ask for payment for work already completed or costs already incurred, such as materials ordered for this job. Any claim can be reviewed by QuoteFix admin.

Ordinary work/new commitments stop. Preserve necessary documented make-safe actions. The selected contractor sees:

**Cancelled** / **Pending: Contractor reviews the cancellation** / **Okay** or **Admin Intervention**.

Admin Intervention opens an explanation form and permits lodging incurred expenses. Suggested information icon:

> You can request a review if cancellation has left you with completed work, nonreturnable or custom materials, supplier cancellation charges, subcontractor commitments, mobilisation or equipment costs, or an unpaid amount. Explain what happened and attach supporting records where available.

These examples do not mean every claimed cost will be awarded. Reusable materials and mitigation can be considered by admin through evidence; no automatic loss assumption.

After submission:

1. **Admin Intervention — Pending: Admin reviews the contractor cancellation concern.** Keep **Works cancelled** visible.
2. If evidence is needed, assign **Contractor supplies expense evidence**, **CM provides cancellation/site details**, or **MCST supplies payment/approval records**.
3. Admin facilitates or issues a reasoned verdict under approved powers; both parties' evidence and missing evidence remain recorded.
4. A payable outcome goes to **MCST confirms settlement** or explicit **Admin confirmation override**, then **MCST records payment** and **Contractor acknowledges receipt/raises Payment Issue**.
5. Zero-payable/no-remedy outcome can finish after the actual decision and verification. A payable outcome stays open until fulfilled or explicitly unresolved.
6. Return to **Cancelled** once the intervention obligations are resolved. Opening a claim does not restart work; only an explicit admin restoration can do so.

**Q17 still needs definition:** should Okay only acknowledge the cancellation, or be an explicit no-additional-claim agreement? Recommendation: acknowledge the stop, preserving any existing confirmed payable balance. Do not infer a waiver or claim expiry from silence. A claim window, if wanted, must be explicit.

## 6. Admin backtracking

The complete proposed admin permission list is approved, plus status backtracking. No second-admin review. Backtracking records previous/new status, actor/date/time, reason, evidence and resulting next tasks. Original completion, cancellation, approval and financial events remain available.

Examples: **Closed -> CM review**, **Completion review -> Contractor remedy**, **Admin Intervention -> Starting work** when restoration is explicitly authorised. Recompute the actual pending tasks; do not merely change a label and leave stale assignments/timers.

A backtrack does not reverse a bank transfer, erase a confirmed invoice or assess the same fees twice. Financial corrections use attributable adjustments. Exact adjustment deadline/fee effects still need specification.

**Q16:** can admin also reopen quoting/change the selected contractor, despite the earlier linked-new-ticket rule? Recommendation: retain that rule while permitting work/review/settlement backtracking. Await explicit answer.

## 7. Payments and the late-entry example

P1 uses **Payment Sent**, with slide submission. Optional **Note** is for supplementary explanation/reference; structured amount and actual transfer date remain necessary for balances/clocks. Partial-payment rationale remains compulsory. R4 uses **Pending: MCST to confirm invoice is correct**.

Contractor actions: **Received payment** / **Payment Issue**.

Contractor-only footer (grammar corrected from “assume record”):

> Please confirm receipt of payment or report an issue by **{date}**. If there is no response by then, QuoteFix will record **SGD {amount}** as received on that date.

The underlying record still distinguishes confirmed from automatically assumed receipt.

Approved safeguards: per-transfer deeming; partial unpaid balance remains; a disputed transfer stops deeming; full actual/deemed settlement anchors Feedback and may satisfy closure when other gates pass. These are no longer questions.

**Only the late-entry exception is open:**

- MCST makes the bank transfer **2 November**.
- MCST forgets to enter Payment Sent until **15 November**.
- Using transfer date + seven gives a **9 November** deadline—already gone before QuoteFix told the contractor.
- Proposed remedy: preserve transfer date 2 November but give until **22 November**, seven days from the new notification. If still no response, 22 November becomes the deemed-receipt date; actual earlier receipt can still be confirmed with its real date.

Purpose: the app should not consider a contractor unresponsive to a notice that did not yet exist. This is an explicit exception to the ordinary transfer-date rule and awaits Q3 confirmation. QuoteFix fees remain due three business days after invoice confirmation, regardless of this receipt timer.

## 8. MCST authoring and combined selection

“MCST authoring” means **MCST can create and publish a job/RFQ**: describe the fault, add evidence, review AI wording and publish the request. It is the same intake work usually done by CM, available to MCST when needed.

**Select and approve** is accepted. At/below threshold, ordinary final confirmation records the selection and approval together. Above threshold, include this proposed popup:

> **This quotation exceeds the estate threshold.**
> Quotation: **SGD {amount}**. Threshold: **SGD {threshold}**.
> Continuing selects this contractor and authorises the work. The quotation phase will close.

Buttons: **Yes I know** / **Back**. Retain the existing final-selection irreversibility disclosure; Back makes no selection/approval. No second MCST account is needed. Recheck the current quote/version before atomically recording both events.

## 9. Confidential reports, verification and fee restrictions

Support categories and confidentiality accepted. Proposed reporter notice:

> This report is confidential. It will be reviewed by authorised reviewers and will not be shown to the person or organisation you are reporting.

Keep the report, identity and sensitive evidence out of subject-visible notifications, exports, comments and audit views. A reported MCST member must not gain access merely through normal estate permissions. An assigned admin can create a separate appropriately scoped evidence request without exposing the confidential report.

Q9 recommendations accepted: configurable credential prerequisites, company/person distinction, optional badge versus required licence expiry effects, manual offline verification and expiry reminders.

Q14 boundaries accepted: fee restriction blocks new quoting and selection of pre-existing unselected offers; existing selected/authorised jobs continue. Admin-verified full payment lifts only that restriction.

## 10. Q12 and separate discussions

**Q12 is urgent-job coordination.** An urgent RFQ alerts admin; one named admin takes ownership, logs offline contractor contact attempts/ETA and next update. No attendance found means an explicit unresolved task, not successful resolution. This is already approved and is not another approval for CM.

Only operational staffing is missing: who watches the in-app urgent queue, and during which hours. The diagram can remain **Pending: Admin coordinates urgent attendance** without inventing guaranteed coverage.

Reputation is **KIV** in the existing separate chat. New risk/integrity discussion created in this project: **01a0fbec-86d8-7db3-9a71-d18613c0e471**, covering suspicious procurement/transactions, collusion and kickback warning design. No scoring/fraud verdict is implemented in this lifecycle review.

## 11. Audit and review controls

Every variation creation/edit/approval/rejection/withdrawal records named actor/role, server timestamp, relevant effective date, version and before-after values. Optional reasons can be blank without losing the event. Record start/target changes, work claims, reviews, cancellation/response/claims, admin verdicts/backtracking and payment events similarly. Submitted historical records remain inspectable; role-scoped visibility still protects confidential reports.

The reviewer has a Situation selector on nodes with conditional owners. This demonstrates concrete pending lines; the actual app derives the owner from state/assigned tasks. Node comments include the selected situation when exported.
