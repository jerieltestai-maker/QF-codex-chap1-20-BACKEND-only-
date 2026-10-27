# QuoteFix events, tasks and timer implementation contract

**Local construction update, 13 October 2026:** Chapter 04's task/bell/leased-worker/T11/T18 foundations and urgent/time arithmetic primitives are implemented. [ADR 002](ADR_002_WORKSPACE_AND_TIMERS.md) records the concrete local contracts; owning chapters bind the remaining business rules. Historical planning wording below does not describe the current implementation status.

Draft 0.2 — 12 October 2026. **Engineering proposal implementing the approved clocks; no scheduler is running.** The [timing register](../TIMING_AND_NOTIFICATION_REGISTER.md), particularly sections 14–15, remains the product source. This document specifies how web and mobile can share it reliably.

## 1. Separate five records

| Record | Meaning | Example |
| --- | --- | --- |
| Business event | A committed fact | MCST confirmed invoice version 3 |
| Task / obligation | Someone owes an action | MCST must send/record the payment; CM must inspect round 2 |
| Timer | A future condition to evaluate | If no meaningful payment update by +1 BD, alert Admin |
| Notification | A durable message directing someone to a task/fact | Payment follow-up is needed |
| Read / acknowledgment | User saw a message / explicitly took responsibility | Opening the bell versus Admin taking coordination |

A notification is not a new ticket stage. Reading it is not approval, receipt or acknowledgment. Tasks remain accessible even when notifications have been read or a device missed an update.

## 2. Event and task fields

**Event envelope:** `eventId`, `eventType`, `schemaVersion`, `aggregateType/id`, `aggregateRevision`, `actor`, `effectiveAt` with precision/source, `recordedAt`, `commandId`, `correlationId`, `causationId`, restricted payload/reference, and applicable policy version. Record an event once per committed fact; retries reference it.

**Task:** `taskId`, `type`, business parent, required document/round version, responsible role/organisation/estate or Admin, current action, `actionableAt`, `status`, `dueAt` if an approved deadline exists, `followUpAt` if it is only a chase date, resolution evidence, and superseding task/version. Assignment must resolve the actual party; never send a live “role responsible” placeholder.

**Timer:** `timerId`, rule ID/version, task/transfer/round version, immutable trigger event, anchor type/time, timezone/calendar version, calculated next execution time, pause history/remaining duration where applicable, delivery step, cancellation/supersession reason, lease/retry metadata and deduplication key.

**Notification:** task/event ID, authorized audience, template/copy version, issue time, current target link, urgency, per-user read marker. For a role with several accounts, keep one role obligation with deliveries/read markers for its eligible named accounts. The first durable issuance to that responsible organisation/role anchors its shared obligation; adding a new member or another device cannot reset it. The exact recipient expansion uses current permissions and confidential exclusions.

## 3. Issuance and transactional outbox

1. A business command commits its fact, task/timer intent, audit and outbox event together.
2. A worker leases committed work and rechecks the task version, recipient access and stop conditions.
3. In one database transaction, it inserts the durable in-app notification with a unique event/task/step/audience key and sets the first-issued anchor where needed. That is issuance: available in the authorized bell, not a push-provider acceptance or read receipt.
4. Any dependent seven-day deadline is calculated from this first issue time and stored in the same transaction. No clock starts merely because an event is waiting in the outbox.
5. A failed transaction retries without a notice or anchor having partially committed. A duplicate after successful commit finds the same issue time and cannot reset it.
6. If a valid recipient/notice cannot be established, retain the blocked intent and raise an operational/Admin attention item. Do not fabricate issuance or silently start a contractor response clock.

The worker needs **at-least-once delivery with idempotent effects**, not an “exactly once network” promise. Unique keys protect assumptions, fee assessments and notices. A client refresh must recover the same facts even if real-time/push delivery failed entirely.

## 4. Approved timer bindings

