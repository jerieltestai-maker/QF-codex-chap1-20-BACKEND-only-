# Verification scenario index

Plan 0.3 · 2026-10-13 · lifecycle 2026-10-12-v14. [Master](../IMPLEMENTATION_PLAN.md). Generated from the manifest and current sources; no policy is decided by generation.

**206 scenario specifications across 20 chapters.** These rows define requirements rather than claiming completion. Executed local subsets are recorded separately in [01–02 evidence](CH01_CH02_VERIFICATION.md), [03–04 evidence](CHAPTERS_03_04_BUILD.md), [05–06 evidence](CHAPTERS_05_06_BUILD.md), [07–08 evidence](CHAPTERS_07_08_BUILD.md), [09–10 evidence](CHAPTERS_09_10_BUILD.md), [11–12 evidence](CHAPTERS_11_12_BUILD.md), [13–14 evidence](CHAPTERS_13_14_BUILD.md), [15–16 evidence](CHAPTERS_15_16_BUILD.md) and [17–18 evidence](CHAPTERS_17_18_BUILD.md). Chapters 19–20 have partial local implementation; see [19–20 evidence](CHAPTERS_19_20_BUILD.md) and [stability repairs](STABILITY_2026_10_27.md). Hosted release and physical-device gates remain outstanding; local checks do not establish production readiness.

## Evidence to retain

For each scenario: source rule/version, isolated fixture, actor/role/estate, initial record versions and clock, command/request ID, expected/actual result, changed database/audit/outbox/tasks/bells, UI/error evidence, and pass/fail with environment/build. A failure preserves observations; do not edit expected policy to conceal it.

Use real transaction/permission/worker boundaries where needed. Mock-only or screenshot-only evidence cannot prove financial uniqueness, access isolation or deadline recovery. Test each Conditional required field with and without its triggering condition.

## Shared fixture families

| Fixture | Purpose |
| --- | --- |
| Two estates, equal-role named accounts, reported subject, rival Contractors | Denied cross-estate/subject/rival access; shared tasks versus per-user reads |
| Zero/one/two/three valid quotes; expiry, revisions, material changes | Sourcing count, early selection, pause/resume and reconfirmation |
| Under/equal/above threshold; CM versus MCST | Correct direct authority versus required MCST approval |
| Future/missed Start, unknown/revised target, failed remedies | Distinct clock anchors and numbered re-inspection |
| Full/partial/zero/adjusted invoice, late entry, disputed transfer | Balances, deeming, independent fees and duplicate/lost-response recovery |
| Cancelled, timely claim, draft-only claim, no response | Cutoff, non-waiver, preserved debt and actual execution |
| Date-only/instant, holiday/weekend, delayed notice/outage | Calendar precision and first-issued anchoring |
| Positive/negative/Unable to assess/missing Feedback | No fabricated durability/reputation; moderation and reference provenance |
| Two devices, expired session, revoked access, interrupted media | Online decisions, privacy, sync and resumability |

Fictional fixtures are isolated from production. Genuine external references are verified separately. Freeze the test clock and supply a versioned holiday calendar rather than depending on the host's current date.

## Chapter 01 — Project, backend and database foundations

