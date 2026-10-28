# Desktop frontend handoff

28 October 2026. Working branch: `codex/frontend-integration`. Design authority: [DESIGN.md](../../DESIGN.md). The owner's latest request authorizes the complete local desktop build and parallel implementation, superseding the pasted brief's initial Phase-0-only stop. The later explicit instruction retains UI/UX Pro Max for Phase 1, Taste for Phases 2–3 and Impeccable for Phase 4.

## Phase 0 — discovered baseline

The existing application uses TypeScript/Fastify, PostgreSQL and a durable worker, with vanilla browser JavaScript/HTML/CSS. There is no React, Next.js, Tailwind or component-library migration. The API serves a static single-document client. Native mobile is a separate Expo client sharing these APIs; this project is the desktop web prototype.

Before this rollout, `index.html` and dynamically appended sections presented all workflows in one 760px column. Many facts, AI outputs, histories and analytics appeared as raw JSON. Numerous forms already enforced correct domain rules, but their discoverability and error placement were inconsistent. Existing native/device/release limitations are not frontend defects and are preserved separately.

Inspected baseline artifacts: `apps/web/index.html`, all browser scripts, static route registration, domain route families, chapter plans and form/API regressions. Baseline sign-in screenshots and measurements are in ignored `work/frontend/before/`. Existing historical browser evidence in `docs/implementation/evidence/` remains evidence of earlier states, not fresh rollout verification. All four roles were inspected in the working browser during integration; those new captures are not retroactively labelled pre-change screenshots.

Operating commands (no fixture/reset against the existing prototype):

```powershell
./tools/local-postgres.ps1 start
node tools/prototype.mjs start
node tools/prototype.mjs status
# Reload API route changes without changing the selected database:
node tools/prototype.mjs stop
node tools/prototype.mjs start
```

The designated remote remains `https://github.com/jerieltestai-maker/QF-codex-chap1-20`. Migrations, existing records, local helper keys, provider settings and audit history must survive. Generated browser/test evidence is isolated under ignored `work/`; fictional journey schemas never replace the prototype database.

## Phase 1 — UX structure and interaction specification

Lead: **UI/UX Pro Max**. The interaction handoff is formalized during the integrated build following the owner's explicit phase reminder; it is not represented as an earlier owner sign-off. Focused local searches verified **Focusable Error Summary**, **Error Placement**, **Dragging Movements** and keyboard navigation. Palette/font output was not used to replace Taste's established system.

Every view answers one question before exposing secondary details. Work queue is the entry and pilot; a selected repair retains its title and stage across its workflows. Browser Back/Forward changes real hash views, rather than scrolling an entire application with sidebar anchors. Account context comes only from authorised memberships.

| View | First question / primary work | Audience and visibility |
| --- | --- | --- |
| Work queue | What must I do next, and who else is responsible? | Every active role; canonical permitted tasks/tickets and real pagination |
| Repairs | What was observed, and what may be published? | CM/MCST/Admin; private draft, evidence, history and RFQ intake |
| RFQs and quotations | Which current offers can be submitted or selected? | Contractor own offers/Q&A/visits; estate actors permitted comparison and decisions |
| Work and payment | What work is authorised, and what exact evidence/action is now due? | Assigned Contractor and authorised estate/Admin; actual stage/actor gates |
| Admin Support | What help or resolution is requested, and what remains unexecuted? | Permitted reporter/reader/responders; confidential subject exclusion remains server-side |
| QuoteFix fees | What does this Contractor organisation owe or have verified? | Contractor/Admin only; no estate fee projection |
| Feedback and reputation | What outcome is actually recorded, and what evidence supports it? | Relevant ticket actors; moderation Admin-only; no invented rating/threshold |
| Contractor verification | What evidence and human review are required? | Contractor own company; Admin configuration and decisions |
| Procurement settings | Is the estate ready for its first selection? | Same-estate MCST/Admin; threshold/address editing remains Admin-only |
| Review and safeguards | Which exact flagged decision needs clearance? | MCST/Admin; explicit explanation/version, no automatic approval |
| History and decision packs | Who did what, and which immutable snapshot is this? | Current authorised role; revocable grants and later-change indicators |
| Notifications | What notice was issued, and what action remains? | Own permitted audience; read is separate from response |
| Admin attention | What contact, coordination or dated follow-up is due? | Admin; ordinary and urgent schedules remain distinct |
| Processing health | Are processing/scanning/notices current? | Admin; no client-side bypass of a failed scanner or worker |
| Account and access | Which named membership may I use? | Own account; Admin invitation/revocation tools; no self-claimed privileges |
| Evidence guide | What photographs help responsible pricing? | Signed-in users; owner synthetic examples separate from real records |

