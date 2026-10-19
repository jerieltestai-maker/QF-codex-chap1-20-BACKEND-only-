# QuoteFix operations review — historical v3 proposal

**Superseded by the third owner review.** This document preserves the previous proposal for audit/context; it is not current policy. In particular its admin cancellation gate, proposed admin powers, pending Q9/Q14 approvals and reputation questions have changed. Use [the v4 review](LIFECYCLE_REVIEW_2026-10-02_V4.md), [current lifecycle](TICKET_LIFECYCLE.md) and [decision register](OPEN_DECISIONS.md).

Planning only. Latest owner decisions are distinguished from recommendations. The owner stopped the node review at section 6; later explicit Q answers are applied without approving all later copy. No application feature is implemented.

## 1. Variation routing: the correction

The old unconditional **V2 -> W2, Rejected or withdrawn** mixed the outcome of a proposed change with whether physical work can resume. V3 also incorrectly displayed Carrying out work regardless of its entry context.

Example: an original SGD 500 tap repair can survive rejection of a separate SGD 200 door repair; original work can continue if feasible. But if SGD 200 is needed to isolate an unsafe supply before repairing the tap, rejection does not make continuation safe. A change raised during final-invoice reconciliation should not return to Carrying out work either.

**Proposed Q15 routing:** contractor confirms terms V1 -> required approver decides V2 -> approved change V3 or rejected/withdrawn change V4 -> context check V5. The approver rejects; the proposer withdraws. Approval changes the effective authorisation; rejection/withdrawal preserves the original authorisation. V5 checks the saved context:

- Before start, able to proceed -> W1.
- Work ongoing, safe and feasible -> W2.
- Invoice context -> R3, then CM review; never directly confirm an invoice.
- Completion-review context, invoice already reconciled -> R1.
- Unable to perform the applicable authorised scope -> E2.

V5 is a routing checkpoint, not a new ticket status. Pending variations never authorise extra work. Recording approval proves authorisation, not performance; an invoice-stage decision cannot rewrite whether work was originally done without prior approval.

**Admin is not a routine variation approver.** Admin appears for interruption, dispute, requested support or invoice mismatch. The owner-approved mismatch notification to MCST/admin remains; a notification does not approve or resolve anything. Q6 separately proposes exceptional admin overrides. Existing threshold rules are preserved; exact approver treatment of a same-total scope change above threshold should be specified before implementation.

**Question/recommendation:** approve this context-dependent return. It is marked as proposed in sections 6/6b.

## 2. Completion and wording

W1/W2/E2/R1/V1/R3 wording is recorded in NODE_REFERENCE.md. W3 keeps **Preparing Proof & Payment**. The later Q8 answer controls: invoice compulsory, completion photos optional. Proposed primary bar/action: **Pending: Contractor uploads the invoice** / **Upload invoice**. Optional evidence is tucked into supporting details.

Proposed popup for the approved irreversible action:

**Mark work as complete?**

“Confirm that all authorised work is finished. Once submitted, this completion declaration cannot be undone. You will upload the invoice next, and the CM will then inspect the work.”

Slider: **Slide to confirm completion**. Provide an equivalent deliberate keyboard-accessible confirmation for users who cannot drag.

The immutable event is the contractor's physical-completion declaration. CM may still request remedies; those are new rounds, not an undo. An admin correction is a superseding record, never deletion of the declaration. Completion does not mean acceptance, invoice confirmation or payment.

CM checkbox: **I agree the works are Complete and Satisfactory**, followed by slide submission. Retain **Report an issue** without requiring that positive declaration. Invoice mismatch still blocks advancement.

Approved quotation checkbox, removing only the stray “the”:

**My quote will be valid when the CM selects it. Once selected, its price and scope remain held while awaiting MCST approval, if needed.**

Require it on quotation submission. S4 is now a rule reference, not an expiry status. MCST's new selection capability needs role-adaptive copy once Q13's combined action is settled.

## 3. Payment, Feedback and fees

**Confirmed:** MCST alone records payment; CM cannot send/record it. Partial payments require a rationale visible to contractor. Store actual transfer/receipt dates separately from recording timestamps. Full actual receipt normally starts Feedback's 30 calendar days. No acknowledgment for seven calendar days means day-seven deemed receipt starts that clock: **2 November sent -> 9 November deemed -> 9 December Feedback**.

The owner explicitly reconfirmed **MCST invoice/settlement confirmation starts QuoteFix's three-business-day fee deadline**. Actual/deemed contractor receipt does not move it. Business days are Singapore weekdays excluding public holidays, omit trigger date, cutoff 23:59 Singapore time. Seven/thirty-day intervals use calendar days.

