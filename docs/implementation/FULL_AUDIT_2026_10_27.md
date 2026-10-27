# QuoteFix Chapters 01–20: implementation and accuracy audit

27 October 2026 · audited application source `9d687bac16e88cc91e49cf4812dfb2dae8d00d77` · report-only changes on `codex/full-chapters-01-20-audit-2026-10-27`.

## Assessment

**The core local web application is substantially implemented, but the complete 20-chapter plan is not finished or release-ready.** Chapters 01–18 have working domain/API/UI implementation and substantial automated evidence. That does not mean every acceptance criterion is satisfied. This audit found additional functional gaps in native capture, offline startup, list completeness, Contractor history and exported exception records. Chapters 19 and 20 remain explicitly incomplete.

The financial, procurement and support systems are connected; this is not a collection of disconnected prototype modules. However, passing the existing regression tests is insufficient to establish complete plan fidelity: some omissions are absent from tests, and one native test explicitly expects the unattached-upload state that reveals the missing final handoff.

The most urgent work is to repair the native photo handoff and offline draft access, remediate/review the current dependency findings, and finish release verification. The complete KIV register below separates decisions still needed from already-approved work that remains unfinished. No open policy was resolved during this audit, and no application behavior was changed.

## Scope, method and evidence limits

Reviewed the master plan, all 20 chapter specifications and their **206 acceptance scenarios**, cross-cutting/decision-gate documents, current product memory/owner answers, build records, previous audits, API registration modules, domain services, worker integrations, web/native clients, database/migration controls and CI/release tooling. The implementation inventory contains 12 API source files, 43 domain files, 18 web assets and 29 test files. TypeScript symbol-reference analysis included mobile `.tsx` and shorthand property uses to avoid falsely labelling imported code unused.

Verification used isolated fictional fixtures and real API/database/worker boundaries. Additional reproductions exercised native uploads, a completed financial journey, cancellation exports and 200-record list boundaries. Dependency advisory information was refreshed on the audit date. No paid AI request, production deployment, fixture installation into the owner's existing application data, database reset, secret disclosure or migration edit occurred.

The existing Docker Desktop engine/service was started for the isolated PostgreSQL test suite. The helper's `test` action targets `quotefix_test`; it does not seed the development database. After verification, zero disposable test schemas remained and the PostgreSQL service was stopped, restoring its initial stopped state. The ordinary application was not restarted. Its readiness endpoint was unreachable at the inspection time, and `.env` had no nonempty `CLAMSCAN_PATH`. Those are local operating observations, not evidence that domain code is absent.

This is a repository-wide implementation/acceptance audit with targeted executable reproductions, **not** a claim of exhaustive path coverage, a penetration-test certification, a legal/store-policy review or a physical-device test. All fourteen Chapter 19 journeys were not freshly walked through every role's browser/device screen. Existing automated journeys and historical browser evidence were inspected; their dates and limits remain distinct from today's results.

Sanitized reproduction results and verification metadata are retained in [the audit evidence summary](evidence/AUDIT_2026_10_27.json). Raw local execution logs and disposable reproduction programs are under ignored `work/audit-2026-10-27/`.

## Findings requiring corrective work

Priority: **P1** blocks the affected promised capability or security release sign-off; **P2** is a functional/accuracy/verification gap to address before depending on that behavior; **P3** is maintenance or tool compatibility work. Evidence labels distinguish executable reproduction from source-established behavior.

| ID | Priority | Finding | Evidence | Affected chapters |
| --- | --- | --- | --- | --- |
| F01 | P1 | Native captured evidence reaches ready storage but never becomes usable workspace evidence | Reproduced through API/worker/shared native upload client | 03, 06, 20 |
| F02 | P1 | A cold native launch without connectivity cannot open the saved local drafts/capture interface | Established by application state/render/control flow; device confirmation still required | 20 |
| F03 | P2 | Ready native upload records and captured files persist beyond the approved pending-upload scope | Shared-client persistence reproduced; absent cleanup established from native source | 20 |
| F04 | P2 | Hard list limits can hide new eligible opportunities and new moderation work | Reproduced with 200 older records in each surface | 06, 16, 18 |
| F05 | P2 | Decision packs omit cancellation acceptance and important exception-resolution evidence | Cancellation omission reproduced; projection omissions inspected | 14, 18 |
| F06 | P2 | Contractor chronology returns quote revisions instead of the Contractor's work/payment history | Reproduced after an actual Closed financial journey | 09–14, 18, 20 |
| F07 | P1 | Current dependency security findings exceed the previous toolchain-only stocktake | Fresh `pnpm audit --json`; authoritative advisory pages checked | 01, 19, 20 |
| F08 | P2 | Native SDK compatibility check now fails | Fresh Expo compatibility command | 19, 20 |
| F09 | P2 | Fresh complete PGlite regression failed by losing an entire test-file process | Failed full-run log plus separate passing diagnostic | 01, 19 |
| F10 | P2 | Active plan documents contain stale completion status and a superseded clearance rule | Direct comparison with latest explicit owner decisions and actual guards | 08, 17, overall handoff |

