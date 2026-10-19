# Chapter 15 — Thirty-day durability Feedback and aftercare

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [14](14_CANCELLATION_AND_ADMIN_SUPPORT.md) · Next: [16](16_REPUTATION_PASSPORT_AND_AI.md)

**Dependencies:** 01–04, 11–14; publication/scoring 16. **Nodes:** F1/F2/F3/F5–F10. **Timers:** T03/T04/T11. **Sources:** C49/C50/C66, FQ1, v14; [feedback model](../../REPUTATION_FEEDBACK_MODEL.md).

**Local construction — 18 October 2026:** implemented with Chapter 14 cancellation/support integration and Chapter 16 moderation/scoring. See [executed verification and boundaries](../CHAPTERS_15_16_BUILD.md). Late assessable feedback contributes with its actual observation date; first-month fault/callback percentages are explicitly deferred to the Chapter 20 completion checkpoint.

## 1. Purpose and placement

Collect durability evidence 30 days after the applicable full-payment anchor, independently of closure. Separate scheduled/actionable task, not a new job stage. No early/disabled Give feedback button: reveal only when due. Closed ticket remains Closed.

Distinct from the inspection rubric in chapter 16. A low rating is not automatically a repair claim, proven Contractor-caused defect or an adverse score before approved attribution/moderation/model rules apply.

## 2. Anchors and compulsory information

| Item | Required rule |
| --- | --- |
| Payment anchor | Full actual/assumed settlement, not first partial transfer or invoice confirmation |
| Actual receipt | Actual confirmed date/time with preserved precision |
| Assumed full receipt | First-notice +7-CD event completing full settlement |
| Zero/performed cancellation | Approved confirmed zero/performed-work outcome; no fabricated transfer |
| No-work cancellation | No durability Feedback about nonexistent work |
| Assessable Feedback | 1–5 durability stars AND nonblank open observation |
| Negative | 1–3 stars; describe defects/wear/recurrence etc.; examples are guidance, not prefilled findings |
| Positive | 4–5 stars; observation still required, e.g. still working/issue has not returned |
| Unable to assess | Exception with explanation in proposed form; no rating/durability points invented |
| No response | Reminder/escalation, never positive evidence |

Responsible CM/actual inherited-capability actor receives due task. Contractor sees submitted feedback and can reply subject to Admin approval; shared passport publication requires moderation. Private moderation reasons remain restricted.

## 3. Exact timing and examples

| Event | Wait/time | Action |
| --- | --- | --- |
| Applicable full-settlement anchor | T03 +30 CD | Schedule observation; no early action |
| Date-only actual receipt | 09:00 SGT on 30th following calendar date | CM notice and Give feedback |
| Late entry reveals already due | Issue immediately; preserve original due date | Do not backdate CM inaction |
| First actionable notice unanswered | T04 +2 BD | CM reminder |
| Still unanswered | T04 +5 BD | Admin alert, then saved T11 follow-ups |
| Rated submission or Unable to assess | Immediate | Stop obsolete response notices; no closure dependency |

Notice 2 Nov -> assumed full receipt 9 Nov -> Feedback 9 Dec. Actual full receipt 2 Nov -> Feedback 2 Dec. Transfer 2 Nov but notice 15 Nov -> assumed 22 Nov -> Feedback 22 Dec if silent. For date-only actual receipt, dispatch at 09:00. Late-entry response reminders start at first notice.

Corrections retain original anchors/observations and new auditable facts. Recalculate pending tasks as appropriate; do not duplicate a completed assessment or rewrite its actual observation date. Late assessable observations count under the approved Chapter 16 model with their actual observation date; contested durability is omitted from scoring.

## 4. Aftercare request and resolution

Negative Feedback need not request repair. Later faults separately open linked aftercare/Admin Support F3 with original job/work, concern and requested help, optional evidence. A 1–3-star rating alone does not prove liability.

Admin evidence/offline coordination/resolution uses chapter 14. A physical remedy needs a new inspection round with originating findings, numbered from **Inspection [2nd]** onward. Current R1 acceptance -> D8 verifies matching obligations -> F5 aftercare resolved. No repeat original invoice/fee/payment cycle.

Explanation-only resolutions need no invented physical inspection. Unresolved aftercare retains actor/date. Additional paid scope/replacement uses the approved linked ticket/financial adjustment route, not hidden aftercare charges. Warranty start/expiry/claim automation remains G04; do not equate warranty with the 30-day check.

## 5. Data/API and audit

Store job-linked observation task, source anchor, true due time, first notice, submission time, rating/observation or unassessable outcome. Version corrections/replies/moderation. Multiple reports/rounds from one job do not become independent jobs.

Commands: submit due Feedback, Unable to assess, request aftercare, submit reply and moderate through 16. No client-set due date or default “good work.” Offline can preserve draft; final result is an explicit online version-checked submission.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH15-T01 | Only partial payment received | No premature full-settlement Feedback anchor |
| CH15-T02 | Actual versus assumed full receipt | Correct different dates; invoice fee date never substituted |
| CH15-T03 | Date-only and late-discovered due task | 09:00 SGT / immediate issue with fair 2/5-BD response window |
| CH15-T04 | Before due, at due, after ticket Closed | No early button; due action visible; closure unchanged |
| CH15-T05 | Negative or positive stars without observation | Both rejected; guidance example not treated as real finding |
| CH15-T06 | No response versus Unable to assess | Correct chase versus stop with no fabricated score |
| CH15-T07 | Low rating without aftercare request | No automatic repair case/liability/second invoice |
| CH15-T08 | Physical aftercare repair submitted | New inspection; same successful round reused; original fees not repeated |
| CH15-T09 | No-work cancellation versus performed zero outcome | Correct exclusion/approved anchor; no fake transfer |
| CH15-T10 | Duplicate assessment or corrected anchor | No duplicate job/assessment; history/true observation preserved |

## 7. Completion gate

Deliver due-only Feedback, compulsory observation, unanswered/unassessable handling and aftercare linkage. Numeric aggregation, moderation and disputed attribution depend on 16; warranty automation remains gated.
