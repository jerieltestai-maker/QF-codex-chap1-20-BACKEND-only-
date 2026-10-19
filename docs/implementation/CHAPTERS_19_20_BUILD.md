# Chapters 19–20 local implementation and outstanding release gates

19 October 2026. Source branch `codex/chapters-19-20`. Backend correctness/simple code first, per owner instruction. G13's explicit initial scope is recorded in both memory files; the owner confirms that neither Android nor Mac/iPhone device setup is available. G14 deletion/retention and release decisions remain open.

## Implemented scope

Chapter 19 adds database-persisted worker health and Admin-only aggregate operational diagnostics, an Admin panel independent of customer bells, exact-source release-evidence completeness checking, an operations/deploy/rollback runbook, evidence checksum verification and a snapshot-bound fictional financial/evidence restoration drill. Existing notification/work/payment guards remain authoritative. The failed-scan Admin queue now checks confidential support subject exclusions before listing or retrying work; estate access alone previously missed that condition.

Chapter 20 adds an Expo 58 / React Native 0.88 application and a small shared typed HTTP client. All roles can read current authorised queues/tickets/history. Initial action/capture coverage includes device issue/quote notes, private request creation, reviewed Contractor Start, camera/document capture and resumable foreground evidence transfer. Other actions continue in the authenticated external browser; this is not full native parity with all web forms. No separate mobile domain rules/database or offline approval/payment queue is introduced.

Native auth uses a local external-browser consent/PKCE bridge and separately revocable, marked sessions with secure credential storage. Draft JSON uses SQLCipher; file captures are app-private. Protected server records remain memory-only. Canonical refresh is the initial sync contract; no incremental journal/cache/cursor correctness is claimed. No push channel exists. [Native guide](../../apps/mobile/README.md) and [ADR 010](../architecture/ADR_010_RELEASE_AND_NATIVE_FOUNDATIONS.md) state limitations precisely.

## Verification and execution record

The complete local regression passed **254/254 records on PGlite** (380,478 ms) and **254/254 on PostgreSQL 18** (657,387 ms), with zero failures/skips/cancellations. Both used two-file concurrency. The final affected native/operations/client PostgreSQL run passed **21/21** (20,065 ms), overlapping those totals, after the privacy/transport guards. Nine isolated Windows helper checks, strict backend/browser/native checks, compilation and documentation validation passed. Both Android/iOS Hermes JavaScript bundles exported and SDK compatibility checks passed. Generated bundles do not certify native executable compilation or device runtime behaviour.

Focused real-browser verification on the isolated fictional preview confirmed Admin processing health renders and refreshes successfully, with no recorded warning/error logs. [Browser evidence](evidence/CH1920-processing-health.png). The first preview launcher attempted to register a Fastify hook after fixture requests had started the instance; that launcher was corrected to clean up directly. An initial PowerShell listener inspection incorrectly suggested the normal API was stopped; direct HTTP/netstat verified its existing PID 14344 and readiness. No database copy, marker deletion, environment switch or restart was performed on the normal app. Its existing process needs a planned safe restart to load the new backend routes.

Earlier focused checks passed native HTTP/code replay, shared commands, response loss, current access, chunk-resume, corruption/missing originals and operational recovery. Initial operations-test failures used the wrong workspace version location and attempted to inject a duplicate derivative; the test fixtures were corrected to exercise real export guards and genuine corrupt objects. Assertions were not weakened. An initial native typecheck found an unused import/missing explicit dependency; both were fixed, and SDK-compatible TypeScript was selected. These initial failures are not passes. Full-suite execution preceded the last native UI recovery refinements; final native typechecking/bundling cover those source changes, while actual native runtime checks remain unavailable.

Actual PostgreSQL copied-artifact restoration passed in **34,047 ms** while other regressions were running. The isolated full journey included invoice/proof, actual receipt, Closed outcome and one generated export. All tables and their full-row hashes matched the exact exported snapshot; **4 file objects and 1 export** passed byte checksums/ready-original checks. The manifest/dump are retained privately under `work/recovery-drills/da4daa6fcb4f4f1fb64bdc52da6dcfbc/`; the restore database is retained for inspection. Original development/PGlite data was not seeded/reset. This measured fictional exercise does not set a production RTO/RPO.

A focused PGlite concurrency check completed eight simultaneous export requests plus four uploads and a worker burst in **3,293 ms**, with export-request sample p95 **1,741 ms**. Counts, exact export readiness and byte integrity were asserted. This is a bounded local sample, not pilot capacity certification. Full adapter runs record their own load diagnostics separately.

## Chapter 19 acceptance map

