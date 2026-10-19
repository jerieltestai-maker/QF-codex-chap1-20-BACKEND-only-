# Implementation coverage index

Plan 0.3 · 2026-10-13 · lifecycle 2026-10-12-v14. [Master](../IMPLEMENTATION_PLAN.md). Generated from the manifest and current sources; no policy is decided by generation.

**20 chapters · 83 active lifecycle anchors · 202 directed routes · 34 diagram views · 23 timer rules · 206 planned verification scenarios.**

A primary owner means the chapter responsible for wiring the behavior; other chapters may consume its events. Coverage is documentation traceability, not evidence that the feature is implemented or every route has an executed test.

## 1. Chapter ownership

| Chapter | Primary lifecycle anchors | Primary clocks | Planned tests |
| --- | --- | --- | --- |
| [01 — Project, backend and database foundations](chapters/01_FOUNDATIONS.md) | Shared/non-node capability | Inherited | 7 |
| [02 — Login, accounts and permissions](chapters/02_LOGIN_AND_ACCESS.md) | Shared/non-node capability | Inherited | 8 |
| [03 — Workspace, records, audit and files](chapters/03_WORKSPACE_RECORDS_AND_FILES.md) | Shared/non-node capability | Inherited | 9 |
| [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) | E1 | T11, T18 | 10 |
| [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) | G1, G2, G3, G4 | T12 | 8 |
| [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) | I1, I2, I3, Q1, U1, U2, U3, U4 | T15, T16, T19 | 10 |
| [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) | Q3, Q4, Q5, Q6 | T13, T22 | 10 |
| [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) | Q2, S1, S2, S3, S4, S5, M1, M2 | T07, T17 | 10 |
| [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) | W1, W2, E2 | T14, T20, T21, T23 | 10 |
| [10 — Variations and return routing](chapters/10_VARIATIONS.md) | V1, V2, V3, V4, V5 | Inherited | 10 |
| [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) | W3, R1, R2, R3 | T08 | 10 |
| [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) | R4, P0, P1, P2, P3, P4, P6, P7, P8, P9, P10 | T01, T02 | 12 |
| [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) | B1, B2, B3, B4 | T05, T06 | 10 |
| [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) | C1, C2, C3, C4, C6, C7, C8, C9, C10, D1, D2, D3, D4, D5, D6, D7, D8, D9, E3, A1, A2 | T09, T10 | 13 |
| [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) | F1, F2, F3, F5, F6, F7, F8, F9, F10 | T03, T04 | 10 |
| [16 — Reputation, passport and AI comparison](chapters/16_REPUTATION_PASSPORT_AND_AI.md) | F4 | Inherited | 12 |
| [17 — MCST integrity and warning system](chapters/17_MCST_INTEGRITY.md) | Shared/non-node capability | Inherited | 12 |
| [18 — Role dashboards, analytics and exports](chapters/18_DASHBOARDS_AND_EXPORTS.md) | Shared/non-node capability | Inherited | 10 |
| [19 — Web release, security and operations](chapters/19_RELEASE_AND_OPERATIONS.md) | Shared/non-node capability | Inherited | 12 |
| [20 — Later iOS and Android clients](chapters/20_NATIVE_MOBILE.md) | Shared/non-node capability | Inherited | 13 |

## 2. Every active lifecycle anchor

Exact labels, entry conditions, visibility, conditional pending lines and exits remain in [Node reference](../review/NODE_REFERENCE.md). Full transition-to-chapter mapping is in [Routing coverage](ROUTING_COVERAGE.md). C/P/? authority and per-field copy approval remain in the source; chapter ownership does not promote a proposal to confirmed.

