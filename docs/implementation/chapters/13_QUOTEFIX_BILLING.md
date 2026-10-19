# Chapter 13 — Contractor-to-QuoteFix fees, reconciliation and restrictions

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [12](12_PAYMENTS_AND_CLOSURE.md) · Next: [14](14_CANCELLATION_AND_ADMIN_SUPPORT.md)

**Dependencies:** 01–04, 05/08 eligibility, 12 invoice confirmation. **Nodes:** B1–B4. **Timers:** T05/T06, T18/T11 for Admin verification/collections. **Sources:** C09/C48/C70, O05 resolved v10, O37-C resolved 18 October 2026. Inherits [cross-cutting rules](../CROSS_CUTTING_RULES.md).

## 1. Separate account surface and exact charging rule

One Contractor account fee statement/history, not a ticket phase or CM/MCST line item. Contractor pays **4% platform fee plus 4% lead fee**, each on the full MCST-confirmed payable invoice/settlement total including approved billables/GST/variations. Confirmation assesses fees; due **three business days** later. Contractor actual/assumed receipt does not trigger or delay them.

Invoice SGD 1,200 -> SGD 48 + SGD 48, even if MCST transferred only SGD 600. Same confirmation cannot assess again through retry, aftercare or status backtrack. Zero payable creates no positive fee/collection obligation.

## 2. Fields and authority

| Record/action | Required | Audience |
| --- | --- | --- |
| Assessment | Source confirmation/version, full basis, rate/component, calculation/rounding version, amount and due time | Contractor organisation and Admin only |
| Contractor fee-payment report | Claimed amount/date and evidence/context (E form) | Own account/Admin; submission is not verified collection |
| Admin verification | Evidence check, amount/date, allocation, named decision | Statement updated; private findings restricted |
| Adjustment | Authorised corrected basis, reason, original links, incremental debit/credit | Restricted account audience |
| Refund execution | Actual amount/date/reference/evidence and Admin record | Approved credit alone is not refunded |
| Restriction | Specific cause/source/effective time/resolution | Contractor notice; estate gets permitted offer unavailability without private billing data |

G08/O37-C resolved by the owner's direct answer on 18 October 2026: independently round each 4% component half-up to the nearest SGD cent. Do not combine into 8% if that changes cents. Local construction/evidence is recorded in [the Chapters 13–14 build](../CHAPTERS_13_14_BUILD.md).

## 3. Adjustment examples and deadlines

| Scenario | Correct result |
| --- | --- |
| Original 1,000 confirmed | 40 + 40 = 80, original +3 BD due |
| Corrected to 1,200; original 80 paid | Total 48 + 48 = 96; only additional 8 + 8 = 16 remains. Mathematical differences, not a surcharge |
| Corrected to 1,200; original 80 unpaid | Preserve original 80/deadline; new 16 due +3 BD after authorised adjustment confirmation |
| Reduced basis with unpaid balance | Offset/reduce applicable unpaid liabilities; retain ledger/history |
| Reduced basis after excess paid | Credit/refund obligation; Admin records actual execution. No invented fixed refund turnaround |

No additional percentage, minimum fee, late penalty or flat charge. An adjustment does not restart every original deadline.

## 4. Timers, restrictions and next actor

T05: original fees overdue after three Singapore business days from invoice/settlement confirmation, skip trigger date, cutoff 23:59 SGT. T06: only the newly assessed unpaid difference gets its own +3 BD. **Fees due** countdown belongs in Contractor account/Admin collection view, never the CM/MCST ticket.

Overdue unpaid fees restrict new quoting and selection of existing unselected offers. Already selected/authorised jobs continue; retain work/payment/claim access. No blanket account lockout. Verified full payment lifts only fee restriction; credential/other restrictions remain.

Admin evidence/reconciliation/refund work enters T18 (+1 BD unacknowledged) then T11 dated follow-up. Prioritize proof affecting a restriction. An Admin verification backlog is not proof of Contractor nonpayment; preserve the approved verified-payment rule without inventing a grace period. Extra advance reminders remain O30.

Fees never block job closure or start Feedback.

## 5. Ledger/API and audit

Unique assessment per source confirmation/component. Immutable liabilities/credits/verified collections/allocations/refunds derive the current balance. Versioned commands record Admin verification, authorised adjustment and actual refund. No generic edit-total/status endpoint.

Billing events stay out of estate-facing audit exports, bells, search and ticket totals. Admin can trace source confirmation internally. A payment-proof upload is not money verified received.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH13-T01 | Invoice 1,200, MCST paid only 600 | Exactly 48 + 48 at confirmation; correct +3 BD due |
| CH13-T02 | Duplicate confirmation/event replay | One assessment each; no aftercare/backtrack duplication |
| CH13-T03 | 1,000 -> 1,200 with original paid/unpaid | Total 96; incremental 16; original deadline preserved |
| CH13-T04 | Downward correction after payment | Correct refund obligation; no fictitious execution |
| CH13-T05 | Overdue fees with authorised job and unselected offer | Existing job completable; new quote/unselected selection restricted |
| CH13-T06 | Fee proof uploaded, Admin has not checked | Evidence task, not automatic paid or proven nonpayment |
| CH13-T07 | Fee paid while credential invalid | Only fee restriction lifted |
| CH13-T08 | CM/MCST requests account/bell/export data | No fee/balance leak |
| CH13-T09 | Fractional-cent basis | Matches the owner's 18 October independent half-up-cent rule, including zero/small/maximum exact amounts |
| CH13-T10 | Fee unpaid when ordinary closure gates pass | Job closure/Feedback independent |

## 7. Completion gate

G08 is resolved; prove ledger, race, visibility and adjustment tests with database constraints. Deliver account statement and Admin collection workflow; do not insert billing steps into tickets.
