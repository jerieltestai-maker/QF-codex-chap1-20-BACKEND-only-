# Chapter 05 — Contractor profile, verification and credentials

**Local construction, 13 October 2026:** [build evidence](../CHAPTERS_05_06_BUILD.md) records implemented behavior and executed checks. G06's Admin-managed/all-trade approach is approved; actual trade requirements are explicitly configured, and subcontractor-based eligibility is deferred. The scenarios below remain the complete requirements, including later quote/work/export bindings.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [04](04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) · Next: [06](06_RFQ_INTAKE_AND_URGENCY.md)

**Dependencies:** 01–04. **Nodes:** G1–G4. **Timer:** T12; Admin attention T18/T11. **Sources:** C33/C46/C70/C71, Q9; [cross-cutting rules](../CROSS_CUTTING_RULES.md).

## 1. Outcome and build order

Build organisation/contact/trade profiles; evidence upload; Admin verification queue; configurable credential types/prerequisites; verification decision and expiry effects. Verification is manual and authoritative within QuoteFix: Admin checks authenticity offline. Do not invent an automatic external certification validation service.

Five verified external references belong to chapter 16's provisional reputation model. They are not a new blanket prerequisite to quoting. Mandatory Admin eligibility verification is the quoting gate.

## 2. Fields, decisions and visibility

| Record | Required / conditional | Optional / system |
| --- | --- | --- |
| Contractor profile | Named organisation, identity/contact and requested categories (E exact schema) | Public description and optional media only within masking rules |
| Credential type | Admin-set name, company/person holder type, applicable scope; required versus optional classification | Badge asset/description |
| Credential record | Holder/type, supplied evidence/reference, verification state | Expiry date/time optional; do not invent expiry for a permanent credential |
| Admin verification decision | Approved/rejected/needs evidence, scope, named actor and timestamp; reason/evidence for rejection or override (E field detail) | Findings/internal notes restricted to Admin |
| Required credential problem | Affected category/eligibility and active-job review context | No automatic cancellation of all jobs |
| Renewal | New evidence and new Admin decision/version | Supersedes relevant expiry job, never erases previous lapse |

Contractor sees its own submissions/verification status and affected eligibility. CM/MCST see permitted verified profile/badges; CM identity masking applies. Private documents, personal contacts and authenticity notes are not public passport fields. Admin can add new types, including the owner's examples of bizSAFE/trade certifications, without claiming all types are legally interchangeable.

## 3. Transitions and checkpoints

Application/evidence submitted -> Admin queue. Admin may ask for proof -> Contractor supplies -> Admin reviews. Only the explicit Admin decision grants the configured category scope. Login, document upload or a five-reference score does not automatically verify.

A verification approval changes current eligibility and notifies the Contractor. Rejection/insufficient evidence records the actual next action. At quoting and selection, recheck current required credentials, verification and restrictions; never rely solely on a displayed green badge.

Optional credential expires -> grey badge. Mandatory prerequisite expires -> restrict affected new eligibility, notify Contractor of limitation and Admin to review affected active work. Existing work is not silently cancelled; safe interruption/resumption uses chapters 09/14. Fee restrictions are separate and clearing one restriction does not clear another.

## 4. Timers and countdowns

| Trigger | Time | Recipient/action and stop |
| --- | --- | --- |
| Credential with expiry recorded | T12 one calendar month before expiry; month-end clamp | Admin: review renewal; if entered already inside window, notify immediately |
| Date-only expiry | Valid through date; expire following midnight SGT | Grey/eligibility consequences apply; explicit timestamps respected |
| Admin verification/evidence review becomes actionable | T18 initial queue and +1 BD unacknowledged | Admin; unresolved acknowledgment needs dated follow-up T11 |
| Admin requests evidence | Actual named request/due date or applicable ordinary response rule | Contractor acts; evidence return does not approve it |
| Renewal verified | Immediately | Supersede obsolete renewal/expiry notices; retain history |

No compulsory expiry field or invented renewal lead time beyond the approved month. Category/bundle/subcontractor prerequisites are G06, to configure before live trade eligibility.

## 5. Data/API and audit

Version profiles/credentials/decisions; retain holder identity, scope, recorded expiry precision, evidence asset ID and decision actor. Commands include submit verification, request evidence, record decision, create credential type, renew/supersede and apply/lift a specific restriction. Audit all changes; notification payload obeys identity masking and file restrictions.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH05-T01 | Logged-in unverified Contractor submits quote | Denied at API; profile/verification workflow still accessible |
| CH05-T02 | Upload evidence without Admin approval | No eligibility or verified badge granted |
| CH05-T03 | Optional versus required credential expires | Optional grey only; required scope restricted and Admin work review; no blanket job cancellation |
| CH05-T04 | Expiry date-only at 23:59 then next midnight | Correct Singapore boundary; explicit timestamp honored |
| CH05-T05 | Month-end reminder / record inside one-month window | Correct clamp/immediate alert without duplicate notices |
| CH05-T06 | Renewal races old expiry worker | Current verified version wins; no obsolete restriction |
| CH05-T07 | Fee restriction cleared while credential still invalid | Contractor remains blocked in affected scope |
| CH05-T08 | Masked CM/rival Contractor requests private evidence | No identity/document/contact leak through profile/file/bell/export |

## 7. Completion gate

Deliver configured verification workflow and rule matrix after G06 decisions, private evidence access and expiry/eligibility tests. Numeric reputation remains chapter 16; never create a fake starter score to fill the profile.
