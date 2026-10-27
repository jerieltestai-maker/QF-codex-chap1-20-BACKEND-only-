# QuoteFix feedback model: inspection and 30-day follow-up

## Owner-approved implementation — 18 October 2026

This section supersedes the historical proposals/open choices below. G09/G10/G11 are approved for this scope. [Build evidence](implementation/CHAPTERS_15_16_BUILD.md) and [ADR 008](architecture/ADR_008_FEEDBACK_AND_REPUTATION.md) record implementation and limits.

- Use all five inspection questions below, all required. Require a nonblank short reason for any 1–2-star answer or Disagree/Strongly disagree. Preserve drafts; submitting the questionnaire is separate from accepting work.
- Map 1–5 to 0/25/50/75/100. Weight each dimension 1, recommendation 1.2, assessable durability 1. Omit unavailable/contested durability; require complete inspection for a scored job. Normalize per job and average one unit per job. External references enter only after five independently verified complete approved references; each reference/job then has equal weight.
- Normalize primary 1.25/secondary 1.10 multipliers and display one decimal. No preference gives identical pure/adjusted results. Current quote price/availability are separate facts, not historical rubric points.
- Recalculate on eligible evidence/moderation/formula changes. Advice regenerates on explicit request; reject stale advice. Voided feedback remains readable on grey with legible text and no public exclusion label/private reason. Admin redaction of private/abusive content is audited.
- Late assessable feedback counts with its actual observation date. It is not evidence of a first-month outcome. Fault/callback percentages are deferred until attribution/window/denominator rules are agreed; remind the owner at Chapter 20 completion. Specialty-strength thresholds remain open.
- Gemini is the owner's provider choice. Gemini 3.5 Flash-Lite is configured locally and passed one fictional live comparison check; [setup and cost boundaries](implementation/GEMINI_SETUP.md). Production release is not claimed.

## Historical discussion — superseded where the approval above applies

Status: owner direction and working scoring proposal, updated 6 October 2026. The owner has confirmed equal baseline weight for each specific reputation dimension and a 1.2x weight for the overall recommendation answer, plus two labelled reputation calculations: pure and adjusted for the CM's priorities. Exact priority multipliers, optional-secondary treatment, incomplete-data method and source weighting remain open. The refresh-trigger policy is KIV at the owner's request. This document supersedes the questionnaire and two-score proposal in REPUTATION_PASSPORT_PLAN.md; that file's passport-view draft remains useful.

## Confirmed direction

- Live QuoteFix jobs have two CM feedback moments: a short wizard during inspection and a compulsory 30-day durability follow-up after the agreed contractor-payment event.
- Inspection uses five-star rubric ratings and a final five-choice recommendation statement, from strongly disagree to strongly agree. The owner specifies the labels Workmanship and Customer service. The questions must profile the contractor with minimal CM effort.
- The 30-day form uses a five-star durability rating and a mandatory short positive or negative observation about the repair. An unassessed repair must be recordable without inventing a rating or treating silence as a good outcome.
- Both moments contribute to the contractor's reputation record. Preserve separate rubric scores for workmanship, timeliness and other approved dimensions. Display a pure reputation score with equal baseline contribution from components, and a reputation score adjusted for the current RFQ's CM primary and optional secondary priorities. With No preference, both calculations must be identical. Priorities do not alter eligibility.
- Five admin-verified external past-job references seed the provisional score. Admin records the source and interview evidence; these are not falsely attributed to QuoteFix CMs or QuoteFix jobs.

## Proposed inspection wizard, designed for about one minute

Admin interviews of external referees can use the same questions after confirming the work. Five simple screens, each with one tap and automatic advance, are proposed:

1. Workmanship: How satisfactory was the finished repair? 1-5 stars.
2. Timeliness: How well did the contractor keep the agreed start and finish commitments? 1-5 stars. A separately recorded agreed schedule change is not automatically a failure. Speed of arrival is recorded as a separate fact.
3. Customer service: How well did the contractor communicate and respond to the CM while working on site? 1-5 stars.
4. Value for money: Considering the agreed final price and result, how good was the value? 1-5 stars. Approved variation costs remain visible as facts.
5. Recommendation: I would recommend this contractor for similar work. Strongly disagree / disagree / neutral / agree / strongly agree.

Use a one-tap reason category only for an especially low rating, with an optional short explanation. Reuse the job's recorded dates, variation and remedy history; do not ask the CM to re-enter them. The exact number of screens and reason requirement remain open.