| Rule | Event/anchor | Server consequence and stop guard |
| --- | --- | --- |
| T01 | MCST invoice/settlement confirmation | Immediate payment task; +1 BD missing record/meaningful update reminds MCST and alerts Admin; +3 BD unresolved alerts Admin; then dated follow-up. Partial payment does not remove remaining balance duty |
| T02 | First durable Contractor notice for each transfer | +7 calendar days: assume receipt only for the unanswered, undisputed eligible transfer. Actual response/issue supersedes the automatic action. Keep assumption as labelled historical fact |
| T03/T04 | Full settlement/approved exception; then first due Feedback notice | +30 CD observation; date-only receipt -> 09:00 SGT. Late discovery -> issue now, preserve true due date. +2 BD CM reminder/+5 BD Admin from initial actionable notice; stop on submitted assessment or Unable to assess |
| T05/T06 | Invoice confirmation or authorised additional fee adjustment | Assess original/difference only; +3 BD unpaid verified balance restricts new quoting under confirmed policy. Preserve original deadline; do not remove unrelated restrictions on payment |
| T07/T08/T09/T22 | Specific approval, inspection round or response becomes actionable and its task/notice is issued | +2 BD actual party/+5 BD Admin. Use one applicable rule, not several parallel copies. Response can end response task while a remedy/execution duty remains |
| T10 | First cancellation notice to selected Contractor | Claim cutoff +7 CD; Contractor +2 BD while in-window; Admin earlier of +5 BD or cutoff minus 24h. Stop response chase on explicit response; preserve timely claims/debts. No automatic no-claims waiver |
| T11 | Admin saves next follow-up | Notify at that time if unresolved and version still current. Acknowledge-unresolved requires a dated next action/follow-up |
| T12 | Credential expiry entered/renewed | Admin one calendar month before; immediate notice if newly within window. At expiry, optional versus mandatory effects. Renewal invalidates old expiry jobs; clamp month subtraction as specified in register |
| T13 | Unselected quote expiry | Remove ordinary selectability at exact expiry; update coverage. Selected-price/scope hold remains. Authorisation checks expiry synchronously even if a worker is late |
| T14 | Agreed schedule / completion estimate | Display data; actual attention comes from T20/T21/T23. No separate timer merely to display the schedule |
| T15/T19 | Urgent RFQ published / first urgent notice | Initial Admin alert; +15min/+1h/+3h, then +10h/+17h/+24h and every 7h until explicit acknowledgment. Same urgent item. After acknowledgment use Admin's saved next time |
| T16 | RFQ publication / explicit new round | Second following calendar date at 12:00 SGT: current selectable count <3 -> Admin sourcing task. Zero is included. Revisions count once. No reset on ordinary edits |
| T17 | Coverage first reaches 3 distinct eligible current selectable offers | +5 BD selection owner/+10 BD Admin. Pause below 3; resume remaining time on restored coverage. Early selection remains allowed. Selection/cancellation supersedes task |
| T18 | First ordinary Admin attention item | +1 BD if unacknowledged. Stop on explicit handling/acknowledgment; unresolved duty retains T11. Further unacknowledged ordinary repetition stays O30 |
| T20 | Current authorised completion target | Admin immediately when missed; relevant CM/MCST +24 elapsed hours if still outstanding. Revised proposal alone does not move target; accepted revision preserves history |
| T21 | Start with unknown estimate + reason | +24 elapsed hours without estimate -> Admin. Only Admin reasoned exception changes submission deadline; actual completion/cancellation supersedes |
| T23 | Agreed scheduled start with no Start record | Admin at agreed time; relevant CM/MCST +24h if still unrecorded. Say “Start has not been recorded”; do not infer physical work never started |

Ordinary drafts, optional progress photos, an individual contractor choosing not to quote, not-yet-due Feedback and informational resolution acknowledgments do not acquire generic inactivity escalations. Low overall quote coverage is already T16. These are the approved exclusions, not monitoring omissions to fill with extra bells.

## 5. Time calculation contract

- The server is the only scheduler. Device countdowns use server time offset for display and refresh after reconnect; a zero countdown never changes authoritative state locally.
- Singapore business days exclude weekends and the maintained public-holiday calendar; exclude trigger date, due at 23:59 SGT on the Nth business date. Version the calendar used for each due date. Load and verify coverage before scheduling across a new year; missing calendar data is an operational error, not permission to treat holidays as weekdays.
- Calendar-day deadlines anchored to a timestamp retain Singapore local time; explicit +24h rules use elapsed hours. Sourcing +2 dates at noon is a separate rule and can be less or more than 48 hours after publication.
- Date-only quote/credential expiry is the first instant of the following Singapore day. Eligibility checks use the boundary directly, not a cached “active” badge.
- Date-only full receipt anchors Feedback at 09:00 on the 30th following Singapore date. Keep `observationDueAt` and `firstNoticeIssuedAt` separate for fair late-entry reminders.
- Store derived dates and their rule/calendar inputs. A deployment or UI refresh cannot silently recalculate old deadlines under a changed policy.

### Selection pause/resume: proposed calculation to validate

