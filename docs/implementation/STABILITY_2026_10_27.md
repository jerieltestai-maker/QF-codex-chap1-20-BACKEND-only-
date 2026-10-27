# P1/P2 stability repairs — 27 October 2026

The owner confirms QuoteFix is a **desktop prototype**, with no physical Android or Mac/iPhone testing setup. This work fixes the functional findings in the [full Chapters 01–20 audit](FULL_AUDIT_2026_10_27.md), preserves existing data and introduces repeatable local operation. It does not certify a hosted production release or silently settle open product policies.

Implementation checkpoint: **`1c54da9`**, branch `codex/stability-p1-p2`; subsequent report/memory changes are documentation only. No remote CI result is implied by this local commit.

## Findings and resulting behaviour

| Finding | Repair / practical boundary |
| --- | --- |
| F01 — ready native captures had no attachment handoff | Ready repair evidence has a separate explicit review/attach action. CM/MCST evidence attaches to the private workspace; assigned Contractor evidence attaches to authorised work, including before Start. Optional Contractor notes are audited. Frozen per-file operation IDs survive partial success/lost responses. Neither upload nor attachment starts work, publishes an RFQ, records completion or records payment. |
| F02 — cold offline native launch hid saved drafts | Minimal account/context identity is bound to the existing secure session. Its own draft editor opens before network refresh; server records remain memory-only. A different session cannot reveal the prior owner's drafts. A live access refresh still precedes each server command. |
| F03 — consumed native captures accumulated locally | Only confirmed attachment consumption permits removal of the copied local file and queue row. Failed cleanup retains a consumed entry for retry. Local writes are serialised; ownership is rechecked before persistence/copying. SQLCipher remains required. Actual platform filesystem/SQLite behaviour still needs devices. |
| F04 — fixed list caps hid eligible opportunities and moderation | Removed pre-eligibility truncation. Validated optional limit/offset pagination is applied after authorised projection. Web/native consumers fetch all pages, with account-generation guards. Legacy callers retain their array response. This repairs correctness, not a claim of large-scale SQL cursor/load certification. |
| F05 — exports omitted cancellation consent and support conclusions | Decision packs include organisation-scoped cancellation/events, payment receipt/issue metadata and authorised ordinary support resolutions/acknowledgments. Confidential cases and execution evidence remain excluded. Existing concealment/export privacy regressions continue to apply. |
| F06 — Contractor chronology contained only quotes/undefined actions | Shared explicit chronology includes own quotes and authorised work, variation, completion, payment and own cancellation metadata, with named actors/actions/times. Estate selection rationale and generic private audit payloads remain excluded. Web/native and Contractor exports use the same projection. |
| F07 — dependency advisories | Updated Fastify/transitives and Expo patches. Scoped Expo CLI Zod/forge overrides are covered by real CLI schema/MCP parsing and RSA signing tests. Fresh audit has zero reported vulnerabilities. This is a point-in-time dependency result. |
| F08 — Expo version incompatibility | SDK-compatible modules installed; Expo check, native TypeScript and actual Android/iOS JS bundle exports pass. Bundling does not prove installed-device behaviour. |
| F09 — unexplained embedded test-process exits | Actual prototype now uses local PostgreSQL. Test files run with bounded adapter-specific concurrency, fatal-report flags, exit/memory/stderr diagnostics and no automatic retry. The complete embedded run still lost one file process without assertion output; its cause remains unresolved. See exact verification below. |
| F10 — stale active plans | Master status, verification index/generator and Chapter 08 warning wording now point to current evidence and the later owner-approved G12 review/clearance policy. |
| Additional — unfinished server drafts rejected | Draft title/location can be empty; final workspace validation remains required. Saving a draft does not create a job. Admin can retrieve their own drafts across their authorised estate selector. Divergent local/server copies remain individually selectable. |
| Additional — database interruption killed the API | Idle and checked-out PostgreSQL connection errors are handled without dumping raw client objects. Acquisition times out; failed rollback does not replace the original failure. Subsequent queries can reconnect. A local supervisor restarts an exited API/worker with backoff. No failed mutation is treated as successful. |

## Local data and operation

