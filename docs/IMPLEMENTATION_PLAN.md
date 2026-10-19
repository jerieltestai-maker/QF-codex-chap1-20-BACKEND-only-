# QuoteFix — master implementation plan

**Construction update, 13 October 2026:** local construction now includes Chapters 07-08 following 01-06, with owner-approved G05/G06/G07 policies. See [07-08 build evidence](implementation/CHAPTERS_07_08_BUILD.md) for quotations, Q&A/visits, exact-version selection/approval, privacy, clocks and executed checks. The tables below retain the complete requirements; implementation is not production certification.

**Plan 0.3 · 13 October 2026 · Lifecycle baseline 2026-10-12-v14**

**Status: local construction through Chapters 07-08; Chapters 09-20 remain planned.** See [01-02 evidence](implementation/CH01_CH02_VERIFICATION.md), [03-04 evidence](implementation/CHAPTERS_03_04_BUILD.md), [05-06 evidence](implementation/CHAPTERS_05_06_BUILD.md), [07-08 evidence](implementation/CHAPTERS_07_08_BUILD.md) and [local setup](implementation/LOCAL_DEVELOPMENT.md). External recommendation/reputation AI, optional video and production deployment remain separate work.

## 1. Start here

1. Read [Product memory](PRODUCT_MEMORY.md) and [Open decisions](OPEN_DECISIONS.md), taking the latest explicit owner decisions first.
2. Read [Cross-cutting rules](implementation/CROSS_CUTTING_RULES.md): permissions, compulsory inputs, dates, audit, media, offline behavior and tests apply to every chapter.
3. Review [Decision gates](implementation/DECISION_GATES.md). Each unresolved item has context, a recommendation and the exact work it affects.
4. Build in chapter order below after the planning decisions and technical contracts for that chapter are settled.
5. Use the chapter's verification table and [Verification index](implementation/VERIFICATION_INDEX.md) as its completion criteria.
6. Use [Coverage index](implementation/COVERAGE_INDEX.md) to find the chapter responsible for any diagram node or timer.

**There are 20 chapters.** Chapters 01–19 cover foundations through a verified web release; chapter 20 covers later native apps. Login arrives in chapter 02, after a reproducible project/API/database foundation. A usable ticket workspace, files, audit, notifications and clocks follow before procurement rules are built.

The [GitHub handoff guide](implementation/GITHUB_HANDOFF.md) explains the export package, folder structure and how a future coding session should use the plan. The ZIP is a source-document handoff, not a runnable QuoteFix app.

## 2. Full chapter sequence