### Role/action/state contract

| Workflow | Deliberate action and required evidence | Exceptional states and recovery |
| --- | --- | --- |
| Sign-in/invitation | Named credentials; review exact invitation role/estate before acceptance | Invalid/expired session, pending access, revoked context with a surviving membership, ordinary recovery |
| Draft/workspace | Draft may be incomplete; final private workspace requires title/problem/location | Separate device/server status; conflicting copies retained; offline save never publishes |
| Evidence | Allowed ready object, checksum/scan, explicit attachment or business submission | Device-only/transferring/processing/ready/rejected/attached; scanner failure cannot satisfy invoice/proof |
| RFQ publish/revise | Exact contractor preview; separate unchecked accuracy/privacy acknowledgments; materiality and reason | Edited preview invalidates acknowledgments; material revision needs reconfirmation; RFQ has no expiry |
| Quote | Explicit Yes/No declarations; conditional details; positive SGD amount; expiry acknowledgment and approved commitment | No affirmative defaults; eligible/current-scope only; held selected terms; optional visit not a selection prerequisite |
| Select/approve | Current quote/settings/RFQ versions; written rationale; caution acknowledgment and required warning clearance | Fewer-than-three warning; threshold **Yes I know / Back** path; stale version requires review |
| Start/schedule | Separate proposal, exact acceptance and actual Start; completion estimate or authorised exception | Accepting a date never starts work; pending/withdrawn/flagged variation holds preserved |
| Variation | Contractor confirms exact scope/price/time/feasibility; correct CM/MCST decides | Rejection reason required; ordinary work hold and make-safe path remain distinct |
| Completion | Ready invoice and irreversible completion declaration together; deliberate slider or equivalent button | Upload alone sends no completion; photographs optional; mismatch blocks finance |
| Inspection | Actual current round; required inspection checks; **I agree the works are Complete and Satisfactory** before positive action | Unsatisfactory path accepts negative findings without forcing positive checkbox; new physical round remains distinct |
| Invoice/payment | Exact reconciled invoice/settlement; required MCST confirmation; real completed-transfer proof; partial-payment reason | Zero payable remains valid; no fake transfer; possible duplicate reviewed; stale balances cannot be overwritten |
| Receipt | Contractor explicitly confirms actual receipt/date | Assumed receipt acknowledgement is not actual receipt; dispute, correction and per-transfer windows remain separate |
| Fees | Ready proof reports unverified collection; Admin verifies bounded allocations | Private fees never leak to estate; deadlines derive from confirmation, not receipt |
| Cancellation/support | Separate cancellation consent/claim; named decision; exact obligation execution/evidence | Acknowledgment is not resolution/payment; retained records and dated unresolved follow-up; no automatic archive |
| Feedback/reputation | Required independent questionnaire; negative reasons; actual observation/date; explicit moderation | Unavailable/contested durability omitted; no invented specialist/fault scoring; advice may be stale/unavailable |
| Integrity/export | Prospective settings acknowledgment; exact warning clearance; snapshot request and grant | Settings do not rewrite history; export generation/download reauthorise; confidential content excluded |

### State and accessibility acceptance