Accepted exceptions: completed zero-payable work uses MCST invoice confirmation; cancelled performed work uses settled receipt/zero-settlement confirmation; no-work cancellation has no workmanship Feedback. Feedback does not block closure. Close after accepted work, confirmed invoice, fully settled payment and no blocking case.

### Proposed contractor-only footer

“Please confirm receipt or report a payment issue by **{date}**. If we receive no response by then, QuoteFix will record **SGD {amount}** as deemed received on that date and use it to determine when Feedback is due.”

Nearby actions: **Confirm receipt** / **Report payment issue**. Other permitted participants may see receipt status; this warning footer itself is contractor-only. Label Confirmed received and Deemed received distinctly; no claim of bank verification.

### Q3 safeguards still proposed

| Boundary | Problem/example | Recommendation |
| --- | --- | --- |
| Partial transfer | SGD 600 sent against SGD 1,000 invoice; no response. | Deem only SGD 600; SGD 400 remains due. Each transfer has its own timer. Start job Feedback only when the full obligation is covered; final covered balance determines anchor. |
| Disputed receipt | Contractor reports no money on day three. | Stop automatic receipt for that transfer and reconcile. Merely reading a notification is not a substantive response. |
| Late entry | A 2 November transfer is entered on 15 November. | Keep actual claimed transfer date; give seven days from notice. Never deem receipt before contractor had the response opportunity. This exception needs approval. |
| Closure | Full transfer deemed after seven days, no dispute. | Allow it to satisfy the payment gate with basis visible; all other closure gates remain. |
| Later evidence | Failed transfer or different actual receipt date proved later. | Request Admin Support, preserve the deemed record and add correction. Reconcile balance/Feedback date without duplicate task or erasing submitted Feedback. Fee clock remains unchanged. |
| Cutoff | Transfer records may have only a date. | Show 23:59 Singapore time on date + seven calendar days; apply late-entry exception. Process timely responses before the deeming job. |

**Question:** approve this safeguard set? Basic fallback intent is confirmed; these boundaries are not yet approved.

## 4. Q5 — Post-authorisation cancellation remains open

Before authorisation, including selected work awaiting MCST approval, CM/MCST cancels directly with a reason. After authorisation, work/materials may already have costs.

**Recommended model:** request with reason -> immediate pause on new work/purchasing/variation approvals -> admin gathers completed-work/cost evidence -> explicit outcome:

1. **Accept cancellation:** stop work; ticket stays Cancelled while settlement remains open.
2. **Reject cancellation:** mandatory reason; restore the exact prior valid stage only if its prerequisites still hold. Do not resume unsafe/impossible work.
3. **Need more information:** assign specific evidence tasks and next review date; remain pending.
4. **Disagreement unresolved:** facilitation or authorised binding decision; failed/unperformed outcome remains unresolved.

Allow documented make-safe actions, evidence and already-incurred cost recording during pause. Replacement needs linked new ticket. Example: admin accepts cancellation of SGD 1,000 work while contractor's claimed SGD 300 nonreturnable materials remain disputed. Cancelled does not mean nothing is owed.

**Question:** retain this admin cancellation gate, or allow immediate cancellation and admin involvement only for settlement? **Recommendation:** retain the explicit review with immediate pause. This is a product choice, and the owner expressly left it open.

## 5. Q6 — Broad admin powers without second-admin review

Confirmed: broad oversight/intervention and one named admin is enough. The exact overrides below are proposals.

| Area | Recommended power | Example |
| --- | --- | --- |
| Workflow | Hold/resume/cancel, reopen completion review, explicitly override CM/MCST gate. | Absent CM: record **Admin override — completion review**, never impersonate CM acceptance. |
| Financial authorisation | Decide disputed variation/settlement or override financial approval; correct amount through separate adjustment. | SGD 1,000 invoice with proven duplicate SGD 100 line: preserve original, add -SGD 100 adjustment, show effective SGD 900. |
| Payments/fees | Reconcile/correct records, issue distinct fee debit/credit/waiver, lift fee restriction. | Duplicate transfer creates refund obligation; actual refund evidence still required. |
| Verification/access | Add/revoke/renew credentials, restrict affected capabilities, reinstate eligibility, correct access/masking. | Required credential issue: assess affected active jobs; a badge cannot manufacture a real licence. |
| Support/reputation | Request evidence, moderate publication, correct misattribution, supersede decision after new evidence. | Wrong job named in feedback: preserve report and record correction. |
| Coordination | Claim/reassign admin tasks, log urgent attempts, assign next updates. | Named urgent owner does not authorise work by claiming the task. |

