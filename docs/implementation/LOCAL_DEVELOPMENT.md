# QuoteFix — local development

**Current setup, 27 October 2026:** follow the [clone and data setup guide](CLONE_AND_DATA_SETUP.md) for a fresh checkout, pinned dependencies, explicit fictional seeding and private dataset transfer. The owner's normal app now uses local PostgreSQL at port 3000 under the supervisor; see [stability evidence and operating commands](STABILITY_2026_10_27.md). Original PGlite copies/markers remain preserved. Do not replace the owner's current ignored configuration with a fresh example or run fixtures as a restart step.

The PostgreSQL helper's `dev` action is a separate fictional foreground preview at http://localhost:3001. Both it and `tools/dev.ps1 dev` now verify migrations **without seeding**. Fictional installation is explicit: `./tools/local-postgres.ps1 setup` for its dedicated demo database, or `pnpm db:fixtures` for an intentionally selected fresh development database.

The following chapter notes retain earlier implementation context; the current clone/stability guides supersede historical database paths and startup descriptions.

Chapters 13–14 add private Contractor billing, independently rounded fees, verified collections/refunds, immediate cancellation/claims, job/account support, exact amended settlements, actual execution verification and controlled Admin correction. Restart the API to apply migration 010 without resetting data. [Build evidence](CHAPTERS_13_14_BUILD.md) and [ADR 007](../architecture/ADR_007_BILLING_AND_SUPPORT.md) record the actual scope and checks. The concurrently constructed [Chapters 15–16 build](CHAPTERS_15_16_BUILD.md) owns Feedback, aftercare, reputation and its provider setup.

Chapters 11–12 supplied combined completion/invoice submission, repeated operational inspection, immutable invoice reconciliation, exact MCST confirmation, proof-backed transfers, actual/assumed receipts and guarded closure. [Their historical build evidence](CHAPTERS_11_12_BUILD.md) records that stage of construction. Operational work acceptance remains separate from reputation ratings.

Chapters 09–10 added actual Start, optional progress/evidence, schedule acceptance, interruption and scope/price variations. [Their historical build evidence](CHAPTERS_09_10_BUILD.md) records the scope at that time. `node node_modules/tsx/dist/cli.mjs tools/chapter910-preview.ts` runs an isolated fictional memory-database preview on port 3304 with the current authorised-work panel.

This is the runnable local build with fictional accounts, private workspaces/drafts/uploads, procurement/work/payment workflows, audit, support tasks, bells and Admin follow-ups. Earlier foundations are recorded in [Chapters 03–04](CHAPTERS_03_04_BUILD.md); the current scope and remaining chapter/provider integrations are in the latest build record above.

## Start on Windows

Install Node.js 24 LTS and pnpm 11.25.0 if not already available, then run from the repository root:

```powershell
.\tools\dev.ps1
```

This helper creates `.env` from `.env.example` only if absent, installs dependencies if needed, verifies migrations and starts http://127.0.0.1:3000 in the foreground. It does **not** seed accounts. A fresh default `.env.example` selects PGlite; for the recommended PostgreSQL clone use the guide above. Install fictional accounts only against an intentionally fresh database with `pnpm db:fixtures` or `./tools/dev.ps1 -Action fixtures`. Keep the foreground terminal open; Ctrl+C stops the API. Both this `dev` action and `pnpm dev` are migration-only restarts.

Other commands:

```powershell
.\tools\dev.ps1 -Action typecheck
.\tools\dev.ps1 -Action test
.\tools\dev.ps1 -Action build
.\tools\dev.ps1 -Action migrate
```

Portable equivalent with pnpm on PATH:

```text
pnpm install
(copy .env.example to .env)
pnpm db:fixtures
pnpm dev
```

The persistent embedded database is the `DATABASE_PATH` configured in the ignored `.env`; `work/development-db` is only the fresh-install default. Stop the app before running another process against that embedded database. The test suite creates independent in-memory databases unless `TEST_DATABASE_URL` selects isolated PostgreSQL test schemas; it never opens the current development database. Dependencies, development data, `.env` and security messages are ignored by Git.

## Fictional sign-in accounts

All use password `Fictional-dev-only-2026!`.

| Email | Role/context |
| --- | --- |
| admin@example.test | Platform Admin |
| cm@example.test | CM, Fictional Estate Alpha, Block A |
| cmtwo@example.test | Same-estate CM, Block B |
| mcst@example.test | Same-estate MCST, Chair |
| mcsttwo@example.test | Same-estate MCST, Treasurer |
| contractor@example.test | Pending, unverified contractor company |

No account is a real user or a production bootstrap. Equal-role accounts have equal capabilities. Changing the fixture password in source does not overwrite accounts already installed.

## Try the onboarding flow

Create an account, open its local JSON verification message in work/security-mailbox, and paste its token into Verify email. Sign in. A verified identity without a membership sees Pending access.

As fictional Admin, invite that address to an estate with CM or MCST authority. Sign back in as the matching recipient, copy the invitation token from the local mailbox, and accept it. The token is one-use, expiring, and grants exactly the Admin-chosen estate/role. An invitation itself does not verify the email.

