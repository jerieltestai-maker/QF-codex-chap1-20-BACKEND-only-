# QuoteFix lifecycle review v5 — 5 October 2026

> Historical review. Use [v6 UX review and examples](LIFECYCLE_UX_REVIEW_2026-10-06.md), the current blueprint and current questions for the latest decisions. Q18 and Q20 are now resolved; P7 visibility, F1 action and cancellation copy have changed.

Applies the owner's v4 comments and follow-up approving same-ticket reselection/reopening after MCST rejection before authorisation. Planning only; no webapp feature built. [Blueprint](TICKET_LIFECYCLE.md) · [Questions](LIFECYCLE_REVIEW_QUESTIONS.md).

## 1. Diagram changes and reading order

Start with **8 Payment and closure**, then **4c After MCST rejects a selection**, **8c Missing payment updates**, **8d Late payment records**, and **9 Immediate cancellation**. Section 6b includes completion-review return as well as start/work/invoice/interruption. Click a node for label, pending actor, action, trigger and limits; select a Situation where the actor depends on context. Comments retain their selected situation.

Green/C means confirmed behaviour; amber/P means proposed mechanics; red/? means an unresolved decision. Exact approved copy is marked separately. Diagrams include milestones, navigation and side tasks, not one backend status per box.

## 2. P5 does not need to be a user step

The earlier P5 mixed an automatic closure check with a new-looking remedy task. It is retired from the visible flow.

Normal path: **CM approves work -> MCST confirms invoice -> MCST sends payment -> receipt is confirmed or deemed under the agreed rule -> Closed automatically**. Payment received remains a milestone without another approval button.

Unsatisfactory work is handled earlier: **R1 Unsatisfactory work -> R2 Contractor responds/remedies -> R1 CM inspects again**. Repeat until accepted or escalated. Payment does not create a new inspection.

Retain the agreed conditions: accepted work, confirmed invoice, full settled payment and no blocking case. A genuine case opened before closure retains its actual next actor; resolving it rechecks closure. There is no generic Finishing up task. Feedback and QuoteFix fees do not block closure. Cancellation settlement returns to Cancelled, not ordinary Closed.

## 3. S3, C1, job, ticket and RFQ

- **Job:** the maintenance work the estate needs done.
- **Ticket:** the QuoteFix record/ID for that job.
- **RFQ:** the brief and quotation process within that record.

These do not need three workspaces. Use Job in normal UI and Ticket ID for references.

**S3 rejects a nominee; C1 cancels the maintenance request.** The old terminal S3 rule came from the earlier irreversible-selection decision. The new decision supersedes it before work authorisation.

After MCST rejection, retain the ticket and history. CM can select another valid quote, or MCST can Select and approve. CM/MCST can explicitly reopen a quotation round, preserving prior versions and comparison snapshots. Never revive expired prices automatically. Quoting stays frozen while another selection awaits approval; the rejected nominee has no work authority.

After authorisation, replacing the contractor still requires a linked new ticket, including Admin intervention. Admin may backtrack work/review/payment stages without replacing historical facts. Q19 is approved; no further decision requested here.

## 4. Copy applied

| Node | Ticket label | Pending | Action |
| --- | --- | --- | --- |
| R3 | Explaining price change | Contractor explains or corrects the invoice | View Reason |
| P1 | Arranging payment | MCST to send payment to the contractor | Payment Sent |
| P3, unsent balance | Unresolved payment | MCST to send the remaining payment | Review payment discrepancy |

P1 retains slide submission and amount/date/partial-rationale rules. P3 names the actual actor for evidence/receipt/dispute tasks. View Reason opens the difference and explanation; Contractor can respond/correct within it. Before a response, show the detected mismatch and explanation pending. Viewing does not unblock the invoice.

R1's alternative is now **Unsatisfactory work**, without the positive declaration. Intake Report an issue, Payment Issue and Request Admin Support retain their meanings.

## 5. Okay on cancellation

Required confirmation: **I accept the cancellation and will make no additional claim arising from it.**

Information icon: **This includes additional claims for materials ordered for this job, supplier cancellation or restocking charges, subcontractor commitments, mobilisation or equipment hire, and work not already agreed for payment. Any payment already confirmed remains due.**

Record actor/time. Remove the routine later additional-claim arrow after Okay. Admin Intervention is the alternative before acceptance for concerns/expenses. Mistaken records can still use Admin Support. Silence is not acceptance; no new claim timeout is invented.

Already-confirmed unpaid money still follows MCST payment and Contractor receipt, with no fresh approval or duplicate fee assessment. Section 9d shows this route; once settled, the outcome remains Cancelled.

## 6. Payment and acknowledgment are separate

In the old example, transfer on **2 November** means money was already sent then. **22 November** was proposed as a response deadline for a record entered on 15 November; it was never a date MCST could wait until before paying. The rejected extension has been removed from the proposed automatic flow.

**Accepted:** in-app Admin alerts to chase missing MCST updates. QuoteFix cannot know an unrecorded bank transfer occurred; it can detect an unresolved task or receive evidence.

**Proposed Q20 timing:**

1. Invoice confirmed: MCST receives Send payment and update this job, with approved invoice, work acceptance and variation/approval history linked.
2. One business day without payment/update record: notify Admin and remind MCST.
3. Three business days unresolved: notify assigned Admin again.
4. Admin records contact, answer and next follow-up time; missed update triggers another alert.

If paid, MCST records actual date/amount. If unpaid, provide reason and expected date; Contractor sees it. A promise is not payment and does not change terms. Stop missing-record reminders once supplied; retain actual balance/receipt tasks. Collect reminders under one task/history to avoid clutter.

**Proposed Q3 late-record route:** notify Contractor immediately and open Admin reconciliation. Contractor can confirm receipt or raise Payment Issue straight away. No fresh seven-day wait. Admin obtains missing evidence and records findings; actual receipt uses the established date. If Contractor stays silent, insufficient evidence leaves the case unresolved rather than automatically backdating receipt. This exception needs approval.

Ordinary timely-record **seven calendar days** fallback remains. **30-day Feedback** starts at full actual/deemed settlement. **QuoteFix fees** still trigger at invoice confirmation, due three business days later. No change authorises delayed contractor payment.

## 7. Approvals and informational items

- Q15 variation routes approved, without routine Admin gate.
- Q16 linked new ticket for replacement after work authorisation approved.
- Q17 no-additional-claim Okay and information icon approved.
- Q19 same-ticket reselection/new round before authorisation approved.
- Confidentiality: **Your report is confidential. It will not be shown to the person or organisation you are reporting.**
- Previous point 9/Q12 is operational information here. Urgent workflow approved; staffing and coverage hours needed before launch, not another feature approval now.

Actual remaining choices: Q20 cadence, Q3 silent late-record evidence/date handling, and Q18 completion-target requiredness when reviewing work. Financial adjustment details remain specification work. Risk and reputation stay in their existing chats; their confirmed decisions are preserved.