| ID | Concrete evidence / remaining limit |
| --- | --- |
| CH19-T01 | New `operations.test.ts` integrates real procurement→work→invoice→acceptance→receipt→Closed→due Feedback/export. Existing procurement, work, completion, billing/support, feedback, integrity, reputation and audit suites cover the other exception journeys. Fourteen entire journeys have not all been independently walked through browser/physical role screens |
| CH19-T02 | Existing actual SQL transaction-failure injections plus new worker-restart/lease-token fencing test. Literal process kills at every possible transaction boundary remain unproven |
| CH19-T03 | Existing controlled-clock receipt/claim/urgent/sourcing/review tests, plus delayed initial-notice/operational visibility checks. Restarts do not fabricate notice anchors |
| CH19-T04 | Actual PostgreSQL snapshot/copy/restore drill with complete row fingerprints and evidence bytes; corruption/missing-ready-original rejection tests |
| CH19-T05 | Existing repeat migration/immutable checksum tests and additive contract compatibility. Installed old native executable and production rollback rehearsal remain open |
| CH19-T06 | Existing denied estate/rival/subject/file/export tests plus confidential-subject failed-scan recovery regression; native same-account/rival/revocation HTTP checks |
| CH19-T07 | Existing provider fail-closed/manual-route tests and native network/5xx/expired-code cases. Production managed identity/object/scanner outage drills remain open |
| CH19-T08 | Bounded concurrent upload/export/worker workload with counts/checksums and measured latency. Owner pilot workload/budget/targets remain to be set |
| CH19-T09 | Existing production fixture/config refusal and provenance tests. No production initialisation is attempted |
| CH19-T10 | Existing web-form tests retained; broad assistive-technology/physical-device walkthrough remains open |
| CH19-T11 | Release manifest refuses missing/stale/unresolved/evidence-free checks; G14 and required launch evidence are deliberately blocked/pending |
| CH19-T12 | Operational heartbeat/notice/timer/scanner diagnostics, accountable operator/runbook and release completeness check. Hosted external monitor/production on-call/recovery targets still require setup |

## Chapter 20 acceptance map

| ID | Concrete evidence / remaining limit |
| --- | --- |
| CH20-T01 | Actual HTTP native/browser contexts/capabilities for all four roles; same commands and operation outcomes; initial native role screens bundled |
| CH20-T02 | Live access refresh precedes commands; offline refresh makes zero command POSTs; draft/capture UI explicitly device-only. Native SQLCipher/camera execution needs devices |
| CH20-T03 | Existing exact-version invoice/financial races apply to identical native routes; no old-version auto-merge. Physical two-device invoice review remains open |
| CH20-T04 | Concurrent same-key native API submissions produce one job/outcome; browser lookup recovers it. Client transport/network/5xx/truncated response stay Checking submission |
| CH20-T05 | Real lost committed chunk response resumes without duplicate bytes, stable intent/finalize IDs, foreground queue. Killed-app/background OS transfer/storage-pressure runtime proof and adapters remain open |
| CH20-T06 | Exact redirect/S256 PKCE, short expiry, wrong verifier, concurrent one-use exchange, CSRF, session type, mixed auth, logout/revocation/account partition tests; device SecureStore/files need runtime checks |
| CH20-T07 | Initial canonical refresh/memory-only server records; no persistent server cache/feed, so incremental bootstrap/journal race certification is explicitly deferred |
| CH20-T08 | Actual access change invalidates refresh context; stale/revoked commands denied; client rejects old account responses including delayed JSON. No permanently-offline erasure promise |
| CH20-T09 | Additive contract/minimum schema capabilities and safe client refusal; old installed build against upgraded production backend remains open |
| CH20-T10 | Push not enabled/registered; existing server bell/timer tests retained. No push delivery clock introduced |
| CH20-T11 | Singapore server dates and fixed-timezone native formatting; device-clock experiments remain open |
| CH20-T12 | Auth/code/deep-link safety and permission/media recovery paths implemented; HEIC explicitly unsupported with conversion guidance. Physical camera/login/app-link/accessibility checks remain open |
| CH20-T13 | G14 unresolved. No destructive account/estate/financial deletion or store-policy certification claimed |

## Dependency and release blockers

`pnpm audit --json` found **2 high and 1 moderate advisories** on 19 October: node-forge [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), Metro/micromatch braces [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), and xcode uuid [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq). The observed paths belong to Expo CLI/Metro/native build tooling. This does not establish exploitability or prove the installed app unaffected. The first two had no patched range in that audit response. No untested forced major transitive override or advisory suppression was used. Resolve/review before release; raw audit is ignored `work/chapters1920-dependency-audit.json`.

Both JavaScript platform bundles/typechecks and automated server tests cannot certify native compilation, physical device operation, OS-managed background transfer, full native parity, production OAuth/storage/antivirus, external monitoring, retention/account deletion or store/host release. No production release/purchase/store submission occurred. Chapter 20 is **not finished**; its owner-requested within-30-day fault/callback-percentage follow-up remains due at actual completion and is not marked handled.
