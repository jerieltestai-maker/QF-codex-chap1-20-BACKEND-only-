# Chapters 15–16 local build — 18 October 2026

Owner-authorised backend-first construction: due-only durability feedback, linked aftercare, inspection questionnaire, verified external references, moderation/replies, reproducible scores, passports and grounded comparison advice. G09/G10/G11 and the late-observation rule were explicitly approved. [ADR 008](../architecture/ADR_008_FEEDBACK_AND_REPUTATION.md) records the design; [Gemini setup](GEMINI_SETUP.md) records activation and cost boundaries.

## Delivered behavior

- Complete settlement schedules feedback after 30 calendar days. Date-only actual receipt dispatches at 09:00 Singapore time. Partial transfers never start it. Performed-work cancellation uses Chapter 14's explicit settlement anchor; an unstarted cancellation creates no repair observation or fake transfer.
- Feedback is a separate obligation. Before due there is no Give feedback action. Due feedback remains available on Closed jobs and does not change closure. The actual inspector's inherited role remains authoritative. Initial successful notice starts the existing two/five-business-day response sequence; failed delivery cannot start it.
- Assessable feedback requires stars and a nonblank positive/negative observation. Unable to assess requires an explanation and no rating. Both stop obsolete response/escalation work. Silence creates no positive evidence. Pending anchor corrections reschedule safely; completed assessments preserve actual observation dates and immutable correction history.
- Aftercare is separately requested and linked into shared Support. A low rating alone creates no case or liability. Physical remedies allocate fresh global inspection rounds; Admin cannot resolve without acceptance of the exact current round. Shared generic support commands cannot bypass this engine. Repeated failure preserves rounds. Explanation-only outcomes have their own recorded evidence. Original invoice, confirmation, fee and transfer records are not repeated.
- All five inspection answers are required independently from operational acceptance; low answers require a reason. Drafts persist locally by job/context; final confirmation is not persisted. Corrections create new evidence versions requiring fresh moderation.
- External references retain independently checked provenance/interview evidence, private referee contacts and uncertainty. Four references produce no external points; five complete verified approved references unlock scoring. Public source counts distinguish external references and QuoteFix jobs.
- Admin publication/redaction/void decisions and Contractor replies are versioned and audited. Replies need separate approval. Voided text stays readable on grey with legible foreground and no public exclusion label/private reason. Masked CM projections withhold identity-bearing free text, contacts and private reasons.
- Approved exact arithmetic produces Pure reputation score and Reputation score with CM priorities. Scores retain formula/input/moderation provenance and count each job once. Unavailable/contested/unapproved durability adds no points. Late observations contribute using their actual observation date. Current price/availability remain distinct from historical ratings.
- Simple quick/expanded passport controls show scores, dimensions, source counts, durability statuses, moderated entries/replies and limitations. Existing job history retains price movement and work/inspection facts; no unsupported specialty-strength badges are generated.
- Explicit comparison advice uses current eligible quotes and current evidence. No preference/unsupported priorities/missing comparable facts withhold a winner. Secondary priority breaks supported primary ties. Failure preserves manual factual comparison. Changes to RFQ/quote/access/settings/reputation reject stale advice and selection review. Selected evidence/advice remains immutable and respects the reader's current masking rules.
- Gemini 3.5 Flash-Lite is opt-in and configured locally. One anonymous fictional live comparison passed. Credentials remain server-only. Input/output/time bounds, strict IDs/citations, server-written explanations, idempotency, concurrent call sharing and saved-result reuse limit exposure/cost. No automatic retry or fallback paid model is configured.

## Planned verification mapped to assertions

These rows describe assertions actually present in feedback.test.ts, feedback-integration.test.ts, reputation.test.ts, comparison-advice.test.ts and gemini.test.ts. Combined test names alone are not proof of coverage.

