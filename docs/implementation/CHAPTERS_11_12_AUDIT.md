# Chapters 11–12 interruption audit

**15 October 2026.** Owner-requested re-audit of the implementation and its verification claims. [Build record](CHAPTERS_11_12_BUILD.md), [Chapter 11](chapters/11_COMPLETION_AND_INSPECTION.md), [Chapter 12](chapters/12_PAYMENTS_AND_CLOSURE.md), [ADR 006](../architecture/ADR_006_COMPLETION_AND_PAYMENTS.md).

## Findings and fixes

The earlier passing suite did not demonstrate every claim implied by its combined test labels. This audit traced each of the 22 planned verification IDs to actual commands, state assertions and user controls. It found and corrected the following gaps without changing open product policies:

| Finding | Correction and verification |
| --- | --- |
| An authorised scope change before the first inspection prevented both inspection and physical resubmission | Supersede the old review duty, preserve its uninspected package and permit an exact-origin new physical round. The audit races a real old failed-review submission against a new remedy and checks retained findings/current round. |
| Pre-command observation could assume receipt and change the job version before the user’s first receipt/issue transaction completed | The user response runs before the transaction’s uncommitted silence fallback. Tests explicitly exercise receipt-first, issue-first and worker-first at the exact deadline; a later issue preserves assumption history. |
| No Payment Issue path existed for an unpaid balance with no recorded transfer | Added assigned-Contractor contextual balance intake/reuse and a narrowly scoped Admin execution-verification command. It cannot resolve before accepted current work and full recorded settlement; it reuses the exact accepted inspection. Comprehensive case/cancellation powers remain Chapter 14. |
| The form always sent an empty evidence list and could not attach optional completion/remedy evidence | Added optional checked evidence in its own disclosure; absence is allowed, while chosen evidence must be ready. API and executed form-script tests check the actual submission payload. |
| “Optional” API fields still had to be present, even when empty | Initial completion explanation/evidence and full-transfer reference/rationale are truly optional. Partial rationale, corrected-round explanation and decisive confirmations remain conditionally required. |
| Repeated payment progress dates left older follow-up timers active | Replace the prior pending T11 timer, preserve the original confirmation-based T01 dates and retain the current task/version. Tests assert one pending current follow-up and unchanged balance. |
| Payment countdown displayed an obsolete +1 date and generic wording | Project the actual next saved/current follow-up and use the approved role-specific prefix. CM/Contractor do not receive the payment-follow-up countdown. |
| Completion/payment fields and selected file bytes could be lost after interruption/reload | Persist partitioned text drafts and IndexedDB upload queues. Confirmations remain unchecked after restoration; prior-version drafts require review. Tests cover reload, a lost committed chunk response, account/job changes, concurrent resume and upload-only versus consequential submission. |
| A competing-MCST test gave both actors one actor’s private staged proof | Give each competing MCST its own ready proof so both commands are otherwise valid; only the current balance/version can win. |
| Page header still described Chapters 1–10 | Updated the local build label through Chapter 12. |

Work upload queues retain account/context/job/purpose/round-specific slots. A later physical round does not inherit the earlier round’s completion evidence automatically. Checked server files and immutable history are preserved; only redundant temporary queued bytes are removed when the server file is ready. No business-file deletion or retention policy is inferred.

## Verification matrix

`C` = `tests/completion.test.ts`; `A` = `tests/completion-audit.test.ts`; `F` = `tests/work-forms.test.ts`; `U` = `tests/work-uploads.test.ts`. F executes the production form script against a deterministic DOM/API fixture; it is not a Chrome screenshot/accessibility test. U executes the production upload queue with interrupted server responses and persistent fixture storage. C/A exercise real SQL, API, permissions, outbox and worker boundaries using isolated fictional data and test scan adapters.

