# Chapters 11–12 local build record

**14 October 2026.** Owner-authorised construction with backend accuracy and simple code first, following Chapters 01–10. The explicit answers defer inspection reputation questions to Chapter 16 and fee arithmetic to Chapter 13; both memory files retain those boundaries.

**15 October re-audit:** the owner requested a complete verification review after interruption. [The audit](CHAPTERS_11_12_AUDIT.md) supersedes broad completion/coverage interpretations of this initial record, lists corrected implementation and test gaps, and maps each of the 22 planned verification IDs. The background regression passed 126 tests; the final affected-suite recheck passed 33 tests. Later-chapter integrations and the blocked real-browser workflow remain explicit limits.

## Implemented

- Combined required ready invoice and irreversible completion declaration, optional photos, separate physical occurrence/report time and preserved target/version/lateness provenance.
- Operational inspection checklist, explicit positive acceptance and independent unsatisfactory route; immutable originating findings, contractor responses and new physical rounds requiring new inspections. Invoice-only corrections and unchanged-scope price variations retain valid acceptance; new physical work invalidates it.
- Immutable invoice corrections, exact authorised quote/effective-variation reconciliation, MCST/Admin difference notices, exact named MCST confirmation and one durable Chapter 13 billing source. An explanation or viewing it authorises no price change.
- Completed-transfer proof, exact partial balances and rationale, optional references, guarded integer-cent accounting, permanent proof reuse prevention and possible-duplicate review without merging genuine instalments.
- Per-transfer actual/date-only receipt, first-issued-notice +7-calendar-day assumption, failed-notice protection, historical assumed popup and Understood acknowledgment without actual-receipt inference. Disputed transfers are excluded until verified correction; later issues preserve prior history.
- Transactional receipt/issue/assumption handling, attributable Admin payment execution evidence, truthful MCST progress, original T01 +1/+3-business-day chase and retained dated follow-up, issued-notice T08/T09/T22/T07 response tasks.
- Automatic guarded closure, zero performed-work settlement without a transfer, preserved cancellation outcome, post-closure payment support, and actual/assumed settlement anchors for Chapter 15.
- Private file purpose/ownership/readiness, estate/assigned-company access, CM concealment including raw documents, current authority on recovered submissions, simple forms and exact-version load guards.

Bindings: migration `009_completion_and_payments.sql`; `packages/domain/completion-core.ts`, `completion-service.ts`, `payment-service.ts`, `payment-clocks.ts`; API `apps/api/src/completion-routes.ts`; existing panel `apps/web/work.js`. [ADR 006](../architecture/ADR_006_COMPLETION_AND_PAYMENTS.md) records invariants and later chapter boundaries.

## Verification

The complete local regression suite passed **113 reported tests, zero failures and zero skipped**. Strict TypeScript checking, browser-script syntax checking and compilation passed. After the last payment-follow-up fixes, the complete Chapters 11–12 file passed again with **15 reported tests, zero failures and zero skipped**, including the requirement that an unverified Admin verdict retain the dispute and a compulsory dated follow-up. The foundation upgrade check was changed from a hard-coded eight-migration count to verifying the exact installed migration filenames; migration 009 and existing user records are preserved.

`tests/completion.test.ts` exercises real SQL/API publication/selection/Start, purpose-specific scanned uploads, completion/repeated inspection, exact invoice confirmation, transfer/receipt/issue/closure commands, duplicates, race/rollback and privacy scenarios. It also checks that valid partial transfers suppress false missing-update notices while retaining the unpaid balance, and that an unverified receipt cannot fulfil support or allow closure. Disposable fictional data and test scanner adapters are used; no persistent user database is modified by tests.

Documentation generation/validation passed: 20 chapters, 206 planned scenarios, 83 nodes and 23 timers. These planning counts are distinct from executed tests. Logs are retained under ignored `work/chapter1112-final-tests.log` and `work/chapter1112-unverified-check.log`.

An ephemeral fictional browser preview ran on port 3305 and was stopped after the check. Browser automation could not attach to the in-app webview or Chrome session, so **no browser walkthrough or screenshot verification is claimed**. Browser-script syntax and real API/state tests passed; visual and accessibility verification remain outstanding before release. No persistent development data or real recipients were used.

## Running and remaining boundaries

Restart the normal local API with `tools/dev.ps1` to load this code and migration 009; existing authorisations, accounts and history are preserved. A configured healthy scanner remains required for actual file readiness. The existing fictional `tools/chapter910-preview.ts` also exercises the expanded authorised-work panel; use a separate preview port and ephemeral database for UI checks.

Reputation questions/score remain deferred to Chapter 16; fee arithmetic/assessment and collection remain Chapter 13. The unique billing source records the confirmed full invoice basis/trigger without inventing cent rounding. Comprehensive case/cancellation/amended-settlement workflows and Feedback dispatch/forms remain Chapters 14–15, and are required before a real-money pilot. Production identity/storage/hosting, server PostgreSQL concurrency, security/backup/accessibility and release checks remain Chapter 19. No bank transfer, paid vendor, external recipient, deployment or permanent cleanup is introduced.
