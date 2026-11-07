# HOSTINGER_LOCAL local verification

2026-11-07. Windows Node 24, disposable MariaDB 11.8.9 ZIP server, no installed
service or production endpoint. No production environment files were read or
changed. All credentials, MFA enrollment and approval IDs in tests were synthetic.

| Check | Final result |
| --- | --- |
| npm --prefix backend test | 74 passed, 0 failed/skipped |
| npm --prefix backend run test:integration | 195 passed, 0 failed/skipped |
| npm test | 29 passed |
| npm run test:e2e:real | 13 passed, real local React/Express/MariaDB stack |
| npm run test:browser | 8 passed, browser fixtures |
| npm run test:server | 1 passed |
| npm --prefix backend run typecheck | Passed |
| npm run typecheck | Passed |
| npm --prefix backend run build | Passed, also included in backend/E2E checks |
| npm run build | Passed with public API build URL; no provider call |
| npm run lint | Passed |
| git diff --check | Passed |

Total **320 tests**, including node:test parent cases, no final failures/skips.
Local MariaDB checks require MARIADB_TEST_BIN pointing to the existing disposable
MariaDB 11.8.9 bin directory. The initial E2E invocation omitted that harness input
and failed before database launch; rerun with the explicit path passed all 13.
During development, tests caught error-order and safe CLI error-code regressions;
both were corrected before the final complete unit/integration run.

Seven new unit cases cover production security validation, exact endpoint/canonical
port, acknowledgement/reference syntax, forbidden CA mixtures, remote plaintext
rejection, unchanged default/verified TLS selection, operator policy binding and
independent production confirmation. Existing TLS integration tests continue to
exercise trusted CA, wrong/missing trust, identity failures and secure SMTP.

The new local integration suite contributes seven subtests plus its parent. It
first reserves exactly 127.0.0.1:3306, refuses an occupied port, then starts its own
new datadir/random-credential MariaDB. It never adopts an existing listener.
It verifies missing approval rejection, empty-schema non-mutating preflight,
transport/reference-bound approval, independent production digest confirmation,
all 85 migrations (32 tables, 46 triggers), audit metadata, advisory lock exclusion,
restricted runtime grants, wrong-account rejection and truthful read-only diagnostic.

Actual compiled-server production-like startup with explicit synthetic local-mode
approval reached listen in **420 ms**. `/health/live` and `/health/ready` returned
200 on the owned fixture. Unauthenticated access was rejected, password login
required MFA, the pre-auth token could not access tenant APIs, activation and
tenant selection enforced RBAC, logout revoked access and a recovery code could
not be reused. Startup logs reported `encrypted:false` without synthetic passwords.
Existing unit/integration coverage also preserves tenant isolation, concurrency,
compliance, TLS, SMTP, schema, migration failure and recovery safeguards.

No migration SQL or schema manifest changed. Test logs are ignored under
.tmp-frontend/hostinger-local-implementation/. Local root privileges, synthetic
providers and runtime measurements do not establish Hostinger topology, grants,
SMTP delivery, deployed artifact identity or production readiness. No Hostinger
deployment/initialization/credential operation was performed and no 503 fix claimed.

See [implementation, changed-file inventory and production blockers](HOSTINGER_LOCAL_IMPLEMENTATION_REPORT.md).
