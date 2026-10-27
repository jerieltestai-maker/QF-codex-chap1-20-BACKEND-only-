> Historical draft 0.2. Build order is superseded by [the master plan](IMPLEMENTATION_PLAN.md). Retained as planning evidence.

# QuoteFix implementation plan — draft 0.2

Prepared 12 October 2026. **Planning only: no application implementation started.** Expanded for the owner's web-first, future iOS/Android direction and explicit approval of offline drafts/uploads with online decisions. Technology choices below are recommendations, not paid vendor procurement or approval of unresolved product policy.

## Start here — the expanded blueprint

| Document | What it specifies |
| --- | --- |
| [Web/mobile architecture](architecture/WEB_MOBILE_ARCHITECTURE.md) | Shared backend, proposed full stack, module ownership, native expansion, uploads, authentication and privacy boundaries |
| [Data, API and synchronization](architecture/API_DATA_SYNC_CONTRACT.md) | Logical schema, commands, exact-version decisions, duplicate/retry handling, conflict UX, web refresh and future incremental sync |
| [Events, tasks and timers](architecture/EVENT_TASK_TIMER_CONTRACT.md) | Durable bell issuance, T01–T23 bindings, pause/resume, Admin follow-up, outage recovery and test-clock cases |
| [Delivery backlog and release gates](architecture/DELIVERY_BACKLOG.md) | Planning outputs, technical spikes, 12 web slices, native expansion, acceptance tests and remaining decisions |

**One operational system, several clients:** web and future mobile use the same accounts, database, API, permissions, files and audit history. Local copies accelerate viewing/drafts; they do not authorise actions. A stale phone must review changed terms before confirming them. A lost response must be recoverable without submitting the payment or approval twice.

**Confirmed O37-A:** drafts and photos/documents may be saved/queued locally. Publishing, quoting, selection/approval, Start/completion, cancellation and payment decisions need connectivity, current server validation and explicit submission. Upload retry must never silently submit a consequential form.

## 1. Readiness and authority

The confirmed lifecycle through v14 is sufficient to continue detailed implementation planning. The owner's latest answers resolve date-only Feedback dispatch (09:00 Asia/Singapore), fair reminder periods for late-discovered Feedback, expiry through the stated Singapore date, missed recorded-start follow-up, and the web/mobile offline submission boundary.

Subjective assessment: **97% confidence in understanding the intended lifecycle, permissions and handoffs; 90% readiness of the product rules for an implementation specification.** These are judgment estimates, not a production reliability metric or percentage of code completed. Data contracts, permission enforcement, concurrency behavior, scheduling and deployment still need an executable design and validation.

Authority order: latest explicit owner decisions -> current product/decision memory -> current lifecycle/timing and specialist plans -> historical reviews/PRDs. Historical proposals are evidence, not instructions. Do not infer policy from diagram color alone.

References:

- [Product memory](PRODUCT_MEMORY.md) and [decision register](OPEN_DECISIONS.md)
- [Lifecycle](TICKET_LIFECYCLE.md), [timing register](TIMING_AND_NOTIFICATION_REGISTER.md), [node reference](review/NODE_REFERENCE.md)
- [Reputation feedback](REPUTATION_FEEDBACK_MODEL.md), [passport](REPUTATION_PASSPORT_PLAN.md), [MCST integrity](MCST_INTEGRITY_REVIEW.md)

### Documentation corrections before translating rules into code

- C35 allows immediate selection of a **valid, current-scope** initial quote without a site visit or readiness status. C36/Q4 requires reconfirmation/revision after a **material** RFQ change. Recent generic scope-warning wording must not override C36. Minor corrections can notify without invalidating an otherwise valid quote; unreconfirmed material-scope quotes cannot count toward current valid coverage or be selected.
- Admin staffing/coverage Q12 is already supplied and must not remain an unresolved node marker. Confidential internal operating details remain out of app copy.
- Confirmed approval/rejection/cancellation/financial history is retained. Current documents must identify superseded policy rather than require the coding agent to guess which version is active.

## 2. Proposed engineering shape

