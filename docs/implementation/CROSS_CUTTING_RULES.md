# Rules every implementation chapter inherits

Plan 0.3 — 13 October 2026. Planning only. [Master document](../IMPLEMENTATION_PLAN.md).

## Status legend and authority

- **C — Confirmed:** explicit owner decision, including the latest amendments recorded in product/decision memory.
- **E — Engineering design:** the proposed way to implement the confirmed behavior; validate with the chapter's tests before treating it as working software.
- **G — Decision gate:** unresolved product behavior. Capture the recommended solution and context in [Decision gates](DECISION_GATES.md); do not implement that branch until decided.

Latest explicit owner decision takes precedence over current memory, lifecycle/timing documents, specialist plans and historical PRDs. Earlier paragraphs that are explicitly superseded are historical evidence. A document's confidence estimate is not proof of tested behavior. This chapter set changes organization and implementation detail; it does not reopen settled lifecycle decisions.

## X01 — One system and one authority

Web first; future native apps share accounts, IDs, API, database, permissions and history. Backend commands own decisions. The UI is a role-filtered projection, not a second state machine. Do not translate each of the 83 diagram nodes into a status, page or service. Use current job phase, independent obligations/tasks, immutable decisions and derived views.

## X02 — Membership and visibility

| Audience | Baseline | Exclusions that still apply |
| --- | --- | --- |
| CM | Own estate's operational tickets, comparisons, permitted contractor passport, CM decisions | Cannot record MCST payment; no QuoteFix fee account; identities hidden when MCST enables concealment; no confidential case where they are the subject |
| MCST | Own estate's CM capabilities plus approval, payments, oversight, identities/settings | Same-role accounts have equal authority, but a reported subject cannot access that confidential case. No Contractor-to-QuoteFix billing |
| Contractor | Eligible anonymised RFQs; own organisation's quotes, authorised jobs, payment/fee records and permitted feedback | No rival quotes, estate procurement rationale/private oversight, premature location reveal or restricted original files |
| Admin | Cross-estate verification, support, moderation, overrides and collections | Explicit commands/reasons/audit; no destructive rewriting or pretending a verdict performs work/payment. Internal operating arrangements stay out of app copy |

Enforce access on list/detail/action/file/export/search/history/sync/error/notification surfaces. A denied detail page is insufficient if a list count, file URL or AI sentence leaks the same fact. Actor labels are not authorization inputs. MCST performing an inherited CM action is recorded as the actual named MCST account; notify the actual responsible party without fabricating an extra approval role.

## X03 — Required fields and submissions

Chapter field tables use **Required**, **Conditional**, **Optional** or **System**. Empty string, whitespace, unchecked consent and a failed file upload do not satisfy Required. Conditional fields become mandatory only when their named condition holds. System values are generated/validated by the server, not trusted from hidden browser fields.

User-approved Other options require an explanation. Never fabricate a missing historical value or choose Yes by default for a contractor declaration. Required acknowledgement checkboxes start unchecked. Slide confirmation is an intentional final submit gesture, not permission by itself; provide an equivalent accessible deliberate keyboard/screen-reader control without weakening the confirmed checkbox/declaration.

Draft saves never publish, authorise, accept work or record money. Disable unavailable actions with a specific reason. Validate again at the API even if the UI had enabled the button.

## X04 — Dates, deadlines and countdowns

| Unit | Meaning |
| --- | --- |
| BD | Singapore weekday excluding the maintained public-holiday calendar; skip trigger date; deadline 23:59 Singapore time on the Nth eligible date |
| CD from an instant | Calendar days retaining the applicable Singapore time; distinguish from date-only dispatch rules |
| +24h | 24 elapsed hours, including weekends/holidays |
| Calendar month | Date arithmetic, with month-end clamping as specified for credential reminders; not a fixed 30 days |
| RFQ +2 dates noon | Second following Singapore calendar date at 12:00; publication 1 Dec -> 3 Dec noon, regardless of publication hour |

Store event/actual date, recording timestamp, precision, first notification issuance and rule/calendar version separately. Date-only quote/credential expiry is the next midnight; selected holds survive the quote's old expiry. Date-only actual full receipt gives Feedback at 09:00 on the 30th following calendar date. Late-discovered Feedback retains its true due date but gets response reminders from first issued notice.

Every visible countdown names an event: **Receipt response by**, **Submit claim by**, **Provide estimate by**, **Fees due**, **QuoteFix follow-up in**. Never “Ticket expires.” Display days/hours plus exact Singapore date/time, and replace zero/negative countdown with meaningful overdue wording. Scheduled work is not late before its agreed time. A phone clock reaching zero cannot perform a transition.