Record **admin identity, reason, evidence, before/after values, Admin's verdict, next actor/action/date, holds and notices**. Scope sensitive conduct visibility. Do not add second-admin sign-off or mandatory appeal delay; recommended Request Admin Support/Submit new evidence allows the same admin to reconsider.

Keep **verdict -> obligations -> actual execution -> verification**. A decision cannot make money arrive or work happen. Failed execution returns to unresolved follow-up.

**Question/recommendation:** approve the full explicit override list, including exceptional financial approval overrides. Ordinary permissions remain intact; CM cannot record payment. Admin correction/override is a separate named exception. Exact fee adjustments are Q7.

## 6. Q7 — Request Admin Support, by role

Confirmed mechanism: broad linked support case across the lifecycle, including after closure. Proposed contextual labels/examples:

| POV | Label | How it manifests |
| --- | --- | --- |
| Contractor | **Payment not received** | MCST reports sent, but money/amount is missing. |
| Contractor | **Partial payment concern** | Contractor disputes the displayed rationale or withheld balance. |
| Contractor | **Quote or scope issue** | Site differs from description, terms cannot be honoured, extra work demanded. |
| Contractor | **Invoice or QuoteFix fee issue** | Duplicate entry, wrong fee basis, payment not reconciled. |
| Contractor | **Feedback or track record concern** | Wrong job, duplicate report, disputed statement, pending response moderation. |
| Contractor | **Verification or account restriction** | Renewed credential not reflected or fee restriction despite payment. |
| CM | **Work or contractor issue** | No-show, interruption, defect, failed remedy, no response. |
| CM | **Quote, scope or invoice issue** | Ambiguity, unexplained price difference, stalled variation. |
| CM | **Approval or access issue** | Stalled handover or permission error; CM cannot remove MCST masking themselves. |
| CM | **Feedback record issue** | Duplicate prompt or incorrect job details. |
| MCST | **Payment or invoice record issue** | Wrong date/amount, duplicate payment, refund due. |
| MCST | **Pricing or conduct concern** | Unusual prices, unexplained variations, suspected undisclosed relationship. |
| MCST | **Work or approval concern** | Unauthorised work, scope breach, disputed settlement. |
| MCST | **Access or visibility issue** | Estate membership or CM contractor-identity settings. |
| All | **Other** | Short explanation plus optional evidence. |

These are contextual choices, not fourteen permanent buttons. Reuse seven categories: Work / Quote and scope / Payment and fees / Feedback / Verification and access / Conduct / Other. Prefill ticket and relevant record. Ask what happened, desired outcome, optional evidence; expand only relevant fields.

Show **Reviewing support request**, actual pending role/action, and Admin's verdict. Triage determines whether the issue blocks a specific gate; unrelated support does not freeze the whole job. Recommend private MCST/admin handling for sensitive conduct reports until admin determines appropriate disclosure. Confirm before implementation.

Financial adjustment recommendation: preserve original invoice/deadline; separate debit/credit record; new deadline only for a new charge. Reduced fee basis creates a credit/refund obligation; never silently rewrite a paid fee or declare refund complete. Exact credit/waiver/deadline policy remains open with Q6.

## 7. Q9 — Credential catalogue and expiry

Confirmed: admin offline authenticity checking/manual approval, editable credential types, optional expiry, grey expired badges and reminder one calendar month before expiry. The approved record is authoritative inside QuoteFix; verification is separate from reputation.

Suggested catalogue:

| Credential | Holder and useful scope | Primary source |
| --- | --- | --- |
| **bizSAFE level** | Company safety/risk-management recognition; record level/validity, not a workmanship score. | [WSHC FAQ](https://www.tal.sg/wshc/programmes/bizsafe/frequently-asked-questions) |
| **PUB Licensed Plumber** | Named person for applicable regulated water-service/sanitary plumbing work; link to contractor company. | [PUB plumbing works](https://www.pub.gov.sg/Professionals/Requirements/Licensed-Plumbers/Plumbing-Works) |
| **EMA Licensed Electrical Worker** | Named person; class Electrician, Electrical Technician or Electrical Engineer. | [EMA worker licences](https://www.ema.gov.sg/contact-us/worker-licences) |
| **BCA CRS registration** | Company workhead/grade where relevant; not a blanket prerequisite for every small private repair. | [BCA CRS](https://www1.bca.gov.sg/growth-and-transformation/procurement/registration-of-built-environment-firms/contractors-registration-system-crs/) |

Recommended fields: type, company/person holder, issuer, identifier, category/scope, proof, checker/date, optional expiry, status, notes. A configurable catalogue avoids code changes for every new credential. Do not force an expiry when none applies or derive generic expiry over a date on the evidence.

**Q9 recommendation:** optional badge expiry greys that badge; a required category credential expiring/revoked blocks affected new eligibility and triggers active-work review when relevant. Separate fee restriction (existing jobs continue) from safety/credential hold (affected work may pause). Admin configures category/scope prerequisites. One month means calendar month with month-end clamping; a newly added credential already inside the window should alert immediately. These boundary mechanics remain proposed.

## 8. Q11 — Feedback and reputation examples

**Missing data:** 10 jobs reached feedback point; 8 CMs responded; 2 respondents reported issues. Recommended display: **Reported issues: 2 of 8 jobs with feedback (25%). Coverage: 8 of 10 eligible jobs.** The two missing responses are unknown. Using 2/10 as the defect rate would reward missing data. These are illustrative numbers, not historical data.

**Repeat callbacks:** one job with three return visits = one affected job, three callbacks. Headline unique-job frequency; callback count/remedy rounds in detail.

**Reported / verified / resolved:** a disputed CM report is not automatically proven contractor fault. Record evidence status. A verified defect repaired later is resolved, not erased. Remedy responsiveness can improve independently of defect frequency.

**Publication proposal:** CM submission completes its task immediately; authorised participants/admin see the internal report; admin reviews passport narrative and contractor response before wider publication. Any verified aggregate uses adjudicated records; descriptive reported counts are labelled reported. Exact audience and aggregation/moderation basis remain open.

**Window mismatch:** work completed 1 October, payment received 1 December, Feedback due 31 December is not one month after repair. Keep the approved payment-based notification. Ask when a fault occurred, and separately define any true **issues within 30 calendar days of completion** metric from dated reports. Until agreed, say **Issues reported at follow-up** and show observation interval. Do not silently move the notification clock.

**Cold start:** no jobs -> **No track record yet**; limited responses -> show counts and limits, not a manufactured score. AI can compare quote terms and credential facts while explaining limited performance evidence. Formal scores, sample thresholds, confidence and weights remain in the existing reputation chat.

**Questions/recommendations:** approve unique affected-job counts plus coverage; separate reported/verified/resolved; admin publication boundary; distinct completion-based durability window versus payment-based notification. Keep scoring formula open. Extending the two/five-business-day reminders to unanswered Feedback is proposed, not yet approved.

## 9. Q13 — MCST permissions and risk signals

MCST authoring/base CM capabilities are approved. Apply identical accuracy/privacy/quote/rationale checks. Show the actual acting/assigned role in the pending bar.

**Proposed action:** MCST uses **Select and approve contractor**, recording selection and authorisation explicitly without a second named MCST user. MCST can perform CM-level completion review, attributed to MCST; routine review can remain assigned to CM. This interpretation needs confirmation before implementation.

Risk capability is approved in intent, detection rules are not. Start with inspectable facts/manual cues: **Unusual price difference**, **Repeated contractor selection**, **Unexplained price increase**, **Possible undisclosed relationship**. Open a private review case. These are prompts, not findings of price gouging/kickbacks. Automatic fraud conclusions remain outside approved scope. Preserve sealed quotes/masked identities in notifications and shared evidence.

## 10. Q14 — Fee restriction boundaries

Confirmed: overdue unpaid QuoteFix fees block new-job quoting while existing jobs continue. Retain login, fee statement, support, evidence submission and existing-job updates, variations, completion, invoices, receipts and replies.

**Proposed boundaries:** pre-existing unselected offers become unavailable for selection while restricted; “existing” means already selected/authorised commitments. Admin-verified full fee receipt lifts only the fee restriction, not independent credential holds. Uploaded payment evidence alone does not lift it.

Suggested notice: **New quoting paused — outstanding QuoteFix fees**. No full-account lock or automatic job reopening. Confirm the unselected-offer and reinstatement rules before building.

## 11. Keeping implementation small

Use core job phase plus linked obligations/immutable events. V5 is a routing check. Payment records distinguish sent, confirmed and deemed events without double counting. One case engine handles support/evidence/verdict/tasks/verification. One configurable credential catalogue supports new types. Restrictions target capabilities/reasons rather than one account-disabled flag. Derive pending bars and notices from the same obligations. No fictional reputation or old seed history enters live aggregates.