Keep one application backend with clear modules, one relational source of truth, controlled file storage and a shared background-job mechanism. Do not begin with independent services for each role or diagram node. The architecture companion now recommends React/TypeScript web, a Fastify/TypeScript API, PostgreSQL, a database-backed worker/outbox, private object storage and managed identity; React Native/Expo is the first later-mobile candidate. Concrete vendors, supported versions, region, costs and account ownership remain the technical selection work in P02–P05. Legacy PRD stack suggestions are not approval.

Distinguish:

1. **Job phase:** a small set of meaningful workflow stages.
2. **Tasks/obligations:** who owes what action, when it becomes actionable, and the applicable follow-up.
3. **Immutable versions/events:** what was submitted, agreed, changed, paid, inspected or overridden and by whom.
4. **Views:** derive the waiting-on bar, role actions, history and bell from the same underlying facts.

The 83 review nodes are explanation/comment anchors, not 83 database statuses. Automatic returns, observed milestones and notification timers do not need separate user screens.

Suggested modules: identity/estate access; contractor eligibility; RFQs/quotes; selection/authorisation; work/variations/inspections; invoices/payments; Contractor-only QuoteFix billing; support/aftercare; feedback/reputation; MCST integrity; shared audit/files/tasks/notifications/export.

## 3. Planning deliverables to complete before feature coding

| Deliverable | Must specify | Completion criterion |
| --- | --- | --- |
| A. Current rule contract | Confirmed rules, source decision, remaining policy, exact UI copy where approved | No competing current rule; open policy has an explicit gate and owner |
| B. Role/action/visibility matrix | CM, MCST, Contractor and Admin per estate/resource/action; masked identities; confidential subject exclusion; exceptional Admin overrides | Every user command, read, attachment, notification and export has an access rule |
| C. Transition and command catalogue | Actor, preconditions, expected version, fields, records changed, audit event, next actor, notices, failure response | Every lifecycle exit maps to an authorised command or internal event; no vague “Admin resolves it” |
| D. Data model and invariants | Organisation/account/estate membership; immutable RFQ/quote/invoice versions; nominations; authorisation; variations; inspection rounds; actual/assumed receipt; fee adjustments; support obligations | Financial and approval facts remain distinguishable; no mutable status silently rewrites them |
| E. Event/task/timer catalogue | Trigger, clock unit/calendar, issue timestamp, pause/resume, recipients, stop/supersede conditions, retries and deduplication | One authoritative source for pending bars and bell tasks; repeat execution cannot double-charge or repeat a decision |
| F. API and error contracts | Requests/responses, validation, stale versions, duplicate clicks, conflicting updates, access denial and retry behavior | Frontend and backend have a shared contract before separate implementation |
| G. Test-data and scenario plan | Fictional development fixtures, migrations, isolated test environments, full role journeys, race/failure cases | Reproducible tests; fictional data cannot enter live analytics/reputation |
| H. Delivery and operations plan | Concrete stack/hosting proposal, secrets, deployment, recovery, monitoring, backups, upload handling, rollout and migration procedure | Explicit environment ownership and costs; recovery can be demonstrated |

These are proposed deliverables. Routine engineering choices can be resolved within the plan; unresolved product behavior needs the owner's decision before its implementation.

## 4. Proposed implementation sequence

Each stage includes its normal and exception routes. Build a thin usable role interface during each stage to test comprehension; defer visual polish until behavior is reliable.

### Stage 0 — freeze the implementation contract

Produce A–H above, resolving only the policy needed for the stage being planned. Reconcile specialist reputation/risk decisions into the contract without asking this chat to reopen their settled choices. Specify acceptance examples for every high-impact rule.

### Stage 1 — shared foundations

Estates, named accounts and memberships; contractor organisations and eligibility; permissions; protected evidence storage; immutable audit/version conventions; task/notification/job primitives; Singapore calendar/time handling; financial amount types; error/idempotency conventions. Define support cases and obligations early so exceptions reuse them.

**Exit:** estate isolation and confidential-subject exclusion work through reads, files, bells and exports; repeat commands do not duplicate mutations; timers can be replayed safely. A fictional development fixture can be loaded repeatedly in an isolated environment.

### Stage 2 — reporting through work authorisation

