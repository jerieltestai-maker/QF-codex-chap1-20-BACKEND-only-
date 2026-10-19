# Chapter 14 — Cancellation, claims, Admin Support and controlled correction

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [13](13_QUOTEFIX_BILLING.md) · Next: [15](15_FEEDBACK_AND_AFTERCARE.md)

**Dependencies:** 01–04 primitives, 08–13 domain integrations. **Nodes:** C1–C4/C6–C10, D1–D9, E3, A1/A2. **Timers:** T10/T09/T11/T18; execution reuses its domain timer. **Sources:** C21–C25/C43/C45/C68/C75/C76, O24/O25/O32 resolved; O29 KIV.

Local construction and verification are recorded in [the Chapters 13–14 build](../CHAPTERS_13_14_BUILD.md). Verification/access support also has organisation/estate account scope before a job exists; it never invents a job or financial cycle.

## 1. Immediate cancellation and compulsory information

CM/MCST may cancel with required reason before or after authorisation, including selection awaiting MCST approval. Immediate effect; no prior Admin gate. Stop ordinary work/new commitments; necessary documented make-safe actions, evidence and incurred costs remain possible.

Proposed confirmation copy: **Cancelling stops further ordinary work immediately. You may still need to settle completed work or costs the contractor has already committed. The contractor can ask Admin to review a claim; cancellation does not erase an existing amount owed.**

| Action | Required | Optional |
| --- | --- | --- |
| Cancel | Reason, current authority/version, explicit confirmation | Evidence |
| Contractor Okay | **I accept the cancellation and do not have any additional claims.** | Information icon examples |
| Admin Intervention/claim | Concern/claim explanation and actual submission before cutoff | Incurred expenses/items/available evidence; missing proof can be requested, not a ban on requesting help |
| Settlement confirmation | Exact payable amount/version; named MCST or explicit Admin financial override | Evidence/notes |
| Admin verdict/backtrack | Outcome, reason, impact preview, affected versions/evidence, actor/time; next action/date if unresolved | Open findings/conclusion note |

No-additional-claim information icon: **For e.g., materials already ordered for the job, subcontractor commitments, labour fee or equipment hire.** Preserve existing confirmed debts/general support for exceptional errors; no waiver inferred from silence.

## 2. Claim window and visible outcome

First issued cancellation notice to selected Contractor starts **T10 seven calendar days**, not reading it. Show reason, **Okay / Admin Intervention**, exact **Submit claim by** date/time and remaining days/hours.

Contractor +2 BD reminder only while unanswered/in-window. Admin at earlier of +5 BD or cutoff minus 24 hours if still unanswered. Drafting/opening claim is not submission. Timely submitted claims remain reviewable after cutoff, including later evidence. Expiry stops ordinary new additional claims and obsolete reminders, without inventing consent. Okay is explicit acceptance/no further ordinary claims; already confirmed debts survive. No selected Contractor -> no Contractor response timer.

During a claim, show **Admin Intervention** with **Works cancelled**. Resolution returns to **Cancelled**, not Closed or W2. Only explicit feasible Admin restoration resumes authorised work. Replacement after authorisation always needs a linked new ticket.

## 3. Role-sensitive support categories

| Proposed label | Example/requester | Routing/visibility |
| --- | --- | --- |
| Quote or scope | CM/MCST mismatch; Contractor cannot honour terms | Domain evidence/Admin review; no rival-price disclosure |
| Access or interruption | Keys absent, worker details missing, unable to continue | Name CM/Contractor action; Admin coordinates unresolved issue |
| Work quality/remedy | Incomplete work or repeated failure | Reuse inspection findings/rounds, not duplicate case-only checks |
| Invoice/payment | Incorrect amount, missing/partial receipt, proof dispute | Reuse exact invoice/transfer/balance; CM cannot record payment |
| Verification/account | Credential, restriction or member access | Specific Admin decision, separate restriction causes |
| Feedback/track record | Disputed attribution or correction request | Moderation/evidence; no automatic score removal |
| Confidential conduct | Kickback/collusion/CM or Contractor allegation | Admin-first restricted case; named subject excluded; uninvolved MCST only when authorised |
| Cancellation expenses | Materials/labour/subcontractor commitments | Claim/evidence/settlement; examples do not establish entitlement |

