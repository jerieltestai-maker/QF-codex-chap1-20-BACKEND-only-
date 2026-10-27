# Chapter 09 — Starting work, progress, schedules and interruption

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [08](08_COMPARISON_SELECTION_AND_APPROVAL.md) · Next: [10](10_VARIATIONS.md)

**Dependencies:** 01–08; support primitives 03–04, full interruption resolution 14. **Nodes:** W1/W2/E2. **Timers:** T14/T20/T21/T23, T22 for applicable revised-date decision. **Sources:** C40/C67/C72, O34-B/O35-B/C, v14.

## 1. Visible workflow and required fields

| Context | Ticket label / pending / action | Compulsory fields |
| --- | --- | --- |
| Authorised, not started | **Starting work** / **Pending: Contractor to begin the authorised work** / **Start** | Before Start: Completed by date AND time, OR Unable to estimate yet AND nonblank reason |
| Agreed future start | **Scheduled: Contractor starts on {date/time}** | Actual agreed date/time/version; no made-up start date |
| Started | **Carrying out work** / **Pending: Contractor to complete the work** / **Add update / Work is complete** | Saved target or temporary unknown-estimate reason visible |
| Revised completion target | Existing work stage; named CM/MCST decision | Contractor revised date/time AND reason; exact-version acceptance |
| Interruption | **Unable to continue work** / **Pending: Admin to review interruption of works** / **Review interruption** | Reason, affected work and Admin next action; evidence/costs as applicable |
| Admin verdict | Outcome, reason, safe/feasible resumption or settlement route | Attributable decision and next actor/date if unresolved; open findings/conclusion note |

Optional progress notes/photos are not a compulsory diary. A contractor can prepare completion documents before submitting the combined package in chapter 11; clicking Work is complete alone does not declare completion.

## 2. Start and schedule rules

Start requires current authorisation, correct Contractor and online version check. Saving an estimate draft is not Start. Record commencement and target separately. A future schedule does not auto-start the job when its time arrives.

Unknown estimate is temporary: actual Start with reason creates a duty to supply a completion date/time within 24 elapsed hours. Only Admin may extend that **estimate-submission deadline**, with reason and new date/time. Contractor cannot perpetually resubmit unknown to reset it.

For an existing completion date, Contractor proposes a revised date/time/reason. Notify the authorised CM/MCST with **Okay / Admin Intervention**. Okay accepts that exact proposed version; silence or asking for support does not. Keep the last accepted target until acceptance/explicit Admin override. Reuse variation/audit/task machinery for this compact schedule-only change; scope/price changes use chapter 10.

Do not confuse Okay on a lateness notice with Okay accepting a specific new date. Their action IDs, context and recorded outcomes differ.

## 3. Timers and overdue behavior

| Trigger | Timing and recipient | Stop/exception |
| --- | --- | --- |
| Agreed start passes without Start record | T23 Admin immediately; relevant CM/MCST +24 elapsed hours if still unrecorded | Say **Start has not been recorded**; stop on Start/cancellation/accepted supersession. Do not assert no physical work occurred |
| Start with unknown estimate | T21 +24 elapsed hours -> Admin if no estimate/approved extension | Valid estimate, completion or cancellation supersedes; late extension retains missed history |
| Current accepted completion target passes | T20 Admin immediately | Preserve target and overdue event; no automatic penalty/acceptance |
| Still outstanding +24 elapsed hours | T20 both relevant CM and MCST | Show missed by {hours}; **Okay / Admin Intervention**. Suppress if completion already recorded |
| Explicit future schedule/target | T14 display only | No separate stage/task simply to display a date |
| Access/remedy/follow-up date set by Admin | Existing dated task/T11 | Alert on actual named action; do not add a new automatic completion extension |

If due Monday 15:00 and complete Tuesday 10:00, it is 19 hours late although before the Tuesday 15:00 estate reminder. Completion before Monday 15:00 is not late. Preserve actual-versus-recorded evidence; a late app update alone cannot prove a physical delay.

G03 resolved by the owner on 14 October 2026: when no start date is agreed, request the assigned Contractor to propose one, with the existing 2/5-BD response sequence and CM/MCST exact-version acceptance. This response duty is not a made-up physical start deadline.

## 4. Access problems and interruption routing

Name who can act: CM supplies keys/arranges access; Contractor supplies worker details; Admin coordinates a genuinely unresolved issue. Do not display vague “waiting on responsible role.” Record contact attempts/obstruction and any agreed date without silently moving the authorised completion target.

Contractor withdrawal, inability to honour held terms or a verification problem enters Admin review as appropriate. Admin records reason, necessary safe pause, completed work/costs, evidence and verdict. Outcomes: explicit feasible resumption with retained authority, further dated evidence/coordination, or cancellation/settlement. Admin intervention is not proof the problem is resolved. After authorisation, Contractor replacement still needs a linked new ticket.

## 5. Records/API and audit

Commands: Start, add optional update, supply initial estimate, Admin extend estimate deadline, propose/accept schedule revision, request interruption/support and record Admin outcome. Store start/target versions, actors/reasons, prior and new deadlines, missed events and actual occurrence claims separately from server recording time.

Current authority and version are rechecked on retry; cancellation racing Start cannot be bypassed by an old mobile screen. Uploads/drafts may queue; Start remains an explicit online command.

## 6. Verification tests

| ID | Scenario | Pass condition |
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

## 7. Completion gate

Deliver required Start fields, target history, four timing bindings and interruption handoff. G03 uses the owner-approved Contractor proposal and exact CM/MCST schedule acceptance. Prove every possible response names a next actor and that completion is not accepted merely because a date elapsed.