For each +5/+10 BD checkpoint, retain its original due date and accrued/remaining **eligible Singapore business time**, not a resettable “days since last update.” Exclude the original trigger date. At a coverage loss, save remaining business seconds between the effective pause instant and deadline; if the counting window has not begun, retain that start boundary. Nonbusiness dates consume none. On coverage restoration, resume remaining time within eligible business-date intervals, respecting any not-yet-reached initial boundary. Preserve emitted checkpoints so the five-day reminder cannot fire twice after resumption.

If coverage drops after a checkpoint is already due, evaluate the current guard before issuing; keep it ready rather than granting a new full allowance. A scheduled review is an explicit dated task, not an arbitrary text comment resetting the clock. Exact scheduled-review resumption and the end-of-day precision need named acceptance examples in the timer spike; do not claim that the approved pause/resume rule settles every arithmetic edge case.

This arithmetic is an engineering proposal. Validate same-day pause, weekend/holiday pause, noon restoration, already-due pause, several cycles and simultaneous expiry/reconfirmation before freezing it in the specification.

## 6. Task lifecycles and Admin attention

Suggested task states: `scheduled`, `open`, `paused`, `completed`, `superseded`; failed technical delivery belongs to job execution metadata, not a user task state. Overdue is a derived condition, not a new workflow stage.

Admin attention has separate `unacknowledged` / `acknowledged` and `resolved` facts. On acknowledging an unresolved item, Admin must either retain a dated execution task or enter a next follow-up time. Merely reading a bell cannot remove the item from the attention queue. A response that says “still investigating” is progress data, not completed payment or repair.

Deduplicate multiple causes pointing to the same obligation. The queue may display several relevant reasons under one item; specific approved clocks retain their own provenance. Do not combine unrelated confidential cases just because they share a ticket.

Approved payment countdown copy:

- **MCST:** “QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.”
- **Admin:** “Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.”

Show an exact Singapore date/time and name the follow-up when overdue. Do not turn these into threats about a bank-payment deadline.

## 7. Retry, outage and race behavior

**Engineering starting proposal:** exponential retry with jitter for transient worker failures, capped at five minutes; after repeated failures or materially delayed urgent/notice issuance, create an operational alert and visible failed-work item. Tune concrete attempt/latency thresholds in the operations spike. They are technical recovery settings, not additional reminder schedules for end users.

Workers use leases so crashed work becomes eligible again. Commit the side effect and deduplication marker together. Retrying a PostgreSQL transaction requires re-evaluating state; retrying file/AI providers reuses stable request identity where supported and rejects stale results.

On recovery from an outage:

1. Find overdue durable timers; do not rely on an in-memory `setTimeout` that disappeared.
2. Re-evaluate current task/version/eligibility before acting. Skip superseded rounds/quotes, completed inspections, responded transfers and cancelled work.
3. Apply a due business transition once, recording the true policy-effective time and actual execution time separately. If receipt confirmation/issue won the lock first, the assumption no longer applies.
4. Coalesce missed reminder steps into the current actionable notice rather than issuing a backlog of obsolete +15min/+1h/+3h messages. Preserve missed-step execution history for operations. Future repeats retain the original anchored schedule.
5. Notify on still-actionable failures; do not turn an app outage into a fictional user acknowledgment, approval or bank-payment event.

When eligibility changes, quote expires or material RFQ terms change, recompute sourcing/selection coverage through the same guarded command path. A periodic reconciliation job repairs missed derived tasks and reports discrepancies; it must not mint new assessments, silently overwrite history or become a second rule engine.

## 8. Required engineering checks

Use a controllable test clock and actual database constraints:

- Trigger on Friday before a Singapore public holiday; verify correct business due date/cutoff.
- Payment notice delayed by worker outage: seven days start at durable notice issuance, not transfer/report time.
- Notification transaction commits, worker crashes before acknowledgment: retry retains one notice and anchor.
- Payment Issue and T02 worker race: no contradictory double receipt; late issue can still enter support.
- New inspection round supersedes old reminder, without reusing a failed inspection.
- Coverage 3 -> 2 -> 3 across holidays: same remaining budgets, no early-selection block or duplicate reminder.
- Urgent acknowledgment at a repeat boundary: no later obsolete reminder; unresolved follow-up remains dated.
- Admin backtrack and invoice adjustment preserve applicable fee deadlines and financial history.
- Date-only expiry midnight and 09:00 Feedback match the approved Singapore rule despite device timezone/clock changes.
- All T01–T23 bindings map to a rule ID, stop condition, allowed audience and accountable owner; open O30 rules are explicitly disabled/gated.

No timers should be tested only by inspecting a Mermaid arrow. These cases become executable integration tests during implementation; none is claimed as passing application behavior today.
