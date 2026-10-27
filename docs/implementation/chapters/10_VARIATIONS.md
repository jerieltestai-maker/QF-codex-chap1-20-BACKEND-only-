# Chapter 10 — Scope, price and schedule variations

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [09](09_START_PROGRESS_AND_SCHEDULE.md) · Next: [11](11_COMPLETION_AND_INSPECTION.md)

**Dependencies:** 01–09; invoice/support integration 11–14. **Nodes:** V1–V5. **Timers:** T22 for Contractor terms/CM decision, T07 for MCST approval; T11 for actual unresolved support. **Sources:** C41/C74, Q15/UX2, latest mandatory rejection reason.

## 1. User workflow

Either appropriate party may initiate a variation. Contractor confirms the proposed scope, price and timing. The authorised CM/MCST decides that specific version. Approval changes the authorised terms; rejection/withdrawal retains existing terms. A pending variation never authorises extra work.

Use **Modifying job scope**. V1 pending: **Contractor confirms scope, price and timing**; action **Confirm change of terms**. V2 pending names actual CM or MCST, action **Review variation**. V3/V4 outcomes are durable history events; V5 is automatic routing, not three extra screens or a mandatory Next action.

## 2. Fields and required checks

| Item | Requirement |
| --- | --- |
| Proposed scope/change reason | Required E structured description of what changes and why, linked to current authorised version |
| Price impact and new total | Required, including explicit zero change; GST-inclusive payable total consistent with quote/invoice basis |
| Timing impact | Required: unchanged or specific proposed dates/duration/reason, with retained prior target |
| Contractor confirmation | Required on exact proposed terms; records actor/time/version |
| Approver decision | Required explicit approval/rejection on exact version, correct authority/threshold |
| Rejection rationale | **Required:** preset reason or Other with explanation; optional additional note. Earlier optional-only rule is superseded |
| Proposer withdrawal | Explicit withdrawal; explanatory note optional |
| Evidence | Optional unless an actual Admin evidence request requires it; no automatic compulsory photo |
| Snapshot | System stores current authority/total, proposal revisions, actors/reasons/times and applicable warning settings |

CM approves when the revised total is at/below the estate threshold. The owner's 14 October 2026 clarification also permits CM approval within the last MCST-approved monetary limit, including a later increase after a CM-approved reduction. Preserve that limit through CM decisions; above-threshold amounts beyond it require MCST. Reductions are explicitly agreed/logged. Do not make routine changes Admin cases.

Schedule-only changes reuse the same version/decision/audit primitives but show a compact date-and-reason form. They do not alter the Admin-only initial-estimate exception in chapter 09.

## 3. Visibility and next actor

CM/MCST see the current authorised terms, proposed delta/new total, reason, timing and decision authority. Assigned Contractor sees own job/change. Admin can inspect/intervene under existing powers. Other bidding Contractors do not see post-selection private variation prices.

Show the real party owing terms or decision; do not make both CM and MCST approve when only one is required. Notify relevant parties of outcome and link directly to the timestamped audit entry, including rejection rationale. A temporary toast alone is insufficient.

## 4. Resume routing — compulsory decision table

| Context after outcome | Destination | Reason |
| --- | --- | --- |
| Work not started, current work authority remains | W1 Starting work | No implied commencement |
| Work ongoing and feasible/safe under effective terms | W2 Carrying out work | Continue only authorised scope |
| Invoice discrepancy is the outstanding issue | R3 Explaining price change | Reconcile exact approved amount |
| Completion package awaiting valid work review | R1 CM inspection | Retain only applicable acceptance/round |
| Contractor cannot continue existing scope safely/feasibly | E2 Unable to continue work | Admin reviews interruption; no automatic W2 |
| Cancellation/newer decision superseded proposal | Current valid cancellation/phase context | A stale variation cannot restore work |

This table applies to approved AND rejected/withdrawn changes. Rejection does not mean original work is necessarily still possible; feasibility is explicitly checked. Conversely rejection does not automatically cancel an otherwise feasible authorised job.

## 5. Timers and transaction boundaries

Terms confirmation/CM decision: T22 +2 BD actual actor, +5 BD Admin if unanswered. Required MCST approval: T07 same approved sequence; do not create both timers for the same obligation. Response/withdrawal/cancellation/supersession stops obsolete tasks. Routine Admin involvement is not compulsory.

A variation commit checks proposal version, existing authorised terms/threshold and current work context atomically. Save approval/rejection/withdrawal and audit; update authority only for a valid approval. Re-evaluate invoice, completion target, warnings and next task without overwriting previous records.

Scope/price changes after work acceptance can invalidate the affected acceptance; no entire-ticket reset when an unrelated fact changes. A changed already-confirmed invoice goes through separate adjustment support, not direct mutation. Cumulative warning basis remains selected quote under chapter 17.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH10-T01 | Contractor has not confirmed price/timing | Approver cannot approve unspecified terms; next actor Contractor |
| CH10-T02 | At threshold / increased beyond MCST authority | Correct CM/MCST path; no double approval or routine Admin gate |
| CH10-T03 | Rejection has no reason; withdrawal has no note | Rejection refused; withdrawal permitted and audited |
| CH10-T04 | Rejected before Start | Return W1, not W2 |
| CH10-T05 | Rejected change leaves work infeasible | E2 with real Admin task; no automatic continuation |
| CH10-T06 | Approved change while invoice discrepancy/review pending | Correct R3/R1 routing; affected acceptance/version checked |
| CH10-T07 | Approval races new proposal/cancellation | Stale decision cannot approve unseen terms or revive cancelled work |
| CH10-T08 | Optional photo added during variation review | No unnecessary approval conflict when terms unchanged |
| CH10-T09 | User dismisses outcome toast then opens history | Full decision/reason/actor/date/time retained |
| CH10-T10 | Several small price increases | Authorised totals correct; chapter 17 warning evaluates cumulative growth, not only latest delta |

## 7. Completion gate

Deliver all five return contexts, mandatory rejection reason and exact-version audit/authority changes, with tests of both approval and rejection. No separate V3/V4/V5 navigation bureaucracy and no unsafe assumption that Admin involvement resolved the problem.
