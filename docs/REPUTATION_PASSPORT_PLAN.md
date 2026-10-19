# QuoteFix contractor reputation and passport working plan

Status: historical working proposal, 2 October 2026. The questionnaire and two-score formula below are superseded by the owner's two-phase feedback direction in [REPUTATION_FEEDBACK_MODEL.md](REPUTATION_FEEDBACK_MODEL.md). The quick/expanded passport table remains a draft. Passport refresh triggers are KIV at the owner's request. Confirmed owner choices are identified below; other proposals are not approved policy.

## Confirmed owner choices

- QuoteFix may start a new contractor with a provisional numerical reputation score based on five past jobs supplied by the contractor and independently checked through admin interviews with the commissioning properties or organisations. Admin needs a manual external-reference entry workflow. These are external references, not QuoteFix job outcomes.
- A numerical point of comparison is required in the passport. The precise formula, weighting, precision, and transition from external references to QuoteFix outcomes remain open.
- Contractor sees submitted feedback. Admin reviews before feedback appears in the shared passport. Contractors may respond subject to admin approval.
- Admin may void one CM/MCST feedback entry from scoring, with an internal reason and audit trail. CM, MCST, and contractor see that readable entry greyed out, without the admin reason or a textual exclusion label. This display choice needs legal and accessibility review before implementation.
- AI selection advice uses the CM's primary and optional secondary priorities in version one. No preference applies no CM preference weighting. Eligibility is separate from ranking; CM remains the selecting actor.
- The passport has a concise quick view and a more detailed expanded view. CM sees contractor identity only when the estate's MCST permits it; MCST and admin see identity. Identity masking must also cover identifying clues in evidence and AI text.
- The compulsory CM follow-up 30 days after the agreed contractor-payment event supplies callback, defect, and malfunction data. Its exact payment clock anchor belongs to the main lifecycle decision process. An unanswered follow-up is not a clean outcome.

## Proposed five-minute external-reference interview

Admin pre-fills contractor, contact, job date, trade, work type, property type, and supplied proof. Interview the organisation contact through an independently verified channel. Ask the following, with Not sure where appropriate:

1. Confirm the work and scope: Was this contractor responsible for this job, and approximately when was it completed?
2. Overall experience: Out of 10, how would you rate the contractor overall? This is a cross-check, not an extra scoring component.
3. Craftsmanship: Out of 10, how satisfactory was the finished repair? Ask whether it needed a remedy round.
4. Commitments: Did work start and finish when agreed? Record same-day/next-day/later start where known, any delay, and whether a change was agreed.
5. Durability: At about 30 days, was the same fault still resolved, did it recur, or can the contact not tell? Retrospective answers remain explicitly labelled as reference recollection.
6. Cost and value: Did the final amount match the agreed amount? Record approved variations separately. Out of 10, was the result good value for the price?
7. What is one strength and one concern a future buyer should know? Ask for concrete examples.

The interviewer records the respondent's words, source, verification method, date, and any uncertainty. Admin does not convert unknown into a favourable answer. CM and MCST feedback on one QuoteFix job remain one job-level observation rather than independent jobs.

## Proposed passport surfaces

| View | Feature | Derivation |
|---|---|---|
| Quick | Contractor label and verification | Identity shown according to MCST masking; admin verification and applicable credentials from verified records. |
| Quick | Reputation number and evidence size | Versioned formula over eligible feedback; show provisional/external or QuoteFix-observed source and job count beside the number. |
| Quick | Fit for this job | Relevant trade/work-type job counts plus current quoted availability, duration, warranty and exclusions; AI cites the selected primary/secondary priorities and evidence. |
| Quick | 30-day outcome and caution | Callback/defect/malfunction jobs out of completed, eligible follow-ups; AI states the strongest supported limitation. Pending and unanswered follow-ups are separate. |
| Expanded | Domain breakdown | Workmanship, kept commitments, early durability, urgency and disruption from structured responses and job events, each with a denominator. |
| Expanded | Similar work and property experience | Verified work-type, trade, and property tags for external references and QuoteFix jobs, separated by source. |
| Expanded | Timing record | Actual start and finish against the agreed dates; same-day experience shown only for jobs where that timing was requested and recorded. |
| Expanded | Cost and value record | Quote-to-final changes, approved variations and value-for-money feedback. Do not treat lowest historical price as a reputation trait. |
| Expanded | Feedback history and responses | Attributable, versioned feedback, remedy rounds, 30-day reports and approved contractor replies. Voided entries remain readable and greyed as decided. |
| Admin only | Evidence and moderation audit | Contact and verification notes, originals, revisions, admin decisions and private void rationales. |

## Draft numerical scoring model for owner review

For each independently verified reference, collect two anchored 0-10 ratings: finished workmanship (W) and reliability in meeting agreed start, completion, scope and cost commitments (K). The overall 0-10 answer is a cross-check, not an extra component; urgency and value are profile traits rather than general quality points. A proposed provisional reference score is round(10 x (0.60 x mean W + 0.40 x mean K), 1). It requires five verified and scorable past jobs and must display the source and denominator. For example, means of W=8.7 and K=8.1 give 84.6/100, labelled provisional from five external references.

Keep early durability separate at first because retrospective references may not recall a standardized 30-day result. On QuoteFix jobs, collect the scheduled 30-day response and use only completed, eligible follow-ups in a callback/defect/malfunction denominator. A possible later observed score, when at least five QuoteFix jobs have complete W, K and 30-day outcomes, is round(10 x (0.50 x mean W + 0.30 x mean K + 0.20 x D), 1), where D is 10 times the fraction of those jobs with no confirmed attributable issue within 30 days. This later formula and five-job promotion rule are proposals, not approved policy. The two score types must be labelled differently and must not be silently compared as though they have identical evidence. All formula versions and inputs remain preserved.

## Proposed refresh behaviour

- Recalculate numerical aggregates when an eligible external reference is verified, a QuoteFix outcome or completed 30-day follow-up becomes eligible, a correction is accepted, or admin voids/restores an entry. Save the formula version, inputs and resulting score.
- Regenerate the evidence-grounded strengths/concerns summary when its underlying eligible evidence changes materially. A contractor reply alone changes the displayed thread after approval; it does not alter a numerical score unless it results in an amended outcome.
- Re-evaluate a job-specific AI recommendation when the current quote, selected priority, eligible contractor set, or a material passport fact changes before selection. Preserve a snapshot of the evidence and verdict shown when the CM made a selection; later passport updates must not rewrite history.
- Run a periodic reconciliation check for missed updates and a periodic human review of score calibration, bias and disputed outcomes. Exact cadence remains open.

## Open design questions

1. Exact numeric rubric, anchors, formula, treatment of missing answers and 30-day durability, and threshold for promoting external-reference evidence to a QuoteFix-observed score.
2. Reference freshness, comparable-trade requirements, independently verified client diversity and how to handle fewer than five reachable clients.
3. Rules for publishing, redacting or hiding a voided but still readable entry if it is false, personal or defamatory; accessibility of greying alone.
4. Evidence thresholds for AI strength tags and for the AI to withhold a single recommendation.
5. Singapore legal review of reference permissions, privacy, defamation and AI output handling before launch.
