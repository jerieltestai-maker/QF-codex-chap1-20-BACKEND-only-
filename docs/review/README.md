# QuoteFix lifecycle review materials

## Implementation-plan handoff — 13 October 2026

[Master 0.3](../IMPLEMENTATION_PLAN.md) is now the current 20-chapter construction plan; lifecycle v14 is unchanged. [GitHub Mermaid gallery](DIAGRAMS.md) embeds the existing diagrams for portable review. The generator now defaults its visual output to docs/review/quotefix-status-review.html, with --visual available for an explicit host path. The maintained shell is unchanged and its interactive host requirements remain. Historical entries below retain their original version references.

Planning revision: 12 October 2026, **2026-10-12-v14**. No QuoteFix application feature has been implemented. The current approval boundary is in `../LIFECYCLE_REVIEW_2026-10-12_V13.md`; verification entries for earlier revisions below are historical.

## V14 planning handoff

Owner reconfirmed v13 and approved Feedback at 09:00 SGT for date-only receipt, fair late-discovery reminder allowances, date-only expiry through the stated day, and missed scheduled-Start Admin/+24h estate attention. Source wording now consistently preserves material-scope reconfirmation under C36/Q4; stale Q12/Q7 markers removed. `../IMPLEMENTATION_PLAN.md` is draft 0.1, not application code or stack approval. Rendering shell unchanged.

## V13 update

O35/O36 resolved: third distinct valid quote starts selection reminders, with pause/resume below three and early selection still permitted. Late-work notice uses the +24h still-outstanding guard; ordinary revised completion dates use authorised Okay / Admin Intervention. The Start +24h first-estimate Admin exception is distinct and retained. Urgent attention repeats every seven hours after +3h. No new node or ticket stage; existing variation/coordination machinery is reused. All earlier verification entries below describe their dated revision.

V13 verification: 83 anchors, 200 edges, 34 views; source/embedded-model equality, resolved-question markers and policy assertions passed. Twelve viewport checks across sourcing/work/urgent views passed without browser or ResizeObserver errors. Revised-date fields, paused-selection copy, situation-aware comment export and preserved Admin-only evidence routing checked. Sourcing screenshot inspected. The rendering shell was unchanged; these checks validate the planning review, not a deployed backend.

## V12 update and verification

83 stable anchors, 200 valid edges and 34 views. The new sourcing/selection section separates the approved second-calendar-day noon sourcing checkpoint from the 5/10-business-day selection cadence. Pre-quote Q&A with CM discretion, Start +24-hour temporary estimate and Admin-only extensions, overdue-work attention, ordinary/urgent Admin queue intervals and the external coordination ledger are recorded. O33/O34 are resolved; O35 boundaries remain explicitly open. Timing register section 14 is the current key-days/Admin-coverage reference.

Focused local browser checks passed 12 viewport changes across sourcing, work and urgent flows, from a 320px inline width. No page or ResizeObserver errors occurred. Source/embedded-model equality, all route/variant references, preserved Admin-only evidence authority, responsive graph/list switching, sourcing actor display and situation-aware comment export passed. Sourcing screenshot inspected: labels and controls are readable. The maintained shell's existing resize repair is preserved; its only presentation change is the default sourcing section. These checks exercise the review tool, not a production QuoteFix scheduler.

- `flow-model.json` holds stable node IDs, proposed UI copy, triggers, gates, authority markers and transitions.
- `proposals` retains stable A/B comment anchors as approved summary views of the integrated current flow. `uxAuditGroups` records approval of all groups. Stable P8/P9 IDs now describe tasks within one support case; P10 is the internal dates rule.
- `quotefix-full-flow.mmd` covers the ticket/support/aftercare flow; account fees are intentionally separate in `fees.mmd`.
- The smaller `.mmd` files are readable sections of the same flow.
- `NODE_REFERENCE.md` explains every node and its exits.
- `../LIFECYCLE_REVIEW_QUESTIONS.md` contains the restated questions and recommended decisions.
- `build_review.py` regenerates the diagrams, node reference, lifecycle document and interactive review from `flow-model.json`, `lifecycle-template.md` and `review-shell.html`. The maintained shell contains the resize repair; never patch only the generated visualization. These are planning aids, not application code.
- `../LIFECYCLE_REVIEW_2026-10-07_V9.md` records the latest corrections and explanations. V8 is historical on questions subsequently resolved.
- `../LIFECYCLE_REVIEW_2026-10-07_V10.md` records mandatory re-inspection of each physical remedy and the new timing approvals; it supersedes v9 open O05/FQ1 wording.
- `../TIMING_AND_NOTIFICATION_REGISTER.md` is the current trigger → interval → recipient/message → consequence reference. It distinguishes approved clocks from narrower scheduling gaps.
- `../LIFECYCLE_REVIEW_2026-10-11_V11.md` records Admin-only evidence sufficiency, offline coordination, parallel final-resolution acknowledgment, numbered inspections, the approved cancellation alert safeguard and contextual explanations of remaining timing choices.
- `../LIFECYCLE_REVIEW_2026-10-06_V8.md` records the approved transfer-proof/notification rule and remaining exception-policy decisions. Earlier v6/v7 material is historical; Q3/O18 and UX1 are resolved.

Interactive review: section picker, clickable nodes, UI copy, expandable checkpoints and per-node comments. Situation selectors demonstrate actual pending actors on conditional nodes; a saved comment retains its selected situation. Keep comment retains it; Send comments starts a follow-up through the host when supported. Show text to copy is the fallback. Host state is best-effort; keeping alone does not send a message. The admin-backtrack view isolates restoration exits for readability; full graph and target-stage sections retain other transitions.

