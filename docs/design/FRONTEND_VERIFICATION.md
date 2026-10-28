# Desktop frontend verification — 28 October 2026

This record distinguishes complete suites, focused checks, browser journeys and limitations; overlapping counts must not be added as if they were different scenarios.

## Baseline and visual authority

Baseline sign-in: `work/frontend/before/` at 1440, 768 and 390px. The shared Taste direction is Achromatic ledger, seed 42328629; no redraw. The owner subsequently supplied the QuoteFix logo and blue workflow illustrations, now part of [DESIGN.md](../../DESIGN.md).

Taste lint: **0 failures**; warnings concern clock/checksum zero-padding and preserved workflow punctuation, not decorative numbering. The final owner-artwork sign-in inspector reached **0 failures / 0 warnings** at 1440, 768 and 390px. Every listed fold/page capture was opened and inspected. Populated inspection/invoice/closed-work captures were also inspected at desktop and narrower widths.

## Integration findings

| Priority | Finding and fix | Evidence |
| --- | --- | --- |
| P1 | Quotation comparison was nested under a hidden repair view; moved to its own navigation-mapped section | Populated browser selection journey |
| P1 | Quote/comparison errors could be written in an invisible Contractor panel | Action-local live statuses and actual-script checks |
| P1 | Pending-submission recovery was inaccessible to Contractors | Shared recovery control for all signed-in roles; operation regressions |
| P1 | Notifications/evidence guide were permanently hidden; refresh/session events lacked listeners | Cross-role navigation checks; explicit hidden/event fixes |
| P1 | Empty-estate procurement setup had no readable current settings | Scoped read projection, standalone form and role/privacy/version regression |
| P1 | Revocation could leave one surviving membership impossible to choose | Context selector now remains available when no context is selected |
| P1 | Legacy support record lacked initial domain-case UI controls | UI uses the backend's supported initial review/version contract |
| P2 | Overlapping loads could replace newer account/job state | Epoch, version and per-load generation checks |
| P2 | Routine reloads could erase unsent inputs or silently omit selected evidence | Record-scoped dirty preservation, attachment retention and final evidence guards |
| P2 | Slider-only final actions and unchecked negative receipts reached preventable server rejection | Equivalent Confirm controls and local declaration checks; actual-script tests |
| P2 | Raw JSON obscured evidence, histories, analytics and public profile facts | Safely text-rendered lists, facts and financial tables |
| P2 | New draft retained the previous repair's title in the shared header | Selected-repair context cleared on new draft |
| P1 | Public assets and reads could exhaust the old global request limit during rapid review | Separate read/command/identity budgets, asset exemption, actual cap regressions and final rapid browser journey |
| P1 | Rate limiting an uncertain retry could discard its original operation identity | The stable command key survives 429; actual client regression confirms the same identity through success |
| P2 | Support repair controls could appear before execution or the fresh uninspected round | Current completion projection and exact-round gating, with actual-script branch regression |

## Test evidence

- Initial complete PostgreSQL regression during integration: **291/291 records across 35/35 files passed**, zero failures/skips/cancellations. The final run after all shared request-budget and UI corrections passed **305/305 records across 38/38 files**, with zero failures/skips/cancellations and no automatic retries. These suites exercise real domain/API authorization, money, idempotency, timers, uploads and native contracts.
- Final focused browser-script suite: **55/55 passed**, zero failures/skips. It executes the actual form, command and upload scripts; it includes rate-limited uncertain retry, support physical-round prerequisites and scoped dirty preservation.
- Affected PostgreSQL procurement/reputation/comparison/settings/badge checks: **36/36 passed**. Affected access/foundation/request-budget checks: **16/16 passed**. These overlap the complete suite and are separate evidence, not additive scenario counts.
- Shared helper checks verify record-bound draft restoration, exclusion of confirmations/secrets and bounded timeout without mutation retry.
- Focused form checks exercise actual browser scripts for quoting, work, payments, cancellation, fees, aftercare, moderation, integrity and exports.
- The new zero-job procurement-settings check covers same-estate authorization, private address filtering and stale-write rejection.
- Four-role browser smoke: **no JavaScript exceptions and no horizontal overflow** at 1440, 768 and 390px. Honest choose-a-repair empty states were observed before any operational job existed.
- Additional isolated rendered-state checks: **4/4 passed**, covering linked/focused sign-in validation errors, narrow populated inspection, navigation inert/Escape behavior current MCST invoice review, and recovery of a surviving membership after context revocation. These states were API-prepared; the consequential interactive journey below is separate.

## Isolated browser journey

`tools/frontend-journey.mjs` starts a fresh fictional PostgreSQL schema and separate local API; it never seeds the prototype database. It drives real HTML controls, declaration checks and keyboard slider equivalents, with SQL assertions of resulting state. Fixture infrastructure provides a deterministic scanner and clock; that does not constitute new proof of production malware scanning or physical bank transfer.

The final journey **passed 12/12 checks**, with **zero unhandled browser exceptions, zero 429 responses, no worker error, and confirmed isolated-schema cleanup**. It covers private workspace creation; reviewed RFQ publication; Admin company/trade verification; Contractor sealed quote; exact selection; start proposal; exact date acceptance without auto-Start; actual Start plus combined invoice/completion; CM inspection; MCST invoice/transfer; Contractor actual receipt and Closed; role-filtered HTML decision-pack generation and populated narrow layouts.

Final evidence is under `work/frontend-journey/final/`; a sanitized [journey summary](evidence/journey-summary.json) is committed with representative [rendered evidence](FRONTEND_AUDIT.md). The earlier complete `run-4` also passed 12/12 with its original conservative rate pacing.

Observed failed attempts remain disclosed: initial fixture enum and test selector mistakes; capture attempted before the replacement form finished rendering; an earlier comparison-navigation defect; and a separate rapid rendering attempt which exposed the coarse global rate limiter. The limiter was corrected and the final rapid journey and rendered checks passed. Those failures are not combined with final successes to manufacture a green run.

Final strict TypeScript, browser syntax, compilation and planning/link validation passed. The complete suite used two file workers. Application checkpoint: **5683552**; repeatable browser harness: **18cc8db**. The [sanitized regression summary](evidence/regression-summary.json) records exact totals; operational logs remain ignored under work/. All 15 protected SQL migration blobs matched their pre-task HEAD bytes. All 29 copied owner PNG checksums matched the staged image bytes. No runtime/configuration/key/data path was staged.

## Remaining evidence boundaries

This is desktop Chromium/browser evidence, with narrower viewport emulation. It is not physical-device certification, a complete assistive-technology audit, a load test or a hosted release. Existing open product policies, complete native parity/OS transfers and production identity/storage/recovery remain their own gates. No checksum-protected SQL migration is edited.
