# Chapter 03 — Shared workspace, records, audit and uploads

**Local construction, 13 October 2026:** shared primitives are implemented; [build evidence](../CHAPTERS_03_04_BUILD.md) records tests and remaining feature/production integrations.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [02](02_LOGIN_AND_ACCESS.md) · Next: [04](04_TASKS_NOTIFICATIONS_AND_CLOCKS.md)

**Dependencies:** 01–02. **Sources:** C28/C34/C52/C54/C76, O37-A; [API/data/sync](../../architecture/API_DATA_SYNC_CONTRACT.md). **Purpose:** give every later feature the same reliable record/action/file controls.

## 1. Build order and user interface

1. Job workspace shell with current stage, key facts, concrete Pending actor/action, secondary history and contextual support entry point.
2. Versioned command/response primitives, idempotency and audit transactions.
3. Safe draft persistence with separate local/server status.
4. Upload intents, private storage, resumability, validation, immutable final files and permitted derivatives.
5. Role-filtered history/evidence viewer and support request record primitive. Chapter 14 supplies complete case execution; no public feature launches with a dead-end support button.

Do not show internal routing nodes, Finishing up steps or mandatory Next buttons merely to advance a derived stage. Several real obligations can coexist; show the main current action with a short secondary list naming each actor.

## 2. Required data and audience

| Record/action | Required | Optional / condition |
| --- | --- | --- |
| Consequential command | Actor from session, permitted context, exact document IDs, expected version, stable operation ID | Client capture metadata is untrusted context |
| Audit event | Action, actor/role, recorded time, affected versions and before/after; reason where command requires it | Separate actual/claimed occurrence date where relevant |
| Upload intent | Parent/draft ID, media purpose, type/size, private staging destination; checksum protocol | Camera capture or file picker; limits chosen in technical spike |
| Final attachment | Verified ready immutable object/version; parent/audience/role check | Caption optional unless evidence request specifically needs explanation |
| Draft | Owner/context, base version, edited fields; save status | Offline media may remain device-only; clearly labelled |
| Support primitive | Context/category, description and privacy classification (E field design) | Optional attachments; sensitive cases exclude subject; full categories in 14 |

Users see only parent-authorised evidence. Contractor receives reviewed derivatives until an approved reveal; no restricted original via thumbnails, file names, metadata or download URLs. Admin audit visibility does not make private notes public to every estate member.

## 3. File pipeline and next actions

`Draft -> upload granted -> bytes transferring -> verifying/scanning -> ready -> attached -> separate business submission.` Failed upload waits on the uploader to retry/replace; rejected file cannot satisfy compulsory invoice/proof. A scan outage shows pending processing, not ready. Do not expose suspicious/unverified bytes as final evidence.

Grant renewal rechecks identity/context. Finalization pins an object version or promotes to a server-only key so reusing an upload grant cannot overwrite evidence already reviewed. Preserve restricted original and separately sanitized preview. Visible identifiers still need human preview; metadata stripping is insufficient.

Publication/completion/payment commands consume ready attachments atomically with their business outcome. Uploading the invoice alone never declares work complete. Cancellation while uploading may retain private evidence but must not publish it as a new ordinary work update without permitted context.

## 4. Version, retry and mobile contract

Use conditional version checks and exact referenced records; expired quote/changed scope/changed authority is checked on the server. On conflict, retain typed notes and request review of permitted differences. Never last-write-wins an approval or payment based on device timestamp.

Timeout after submit -> **Checking submission** -> operation lookup/same-key retry. Same key with different payload is an error. Permanent business uniqueness prevents replay after response-cache expiry. A cached result is returned only if the requester still has access.

Offline drafts/uploads are approved; final decisions require connectivity. Preserve separate drafts when two devices edited the same field. Native incremental sync later uses current resource versions, authorized cursors/tombstones and account partitioning; the initial web client can use conditional reads/refocus refresh.

## 5. Timers and logging

No new customer T+N clock merely for a draft/photo/upload. Technical retry/scan/abandoned-staging cleanup are operational settings, documented separately from product reminders and retention G14. Actual support submission enters the Admin queue, never on opening its form. Log command outcome and file access without logging private file grants/content into generic analytics.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH03-T01 | Mutation crashes between business/audit/outbox writes | All roll back or all commit; no orphan approval/history gap |
| CH03-T02 | Response lost then same operation retried | One effect; original outcome recoverable; changed payload rejected |
| CH03-T03 | Stale approval versus unrelated new photo | Changed decision facts block; unrelated optional attachment does not cause needless rejection |
| CH03-T04 | Upload interrupted, app restarted, grant expires | Resume eligible bytes after reauthorization; no duplicate attachment or silent form submission |
| CH03-T05 | Reuse upload URL after finalization | Reviewed bytes/checksum remain immutable |
| CH03-T06 | Corrupt type, oversize file, malware/scan failure | File not ready; required submission blocked with useful recovery |
| CH03-T07 | Contractor downloads original/identifying derivative before reveal | Denied or sanitized; name/metadata/thumbnail/export routes tested |
| CH03-T08 | Offline two-device draft overlap and account switch | Both drafts preserved for authorised owner; no overwrite or cross-account leak |
| CH03-T09 | Admin backtrack attempt through generic status PATCH | Denied; explicit attributed command and dependency handling required |

## 7. Completion gate

Deliver the shared action/file/history components, transaction/idempotency contract, upload state definitions and relevant API/database/browser test evidence. File limits and retention configuration must be explicit. No complete business workflow is claimed yet; these controls become mandatory dependencies for all later chapters.
