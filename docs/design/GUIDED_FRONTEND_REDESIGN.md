# Guided frontend replacement — 29 October 2026

The owner rejected the previous desktop design and designated the supplied QuoteFix design system as the replacement authority. The requested outcome is a complete connected frontend with fewer simultaneous choices, sequential forms, concise copy and visible ways back. The owner confirms the live review target is **http://127.0.0.1:3000**.

## Authority and implementation boundaries

The source ZIP is `QuoteFix-Design-System.zip`, SHA-256 `ec176f66e89857c49757a96770fafa949fa8ac8670fc573586309dbbb8656fd4`. Its role kits, layout and token files supply visual evidence. Their sample records, local-state demo interactions, inert navigation and older policy snapshots do not supply runtime behavior. [Product memory](../PRODUCT_MEMORY.md) and [open decisions](../OPEN_DECISIONS.md) retain the current product decisions.

The existing vanilla browser client, Fastify API, PostgreSQL database and durable command/worker contracts remain. No React conversion, replacement operational data or migration changes are needed. The app uses real permitted reads and exact-version commands; the browser does not simulate approvals, bank transfers, scanner results or work completion.

## Phase 1 — task structure with UI/UX Pro Max

The existing [role/action/state contract](FRONTEND_HANDOFF.md) remains applicable. This replacement changes presentation and navigation, including required-field progression, without changing server permissions or consequential declarations.

| Surface | Focused sequence | API/decision boundary retained |
| --- | --- | --- |
| Home | Your actions / All repairs | Current authorised task projection; no sample counts |
| Private repair | Location → Observation → Review | Create private workspace only; never publish implicitly |
| RFQ | Scope → Evidence → Preferences → Review and publish | Save intake, preview exact saved contractor view, separate accuracy/privacy checks, explicit publication |
| Contractor quotation | Price and inclusions → Timing and exclusions → Supporting details → Review and submit | Current scope, explicit declarations, expiry and commitment; save draft remains separate |
| Company/credentials | Company details → Submit; Credential → Evidence → Submit | Actual evidence upload and named Admin verification; no self-approved status |
| Verification/settings | Review fields → Confirm exact decision | Current entity/version, explicit acknowledgment and prospective changes |
| Work | Work / Inspection / Payment / History | Pending actor and state from server; date acceptance never records actual Start |
| Work tasks | Short start, proposal, completion and inspection sequences | Evidence and required declaration submitted together; sliders retain equivalent keyboard controls |
| Payment | Transfer → Proof → Confirm | Record a completed external transfer; proof upload alone is not payment; receipt is separate |
| Support/fees | Concern or financial facts before final evidence/confirmation | Confidential subject exclusion, cancellation consent, named decision and actual execution remain distinct |
| Feedback/records | Related tasks in tabs; histories and optional details in disclosures | No invented reputation/fault scoring; exports remain authorised snapshots |
| Account/access | Separate invitation/application and invite/manage areas | Named membership, exact invitation and revocation confirmation |

`apps/web/flows.js` moves actual controls into step pages; it does not clone inputs or replace command handlers. Back preserves input. Forward progression checks relevant required fields; final action checks earlier steps again. Errors reveal their containing tab/step/disclosure and focus the field. Tabs use native buttons, ARIA relationships, arrow/Home/End navigation and inert inactive panels. URLs identify the active tab/step. Account/context/access changes reset scoped flow state.

## Phases 2–3 — supplied visual system with Taste

[DESIGN.md](../../DESIGN.md) replaces the rejected achromatic authority. The implementation uses Manrope, JetBrains Mono identifiers, navy ink, blue actions, a cool-gray page, white panels, a 220px labelled sidebar, supplied radii and restrained shadows. The owner logo and illustrations are preserved; synthetic guidance photographs remain labelled and separate from evidence.

Fonts are self-hosted from the Google Fonts [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) and [JetBrains Mono](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) distributions, with their OFL licenses alongside the binaries. Exact static routes serve the new controller, tokens and font files. No runtime font CDN or new frontend framework is introduced.

The ZIP wins over conflicting generative Taste defaults. Taste's replacement direction keeps the supplied palette/type. An initial inspector failure used the stale previous Geist direction; the direction was corrected rather than changing the implementation back to the rejected font. The subsequent sign-in measurements passed at 1440, 768 and 390px. Each emitted fold/page image was opened for visual review; numerical measurements alone are not design approval.

Unlike the ZIP demo's 1280px minimum width, the actual app reflows at smaller widths. The sidebar becomes Menu, task controls remain labelled, and secondary detail is progressively disclosed. Selected records have a visible return to the list. The shared header shows the current repair and pending action once.

## Phase 4 — Impeccable and ASTRA-led copy review