| Anchor | Meaning | Primary implementation chapter |
| --- | --- | --- |
| I1 | Report an issue | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I2 | AI is refining your draft | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| I3 | Approving AI input | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| Q1 | Requesting for quotes | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| Q2 | Comparing quotations | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| Q3 | CM answers questions | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q4 | Refreshing affected quotes | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q5 | CM reviews visit request | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| Q6 | Contractor updates quote | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| S1 | CM freezes selection | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S2 | MCST Reviewing selected Contractor | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S3 | Rejected Contractor | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S4 | Selected quote terms held | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| W1 | Contractor prepares to start | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| W2 | Contractor carries out work | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| W3 | Contractor submits completion package | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R1 | CM reviews completion | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R2 | Contractor addresses issues | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R3 | Explaining price change | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| R4 | MCST confirms invoice | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P1 | MCST records payment | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P2 | Contractor checks receipt | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P3 | Unresolved payment | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P4 | Payment received | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P6 | Closed | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| V1 | Contractor defines variation | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V2 | CM or MCST decides change | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V3 | Approved variation recorded | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| C1 | CM or MCST cancels directly | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C2 | CM or MCST confirms cancellation | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C3 | Contractor explains cancellation concern | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C4 | Cancelled; contractor responds | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C6 | MCST confirms settlement | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D1 | Contractor responds to concern | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D2 | Admin reviews evidence | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D3 | Parties supply evidence | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D9 | Admin coordinates offline | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D4 | Acknowledge final resolution | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D5 | Admin issues binding decision | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D6 | Carrying out agreed resolution | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D7 | Admin follows up on unresolved case | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| D8 | Reuse or obtain the required verification | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| F1 | Feedback scheduled | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F2 | CM provides feedback | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F3 | Addressing a later issue | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F4 | Admin reviews publication | [16 — Reputation, passport and AI comparison](chapters/16_REPUTATION_PASSPORT_AND_AI.md) |
| B1 | Contractor pays QuoteFix | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B2 | Admin reconciles fee payment | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| B3 | Collecting overdue fees | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| U1 | Urgent job alerts admin | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U2 | Admin takes coordination | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U3 | Attendance arranged | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| U4 | Urgent sourcing unresolved | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| E1 | Following up on pending actions | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| E2 | Contractor cannot continue | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| E3 | Request Admin Support | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C7 | Cancellation settled | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| B4 | QuoteFix fees settled | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| F5 | Aftercare case resolved | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F6 | Feedback recorded | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| P0 | Zero payable derived | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| V4 | Rejected or withdrawn variation recorded | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| V5 | Automatic variation return | [10 — Variations and return routing](chapters/10_VARIATIONS.md) |
| P7 | Internal seven-day receipt rule | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| G1 | Admin verifies credentials | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G2 | Verified credentials recorded | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G3 | Credential renewal reminder | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| G4 | Credential expired | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| C8 | Cancellation claim opens intervention | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| C9 | Contractor accepts cancellation | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A1 | Admin backtracks job status | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| A2 | Automatic restoration route | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| M1 | MCST acknowledges threshold | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| M2 | MCST selects and approves | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| S5 | Reopen quotation round | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| P8 | Admin follows up in payment case | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P9 | MCST responds in payment case | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| P10 | Transfer and notification dates recorded | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| C10 | Additional claim window ends | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| F7 | Following up on missing feedback | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F8 | Negative durability feedback | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F9 | Positive durability feedback | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| F10 | Unable to assess recorded | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |

Retired C5 and P5 are excluded: no Admin veto gate before cancellation and no Finishing up screen. Their surviving safeguards belong to the actual domain transitions.

## 3. All clocks and key days

This table copies the timing register's current concise summary. Read the [register](../TIMING_AND_NOTIFICATION_REGISTER.md) and owning chapter for recipients, messages, countdown, stop guards and exceptions. T07/T09/T22 are reused by several features; do not schedule duplicate chases.