| Build order | Chapter | Earlier construction prerequisites | Concrete outcome | Primary clocks |
| --- | --- | --- | --- | --- |
| 01 | [Project, backend and database foundations](implementation/chapters/01_FOUNDATIONS.md) | Planning baseline | Reproducible environments, migrations, API/worker shell and isolated fixtures | Shared/inherited; see chapter |
| 02 | [Login, accounts and permissions](implementation/chapters/02_LOGIN_AND_ACCESS.md) | 01 | Named accounts, sessions, role/estate membership and enforced access | Shared/inherited; see chapter |
| 03 | [Workspace, records, audit and files](implementation/chapters/03_WORKSPACE_RECORDS_AND_FILES.md) | 01–02 | Shared workspace, safe commands, version history, drafts and private uploads | Shared/inherited; see chapter |
| 04 | [Tasks, notifications and clocks](implementation/chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) | 01–03 | Waiting-on bar, durable in-app bells, timer engine and Admin follow-up | T11, T18 |
| 05 | [Contractor verification](implementation/chapters/05_CONTRACTOR_VERIFICATION.md) | 01–04 | Admin verification, required/optional credentials and expiry eligibility | T12 |
| 06 | [RFQ intake, AI assistance and urgency](implementation/chapters/06_RFQ_INTAKE_AND_URGENCY.md) | 01–05 | Publish accurate anonymised requests; sourcing and urgent coordination | T15, T16, T19 |
| 07 | [Quotes, shared Q&A and site visits](implementation/chapters/07_QUOTES_QA_AND_VISITS.md) | 01–06 | Structured current quotes, required terms, questions, visits and reconfirmation | T13, T22 |
| 08 | [Comparison, selection and approval](implementation/chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) | 01–07 | Comparable evidence, exact-version decisions, thresholds and reselection | T07, T17 |
| 09 | [Start, progress and schedules](implementation/chapters/09_START_PROGRESS_AND_SCHEDULE.md) | 01–08 | Start prerequisites, temporary unknown estimate, lateness and interruption | T14, T20, T21, T23 |
| 10 | [Variations and return routing](implementation/chapters/10_VARIATIONS.md) | 01–09 | Versioned terms, authorised approvals, permanent rejection rationale and correct return stage | Shared/inherited; see chapter |
| 11 | [Completion, invoice and inspections](implementation/chapters/11_COMPLETION_AND_INSPECTION.md) | 01–10 | Completion package, invoice reconciliation and repeatable physical inspections | T08 |
| 12 | [Payments, receipts and closure](implementation/chapters/12_PAYMENTS_AND_CLOSURE.md) | 01–11 | MCST confirmation/payment, receipt windows, balances and automatic closure | T01, T02 |
| 13 | [Contractor QuoteFix billing](implementation/chapters/13_QUOTEFIX_BILLING.md) | 01–12 | Separate fee account, 4% + 4%, adjustments, deadlines and restrictions | T05, T06 |
| 14 | [Cancellation and Admin Support](implementation/chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) | 01–13 | Claims, evidence, final resolutions, execution and audited backtracking | T09, T10 |
| 15 | [Durability Feedback and aftercare](implementation/chapters/15_FEEDBACK_AND_AFTERCARE.md) | 01–14 | 30-day Feedback, nonresponse follow-up and correctly inspected aftercare | T03, T04 |
| 16 | [Reputation, passport and AI comparison](implementation/chapters/16_REPUTATION_PASSPORT_AND_AI.md) | 01–15 | Verified evidence, moderated outcomes, two-score model and explainable comparison | Shared/inherited; see chapter |
| 17 | [MCST integrity and warning system](implementation/chapters/17_MCST_INTEGRITY.md) | 01–16 | Approved evidence-based warnings, settings history and protected reporting | Shared/inherited; see chapter |
| 18 | [Role dashboards, analytics and exports](implementation/chapters/18_DASHBOARDS_AND_EXPORTS.md) | 01–17 | Usable role queues, source-linked metrics and permission-safe decision packs | Shared/inherited; see chapter |
| 19 | [Web release, security and operations](implementation/chapters/19_RELEASE_AND_OPERATIONS.md) | 01–18 | End-to-end verification, recovery, monitoring and controlled web release | Shared/inherited; see chapter |
| 20 | [Later iOS and Android clients](implementation/chapters/20_NATIVE_MOBILE.md) | 01–19 | Native capture and offline drafts using the same API, permissions and data | Shared/inherited; see chapter |

These are **construction dependencies**, not independent feature releases. A later chapter can finish an earlier integration. For example, comparison screens begin in 08; their final reputation/AI evidence comes from 16. Billing 13, support 14 and Feedback 15 consume events created by payments 12. All required integrations and exception routes must be complete before chapter 19's live release gate.

Create the shared support/task mechanisms in 03–04, and connect each feature's real exception immediately as it is built. Chapter 14 completes the full human-resolution/settlement system. A staging demonstration may use clearly identified test fixtures; a live pilot cannot have support buttons that lead nowhere.

## 3. Priorities and milestones

| Milestone | Chapters | What the owner can review at its end |
| --- | --- | --- |
| A — Foundation and access | 01–04 | Sign in as each role, verify estate isolation, use one workspace, save a draft/upload, inspect audit, and see a correct waiting-on task/bell/countdown |
| B — Procurement | 05–08 | Verify a Contractor, publish an accurate private RFQ, ask/answer Q&A, collect structured quotes, compare, select and authorise with the correct threshold/role |
| C — Delivery, money and exceptions | 09–14 | Start with a valid estimate, vary terms, inspect corrected work, confirm an invoice, record transfers/receipt, assess fees, cancel/claim, and resolve support without losing history |
| D — Outcomes and oversight | 15–18 | Collect durability Feedback, publish moderated evidence, give explainable comparison recommendations, show approved MCST warnings and export a permitted decision pack |
| E — Verified web release | 19 | Run full multi-role journeys, concurrency/privacy/timer checks, backup recovery and an accountable operating/rollout procedure |
| F — Native expansion | 20 | Use the same accounts/API/data on iOS/Android, capture media conveniently, and recover from weak connections without stale or duplicate decisions |

Backend behavior and information architecture come first. Each milestone needs a simple usable interface for validation; visual polish must not postpone checking required fields, next actor, restricted data or handoff clarity.

## 4. What every chapter specifies

Each chapter includes:

- **Outcome and build sequence:** concrete implementation work, dependencies and integration points.
- **Who sees and acts:** CM, MCST, Contractor, Admin, confidential exceptions and current actor.
- **Fields:** Required, Conditional, Optional and System values; no hidden mandatory attachments.
- **Triggers and transitions:** the action/event that advances or changes work, and the next real responsibility.
- **Timing:** relevant T01–T23 rules, exact anchors, business/calendar/elapsed time, countdown wording, recipients and stopping conditions.
- **Data and API effects:** source records, exact versions, audit, file readiness, retries and conflict behavior.
- **Exception routes:** rejection, withdrawal, cancellation, correction, missed action and unresolved Admin handling.
- **Verification tests and completion gate:** normal, denied, stale, duplicate, concurrent, timed and interrupted cases as applicable.

