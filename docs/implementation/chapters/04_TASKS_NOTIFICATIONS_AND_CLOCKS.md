# Chapter 04 — Tasks, bell notifications, countdowns and Admin attention

**Local construction, 13 October 2026:** task/bell/worker and T11/T18 foundations are implemented; [build evidence](../CHAPTERS_03_04_BUILD.md) records tests and later business-rule bindings.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [03](03_WORKSPACE_RECORDS_AND_FILES.md) · Next: [05](05_CONTRACTOR_VERIFICATION.md)

**Dependencies:** 01–03. **Primary lifecycle node:** E1. **Primary timers:** T11/T18; shared engine for T01–T23. **Sources:** timing register sections 14–15, C27/C44/C54, O31-F; [event contract](../../architecture/EVENT_TASK_TIMER_CONTRACT.md).

## 1. Build order

Implement task ownership/status first, then durable notification issuance/read markers, Singapore calendar calculations, versioned timers/worker leases, stop/supersede handling, Admin attention queue and countdown presentation. Feature chapters supply event/recipient/condition bindings; they must not create separate scheduling engines.

## 2. Fields and visible controls

| Item | Required / system | Optional |
| --- | --- | --- |
| Task | Type, parent, required version, actual responsible party, action, actionable time, current state | Approved deadline or follow-up only when applicable |
| Timer | Rule/version, anchor, calendar/time precision, next checkpoint, dedupe key, stop guard | Pause intervals/remaining time for T17 |
| Initial bell | Permitted audience, event/task, copy version, target, first-issued timestamp | Per-user read time; read is not action |
| Admin acknowledges unresolved item | Explicit acknowledgment plus a real dated action/next follow-up | Contact attempt/result note where relevant |
| Admin follow-up | Named outstanding action and next date/time | Optional coordination notes within permitted case audience |

All roles see their own relevant bell and actions. The Admin queue is Admin-only; role tasks shared across several equal-role accounts still complete once. Reported subjects are excluded, including from notification counts/previews. Case details and Contractor fees never leak through generic reminders.

## 3. Events, timers and stop conditions

| Trigger | Wait/action | Next actor / stop condition |
| --- | --- | --- |
| First ordinary Admin attention issued | T18 +1 BD -> re-alert Admin | Stops untouched reminder after explicit handling/acknowledgment. If unresolved, dated follow-up remains. Further automatic repeats are G02 |
| Admin saves follow-up date | T11 at exact saved date/time -> Admin bell | Admin records contact/outcome and next actor/date, or evidence-backed resolution. Rescheduling audits prior/new time; no invented resolution |
| Durable in-app notice commits | Set first-issued once | Dependent receipt/claim clocks can now begin; worker queue/read/push cannot start/reset them |
| Role response/decision succeeds | Complete response task; stop its obsolete timer | Substantive repair/payment task may remain; generic comments do not satisfy it |
| Case/round/authority superseded | Supersede affected tasks/timers | Preserve history and create only genuinely required replacements |
| Initial notice permanently failing | Technical failure queue/operational alert | No fabricated user silence; recover issuance and surface accountable Admin follow-up |

Urgent cadence is bound in chapter 06: 15min/1h/3h, then every 7h after the 3h mark. Do not apply it to ordinary requests. Payment, cancellation, selection and inspection each use their specific chapters; never layer a generic 2/5-BD timer over a different approved clock.

## 4. Countdown copy and business time

Name the event and exact Singapore time. For payment follow-up, preserve:

- MCST: **QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.**
- Admin: **Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.**

Use **Scheduled** before an agreed future start. Receipt/claim/fee countdowns appear only to the authorised party owing that action; other viewers get permitted progress, not someone else's private obligation. Countdown hours are elapsed to the server due instant even when calculation used business days. Device timezone/clock cannot change due time.

Maintain the holiday calendar and rule version. Test T17 pause/resume business-time arithmetic explicitly; preserve remaining waiting, not a fresh five/ten days. A scheduled review is a dated task, not a comment resetting history. Open precision/examples remain in G02/engineering gates until specified.

## 5. Worker recovery and API contract

Commands create fact/task/outbox together. Worker checks current task/version/audience, inserts unique bell and anchor atomically, then schedules dependent work. At-least-once processing with unique effects; expired leases recover after crashes. On outage recovery, re-evaluate due conditions and coalesce obsolete reminder backlog into current actionable attention. Preserve effective deadline and actual execution time separately.

Expose task/bell lists, read markers, explicit Admin acknowledgment and next-follow-up commands. No arbitrary client-editable `dueAt` or task-completed flag. Technical retry thresholds are engineering settings; end-user cadence comes only from approved rules.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH04-T01 | Friday trigger with a configured Monday holiday | BD due date skips trigger/weekend/holiday; cutoff 23:59 SGT |
| CH04-T02 | Initial notice waits in outbox then is retried | First-issued absent until durable commit; one anchor/notice after recovery |
| CH04-T03 | User opens bell or adds generic comment | Task not completed/acknowledged; deadline not reset |
| CH04-T04 | Admin acknowledges unresolved item without next action/date | Refused with targeted field error; no item falling out of follow-up |
| CH04-T05 | Worker crash after notice transaction commits | Retry does not duplicate bell/financial transition or shift anchor |
| CH04-T06 | Several equal-role users/new member/new device | Shared obligation one deadline; per-user reads; named actual responder preserved |
| CH04-T07 | Obsolete round timer wakes after response/cancellation | Stop guard prevents misleading notice; history retained |
| CH04-T08 | Phone clock/timezone changed, app offline at zero | Display refresh corrects offset; no client-triggered business transition |
| CH04-T09 | Confidential report subject/CM queries billing bell | No content, count or deep-link leak |
| CH04-T10 | Outage spans urgent reminders; Admin already acknowledged | No stale reminder burst; unresolved dated follow-up remains |

## 7. Completion gate

Deliver timer primitives, Admin queue, countdown component, controllable-clock test harness and the T01–T23 binding contract. Feature bindings are completed/tested in their owning chapters. Ordinary additional repetition remains G02; optional drafts and informational acknowledgments must not receive invented escalation.
