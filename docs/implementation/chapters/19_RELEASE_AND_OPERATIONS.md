# Chapter 19 — Whole-app verification, recovery, security and web release

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [18](18_DASHBOARDS_AND_EXPORTS.md) · Next: [20](20_NATIVE_MOBILE.md)

**Dependencies:** all web chapters 01–18 and their required decisions. **Purpose:** prove the complete application, not just individual happy paths. This chapter specifies future tests; no production implementation/tests are claimed complete.

**19 October 2026 local construction:** operations diagnostics/worker health, source-bound release checks and evidence-aware restoration are implemented. [Build record](../CHAPTERS_19_20_BUILD.md) distinguishes actual automated evidence from outstanding release/whole-device certification. [Operations runbook](../OPERATIONS_RUNBOOK.md). The acceptance IDs below remain requirements; this note does not mark every gate complete.

## 1. Release prerequisites and compulsory evidence

| Area | Required before pilot | Owner/evidence |
| --- | --- | --- |
| Scope and decisions | Confirmed launch contract; every dependent G gate settled or explicitly deferred by owner | Current memory, chapter gates and release manifest |
| Data/API | Actual migrations/indexes/constraints, schemas/typed client, compatibility rules and permission matrix | Versioned build/migration/contract artefacts |
| Fixtures | Separate fictional test and genuine live records; safe production initialization | Environment guard and analytics/reputation isolation tests |
| Domain behavior | Normal and exception routes, actor handoffs, timers and complete financial reconciliation | Per-chapter test results and cross-role journeys |
| Security/privacy | Auth/access/file/export/cache/AI/notification checks; dependencies and secrets reviewed | Reproducible denied-access and leakage tests, remediation |
| Operations | Monitoring, backups, restore, worker recovery, failure queue, deploy/rollback and named response owner | Measured recovery evidence and runbooks |
| Usability | Clear pending actor/action, compulsory fields, responsive phone forms, accessible controls/errors | Representative user walkthroughs; no unnecessary intermediate screens |
| Real release | Deployment/environment/paid vendor authorization and controlled pilot cohort | Explicit release decision; this plan does not deploy |

Do not remove approved variations, completion, ratings, export, reputation or integrity merely to call an incomplete procurement prototype “version one.” If scope is deliberately changed later, record that owner decision.

## 2. Full journeys to demonstrate

1. CM reports -> AI/manual review -> publish -> three distinct valid quotes -> compare/select within threshold -> Contractor Start -> completion/invoice -> CM acceptance -> MCST confirmation -> transfer/receipt -> automatic closure -> due Feedback.
2. Above-threshold CM nomination -> MCST rejection -> same-ticket reselection/new round -> MCST Select and approve with required threshold acknowledgment.
3. Urgent RFQ with no offers -> correct sourcing/urgent Admin attention -> offline coordination -> legitimate verified/authorised work, without hidden bypass.
4. Material scope change invalidates old quotes -> reconfirmation -> reminder coverage drop/pause/restoration with remaining time.
5. Unknown estimate -> 24h obligation -> Admin exception; later separate revised completion proposal/acceptance; missed start/completion handling.
6. Variation approved/rejected/withdrawn at each saved context, including infeasible original work requiring interruption.
7. Initial failed inspection -> multiple physical remedy rounds -> fresh inspections -> invoice mismatch correction; no repeated case-only review.
8. Partial transfers, late recording, silent receipt assumption, Payment Issue before/after fallback and Admin correction; correct full-settlement Feedback anchor.
9. Immediate cancellation after expenses -> seven-day timely claim -> Admin evidence/offline resolution -> execution/settlement -> Cancelled, not wrongful Closed.
10. Invoice increases/decreases after confirmation -> fee differences/credits/refunds with original deadlines, restrictions and account-only visibility.
11. Closed job -> compulsory Feedback -> separate aftercare repair/inspection; no duplicate invoice/fee chain.
12. Confidential conduct case against an MCST member -> Admin handling and protected views/exports while ordinary estate permissions remain.
13. External verified references plus real feedback -> approved model/moderation/AI explanation -> frozen selection snapshot with source provenance.
14. Two clients editing/approving concurrently, losing connectivity/responses and reconnecting after role/terms changes.

