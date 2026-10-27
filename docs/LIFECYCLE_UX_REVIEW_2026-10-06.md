# QuoteFix lifecycle UX review — 6 October 2026

> Historical review: v8 supersedes the payment hold, rejects the old late-entry Admin-only exception, and approves compulsory transfer proof plus seven calendar days from the first payment notification. A and B are now approved. See [current v8 decisions](LIFECYCLE_REVIEW_2026-10-06_V8.md).

Review v6. This document reviews all 77 current checkpoints. **Only the explicit corrections in section 1 are applied. All consolidations in section 5 are proposals, not changes to the approved workflow.** Internal events and an audit trail must not be mistaken for extra screens, approvals or forms.

## 1. Applied decisions

- **P2:** Confirming payment / Pending: Contractor to verify payment received / Received payment / Payment Issue.
- **P7:** internal processing only. No ticket stage, waiting-on-system bar or action button. When a contractor opens the ticket after a deemed-receipt event has actually occurred, show the assumed-payment notice. A disputed/excluded transfer is not deemed merely because seven days passed.
- **F1:** no early feedback action, including no View feedback date button. Scheduled text can remain; Give feedback appears at F2 when the 30-day period ends. This is the durability follow-up, not inspection feedback.
- **W1:** Start remains unavailable until Completed by date AND time, OR Unable to estimate yet AND a nonblank reason, are supplied. Submission validates the same requirement and records actual commencement only on success. Existing work authorisation remains necessary. W2 displays the saved estimate/reason.
- **Cancellation Okay:** “I accept the cancellation and do not have any additional claims.” Information icon: “For e.g, materials already ordered for the job, subcontractor commitments, labour fee or equipment hire.” Existing confirmed payments remain due; preserve this rule separately from the owner's shorter icon text.
- **Q20 timing:** immediate MCST payment task; one business day without payment/update record alerts Admin and reminds MCST; three business days unresolved alerts assigned Admin again; Admin sets next follow-up time, with missed-update alert. Countdown visible to MCST and Admin.
- **Request Admin Support:** the explicit help action from payment uses the existing support entry point. Whether to consolidate all P3 evidence handling and P8/P9 presentation there is proposed UX1, not yet adopted.

### P7 proposed notice copy

**Payment recorded automatically**

No payment response was received by **{deadline}**, so QuoteFix recorded **SGD {amount}** as received on **{deemed_date}**, under the seven-calendar-day rule. If this is incorrect, select **Payment Issue**.

Suggested controls: **Understood / Payment Issue**. Understood dismisses the notice; it is not confirmation of actual bank receipt. Suggested repeat policy: once per user/deemed-receipt event, with a persistent record thereafter. A partial transfer concerns only that amount; show the real remaining balance. A later dispute preserves the original event and opens the existing correction/support process.

### Countdown copy and behaviour

Always name the event, for example:

- **Admin will be notified in 0d 6h · {date/time SGT}**
- **Next Admin follow-up in 1d 3h · {date/time SGT}**
- **Admin follow-up overdue by 0d 2h**

Do not say “ticket expires in…”: RFQs do not expire and these reminders do not cancel, close or mark payment received. Use the agreed Singapore business-day calendar to determine the next event timestamp, then display actual elapsed time to it in days/hours. Show an exact date/time as well, especially across weekends/holidays. Next follow-up replaces the elapsed countdown when appropriate; an unfinished human task becomes overdue. Reading a ticket or posting a generic comment does not restart clocks. Missing-record reminders stop when the record is supplied; a genuine unpaid balance/dispute keeps its own task. Payment terms and the contractor-to-QuoteFix fee deadline remain separate.

## 2. P3: why those evidence situations existed

They described possible actions within a payment disagreement. They should not imply that every payment needs evidence collection or that each evidence request deserves a ticket phase.

