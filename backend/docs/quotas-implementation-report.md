# Task 13 quota implementation and validation report

Implemented locally on 2026-11-05. Central quota admission now covers all five
existing metrics at transactional service boundaries. No merchant-count metric,
commercial seeds, migration, dependency, payment or production change was added.
Contracts: [quotas-api.md](quotas-api.md), [quotas-security-report.md](quotas-security-report.md).

Finite limits use exact BigInt arithmetic; explicit unlimited still requires valid
subscription/accounting. Missing/inactive/expired/canceled/past-due states block
new metered operations. Pending merchant invitations require plan assignment before
acceptance; active admins count as seats. No Super Admin bypass. Private rejection
never gates Google or weakens structured-only feedback.

Existing signed gauge quantity/period keys, counters and indexed creation audits
support transactional reconciliation and short-link retry keys without DDL. Prior
opening snapshots and all historical records are preserved. Live gauges remain
authoritative for current admission; net observed deltas record cleanup/expiry at
observation time, not a fabricated full historical lifecycle. Inconsistent accounting
remains unavailable. Cleanup never fabricates counters to bypass missing data.

Frontend shows quota reached/structured errors and reloads usage after resource
success, with an explicit refresh for external changes. A regression discovered
while adding usage refresh reset QR preview through parent reload; separate usage
revision state fixes it. A duplicate React sibling key was also corrected. Both
real-stack and existing browser scenarios validate the final QR workflow.

Old real-DB regressions now explicitly provision synthetic valid subscriptions,
without changing runtime limits or disabling assertions. The real E2E harness
assigns the fixture plan before merchant invite acceptance and demonstrates a later
explicit cancellation/reassignment in the UI. Historical Task 12 matrix remains
historical. The added quota suite uses genuine simultaneous connections; only the
otherwise-schema-impossible missing-limit fallback uses a small unit DB stub.

## Final validation

| Command | Result |
| --- | --- |
| npm --prefix backend test | 26 passed |
| npm --prefix backend run test:quotas:integration | 8 scenarios plus parent: 9 passed |
| npm --prefix backend run test:subscriptions:integration | 12 passed |
| npm --prefix backend run test:feedback:integration | 13 passed |
| npm --prefix backend run test:funnels:integration | 10 passed |
| npm --prefix backend run test:business:integration | 11 passed |
| npm --prefix backend run test:tenants:integration | 12 passed |
| npm --prefix backend run test:auth:integration | 16 passed |
| npm --prefix backend run test:schema:integration | 10 passed |
| npm --prefix backend run test:migrations:integration | 8 passed |
| npm test | 17 passed |
| npm run test:browser | 8 passed |
| npm run test:e2e:real | 10 scenarios plus parent: 11 passed |
| npm run test:server | 1 passed |
| Frontend/backend typechecks and production builds | Passed |
| npm run lint | No errors; two pre-existing landing/demo warnings |
| git diff --check | Passed |

Total **164 passed**, zero failures/skips in final validation, counting Node parent
tests. Fixtures use disposable MariaDB 11.8.9 only. Scenarios include exact finite
boundary, one beyond, concurrency, explicit unlimited, missing allocation/counter,
inactive states, incomplete plan publication rejection, rollback, token reuse,
link/QR retries, releases, tenant isolation and safe frontend errors/no false success.

## Known limits

- No production readiness/deployment claim. No Hostinger or SMTP/Google verification.
- No grace, payment, renewal automation or plan editing API was invented.
- Gauge ledger is opening snapshots plus observed reconciliation events; natural
  expiry is reconciled at the next relevant write. No periodic worker was added.
- New future membership revocation/user-disable/resource-reactivation APIs must
  preserve this guard and ledger protocol. None currently exists to bypass it.
- Root mutex and audit-key retention need capacity/retention review before scaling.
  Keyed link retry assumes retained creation audit. Unkeyed new POSTs create distinct
  metered resources; after tab reload inspect state before retrying lost responses.
- Quota errors after authorization may remain normal scope errors without quota
  data. Anonymous commercial numbers are deliberately redacted.

## Complete file inventory

The inventory below contains every created/modified Task 13 file; no environment,
lockfile or migration was changed.

- `backend/docs/auth-api.md`
- `backend/docs/business-api.md`
- `backend/docs/database-architecture.md`
- `backend/docs/feedback-api.md`
- `backend/docs/funnels-api.md`
- `backend/docs/subscriptions-api.md`
- `backend/package.json`
- `backend/src/auth/service.ts`
- `backend/src/business/service.ts`
- `backend/src/feedback/service.ts`
- `backend/src/funnels/routes.ts`
- `backend/src/funnels/service.ts`
- `backend/src/funnels/validation.ts`
- `backend/src/middleware/error-handler.ts`
- `backend/src/subscriptions/service.ts`
- `backend/src/tenants/service.ts`
- `backend/test/auth.integration.mjs`
- `backend/test/business.integration.mjs`
- `backend/test/feedback.integration.mjs`
- `backend/test/funnels.integration.mjs`
- `backend/test/tenants.integration.mjs`
- `docs/e2e-integration-report.md`
- `docs/frontend-integration.md`
- `scripts/e2e-real.mjs`
- `src/application/api.ts`
- `src/application/merchant.tsx`
- `src/application/subscriptions.tsx`
- `test/frontend/api.test.ts`
- `test/frontend/subscriptions.test.tsx`
- `backend/docs/quotas-api.md`
- `backend/docs/quotas-implementation-report.md`
- `backend/docs/quotas-security-report.md`
- `backend/src/subscriptions/quota.ts`
- `backend/test/quota-fixtures.mjs`
- `backend/test/quotas.integration.mjs`
- `backend/test/quotas.test.mjs`
