# QuoteFix lifecycle review v8 — confirmed payment rule and remaining decisions

Planning only; no application feature implemented. This revision supersedes the earlier payment hold and late-entry exception. Owner approves A and B in full.

## 1. Confirmed replacement rule

MCST must upload proof of a completed bank transfer before selecting **Payment Sent**. QuoteFix records the transfer date separately from the date MCST reports it, since these actions may occur days apart. QuoteFix then notifies the contractor, who can confirm receipt or report a **Payment Issue**. The seven-calendar-day response period starts when that notification is issued, including for late entries. Confirmation uses the contractor's actual receipt date; silence produces a labelled assumed receipt after seven days. Reminders and Admin follow-up chase missing MCST entries. This keeps the app's records accurate without delaying the bank payment.

### Trigger and record details

| Event | Record / consequence |
| --- | --- |
| MCST uploads proof | Required file must be available before Payment Sent is enabled/accepted. A scheduled/pending payment instruction is not proof of a completed transfer. No routine Admin document-approval stage is added. |
| MCST submits Payment Sent | Amount, actual transfer date, proof reference and named submitter are stored; server reporting timestamp is separate. Partial rationale remains compulsory; Note stays optional. |
| QuoteFix issues notification | Record the first timestamp at which this transfer notice is durably available in Contractor's in-app bell. This is T. It does not depend on when someone opens it. |
| Contractor confirms | Record the actual receipt date and amount, plus when/by whom the confirmation was entered. No seven-day wait is required. |
| Contractor reports Payment Issue | Stop automatic receipt for the disputed transfer; create/reuse the contextual support case. Preserve the record and ask for only missing relevant details. |
| Seven calendar days elapse without response | Internal P7 records **Assumed received** for that transfer, dated at the response deadline. This is not bank-confirmed receipt. |
| Full settlement established | Anchor 30-day Feedback at full actual/assumed settlement; close only if existing work/invoice/no-blocker gates also pass. |

Implementation interpretation: seven calendar days means the same Singapore local time seven dates later; display the exact deadline. A notification creation failure cannot start the response clock. Retries, reminders, additional contractor account recipients and opening the ticket do not restart this transfer's first notification clock. Submit/issue actions and audit records must be reliable and deduplicated. This specifies the event semantics, not a new product approval step.

Preserve per-transfer receipts and partial balances. A dispute prevents deeming that disputed transfer, not unrelated accepted payments. Amount/date corrections retain earlier records and enter support; financial correction effects remain O05/O24, not an automatic clock reset.

### Same late-entry example, now resolved

- **2 November:** MCST completes the bank transfer.
- **15 November:** MCST uploads completed-transfer proof and records Payment Sent; QuoteFix issues the notification.
- **If Contractor confirms actual full receipt on 2 November:** receipt date is 2 November; Feedback is due 2 December.
- **If Contractor remains silent through 22 November:** receipt is labelled assumed on 22 November; Feedback is due 22 December.

The response clock concerns app records. It neither schedules nor holds the bank transfer. QuoteFix fees still trigger at MCST invoice confirmation and retain the approved three-business-day rule.

### Approved notice and actions

**Payment recorded automatically**

No payment response was received by **{deadline}**, so QuoteFix recorded **SGD {amount}** as received on **{date}**, under T+7D. If this is incorrect, select **Payment Issue**.

**Understood / Payment Issue**. Understood dismisses the notice only. The record shows **Assumed received** and its notification/deadline provenance; the notice appears only after an actual deeming event, not merely because a disputed transfer aged seven days.

## 2. A and B — approved and integrated

**A:** ordinary balance/receipt stays in the payment view. Disputed receipt, additional evidence and missing-entry follow-up use one contextual Admin Support case. P8/P9 identify tasks inside that case, not new ticket phases or extra forms. P10 now explains separate timestamps internally; the old late-entry Admin adjudication branch is removed. Late entry alone requires neither a new case nor an Admin approval.

