# Local PostgreSQL setup — 19 October 2026

**Follow-up audit:** [corrections and stronger verification](LOCAL_POSTGRES_AUDIT_2026_10_19.md) supersede the original shared-host preview, inherited Compose settings and limited backup check below. The normal app was subsequently restarted on current source after a verified cold backup. The source checkpoint `067b7f6` completed [GitHub verification successfully](https://github.com/jerieltestai-maker/QF-codex-chap1-20/actions/runs/39199618124); the follow-up source has its own checks.

The owner installed Docker Desktop and explicitly authorised configuration, fictional seeds and a version-controlled record. This is local development infrastructure, not a production release or a decision about hosted providers. [Repeatable commands](SETUP_GUIDE.md) are implemented in `tools/local-postgres.ps1`.

## Runtime and isolation

- Docker Desktop 4.95.0, Docker Engine/CLI 29.8.2, Compose 5.6.0.
- WSL 3.0.3.0; Ubuntu launches with the WSL 2 kernel `6.18.54.1-microsoft-standard-WSL2`. The initial Docker failure retained an earlier "WSL is not installed" precondition; a Desktop restart cleared it. The restart CLI initially timed out while first startup continued; subsequent server/engine health checks succeeded. No WSL reset, distribution deletion or Windows reboot was performed.
- Existing `postgres:18` Compose service (server **18.6**), bound only to `127.0.0.1:5432`, using persistent volume `qfwebapp_quotefix_dev`. The development-only role/password remain `quotefix` / `local-only`; this is not a production role/secret design.
- `quotefix_development`: fictional preview data. `quotefix_test`: isolated `qf_test_*` schemas for tests. The existing PGlite database and `.env` were not switched or reset. The original app on port 3000 remained reachable during setup.
- `dev` uses a separate loopback origin/port 3001 and local advice. No paid Gemini call or provider configuration change is needed for database validation. This process runs in the foreground and stops with Ctrl+C.

## Seed and migration record

All **13 SQL migrations**, through `018_dashboards_and_exports.sql`, applied without changing their protected source bytes. Setup was repeated successfully with the same baseline counts: **6 users, 6 memberships, 2 estates, 1 organisation, 2 estate warning-setting records, 0 jobs**. There are no fabricated financial/reputation records. The organisation is unverified, and trade eligibility remains unconfigured; these are deliberate workflow starting points. Development uses the approved 20%/30%/20%/3 warning defaults, not the relaxed test settings.

Accounts are fictional `example.test` addresses listed in the setup guide and local account picker. Fixture inserts preserve existing IDs/data rather than overwriting passwords, policies or business history. Seeding is refused outside development/test or when the persistent environment marker disagrees.

## PostgreSQL compatibility findings

The first GitHub verification passed typecheck, compilation and the 231-record PGlite suite. Its PostgreSQL suite reported **206 passing / 25 failing records**; this was not a successful server verification. Local reproduction confirmed:

1. Warning-trigger and support-obligation arrays were passed directly to `pg`, which encoded them as SQL arrays instead of JSON. Three JSONB writes now explicitly serialize these arrays: warning cards, ordinary support resolutions and correction-created repair resolutions. Native SQL array fields retain their existing behavior.
2. Protected-access evidence was recorded in `onResponse`, permitting callers to receive a result before that independent transaction committed. The hook now awaits the evidence in `onSend` before releasing content. A delayed-database regression checks this ordering directly.
3. Three assertions assumed PostgreSQL `bigint`/`COUNT` values were JavaScript numbers. They now compare the actual cents/count across driver representations without changing numeric parsers or sacrificing integer precision.

The intermediate local focused run passed **34/35** records, exposing the third JSONB writer in the correction-created resolution; that writer was then fixed. Earlier failing runs remain disclosed here.

The affected PGlite suites subsequently passed **44 records**, with zero failures/cancellations/skips/todos (317,897 ms; one file at a time to limit memory demand alongside PostgreSQL). Suites: billing/support, the cross-chapter audit, feedback integration, integrity and protected access. Log: ignored `work/pglite-postgres-fixes-final.log`. Strict TypeScript/browser syntax checks and compilation also passed after the final source changes.

The **complete local PostgreSQL 18.6 suite passed 232 records**, with zero failures/cancellations/skips/todos (574,948 ms, four-file concurrency). Log: ignored `work/postgres-full-final.log`. This includes the three previously failing JSONB paths, protected-access ordering, confidentiality, financial/repair execution, integer representations and real server transaction/race checks. The 44 affected records overlap this full suite; do not add them into a distinct coverage count.

The separate port-3001 PostgreSQL preview passed readiness, six-account discovery, Admin login and authenticated account-context checks, then was stopped. The original port-3000 PGlite app remained healthy. After all tests, PostgreSQL was restarted: health returned and readback retained the same environment and seed counts. The test database had **zero leftover `qf_test_*` schemas**. Docker/PostgreSQL remain running; the optional preview is started with the documented `dev` action.

Runtime changes and setup were published in commit `5b5a1a13d479425154dc99e548168675ef1f9ab1` on `codex/chapters-01-18-baseline`, under [draft PR 1](https://github.com/jerieltestai-maker/QF-codex-chap1-20/pull/1). [GitHub verification for that source](https://github.com/jerieltestai-maker/QF-codex-chap1-20/actions/runs/39198785643) is a separate server/Linux result; check its actual conclusion rather than inferring it from local success. Database dumps, test logs and operational configuration are ignored and were not committed.

## Backup and recovery

An actual `pg_dump` custom-format backup of the fictional PostgreSQL development database was copied to ignored `work/backups/quotefix-seed-20261019.dump`. SHA-256: `8700998ca6d5192eaa198d8ef9b8154ab73e2d8d523678be8c973dfb582f1496`.

`pg_restore --exit-on-error` restored it successfully into a separate database, `quotefix_restorecheck_20261019`. Readback confirmed **13 migrations, 6 users, 2 estates and 0 jobs**. The original development/test databases were not replaced. This seed backup contains no job evidence; it is not a production backup schedule or a restore certification for real database-plus-upload data. The dump and restored local database stay out of Git.

## Remaining boundaries

Production identity/private storage/hosting, malware scanning, provider/version choices, real-data migration and release checks remain outstanding. In particular, no working local ClamAV scanner has been configured by this PostgreSQL setup; the existing fail-closed upload behavior remains. The existing open product policies and Chapter 20 reminder are unchanged.
