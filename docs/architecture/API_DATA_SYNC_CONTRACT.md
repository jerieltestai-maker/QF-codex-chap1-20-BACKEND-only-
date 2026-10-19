# QuoteFix data, API and synchronization contract

Draft 0.2 — 12 October 2026. **Proposed engineering specification. No endpoints, tables or migrations described here exist yet.** Product authority: [memory](../PRODUCT_MEMORY.md), [decisions](../OPEN_DECISIONS.md), lifecycle v14 and specialist plans. Companion: [architecture](WEB_MOBILE_ARCHITECTURE.md).

## 1. Shared conventions

| Concern | Contract proposal |
| --- | --- |
| Identifiers | Opaque server IDs; client-generated operation/upload/draft IDs for safe retries. Never use a display ticket number as access authority |
| Money | Integer SGD cents, currency explicitly `SGD`; decimal/rational arithmetic for percentages, never binary floating-point money |
| Time | Server instants in UTC ISO 8601; Singapore display/calendar rules. Store date-only values as dates with explicit precision, not fabricated midnight timestamps |
| Versions | Immutable business document IDs plus monotonic resource revision for concurrency; these serve different purposes |
| Actors | Authenticated user, effective estate/organisation, role at action time, request/operation ID. Server derives authority; payload cannot nominate an arbitrary actor |
| Event dates | Keep observed/actual date, client capture metadata, server record time and notice issue time separately. Device time is untrusted metadata |
| Deletion | Financial/approval history uses corrections and supersession, not destructive edits. Draft/file retention is a separate policy |
| List pagination | Opaque cursor and stable ordering; explicit page limit; no unbounded estate history in a mobile response |
| Error envelope | Stable machine code, plain-language message, request ID, permitted next actions and field errors; no private conflicting record leaked |
| Network failures | Timeout means unknown outcome, not failed mutation. Resolve by operation ID before a new submission |

**Fee precision proposal requiring confirmation before billing code:** calculate each 4% component independently on the confirmed total and round each to the nearest cent, half-up. Store basis, rate, rounding rule and rounded result. The rates, invoice trigger and three-business-day deadline are already confirmed; treatment of fractional cents is not yet specified by the owner (O37-C).

## 2. Relational model and invariants

The following are logical records, not a requirement for one table per row. Separate immutable decisions from mutable operational pointers. Use foreign keys, unique constraints and guarded transactions as well as application validation.