The existing embedded database was not reset or reseeded. A cold copy verified all **1,487 files**, with the original checked again before activation. The recovered data was restored into a new independently named local PostgreSQL database; **117 tables / 42 original rows** matched complete row fingerprints. Evidence verification found **0 stored file objects / 0 exports** in the source. Later ordinary login/worker-health records naturally change counts; the migration comparison is against its exact source checkpoint.

Original files and original runtime markers remain untouched. The recovery source, private row snapshots, previous `.env` bytes and manifest are under `%LOCALAPPDATA%\QuoteFix\recovery\9aca0970-5ab8-4551-9276-2decfd2a1d0a`. The new database is `quotefix_prototype_9aca09705ab8455192762decfd2a1d0a_development`. Existing helper encryption keys were copied to the new database binding; no password reset occurred. `.env` is ignored, retains provider settings and now selects this database. Other PostgreSQL development/test databases were not adopted or overwritten.

The API/worker is available at **http://127.0.0.1:3000**. Docker Desktop must be running with its Linux engine. From the repository root:

```powershell
./tools/local-postgres.ps1 start
node tools/prototype.mjs start
node tools/prototype.mjs status
```

`start` only starts the existing local PostgreSQL service; it installs no fixtures and changes no database selection. Compose uses an explicit local Docker context/project/file and the existing volume, with `restart: unless-stopped`. Docker Desktop itself must be started after a desktop reboot. The API supervisor survives this terminal closing, but is not an installed Windows startup service.

```powershell
node tools/prototype.mjs stop
# after a source change, start again to load current code
node tools/prototype.mjs start
./tools/local-postgres.ps1 backup -Prototype
```

The **`-Prototype` flag matters**: without it, the older backup command targets the separate fictional `quotefix_development` database. Prototype backup validates the current `.env` as this owned localhost development setup, exports one repeatable-read snapshot, saves the dump to ignored `work/postgres-backups/<id>`, restores that actual Windows artifact into a fresh database and compares every table/evidence fingerprint. It never restores over the running database. The successful checkpoint manifest is `work/postgres-backups/c9aba5dae01a497b83b4cc9ef3e665e0/manifest.json`. Database-only scope does not include helper keys, mailbox or future external evidence; preserve ignored `work/local-account-keys`, configuration/provider files and local mailbox separately in protected storage. Same-desktop backups are useful for prototyping, not off-device disaster recovery. No retention schedule or destructive pruning policy was invented.

Runtime state/logs are private local files under `%LOCALAPPDATA%\QuoteFix\runtime\de3ad1e8d75bb28a`. Inspect `status` and these logs if readiness fails. Do not run the fixture/setup command against the adopted database. The separate PostgreSQL preview/test helper still uses fictional data and distinct test schemas.

## Verification and observed failures

The added regressions exercise unfinished/private drafts, Admin ownership, real API/native upload consumption after a lost committed response, pre-Start Contractor attachment, rival denial, full financial chronology, cancellation consent, support resolution/acknowledgments and lists beyond 200 rows. Native component tests execute the actual App component with mocked device boundaries to prove cold-offline edit/save/reopen and secure-session isolation. They do not emulate physical SQLCipher/camera APIs.

Final verification:

- **PostgreSQL: 267/267 records, all 32 files, zero failures/skips/cancellations.** This includes actual termination of the isolated test adapter's idle and transaction connections, rejection without process crash, then successful reconnection. Two file workers; no automatic retries. Diagnostics: `work/test-runs/2026-10-27T05-34-29-144Z-b72b3d8b-4577-48bc-8203-2fddf2647900/results.json`.
- **PGlite: 31/32 files completed successfully, 254 reported passing records; one unexplained process exit.** The affected Feedback file passed all **12/12** records in a separate isolated run. Together these cover the 266 embedded-adapter records, but they are not a single green complete run.
- Final native component/client/actual CLI-toolchain checks: **10/10**, overlapping the full suite. The security-override test uses actual Expo CLI plugin/MCP schemas and actual forge RSA sign/verify, including invalid input/signature rejection.
- Strict backend TypeScript/browser script validation, native TypeScript, compilation, Expo SDK compatibility and actual Android/iOS JS exports passed. Fresh dependency audit: **zero reported vulnerabilities**. Scoped toolchain overrides remain explicit in the lock/workspace files, including a patch-specific release-age exception for the forge security patch.
- **Nine helper checks passed in both PowerShell 7 and Windows PowerShell 5.1**; the added no-seed `start` action was also exercised against the actual existing container. Documentation validation passed: 20 chapters / 206 scenario specifications / 23 timer rules, no errors. SQL migration bytes remain unchanged.
- All **6/6** existing live helper credentials passed ordinary login/context/logout; Admin processing health returned healthy. An intentionally stopped, verified supervisor-owned API child restarted automatically and returned readiness 200; no new fixtures or password resets. Normal API was restarted on the final database-guard source.
- Supervisor startup was also checked with an unrelated inherited `DATABASE_URL`; the validated local `.env` values take precedence for daemon/API children. The isolated previews were stopped and their two disposable schemas removed after testing; zero test schemas remain. Normal prototype business data was not reset.
- Full-row restore verification passed against the actual adopted prototype database. Real Defender image/attachment and browser unfinished-draft recovery checks passed as described below.

Operational logs and test-run JSON remain under ignored `work/stability-2026-10-27` and `work/test-runs`. These are local results; no new remote CI result or physical-device result is claimed.

Observed failures are retained rather than relabelled:

- The full embedded run completed **31/32 files**, with **254 passing records** reported by completed files. `feedback.test.ts` exited `4294967295`, without stderr/final counts, after displaying successful assertions. Free memory before/after that file was approximately 1.38/1.13 GB; this does not establish a root cause. Diagnostics: `work/test-runs/2026-10-27T05-25-11-259Z-5d4b8f64-d3d9-46be-b6a5-fe1829ea0ec9/results.json`. An isolated rerun is separate evidence, not a complete-suite pass.
- Docker's engine became unavailable during the first prototype backup. The API and isolated preview lost their database connections; the preview exposed the unhandled pool error. Docker Desktop was restarted, the existing volume retained, PostgreSQL returned healthy, and a new complete backup/restore verification passed. The pool guards and fault regression address the API crash; the Docker engine outage's root cause is not established.
- An initial export expectation still assumed Contractor history was empty; it was updated to require actual work history while retaining privacy assertions. An initial toolchain-test fixture omitted the required MCP log level; the fixture was corrected. A one-off real-scanner verification used `detail.work` instead of the API's `detail.state`; that assertion was corrected and the complete scanner check rerun.

Windows Defender is enabled on this desktop. A real generated PNG travelled through upload, checksum verification, actual Defender scanning, ready original/sanitised file objects and explicit pre-Start Contractor attachment; no Start was recorded. Scanner errors remain blocked/unavailable. The Windows scanner uses custom scan with remediation disabled, protecting evidence. See [Microsoft's command reference](https://learn.microsoft.com/en-us/microsoft-365/security/defender-endpoint/command-line-arguments-microsoft-defender-antivirus?view=o365-worldwide). PostgreSQL pool handling follows the [node-postgres error-event contract](https://node-postgres.com/apis/pool).

An isolated real-browser CM check saved an observation with empty title/location to device and server, reloaded, selected the saved draft and recovered the exact text; the queue still had zero jobs. Screenshot: `work/stability-2026-10-27/draft-recovered.png`. Normal prototype business data was not used for this fictional journey.

## Remaining work and owner dependencies

No cloud account, paid server or extra desktop database setup is needed to continue prototype testing. Physical Android and Mac/iPhone setup is still required before claiming Chapter 20 device/background-transfer completion. Durable foreground resume is implemented; OS background/killed-app transfer is not.

G02 extra ordinary repeats, G04 warranty automation, G14 deletion/retention, G15 unresolved-case archival and specialist scoring thresholds remain open. The fault/callback-percentage reminder remains due at actual Chapter 20 completion. Broader approved feature gaps from the full audit—including richer RFQ AI drafting, broader experience/disruption comparison, optional video and full native workflow parity—are not closed by these stability repairs. Hosted identity/storage, off-device recovery and release/accessibility/security gates still need their own evidence. This checkpoint must not be represented as a production release.