V6 verification: 77 current nodes, 180 edges, 29 current sections and 2 isolated proposal views. Every current checkpoint belongs to exactly one audit group; proposal IDs/edges do not enter the current graph. Existing variation, restoration, completion/invoice and invoice-review transitions remain, so unapproved merges are not applied. P7 UI rows hidden; F1 action hidden and F2 due action visible; W1 prerequisite and P2 copy checked; MCST/Admin countdown text shown. Six affected views render without browser errors, including both readable proposal diagrams; proposal screenshots inspected. Proposal comment capture/export passed without sending a test message. No horizontal overflow at 360px. Standard sandbox setup failed; authorised local file/preview commands used escalation successfully.

Confirmed product memory and open decisions remain in `../PRODUCT_MEMORY.md` and `../OPEN_DECISIONS.md`. Diagram colours never resolve an open policy by themselves.

## V9 runtime repair and verification

The earlier width-only/requestAnimationFrame ResizeObserver patch did not prevent the failure reported in the real inline host. This revision removes the fragment's ResizeObserver entirely. CSS container queries switch between the readable Mermaid diagram and the connected list. Mermaid measures inside a clipped, layout-contained staging element; renders are serialized and cached per section. Selecting a node or receiving an unchanged/echoed widget-state snapshot no longer rerenders Mermaid. A delayed local state echo cannot overwrite a newer unsaved draft. No global error suppression is used.

The repair lives in `review-shell.html`, so `build_review.py` carries it into every regenerated review. `test-review-runtime.cjs` is retained for regression coverage. Run the visualize skill's `scripts/render.py <absolute visualization path> --serve --port 8777`, then run this test with Node; set `PLAYWRIGHT_MODULE` if the bundled Playwright path differs.

V9 checked: 82 unique review anchors, 193 valid edges, 31 sections plus two approved summary views. The three extra Feedback anchors record outcomes of one form, not additional user tasks. Billing is excluded from the ticket Mermaid and uses separate background assessment events. Sixty viewport checks passed at inline widths from 320px upward, including repeated breakpoint changes. Rapid navigation, delayed/unchanged host echoes, newer-draft retention, genuine external state restoration, comment export and reload persistence passed with zero browser/ResizeObserver errors. Final feedback screenshot inspected; outcome labels no longer overlap. Frame height follows content without clipping the action controls in DOM layout. This verifies the local autosizing preview, not an assertion that every future host/runtime can never fail.

The latest question register is authoritative: O05 adjustment timing/refunds and FQ1 Feedback reminder cadence remain open. Q21/O24/O25/O28/O14 are resolved.

V8 verification: 77 stable anchors, 185 valid edges. Required transfer proof, first-notification clock, partial/dispute safeguards, A/B approval, removal of the late-entry Admin branch and permanent variation audit content checked. Six affected sections render as diagrams at normal width; 24 viewport changes passed without overflow or ResizeObserver errors. Internal-node UI and comment export passed. Payment summary screenshot inspected. Q21 is still explicitly open; no mandatory rejection-reason gate inferred.

V7 verification: 77 stable checkpoint IDs, 186 valid edges; UX2–UX15 approved, UX1 integration held and Q3 open. Automatic variation/restoration/zero-outcome nodes expose no extra UI task. Combined completion form and invoice-only return routes checked. Six affected views rendered through 24 width changes (320px minimum inline width); comment export and internal-node visibility passed with no page or ResizeObserver errors. B screenshot inspected. Earlier V6 verification describes the historical proposal-only revision.


D7 / O29 remains a deferred open policy: whether an unresolved support case may be archived. Recommendation only: defer archival for launch, keep the case explicitly unresolved with named follow-up, and never treat inactivity or archival as successful resolution. This records the existing D7 doubt; it is not approval of new behavior.



## V10 verification

Model: 82 unique anchors, 193 valid edges, 32 sections. The new inspection-rounds view and R1/D8 details passed focused browser checks at four width changes (minimum 320px inline), with no browser errors. Corrected-round inspection and same-round acceptance wording checked; screenshot reviewed. The previously repaired rendering shell is retained. A sandboxed browser launch and cross-sandbox preview connection failed; the same local preview/browser check passed together outside that sandbox. Timing reference created; O05/FQ1 approved, O29 and documented O30 scheduling details remain open.

## V11 verification

83 unique anchors, 194 valid edges and 33 views. D3 and all evidence situations return to D2; only D9/D5 Admin decisions enter D4. No participant rejection/counterproposal exits remain. Acknowledgment is informational and parallel to authorised obligations. Current inspection headings show no [1st] suffix and demonstrate [2nd]/[3rd]/[4th]. Aftercare acceptance routes to its case verification and does not trigger the original invoice chain.

The retained regression suite passed 60 viewport checks across the affected Admin, aftercare, inspection, outcome and cancellation views, with no browser errors. It also checked evidence routing, final acknowledgment controls, inspection headings, comment export, host-state echo behavior and reload persistence. Twelve focused viewport checks followed the first label/layout adjustment. Screenshot inspection caught overlapping edge labels, which were shortened. The maintained shell still has no fragment ResizeObserver; contained serialized Mermaid rendering and CSS responsive selection are retained. Model-to-embedded-data equality, all-83-node timing audit coverage and edge references were checked. These checks validate the review tool, not a deployed QuoteFix application.


Final focused check: inspection/aftercare views rendered after the last label and view-scope changes, with no browser errors and action controls within the iframe viewport. O32-B is linked from D9; the regenerated embedded model matches the source.