| Record group | Key relationships and stored facts | Invariant / purpose |
| --- | --- | --- |
| `user`, `organisation`, `estate`, `membership` | Identity-provider subject; named account; active CM/MCST estate or contractor organisation membership; capability/access revision | Role titles do not create extra authority tiers. No query trusts estate ID without membership/resource access |
| `credential_type`, `credential`, `verification`, `restriction` | Company/person holder; category/scope; expiry precision; Admin decision/evidence; reason and effective interval | Optional expiry greys badge; required expiry affects configured eligibility. Fee restriction is separately reversible |
| `ticket` | Estate, display number, lifecycle phase, active authorisation pointer, cancellation context, current revision | One user workspace. Phase alone is never proof of payment, acceptance or authority |
| `rfq_draft`, `rfq_revision`, `quotation_round` | Original observations, AI suggestion/provenance, approved publication, scope revision, opening event and current round | RFQ has no expiry. Reopening creates an explicit round; historical rounds remain |
| `question`, `answer_publication`, `visit_request` | Private question; sanitised shared fact; author decision; scope effect; reveal permission | Contractors do not learn another contractor's identity, price or proprietary question content |
| `quote`, `quote_version` | Contractor organisation, RFQ revision/round, final amount and required terms, expiry precision, reconfirmation and commitment | Latest version per contractor; revisions do not increase distinct count. Materially outdated/unreconfirmed quote is unselectable |
| `selection`, `comparison_snapshot`, `authorisation` | Exact quote ID, included comparison versions, rationale, threshold/settings snapshot, actor, approval/rejection, accepted total | At most one active selection per ticket; one current contractor authorisation. No post-authorisation replacement through ordinary reselection |
| `work_start`, `schedule_version`, `variation` | Recorded Start; estimate or reason; agreed target; proposed/accepted schedule and scope/price changes | Start prerequisite enforced; new proposal does not overwrite approved target; all acceptance targets exact versions |
| `completion_submission`, `inspection_round`, `inspection_result` | Required invoice version, optional photos, irreversible declaration, round index, originating failed findings, result | A fresh physical remedy creates another inspection round. A prior failed or different-round acceptance cannot satisfy it |
| `invoice`, `invoice_version`, `invoice_confirmation` | Original total, approved variation basis, reconciliation, exact MCST-confirmed version | Mismatch blocks ordinary confirmation. Revision cannot mutate a prior confirmed invoice |
| `transfer`, `receipt_event`, `payment_allocation` | Amount, completed-transfer proof ID, actual transfer date, report time, first issued notice, actual/assumed receipt, issue and linked allocations | Proof is not receipt. Per-transfer assumption cannot duplicate an actual receipt or exceed that transfer. Confirmed debts survive cancellation |
| `fee_assessment`, `fee_adjustment`, `fee_payment`, `fee_allocation`, `fee_refund` | Two components on confirmed basis; original/new due dates; verified collections; offsets/refunds | Unique assessment per confirmation/component; never charge the whole total again on adjustment; Contractor/Admin-only exposure |
| `cancellation`, `cancellation_claim` | Reason, notification anchor, cutoff, explicit no-claims acceptance or timely claim, support link | No inferred waiver; timely claims remain open after deadline; existing liabilities remain |
| `support_case`, `evidence_request`, `resolution_version`, `resolution_obligation` | Restricted audience/subjects, requested evidence, Admin review, external-ledger reference, verdict and execution facts | Only Admin decides evidence sufficiency/issues resolution; acknowledgment is independent of completed obligations |
| `feedback_task`, `feedback_submission`, `moderation` | Receipt anchor, due and first notice dates, 1–5 rating/observation or Unable to assess, moderation/reply | Feedback never blocks closure. No response is not positive. Specialist score model owns calculation/versioning |
| `file_asset`, `file_derivative`, `upload_intent` | Purpose, owner/parent, storage version/checksum, verification, sanitised variant, visibility | Verified immutable content at attachment time; downloads recheck access; staging keys cannot replace final evidence |
| `task`, `timer`, `admin_attention`, `notification`, `read_marker` | Actor, obligation version, rule/calendar, due time, issue/read/ack times, escalation/follow-up | Read is not acknowledgment; acknowledgment is not resolution; bell delivery does not create a new obligation |
| `audit_event`, `outbox_event`, `command_receipt` | Event/command ID, actor, permitted before/after changes, committed sequence/revision, resulting resources | Same transaction records the business effect and durable follow-up intent. Audit is append-only for application roles |

Use composite keys/foreign keys where an estate/organisation boundary must match. A broad `metadata` JSON blob is acceptable for non-authoritative context, not as the sole storage for payment amounts, permissions, deadlines or approval state.

### Distinct clocks on a payment example

MCST transfers on 2 November, reports on 12 November, and the in-app notice is durably issued on 12 November at 10:00 SGT. Store all three facts. The response deadline is 19 November at 10:00 SGT. Contractor can immediately confirm actual receipt on 2 November; an unanswered eligible transfer becomes labelled assumed receipt on 19 November. QuoteFix fees still arose at invoice confirmation. This is record reconciliation, not a delayed bank transfer.

## 3. Reads and the waiting-on bar

Proposed query endpoints:

