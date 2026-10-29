# QuoteFix design system

The owner-supplied **QuoteFix-Design-System.zip** is the visual authority for the replacement desktop interface. The owner rejected the prior achromatic design. Preserve the current domain behavior in [product memory](docs/PRODUCT_MEMORY.md) and [open decisions](docs/OPEN_DECISIONS.md); the ZIP's older policy snapshots and illustrative data are not runtime truth.

## Foundations

- Manrope 200–800 for interface text; JetBrains Mono for identifiers. Both are self-hosted with OFL licenses. No runtime font CDN.
- Navy `#0A1A4A` ink and primary actions; cool `#EEF3FA` page well; white chrome and panels; blue `#2463D9` links and `#4C8DFF` progress. Coral marks required attention, amber caution, green actual successful states.
- The supplied tokens live in [design-tokens.css](apps/web/design-tokens.css). Compatibility aliases in style.css connect existing components to those same values.
- 220px labelled white sidebar, 28px desktop insets, 16px panels, 18px status bars, pill buttons, 10px form controls. Body 14px (slightly above the kit's 13–13.5px for readability); narrow form controls 16px.
- Restrained supplied card shadow, flat backgrounds, no entrance animation. Existing reduced-motion and visible keyboard focus remain.
- Owner logo and illustrations retain original bytes. Example repair photographs remain explicitly synthetic guidance; they are never job evidence.

## Information architecture

Home answers “What needs my action?” Your actions and All repairs are separate tab panels. The persistent rail groups workflow, records, and collapsible oversight/setup. A selected repair gets one contextual status bar with the backend's current pending actor/action. Lists and selected detail views occupy separate panes, with a visible way back.

Task tabs contain only relevant workflow areas. Sequential forms show one numbered step at a time. A step's title and visible fields carry the explanation; general guidance, history and optional detail are collapsed. Required declarations and guard text stay at the final decision. Prior steps remain editable; Back preserves all entered values. Moving between steps never executes a domain command.

`flows.js` supplies real DOM wizard and tab controllers with native labels/buttons, arrow-key tabs, inert inactive panels, step URLs, required-field validation and error-driven reveal. These adapt the existing app's commands rather than replacing them with the ZIP's local-state demos. Every consequential action still uses the existing exact-version API and idempotency recovery.

## Layout and states

The app remains fluid rather than inheriting the kit's 1280px minimum width. At 800px the sidebar folds to Menu, the background is inert while open, and Escape returns focus. At 390px all information reflows within the viewport; only an explicitly scrollable tab/step row may scroll internally.

Real empty accounts show a concise empty state and a real next action; no sample dashboard counts or names. Loading/error/uncertain states stay with the relevant action. Exact SGD amounts use two decimals; timestamps use Singapore time with a 24-hour cycle. Confirmations start unchecked and reset after a fresh server decision context.

## Verification

See [guided redesign record](docs/design/GUIDED_FRONTEND_REDESIGN.md). The prior frontend handoff/audit remain historical evidence. No fresh claim of WCAG certification, physical-device validation or hosted deployment is implied by desktop tests.
