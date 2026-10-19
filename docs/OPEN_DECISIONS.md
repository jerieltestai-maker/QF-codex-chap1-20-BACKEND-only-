# QuoteFix decisions and remaining questions

## Chapters 19–20 construction and native scope — 19 October 2026

The owner authorises implementation and explicitly approves G13's initial scope: connected native screens for CM/MCST/Contractor/Admin; CM/Contractor capture first; persistent account-partitioned unfinished drafts/pending uploads only; confidential cases, payment proofs and other server records online-only; sign-out/account switching clears local data; no push notifications. G14 account deletion/retention, production providers and cloud/store release remain open. Real-device evidence is required before native completion; local automated tests alone cannot close that gate.

The owner confirms that neither physical-device setup is available. Initial local construction is recorded in [the build evidence](implementation/CHAPTERS_19_20_BUILD.md); Android/iOS runtime/background-transfer/store checks remain open. Do not mark Chapter 20 finished or its fault/callback policy reminder handled. No account deletion or production retention policy is inferred.

Both local full suites passed **254/254 records**, final affected PostgreSQL **21/21** (overlap), with nine Windows helper checks and strict checks/bundles/docs. Source **`c045cd8` passed [CI run 39230858747](https://github.com/jerieltestai-maker/QF-codex-chap1-20/actions/runs/39230858747)** with actual logs inspected: 254/254 on both adapters plus native/Windows checks. Isolated PostgreSQL restoration matched every table and evidence checksum. This evidence closes those engineering checks only: G14, physical devices/OS transfers, production providers/monitoring/rollout, complete native workflow parity and three Expo/Metro toolchain advisories remain outstanding.

The old API later stopped for an unknown reason. Its original database/markers were preserved; a verified **1,476-file** cold copy retained all **114 existing table contents** through additive migration. Only ignored DATABASE_PATH changed; provider settings stayed intact. Updated foreground API **PID 10444**, port 3000, passed readiness/capabilities/authenticated operations and all **six autofill checks** after hash-verified recovery/normal sign-in of the existing cached Admin credential. No password reset, fixture installation into existing data or evidence deletion occurred. [Build evidence](implementation/CHAPTERS_19_20_BUILD.md) records the initial checks, hidden-launch rejection and successful foreground alternative. Chapter 20 remains unfinished.

## PostgreSQL setup follow-up audit — 19 October 2026

Final code checkpoint **`e7c5ee0` passed CI**: 233/233 records on PGlite, 233/233 on PostgreSQL, eight Windows helper checks and strict checks/build. Actual logs were inspected; the audit links run 39208120867. This includes all final error guards and launcher changes. Subsequent evidence edits are documentation only. The intermittent local abort/timeout remains a disclosed reliability concern; no production/scanning/recovery gate was silently closed.

Final addendum: a live malformed-ID/origin request exposed raw database details when the audit hook threw during an existing error response. Canonical UUID guards and local sanitized `onSend` error handling now preserve privacy for allowed/denied/download responses; attachment headers are removed on failure. The affected PostgreSQL suites passed 29 records, and final sequential protected/download checks passed 2/2 on each adapter. The complete 233-record local run predates this last guard; final source CI is tracked in the audit. API startup commands now use direct Node `--import tsx` rather than a nested launcher.

Final running state supersedes the first restart below: a later session interrupt left runtime markers, which were preserved in the original directory. A new recovery copy matched all 1,475 persistent file checksums. Only the ignored DATABASE_PATH changed, to `work/development-db-setup-audit-final-d99bff06912b4ec6961f306c3f3b396b`; provider settings were preserved. Helper keys were retained, and a cached Admin credential was recovered with a verified preserved legacy key and refreshed through normal local sign-in, without a password reset. All six live autofill checks and both apps' malformed-ID guards passed. The normal API is independently running at port 3000 (API PID 14344); the PostgreSQL preview was stopped. No original markers/data were deleted or fixtures installed in the existing PGlite data.

The **final complete bounded local run passed 233/233 records**, zero failures/skips/cancellations, with two-file concurrency (974,290 ms). The restarted normal app remains ready; the test database has zero leftover schemas. Eight Windows helper checks, strict checks/build/docs and actual snapshot-bound copied-artifact restore verification also passed. Source checkpoint `0665312` passed full 233-record suites on both adapters plus eight Windows checks in GitHub; later source `ea8ee56` has its own CI link in the audit. The failed local run and unresolved cause remain explicitly disclosed below.

The first complete follow-up run was **232/233 passing**, with an unexplained WebAssembly abort in the embedded persistence probe; the same probe passed alone. This is explicitly retained as a failure. Local helper concurrency now defaults to two (range 1–4), and disposable persistence probes use guarded OS temporary directories instead of accumulating synced database files. The complete bounded rerun is recorded separately; an eventual pass does not establish the abort's cause. No tests were skipped/retried automatically or assertions weakened.

The owner requested another full audit and authorised fixes. [Audit findings and evidence](implementation/LOCAL_POSTGRES_AUDIT_2026_10_19.md) correct shared-host session cookies, inherited Docker/Compose targets, development defaults during tests, unsupported/multiple Node executables, narrow/non-repeatable backup evidence, missing audit-failure/Windows CI coverage and stale seed metadata. The PostgreSQL preview now uses `http://localhost:3001`, while the existing app uses `http://127.0.0.1:3000`. Eight isolated Windows helper checks and both adapters' two protected-access regressions passed. The complete corrected PostgreSQL helper run and fresh CI are tracked separately in the audit.

The new repeatable backup command restored the actual Windows artifact into a fresh database and matched all 115 public tables/38 rows against the exact dump snapshot, with dump checksum recorded. Database-only scope excludes helper keys/mailbox/external evidence. The normal PGlite app was gracefully stopped, all 1,475 cold files copied and checksum-verified, then restarted on current source with the same `.env` bytes and database path (PID 32212). No reset/reseed, stale-marker removal or paid AI request occurred. PostgreSQL remains separate fictional data; no cloud provider, production release, scanning or open product policy was silently completed.

## Owner-authorised local Docker/PostgreSQL setup — 19 October 2026

Final local verification: **232/232 PostgreSQL 18.6 records passed**, and **44/44 affected PGlite records passed** (overlap), with strict checks, compilation and documentation validation. A PostgreSQL preview passed readiness/login/context checks and was stopped; container restart preserved all seed counts, and the test database retained zero test schemas. The existing PGlite app remained healthy. Runtime source/setup is pushed in `5b5a1a1`; the execution record separates remote CI from these local results.

The owner installed Docker Desktop and explicitly authorised configuration, fictional seeding and version-controlled records. WSL 2 launches and the Linux Docker engine is running after clearing a stale startup precondition. The existing Compose PostgreSQL 18 service is healthy with separate development/test databases. All 13 migrations applied; repeating the seed preserved 6 users, 6 memberships, 2 estates, 1 unverified organisation, 2 approved development warning settings and 0 jobs. No current PGlite data or `.env` was switched/reset, and no paid service was provisioned. `tools/local-postgres.ps1` supplies repeatable setup/test/status and a separate foreground preview on port 3001, with scoped environment overrides and local advice.

[Execution record](implementation/LOCAL_POSTGRES_2026_10_19.md) documents a real local dump/restore check and server compatibility corrections: explicit JSON-array serialization at warning/support/correction writes; protected-access evidence committed before releasing the HTTP response; driver-neutral assertions for cents/counts without changing integer parsers. The initial GitHub PostgreSQL run failed (206/231 passing), and the intermediate focused run exposed one additional correction writer (34/35 passing); these failures are not presented as passes. Final regression status belongs to the execution record. Production providers, real-data migration, scanning, release gates, open product policies and the Chapter 20 reminder remain unchanged.

## Git checkpoint published — 19 October 2026

The audited Chapters 01–18 baseline is committed and pushed to `origin/codex/chapters-01-18-baseline`, retaining the repository's initial commit. [Draft PR 1](https://github.com/jerieltestai-maker/QF-codex-chap1-20/pull/1) makes the import reviewable. This resolves the earlier absence of a committed source baseline. Ignored runtime/configuration/key/data paths were checked; common credential-pattern scanning found no candidate secret in the source set. Every staged SQL migration matched its original working-file bytes. GitHub verification status must be checked separately from successful source publication; no production deployment or cloud purchase occurred.

## Version-control repository designated — 19 October 2026

The owner explicitly designates the private GitHub repository https://github.com/jerieltestai-maker/QF-codex-chap1-20 for version control and requests guidance on remaining infrastructure setup. Preserve its initial README history; use codex/ work branches and reviewable commits. Keep local secrets, operational data, upload/recovery folders and generated outputs out of source control. Checksum-protected SQL migration bytes must survive Git line-ending handling unchanged.

[Owner setup guide](implementation/SETUP_GUIDE.md) explains the next local PostgreSQL 18 step (Docker Desktop/WSL 2, not found on this machine), the existing temporary PostgreSQL GitHub Actions service and later production requirements. Supabase plus an application/continuous-worker host is a recommendation only; provider versions, budget, region, production identity/storage, deployment and paid provisioning are not approved by this repository instruction. Existing open product policies and the Chapter 20 reminder remain unchanged. No current PGlite data migration or reset is authorised by merely installing PostgreSQL.

## Chapters 09–18 adversarial stocktake — 18 October 2026

The owner requested an adversarial quality/alignment audit. Five integration defects were reproduced/observed and fixed: losing bidders' access to another Contractor's cancellation history; incomplete payment issue/receipt/verification paths for cancellation settlements without an invoice/work authorisation; incorrect stage restoration on warning clearance with a pending variation; stale canonical queues after Support actions; and current work-authority wording after cancellation. Ordinary/cancellation payments now share one browser component; an unused authority helper and stale current chapter/generator wording were removed/corrected. No open product policy was decided.

The **final complete bounded regression passed 231 test records**, zero failures/cancellations/skips/todos; strict TypeScript/browser syntax checks, compilation and documentation validation passed. The latest affected suites passed **47** records (overlap). Two unrestricted runs lost different test-file processes without assertion details; isolated local-account/procurement checks and an intervening 230-record full run passed. Test entrypoints now cap file concurrency at four. Root cause of those process exits is not established; failed/interrupted runs are explicitly retained in [the audit](implementation/CHAPTERS_09_18_AUDIT.md), not reported as passes.

An isolated fictional real-browser walkthrough verified invoice-free cancelled-settlement actual receipt, correct cancellation wording, zero outstanding settlement and immediate queue removal, with no browser errors. The normal API is running on port 3000 with the fixes. Restart and later execution-session recovery each verified a preserved **1,476-file** database copy; final recovery moved both inspected runtime markers reversibly. No data/evidence deletion, reset, fixtures, configuration change or paid live AI call occurred. Chapters 19–20/production PostgreSQL, broader device/accessibility checks and existing deferred policies remain outstanding. Git has no committed baseline and all source remains untracked; this requires a reviewed source-control checkpoint.

## Chapters 17–18 local completion — 18 October 2026

G12 is resolved by the final direct answers below and implemented with exact settings snapshots, grouped warnings, explicit clearance/work holds and private oversight. Chapter 18 adds canonical authorised queues/search/history/analytics and role-filtered immutable HTML/JSON decision packs with generation/download rechecks and revocable grants. [Build evidence](implementation/CHAPTERS_17_18_BUILD.md) maps all 22 planned scenario IDs. The complete suite passed **223 records**, zero failures/skips; latest UI guards **5 passed** (overlap). Strict checks, compilation and documentation validation passed; focused real-browser creation/download/clearance and narrow-screen keyboard checks worked. The normal persistent API runs the new migrations, with verified data-preserving recovery documented in the build record. Production PostgreSQL/release, native PDF generation, retention, ordinary extra repetition, warranty and other existing deferred policies remain separate; no production release is claimed.

## G12 resolved for Chapters 17–18 — 18 October 2026

Owner's final explicit answers override prior advisory-only/no-extra-approval wording. Defaults **20% revision / 30% selected gap / 20% cumulative growth / 3 quotes**, inclusive equality, no SGD floor, same-material-scope first quote baseline. New quotations strictly positive; legitimate zero-payable settlements/invoices and historical records preserved. Cumulative growth uses approved total plus exact proposal delta against selected quote; pending work stays unauthorised.

Flagged CM selections require MCST clearance before Start even below threshold; revised-quote clearance follows only the chosen exact flagged quote. A flagged variation pauses all ordinary work, including after withdrawal/rejection, until MCST explicitly clears continuation; make-safe documentation remains available. Dedicated clearance requires explanation, exact version, actor/time; other review dispositions do not clear. MCST Select and approve may include explicit clearance in the same transaction. Both MCST/Admin receive grouped warning notices immediately. Protected-access details are Admin-only; MCST summaries require explicit Admin approval. Estate next-round and ticket future-event settings acknowledgments/old records preserved; Admin may edit. Later optional integrity proposals remain deferred. G12 no longer blocks this approved scope. Existing Admin reasoned-override authority remains; allegations never become automated findings.

## Chapters 17–18 construction and G12 partial resolution — 18 October 2026

Further owner answers supersede older proposals: strictly positive new Contractor quotes (SGD 0.01 minimum), inclusive percentage thresholds, and selected-baseline versus proposed new total for variation warnings approved. Zero-payable settlement/invoice correction is unaffected. Owner requires MCST clearance before affected work proceeds, superseding advisory-only launch policy. Still asking: below-threshold flagged selection routing, pause of already-authorised work during flagged variations, whether quote-revision clearance binds only the chosen flagged quote, and explicit clearance evidence. Those details are not silently implemented.

The owner authorises local construction with backend correctness/simple code and thorough verification. G12 defaults explicitly approved: quote revision **20%** (both directions, same scope), selected-price gap **20%**, cumulative variation growth **20%**, quote count **3**. Admin may edit alongside existing MCST settings. Required unchecked acknowledgment/note explains prospective application and preservation of earlier quotation/decision/warning values and percentages (estate: next RFQ round; ticket: future events). Exact equality, zero/missing baseline handling, variation calculation, review blocking and notification/access recipients remain pending separate answers. Do not infer approval from the earlier bundled questions.

## Chapters 13–14 build alignment — 18 October 2026

The authorised local build now includes private fee statements/verified allocations/refunds, cancellation/claims, job and organisation/estate account support, exact settlement adjustments, actual execution verification and controlled Admin correction. G08/O37-C is resolved by the direct answer below; other policy gates are not silently closed. The final combined suite passed **195 tests** and the latest affected UI/upload/retry suite **16 tests** (overlapping), with zero failures/skips. Strict checks, compilation and documentation validation passed; focused fictional browser fee/case navigation worked. [Build evidence](implementation/CHAPTERS_13_14_BUILD.md) distinguishes implemented flows from production PostgreSQL/release checks. Aftercare/Feedback use the concurrent Chapters 15–16 integration and their latest explicit decisions. Archival and retention remain open.

## Chapters 15–16 implementation/provider status — 18 October 2026

G09/G10/G11 are resolved for the approved formula, required five-question rubric, missing/contested-data handling, moderation/redaction and refresh rules below. [Build evidence](implementation/CHAPTERS_15_16_BUILD.md) records implementation/checks. Late assessable observations count with the actual date. Fault/callback percentages and specialty-strength thresholds remain deferred. Revisit fault percentage policy at Chapter 20 completion as requested; a chapter checkpoint and scheduled milestone monitor preserve this.

The owner selected Gemini and saved a replacement key locally at the hidden prompt. **Gemini 3.5 Flash-Lite passed one fictional anonymous live comparison check.** The normal local API is running with opt-in Gemini integration and current migrations. This resolves the provider for local comparison advice, not production release, bulk ingestion, retention or other AI features. [Setup/cost boundaries](implementation/GEMINI_SETUP.md). This supersedes earlier pending-key/provider statements for this scope.

## Chapters 15–16 explicit answers — 18 October 2026

**Follow-up answers:** late assessable ratings count in general durability with the true observation date; no fabricated first-month timing. Fault/callback percentages are explicitly deferred by the owner, who requires a reminder when Chapter 20 is finished. Add that checkpoint to Chapter 20; the reminder must not silently decide counting/attribution/window rules. Gemini is the owner's chosen provider; cost-efficient Gemini 3.5 Flash-Lite is the current recommendation, pending key/model activation and live checks. No API key belongs in chat, browser JavaScript, audit or source control. Strong-specialty evidence thresholds remain open.

G09/G10/G11 resolved for the approved implementation scope by direct owner answers. Score inputs map 1–5 to 0/25/50/75/100; specific dimensions weight 1, recommendation 1.2, assessable durability 1. Require complete inspection answers, omit unavailable/contested durability, average once per job. Include external references only after five independently verified complete references; then references/jobs are equal units. Primary/secondary priority multipliers 1.25/1.10; display one decimal; No preference identical to pure. Preserve source counts and formula/input snapshots.

Use the five proposed inspection questions in REPUTATION_FEEDBACK_MODEL.md, all required; require a short reason for any 1–2-star or Disagree/Strongly disagree answer. Save drafts; ratings do not gate operational work acceptance. Recalculate on eligible evidence, moderation or formula change; advice generated only on explicit request and stale advice rejected. Voided feedback remains readable with grey background/legible text, without public exclusion label/private reason. Admin redaction of private/abusive content is authorised with audit.

The owner approves supported aftercare links and explicit dependency boundaries, and confirms Chapters 13–14 are being built simultaneously in another chat. Do not duplicate or overwrite that implementation. Defect attribution/percentage denominator, strength thresholds and other specialist/provider/retention/warranty gates remain open where not covered by these answers. Historical G09–G11 open statements below are superseded only for this agreed scope.

## Chapters 13–14 explicit answer — 18 October 2026

Local construction is authorised with backend correctness, simple code and thorough verification. **G08/O37-C resolved:** the owner approves independently rounding each 4% platform/lead component half-up to the nearest SGD cent. SGD 1.13 assesses SGD 0.05 + SGD 0.05. This supersedes historical unresolved G08 wording for this scope. Original fee deadlines, incremental adjustment deadlines, offsets, actual refund recording and separate account visibility remain confirmed. Archival and other unrelated open gates remain unresolved.

## Chapters 11–12 interruption audit alignment — 15 October 2026

The owner-requested [audit](implementation/CHAPTERS_11_12_AUDIT.md) maps all 22 planned verification IDs to concrete assertions and identifies scoped integration/visual limits. Corrected deadlock/deadline ordering, unpaid-balance/evidence paths, genuinely optional wire fields, follow-up replacement/countdown, offline recovery and test-validity gaps implement existing decisions. The background regression passed **126 tests** and the final affected-suite rerun passed **33 tests**; these overlap. Strict checks, compilation and documentation validation passed; actual Chrome workflow verification was blocked by input/CDP timeouts.

G08 fee arithmetic and G10 ratings remain deferred by the owner's direct answers. Comprehensive cancellation/amended settlement/general case execution, Feedback and release/provider/retention/warranty policies stay in their existing chapters/gates. The new contextual unpaid-balance case is a Chapter 12 payment primitive, not a claim that Chapter 14's full support workflow is implemented. No unresolved policy was silently closed.

## Current local construction through Chapters 11–12 — 14 October 2026

Completion/repeated inspection, exact invoice reconciliation/MCST confirmation, transfers, per-transfer actual/assumed receipts, payment support and guarded closure are locally implemented. The full regression suite passed **113 tests**, and the **15-test** financial/completion suite passed again after the final partial-update and unresolved-verdict fixes. Strict checks, compilation and documentation validation passed. [Build evidence](implementation/CHAPTERS_11_12_BUILD.md) records executed behavior and the unavailable visual walkthrough. An unverified Admin verdict keeps the dispute and a dated follow-up; it does not fulfil the receipt/case obligation.

The scope answers below defer G10 ratings to Chapter 16 and leave G08 rounding/arithmetic open for Chapter 13. Fee collection, comprehensive cancellation/support/amended settlements, Feedback and production release remain in their owning chapters. Other existing open decisions retain their recorded status. Earlier current-suite/construction statements below are historical and superseded for this scope.

## Chapters 11–12 explicit scope answers — 14 October 2026

The owner authorises local construction with backend accuracy and simple code first. **G10 remains deferred to Chapter 16:** implement the operational inspection checklist and acceptance separately from reputation questions. **G08 remains open for Chapter 13:** the owner explicitly leaves fee arithmetic there. Chapter 12 records the exact confirmed invoice/billing source without inferring rounding or claiming that actual fee assessment/collection is complete. Previously settled financial triggers/rates/basis/deadlines are preserved.

## Current local construction through Chapters 09–10 — 14 October 2026

Actual Start/progress, schedule acceptance, initial-estimate exceptions, interruption and immutable variations are locally implemented. The complete **98-test** local regression suite, strict checks, compilation and documentation validation passed; [build evidence](implementation/CHAPTERS_09_10_BUILD.md) records later completion/inspection/finance/cancellation/support and release bindings. G03 and the MCST monetary-limit clarification are resolved by the direct answers below. G02/G04/G08–G15 and previously deferred specialist/provider/retention policies remain open where recorded. Historical construction/planning counts below are superseded for current scope, not erased.

## Chapters 09–10 explicit answers — 14 October 2026

The owner authorises local Chapters 09–10 construction, prioritising backend correctness and simple code. **G03 resolved:** request a Contractor start-date proposal when no agreed date exists; CM/MCST accepts the exact schedule; use the existing 2/5-business-day actor/Admin response follow-up from successful initial notice issuance. No automatic actual Start or invented completion date.

**Variation authority resolved:** CM may approve within the last MCST-approved amount even above the estate threshold (SGD 1,000 approved → SGD 900 → SGD 950). Preserve the prior MCST limit through CM reductions; above-threshold increases beyond it require MCST. Reductions still require explicit agreement and immutable audit. No fee, reputation, warranty, retention or ordinary extra-repeat policy is resolved by these answers.

## Chapters 01–08 audit alignment — 13 October 2026

The owner requested a full stocktake and authorised fixes/refactoring. [Audit findings and scope](implementation/CHAPTERS_01_08_AUDIT.md) record the corrected integration defects and **79 passing local tests**. Held nominations now respect the already approved fee-restriction exception; current credential/Admin restrictions remain checked. Preview, recovery, historical file/Q&A access, precision and known/historical identity privacy fixes implement existing decisions rather than resolve new policies.

Optional video/production generative assistance, later chapter bindings and production checks remain disclosed work. G02/G03/G04/G08–G15, warranty/retention/scoring/vendor gates and deferred subcontractor-based eligibility retain their existing status. No new owner answer was needed or inferred.

## Current construction through Chapters 07-08 - 13 October 2026

Local quotations/Q&A/visits and comparison/selection/approval are implemented under the owner's explicit authorisation. [Build evidence](implementation/CHAPTERS_07_08_BUILD.md) and [ADR 004](architecture/ADR_004_QUOTES_AND_SELECTION.md) distinguish the 65-test local suite and simple web controls from later Start/work/finance and production validation. G05 is resolved below; G06/G07 remain resolved under the previous direct answers. No open reputation/integrity/warranty/retention/provider policy is silently resolved. This update supersedes historical construction/stack status statements below.

## Chapters 07–08 explicit answer — 13 October 2026

The owner authorises construction. **G05 resolved by direct answer:** prefill an editable 30-calendar-day quote-expiry suggestion and require explicit Contractor confirmation. The Contractor may change it; reconfirmation never silently extends the original expiry. RFQs have no expiry. G04 warranty automation and specialist scoring/risk policies remain open where previously recorded.

## Chapters 05–06 explicit decisions — 13 October 2026

Construction is authorised with backend accuracy and simple code as priorities. **G06 resolved by direct answer:** an Admin-managed trade matrix starts unconfigured with no assumed certifications. Admin explicitly configures each trade before eligibility is enabled. The accountable contractor must be verified for every trade in a combined RFQ; subcontractor-based eligibility awaits separately defined rules.

**G07 resolved by direct answer:** CM/MCST authors classify RFQ revisions and record a reason. Scope/quantity/price-relevant terms/safety/access changes are material and require quote reconfirmation; spelling/formatting corrections are minor. Uncertain changes are material. AI cannot downgrade a revision. Historical open G06/G07 text below is superseded for these approved branches; no exact statutory certification list is inferred.

**Construction update — 13 October 2026:** local construction now includes Chapters 05–06 after 01–04; [build evidence](implementation/CHAPTERS_05_06_BUILD.md) and [ADR 003](architecture/ADR_003_VERIFICATION_AND_RFQ.md) record verification, publication, privacy and timers. G06/G07 are resolved by the explicit answers above. Subcontractor-based eligibility remains deferred; optional video and a production generative AI adapter are follow-up implementation work, not silently invented defaults. G02 further ordinary repeats, G14 retention/deletion and production providers remain open where previously recorded.

Lifecycle current through 12 October 2026, **2026-10-12-v14**; chaptered implementation plan **0.3**, prepared 13 October 2026. Web first with future iOS/Android sharing the backend is confirmed; O37-A offline drafts/uploads with online decisions is approved. Latest section supersedes historical entries; no application implementation or final stack/vendor approval.

## Confirmed decisions and explicitly reopened policies

| ID | Decision |
| --- | --- |
| C01 | Product name: **QuoteFix**. |
| C02 | First release is exclusively for **one-off maintenance jobs**, initially handyman, plumbing and electrical work. Recurring retainers/term contracts are later. |
| C03 | The first release must include variations, completion evidence, ratings and export, as well as procurement through CM contractor selection and any required MCST approval. |
| C04 | A minimum quote is the final amount payable by the MCST plus compulsory Yes/No declarations: waste disposal, warranty, making good, **GST charged?**, and access equipment when flagged. **28 September update:** the discussed follow-up fields (warranty duration when warranty is included, earliest availability, expected duration, and exclusions) are mandatory when applicable, using predefined choices plus **Other** with an open response. Narrative terms beyond these fields and the contractor's own quotation PDF remain optional. Quotes with other missing detail remain selectable with visible cautions and acknowledgment; required follow-ups cannot be omitted under this allowance. Each declaration has a two-sentence information icon; see `QUOTATION_FIELD_COPY.md`. |
| C05 | A CM sees quote prices and contractor identities during the quotation phase **by default**. The MCST may turn CM identity visibility off. MCST users and platform admin always see identities; rival contractors never see one another's quotes. |
| C06 | RFQ stays open until explicit selection or cancellation; no deadline expiry. Selection freezes quotes/revisions while MCST approval is pending. **Q19 exception approved 5 October:** MCST rejection before work authorisation permits another valid selection or an explicitly reopened quotation round on the same ticket. Preserve all rounds/versions/decisions. After work authorisation, replacement requires a linked new ticket; update earlier irreversible popup accordingly. |
| C07 | A contractor can request a site visit only after an initial quote. A post-visit quote revision is allowed with a recorded reason. The audit trail must compare initial quotation, revisions and final invoice to make unexplained price growth inspectable. |
| C08 | At or below the estate's preset threshold, a CM may select a contractor with a written rationale and authorize that contractor to proceed. Above the threshold, one named MCST user must approve the CM's selected contractor before that contractor may proceed. MCST users see the full ticket history. Threshold calculation includes GST and variations; a variation crossing the threshold needs MCST approval before it takes effect. |
| C09 | Contractor-funded model: **4% platform fee plus 4% lead fee**, each on the MCST-confirmed invoice/settlement including approved variations, GST and billables. **MCST confirmation** assesses fees and starts **three business days**; owner expressly reconfirmed this after Q3. Contractor actual/deemed receipt never changes the fee trigger. Calendar/manual collection/new-quote restriction are C70. |
| C10 | Compare the selected contractor's quote with the highest received quote and arithmetic average, using “{contractor name}'s price vs Highest Quote” and “Price vs Average Quote.” Use a stable alias where MCST has hidden identity from the CM. Use the latest active, valid quote per contractor for the current request version; exclude withdrawn, superseded, expired and materially outdated/unreconfirmed quotes. There is no extra “selection-ready” status. Freeze the comparison set at selection, show count and material scope/term differences, use price-difference wording rather than proven savings, and explain that one eligible quote offers no peer comparison. Resolves O03. |
| C11 | AI may repeat technical details the CM provided as facts, without inventing them. An expert-assessment category flag warns the CM but does not block publication. |
| C12 | No managing-agent company account or MA role in the first release. CM and MCST users are restricted to their own condo; platform admin has cross-estate visibility. |
| C13 | MCST chairperson/council users have named logins, not a shared condo credential. |
| C14 | The product owner's recent chat decisions are authoritative; there is no need to wait for older MVP or decision documents. |
| C15 | Approved UX9: contractor supplies the compulsory invoice and final irreversible completion declaration in one form, then slides to submit both together before CM review. This supersedes the earlier declaration-then-upload sequence. **Completion photos/evidence are optional**, superseding the prior mandatory-photo rule. Show before/after evidence when available. Contractor completion is not CM acceptance, MCST confirmation or closure. |
| C16 | CM reviews work quality, completion, agreed scope, approved variations and charges. CM may file an open-ended dispute about unsatisfactory or incomplete work, scope mismatch or overcharging; the contractor can respond, remedy and revise the invoice. Every claim, response, remedy and revision is logged. |
| C17 | After CM review and required approvals, named MCST confirms the exact reconciled invoice version/amount; freeze confirmer/server timestamp/version. This assesses fees. Close only when accepted work, confirmed invoice, full payment settlement and no blocking case remain. Compulsory Feedback and QuoteFix fees do not block closure; cancelled jobs retain the cancellation outcome, with Admin Intervention as the active display when a claim is reopened. |
| C18 | Confirmed financial records cannot be silently edited. Owner approved and expanded the linked correction mechanism to **Request Admin Support**, available across the lifecycle and after closure. Preserve original records and attributable adjustments. Admin financial override authority is accepted; exact fee credit/debit and deadline effects remain O05. |
| C19 | The compulsory tax declaration is named **“GST charged?”**. A Yes answer means applicable GST is already included in the final amount payable; a No answer declares that none will be charged. |
| C20 | MCST rejection of a CM nomination before work authorisation is **not terminal for the ticket**. CM can reselect a valid quote, MCST can Select and approve, or CM/MCST can explicitly reopen quotations. Optional rejection rationale and all decisions audited. This supersedes the earlier new-ticket requirement in this interval only. |
| C21 | CM/MCST may cancel directly with a mandatory reason **before work authorisation**, now explicitly including after selection but before required MCST approval (1 October). Preserve history and notify relevant parties. This does not reopen a selected ticket's quotation phase. |
| C22 | **Superseded:** there is no longer an admin approval gate for post-authorisation cancellation. CM/MCST cancellation is immediate with a mandatory reason; contractor may subsequently request Admin Intervention and claim incurred expenses. |
| C23 | CM/MCST confirmation immediately cancels further ordinary work and notifies the contractor. Show cancellation reason and Okay / Admin Intervention. Admin does not need to accept the cancellation before it takes effect. |
| C24 | **Superseded:** ordinary admin rejection of a cancellation request is removed. Admin may explicitly backtrack a job under approved powers, preserving the cancellation and a reasoned override; this is distinct from the contractor opening a claim. |
| C25 | Immediate cancellation stops ordinary work/new commitments; necessary documented make-safe actions, evidence and incurred-cost records remain possible. Opening Admin Intervention does not itself restore work or quoting. |
| C26 | Working terminology identifies the action and actor: **CM selects a contractor** based on a specific quote version; **MCST approves or rejects the CM's contractor selection** when threshold approval is required; the resulting state is **Work authorized** and the selected contractor may proceed. Avoid the ambiguous term “award” in working copy and future domain names. |
| C27 | All four platform roles have an **in-app notification bell**, focused on the responsible stakeholder's next action and relevant updates. No email or WhatsApp for launch; notify only responsible/relevant authorised recipients. Description changes and quote expiry generate automatic notices. The exact CM/MCST manual button label is **“Prompt Contractor to Re-Quote”**. Only material description changes require quote reconfirmation. Read/unread status is not approval or task completion; detailed grouping/throttling remains a design recommendation. |
| C28 | Job-first UX: one continuous job workspace shows current stage, important facts, responsible next actor and next action; detailed history and platform analytics are available as secondary views. |
| C29 | Flexible issue intake: problem description, affected location, urgency and available evidence; encourage one clear photo, allow “Cannot provide a photo” with an explanation, video optional. Ask relevant follow-ups, with AI assistance and a manual route. The owner now approves pre-quote shared clarification via controlled Q&A (C55), separately from the post-initial-quote site-visit rule. |
| C30 | CM chooses combined or separate repairs via toggle/information icon. Combined ticket receives whole-bundle quotes from one accountable contractor. Disclosed subcontracting is allowed under that contractor, retaining one quote/invoice/contact. Admin configures category/scope prerequisites under the accepted Q9 model. |
| C31 | Priorities guide comparison and AI recommendations, without altering contractor eligibility. Owner approved one primary and optional secondary choice from earlier availability, lower total price, demonstrated workmanship, experience with similar work, and less disruption. Include **No preference**, which applies no CM preference weighting. An information icon must explain that selected priorities make AI more likely to recommend contractors whose recorded performance matches those priorities. Exact evidence/scoring weights remain open; No preference is not a hidden cheapest-contractor rule. |
| C32 | Urgent RFQs alert admin in-app; humans coordinate offline without bypassing verification/approval. Named admin claiming, attempts/ETA, next update and unresolved sourcing outcomes are approved. Actual coverage/staffing remains O14. |
| C33 | Admin manually verifies before quoting, checking authenticity offline. Admin may add credential types/records, optional expiry dates and verification decisions. Expired badges grey out; admin gets a reminder **one calendar month before expiry**. Company/person holders, configurable category prerequisites and optional/mandatory expiry effects are accepted in Q9. |
| C34 | CM previews the contractor-visible RFQ. Exact estate identity/address is revealed only on CM-approved site visit or work authorisation, not earlier. Retain restricted original evidence and provide a reviewed/sanitised contractor-facing copy. Omit approximate area and other site information unless needed for responsible pricing; never conceal material safety/access/pricing conditions. The intent is to reduce estate-profile price discrimination. |
| C35 | Initial quotes are immediately selectable under the ordinary validity/current-scope rules. There is no “site assessment required before selection” gate and no extra “selection-ready” status. The contractor is responsible for timely revisions before selection. Site visits remain permitted only after an initial quote; selected quotes stay frozen. |
| C36 | Version description changes and automatically notify affected contractors; CM/MCST can also use “Prompt Contractor to Re-Quote.” Material changes require reconfirmation or revision before the old quote can be selected; minor corrections do not. Owner approved controlled shared Q&A in C55; material published answers follow this same versioning rule. |
| C37 | Unselected quotes expire (suggested contractor-editable 30-calendar-day default) and cannot be selected; RFQs never expire. A valid selection holds scope/price throughout required MCST approval. Original expiry creates no new status or requote path. Required quotation checkbox records this commitment; O17 resolved. |
| C38 | Conditional mandatory follow-ups: warranty 7 days/14 days/1 month/3 months/1 year/Other; availability relative to authorisation/site access; duration up to half a day/1 day/2–3 days/4–7 days/Other/**Unable to estimate yet — reason required**. Unknown duration is a prominent comparison caution but not a selection block. Exclusions remain explicit; Other requires explanation; unknown costs are flagged. |
| C39 | AI may recommend a contractor using current quote facts, reputation and relevant job history against CM priorities. Owner approved a concise recommendation showing **why it matches the preference plus drawbacks/limitations**, with evidence available. CM remains the selecting actor. No fabricated newcomer history or hidden lowest-price default. Reputation design and unavailable historical data are now being discussed in separate task 01a0e886-1f17-7733-9ef6-47fc795f2792; score formulas, sample thresholds and publication policy are not decided. |
| C40 | Lightweight start/completion progress with optional Add update and ETA changes. W2/W3 now share one completion package with compulsory invoice and irreversible declaration/slide; completion photos/evidence optional, not a primary-screen requirement. Remedy rounds remain possible as new records. |
| C41 | Either party may initiate a variation; the contractor confirms scope, price and schedule impact. CM approves while the revised GST-inclusive total is at or below the estate threshold. Above it, MCST approves increases beyond its previously authorised amount. Reductions are explicitly agreed and logged. Pending variations do not authorise extra work. The owner expressly accepted the at-or-below boundary. |
| C42 | CM completion review uses a short checklist against agreed scope, visible issues, evidence and invoice reconciliation, with repeatable contractor remedy/resubmission and CM review rounds. Preserve every round. Separate operational acceptance from performance ratings. |
| C43 | Full admin powers and no second-admin review approved, including status backtracking. Preserve attribution/evidence/history; decisions differ from execution. Q16 retains linked-new-ticket contractor replacement after authorisation. Q19 separately permits preauthorisation reselection/reopening. Exact financial dependency consequences remain O05/O24. |
| C44 | For unanswered ordinary disputes, MCST approvals and CM completion reviews, remind after two business days and alert admin after five. Calendar is now accepted in C70. Silence is not approval/fault; the explicit seven-calendar-day payment fallback is a separate rule. |
| C45 | Cancellation claims/expenses remain reviewable on contractor request. Ticket cancels immediately; submitted concern may show Admin Intervention with Works cancelled. Return to Cancelled after resolution unless explicitly restored. Q17 Okay now includes an explicit no-additional-claim declaration; existing confirmed payments remain due. No waiver inferred from silence; no claim timeout invented. |
| C46 | Within an estate, use just **CM and MCST role-level permission sets**; all accounts within the same role have equal permissions. Treasurer/Chair/Vice-chair titles and CM block labels do not create permission tiers or narrower estate scope. Allow future multiple named accounts per role; do not replace named identity with a shared credential. Contractor and platform-admin roles remain. Dedicated primary/backup approver subroles are not required. |
| C47 | Block final-invoice confirmation whenever its amount differs from the authorised quote-plus-effective-variation total until the difference is properly resolved. Notify **MCST and admin** through the in-app bell. Added charges follow variation approval; reductions are explicitly recorded; freeze only the exact reconciled version. |
| C48 | The three-business-day deadline is contractor-to-QuoteFix, triggered at MCST invoice/settlement confirmation. Owner reconfirmed it in the latest follow-up. Singapore weekdays excluding public holidays; skip trigger date; cutoff 23:59 on due day. Estate payment terms are separate. |
| C49 | Feedback is due 30 calendar days after full actual/assumed receipt or the accepted zero/performed-cancellation exception. Assumed receipt is per transfer at first notification + seven calendar days; Payment Issue stops deeming, partial balance stays due, and full assumed settlement can satisfy closure. |
| C50 | Contractors can see feedback and respond, subject to admin approval. Clarify which publication steps require approval and how disputed reports affect aggregates (O19). Preserve original reports, replies, moderation and corrections. |
| C51 | First-release analytics focus on quote count/range and term differences, initial-to-selected-to-final price movement, approved variations, time waiting on actors and recorded outcomes, with source records. Export a job decision pack covering request, quotes, rationale, approvals, changes, completion, confirmed invoice and relevant exceptions. Predictive market pricing and automatic fraud conclusions are not part of this approved scope. |
| C52 | Use **new QuoteFix operational data**. No migration of Contractor-Linker demo history or reputation. Keep fictional demos and scenario fixtures separate from real analytics/reputation. Reputation cold start is discussed in its own requested task. |
| C53 | Before implementation, agree feature boundary, role/action/visibility matrix, complete normal/exception flows, information/comparison/financial/notification rules and data model. Validate representative journeys. Owner prioritises **backend behaviour first; visual polish later**. A simple flow/prototype can validate usability without becoming a styling-first build. |
| C54 | A prominent **Waiting on [role]'s action** bar is confirmed; owner accepted the bar proposal on 1 October. Show actual pending actions with clear actor/verb, scheduled/no-action conditions, and concurrent responsibilities. Exact continuous-stage and **Pending: [role] [verb]** copy remains a review proposal. |
| C55 | Controlled shared ticket Q&A is approved: verified eligible contractors can request missing information before quoting; questions initially go to CM, who publishes factual sanitised answers to authorised RFQ viewers. Hide questioner identity, prices and proprietary information from peers. Notify relevant parties, preserve answers, and version material changes. It is not internet-public or an unrestricted contractor discussion forum; site visits still need an initial quote. |

## Confirmed wording from the node review

**C61.** Owner-confirmed copy, 2 October: I1 **Report an issue**; I2 **AI is refining your draft**; I3 **Approving AI input**; quotation phase Q1/Q3/Q4 **Requesting for quotes**; Q2 **Comparing quotations**; S1 **Pending: CM to confirm selected Contractor**; S2 **MCST Reviewing selected Contractor**; S3 **Rejected Contractor**. Preserve this exact wording. Q5/Q6 inherit the same quotation-phase label. The S3 label applies only to this ticket selection. I3 does not remove human accuracy/privacy review or the manual route; manual-route label is still a copy proposal.

## Second review — additional confirmed decisions

| ID | Decision |
| --- | --- |
| C62 | W1/W2/E2/R1/V1/R3 owner copy recorded exactly in NODE_REFERENCE.md. W3 label is **Preparing Proof & Payment**; the later Q8 answer makes invoice-only primary pending copy necessary and photos optional. That adjusted W3 pending/action wording is proposed. |
| C63 | Contractor quote checkbox: **My quote will be valid when the CM selects it. Once selected, its price and scope remain held while awaiting MCST approval, if needed.** Only the stray grammatical “the” was removed. |
| C64 | MCST alone records payment. P1 action Payment Sent uses slide submission; optional Note for supplementary details/reference. Amount/date remain structured; partial-payment rationale is compulsory/visible to contractor. Contractor actions Received payment / Payment Issue. |
| C65 | V8 supersedes the old transfer-date clock: compulsory completed-transfer proof precedes Payment Sent; first issued notification starts seven calendar days, including late entries. Store transfer/report/notice dates separately. Fees remain invoice-triggered. |
| C66 | Closure gates accepted; compulsory Feedback does not block closure. Later faults use linked aftercare. Cancelled jobs retain Cancelled during settlement. Zero-payable/performed-cancellation Feedback exceptions accepted in Q3. |
| C67 | E2 copy is now Unable to continue work, with Admin review and free-text verdict. Cancellation is immediate; contractor can lodge sunk expenses via Admin Intervention. Opening intervention does not authorise resumption; explicit admin backtrack can restore a stage. |
| C68 | Request Admin Support, contextual categories and confidential conduct handling accepted. Tell submitter the sensitive report is confidential and not shown to the subject. Apply that restriction even when the subject otherwise has estate/MCST access. |
| C69 | MCST can create/publish RFQs and has base CM capabilities plus oversight/masking controls. Select and approve accepted; above-threshold popup states quote amount/threshold with Yes I know / Back. Combined confirmation records selection and authorisation without another MCST account. Detailed risk system is separate chat 01a0fbec-86d8-7db3-9a71-d18613c0e471. |
| C70 | Singapore weekday/public-holiday calendar, exclude trigger date, deadline 23:59. Admin verifies fee receipt. Unpaid fees block new quoting and selection of existing unselected offers; selected/authorised jobs continue. Verified full payment lifts only fee restriction. |
| C71 | Manual offline verification authoritative within QuoteFix. Configurable category/scope prerequisites and company/person holders accepted. Optional badge expiry greys badge; required credential problems restrict affected eligibility and prompt active-work review. Reminder one calendar month before expiry; admin can add types/expiries. |

## Third review — confirmed additions

| ID | Decision |
| --- | --- |
| C72 | **Supersedes after-Start placement:** before Start is enabled, require Completed by date AND time OR Unable to estimate yet AND a nonblank reason. Validate on submission before recording actual commencement; show saved estimate/reason in W2. Scheduled future-start wording retained. Q18 resolved. |
| C73 | R1 action Approve Works, with positive checkbox above and slide confirmation; **Unsatisfactory work** is the CM's completion-quality route, without the positive checkbox. Invoice mismatch remains separately routed to R3. Approved contractor completion popup is recorded in memory/node reference. |
| C74 | V2/V3/V4/V5 copy applied. V9 supersedes the original optional rejection rule: rejection reason compulsory, withdrawal reason optional; every proposal/version/change/approval/rejection/withdrawal is audited with actor/role/date/time and before-after. V7 UX2 supersedes the V3–V5 navigation screens: save outcome and route automatically; destination pending line names the actual Contractor/CM/MCST/Admin. Q15 return routes explicitly approved: W1/W2/R3/R1/E2 according to saved context and feasibility, never automatic W2. |
| C75 | Immediate cancellation after authorisation supersedes the prior admin gate. Contractor sees reasons, Okay or Admin Intervention; can lodge incurred expenses/explanation. Show cancellation-cost notice to CM/MCST. Intervention reopens the review pipeline while work stays cancelled until explicit restoration. |
| C76 | All listed admin powers plus status backtracking approved. No peer-admin review. Preserve original events, financial records and clear attribution; do not treat a status edit as a bank transfer or completed remedy. |
| C77 | Received payment / Payment Issue and approved deadline footer retained. V8 deadline derives from first issued notification; partial/disputed/full-settlement safeguards remain. |
| C78 | Reputation remains KIV in its existing separate chat. New MCST integrity/risk chat created in this project: 01a0fbec-86d8-7db3-9a71-d18613c0e471. This lifecycle review stays focused on pipeline and next actor. |

## Remaining decisions that affect the blueprint

| ID | Question | Current boundary / recommendation |
| --- | --- | --- |
| O18 / Q3 | **Resolved in v8.** | Compulsory completed-transfer proof; seven calendar days from first issued payment notification for prompt and late entries; actual versus labelled assumed receipt. Earlier contrary rules superseded. |
| O24 | Resolved dependency rule in v9. | Preview impacts; preserve financial events/clocks; invalidate only affected acceptance/tasks. O05 retains specific adjustment deadlines/refunds. |
| O25 | Resolved in v9. | Seven calendar days from first issued cancellation notice; timely claims and existing debts survive expiry. Silence is not acceptance. |
| O05 | Resolved in v10. | Preserve original deadlines; new unpaid fee differences due three business days after authorised adjustment confirmation. Reductions offset unpaid fees; Admin records actual refunds of paid excess. No fixed refund-turnaround interval. |
| O14 | Supplied privately in v9. | Owner operates one Admin account with stated round-the-clock coverage and in-house team; internal context only, never app copy. |
| O13/O19 | Reputation formulas/window/moderation? | Explicitly KIV in separate existing chat 01a0e886-1f17-7733-9ef6-47fc795f2792. Preserve confirmed Feedback task; do not press scoring questions or implement new metrics here. |

## Resolved questions / parts

| ID | Resolution |
| --- | --- |
| O03 | Comparison population/labels settled; no readiness state. |
| O04 / Q6 | Full powers and no peer review accepted. Q16 replacement boundary settled; remaining financial dependencies O05/O24. |
| O06 / Q14 | Calendar/manual fee reconciliation and new-quote restriction boundaries accepted. |
| O07 / Q5 | Immediate cancellation after authorisation chosen; old admin accept/reject gate removed. |
| O08 | Stop ordinary work on cancellation; preserve make-safe/evidence/cost records. |
| O09 | Controlled shared Q&A accepted. |
| O10/O12 | Disclosed subcontracting and reasoned unknown quotation duration accepted. |
| O11 | Priorities and No preference accepted; reputation weights KIV. |
| O15/O17 | RFQs do not expire; valid selected quote held during approval, required checkbox. |
| O16 / Q1 | Closure gates and independent Feedback accepted. |
| O18 / Q3 | Fully resolved: payment proof required, separate transfer/report/notification dates, T+7D from notification, per-transfer/dispute/full-settlement safeguards. |
| O20 / Q13 | MCST RFQ creation and combined selection/approval accepted with above-threshold acknowledgment. |
| O21 / Q15 | Approved conditional return to W1/W2/R3/R1/E2. No further routing approval needed. |
| O22 / Q9 | Configurable prerequisites and optional/mandatory credential expiry distinction accepted. |
| O23 / Q14 | Unselected offers unavailable during fee restriction; verified full fee payment removes only that restriction. |
| O26 / Q18 | Completed by date/time OR Unable to estimate + reason is required before Start, confirmed 6 October. |
| O27 / Q20 | Reminder cadence approved with MCST/Admin event countdowns, confirmed 6 October. A/UX1 presentation and integration are now approved. |

## Review discipline

Do not turn an unexplained recommendation into a requirement. Distinguish “Decision needed” from informational explanation. Explain each open question with its concrete case and preferred outcome. Main focus is the Mermaid pipeline, its triggers and actual next actors. Pending variants in the reviewer are illustrative contexts; live app derives the correct one from the job and obligations.

Detailed questions: [LIFECYCLE_REVIEW_QUESTIONS.md](LIFECYCLE_REVIEW_QUESTIONS.md). Blueprint: [TICKET_LIFECYCLE.md](TICKET_LIFECYCLE.md). Node reference: [NODE_REFERENCE.md](review/NODE_REFERENCE.md).

## Lifecycle review v5 decisions, 5 October 2026

| ID | Decision |
| --- | --- |
| C79 | R3 pending Contractor explains or corrects the invoice; action View Reason. P1 pending MCST to send payment to the contractor; Payment Sent retains slide submission. P3 Unresolved payment; unsent-balance pending MCST to send the remaining payment; Review payment discrepancy. |
| C80 | Retire visible P5 Finishing up. Existing accepted-work/confirmed-invoice/full-payment/no-blocking-case conditions are automatic closure guards, not another user step. Existing blocking cases keep their real actor/action and resolution rechecks closure. |
| C81 | Q15 variation return routes approved. Q16 replacement after work authorisation uses a linked new ticket. Q19 explicitly approves same-ticket reselection and a new quotation round after MCST rejection before authorisation. |
| C82 | Q17 Okay uses exact copy: “I accept the cancellation and do not have any additional claims.” Information icon: “For e.g, materials already ordered for the job, subcontractor commitments, labour fee or equipment hire.” Existing confirmed payments remain due; no acceptance by silence. |
| C83 | Confidential conduct notice: “Your report is confidential. It will not be shown to the person or organisation you are reporting.” Enforce subject exclusion across reports, notifications, exports and audit views. |
| C84 | Immediate/one-business-day/three-business-day/Admin-set follow-up and MCST/Admin countdown approved. V8 integrates follow-up into one support case. |

| Open item | Specific remaining decision / recommendation |
| --- | --- |
| Q20 / O27 | **Resolved:** reminder timing and MCST/Admin countdown approved. Placement under existing Admin Support is now approved A/UX1. Estate payment terms remain unspecified. |
| Q3 / O18 | Resolved by v8 notification-based period, including late entries; no special late-entry Admin gate. |

Q12's admin staffing/coverage is operational information needed before launch, not another feature approval. Reputation/risk work stays in its existing chats.

## Reputation passport update, 2 October 2026

Confirmed by the owner: five admin-verified external past-job references may seed a provisional numerical score; admin can manually enter them, preserving external-source provenance; a precise numeric point of comparison is wanted; contractor feedback is visible privately and admin-reviewed before shared publication; admin may void an individual CM/MCST entry with an internal rationale while users see only a readable greyed entry; version-one priorities remain primary plus optional secondary. These owner decisions supersede any older open wording on those specific points. See [REPUTATION_PASSPORT_PLAN.md](REPUTATION_PASSPORT_PLAN.md).

Still open, not implementation policy: exact five-minute rubric and scoring anchors; formula and weights, including whether/when 30-day durability affects the number; missing-data treatment; source mixing or handover from provisional external references to QuoteFix outcomes; reference recency and trade comparability; AI trait evidence thresholds; handling of false or personal text in greyed entries; legal review of publication and AI judgments; and refresh cadence. The 30-day clock's payment event remains in the lifecycle decision process.

## Reputation feedback update, 2 October 2026

Owner direction confirmed: live jobs collect short five-star inspection feedback and an overall five-choice recommendation statement, then a compulsory 30-day five-star durability assessment with a mandatory short positive/negative observation when the repair can be assessed. Both moments contribute to one numerical reputation score; dimensions such as craftsmanship and timeliness remain separately available for priority-aware AI advice. The previous separate future QuoteFix-observed score proposal is withdrawn. Historical onboarding references remain admin-entered, provenance-labelled external evidence.

Open: final inspection questions and answer anchors; exact weights and severity-point map; handling unassessed or unanswered 30-day forms and contested attribution; how external selected references and live QuoteFix jobs combine; AI evidence thresholds for strength labels. The owner expressly deferred recalculation, AI-summary refresh events and cadence for a subsequent discussion. See [REPUTATION_FEEDBACK_MODEL.md](REPUTATION_FEEDBACK_MODEL.md).

## Reputation priorities update, 5 October 2026

Confirmed owner direction: use Workmanship and Customer service as inspection rubric labels; allow Unable to assess at 30 days without durability points; display "Durability assessment pending" before assessment; ensure that the CM's primary and optional secondary job priorities affect the contractor comparison score or verdict for that RFQ. The earlier fixed weights describe a no-preference general baseline only.

Open: whether to display both a fixed general reputation score and a separate job-specific match score; which priority choices map to workmanship, timeliness/availability, customer service/disruption, value/price, durability and similar-work experience; the exact priority influence and treatment of missing rubric evidence. The previous original priority menu and any proposed new rubric-oriented choices must be reconciled with the owner before implementation. Exact general scoring weights also remain open. Passport refresh triggers remain KIV.


## Lifecycle review v6 decisions and proposals, 6 October 2026

| ID | Decision |
| --- | --- |
| C85 | P2 exact pending: Contractor to verify payment received. Confirming payment and Received payment / Payment Issue retained. |
| C86 | P7 is internal processing only, never a visible ticket stage/pending-system task. On ticket opening after actual seven-day deeming, Contractor sees assumed-payment popup. Prior dispute/partial/full-settlement safeguards retained. |
| C87 | F1 has no action button. Give feedback appears only at F2 after the 30-day interval. Do not alter separate inspection feedback or job status. |
| C88 | Countdown required for MCST and Admin, naming next reminder/follow-up with days/hours and exact scheduled time. This does not expire/cancel/close the ticket or extend payment terms. Exact event-specific countdown display copy is now approved. |
| C89 | Owner requests complete redundancy review, **proposals only** before any broad merging. All 77 current checkpoints audited in UX1–UX15. Preserve pending actors and audit facts while identifying duplicate forms/approvals/navigation. |

| Open item | Context and recommendation |
| --- | --- |
| UX1 | Resolved in v8: A approved in full; payment evidence/follow-up consolidated into one case. |
| UX2–UX15 | Resolved: all streamlining changes approved in point 7. Planning model now uses automatic returns, one completion package and shared workspaces with preserved gates. |
| Q3 | Resolved in v8: proof before Payment Sent; first notification starts seven calendar days, including late entries. |

## Equal-weight reputation correction, 6 October 2026

Confirmed owner direction: withdraw unequal 40/25/15/10/10 inspection weights; pure reputation components have equal baseline contribution. Show Pure reputation score and Reputation score with CM priorities for the current RFQ. With No preference, the two values must be identical. A CM priority boosts the weight of its relevant historical-performance dimension through a normalized multiplier; a primary Timeliness multiplier of 1.25 is an example, not an approved factor. Both high and low performance on the preferred dimension may move the adjusted number. Priority choices still do not alter eligibility.

Open before implementation: whether the five inspection inputs (including the overall recommendation statement) and 30-day durability input each count as one equal component when observed; exact point map, primary/secondary multipliers, and incomplete-data handling; how original quote-oriented priority choices map to reputation rubrics without equating earlier availability with punctuality or lower price with past value ratings; and how external references and live jobs combine. The AI verdict also considers current quote facts separately. Refresh triggers remain KIV. See [REPUTATION_FEEDBACK_MODEL.md](REPUTATION_FEEDBACK_MODEL.md).

## Lifecycle follow-up v7, 6 October 2026

Owner approved the P7 notice with **T+7D**, controls **Understood / Payment Issue**, and the previously described dismissal/visibility safeguards. Understood is not an actual-receipt declaration. Countdown display copy and behaviour are approved.

**UX2–UX15 are approved** under “approved all the streamline changes.” This includes automatic variation/admin return, reuse of the confirmed zero outcome and valid responses/inspections, one draft editor, one quotes/selection workspace, one completion package, and contextual cancellation/Feedback/fees/credentials/coordination. These are planning decisions, not application implementation. W2/W3 now collect the required invoice before the final completion declaration is submitted; the earlier “Upload the invoice next” sequence is superseded. Replacement popup/action wording is a copy proposal. Preserve optional photos, irreversible declaration, CM inspection and exact MCST invoice confirmation.

**V7 hold superseded in v8:** A and B approved in full; Q3 now uses first notification for all transfers.

**Proposals A and B are complementary:** A consolidates payment support; B automates variation returns. They are not two alternative architectures. B has a smaller implementation surface; A must preserve payment amounts, receipt provenance, dispute exclusion, clocks and case tasks. Both designs are now approved and integrated in v8. See [v7 clarification](LIFECYCLE_REVIEW_2026-10-06_V7.md).

| ID | New confirmed decision |
| --- | --- |
| C90 | P7 exact T+7D notice and Understood / Payment Issue approved; dismissal never confirms actual receipt. |
| C91 | UX2–UX15 approved, including combined completion/invoice submission and automatic variation/admin routing. Preserve evidence and meaningful role decisions. |
| C92 | Countdown and payment-support presentation approved. The former v7 integration hold is superseded by full A approval in v8. |

## Recommendation weight confirmation, 6 October 2026

Confirmed: overall Recommend to others is included with relative weight 1.2. Workmanship, Timeliness, Customer service and Value for money each have relative weight 1; an assessable 30-day Durability response adds another weight-1 component. Pending or unassessable durability is omitted, not assumed favourable. A proposed normalized pure job calculation is (W + T + C + V + 1.2R) / 5.2 before durability and (W + T + C + V + 1.2R + D) / 6.2 afterward. This records relative weights, not an approved 0-100 answer point map. Exact primary/secondary priority multipliers, aggregation across jobs and evidence sources, missing inspection answers and 30-day attribution remain open. Refresh triggers remain KIV by owner request.

## Lifecycle follow-up v8 — payment and A/B approved

Q3/O18 and A/UX1 are resolved. MCST must upload completed-transfer proof before Payment Sent. Store actual transfer date, server report time and first issued in-app notification time separately. The seven-calendar-day period starts at that first notification for every transfer, including late entries. Receipt confirmed by Contractor uses the actual date; silence produces **Assumed received** at the response deadline. Payment Issue stops the relevant automatic receipt. Reminders/read events/retries do not restart the clock. Full settlement still anchors 30-day Feedback; invoice confirmation still triggers QuoteFix fees. The earlier refusal of notification-based timing is superseded by this explicit owner decision.

A and B are approved in full. A keeps ordinary balance/receipt in payment and evidence/follow-up in one contextual support case. The standalone late-entry Admin exception is removed. B preserves the complete dated variation audit entry and automatically returns to the valid stage. Audit data includes actor/role, decision timestamp, version, scope/price/timing before and after, rationale and linked evidence; original entries are retained after corrections.

**Historical v8 question, resolved in v9:** rejection reason compulsory; presets plus Other explanation. Withdrawal reason remains optional.

Remaining diagram-policy work: O24 backtracking dependencies; O05 fee/financial adjustments; O25 treatment of cancellation with no contractor response; O28 agreed estate payment due-date source. Operational coverage O14 remains information to supply. Reputation/risk remain in their separate chats. See [v8 decisions and questions](LIFECYCLE_REVIEW_2026-10-06_V8.md).

| ID | V8 decision |
| --- | --- |
| C93 | Completed-bank-transfer proof is a prerequisite to Payment Sent; MCST reporting time is separate from actual transfer date. |
| C94 | Every transfer uses first issued payment notification + seven calendar days. Actual confirmation uses actual receipt date; silence creates labelled assumed receipt. This expressly supersedes the earlier refusal. |
| C95 | A and B approved in full. Variation rejection rationale supplied is kept in the dated audit trail, with actor/version/change context. Q21 separately asks whether a nonblank reason is now required. |

| New remaining item | Context / recommendation |
| --- | --- |
| Q21 | Earlier rejection reasons were optional. Recommend requiring a short rejection reason with preset choices plus Other; withdrawal remains optional. Await owner answer. |
| O28 | Estate bank-payment due-date source is unspecified. Recommend use the agreed invoice/quote payment due date where provided; do not reinterpret Admin reminder dates or QuoteFix fee dates as MCST's payment deadline. |


## Lifecycle review v9 — owner corrections and clarifications, 7 October 2026

Supersedes contrary earlier notes on these specific points. Planning only.

- **Q21 resolved:** rejection requires a short preset reason; Other requires explanation. Additional detail optional; withdrawal reason optional. Persist rationale, actor/role/time/version and before/after terms permanently.
- **O24 dependency rule resolved:** show Admin impacts before backtracking; preserve financial history, payments and clocks; invalidate only affected acceptance/tasks; reuse still-valid decisions. Changed amounts use separate adjustments. No second-admin review. O05 adjustment due dates/refunds still open.
- **B1 visibility:** QuoteFix fees belong only in Contractor account billing, outside tickets. CM/MCST have no fee view/actions/notifications. Existing Admin reconciliation occurs in a separate internal collection workspace.
- **Fee basis reconfirmed:** 4% platform + 4% lead on the final confirmed payable invoice/settlement total, including existing GST/variation rules, assessed at MCST confirmation and due three business days later. Invoice SGD 1,200, even with only SGD 600 paid by MCST, assesses SGD 48 + SGD 48. An amended total of SGD 1,200 means SGD 96 TOTAL; SGD 80 already paid leaves SGD 16. This is arithmetic reconciliation, not an arbitrary surcharge. Do not duplicate existing assessments or paid amounts. Exact adjustment deadline/refund mechanics remain O05.
- **O25 resolved:** additional cancellation claims have seven calendar days from the FIRST issued cancellation notification, not reading it. Show exact SGT deadline/countdown in notice and cancellation details. No clock before issued notice, no resetting on views/reminders. Timely submitted claims continue after cutoff; existing confirmed debts remain due. Expiry stops new ordinary additional claims but never invents no-claims acceptance. General support for exceptional errors remains, with explicit audited Admin override when needed. Previously proposed two-business-day reminder/five-business-day Admin attention accepted only while the window remains open; neither extends seven calendar days.
- **O28 resolved:** no universal app-imposed MCST bank-payment deadline. Countdown is to QuoteFix following up on a missing payment record/progress update: one business day, three business days unresolved, then Admin-set time. Bank payment may already have happened offline; obtain the record before concluding otherwise. No automatic payment penalty/expiry. A useful expected date may be supplied, but never force an invented commitment.
- **F2:** 1–3 stars negative + compulsory open observation; 4–5 positive + compulsory open observation; no response -> reminder loop -> Admin. Unable to assess is explicitly retained as an exception with no durability points. Missing/unassessable is never positive. Negative rating does not automatically create an aftercare claim. Moderation/reputation formulas remain as separately agreed. FQ1 exact reminder cadence pending.
- **D8 clarification:** reuse real work/financial/receipt verification; request only a genuinely missing check using the existing role task. It is not a duplicate R1 inspection or another compulsory ticket phase. An Admin verdict alone does not prove execution.
- **O14 supplied — internal only:** one Admin account operated by the owner, with stated 24/7 coverage and an in-house specialist team. Keep this operational context out of app copy. No extra Admin account, second approval or advertised service guarantee introduced.

Remaining lifecycle policy: **O05** adjustment due dates/refunds; **FQ1** exact Feedback reminder cadence. Broader reputation/risk details remain in their existing chats.


D7 / O29 remains a deferred open policy: whether an unresolved support case may be archived. Recommendation only: defer archival for launch, keep the case explicitly unresolved with named follow-up, and never treat inactivity or archival as successful resolution. This records the existing D7 doubt; it is not approval of new behavior.



## Lifecycle review v10 — explicit repeat inspection and timing approvals, 7 October 2026

- **Repeat inspection mandatory:** every resubmitted physical remedy returns to R1. 4 November failed inspection -> corrections submitted 8 November -> CM must inspect again. D8 can reuse only successful acceptance of that SAME corrected round for the linked case; never a failed inspection, an older round, or acceptance invalidated by later work. No duplicate case-only inspection after that corrected round already passed. Preserve each round, inspection event/version/actor/date/result. A new round creates a fresh two/five-business-day unanswered-review task.
- **Approved countdown copy:** MCST: “QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.” Admin: “Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.” Calculations remain Singapore time; omit the literal SGT suffix in these approved lines.
- **O05 resolved:** preserve original fee assessment/deadline. A newly assessed unpaid difference is due three business days after authorised adjustment confirmation. Reductions offset unpaid fees; excess already paid is refunded and actual execution recorded by Admin. No fixed refund-turnaround period approved. Rates remain 4% + 4%, with original full-invoice basis/confirmation trigger preserved; billing remains outside tickets.
- **FQ1 resolved:** due Feedback notice; remind CM after two business days unanswered; alert Admin after five business days unanswered; then Admin records each next follow-up. Stop on rated submission or Unable to assess. Silence is not positive feedback; closure is unaffected.
- **D7/O29 remains open:** user asks what archiving an unresolved case means. Explain active-queue visibility versus actual resolution; do not implement archival or assume approval. Recommendation remains deferring archive for launch and retaining unresolved cases with follow-up.
- **O30 scheduling detail register:** main durations are approved, but do not invent the daily send time for date-only Feedback anchors, backdated overdue Feedback reminder scheduling, date-only credential/quote expiry boundary, extra advance reminders/repeated overdue alerts, or late-work/warranty automation. These are explicitly identified in TIMING_AND_NOTIFICATION_REGISTER.md with recommendations; they do not create additional states or silently change existing clocks.

Current timing reference: [TIMING_AND_NOTIFICATION_REGISTER.md](TIMING_AND_NOTIFICATION_REGISTER.md). No application scheduler or product feature implemented.

## Admin-alert coverage review — 11 October 2026

**Confirmed:** Admin may set subsequent follow-up dates for unresponsive CM/MCST/Contractor, as already specified by T11. The owner approves the current Mermaid presentation and explicitly keeps **O29 archival KIV / unresolved**. No archive feature is to be implemented now. Prior durations and transitions are preserved.

**Audit result:** all 82 stable nodes reviewed against the plan and repository code. There is no application scheduler in this workspace; the executable code builds/tests the planning review. Initial alerts do not guarantee another alert where a follow-up has never been set. See [timing register, section 12](TIMING_AND_NOTIFICATION_REGISTER.md#12-key-days-and-admin-alert-coverage--11-october-audit) for key days, covered/uncovered events, examples and proposed fixes.

### O31 — closing Admin-alert coverage gaps (all proposals awaiting decision)

| ID | Recommended policy | Boundary |
| --- | --- | --- |
| O31-A | Extend +2 BD stakeholder reminder / +5 BD Admin alert to unanswered Q&A, visit decisions, Contractor variation terms, CM variation decisions and invoice correction; ordinary case responses use it unless specifically dated by Admin. | Existing MCST approval, CM inspection and dispute rules already cover their own tasks. No duplicate timers or new screens. |
| O31-B | Procurement progress check-in at +5 BD to responsible CM/MCST; +10 BD without substantive progress/next-review date alerts Admin. | Covers no suitable quotes and abandoned selection/reselection. RFQ never expires; no contractor is obliged to quote or renew. |
| O31-C | Once a saved start/completion/access/remedy/update target is missed, notify owner and Admin. Unknown completion requires next progress-update date; arranging an unspecified start uses the ordinary 2/5 fallback. | Follow-up only; no penalty, fabricated completion deadline or mandatory photo diary. Preserve response versus execution obligations. |
| O31-D | For unanswered cancellation, alert Admin at earlier of +5 BD or 24 hours before the seven-calendar-day cutoff. | Replaces the conditional Admin-attention timing only if approved. The claim window remains seven calendar days from first issued notice. |
| O31-E | One Admin attention queue; ordinary unacknowledged items re-alert after 1 BD, urgent RFQs after 15 minutes; unresolved acknowledgment must retain a dated task or next follow-up. | Includes verification/moderation/fee evidence/refunds/balance follow-up. Same Admin account; no peer approval or implied resolution SLA. Exact repeated-overdue cadence remains O30. |
| O31-F | Durable notification/scheduler retry and failure monitoring; choose retry/alert thresholds before implementation. | A failed notice is not user silence and never starts either seven-day user window. Bell outages also need recoverable operational logs. |

O31 is an audit proposal set, not a blanket approval to extend all timers. A more general escalation policy must exclude optional drafts, offers, photos, internal transitions and future Feedback observation. Preserve access restrictions for confidential conduct reports. O30 date-only dispatch/expiry and remaining repetition/warranty details are still open. Do not reopen settled fees, receipt rules or Feedback cadence.


## Lifecycle review v11 — latest decisions, 11 October 2026

**Confirmed:** Admin-only evidence sufficiency; D3 -> D2 review; offline coordination D9 with separate ledger before final outcome; acknowledgment-only D4; existing binding powers retained. D6 actual execution and D7 unresolved follow-up remain conditional, not a renewed participant negotiation route. Number inspection headings from [2nd] and retain findings on the originating inspection. Aftercare resolves only after applicable execution/verification.

**Resolved O32-A:** owner explicitly approved proceeding with already-authorised actions while acknowledgments are collected. No acknowledgment gate or assumed acknowledgment from silence. Do not reopen this question.

**Resolved O31-D:** for unanswered cancellation, Admin alert at earlier of +5 business days or 24 hours before cutoff. Contractor reminder remains +2 business days when in-window; claim cutoff stays seven calendar days from first issued notice.

**Approved:** coverage principles in prior point 3 and intentional exclusions in point 5. **Still open:** the exact defaults listed in point 6; owner requested problem context before deciding. O31-A coverage expansion has in-principle approval but its explicit scope/timing combination is held pending confirmation; O31-B procurement interval, O31-C exact missed-target/unknown-estimate defaults, O31-E Admin queue intervals and O31-F technical recovery thresholds need the contextual explanations in LIFECYCLE_REVIEW_2026-10-11_V11.md. Existing settled durations remain unchanged.

**O32-B — separate offline ledger placement:** the owner requires a separate audit ledger for offline coordination, but has not specified whether the detailed ledger is outside QuoteFix or in an Admin-only case tab. Recommendation: a separate Admin-only coordination log linked to the case, with references/attachments to external records as needed; expose only the issued resolution and permitted summary to parties. Existing in-app decision/event audit remains mandatory either way. Do not build an external integration or expose private negotiation records by default.

**O29 remains KIV.** O30 scheduling precision and repeated-overdue cadence remain open. Broader reputation/risk remain in their existing chats.


## Lifecycle review v12 — latest decisions, 12 October 2026

These explicit owner decisions supersede contrary earlier O31/O32 and scheduling notes. Planning only; no application scheduler has been implemented.

- **O31-A resolved:** extend the ordinary 2-business-day actor reminder / 5-business-day Admin alert to unanswered Q&A, visit decisions, variation terms/CM decisions and invoice correction. Reuse the existing specific approval/dispute rules; do not add parallel duplicate clocks. A recorded decline is a response. CM is free to withhold additional information or decline a site visit.
- **O33 sourcing resolved by direct answer:** first RFQ publication or explicit new quotation round -> **12 noon Asia/Singapore on the second following calendar date**. Publication 1 December -> 3 December noon, not necessarily 48 elapsed hours. Alert Admin if fewer than **three distinct eligible contractor organisations with current selectable quotes**, including zero. Revisions count once; ineligible, expired, withdrawn and non-selectable quotes do not count. Preserve immediate selectability with a scope-change warning where already permitted. This is an attention threshold, not a three-quote selection prerequisite. Admin chases contractors offline and records the next follow-up. Selection/cancellation ends obsolete sourcing attention for that round; ordinary edits do not restart its clock.
- **O31-B selection cadence approved separately:** remind the actual CM/MCST selection owner after **5 business days**; Admin after **10 business days** without meaningful progress or a scheduled review. Exact actionable selection anchor remains O35-A. Do not use these slow intervals for missing quotations.
- **O34-A resolved by direct answer:** retain Q&A **before the first quote**; CM may answer or decline. Site visits still require an initial quotation and CM approval. No forced disclosure and no AI-invented missing facts.
- **O34-B resolved by direct answer:** before Start require Completed by date/time OR Unable to estimate plus reason. If the latter is used, a completion date/time must be supplied **within 24 elapsed hours of actual Start**. Only Admin may approve a reasoned extension with a new estimate-submission deadline; Contractor cannot keep extending it alone. Missing that estimate deadline alerts Admin immediately. It is a duty to provide an estimate, not an invented completion deadline.
- **O31-C completion rule approved:** when the completion target passes without completion, notify Admin immediately. CM/MCST gets the +1D notice with hours late and **Okay / Admin Intervention**. Exact elapsed-day, still-outstanding and recipient interpretation remains O35-B; changes to an already supplied completion target remain O35-C. No automatic work acceptance, penalty or cancellation.
- **O31-E approved:** ordinary unacknowledged Admin attention item -> re-alert at **1 business day**. Urgent RFQ -> initial alert, then **15 minutes, 1 hour and 3 hours** from first issued notice while unacknowledged. Explicit coordination acknowledgment stops that sequence; an unresolved item retains a dated next action/follow-up. After-three-hour urgent repetition remains O35-D. No second Admin or new service guarantee.
- **O31-F approved:** durable retryable notification work, failure monitoring and visible persistent-failure queue. Choose concrete engineering retry thresholds before implementation; failure never counts as user silence and does not start either seven-day user window.
- **O32-B resolved:** detailed offline coordination ledger is an **external document outside QuoteFix**. Keep the restricted reference/permitted summary and the app's own dated decisions, acknowledgments and execution audit. No detailed in-app negotiation ledger or external messaging integration is implied.
- **D6/D7 and inspections reconfirmed:** perform/verify actual outstanding obligations, retain unresolved follow-up where needed, inspect every new physical repair and number from Inspection [2nd]. D8 reuses only successful acceptance of the same corrected round.

### O35 — remaining boundary decisions, not silently implemented

| ID | Context | Recommendation awaiting owner decision |
| --- | --- | --- |
| A | Publication can precede any selectable quotation; selection chasing should not blame CM for no offers. | Start 5/10 BD when the first valid selectable quote makes selection actionable. A rejected nomination creates a new reselection task when an alternative exists. Preserve task age; a dated scheduled review changes the next follow-up, not history. |
| B | Work may finish before the +1D estate notice; the recipient and day unit need precision. | Use 24 elapsed hours; notify both relevant CM and MCST only if still unfinished. Okay acknowledges the notice only; no work acceptance, waiver, deadline extension or follow-up closure. |
| C | Replacing a completion target could erase lateness. | Keep every target/reason and overdue event. Contractor may report a revised forecast; moving the accountable deadline requires authorised CM/MCST or Admin acceptance, within the existing task. This is distinct from the already approved Admin-only temporary-estimate extension. |
| D | The three-hour urgent reminder could be ignored too. | Thereafter re-alert hourly until explicit acknowledgment, reusing one item; after acknowledgment use the saved next follow-up. Extra cadence is not yet approved. |

O29 archive stays KIV. O30 date-only dispatch/expiry, remaining repeated overdue schedules and warranty details stay open except where explicitly superseded above. Reputation/risk stay in their existing discussions. See [v12 review](LIFECYCLE_REVIEW_2026-10-12_V12.md) and [timing register](TIMING_AND_NOTIFICATION_REGISTER.md).


## Lifecycle review v13 — latest decisions, 12 October 2026

Supersedes v12 O35 proposals; all four answers and both follow-up answers are confirmed. Planning only.

- **O35-A:** selection reminders start when the **third distinct eligible contractor** has a current valid selectable quotation in the active round, not the first. Responsible CM/MCST +5 business days; Admin +10 business days without meaningful progress or a scheduled review. Initial sourcing still uses publication +2 calendar dates at noon Singapore time.
- **O36-A explicitly resolved:** keep selection with fewer than three allowed under the previous limited-comparison warning/rationale. Only reminders wait for three; do not introduce a three-quote selection gate or assert a general legal procurement rule.
- **O36-B explicitly resolved:** if valid coverage drops below three, **pause** selection reminders, return attention to sourcing and **resume only the remaining time** when three valid distinct offers return. Preserve accrued time and history; no fresh full 5/10-BD reset. Reuse the Admin sourcing task. Revisions from one contractor count once.
- **O35-B:** +1D means **24 elapsed hours**; notify both relevant CM and MCST only if work remains outstanding. Okay acknowledges the notice only; Admin Intervention reuses support. Retain lateness only relative to the completion target: Monday 3pm due, Tuesday 10am done = 19h late, although before Tuesday 3pm reminder. Completion before Monday 3pm is not late. Do not conflate a late app update with independently established physical completion or invent reputation penalties.
- **O35-C:** Contractor proposes revised completion date/time plus reason -> notify CM/MCST -> authorised decision-maker chooses **Okay / Admin Intervention**. Okay accepts that exact date version; support or silence does not. Preserve the last authorised target until acceptance/override and audit old/new dates, reasons, actors, times and overdue events. Use existing variation decision/audit/reminder machinery for this compact schedule-only change; scope/money changes retain their full gates.
- **O34-B remains approved:** Start with Unable to estimate requires the first completion estimate within 24h. Only Admin can extend that estimate-submission deadline with reason/new due time. It is separate from accepting revisions to an already supplied completion date; the user requested context, not removal of this safeguard.
- **O35-D:** urgent reminders at +15min/+1h/+3h, then **every 7 hours after the three-hour mark**: +10h/+17h/+24h/+31h. Stop on explicit Admin acknowledgment/cancellation/supersession; unresolved acknowledged item follows Admin's saved next time. Same urgent item, no duplicate cases.

O35/O36 require no further approval. Other O30 scheduling precision and notification engineering thresholds remain recorded; reputation/risk stay separate and archive O29 remains KIV. See [v13 explanation](LIFECYCLE_REVIEW_2026-10-12_V13.md) and the current [timing register](TIMING_AND_NOTIFICATION_REGISTER.md). No QuoteFix backend or production scheduler implemented.


## Implementation-planning readiness and timing approvals — 12 October 2026, v14

The owner reconfirms all v13 choices, including lateness interpretation and the Admin-only initial-estimate exception, and intends to begin implementation plans. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) is draft 0.1: proposed deliverables, sequence, dependencies, acceptance scenarios and test-data separation. It is not stack approval or implemented application behavior.

**Explicit timing answers resolve these O30 subitems:**

- **Date-only Feedback:** when actual receipt has a date but no time, send the 30-day Feedback notice at **09:00 Asia/Singapore** on its due date. If a late record reveals that Feedback is already due, issue immediately; preserve the true observation date and give CM the existing 2/5-business-day response periods from the first successfully issued notice.
- **Date-only quote/credential expiry:** valid throughout the stated Singapore date; expire at midnight starting the following day. Respect explicit expiry times and preserve selected-quote holds.
- **Missed scheduled Start:** at the agreed time with no Start record, notify Admin; after **24 elapsed hours**, notify relevant CM/MCST only if still unrecorded. Say **Start has not been recorded**. Stop obsolete notices after Start, cancellation or authorised schedule supersession. Missing app data does not prove physical work has not begun. No automatic start, penalty or extension.

**Documentation correction, not a new product rule:** C35 means a valid current-scope initial quote can be selected without a site visit/readiness status. C36/Q4 still requires reconfirmation/revision after a material scope change; unreconfirmed old-scope quotes do not count as current valid coverage and cannot be selected. Generic scope-warning wording in recent notes was too broad and is corrected to distinguish minor changes. Remove stale unresolved Q12 (Admin coverage supplied) and Q7 (support model approved) markers; reputation-specific questions remain separate.

**Remaining gates:** unspecified ordinary Admin repetition/optional advance reminders, warranty automation and an authorised job with no agreed start date; specialist reputation/risk choices; concrete engineering contracts, timers/retries, stack/hosting and rollout. No need to reopen O35/O36. Archive remains KIV. These do not prevent drafting the implementation plan, but dependent policy must be settled before implementation.

## O37 — web/mobile implementation planning, 12 October 2026

**Confirmed owner direction:** web release first; eventual iOS/Android apps must share backend/data/API/permissions/history, with synchronization, current-version checks and conflict handling designed now. Convenient mobile media/document capture is an intended use case. This does not authorize separate client rule engines, a new push channel or an immediate native build.

| Item | State | Decision / proposal and implementation gate |
| --- | --- | --- |
| O37-A: weak/offline connections | **Resolved by explicit answer** | Drafts and media queue locally; consequential actions require an online, current-server-validated explicit submission. Includes publish/quote/select/approve/Start/complete/cancel/payment. Upload recovery is separate from form submission. Same-operation retry resolves an uncertain submitted result without creating another decision |
| O37-B: later native delivery details | Open; does not block shared web/backend contracts | Propose CM/Contractor capture journeys first, with MCST/Admin coverage specified; native push only if separately approved. Propose sensitive conduct/proof views online-only initially and minimal account-partitioned caches. Decide persistent cache scope/retention and native role rollout before those features. Web launch remains in-app bells |
| O37-C: fractional-cent billing precision | Open; before financial implementation | Recommend independently rounding each 4% component to nearest SGD cent, half-up. Preserve basis/rate/rounding version. Existing full-invoice basis, confirmation trigger and three-business-day deadline are settled; do not reopen them |
| O37-D: account deletion/retention | Open; before account-lifecycle/native release behavior | Propose disabling access/removing permitted personal data while preserving required estate decision/financial attribution under an approved retention policy. Define treatment of files, former members and cached data; no automatic erasure of audit/financial history |

**Engineering proposals, not product ambiguity:** architecture recommends a TypeScript modular backend with PostgreSQL, durable worker/outbox, private object storage and managed identity; version-conditional commands, operation idempotency and permission-filtered synchronization. Validate the candidate stack and hosting with bounded spikes. No owner approval of a paid vendor or claim of implemented code is implied.

Draft [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 0.2 and its four [architecture companions](architecture/WEB_MOBILE_ARCHITECTURE.md) record concrete contracts and delivery gates. Open O30 ordinary-repeat/optional-reminder/warranty/unspecified-start policies, O29 archive and specialist decisions remain unchanged. The latest explicit owner answer takes precedence over any earlier “awaiting answer” wording for O37-A.

## Implementation chapter plan and export — 13 October 2026, draft 0.3

**Owner-approved direction:** write one master plus the full chapter sequence for the entire build before execution, prioritize operational foundations/login, and include tests, compulsory inputs, role visibility, state triggers, days/countdowns and notification nuances. Owner requests the complete ZIP for GitHub handoff. [Master plan](IMPLEMENTATION_PLAN.md) now has 20 chapters; all application work and test execution remain future work.

The [decision-gate index](implementation/DECISION_GATES.md) maps existing open rules to the chapters they block, without reopening settled O35/O36/O37-A. The following fine design details are now made explicit as open; documenting them does not approve their recommendations:

| Planning gate | Existing confirmed boundary | Detail still needing direction before dependent implementation |
| --- | --- | --- |
| G01 — account entry | Named accounts, role membership, mandatory human contractor verification | Exact login/credential/recovery method, invitation ownership and account application flow. Recommend managed identity and Admin-controlled authority assignment; no self-claimed MCST/Admin privilege |
| G05 — quote expiry default — resolved 13 October | Contractor quote expires, RFQ never expires; date-only expiry valid through day; selected hold preserved | Owner approves an editable 30-calendar-day suggestion with explicit confirmation; reconfirmation does not extend expiry |
| G06 — credential configuration — resolved 13 October | Required versus optional badges, human authenticity judgment and affected-scope expiry effects | Owner approves explicit Admin setup with no assumed requirements; the accountable contractor must cover every bundled trade. Subcontractor-based eligibility stays deferred |
| G07 — scope classification — resolved 13 October | Material changes require reconfirmation; minor corrections do not invalidate quotes | Owner approves reasoned author classification: scope/quantities/price terms/safety/access/uncertain are material; spelling/formatting are minor; AI never downgrades |

G02–G04/G08–G15 retain their recorded O30/O37/specialist/O29 authority, including unresolved scoring/collection/default warning values, fee-cent rounding, retention, ordinary extra repeats and archival. Engineering provider/schema/retry/calendar choices need recorded specifications and validation; they are not all product-policy questions.

This document organization does not authorise implementation. Application verification scenarios are unexecuted; documentation/link/coverage/ZIP checks are reported separately. [GitHub handoff](implementation/GITHUB_HANDOFF.md) explains private source material, file structure and current-versus-historical authority.

## Chapters 1 and 2 construction — 13 October 2026

Latest explicit owner instruction authorises construction of Chapters 1 and 2, with simple code and backend accuracy ahead of visual polish. This supersedes earlier planning-only authorisation wording for this scope.

**G01 resolved by explicit answer:** email/password sign-in, verified email and recovery; Admin invites CM/MCST and assigns estate memberships; contractors may apply and await human verification before quoting. Named/equal-role authority and confidentiality rules remain unchanged. Security verification/recovery messages are separate from the in-app-only customer activity notification policy.

**Stack approved for local construction by explicit answer:** TypeScript/Fastify and PostgreSQL, keeping development local and choosing paid hosting/identity providers later. The development implementation uses a visibly isolated local identity adapter and PGlite PostgreSQL fallback, with a server PostgreSQL adapter. This does not approve production identity, hosting or paid provisioning.

G14 account deletion/retention remains open. No permanent cleanup or native cache policy is introduced. See [local development](implementation/LOCAL_DEVELOPMENT.md) and [ADR 001](architecture/ADR_001_LOCAL_FOUNDATIONS.md) for actual implementation scope and release boundaries.


## Local sign-in account helper — 13 October 2026

Owner requests account buttons that autofill email/password and automatically include subsequent local users. Implemented as an explicitly enabled development-only helper (LOCAL_ACCOUNT_HELPER=true), restricted to the configured loopback origin and an environment-marked development database. Buttons fill fields only; they do not sign in, verify email or change membership/eligibility. Accounts are queried dynamically and refresh after registration/recovery, on focus and while the sign-in panel is visible.

New local registrations, successful local sign-ins and password resets keep an AES-256-GCM encrypted helper copy, bound to the user and current password hash. The separate encryption key lives under ignored work/local-account-keys. Normal account password hashes remain authoritative; no plaintext password enters database/audit/logs or browser persistent storage. Known fictional fixture credentials are validated before autofill. Pre-existing custom users need one successful manual sign-in to populate their encrypted helper copy; old hashes cannot recover passwords. Disabling the helper conceals its endpoints. It is prohibited in test/staging/production configurations; this does not settle G14 or approve a production credential helper.

Verification: strict TypeScript and browser-script syntax checks; 17 relevant foundation/access/helper tests passed, including dynamic registration, changed passwords, encrypted persistence, stale-copy refusal, normal verification gates, origin/remote denial and disabled-environment behavior.