Original observations/evidence and AI-assisted human-reviewed RFQ; grouping; verified contractor quotes; shared sanitised Q&A; visits/reveal gates; material-scope reconfirmation; expiry; comparison; selection/threshold approvals; MCST combined selection; reselection/new rounds; preauthorisation cancellation. Integrate sourcing/selection reminders as part of the features, not at the end.

**Exit:** CM/MCST and Contractor can complete the same real role journey. Selection freezes an exact quote and comparison set. Three valid distinct offers starts selection reminders; a drop below three pauses them, restoration resumes remaining time, and early selection remains available with the agreed warning/rationale.

### Stage 3 — delivery, changes and inspections

Scheduled/actual Start; prerequisite completion estimate or temporary exception; missed-start and completion follow-up; revised date/reason decisions; full variations; interruption/support; cancellation claims; combined invoice/completion package; repeat inspections; invoice reconciliation. Keep every physical repair round and its originating findings.

**Exit:** authorised work and additional proposed work cannot be confused. Failed inspection -> remedy -> new inspection succeeds without bypassing acceptance. Ordinary date acceptance and the Admin-only initial-estimate extension are distinct. Cancellations preserve valid costs/debts and the seven-day claim boundary.

### Stage 4 — settlement, fees, resolution and aftercare

MCST invoice confirmation; completed-transfer proof; actual/report/notice dates; partial payments; actual/assumed receipt; payment issues; Contractor-only 4% + 4% billing; adjustments/refunds/restrictions; Admin-only evidence sufficiency and offline-ledger reference; published resolution and parallel acknowledgments; execution/verification; closure/linked aftercare; compulsory due Feedback.

**Exit:** exactly-once financial effects under repeated/racing events; no mistaken closure with a blocking obligation; no second inspection of the same accepted repair; no duplicated invoice/fee cycle on aftercare; Feedback remains independent of closure. Timed receipt assumptions apply only to eligible unanswered transfers.

### Stage 5 — reputation, AI comparison and MCST integrity

Implement the approved features against versioned evidence and agreed specialist policies. Capture real feedback/evidence from earlier stages. Integrate actual scoring weights/multipliers, provenance and moderation only once approved in their existing discussions. Keep the MCST risk settings and event-version rules from the integrity plan.

**Exit:** explanations can point to permitted evidence; no invented reputation, production placeholder ratings or unsupported misconduct conclusions. This stage order does not remove these features from the intended product or approve a launch without them.

### Stage 6 — complete journeys, exports and rollout

Decision-pack exports; upload/access review; notification recovery; backup/restore and deployment checks; end-to-end actor journeys; seed isolation verification; usability pass for pending bars and next actions; then visual polish and a controlled rollout plan.

## 5. Test data and seeding — avoid the old failure mode

- Start production with operationally empty data except genuine configuration/accounts. Do not import Contractor-Linker demo jobs or reputation.
- Keep deterministic fictional scenarios in separate development/test environments with separate credentials. Loading/resetting fixtures must refuse a production target.
- Use the same validated commands/constraints where practical; fixtures must not create impossible states merely to make screenshots look complete.
- Keep admin-verified external contractor references clearly labelled as real external evidence, distinct from fictional test references and live QuoteFix outcomes.
- Give each scenario a purpose: three quotes, expired offer, material scope change, threshold crossing, unknown estimate, failed inspection/rework, cancellation claim, partial/disputed receipt, fee adjustment and aftercare.
- Specify how schema migrations and fixture versions move together. Test-data changes must never rewrite real customer history.

## 6. Required acceptance scenarios

