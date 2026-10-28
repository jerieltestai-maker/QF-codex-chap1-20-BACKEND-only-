# Phase 4 — Impeccable audit and corrections

Method: dual-agent (A: `/root/impeccable_design_review`; B: `/root/impeccable_detector`). Assessment A finished before B's findings entered synthesis. Both used fresh browser contexts and remained independent. Target: `apps/web/index.html` and its current modules; mode: **Operate**. This is a scoped correction of [DESIGN.md](../../DESIGN.md), not another redesign.

## Independent design assessment

Initial score **26/40**, before the corrections below. No new numerical score is invented after implementation.

| Heuristic | Initial score |
| --- | --- |
| System status | 3/4 |
| Real-world language | 3/4 |
| Control and freedom | 3/4 |
| Consistency | 3/4 |
| Error prevention | 3/4 |
| Recognition over recall | 2/4 |
| Flexibility and efficiency | 1/4 |
| Minimalist presentation | 3/4 |
| Error recovery | 3/4 |
| Help and documentation | 2/4 |

The independent assessment found product-specific repair language, responsible-actor framing and careful privacy/authority distinctions. Its main concerns were cognitive load during first repair creation, distance between verification evidence and the final Admin decision, a flat navigation list, and empty states without the correct next action. First-time users needed clearer draft/create choices; power users needed better grouping; keyboard-dependent users needed reliable context and sidebar sizing.

| Priority | Issue | Final correction / evidence |
| --- | --- | --- |
| P1 | Repair inputs and save/create actions occupied alternating grid cells | Inputs have a clear sequence; creation has a primary action row; draft storage/reset actions are grouped separately |
| P1 | Verification evidence was separated from its decision by a long editor | Saved identity/evidence precede Admin review; editing is a secondary disclosure; final confirmation repeats the company and target with an ARIA description |
| P2 | Equal-weight navigation and compressed sidebar controls | Workflow/records/oversight/setup groups; no flex shrinking of controls; deliberate scroll; narrow Menu and Escape behavior |
| P2 | No-selected-repair and ineligible states had weak exits | Accurate choose-a-repair copy, queue return, and direct Contractor verification action |
| P2 | Generic success text persisted across unrelated views | Routine access/submission messages clear on a view change; actual errors remain actionable |

The final verification evidence is [sign-in](evidence/sign-in-desktop.jpg), [inspection](evidence/inspection-desktop.png), [narrow inspection](evidence/inspection-narrow.png), [invoice review](evidence/mcst-invoice-desktop.png), and [Admin verification](evidence/verification-admin.png). All job/financial screenshots use isolated fictional data.

## Deterministic scan and browser evidence

Assessment B's actual source scan returned **nine warning findings**, no error-severity findings:

- Five `cramped-padding` warnings at source line 0 without IDs: unconfirmed by the detector. Actual visible panels have measured insets; these are not represented as five proven defects or silently suppressed.
- Three `overused-font` warnings describe the same global Geist decision in the main/native-auth/CSS surfaces. Geist is the established, self-hosted operational face. It is retained for readability and consistency.
- One `skipped-heading` warning was real: the guest view went from H1 to local-account H3. The local-account heading is now H2.

The scanner produced usable JSON but returned exit 1; the playbook describes exit 2 for findings. This is disclosed rather than presented as a clean exit. The parent did not rerun the detector to seek a different result.

The native browser evaluation surface was read-only. A separate disposable CDP profile allowed the mutation preflight, but the live detector overlay was blocked by the app's existing `script-src 'self'` CSP. The security policy was preserved. **No live overlay execution or visible overlay is claimed.** The helper server was stopped with `--keep-inject`; disposable browsers, profile and script were cleaned up. The normal prototype server was not changed by either assessment.

## Technical hardening

The technical pass found and corrected stale-load races, invisible errors, inaccessible pending-operation recovery, context/permission refresh handling, a surviving-membership selector dead end, missing estate onboarding reads, legacy Support review controls, premature repair inspection, and evidence/draft loss on refresh. [The verification record](FRONTEND_VERIFICATION.md) maps these to behavior/API tests.

A rapid rendering check exposed the old 120-request global limiter counting ordinary assets and reads together. The final implementation exempts only registered public interface assets, separates read (600/minute) and command (120/minute) keys, and retains strict identity limits (10/minute). A real API regression proves the independent caps and Retry-After behavior. A rate-limited retry preserves an earlier uncertain command's idempotency key. No client performs an automatic consequential retry.

| Dimension | Engineering assessment | Practical limit |
| --- | --- | --- |
| Accessibility | 3/4: labels, focus, linked native validation errors, declarations, button/keyboard alternatives, inert navigation background | Complete screen-reader/AA certification not performed |
| Performance | 3/4: self-hosted font, bounded requests, static assets separated from action budgets, lazy secondary art | No production load/latency certification |
| Theming | 3/4: shared semantic tokens and one established light system | Dark mode is not an approved delivery requirement |
| Responsive behavior | 3/4: actual Chromium renders at desktop, tablet and narrow widths; no observed horizontal overflow | No physical-device claim |
| Implementation integrity | 3/4: tested server authority, versions, exact money, stale protection and uncertain-result recovery | Open policy/release/native gates remain separate |

These scores are engineering judgments about the inspected scope, not compliance certificates.

## Handoff

No remaining known P0/P1 defect was observed in the tested desktop journey. Application-specific shortcuts, a full assistive-technology review, other browser engines and production-scale performance remain future verification/improvement work. The development-only account helper remains available as previously requested by the owner; its presence is not a production authentication design.

Questions skipped: **0 remaining priority issues require a new product or design decision**; the owner already authorized completing the scoped fixes. Open business-policy questions in the product memory were not decided by this audit.
