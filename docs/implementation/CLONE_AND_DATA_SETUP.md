# Clone QuoteFix, reproduce the stack and copy data

This guide covers the desktop prototype on `codex/stability-p1-p2`. The repository is private; the recipient needs GitHub repository access. A clone includes source, migrations and fictional seed definitions. It does **not** contain the owner's database, images, drafts, passwords, helper keys, Gemini key or workstation configuration.

## 1. Clone and install the pinned stack

Requirements: Git, **Node.js 24.x**, **pnpm 11.25.0**, and Docker Desktop with its Linux engine running for PostgreSQL. The PowerShell database helper supports Windows PowerShell 5.1 and PowerShell 7. Python 3.10+ is only needed for the planning-document tools. Docker's CLI should be on PATH for the optional manual restore commands below.

```powershell
git clone --branch codex/stability-p1-p2 https://github.com/jerieltestai-maker/QF-codex-chap1-20.git QuoteFix
Set-Location QuoteFix
node --version
pnpm --version
pnpm install --frozen-lockfile
```

If pnpm is absent, install the pinned version with `npm install --global pnpm@11.25.0`, then reopen the terminal. Use the checked-in lockfile; don't run a dependency update merely to reproduce this version. To reproduce an exact checkpoint later, save `git rev-parse HEAD` and check out that commit in the receiving clone. `.gitattributes` preserves the exact checksum-protected SQL migration bytes; never reformat those migration files.

| Layer | Implementation / source of truth |
| --- | --- |
| API and web | TypeScript, Fastify 5, browser JavaScript; `apps/api`, `apps/web` |
| Domain and worker | Shared transactional workflow rules and durable database-backed work; `packages/domain`, `packages/infrastructure` |
| Database | PostgreSQL **18** via `compose.yaml`; PGlite is an optional embedded development/test adapter |
| Files and exports | Authoritative bytes currently stored in database `bytea`, including uploaded originals/sanitised objects and generated exports |
| Native | Expo 58 / React Native 0.88 / React 19.3, exact versions in `apps/mobile/package.json` and lockfile; SQLCipher/SecureStore require native builds |
| Identity and advice | Loopback-only local identity; advice defaults to local. Gemini is optional and needs a separately supplied server key |
| Scanner | Installed Microsoft Defender on Windows by default; ClamAV can be explicitly configured. Unavailable scanning does not mark files ready |

The Node/pnpm versions and dependency lock are pinned. Compose uses the PostgreSQL 18 image tag, so a later pull may include a newer 18.x patch; this is not an immutable container-digest claim. Production identity/storage/hosting and mobile store delivery are separate unfinished release work.

## 2. Fresh desktop with fictional seed data

Use this path on a **fresh machine/environment**. The helper deliberately uses the fixed local Compose project `qfwebapp`, its existing persistent volume, and database `quotefix_development`. Two checkouts on the same desktop therefore share that service/database unless you explicitly choose another database as in section 4. Installing a new checkout does not create an independent database by itself.

```powershell
# Refuse to overwrite an existing configuration.
if (Test-Path -LiteralPath .env) { throw 'Existing .env found; inspect it instead of replacing it.' }
Copy-Item -LiteralPath .env.example -Destination .env
$qfConfiguration = Get-Content -LiteralPath .env -Raw
$qfConfiguration = $qfConfiguration.Replace('DATABASE_ADAPTER=pglite','DATABASE_ADAPTER=postgres')
$qfConfiguration += "`nDATABASE_URL=postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_development`n"
Set-Content -LiteralPath .env -Value $qfConfiguration -Encoding utf8

# Starts PostgreSQL, applies migrations and installs the fictional baseline.
./tools/local-postgres.ps1 setup
if ($LASTEXITCODE -ne 0) { throw 'Setup failed; do not continue.' }
node tools/prototype.mjs start
node tools/prototype.mjs status
```

Open **http://127.0.0.1:3000**. The supervisor runs the API and continuous worker together, detached from this terminal. Docker Desktop must remain running. Use `node tools/prototype.mjs stop` to stop this checkout's API, and `./tools/local-postgres.ps1 start` followed by `node tools/prototype.mjs start` for later restarts. The `start` action does not seed data. After a code update, stop/start the API to load the new source; startup verifies migrations without installing fixtures.

The baseline is defined by [`packages/test-fixtures/fixtures.ts`](../../packages/test-fixtures/fixtures.ts):

| Data | Fresh baseline |
| --- | --- |
| Accounts/memberships | Six verified fictional accounts and six role memberships |
| Estates | Fictional Estate Alpha and Beta |
| Contractor | One pending/unverified fictional organisation |
| Warning settings | Development defaults: 20% revision, 30% selected gap, 20% growth, 3 quotes |
| Jobs, quotes, invoices, payments, reputation, images and saved drafts | None; create these through the app or isolated integration-test journeys |

