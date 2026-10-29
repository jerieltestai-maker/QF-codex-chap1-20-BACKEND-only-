# Guided frontend copy review — 29 October 2026

The owner requested ASTRA design direction with SOL implementation, using Impeccable `clarify` and `distill`. The supplied QuoteFix design system remains the visual authority: Manrope, JetBrains Mono, navy, blue and cool gray. This is an Operate interface for CM, MCST, Contractor and Admin completing consequential repair tasks.

## Decisions

- Keep one task in view through existing steps, tabs and disclosures. Keep required declarations and decision consequences beside the final action. Moving through a form never submits a domain command.
- Shorten repeated introductions and refresh messages. Preserve the distinction between a private repair draft, a published RFQ, a submitted quotation and authorised work.
- Use consistent action labels. Saving a device draft and attaching a file do not submit a quotation, claim, payment record or support case.
- Keep payment sent, actual receipt and verification distinct. QuoteFix records external transfers; it does not move money.
- Use a short **Quote expiry** label with an accessible format helper. Date-only validity still runs through the specified Singapore date; date/time input still requires a timezone.
- Give the main final action primary styling, including quote submission, RFQ publication and verification. Keep draft utilities secondary. Slider alternatives retain the same confirmations and command guards.
- Preserve exact legal declarations, scoped versions, cautions, required inputs and policy boundaries. No feature or domain option was removed.

## Review and corrections

ASTRA reviewed CM comparison, Contractor quotation, MCST payment and Admin verification desktop captures, plus Contractor work at 390px. The review found final quote submission visually competing with Save device draft; explicit primary classes correct that hierarchy. It also identified repetitive comparison-refresh copy and a crowded expiry label, now shortened without removing meaning. Singular offer counts are corrected.

The MCST payment capture exposed `privacyNotice is not defined` in visible status text despite a clean browser console. The support renderer now declares and appends that node before toggling it. The focused form harness rejects programming exceptions caught into status, and a regression checks confidential guidance visibility and that toggling privacy sends no command. Root's journey harness separately checks caught status errors at browser checkpoints.

Adding a primary class to final slider alternatives initially broke exact-class matching in completion step assignment. The executor's focused checks exposed this; matching now accepts multiple classes, keeping the final confirmation in the final step. ASTRA inspected the corrected placement logic and privacy regression.

Tab reset now updates its matching URL to the initial tab, consistent with wizard reset. This prevents later navigation from restoring a stale tab after an account/access reset.

## Evidence and limits

Executor validation: 5/5 web-client checks, 36/36 delivery/support/feedback/oversight form checks, 11/11 quotation form checks, and syntax checks for the ten owned scripts. Shared flow syntax also passed. The initial integrated form run exposed a missing `classList` API in the quotation test double; its minimal implementation now keeps `className` synchronized. The obsolete expiry-label lookup was updated without weakening assertions. These focused checks overlap the integrated suite; they are not added to its total.

Fresh `journey-copy-verified` desktop captures were visually reviewed for quotation, verification, inspection and payment. They confirm the clearer expiry helper, primary quote submission, retained declarations and absent payment-page rendering exception. An earlier browser attempt stopped on its obsolete trade-save success-text assertion; its report remains preserved. Fresh browser and complete-suite results are recorded in [the guided redesign record](GUIDED_FRONTEND_REDESIGN.md).

G02, G04, G14, G15, specialist/fault rules, native-device validation and production release remain open. No SQL migration, operational record or secret was changed by this copy pass.
