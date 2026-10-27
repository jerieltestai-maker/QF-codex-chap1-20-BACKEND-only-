# Chapter 12 — Invoice confirmation, payments, receipts and closure

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [11](11_COMPLETION_AND_INSPECTION.md) · Next: [13](13_QUOTEFIX_BILLING.md)

**Dependencies:** 01–11; billing hook 13, case/settlement integration 14 and Feedback 15 before release. **Nodes:** R4/P0–P4/P6–P10 (P5 deliberately absent). **Timers:** T01/T02, T07 for confirmation, T03 anchor only. **Sources:** C17/C64–C66/C77/C84/C94 and v8–v14.

## 1. Confirm invoice, then record transfer

R4 **Confirming invoice** / **Pending: MCST to confirm invoice is correct** / **Confirm invoice**. Named MCST confirms exactly the reconciled displayed version/amount after valid work acceptance. It freezes that version, assesses the two QuoteFix fees, and creates the payment task. Invoice upload alone does none of this.

P1 **Arranging payment** / **Pending: MCST to send payment to the contractor** / **Payment Sent** with deliberate slide. MCST makes the bank transfer outside QuoteFix, then records it. QuoteFix does not send money or validate a beneficiary account. CM cannot record payment.

## 2. Required payment/receipt information

| Form/record | Required | Optional / system |
| --- | --- | --- |
| Confirm invoice | Current exact invoice version/amount, explicit MCST confirmation | Server actor/time and fee source IDs |
| Payment Sent | Ready proof of a completed bank transfer, amount, actual transfer date, current payable context, slide | Note/reference/details optional; reference must not become mandatory by accident |
| Partial payment | Above fields AND rationale explaining shortfall | Contractor sees rationale and remaining balance |
| Received payment | Exact transfer/amount and actual receipt date; explicit Contractor confirmation | Preserve date-only precision; server recording time separate |
| Payment Issue | Relevant transfer/balance context and issue explanation (E form) | Evidence if available; inability to supply proof does not prevent opening support |
| Missing payment progress reply | Actual unpaid/paid-not-yet-recorded explanation | Expected payment/update date only if known; no forced bank-payment deadline |
| Transfer/notice metadata | System report time and first-issued notice time | Distinct from actual bank transfer date |

Only MCST/Admin see payment-follow-up countdown. Assigned Contractor sees its amount, permitted proof/context, partial-payment rationale and receipt deadline. CM may see permitted job/payment progress but has no recording permission and no QuoteFix fee view.

## 3. Payment timers and copy

| Trigger | Wait | Action / recipient |
| --- | --- | --- |
| MCST invoice confirmation | Immediate T01 | MCST payment task with approved paperwork links |
| No payment/meaningful progress record | +1 BD | Remind MCST and alert Admin; countdown names follow-up |
| Payment unresolved | +3 BD | Admin attention again; preserve remaining balance; then Admin-set T11 |
| First durable receipt notice for each transfer | T02 +7 CD | Contractor responds or eligible unanswered transfer becomes labelled Assumed received |
| Actual receipt/Payment Issue before assumption | Immediately | Record actual receipt or stop deeming for relevant transfer; preserve partial balance |
| Receipt assumption applied internally | At deadline | No P7 user stage; subsequent Contractor visit shows approved popup |

Approved countdowns:
- MCST: **QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.**
- Admin: **Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.**

P2 **Confirming payment** / **Pending: Contractor to verify payment received** / **Received payment / Payment Issue**.

Contractor-only footer, with the owner's conflicting “assume record” wording grammatically clarified as proposed copy: **Please confirm receipt of payment or report a Payment Issue by {date}. If there is no response by then, QuoteFix will record SGD {amount} as assumed received on that date.**

Approved fallback popup: **Payment recorded automatically. No payment response was received by {deadline}, so QuoteFix recorded SGD {amount} as received on {date}, under T+7D. If this is incorrect, select Payment Issue.** Buttons **Understood / Payment Issue**. Underlying record remains explicitly Assumed received.

## 4. Late entries, partials and support