Accounts: `admin@example.test`, `cm@example.test`, `cmtwo@example.test`, `mcst@example.test`, `mcsttwo@example.test`, `contractor@example.test`. All fresh fixture accounts use **`Fictional-dev-only-2026!`**, which is intentionally public demo data, not a production credential. The local account picker can fill these. Repeating the fixture command does not replace existing passwords or recreate changed records; it is not a reset command. The Contractor still needs ordinary trade configuration/verification before bidding. Tests use separate test-only warning settings and must not be imported as a business policy baseline.

`./tools/local-postgres.ps1 dev` is a **separate**, foreground preview at **http://localhost:3001**, using `quotefix_development` and local advice. It also does not seed automatically. Cookies are hostname-scoped, not port-scoped; keep that preview on `localhost` and the normal app on `127.0.0.1`. Don't run both servers on one database for ordinary development unless you intentionally want two workers.

## 3. Verify the clone

```powershell
pnpm typecheck
pnpm build
pnpm mobile:typecheck
pnpm --filter @quotefix/mobile exec expo install --check
pnpm mobile:export
./tools/local-postgres.ps1 test -TestConcurrency 1
./tools/test-local-postgres.ps1
```

The PostgreSQL suite uses disposable schemas in `quotefix_test`; it does not seed the normal app. It builds full fictional workflow journeys through the real API, including files and exports, then removes its schemas. `pnpm test` without `TEST_DATABASE_URL` selects PGlite instead. The [stability record](STABILITY_2026_10_27.md) records 267 PostgreSQL passes and the unresolved Windows embedded-test process exit; an isolated pass is not a complete-suite pass. Native exports validate JS bundles, not physical devices. For camera/SQLCipher/OS transfer testing and platform prerequisites, see the [native guide](../../apps/mobile/README.md).

The API's `/health/ready` must return HTTP 200. Sign in with the fictional Admin and inspect processing health. Missing scanner setup leaves files unready; it must not be bypassed. `ADVICE_PROVIDER=local` needs no paid provider key; Gemini setup is separately documented in [GEMINI_SETUP.md](GEMINI_SETUP.md).

For a full fictional financial/evidence restore exercise, run `./tools/local-postgres.ps1 drill`. It creates an isolated test journey, restores its dump into a new check database and verifies the saved Windows artifact. It does not populate the ordinary app's database. Do not use a test-schema dump as the normal public-schema application dataset.

## 4. Copy an existing PostgreSQL dataset privately

Use a database dump, not Git, to duplicate actual prototype records. At the source checkout:

```powershell
./tools/local-postgres.ps1 backup -Prototype
```

`-Prototype` selects the database from the current local `.env`. Without it, the command targets the separate fictional `quotefix_development` database. The backup captures one consistent snapshot, saves `database.dump` plus `manifest.json` under ignored `work/postgres-backups/<id>`, restores that actual saved artifact into a fresh database and verifies every public-table/evidence fingerprint. It does not overwrite the source. Transfer those two files using a protected private channel/storage, never a Git commit or issue attachment. The dump includes account hashes, sessions, workflow/audit records and sensitive evidence.

At the receiving clone, put the two transferred files in ignored `work/transfer/`. Install dependencies and start the local PostgreSQL service with `./tools/local-postgres.ps1 start`, but **do not run fixtures against the copied dataset**. Use the following in PowerShell, with Docker's CLI on PATH. Every restore target is newly named; nothing is dropped or restored over an existing database.