The [Verification index](implementation/VERIFICATION_INDEX.md) contains the exact count and scenario list extracted from all chapter tables. **These tests are planned specifications. No production application test is represented as passed.** Documentation validation is reported separately in [Planning validation](implementation/PLANNING_VALIDATION.md).

## 5. Fine details that must survive implementation

### Required inputs and information visibility

| Checkpoint | Compulsory / conditional | Visible to / permitted actor |
| --- | --- | --- |
| Publish RFQ | Observations, affected location, urgency, accuracy/privacy review; photo OR allowed no-photo reason | Author CM/MCST; eligible Contractors see permitted anonymised facts |
| Submit quote | Final SGD payable, agreed Yes/No declarations and mandatory follow-up terms; Other explanation; selection-hold checkbox | Own Contractor; permitted estate comparison; never rival Contractors |
| Start | Completed by date/time OR Unable to estimate yet with reason, completed before Start | Contractor acts; authorised estate/Admin see estimate and history |
| Complete work | Final invoice and explicit irreversible completion declaration | Contractor submits; completion photos optional |
| Inspect | Exact current round; positive declaration for Approve Works; Unsatisfactory work available without it | CM inspection, or authorised inherited/override action with actual actor recorded |
| Confirm invoice | Reconciled invoice version; mismatch resolved; valid work/settlement authority | MCST, or separately recorded Admin override; CM cannot record payment |
| Payment Sent | Proof of completed transfer, amount, actual transfer date; partial-payment rationale when partial | MCST; Contractor sees relevant receipt/balance context; no fee details in ticket |
| Variation rejection | Reason preserved with actor/date/time | Authorised decision-maker; permitted audit viewers; withdrawal note remains optional |
| Cancel / accept cancellation | Canceller's reason; Contractor Okay requires explicit no-additional-claim declaration | CM/MCST cancel immediately; selected Contractor can submit timely claim |
| Durability Feedback | 1–5 rating and observation for positive/negative response, OR approved Unable to assess exception | CM; Contractor review/reply and Admin moderation follow specialist policy |

Detailed options, consent text and copy-authority markers live in the owning chapter, [Quotation field copy](QUOTATION_FIELD_COPY.md), and [Node reference](review/NODE_REFERENCE.md). A label such as P7 or V5 is a reference anchor; it does not require a separate screen, button or database status.

### Time and escalation rules

The [Timing register](TIMING_AND_NOTIFICATION_REGISTER.md) remains the detailed event → wait → recipient/message → effect authority. The [Coverage index](implementation/COVERAGE_INDEX.md) maps **all T01–T23** to chapters. Critical independent anchors:

| Rule | Anchor and consequence |
| --- | --- |
| Sourcing | Publication/explicit new round → second following calendar date, noon Singapore → Admin if fewer than three distinct eligible current selectable quotes |
| Selection | Third current valid distinct quote → +5 BD responsible CM/MCST; +10 BD Admin; pause below three and resume remaining time. Selection with fewer still allowed under warning/rationale |
| Ordinary decisions | Actionable approval/inspection/response → +2 BD actor and +5 BD Admin as applicable; no duplicate generic/specific timer |
| Start and estimate | Missed agreed Start → Admin immediately, estate after 24h if still unrecorded. Unknown completion at Start → initial estimate required within 24h; Admin alone can extend that obligation |
| Completion | Accepted completion target missed → Admin immediately; relevant CM/MCST after 24h only if still outstanding; no automatic acceptance/penalty |
| MCST payment progress | Invoice confirmation → payment task; missing progress +1 BD MCST/Admin, unresolved +3 BD Admin, then saved next follow-up. No invented bank-payment deadline |
| Receipt | First durable notice for EACH transfer → 7 calendar days; silence permits labelled assumed receipt; Payment Issue stops deeming of the relevant transfer |
| QuoteFix fees | MCST invoice/settlement confirmation → each 4% fee on full confirmed basis, due +3 BD; independent of partial payment or receipt |
| Cancellation claim | First cancellation notice → 7 calendar days; in-window Contractor +2 BD; Admin earlier of +5 BD or cutoff minus 24h; timely claims remain open |
| Feedback | Full actual/assumed receipt or approved performed-work exception → 30 calendar days; date-only due notice 09:00 SGT; unanswered +2 BD CM/+5 BD Admin |
| Admin attention | Ordinary unacknowledged +1 BD; urgent +15m/+1h/+3h, then every 7h; after acknowledgment use Admin's saved next-follow-up time |
| Expiry | Quote/credential valid through a supplied date; expiry at following midnight. Credential renewal attention one calendar month before expiry; selected quote hold survives old expiry |