### F01 — Native photo upload has no final workspace handoff

The native application calls `resumeUpload`, which creates/transfers/finalizes an upload and persists its status. Neither that function nor the native screen calls the attachment command or a work-update command consuming the returned file IDs. The web RFQ selector only offers files already attached to the workspace.

**Reproduction:** create a private request; upload a fictional PNG through the shared native client; run the real scanner worker using the test clean-scanner adapter; refresh the upload. It reaches `ready`, but the workspace contains **zero attachments**. Saving an RFQ intake that references its sanitized image then previewing returns **422 `EVIDENCE_NOT_PERMITTED`**. Calling the existing explicit attachment endpoint makes the same preview return **200**. This isolates the missing connection; file storage/scanning and publication validation themselves work.

Contractor capture has the analogous consumption gap: ready work evidence is not submitted through a work update. The supported web continuation does not expose a picker for these orphaned native upload objects. Merely keeping publication/completion separate from upload is correct; omitting every review/attach route is the defect.

Evidence: [native upload UI](../../apps/mobile/App.tsx#L136), [shared uploader](../../packages/native-client/client.ts#L51), [attachment service](../../packages/domain/file-service.ts#L138), [RFQ evidence validation](../../packages/domain/rfq-service.ts#L28), [web RFQ selection](../../apps/web/procurement.js). The existing [native API test](../../tests/native-api.test.ts) checks for zero attachments, proving transport separation but not a usable end-to-end capture journey.

**Correction:** provide an explicit reviewed attachment/work-update action, retain its stable operation identity, and verify that a captured photo can actually be selected in the subsequent RFQ/work form. Do not auto-publish or auto-complete work.

### F02 — Offline native startup cannot reach local drafts

Native state starts with `context=null`. Startup opens the encrypted store, loads the session and then calls `refresh()`. That method must successfully fetch capabilities, refresh access, retrieve context and load dashboard data before it installs the context and loads local drafts. On network failure it clears server state and throws. All draft/capture controls are inside the authenticated `context` branch of the render tree; the remaining screen offers external-browser sign-in, which also needs connectivity.

Consequently, a user who saved a draft, closed the app and reopens it offline cannot reach that draft or continue device-only capture. **The stored bytes are not proven lost**; the application cannot expose them through its current startup path. A warm already-authenticated session is a different case and can retain its draft interface.

Evidence: [startup and refresh](../../apps/mobile/App.tsx#L35), [conditional interface](../../apps/mobile/App.tsx#L153), [local store](../../apps/mobile/storage.ts#L16). This finding is a source-established deterministic path, not a claim of physical-device execution.

**Correction:** separate a securely identified local-draft mode from current online server authority. Allow only the existing owner's permitted unfinished drafts/capture offline; keep server records and consequential decisions behind a fresh online check. Verify cold restart in airplane mode on both platforms.

### F03 — Native ready uploads are retained indefinitely

The approved G13 scope permits persistent unfinished drafts and **pending uploads only**. The uploader saves a `ready` record back into SQLite. The app continues listing it, and neither completion of upload nor an attachment step deletes the queue record/local copied file. `removeUpload` exists but is never called; the file directory is deleted only during broad sign-out/context clearing.

Evidence: [ready record persistence](../../packages/native-client/client.ts#L69), [resume screen](../../apps/mobile/App.tsx#L136), [store cleanup operations](../../apps/mobile/storage.ts#L24). The reproduction retained a `ready` queue record. Device file deletion behavior itself was not run on physical hardware.

**Correction:** define a confirmed server-consumption checkpoint, remove completed queue rows and local capture copies after that checkpoint, and recover interrupted cleanup safely. This implements the already-approved minimal native storage scope; broader retention/account deletion remains G14 and must not be silently decided.

### F04 — Silent list truncation hides actionable records

`RfqService.opportunities()` selects the first 200 publications **before** checking whether each is open and eligible. With 200 earlier closed fictional publications and a later eligible open request, `GET opportunities` returns **zero**, while the direct opportunity endpoint returns **200** and the canonical dashboard finds the request. The older list's empty message incorrectly implies no currently eligible work.

The reputation moderation queue similarly loads the oldest 200 entries, including entries already reviewed, with no paging/filter parameter. With 200 older entries, a new submitted external reference is absent from the queue although its authenticated direct entry endpoint returns **200**. The Admin moderation screen builds its controls solely from that truncated response.

Evidence: [opportunity list](../../packages/domain/rfq-service.ts#L149), [moderation queue](../../packages/domain/reputation-service.ts#L104), [moderation UI](../../apps/web/feedback.js#L85). Both cases were reproduced against isolated fixtures. The canonical ticket dashboard is a workaround for the opportunity case; it does not repair the other list.

Related hard limits deserve the same correction pass: contractor directory, legacy workspace/task/attention lists, bell history/unread count and workspace history. The native dashboard requests only the first 100 tasks/tickets and has no next-page control. The web named-history view also loads only its first page. These related cases were source-inspected, not all separately reproduced.

**Correction:** filter/authorize before page selection, add stable pagination and truthful totals, prioritize actionable moderation work, and connect queue rows to their actual action forms. An API page size must not become a permanent visibility cutoff.

### F05 — Exported exception evidence is incomplete

Decision packs preserve quotes, selections, variations, inspections and financial records, but do not include cancellation records/events. The history allowlist includes `cancellation.cancel` and excludes `cancellation.respond`. Ordinary support exceptions contain category/state/blocking plus obligations; they omit the final resolution's outcome/reason and recorded acknowledgments. Confidential material must continue to be excluded.

**Reproduction:** cancel authorized fictional work, issue its Contractor notice, and submit the required explicit no-additional-claim declaration. The server stores `response='okay'`. A subsequent MCST decision pack contains neither the declaration nor the `cancellation.respond` event. A reader cannot distinguish an explicit acceptance from silence using the exported evidence alone. This is an export omission, not deletion of the source record.

Evidence: [history allowlist](../../packages/domain/decision-pack.ts#L42), [pack construction](../../packages/domain/decision-pack.ts#L49), [cancellation response records](../../packages/domain/cancellation-service.ts#L73). The same source projection also lacks a full event record for assumed-receipt/dispute corrections, although current transfer status is present.

**Correction:** include permitted cancellation/claim/response/restoration and ordinary final-resolution/execution evidence, with actor/time/version and relevant notice/cutoff anchors. Preserve existing subject exclusions, concealed identities and financial-account separation. Verify content completeness as well as absence of restricted data.

### F06 — Contractor named history is quote-only

The Contractor branch of the chronology service queries only `quote_versions`. It does not project permitted Start, progress, completion, inspection, transfer or receipt events. The native interface assumes every returned item has `action`, while those quote rows have no such field.

**Reproduction:** run a real fictional job through Start, completion, inspection, invoice confirmation, transfer, actual receipt and Closed. The database contains one `work.started` event and five payment events. Contractor chronology returns one quote-version item with **no `action`**. Current state and other detail endpoints still hold the correct records; this specific history API/UI is incomplete.

Evidence: [Contractor history query](../../packages/domain/dashboard-service.ts#L66), [native history consumption](../../apps/mobile/App.tsx#L70), [web named-history consumption](../../apps/web/oversight.js). The native guide's claim that all roles have named history overstates this branch.

**Correction:** use a normalized permission-filtered event projection for the Contractor's own lifecycle; retain the exclusion of rival bids and estate procurement rationale. Give quote-version events a defined action label and test the actual native response shape.

### F07 — Refresh the security remediation backlog

Today's `pnpm audit --json` reports **12 vulnerable package/advisory entries: 2 high, 5 moderate and 5 low, representing 8 distinct advisory IDs across 5 package names**. These counts are not twelve confirmed exploitable application vulnerabilities. Multiple entries concern the same advisory affecting two installed `fast-uri` versions.

| Installed dependency | Finding/scope | Remediation evidence |
| --- | --- | --- |
| `node-forge` 1.4.0 | High; Expo CLI signing-tool dependency | [Signature-verification advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv); audit supplied no patched range |
| `zod` 3.25.76 | High; Expo CLI dependency | [Collection-validation advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5); audit reports patched range `>=4.6.6`; assess upstream compatibility rather than forcing an untested major override |
| `uuid` 7.0.3 | Moderate; Expo/xcode tooling | [Buffer-bounds advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq); audit reports `>=11.1.1` |
| `fastify` 5.12.5 | Low; direct API runtime dependency | [Header-validation advisory](https://github.com/advisories/GHSA-389g-gv7q-r4x8); audit reports `>=5.12.6` |
| `fast-uri` 4.2.2 / 3.1.8 | Moderate/low; Fastify compiler/Ajv dependency paths | [Scheme decoding](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [path equivalence](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [host canonicalization](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [suffix scheme injection](https://github.com/advisories/GHSA-333x-w4r6-6crp); audit reports `>=4.2.3` / `>=3.1.9` |

The previous “three Expo/Metro toolchain advisories” list is dated evidence and is no longer the current security inventory. This audit did not demonstrate exploitability of each entry. It did establish that today's findings are **not confined to native build tooling**. Update supported packages/lockfile, review relevant call paths and rerun both adapters/native compatibility before release sign-off. No advisory was suppressed or dependency silently overridden.

### F08 — Native SDK compatibility is not currently green

`pnpm --filter @quotefix/mobile exec expo install --check` exits **1** and recommends these SDK-compatible patches:

| Package | Installed | Expected by current check |
| --- | --- | --- |
| `expo` | 58.0.14 | `~58.0.19` |
| `expo-constants` | 58.0.12 | `~58.0.13` |
| `expo-file-system` | 58.0.9 | `~58.0.11` |
| `expo-sqlite` | 58.0.13 | `~58.0.14` |

Backend/native typechecking and Android/iOS JavaScript bundle export pass independently. They do not cancel the compatibility failure or prove native compilation/device behavior. Update the compatible set together and rerun the explicit check; retain device testing as a separate gate.

### F09 — Complete-regression reliability remains unresolved

The fresh PGlite run with two test-file workers finished with **240 reported records: 239 passed, 1 failed, 0 skipped/cancelled**, taking 517,084 ms. The failure is the entire `tests/completion.test.ts` process, reported as `test failed` without an assertion detail. Its fifteen normal records were not reported in that run.

A separately executed one-file diagnostic passes **15/15**, taking 63,447 ms. This confirms those scenarios can run in isolation; **it does not turn the failed full run into a pass or identify its cause**. Earlier memory/audits already disclose unexplained WebAssembly/process failures. Resource pressure, runtime/toolchain issues and embedded-database behavior remain hypotheses, not established diagnoses.

Retain the failed run; capture child exit/signal/stderr and resource diagnostics in a controlled follow-up. Do not mask the issue with automatic retries or weaker assertions. Fresh PostgreSQL results are recorded separately in the verification table below.

### F10 — The handoff documents can direct a future implementation incorrectly

The master plan still says local construction stops at Chapters 07–08 and Chapters 09–20 remain planned. More seriously, Chapter 08 says Chapter 17 cautions remain advisory and never add a below-threshold MCST gate. The latest explicit owner answers and actual selection implementation require exact MCST clearance for a flagged CM nomination even below threshold. Chapter 17 correctly records that superseding rule.

The verification index still describes Chapters 19–20 as entirely planned despite their partial construction. Native documentation overstates “named history” for Contractors. These statements should be reconciled while preserving dated historical evidence. **The code should not be changed to match the stale advisory-only sentence.**

Evidence: [master status](../IMPLEMENTATION_PLAN.md#L7), [superseded Chapter 08 statement](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md#L53), [current Chapter 17 rules](chapters/17_MCST_INTEGRITY.md#L7), [selection guard](../../packages/domain/selection-service.ts#L124), [verification index](VERIFICATION_INDEX.md#L5).

## Approved capabilities that remain partial or unfinished

These are implementation/release gaps, distinct from open policy decisions. They must not be quietly reclassified as KIV merely because a safe fallback exists.

| Capability | Current implementation | Remaining work / boundary |
| --- | --- | --- |
| RFQ AI refinement, Chapter 06 | `local-extractive-v1` copies original observations/location into labelled sections and review cautions | Gemini is injected into comparison advice only. No generative language refinement, image understanding or substantive second AI clarity/missing-information pass is connected to RFQ drafting. Manual publication works. See [refinement worker](../../packages/domain/procurement-worker.ts#L40) and [RFQ service](../../packages/domain/rfq-service.ts#L161) |
| Optional video | Upload contracts/pickers accept JPEG, PNG and PDF, with fixed size limits | Optional video is absent. It is an accepted optional capability/follow-up, not a reason to block photo/manual reporting |
| Broad priority-aware comparison, Chapter 16 | Current price/structured availability and a workmanship-adjusted score can support a bounded recommendation | Similar experience and less disruption always yield no supported recommendation; evidence omits comparable experience/disruption inputs and quote exclusions/term tradeoffs. Gemini returns candidate IDs/citations, while server text is templated and deterministic validation only accepts the local supported candidate. A connected provider does not establish the full planned comparative explanation capability. Do not invent strength thresholds or unsupported traits. See [advice guards](../../packages/domain/advice-service.ts#L27) and [provider input](../../packages/infrastructure/gemini-advice.ts#L12) |
| Expanded passport | Moderated rubric evidence, source counts, durability states and numerical scores exist | Comparable experience/commitment evidence and specialty-strength interpretation remain limited. Some policy is KIV; approved factual evidence presentation still needs a requirements-by-field completion pass |
| Web release, Chapter 19 | Operations diagnostics, fail-closed release manifest, local recovery drill, broad API tests and bounded load evidence | Production identity/security email delivery, private object storage/scanner, hosted API/worker, external monitoring, capacity/RPO/RTO/backup targets, accessibility, all-role journey sign-off, rollback and authorized pilot remain open |
| Native release, Chapter 20 | Four-role connected shell, PKCE development bridge, secure session storage, encrypted draft JSON, foreground chunk resume, issue draft/Start actions | F01–F03/F06/F08 plus Android/iOS native compilation, device permission/auth/deep-link testing, killed-app/storage-pressure recovery, real background-transfer adapters, installed-version compatibility and store release evidence |
| Native workflow coverage | Most consequential forms continue in an authenticated external browser | Connected screens do not mean native form parity. This initial scope is disclosed/allowed; full native parity is not certified |
| Native synchronization | Canonical refresh with memory-only server records; no persistent server cache | No incremental feed/cursor/tombstone implementation. Canonical refresh is explicitly permitted initially; a richer persistent cache would need its approved scope and tests first |
| Export format | Printable HTML and structured JSON | Native PDF generation is absent. The plan recommends PDF, while current chapter/build records explicitly disclose the supported initial formats; do not present this as an undisclosed backend failure |

## KIV and decision register

Latest explicit owner decisions take precedence over historical “open” entries. **Do not reopen** G01 identity flow, G03 no-start-date proposal/acceptance, G05 quote default, G06 all-trade eligibility configuration, G07 scope classification, G08 fee rounding, G09–G11 approved reputation formula/rubric/moderation, G12 warning defaults/clearance, or G13 initial native role/cache scope. Production provider implementation remains separate from those settled product choices.

| Item | Current decision state | What remains / affected work |
| --- | --- | --- |
| G02 / O30 additional ordinary Admin repetition | Open | Repeats beyond the approved first +1-business-day unacknowledged reminder. Keep outstanding items/dated follow-ups; do not copy urgent cadence |
| G04 warranty automation | Open | Warranty start/expiry/claim automation and optional reminders. Display accepted terms and use support/aftercare in the meantime; do not substitute the 30-day Feedback clock |
| G14 account deletion/retention | Open; release-dependent | Account/file treatment, attribution, former members, retention/erasure and native/store account lifecycle. No destructive cleanup of estate/financial history without the decision |
| G15 / O29 unresolved-case archive | Explicit KIV | Keep unresolved case and actual follow-up; no automatic archive, success or settlement |
| Within-30-day fault/callback percentages | Explicitly deferred | At **actual Chapter 20 completion**, remind the owner to decide occurrence timing, causal attribution, denominator, missing/late/unassessable handling. Chapter 20 is unfinished; reminder is not handled |
| Specialty-strength thresholds | Open specialist policy | When evidence supports strength labels/claims, including sufficient comparable work. No fabricated strength rating |
| Subcontractor-based eligibility | Deferred | The accountable Contractor currently must cover every bundled trade. Disclosure of subcontractors does not confer missing eligibility |
| Extra advance reminders | Open/unapproved | No invented extra reminder cadence for quotes/fees/warranty or optional activities |
| Later integrity proposals | Deferred/unapproved | Split-job inference, bidder-independence/concentration, same-actor extra alerts and usefulness analytics; four approved rules/clearance are already settled |
| Production service choices and pilot operating targets | Engineering/release decisions still needed | Provider/region/budget, hosting/worker, identity/security messages, private storage/scanning, operator ownership, capacity/latency and recovery/retention targets; no paid provisioning or deployment approval inferred |
| Broader native delivery | Initial scope settled; certification incomplete | Physical setup, actual runtime/background transfers, full workflow coverage, production auth/links, approved account lifecycle and rollout |

Launch customer activity remains in-app only. Email/WhatsApp/native push, recurring contracts, escrow, predictive market pricing and automatic fraud conclusions are outside the current approved launch scope. Their absence is not a broken API requiring implementation. Security verification/recovery delivery belongs to the identity service and is a different requirement.

## Accuracy against the chapter sequence

“Local implemented” means code and relevant automated behavior exist. It does not certify production readiness or every device/accessibility criterion. Scenario counts are planned acceptance rows, not counts of passing executable tests.

| Chapter | Planned scenarios | Audit disposition and evidence |
| --- | ---: | --- |
| 01 Foundations | 7 | Local database/config/migration/fixture/transaction controls implemented; all 15 SQL files match HEAD bytes. Security/runtime reliability and production setup remain F07/F09/Chapter 19 work |
| 02 Accounts/access | 8 | Verified local email/password, recovery, invitations, named memberships/context and revocation implemented; denied-role/estate/subject paths tested. Managed identity/security delivery and G14 remain |
| 03 Workspace/files | 9 | Versions, idempotency, private ready-file pipeline and attachment API implemented. Native consumer handoff F01 and production scanning/storage remain |
| 04 Tasks/clocks | 10 | Durable issuance anchors, leases/retries, role tasks, 2/5-BD responses, urgent coalescing and dated Admin follow-up connected. G02 and legacy list completeness F04 remain |
| 05 Verification | 8 | Human decisions, explicit category rules, required/optional credentials and expiry/restrictions implemented; no automatic verification. Subcontractor eligibility stays deferred |
| 06 RFQ/urgency | 10 | Manual privacy-reviewed publication, material revisions, grouping, sourcing and urgent coordination implemented. RFQ AI remains extractive; video/F01/F04 incomplete |
| 07 Quotes/Q&A/visits | 10 | Structured terms, optional PDF, expiry/hold, reconfirmation, private questions/shared answers and visit reveal connected. Warranty automation remains G04; broad device/usability sign-off open |
| 08 Selection/approval | 10 | Exact quote/version/settings/eligibility checks, comparison snapshots, threshold/reselection and selection clocks implemented. Current warning clearance is enforced; stale plan sentence F10 must be corrected |
| 09 Work/schedules | 10 | Start, unknown-estimate 24h duty, Admin extension, agreed/revised schedule, late notices and interruption implemented. Native history/offline capability remains partial |
| 10 Variations | 10 | Contractor terms, monetary authority, rejection rationale, feasibility-aware return contexts and warning holds connected. No approved pending delta becomes extra-work authority |
| 11 Completion/inspection | 10 | Combined ready-invoice/declaration, repeated rounds, invoice mismatch and acceptance reuse implemented. Fresh full-suite process failure affects verification confidence, though isolated completion passes |
| 12 Payments/closure | 12 | Exact confirmation, proof/partials, duplicate protection, per-transfer first-notice windows, actual/assumed receipts and closure guards connected. Current chronology/export omissions are F05/F06 |
| 13 QuoteFix fees | 10 | Separate ledger, independent 4% half-up components, original/incremental deadlines, offsets/refunds and specific restrictions implemented; fee-only data remains separate from estate views |
| 14 Cancellation/support | 13 | Immediate cancellation, notice-anchored claims, evidence/review/resolution/acknowledgment/execution, adjustments and controlled correction implemented. Full exception export F05 and G15 remain |
| 15 Feedback/aftercare | 10 | Full-settlement/date-precision anchors, due-only feedback, unable/unanswered paths and inspected aftercare connected. Fault percentages/warranty automation remain deferred |
| 16 Reputation/AI | 12 | Approved score formula, five-question rubric, verified-reference gate, moderation/replies/redaction and frozen advice evidence implemented. Moderation cap F04 and broader comparison/passport work remain |
| 17 Integrity | 12 | Prospective settings, four warning calculations, exact clearance/variation work holds, grouped notices and protected oversight implemented. No automated misconduct verdict; later proposals deferred |
| 18 Dashboards/exports | 10 | Canonical filtered/paged queues, analytics, role projections and immutable HTML/JSON exports implemented. F04–F06 establish remaining completeness gaps |
| 19 Release/operations | 12 | Diagnostics/recovery foundations implemented; **not complete**. Release manifest correctly refuses launch; fresh security/SDK/full-run issues and operational/device/accessibility evidence remain |
| 20 Native | 13 | Initial connected development client exists; **not complete**. F01–F03/F06/F08 plus device/background/store/retention gates remain; no completion reminder closure |

## API and cross-chapter connection audit

All feature route modules are registered by [API composition](../../apps/api/src/app.ts#L213). No entire domain module was found orphaned from the API composition. The following significant handoffs were traced through source and the existing real-boundary suites; targeted additional failures are explicitly listed above.

| Handoff | Current wiring / accuracy result |
| --- | --- |
| Identity → permissions → every domain command | Sessions re-read active membership; access version/CSRF/resource/subject checks apply server-side; cached command outcomes reauthorize |
| Contractor verification/fees → quote/select eligibility | Current category/credential/restriction checks are used at quote/selection. Clearing fee restriction does not clear other causes; selected work is preserved |
| Publish/material revision → opportunity notices → quote coverage → sourcing/selection clocks | Real publication/round/scope versions, `rfq.changed`, current distinct Contractor coverage and T16/T17 reconciliation are connected |
| Selection/MCST clearance → work authority → Start | Exact held selection creates work authorization/initial terms and genuine Start/scheduling responsibilities; original quote expiry does not undo a held selection |
| Variation → effective authority → return stage/invoice/inspection | Versioned accepted terms feed current total/scope and saved work context; flagged variations keep ordinary-work hold until explicit clearance |
| Completion → inspection → reconciliation → invoice confirmation | Ready invoice/declaration and exact current round feed acceptance; mismatch blocks financial confirmation; physical remedies require fresh rounds |
| Invoice/settlement confirmation → separate fee assessment | Confirmed full basis triggers independent 4% components; receipt/partial-transfer dates do not replace that trigger |
| Transfer → notice → receipt → settlement/closure → Feedback | First durable per-transfer notice anchors seven days; actual/assumed full settlement anchors 30-day feedback with retained precision; fees/Feedback do not block closure |
| Cancellation → claim → support → settlement/execution | Cancellation stops ordinary work; timely claims survive cutoff; financial/repair execution and exact inspection reuse govern resolution; Cancelled is retained |
| Feedback → moderation → reputation → comparison → selection snapshot | Moderated eligible evidence feeds approved formula; current fingerprints block stale decisions; selection freezes source evidence/advice |
| Integrity → warning/clearance → task/ordinary-work guards | Actual selection/variation guards enforce latest owner answers; prospective settings preserve history |
| Dashboard/export → current canonical records/access | Server projections/permissions and generation/download rechecks exist. Content completeness is partial, as reproduced in F04–F06 |
| Native upload → workspace/work evidence | **Broken final handoff: F01** |
| Gemini configuration → RFQ refinement | **Not connected**; configured provider is only supplied to comparison advice |
| Production identity/storage/scanner/monitoring | **Not implemented/integrated as production services**; config fails closed for staging/production rather than silently using local mocks |

Worker active handlers cover notification issuance, file scanning, RFQ refinement/change, quote/selection change and export generation. `workspace.changed`, `workspace.evidence`, `task.changed`, `work.changed` and identity membership/application events are recognized durable facts without a feature subscriber in the current worker. This is **not automatically lost business logic**: current business effects run transactionally and timers reconcile canonical data. These facts must not be presented as an implemented incremental native sync feed or external integration.

## Dead code and maintainability

Two small production-unused exports were verified by symbol-reference analysis:

- [calendar `feedbackDue`](../../packages/domain/calendar.ts#L22) is used only in a calendar test; live Feedback uses the distinct date/instant-aware [Feedback core function](../../packages/domain/feedback-core.ts#L14). Testing the old helper alone does not verify production dispatch. Current integration tests do cover actual Feedback paths. Consolidate or remove the duplicate helper when making a functional patch.
- [file-service `FILE_LIMIT`](../../packages/domain/file-service.ts#L16) is unused. Multiple request/client layers hardcode `10485760`, while the capability contract publishes another copy. Consolidate the limit into a shared contract to prevent drift.

`DeviceStore.removeUpload` is also uncalled and is directly relevant to F03. Recovery verification/release-evaluation functions are invoked by tools/tests and are intentional operational entrypoints, not dead application code. Fixtures, preview launchers and historical plan documents are likewise not dead production modules merely because the server does not import them.

Additional maintenance/release risks:

- Browser `typecheck` validates JavaScript syntax, not response-shape compatibility. Most web code is untyped; native transport uses generic casts. F06 demonstrates why successful compilation is insufficient.
- Many commands, dashboards and worker passes share one global advisory transaction lock, and several reconciliation loops scan all records. This is explicitly a bounded local monolith design. Pilot-size latency/throughput under concurrent media, decisions and timer load remains a release gate, not a proven production capacity claim.
- Holiday coverage is versioned to 2026–2027 and fails closed outside it. Assign an operator/process to extend and verify the calendar before coverage ends.
- The Windows helper regression fails under this environment's **PowerShell 7.6.5** with `Environment leaked after success: IDENTITY_ADAPTER`. Its null-environment restoration behavior needs compatibility review. The documented/CI **Windows PowerShell** invocation passes all nine checks. Preserve both results; do not claim the helper is shell-independent. Source: [environment restoration](../../tools/local-postgres.ps1#L98).
- CI runs strict checks, native compatibility/bundles and both database suites; it does not run the dependency advisory scan or documentation validator. The manually invoked release manifest also requires real evidence review and is not proof of sign-off by itself.

## Fresh verification record

| Check | Result on 27 October | Interpretation |
| --- | --- | --- |
| Backend TypeScript + browser syntax (`pnpm typecheck`) | Passed | Browser syntax only, not full browser behavior/typing |
| Native TypeScript (`pnpm mobile:typecheck`) | Passed | No device/runtime certification |
| Compilation (`pnpm build`) | Passed | Application compiles |
| Native Android/iOS JS export | Passed | Hermes bundles generated; no native executable/device proof |
| Expo SDK compatibility | **Failed** | F08 patch mismatches |
| Complete PGlite regression, two-file concurrency | **239 passed / 1 failed**, 240 reported records | Whole completion test-file process failed; not a full green run |
| Isolated completion diagnostic | **15/15 passed** | Separate diagnostic; does not supersede full-run failure |
| Complete PostgreSQL regression, two-file concurrency | **254/254 passed**, 0 failures/skips/cancellations; 860,667 ms | Isolated `quotefix_test` schemas; zero schemas left after teardown; no development fixture reset |
| Extra native/history/export/list reproductions | Confirmed F01/F04/F05/F06 | Tests assert observed gaps; not claims those features pass |
| Windows helper on Windows PowerShell | **9/9 passed** | Documented shell/CI path |
| Windows helper on PowerShell 7.6.5 | **Failed** | Exact environment restoration discrepancy retained |
| Documentation validator, with output writes suppressed | Passed | 20 chapters, 206 scenarios, 83 nodes, 202 edges, 23 timers, 34 diagram views, 1,015 local links including this report; structural validation does not detect F10's semantic contradictions |
| Dependency advisory scan | **12 affected entries / 8 distinct IDs** | 2 high, 5 moderate, 5 low; exploitability not established by counts |
| Common tracked-secret pattern scan | No candidate matches across 313 tracked files | Bounded pattern scan, not a complete secret/security certification |
| Exact SQL migration bytes vs audited HEAD | **15/15 unchanged** | No migration rewrite/line-ending mutation |
| `pnpm release:check` | **Blocked as intended** | Source evidence mismatch plus all 15 required check names; checked-in manifest is deliberately pending/blocked |
| Ordinary local API readiness | Unreachable at inspection time | Existing app not restarted as part of this report-only audit |

The previous 19 October CI pass remains historical evidence for that source. This audit does not claim a new remote CI run or a successful production restore/deployment on 27 October. Today's extra reproductions used a clean scanner test adapter, not an installed antivirus; the previous copied-artifact financial/evidence restore is dated 19 October.

## Recommended completion order

1. Repair F01/F02 and verify native capture can reach a usable workspace/work record while cold offline restart exposes only authorized local drafts. Add the ready-file cleanup in F03 after a confirmed consumption checkpoint.
2. Repair silent list limits, normalize Contractor chronology and include permitted cancellation/support outcome evidence in exports. Add regressions for **content completeness**, not only denied access and valid transport.
3. Update/review the security dependency set and SDK-compatible native modules together. Diagnose the recurring full-run PGlite process failure; retain the failure and do not equate isolated passes with a clean full run.
4. Reconcile active plan/status text with settled owner decisions. Produce an explicit owner review of still-partial RFQ AI and broad comparison/passport scope; do not silently drop approved capabilities or invent specialist policy.
5. Resolve the truly open release decisions, especially G14 and production operating targets, then integrate production identity/storage/scanner/hosting/monitoring. Complete all fourteen role journeys, accessibility, restore/rollback/capacity and current-source release evidence before an authorized pilot.
6. Finish physical Android/iOS/background-transfer/compatibility/store verification. Only at actual Chapter 20 completion trigger the owner's deferred fault/callback-percentage decision reminder.

Application fixes, dependency upgrades, policy decisions and deployment are not included in this report-only commit. The report records a concrete repair backlog and preserves the incomplete/failed evidence instead of declaring all twenty chapters complete.
