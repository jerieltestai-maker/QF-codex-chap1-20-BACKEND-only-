# Chapter 18 — Role dashboards, search, history and decision-pack exports

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [17](17_MCST_INTEGRITY.md) · Next: [19](19_RELEASE_AND_OPERATIONS.md)

**Dependencies:** 01–17 projections; basic dashboard shell exists from 02–04. **Sources:** C28/C51/C54, current integrity/reputation scope. **Purpose:** make the complete workflow usable without turning secondary data into more required steps.

**Local implementation, 18 October 2026:** [build evidence](../CHAPTERS_17_18_BUILD.md). Initial supported pack formats are printable HTML and structured JSON, with immutable role-filtered snapshots and rechecked authenticated downloads. The PDF recommendation below does not claim a native PDF generator. Warning behavior follows the owner's resolved G12 clearance/work-pause rules.

## 1. Role-specific work queues

| Role | Primary view/action | Secondary views / exclusions |
| --- | --- | --- |
| CM | Own estate's reports, quotations ready to compare, inspections, due Feedback, concrete pending role/action | History/quote terms/approved analytics; no payment recording or QuoteFix fee account |
| MCST | Required approvals/invoice/payment tasks plus inherited operations and oversight warnings/settings | Unmasked permitted Contractor view, decision packs; subject-restricted reports excluded |
| Contractor | Eligible anonymized opportunities, own quotes, authorised work, completion/receipt tasks | Own account fees/verification/profile/feedback; no rival bids/private estate oversight |
| Admin | Unacknowledged/overdue attention, urgent sourcing, verification, support, moderation, fees/refunds and next follow-ups | Cross-estate authorised records, audit/failure queues; no implied auto-resolution |

One queue row represents the actual task, not every bell about it. Reading/removing a notification does not hide outstanding work. Show scheduled/actionable/overdue meaning, exact actor, next event and relevant amount/date without presenting every historical field at once.

## 2. Search, filters and compulsory display context

| Surface | Required context | Optional controls |
| --- | --- | --- |
| Ticket summary | Ticket ID/issue, current stage, actual pending actor/action, authorised context | Category/date/status/urgency filters |
| Due task | Action, due/follow-up event name and exact SGT time, relevant version/round | Sort/search; no generic Ticket expires |
| Comparison summary | Included quote count, terms/unknown-cost cautions, source versions | Expand details, authorized passport |
| Analytics | Metric definition, date range/denominator, permitted source links | User-selected range/grouping; not extra mandatory reporting |
| Export request | Exact ticket/snapshot scope and authorised audience (E format contract) | Format choice only if implemented; PDF decision pack recommended |
| History item | Named actor/role, action, recorded date/time, version/reason where required | Expand evidence/differences |

Use accessible labels/information icons and empty/error/loading states. Hidden primary-button panels are not a substitute for clear next-action copy. Avoid making optional progress photos or advance Feedback buttons occupy the main work area.

## 3. Approved analytics, not inferred claims

Quote count/range and term differences; initial/current/selected/final price movement; authorised variations; waiting times by actual responsible actor; recorded completion/inspection/payment outcomes. Record actual versus reported times separately; an old bank transfer recorded late is not automatically late payment.

Received quote differences are not market-price estimates/proven savings. Waiting time is not a contractual penalty or automatic reputation deduction. Do not calculate performance from fictional seed records, unanswered Feedback or unverified allegations. Formula/denominator for reputation-specific metrics stays chapter 16.

## 4. Decision pack contents and privacy

Export the approved request/evidence, relevant exact quote set, selection rationale, approval/threshold acknowledgments, authorised variations, completion/inspection rounds, confirmed invoice and relevant exceptions/outcomes. Include chronology/version references and unresolved warning/obligation status where permitted. Preserve the comparison/AI/rule snapshot actually shown at decision time.

Exports are role-filtered, not one privileged PDF sent to everyone. CM concealment survives filenames, attachments, AI, references and PDF metadata. Contractor export is own permitted record, never rival quotes/procurement rationale. Exclude Contractor QuoteFix billing from estate packs and sensitive conduct details from subjects. Restricted originals/moderation/negotiation notes do not become public annexes.

Async generation captures a precise snapshot/context and rechecks permission at creation AND download. Expired/revoked download grants do not expose stale files. Reference later corrections explicitly without rewriting an earlier exported decision snapshot.

## 5. Data/API, events and clocks

Read models derive from canonical records/events, never a second editable spreadsheet of status. Commands request export and mark bell read; query endpoints page/filter authorised tasks/tickets/history/analytics. No client-side filtering of an unrestricted dataset.

Export jobs use chapter 03/04 technical retries and failure monitoring. No new product T+N deadline for opening dashboards, reading optional analytics or downloading exports. New message counts must be authorized before counting; counts can leak a secret case even if detail is blocked.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH18-T01 | Same ticket viewed by all four roles | Correct next actions/data; forbidden buttons and API actions both denied |
| CH18-T02 | Multiple bells for one unresolved task | One work item remains after read; urgency/follow-up accurate |
| CH18-T03 | Masked CM downloads decision pack | Identity hidden across text/files/metadata/AI while permitted prices retained |
| CH18-T04 | Contractor requests full estate comparison export | Rival submissions/private rationale excluded |
| CH18-T05 | Confidential subject searches/counts/exports | No case existence/content leakage |
| CH18-T06 | Export queued then access revoked | Generation/download access rechecked; no stale grant |
| CH18-T07 | Invoice/variation changes after decision snapshot | Prior pack remains reproducible; current correction linked, not silent rewrite |
| CH18-T08 | Analytics with fictional data or unanswered Feedback | Production excludes fake records; no clean-outcome inference |
| CH18-T09 | Narrow phone viewport, keyboard/screen reader, no data | Core actor/action usable; no overflow-only hidden action or ambiguous empty state |
| CH18-T10 | Slow/stale aggregate projection | Fresh critical action uses canonical version; stale analytics does not authorize anything |

## 7. Completion gate

Deliver the complete role journeys, named metrics and permitted decision packs with export-level privacy tests. Detailed visual polish follows behavioral clarity. Later analytics/automatic tuning not explicitly approved stay outside scope.