BD = Singapore business days under the maintained holiday calendar, skipping trigger date with 23:59 due cutoff. Hours are elapsed hours. User/device time is never transition authority. A failed/queued notice does not count as first issued, and reading a notice does not complete its action.

## 6. One backend for web and mobile

Confirmed: web first, later iOS/Android. Accounts, memberships, records, IDs, permissions, money, workflow, timers and audit belong to one backend. Device state is a cache/draft, not another authoritative job record.

Approved offline rule: save drafts and queue files; publishing, quoting, selection, approval, Start/completion, cancellation and financial decisions require a live explicit submission. The API checks current authority and exact relevant versions. Stale data returns a reviewable conflict; lost-response recovery repeats/checks the same operation, not a new payment or approval.

Proposed technical shape: modular TypeScript API/domain/worker, relational PostgreSQL, private storage, managed identity and responsive web; later native client candidate React Native/Expo. These remain engineering selections with vendor/version/cost validation in chapter 01. No microservice per workflow node or duplicate native rule engine.

## 7. Architecture and behavior references

| Reference | Purpose |
| --- | --- |
| [Web/mobile architecture](architecture/WEB_MOBILE_ARCHITECTURE.md) | Module boundaries, candidates, trust model and future native expansion |
| [API/data/sync contract](architecture/API_DATA_SYNC_CONTRACT.md) | Logical records, command protocol, versions, conflict/retry and authorized synchronization |
| [Event/task/timer contract](architecture/EVENT_TASK_TIMER_CONTRACT.md) | Transactional event/outbox, clock anchoring, scheduling and recovery |
| [Earlier delivery backlog](architecture/DELIVERY_BACKLOG.md) | Technical spike/reference detail; its former 12-slice order is superseded by these 20 chapters |
| [Current lifecycle and Mermaid](TICKET_LIFECYCLE.md) | Human workflow, exceptions and diagrams |
| [Node reference](review/NODE_REFERENCE.md) / [model](review/flow-model.json) | Exact triggers, checkpoints, conditional pending actors and all transition edges |
| [Timing register](TIMING_AND_NOTIFICATION_REGISTER.md) | Complete clocks, notices, Admin coverage and explicit exclusions |
| [Reputation feedback](REPUTATION_FEEDBACK_MODEL.md) / [passport history](REPUTATION_PASSPORT_PLAN.md) | Confirmed evidence/presentation and outstanding specialist scoring choices |
| [MCST integrity review](MCST_INTEGRITY_REVIEW.md) | Approved warning directions and unresolved specialist settings |

Current chapter set supersedes only the old delivery organization. [Draft 0.2](IMPLEMENTATION_PLAN_0.2.md) is retained as historical context. Latest owner decisions and later specialist decisions still take precedence over any stale paragraph in a source document.

## 8. Scope and decision gates

All confirmed first-release capabilities are represented: authentication, role access, verification, RFQs, AI-assisted factual drafting, Q&A/visits, quotes/comparison/approval, work/variations, inspections/invoices, payment/receipt, fees, cancellation/claims/support, durability Feedback, reputation/AI evidence, approved integrity warnings, dashboards, decision packs and operations.

Unresolved parameters stay marked in [Decision gates](implementation/DECISION_GATES.md). Examples: login/invitation mechanics, quote expiry default, precise trade eligibility configuration, fee-cent rounding, specialist scoring/risk settings, extra ordinary repeat rules, unspecified start scheduling and retention. Each gate blocks only its dependent behavior, not documentation of the whole app.

Later or expressly KIV: unresolved-case archive, warranty automation beyond recorded terms, recurring contracts, escrow, predictive market pricing, automatic fraud conclusions, unapproved risk add-ons, email/WhatsApp/native push, and native delivery choices. Do not silently ship these as defaults. Conversely, deferral of an unresolved parameter is not permission to omit an approved feature from the web release without an explicit scope change.

## 9. How to turn a chapter into executable work

For each chapter, first freeze its confirmed policy, resolve its dependent G gates, then produce concrete migration/runtime schemas, command/read/file permission matrix, UI form/response contract and fixture cases. These artifacts must agree with the chapter before implementation begins.

Then implement a coherent slice: server invariant and API → worker/events if needed → minimal usable UI → scenario evidence. Record each test's fixture, action, expected/actual state, tasks/notices, audit and result. Finish cross-chapter integrations before declaring the slice releasable.

The plan specifies the entire scope; it does not pretend that SQL migrations, OpenAPI schemas, deployed providers or test results already exist. Chapter 19 is the combined release gate. Chapter 20 reuses the proven system and revalidates current native platform requirements at that later point.