| Situation | Concrete example | Useful action | Recommended home |
| --- | --- | --- | --- |
| Transfer evidence missing | MCST records SGD 1,000 sent, but Contractor cannot identify the payment. The record has no usable reference. | Admin asks MCST for the date/reference or relevant transfer confirmation. | A task inside Admin Support, only when needed. |
| Contractor evidence missing | MCST records SGD 1,000; Contractor says only SGD 800 arrived, without amount/date details. | Admin asks for the credited amount/date and narrowly relevant supporting information if needed. | The same case, not another form in normal payment. |
| Evidence disputed | A transfer is shown as pending/failed or sent to a different recipient, or records disagree about the amount. | Admin reconciles facts, assigns correction or further action, and records what remains unresolved. | The same case; no automatic “resolved” verdict. |

These may be entry errors, allocation confusion or payment problems, not necessarily bank faults. Do not require broad bank statements by default; reuse the invoice, transfer and existing responses and request only missing relevant facts.

**Proposed UX1:** retain uncomplicated payment states. If both agree SGD 600 was paid against SGD 1,000, the bar remains **Pending: MCST to send the remaining payment** for SGD 400. Disputed amounts/receipt move to **Admin Intervention · Payment**, with one case and specific tasks. A task can still say **Pending: MCST supplies the transfer reference** or **Pending: Contractor identifies the amount received**. Admin ownership does not mean every next action belongs to Admin.

## 3. P8/P9: reminders and responses, not necessary new stages

P8 represented “Admin follows up.” P9 represented “MCST answers that follow-up.” The separate boxes exposed administrative detail as though the user had to complete more stages.

**Example:** invoice confirmed; no Payment Sent entry appears. QuoteFix does not know whether MCST has not paid or has paid but forgotten the app. The approved one-day alert prompts Admin to check. MCST replies either “Paid; here is the actual transfer” or “Not yet paid; here is the reason and expected date.”

**Recommendation:** keep the ticket at **Arranging payment**, with countdown and approved notifications. Use existing **Request Admin Support** for user requests and one assigned support case for escalated follow-up. MCST replies within that case or uses the existing Payment Sent form. No separate P8/P9 screen, mandatory progress form, duplicate evidence upload or extra approval. A reply is not payment. All contacts, updates and decisions remain dated in history.

The isolated **Proposal A** diagram illustrates this. Current P8/P9 placement remains marked proposed so that approval of the reminder cadence is not mistaken for approval of these extra screens.

## 4. P10 explained through examples

The phrase “receipt missing” meant a missing **app record**, and was too ambiguous. P10 describes a recordkeeping edge case; it is not a necessary standalone status.

### A. Ordinary entry — already settled policy

MCST transfers SGD 1,000 on **2 November** and records it that day. Contractor receives the notification. Contractor can confirm actual receipt immediately. If there is no response or dispute by **9 November**, the internal seven-day rule records deemed receipt. Feedback is scheduled for **9 December** in that no-response example. On the contractor's next visit after deeming, show the notice.

### B. Actual payment was timely; app entry was late — Q3 remains open

MCST sends money on **2 November**, but first clicks Payment Sent on **15 November** and enters the truthful transfer date. QuoteFix first learns about the transfer on 15 November. It could not have notified Contractor on 2 November; the calculated 9 November deadline is already past.

If Contractor confirms “I received it on 2 November,” use that actual receipt date and ordinary P2/P4 processing. **No additional Admin approval is necessary for a straightforward confirmed receipt.** Feedback falls on 2 December for full actual receipt on 2 November.

The unresolved question is the **silent or disputed** case. Automatically backdating assumed receipt to 9 November would claim the response period ended before the app notified them. The user has rejected giving a fresh seven days from 15 November. Recommended remaining route: handle the unresolved date/receipt through one Admin Support case, with recorded evidence and finding. No invented receipt, new automatic grace period or fake transfer. Q3 must be decided before implementation, including how the unresolved late record is assigned for follow-up.

### C. Contractor received money; MCST has not entered it

Contractor sees money in the bank, but QuoteFix still displays Arranging payment. **Request Admin Support** can ask Admin to prompt MCST to record the real transfer. Then Contractor confirms actual receipt normally. The existing roles and payment form suffice; no P10 ticket stage is necessary. Avoid making Contractor file a “money not received” dispute when the issue is merely a missing entry.