## X05 — Shared task/notification mechanics

One obligation owns the next actor, action and applicable timer. Reading a bell is not responding, acknowledging, approving, paying or resolving. Notify only responsible/relevant authorised users; no launch email/WhatsApp/push implied. Per-account read markers coexist with one role/organisation obligation. New accounts/devices and reminder retries do not reset first issuance.

First issued means a durable in-app notice is available to its authorised audience. A queued or failed notification has no first-issued timestamp and cannot start the seven-day receipt/claim clock. Existing clocks tied to business events, such as invoice-triggered fees, retain their own anchors.

Stop/supersede obsolete timers on the actual relevant action/version change. A response can finish a response task while leaving a payment, repair or evidence obligation open. Admin acknowledgment of an unresolved item must retain a dated task/next follow-up. Optional drafts/photos and informational final-resolution acknowledgments do not acquire a generic inactivity deadline.

## X06 — Versions, retries and audit

Every consequential command has current authority checks, an expected review version, exact document IDs and an idempotency key. Check dependencies as well as the main record version. Commit fact, audit, command receipt and durable follow-up intent atomically. Financial/approval uniqueness survives expiry of an HTTP response cache.

On stale data, preserve unsubmitted text, show permitted changes and require renewed review. Do not automatically upgrade an approval to an unseen quote/invoice. After a lost response, check/retry the same operation; do not create a second transfer. New photos need not invalidate an unchanged invoice, but changed scope/work/amount does.

Audit actor/account/role, server date/time, claimed occurrence time where relevant, prior/new versions/values, reason, evidence, approval/rejection/withdrawal and emitted notices. Application roles cannot alter audit events. Admin backtracking supersedes affected facts/tasks; original authority, payment and fee history remain. Privileged database-tamper protection is an operations design, not a guarantee supplied by an append-only UI.

## X07 — Files and privacy

Authenticated upload intent -> private staging -> resumable bytes -> verified immutable object -> scans/derivatives -> ready attachment -> separate business submission. Keep originals and permitted derivatives distinct; removal of EXIF alone does not hide a photographed condo name. Authorized preview/reveal gates remain. Signed upload grants may not replace finalized evidence. Downloads and exports recheck permission; never put private credentials or file grants in analytics/logs.

## X08 — Offline and mobile

**Confirmed O37-A:** drafts/photos/documents may queue locally; publishing, quoting, selection/approval, Start/completion, cancellation, payment/receipt and other consequential decisions need an online explicit submission against current server state. Automatic upload retry is not form submission. Show **Saved on this device · not submitted**, **Uploading**, **Checking submission**, **Submitted** as distinct proposed copy.

Refresh permission/context on reconnect; partition caches by account/context and purge revoked resources when contact is restored. Do not promise to remotely erase a device while it is offline. Sensitive persistent cache policy is O37-B. Native push, if later approved, only hints to refresh; it never anchors business clocks.

## X09 — Data quality and AI

Start with new QuoteFix operational data. Fictional fixtures run only in isolated environments and must not enter real comparisons, fees or reputation. Genuine external references need independent Admin verification and provenance. Unknown/unassessed/unanswered is not positive evidence.

AI suggestions are structured and checked, tied to permitted evidence and versions, then reviewed by a human. AI cannot invent measurements/diagnoses, override eligibility or approve work/money. AI failure must not remove the manual workflow. Model output is untrusted content, never an instruction to bypass policy.

## X10 — Definition of a verified chapter

Each chapter specifies source decisions, dependencies, build order, roles/visibility, required fields, events/transitions, timers/countdowns, data/API effects, exceptions and tests. Passing means evidence from API/database/worker/UI where relevant, not only a mock or a screenshot.

Run normal and denied-role cases, stale/duplicate/concurrent commands, clock boundaries, failed notice/upload, privacy leaks and reconnect recovery. Use a controlled clock, multiple independent clients and real transaction constraints. Every test records fixture, command, resulting rows/events/tasks/notices and user-visible result. No production feature is represented as complete while its exception route or open gate is silently skipped.

Chapter numbering is the primary construction order. Cross-cutting support is scaffolded early in chapters 3–4; each later feature wires its real support route immediately. The complete resolution/financial routes in chapter 14 must be integrated before the web release in chapter 19. No live pilot with knowingly dead-end support buttons.