- A primary action is discoverable from the responsible role's queue or selected repair. A restricted or not-yet-selected view explains the prerequisite and offers a route back.
- Final consequential actions require online server validation, stable operation identity and current versions. All roles can check uncertain submissions. No automatic retry creates a different decision.
- Loading, empty, validation, denied, stale, offline and uncertain states remain distinct. Text inputs survive recoverable refresh/error within the same record/context; confirmations reset. Account/context changes cannot reveal another account's drafts.
- Visible labels, status announcements, native controls, clear focus, keyboard/button alternatives to dragging, and usable browser zoom are required. Fixed narrow navigation must not obscure focus/content. Decorative art has empty alt text; evidence has meaningful labels.
- Financial values remain exact backend strings/cents. Singapore times and actual responsible actors are explicit. Colors and pictures supplement words.

### Ordered implementation batches

1. Shared shell, account/context handling, workspace and visual foundations; pilot queue/repair path.
2. Verification, RFQ, quotes/Q&A/visits, comparison and estate onboarding.
3. Work/schedules/variations, combined invoice/completion, inspection and ordinary/cancellation payments.
4. Fees/support, aftercare/reputation, integrity, history/exports and operations.
5. Cross-role browser journeys, adversarial permission/state review, accessibility/layout corrections and regression evidence.

Batches 2–4 were delegated with disjoint file ownership. Shared navigation and API integration were integrated centrally. These batches reuse one visual system rather than choosing a direction for every screen.

## Phases 2–3 — foundation, pilot and rollout

Lead: **Taste**, using its app-screen workflow. [DESIGN.md](../../DESIGN.md) records the dealt direction, tokens, components, owner artwork, responsive composition and exceptions. The queue/repair pilot exercises navigation, real data, responsibility, drafts, final action versus upload and multiple role variants. All inventoried desktop workflow modules use the existing APIs; no mock-only business actions were substituted.

Coverage is intentionally described by evidence level. All listed views have implementations and error/empty handling; automated form/API tests cover exceptional branches. Browser evidence covers representative roles, widths and the isolated consequential journey. This is not a claim that every one of the 206 historical scenarios has been manually clicked in a browser.

### Final desktop coverage matrix

“Implemented” means an actual authorised API path, rather than a simulated result. Browser evidence is deliberately narrower than branch-level API/form evidence.

| Chapter | Desktop coverage | Verification level / remaining boundary |
| --- | --- | --- |
| 01 Foundations | Existing local stack retained; public interface assets explicitly served | Migration/config/transaction regressions and live readiness |
| 02 Login/access | Implemented for all four roles, invitations/recovery/membership tools | Four-role browser checks; access/session/rate regressions |
| 03 Workspace/files | Implemented drafts, private workspaces, resumable evidence and readable history | Interactive workspace/invoice/proof journey; upload and isolation tests |
| 04 Tasks/notifications | Implemented canonical actions, bells, Admin attention and follow-ups | Role views; timer/audience/countdown/API/form tests |
| 05 Verification | Implemented company/credential/trade matrix and human decision | Interactive Admin approval; disclosure/identity browser check; API tests |
| 06 RFQ/urgency | Implemented reviewed publication/revision, privacy preview, local draft assistance and coordination | Interactive publication; revision/urgency/source-clock tests |
| 07 Quotes/Q&A/visits | Implemented exact offers, conditional declarations, Q&A and visits | Interactive quote; actual-script and conversation/eligibility tests |
| 08 Selection/approval | Implemented comparison, rationale/cautions/threshold and MCST decisions | Interactive selection; above-threshold/clearance/version tests |
| 09 Start/schedule | Implemented proposal, exact acceptance, actual Start and interruption | Interactive schedule + Start; overdue/version/API/form tests |
| 10 Variations | Implemented exact terms/decisions, holds and safe return contexts | API and actual-script branch tests; all variants not manually clicked |
| 11 Completion/inspection | Implemented invoice/declaration together, repeated rounds and negative/positive inspection | Interactive completion + inspection, keyboard slider/Confirm checks |
| 12 Payment/closure | Implemented exact confirmation, completed transfers, partial payments, actual/assumed receipts and disputes | Interactive payment → actual receipt → Closed; race/money/API/form tests |
| 13 Fee account | Implemented private statement, proof, verification/allocation/refund actions | Billing/API and actual-script tests; no real bank transfer |
| 14 Cancellation/support | Implemented claims, review, settlement/correction and exact obligation execution | Extensive API/form tests; repair-inspection prerequisite regression |
| 15 Feedback/aftercare | Implemented independent questionnaire, durability and remedy paths | API + actual-script validation/refresh tests; browser empty state |
| 16 Reputation/advice | Implemented passport, public badges, moderation and grounded advice | Permission/privacy/API/form tests; badge renderer at desktop/narrow widths |
| 17 Integrity | Implemented prospective settings, warnings and explicit clearance | API and actual-script authorization/confirmation/race tests |
| 18 Queues/exports | Implemented canonical search/tasks/history, analytics and immutable packs | Interactive HTML pack generation; export/privacy/grant tests |
| 19 Operations | Implemented Admin processing health and failure-recovery controls | Live local health; operations/recovery tests; no hosted rollout claim |
| 20 Shared native contracts | Existing API/native contract behavior retained by regressions | **Partial outside desktop scope:** native parity, physical devices and OS transfers remain open |

