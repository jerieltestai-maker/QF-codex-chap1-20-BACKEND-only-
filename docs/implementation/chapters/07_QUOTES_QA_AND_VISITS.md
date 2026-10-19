# Chapter 07 — Quotations, shared Q&A, site visits and revisions

**Local construction update, 13 October 2026:** implemented under owner authorisation. See [Chapters 07-08 build evidence](../CHAPTERS_07_08_BUILD.md) for tested behavior and remaining release integrations. G05/G06/G07 are resolved by the owner's explicit answers; G04 warranty automation and other independently open policies remain gated.

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [06](06_RFQ_INTAKE_AND_URGENCY.md) · Next: [08](08_COMPARISON_SELECTION_AND_APPROVAL.md)

**Dependencies:** 01–06. **Nodes:** Q3–Q6. **Timers:** T13/T22; T07 where an actual MCST approval applies. **Sources:** C04/C19/C35–C38/C55/C63, O34-A; [quotation wording](../../QUOTATION_FIELD_COPY.md).

## 1. Workflow and visibility

Verified eligible Contractors see the sanitized RFQ and their own quote versions. They may ask a question **before a first quote**. The question is private to the author/appropriate CM; CM may answer or decline and publishes only sanitized factual answers to eligible viewers. This is not an open Contractor forum. Price/proprietary facts and the questioner's identity stay private.

A site visit requires an initial quote and CM approval (MCST can exercise its inherited capability). Initial valid/current quotes are selectable immediately without a visit or a selection-ready stage. CM may decline information/visits; reminders do not force disclosure.

## 2. Required quote fields

| Field | Required rule and options |
| --- | --- |
| Final amount payable by MCST | Required SGD amount; includes any GST charged, using exact monetary arithmetic |
| Waste disposal included | Required explicit Yes/No; No carries exclusion/unknown-cost warning |
| Warranty included | Required explicit Yes/No |
| Warranty duration | Conditional on Yes: 7 days, 14 days, 1 month, 3 months, 1 year, Other with explanation |
| Making good included | Required explicit Yes/No |
| GST charged? | Required explicit Yes/No. Yes already included in final total; No declares none will be charged |
| Access equipment included | Conditional required Yes/No when RFQ flags equipment need |
| Earliest availability | Required relative to work authorisation AND available site access: same day, next day, within 2–3 days, within 4–7 days, Other with explanation |
| Estimated work duration | Required: up to half day, 1 day, 2–3 days, 4–7 days, Other with explanation, or Unable to estimate yet with required reason |
| Exclusions | Required explicit response; carry forward No declarations, additional presets/Other or No additional exclusions; do not ask twice for same fact |
| Expiry | Explicit valid date/time required by E form design; date-only valid through that day. Owner-approved editable 30-CD suggestion; explicit confirmation required (G05 resolved) |
| Quote commitment | Required unchecked checkbox with approved text below |
| Extra narrative/PDF | Optional; absence cannot be silently filled by AI or made a new readiness gate |
| Post-visit revision reason | Required; preserve before/after versions |

Required checkbox: **My quote will be valid when the CM selects it. Once selected, its price and scope remain held while awaiting MCST approval, if needed.**

Use the exact information-icon text in the quotation wording source. Icons open by click/tap/keyboard, not hover alone. Unknown excluded costs and unknown duration are prominent comparison cautions; unknown duration alone does not block selection.

## 3. Actions, events and next actor

| Action/event | Preconditions -> result | Next actor |
| --- | --- | --- |
| Submit/revise quote | Verified/currently eligible; open round; all required terms; current RFQ | CM/MCST comparison; coverage recalculated |
| Ask Q&A | Eligible RFQ access, specific question | Responsible CM/MCST answers/declines |
| Publish factual answer | Sanitized and privacy-reviewed; materiality classified | Relevant Contractors notified; material answer follows revision/reconfirmation |
| Request visit | Initial own quote exists | CM/MCST approves or declines; approved reveal logged |
| Post-visit revise | Still open round; required reason; new exact terms/version | Updated comparison, record revision history |
| Material scope changes | New revision published | Old quote unselectable until Contractor reconfirms/revises; count excludes it |
| Minor correction | No material scope/price effect under defined policy | Notify; quote not invalidated solely by correction |
| Select exact valid quote | Chapter 08 succeeds | Quoting/revisions pause/close as applicable; held terms cannot be unilaterally changed |

A manual **Prompt Contractor to Re-Quote** bell supplements system change/expiry notices. It does not create a new obligation to bid, extend expiry, restart the round or restore old selectability. Group/rate-limit duplicate technical delivery without silently inventing a product cooldown.

## 4. Timers and countdowns

T13 checks each unselected quote's effective expiry; notify that Contractor and display Expired in the permitted comparison. RFQ remains open. A selected held quote survives its former expiry. No extra pre-expiry cadence approved.

T22: actionable Q&A/visit/Contractor-terms response -> responsible actor +2 BD, Admin +5 BD if unanswered; decline counts as response. Avoid duplicate T07 when that specific approval rule applies. Admin evidence requests may use their explicitly dated task. After expiry/restriction/material edit changes coverage, update T16/T17 rather than starting independent quote-count logic.

## 5. Data/API and exceptions

Immutable quote/terms versions link to exact RFQ revision and round; reconfirmation records the reviewed revision, not a checkbox unconnected to terms. One current offer per Contractor organisation counts. Validate no contradictory exclusion/declaration. Rival quote endpoints, Q&A logs, original visit requests and bell payloads obey audience boundaries.

Recheck expiry/eligibility/current scope at selection even if background expiry worker is late. Offline editing is a draft; reconnect fetches current RFQ before explicit quote submission. A pending selection cannot be circumvented by retrying a quote revision from an old phone.

## 6. Verification tests

| ID | Scenario | Pass condition |
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

## 7. Completion gate

Deliver field validations, privacy-controlled Q&A/visits, immutable quotes, expiry/reconfirmation and responsible-response timers. G04 warranty automation remains separately gated. G05/G06/G07 are resolved by the explicit owner answers recorded in the memory files.
