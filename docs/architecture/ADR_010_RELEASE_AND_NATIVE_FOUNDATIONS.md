# ADR 010 — Operations evidence and connected native foundations

19 October 2026. Accepted for local implementation; release/device certification remains open.

The owner authorizes Chapters 19–20, backend correctness first, and resolves G13 initial scope: connected screens for all four roles, CM/Contractor capture first, account-partitioned unfinished drafts/pending uploads only, sensitive/server records online-only, no push, clearing on account switch/sign-out. G14 remains open. The owner confirms no Android/iOS device setups are available.

Extend the existing monolith. A worker heartbeat plus aggregate Admin diagnostics detects failure independently of customer notices. Preserve durable outbox leases/retries and exact business clocks. Add evidence-byte verification to snapshot-bound dump/restore; a fictional full financial journey can be independently restored using the local PostgreSQL helper. A source-bound release manifest checks completeness but deliberately fails until real evidence/authorisation exists. No automatic deployment or destructive rollback is added.

Use a separate Expo 58 client with SDK-pinned dependencies and its own TypeScript configuration. Reuse the existing HTTP domain routes, server access checks and command receipts. The small typed native transport preserves unknown outcomes and refuses offline commands. Native credentials use SecureStore, draft JSON SQLCipher and media app-private files. The initial delivery uses canonical refresh and memory-only server records; defer incremental sync rather than build an unnecessary durable sensitive cache. This is expressly allowed by Chapter 20's initial connected option. No late-commit cursor/journal claim is made.

A local-only external-browser authorization-code/PKCE bridge creates marked native sessions. Existing local identity stays loopback-only and still refuses staging/production. Production OAuth/OIDC provider integration remains mandatory. Exact redirect, short expiry, one-use hashed code, verified active account/access, account partition and normal CSRF/version/idempotency guards remain compulsory. Session bearer headers never become query parameters or stored browser credentials.

Background upload adapters, native compilation/device execution, universal links, deletion/retention, production vendors/monitoring and store review remain explicit gates. Generated platform bundles do not certify any of them. All sensitive files continue through existing scan/finalization/attachment checks; no app-side financial/work authority exists.