The owner explicitly requested upstream Impeccable installation, Clarify/Distill, ASTRA as design architect and lead orchestrator, and GPT-6.1 SOL implementation agents. Impeccable 4.8.0 was installed to the user's Codex skill directory from [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) at commit `5e745ace7e151feb2a93d360d0281fe39448b857`. Its installed Clarify and Distill playbooks are used directly in this session; automatic skill discovery is available next turn.

ASTRA owns design/copy decisions and scrutiny of two delegated SOL implementation areas. [Copy refactor record](COPY_REFACTOR_2026_10_29.md) records their implementation and review. Clarify preserves meaning and makes actions/recovery explicit. Distill removes repetition and exposes secondary detail only when needed. Domain-required wording, unchecked declarations, privacy consequences and financial distinctions remain protected.

An earlier attempted independent critique could not complete because its agents hit their usage limit. It is not claimed as a successful dual-agent critique. Source/rendered detector results and direct screenshot review are technical/design evidence with their actual scope; no invented numerical design score or WCAG certification is assigned.

## Verification record

Before the final copy pass, the complete PostgreSQL run passed **307/307 records across 38/38 files**, zero failed, skipped or cancelled. The focused browser-script suite passed **57/57** (overlapping coverage). The isolated browser journey passed **12/12** and shared real-browser controller checks passed **16/16**. These are evidence for that checkpoint, not automatic certification of later edits.

The screenshot review subsequently caught a handled `privacyNotice is not defined` error that the journey's console-only assertion missed. The final journey now also rejects programming errors rendered in status/alert messages. This finding illustrates why screenshots and checks of handled error states are required alongside a green console.

Initial failed attempts are retained in ignored local evidence: an early detached draft-node error, a journey race between database acknowledgment and the refreshed payment panel, and the stale Taste font reference. The first post-copy journey also stopped on an assertion expecting the previous trade-save message. The updated message was visible and the action had succeeded; the expectation was updated and the complete journey rerun. A focused test run exposed missing `classList` support in the quotation test DOM and an expiry-label lookup tied to previous wording. The faithful mock and lookup were updated without removing behavior assertions. Failed runs are not counted as passing runs.

### Final local results

| Check | Actual result |
| --- | --- |
| Full PostgreSQL checkpoint before the final copy changes | 307/307 across 38 files; no failures, skips or cancellations |
| Final affected frontend suite | 58/58; no failures, skips or cancellations |
| Actual browser wizard/tab controls | 17/17, including required fields, final acknowledgment, Back retention, hidden conditionals, keyboard tabs, URL reset and renderer teardown |
| Final connected browser journey | 12/12; no unhandled exceptions, caught programming-error messages, 429 responses or worker errors; isolated schema cleaned |
| All four roles, navigation and narrow layouts | No caught/unhandled programming errors or horizontal overflow; selected-record empty views offer the relevant next step |
| Actual new-repair form at 1440/768/390px | Manrope rendered, no horizontal overflow or console exceptions; only the current step's inputs visible |
| Final Impeccable detector | No source or rendered sign-in findings; advisory heading/help wrapping was corrected and rechecked |
| TypeScript/browser syntax and compilation | Passed |
| Planning and local links | Passed: 20 chapters, 206 acceptance scenarios, no validation errors |
| Protected migration bytes | All 15 equal pre-task HEAD bytes |

The full database count predates the copy pass; it is not represented as a new 308-record complete run. The final 58-check suite exercises the changed browser scripts, including the added support confidentiality regression. Counts overlap and must not be added together. [Machine-readable summary](evidence/guided-2026-10-29/verification-summary.json), [journey record](evidence/guided-2026-10-29/journey-summary.json) and [controller checks](evidence/guided-2026-10-29/controller-checks.json) preserve that distinction.

Representative fresh captures: [repair steps on desktop](evidence/guided-2026-10-29/repair-step-1-1440.png), [repair steps at 390px](evidence/guided-2026-10-29/repair-step-1-390.png), [quotation confirmation](evidence/guided-2026-10-29/contractor-quote-1440.png), [verification](evidence/guided-2026-10-29/admin-verification-1440.png), [inspection](evidence/guided-2026-10-29/cm-inspection-1440.png), [recorded payment awaiting receipt](evidence/guided-2026-10-29/mcst-payment-1440.png) and [settled work at 390px](evidence/guided-2026-10-29/contractor-work-390.png). The journey uses fictional records in a disposable schema. Normal-app form captures contain no submitted repair.

## Scope of the result

This is a connected local browser implementation with desktop Chromium and narrow-viewport evidence. It does not certify physical native devices, OS background transfers, hosted production release, bank movement, all assistive technologies, or unresolved G02/G04/G14/G15 and specialist/fault policies. Existing policy questions and Chapter 20 physical-device/release gates remain open. No operational record or protected SQL migration is changed by this redesign.
