# Chapter 20 — iOS and Android expansion on the same QuoteFix backend

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [19](19_RELEASE_AND_OPERATIONS.md)

**Dependencies:** proven web/backend contracts 01–19; mobile infrastructure decisions G13/G14. **Confirmed:** web first, eventual native mobile, shared system; O37-A offline drafts/uploads with online decisions. **Proposal:** React Native/Expo as first candidate, validated with real device transfer/authentication spikes.

## 1. What is reused and what is new

Reuse accounts/memberships, permissions, domain commands, API schemas/typed client, IDs, files, audit, tasks/timers and server business rules. No second mobile operational database/rule engine to reconcile with web. Device database is a cache/draft store, never authority for payment or approval.

New: native navigation/accessibility, camera/doc picker, safe local files/database, secure credentials, resumable background transfer adapter, deep links and store release lifecycle. Shared TypeScript contracts do not guarantee reusable UI or killed-app upload support.

CM/Contractor capture journeys first is a sequencing proposal; final MCST/Admin native coverage is G13. The plan does not silently exclude them from eventual mobile.

## 2. Native build order and compulsory state

1. Native auth via external browser authorization code/PKCE, system secure credential storage and revocable sessions; same QuoteFix context API.
2. Connected read/action shell consuming current versions and exact decision contexts.
3. Camera/document capture and local draft queue with account/parent/purpose/file state.
4. Native persistent cache and incremental synchronization, after permitted sensitive scope/retention is approved.
5. Background transfer/resume integration proven on iOS/Android; server scan/finalization/attachment remains unchanged.
6. Deep links and optional separately approved push; compatibility/update handling; physical-device/store readiness.

| Record/control | Required | Optional/gated |
| --- | --- | --- |
| Local draft/upload | Owner/context, parent/base version, stable ID, file reference and explicit not-submitted/upload state | Retention/sensitive cache scope G13/G14 |
| Native mutation | Current server review version, exact document IDs, stable command ID, explicit online submit | No offline approval/payment queue |
| Sync cursor | Server-issued opaque cursor bound to access/schema context | Initial connected app may use canonical refresh before full sync |
| Device registration | Authenticated owner, revocable channel/token if channel enabled | Native push not currently approved for launch |
| Deep link | Resource/action context only; fresh authentication/authorization | No private report/payment details embedded in public link |
| Supported-version check | Server capability/contract information and safe unsupported-action handling | Minimum-version block reserved for a justified incompatibility |

## 3. Sync and conflict contract

Server records win business authority, not whichever phone has the latest timestamp. Fetch a consistent authorized bootstrap with committed feed watermark, then apply incremental upserts/tombstones. Store records and next cursor atomically in local DB. Cursor invalidation/access-epoch change -> purge inaccessible scope and re-bootstrap.

Journal consumes all unprocessed committed outbox items and assigns cursor order safely; never skip a late-committing lower allocated ID or use device updated-at alone. Feed invalidations re-fetch current canonical records; out-of-order messages cannot resurrect deleted/restricted records or overwrite higher revisions.

Append new optional photos with stable IDs after current parent/access checks. Overlapping draft edits preserve both for review. Approval/price/scope/payment/inspection never auto-merge. Revoked access clears permitted caches on reconnect; do not promise erasure while permanently offline.

## 4. Required weak-network behavior

Offline camera/description -> **Saved on this device · not submitted**. Upload resumes when possible, but successful bytes are not RFQ publication/Work complete/Payment Sent. Before consequential submission, reconnect/refetch/review changes and explicitly submit.

Response lost after a command -> **Checking submission** and original operation lookup/same-key retry. Do not create another transfer because the spinner timed out. Invoice v4 viewed on phone then v5 corrected on web -> stale confirmation refused, note retained, review v5.

Native background work is OS-managed and may be delayed. Implement file-backed iOS transfers and appropriate Android persistent scheduling through a tested adapter; don't promise browser/PWA background behavior equals native. Storage pressure, app termination, authentication expiry and upload-grant renewal must be recoverable or honestly labelled device-only.

## 5. Notifications, clocks and current data

Existing in-app bell/task remains authoritative. Optional later push only prompts refresh; delivery/read/device-open times never start/reset receipt/claim/Feedback/fee clocks. Device countdown uses server due time; expiry on-screen cannot make server decisions.

No new mobile-specific business deadlines. All T01–T23 rules and role exclusions apply unchanged. Notification previews must not leak confidential report subjects, hidden identities, exact unrevealed estate location or Contractor fee data to the wrong user. Reused phone/account switching clears the previous context.

## 6. Store release and compatibility

Keep API changes additive for supported installed apps; a mobile user cannot be assumed to update instantly. Unknown action types show a safe update-required/read-only path, never map to an older permission/action. Database expand/migrate/contract strategy remains.

Before native release, check then-current Apple/Google rules for privacy, permissions, account deletion and the specific fee/commercial flow. Decide retention/attribution rather than deleting estate/financial history with an account. Test universal/app links, sign-in return, camera/document permission denial and accessibility on physical devices. No store submission or paid provisioning is authorised by this planning document.

## 7. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH20-T01 | Web/mobile same account/ticket | Same canonical facts, role visibility and exact commands |
| CH20-T02 | Offline capture then publish/approve/payment attempt | Draft/bytes preserved; consequential action requires online explicit submit |
| CH20-T03 | Browser changes invoice while phone reviews | Stale action blocked, note retained, no unseen approval/fee |
| CH20-T04 | Submission succeeds but response lost | One business effect and recoverable original result |
| CH20-T05 | App killed/background delayed/storage pressure during upload | Tested recoverability/accurate state; no silent completion |
| CH20-T06 | Grant/session expires or account changes | Reauthorize and partition data; no cross-account file/token leak |
| CH20-T07 | Bootstrap overlaps changes/deletions/out-of-order commits | No missed updates/resurrection; cursor/local transaction consistent |
| CH20-T08 | Subject exclusion/membership changes while device offline | No stale command allowed; purge on reconnect; no false remote-erasure guarantee |
| CH20-T09 | Old native build against new backend | Safe supported behavior; incompatible action asks update |
| CH20-T10 | Push delayed/disabled/duplicated | Bell/current task correct; business clocks unchanged |
| CH20-T11 | Different device timezone/clock | Singapore rules/server countdown preserved |
| CH20-T12 | Camera permission denied, HEIC/PDF, interrupted login/deep link | Accessible recovery and accurate media/auth states |
| CH20-T13 | Account deletion/retention/store review | Approved policy implemented and verified; no accidental loss of estate records |

## 8. Completion gate

**Owner-requested follow-up, 18 October 2026:** when Chapter 20 is actually finished, remind the owner to resolve the deferred within-30-day contractor fault/callback percentages. Decide verified occurrence timing, causal attribution, the job denominator, and missing/late/unassessable treatment before implementation. Late assessable observations already count toward general durability with their actual observation dates; they do not prove what occurred during the first month. Do not mark this reminder handled merely because this planning file exists.

Resolve G13/G14 and prove real-device auth/upload/sync/compatibility/privacy and role journeys. Release native clients on the existing backend only after authorised store rollout; web data/history remains the same system. Future push/extra offline capabilities require explicit product decisions, not an automatic feature expansion.