```powershell
$qfDump = (Resolve-Path -LiteralPath work/transfer/database.dump).Path
$qfManifest = Get-Content -LiteralPath work/transfer/manifest.json -Raw | ConvertFrom-Json
if (!$qfManifest.verified -or (Get-FileHash -LiteralPath $qfDump -Algorithm SHA256).Hash.ToLowerInvariant() -ne $qfManifest.dumpSha256) {
  throw 'Backup manifest/checksum verification failed.'
}
$qfCopyId = [guid]::NewGuid().ToString('N')
$qfCopyDatabase = 'quotefix_copy_' + $qfCopyId + '_development'
$qfContainerDump = '/tmp/quotefix-transfer-' + $qfCopyId + '.dump'
$qfCompose = @('--context','desktop-linux','compose','--file',(Join-Path $PWD 'compose.yaml'),
  '--project-name','qfwebapp','--project-directory',$PWD.Path,'--env-file',(Join-Path $PWD '.env.example'))
$qfEndpoint = & docker --context desktop-linux context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $qfEndpoint -ne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
  throw 'Refusing a Docker context outside the local Desktop Linux engine.'
}
function Invoke-QfTransferDocker {
  param([string[]]$Arguments)
  & docker @qfCompose @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Transfer failed; inspect the new target, keep the original backup.' }
}
Invoke-QfTransferDocker -Arguments @('exec','-T','postgres','createdb','-U','quotefix',$qfCopyDatabase)
Invoke-QfTransferDocker -Arguments @('cp',$qfDump,('postgres:' + $qfContainerDump))
Invoke-QfTransferDocker -Arguments @('exec','-T','postgres','pg_restore','-U','quotefix','--exit-on-error','-d',$qfCopyDatabase,$qfContainerDump)

# Invalidate copied browser/native sessions and one-time auth/invitation tokens,
# only in this new copy. Keep audit/history rows; require fresh sign-in.
Invoke-QfTransferDocker -Arguments @('exec','-T','postgres','psql','-U','quotefix','-d',$qfCopyDatabase,'-v','ON_ERROR_STOP=1','-c',
  'BEGIN; UPDATE sessions SET expires_at=now(); UPDATE native_authorization_codes SET expires_at=now(); UPDATE identity_tokens SET expires_at=now(); UPDATE invitations SET expires_at=now() WHERE accepted_at IS NULL; COMMIT;')
$qfCopyUrl = 'postgresql://quotefix:local-only@127.0.0.1:5432/' + $qfCopyDatabase
```

Verify `desktop-linux` points to the local Docker Desktop Linux engine before running these manual commands; the PowerShell helper performs that check for its own actions. The manifest detects accidental file changes; obtain it through the same trusted protected handoff, not from an untrusted public upload.

In the receiving checkout's **local `.env`**, keep `APP_ENV=development`, set `DATABASE_ADAPTER=postgres`, set `DATABASE_URL` to the `$qfCopyUrl` above, and set `LOCAL_ACCOUNT_HELPER=false`. Keep local advice until separately configured. Sign in with the existing account passwords: the database dump preserves their hashes; demo passwords only work if those accounts still have the demo password. Run `pnpm db:migrate` against this new target, then `node tools/prototype.mjs start`. A development dump must have `deployment_identity.environment=development`; a production/test marker is not changed to bypass that guard.

If another app is already on port 3000, give this checkout an unused `PORT` and matching `APP_ORIGIN`, such as `3003` / `http://localhost:3003`, keeping the original app on `127.0.0.1`. The supervisor's private runtime state is partitioned by checkout path. Database tools run directly through pnpm respect shell environment variables; use a fresh shell without an inherited `DATABASE_URL`/`APP_ENV` override. Supervisor children explicitly use the validated `.env` configuration.

Before normal use, inspect readiness, record counts, authorised images/drafts and Admin processing health; create another verified backup of the copy with `backup -Prototype`. That second backup verifies the restored copy's current table/evidence integrity. It will have different authentication expiry values from the source by design. The worker starts processing outstanding work as soon as the receiving API starts, so a running copy is no longer a frozen snapshot.

### What else transfers, and what does not

| Item | Treatment |
| --- | --- |
| Server images/PDFs, exports, upload chunks and server drafts | Included in the current PostgreSQL dump. Authoritative bytes are in the database; there is no separate server image folder to guess/copy |
| API/Gemini keys, `.env`, local helper encryption keys, security mailbox | Kept out of Git. Configure fresh provider secrets independently; don't blindly copy the owner's `.env` or security-token mailbox |
| Autofill credentials | Ordinary sign-in needs no helper key. Leave the helper disabled on a copied dataset. If autofill is explicitly needed, securely preserve and rebind the original 32-byte key to the receiving URL's SHA-256 filename; a changed URL changes that filename. Signing in normally with the helper enabled remembers that account under the new local key; no password reset is needed |
| Browser-only drafts/queued uploads | LocalStorage/IndexedDB belong to that browser/origin. They are not in Git or a server database backup. Save a draft to the server and finish uploads before a server-data handoff, or retain the original browser/device |
| Native unfinished drafts/files | App-private SQLCipher/SecureStore/device files; not in Git/server dumps. SecureStore keys are device-bound; copying the SQLite file alone does not reproduce a working native draft store |
| PGlite files | An optional embedded alternative, not a server PostgreSQL volume. Do not copy its files into Docker's PostgreSQL directory. The one-way Windows adoption tool preserves/checks a cold source and creates a new server database; it is not needed for an already-PostgreSQL source |

Never copy a live PostgreSQL data directory, run `docker compose down -v` as a setup step, reseed a copied business dataset, or commit `work/`, dumps, key files or `.env`. A code clone is not operational data recovery. These are local development instructions; hosted deployment and retention/deletion policies retain their existing release gates.
