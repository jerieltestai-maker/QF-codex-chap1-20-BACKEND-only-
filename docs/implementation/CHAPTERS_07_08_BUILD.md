# Chapters 07–08 local build record

**Subsequent Chapters 01–08 audit, 13 October 2026:** [the current stocktake](CHAPTERS_01_08_AUDIT.md) records integration fixes, the complete 79-test local run and remaining limits. The 65-test count below is the original chapter construction run.

**13 October 2026.** Owner-authorised backend-first construction following Chapters 01–06. Simple web controls are included to exercise the backend. The owner's G05 answer is recorded in both memory files: suggest an editable expiry 30 calendar days from submission, requiring explicit confirmation; RFQs never expire.

## Implemented

- Compulsory quote declarations, conditional warranty/equipment/Other/unknown-duration explanations, exact final GST-inclusive SGD total, explicit additional exclusions and unchanged approved commitment wording. Optional narrative/PDF, immutable versions, withdrawals with reasons, post-visit revision reasons and expiry-preserving explicit reconfirmation.
- Private prequote questions, answer/decline, sanitized factual shared answers, material RFQ revision and reconfirmation. Initial-quote visit prerequisite, approval/decline and scoped audited estate-location reveal. Contractors retain own history after quoting closes, without access to rivals or later scopes they are not entitled to view.
- Current eligible comparison, one latest valid offer per company/round, exact highest and rational average, count/term differences, limited-comparison warnings, explicit caution acknowledgment and reproducible frozen comparison versions/terms.
- Current-threshold/version checks, CM authorisation at or below threshold, above-threshold pending MCST nomination, held selected terms across expiry, MCST approval/rejection and combined Select and approve with recorded Yes I know. Same-ticket preauthorisation reselection, explicitly new rounds and linked postauthorisation replacement tickets.
- Stable CM aliases under MCST concealment; optional narrative, decision free text and quotation PDF withheld from masked CM. Direct file authorization follows the same rule. MCST/Admin retain complete records.
- Real selectable coverage for sourcing; T13 unselected expiry; T17 five/ten-business-day checkpoints with remaining-time pause/resume; scheduled reviews preserving history/budget; T07/T22 two/five-business-day response checkpoints anchored to successful first issuance. Obsolete tasks/notifications are superseded and checkpoint deduplication survives worker retries.
- One transactional command outcome including domain facts, versions, audit, task/outbox and receipt. Access is rechecked on retries. Competing selections/revisions cannot authorise an unseen replacement version. Work authorisation has a unique immutable per-job constraint.

The architecture and privacy tradeoffs are in [ADR 004](../architecture/ADR_004_QUOTES_AND_SELECTION.md). Database migration 006 follows the five preserved migrations. Backend bindings are in `packages/domain/{quote,conversation,selection}-service.ts`, `procurement-clocks.ts` and `apps/api/src/quoting-routes.ts`; web controls are in `apps/web/quoting.js`.

## Executed validation

The complete local suite passed **65 tests**, including the prior 47 and 18 Chapter 07–08 tests. Type checking and compilation passed. New cases cover required/conditional fields, GST arithmetic, private Q&A and material answers, visit privacy/revision reasons, remaining-time coverage pauses, scheduled-review deduplication, threshold equality/version conflict, competing actors, expiry holds, rejection/reopening, linked replacement, masked PDF access, failure rollback, selection-versus-revision race and failed-first-notice response clocks. The integrated coverage/expiry test also verifies exact remaining deadlines through Christmas, New Year and repeated pauses; calendar primitive tests separately cover Singapore weekends/holidays; local persistence/restart checks remain in the full suite.

The fictional ephemeral browser preview exercises real forms and APIs. Quote submission with an unknown-duration reason and the explicit expiry/commitment controls was verified. The CM above-threshold nomination, MCST rejection, preserved same-ticket reselection, Back without mutation and Yes I know combined authorisation were also verified through the browser. The final frozen-price/authorised-work screenshot is saved locally under ignored `work/chapter78-authorised-preview.png` and delivered in the chat. No real estate/contractor records or external recipients are used.

Run the normal app through `tools/dev.ps1`; existing fictional contractors still require explicit Admin setup/verification and estate threshold configuration. `tools/chapter78-preview.ts` is a separate disposable memory-database preview on port 3303. It seeds fictional verified scope, configured threshold and two RFQs; it does not modify the normal persistent database. Its PDF scanner remains the normal fail-closed adapter.

## Remaining boundaries

Chapter 09 owns actual Start/progress/scheduling; authorisation stops at its entry point. Chapters 10–15 own variations, completion/invoice, payments/fees, cancellation/claims and warranty follow-up. Recommendation/reputation and integrity integrations are not fabricated while their separate policies are open. The approved additional exclusion preset list has no named entries yet, so the form provides explicit No additional exclusions/Other plus inherited declarations rather than inventing presets. No production provider, public deployment or paid service was provisioned.

This is local construction and test evidence, not a declaration of production release. Production PostgreSQL/provider/load/operations validation and cross-device security/UX hardening remain release work.
