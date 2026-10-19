# QuoteFix setup guide — 19 October 2026

The owner designated [QF-codex-chap1-20](https://github.com/jerieltestai-maker/QF-codex-chap1-20) for source version control. Its visibility was verified as private. The initial README commit is retained as the parent of the application baseline. Local secrets, databases, security mailboxes, recovery copies, uploads and generated builds remain outside Git.

## What to set up now

**Install and open Docker Desktop for Windows using its WSL 2 backend.** Docker Desktop and the PostgreSQL command-line client were not found on this machine during this check. Follow [Docker's Windows installation guide](https://docs.docker.com/desktop/setup/install/windows-install/); complete any requested Windows/WSL prerequisites and restart yourself if required. Docker's licensing eligibility depends on your organisation; check its terms during setup. No paid cloud service needs to be purchased for local PostgreSQL validation.

Tell the coding chat when Docker Desktop shows that its engine is running. The repository already contains `compose.yaml` for PostgreSQL 18. The coding agent can then start the server, create a separate test database, apply migrations and run the real PostgreSQL suite. The existing PGlite development database should remain in place while these tests run.

For reference, these are the local-only commands the agent will use after Docker is ready:

```powershell
docker compose up -d postgres
# Run once for a fresh local PostgreSQL instance:
docker compose exec -T postgres createdb -U quotefix quotefix_test
$env:TEST_DATABASE_URL = 'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_test'
pnpm test
Remove-Item Env:TEST_DATABASE_URL
```

The password in this example is the existing loopback-only Compose development password, never a production credential. The tests use separate temporary schemas and do not target the application's current PGlite data. Merely starting PostgreSQL does not move that data or switch the application to it. Do not delete the current data directory or copy its engine files into a server PostgreSQL directory.

The repository's GitHub Actions workflow is also configured to run strict checks, compilation, PGlite tests and the suite against a temporary PostgreSQL 18 service. That service is created by the workflow; no cloud database password or production secret is needed. Check the actual Actions result before treating server PostgreSQL verification as passed. If repository Actions are disabled or the account has reached its usage allowance, the owner must enable/approve the relevant account setting or wait for the allowance to renew.

## What each service does

| Item | Plain-language purpose | Needed now? |
| --- | --- | --- |
| GitHub | Saves source versions, supports review/rollback and runs automated checks | Yes; repository supplied |
| Local PostgreSQL server | Tests database behavior with actual server connections, transactions and locks | Next; Docker Desktop provides the local runtime |
| Managed PostgreSQL | Stores live jobs, quotes, approvals, payments and audit records online | Before a hosted pilot |
| Managed authentication | Provides production login, email verification and password recovery | Before staging/pilot; the current adapter deliberately refuses staging/production |
| Private file storage | Keeps invoices, photos, transfer proofs and other evidence with server-enforced access | Before a hosted pilot; private access rules need implementation and tests |
| Application hosting | Runs the Fastify app and its continuous database-backed worker | Before a hosted pilot |
| Authentication email delivery | Sends verification/recovery/invitation security messages | Before external-user authentication; customer activity alerts remain in-app only |
| Upload malware scanning | Checks uploaded documents before they become usable | Local configuration and production deployment still need a working scanner; missing ClamAV leaves uploads processing |
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
