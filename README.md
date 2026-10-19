# QuoteFix — backend foundations and implementation blueprint

**Plan 0.3 · 13 October 2026 · Web first, native mobile later**

This repository contains the complete **20-chapter implementation plan**, local web construction through Chapters 01–18 and the Chapters 19–20 operations/native foundations. [Chapters 19–20 build evidence](docs/implementation/CHAPTERS_19_20_BUILD.md) separates verified backend/restore work and the initial connected native application from outstanding production and physical-device gates. [Chapters 17–18](docs/implementation/CHAPTERS_17_18_BUILD.md), [13–14](docs/implementation/CHAPTERS_13_14_BUILD.md) and [15–16](docs/implementation/CHAPTERS_15_16_BUILD.md) retain earlier scope/evidence. Gemini 3.5 Flash-Lite is configured locally; [setup/cost boundaries](docs/implementation/GEMINI_SETUP.md). Production/native release, device/background-transfer certification, retention, fault-percentage rules and optional video remain outstanding.

The [operations runbook](docs/implementation/OPERATIONS_RUNBOOK.md) covers Admin processing health, failure recovery, snapshot/evidence restoration and `pnpm release:check`. The [native development guide](apps/mobile/README.md) covers account-partitioned drafts/capture, PKCE sign-in, SDK/build commands and explicit device/release limits. A blocked release check is expected until actual launch evidence exists.


## Run the local application

See the [owner setup guide](docs/implementation/SETUP_GUIDE.md) for version control, local PostgreSQL and later hosting/authentication/storage accounts. The [PostgreSQL setup record](docs/implementation/LOCAL_POSTGRES_2026_10_19.md) and [follow-up audit](docs/implementation/LOCAL_POSTGRES_AUDIT_2026_10_19.md) cover fictional seeds, compatibility/isolation fixes and backup/restore evidence. Run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/local-postgres.ps1 dev` for the PostgreSQL preview at **http://localhost:3001**, separate from the existing app's cookie hostname.

The [Chapters 09–18 adversarial audit](docs/implementation/CHAPTERS_09_18_AUDIT.md) records cross-chapter fixes, the final 231-record regression, browser verification and remaining release/source-control concerns.

The [Chapters 01–08 audit](docs/implementation/CHAPTERS_01_08_AUDIT.md) preserves the earlier stocktake and 79-test baseline. The [Chapters 09–10 build record](docs/implementation/CHAPTERS_09_10_BUILD.md) and [Chapters 11–12 build record](docs/implementation/CHAPTERS_11_12_BUILD.md) record subsequent implementation and validation.

The [Chapters 11–12 interruption audit](docs/implementation/CHAPTERS_11_12_AUDIT.md) maps every planned verification ID to actual assertions, fixes missed backend/UI paths and distinguishes later chapter integrations from locally verified behavior.

Use Node.js 24 LTS. From this directory on Windows, run:

```powershell
.\tools\dev.ps1
```

Open http://127.0.0.1:3000. The script installs dependencies, prepares a local PostgreSQL-compatible database and fictional accounts, then starts the API. Read [local development and test accounts](docs/implementation/LOCAL_DEVELOPMENT.md), [technical decisions](docs/architecture/ADR_001_LOCAL_FOUNDATIONS.md) and [verification evidence](docs/implementation/CH01_CH02_VERIFICATION.md). The local identity adapter refuses staging/production. No paid services have been provisioned.

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