| Rule | Trigger | Wait / cadence | Effect | Primary chapter |
| --- | --- | --- | --- | --- |
| T01 | MCST confirms invoice/settlement | Immediately; +1 business day; +3 business days; then Admin-set | MCST gets payment task; missing update is chased; Admin follows up. No bank-payment deadline imposed. | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| T02 | First payment notification for one recorded transfer | 7 calendar days | With no receipt response or Payment Issue, label that transfer **Assumed received**. | [12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md) |
| T03 | Full actual/assumed settlement, or approved zero/performed-work exception | 30 calendar days | Notify CM and reveal **Give feedback**. | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| T04 | The durability Feedback task becomes due | Immediately; +2 business days; +5 business days; then Admin-set | Notify CM; remind CM; alert Admin if unanswered. | [15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md) |
| T05 | MCST confirms final invoice/settlement | 3 business days | QuoteFix fees become overdue if not fully verified paid; Contractor quoting restrictions apply. | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| T06 | An authorised financial adjustment is confirmed | 3 business days for a newly assessed fee difference | Additional unpaid difference becomes overdue; the original fee deadline is preserved. | [13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md) |
| T07 | A required MCST approval becomes actionable | +2 business days; +5 business days | Remind MCST; alert Admin if still awaiting a decision. | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| T08 | Initial completion or a new remedy round is submitted for inspection | +2 business days; +5 business days | Remind CM; alert Admin if that inspection is unanswered. Each repaired round needs its own inspection. | [11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md) |
| T09 | An ordinary dispute response becomes actionable | +2 business days; +5 business days | Remind the party owing a response; alert Admin. Silence never decides the case. | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| T10 | First cancellation notification to the selected Contractor | 7 calendar days; Contractor +2 BD in-window; Admin earlier of +5 BD or cutoff minus 24 hours | Close the ordinary additional-claim window; keep timely claims and existing debts alive. | [14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md) |
| T11 | Admin records a next follow-up date/time | Until that saved time | Notify Admin to perform the named follow-up. | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| T12 | Admin records a credential expiry | One calendar month before expiry; then expiry itself | Notify Admin to review renewal; at expiry grey the badge and apply the appropriate eligibility rule. | [05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md) |
| T13 | Contractor submits a quote with an expiry | Until its recorded expiry | An unselected expired quote becomes unselectable; RFQ stays open. | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| T14 | Parties agree a future start / Contractor supplies completion estimate | Until the recorded date/time | Display schedule/estimate. Scheduled-start attention T23; completion T20; temporary unknown estimate T21. | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| T15 | An urgent RFQ is published | Immediately; T19 while unacknowledged; then Admin-set updates | Notify Admin for offline coordination; no invented resolution SLA. | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| T16 | RFQ / explicit new quotation round is published | Second following calendar date at 12 noon Singapore time | Fewer than 3 distinct eligible contractors with current selectable quotes -> Admin sourcing follow-up. | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| T17 | Third distinct eligible contractor has a current valid selectable quote | +5 BD actor; +10 BD Admin; pause below 3, resume remaining time | Chase actual selection owner only with adequate current quote coverage. Early selection with fewer quotes still allowed. | [08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md) |
| T18 | Ordinary Admin attention item is issued and unacknowledged | +1 business day | Re-alert Admin; acknowledgment of an unresolved item retains a dated next action. | [04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md) |
| T19 | First urgent Admin notice is issued | +15min, +1h, +3h; then every 7h (+10h, +17h, +24h...) | Re-alert while unacknowledged; after acknowledgment use Admin-set follow-up. | [06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md) |
| T20 | Completion target passes without recorded completion | Admin immediately; both relevant CM/MCST +24 elapsed hours only if still outstanding | Show hours overdue and Okay / Admin Intervention; acceptance of a revised target is separately audited. | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| T21 | Actual Start uses Unable to estimate plus reason | 24 elapsed hours | Completion date/time must be supplied; missed estimate deadline alerts Admin immediately. Only Admin grants reasoned extension with new deadline. | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |
| T22 | Ordinary newly covered response/decision becomes actionable | +2 business days actor; +5 business days Admin | Applies to Q&A, visit decisions, variation terms/CM decisions and invoice correction; no duplicate specific timer. | [07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md) |
| T23 | Agreed scheduled start arrives with no Start recorded | Admin immediately; relevant CM/MCST +24 elapsed hours if still unrecorded | Start has not been recorded. Stop obsolete reminders on Start/cancellation/authorised supersession. | [09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md) |

## 4. Capabilities beyond diagram nodes

| Capability | Owning chapters / verification focus |
| --- | --- |
| Environments, migrations, real data versus fixtures | 01, 19; no production fixture/reset path |
| Login, sessions, membership, estate isolation | 02; identity/role escalation denied |
| Exact versions, concurrency, audit and idempotency | 03 plus every consequential command |
| Private media, immutable finalization, sanitised preview | 03, 06, 07, 11, 12, 18, 20 |
| Waiting-on bar, role task versus per-user read state | 04, 18; no read-to-complete shortcut |
| Server clocks, failure monitoring, notice issuance | 04, 19; outage/duplicate/obsolete-worker guards |
| AI factual refinement and explainable comparison | 06, 08, 16; human decisions and source versions |
| Credentials and independent restriction reasons | 05, 13; fee freeze cannot cancel existing work |
| Confidential reports and identity masking | 02, 03, 08, 14, 17, 18, 20; list/file/export/AI/sync |
| Inspection ratings, provenance and moderation | 11, 15, 16; acceptance is a distinct fact |
| MCST warning settings without automatic fraud verdict | 17; event-time versioned policy |
| Search, analytics and exportable decision packs | 18; permitted sources and denominators |
| Backup, security, monitoring and safe release | 19; evidence required before launch |
| Mobile cache, file retry and installed-client compatibility | 03, 20; shared online decision authority |

## 5. Deliberate non-alerts and unresolved gaps

No automatic Admin silence chase is invented for unpublished drafts, optional photos/updates, informational final-resolution acknowledgments, not-yet-due Feedback or a selected quote's former expiry. Real obligations retain their domain tasks. After Admin acknowledges an unresolved issue, a saved next action/date keeps it on the queue.

Open extras remain in [Decision gates](DECISION_GATES.md): ordinary repeats beyond the approved +1 BD Admin reminder, warranty/advance reminders and archive. G03 no-agreed-start requests were resolved by the owner on 14 October 2026. Other visible design gaps retain their recorded gates.

## 6. Using coverage during implementation

Before coding a feature, extend its command/schema design with explicit rule → permission → invariant → event/task/timer → test evidence mappings. Exercise its exits in Routing coverage, including conditional pending actors. The scenario count alone does not prove every route is tested. Chapter 19 combines complete journeys and cross-cutting failure/security cases.
