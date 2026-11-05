# External integrations and deployment preparation — Task 19

2026-11-05. Baseline commit: a72b5e498ca830b9182b418cda215ce56da71e58.
**Production remains blocked.** No Hostinger connection, production credential
collection, deployment, migration, settings change, rotation or external test email
occurred. Actual ignored environment files were not inspected. Only safe example
environment files are tracked.

## Findings and disposition

| Area | Classification | Evidence and remaining action |
| --- | --- | --- |
| Backend runtime configuration | Implemented; locally tested | Pure validation plus startup checks require production HTTPS origins, exact recovery path/CORS, full SMTP and independent JWT/MFA keys; placeholder, short/repetitive secrets fail. Production/test never load backend .env. Secret entropy/custody cannot be proven by validation. |
| Runtime database TLS | Implemented; locally tested | Approved PEM/checksum, verified chain and DNS hostname, minimum TLS 1.2; production cannot disable. Actual disposable MariaDB 11.8.9 SQL reports a TLS cipher. Wrong trust root and trusted wrong-name certificate fail. Local development remains usable without TLS. |
| Migration TLS | Implemented; locally tested | Existing explicit operator approval/target/ledger/privilege workflow preserved. Review found mysql2 skips explicit hostname checks for IP literals; staging/production target policies now refuse those and require DNS identity. Minimum TLS 1.2 added; no migration statement/history changed. |
| SMTP | Implemented; locally tested | Shared TLS transport, implicit TLS and STARTTLS, approved private CA option, fixed safe errors and result events (random event ID, operation/status, allowlisted code, elapsed time). Explicit smtp:verify authenticates without sending mail or touching DB. TLS trust/name, recipient refusal and lost DATA acknowledgement tested against local TLS servers. |
| Mail retries/diagnostics | Implemented policy; durable outbox not implemented | One send attempt; no automatic retry, no exactly-once/inbox claim. Failure may mean acceptance is unknown. Account creation remains committed if post-commit mail fails; operator uses existing explicit resend, which invalidates old tokens. Password recovery requires an explicit new rate-limited request. Result events omit recipient, sender, host, URL, body, tokens, credentials and raw errors. Alert routing/outbox remain open. |
| Frontend build/server | Implemented; locally tested | HTTPS API build gate rejects other VITE_ names and emits public deployment.json; static server restricts CSP connect-src to self plus approved API origin. Runtime API changes require a rebuild. No frontend secret configuration. Legacy deployment instructions replaced. |
| Authentication/session rotation | Implemented controls; owner action required | Existing MFA, opaque refresh replay revocation and logout preserved. No refresh signing key exists. JWT one-key rollout requires draining all replicas and explicit session revocation. MFA reencryption requires reviewed offline tooling; no online keyring/automatic rotation. Actual secret rotation unverified. |
| Google review integration | Locally tested; owner action required | Existing canonical HTTPS search.google.com/local/writereview?placeid= URL, bounded identifier and exact URL matching reject arbitrary redirects. Real browser E2E verifies mobile independent Google/private options and captures Google navigation without contacting the external listing. Place ID syntax is not existence or Business Profile ownership verification. |
| Public domains/CORS/HTTPS | Locally tested configuration; owner action required | Prepared revexoe.com frontend and api.revexoe.com API, exact origins and API public-short-link routing. No DNS lookup/provider connection establishes actual deployment. Proxy, HTTPS renewal, CORS at ingress, patched Node 24/native build and restart/drain behavior require provider staging evidence. |
| Backup/restore | Locally tested; owner action required | Existing actual encrypted export/import, complete data/schema/ledger and restored application tests pass. Backup rotation sequence now documents key-version retention and failure recovery. Provider facilities, off-site copies, retention/key custody, representative volume and approved RPO/RTO remain unverified. Local recovery executor still rejects remote/production before any execution. |
| Other release controls | Not implemented; owner action required | Shared ingress limiter, durable mail outbox/alerts, operational dashboards, approved bootstrap/catalog, retention/privacy approval and provider acceptance remain blockers. Refresh credential remains XSS-readable in sessionStorage and inline style remains allowed by CSP. No production readiness claim. |
| External verification | Externally verified: none | No provider, DNS, real mailbox, Google ownership, off-site backup or production secret evidence collected. |

## Test evidence

Main scenarios use actual Express/React, real HTTP/browser automation and disposable
MariaDB 11.8.9. No mocked API fixtures substitute for real-stack scenarios. Browser
fixture tests remain separately identified. Local SMTP uses synthetic recipients,
ephemeral certificates and loopback only. Its first attempt timed out because the
mail library resolves localhost through DNS; loopback address plus explicit verified
localhost certificate identity removed the DNS dependency without disabling trust.