**B:** save the variation decision and audit entry, then route automatically to the applicable valid stage. No mandatory outcome/Next screen. A rejection never authorises the rejected extras, and ordinary rejection alone does not require Admin. If original authorised work cannot continue, use E2 interruption review.

## 3. Confirmed variation audit requirement

The history link opens a permanent record containing:

- Ticket and variation ID/version.
- Decision: approved, rejected or withdrawn.
- Named actor and role.
- Server-recorded decision date/time, displayed in Singapore time.
- Proposed and effective scope, price and timing before/after.
- Rationale entered and relevant supporting evidence.
- Resulting authorised terms, destination stage and next action.

The popup is a summary of that record. A correction adds a dated attributable entry; it does not silently overwrite the original rationale. Visibility follows existing role and confidentiality rules.

**Q21 — one clarification about the latest instruction:** the earlier decision made rejection reasons optional. Persisting any supplied reason is now expressly reaffirmed. Is a nonblank rejection reason also compulsory? **Recommendation:** require a short reason, using choices such as Price, Scope, Timing, Not needed, or Other with explanation; optional additional detail. Keep proposer withdrawal reasons optional. This input requirement remains unresolved pending the owner's answer; audit persistence itself is confirmed.

## 4. Remaining diagram decisions — recommendations only

| ID / area | Concrete context and problem | Recommended rule awaiting approval |
| --- | --- | --- |
| **O24 — Admin backtracking dependencies** | A paid/closed job is returned to work review. Which acceptance, invoice, payment, fees and follow-up facts remain valid? A status edit must not imply money was undone. | Show Admin an impact summary; retain prior payments/financial history and clocks. Invalidate only acceptance/tasks affected by the changed facts. Changed amounts use a separate adjustment. Create only the actual newly required task; no repeated approvals for unchanged facts. No second-admin approval. |
| **O05 — Adjustments and fees** | An authorised correction changes a confirmed SGD 1,000 total to SGD 1,200. Each 4% fee changes from SGD 40 to SGD 48. Reassessing the whole invoice would duplicate fees. | Add only the SGD 8 difference for each fee. Keep the original charges/deadline; give the additional assessment three business days from authorised adjustment confirmation. Reductions offset unpaid fees; if excess fees were already paid, recommend an Admin-recorded refund rather than forcing future-use credit. Exact refund/adjustment workflow needs approval. |
| **O25 — Cancellation without a response** | Contractor never chooses Okay or Admin Intervention. Cancellation is already effective, but silence cannot establish acceptance of no additional claims. | Keep the job Cancelled; do not auto-accept or auto-waive a claim. Recommend reusing a two-business-day reminder/five-business-day Admin attention pattern for the acknowledgment task, with no automatic claim cutoff. This cadence is a proposal for this task, not an extension of approved timing by inference. |
| **O28 — Estate payment due date** | Admin reminders say when to chase an update; they do not establish when MCST's bank payment is due. Without a source, the UI cannot accurately label payment contractually overdue. | Use an explicitly agreed quote/invoice payment due date when provided. Do not introduce a universal MCST payment deadline for launch; where none is recorded, show the existing payment task and follow-up countdown without inventing an overdue date. |

These unresolved policies remain marked for review. They do not reopen A/B, the receipt-clock anchor, proof prerequisite, Start requirements, closure guards or Feedback visibility.

## 5. Operational information and separate work

- **O14:** before launch, identify the Admin owner(s) and coverage hours for urgent coordination. The workflow is approved. Recommendation: display actual coverage and avoid implying unattended 24/7 response.
- **Reputation and integrity/risk:** continue in their existing separate chats. Preserve their latest decisions; no new scoring/flagging approval is requested here.
- Remaining copy refinements are visibly marked as proposals in node details. They do not require another lifecycle stage or backend status.

The ordinary path is settled. Remaining policy questions concern rejection input, financial recovery and unresolved cancellation/payment obligations.
