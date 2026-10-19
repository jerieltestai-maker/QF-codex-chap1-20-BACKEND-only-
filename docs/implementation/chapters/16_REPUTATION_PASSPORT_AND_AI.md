# Chapter 16 — Reputation evidence, passport, moderation and comparison AI

[Master](../../IMPLEMENTATION_PLAN.md) · Previous: [15](15_FEEDBACK_AND_AFTERCARE.md) · Next: [17](17_MCST_INTEGRITY.md)

**Dependencies:** 05–08, 11/15 and support 14. **Node:** F4. **Sources:** [current feedback model](../../REPUTATION_FEEDBACK_MODEL.md), [passport view draft](../../REPUTATION_PASSPORT_PLAN.md). **G09/G10/G11 approved for the implemented scope on 18 October 2026.** See [build evidence](../CHAPTERS_15_16_BUILD.md) and [Gemini setup](../GEMINI_SETUP.md).

## 1. Confirmed model versus proposals

Confirmed: numerical comparison; five independently Admin-verified external past-job references may seed a labelled provisional score; inspection and compulsory 30-day evidence; separate rubric data; **Pure reputation score** and **Reputation score with CM priorities**. No preference makes the two equal. Recommendation weight 1.2; each specific dimension weight 1; durability weight 1 when assessable.

Approved rubric: Workmanship, Timeliness, Customer service, Value for money (1–5 stars), Recommend to others (five agreement choices). All five are required; any 1–2-star or negative recommendation answer requires a nonblank reason. Save drafts; submit separately from operational acceptance. Former 40/25/etc. weights and a later separate replacement “QuoteFix-observed” headline score are superseded.

Approved: 0/25/50/75/100 point map; primary 1.25/secondary 1.10 normalized multipliers; one unit per job; complete inspection required; omit unavailable/contested durability. Five independently verified complete approved external references unlock external scoring; then every reference/job has equal weight. Round once to one decimal. No preference gives identical scores. Specialty-strength thresholds remain open.

## 2. Required evidence and visibility

| Record | Required / conditional | Audience |
| --- | --- | --- |
| External reference | Contractor/work/date/source, independently verified referee/contact evidence, Admin interview/decision/time, uncertainty, rubric inputs under final model | Raw contacts/notes Admin-only; permitted labelled provenance/denominators in passport |
| Inspection feedback | Job/work context, respondent, rubric/recommendation under final questionnaire | Contractor sees submitted feedback; shared publication requires Admin |
| Durability | Chapter 15 rating/observation or unassessable exception | Source/observation date; absence not clean repair |
| Contractor reply | Parent feedback, text, actor/time/version | Shared after Admin approval |
| Moderation | Decision/actor/time/scope, private void/correction reason | Audience projection excludes internal reasons |
| Calculation snapshot | Formula version, eligible input IDs/component values/weights, denominator/result/precision; RFQ priorities for adjusted result | Permitted explanation; no raw private reference contacts |
| AI verdict | Current RFQ/quotes/priorities/evidence versions and supported fit/limitations | Actual role's masked/unmasked permitted view |

References are genuine evidence, not fake seed jobs. Fewer than five complete verified approved references do not contribute external points. Multiple feedback/remedy rounds on one job are not independent jobs.

## 3. Passport and comparison

Quick view: permitted name/alias, verification, numeric score plus evidence size/source, similar-work fit, durability outcome and supported caution. Expanded: rubric breakdown, experience tags, recorded commitments, initial/selected/final price movement, feedback/replies and provenance. Raw Admin contacts/void reasons remain private.

First-month callback/defect percentages are deferred by explicit owner answer; revisit at Chapter 20 completion. Late assessable feedback contributes with the actual observation date, without claiming a first-month outcome. Pending, unanswered and Unable to assess remain distinct; none proves no defect. Allegations/support disputes do not automatically become confirmed adverse reputation.

Priorities affect relevant history and current quote factors separately. Historical timeliness does not prove current same-day availability; historical value-for-money is not current price. A non-rubric priority affects broader AI evaluation instead of fabricated history points. RFQ-specific adjusted score never rewrites global pure reputation.

AI may recommend best match with concise **preference fit plus drawbacks/limitations** and evidence. CM chooses. State sparse/newcomer/external-only limitations; no fabricated history, guaranteed outcome or hidden cheapest-price fallback. Freeze the verdict/evidence shown at selection.

## 4. Moderation, voids and clocks

Submitted feedback is visible to Contractor; shared passport/reply requires Admin approval. Admin can void one CM/MCST entry from scoring with private reason/audit. Shared appearance stays readable on grey with legible text, without private reason/textual exclusion label. Admin may redact private/abusive text with an audit trail; concealed projections withhold identity-bearing free text.

Corrections are attributable, not silent deletion. Reply alone does not change score. Admin moderation enters T18/T11. Recalculate on eligible evidence/moderation/formula changes; regenerate advice on explicit request and reject stale evidence. No periodic recalculation is invented. The optional server Gemini adapter has bounded anonymous input/output and local factual fallback.

## 5. Build order and API

Evidence/provenance -> moderation -> approved versioned calculation -> quick/expanded view -> priority adjustment -> grounded verdict -> selection snapshot. Finalize mapping before numerical implementation. Store input facts separately from derived scores and retain historic model results.

AI provider failure leaves factual comparison/manual choice available. Old AI response cannot replace newer RFQ/quote/priority data. Masking/access changes invalidate unsafe projections/prompts; no private originals or allegations supplied to another role.

## 6. Verification tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CH16-T01 | External references plus QuoteFix jobs | Source counts correct; external work never labelled QuoteFix-observed |
| CH16-T02 | Fewer than five verified references/missing rubric | No padded data/invented number; approved missing-data policy required |
| CH16-T03 | No preference | Pure and adjusted scores identical |
| CH16-T04 | Priority with strong/weak corresponding component | Reproducible normalization; no global-score mutation |
| CH16-T05 | Pending/unanswered/Unable to assess durability | No clean-repair points; correct approved denominator |
| CH16-T06 | Several remedy reports on one job | One job-level unit; all rounds retained |
| CH16-T07 | Contractor reply/Admin void | Correct publication gate/private reason/audit and permitted score effects |
| CH16-T08 | Concealed CM accesses AI/passport/citations | No identity clues/private contacts/restricted allegations |
| CH16-T09 | AI fails or returns stale result | Manual factual comparison survives; no stale overwrite |
| CH16-T10 | Current price/availability differs from historical ratings | Verdict uses current facts, no false price/urgency inference |
| CH16-T11 | New formula version | Inputs/results reproducible; historical selection snapshot unchanged |
| CH16-T12 | Approved refresh/redaction and remaining deferred metrics | Evidence changes recalculate; redaction audited; no periodic job/public exclusion wording or unapproved percentages |

## 7. Completion gate

G09–G11 are resolved for the scope above. Verify golden-case calculations, moderation/access, current-evidence AI and frozen selection records. Production placeholder scores are unacceptable. Fault percentages, strength thresholds and production release checks remain explicit boundaries.