- `GET /api/v1/me/context`: memberships, role/estate context, permitted capabilities, access epoch and server time.
- `GET /api/v1/tickets`: paged, permission-filtered summaries with current phase and next task.
- `GET /api/v1/tickets/{id}`: permitted current facts, summary versions, warnings and current tasks.
- `GET /api/v1/tickets/{id}/decision-contexts/{action}`: the exact versioned facts needed for a consequential action, with an opaque strong ETag.
- `GET /api/v1/tickets/{id}/history`: paged permitted events; confidential case/billing details excluded as appropriate.
- `GET /api/v1/me/notifications`: durable bell items and read state.
- `GET /api/v1/contractor-account/fees`: Contractor organisation/Admin collection authority only.
- `GET /api/v1/operations/{clientOperationId}`: whether this authenticated actor's submission was accepted, rejected or still processing, with permitted result links.

**Example response projection, illustrative IDs:**

```json
{
  "ticketId": "t_example",
  "phase": "completion_review",
  "presentation": {
    "label": "CM's Inspecting of work",
    "inspectionLabel": "Inspection [2nd]",
    "pending": "CM reviews the work and invoice"
  },
  "tasks": [{
    "id": "task_example",
    "type": "inspect_completion",
    "actorRole": "CM",
    "inspectionRoundId": "ir_example_2",
    "requiredVersion": 2,
    "availableActions": ["approve_works", "unsatisfactory_work"],
    "followUpAt": "2026-11-12T15:59:00Z"
  }],
  "serverNow": "2026-11-10T02:00:00Z"
}
```

Dates in this example are illustrative, not a new policy. The task owns the next actor, action and reminder. The UI should not infer them independently from phase or duplicate the business transition graph. Backend still checks permissions on execution even if a stale response lists an action.

## 4. Commands and their contracts

Use intent-specific endpoints, not `PATCH ticket.status`. All consequential submissions include an operation/idempotency key, expected decision-context ETag and exact relevant document IDs. Actor identity is from authentication. Human-readable labels remain the owner's approved copy.

| Command family / suggested route suffix | Actor and preconditions | Atomic result and next action |
| --- | --- | --- |
| `rfq-drafts` / `publish` | CM or MCST; author reviews facts/media; current draft | Immutable publication/round, eligible opportunity projection, sourcing/urgent tasks |
| `rfq-revisions` | CM/MCST; classify change with reason; current revision | Material change requires reconfirmation; update coverage/reminders; preserve old versions |
| `quotes` / `revise` / `reconfirm` | Verified eligible Contractor; open round, required terms/commitment | Immutable quote; new current version; recompute distinct valid coverage |
| `questions` / `answer` / `decline`, `visits` / `decide` | Contractor own request; CM/MCST permitted decision; visit requires initial quote | Private request, sanitised publication or explicit decline; resolve/remind correct task; reveal only at approved point |
| `select` / `select-and-approve` | CM or MCST; valid exact quote, rationale, warnings; authority/threshold | Freeze selected quote and comparison; MCST approval task if required or work authority. Fewer than three allowed with agreed warning/rationale |
| `selection/approve` / `reject` | MCST; exact pending selection | Authorise or keep same ticket for reselection/new round; rejection is not cancellation |
| `quotation-rounds/open` | CM/MCST; allowed preauthorisation context | Explicit round, preserved prior history; no silent resurrection of expired offers |
| `start` | Assigned Contractor; active authority; completed-by or unknown + reason | Actual Start record; agreed completion tracking or first-estimate obligation |
| `estimate/submit` / `estimate-deadline/extend` | Contractor first estimate; Admin only for exception extension | Separate first-estimate deadline from later revised completion proposals |
| `schedule/propose` / `schedule/accept` | Contractor revised date + reason; authorised CM/MCST exact-version acceptance | Preserve old target until acceptance; audit lateness; notify counterpart; support instead of acceptance when requested |
| `variations` / `confirm-terms` / `approve` / `reject` / `withdraw` | Proposer/Contractor/appropriate approver; threshold/version checks | New effective terms only on approval; outcome/history and contextual resume; rejection rationale required, withdrawal note optional |
| `completion/submit` | Contractor; ready invoice, declaration/slide; current authority/terms | Immutable completion submission and inspection round; no duplicate declaration on retry |
| `inspections/approve` / `unsatisfactory` | CM inspection authority; exact submitted round | Accepted work or findings/remedy task. Fresh physical remedy submits a new round |
| `invoice/revise` / `invoice/confirm` | Contractor correction; MCST confirms reconciled exact version | Confirmation + unique fee assessment + MCST payment task. Mismatch blocks and alerts MCST/Admin |
| `transfers` | MCST only; completed-transfer proof ready, amount/date; partial rationale | Transfer/allocations and Contractor receipt task, bell intent; never assume bank receipt here |
| `receipts/confirm` / `payment-issues` | Contractor; exact transfer/amount, actual receipt date or issue | Actual receipt or blocked assumption/support obligation; recompute balance and eligible Feedback anchor |
| `cancel` / `cancellation/accept` / `cancellation/claim` | CM/MCST reason; Contractor explicit no-claims acceptance or timely claim | Immediate cancellation, claim window on first notice; surviving debts/claims and support as needed |
| `support/request` / `evidence/submit` | Permitted party; confidentiality and parent context | Case/task update; evidence always returns to Admin review, never auto-issues verdict |
| `resolution/issue` / `acknowledge` / `obligation/record` | Admin issues after review/offline coordination; each party acknowledges; actual performer records execution | Final resolution plus independent execution/ack tasks; no reject/counterproposal; existing inspection/receipt evidence reused only for same obligation |
| `admin/backtrack` / `admin/adjust` | Admin; impact preview, reason and exact dependency versions | Attributed corrective event, targeted invalidation; preserved finances/clocks. Never fabricate repair, payment or acknowledgment |
| `feedback/submit` | Responsible CM; due task; rating plus observation or Unable to assess | Resolve feedback task, moderation/provenance; no invented scores or automatic repair case |
| `fees/verify-payment` / `fees/adjust` / `fees/record-refund` | Admin; evidence, outstanding basis, exact financial records | Ledger effect/restriction recomputation; no effect on ticket fee visibility or false bank execution |

