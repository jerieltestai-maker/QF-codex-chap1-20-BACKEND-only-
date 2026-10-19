# QuoteFix lifecycle review v13 — 12 October 2026

Planning only. The owner's four answers and two direct follow-up answers settle O35-A/B/C/D and O36-A/B. This document supersedes the corresponding v12 proposals. Other confirmed decisions remain in force.

## 1. Third quotation starts selection reminders

Start the selection reminder clock when the active round first has **three distinct eligible contractors with current valid selectable quotations**. Revisions from one contractor count once. The responsible CM/MCST gets the selection reminder after **5 business days**; Admin gets attention after **10 business days** without meaningful progress or a scheduled review.

**O36-A explicitly resolved:** earlier selection with fewer quotes is still allowed, with the existing limited-comparison warning and rationale. Three quotes is the threshold for starting selection reminders, not a minimum for allowing selection or making an RFQ legally valid. This is the owner's product policy; no general legal requirement is asserted.

**O36-B explicitly resolved:** if coverage subsequently falls below three, pause selection reminders and return attention to sourcing. Preserve accrued waiting time; resume only the remaining time when three valid offers are restored. Do not restart all five/ten business days and do not send selection reminders while fewer than three remain. Expired, withdrawn or ineligible offers do not count; a scope warning alone does not revoke already-approved selectability. The count is per contractor organisation in the active round.

Admin sourcing support remains separate: publication/new round -> second following calendar date at noon Singapore time -> Admin alert if fewer than three. If coverage later drops after the selection clock has started, surface that coverage loss in the existing sourcing task for Admin; do not restart the publication clock or create duplicate support cases. A completed selection/cancellation supersedes obsolete reminders. A concrete next-review appointment uses dated follow-up and preserves the original task history.

## 2. What retaining lateness means

The earlier phrase “finishes earlier” meant **before the next-day reminder**, not before the completion deadline. The wording was ambiguous.

| Example | Treatment |
| --- | --- |
| Due Monday 3pm; finished Monday 10am | Early. No late-completion record. |
| Due Monday 3pm; completed and recorded Tuesday 10am | 19 hours after the deadline. Retain that history; suppress the Tuesday 3pm still-unfinished reminder. |
| Due Monday 3pm; still awaiting completion Tuesday 3pm | Admin was alerted at the missed deadline; now notify both relevant CM and MCST that completion is 24 hours overdue. |

**O35-B resolved:** +1D is **24 elapsed hours**. Check the current completion state before issuing the delayed notice. **Okay** acknowledges this lateness notice only; it does not accept work, waive a defect, extend the target or close an unresolved follow-up. **Admin Intervention** uses the existing contextual support case. A pending inspection is distinct from unfinished contractor work: once completion is recorded, the next actor is CM under R1.

The app's event history must distinguish a missing/late completion update from independently established physical completion. Do not fabricate the actual completion time or a reputation penalty. Preserve corrections with their attribution; reputation consequences remain in the separate reputation workstream.

## 3. Revised completion date versus first estimate

### A. Contractor has already supplied a completion date

Example: the accepted target is Friday 3pm; Contractor proposes Monday 3pm because replacement parts are delayed.

1. Contractor submits the revised date/time and a required reason.
2. Notify relevant CM/MCST; identify the authorised decision-maker using existing role rules.
3. That decision-maker has **Okay / Admin Intervention**.
4. **Okay** accepts that exact proposed date version. The accepted date becomes the current target; the old target, reason, proposer, decision-maker and timestamps remain in the audit trail.
5. **Admin Intervention** requests support and does not itself accept the proposed deadline. Silence does not accept it either. The last authorised target remains operative until an authorised acceptance/override.

Use the existing variation decision/audit machinery for a schedule-only change, with a compact date-and-reason presentation; do not add a new ticket stage. Its existing actor reminders still apply. A change also affecting scope or money retains the full variation/financial approval rules. Only an authorised acceptance/override changes the active target; later changes never erase an already recorded overdue event.

**O35-C resolved:** the owner approved this flow and the exact response labels. In this context **Okay accepts the new date**. This differs from Okay on a lateness notification, where it only acknowledges the notice. Explain that effect beside the button so the word alone does not conceal the consequence.

### B. Contractor started without being able to supply any completion date

Example: work starts Monday 10am with “Unable to estimate — the concealed leak must first be traced.” By Tuesday 10am, Contractor must supply a Completed by date/time. The repair itself need not finish by Tuesday 10am; that is only the deadline to **provide an estimate**.

If Contractor still cannot provide an estimate, only Admin may grant a reasoned extension to that estimate-submission deadline, for example Wednesday 10am. Admin investigates the blocker, records why an exception is justified and sets the next firm deadline. Missing the current estimate deadline alerts Admin immediately.

This previously approved O34-B safeguard prevents repeated “Unable to estimate” declarations from leaving the job without any dated commitment. It does not require Admin approval of every ordinary revised completion date. Once a completion date is supplied, later revisions follow A above.

## 4. Urgent attention repeats every seven hours

**O35-D resolved:** retain the initial urgent notice and reminders at **15 minutes, 1 hour and 3 hours** after first issuance. After the three-hour reminder, repeat **every 7 hours** until Admin explicitly acknowledges: **T+10h, T+17h, T+24h, T+31h, ...**.

Use one urgent attention item; no duplicate cases. Explicit Take coordination/acknowledgment stops the unacknowledged sequence. If unresolved, follow Admin's recorded next-follow-up time. Cancellation/supersession stops obsolete alerts. Bell reading alone is not the coordination action. A delayed scheduler must re-check current state and avoid dumping a backlog of redundant notices at once.

## 5. Remaining scope

No further approval is needed for these four decisions or the two sourcing follow-ups. The older O30 scheduling details (date-only dispatch/expiry, remaining unspecified repetitions and warranty automation), technical notification recovery thresholds, and separate reputation/risk work remain recorded elsewhere. Archive remains KIV. No backend or production notification scheduler has been built by this review.