Approved notice: **Your report is confidential. It will not be shown to the person or organisation you are reporting.** Apply to case, notices/counts, files, audit fragments, search, AI and export. A reported MCST user is excluded despite ordinary equal-role access.

## 4. Admin evidence and resolution pipeline

1. Support requested -> Admin notified/attention queue -> D2 review of audit/evidence.
2. Admin names evidence needed and actual responding party. D3 submission -> **D2 again**. Party cannot advance to resolution by uploading proof.
3. Admin alone judges sufficiency; missing/contested facts retain dated next action.
4. D9 offline coordination/deconfliction with external document ledger. QuoteFix stores restricted reference/permitted summary, not a detailed in-app negotiation log.
5. Admin issues versioned final resolution D4, or explicit binding decision D5 under approved powers. Record reasons/outcomes/actual remaining obligations.
6. Parties can **Acknowledge resolution**, not reject/counterpropose. Authorised actions proceed alongside acknowledgment collection; silence never becomes acknowledgment.
7. D6 only for actual outstanding execution: repair/payment/refund etc. D7 keeps unresolved actor/date. Verdict is not execution.
8. D8 is internal: reuse valid evidence for the SAME obligation/repair, or route to its missing task. New physical repair -> fresh R1; failed result -> R2; disputed execution -> D2.
9. Resolve case only when applicable obligations verified. Original job/cancellation/aftercare follows its own outcome.

D1 ordinary Contractor response/remedy may resolve concerns through established inspection without requiring an Admin verdict. Do not turn every remedy into litigation or reopen in-app negotiation after final resolution.

## 5. Admin correction/backtracking

Full approved workflow, verification/access, financial and moderation powers; no second-admin review. **Change job status** first previews old/new stage, affected acceptance/approval/task dependencies, balances and clocks. Required reason and attributable event follow.

Preserve original cancellation/completion/approval/payment/fee records. Invalidate only acceptance/tasks affected by changed facts; retain still-valid facts. Money changes require chapter 13's distinct adjustment, not another full assessment. New tasks only for genuinely missing actions. Status edits cannot create fictitious transfers, acknowledgments or repairs.

Settlement normally needs named MCST exact-version confirmation; explicit Admin financial override is distinct. Zero settlement creates no new positive fee/payment. Reuse/adjust existing financial records; no duplicate invoice cycle. Ordinary support opening does not restore work or quoting.

## 6. Timers and unresolved handling

Ordinary evidence/response T09 +2 BD actor/+5 BD Admin unless a specific applicable Admin date exists. Admin T18 +1 BD unacknowledged; acknowledged unresolved cases retain T11. D4 acknowledgments are informational/nonblocking, without an invented chase cadence. Execution uses relevant inspection/payment/remedy timer, not competing support clocks. Archive G15/O29 stays unimplemented.

## 7. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH14-T01 | Cancel before approval/after authority | Immediate with reason; no Admin prerequisite |
| CH14-T02 | Okay without declaration | Refused; proper explicit acceptance logged; existing debts retained |
| CH14-T03 | Delayed/failed cancellation notice | Seven days from first durable issue; reads/retries unchanged |
| CH14-T04 | Timely claim and later proof; draft only at cutoff | Claim continues; draft not submission; no inferred waiver |
| CH14-T05 | +5 BD falls beyond claim cutoff | Admin at earlier cutoff-minus-24h, no extension |
| CH14-T06 | Evidence uploaded in D3 | D2 Admin review only, no automatic D4 |
| CH14-T07 | Party ignores final resolution | Execution proceeds, no fabricated acknowledgment |
| CH14-T08 | New remedy after failed inspection | Fresh R1; same successful corrected round reused only for matching obligation |
| CH14-T09 | Reported subject has MCST access | Excluded on every surface; authorised uninvolved handling preserved |
| CH14-T10 | Backtrack paid/completed/cancelled job | Financial clocks/history preserved; targeted task invalidation |
| CH14-T11 | Zero/already-confirmed settlement | No duplicate confirmation/fees/transfer; Cancelled retained |
| CH14-T12 | Admin contact does not resolve case | Concrete next actor/date; no automatic resolution/archive |
| CH14-T13 | Admin attempts same-ticket Contractor replacement after authority | Linked new ticket required |

## 8. Completion gate

All cancellation/evidence/verdict/execution/adjustment routes must work before pilot. Sensitive allegation vocabulary/publication remain specialist gates; archival remains KIV. No branch can end at a vague “Admin will resolve it.”