This is the first command catalogue, not a claim of exhaustive field-level API coverage. Stage 0 must expand validation schemas and all lifecycle routes, including verification, moderation, exports, access changes and integrity settings, before those modules are coded.

## 5. A command transaction

1. Authenticate, apply rate/size limits, validate payload; verify current access, including reported-subject exclusions.
2. Look up the actor-scoped idempotency key. Same key/body/intent returns the original command result (after current access checks). A changed body with the same key is rejected. Concurrent duplicates serialize on a unique command key.
3. Open a short transaction and lock the relevant aggregates in a documented order. Include eligibility/access/authorised-total dependencies where necessary; all commands changing these dependencies must use a compatible locking/version protocol.
4. Revalidate the expected version and exact document IDs, current eligibility, clock, workflow and permissions under the transaction. The version check does not replace business checks.
5. Write the business facts, revisions, audit event, task changes, command receipt and outbox intent in the same transaction. Constraint violations cannot leave half an approval or fee assessment.
6. Commit and return the accepted outcome/versions. Slow uploads, AI calls, external messages and scans never hold the database transaction open.
7. Workers consume committed outbox items with retries and deduplication; clients refresh through the API.

Use row locks for the limited entities involved and unique constraints for hard invariants. If serializable transactions are selected for a cross-row invariant, retry the entire aborted transaction with the same command identity and fresh validation. Do not hold locks while waiting for a human or external service. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

### Explicit race outcomes

| Race | Required outcome |
| --- | --- |
| CM and MCST select different offers simultaneously | One active selection/authority can commit; the other sees the committed state and reviews again |
| Contractor changes a quote while CM selects | Either the reviewed version is validly selected before change and freezes it, or selection fails as stale; no unseen version substituted |
| Cancellation versus Start/completion | Serialize against current authority. Cancellation cannot be bypassed by an old mobile command; already committed facts remain in history |
| Optional photo versus invoice approval | Independent attachment version need not invalidate approval; a revised invoice or new physical remedy does |
| MCST edits transfer record versus receipt | No ordinary overwrite of an already acted-on transfer; correction requires a versioned adjustment/reconciliation |
| Payment Issue versus seven-day assumption | Lock the same transfer. An issue committed first blocks assumption; assumption committed first remains historical and the subsequent issue opens correction/support, not a second receipt |
| Two workers assess fees or assume receipt | Unique business key plus guarded transaction permits one financial effect |
| Access revoked while a queued command retries | Fresh authorization denies it; cached capability cannot revive permission |

