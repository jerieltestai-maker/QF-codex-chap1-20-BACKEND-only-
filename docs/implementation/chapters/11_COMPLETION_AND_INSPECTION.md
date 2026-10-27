# Chapter 11 — Completion package, repeated inspections and invoice reconciliation

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [10](10_VARIATIONS.md) · Next: [12](12_PAYMENTS_AND_CLOSURE.md)

**Dependencies:** 01–10; support in 14, inspection-feedback rubric in 16. **Nodes:** W3/R1/R2/R3. **Timers:** T08, T09/T22 as applicable. **Sources:** C40/C42/C47/C73, UX9, v10 repeat-inspection rule.

## 1. Combined completion package

From **Work is complete**, open one form for required invoice and irreversible completion declaration/slide. Invoice upload and declaration are submitted together before CM review; no extra “completion submitted, now upload invoice” journey. **Preparing Proof & Payment** may describe the preparation context, not a compulsory separate screen.

The earlier approved popup said Upload the invoice next; UX9 superseded that sequence. Proposed replacement copy: **Confirm that all work is finished and the invoice is attached. Once submitted, this completion declaration cannot be undone. The CM will then inspect the work.** This is a copy proposal, not a newly approved wording.

## 2. Required/optional fields and visibility

| Actor/form | Required | Optional / boundary |
| --- | --- | --- |
| Contractor completion | Ready invoice asset/version, declared amount/details needed for reconciliation, positive completion declaration and deliberate final slide | Completion photos optional and absent from primary requirements; no photo-based block |
| CM inspection | Exact current submission/round, scope/checklist review, explicit satisfactory/unsatisfactory outcome | Supporting photos/notes only as needed |
| Approve Works | **I agree the works are Complete and Satisfactory** checkbox above **Approve Works**, deliberate slide | Checkbox initially unchecked; no automatic acceptance |
| Unsatisfactory work | Specific incomplete/defective scope/findings (E structured checklist plus explanation) | Evidence optional unless specifically requested; no positive declaration required |
| Contractor remedy response | Response to originating findings; submission of corrected work when ready | Optional updates/evidence; further unresolved concerns may request Admin Support |
| Invoice difference | Exact difference/current approved basis; Contractor explanation/corrected version | Opening View Reason is not resolution |
| Inspection reputation questionnaire | Separate short rating/recommendation evidence per chapter 16 | G10 five-question rubric is approved and implemented in chapter 16; do not equate rating with operational acceptance |

Assigned Contractor and authorised estate reviewers see relevant completion/invoice/inspection data. No rival Contractor access. Admin sees review/evidence as permitted; private moderation reasons and fee records remain separate.

## 3. Pipeline and inspection numbering

Completion submit -> immutable declaration/package -> R1 **CM's Inspecting of work**, **Pending: CM reviews the work and invoice**. CM may **Approve Works** or **Unsatisfactory work**.

Unsatisfactory -> R2 **Addressing issues**, **Pending: Contractor responds / to remedy the issue**, **Respond / Submit remedy**. Contractor remedies -> new submitted round -> CM must inspect again. Initial heading **Inspection**; from n=2 show **Inspection [2nd]**, **Inspection [3rd]**, etc. Link each resubmission to its originating failed findings; don't detach reasons from their round.

Example: 4 November round 1 failed; corrected work submitted 8 November is round 2 and must be inspected. D8 may reuse only successful acceptance of that SAME corrected round for its support obligation. It cannot reuse failed round 1, an older repair, or an acceptance invalidated by later physical changes. It also must not demand a third inspection merely to close the case after round 2 already passed.

## 4. Invoice reconciliation and next actor

Compare invoice amount to selected authorised quote plus effective approved variations. Any difference blocks financial confirmation and notifies MCST AND Admin. Show R3 **Explaining price change**, **Pending: Contractor explains or corrects the invoice**, **View Reason**.

View Reason reveals authorised baseline, invoice amount/delta, relevant variations, Contractor explanation and correction controls for Contractor; authorised reviewers see appropriate read-only context/decision route. Opening it never approves an increase. Added charges require variation/authority; reductions are explicitly recorded/agreed. Every invoice revision immutable.

An invoice-only correction can reuse still-valid work acceptance when physical work/scope did not change. Physical remedy or changed scope cannot. After valid work acceptance and reconciled invoice -> chapter 12 MCST exact-version confirmation. Known blockers prevent progression; no duplicate final inspection/Finishing up checkpoint.

## 5. Timers and audit

Each initial/corrected package becoming inspectable creates a **fresh T08**: CM +2 BD reminder, Admin +5 BD if unanswered. Outcome stops that round's timer. Remedy response uses T09 or an Admin-dated execution task; invoice correction uses T22. Responding “will repair” ends neither the actual repair obligation nor inspection need.

Audit declaration, invoice version, round number, findings, response, physical resubmission, outcome/actor/time, discrepancy and any invalidation. Contractor cannot undo its declaration; Admin backtracking preserves it and records the corrective action.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH11-T01 | Completion without invoice / without photos | No invoice -> refused; invoice + declaration without photos -> permitted |
| CH11-T02 | File upload succeeds but user never slides submit | No completion declaration/CM inspection task |
| CH11-T03 | Unsatisfactory work with positive checkbox unchecked | Valid negative route; no forced satisfactory declaration |
| CH11-T04 | Failed 4 Nov inspection; repaired 8 Nov | New round 2 inspection and fresh T08; old failed result cannot satisfy it |
| CH11-T05 | Round 2 already accepted; support verification runs | Reuse exact successful acceptance, no duplicate inspection |
| CH11-T06 | Invoice-only correction versus new physical work | Acceptance retained only for unchanged accepted work; new physical work reviewed again |
| CH11-T07 | Invoice differs by any amount | Confirmation blocked; MCST/Admin notified; explanation view alone does not unblock |
| CH11-T08 | Contractor double-submits completion after timeout | One declaration/package/round; original immutable |
| CH11-T09 | New remedy arrives while CM submits old review | Stale review refused; current round and originating findings shown |
| CH11-T10 | Review result recorded but optional rating unfinished | No invented score; operational and rating facts remain separate per gated questionnaire policy |

## 7. Completion gate

Deliver combined completion form, repeat rounds, exact invoice reconciliation, role-specific evidence and timers. The separately submitted inspection-feedback questionnaire is implemented under the approved G10/chapter 16 rules; it never gates operational acceptance.
