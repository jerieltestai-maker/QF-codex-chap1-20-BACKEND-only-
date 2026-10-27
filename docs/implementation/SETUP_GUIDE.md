# QuoteFix setup guide — 19 October 2026

**Current entry point, 27 October 2026:** use [Clone and data setup](CLONE_AND_DATA_SETUP.md) for reproducible installation/seeding/private dataset transfer and [stability operations](STABILITY_2026_10_27.md) for the owner’s current PostgreSQL prototype. The dated sections below preserve earlier setup context. The normal app has since moved to PostgreSQL; a restart does not install fixtures.

The owner designated [QF-codex-chap1-20](https://github.com/jerieltestai-maker/QF-codex-chap1-20) for source version control. Its visibility was verified as private. The initial README commit is retained as the parent of the application baseline. Local secrets, databases, security mailboxes, recovery copies, uploads and generated builds remain outside Git.

## Local PostgreSQL is configured — 19 October 2026

The owner installed Docker Desktop and authorised local configuration and fictional seed data. WSL 2 was verified by launching Linux; restarting Docker cleared its earlier stale WSL prerequisite failure. PostgreSQL 18 is healthy in the existing Compose service. See [the execution record](LOCAL_POSTGRES_2026_10_19.md) for versions, seed inventory, verification, backup and remaining limits. No paid cloud service is required for this setup.

Use the checked-in PowerShell helper from the repository root. It selects the first Docker/Node executable, discovers Docker's per-user/system installation when needed, enforces Node.js 24, and verifies that `desktop-linux` uses the local Docker Desktop Linux named pipe. Explicit Compose file/project/directory/example-environment arguments keep inherited Docker/Compose settings from redirecting commands. The fixed `qfwebapp` project retains the existing volume. The helper does not edit `.env`, reset a database, migrate PGlite data or switch the normal app's database. Installed project dependencies are required; Docker Desktop's Linux engine must be running.

```powershell
# Apply migrations and install/recheck the non-destructive fictional baseline:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 setup
# Run the suite against isolated schemas in quotefix_test:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 test
# Optional smaller concurrency for a busy machine (allowed range 1–4; default 2):
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 test -TestConcurrency 1
# Start a separate PostgreSQL preview, with local advice, at http://localhost:3001:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 dev
# Inspect the service:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 status
# Create an immutable local dump, restore the saved Windows copy into a fresh database,
# and compare all public-table rows against the dump's exported source snapshot:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 backup
# Stop only this local project's PostgreSQL service, retaining its volume:
powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 stop
# Run the Windows helper's isolated success/failure checks (no Docker needed):
powershell -NoProfile -ExecutionPolicy Bypass -File tools/test-local-postgres.ps1
```

The helper restores the caller's environment, PATH and working directory after success or failure. Its `test` action also sets the default environment/database to **test**, disables the local account helper, and uses temporary test schemas; implicit configuration must not target development. The loopback-only Compose password `local-only` is a development fixture. `quotefix_development` holds the fictional preview; `quotefix_test` hosts test schemas. The persistent volume is `qfwebapp_quotefix_dev`. Restart the existing service with `start`; `setup` additionally installs fictional fixtures. Do not use `docker compose down -v`: that removes the database volume. Do not delete the current PGlite directory or copy its engine files into a server PostgreSQL directory.

**Open the PostgreSQL preview at `http://localhost:3001`, and the existing app at `http://127.0.0.1:3000`.** Cookies are scoped by hostname, not port. Using `127.0.0.1` for both would let their same-named session cookies replace one another. The preview still binds only to the IPv4 loopback interface.

Backups and manifests go to ignored, uniquely named `work/postgres-backups/<id>/` directories. Each restore uses a new `quotefix_restorecheck_<id>` database and never overwrites an existing one. A read-only repeatable-read snapshot supplies both the source fingerprints and `pg_dump`; the saved Windows dump is copied back and restored before every table's row count/content digest is compared. A successful manifest includes the dump checksum and exact restored database name. The database-only check does not back up local helper encryption keys, security mailbox or external evidence; preserve those separately before genuine cross-machine recovery. Old dumps/check databases remain available for inspection; this command does not delete them or implement a production backup/retention policy.

The preview seed supplies six accounts (`admin`, `cm`, `cmtwo`, `mcst`, `mcsttwo`, `contractor` at `example.test`), two estates, one **unverified** contractor organisation and the approved development warning defaults. Use the local account picker or the fictional password documented in `packages/test-fixtures/fixtures.ts`. It intentionally creates no jobs, payments or reputation. Trade eligibility starts unconfigured and the contractor still needs the ordinary approval workflow; fixture setup does not invent verification evidence.

The repository's GitHub Actions workflow is also configured to run strict checks, compilation, PGlite tests and the suite against a temporary PostgreSQL 18 service. That service is created by the workflow; no cloud database password or production secret is needed. Check the actual Actions result before treating server PostgreSQL verification as passed. If repository Actions are disabled or the account has reached its usage allowance, the owner must enable/approve the relevant account setting or wait for the allowance to renew.

## What each service does

| Item | Plain-language purpose | Needed now? |
| --- | --- | --- |
| GitHub | Saves source versions, supports review/rollback and runs automated checks | Yes; repository supplied |
| Local PostgreSQL server | Tests database behavior with actual server connections, transactions and locks | Configured through Docker Desktop |
| Managed PostgreSQL | Stores live jobs, quotes, approvals, payments and audit records online | Before a hosted pilot |
| Managed authentication | Provides production login, email verification and password recovery | Before staging/pilot; the current adapter deliberately refuses staging/production |
| Private file storage | Keeps invoices, photos, transfer proofs and other evidence with server-enforced access | Before a hosted pilot; private access rules need implementation and tests |
| Application hosting | Runs the Fastify app and its continuous database-backed worker | Before a hosted pilot |
| Authentication email delivery | Sends verification/recovery/invitation security messages | Before external-user authentication; customer activity alerts remain in-app only |
| Upload malware scanning | Checks uploaded documents before they become usable | Windows prototype uses installed Defender; other platforms need configured ClamAV. Production scanning remains a release gate |
| Domain/DNS | Gives the hosted application and authentication sender a stable address | Later, when naming and hosting are chosen |
| Backups and monitoring | Detects failures and supports recovery of records together with evidence | Required before a real pilot, including an actual restore exercise |
| Gemini | Supplies the already configured optional comparison advice | Already configured locally; no replacement key requested |

## Suggested hosted path, pending owner approval

My recommendation for a small pilot is to evaluate **Supabase for PostgreSQL/authentication/private storage**, with **Render for the application and an always-running worker**. This reduces the number of separate providers to manage. Supabase bundles these backend capabilities and lists Singapore among its regions: [platform](https://supabase.com/docs/guides/platform), [regions](https://supabase.com/docs/guides/platform/regions). Render supports [Node web services](https://render.com/docs/web-services) and [continuous background workers](https://render.com/docs/background-workers).

This is a recommendation, not an approved purchase or an implemented production stack. **Do not provision paid projects yet.** Current code targets PostgreSQL 18; Supabase's official upgrade documentation currently discusses managed PostgreSQL 17. Confirm the project's actual available version, connection/network requirements and compatibility before choosing it. See [Supabase upgrades](https://supabase.com/docs/guides/platform/upgrading). Creating a cloud account alone does not adapt the existing login, storage or configuration code.

When ready to host, the owner will need to provide:

1. A monthly budget ceiling and a rough pilot size: estates, users, typical jobs and uploads.
2. Approval of the providers, project region and recurring costs after comparison. Singapore is a sensible candidate for the intended users; region selection alone does not establish compliance or retention rules.
3. Provider accounts owned by the owner, with separate development/staging/production projects when needed. Begin with development/staging and fictional data.
4. The chosen domain and access to its DNS settings.
5. A transactional email provider and authenticated sender domain. Supabase's default mail service is restricted to project-team recipients and is not intended for production; external-user verification/recovery needs [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

The coding agent will implement the production identity/storage adapters, database configuration/TLS, deployment definition, worker operation, scanning, access tests, migrations, backups/restore and release checks. The owner handles account signup, payment details, provider terms, domain ownership and final provider/budget/release decisions.

An idle-sleeping web service is unsuitable for QuoteFix's continuous timers and notice processing. Render's free web service sleeps after inactivity, has an ephemeral filesystem and does not provide a free continuous-worker service; its free PostgreSQL also has an expiry limit. Use its [free-service limits](https://render.com/docs/free) to distinguish a throwaway preview from a pilot. Do not store real evidence or the current local database on an ephemeral application disk.

## Secrets and current boundaries

Enter passwords and API keys into the local ignored configuration/key files or the deployment provider's secret settings. Do not paste them into a chat or commit them to GitHub. `.env.example` is a placeholder guide. The Git baseline was checked for common credential patterns and ignored local-data paths; this is a bounded check rather than a complete secret-detection guarantee.

GitHub is source recovery, not a backup of the live operational database/files. The existing data-preserving backups remain local. Production provider approval, retention/deletion, archival and the other open product gates retain their status in [OPEN_DECISIONS.md](../OPEN_DECISIONS.md). The requested fault-percentage checkpoint at Chapter 20 completion remains unchanged.