**Idempotency:** retain business command IDs on permanent decision/financial records even when a response-cache entry ages out. Retry caches alone cannot protect against a phone resubmitting a month later. A new key can still be a real-world duplicate transfer: use a unique client transfer ID, compare permitted amount/date/reference/proof hints and surface a possible duplicate for human review. Do not auto-deduplicate separate genuine same-amount bank transfers solely by amount/date.

## 6. Stale versions and errors

`If-Match` carries the decision-context ETag obtained when reviewing. Include exact quote/invoice/etc. IDs in the body. The backend can generate a new context when a dependency changes, without exposing the reason if it is confidential.

| Response | Meaning | Client behavior |
| --- | --- | --- |
| `401` | Session expired | Reauthenticate; retain unsubmitted local form under the same account; do not submit as another user |
| `403` or non-disclosing `404` | No authority/resource access | Remove inaccessible cached resource/actions; do not reveal a restricted case in error text |
| `412 VERSION_CHANGED` | Reviewed context is stale | Fetch new permitted context, show changed fields, preserve draft note, require renewed explicit decision |
| `409 ACTION_NO_LONGER_AVAILABLE` | E.g. ticket cancelled, already selected, quote ineligible | Show current stage and permitted next action; no automatic replay with a new version |
| `409 IDEMPOTENCY_KEY_REUSED` | Same key used for different intent/body | Treat as client error; never reinterpret the earlier command |
| `422 FIELD_VALIDATION` | Missing evidence/date/reason or inconsistent fields | Keep form; identify field/action needed |
| `428 PRECONDITION_REQUIRED` | Consequential mutation omitted expected version | Fetch review context; do not accept a blind write |
| `429` / transient `5xx` / timeout | Throttle or uncertain response | Honour Retry-After/backoff; resolve the same operation identity; never blindly create a second operation |

A conflict is ordinary collaboration, not always an Admin case. Ask the user to resolve overlapping drafts or review changed facts. Route to Admin only when existing support rules or an actual discrepancy requires it. Conditional-request behavior follows [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match); QuoteFix's UI treatment is a design proposal.

## 7. Synchronization in two stages

### Web first: deliberately simple

- Fetch authorised query projections on login, navigation, refocus/reconnect and after mutations. Conditional GET/ETag can avoid downloading unchanged resources.
- Refresh the current ticket and bell while the app is active, with a bounded configurable polling interval; never depend on a perpetually open socket for correctness.
- Successful command response updates the local cache; follow with canonical refresh. Out-of-order responses may not overwrite a higher resource revision.
- Keep draft changes apart from server records. A background refresh cannot erase typing.

### Native later: explicit incremental contract

Propose `GET /api/v1/sync/bootstrap` and `GET /api/v1/sync/changes?cursor=...`. A cursor is opaque, bound to account/access context and schema version. It is not a client timestamp or raw database sequence.

1. Capture a committed change-feed watermark before constructing a bounded consistent bootstrap snapshot for the authorised resource set. Page through the server-owned snapshot token, rechecking permission on every page.
2. Return permitted record revisions, watermark, access epoch and server time. Fetch changes from that watermark after bootstrap; overlap is safe through version-aware upserts.
3. Changes contain invalidation/upsert references or deletion/revocation tombstones, not unrestricted internal events. Re-fetch current authorised representations. Save records and the next cursor in one local transaction.
4. A feed worker consumes **all unprocessed committed outbox items**, not `id > last_id` from IDs allocated before commit. A single serialized journal writer per feed partition assigns cursor order on append. This avoids missing a late-committing lower sequence number.
5. A delayed older event causes a current-state refresh; it cannot resurrect an old record. Feed latency is observable; immediate command responses are not held until every client catches up.
6. Lost socket/push messages are harmless: resume from the cursor. Duplicate pages are safe. An expired cursor or changed access epoch requires a scoped fresh bootstrap, with inaccessible caches purged before display.
7. A revoked account or newly excluded confidential subject receives no secret payload in a “revoked” event. It only loses access to resources previously visible. New grants trigger re-bootstrap so old-but-newly-visible records are included.

