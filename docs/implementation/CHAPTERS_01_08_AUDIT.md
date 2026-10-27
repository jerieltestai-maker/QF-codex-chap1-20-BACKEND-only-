# Chapters 01–08 adversarial audit

13 October 2026. The owner requested a stocktake, decision alignment review, code cleanup and fixes. This record supersedes earlier test counts when describing the current local build; historical chapter records remain evidence of their original runs.

## Outcome

The approved local procurement path is implemented through work authorisation. The audit found concrete integration defects despite a passing 67-test baseline. The fixes below are applied. The final complete local run passed **79 reported tests, zero failures, zero skipped**. Strict TypeScript checking, unused-local/parameter checks, browser-script syntax checking and compilation passed. This is local verification, not production certification or a claim that every planned scenario has been executed.

## Stocktake

| Chapter | Current local behavior | Boundary |
| --- | --- | --- |
| 01 Foundations | Checksummed transactional migrations, environment isolation, PostgreSQL adapters, fixtures, money/time primitives and CI | Managed production infrastructure, operational recovery and server PostgreSQL execution remain release work |
| 02 Login/access | Named verified accounts, recovery, Admin invitations, contractor applications, estate/company contexts, role equality and immediate access revocation | Managed identity and retention/deletion policy remain gated |
| 03 Workspace/files | Private versioned jobs, attributable history, drafts, resumable immutable uploads, sanitized photos, operation receipts and confidential support intake | Full case execution is Chapter 14; production storage/scanner and native cache policies are not certified |
| 04 Tasks/clocks | Durable bell issuance, per-user reads, actor tasks, retry/failure queue, calendar arithmetic, urgency and dated Admin follow-up | Business timers bind only when their owning feature exists; G02 extra ordinary repetition stays open |
| 05 Verification | Explicit Admin trade configuration, profile/credential decisions, renewal/expiry, optional badges and independent restrictions | Actual prerequisites are configured after offline checks; subcontractor-based eligibility remains deferred |
| 06 RFQs | Manual reviewed publication/revision, linked separate repairs, priorities, privacy preview, sourcing/urgency and local extractive assistance | Optional video and production generative assistance remain unfinished |
| 07 Quotes/Q&A | Required terms, optional PDF/narrative, immutable revisions/reconfirmation, expiry, private questions/shared answers and approved visits | Warranty automation remains open; interruption/case resolution binds in later work chapters |
| 08 Selection | Exact eligible comparisons, frozen versions/terms, threshold decisions, held selections, approval/rejection, explicit new rounds, linked replacement and pause/resume clocks | Actual Start is Chapter 09; cancellation/support execution is Chapter 14; AI/reputation/integrity integration is later |

## Defects corrected

| Finding | Correction and evidence |
| --- | --- |
| Valid RFQ privacy preview rejected equivalent fields with a different JSON property order | Shared structural comparison now sorts object keys and preserves array order; client regression test distinguishes genuine scope/equipment/evidence changes. Verified through the actual browser preview |
| Lost response could strand a committed selection behind changed scope/closed quoting or a blocked retry form | Added **Check pending submissions**, backed by permission-checked operation lookup. Recovery confirms the old result without sending a decision. Original keys/versions survive uncertain retries; private form bodies are not stored in the receipt cache. Client tests exercise reload, missing receipts, changed input, offline and context-switch cases |
| A context could change while browser hashing was in progress | Submission captures and rechecks account/context generation before storing or sending an operation; tested with a deliberately delayed hash |
| Overlapping job loads could display history/facts from different jobs | Job loads now have a sequence guard and fetch history/support before installing a coherent view; opening a new draft invalidates outstanding loads |
| Closed quoting or a subsequent eligibility problem blocked access to photos already reviewed for the contractor's own quote | File authorization now retains sanitized evidence for exact owned historical RFQ revisions. API tests deny restricted originals, rivals and later unauthorised scopes while permitting historical and selected-contract evidence |
| A contractor who only asked a question lost its own published answer after selection | Historical revision ownership now includes the exact answered-question revision; API regression verifies retention after another company is selected |
| A material trade change removed the bidder from eligibility before its change notice was sent | Revision notices include affected prior bidders, explain reconfirmation/current eligibility and do not grant access to the new scope. API/worker test verifies one notice and denied new-scope access |
| Delayed quote/selection events could emit an update for a superseded version or round | Worker notifications check current round/quote or nomination version; withdrawal events now carry their actual version |
| Fee restrictions blocked approval of an already held nomination | Held approval excludes only the fee restriction under the approved selected-job exception. New selection still uses all restrictions; an independent Admin restriction still blocks approval. API regression verifies both conditions |
| Quote PDFs could satisfy credential evidence validation | Credential submission now requires a ready original uploaded for the credential purpose; API regression denies reuse of a quote PDF |
| Selecting a different credential file could reuse the previously verified file | Changing the file or renewal target clears its upload identity/readiness; a newly selected file must be processed before submission |
| Explicit quote/credential expiry times were silently truncated or omitted in browser editors | Editors preserve complete date or explicit timestamp values; date-only rules still apply on the server |
| Known estate addresses/no-photo identifiers and old contractor names could escape privacy checks | RFQ publication/preview and shared answers reject known private estate identifiers, including no-photo explanations. Quote/question concealment now shares a helper using current and historical company identities; regression verifies concealment after a rename while MCST retains its permitted history |
| No warranty alone was labelled as an unknown third-party service cost | Browser copy now distinguishes warranty absence from excluded disposal/making-good/equipment costs |
| Shared answers could overwrite an unsubmitted no-photo explanation, or classify a numerical question as a minor correction | Draft conflict checks include the explanation; numeric-question classification follows the same materiality safeguard as numeric answers |
| Selection UI omitted the irreversible authorisation/linked-ticket disclosure | Displayed the approved at/below-threshold disclosure and the recorded above-threshold nomination wording before explicit confirmation |
| Operation lookup omitted procurement settings and did not fully recheck task scope/Admin-only intent | Recovery now checks estate/task scope and the original privileged intent; setting-receipt regression verifies actor-only recovery |
| Unused code and browser syntax checks were not enforced consistently | Removed the unused Actor import and unused elapsed-time helper; enabled TypeScript unused-local/parameter checks and made all served browser-script syntax checks part of `pnpm typecheck` |
| RFQ fields had no usable device-only draft save/restore control | Added account/context/job-partitioned explicit RFQ draft save/restore. Restoration invalidates privacy/accuracy preview; browser check verifies restoration without publication |