### D. MCST has not paid at all

There is no transfer to enter. Keep **Pending: MCST to send payment to the contractor** and use the approved reminders/Admin follow-up. Request a concrete explanation/expected date where needed. Seven-day receipt deeming does not start from invoice confirmation or from a payment promise.

**Decision needed, Q3:** should the late/silent or contradictory case in B use the existing Admin Support route, while a clear actual-receipt confirmation goes straight through P2/P4? This recommendation remains open. A and D do not need reconfirmation.

## 5. Full pipeline audit — proposals only

Every current node appears in one group below. P5 is already retired and is excluded from the 77 active checkpoints. No proposed fusion below has been applied to current transitions.

| Proposal | Nodes reviewed | Redundancy / cognitive burden | Recommended change | Decision or evidence to preserve |
| --- | --- | --- | --- | --- |
| **UX1 — Payment support** | P1–P4, P6–P10, E3 | Evidence and follow-up subtasks look like new phases. | One ordinary payment view plus one contextual Admin Support case. P4 is a milestone, closure automatic. P7 internal-only correction already applied. | Amounts, partial rationale, per-transfer receipts, actual pending actor, fee/Feedback clocks; late-record rule still Q3. |
| **UX2 — Variation return** | V1–V5 | Approved/rejected outcome -> return stage -> Next repeats navigation without a new decision. | Keep V1 terms and V2 approval; record V3/V4 outcome and automatically apply V5 routing. Show an outcome notice/history link. | All approved return routes, optional reasons, no authority for rejected extras, interruption if unable to continue. Existing Next/labels remain until approved. |
| **UX3 — Zero payable** | P0 | MCST may confirm zero at R4/C6 and then be asked to confirm zero again. | Derive no-payment-due from that one exact confirmation. Only seek a decision if none exists. | Explicit financial outcome, original invoice/settlement and correct zero-work Feedback rules; no fictitious transfer. |
| **UX4 — Admin restoration** | A1–A2 | Open restored stage after the status change is navigation presented as a task. | A1 records the decision and automatically opens the real stage; A2 is an internal routing event. | Reason, actor, old/new states, notifications, retained original events and correct next actor. |
| **UX5 — Dispute case** | D1–D8 | D1 may repeat R2's response; D8 verification then R1 may repeat the same inspection. Many case substeps imply extra screens. | One case workspace. Reuse existing responses, evidence and actual remedy/payment tasks. When R1 verifies a remedy, that same event can satisfy the case requirement. Facilitation and binding verdict are alternative paths where appropriate, not mandatory consecutive approvals. | Both parties' responses where necessary; actual execution and verification; unresolved outcomes remain open. Never resolve merely because Admin intervened. |
| **UX6 — Intake and AI** | I1–I3 | Separate pages for writing, AI processing and reviewing can fragment one draft. | One editor with two inline AI checkpoints and one human Publish action. | Both requested AI assistance moments, original observations, manual fallback, accuracy/privacy preview. No automatic publication. |
| **UX7 — Quotes workspace** | Q1–Q6 | Collection, comparison, Q&A, visit and requote appear serial although they often coexist. | One quote workspace; compare while collection stays open; show only the relevant question/visit/requote task. | Sanitised shared answers, material version changes, valid offers and approved address reveal/site-visit permission. |
| **UX8 — Selection** | S1–S5, M1–M2 | Extra selection pages and repeated confirmation could follow Compare. | Put rationale and confirmation in the comparison flow. Treat S3 rejection and M2 authorisation as outcomes; S4 remains a rule, not a task. | Required above-threshold MCST handover; Yes I know / Back; selection audit; same-ticket rejected nomination and post-authorisation replacement boundary. |
| **UX9 — Start and completion** | W1–W3 | Completion declaration followed by separate invoice upload creates a second contractor visit/task. | Keep W1's newly required estimate. Consider one completion submission containing invoice, optional photos and final declaration. | This changes the current approved irreversible declaration -> upload-next sequence and wording. Explicit approval required. Do not apply silently. |
| **UX10 — Reviews** | R1–R4 | Invoice-only corrections may force another physical-work approval even if nothing changed on site. | Preserve valid work acceptance; send invoice-only correction to the responsible financial review. Repeat inspection only when work/scope or a relevant acceptance fact changed. Put invoice confirmation and payment task on one page, with distinct actions. | MCST exact-invoice confirmation and fee trigger; actual bank transfer still separate; remedied work still reviewed. Inspection feedback policy remains separate. |
| **UX11 — Cancellation** | C1–C4, C6–C9 | Confirmation, cancelled outcome, response and settled outcome can become multiple screens. | One cancellation surface: reason/confirmation, then optional Contractor claim or explicit Okay. Outcomes appear in history; claims use existing case/payment tools. | Immediate stop, explicit no-additional-claims declaration, preserved existing debt, costs/evidence and real settlement decision. |
| **UX12 — Feedback/aftercare** | F1–F6 | Scheduled/submitted/published statuses can clutter the job. | Due-only action is applied. Keep Feedback as its separate task; submission receipt and publication progress do not become ticket phases. Use one linked aftercare case. | Compulsory 30-day task, no defect-free inference from silence, Admin publication/response moderation and separate reputation decisions. |
| **UX13 — QuoteFix fees** | B1–B4 | Four account-obligation events can be mistaken for four job stages. | One fee statement with pending/overdue/settled history; relevant action only. This largely clarifies already-confirmed separation. | Actual Admin fee receipt verification, existing-job access and new-quote restrictions, original due date. |
| **UX14 — Credentials** | G1–G4 | Verification result/reminder/expiry should not appear in every job flow. | One verification record/dashboard with renewal task and grey expired badge; reference it from jobs only when relevant. | Manual Admin approval, mandatory trade eligibility, optional badge distinction and affected-work review. |
| **UX15 — Coordination/interruptions** | U1–U4, E1–E2 | Alert, ownership, calls and ETA can look like a series of new approvals. | One coordination/support workspace with named owner, attempts and next update. E1 reminders run in the background. | Human ownership, unresolved sourcing, distinct interruption assessment, authorisation/verification gates and coverage limitations. |