Store actual transfer date, server report time and first issued notice independently. Transfer 2 Nov, recorded/notified 12 Nov 10:00 -> response deadline 19 Nov 10:00. Contractor may immediately confirm actual 2 Nov receipt; silence creates assumed 19 Nov receipt. This does not postpone the bank transfer. Reminders/Admin chase missing MCST entries; no fabricated backdated silence.

Each transfer has its own window. Partial transfers do not settle the whole invoice; sum valid allocations/receipt facts without duplicate counting. P3 **Unresolved payment** / **Pending: MCST to send the remaining payment** when balance is unsent / **Review payment discrepancy**. The panel shows confirmed total, transfers, received/assumed/disputed amounts, balance, rationale and real outstanding actor/actions.

Evidence missing/disputed/late-record follow-up uses contextual Admin Support tasks (P8/P9), not extra ticket stages. P10 is stored date logic, not an Admin gate imposed on every late entry. Contractor can confirm receipt immediately. A later Payment Issue after assumption opens correction/support without deleting history or making another receipt.

## 5. Closure and zero payable

System automatically closes ordinary jobs on the relevant event when accepted work, exact confirmed invoice, full actual/assumed settlement and no blocking case/obligation remain. Re-evaluate on receipt, valid case resolution or last required gate. No close button, P5 Finishing up task or repeated work approval. Due Feedback and Contractor QuoteFix fees do not block closure.

A confirmed zero invoice/settlement needs no fictitious transfer or second confirmation; derive P0 internally and apply valid performed-work Feedback rule. Cancelled jobs stay Cancelled even after settlement; chapter 14 owns that outcome. A later issue uses linked aftercare/support, not routine reopening of quoting.

## 6. API/transaction and audit

Commands: confirm invoice, record transfer, confirm receipt, report issue, respond payment progress and explicit Admin correction. Lock/version-check relevant invoice/transfer; unique source keys prevent duplicate assessment/receipt. A new client key can still describe a duplicate bank transfer: show possible duplication from evidence/reference/context for review, without merging legitimate same-amount instalments blindly.

Payment Issue racing assumption: first committed guarded transition governs; issue first blocks assumption, assumption first remains historical and later issue opens reconciliation. Original fee trigger remains invoice confirmation in both cases. Supporting paperwork and current balance must refresh after corrections; no client timestamp chooses the winner.

## 7. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH12-T01 | CM or stale MCST confirms/records payment | CM denied; stale amount/version requires review |
| CH12-T02 | Payment Sent without ready completed-transfer proof | Refused; upload-only/provisional bank instruction insufficient |
| CH12-T03 | Partial payment without rationale then valid rationale | Conditional field enforced; Contractor sees reason and accurate remaining balance |
| CH12-T04 | Transfer precedes report/notice by many days | Seven days from first issued notice; immediate actual-date confirmation allowed |
| CH12-T05 | Reminder/read/retry/new device | No reset of first-issued receipt deadline |
| CH12-T06 | Two instalments, one disputed and one silent | Per-transfer results; disputed one not deemed; total/remaining balance correct |
| CH12-T07 | Assumption worker races Payment Issue/actual receipt | One consistent receipt result, no double-count; post-assumption issue can still be raised |
| CH12-T08 | Response lost after Payment Sent | One transfer/notice/anchor via same-operation recovery |
| CH12-T09 | Full settlement with case unresolved, then case resolved | No premature closure; closes automatically on final valid gate |
| CH12-T10 | Zero payable / cancelled settlement / late aftercare | No fake transfer, duplicate confirmation or wrongful Closed state |
| CH12-T11 | MCST progress reply says awaiting paperwork | No payment recorded; no erased balance/chase; dated follow-up remains |
| CH12-T12 | Contractor opens after T+7 fallback | Popup and labelled assumed record; no separate internal-process page |

## 8. Completion gate

Deliver exact invoice/payment/receipt/balance model, approved clocks and automatic closure without extra bureaucracy. Integrate fees, cancellation settlement and Feedback anchors before any real-money pilot; no claim that displaying proof verifies money in a bank account.