1. A contractor from the wrong eligibility scope cannot quote; rival prices and private identifiers do not leak.
2. Material scope change invalidates unreconfirmed old offers; a minor correction does not. A third distinct valid offer starts reminders; revisions do not inflate count.
3. Two selection submissions or a selection racing quote expiry/change result in one valid versioned decision.
4. MCST rejects before authorisation -> same-ticket reselection/new round; replacement after authorisation -> linked new ticket.
5. Start without required estimate/reason is refused; unknown estimate generates the 24h submission obligation; only Admin extends it.
6. Missed scheduled Start alerts truthfully about missing recording; later Start suppresses the obsolete +24h notice.
7. Revised completion date requires an authorised acceptance; stale acceptance cannot approve a newer unseen proposal.
8. Failed inspection and corrected work create separate rounds; a successful acceptance is reused only for the same round.
9. Invoice mismatch blocks confirmation; an adjustment preserves prior financial events and fee deadlines.
10. Partial payment retains balance; disputed receipt is not automatically deemed; retrying a notification does not restart seven days.
11. Cancellation deadline is tied to first issued notice; timely claims remain actionable after cutoff; silence is not waiver.
12. Final resolution acknowledgment runs alongside authorised execution; Admin verdict alone does not complete a repair/payment.
13. Missed/duplicate timer runs recover without duplicated fees, assumed receipts, notices or false approvals.
14. Confidential report about an MCST user remains inaccessible to that subject in every surface despite ordinary estate-role access.
15. Fictional seed data never contributes to real score, quote comparison, financial records or analytics.

## 7. Remaining decisions and release gates

**Resolved in this follow-up:** O30 date-only Feedback/late-entry reminder timing, date-only expiry, and missed recorded-start escalation. Core O35/O36 decisions stay settled.

**Still bounded policy work:** remaining unspecified ordinary Admin re-alert cadence/extra optional advance reminders, warranty start/expiry automation and handling of an authorised job with no agreed start date. Do not silently add schedules; propose these when writing the timer contract. Existing manual support and approved clocks remain.

**Specialist gates:** finish outstanding reputation scoring/mapping/provenance/refresh and risk-setting defaults/triggers in their existing discussions before implementing those dependent behaviors. Preserve all already confirmed specialist rules. Archive remains KIV.

**Engineering work:** choose retry thresholds, concurrency/transaction strategy, exact accrued-business-time calculation, stack/hosting, storage limits, recovery targets and API contracts. Product decisions should not be offloaded to a coding agent as “use sensible defaults.”

Draft 0.2 proposes the concurrency, API, synchronization and worker strategy in the companion contracts. These need schema/spike validation, not reinvention by each client. O37-A is answered. Future push/cache policy/native role rollout, fractional-cent fee rounding and account deletion/retention remain explicitly bounded gates (O37-B/C/D); current in-app notification scope is unchanged. Do not confuse a documented proposal with completed SQL, generated API clients or tested production behavior.

None of these prevents drafting the plan. They prevent claiming every feature is implementation-ready or silently inventing unresolved behavior.

## 8. Coding-task format after the plan is ready

Each task should name: objective; approved rule IDs; prerequisites; permitted files/modules; commands/data changes; role checks; emitted audit/task/notification events; failure/race behavior; acceptance scenarios; and the completion evidence required. Keep work small enough to review one business outcome at a time.

Progress through planning -> reviewed contracts -> implementation slices -> verified journeys -> rollout. A finished Mermaid diagram is an input to this process, not a substitute for backend enforcement.

## 9. Next planning pass

Use the [delivery backlog](architecture/DELIVERY_BACKLOG.md) to finish P01–P05: exhaustive permission/command matrix, machine-readable API schemas, relational keys/indexes/migrations, calendar examples, and a concrete hosting/operations decision. First feature code follows a reviewed contract. Native-only UI and background-transfer implementation follow the web foundation; the API, versioning and media boundaries must be built correctly from the first web slice.

## 10. Planning verification — 12 October 2026

Checked all 63 relative links across the main plan, four companion documents and both memory files; all resolve. Markdown code fences are balanced. The existing v14 lifecycle model has 83 unique nodes, 202 valid unique edges and 34 views; its embedded review data matches the source, and the maintained fragment still contains no ResizeObserver. Admin-only resolution routing, current-scope quote rules, paused selection reminders and latest timing defaults passed targeted consistency checks.

The new eight-node architecture Mermaid rendered in headless Edge with no browser errors and its screenshot was inspected. An initial sandbox browser-launch failure required the permitted local check outside the sandbox. These results verify planning documents/diagram consistency only. No production API, database, synchronization, scheduler or mobile functionality has been implemented or tested.
