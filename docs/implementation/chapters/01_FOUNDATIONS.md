# Chapter 01 — Project, backend and database foundations

[Master](../../IMPLEMENTATION_PLAN.md) · Next: [02 Login and access](02_LOGIN_AND_ACCESS.md)

**Priority:** first. **Dependencies:** approved planning baseline; provider choices remain engineering selection work. **Status:** local implementation constructed; see [verification evidence](../CH01_CH02_VERIFICATION.md). Production provider/recovery checks remain release gates. Inherits [cross-cutting rules](../CROSS_CUTTING_RULES.md), especially X01/X06/X09/X10.

## 1. Outcome and construction order

Create the smallest reproducible technical foundation on which every role will later run. No quote/payment workflow yet. Recommended architecture remains one modular TypeScript backend, PostgreSQL, private object storage, a worker and a responsive web client; future mobile uses the same API. Framework/provider recommendations are not a purchase decision.

1. Record chosen supported framework/runtime/database/auth/storage/job versions and why; include deployment region, environment ownership, local fallback and costs.
2. Establish application/domain/contracts/worker boundaries, lint/type checks and one documented local startup command.
3. Define database migration conventions, core identifiers, SGD cents, UTC instants/date precision, transaction helpers and schema validation.
4. Create environment isolation, health endpoints, safe configuration/secrets and correlation IDs.
5. Add deterministic fictional fixtures and an integration-test database. Begin the trace from rule to command/test now.

## 2. Interfaces, visibility and compulsory configuration

| Item | Requirement | Visibility |
| --- | --- | --- |
| Environment identity | **Required E:** explicit development/test/staging/production marker | Operators; never a client-provided privilege |
| Database/storage/identity credentials | **Required E** for applicable environment; injected secrets | Backend/worker only; no browser/mobile bundle or logs |
| Currency/time/calendar convention | **Required C/E:** SGD; Singapore product dates; versioned holiday source | Formatted to authorised users, raw infrastructure configuration internal |
| Health/version endpoints | **Required E:** readiness versus liveness; nonsecret build/contract version | Restricted operational detail; public health response minimal |
| Fixture scenario/environment provenance | **Required E** | Test infrastructure only; no live score or financial input |
| Provider names/versions and migration owner | **Required E** decision record before dependent code | Project documentation |

There is no role-facing signup or live ticket in this chapter. A simple technical shell/health check proves connectivity without using a production Admin identity.

## 3. Data/API and failure rules

Create migration-managed foundations for users/organisations/estates, resource versions, command receipts, audit/outbox, files/tasks and domain namespaces. Later chapters add their fields/invariants. Use foreign keys, uniqueness and explicit deletion behavior; financial references must not disappear through cascading user deletion.

All backend reads/writes go through authenticated adapters and domain services. No browser secret grants broad database access. API responses use a stable request ID and error envelope. Date-only values retain date precision; a typed client is not a substitute for runtime validation.

Use expand/migrate/verify/contract changes. A failed migration cannot trigger a destructive reset of a live environment. Local development can use documented mock identity/AI adapters; mocks are visibly isolated and cannot be enabled in production.

## 4. Timers, audit and next actor

No new customer timer starts here. Worker/time-test foundations are built for chapter 04. Migration, deployment and fixture execution produce operational records; they are not customer ticket history. Failed startup/configuration waits on the operator/developer, not a CM or Contractor bell.

## 5. Verification tests

| ID | Scenario | Required result/evidence |
| --- | --- | --- |
| CH01-T01 | Fresh isolated environment runs documented setup | Migrations and startup succeed; API reaches expected database; no manual hidden step |
| CH01-T02 | Fixture loader targets production marker/credentials | Hard refusal before any mutation; no cleanup command can erase live data |
| CH01-T03 | Repeated fixture install in test | Deterministic IDs/scenarios or clean isolated reset; no duplicate financial/reputation rows |
| CH01-T04 | Transaction fails after first write | Business/audit/outbox writes roll back together; no partial state |
| CH01-T05 | Inspect built client bundle and logs | No database/service/storage signing secret or private evidence body |
| CH01-T06 | Migration applied to representative prior schema | Data preserved; compatibility/rollback procedure demonstrated without dropping business records |
| CH01-T07 | Date-only, timestamp and SGD examples serialized | Precision/currency preserved; no timezone-induced day shift or floating-point cent error |

## 6. Completion gate

Deliver versioned setup instructions, architecture decision record, migration rules, fixture manifest and test evidence. Resolve technical provider choices; retention policy G14 remains gated. A running skeleton is not a launch-ready application. Proceed to chapter 02 only when isolated environments and repeatable startup work.
