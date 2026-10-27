# Operations and recovery runbook

19 October 2026. Local engineering implementation; production pilot approval is still required. Accountable local operator: project owner/sole Admin. This names responsibility without advertising a customer response SLA. Production on-call coverage, workload/budget and launch approval need a signed release record.

## Detection independent of the customer bell

`GET /health/live` reports API process liveness. `/health/ready` checks database connectivity, not whole-system readiness. Authenticated Admin `GET /api/v1/admin/operations` and the Admin processing-health panel report worker/queue/notice/timer/scanner faults without returning resource IDs, evidence bodies, credentials or signed links. A production monitor must poll these from outside the application host and route actionable incidents to the named operator; no new customer email/push channel is added. An API that is completely down cannot report its own outage.

| Signal | Local engineering threshold | Operator response |
| --- | --- | --- |
| Missing/failed worker tick | No successful tick, >30 seconds since success, or a failed tick | Check process/database/calendar; restore worker. Do not reset task ages |
| Eligible outbox backlog | Oldest available item >60 seconds late | Check worker throughput, leases and retry cause; inspect only authorised failure items |
| Pending timer lag | Oldest due pending timer >60 seconds late | Restore worker and let current guards re-evaluate overdue effects |
| Initial notice | Actionable non-informational task without issuance >60 seconds | Repair recipient/access/calendar/provider issue; no first-notice anchor before durable issue |
| Failed work/scanning | Any exhausted work or attempted scan still pending | Restore dependency; retry through Admin failed-work controls; never mark an unscanned file ready |
| Missing Admin follow-up | Acknowledged open Admin task lacks next action/date | Restore attributable dated follow-up; acknowledgment is not resolution |

These thresholds are diagnostics, not new business deadlines. Future tasks and not-yet-available delayed work are excluded from early delay alarms. Healthy worker ticks do not hide per-item failures. Logs retain request IDs, registered route paths/statuses and generic errors; cookies, authorization, CSRF, query strings, private bodies and raw SQL errors are excluded. Do not paste full diagnostic database rows into an incident ticket.

## Worker failure and ambiguous commands

1. Restore database/scanner availability and inspect the persistent failed-work queue as an authorised Admin. Confidential subject exclusions also apply to failed scan recovery.
2. A claimed item has a 120-second lease and a fresh lease token. A new worker can reclaim an expired lease; the old holder cannot commit/acknowledge that claim. Eight attempts lead to explicit failed work, with bounded exponential backoff before exhaustion.
3. Retry the existing durable work after fixing its cause. Do not create a second invoice, transfer, fee assessment or first notice. Existing domain guards, deduplication keys and server timestamps remain authoritative.
4. A lost command response means **Checking submission**. Look up the original authenticated operation ID or explicitly retry its unchanged input/key. `404` means no committed receipt is currently available, not proof that a real bank transfer did not happen.
5. Keep actual occurrence, server record and notice issuance dates separate. If recorded facts need correction after an outage, use attributable Admin correction; do not invent a customer maintenance deadline.

## Backup and restoration

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 backup` for the existing fictional PostgreSQL development database. The dump and table fingerprints use the same exported repeatable-read snapshot. The Windows-saved dump is copied back and restored into a new database. All tables/rows are compared; all `file_objects`/`export_results` byte checksums and ready-upload original size/checksum/presence are verified. Present authoritative evidence lives in PostgreSQL `bytea`, so these files are in the dump. A future external object adapter requires a coordinated object backup and must extend this procedure before release.

Run `... tools/local-postgres.ps1 drill` for an isolated fictional full journey with invoice/proof/actual receipt, Closed outcome and generated decision pack. It uses a new test schema, exports the exact snapshot, restores the copied artifact to a new database and compares every table plus evidence checksums. It never seeds/resets existing development/PGlite data. The test schema is removed by normal fixture teardown; dump, restore database and manifest are retained for inspection under ignored `work/recovery-drills`. Restored authentication credentials and evidence are private operational artifacts; keep them out of Git and restrict the recovery host. A failed drill is not a valid backup.

Preserve local helper encryption keys/mailbox separately when recovering local identities; neither is certified by a database-only dump. For PGlite, stop API/worker cleanly, preserve a cold copy and verify every file checksum before reopening. Never delete runtime markers from a possibly live database. Never run production migrations against a restored copy until environment/identity/storage and authorised purpose have been verified.

Recovery objectives remain a production gate: select RPO/RTO and retention from pilot workload, budget and obligations. The measured fictional drill is implementation evidence, not a commercial recovery guarantee. Verify allocation/fee/invoice counts and private file access before switching traffic. Revoke/re-establish restored sessions using an approved production identity incident procedure; production identity is not implemented here.

## Deployment and rollback

`pnpm release:check` fails closed unless every required check has a nonblank reviewable evidence reference, passed status and an exact current source commit. The checked-in manifest is deliberately blocked/pending. This is a completeness check, not cryptographic proof of human sign-off; reviewers must inspect evidence and owner authorization. Update it only after evidence actually exists. The source commit must refer to the application checkpoint being released; record documentation-only evidence changes separately.

Use separate environment-marked databases/storage/identity/secrets. Apply additive migrations, deploy API/worker, verify readiness/processing/role journeys, then release the client. Keep the previous compatible application artifact and test it against the expanded schema. Never roll back SQL by dropping new financial/history tables. Restore is for an explicitly authorised incident, not an automatic application rollback; replaying old data can duplicate real-world obligations. Current local identity explicitly refuses staging/production, and no production/storage/store deployment is authorized by implementation work.

## Remaining release evidence

Pilot capacity/latency and recovery targets, externally monitored host failure, real antivirus outage/recovery, managed identity/storage integration, assistive-technology/device walkthroughs, G14 retention/account lifecycle, dependency remediation and owner launch sign-off remain open. Optional repetition, warranty and archival policies retain their previous explicit deferrals. Do not treat a passing unit/integration suite as approval to close them.
