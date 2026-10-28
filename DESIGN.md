# QuoteFix desktop web design

Authority: owner brief and decisions in [product memory](docs/PRODUCT_MEMORY.md) and [open decisions](docs/OPEN_DECISIONS.md). This is the visual source of truth; business behavior belongs to the domain/API, not this document.

## Direction and use

An operational repair workspace for CM, MCST, Contractor and Admin. The first question is **what requires my action, for which repair, and who is responsible next?** Quotations, money and evidence must remain inspectable at their actual versions.

Taste app-screen draw: **Achromatic ledger**, seed **42328629**, light workspace, open-plane shell. Chosen for long administrative sessions, comparison and financial accuracy. The face is a cool ledger ground, precise tabular figures and the selected repair's stage/actor context. There was no palette or composition redraw. The owner's later supplied blue QuoteFix logo and illustrated workflow assets are explicit brand additions to the otherwise quiet chrome.

## Foundations

Canonical implementation: `apps/web/style.css`.

| Role | Value / rule |
| --- | --- |
| Ground | `--ground: #f2f4f7` |
| Surface | White; flat, no shadow at rest |
| Primary ink | `--text: #17191c` |
| Supporting ink | `--muted: #565e68` |
| Main action | Near-black, white text; subordinate actions outlined |
| Data/focus | `--data: #1d5fbf`; statuses always have words |
| Feedback | Dark green, red, amber semantic tokens; no color-only meaning |
| Type | Self-hosted Geist variable WOFF2, with system fallback and `font-display: swap` |
| Scale | 12 metadata, 14 desktop body, 16 section, 18 subsection, 24 page title; narrow form controls 16 |
| Figures | Tabular numerals; money two decimals with SGD; dates explicitly SGT |
| Layout | 232px labelled rail, 32px canvas insets, 24px principal gap; adapts at 1050/800/600 |
| Shape | 8px panels, 6px controls, restrained borders, no decorative gradients/glow |
| Motion | Immediate content; short control feedback; reduced-motion preserves all state |

At 1440px, 232px rail + two 32px canvas insets + 1144px content = 1440px. Columns use fractional widths; content may wrap without changing this arithmetic. At 800px and below, the rail becomes a labelled Menu disclosure, and content keeps 16px side insets and clearance for the top bar.

## Shared components and states

- `ui.js`: readable, safely text-rendered facts; bounded fetch; in-memory scoped dirty-field preservation; owner artwork helper.
- `shell.js`: role-aware hash navigation, current repair context, visible pending-submission recovery, focus movement, menu and honest unavailable states. Permission `hidden` remains distinct from the selected-view class.
- Forms use visible labels. Checkboxes/declarations start unchecked; affirmative choices are never invented. Error/status copy sits by the relevant action, with the session status available globally.
- Sliders for consequential actions retain the same guards as their explicitly labelled keyboard/button alternatives. Neither a slider position nor an upload is approval by itself.
- Loading disables the actual action. Failed or uncertain requests retain the original operation identity, and the UI provides **Check pending submissions** to every role. A changed uncertain decision is not silently retried.
- A real zero is displayed as zero; an unavailable fact is a dash or a named unavailable state. No invented trends, totals, approvals, incidents or job photographs.

## Brand and image use

The owner supplied `quotefix-logo.png` and workflow illustrations on 28 October 2026. Keep their proportions and original bytes. `apps/web/assets/illustrations-manifest.json` records the selected source filenames and checksums. Use illustrations as decorative supporting context with empty alt text beside equivalent headings. The blue/white illustrated family is a deliberate owner preference, not a reason to add a picture to every control or row.

The **All caught up** illustration appears only when the actual outstanding-action total is zero. Artwork containing example unread counts, money or a seven-day label is not used as live notification/financial data. Screen titles and backend-derived statuses always carry the meaning.

The three corridor photographs come from the owner's labelled demonstration ZIP: `0142-a.jpg`, `0142-b.jpg`, `0142-e.jpg`. They appear in sign-in context and the evidence guide, explicitly labelled synthetic. They are never seeded or attached to operational jobs. Real job media retain private file routes and audience checks.

Geist is distributed with `apps/web/assets/Geist-OFL.txt`. No remote font or illustration service is needed at runtime.

## Evolution

Reuse these foundations across all current desktop workflows. Phase 4 uses Impeccable to audit and harden this established system; it does not choose another direction. Changes to a shared rule require a documented reason and rechecks of existing roles/views. See [handoff and coverage](docs/design/FRONTEND_HANDOFF.md) and [verification record](docs/design/FRONTEND_VERIFICATION.md).