| ID | Executed assertion coverage |
| --- | --- |
| CH15-T01 | Partial actual receipt leaves no complete-settlement feedback obligation |
| CH15-T02 | Actual date-only versus notice+7-day assumed settlement yields different correct 30-day dates; invoice/fees are not substituted |
| CH15-T03 | Exact instant/date/year-boundary arithmetic; late discovery preserves original due date and starts fair response from notice; failed notice/retry cannot start/reset clocks |
| CH15-T04 | Before/at due submission eligibility, Closed unchanged and actual MCST inherited capability; browser shows due-only form |
| CH15-T05 | Positive and negative rating without a real nonblank observation rejected |
| CH15-T06 | No response escalates with dated Admin follow-up; Unable stops work without rating; silence creates no evidence |
| CH15-T07 | Low rating alone leaves repair cases and financial records unchanged |
| CH15-T08 | Repeated physical remedy/failed inspection; old-round acceptance rejected; exact fresh acceptance/Admin verification; unchanged invoice/confirmation/fee/transfer counts; generic bypass denied and later generic repair uses next global round |
| CH15-T09 | Real authorised-but-unstarted zero cancellation excluded; recorded performed-work zero settlement anchors due feedback without transfer |
| CH15-T10 | Pending anchor reschedule; completed observation retained; one correction chain; duplicate/racing submissions and operation recovery safe |
| CH16-T01 | Four/five-reference boundary, external/job source counts, private interview/contact projection and equal units |
| CH16-T02 | Incomplete rubric/low answer without reason rejected; missing history has no placeholder score |
| CH16-T03 | No preference produces identical pure/adjusted values |
| CH16-T04 | Strong/weak component golden values, normalized primary/secondary behavior and no global-score mutation |
| CH16-T05 | Pending/unapproved/contested durability omitted; no clean-repair points; approved late observation changes score 0→16.1 while one job remains one unit |
| CH16-T06 | Corrections, repeated physical rounds and feedback retain one job-level scoring unit and immutable evidence history |
| CH16-T07 | Contractor prepublication visibility, reply approval, stale correction approval denial, void privacy/score effect, immutable selected evidence |
| CH16-T08 | Masked CM passport/entries/advice/selected history withhold raw contacts, private reasons and free-text identity clues; rival Contractor denied |
| CH16-T09 | Provider error/hang/invalid candidate fallback; quote revision/access change during evaluation rejected; factual comparison survives |
| CH16-T10 | Newcomer current price/availability can outrank perfect historical scores; no cheapest default for No preference; unknown/custom availability withholds winner |
| CH16-T11 | Formula/config/input IDs retained; archived formula-version snapshot coexists unchanged with active version; SQL update rejected; later moderation cannot rewrite selected snapshot. No unapproved replacement formula is deployed |
| CH16-T12 | No periodic reputation timer; audited redaction/approved refresh and no public void label; unapproved percentages omitted |
| Additional | Database-trigger failure rolls back evidence/task/audit/receipt; preflight bad CSRF/stale/unconfirmed requests make no provider call; duplicate/concurrent requests share one call and unchanged saved evidence reuses it; Gemini anonymous request/schema/limits/cancellation/key-file configuration/error-body privacy |

## Executed checks

The final combined regression passed **195 tests**, with zero failures, cancellations, skips or todos (271,208 ms). The exact local log is work/chapters1314-final-regression.log, run by the coordinated Chapter 13–14 chat against all current test files, including final support privacy/account-scope fixes and every feedback/reputation/Gemini/aftercare integration test. TypeScript/browser syntax checks, compilation and documentation validation passed. PowerShell setup syntax passed too.

The five Chapter 15–16 suites contain **38 tests** including parent test records. Targeted checkpoints all passed: feedback/integration 17; reputation 9; comparison 7; Gemini 5. These overlap the complete regression suite and are not extra distinct tests. The earlier 193-test checkpoint is historical, superseded by the final 195-test run. Additional affected form/upload/recovery checks passed 16 tests and overlap the full run.

One explicit `pnpm exec tsx tools/check-gemini.ts` live call passed against gemini-3.5-flash-lite with fictional anonymous two-candidate data. Automated tests use mocked providers; they do not spend API tokens. No real customer data was sent for verification.

The normal persistent development API starts at http://127.0.0.1:3000 with Gemini configured and all current migrations applied; the root page returned HTTP 200 with feedback controls. Startup initially encountered an old ownerless runtime marker and then permission denial creating the engine's postmaster.pid in the original directory. Recovery first verified an independent copy, preserved the original directory under work/startup-recovery, restored the verified copy to the same development path, and started without reset/reseed. Recovery probes/backups remain in ignored work/recovery; no retention cleanup was performed.

A real in-app browser used an isolated fictional in-memory preview on port 3186: sign-in, Closed job, due form, draft save/reload with confirmation cleared, explicit rated submission, submitted state and closure preserved. [Browser evidence](evidence/CH1516-feedback-browser.png). This is a focused smoke check; it does not claim every role/form, mobile screen or accessibility interaction was manually tested. API/SQL tests cover the consequential authorization, moderation, financial and race paths.

## Boundaries and operation

Migration 015 adds feedback/reputation/aftercare storage; migration 010 is owned by the concurrent billing/support build. Normal API startup applies pending migrations without resetting data. Restart to load changed .env Gemini configuration. Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `python tools/plan_bundle.py validate`.

The dedicated aftercare engine requires previously accepted work and a confirmed original invoice on a non-cancelled job. Cancelled-job concerns use Chapter 14's linked Support/claim/settlement engine; the dedicated aftercare route cannot silently restore cancelled work or create financial authority. Its performed-work settlement can still trigger due durability feedback.

Fault/callback percentages remain explicitly deferred until attribution, occurrence-window, denominator and evidence rules are agreed. The owner requested a reminder when Chapter 20 is complete: a chapter checkpoint and scheduled milestone monitor preserve it. Specialty-strength thresholds, warranty automation and retention policy remain open. No unsupported specialty/first-month outcome claims are displayed.

Tests use PGlite's PostgreSQL engine. Server PostgreSQL, deployment recovery, production-scale performance, wider browser/device accessibility checks and production release remain outstanding. Gemini store=false is a request-storage setting; this build does not assert a broader Google retention policy. Bulk ingestion is not implemented by this comparison adapter.