## Phase 4 — audit and hardening

Lead: **Impeccable**, Operate mode, preserving the established visual world. Technical checks and independent design/detector assessments are recorded in [verification](FRONTEND_VERIFICATION.md). Findings are prioritised by task completion/privacy/accessibility, not by novelty. The same document records fixes, actual test outcomes and remaining verification limits.

## Owner dependencies and preserved boundaries

No desktop feature in this rollout invents G02 additional ordinary reminders, G04 warranty automation, G14 deletion/retention, G15 archival, specialist strength thresholds or deferred fault/callback scoring. The actual Chapter-20-completion reminder is still due at actual native completion. Those are product/release boundaries, not buttons which pretend to work.

Physical Android/iOS setup, OS background transfers, production providers, cloud/store release and full native workflow parity remain separate from this desktop deliverable. No deployment or data reset is authorised or performed by the UI rollout.

## Phase closure reports

| Phase completed | Target addressed | Goal / precise gap | Deliverables and changed files | Actual verification | Decisions for later phases | Blocker / next target |
| --- | --- | --- | --- | --- | --- | --- |
| 0 — discovery | Existing stack, four-role workflows and plans | Existing behavior and constraints mapped | Baseline and inventory in this handoff; ignored baseline captures | Repository/routes/tests and working screens inspected | Retain stack, authority, records and migrations | No desktop discovery blocker; target interaction specification |
| 1 — UX | Navigation, roles, actions, required inputs and exceptions | Interaction contract and acceptance criteria documented; formalized during the authorised build | Screen/action/state matrices and ordered batches above | Focused UI/UX Pro Max searches and comparison to current contracts | No new business rule; one responsible actor and explicit final decision | Existing open policy gates only; target visual pilot |
| 2 — foundation/pilot | Shared shell and queue/repair workflow | Functional, API-connected foundation | DESIGN.md; shared CSS, ui.js, shell.js, account/workspace implementation | Real populated/empty views, roles and widths; interactive repair path | Achromatic ledger plus owner logo/illustrations | No known pilot blocker; target remaining desktop workflows |
| 3 — rollout | All inventoried desktop modules | Implemented approved desktop paths; native parity remains outside this scope | Procurement/quoting, work/payments, support/fees, aftercare/reputation, integrity/exports/operations | Final 305-record PostgreSQL suite, 55 focused UI checks, 12-check real-browser journey; coverage limits above | Reuse shared foundations and server rules | No known tested desktop P0/P1; target focused hardening |
| 4 — audit/hardening | Actual rendered app and consequential journeys | Significant findings corrected; wider device/AT/release certification remains separate | FRONTEND_AUDIT.md, FRONTEND_VERIFICATION.md and committed fictional evidence | Independent design/detector assessments; final regressions, rendering, compilation and docs checks | Preserve this direction; no policy/release gate silently closed | Physical devices, full AT/browser-engine review and production release remain explicit later work |
