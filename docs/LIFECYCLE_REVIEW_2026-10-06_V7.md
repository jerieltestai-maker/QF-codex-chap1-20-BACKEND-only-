# QuoteFix lifecycle v7 — late payment entries and simplifications A/B

> Historical review: v8 supersedes the payment hold, rejects the old late-entry Admin-only exception, and approves compulsory transfer proof plus seven calendar days from the first payment notification. A and B are now approved. See [current v8 decisions](LIFECYCLE_REVIEW_2026-10-06_V8.md).

Planning only. No application feature implemented. This records the owner's response to v6, including the instruction to explain point 5 before proceeding with the payment-consolidation decision.

## 1. Recorded decisions

- Approved notice: **Payment recorded automatically** — “No payment response was received by **{deadline}**, so QuoteFix recorded **SGD {amount}** as received on **{date}**, under T+7D. If this is incorrect, select **Payment Issue**.” Controls: **Understood / Payment Issue**. Understood dismisses the notice; it does not assert actual bank receipt. Existing exclusions, per-transfer amount, durable history and due-only Feedback action remain.
- Countdown display and event wording approved. Existing immediate/one-business-day/three-business-day/Admin-follow-up cadence remains.
- All streamlining proposals in point 7 approved: UX2–UX15, including one completion/invoice package. The old “Upload the invoice next” sequence is superseded. Proposed replacement final sentence: **Your invoice will be submitted with it, and the CM will then inspect the work.** No separate decision on minor new copy is inferred.
- Points 3/4 approve evidence and payment-follow-up presentation in Admin Support. Point 8.1 also says **wait first, answer 5 properly**. Broader UX1 integration is therefore held while this explanation is reviewed. Approval of presentation does not settle Q3's late-record rule.
- Reputation decisions and financial adjustment/backtracking questions remain in their existing records.

## 2. Why 9 November can precede the notification

The example models a person forgetting an app update. It is not the expected normal flow.

| Date | What happened in the bank / real world | What QuoteFix knows |
| --- | --- | --- |
| 2 November | MCST sends SGD 1,000 externally, but does not click Payment Sent in QuoteFix. | No transfer record. The ticket still asks MCST to send/record payment. |
| 9 November | Seven calendar days have passed since the claimed transfer date. | Still no transfer record; QuoteFix cannot yet identify this transfer or notify Contractor about it. No deemed-receipt event should be invented. |
| 15 November | MCST finally clicks Payment Sent and truthfully enters 2 November as the transfer date. | The entry is recorded now. QuoteFix can notify Contractor now. Transfer date + seven days calculates a date already past. |

There is no bank integration in the approved launch scope. Reminders and Admin follow-up reduce delayed entries but cannot guarantee that a person updates the app. Store **transfer date** separately from **recorded at** and **notification created at**; do not falsify the bank date to match the entry date.

The problem is a missing app response window. It is not a proposed delay in paying or a reason to hold money. If money reached the contractor on 2 November, it reached them then regardless of the app entry. The seven-day rule affects QuoteFix's receipt record and Feedback clock. QuoteFix fees remain triggered at invoice confirmation.

## 3. Specific recommendation — still Q3, not approved

1. When this late transfer is entered, notify Contractor immediately with **Received payment / Payment Issue**. Do not start another seven-day waiting period and do not automatically backdate deemed receipt.
2. Permit immediate actual receipt confirmation through P2/P4. Ask for the actual receipt date already supported by the payment model. No extra Admin approval is needed for a straightforward confirmation.
3. If the receipt remains unconfirmed at entry, flag the existing payment support case for same-day Admin attention. Use one case; add the transfer and existing records rather than requesting a duplicate upload. This is a proposed operational assignment, not a guarantee that a human resolves it that day. A later contractor confirmation satisfies the corresponding task so Admin does not chase it redundantly.
4. Admin checks the specific uncertainty: actual credit, failed/pending transfer, wrong account, amount/date mismatch, or allocation to the wrong invoice. A sending instruction alone need not establish receipt. Use relevant evidence and a reasoned finding; an Admin verdict does not itself move money.
5. If actual full receipt and its date are established, record that date, provenance and Admin reason. Example: receipt on 2 November gives Feedback on 2 December, even if the app catches up on 15 November. If that Feedback date is already past, show the due task now while preserving the original anchor.
6. If receipt/date remains unestablished, leave the case unresolved with the actual next actor and Admin follow-up. Do not invent receipt or start the full-settlement Feedback clock. If money is still owed, MCST's payment task remains due under its existing terms.

