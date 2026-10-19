# Chapters 05–06 construction and verification

13 October 2026. Backend-first local implementation; simple functional controls. Owner-approved G06/G07 decisions are recorded in both product memory files and [ADR 003](../architecture/ADR_003_VERIFICATION_AND_RFQ.md).

## Try locally

Run `tools/dev.ps1 -Action dev`. Use the fictional accounts in [local development](LOCAL_DEVELOPMENT.md). No existing development data needs resetting; migration 005 adds the new tables/columns.

1. Admin creates company/person credential types and explicitly configures a trade's required types with a reason. No real certification matrix is prefilled.
2. Contractor completes/submits its profile and private evidence/reference. Admin requests evidence, rejects or approves specific profile/credential versions. Current eligibility explains missing scope, configuration, credentials and restrictions. An approved company alone is insufficient where required credentials are invalid.
3. CM/MCST creates a private issue workspace, saves routing/urgency/priorities, supplies ready reviewed sanitized photos or a no-photo explanation, previews the exact contractor text/images and confirms accuracy/privacy before publishing. Manual input works without AI.
4. Optional local extractive assistance runs through the approved draft/review checkpoints. Accepting it does not publish. Remove any estate identifier from the editable public description before preview.
5. To revise: save the draft, preview the exact version, classify and record a reason, then explicitly publish the revision. Material changes increment scope/reconfirmation requirements; minor changes keep scope validity and sourcing age.
6. Separate repairs create linked private child tickets while retaining the original source report. Publish children independently. Combined repairs require one accountable contractor eligible for all included trades.
7. Eligible contractors see only published opportunity projections and permitted sanitized evidence. Admin receives urgent coordination tasks; record actual attempts/outcome, optional known ETA and dated next action. Reading the bell does not stop urgent reminders.

## Executed checks

TypeScript checking/build and full automated suite passed **47 tests, 0 failures** in the local embedded PostgreSQL run on 13 October 2026. New SQL/API/worker cases are in `tests/procurement.test.ts`; prior Chapters 01–04 regressions remain included.

| Chapter scenarios | Verification evidence |
| --- | --- |
| CH05-T01/T02 | Pending profiles/evidence never grant eligibility; Contractor cannot record Admin decisions; unconfigured trade approval is refused; required credential check remains after company approval |
| CH05-T03–T05 | Optional expiry flag only; required expiry restricts scope; Singapore midnight/explicit timestamp; invalid date rejected; month-end clamp; inside-window attention and repeated worker deduplication |
| CH05-T06/T07 | Approved renewal supersedes old expiry; early pending renewal preserves existing unexpired evidence; invalid credentials and fee/Admin restrictions are independent; wrong-source lifts refused |
| CH05-T08 | Private profiles/files/authenticity notes excluded from CM; masked estate profile is stable and strips contacts/holders/evidence; MCST retains permitted name visibility |
| CH06-T01/T04 | No-photo explanation required; secondary with No preference rejected; permitted priorities retained without eligibility weighting |
| CH06-T02 | Immutable input/version provenance; unsupported changed quantity rejected; actual late worker return superseded; acceptance never auto-publishes |
| CH06-T03 | Linked independent tickets and preserved original; source cannot duplicate publication; combined all-trade eligibility guard |
| CH06-T05 | Late 1 December publication checks 3 December noon; simulated 0/2/3 distinct current eligible coverage; same-organisation duplicates counted once; repeated check has one sourcing task |
| CH06-T06 | Minor scope retained; quantity cannot be minor; material scope increment/reconfirmation intent; snapshots cannot be rewritten; round/sourcing anchor immutable and unchanged |
| CH06-T07/T08 | 15m/1h/3h/10h/17h notices; read versus explicit coordination; urgent repetition stops and unresolved T11 persists; generic acknowledgment cannot bypass outcome capture |
| CH06-T09/T10 | Explicit privacy/accuracy checks; originals cannot publish/download through Contractor; atomic outbox failure rolls back round/publication; concurrent same-operation retry commits once |

Browser verification uses isolated ephemeral fictional data on port 3303. Admin matrix/profile/submission/approval, account clearing, CM reviewed publication and the eligible Contractor opportunity projection passed separately from the automated timer tests. The Contractor sees the sanitized published scope and its own verification outcome, without estate originals or Admin authenticity notes. A screenshot is retained locally in `work/chapter56-contractor-preview.png`. Production scanner/AI/cloud services, a live offline-device exercise and server PostgreSQL execution are not certified by this run.

## Bindings and remaining work

T12/T15/T16/T19 now have owning feature bindings. The default selectable-quote coverage is zero until Chapter 07 implements quotes; simulated provider tests exercise the 2/3 distinction without adding fake offers. Chapter 07 must enforce current scope/verification/restrictions on quotes and reconfirmation; Chapter 08 supplies selection/cancellation/rejection-round stopping and actual 5/10-day pause/resume. Active-work expiry/restriction attention is implemented; actual interruption/resumption remains Chapters 09/14. Estate identity masking has a tested read projection; its MCST settings controller remains later work.

Generative AI is not connected: local assistance is a clearly identified extractive fallback. Optional video and sanitized video derivatives remain unimplemented; current private upload formats are PNG/JPEG/PDF and only reviewed sanitized PNGs publish. Production providers, real prerequisite contents and production operations remain release work. Subcontractor-based eligibility, G02 extra ordinary repeats, G14 retention/deletion, archive, reputation/risk choices retain their recorded boundaries. No paid service, public deployment or GitHub publication is performed.
