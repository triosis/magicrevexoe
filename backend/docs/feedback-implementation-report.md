# Task 09 implementation and test report

Implemented locally, 2026-11-04. No Hostinger connection, production credentials,
production migration, administrator seed, secret file or frontend change. Existing
schema constraints/migrations and catalog grants remain unchanged. API details:
[feedback-api.md](feedback-api.md); controls: [feedback-security-report.md](feedback-security-report.md).

## Delivered

- Anonymous structured submission for every active published industry funnel,
  secure random confirmation, signed version/expiry tokens and duplicate protection.
- Scoped management list/details/statistics, merchant/branch/date/status filters,
  stable ID pagination and controlled status changes with immutable history.
- Atomic creation/status/usage/audit workflows using existing services/pool, with
  no duplicated hierarchy or database loader. Minimal feedback submitted/viewed/
  changed audit events, no private body/identity data in public analytics.
- Current subscription usage ledger and initialized counter increment exactly once;
  no fictitious subscription for pre-billing merchants and no new quota admission.
- Funnel projection now advertises submission availability and issues a form token;
  Google remains usable without private selection/rating/submission.

The existing schema permits no free text even for Salon/Restaurant. No notes,
medical details, contacts, customer accounts or extra columns were added. Seeded
merchant_staff already has status-change authority; implementation preserves it.

## Tests

All commands use synthetic fixtures and the disposable local MariaDB **11.8.9**
Windows ZIP harness (loopback random port, ephemeral credentials, no environment
file loading). Commands below run from repository root with MARIADB_TEST_BIN
pointing only to local binary files.

| Command | Passed | Failed / skipped |
| --- | ---: | --- |
| npm --prefix backend test | 22 | 0 / 0 |
| npm --prefix backend run test:feedback:integration | 13 | 0 / 0 |
| npm --prefix backend run test:funnels:integration | 10 | 0 / 0 |
| npm --prefix backend run test:business:integration | 11 | 0 / 0 |
| npm --prefix backend run test:tenants:integration | 12 | 0 / 0 |
| npm --prefix backend run test:auth:integration | 16 | 0 / 0 |
| npm --prefix backend run test:schema:integration | 10 | 0 / 0 |
| npm --prefix backend run test:migrations:integration | 8 | 0 / 0 |

Total: 102 passing tests, including integration parent tests. TypeScript builds
pass with the commands. Whitespace verification uses git diff --check.

New coverage includes all industries; required/optional ratings; unsupported text,
medical/contact/mass-assignment rejection; anonymous safe confirmations; token
tampering/expiry/key/code/version binding; concurrent and sequential duplicate
retries; immutable customer ratings; all suspended ancestry levels; archived/
disabled/expired/unknown links and inactive destinations; platform-wide access to
peer-owned and platform-direct merchants; reseller/sub-reseller/merchant isolation;
read-only role denial; pagination/filters/statistics; valid/invalid workflow and
stale versions; missing accounting initialization; single usage increment; injected
audit rollback of submission, usage, status and history; generic errors/log safety;
public throttling and ignored spoofed forwarding headers. Existing regressions
cover unchanged schema/migration/auth/business/tenant behavior.

No test proves live SMTP, Google ownership, provider privileges, reverse-proxy
logging, frontend rendering or production deployment readiness. Initial fixture
email normalization and an incorrect staff/read-only test assumption were corrected;
production authorization or seeded grants were not relaxed for tests.

## Complete file inventory

| File | Change |
| --- | --- |
| ../src/feedback/service.ts | New public submission, scoped management, workflow and usage/audit accounting |
| ../src/feedback/routes.ts | New one public and four authenticated routes, rate limits |
| ../src/feedback/validation.ts | New strict fields/filters/status transition contract |
| ../src/feedback/tokens.ts | New domain-separated signed version/expiry/nonce tokens |
| ../src/auth/service.ts | Derive feedback token signer from already validated auth key |
| ../src/funnels/service.ts | Share public validation under write lock, expose form token/availability |
| ../src/app.ts | Inject/mount feedback router before funnel router |
| ../src/server.ts | Wire feedback to existing services |
| ../package.json | Explicit test:feedback:integration command |
| ../test/feedback.test.mjs | New signature/expiry/validation/workflow unit tests |
| ../test/feedback.integration.mjs | New disposable MariaDB API/isolation/idempotency/rollback tests |
| feedback-api.md | New request/response, workflow, privacy and accounting documentation |
| feedback-security-report.md | New controls, evidence and deployment limits |
| feedback-implementation-report.md | This complete report/inventory |
| database-architecture.md | Task 09 status and accounting scope clarification |
| funnels-api.md | Current submission availability and contract pointer |
| business-api.md | Current feedback contract pointer |
| ../README.md | Submission API/test/report pointers |

No dependencies, lockfile, migrations, environment files or frontend assets changed.
No unresolved local MariaDB syntax/constraint issue was found. Production grants,
accounting initialization, retention/backups, edge limits/proxy behavior, synchronized
clocks/keys and frontend rendering remain separately verified rollout requirements.