**Decision still needed:** approve this handling for late-entry, unconfirmed receipt. A timely record's existing T+7D rule is already confirmed. A proven actual receipt can already proceed normally. This recommendation adds neither a bank-payment extension nor a fresh response grace period. The precise handling of intermediate late entries/notification failures should follow the same explicitly agreed notice boundary; no new timer is inferred in this revision.

## 4. A and B address different areas

The former labels “Proposal A” and “Proposal B” could imply competing alternatives. Use **A: Payment support** and **B: Variation return**. Both fit the same application.

| | A — Payment support | B — Variation return |
| --- | --- | --- |
| Problem | P3 evidence situations and P8/P9 follow-up appear as separate payment phases/forms. | V3/V4 outcome, V5 returning and Next repeat navigation after the decision is already made. |
| Normal experience | MCST sends/records; Contractor confirms; uncomplicated unpaid balance stays with MCST. | Approver decides variation; the app records the result and displays the real current stage immediately. |
| Exception experience | One contextual Admin Support case carries the reason, existing records, requested evidence and named next action. | If the authorised work cannot proceed, show the real interruption task instead of blindly returning to W2. |
| Kept facts | Transfer amount/date, actual versus deemed receipt, balance, disputes, reminder dates, evidence and audit. | Original terms, effective approved change, optional rejection/withdrawal reason, actor/time and work-authorisation limits. |
| Backend work | Reuse the shared support-case/task model; link payments and avoid duplicate case/task creation. Payment maths and clocks still exist. | One deterministic return decision after saving the variation outcome, using current valid work/review facts. No V3/V4/V5 user-status chain. |
| Relative complexity | Broader because it joins payment, support, deadlines and role-specific tasks. Simpler than separate payment-specific case systems. | Smaller incremental change, but still requires validation of the current stage, authorisation and concurrent changes. |
| UX benefit | Clearer payment overview and one place to resolve an actual problem. | Immediate reduction in clicks and ambiguity about who acts next. |
| UX risk and mitigation | A generic support case could hide the task: keep the actual amount/next actor/action on the ticket, and prefill context. | A sudden return could hide the outcome: show a short outcome notice with a history link and the destination pending bar. |
| Current authority | Presentation approved; broader route integration held under point 8.1. Q3 unresolved. | Approved through point 7; applied to the planning model. |

### Examples

**A:** confirmed invoice SGD 1,000, agreed receipt SGD 600. Display **Pending: MCST to send the remaining payment — SGD 400**. No investigation is necessary. If MCST instead records SGD 1,000 and Contractor reports only SGD 800, one case asks for the missing facts. The next action might be **Pending: MCST supplies the transfer reference**, not a vague “Admin is handling it.” Existing bank/payment actions are reused.

**B:** a Contractor asks for SGD 200 extra while performing the job. If the authorised approver rejects the variation, record the decision and optional reason. If the original authorised job can continue, return directly to **Carrying out work / Pending: Contractor to complete the work**. If it cannot, show **Unable to continue work / Pending: Admin to review interruption of works**. Rejection alone never requires Admin intervention. An invoice-only variation returns to reconciliation, not active physical work.

### Recommendation for implementation

Use both. B is the smaller incremental implementation; it is not a replacement for A. Reuse one support-case mechanism for A and other support needs. Keep meaningful job stages separate from payment records, variation decisions and task history. Do not turn every diagram checkpoint into a database job status. These are design estimates based on this blueprint, not a measured build-time commitment or a final database design.

For both, validate the current version when saving a decision. In particular, a variation result must not restore work after a concurrent cancellation. Audit the decision and resulting task/state changes together. The deferred financial effects of Admin backtracking remain open.

## 5. How the approved streamlining appears in the review

Stable node IDs remain for comments and history. V3–V5, A2 and P0 are marked internal; they no longer ask for navigation or repeated confirmation. W3 is the completion form inside W2, with invoice and declaration submitted together. Invoice-only corrections preserve valid work acceptance; one valid inspection can fulfil both work and case requirements. Other approved groups share their named workspace while retaining real decisions and tasks.

Detailed diagrams still expose internal checkpoints for blueprint review. A box in these diagrams does not necessarily represent a visible ticket state, separate page, extra click or separate database status. Node details explicitly identify that distinction.
