# Chapters 1 and 2 — verification record

13 October 2026. Local construction authorised by the owner. G01 and local TypeScript/Fastify/PostgreSQL choices are recorded in both memory files.

## Implemented scope

- Explicit isolated environments; Node/TypeScript/Fastify API; persistent local PostgreSQL via PGlite and a server PostgreSQL adapter.
- Two checksummed transactional SQL migrations, UUID/foreign-key/role-scope constraints, command receipts, immutable audit trigger and outbox/task/file foundations.
- Deterministic fictional estate, company and named-role accounts with a fixture manifest.
- Email/password sign-in/out, email verification/recovery, hashed one-use expiring tokens, hashed opaque sessions, origin/CSRF protection, rate limiting and generic credential errors.
- Admin estate invitations; a matching signed-in recipient reviews the estate/role before accepting. Contractor applications remain pending and cannot self-verify.
- Current server memberships/context/capabilities, equal-role title/block handling, estate isolation, confidential-subject policy and audited access revocation.
- Plain local account shell, startup/test commands and CI configuration. No ticket, quote, payment, customer notification, storage upload or reputation workflow is claimed.

## Executed evidence

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript strict typecheck/build | Passed | Server, domain, contracts, tools and tests |
| Browser JavaScript syntax check | Passed | Actual served app.js |
| Foundation suite | 4/4 passed | Fresh schema; upgrade 001 to 002 with seeded records preserved; repeated fixtures; environment refusal; SQL rollback; audit immutability; amount/date precision |
| Access/API suite | 11/11 passed, including suite container | Login and verification; invitation matching/preview/expiry/replay; concurrent duplicate request and changed-body refusal; equal roles; CSRF/origin checks; estate isolation; subject exclusion; pending contractor; revocation; reset/session expiry; throttling; private error/assets |
| Live HTTP smoke on 127.0.0.1:3001 | Passed | Readiness, served page, two separate CM/MCST cookie sessions, capabilities, rival-estate denial and logout |
| Planning documentation validator | Passed after chapter/status/documentation updates | 20 chapters; 206 planned scenarios; 83 nodes; 23 timers. These counts are documentation coverage, not application tests |

The total executed Node test count is 15. The final foundation and access runs were separate so only the affected suite was repeated. All used actual embedded PostgreSQL transactions/constraints and the real Fastify routes, not a mocked database. The live smoke exercised the running socket server with independent client sessions. Failed test setup/adapter issues were corrected; no failing assertions were waived.

## Coverage limits and release gates

Server PostgreSQL CI is configured with separate random test schemas, but has not been executed here: Docker/server PostgreSQL is unavailable locally. PGlite serializes its embedded connection, so the concurrent duplicate test does not prove multi-process PostgreSQL locking or pool behavior. Run the supplied TEST_DATABASE_URL path before approving a server deployment.

The browser security review denied opening the local preview because browser permission was declined. Visual rendering and interactive browser journeys remain unverified. Static assets are served and syntax-checked; this is not evidence of visual usability or mobile cache behavior.

Confidential exclusion is tested in the shared access policy. There are no report/file/bell/search/export/sync APIs yet; later chapters must wire and test that policy through each real surface. No claims of remote erasure or persistent browser/native cache clearing are made. The shell uses no persistent account cache.

The local identity adapter is deliberately refused in staging/production and on public bind addresses. Its security mailbox is an ignored local test artifact, not delivery email. Managed identity, production security delivery/bootstrap, deployment region/cost/ownership, least-privilege database roles, backups/recovery, private storage and a durable Chapter 4 worker remain release work. Outbox rows are committed intents, not delivered customer notices.

G14/O37-D retention and deletion remain open. There is no destructive account cleanup, financial rounding policy, scoring placeholder or paid provisioning.

## Reproduce

See [local development](LOCAL_DEVELOPMENT.md) and [ADR 001](../architecture/ADR_001_LOCAL_FOUNDATIONS.md). Run tools/dev.ps1 -Action typecheck, -Action test and -Action build. Local smoke: pnpm exec tsx tools/http-smoke.ts. CI adds the dedicated server PostgreSQL run.

The development Admin is fictional. These chapter results support continuing local construction; they do not authorize a real-user pilot or production release.
