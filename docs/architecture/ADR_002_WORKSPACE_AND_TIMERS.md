# ADR 002 — Local workspace, files and timers

13 October 2026. Chapters 03–04 are authorised for construction by the owner, continuing local TypeScript/Fastify/PostgreSQL. No vendor/deployment commitment.

## Records and commands

Private jobs begin at **Report an issue**; saving does not publish an RFQ. Explicit commands replace status PATCH. Facts have immutable versions; optional attachments do not advance the decision-facts version.

Commands require session/CSRF, `Idempotency-Key: UUID`, `X-Access-Version: N` and `If-Match: "record-N"`. Creation/finalization/attachments use record 0; edits use job version; drafts use their independent revision; follow-ups use task version. Facts, audit, outbox and permanent receipt commit together. Reusing a key with changed input/version fails. Access is checked before receipt replay/lookup.

The local monolith shares the identity advisory lock with commands and worker effects, favoring correctness over parallel write throughput. Scoped ordered locks remain a measured-throughput option before deployment. SQL is parameterized.

Persistent local PGlite also uses an exclusive adjacent runtime lock with a real OS process ID. A second writer fails before opening the engine. A clean close removes only the engine's known `-42` runtime sentinel after shutdown, fixing the observed Windows restart failure. Stale/legacy/unknown locks fail closed for inspection; no database/evidence files are deleted. The restart integration test preserves a probe record across close/reopen. Server PostgreSQL remains the deployment adapter.

## Drafts and files

Explicitly saved drafts use user/context-partitioned localStorage, independent UUIDs and server revisions. Stale saves fail and preserve a separate copy. Pending-operation sessionStorage contains opaque ID, digest and versions, without report text. Account/context changes clear visible evidence/history/reports and inputs. Consequential commands require an online explicit submission.

Upload queues use partitioned IndexedDB. PNG/JPEG/PDF originals have a 10 MiB limit, 256 KiB chunks, SHA-256 and one-hour renewable authorization. Exact chunks can be retried; changed chunks fail. Finalization closes byte writes and queues processing without submitting a business form.

Local private immutable objects use PostgreSQL `bytea`, making promotion/state/object insertion transactional. No public URL, original filename or user-controlled object path is exposed. Downloads recheck parent permissions and record access. Managed private object storage remains a production adapter/recovery gate.

Configure an installed ClamAV executable with `CLAMSCAN_PATH`. Missing/unhealthy scanner leaves **verifying** and retries; it never marks bytes ready. Successful scanning precedes type validation and ready objects. Images are decoded/re-encoded with a 25-million-pixel limit and metadata stripped. PDFs receive header/trailer validation plus scanning and remain restricted originals. Visible image identifiers still require human privacy review in Chapter 06. Contractor access to current private workspace/files is denied.

G14 retention is open: no abandoned-upload/file/account cleanup is introduced. Narrowly scoped scanner scratch files are temporary; stored staging/evidence bytes remain retained.

## Tasks, bells and recovery

Support submission atomically creates its record, Admin task, audit and issuance intent. Confidential reports are visible to the reporter and permitted Admins, with user/company subject exclusions applying even to Admin. Ordinary support is estate-visible. Descriptions stay out of generic history/bells. Full case execution remains Chapter 14.

One role/company task has one first-issued anchor. Bells and per-user reads are separate. Current memberships/exclusions filter lists/counts/reads/failures; new eligible members see the same anchor. Missing recipients mean retry/failure rather than issuance.

Claims use a two-minute lease and `FOR UPDATE SKIP LOCKED`. Effect commit checks lease token and current task/version/audience; notice, anchor, timer and work completion commit together. Retries preserve anchors. Failed attempts wait 1/2/4/8/16/32/64 seconds, with subsequent delay capped at five minutes. Eight failures enter the Admin-only failure queue. Explicit requeue is audited and retains the durable work ID; technical failure never starts a user deadline.

T18 sends one +1-business-day ordinary Admin reminder. Acknowledgment needs a future follow-up and nonblank action, audits old/new values and replaces obsolete timers with T11. Reading/acknowledging/follow-up issuance leaves an unresolved task open. G02 further ordinary repetition is disabled.

Urgent primitives support +15m/+1h/+3h then +10h/+17h/+24h/+31h, anchored to issuance. Outage recovery coalesces missed steps and retains the next anchored checkpoint. Chapter 06 binds actual urgent RFQs; no public urgent-task endpoint is exposed.

## Singapore calendar and later integrations

`SG-MOM-2026-2027-v1` records [MOM public holidays](https://www.mom.gov.sg/employment-practices/public-holidays), verified 13 October 2026, including Monday observances of Sunday holidays. Changes require a reviewed new version; stored deadlines do not silently move. Missing year coverage fails scheduling. Business days skip the trigger date and use 23:59 Singapore cutoff.

Distinct helpers cover date-only expiry, noon sourcing, date-only Feedback and elapsed hours. T17 preserves remaining eligible business milliseconds and the excluded-date start boundary; live coverage/review binding belongs to Chapter 08. Browser countdowns use server time and never perform transitions.

Owning features must bind actual role/estate/company, exact source version, stopping guard and transactionally resolved/superseded tasks. No fee, transfer, assumed receipt, RFQ publication or work authorization is performed here. Managed identity/storage/scanning, server PostgreSQL concurrency/recovery, capacity/calendar/backup/monitoring and Chapter 19 security review remain production gates.