[01 — Project, backend and database foundations](chapters/01_FOUNDATIONS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH01-T01 | Fresh isolated environment runs documented setup | Migrations and startup succeed; API reaches expected database; no manual hidden step |
| CH01-T02 | Fixture loader targets production marker/credentials | Hard refusal before any mutation; no cleanup command can erase live data |
| CH01-T03 | Repeated fixture install in test | Deterministic IDs/scenarios or clean isolated reset; no duplicate financial/reputation rows |
| CH01-T04 | Transaction fails after first write | Business/audit/outbox writes roll back together; no partial state |
| CH01-T05 | Inspect built client bundle and logs | No database/service/storage signing secret or private evidence body |
| CH01-T06 | Migration applied to representative prior schema | Data preserved; compatibility/rollback procedure demonstrated without dropping business records |
| CH01-T07 | Date-only, timestamp and SGD examples serialized | Precision/currency preserved; no timezone-induced day shift or floating-point cent error |

## Chapter 02 — Login, accounts and permissions

[02 — Login, accounts and permissions](chapters/02_LOGIN_AND_ACCESS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH02-T01 | Valid, invalid, expired and replayed login/invite | Correct session/access outcome; no role escalation or leaked account existence |
| CH02-T02 | CM requests MCST payment endpoint | Denied server-side even with edited payload/button/role cookie |
| CH02-T03 | Two MCST title variants / two CM block labels | Same-role permissions equal; named actor and estate context preserved |
| CH02-T04 | User changes URL to another estate/file | No data/count/error leakage; authorization reapplied |
| CH02-T05 | MCST account is named subject in a report | Report excluded despite broad estate role; uninvolved authorised recipients still work |
| CH02-T06 | Membership revoked after mobile/web cached context | Next request/reconnect denies stale access and clears inaccessible cache; no claim of erasure while offline |
| CH02-T07 | Session expires during form / another user signs in | Draft not silently submitted or exposed to the new user; current actor validated |
| CH02-T08 | Unverified Contractor application completes login | Onboarding available; quote action remains blocked until verified |

## Chapter 03 — Workspace, records, audit and files

[03 — Workspace, records, audit and files](chapters/03_WORKSPACE_RECORDS_AND_FILES.md)

| Test ID | Scenario | Expected result |
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

## Chapter 04 — Tasks, notifications and clocks

[04 — Tasks, notifications and clocks](chapters/04_TASKS_NOTIFICATIONS_AND_CLOCKS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH04-T01 | Friday trigger with a configured Monday holiday | BD due date skips trigger/weekend/holiday; cutoff 23:59 SGT |
| CH04-T02 | Initial notice waits in outbox then is retried | First-issued absent until durable commit; one anchor/notice after recovery |
| CH04-T03 | User opens bell or adds generic comment | Task not completed/acknowledged; deadline not reset |
| CH04-T04 | Admin acknowledges unresolved item without next action/date | Refused with targeted field error; no item falling out of follow-up |
| CH04-T05 | Worker crash after notice transaction commits | Retry does not duplicate bell/financial transition or shift anchor |
| CH04-T06 | Several equal-role users/new member/new device | Shared obligation one deadline; per-user reads; named actual responder preserved |
| CH04-T07 | Obsolete round timer wakes after response/cancellation | Stop guard prevents misleading notice; history retained |
| CH04-T08 | Phone clock/timezone changed, app offline at zero | Display refresh corrects offset; no client-triggered business transition |
| CH04-T09 | Confidential report subject/CM queries billing bell | No content, count or deep-link leak |
| CH04-T10 | Outage spans urgent reminders; Admin already acknowledged | No stale reminder burst; unresolved dated follow-up remains |

## Chapter 05 — Contractor verification

[05 — Contractor verification](chapters/05_CONTRACTOR_VERIFICATION.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH05-T01 | Logged-in unverified Contractor submits quote | Denied at API; profile/verification workflow still accessible |
| CH05-T02 | Upload evidence without Admin approval | No eligibility or verified badge granted |
| CH05-T03 | Optional versus required credential expires | Optional grey only; required scope restricted and Admin work review; no blanket job cancellation |
| CH05-T04 | Expiry date-only at 23:59 then next midnight | Correct Singapore boundary; explicit timestamp honored |
| CH05-T05 | Month-end reminder / record inside one-month window | Correct clamp/immediate alert without duplicate notices |
| CH05-T06 | Renewal races old expiry worker | Current verified version wins; no obsolete restriction |
| CH05-T07 | Fee restriction cleared while credential still invalid | Contractor remains blocked in affected scope |
| CH05-T08 | Masked CM/rival Contractor requests private evidence | No identity/document/contact leak through profile/file/bell/export |

## Chapter 06 — RFQ intake, AI assistance and urgency

[06 — RFQ intake, AI assistance and urgency](chapters/06_RFQ_INTAKE_AND_URGENCY.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH06-T01 | No photo, with/without explanation | Explanation permits manual route; missing conditional explanation rejected; video not required |
| CH06-T02 | AI invents quantity or returns after draft changed | Unsupported addition requires correction/review; no stale overwrite or auto-publication |
| CH06-T03 | Combined multi-trade versus separate toggle | One accountable bundle or correctly linked independent tickets; no forced split |
| CH06-T04 | No preference versus selected priority | Eligibility unchanged; weighting intent and provenance stored for later comparison |
| CH06-T05 | Publish late on 1 December; 0/2/3 distinct current offers | Admin check 3 Dec noon; alert only below 3; revisions do not inflate count |
| CH06-T06 | Material edit/ordinary typo | Correct scope-version/reconfirmation effects; no sourcing-anchor reset on edit |
| CH06-T07 | Urgent unacknowledged across all checkpoints | Correct 15m/1h/3h/10h/17h sequence; no hourly loop or duplicate cases |
| CH06-T08 | Admin reads, then explicitly acknowledges urgent item | Read does not stop; acknowledgment stops repeats and retains unresolved next date |
| CH06-T09 | Contractor previews RFQ before approved reveal | No exact estate identity through text/media/API/bell; material safety facts preserved |
| CH06-T10 | Duplicate publish or offline publish attempt | One round/event; offline remains draft, never an automatic later publication |

## Chapter 07 — Quotes, shared Q&A and site visits

[07 — Quotes, shared Q&A and site visits](chapters/07_QUOTES_QA_AND_VISITS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH07-T01 | Each compulsory declaration/follow-up omitted or Other blank | Submission rejected at API with relevant field error; optional PDF never required |
| CH07-T02 | GST Yes/No and exclusions | Final amount unchanged by hidden GST addition; excluded cost warnings accurate |
| CH07-T03 | Warranty No / equipment not flagged | No fictitious duration/equipment compulsory field |
| CH07-T04 | Pre-quote Q&A versus pre-quote visit request | Q&A allowed; visit denied until initial quote; CM decline ends response duty |
| CH07-T05 | Shared answer contains rival price/questioner identity | Not exposed to peers; approved factual answer and versions retained |
| CH07-T06 | Material answer makes three offers outdated | Reconfirmation required; valid count/reminder pause reflects actual current coverage |
| CH07-T07 | Expiry worker delayed / selected hold reaches old expiry | Unselected expired offer blocked synchronously; held selection remains valid |
| CH07-T08 | Re-quote ping plus automatic notice retried | Correct authorized recipient; no clock reset or duplicate quotation |
| CH07-T09 | Visit-derived revision without reason / selection racing revision | Required reason; one exact valid version wins, never unseen replacement |
| CH07-T10 | Unknown duration selected | Prominent caution/reason shown; no invented readiness restriction |

## Chapter 08 — Comparison, selection and approval

[08 — Comparison, selection and approval](chapters/08_COMPARISON_SELECTION_AND_APPROVAL.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH08-T01 | Compare expired, superseded, ineligible and unreconfirmed offers | Correct included set/count/highest/average; snapshot reproducible |
| CH08-T02 | Select with one/two offers | Warning/rationale; selection allowed, T17 not prematurely active |
| CH08-T03 | Three -> two -> three across holiday and repeated pauses | Correct remaining time; sourcing attention; no timer reset/duplicate reminder |
| CH08-T04 | Threshold equality / just above | Equality authorises via CM; above requires MCST; amount includes GST |
| CH08-T05 | Two actors select different Contractors at once | One exact version commits; other receives current-context conflict |
| CH08-T06 | Selected quote reaches former expiry during MCST review | Terms remain held; no reopened quoting/expiry rejection |
| CH08-T07 | MCST rejects then reselects/reopens | Same ticket and immutable prior history; only valid offers reused |
| CH08-T08 | MCST Select and approve above threshold | Required Yes I know acknowledgement and one combined decision; Back does nothing |
| CH08-T09 | Authorised job attempts Contractor replacement | Ordinary reselection denied; linked new ticket route |
| CH08-T10 | Concealed CM views passport/AI/history | Aliases consistent; no identity clues or privileged evidence leaked |

## Chapter 09 — Start, progress and schedules

[09 — Start, progress and schedules](chapters/09_START_PROGRESS_AND_SCHEDULE.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH09-T01 | Start with only date, only time, or unknown without reason | Disabled in UI and rejected by API; valid complete alternative succeeds |
| CH09-T02 | Unknown estimate crosses weekend | Exactly +24h, not business days; Contractor cannot self-extend/reset |
| CH09-T03 | Admin extends after estimate deadline missed | Required reason/new due; missed event retained |
| CH09-T04 | Scheduled Start not recorded then later recorded | Truthful Admin/+24h notifications; obsolete notice suppressed |
| CH09-T05 | Completion before target / after target before estate reminder | No lateness in first case; retain real lateness but suppress obsolete reminder in second |
| CH09-T06 | Revised date version changes before Okay | Stale acceptance blocked; original target remains until valid acceptance |
| CH09-T07 | Okay lateness notice versus Okay date proposal | Acknowledgment does not extend target; proposal acceptance does |
| CH09-T08 | CM has not supplied keys | Next actor explicitly CM; no automatic contractor fault/penalty or extension |
| CH09-T09 | Cancel and Start concurrently | One consistent authorised outcome; no work restoration through stale command |
| CH09-T10 | Admin review remains unresolved | E2 retains actual next actor/date; no auto-W2 or unsupported replacement |

## Chapter 10 — Variations and return routing

[10 — Variations and return routing](chapters/10_VARIATIONS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH10-T01 | Contractor has not confirmed price/timing | Approver cannot approve unspecified terms; next actor Contractor |
| CH10-T02 | At threshold / increased beyond MCST authority | Correct CM/MCST path; no double approval or routine Admin gate |
| CH10-T03 | Rejection has no reason; withdrawal has no note | Rejection refused; withdrawal permitted and audited |
| CH10-T04 | Rejected before Start | Return W1, not W2 |
| CH10-T05 | Rejected change leaves work infeasible | E2 with real Admin task; no automatic continuation |
| CH10-T06 | Approved change while invoice discrepancy/review pending | Correct R3/R1 routing; affected acceptance/version checked |
| CH10-T07 | Approval races new proposal/cancellation | Stale decision cannot approve unseen terms or revive cancelled work |
| CH10-T08 | Optional photo added during variation review | No unnecessary approval conflict when terms unchanged |
| CH10-T09 | User dismisses outcome toast then opens history | Full decision/reason/actor/date/time retained |
| CH10-T10 | Several small price increases | Authorised totals correct; chapter 17 warning evaluates cumulative growth, not only latest delta |

## Chapter 11 — Completion, invoice and inspections

[11 — Completion, invoice and inspections](chapters/11_COMPLETION_AND_INSPECTION.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH11-T01 | Completion without invoice / without photos | No invoice -> refused; invoice + declaration without photos -> permitted |
| CH11-T02 | File upload succeeds but user never slides submit | No completion declaration/CM inspection task |
| CH11-T03 | Unsatisfactory work with positive checkbox unchecked | Valid negative route; no forced satisfactory declaration |
| CH11-T04 | Failed 4 Nov inspection; repaired 8 Nov | New round 2 inspection and fresh T08; old failed result cannot satisfy it |
| CH11-T05 | Round 2 already accepted; support verification runs | Reuse exact successful acceptance, no duplicate inspection |
| CH11-T06 | Invoice-only correction versus new physical work | Acceptance retained only for unchanged accepted work; new physical work reviewed again |
| CH11-T07 | Invoice differs by any amount | Confirmation blocked; MCST/Admin notified; explanation view alone does not unblock |
| CH11-T08 | Contractor double-submits completion after timeout | One declaration/package/round; original immutable |
| CH11-T09 | New remedy arrives while CM submits old review | Stale review refused; current round and originating findings shown |
| CH11-T10 | Review result recorded but optional rating unfinished | No invented score; operational and rating facts remain separate per gated questionnaire policy |

## Chapter 12 — Payments, receipts and closure

[12 — Payments, receipts and closure](chapters/12_PAYMENTS_AND_CLOSURE.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH12-T01 | CM or stale MCST confirms/records payment | CM denied; stale amount/version requires review |
| CH12-T02 | Payment Sent without ready completed-transfer proof | Refused; upload-only/provisional bank instruction insufficient |
| CH12-T03 | Partial payment without rationale then valid rationale | Conditional field enforced; Contractor sees reason and accurate remaining balance |
| CH12-T04 | Transfer precedes report/notice by many days | Seven days from first issued notice; immediate actual-date confirmation allowed |
| CH12-T05 | Reminder/read/retry/new device | No reset of first-issued receipt deadline |
| CH12-T06 | Two instalments, one disputed and one silent | Per-transfer results; disputed one not deemed; total/remaining balance correct |
| CH12-T07 | Assumption worker races Payment Issue/actual receipt | One consistent receipt result, no double-count; post-assumption issue can still be raised |
| CH12-T08 | Response lost after Payment Sent | One transfer/notice/anchor via same-operation recovery |
| CH12-T09 | Full settlement with case unresolved, then case resolved | No premature closure; closes automatically on final valid gate |
| CH12-T10 | Zero payable / cancelled settlement / late aftercare | No fake transfer, duplicate confirmation or wrongful Closed state |
| CH12-T11 | MCST progress reply says awaiting paperwork | No payment recorded; no erased balance/chase; dated follow-up remains |
| CH12-T12 | Contractor opens after T+7 fallback | Popup and labelled assumed record; no separate internal-process page |

## Chapter 13 — Contractor QuoteFix billing

[13 — Contractor QuoteFix billing](chapters/13_QUOTEFIX_BILLING.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH13-T01 | Invoice 1,200, MCST paid only 600 | Exactly 48 + 48 at confirmation; correct +3 BD due |
| CH13-T02 | Duplicate confirmation/event replay | One assessment each; no aftercare/backtrack duplication |
| CH13-T03 | 1,000 -> 1,200 with original paid/unpaid | Total 96; incremental 16; original deadline preserved |
| CH13-T04 | Downward correction after payment | Correct refund obligation; no fictitious execution |
| CH13-T05 | Overdue fees with authorised job and unselected offer | Existing job completable; new quote/unselected selection restricted |
| CH13-T06 | Fee proof uploaded, Admin has not checked | Evidence task, not automatic paid or proven nonpayment |
| CH13-T07 | Fee paid while credential invalid | Only fee restriction lifted |
| CH13-T08 | CM/MCST requests account/bell/export data | No fee/balance leak |
| CH13-T09 | Fractional-cent basis | Matches the owner's 18 October independent half-up-cent rule, including zero/small/maximum exact amounts |
| CH13-T10 | Fee unpaid when ordinary closure gates pass | Job closure/Feedback independent |

## Chapter 14 — Cancellation and Admin Support

[14 — Cancellation and Admin Support](chapters/14_CANCELLATION_AND_ADMIN_SUPPORT.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH14-T01 | Cancel before approval/after authority | Immediate with reason; no Admin prerequisite |
| CH14-T02 | Okay without declaration | Refused; proper explicit acceptance logged; existing debts retained |
| CH14-T03 | Delayed/failed cancellation notice | Seven days from first durable issue; reads/retries unchanged |
| CH14-T04 | Timely claim and later proof; draft only at cutoff | Claim continues; draft not submission; no inferred waiver |
| CH14-T05 | +5 BD falls beyond claim cutoff | Admin at earlier cutoff-minus-24h, no extension |
| CH14-T06 | Evidence uploaded in D3 | D2 Admin review only, no automatic D4 |
| CH14-T07 | Party ignores final resolution | Execution proceeds, no fabricated acknowledgment |
| CH14-T08 | New remedy after failed inspection | Fresh R1; same successful corrected round reused only for matching obligation |
| CH14-T09 | Reported subject has MCST access | Excluded on every surface; authorised uninvolved handling preserved |
| CH14-T10 | Backtrack paid/completed/cancelled job | Financial clocks/history preserved; targeted task invalidation |
| CH14-T11 | Zero/already-confirmed settlement | No duplicate confirmation/fees/transfer; Cancelled retained |
| CH14-T12 | Admin contact does not resolve case | Concrete next actor/date; no automatic resolution/archive |
| CH14-T13 | Admin attempts same-ticket Contractor replacement after authority | Linked new ticket required |

## Chapter 15 — Durability Feedback and aftercare

[15 — Durability Feedback and aftercare](chapters/15_FEEDBACK_AND_AFTERCARE.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH15-T01 | Only partial payment received | No premature full-settlement Feedback anchor |
| CH15-T02 | Actual versus assumed full receipt | Correct different dates; invoice fee date never substituted |
| CH15-T03 | Date-only and late-discovered due task | 09:00 SGT / immediate issue with fair 2/5-BD response window |
| CH15-T04 | Before due, at due, after ticket Closed | No early button; due action visible; closure unchanged |
| CH15-T05 | Negative or positive stars without observation | Both rejected; guidance example not treated as real finding |
| CH15-T06 | No response versus Unable to assess | Correct chase versus stop with no fabricated score |
| CH15-T07 | Low rating without aftercare request | No automatic repair case/liability/second invoice |
| CH15-T08 | Physical aftercare repair submitted | New inspection; same successful round reused; original fees not repeated |
| CH15-T09 | No-work cancellation versus performed zero outcome | Correct exclusion/approved anchor; no fake transfer |
| CH15-T10 | Duplicate assessment or corrected anchor | No duplicate job/assessment; history/true observation preserved |

## Chapter 16 — Reputation, passport and AI comparison

[16 — Reputation, passport and AI comparison](chapters/16_REPUTATION_PASSPORT_AND_AI.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH16-T01 | External references plus QuoteFix jobs | Source counts correct; external work never labelled QuoteFix-observed |
| CH16-T02 | Fewer than five verified references/missing rubric | No padded data/invented number; approved missing-data policy required |
| CH16-T03 | No preference | Pure and adjusted scores identical |
| CH16-T04 | Priority with strong/weak corresponding component | Reproducible normalization; no global-score mutation |
| CH16-T05 | Pending/unanswered/Unable to assess durability | No clean-repair points; correct approved denominator |
| CH16-T06 | Several remedy reports on one job | One job-level unit; all rounds retained |
| CH16-T07 | Contractor reply/Admin void | Correct publication gate/private reason/audit and permitted score effects |
| CH16-T08 | Concealed CM accesses AI/passport/citations | No identity clues/private contacts/restricted allegations |
| CH16-T09 | AI fails or returns stale result | Manual factual comparison survives; no stale overwrite |
| CH16-T10 | Current price/availability differs from historical ratings | Verdict uses current facts, no false price/urgency inference |
| CH16-T11 | New formula version | Inputs/results reproducible; historical selection snapshot unchanged |
| CH16-T12 | Approved refresh/redaction and remaining deferred metrics | Evidence changes recalculate; redaction audited; no periodic job/public exclusion wording or unapproved percentages |

## Chapter 17 — MCST integrity and warning system

[17 — MCST integrity and warning system](chapters/17_MCST_INTEGRITY.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH17-T01 | First/current quote differ within same vs different material scope | Correct baseline; scope/terms disclosed; no false like-for-like claim |
| CH17-T02 | Price percentage threshold with small SGD difference | No extra SGD floor; exact configured rule |
| CH17-T03 | Several small variations/current proposal | Cumulative selected-baseline growth; no double counting or authorisation of pending scope |
| CH17-T04 | Low quote count at selection | Early nomination remains allowed with a warning; exact MCST clearance precedes work authority; no duplicate sourcing timer |
| CH17-T05 | Estate settings changed after RFQ published | New round only; old alert/decision version intact |
| CH17-T06 | Ticket override after bids without reason/checkbox | Refused; valid override affects later events only |
| CH17-T07 | Notification delayed until after settings change | Event-time settings version used |
| CH17-T08 | Below-threshold CM selection triggers warning | CM pre-caution, both MCST/Admin notice; exact MCST clearance required before work authorisation |
| CH17-T09 | Several warnings on one decision | One grouped user card/notice as designed; distinct audit evidence |
| CH17-T10 | Confidential subject/protected access evidence | No allegation/private-data leak; authorised view not labelled misconduct |
| CH17-T11 | Zero/missing comparison basis | No division error/fabricated percentage; gated handling explicit |
| CH17-T12 | Warning without evidence-backed conclusion | No automatic misconduct finding or adverse reputation; owner-approved variation hold persists until exact clearance |

## Chapter 18 — Role dashboards, analytics and exports

[18 — Role dashboards, analytics and exports](chapters/18_DASHBOARDS_AND_EXPORTS.md)

| Test ID | Scenario | Expected result |
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

## Chapter 19 — Web release, security and operations

[19 — Web release, security and operations](chapters/19_RELEASE_AND_OPERATIONS.md)

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| CH19-T01 | All 14 complete journeys above | Expected facts/versions/next actors/balances/bells and outcomes recorded |
| CH19-T02 | Kill worker/API at each transaction boundary | No partial approval/financial effect; durable work recovers |
| CH19-T03 | Timer outage across receipt/claim/urgent deadlines | Correct guarded effects; no fabricated silence before first notice or stale reminder burst |
| CH19-T04 | Restore backup with files | Records/evidence/allocations agree; no duplicated assessments or missing critical files |
| CH19-T05 | Upgrade/rollback with older supported client | Compatible commands/reads; no data-destructive rollback |
| CH19-T06 | Cross-estate/subject/rival/file/export attack matrix | No unauthorized data or inference leak |
| CH19-T07 | AI/auth/storage provider unavailable | Honest recoverable UI; manual route where applicable; no false submitted/verified state |
| CH19-T08 | Representative upload/timer/export concurrency | Meets recorded targets without correctness/privacy failure |
| CH19-T09 | Production fixture/reset attempt | Refused before mutation; genuine external/live evidence protected |
| CH19-T10 | Mobile-width/assistive-technology role walkthrough | All required actions discoverable and usable; slide-equivalent deliberate control works |
| CH19-T11 | Unresolved G gate in launch dependency | Release gate fails or explicitly documented owner scope change; no silent default |
| CH19-T12 | Operational failure lacks next actor/runbook | Gate fails until accountable monitoring/response/restore procedure exists |

## Chapter 20 — Later iOS and Android clients

[20 — Later iOS and Android clients](chapters/20_NATIVE_MOBILE.md)

| Test ID | Scenario | Expected result |
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

## Whole-system acceptance

Chapter 19 defines fourteen multi-role journeys plus recovery/privacy/load/release gates. Add all applicable routes from [Routing coverage](ROUTING_COVERAGE.md) to the executable trace when implementing commands. Document tables are not executable cases or a release sign-off.
