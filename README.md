# QuoteFix — backend foundations and implementation blueprint

[P1/P2 stability repairs — 27 October 2026](docs/implementation/STABILITY_2026_10_27.md) records the implemented fixes, 267-record PostgreSQL verification, data-preserving local PostgreSQL adoption and remaining limits. The [original full audit](docs/implementation/FULL_AUDIT_2026_10_27.md) preserves the pre-fix findings.

**Plan 0.3 · 13 October 2026 · Web first, native mobile later**

This repository contains the complete **20-chapter implementation plan**, local web construction through Chapters 01–18 and the Chapters 19–20 operations/native foundations. [Chapters 19–20 build evidence](docs/implementation/CHAPTERS_19_20_BUILD.md) separates verified backend/restore work and the initial connected native application from outstanding production and physical-device gates. [Chapters 17–18](docs/implementation/CHAPTERS_17_18_BUILD.md), [13–14](docs/implementation/CHAPTERS_13_14_BUILD.md) and [15–16](docs/implementation/CHAPTERS_15_16_BUILD.md) retain earlier scope/evidence. Gemini 3.5 Flash-Lite is configured locally; [setup/cost boundaries](docs/implementation/GEMINI_SETUP.md). Production/native release, device/background-transfer certification, retention, fault-percentage rules and optional video remain outstanding.

The [operations runbook](docs/implementation/OPERATIONS_RUNBOOK.md) covers Admin processing health, failure recovery, snapshot/evidence restoration and `pnpm release:check`. The [native development guide](apps/mobile/README.md) covers account-partitioned drafts/capture, PKCE sign-in, SDK/build commands and explicit device/release limits. A blocked release check is expected until actual launch evidence exists.


## Clone, seed and run

Use the [clone and data setup guide](docs/implementation/CLONE_AND_DATA_SETUP.md) for exact clone/install commands, the pinned stack, six fictional accounts, isolated tests and private database/image/draft transfer. A Git clone contains source and seed definitions; operational data and secrets stay outside Git. The desktop prototype is not a hosted production release.

A fresh Windows setup uses Node.js 24, pnpm 11.25.0 and Docker Desktop/PostgreSQL 18. Install with `pnpm install --frozen-lockfile`, create your own ignored `.env`, and follow the guide's explicit fresh-only fixture setup. Normal startup verifies migrations without reseeding.

For an **already-configured** PostgreSQL desktop checkout:

```powershell
./tools/local-postgres.ps1 start
node tools/prototype.mjs start
node tools/prototype.mjs status
```

Open http://127.0.0.1:3000. The [stability record](docs/implementation/STABILITY_2026_10_27.md) covers stop/restart and verified backup commands. The [owner setup guide](docs/implementation/SETUP_GUIDE.md) retains historical setup/provider context; it does not replace the clone guide. Read the [operations runbook](docs/implementation/OPERATIONS_RUNBOOK.md) and [native development guide](apps/mobile/README.md) for their separate remaining release gates.

## Read in this order

1. [Master implementation plan](docs/IMPLEMENTATION_PLAN.md)
2. [Product memory](docs/PRODUCT_MEMORY.md) and [open decisions](docs/OPEN_DECISIONS.md)
3. [Rules inherited by every chapter](docs/implementation/CROSS_CUTTING_RULES.md)
4. [Decision gates and recommendations](docs/implementation/DECISION_GATES.md)
5. [Chapter/node/timer coverage](docs/implementation/COVERAGE_INDEX.md)
6. [Verification scenario index](docs/implementation/VERIFICATION_INDEX.md)

## Build sequence

| Chapters | Milestone |
| --- | --- |
| 01–04 | Foundations, login, permissions, workspace, files, audit, notifications and clocks |
| 05–08 | Verification, RFQs, quotes, Q&A, comparison, selection and approval |
| 09–14 | Work, variations, inspections, payments, fees, cancellation and Admin Support |
| 15–18 | Durability Feedback, reputation/AI, MCST integrity, dashboards and exports |
| 19 | Verified web release and operations |
| 20 | Later iOS/Android clients on the same backend |

## Flow and timing references

- [Lifecycle explanation](docs/TICKET_LIFECYCLE.md)
- [GitHub-renderable Mermaid diagrams](docs/review/DIAGRAMS.md)
- [Every node's copy, triggers, checkpoints and exits](docs/review/NODE_REFERENCE.md)
- [All 23 clocks and notification rules](docs/TIMING_AND_NOTIFICATION_REGISTER.md)
- [Shared web/mobile architecture](docs/architecture/WEB_MOBILE_ARCHITECTURE.md)

The latest explicit owner decisions override historical drafts and PRDs. Diagram nodes are references, not one screen/service/database status each. Open decisions must stay open until the owner decides them. See [AGENTS.md](AGENTS.md).

## Export and verification

See [GitHub handoff instructions](docs/implementation/GITHUB_HANDOFF.md) for using the ZIP and the portable planning tools.

Documentation checks: `python tools/plan_bundle.py validate`

Rebuild indices after chapter/source changes: `python tools/plan_bundle.py generate`

Create a fresh export: `python tools/plan_bundle.py package`

The planning tools require Python 3.10+ and its standard library. [Planning validation](docs/implementation/PLANNING_VALIDATION.md) reports documentation checks separately from the local application build evidence. Paid services remain unprovisioned.
