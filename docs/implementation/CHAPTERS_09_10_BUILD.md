# Chapters 09–10 local build record

**14 October 2026.** Owner-authorised backend-first construction following Chapters 01–08. Both owner answers are recorded in the product and decision memory: G03 start-date requests with existing 2/5-business-day follow-up; CM variation approval within the last MCST-approved amount.

## Implemented

- Required Start estimate alternatives, actual server Start, saved completion targets, temporary +24h initial-estimate duty and Admin-only reasoned extensions.
- Agreed start proposals/acceptance, compact completion-date proposals, optional dated progress notes/evidence and truthful missed-record attention. No automatic actual Start, completion, acceptance or penalty.
- Scope/price/timing requests by the estate or assigned contractor; exact Contractor confirmation; immutable proposal revisions and decisions; zero impact and signed cent differences; cumulative authorised totals and preserved MCST authority limits.
- Correct CM/MCST route, compulsory preset rejection reason/Other explanation, optional withdrawal note, equal-role party authority and automatic W1/W2/R3/R1/E2 context resolution. Pending work changes never take effect before approval.
- Reasoned work interruption and linked support, explicit safe/feasible Admin resumption or unresolved named/datetime follow-up. Support requests alone preserve existing targets; lateness Okay is distinct from accepting a date.
- T20/T21/T23 checkpoints, deduplication, retained missed history and obsolete task/notice suppression. G03/T22 and variation T22/T07 response periods start only at successful notification issuance. Existing retry/failure monitoring is reused.
- Assigned-company/estate isolation, private checked evidence, historical CM concealment, scoped receipts, current-access/version rechecks, transactional rollback and cancellation guards.

Bindings: migration `008_work_and_variations.sql`; `packages/domain/work-core.ts`, `work-service.ts`, `variation-service.ts`, `work-clocks.ts`; `apps/api/src/work-routes.ts`; simple forms in `apps/web/work.js`. [ADR 005](../architecture/ADR_005_WORK_AND_VARIATIONS.md) records invariants and later integration boundaries.

## Validation

The complete local suite passed **98 reported tests, zero failures and zero skipped**, including the existing Chapters 01–08 tests and 19 additional reported work/variation cases. Strict TypeScript checking, browser-script syntax checking and compilation passed. Documentation generation/validation passed: 20 chapters, 206 planned scenarios, 83 nodes, 23 timers and 867 local links. Planned documentation scenarios are distinct from executed tests.

`tests/work.test.ts` covers input alternatives, 24h weekend arithmetic, late estimate extensions, missed Start, exact revised dates, stale Okay, lateness acknowledgment, threshold equality/crossing, preserved MCST limit, rejection/withdrawal, infeasible work, named access follow-up, all return-context primitives, competing approvals, cancellation races, policy changes, files/masking, equal-role authority, reused support, transaction rollback and upgrade backfill. A cancelled-work fixture originally expected a rejected command to commit its observer's supersession; that expectation was corrected to wait for the durable worker, preserving the transaction rollback invariant. The final complete run includes that correction.

The disposable fictional browser preview verified disabled Start until its compulsory alternative and confirmation were supplied; an unknown-estimate Start displayed its actual time and +24h estimate duty. Contractor submitted a SGD 100 → SGD 140 scope change, CM reviewed the exact proposal and approved it, and reload preserved the SGD 140 authorised scope/amount and Carrying out work stage. Visual evidence is saved under ignored `work/chapter910-approved-preview.png`. No real accounts, estates, external recipients or persistent development data were used.

## Boundaries and running

Normal startup remains `tools/dev.ps1`; restart the existing server to load the code and apply migration 008. The separate preview is `node node_modules/tsx/dist/cli.mjs tools/chapter910-preview.ts`, with an ephemeral memory database on port 3304. It uses the normal fail-closed file inspector; no scanning bypass is added.

Chapter 11 still owns the combined invoice and irreversible completion package, physical-completion provenance, real inspections and affected acceptance invalidation. Work is complete is visibly unavailable in this local build. R3/R1 return contexts are implemented and tested as integration primitives; live invoice/inspection bindings remain in their owning chapters. Chapter 14 owns cancellation/settlement workflows and full case execution; the new backend proves its cancellation guards with explicit fixture state, rather than inventing settlement commands. No financial/reputation/warranty/retention policy or production vendor was introduced. Local verification does not certify production release.
