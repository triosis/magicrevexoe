# Task 11 subscription and usage implementation report

Completed locally on 2026-11-05. No Hostinger connection, production credentials,
production configuration/migrations, commercial seeds or payment operations.
Existing schema/migrations, dependencies and database constraints are unchanged.

## Delivered behavior

Ten authenticated endpoints expose published plan terms/details, merchant-owned
current/history subscriptions, manual assignment and status operations, explicit
counter initialization, current metric reports and recorded usage history. All
five hierarchy edges retain actual ancestry and existing permissions. Only seeded
Super Admin can manage; reseller/sub-reseller administrators read descendants,
merchant administrators read their own, and unpermitted staff receives no data.

All five counters initialize atomically from existing ledger or real opening
resource/submission counts. Duplicate/concurrent initialization preserves existing
values/events; inconsistent accounting fails for operator reconciliation. Assigned
periods cover server time without overlapping ended history. Exact MariaDB
microsecond keys survive feedback accounting and counter lookup. BIGINT quotas
use exact string/BigInt arithmetic. Missing counters/limits never become unlimited.
Administrative changes and safe audits commit/roll back together.

The merchant screen displays configured plan, status/effective state, period,
metrics, limits and calculable remaining quota. It includes paginated histories,
catalog details, authorized admin controls and loading/error/empty states. It
displays no invented plan or usage values. No frontend token transport changed.

## Explicit limits

- No subscription `suspended` enum exists: account ancestry derives effective
  suspension. Read-side period expiration is derived; explicit replacement can
  close an elapsed allocation transactionally. There is no billing scheduler.
- No plan authoring API, plan/pricing seed, payments, invoices, taxes, renewals,
  proration, commissions, wallets, payouts or quota admission was introduced.
- Existing resource APIs do not append gauge lifecycle events. Current gauges
  therefore use real live counts; counter/ledger history represents opening
  snapshots and says so explicitly. Feedback has ongoing period accounting.
- Initial backdated feedback periods can record an aggregate actual-count baseline;
  this is not a synthetic per-submission historical event stream. Existing ledger
  state wins. Old periods cannot be initialized from today's resource snapshots.
- Initialization uses the existing global root lock, an MVP throughput constraint.
  Distributed rate limits, effective least-privilege Hostinger grants, production
  inventory, backup/restore and deployment approval remain separate gates.

## Validation results

All commands were executed locally. Integration tests start fresh disposable
MariaDB **11.8.9** processes on loopback random ports with ephemeral credentials.
No installed database service or Hostinger target was used.

| Command from repository root | Result |
| --- | --- |
| npm --prefix backend test | 25 passed |
| npm --prefix backend run test:subscriptions:integration | 12 passed |
| npm --prefix backend run test:feedback:integration | 13 passed |
| npm --prefix backend run test:funnels:integration | 10 passed |
| npm --prefix backend run test:business:integration | 11 passed |
| npm --prefix backend run test:tenants:integration | 12 passed |
| npm --prefix backend run test:auth:integration | 16 passed |
| npm --prefix backend run test:schema:integration | 10 passed |
| npm --prefix backend run test:migrations:integration | 8 passed |
| npm test | 15 passed |
| npm run test:browser | 8 passed (local intercepted API fixtures) |
| npm run test:server | 1 passed |
| npm run typecheck / npm --prefix backend run typecheck | Passed |
| npm run build / npm --prefix backend run build | Passed |
| npm run lint | No errors; two pre-existing landing/demo warnings |
| git diff --check | Passed |

Total: **141 tests passed**, none failed/skipped. Node integration parent tests
are included in the counts. Browser/component tests use synthetic fixtures; MariaDB
integration tests exercise real authentication, routes, transactions and constraints.

New tests cover catalog filtering/real configured terms; assignment and initial
counts; repeat/concurrent initialization; corrupt-counter reconciliation refusal;
all parent paths/read roles, peers/cross-merchants and unauthorized assignment;
invalid inputs/plans/periods; live gauge changes without resetting baseline;
missing counters and legacy microsecond periods with a real feedback submit;
suspended ancestry; optimistic status/terminal states; elapsed replacement/history;
audit-failure rollback. Frontend tests exercise loading/errors/empty/catalog states,
configured prices/limits, assignment and initialization controls, reload behavior,
and hiding controls from merchant/read-denied roles. Browser tests verify real
authenticated requests and empty subscription UI without administrative controls.

No unresolved local MariaDB syntax or constraint compatibility issue was found.
The service implements the current schema without migration changes.

## Complete file inventory

| File | Change |
| --- | --- |
| ../src/subscriptions/model.ts | New strict input schemas, status/metric definitions, exact period helpers and quota arithmetic |
| ../src/subscriptions/service.ts | New scoped plans/subscriptions/counter initialization/usage services |
| ../src/subscriptions/routes.ts | New ten versioned authenticated routes and rate limits |
| ../src/app.ts | Inject/mount subscription routes |
| ../src/server.ts | Construct service using existing TenantService/pool |
| ../src/feedback/service.ts | Preserve exact microsecond accounting period keys |
| ../package.json | Explicit disposable subscription integration command |
| ../test/subscriptions.test.mjs | New three unit tests |
| ../test/subscriptions.integration.mjs | New eleven MariaDB scenarios plus parent |
| ../../src/application/subscriptions.tsx | New live subscription/usage panel |
| ../../src/application/merchant.tsx | Replace static subscription unavailable card with live panel |
| ../../test/frontend/subscriptions.test.tsx | New five component tests |
| ../../test/frontend/fixtures.ts | Existing merchant fixture includes seeded subscription.read |
| ../../test/browser/app.spec.ts | Subscription API fixtures, permissions and new browser scenario |
| subscriptions-api.md | New endpoint/period/counter/usage semantics documentation |
| subscriptions-security-report.md | New authorization, accounting and security report |
| subscriptions-implementation-report.md | This report and complete inventory |
| database-architecture.md | Task 11 implemented status and boundaries |
| feedback-api.md | Explain explicit baseline initialization and exact period accounting |
| ../../docs/frontend-integration.md | Live subscription integration and current limitations |
| ../../docs/frontend-implementation-report.md | Preserve historical Task 10 report with Task 11 pointer |
| ../README.md | API/test/report pointers |

No environment, lockfile, migration, frontend landing/demo or existing schema file
was changed. No production deployment is authorized by this report.