Never use `updated_at > device_last_sync` alone: equal timestamps, clock drift, hard deletions and commit reordering can lose changes. Never expose a global tenant event stream to contractors and rely on the app to hide rival information.

This feed is a **later implementation stage**, not infrastructure required for the first web screen. Build/version the records and outbox now so it can be added without replacing the business database. Bootstrap size limits, journal retention and cache scope must be specified in the native sync spike; they are not implied unlimited-history promises.

## 8. Merge policy by data type

| Data | Policy |
| --- | --- |
| Approval, selected quote, money, invoice, scope, schedule acceptance, inspection result | Never auto-merge. Exact-version command and explicit review after change |
| Draft prose | Local base version plus edited fields. If server changed, preserve both. Initial implementation asks the user to choose for overlapping fields; no collaborative editing engine |
| New photos / optional progress entries | Append using stable unique IDs after permission/parent checks. Repeated upload/attach does not duplicate. Cancellation may mean retaining private evidence instead of publishing a work update |
| Bell read marker | Monotonic read per user; reading on one device updates others. Reading cannot acknowledge an Admin task |
| View preference | Simple server version/update policy is adequate; never share this permissiveness with business records |
| Deletion/revocation | Server-authoritative removal from permitted caches. Do not resurrect on an old draft's reconnect |

## 9. Backward compatibility for app-store clients

- Maintain `/api/v1` with additive changes; never rename/remove fields or change amounts/semantics under an installed app without a migration strategy.
- Pin and validate an OpenAPI contract; run generated-client and schema compatibility checks in CI. The OpenAPI site currently exposes the specification; choose a version supported by the actual tooling spike rather than blindly following `latest`. [OpenAPI](https://spec.openapis.org/oas/latest.html).
- Old clients must render unknown workflow/action types safely as “Open the latest version to continue,” with a read-only fallback where possible. Unknown data must not be coerced into an existing approval.
- Expose server capabilities/minimum supported mutation contract; disable incompatible actions with a clear update message. An emergency minimum-version block is exceptional and cannot be the routine migration plan.
- Database changes follow expand -> deploy compatible readers/writers -> backfill/verify -> contract only after supported clients/jobs no longer depend on old fields.
- Version domain events, task rules, AI outputs, fee formulas and scoring policies independently from the API URL. Preserve the version used for a historical decision.

## 10. Acceptance evidence required

Test using two independent clients against the same test backend, not two functions sharing a mocked cache:

1. Phone approves stale invoice after browser correction: no confirmation/fee on the wrong version; draft note survives.
2. Response lost after Payment Sent commits: retry and operation lookup show one transfer, one receipt task and one initial notice.
3. Worker crashes after domain commit: pending outbox work recovers with no duplicate financial effects.
4. Multipart transfer interrupted/restarted and grant expired: renew only with current access; checksum/content cannot be swapped after finalization.
5. Material RFQ edit and third quote race: selectable count and selection reminders reflect the current scope.
6. Client clock deliberately wrong; all receipt/claim/expiry deadlines remain server-derived.
7. Permission/identity masking changes while phone offline: next connection purges restricted copies and refuses stale commands; do not promise remote erasure while offline.
8. Initial sync overlaps mutations/deletions and outbox commits out of order: no missing update or resurrected record.
9. Older supported client against migrated API/schema: safe reads and valid commands; incompatible new action disabled.
10. Confidential-subject exclusion tested through query, history, file, sync, bell, export and error payloads.

Field-level schemas, index/migration scripts and executable integration tests are later task outputs. This document defines their contract; it does not claim those tests have run.
