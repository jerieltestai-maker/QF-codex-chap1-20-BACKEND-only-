# QuoteFix delivery backlog and release gates

> **Sequencing superseded, 13 October 2026:** use [master plan 0.3](../IMPLEMENTATION_PLAN.md) and its 20 chapters for construction order and current verification ownership. The 12 slices below remain historical planning/technical reference; they are not a second current schedule.

Draft 0.2 — 12 October 2026. This extends [the implementation plan](../IMPLEMENTATION_PLAN.md) into reviewable work packages. **Everything below is planned, not built.** Stage order is a dependency order, not a promised timeline or approval to start implementation.

## 1. Planning progress and remaining outputs

| Planning deliverable | Current output | Still needed before coding the affected slice |
| --- | --- | --- |
| A. Product contract | Lifecycle v14, decision memory, timing register; web-first/mobile-later and online-decision boundary confirmed | Reconcile final current-policy index; preserve open O29/O30 and specialist gates |
| B. Permissions | Architecture module boundaries and API actor requirements | Exhaustive command/read/file/bell/export matrix, including Admin overrides and confidential subject cases |
| C. Transitions/commands | First command catalogue, transaction protocol, race outcomes | Per-command runtime schema and exact failure/next-actor contract; trace every lifecycle exit |
| D. Data model | Logical records, money/time/version conventions, invariants | SQL schema/indexes, migrations, retention design, financial rounding decision |
| E. Events/timers | T01–T23 implementation bindings, outbox/issue semantics, recovery/pauses | Executable calendar examples and retry thresholds; unresolved O30 branches stay gated |
| F. API/sync | Endpoints, version checks, idempotency/errors, current web and later native sync | Machine-readable OpenAPI, generated client/compatibility checks, concrete field schemas |
| G. Test data/scenarios | Existing scenario list plus device/race/failure cases below | Fixture manifest and isolated repeatable integration harness |
| H. Operations | Proposed stack, deployment boundaries and release checks | Vendor decision/costs/region, backup recovery targets, upload limits, monitoring and deployment runbooks |

The blueprint is now more specific, but completing these documents is not equivalent to completing stage 0. A coding agent must not infer unresolved policy from a plausible schema.

## 2. Stage 0 — close technical uncertainty before feature construction

### P01 — current contract and traceability

**Input:** latest explicit owner decisions, memory, lifecycle model and specialist plans. **Output:** a rule manifest linking rule ID -> command -> permission -> invariant -> event/task/timer -> acceptance scenario. Record confirmed/proposed/open separately. Detect an unrepresented lifecycle route and a rule referenced by no command.

**Gate:** no open behavior is implemented as a default. Preserve the source phrase and version for user-approved UI labels. Diagram/internal nodes do not force new screens.

### P02 — stack and hosting decision

Evaluate the proposed React/TypeScript web, Fastify API, PostgreSQL/worker, object storage and managed identity against: Singapore regional availability, backups/restore, exportability, logs, file scans, native OAuth, supported versions, operating effort and realistic pilot costs. Compare one simpler managed-platform candidate using the same criteria; do not build two applications.

**Output:** one recommended vendor set with account ownership, region, environment topology and cost assumptions. Any paid provisioning requires the applicable authorization; this planning task does not provision services.

### P03 — concurrency and contract spike

In an isolated disposable test environment, prove two clients cannot approve different current selections; verify a lost-response retry returns the original decision; demonstrate a stale invoice returns a reviewable conflict. Generate the API client from the chosen pinned contract tooling.

**Gate:** real database transactions/constraints, no duplicate decision/financial effect, no permissive `PATCH status`. This is a later implementation task, not work already performed in the planning repository.

### P04 — file and native feasibility spike

Prove web resumable photo/PDF uploads, checksum verification, expired-grant renewal, immutable final evidence and restricted-original/sanitised-copy access. Verify that the recommended native transfer adapter supports file-backed iOS background uploads, Android persistent work and crash/restart recovery; if not, document the necessary native bridge before committing to it.

**Gate:** camera formats/orientation, large and corrupt files, cancellation/logout during upload, no duplicate attachment. Define supported formats/limits and clear device-only/uploaded states. Keep actual native app construction for the later stage.

### P05 — calendar, permission and recovery specification

Finish the action/audience matrix, Singapore calendar tests, exact T17 pause/resume examples, operational retry thresholds and deadline boundary races. Decide schema migration/backups/restoration procedure and measured recovery targets. Define access-revocation/cache behavior before persistent mobile caching.

**Gate:** approved timings preserved; ordinary re-alert, warranty and no-scheduled-start gaps remain explicitly unresolved until the owner decides. No invented MCST payment deadline.

## 3. Web implementation slices after contract review

Each slice includes a basic usable interface, permission enforcement, notices/audit, failure handling and its tests. Visual polish follows functional review. Do not defer exceptions and notifications until every happy path is built.

