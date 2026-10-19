# Chapters 17–18 local build and verification

18 October 2026. Owner-authorised backend-first implementation; [ADR 009](../architecture/ADR_009_INTEGRITY_AND_DECISION_PACKS.md) records the design. The final owner answers in [product memory](../PRODUCT_MEMORY.md) and [decision register](../OPEN_DECISIONS.md) override older advisory-only warning wording.

## Implemented scope

- Four configured warnings with defaults **20% revision / 30% selected gap / 20% cumulative variation growth / 3 offers**. Exact bigint comparisons, inclusive equality, no SGD floor, same-material-scope baselines and independently retained grouped evidence.
- Named MCST/Admin settings with mandatory unchecked prospective-effect acknowledgments, round snapshots and reasoned future-event ticket overrides. Previous quotations, warnings and decision parameters are immutable. Ticket changes invalidate stale job views.
- Explicit version-bound clearance: flagged CM selection waits for MCST even below threshold; MCST combines selection/approval/clearance when choosing directly. Only the chosen flagged bidder carries its revision flag. Both MCST/Admin receive grouped warning notices.
- Flagged variation pauses all ordinary work until clearance. Withdrawal/rejection does not dismiss the hold. Ordinary Start/progress/completion are blocked at the API; factual make-safe records and existing financial obligations remain separate. Review dispositions do not clear or approve extra work.
- Fair-information timeline, exact price bridge, Admin-only protected-access logs and subject-safe counts/queues. Access refusals survive command rollback and create grouped Admin attention; ordinary authorised access is not labelled misconduct. MCST sees only explicitly approved access summaries.
- Role task/ticket search, filters and paging; inherited MCST operations; shared canonical pending-actor projection; named chronology and defined price/recorded-outcome analytics. Notices remain separate from outstanding tasks; future reminders do not defer currently available actions.
- Immutable asynchronous **HTML and JSON** decision packs, role-specific evidence, nested identity concealment, source/version references and later-change/correction indicators. Generation and authenticated download both recheck membership/access/concealment. Short-lived grants can expire or be revoked. Shared outbox retries and failure queues apply.
- Strictly positive new Contractor quotations, including a database invariant; historical zero quotations remain evidence. Authorised reductions and zero-payable settlements/invoices still work. Production analytics exclude explicitly fictional records.

## Verification mapping

The test files contain executable assertions, not just matching test names. Parent test records are included in the runner's counts.

| Planned ID | Actual assertions / boundary |
| --- | --- |
| CH17-T01 | Up/down exact arithmetic; first quote per material scope; new material scope establishes a new baseline; below-threshold rival revision does not inherit another bidder's flag. |
| CH17-T02 | SGD 1.00 versus SGD 1.30 triggers exactly 30%; five cents versus six cents triggers exactly 20%; one cent below equality does not. |
| CH17-T03 | Approved 100 → 110 plus proposed 10 compares prospective 120 against selected 100; pending total is not authorised or double counted; API work pause persists after withdrawal. |
| CH17-T04 | Low-count trigger shares the selection card; selection is submitted as a pending nomination, rather than imposing a three-offer procurement prerequisite. The owner's new clearance gate applies. |
| CH17-T05 | Estate edits preserve prior round policy; a future round takes the new policy; explicit onboarding setup is required and failed publication rolls back its round. |
| CH17-T06 | Missing checkbox or reason after bidding is refused; valid override affects later events; exact text/actor/version/reason persist. Actual browser/DOM controls start unchecked and disable Save. |
| CH17-T07 | Change estate and ticket settings before worker delivery; card policy/trigger remain unchanged. Ticket edits invalidate stale selection versions. |
| CH17-T08 | Below-threshold CM nomination cannot authorise work until exact MCST clearance; combined MCST selection requires explicit clearance/explanation. No implicit consent from a review disposition. |
| CH17-T09 | Several triggers share one card and one warning notice per recipient; injected audit failure rolls back quote/card/tasks/outbox/receipt; same-operation retry commits once. |
| CH17-T10 | Contractor/CM/MCST access boundaries; allowed and denied protected events; Admin-only detailed logs; explicitly approved MCST summary; existing conduct-subject privacy suite remains in the regression. |
| CH17-T11 | New zero/negative quotes rejected, SGD 0.01 accepted; unavailable legacy denominator yields no fabricated percentage or division error. |
| CH17-T12 | Warnings do not create misconduct/reputation findings. **Owner supersession:** flagged variations do pause ordinary work until named clearance; make-safe records remain factual and unauthorised extra work stays blocked. |
| CH18-T01 | Four role queues, canonical next actors, inherited operations, backend forbidden actions and permission-filtered queries; real DOM role changes remove oversight controls. |
| CH18-T02 | Multiple bells/read events leave one task; informational notices excluded; future reminder does not mislabel an actionable payment task. |
| CH18-T03 | Concealed JSON/HTML lacks organisation/user identity and contact strings while retaining permitted prices; generic filenames/CSP/metadata; no bundled restricted originals or fees. |
| CH18-T04 | Contractor pack has only its quote/work record, empty rival selection/approval/history data, and no estate rationale. Another role cannot retrieve that private pack. |
| CH18-T05 | Confidential subject search returns no task/count; pack omits the secret description and case ID. General exports exclude conduct material for every audience. |
| CH18-T06 | Revocation after queueing blocks generation; concealment tightened after generation blocks an existing download; expired/revoked grants fail. |
| CH18-T07 | Later versions flag changes while original downloaded bytes/checksum remain identical; immutable snapshot update fails. Financial correction references use version ordering, including equal recording times. |
| CH18-T08 | Explicit fictional origin is shown locally and excluded in simulated production; no payment/inspection/Feedback outcome is invented for missing records. |
| CH18-T09 | Real in-app browser: labelled fields, initially disabled clearance, keyboard Tab focus, narrow viewport without document overflow, explicit clearance releasing only the work hold; empty-state API/DOM checks. Broader device/screen-reader certification remains a release check. |
| CH18-T10 | Fresh canonical versions and role authority protect commands; snapshot stays frozen as later records change; racing job-load events render one export control. |