### Suggested approval order

1. UX1: one payment support case.
2. UX2 + UX4: automatic return after recorded decisions.
3. UX3: remove repeated zero-value confirmation.
4. UX5 + UX10: eliminate repeat response/inspection where the same evidence and decision are still valid.
5. UX6–UX9 and UX11–UX15: consolidate surfaces after the core policy routes are clear. UX9 completion-package fusion needs special care because it changes an approved sequence.

The reusable design rule is: **create a pending action only when a named person must supply new information, make a consequential decision, or perform actual work/payment.** Record system checks, outcomes, notifications and navigation in history or contextual detail. Reusing one valid decision must not erase its evidence or silently cover a changed invoice/scope.

## 6. What remains open

- **Q3:** the late/silent or contradictory receipt scenario above.
- **UX1–UX15:** proposed consolidation choices; no approval inferred from the request to audit.
- Financial adjustment/backtracking dependencies, claim timing where no acceptance occurred, estate payment terms and operational coverage remain in the decision register. They are not prerequisites to today's confirmed copy/visibility changes.
- **Q18 and Q20 are resolved.** Do not ask again for the Start prerequisite or the approved reminder cadence.

## Owner response — v7 supersedes proposal status above

Owner approved all streamlining changes in point 7: UX2–UX15 are now accepted, including the combined completion package. Points 3/4 approve Admin Support presentation, while point 8.1 holds broader payment-consolidation integration until the late-entry explanation; Q3 remains unresolved. The preceding proposal-only audit is retained as the decision history, not the current approval status. P7 T+7D copy/controls and countdown presentation are accepted. See [v7 clarification](LIFECYCLE_REVIEW_2026-10-06_V7.md).