A separate new account may apply as a contractor with company name, contact and requested scopes. It gets company-account access while remaining unverified. Chapter 05 now supplies private profile/evidence, Admin decisions, credential expiry and explicit trade setup; Chapter 06 supplies reviewed publication, opportunities and urgency. See [build evidence](CHAPTERS_05_06_BUILD.md). Quotation submission itself belongs to Chapter 07.

Recovery similarly writes a local recovery token. Reset consumes it once and invalidates existing sessions. Sign-out clears the session cookie and visible fields. Explicitly saved web drafts and IndexedDB upload queues are partitioned by user/context. Network failure never queues a consequential decision. Windows defaults to installed Microsoft Defender; other platforms need configured ClamAV, or select it explicitly with `FILE_SCANNER=clamav` and `CLAMSCAN_PATH`. Missing/unhealthy scanning keeps uploads unready. No staging/evidence deletion policy is introduced while G14 remains open.

## Server PostgreSQL option

If Docker is available, run `docker compose up -d`. In .env set DATABASE_ADAPTER=postgres and DATABASE_URL to the local URL in .env.example, then run migration/fixtures/start as above. Use a distinct database ending in _test for integration tests. No reset/delete command is provided.

## API conventions

All account API routes start /api/v1. See the source route schemas in apps/api/src/app.ts.

- POST requests require an Origin exactly matching APP_ORIGIN.
- Authenticated POST requests additionally require X-CSRF-Token from GET /me/context.
- Invitation/application/membership mutation commands require Idempotency-Key (UUID) and If-Match: "access-N" from the latest context ETag.
- The same operation/body returns the committed receipt; a different body under the same key is rejected. Do not automatically submit a stale command with a new version.
- 401 requires sign-in; 403 means no authority; non-disclosing 404 conceals inaccessible estates; 412 requires renewed review; 422 means field validation; 428 means missing operation/version preconditions.
- Responses carry X-Request-Id and private responses use Cache-Control: no-store.
- GET /health/live is minimal liveness. GET /health/ready checks database availability without revealing connection details.

Admin can list estates/memberships, issue estate invitations and revoke non-Admin memberships with a reason and exact membership version. Existing sessions are re-authorized from current memberships. Reactivating members, real estate onboarding, production bootstrap and production identity are future explicit work; do not edit production data using fictional fixtures.

## Limits and release gates

The local adapter intentionally cannot run in staging/production or on a public bind address. Do not use real personal data in this setup. Production managed identity, security delivery, supported server PostgreSQL concurrency, private file storage, worker recovery and deployment/backup evidence remain pending. No paid hosting, public deployment, email sending or GitHub publishing is performed.

Normal startup uses port 3000. The historical Chapters 01–02 preview used port 3001; Chapters 03–04 browser verification uses `node node_modules/tsx/dist/cli.mjs tools/chapter34-preview.ts`, port 3303, and explicitly ephemeral fictional data. The normal development database stays persistent. A real HTTP smoke check is available with `pnpm exec tsx tools/http-smoke.ts` (append the actual local URL when checking another port).

Persistent PGlite refuses a second writer. Clean shutdown removes only its known runtime lock files after the engine closes. A stale/legacy engine lock requires inspection; do not reset/delete database or evidence to work around it. Data-preserving clean restart is covered by `tests/local-database.test.ts`.

CI is configured to run both embedded and server PostgreSQL tests. To run against a dedicated local PostgreSQL test server, set TEST_DATABASE_URL to a loopback database ending in _test before `pnpm test`. Tests create and remove only random qf_test_ schemas in that dedicated database. Never set it to a live database.


## Account autofill buttons

With LOCAL_ACCOUNT_HELPER=true in .env, the sign-in page shows local account buttons. Choose one to fill email/password and then explicitly press Sign in. The account list reflects current users/roles and updates automatically; creating an account does not skip email verification. Newly registered local users and changed recovery passwords are remembered automatically. Previously created custom accounts require one successful manual sign-in before their password can be filled. The normal password hash cannot recover an old password.

The optional helper is confined to development on the configured loopback origin. Password copies are AES-256-GCM encrypted in local_account_credentials with a separate ignored work/local-account-keys key; fixture passwords are validated against the current hash. The API returns the password only for the selected account, never in the account list. It stores no credentials in browser localStorage. Set LOCAL_ACCOUNT_HELPER=false to hide/disable it. Never use this helper for production accounts; production identity remains gated.

Migration 007 adds the helper table without altering existing users, decisions or financial records. Targeted foundation/access/helper verification passed 17 tests on 13 October 2026.


The current account-helper preview runs on http://127.0.0.1:3001 with persistent work/account-helper-preview-db. The older work/preview-db failed to reopen and was preserved for inspection; no existing account/business data was reset or overwritten. To continue this preview after stopping its server, use DATABASE_PATH=work/account-helper-preview-db, PORT=3001 and APP_ORIGIN=http://127.0.0.1:3001 in .env before starting the API. Do not open the embedded database from two processes.