All applicable journeys run through real API/database/worker boundaries and simple usable role screens. They do not pass solely because the Mermaid reaches a terminal node.

## 3. Failure, load and operations design

Use controlled clocks for every T01–T23 boundary and real database constraints for races. Test delayed/duplicate/out-of-order worker jobs, lost responses, failed first notices, expired upload grants, object corruption, identity outage, AI outage and old client contracts.

Observe request errors/conflicts, command outcome ambiguity, outbox oldest age, initial-notice failures, timer lag, orphan tasks without actor/date, scan failures, storage cleanup and backup integrity. Logs carry correlation IDs but redact private evidence/credentials/signed URLs/report bodies. A product in-app bell outage must still be diagnosable through operations monitoring; this is not permission to add customer email alerts.

Choose numerical capacity/latency/recovery/retention targets from the pilot workload and budget. Document them; do not invent a commercial response SLA. Performance tests should represent concurrent quotations, photo uploads, timer bursts and export jobs rather than only empty health endpoints.

## 4. Deployment and recovery sequence

Separate dev/test/staging/prod databases, storage policies, identity tenants and secrets. Apply expand-compatible migration -> deploy API/worker -> validate/backfill -> release client -> observe -> contract old schema only after supported clients/jobs no longer need it.

Prove backup restore in an isolated environment, including private object references and financial/event consistency. A database backup without the necessary evidence files is incomplete recovery. Application rollback must not blindly drop new financial data or replay fees. Document expired credentials, failed jobs, reinstating access and safe manual Admin interventions.

Production initialization includes real authorized configuration/accounts only; no Contractor-Linker demo data or fake reputation. Fixture tooling refuses production. Use fresh real QuoteFix outcomes and labelled independently verified references.

## 5. Timers and privacy during release

Timers remain server-owned through restarts/deploys. Overdue jobs recheck current guards and coalesce obsolete reminders. No clock starts from a failed notice; no notification replay resets the seven-day windows. Holiday-calendar coverage and rule versions survive migration. Release does not restart task age.

No customer timer is created for maintenance/deployment. If an outage affects recorded facts, corrective actions preserve actual versus recorded time and source evidence rather than blaming a user for unavailable software.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH19-T01 | All 14 complete journeys above | Expected facts/versions/next actors/balances/bells and outcomes recorded |
| CH19-T02 | Kill worker/API at each transaction boundary | No partial approval/financial effect; durable work recovers |
| CH19-T03 | Timer outage across receipt/claim/urgent deadlines | Correct guarded effects; no fabricated silence before first notice or stale reminder burst |
| CH19-T04 | Restore backup with files | Records/evidence/allocations agree; no duplicated assessments or missing critical files |
| CH19-T05 | Upgrade/rollback with older supported client | Compatible commands/reads; no data-destructive rollback |
| CH19-T06 | Cross-estate/subject/rival/file/export attack matrix | No unauthorized data or inference leak |
| CH19-T07 | AI/auth/storage provider unavailable | Honest recoverable UI; manual route where applicable; no false submitted/verified state |
| CH19-T08 | Representative upload/timer/export concurrency | Meets recorded targets without correctness/privacy failure |
| CH19-T09 | Production fixture/reset attempt | Refused before mutation; genuine external/live evidence protected |
| CH19-T10 | Mobile-width/assistive-technology role walkthrough | All required actions discoverable and usable; slide-equivalent deliberate control works |
| CH19-T11 | Unresolved G gate in launch dependency | Release gate fails or explicitly documented owner scope change; no silent default |
| CH19-T12 | Operational failure lacks next actor/runbook | Gate fails until accountable monitoring/response/restore procedure exists |

## 7. Completion gate

Deliver signed-off scope/decision baseline, chapter results, cross-role journey evidence, security fixes, restore proof, measured targets and rollout/rollback/runbooks. Only then request/perform an authorised controlled web release. This is a review checkpoint, not an extra customer workflow step.