| Slice | Dependencies | Deliverable and exit evidence |
| --- | --- | --- |
| W01 — environment and contracts | P01–P05 needed for foundation | Separate dev/test/staging/prod configuration, migrations, typed API/error envelope, CI contract checks, health/logging. Fresh environment reproducible; no live secrets or production fixture reset |
| W02 — identities/access/eligibility | W01 | Four role contexts, named membership, contractor verification/credentials, concealment and confidential exclusions. Prove isolation through API, files and errors; expired required vs optional credentials differ |
| W03 — shared command/task/file foundation | W01–W02 | Idempotency, audit, outbox, worker leases, notification issuance, Admin attention/follow-up, private uploads. Crash/retry and first-notice anchors verified |
| W04 — reporting and quotes | W03 | Manual and AI-assisted drafts, publication, grouping, shared Q&A, visits/reveal, immutable quotes/expiry/reconfirmation. AI outage permits manual route; hallucinated details never auto-publish; T16 coverage works |
| W05 — comparison and authority | W04 | Current quote population, priorities, rationale, limited-comparison warning, selection/threshold/MCST action, same-ticket preauthorisation reselection. Race tests and T17 pause/resume; scoring integration remains gated by approved model |
| W06 — delivery and variations | W05 | Start prerequisites, scheduled/actual start, temporary unknown estimate, revised dates, variation decisions and contextual resume. T20/T21/T23; target acceptance and initial-estimate extension are distinct |
| W07 — completion and inspection | W06 | Combined required invoice/declaration, optional photos, repeated inspection rounds and invoice reconciliation. A failed 4 Nov inspection and 8 Nov repair always require new inspection; no duplicate case-only acceptance |
| W08 — support and cancellation | W03, W05–W07 route integrations | Contextual Admin Support, restricted conduct reports, immediate cancellation/claim cutoff, Admin-only evidence sufficiency/offline ledger reference, resolution and execution/acknowledgment. Timely claims survive; verdict cannot imply completed repair/payment |
| W09 — invoices, transfers and billing | W07–W08, fee precision decision | MCST confirms, invoice-triggered two fees, transfer proof/partial rationale, receipt/issue/seven-day assumption, balances/adjustments/refunds/restrictions. Same invoice SGD 1,200 assesses SGD 48 + SGD 48 even if only SGD 600 transferred |
| W10 — Feedback and aftercare | W08–W09 | Thirty-day task/9am date-only dispatch, 2/5-BD reminders, rating+observation/Unable to assess, moderated responses and linked aftercare. No closure block or duplicate fee cycle |
| W11 — reputation, comparison AI and integrity | Specialist decisions + W04–W10 evidence | Approved scoring/provenance and MCST rule settings/versioned warnings, permitted explanations and exportable evidence. No placeholder scores, invented history or automatic fraud verdicts |
| W12 — pilot readiness | All launch-scope slices | Complete role journeys, permission/export review, mobile-width web usability, slow-network recovery, backup restore, data migration and support runbooks. Agreed launch scope and remaining exclusions documented |

Build support primitives in W03; W08 completes its integrated journeys. Earlier slices cannot leave their exception buttons unhandled until a distant final stage. A slice can use the approved support task primitive while later domain-specific execution handlers are being built, but it cannot be represented as launch-ready with missing routes.

## 4. Native expansion after the web foundation is proven

| Slice | Work | Exit evidence |
| --- | --- | --- |
| M01 — compatibility readiness | Freeze stable mobile contract; supported-version policy, deep links, OAuth/PKCE, secure sessions | Supported older client continues safely across backend upgrade; revoked membership cannot act |
| M02 — local data and uploads | Local database/cache partitions, draft queue, camera/doc picker, incremental sync if needed, resumable native uploads | Two-device edits, reconnect, storage pressure, app restart and expired grants preserve data and enforce online decisions |
| M03 — role journeys | CM/Contractor capture/upload flows first as a proposed delivery order; plan MCST/Admin mobile coverage explicitly | Same current API/state/permissions as web; repeated inspection and payment actions work with current-version checks |
| M04 — release | Privacy/retention/account-deletion policy, permission explanations, accessibility, store assets/review and optional approved push | Physical-device tests and store checks completed; notifications do not leak private subjects/fees/locations |

CM/Contractor-first native UI is a sequencing recommendation, not approval to exclude MCST/Admin from the eventual product. Native push needs a separate decision; the current web launch remains in-app bells only. A PWA may improve web convenience but is not a substitute for verifying app-store/native requirements.

## 5. Acceptance matrix for web plus future mobile

