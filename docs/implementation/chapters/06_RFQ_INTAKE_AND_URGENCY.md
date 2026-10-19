# Chapter 06 — Reporting a fault, AI refinement, RFQ publication and urgency

**Local construction, 13 October 2026:** [build evidence](../CHAPTERS_05_06_BUILD.md) records publication/privacy/revision/urgency implementation and executed checks. G06/G07 are approved. Local draft assistance is extractive; generative AI and optional video remain follow-up integrations, with quotes/selection supplied by Chapters 07–08. The scenarios below remain the complete requirements.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [05](05_CONTRACTOR_VERIFICATION.md) · Next: [07](07_QUOTES_QA_AND_VISITS.md)

**Dependencies:** 01–05. **Nodes:** I1–I3, Q1, U1–U4. **Timers:** T15/T16/T19, T11 after Admin acknowledgment. **Sources:** C02/C29–C34/C55/C61, O33/O35-D; [cross-cutting rules](../CROSS_CUTTING_RULES.md).

## 1. Outcome and construction order

Build the simple report form and local/server drafts first, then AI suggestion/review, grouping and priorities, contractor-visible privacy preview, publication/versioning and sourcing/urgency hooks. Manual reporting remains usable when AI is unavailable.

Visible checkpoints retain **Report an issue**, **AI is refining your draft**, **Approving AI input**, then **Requesting for quotes**. AI clarifies the user's observed facts; it must not invent diagnosis, quantity, technical specification or work method.

## 2. Fields and compulsory checks

| Field/check | Requirement | Visibility |
| --- | --- | --- |
| Observed problem and affected location | Required; original loose-language input preserved | Estate/Admin originals; Contractor receives approved sanitized scope |
| Estate/author/record time | System from authorized context | Exact identity/address withheld from Contractor before reveal |
| Category/scope | Required routing classification (E schema); initial handyman/plumbing/electrical | Relevant eligible Contractors; configured verification matrix |
| Urgency | Required choice in form (E presentation); urgent choice invokes approved human workflow | Relevant estate/Admin; no fabricated response guarantee |
| Evidence | Encourage clear photo; no-photo route requires explanation; video optional | Restricted originals and approved derivatives |
| Combined/separate repairs | Owner chooses toggle with information icon | Combined means one accountable whole-bundle quote/invoice/contact; separate creates linked tickets |
| Priorities | Primary plus optional secondary, or No preference | Comparison/AI input; never eligibility. Explain effect using information icon |
| Published description/privacy preview | Required human review/confirmation before publication | Exact reviewed version becomes contractor-visible |
| Extra site facts | Only if relevant/necessary for responsible pricing | Do not demand approximate area/material details merely to fill a form |

Priorities: earlier availability, lower total price, demonstrated workmanship, similar-work experience and less disruption. No preference has no added priority weighting and is not a hidden cheapest-price setting. Disclosed subcontracting keeps the accountable Contractor; applicable bundle prerequisites remain G06.

## 3. Publication, versions and next actor

Draft -> suggested structured draft -> author review/edit/manual route -> publish immutable RFQ revision and explicit quotation round -> eligible Contractors can quote. AI job returning after user edits cannot replace the newer draft. Preserve originals, AI output/model/input version and accepted changes separately.

Publication requires active estate authority and ready permitted evidence. Do not expose filenames/metadata/visible condo identifiers accidentally. Contractor exact-location reveal occurs only on approved visit or work authorisation, later chapters. MCST can author/publish under its base CM capabilities; record the actual author and responsible party.

RFQs never expire. Material revisions invalidate unreconfirmed prior-scope quotes; minor corrections notify without that gate. G07 defines borderline classification before coding; AI cannot silently label a material change minor.

## 4. Sourcing and urgent timers

| Trigger | Wait/event | Recipient, message/action and stop |
| --- | --- | --- |
| Publish RFQ or explicit new quotation round | T16 second following calendar date at 12:00 SGT | If fewer than 3 distinct eligible organisations with current selectable quotes, Admin sources/chases offline. Zero included; one Contractor's revisions count once |
| Publication on 1 December | Check 3 December noon, not 48 elapsed hours | Ordinary edits do not restart checkpoint; selection/cancellation makes sourcing reminder obsolete |
| Urgent publication | T15 immediately | Admin coordinates; preserve verification/work-authorisation gates |
| First urgent Admin notice remains unacknowledged | T19 +15min, +1h, +3h, then +10h/+17h/+24h and every 7h thereafter | Same urgent item; explicit Take coordination/acknowledgment stops this sequence |
| Admin acknowledges but attendance unresolved | T11 saved next update | Admin records attempts, confirmed ETA or unresolved sourcing, next actor/date; acknowledgment does not resolve RFQ |

Admin's coordination form requires actual response/attempt outcome and a next action/date when unresolved; ETA only if known. U3 attendance arranged does not mean Start recorded or work authorised. U4 remains unresolved with follow-up. Bell reading is not acknowledgment. Public app copy excludes internal staffing/coverage arrangements.

Do not chase CM to select merely because publication is old; the separate selection reminder starts only with three valid offers (chapter 08). Individual Contractors are free not to bid; overall insufficient coverage triggers sourcing attention.

## 5. API/audit and recovery

Commands: save draft, request AI refinement, accept/edit draft, publish, revise scope, open explicit round, claim urgent coordination and record follow-up. Publish writes RFQ version/round/audit/outbox atomically. Snapshot rule settings for this round (chapter 17). Deduplicate publication and urgency notices. Offline only saves draft/uploads; publication needs current online validation.

## 6. Verification tests

| ID | Scenario | Pass condition |
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

## 7. Completion gate

Deliver manual and AI-reviewed publication, privacy preview, grouping/priorities and sourcing/urgent integration. G06/G07 bound eligibility/classification details. Do not launch urgency until real Admin attention and unresolved follow-up are wired.
