# Chapters 03–04 construction and verification

13 October 2026. Backend-first local implementation with simple web controls. [ADR 002](../architecture/ADR_002_WORKSPACE_AND_TIMERS.md) records the engineering contracts.

## Try it locally

Start with `tools/dev.ps1 -Action dev`; fictional accounts/password are in [local development](LOCAL_DEVELOPMENT.md). As CM/MCST, save a device/server draft and explicitly create/edit a private workspace. It remains **Report an issue**; history preserves each fact version.

Queue PNG/JPEG/PDF evidence and resume. An installed scanner configured with `CLAMSCAN_PATH` is required for real readiness; absent/unhealthy scanner keeps files processing. Uploading never submits RFQ/completion/payment forms. All current files remain private.

Submit ordinary or confidential support. Admin gets a durable bell and open task. Confidential report subjects and unrelated estate members cannot read the report. As Admin, mark a bell read; the task stays open. Acknowledge with the next action and a future Singapore follow-up. Follow-up/countdown remains visible. Persistent failures have an explicit requeue control.

Switch account/context: visible inputs/evidence/history/reports clear; local drafts/files are partitioned. Only drafts/files, not decisions, can queue offline.

## API and verification

Schemas are in `apps/api/src/workspace-routes.ts`: workspace/draft/operation, upload/chunk/renew/finalize/attachment/download, support, task/bell/read and Admin attention/failure routes. Draft, upload and decision versions are separate.

TypeScript checking/build and the full automated suite passed **33 tests, 0 failures** on 13 October 2026. This includes Chapters 01–02 regressions, expired-lease recovery, and a persistent-database close/reopen/second-writer test. New tests: `tests/workspace.test.ts`, `tests/calendar.test.ts`, `tests/local-database.test.ts`.

| Chapter scenarios | Executed checks |
| --- | --- |
| CH03-T01/T02 | Actual outbox failure rolls back facts/version/audit/receipt; concurrent same-key submission has one outcome; changed input and revoked receipt access denied |
| CH03-T03/T09 | Optional evidence leaves fact version unchanged; one concurrent edit wins; generic status mutation denied |
| CH03-T04–T07 | Upload expiry/renewal/retry/immutability; checksum/type/size/malware rejection; unavailable scan remains pending; Contractor detail/history/download denied; sanitized image metadata removed |
| CH03-T08 | Independent draft copies; stale save and another owner's write denied |
| CH04-T01 | Friday/weekend/Monday holiday; Singapore cutoff; missing year coverage rejected |
| CH04-T02/T05 | Queued/no-recipient notice has no anchor; replay preserves one anchor; failure queue |
| CH04-T03/T04 | Read does not acknowledge/resolve; blank next action rejected; dated unresolved follow-up |
| CH04-T06 | Equal-role users share notice/deadline with separate read markers |
| CH04-T07/T10 | Obsolete timers stop; urgent outage coalesces; acknowledgment stops repeats |
| CH04-T09 | Confidential counts/queue/report and fee-bell permissions |
| T17 arithmetic | Holiday pause, noon restoration, repeated pause, already-due budget |

Browser checks passed against a fictional ephemeral local instance: device/server draft, private workspace and waiting-on bar, support into the Admin queue, CM-to-Admin switch clearing draft fields, shared bell/read and explicit acknowledgment with a dated Singapore countdown. Offline browser/device clock manipulation has not been executed. Scanner tests inject outcomes rather than certify an installed ClamAV service. Server PostgreSQL CI is configured separately from the embedded run; no production certification is claimed.

## Binding boundaries

T11/T18 are connected here. T15/T19 urgent scheduling is engine-level until Chapter 06. T03/T12/T13/T16/T17 have arithmetic helpers; owning chapters supply policy guards/audiences. T01/T02/T04–T10/T14/T20–T23 receive real feature bindings later. Generic tasks cannot perform financial assumptions. The [event contract](../architecture/EVENT_TASK_TIMER_CONTRACT.md) maps T01–T23.

G02 additional ordinary repeats and G14 retention/deletion remain open. Contractor opportunity/privacy-preview access, full case execution, finance and native synchronization remain later work.
