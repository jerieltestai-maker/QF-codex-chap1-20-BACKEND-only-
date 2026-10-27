# Chapter 08 — Comparison, selection, MCST approval and reselection

**Local construction update, 13 October 2026:** implemented under owner authorisation. See [Chapters 07-08 build evidence](../CHAPTERS_07_08_BUILD.md) for tested behavior and remaining release integrations. G05/G06/G07 are resolved by the owner's explicit answers; G04 warranty automation and other independently open policies remain gated.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [07](07_QUOTES_QA_AND_VISITS.md) · Next: [09](09_START_PROGRESS_AND_SCHEDULE.md)

**Dependencies:** 01–07; final AI/reputation integration from 16 and risk warnings from 17 before release. **Nodes:** Q2, S1–S5, M1/M2. **Timers:** T17/T07. **Sources:** C10/C20/C26/C31/C35/C37/C39/C69, O35/O36.

## 1. Comparison and role visibility

Show current eligible quote set, total SGD, term differences, exclusions/unknown costs, earliest availability, duration/unknown reason and permitted passport evidence. Contractor never sees rival comparison or procurement rationale. CM sees identities or stable aliases according to MCST; MCST/Admin unmasked. AI evidence/text obeys the same concealment.

Calculate highest/average only from current valid selectable offers: one per eligible organisation, excluding expired/withdrawn/superseded/materially outdated-unreconfirmed offers. Preserve count and exact version set. **{contractor name or alias}'s price vs Highest Quote** and **Price vs Average Quote** describe received-price differences, not market estimates or proven savings. Guard an empty/zero denominator.

## 2. Required decision fields and confirmations

| Action | Required | Optional/system |
| --- | --- | --- |
| CM selects | Exact quote version, written rationale, review of material cautions/unknown costs and limited comparison if below three; explicit confirmation | Snapshot comparison/rule/threshold versions; named actor/server time |
| MCST approves/rejects nomination | Exact pending selection version, explicit decision | Rejection rationale optional; all outcomes audited |
| MCST Select and approve | Same quote/rationale/cautions as selection; combined confirmation | No extra MCST account or separate duplicate approval |
| Above-threshold MCST selection | Popup shows amount and threshold; **Yes I know / Back** | Acknowledgment recorded with decision |
| Reopen quotations | Explicit authorised action on permitted preauthorisation context | New round event/settings snapshot; no automatic revival of offers |
| Estate approval threshold | Required operational configuration before ordinary selection (E schema) | No hidden guessed threshold; amount includes GST |

At/below threshold, CM selection authorises work. Above it, CM nomination pauses quoting and creates MCST approval; work remains unauthorised. Current sparse/unknown-cost warnings remain acknowledged rather than fabricated terms.

## 3. Pipeline and exceptions

CM selection -> freeze exact quote/comparison -> either work authorised (at/below threshold) or **MCST Reviewing selected Contractor**. MCST approval authorises; rejection records **Rejected Contractor** as nomination outcome on the same ticket -> CM reselects a currently valid offer or MCST Select and approve or explicit new quotation round.

Selection below three is still allowed with warning and rationale. Three is a reminder/sourcing threshold, not an eligibility gate. Contractor's selected terms remain held during required MCST approval; former expiry cannot end the nomination.

Before authorisation, CM/MCST may cancel directly, including pending approval. After authorisation, replacing Contractor requires a linked new ticket, even with Admin backtracking. Cancellation/claims are chapter 14; rejection is not cancellation. A held Contractor who cannot honour terms enters interruption/support, not unilateral rewriting.

## 4. Selection and approval clocks

| Trigger | Time/action | Guard/recipient |
| --- | --- | --- |
| Third distinct eligible current selectable quote in active round | T17 +5 BD reminder to actual selection owner; +10 BD Admin without progress/scheduled review | No selection chase initially below three |
| Coverage drops below three | Pause T17, retain elapsed/remaining time | Return sourcing attention to existing Admin task; no fresh full timer |
| Coverage restored | Resume remaining eligible business time | No duplicate already-issued checkpoint |
| Genuine MCST decision becomes actionable/notice issued | T07 +2 BD MCST; +5 BD Admin | Stops on decision/explicit override or supersession, never page view |
| Selection/cancellation | Supersede obsolete procurement tasks | Real pending MCST approval continues where applicable |
| Explicit scheduled next review | Dated review task/follow-up | History retained; exact arithmetic examples belong to chapter 04, not arbitrary comment resets |

Display pending concrete CM or MCST, plus quote-count/coverage context. Do not pressure CM about choosing while only two offers exist. New explicit round gets its own sourcing event; preserve prior rounds/decisions and task history.

## 5. Transaction and audit

Select/approve locks/version-checks the affected ticket, quote, authority/threshold and eligibility dependencies. It atomically creates selection/comparison snapshot/authorization-or-task/audit/outbox. MCST rejection retains original decision and current pointers, rather than deleting selection history. Simultaneous CM/MCST choices can produce only one current valid selection/authorisation.

AI verdict is evidence-based advice; selection can remain human. Do not ship an invented reputation score while waiting for chapter 16's policy. Preserve recommendation/evidence/version shown at selection. The later owner-approved G12 rule supersedes advisory-only cautions: active Chapter 17 warnings require MCST review below threshold, with exact warning/settings/version acknowledgement and explicit clearance; no warning itself approves work.

## 6. Verification tests

| ID | Scenario | Pass condition |
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

## 7. Completion gate

Deliver exact-version comparison/selection/approval/reselection and timer/race tests. Freeze approved copy from lifecycle/node reference. Final release also needs the approved scoring/AI and integrity integrations; a placeholder verdict is not an acceptable shortcut.