| Scenario | Expected evidence |
| --- | --- |
| Two CM accounts edit the same draft on different devices | Both drafts recoverable; overlapping field conflict explained; no lost typing |
| Published scope changes while Contractor is offline | Draft preserved; fresh scope/reconfirmation required before submission/selectability; quote count correct |
| MCST reviews invoice v4; browser correction creates v5 | Stale action blocked with permitted differences; no assessment against unseen invoice |
| User double-taps Payment Sent or loses the response | One transfer, one initial receipt notice/anchor; outcome lookup works |
| Photo uploads successfully but completion form was never submitted | Media remains draft/evidence only; no declaration or inspection task |
| Upload grant is replayed after evidence finalization | Reviewed file bytes remain unchanged; staged replacement cannot alter the attached invoice/proof |
| Cancellation while a phone displays Start | Online Start validation refuses stale authority; cancellation reason/claims remain available |
| Offline clock advanced by two days | UI refresh corrects countdown; no receipt assumption, fee or claim cutoff executed by device |
| Admin receipt worker/job crashes and retries | Unique financial effect, recoverable outbox, no reset notice anchor |
| Admin backtracks after money was recorded | Original payment/fees/audit retained, only dependent tasks/acceptances superseded; explicit adjustments |
| Quote expiry drops coverage from three to two | Selection remains available if otherwise valid; reminders pause; sourcing attention returns; restoration resumes remaining time |
| CM fails inspection twice | Initial Inspection, Inspection [2nd], Inspection [3rd]; each shows its originating findings and actual fresh result |
| MCST user is the confidential report subject | No report in search, counts, history, push/bell text, downloads, sync, exports or errors accessible to that subject |
| App sleeps through several updates then reconnects | Canonical current state loaded; historical events preserved; no stale response overwrites a higher revision |
| Credential/fee restriction removed | Only that restriction lifted; independent eligibility checks remain |
| Old native client during backend migration | Compatible read/command works; unsupported new action prompts update rather than silently using old semantics |

Test each meaningful failure at the API/database boundary. UI-only assertions or mocks that copy the implementation's branches do not prove isolation, races or durable recovery.

## 6. Test data, operations and observability

Keep separate databases, storage buckets/prefix policies, identity tenants and keys for development/staging/production. Production starts without demo RFQs, quotes or reputation. Fictional fixtures carry environment/scenario provenance and reset tooling refuses production. Genuine Admin-verified external references retain their real provenance and never come from a demo fixture.

Seed scenarios via validated domain commands where possible; direct foundational fixtures must satisfy the same invariants. Store fixture and schema versions together. A failed migration does not justify resetting a live database.

Monitor: API validation/conflict rates, command outcome ambiguity, worker/outbox oldest age, initial-notice failures, overdue timer lag, task-without-next-actor/date defects, file scan failures/orphaned multipart uploads, access denials and backup/restore status. Use correlation IDs across command/event/task/job; redact credentials, signed URLs, bank proof and confidential report bodies from logs.

Release practice: migration review; deploy compatible API/worker; run smoke/contract checks; gradual client rollout; observe; rollback application if needed without blindly dropping new data. Test recovery from backups in an isolated environment with representative private files and event/financial consistency. Set numerical recovery/retention/budget targets in P02/P05 rather than inventing an SLA in this plan.

## 7. Gates that still require product direction

- **O37-A resolved:** drafts/media queue locally; consequential submissions require connectivity, current server validation and explicit submission.
- **O37-B future client policy:** native push channel; which sensitive records may persist offline and for how long; native role rollout. Architecture supports these without treating them as launch approvals.
- **O37-C billing precision:** proposed independent half-up cent rounding for each 4% component; confirm before financial implementation.
- **O37-D account lifecycle:** deletion/retention/privacy rules, including former users' historical attribution. Do not erase estate/financial history by deleting an account.
- **O30:** remaining ordinary Admin repeat cadence/extra advance notices, warranty automation and authorised work without an agreed start date; scheduled-review timer arithmetic needs a concrete specification.
- **Specialist plans:** only their genuinely open reputation/integrity items; preserve all existing approvals. **O29 archive remains KIV.**

These gates do not block drafting schemas, commands and web foundations. They block silently deciding their dependent behavior. Vendor/framework selections and retry/upload tuning are engineering recommendations to validate, not reasons to repeatedly request product approval.

## 8. Handoff template for a coding task

```text
Outcome:
Approved rule IDs / unresolved exclusions:
Prerequisites and contract version:
Files/modules in scope:
Actor/read/field/file visibility checks:
Command inputs, versions and idempotency:
Transaction/constraints and emitted events:
Task/bell/timer behavior and stop conditions:
Offline/reconnect and compatibility behavior:
Race/failure scenarios:
Test data / migration / rollback:
Evidence required to mark done:
```

A task is done when the defined outcome, exception routes and required evidence pass. A generated screen, happy-path screenshot or confident model explanation is insufficient by itself.