## Proposed 30-day form

Ask: Is the repaired item still working as intended? Yes / issue returned / unable to assess. When assessable, collect 1-5 durability stars and one required short observation, good or bad. When unable to assess, collect the reason but no durability points. Record callbacks, defects and malfunctions against the job, with each remedy round attached; multiple reports from one job do not become multiple independent jobs. A disputed causal attribution requires review before it becomes a confirmed adverse durability outcome.

## Proposed calculation for discussion

Convert each 1-5 star response to 0, 25, 50, 75 or 100 points. Map the five recommendation choices to the same 0-100 points. Do not simply sum all clicks: different jobs have different numbers of follow-up responses.

The former 40/25/15/10/10 inspection weights are withdrawn. The owner confirmed a relative weight of 1 for Workmanship, Timeliness, Customer service and Value for money, and 1.2 for the overall Recommend to others answer. Durability receives relative weight 1 once an assessable 30-day response exists. A proposed point map converts each 1-5 star answer and five-choice recommendation answer to 0, 25, 50, 75 or 100. Before durability is assessable, the job's pure score is (W + T + C + V + 1.2R) / 5.2 and is marked "Durability assessment pending"; no clean-repair points are inferred. When an assessable 30-day rating arrives, the same job's pure score becomes (W + T + C + V + 1.2R + D) / 6.2. If the CM selects "Unable to assess," no durability rating is invented and that status remains explicit. Exact handling of missing inspection answers and external references remains open.

For a priority-adjusted reputation score, apply a multiplier to the selected rubric component before taking a normalized weighted mean. Example for an observed job: primary Timeliness at a proposed 1.25 gives (W + 1.25T + C + V + 1.2R + D) / 6.45, with all component values on the same 0-100 scale. Before durability is assessable, omit D and use denominator 5.45. Normalize by the total weight so the result remains 0-100. With No preference, all CM priority multipliers are 1 and the adjusted score exactly equals the pure score. A selected priority can raise or lower the adjusted score according to the contractor's performance on that dimension; identical component ratings can yield identical pure and adjusted scores even when a priority exists. The exact primary multiplier, smaller optional-secondary multiplier and evidence requirements remain open.

The same inspection rubric can be asked in the five historical reference calls, entered by admin and clearly labelled external. The later QuoteFix inspection and durability responses feed the same evolving headline number; a separate replacement QuoteFix-observed score is not required by the owner. Keep source counts visible to expose the bias and limited size of contractor-selected references.

Rubric dimensions remain separately visible. The two displayed numbers are Pure reputation score and Reputation score with CM priorities; the second is specific to the current RFQ. Neither is the complete quote comparison. The AI verdict must also consider current final SGD price, current promised availability, expected duration, relevant experience and other quote facts separately. Timeliness stars measure keeping past commitments; they do not by themselves prove same-day availability. Value-for-money stars are not a substitute for the current final price. If a CM chooses a priority that is not a reputation rubric, its effect belongs in the broader AI verdict rather than being falsely converted into historical reputation points. The original priority menu and any new rubric-specific choices remain to be reconciled.

## Open choices

- Final wizard question wording, point mapping and handling missing inspection answers. Relative weights are confirmed: 1 for each specific dimension, 1.2 for overall recommendation, and 1 for durability when assessable.
- Primary and optional-secondary multipliers and how the priority menu maps to rubric versus current-quote factors.
- Handling incomplete inspection answers, unavailable 30-day assessments and contested defect attribution in the numerical formula.
- Weight of contractor-selected external references as verified QuoteFix job evidence accumulates.
- Threshold for describing a contractor as strong in a rubric or an urgent-response specialty.
- Passport refresh and summary regeneration triggers, deliberately deferred for a subsequent discussion.


## Lifecycle collection clarification — 7 October 2026

The owner confirms 1–3 stars as negative durability feedback and 4–5 as positive, with a compulsory open observation for either. No response triggers CM reminders then Admin follow-up, never a positive rating. Unable to assess is explicitly retained as a non-rating exception. A low rating is not automatically a repair claim; aftercare is a separate request. This does not change the separately approved 1.2 recommendation weight, durability contribution, dual-score approach or KIV refresh policy. V10 approves the cadence: due notice, CM reminder after two business days, Admin alert after five business days, then Admin-set follow-up. Stop on a rating submission or Unable to assess.
