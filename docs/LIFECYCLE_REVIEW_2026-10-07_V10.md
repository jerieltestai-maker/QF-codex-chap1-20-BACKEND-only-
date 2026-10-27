# QuoteFix lifecycle review v10 — inspection rounds and timing reference

The user's latest decisions are applied to the source model, blueprint, Mermaid diagrams, product memory and open-decision register. This is planning work, not application implementation.

## 1. Every corrected work round is inspected

The earlier wording about reusing inspection was too easy to read as skipping inspection after a repair. The rule is explicit now:

1. **4 November:** CM inspects and finds the work unsatisfactory. Save the failed round-1 result and the remedy needed.
2. **8 November:** Contractor submits the corrected work as round 2. Notify CM immediately. The next action belongs to CM.
3. **CM inspects again.** A round-1 inspection cannot establish the quality of round-2 repairs.
4. If round 2 fails, return to Contractor remedy and repeat inspection on the next resubmission. If it passes, save round-2 acceptance.
5. D8 may use that successful round-2 acceptance to satisfy the same Admin support case. It does not demand a third inspection solely to repeat the same verification in another record.

An Admin verdict, submitted photo, elapsed time, or previous failed inspection cannot pass the current repair round. An invoice-only edit may preserve work acceptance only if physical work/scope has not changed and the acceptance remains valid.

## 2. New approvals recorded

- Exact MCST/Admin payment countdown wording accepted, using **{date/time}**. Computation remains Singapore time.
- New unpaid fee differences: **three business days from authorised adjustment confirmation**. Original assessment/deadline remains. Reductions offset unpaid fees; excess already paid is refunded and actual execution recorded by Admin.
- Missing durability Feedback: initial due notice; **CM reminder after two business days; Admin alert after five business days**; then Admin-set follow-up. Stop on rating submission or Unable to assess. Missing feedback is never a positive rating.

## 3. What unresolved-case archival would mean — still open

Example: after cancellation, Contractor claims material costs, MCST disputes them, and requested receipts never arrive. Admin has followed up, but the financial dispute remains unsettled.

The possible archive feature would let Admin move that case out of the active queue while keeping its history. That is different from a resolved case: money/obligations may still be outstanding. A closed job and an archived support case are also different records; changing queue visibility must not manufacture settlement or work acceptance.

**Recommendation:** defer this archive feature for launch. Keep the case marked unresolved, with a named next action and Admin-set follow-up. No inactivity timeout automatically resolves, waives, closes or archives it. This recommendation is not yet approved; the latest user message asks for context.

## 4. The timing reference

[TIMING_AND_NOTIFICATION_REGISTER.md](TIMING_AND_NOTIFICATION_REGISTER.md) covers all currently specified clocks, including:

- Trigger/context and the recipient of the first notification.
- Calendar versus business days and separate clock anchors.
- Intermediate reminders, exact action at expiry, and the next actor.
- Proposed notification wording, separately identified from approved copy.
- Stop/reset conditions, partial payments, late entries, cancellation claims and repeated inspections.
- User-entered dates and automation that has no approved fixed interval.

The main timing approvals are settled. O29 archival and O30 narrow scheduling details remain explicitly open; broader reputation/risk questions stay in their existing chats.