The new migration DNS safeguard initially changed the error surfaced by the recovery
policy parser. The existing negative unit test caught it. Local recovery now checks
its disposable-local boundary before parsing migration-specific policy requirements;
the test and refusal remain unchanged. No test was disabled or relaxed.

Final validation results are recorded below. All integration files
run serially to avoid Windows installer interference; tests within quota/feedback
suites still use real concurrent workers. Original feedback deadlock capture remains
intentional diagnostic evidence; application concurrency scenarios must pass without
new deadlocks or accounting drift.

| Command from repository root | Result |
| --- | --- |
| npm.cmd --prefix backend test | 37 passed |
| npm.cmd --prefix backend run test:integration | 162 passed, no failures/skips |
| npm.cmd test | 19 passed |
| npm.cmd run test:browser | 8 passed (separate fixture browser suite) |
| npm.cmd run test:e2e:real | 11 passed (actual stack and browser, desktop/mobile) |
| npm.cmd run test:server | 1 passed, exact CSP/deep links/404 checks |
| npm.cmd run typecheck / npm.cmd --prefix backend run typecheck | Passed |
| npm.cmd run build / npm.cmd --prefix backend run build | Passed; local frontend build uses public VITE_API_URL=https://api.revexoe.com/api/v1 |
| npm.cmd run lint | Passed with two pre-existing landing/demo warnings (App purity, Interactive effect) |
| git diff --check | Passed |

MariaDB aggregate includes auth/MFA, schema/migrations/least privileges, business,
funnels, feedback, subscriptions, quota concurrency, feedback stress and actual
encrypted backup/restore. It also includes the new TLS/SMTP scenarios and explicit
SMTP CLI no-mail/safe-output checks. Prior complete runs passed 159 then 161 tests
as scenarios were added; final result of 162 is authoritative. Across the six test commands, 238 tests passed (including integration parent tests). Local ignored logs are
.tmp-frontend/task19-unit.log, task19-integration-final.log and task19-e2e.log;
these are disposable evidence, not production records. No test claims provider success.

## Complete file inventory

| File | Change |
| --- | --- |
| DEPLOYMENT.md | Replace obsolete no-API guidance with current canonical handoff |
| backend/.env.example | Runtime TLS, public origins, SMTP and secret-separation examples |
| backend/package.json | Explicit smtp:verify command |
| backend/src/config/env.ts | Pure production validation; protected runtime environment |
| backend/src/config/tls.ts | Shared approved CA-byte/checksum loader, safe errors |
| backend/src/db/pool.ts | Verified runtime TLS and production fail-closed behavior |
| backend/src/auth/configuration.ts | Use shared SMTP transport without changing auth semantics |
| backend/src/auth/smtp.ts | TLS transport, verification, safe result events, one-attempt send |
| backend/src/auth/smtp-cli.ts | Explicit no-mail operator diagnostics |
| backend/src/migrations/operator.ts | Refuse nonlocal IP TLS targets |
| backend/src/migrations/operator-cli.ts | Minimum TLS 1.2 for migration transport |
| backend/scripts/recovery/utility.mjs | Preserve early local-only refusal before shared policy parsing |
| backend/test/mariadb-fixture.mjs | Optional TLS launch arguments; default unchanged |
| backend/test/tls-fixture.mjs | Ephemeral local certificates using installed Git OpenSSL |
| backend/test/external.test.mjs | Production config, TLS guards, SMTP config, build/Google negatives |
| backend/test/external.integration.mjs | Actual DB TLS, SMTP TLS/STARTTLS, failure/no-retry/CLI tests |
| backend/test/migration-safety.test.mjs | Nonlocal IP target rejection assertion |
| scripts/frontend-config.mjs | Public build configuration validation |
| scripts/frontend-config.d.mts | Type declaration for shared build helper |
| vite.config.ts | Build gate and generated public metadata |
| server.mjs | Exact API CSP and runtime port validation |
| test/frontend-server.test.mjs | Assert exact CSP connection allowlist |
| backend/docs/external-integration-report.md | This evidence, classifications and full inventory |
| backend/docs/deployment-runbook.md | Unexecuted staged deployment/recovery handoff |
| backend/docs/production-environment-reference.md | Build/runtime/operator configuration and secret separation |
| backend/docs/secret-rotation-runbook.md | Backup key version/custody/rotation failure procedure |
| backend/docs/production-readiness-report.md | Current local controls versus external evidence |
| backend/docs/production-blockers.md | H2/M1/M2 updates and remaining blockers |
| backend/docs/hostinger-deployment-checklist.md | Current Task 19 handoff and external gates |
| backend/docs/production-migration-runbook.md | DNS identity/minimum TLS and current runtime TLS clarification |

No migration SQL/verification file, ledger, schema manifest, hierarchy, MFA factor,
quota admission or feedback lock-order implementation changed. No production
values appear in the inventory or examples. Build outputs/logs/certificates remain
ignored or in disposable OS temporary directories.
