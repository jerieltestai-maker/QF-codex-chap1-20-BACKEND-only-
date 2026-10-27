# Chapter 17 — MCST oversight, warnings and protected conduct reporting

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [16](16_REPUTATION_PASSPORT_AND_AI.md) · Next: [18](18_DASHBOARDS_AND_EXPORTS.md)

**Dependencies:** 02–04, 06–08, 10–14; projections/export 18. **Source:** [current integrity plan](../../MCST_INTEGRITY_REVIEW.md). **G12 resolved 18 October 2026:** latest owner answers below supersede the original advisory-only draft. [Local build](../CHAPTERS_17_18_BUILD.md).

**Current owner rules:** defaults 20% revision / 30% selected-price gap / 20% cumulative growth / 3 offers; inclusive equality, positive Contractor quotes. Flagged CM selections require explicit MCST clearance even below the monetary threshold. Flagged variations pause all ordinary work until clearance, including after withdrawal/rejection; factual make-safe actions remain available. Revision flags follow only the exact chosen bidder. MCST can combine selection/approval/clearance with a required explanation. Both MCST/Admin receive grouped notices. Detailed access logs are Admin-only; MCST summaries need explicit Admin approval. Estate next-round and ticket future-event settings acknowledgments remain required; historical records cannot be rewritten. Remaining draft statements to the contrary are superseded by these direct answers.

## 1. Scope and authority

Implement the approved four configurable warnings and three early evidence views: fair-information timeline, decision-to-final price bridge and protected-access review. Reuse private Admin Support for allegations. MCST/Admin oversight is not a fraud score or automatic verdict.

Objective mismatches still block the affected action under existing rules (e.g. invoice mismatch). Under the owner's 18 October answers, a flagged selection requires explicit MCST clearance before work authority; a flagged variation pauses ordinary work until clearance, even after withdrawal/rejection. Neither is a finding of misconduct. No compulsory relationship declaration at every quotation/selection. Bank-recipient/change verification is outside initial scope.

## 2. Four warning rules and calculations

| Rule | Trigger/basis | Evidence to show |
| --- | --- | --- |
| Quote revision percentage, up or down | Quote resubmission vs that Contractor's first quote for the SAME material RFQ scope | Both amounts/versions, percentage, timing, reason and changed terms; do not compare across materially different scope as if identical |
| Selected price over lowest current valid quote | Selection/MCST combined confirmation | Current comparable valid set, selected/minimum amounts, difference and term exclusions |
| Cumulative variation growth | Proposal/review against selected quote baseline | Selected amount, effective approved variations, this proposal and prospective total; no treating unapproved work as authorised |
| Insufficient comparable quotes | Selection when count falls below MCST-set number | Count and exact eligible quote set; independently preserve sourcing/selection-reminder rules |

The first three use percentages without an SGD floor; the fourth uses count. Defaults are 20%, 30%, 20% and 3 respectively, with inclusive percentage equality. New Contractor quotes are at least SGD 0.01. Legacy zero/missing denominators show explicit unavailable evidence rather than infinity or an invented percentage; legitimate zero-payable settlements remain possible.

The owner-approved growth calculation uses effective approved total plus the current proposal's delta, compared with selected quote. Show pending alternatives separately; they do not authorise work or accumulate as approved cost.

## 3. Mandatory settings and versioning

| Form | Required | Effect |
| --- | --- | --- |
| Estate onboarding/settings | Four explicit chosen values under final validated configuration; named MCST authority; acknowledgment unchecked initially | New settings version effective next RFQ round; existing jobs/alerts retain old version |
| Estate save checkbox | **I understand these warning settings apply from the next RFQ round. Existing jobs will continue to use their previous warning settings.** | Must be ticked immediately above Save preferences/Save settings |
| Ticket-only override | Explicit scope/values/current version; short reason if quotes have arrived; separate checkbox | Applies only to future events on that ticket |
| Ticket save checkbox | **I understand these new warning settings apply only to future events on this ticket. Earlier warnings and decisions will keep the settings that applied at the time.** | Must be ticked before saving |
| Review disposition | Explained / Needs clarification / Escalated to admin / Unresolved; actor/time | Optional note; no disposition clears work. Dedicated Allow work to proceed requires explanation, exact source version and named authority |

Audit old/new values, actor, exact server date/time, scope, acknowledgment, reason and effective point. Event's recorded time determines policy version, not delayed bell delivery. Earlier warnings cannot be erased/recomputed by adjusting settings.

## 4. Audience, notification and user actions

One grouped evidence card per decision, keeping each underlying trigger auditable. Below-threshold CM sees the caution before selecting; a flagged nomination waits for MCST clearance even below the monetary threshold. Both MCST and Admin receive immediate grouped warning notices. MCST Select and approve can clear the exact warnings in the same confirmation with an explicit unchecked control and required explanation. No additional MCST account is required.

MCST/Admin see oversight evidence within permitted scope. Contractor cannot view rival quotes/private reports; CM concealment remains. Confidential conduct case initially goes to Admin; exclude named subject even if MCST, and involve only authorised uninvolved people. Notice uses chapter 14's confidentiality wording.

Fair-information timeline includes material RFQ changes, published sanitized Q&A, notifications and reconfirmation. Price bridge shows first/current/selected quote, approved variations, invoice and confirmed total. Protected access records actual access/denial to sealed quotes/masked identities/originals/cases; authorised ordinary viewing is not proof of collusion.

## 5. Clocks and integration boundaries

No new reminder cadence or fraud-resolution deadline. Existing T16 sources offers at day-two noon; configurable low-count warning fires at selection, not a duplicate timer. Existing approval, invoice, support and Admin-follow-up rules continue. Warnings do not reset them.

Later proposals — split-job inference, bidder-independence checks, estate concentration, same-actor extra alerts and alert-usefulness analytics — are not silently included as approved launch requirements. Record them in scope/deferred gates. No imported historical market data.

## 6. Verification tests

| ID | Scenario | Pass condition |
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

## 7. Completion gate

G12 is resolved for the approved scope. Verify settings preservation, exact clearance/work-hold boundaries and all three early evidence views. Later proposals and allegations must not become automated verdicts. Production release remains Chapter 19.