| Planned ID | Actual assertions / evidence | Boundary |
| --- | --- | --- |
| CH11-T01 | C/A: missing or unready invoice refused; no photo fields accepted; ready optional evidence linked to its round | Verified locally |
| CH11-T02 | C/A: upload alone creates no declaration or review task; F: unchecked slide sends no command; U: upload resume never submits completion | Verified locally |
| CH11-T03 | C/A: findings required, negative outcome does not require positive checkbox; F: actual Unsatisfactory control sends negative route with checkbox false | Verified locally |
| CH11-T04 | C/A: new corrected round/current origin, new T08 task and exact 2/5-BD dates; no clock on failed initial issuance; F: Inspection [2nd] | Verified locally |
| CH11-T05 | A: accepted second round survives financial case verification/resolution, with exactly the original two inspection events | Verified for the implemented payment case; general Chapter 14 D8 binding remains later work |
| CH11-T06 | C/A: invoice-only or unchanged-scope price reduction retains acceptance; new physical work/scope requires a new inspection | Verified locally |
| CH11-T07 | C/A: even one-cent mismatch blocks confirmation, notifies MCST/Admin and remains blocked after reading explanation; immutable revisions and fresh correction duty | Verified locally |
| CH11-T08 | C: unchanged-operation retry/recovery gives one immutable declaration, invoice/package and round | Verified locally |
| CH11-T09 | C/A: stale round rejected; actual failed-round review/resubmission race cannot accept older work; origin findings retained | Verified locally |
| CH11-T10 | C/A: operational acceptance works without rating fields; no invented reputation score | Owner deferred questionnaire/scoring to Chapter 16 |
| CH12-T01 | C/A: CM confirmation/transfer denied; stale job, amount or invoice version refused; equal-role named MCST source; immutable unique confirmation | Verified locally |
| CH12-T02 | C/A: missing/unready/wrong-purpose proof or completed-transfer attestation refused | Verified locally; attestation is not bank-account verification |
| CH12-T03 | C/A: partial rationale required, full reference optional, exact received/disputed/unsent/outstanding amounts | Verified locally |
| CH12-T04 | C: late reported transfer anchors +7 days to actual issued notice, not bank date; immediate earlier actual receipt accepted | Verified locally |
| CH12-T05 | C/A/U: failure/retry/read/new login/device do not reset issued window; interrupted chunk resumes with one intent | Verified locally |
| CH12-T06 | C/A: separate instalment windows, one disputed versus one silent, no disputed assumption or duplicate allocation | Verified locally |
| CH12-T07 | A: deterministic receipt-first/issue-first/worker-first deadline ordering; C: concurrent worker/user result; later issue preserves history and excludes receipt | Verified locally |
| CH12-T08 | C/A: one transfer/notice/anchor on operation retry/lookup, and access denial after revocation; F/U cover the corresponding control/queue boundaries | Verified locally |
| CH12-T09 | C/A: full receipts with unresolved transfer/balance case do not close; verified final obligation closes automatically and reuses accepted work | Verified locally |
| CH12-T10 | C/A: zero performed-work invoice needs no transfer; cancellation fixture remains Cancelled; post-closure payment issue retains prior history | Actual cancellation settlement/aftercare workflows remain Chapters 14–15; do not call that integration complete |
| CH12-T11 | C/A: paperwork progress creates no money, preserves original chase/balance, dates next follow-up and supersedes old dates; F: responsible-role countdown | Verified locally |
| CH12-T12 | C/A: assumed record and popup flag, Understood is not actual receipt and dismissal persists; F: actual popup/acknowledgment wiring | Script/API verified; real-browser workflow remains unverified |

## Executed checks and limitations

The interrupted background regression run completed successfully with **126 reported tests, zero failures and zero skipped**. It started before F was added. After the final test-validity and context/round-slot refinements, **C/A/F/U passed together: 33 reported tests, zero failures and zero skipped**. The counts overlap: they are not 159 different tests, and this is not a claim of one 131-test whole-suite run. Strict TypeScript checking, browser-script syntax and compilation passed. Documentation validation passed independently of application tests.

Exact logs are retained under ignored `work/chapter1112-audit-full.log` and `work/chapter1112-audit-final-focused.log`. Run the full suite with `node node_modules/tsx/dist/cli.mjs --test --test-concurrency=2 'tests/*.test.ts'`; run the relevant final checks with the four C/A/F/U filenames. The JSON/API assertions and fake-DOM tests are explicitly distinguished from actual browser verification above.

The browser tool could open the isolated fictional preview’s sign-in page in Chrome, but subsequent input and DOM/CDP inspection timed out. No successful completion/inspection/payment browser walkthrough, screenshot or accessibility verification is claimed. This is a concrete tool limitation, not a passing browser test. The preview uses only ephemeral fictional data and a test scanner adapter; normal application file checking still fails closed.

Server PostgreSQL execution/concurrency and release checks remain Chapter 19/CI work. Fee arithmetic/assessment and collection remain Chapter 13 by explicit owner deferral (G08 stays open); operational acceptance is separate from Chapter 16 ratings by the explicit G10 answer. Comprehensive cancellation/amended settlement/case execution and Feedback remain their owning chapters. No provider purchase, public deployment, bank transaction, real recipient or permanent cleanup is performed.
