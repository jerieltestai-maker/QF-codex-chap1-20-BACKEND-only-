# QuoteFix native development client

Initial connected Expo/React Native application on the existing Fastify/PostgreSQL API. All four roles have authorised queues, tickets and named history. CM/MCST can save unfinished issue drafts and explicitly create a private server draft; Contractor can save quote notes and record reviewed Start with a completion estimate. Other workflow forms continue in the external browser. This is initial native coverage, not complete native parity with every web action.

Photos/documents and unfinished drafts use account/context-partitioned storage. Draft JSON is in SQLCipher SQLite, whose generated key and native session are kept in device SecureStore. Captured files remain in the app's private pending-file directory; this code does not claim application-level encryption of those file bytes. Android backup is disabled. iOS backup/file-protection/restore behaviour needs physical-device verification before release. Signing out or switching account/context clears local records/files; interrupted same-account reauthentication retains drafts. Native files, browser sessions, SQLCipher and platform credentials require real native builds; **Expo Go is unsupported**. Storage opening fails closed if SQLCipher is absent.

## Build and verify

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @quotefix/mobile typecheck
pnpm --filter @quotefix/mobile exec expo install --check
pnpm --filter @quotefix/mobile export
```

The lockfile pins Expo 58 / React Native 0.88 / React 19.3 and SDK-compatible native modules. Mobile uses its own SDK-compatible TypeScript version. Backend TypeScript is unchanged. Bundle export validates JS/native-module linkage, not native compilation or runtime device behaviour.

With an Android SDK/JDK and USB-debugging device available, build locally with `pnpm --filter @quotefix/mobile exec expo run:android`, and forward the configured API port with `adb reverse tcp:3000 tcp:3000`. `app.json` uses loopback `http://127.0.0.1:3000` exclusively for local development. The matching API process must run current migrations 019/020. For a separate PostgreSQL preview at port 3001, set the development app's `extra.apiUrl` to `http://127.0.0.1:3001` and forward that port. Do not expose the local identity adapter to the LAN or weaken its loopback guard.

iOS needs an appropriate Mac/Xcode build host and real iPhone testing. A Windows loopback server is not reachable from an iPhone without a separately approved secure development/staging arrangement. Production requires managed identity, HTTPS, verified universal/app links and approved hosting; do not tunnel local helper credentials onto a public service. No cloud builds, store accounts, signing identities or store submissions have been provisioned.

## Authentication, access and weak networks

External system browser → normal local sign-in → explicit device consent → one-minute authorization code bound to SHA-256 PKCE and exact `quotefix://auth` redirect → separately revocable native bearer session. Credentials remain in the browser. Exchange codes are hashed, single-use and checked against current active account/access/membership. Native API bearer sessions are distinguished from browser sessions; mutations still require CSRF/current versions/idempotency. This local-development bridge is not a selected production OAuth/OIDC provider.

Initial synchronization is **canonical refresh**, explicitly advertised by `/api/v1/capabilities`. Server records remain memory-only and are cleared when backgrounded or a refresh fails. Every consequential submission first refreshes access and still targets the exact reviewed server version. There is no persistent server cache or incremental journal to get out of order in this scope. No push registration or offline decision queue exists.

An existing secure session can reopen its own saved drafts while offline, including after a cold launch. Only minimal account/context identity is persisted to identify those drafts; it grants no server authority. Incomplete drafts save locally without final-publication fields. A changed secure-session binding hides the previous owner's drafts until online identification succeeds.

Capture says **Saved on this device · not submitted**. Resuming an upload checks account/context, local bytes/size/checksum and current server status, renews permission, skips acknowledged chunks, and finalizes with stable operation IDs. Ready evidence has an explicit review/attach step: CM/MCST attach to their private workspace; the assigned Contractor attaches work evidence, including before Start. The optional Contractor note is retained. Lost responses reuse frozen attachment IDs; copied files/queue rows are removed only after confirmed consumption. Cleanup failure leaves a retryable consumed entry. Ready bytes never publish a request, declare work complete or record payment. HEIC is honestly refused with JPEG conversion guidance; automatic HEIC conversion is not claimed. Camera denial offers the picker/manual route. An expired session requires sign-in, and storage pressure/missing files produces an actionable error.

Unknown submissions retain their operation identity for lookup; issue/Start review notes preserve it across restart. Do not edit/recreate an ambiguous command. Browser workflow continuation requires browser authentication; no token is placed in a deep link. Development `quotefix://ticket/<uuid>` links contain only a resource ID and cause a fresh authorised canonical lookup, never a command. Verified HTTPS universal/app links remain release work.

## Explicit remaining work

The owner confirmed that neither physical-device setup is available on 19 October 2026. Camera/picker/permission denial, SQLCipher/file cleanup, secure credentials, interrupted sign-in, OS backup, process death, storage pressure, device timezone and accessibility need actual Android/iOS evidence. Background scheduling/file-backed OS transfer adapters and killed-app continuation are **not implemented/certified**; the durable foreground queue supports explicit resume after reopening. Do not promise unattended uploads.

G14 account deletion/retention, production identity/storage/scanning, installed-version compatibility on actual devices, full native web-workflow parity, signed builds and store privacy/commercial review remain gated. The Chapter 20 fault/callback-percentage reminder is still due when Chapter 20 is actually finished; this initial app does not mark it handled. The 27 October stability follow-up records the patched toolchain and zero-vulnerability audit; security must be checked again for a release. No automatic destructive cleanup or push channel is introduced.
