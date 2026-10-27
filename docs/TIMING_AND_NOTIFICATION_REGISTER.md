# QuoteFix timing and notification register

**14 October 2026 construction update:** G03 (implementation-plan gate, not the historical section-12 audit numbering) is resolved: request an assigned Contractor start-date/time proposal, then CM/MCST exact acceptance, using the existing T22 +2 BD actor / +5 BD Admin sequence from first successfully issued notice. This creates a response duty, not an assumed physical start deadline. T20/T21/T23 and variation/start-request T22/T07 are locally implemented; [build evidence](implementation/CHAPTERS_09_10_BUILD.md) distinguishes later chapter and release bindings. Other open timing policies remain open.

**Updated:** 12 October 2026 · **Lifecycle baseline:** 2026-10-12-v14 · **Purpose:** one reference for what starts each clock, what happens while it runs, and what happens when it ends.

This records the approved blueprint; it is not a deployed scheduler. The user's latest decisions govern. Notification wording marked **Draft** is proposed copy, not an extra feature approval. The two payment follow-up countdowns and the T+7D payment notice are approved wording.

**Latest scheduling answers: [section 15](#15-confirmed-scheduling-precision--12-october-v14).**

**Current: [current key days and Admin coverage](#14-v13-key-days-and-admin-alert-coverage--12-october-2026).** Sourcing, temporary estimates, ordinary unanswered tasks and Admin queue reminders are now approved. Section 12 retains the earlier audit and its original proposals for traceability; section 14 supersedes those old gaps/defaults. V13 resolves O35/O36: third-quote selection clock, pause/resume below three, +24h completion check, revised-date acceptance and seven-hour urgent repetition. Archive remains KIV.

## 1. How to read the clocks

- **There is no single universal T.** Every clock has its own named trigger. Invoice confirmation, a payment notification, a cancellation notification and a Feedback due date are different events.
- **Business days:** Singapore weekdays excluding Singapore public holidays. Exclude the trigger date; the agreed day-based cutoff is 23:59 Singapore time. For example, with no intervening public holiday, a Friday trigger reaches business day 1 on Monday, day 2 on Tuesday, and day 3 on Wednesday. A live implementation needs the maintained holiday calendar; this example is not a holiday lookup.
- **Calendar days:** include weekends and public holidays. The two seven-day windows end at the same Singapore local time seven calendar dates after their first issued notification.
- **Thirty days is not one calendar month.** Durability Feedback uses 30 calendar days. Credential reminders use one calendar month before the recorded expiry.
- **First issued notification:** the first time the notice is durably available in the relevant in-app bell. It is not when the user reads it. Failed notice creation cannot start either seven-day window. Reminders, retries and extra account recipients do not restart that window.
- **Act as soon as ready.** A reminder at day 2 does not require anybody to wait two days before approving, inspecting, replying or paying.
- **Channels:** in-app bell and contextual task only. No launch email or WhatsApp. Notify the responsible/relevant authorised party, not all four roles for every event.
- **Dates in UI:** calculate in Asia/Singapore. The approved payment countdown copy below uses `{date/time}` without repeatedly appending “SGT”.

### At a glance

| ID | Starts when | Wait / progression | What happens at the threshold |
| --- | --- | --- | --- |
| T01 | MCST confirms invoice/settlement | Immediately; +1 business day; +3 business days; then Admin-set | MCST gets payment task; missing update is chased; Admin follows up. No bank-payment deadline imposed. |
| T02 | First payment notification for one recorded transfer | 7 calendar days | With no receipt response or Payment Issue, label that transfer **Assumed received**. |
| T03 | Full actual/assumed settlement, or approved zero/performed-work exception | 30 calendar days | Notify CM and reveal **Give feedback**. |
| T04 | The durability Feedback task becomes due | Immediately; +2 business days; +5 business days; then Admin-set | Notify CM; remind CM; alert Admin if unanswered. |
| T05 | MCST confirms final invoice/settlement | 3 business days | QuoteFix fees become overdue if not fully verified paid; Contractor quoting restrictions apply. |
| T06 | An authorised financial adjustment is confirmed | 3 business days for a newly assessed fee difference | Additional unpaid difference becomes overdue; the original fee deadline is preserved. |
| T07 | A required MCST approval becomes actionable | +2 business days; +5 business days | Remind MCST; alert Admin if still awaiting a decision. |
| T08 | Initial completion or a new remedy round is submitted for inspection | +2 business days; +5 business days | Remind CM; alert Admin if that inspection is unanswered. Each repaired round needs its own inspection. |
| T09 | An ordinary dispute response becomes actionable | +2 business days; +5 business days | Remind the party owing a response; alert Admin. Silence never decides the case. |
| T10 | First cancellation notification to the selected Contractor | 7 calendar days; Contractor +2 BD in-window; Admin earlier of +5 BD or cutoff minus 24 hours | Close the ordinary additional-claim window; keep timely claims and existing debts alive. |
| T11 | Admin records a next follow-up date/time | Until that saved time | Notify Admin to perform the named follow-up. |
| T12 | Admin records a credential expiry | One calendar month before expiry; then expiry itself | Notify Admin to review renewal; at expiry grey the badge and apply the appropriate eligibility rule. |
| T13 | Contractor submits a quote with an expiry | Until its recorded expiry | An unselected expired quote becomes unselectable; RFQ stays open. |
| T14 | Parties agree a future start / Contractor supplies completion estimate | Until the recorded date/time | Display schedule/estimate. Scheduled-start attention T23; completion T20; temporary unknown estimate T21. |
| T15 | An urgent RFQ is published | Immediately; T19 while unacknowledged; then Admin-set updates | Notify Admin for offline coordination; no invented resolution SLA. |
| T16 | RFQ / explicit new quotation round is published | Second following calendar date at 12 noon Singapore time | Fewer than 3 distinct eligible contractors with current selectable quotes -> Admin sourcing follow-up. |
| T17 | Third distinct eligible contractor has a current valid selectable quote | +5 BD actor; +10 BD Admin; pause below 3, resume remaining time | Chase actual selection owner only with adequate current quote coverage. Early selection with fewer quotes still allowed. |
| T18 | Ordinary Admin attention item is issued and unacknowledged | +1 business day | Re-alert Admin; acknowledgment of an unresolved item retains a dated next action. |
| T19 | First urgent Admin notice is issued | +15min, +1h, +3h; then every 7h (+10h, +17h, +24h...) | Re-alert while unacknowledged; after acknowledgment use Admin-set follow-up. |
| T20 | Completion target passes without recorded completion | Admin immediately; both relevant CM/MCST +24 elapsed hours only if still outstanding | Show hours overdue and Okay / Admin Intervention; acceptance of a revised target is separately audited. |
| T21 | Actual Start uses Unable to estimate plus reason | 24 elapsed hours | Completion date/time must be supplied; missed estimate deadline alerts Admin immediately. Only Admin grants reasoned extension with new deadline. |
| T22 | Ordinary newly covered response/decision becomes actionable | +2 business days actor; +5 business days Admin | Applies to Q&A, visit decisions, variation terms/CM decisions and invoice correction; no duplicate specific timer. |
| T23 | Agreed scheduled start arrives with no Start recorded | Admin immediately; relevant CM/MCST +24 elapsed hours if still unrecorded | Start has not been recorded. Stop obsolete reminders on Start/cancellation/authorised supersession. |

The following sections specify recipients, messages, stop conditions and exceptions.

## 2. MCST payment follow-up — T01

**Trigger:** the exact reconciled invoice/settlement is confirmed. MCST now has an actionable payment obligation. An existing confirmed debt on cancellation also retains its payment task; cancellation does not create a second invoice or reset existing clocks.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| Immediately | MCST | **Draft:** “Invoice confirmed. Arrange payment to {Contractor}. After completing the transfer, upload proof and select Payment Sent.” Link invoice, accepted work and relevant approvals. | Payment task is available immediately. |
| During the wait | MCST | **Approved:** “QuoteFix will follow up on this payment in {days}d {hours}h — {date/time}.” | Countdown to a support follow-up, not a bank-payment deadline. |
| During the wait | Admin | **Approved:** “Follow up with MCST about the missing payment update in {days}d {hours}h — {date/time}.” | Names the actual Admin task. |
| +1 business day, if no payment record or meaningful update | MCST and Admin | **Draft, MCST:** “Please update the payment progress for {ticket}. If already paid, upload the transfer proof.” **Draft, Admin:** “No payment record or progress update for {ticket}. Follow up with MCST.” | Reuse/create the contextual payment support task. Admin establishes whether bank payment happened. |
| +3 business days from the same confirmation, if still unresolved | Admin | **Draft:** “Payment follow-up remains unresolved for {ticket}. Contact MCST and record the next update.” | Escalate the existing task; this is day 3 from the original trigger, not three extra days after the first reminder. |
| Admin's next follow-up time | Admin | **Draft:** “Follow up with MCST on {ticket}: {outstanding item}.” | Record contact/outcome and the next concrete follow-up if unresolved. |

**Stop/change:** when MCST supplies a valid completed-transfer record, stop the obsolete missing-record reminders and start T02 for that transfer. Retain real outstanding-balance tasks. An agreed partial payment does not settle the remainder. If MCST replies that payment has not yet been made, the reply is information, not payment; keep the appropriate follow-up. Do not invent a new countdown by resetting the original confirmation date.

**No automatic bank-payment penalty, ticket cancellation, or payment extension.** Missing app data does not prove money was not sent. A partial-payment rationale is compulsory; an expected payment date is not forced when genuinely unknown.

## 3. Contractor receipt response — T02

**Trigger:** MCST records a completed transfer with compulsory proof, amount and actual transfer date; QuoteFix issues the first Contractor payment notice. Keep transfer date, report timestamp and notice timestamp separate, including late entries.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| First notice | Contractor | Show amount, transfer details and **Received payment / Payment Issue**. Existing footer: “Please confirm receipt of payment or report an issue by {date}. If there is no response by then, QuoteFix will record SGD {amount} as received on that date.” | Start this transfer's seven-calendar-day response window. |
| Before expiry | Contractor | The deadline and actions remain visible. | Contractor may respond immediately. No separate day-2/day-5 chasing schedule is approved for this clock. |
| Actual receipt confirmed | Relevant payment record / authorised viewers | Record actual amount/date and confirmation actor/time. | Stop that transfer's fallback. Use actual receipt, not notification date, for settlement accounting. |
| Payment Issue submitted | Admin and the party assigned the next action | **Draft:** “Payment Issue reported for SGD {amount} on {ticket}. Review the payment details.” | Stop automatic receipt for the disputed transfer; use the linked support case. No fixed automatic resolution deadline. |
| +7 calendar days with no response | Internal process | Record **Assumed received** for this transfer only. | It is a labelled assumption, not bank verification. Do not erase another unpaid balance. |
| Contractor next opens after actual deeming | Contractor | **Approved notice:** “Payment recorded automatically. No payment response was received by {deadline}, so QuoteFix recorded SGD {amount} as received on {date}, under T+7D. If this is incorrect, select Payment Issue.” **Understood / Payment Issue**. | Understood dismisses only; it does not assert actual receipt. |

**Guards:** do not deem a transfer already confirmed, disputed, invalidated or corrected out of eligibility. An Admin correction preserves the original events. Full settlement, not a single partial transfer, is required for T03. Fees use T05 independently.

## 4. Durability Feedback — T03 and T04

### T03 — the 30-calendar-day observation period

**Trigger:** the date full payable money was actually received or became fully covered by labelled assumed receipts. With multiple transfers, use the event/date establishing full settlement, not the first instalment.

For a confirmed zero-payable outcome with performed work, use the already-confirmed zero outcome. Performed-work cancellation follows the existing settlement/zero exception. Cancellation with no work performed does not receive workmanship/durability feedback.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| At scheduling | No action required | Optionally show “Feedback on {date}” in task/history context. | No Give feedback action before due. Job may already be Closed. |
| During 30 days | None from this clock | No approved interim reminders. | This is an observation period, not a closure blocker. |
| On the date 30 calendar days have elapsed | CM | **Draft:** “Feedback: how has the work on {ticket} held up? Submit your durability assessment.” Reveal **Give feedback**. | Start the actionable Feedback task and T04. |

Actual receipt may be reported later than it occurred. Preserve the true full-receipt date. If that makes Feedback already due, immediate notification is the recommended scheduling behavior, rather than another 30-day wait; the date-only dispatch detail is listed in section 11.

### T04 — chase missing Feedback, approved in v10

**Trigger:** the Feedback task becomes due and actionable. This is a different T from the payment/settlement event above.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| Due now | CM | The T03 Feedback notice; do not send a duplicate notice from T04. | One task, one initial notification. |
| +2 business days unanswered | CM | **Draft:** “Reminder: please complete the durability feedback for {ticket}. If the work cannot be assessed, select Unable to assess.” | Keep the same task. |
| +5 business days unanswered | Admin | **Draft:** “Durability feedback for {ticket} remains unanswered. Follow up with the CM.” | Admin records the next contact/follow-up time. |
| Subsequent Admin-set time | Admin | **Draft:** “Follow up with CM on the outstanding durability feedback for {ticket}.” | Continue until a submission or explicit recorded outcome. |

**Stop:** CM submits 1–3 stars with required observation, 4–5 stars with required observation, or **Unable to assess**. Silence never becomes positive feedback. A negative rating does not automatically create a repair claim. Publication/reply moderation remains separate from completing the Feedback task.

## 5. Contractor pays QuoteFix — T05 and T06

**Visibility:** Contractor account billing and separate internal Admin collection only. No ticket fee control or fee notice for CM/MCST.

### T05 — original fee assessment

**Trigger:** MCST confirms the final invoice or cancellation settlement; applicable explicit Admin financial override is separately attributed. Assess 4% platform + 4% lead on that final confirmed payable total, including the approved GST/variation treatment.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| At assessment | Contractor | **Draft:** “QuoteFix fees assessed: SGD {platform} + SGD {lead}. Pay SGD {total} by {date/time}. View fee statement.” | Three-business-day deadline starts, excluding the trigger date. |
| During the window | Contractor | Billing shows amount, due date and payment evidence action. | No extra intermediate reminder interval is approved. |
| Contractor supplies fee-payment evidence | Admin | **Draft:** “Verify QuoteFix fee receipt of SGD {amount} for {Contractor}.” | Admin matches the actual received payment; evidence upload alone is not settlement. |
| Deadline passes without fully verified settlement | Contractor and Admin | **Draft, Contractor:** “QuoteFix fees remain outstanding. New quoting is restricted; existing jobs can continue.” **Draft, Admin:** “Review overdue fees/payment evidence for {Contractor}.” | Block new quotes and selection of existing unselected offers. Existing selected/authorised work continues. |
| Admin verifies full payment | Contractor | **Draft:** “QuoteFix fee payment confirmed. The fee restriction has been removed.” | Remove only the fee restriction; preserve other valid holds. |

Zero assessed fees need no payment. Contractor receipt of MCST money does not start or postpone this fee deadline. A confirmed SGD 1,200 invoice assesses SGD 48 + SGD 48 even when MCST has paid only SGD 600.

### T06 — authorised fee correction, approved in v10

**Trigger:** an authorised post-confirmation adjustment changes the fee assessment. Preserve the original charge/deadline and append the adjustment.

- **Increase:** a newly assessed unpaid difference gets its own three-business-day deadline from adjustment confirmation. Notify Contractor with the old total, revised total, amounts already paid and the exact remaining difference. **Draft:** “Fee assessment updated to SGD {revised_total}. An additional SGD {difference} is due by {date/time}. Previous payments remain credited.”
- **At that deadline:** apply the existing fee-restriction rule to any genuinely unpaid difference. An older overdue fee is not granted more time by this adjustment.
- **Reduction:** reduce unpaid fees first. If more was already paid than is now owed, Admin records the refund actually made. **Draft:** “Your fee assessment has been reduced. SGD {refund} is to be refunded.” After execution: “Refund of SGD {amount} recorded on {date}.”
- **Refund timing:** no fixed number of days or automatic bank transfer has been approved. Keep an explicit Admin refund task and recorded follow-up, not a fabricated refund completion.

Example: old fees SGD 80, revised fees SGD 96, SGD 80 already paid -> SGD 16 remains. This is reconciliation to SGD 96, not SGD 96 plus a new surcharge.

## 6. Approvals, inspections and disputes — T07, T08, T09

These share the approved **two-business-day reminder / five-business-day Admin alert** pattern. Their trigger is the current actionable task, not RFQ creation. A new remedy creates a new inspection task; simply viewing, commenting or retrying a notification does not reset the same task's age.

| ID / context | Trigger and immediate recipient | +2 business days unanswered | +5 business days unanswered | What completes it |
| --- | --- | --- | --- | --- |
| T07: MCST approval | A selection, invoice or other required MCST decision is ready and its task/notice is issued. **Draft:** “{Decision} is ready for your review on {ticket}.” | MCST: **Draft:** “Reminder: review {decision} for {ticket}.” | Admin: **Draft:** “MCST's {decision} for {ticket} is still awaiting action. Follow up.” | Applicable approval/rejection or an explicitly recorded Admin override; not silence. |
| T08: CM inspection | Initial completion package OR completed remedy round is submitted and CM can inspect it. **Draft:** “Work is ready for inspection on {ticket}.” For a remedy: “The contractor has submitted the corrected work. Please inspect it again.” | CM: **Draft:** “Reminder: inspect the {initial/corrected} work for {ticket}.” | Admin: **Draft:** “CM inspection for {ticket}, round {round}, remains outstanding. Follow up.” | CM records Approve Works or Unsatisfactory work for that submitted round. Failure creates/continues the remedy task. |
| T09: ordinary dispute response | A specific concern/request is issued to the actual responding party. **Draft:** “Your response is needed on {ticket}: {concern}.” | That party: **Draft:** “Reminder: respond to {concern} on {ticket}.” | Admin: **Draft:** “No response to {concern} from {role}. Review and follow up.” | Required response received or a recorded Admin decision about next steps; no inferred guilt/acceptance. |

MCST roles have no extra peer-approval requirement. If MCST performs a CM-capability task, notify the actual responsible actor. The current diagrams expressly include selection/invoice review; use the same MCST-approval category for genuinely required approvals, not every message addressed to MCST. Evidence requests or remedy deadlines specifically set by Admin must name their own action and date; do not silently run several competing clocks for the same obligation.

### The 4 November / 8 November example

1. **4 November:** CM inspects round 1 and selects **Unsatisfactory work**. That inspection is a recorded failure, not an acceptance that can be reused.
2. Contractor remedies the fault. Keep **Pending: Contractor responds / to remedy the issue** until the remedy is submitted.
3. **8 November:** Contractor submits the corrected work as round 2. Notify CM immediately; show **Pending: CM reviews the work and invoice**. Start a fresh T08 for this round.
4. **CM must inspect again.** If satisfactory, record acceptance of round 2. If unsatisfactory, return to R2 for another remedy and another inspection on resubmission.
5. D8 may reuse the **successful round-2 acceptance** to satisfy the same support-case obligation. It cannot reuse round 1's failed inspection or acceptance from before later physical changes.

“No duplicate inspection” means no third inspection merely to tick the Admin case after the second inspection has already passed. It never means skipping inspection of corrected work. An invoice-only correction can reuse work acceptance only where the physical work/scope has not changed and that acceptance remains valid.

## 7. Cancellation claim window — T10

**Trigger:** first issued cancellation notification to the selected Contractor. Work cancellation itself is immediate, regardless of when this claim window ends. No selected Contractor means no Contractor-response clock.

| When | Recipient | Message / action | Result |
| --- | --- | --- | --- |
| First notice | Contractor | Show cancellation reason, **Okay / Admin Intervention**, and **Draft:** “Submit any additional claim by {date/time} — {days}d {hours}h remaining. Claims submitted in time will continue to be reviewed after that date.” | Start seven calendar days. Okay retains the explicit no-additional-claim declaration. |
| During window | Contractor | Show remaining time and exact cutoff. | Submit a claim before expiry; opening the form/saving a draft is not submission. |
| +2 business days, if still unanswered and window remains open | Contractor | **Draft:** “Please review the cancellation of {ticket}. Any additional claim must be submitted by {date/time}.” | Reminder does not extend cutoff. |
| Earlier of +5 business days or 24 hours before cutoff, if still unanswered | Admin | **Draft:** “Contractor has not responded to cancellation of {ticket}. Claim window ends {date/time}.” | Approved v11: follow up before cutoff using the earlier of these two times. Do not extend seven calendar days. Suppress the alert if response/claim already submitted. |
| +7 calendar days | Internal process; Contractor cancellation details | **Draft:** “The additional-claim window ended on {date/time}. Claims submitted in time remain under review.” | Stop ordinary new additional claims and stale acknowledgment reminders. Keep the job Cancelled. |

**Stop/change early:** explicit Okay completes acknowledgment and removes the ordinary additional-claim route. Timely Admin Intervention submission creates a case; further evidence may be added to that existing case after cutoff. Existing confirmed debt always survives. Expiry is not fabricated acceptance/no-claims consent. Exceptional errors still have support, with any Admin override explicit and audited.

## 8. Human follow-ups and urgency — T11, T15

### T11 — a named Admin follow-up

**Trigger:** Admin records the next date/time for a specific unresolved item: payment progress, evidence, remedy, refund, unanswered Feedback, access or sourcing.

At that time, notify Admin: **Draft:** “Follow up on {ticket/case}: {specific outstanding action}.” If a different party has an actual task, notify that party according to that task; do not merely notify everybody. Record attempt, result, actual next actor and next date if unresolved. A missed update remains visible and alerts Admin under the approved follow-up rule. Repeated overdue-alert frequency is not yet specified.

This has no default T+N. Admin supplies the date. Setting or reaching it does not automatically solve, close, archive or pay anything.

### T15 — urgent RFQ

Immediately on publication, notify Admin: **Draft:** “Urgent RFQ: {issue} at {authorised location}. Coordinate attendance.” Admin records acknowledgment, attempts, ETA and next update. Inform CM of confirmed attendance or unresolved sourcing. Unacknowledged urgent notices re-alert at 15 minutes, 1 hour and 3 hours from first issuance, then every seven hours (T+10h, T+17h, T+24h...) under T19. Follow T11 for the actual next update after acknowledgment.

There is no approved automatic “Admin must resolve within X minutes” rule. Preserve verification and work-authorisation gates. Internal staffing/coverage information is not app copy or an advertised response guarantee.

## 9. Expiry and entered dates — T12, T13, T14

| Item | Trigger / timing | Recipient and proposed message | Consequence / limit |
| --- | --- | --- | --- |
| T12: credential renewal | One calendar month before Admin-recorded expiry. Clamp to the last valid day if the previous month has no matching day. A newly entered credential already within the window prompts immediate Admin notice. | Admin: **Draft:** “{Contractor}'s {credential} expires on {date}. Review renewal evidence.” Contractor is asked when Admin requests renewal evidence. | Reminder only; no premature expiry. No fabricated expiry where Admin left it absent. |
| T12: credential expires | Saved expiry passes without approved renewal. | Admin: **Draft:** “{Credential} has expired. Review renewal and affected eligibility/work.” Contractor sees the greyed badge and relevant eligibility notice. | Optional badge: grey only. Required credential: restrict relevant new eligibility and review affected active work. Do not automatically cancel all jobs. |
| T13: unselected quote expires | Its recorded expiry is reached. | Contractor: **Draft:** “Your quotation for {ticket} has expired. Update it if you wish to quote again.” Authorised comparison view shows Expired; CM/MCST may **Prompt Contractor to Re-Quote**. | Quote cannot be selected; history remains. The contractor-editable 30-calendar-day default is still a suggested default, not confirmed policy. No approved advance-reminder interval. |
| T13: already-selected valid quote | Original quotation expiry date later arrives while required MCST approval is pending. | No expiry-driven requote task. | Price/scope remain held under the agreed checkbox. The approval task continues under T07. |
| T14: scheduled start | Parties agree a future start date/time. | Show Scheduled: Contractor starts on {date/time}. | Missing Start at that time -> T23. Normal Start prerequisites remain; no automatic commencement or penalty. |
| T14: expected completion | Before Start, Contractor supplies Completed by date/time OR Unable to estimate yet plus reason. | Show the saved estimate/reason to relevant stakeholders. | An estimate is not actual completion. T20 now alerts Admin immediately on missed completion, then CM/MCST +1D; O35/O36 are resolved: +1D is 24 elapsed hours and the still-outstanding guard applies. Unknown completion after Start uses T21. No invented penalty or auto-completion. |
| Warranty term | Contractor offers 7 days / 14 days / 1 month / 3 months / 1 year / Other. | Show the accepted quote's warranty terms. | This is a contractual duration field, not the 30-day Feedback clock. Warranty start event, expiry reminders and any claim cutoff are not yet specified as an automatic QuoteFix workflow. |

**RFQs never expire.** Selection/cancellation and the agreed reselection/new-round rules move their workflow; there is no background RFQ T+N deadline.

## 10. Prevent confusing or duplicate timers

1. Use the specific rule for the task. Payment receipt uses T02; cancellation claims use T10. Do not add the ordinary T09 two/five-business-day pattern to those windows by accident.
2. Tie each timer to its source event/task/version and recipient role. Send each scheduled event once; record issuance/failure. Do not restart on refresh, reads or technical retry.
3. Before sending, recheck that the named action is still outstanding. Cancel obsolete reminders after action, cancellation, supersession or verified settlement as appropriate.
4. A new inspection round has a genuinely new task and timer. An unchanged existing task does not get more time from a generic comment.
5. Preserve both event time and recording time. Financial correction, Admin backtracking and late data entry do not erase prior notifications or silently restart original deadlines.
6. Keep concurrent clocks separate: invoice confirmation can start MCST follow-up and Contractor billing, while receipt later starts the Feedback observation period. They have different recipients and effects.
7. Display a concrete event: **Follow-up in**, **Receipt response by**, **Submit claim by**, **Feedback on**, or **Fees due**. Avoid a generic “Ticket expires in” label.

### Two calendar examples

- **Payment notice issued 2 November at 15:00; Contractor silent:** eligible transfer is assumed received on 9 November at 15:00. If that settles the entire amount, Feedback falls on 9 December. The fee clock still began on invoice confirmation.
- **Transfer actually received 2 November but entered/notified 15 November:** the response deadline is 22 November. If Contractor confirms actual full receipt on 2 November, Feedback falls on 2 December. If silent, assumed full receipt on 22 November gives Feedback on 22 December. There is no universal “payment + 37 days” rule.

## 11. Details not to invent before implementation

The main approved durations above are settled. These narrower scheduling/copy decisions remain visible rather than becoming silent requirements:

| Detail | Current boundary | Recommendation for later confirmation |
| --- | --- | --- |
| Date-only actual receipt and late-discovered Feedback | **Resolved v14:** dispatch at 09:00 Singapore time on the due date. If discovered already due, issue immediately. | Preserve true observation date; start existing 2/5-business-day response allowance from first issued notice. |
| Date-only credential / quote expiry boundary | **Resolved v14:** valid through the stated Singapore day; expire at the following midnight. | Honour explicit expiry timestamps and existing selected-quote holds. |
| Extra receipt/fee/quote advance reminders; repeated overdue Admin alerts | T18 ordinary queue and T19 urgent 15min/1h/3h are now approved. Extra advance notices and repetition beyond the named schedules remain open. | Keep the visible due date and Admin-set follow-up. O35-D now specifies urgent repetition every seven hours after the three-hour reminder; no indefinite ordinary daily loop is added. |
| Scheduled-start and warranty automation | **Scheduled Start resolved v14:** no Start record -> Admin at agreed time; relevant CM/MCST +24h if still unrecorded. Warranty and an unspecified start date remain open. | Do not infer that physical work has not begun from a missing update. No auto-start, penalty or invented commitment. |
| Archiving unresolved cases (D7/O29) | Owner expressly kept this KIV / unresolved on 11 October. | Do not implement archival. Retain the current unresolved-case follow-up model; revisit archive behavior only when the owner resumes it. |

These are scheduling gaps, not additional ticket phases. See [current decisions/questions](LIFECYCLE_REVIEW_QUESTIONS.md) and [lifecycle blueprint](TICKET_LIFECYCLE.md).

## 12. Key days and Admin alert coverage — 11 October audit

**V11 approval update:** the owner approved gap-coverage recommendations in principle, the pre-cutoff cancellation safeguard in full, and intentional exclusions. Point 6 timing defaults remain open pending the supplied examples. Read [v11 context and decisions](LIFECYCLE_REVIEW_2026-10-11_V11.md) before interpreting the earlier audit proposals. The live model now has 83 nodes including D9 offline coordination.

### 12.1 What the coverage labels mean

- **Yes — timed:** the approved plan names a timer that alerts Admin automatically.
- **Yes — event:** a reported event brings Admin in immediately. A later reminder still depends on a saved follow-up or an applicable response rule.
- **Conditional:** coverage depends on a branch, an open window, or Admin first saving a follow-up time.
- **Gap:** there is no explicit automatic escalation for this outstanding action, or the handoff into follow-up is incomplete. General Admin visibility and a manual support button do not guarantee discovery.
- **No — intentional:** no Admin silence alert is currently specified because there is no required action yet, the action is optional, or an approved internal fallback handles silence.

All entries describe the **plan**, not running software. An initial bell notice is not an indefinitely repeating reminder. Reading or dismissing it is not completion. Admin can set subsequent follow-ups once the item is known; the audit checks how Admin first learns about it and what happens before a follow-up is set.

### 12.2 Approved key days: which ones notify Admin?

BD = Singapore business days; CD = calendar days. Each row has its own trigger. A calendar month is not 30 days.

| Event / clock | Trigger → key time | Who is notified while waiting? | Admin alert? | After Admin becomes involved |
| --- | --- | --- | --- | --- |
| Missing MCST payment entry/progress — T01 | Confirmed invoice/settlement → +1 BD without payment or meaningful update; +3 BD still unresolved | MCST gets the task immediately and the +1 BD reminder | **Yes — timed:** +1 BD and +3 BD under those conditions | Admin records the next contact time. Missing entries and a real outstanding balance must remain distinguishable. See gap G08 for instalment handoff. |
| Required MCST approval — T07 | Ready selection, variation, invoice or settlement decision → +2 BD / +5 BD unanswered | MCST initially and at +2 BD | **Yes — timed:** +5 BD | Admin follows up; silence never approves. Covers genuine MCST approval, not every task MCST happens to perform. |
| CM inspection, including every new repair round — T08 | Submitted initial/corrected work ready to inspect → +2 BD / +5 BD unanswered | CM initially and at +2 BD | **Yes — timed:** +5 BD | Follow up on this round. A failed review creates a remedy obligation, not a passed inspection. |
| Ordinary dispute response — T09 | Specific response requested → +2 BD / +5 BD unanswered | Actual responding party initially and at +2 BD | **Yes — timed:** +5 BD | Existing Admin-dated evidence/remedy tasks use their named date. An answer and performance of the promised remedy are different obligations. |
| Durability Feedback — T03/T04 | Full actual/assumed settlement → +30 CD; then +2 BD / +5 BD unanswered | CM at Feedback due and +2 BD after that actionable task | **Yes — timed:** +5 BD after Feedback is actionable, **not** five days after payment | Admin sets subsequent follow-ups. Stop on rating plus observation or Unable to assess. No closure block. Date-only/late-entry dispatch details remain O30. |
| Contractor receipt response — T02 | First issued transfer notice → +7 CD | Contractor gets the notice, exact deadline and receipt/issue controls | **No silence-based Admin alert:** eligible transfer becomes labelled Assumed received. **Yes — event** if Payment Issue is submitted | A reported issue opens/reuses Admin Support and stops deeming for that transfer. No extra 2/5 BD loop. |
| Cancellation response/additional claim — T10 | First issued notice → Contractor +2 BD in-window; Admin at earlier of +5 BD or cutoff minus 24 hours; claim cutoff +7 CD | Contractor initially, countdown and in-window reminder | **Yes — timed, if unanswered:** pre-cutoff safeguard now approved. Submitted claim brings Admin in directly | Timely claims continue under case follow-up after cutoff. O31-D resolved. |
| Original QuoteFix fees — T05 | MCST confirms payable invoice/settlement → due +3 BD | Contractor gets assessment and due date in account billing | **Yes — event:** payment evidence submitted for verification; **yes — timed:** overdue/unverified at +3 BD | Admin verifies actual receipt and follows up on unpaid fees. No CM/MCST fee notices. |
| Additional fee difference — T06 | Authorised adjustment confirmation → new unpaid difference due +3 BD | Contractor receives the adjusted statement | **Yes:** same fee evidence/overdue rules on the new difference | Preserve the original deadline and payments. Paid excess creates an Admin refund task with follow-up; no fixed refund turnaround. |
| Credential renewal/expiry — T12 | Recorded expiry → one calendar month before; then actual expiry | Admin requests Contractor renewal evidence as needed | **Yes — timed:** advance renewal notice and expiry notice | Grey expired badge; apply optional/mandatory credential rules. Subsequent renewal chasing uses Admin-set follow-up. |
| Urgent RFQ — T15 | Publication → immediately | Relevant job recipients; CM receives coordination updates | **Yes — event:** urgent publication | Admin records acknowledgment, attempts/ETA and next update. No approved timer catches an entirely unacknowledged urgent alert yet: G10. |
| Invoice mismatch — R3 | Difference detected → immediately | Contractor owes explanation/correction; MCST notified | **Yes — event:** Admin notified of mismatch | Notification does not settle it. No R3-specific unanswered-correction interval is explicit: G07. |
| Support, Payment Issue, interruption or cancellation claim | Reported issue / escalation → Admin review | Relevant authorised participants only | **Yes — event:** route to Admin | Use named tasks and next follow-up. Confidential conduct notices must not disclose report/reporter to the subject. An untouched Admin item is G10. |
| Saved Admin follow-up — T11 | Admin saves a next date/time → that time | Notify a stakeholder only if they have a relevant task | **Yes — timed:** at the saved time; missed update alerts Admin | Record attempt, result, next actor and next date if unresolved. Repeated overdue-alert interval remains O30. |
| Expired/unreconfirmed quote — T13 | Unselected quote expires or material scope changes | Contractor automatically notified; CM/MCST can manually prompt | **No Admin age alert specified** | Contractor need not renew an offer. A stalled RFQ is a separate possible oversight task: G02. |
| Scheduled start / completion estimate — T14 | Entered date/time passes without actual start/completion | Schedule/estimate visible | **Gap:** no automatic late-work alert or grace period approved | Manual support remains available; proposed commitment handling is G04/O31-C. |
| Warranty date | Accepted warranty term | Terms visible | **No automatic expiry/claim reminder specified** | Warranty start/expiry automation remains O30. A reported later fault can enter aftercare/support. |

### 12.3 Historical gaps — see section 14 for v12 resolutions

These are **audit findings and recommendations**. The owner has approved coverage in principle and G09/O31-D specifically; the other new exact timing defaults remain open pending context. A gap may mean no first Admin alert, or an initial alert with no guaranteed later reminder. All proposals retain the existing stage and waiting-on actor; none requires a new ticket phase or approval screen.

| Gap / nodes | How the wait can fall through | Current coverage | Recommended fix — awaiting decision |
| --- | --- | --- | --- |
| **G01 — Q&A and visit decisions: Q3, Q5** | Contractor asks for a needed measurement or a site visit; CM never responds, so pricing cannot progress. | Relevant role gets the task, but no explicit aged Admin escalation. MCST doing a CM-capability task is not automatically a T07 financial approval. | Apply a shared +2 BD actor reminder / +5 BD Admin fallback to these actionable decisions. Name the assigned actor and allow a substantive answer, decline or support request. |
| **G02 — sourcing, selection and reselection: Q1, Q2, S1, S3, S5, U3, M1** | No suitable quotes arrive; or quotes exist but CM never chooses; or MCST rejects and the ticket is abandoned before reselection/reopening. | RFQ never expires. Ordinary procurement has no age alert; urgent publication only supplies an initial Admin route. | Proposed procurement check-in: at +5 BD ask the responsible CM/MCST to review progress; at +10 BD without a substantive decision/next-review date alert Admin. Distinguish no suitable offers from no selection. Start from publication or rejection; transition to the actionable selection task without letting refreshes reset its age. An explicit scheduled review should carry its own next date. This is a check-in, not a quotation deadline, forced selection or duty on every contractor to quote. |
| **G03 — variation terms and CM decision: V1, V2** | Contractor never confirms the proposed terms; or CM never approves/rejects an at/below-threshold variation. | MCST-required variation approval falls under T07. V1 and CM's V2 decision have no explicit 2/5 BD coverage. A rejected variation itself correctly needs no Admin intervention. | Use the shared 2/5 BD fallback for the uncovered actionable variation tasks. Retain original authorised-work and safe-pause rules; no approval inferred from silence. |
| **G04 — start, access and progress: W1, W2, M2** | Contractor does not start on the agreed date; CM never provides keys; Completed by passes; Unable to estimate persists without any update. | Dates/reasons and actual access owner are visible. No approved automatic late-work or no-estimate update schedule. | When a saved start, completion estimate or agreed access/update commitment is missed, notify its owner and Admin once, with accurate wording such as Estimated completion has passed. Where completion cannot be estimated, ask for a next progress-update date instead; where no start is agreed, use 2/5 BD to chase arranging a start, not to demand immediate work. Proposed follow-up obligations do not make ordinary Add update/photos compulsory. |
| **G05 — incomplete completion submission: W3 within W2** | Work may be physically done, but Contractor leaves invoice/completion form unfinished. CM inspection and payment confirmation never become actionable, so their reminders never start. | No separate completed-but-awaiting-invoice state, correctly. A form draft is not a completion declaration or a new task. | Keep chasing the existing work/completion obligation under G04. Add a contextual reminder to submit the invoice with the declaration. Never treat opening/saving the form as completion or create a second timer on the draft. |
| **G06 — promised remedy / executed resolution: R2, D6, F3** | Contractor answers “I will fix it,” satisfying a response request, but never does the repair. A promised refund/correction may similarly never be executed. | T09 covers missing dispute response; D4 names a remedy/deadline and D6 returns non-compliance to Admin. No common automatic detection of a missed execution date is specified. | Preserve separate response and execution tasks inside the same case. Require a named next remedy/update date after agreement; missed commitment alerts actual owner and Admin. A new corrected-work submission starts the already-approved fresh R1 inspection clock. |
| **G07 — invoice explanation/correction: R3** | Admin and MCST see the initial mismatch notice; Contractor never corrects it and nobody schedules a chase. | Initial Admin alert confirmed. No explicit ordinary R3 correction-age rule unless the issue has become a dispute/Admin-dated task. | Add 2/5 BD to the correction task where no specific case date applies. Reuse the existing Admin item; do not create another investigation or ask for a second inspection of unchanged accepted work. |
| **G08 — instalment and progress handoff: P1, P3, P8, P9** | MCST records an instalment or supplies a useful update; missing-entry reminders stop, but a real remaining amount can then sit without the next follow-up being assigned. | T01 explicitly retains balance/follow-up obligations. The precise automated transition into the next dated follow-up is not fully specified. This is a handoff risk, not approval to erase an unpaid balance. | Keep one linked balance task. Preserve the original day-3 unresolved check where still applicable; thereafter require an Admin-set next follow-up while a real balance remains. Responses, instalments and edits must not silently clear the chase or restart the original clock. No new MCST bank-payment deadline. |
| **G09 — cancellation timing clash: C4, C10** | Admin's +5 BD event can occur at/after the +7 CD claim cutoff and be skipped, leaving Admin unaware of silence before the window closes. | Conditional coverage only. Example: Monday 10:00 notice → next Monday 10:00 cutoff; with no holidays, +5 BD is that Monday at 23:59 under the agreed BD convention, already too late. | **Approved v11:** Admin alert at the **earlier of +5 BD or 24 hours before cutoff**, only if still unanswered. This moves attention earlier; it does not extend seven days, infer consent or terminate an in-time claim. |
| **G10 — Admin has not acknowledged or scheduled follow-up: E2, E3, D2–D7, P8, U1–U4** | An initial alert is issued but Admin never opens it; or an unresolved item is acknowledged without a next date. T11 cannot fire without a saved time. | Case/urgent workflows require next actions/review dates and already support T11. A universal pre-acknowledgment reminder and missing-next-date safeguard are not specified. | Propose one Admin attention queue: ordinary untouched items re-alert after 1 BD; acknowledging while unresolved requires a next follow-up or a dated assigned task. For urgent unacknowledged RFQs, propose a 15-minute re-alert, then keep overdue prominently visible; ongoing repeat frequency remains a separate decision. Use the same Admin account, no peer approval or new external channel. |
| **G11 — verification, moderation, fee verification and refunds: G1, F4, B2; T06 refund** | Contractor awaits verification, feedback/reply awaits publication review, paid-fee evidence awaits checking, or an approved refund remains unpaid. | These are Admin tasks; fee evidence/overdue events and credential-expiry alerts provide initial attention. No shared aging rule for Admin's pending work. Refund follow-up is required but no fixed execution deadline exists. | Include them in G10's queue. Record verification/moderation action or next follow-up; prioritise fee evidence affecting a restriction. A receipt upload must not masquerade as verified payment, and an Admin backlog must not be described as proven Contractor nonpayment. Preserve current restriction policy unless explicitly changed. |
| **G12 — failed notice or task scheduling: P7, P10, C10, Feedback and other timed tasks** | A bell item is never successfully created, or a due job fails. No first notice means no seven-day clock; absent technical recovery could leave the person unseen indefinitely. | No deployed scheduler. Blueprint requires issuance history, guards and deduplication but no explicit failure-monitoring workflow. | Build durable pending notification jobs with retries and a visible failure queue; monitor overdue unsent/due jobs. Surface failure to Admin when delivery can occur, retain operational logs if the bell itself is unavailable. Never start/backdate a seven-day user clock from a failed notice or treat failure as silence. Exact retry/alert thresholds are an engineering detail still to specify. |

### 12.4 Where an Admin silence alert is deliberately unnecessary

1. **Unpublished drafts and AI assistance:** I1–I3 have no commitment to another party yet. A stalled AI request already has a manual route. Do not chase an unsent draft as stakeholder misconduct.
2. **Optional quotation actions:** no contractor is obliged to submit or renew an unselected offer, or to revise after a visit when nothing material changed. Q4/Q6 notices and manual prompts remain; the RFQ can separately need sourcing oversight under G02.
3. **The payment receipt fallback:** P2/P7 deliberately handles eligible silence through a labelled assumption at seven calendar days. Payment Issue, invalid evidence or failed notification is a different condition; do not create redundant routine Admin alerts for every silent receipt.
4. **The 30-day observation period:** F1 has no due action yet. Escalation starts only after F2 is actionable. Closed tickets can still have this future task.
5. **Optional photos and routine progress notes:** absence alone is not non-compliance. An explicitly agreed progress update can have its own date if O31-C is approved.
6. **Internal routing and outcomes:** V3–V5, A2, P0/P4/P6/P7/P10, C7/C9/C10, B4, F5/F6/F8/F9/F10 and G2 do not need separate human reminder loops. Pending obligations attached to them still do.
7. **A variation being rejected, a negative rating, or a task being completed:** record/notify the relevant outcome. These do not automatically prove misconduct or create an Admin dispute. Required moderation and deliberately requested aftercare remain separate tasks.

### 12.5 Historical O31 proposals — superseded by v12 decisions below

**Already approved:** Admin can name the actual next actor, action and subsequent follow-up time; reaching that time alerts Admin. Preserve this inside the existing workspace/case. No additional status or approval sequence is needed.

**Recommended extension, not yet approved:** every actionable obligation should either have an applicable existing policy, the shared ordinary 2/5 BD fallback, a meaningful agreed date, or an Admin-saved next follow-up. Never leave it with only a bell notification and no route back to attention. Optional/private drafts and internal checkpoints are excluded.

| Decision | Proposed policy to approve or adjust | Why it needs an answer |
| --- | --- | --- |
| **O31-A — ordinary uncovered tasks** | Extend +2 BD stakeholder reminder / +5 BD Admin to Q&A, visit decisions, variation terms/CM decisions and ordinary invoice correction. Reuse it for ordinary case responses without a specific Admin-set due date. | Existing 2/5 policy names approvals/inspections/disputes, not every human task. This would expand its scope. |
| **O31-B — procurement progress** | Responsible CM/MCST check-in after 5 BD; Admin after 10 BD without substantive progress/next-review date. Keep RFQ open indefinitely until an explicit outcome. | Zero quotes and unmade selection can currently stall indefinitely; they should not be treated as a contractor breaking a commitment. |
| **O31-C — work and execution commitments** | Alert owner and Admin once when the saved target is missed. If no completion estimate, require next progress-update date; if no start agreed, chase arranging it through 2/5 BD. Remedy/execution promises need a next action/date. | A saved estimate is not currently an automatic escalation rule. This adds follow-up, not penalties, mandatory photo diaries or fabricated completion dates. |
| **O31-D — resolved** | Approved: unanswered cancellation alerts Admin at earlier of +5 BD or cutoff minus 24 hours. | Closes the BD/CD gap. Seven-day cutoff unchanged. No further approval needed. |
| **O31-E — Admin queue** | Ordinary unacknowledged items: re-alert after 1 BD; urgent: after 15 minutes. Every still-unresolved acknowledgment must retain a dated next action/follow-up. Include verification, moderation, fees, refunds and payment balances. | No second Admin is needed, but the current first-alert-to-follow-up gap needs a rule. No fixed refund or urgent resolution SLA is implied. Repeated overdue frequency remains O30. |
| **O31-F — delivery/scheduler failures** | Durable retryable jobs, idempotent issuance and a visible technical-failure queue; choose retry/re-alert thresholds before implementation. | A future scheduler must detect its own missed work. Human silence and notification failure must never be conflated. |

**UX and audit requirements for the proposed mechanism:**

- Derive the waiting-on bar, bell notice and countdown from the same outstanding task. Keep one task/case for the same issue; a reminder does not add a screen or approval.
- Name an actual CM/MCST/Contractor/Admin owner and action. Where the role has multiple accounts, one valid response completes the shared action and suppresses obsolete reminders for all recipients.
- Show ordinary stakeholder reminders only where actionable; Admin receives an escalation when policy says so. Do not notify every role on every timer. Confidential reports keep their access restrictions.
- Admin can save **Next follow-up: {date/time}** with a short note. Log old/new time, actor and reason. This scheduling does not reset the original task age, erase missed commitments, change fees or extend a claim/receipt window.
- Distinguish Answer received from Remedy completed / Transfer recorded / Invoice corrected. A generic comment, page view or “will check” must not silently finish the underlying obligation.
- A resolved/superseded task cancels its pending reminders. Backtracking creates or restores only genuinely affected tasks with an audited anchor. Reuse existing valid acceptance and financial history.
- O29 archive remains KIV. No silent auto-archive or time-based assumption of case resolution.

### 12.6 Repository and node coverage evidence

Audited current `docs/review/flow-model.json`, the lifecycle template/generated blueprint, product memory, open decisions, timing register, and the review generator/UI/test sources. Historical PRDs and earlier review prose are evidence, not newer policy. The repository inventory contains planning documents, Mermaid diagrams, a Python document generator, the HTML/JavaScript review shell and its runtime regression test. **No QuoteFix backend, database migrations, application notification service or scheduled-job implementation was found in this workspace.** Accordingly, this is a policy/readiness audit, not a claim to have tested production reminder delivery.

Code evidence: [generator](review/build_review.py) generates documents/diagrams and embeds the model in the visualization; [review shell](review/review-shell.html) renders/commentates on that model; [runtime test](review/test-review-runtime.cjs) tests the review UI. None implements the user-to-user QuoteFix notification bell or a server-side countdown. A label/edge such as No response is not an executable timer. Before building, map every actionable task to a policy and verify transition/stop conditions with realistic journeys.

The following table assigns **all 83 current stable node IDs once** for audit coverage. Grouping for this audit does not change the diagram or merge workflow tasks.

| Nodes audited | Coverage finding |
| --- | --- |
| I1, I2, I3 | Unpublished draft/manual AI path; no Admin age chase intended. |
| Q1, Q2, S1, S3, S5, U3, M1 | Procurement/selection age gap G02; M1 is an in-flow confirmation, not another timer. |
| Q3, Q5 | Answer/visit-decision gap G01. |
| Q4, Q6 | Optional/current-quote notices; procurement gap handled at RFQ level. |
| S2, S4, R4, C6 | Required MCST approval covered by T07; S4 is the same held-selection task. |
| W1, W2, W3, M2 | Work/access/estimate/submission gaps G04/G05; M2 routes to W1. |
| R1 | T08 covers every submitted inspection round. |
| R2, D1, D3, D4, D6, F3 | T09 or Admin-dated substantive response/execution tasks. D4 acknowledgments are informational and nonblocking; no new compulsory chase cadence. D3 returns to Admin D2. G06/G10 follow-up principles retained. |
| R3 | Immediate mismatch alert; ongoing correction gap G07. |
| V1, V2 | G03: MCST-required decision covered; Contractor terms/CM decision not explicitly covered. |
| V3, V4, V5, A2, D8 | Internal routing/reuse checks; actual destination task owns its timer. |
| P1, P3, P8, P9 | T01/T11 payment follow-up; instalment/update handoff G08. |
| P2, P7, P10 | T02 receipt fallback; first-notice failure G12. P7/P10 are internal. |
| P0, P4, P6 | Internal zero/settlement/closure outcomes; linked obligations remain independently tracked. |
| C1, C2 | Cancellation action/confirmation; abandoned modal is not a new stakeholder handoff. |
| C3, C4, C8, C10 | T10 response/claim routes, conditional gap G09; submitted claim enters Admin queue. Draft claim is not submitted. |
| C7, C9 | Recorded settlement/no-additional-claims outcomes; preserve confirmed debts. |
| D2, D5, D7, D9, E1, E2, E3, A1 | Admin intervention/overrides/stalled handover; T11 once set, G10 before follow-up is secured. A1 is an attributed action, not another stage timer. |
| F1, F2, F7 | T03 observation and T04 due-feedback escalation. |
| F4, G1 | Admin moderation/initial verification aging gap G11. |
| F5, F6, F8, F9, F10 | Aftercare/feedback outcomes; no new silence clock on recorded outcome. |
| B1, B2, B3, B4 | T05/T06 fee deadlines and receipt/overdue notices; verification/refund queue gap G11. |
| U1, U2, U4 | Immediate urgency alert and T11 coordination; acknowledgment gap G10. |
| G2, G3, G4 | Verified record plus T12 advance/expiry events; renewal follow-up uses T11. |

**Verification scope:** all 83 current node IDs are covered. V11 records the approved cancellation safeguard/exclusions and separates remaining timing questions. D9 is the offline coordination task; D4 acknowledgment runs in parallel with authorised actions. No application scheduler implemented. The visualization retains its existing ResizeObserver repair.


## 13. V11 support and inspection timing boundaries

Evidence submission at D3 returns to Admin review at D2; it never starts a final-resolution approval clock. Only Admin records sufficiency and progresses to offline coordination D9. A case-specific saved follow-up continues under T11. Final D4 acknowledgment is informational and parallel to already-authorised execution, as explicitly approved; no blanket 2/5 BD gate or auto-acknowledgment is introduced. D6 execution keeps its applicable action date; D7 remains unresolved with Admin follow-up.

Every new physical repair inspection retains T08. Visible headings are Inspection, Inspection [2nd], Inspection [3rd], etc. Findings retain the originating inspection ID, date and rationale. Aftercare verification closes its linked case without re-running the original invoice/fee clocks.


## 14. V13 key days and Admin alert coverage — 12 October 2026

This is the **current** approval boundary through O35/O36. The earlier audit explains why these rules were added; its old “not approved” labels are not the current policy. All new wording below is **Draft** unless it reproduces owner-approved copy/actions. Notifications and countdowns are contextual; they do not add ticket stages or approval screens.

### 14.1 Approved trigger -> wait -> action register

| Clock | Trigger and time unit | As time progresses | At the threshold / Admin action | Stop or change condition |
| --- | --- | --- | --- | --- |
| **T16 — sourcing** | First publication of an RFQ or explicit new quotation round -> second following **calendar date at 12:00 Asia/Singapore**. 1 Dec, any publication hour -> 3 Dec noon. | Quotes remain open; current coverage count can be shown. Do not wait for day 2 to submit/select. No pre-checkpoint reminder has been added. | If fewer than 3 distinct eligible contractor organisations have a current selectable quote, notify **Admin**: “{ticket} has {count} contractors with selectable quotes. Follow up with contractors to improve quotation coverage.” Admin chases offline and records the next follow-up. Zero qualifies; revisions count once; send one coverage alert, not separate zero and under-three alerts. | Selection/cancellation supersedes obsolete sourcing task. Ordinary edits do not reset time. An explicit new round has its own event/clock. Exclude ineligible, expired, withdrawn and otherwise non-selectable offers; preserve C35/C36/Q4: minor corrections do not invalidate; material scope changes require reconfirmation/revision before selection or valid-coverage counting. Three is a sourcing threshold, not a selection gate. |
| **T17 — selection** | The active round reaches **3 distinct eligible contractors with current valid selectable quotations** -> **5/10 business days**. | Below three initially: no selection reminder clock. +5 BD: notify actual selection owner: “Review the available quotes for {ticket}. Select a contractor or record the next review date.” If valid coverage falls below three, pause reminders and return attention to the Admin sourcing task. | At +10 BD of accrued waiting without meaningful progress or scheduled review: **Admin** receives “Selection is still pending for {ticket}. Follow up with {CM/MCST}.” Admin sets the next follow-up. | On restored coverage, **resume remaining time**, not a new full 5/10 BD. Preserve accrued waiting, pauses, task/round history and dated review appointments. Do not reset on ordinary comments/views/additional quotes. Selection/cancellation supersedes obsolete tasks. **Early selection below three remains allowed with warning/rationale**; only reminders wait for three. |
| **T18 — ordinary Admin attention** | First ordinary Admin attention item issued; still unacknowledged -> **1 business day**. Covers support, verification, moderation, fee-receipt checks/refunds and other actionable Admin work. | Keep the named issue, actor and original task age visible. Reading the bell alone is not resolution. | Re-alert **Admin**: “{task} is awaiting your review. Review it and record the next action or follow-up.” | Explicit acknowledgment/handling stops the untouched-item reminder. If unresolved, retain a real action/date under T11. If that saved time is missed, T11 notifies Admin. No second Admin review. Further ordinary repetition cadence remains O30. |
| **T19 — urgent Admin attention** | First issued urgent RFQ notice -> **15 minutes, 1 hour, 3 hours**, then **every 7 hours after the three-hour reminder**: T+10h, T+17h, T+24h, T+31h... | At each mark, if unacknowledged, alert **Admin**: “Urgent RFQ {ticket} is still awaiting coordination. Review and take coordination.” Keep one urgent item/case. | Continue the approved seven-hour repetition until explicit acknowledgment. Re-check current state when dispatching; do not dump obsolete accumulated reminders after an outage. No automatic resolution deadline or RFQ expiry. | Explicit Take coordination/acknowledgment, cancellation or supersession stops obsolete unacknowledged reminders. Acknowledged but unresolved attendance uses a saved next update under T11. Bell reading alone is not that action. |
| **T20 — missed completion** | Current authorised completion target passes without recorded completion. | Target remains visible. Contractor can propose revised date/time and reason; notify CM/MCST for authorised **Okay / Admin Intervention** using existing variation decision/audit flow. Okay accepts that exact date revision; support/silence does not. | **Admin immediately:** “{Contractor} has missed the completion target for {ticket}. Follow up on the delay.” **Both relevant CM and MCST +24 elapsed hours, only if still unfinished:** “The contractor has missed the completion target by {hours} hours.” Actions **Okay / Admin Intervention**. | Okay on the lateness notice acknowledges only. Completion before the reminder suppresses the obsolete notice; it is still late if after the target. Completion before the target is never late. Preserve actual-versus-recorded completion, original/revised targets and overdue history. No automatic work acceptance, penalty or fabricated completion date. |
| **T21 — temporary unknown estimate** | Actual Start recorded with Unable to estimate plus reason -> **24 elapsed hours**. Example: Monday 10:00 -> Tuesday 10:00, including weekends/holidays. | Contractor sees “Provide a completion date and time by {deadline}. If this remains impossible, request Admin support and explain why.” Contractor can supply the estimate at any time; no additional advance bell schedule approved. | If no date/time and no approved extension, **Admin immediately:** “{Contractor} has not supplied the completion estimate due at {deadline}. Review the reason and obtain a dated commitment.” Only Admin can approve a reasoned extension with a new estimate-submission deadline. | Valid estimate or actual completion supersedes the missing-estimate obligation; cancellation supersedes it. Record every extension, reason, author and old/new deadline. A late extension does not erase a missed event. This is a deadline to supply an estimate, not to complete the repair. Contractor cannot extend alone. |
| **T22 — ordinary response gaps** | A real Q&A, visit, variation-terms/CM-decision or invoice-correction task becomes actionable -> **+2 BD actor / +5 BD Admin**. | Notify the assigned actor initially. +2 BD: “{action} is awaiting your response for {ticket}. {available response actions}.” | +5 BD unanswered: **Admin** receives “{role} has not responded to {task} for {ticket}. Follow up and record the next action.” | An actual answer/decline/decision completes the response duty; opening the page/generic comment does not. CM may decline information/visits; reminders do not compel disclosure. Substantive duties still remain if the response identifies an unresolved problem. Existing special payment, claim, MCST-approval and inspection clocks take precedence; do not duplicate them. |

**One notification mechanism:** store source event/version, actionable time, assigned actor, due time, issued/acknowledged/completed state, supersession and next follow-up. Reuse a case/task per issue. A follow-up creates a reminder, not an additional approval or an assertion that the issue was resolved. Implementation must make issuance and timed checks repeat-safe and re-check the current state before acting.

### 14.2 Which situations now reach Admin, and which deliberately do not?

- **New timed Admin coverage:** insufficient contractor quotations (T16), unmade selection (T17), additional ordinary response tasks (T22), missed completion (T20), missing post-Start estimate (T21), and unattended Admin work itself (T18/T19).
- **Existing timed Admin coverage retained:** missing MCST payment updates T01; unanswered approvals/inspections/dispute responses T07/T08/T09; unanswered Feedback T04; cancellation pre-cutoff safeguard T10; credential renewal warning T12; saved follow-ups T11. Fees keep their existing collection/restriction workflow and the Admin attention queue.
- **Immediate event attention retained:** urgent RFQ, Request Admin Support, payment issue, invoice mismatch, timely cancellation claim and relevant verification/moderation evidence. The applicable pending Admin task now also has T18/T19 and then a saved next follow-up.
- **No silence alert deliberately:** draft RFQs, a contractor choosing not to make an individual unsolicited offer, optional photos/progress notes, the future 30-day observation period, recorded outcomes/internal routing, and informational final-resolution acknowledgment. Collective lack of quotes is now caught by T16. A real underlying action remains separately tracked.
- **No extra Admin silence loop during ordinary T+7D receipt:** the existing assumed-receipt rule remains; Payment Issue immediately brings Admin in. No parallel 2/5-BD receipt response timer.
- **Resolved choice is not silence:** CM answering or declining Q&A/visit requests completes that decision. QuoteFix cannot force more scope information or permission for a site visit.

### 14.3 Resolved boundaries and remaining engineering work

**O35/O36 are settled:** selection starts at the third valid distinct quote, pauses below three and resumes remaining time. Early selection stays allowed. Late completion uses the 24-hour still-outstanding check. Contractor date/reason revisions need authorised Okay or Admin Intervention. Urgent repetition is every seven hours after the three-hour mark.

**Example of completion versus reminder:** due Monday 3pm, finished Tuesday 10am = 19h late but no Tuesday 3pm still-unfinished notice. Finished Monday 10am = early, no late-completion record. QuoteFix must retain when completion was reported separately from an established actual completion time; a missing update alone is not proof of when physical work finished.

**Two different deadlines:** T21 gives a contractor who started with Unable to estimate 24h to supply the first completion date. Only Admin may extend that submission deadline. Once a completion target exists, a proposed replacement date/reason goes to authorised CM/MCST for Okay / Admin Intervention. The compact schedule-only case reuses existing variation response/audit timers; no duplicate response clock or new ticket stage. Changes to scope/money retain their full approval gates.

Remaining work before implementing notifications:

1. **Business-time accounting:** implement the agreed Singapore business-day calendar, cutoff and accrued-time pause/resume consistently. Time below three quotes must not consume the selection wait; restoration does not restart the whole allowance. Persist pause/resume events; ordinary UI activity cannot manipulate the clock.
2. **Scheduler/delivery health:** recovery and persistent-failure monitoring are approved; concrete retry/backoff and health thresholds remain engineering work. An unavailable in-app bell cannot independently notify its users during that outage. Retain recoverable operational logs/health checks without silently adding email/WhatsApp. Failed issuance never counts as user silence.
3. **Other O30 details:** date-only dispatch/expiry, late-discovered Feedback and missed recorded Start are now resolved in v14. Remaining ordinary repetition/optional schedules, warranty automation and an authorised job without an agreed start date remain open. Archive stays KIV. These are not new questions about the just-approved O35/O36 decisions.

**Offline ledger:** O32-B is resolved: detailed coordination record lives in an external document. QuoteFix stores its restricted reference/permitted summary and its own dated decision/execution audit. No external chat or document integration is required by this decision.

## 15. Confirmed scheduling precision — 12 October v14

| Rule | Trigger / exact timing | Recipient, action and guard |
| --- | --- | --- |
| T03/T04 date-only Feedback | Actual full-receipt anchor has only a date -> 30 calendar days later, **09:00 Asia/Singapore**. | Notify CM and reveal Give feedback when due. The ordinary 2/5-business-day unanswered sequence follows successful notice issuance. A timestamped anchor retains its applicable existing rule. |
| T03/T04 late discovery | A late entry shows the observation date has already passed. | Notify CM immediately; preserve original observation due date. Give a full 2/5-business-day reminder allowance from first successfully issued notice. Never backdate user inaction. |
| T12/T13 date-only expiry | Valid through the stated Singapore date; effective expiry **00:00 the following day**. | Existing quote/credential consequences apply. Honour a supplied exact time. A selected quote's approved hold is not ended by its former expiry. |
| T23 scheduled Start not recorded | Agreed start time arrives and no Start event exists -> **Admin immediately**. At **+24 elapsed hours**, notify relevant CM/MCST only if still unrecorded. | **Draft:** “Start has not been recorded for {job}. Please confirm progress with the contractor.” Stop obsolete alerts after recorded Start, cancellation or an authorised superseding schedule. Missing app data does not prove physical work has not begun. Retain the schedule and follow-up history. No automatic Start, penalty or new deadline. |

T23 does not invent a start date when none is agreed. It does not start the separate Start +24h estimate-submission obligation. Unresolved work continues with Admin's recorded next follow-up under T11. Existing role permissions and Start prerequisites remain.

**Readiness:** these three owner questions are answered. Remaining optional/ordinary repetition, warranty and unspecified-start policies stay in O30. Technical scheduling/retry details belong in the [implementation plan](IMPLEMENTATION_PLAN.md); this register is still a blueprint, not a running scheduler.