## Verification and reproducibility

- Before changes: `pnpm check` — 67 tests passed.
- Initial focused regression run: `pnpm exec tsx --test tests/quoting.test.ts tests/web-client.test.ts` — 28 tests passed; two further privacy regressions were then added.
- Final complete run: `pnpm check` — 79 tests passed. The existing real SQL/API permission, concurrency, rollback, expiry, calendar, worker-lease, urgent-cadence, failed-notice and persistence regressions are included.
- `pnpm build` passed. The planning validator passed for 20 chapters, 206 planned scenarios, 83 nodes, 23 timers and 860 checked local links; these are documentation counts, distinct from the executable suite.
- Strict compiler and all browser scripts are checked by `pnpm typecheck`; no unused locals/parameters are permitted.
- Browser verification uses `tools/chapter78-preview.ts` with `QF_PREVIEW_PORT=3304`: a separate ephemeral database with fictional identities/data. Saved-field RFQ privacy preview, explicit device draft restoration, sign-out clearing, preservation of a full explicit quote-expiry timestamp with unchecked confirmations and the above-threshold nomination disclosure were verified. Browser connection/action timeouts were retried; screenshots are supplemental, not substitutes for API tests.

The new tests are in [quoting.test.ts](../../tests/quoting.test.ts) and [web-client.test.ts](../../tests/web-client.test.ts). Original coverage evidence remains in [01–02](CH01_CH02_VERIFICATION.md), [03–04](CHAPTERS_03_04_BUILD.md), [05–06](CHAPTERS_05_06_BUILD.md) and [07–08](CHAPTERS_07_08_BUILD.md). These test counts do not certify all 206 planned scenarios or later chapter integrations.

## Remaining gaps and explicit limits

1. **Approved but unfinished integrations:** optional video/derivatives and production generative assistance are still missing. Local assistance extracts provided facts; it does not perform a full generative/image-understanding workflow. Their absence is disclosed rather than represented as completed Chapter 06 capability.
2. **Later chapter bindings:** work progress, variations, completion/invoices, payments/fees, cancellation/claims and full support execution are not implemented here. A held contractor unable to honour its terms has no completed interruption/resolution path yet. Do not run a real-user pilot until these routes are wired. Recommendation/reputation, integrity, dashboards/export and native clients also retain their chapter ownership.
3. **Production validation:** this machine has no Docker/server PostgreSQL tools, so the configured server adapter/CI path was not run. Embedded PostgreSQL cannot prove pooled, multi-process locking. Managed identity/security delivery, production malware scanning/storage, backups/recovery, least-privilege database roles, load profiling and cross-device/offline QA remain release checks. PDF type validation is a signature check plus the configured scanner, not a claim of complete PDF structural validation.
4. **Privacy:** known-identifier redaction is not proof that arbitrary free text/images are anonymised. Human preview remains required; optional narrative/PDF and decision prose stay withheld from masked CM. Do not weaken this boundary to display unfinished passport/AI content.
5. **Schema/history:** the unused `files` scaffold in migration 001 was superseded by `upload_intents`/`file_objects`. No active path uses it. Preserve applied migration checksums and any retained rows; destructive schema/data cleanup is not introduced while G14 is open. Preview tools and historical build records are reproducibility artifacts, not alternate runtime implementations.
6. **Performance:** global command locking and whole-RFQ reconciliation remain the documented local monolith design. No claim of production throughput follows from this suite; scoped locking, query profiling and pagination remain Chapter 19 hardening.

G02/G03/G04/G08–G15 and deferred subcontractor-based eligibility retain their recorded status in [decision gates](DECISION_GATES.md). No scoring weights, warranty rules, additional reminder cadences, fee rounding, retention/deletion policy or production vendor was inferred during this audit.