Primary suites: `tests/integrity.test.ts`, `tests/dashboard-exports.test.ts`, `tests/oversight-forms.test.ts`. Existing access, quotation, work, completion, billing/support and reputation suites provide the surrounding regression coverage.

## Executed checks

The final complete regression passed **223 test records**, zero failures, cancellations, skips or todos (**222,463 ms**), recorded locally in `work/ch1718-complete-regression.log`. The latest browser-script guard/race run passed **5 tests**, including a subsequent same-context refresh check; this overlaps the full run and is not five extra distinct tests. Strict TypeScript/browser syntax checks, compilation and documentation/link validation passed. The documentation validator reports 20 chapters and 206 planned scenario specifications, a separate documentation count from executed test records.

The focused SQL/API adversarial run passed **24 records**, and the affected workspace/dashboard/forms regression passed **29 records**, with zero failures/skips. These overlap the complete run. Earlier checkpoints found the intentionally superseded zero-quote assertion and an old global Admin-bell count assumption; their corrected tests preserve zero-settlement coverage and isolate each actual task's notice/anchor behavior. The browser also exposed duplicate export controls during overlapping loads and an incorrect scheduled label for an actionable task; both were fixed and covered.

The real browser used **only an isolated fictional in-memory database**, with no Gemini/provider calls. It verified final settings 20/30/20/3, unchecked acknowledgment and disabled Save, correct currently actionable approval wording, one export action after overlapping loads, HTML queued → ready → actual file download, unchecked/explanation-bound clearance, keyboard focus and explicit hold release. At the narrow viewport the measured document width did not exceed its available viewport. The proposed variation remained unapproved and the authorised total remained SGD 100.00 after clearance. The earlier exported snapshot showed a later-change indicator without being rewritten. No warnings/errors were recorded in the final browser console check. [Narrow-screen control evidence](evidence/CH1718-clearance-mobile.jpg) and [clearance result](evidence/CH1718-clearance-result.jpg).

The persistent local API was restarted and verified ready on **http://127.0.0.1:3000** with migrations 017–018. Restart encountered the intentionally guarded stale runtime marker of the stopped old process. Automatic approval review rejected removing those original marker files. Recovery instead preserved the original `work/development-db` directory, copied persistent files excluding runtime markers into `work/development-db-ch1718`, verified **all 1,429 file checksums**, applied migrations and compared record counts. Six users and all job/quote/payment/audit/file counts were unchanged (the original development database had no jobs). No reset or fixture installation occurred. Only DATABASE_PATH changed in the ignored local `.env`; existing provider configuration was preserved. `work/ch1718-migration-verification.json` records count/checksum verification. The normal API returned HTTP 200 for readiness and both new script assets; authenticated dashboard/settings checks returned the approved defaults. New estate settings remain explicitly unconfirmed until MCST/Admin saves the required acknowledgment.

The terminal-managed background process subsequently ended during verification cleanup. To keep the normal app independent of that terminal session, the already-migrated data was copied without runtime markers to **`work/development-db-ch1718-current`**, with **all 1,475 migrated-file checksums verified** and both earlier directories preserved. The ignored `.env` now points to this final path. A detached hidden Node process serves port 3000; readiness returned HTTP 200 and its error log was empty. `work/ch1718-detached-verification.json` records the second copy check. No original marker or database file was deleted.

## Operation and remaining boundaries

Start normally with `tools/dev.ps1`; startup applies migrations without reset/reseed. The current persistent API already runs the new build at port 3000. For an isolated fictional preview use `pnpm exec tsx tools/chapter1718-preview.ts` and **http://localhost:3188** (matching its configured Origin). Test fixtures intentionally isolate earlier chapters with broad test-only warning settings; the dedicated integrity tests and development defaults use the approved parameters.

Existing published rounds without a policy are not silently assigned retrospective settings. MCST/Admin must explicitly adopt a future-event ticket override before new quotes, selection or monetary variations. Historical records remain intact. New rounds require confirmed estate settings.

Downloads are private authenticated HTML/JSON files; printable HTML is not a native PDF generator. No retention/deletion, bank execution, native push, automatic fraud score, fault percentage, optional integrity concentration/split-job/usefulness analytics or production deployment is introduced. PGlite verification is distinct from server PostgreSQL, production scale/operations, broader accessibility/device checks and the remaining Chapter 19 release gates.
