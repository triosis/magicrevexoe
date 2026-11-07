# Revexoe backend audit

2026-11-07. Repository-only audit with the owner-supplied logs, source/configuration,
requirements, test/migration inventories and actual local checks. No Hostinger or
production connection, real credential read/generation, provider call, migration,
settings change or deployment occurred. Existing private .env files were not opened.
The pre-existing untracked hostinger-environment-setup-guide.md was preserved and
extended with a dated addendum; it is not newly authored by this audit.

## Decision and confirmed cause

**Backend production startup: BLOCKED. Project: INCOMPLETE. Security/release: BLOCKED.**
The supplied log lists DB_TLS_CA_FILE, DB_TLS_CA_SHA256, AUTH_ACCESS_SECRET and
AUTH_MFA_KEY. Production validation throws at backend/src/config/env.ts:46?66.
backend/src/server.ts:18 calls loadEnv before pool construction (line 19) and listen
(line 61); its catch at lines 66?70 logs the error and exits nonzero. The subsequent
Hostinger ?App did not call listen() within 3 seconds? is consistent with that early
exit, not evidence that a database connection blocked startup. The screenshot's
HTML 503 is also consistent with an unavailable upstream; it cannot independently
prove DB failure, current process state or proxy correctness. Supplied logs, not a
new production observation, establish this configuration failure.

The prompt's DB endpoint 127.0.0.1 is a second blocked dependency: pool.ts:15?17
refuses IP literals in verified TLS mode because the installed driver does not perform
its explicit identity check for them. Supplying the four missing values alone will
not make that endpoint acceptable. Hostinger must provide a supported TLS DNS
endpoint matching its certificate, a trusted CA chain with approved exact-file hash,
and runtime network/file access; otherwise hosting/database architecture needs review.
No workaround was introduced, and no replacement CA was generated for production.

## Actual architecture and startup

- backend/package.json: type module (ESM), Node 24.x, Express 5, TypeScript compiler;
  start is node dist/server.js, source backend/src/server.ts. No require.main guard.
- Plain mysql2/promise driver to MariaDB/InnoDB, direct parameter-bound SQL. No ORM,
  Prisma, Sequelize, Drizzle schema or monolithic schema.sql.
- Startup: imports/native Argon2; load/validate environment; synchronous approved CA
  read/hash/parse; lazy DB pool; JWT/MFA/SMTP validation; service constructors and
  optional AI/Razorpay parsing; Express/HTTP handlers; listen(env.PORT,env.HOST).
- No awaited network operation/migration precedes listen. PORT is coerced/validated
  from process environment, with 3001 fallback; HOST defaults loopback, so operator
  must set 0.0.0.0 for provider ingress and use the assigned port. Build/install belong
  before runtime. Root npm start runs the frontend server, not this API.
- Native imports, missing/invalid configuration and unreadable CA can fail before
  bind. Validation is intentionally before listen: an invalid production instance
  is not made artificially healthy. No app startup rewrite was warranted.

## Database connection audit

| Control | Actual behavior / assessment |
| --- | --- |
| Credentials | DB_HOST/PORT/NAME/USER/PASSWORD environment inputs; no production credentials in source; synthetic fixtures are separate |
| Pool | mysql2 pool, connectionLimit default 5/max 50, waitForConnections false; no unlimited application wait queue |
| SQL/session | utf8mb4, UTC, multipleStatements false; BIGINT results remain strings |
| TLS | Production required, approved PEM file bytes and SHA-256, rejectUnauthorized true, verifyIdentity true, minimum TLS 1.2; IP literal refused |
| Timeouts | Connect 3000 ms; readiness SELECT 1 query 3000 ms plus 4000 ms response bound |
| Retries | No automatic application reconnect/retry loop or deadlock retry; later independent requests can try again |
| Readiness | Coalesces overlapping queries, fixed no-store statuses; does not mutate business data or initialize schema |
| Errors | Allowlisted fixed driver descriptions, repeated readiness log throttling, no raw SQL/credentials/host/error objects; this audit adds fixed TLS error descriptions |
| Transactions | auth/database.ts releases in finally, commit/rollback; bootstrap releases locks/connection; migration runner destroys dedicated session after release checks |
| Shutdown | SIGINT/SIGTERM drains HTTP then pool.end, 10-second deadline/forced close; integration test invokes actual handler using IPC on Windows |
| Limits | No observed leak in reviewed pool/transaction paths or tests; no exhaustive heap/leak certification. Pool saturation fails fast and still needs provider capacity evidence |

The 4000-ms readiness race bounds the HTTP response; it does not promise underlying
DNS/TLS work is cancelled at that instant. Readiness is not a complete grant/schema,
SMTP-inbox, optional-provider or application acceptance certificate.

## Safe changes and reasons

1. backend/src/app.ts: add /health and /ready aliases to existing /health/live and
   /health/ready handlers. Preserve old payloads, CORS, headers, APIs and DB semantics.
2. Same file: production readiness also refuses missing auth dependency before any
   DB probe. Actual server already validates auth before listen; this additionally
   protects incomplete embedded production construction. No unauthenticated API
   fallback or startup validation removal exists.
3. Same file: safe allowlist for certificate identity/expiry/chain errors. Messages
   are fixed; raw certificate/hostname/driver messages remain withheld.
4. backend/test/startup.test.mjs: four missing-critical-variable child-process cases,
   valid synthetic production bind without external services, authenticated API refusal,
   health aliases, DB-down/recovery/drain-race and fail-closed production embedding,
   actual graceful signal handler and TLS log redaction. Seven tests total.
5. backend/.env.example: preserve explicitly local development values, add commented
   production placeholders, optional-provider groups and separate operator inputs.
   No secrets/default production keys or financial approval are supplied.
6. Documentation: four requested reports and dated setup-guide clarification.

## Security findings and limits

| Finding | Status / evidence |
| --- | --- |
| Missing production keys/CA | P0 blocked configuration; exact validators in config/env.ts, config/tls.ts, auth/configuration.ts |
| Loopback DB identity | P0 blocked provider dependency, not fixed by renaming IP or inventing CA; db/pool.ts |
| Startup listener | No misplaced guard, blocking DB initialization or wrong PORT use found; production fail-closed refusal preserved |
| Auth/MFA | Argon2id, five-minute HS256 access tokens with issuer/audience/type checks, DB session/version/revocation and opaque refresh replay detection; Super Admin challenge-only until TOTP/recovery verified. Local tests, not deployed key verification |
| Tenant/RBAC | Active ancestry and per-operation permissions, typed four-tier parent paths; actor revalidated in transactions. No support impersonation bypass |
| CORS/body/error controls | Exact origins, no wildcard credentials, bounded strict bodies/PNG/raw webhook parsing, Helmet/no-store, generic internal errors. CORS is not authentication |
| Feedback/compliance | Independent Google/private paths; structured-only Clinic; Google-only destinations; immutable archive/language, audit rollback and concurrency root lock preserved |
| Secrets/logs | No real private env file read, no values added. JWT key also signs funnel-submission tokens; coordinate rotation. Opaque refresh has no signing key. MFA AES-GCM ciphertext requires matching existing key |
| Process-local limits | P1 shared ingress/rate-state/topology still unresolved; trust proxy remains disabled, not blindly enabled |
| Browser session storage/CSP | Existing XSS-readable sessionStorage credentials and inline-style CSP allowance remain material risks; no cookie-based CSRF claim |
| SMTP | TLS verified, explicit verification only, one send attempt; ambiguous delivery/outbox/alerts remain operational gaps |
| Finance | Task 22 unconditional paid execution hold retained; no env/role/catalog/provider signature bypass |
| Legal/auth requirements | No approved ToS/privacy/retention/deletion/auth amendment; preserved current security, no invented policy |

No TODO/FIXME or require.main startup guard was found in backend/src/backend scripts
search. Absence of markers is not proof of completion. Optional adapters use real
provider HTTP contracts in source; synthetic adapters occur in tests, not production
fake-output fallbacks. Missing Google connector/recommendation code and deferred
scope remain explicit in PROJECT_COMPLETION_STATUS.md and prior Task 22 matrix.

## Evidence boundary

Source/migration/test/document inventory was collected, and central startup,
configuration, authentication, authorization, DB transactions, route boundaries,
quota, feedback and provider paths were reviewed against tests. This is not an
independent penetration test, formal verification or a claim to have manually
proved every source line. The 503 cannot be claimed resolved without authorized
provider configuration and runtime evidence. Full local results and file inventory
are below; real production services remain unverified.

## Source and route inventory

All 61 backend source/operator script files were included in the filesystem/text
inventory. Hashes below identify the reviewed snapshot; inclusion is not a statement
that every line was formally proved. Route listing records literal declarations;
loop-generated actions are represented by their source file and verified in tests.

| File | Lines | SHA-256 prefix |
| --- | --- | --- |
| [backend/src/ai/provider.ts](../backend/src/ai/provider.ts) | 48 | ea0e5f8f317c14e5 |
| [backend/src/ai/routes.ts](../backend/src/ai/routes.ts) | 23 | 7290b433371612da |
| [backend/src/ai/service.ts](../backend/src/ai/service.ts) | 80 | 2aa878073b7fcf9b |
| [backend/src/app.ts](../backend/src/app.ts) | 132 | 208a1e3cdcb78591 |
| [backend/src/auth/authorization.ts](../backend/src/auth/authorization.ts) | 110 | 8770091d8b4f2a4c |
| [backend/src/auth/configuration.ts](../backend/src/auth/configuration.ts) | 22 | 210bd75f90ff96ec |
| [backend/src/auth/database.ts](../backend/src/auth/database.ts) | 27 | 5435342309d8918d |
| [backend/src/auth/mfa.ts](../backend/src/auth/mfa.ts) | 39 | 1fdcaf59349ae61e |
| [backend/src/auth/passwords.ts](../backend/src/auth/passwords.ts) | 13 | d08a1c9a0f11d36a |
| [backend/src/auth/routes.ts](../backend/src/auth/routes.ts) | 104 | 0865f6d4e57ba091 |
| [backend/src/auth/service.ts](../backend/src/auth/service.ts) | 259 | 98bfb276f64c1bd1 |
| [backend/src/auth/smtp-cli.ts](../backend/src/auth/smtp-cli.ts) | 14 | ff6ebf04225cc70b |
| [backend/src/auth/smtp.ts](../backend/src/auth/smtp.ts) | 61 | 6d4f343e70b7f028 |
| [backend/src/auth/tokens.ts](../backend/src/auth/tokens.ts) | 30 | f898c8ca38c8b0c6 |
| [backend/src/billing/approval.ts](../backend/src/billing/approval.ts) | 11 | 8998a207034fb620 |
| [backend/src/billing/provider.ts](../backend/src/billing/provider.ts) | 30 | 1dfaeb66f303843e |
| [backend/src/billing/routes.ts](../backend/src/billing/routes.ts) | 20 | c0119e9baa28e101 |
| [backend/src/billing/service.ts](../backend/src/billing/service.ts) | 126 | ebc01e21fcf03bbe |
| [backend/src/billing/terms.ts](../backend/src/billing/terms.ts) | 34 | 9729fb1c9177e94c |
| [backend/src/business/presentation-routes.ts](../backend/src/business/presentation-routes.ts) | 18 | 94f42e5f7479f81b |
| [backend/src/business/presentation.ts](../backend/src/business/presentation.ts) | 44 | 75d44620bdd02acd |
| [backend/src/business/routes.ts](../backend/src/business/routes.ts) | 40 | 8ca9491ce61fa01e |
| [backend/src/business/service.ts](../backend/src/business/service.ts) | 178 | 020e7b517e676d63 |
| [backend/src/business/validation.ts](../backend/src/business/validation.ts) | 41 | 6988411dff440833 |
| [backend/src/config/env.ts](../backend/src/config/env.ts) | 69 | 2434029fe8feedc4 |
| [backend/src/config/tls.ts](../backend/src/config/tls.ts) | 15 | 9a95808e0ddf3b98 |
| [backend/src/db/pool.ts](../backend/src/db/pool.ts) | 53 | 1db69d9134b7f556 |
| [backend/src/feedback/routes.ts](../backend/src/feedback/routes.ts) | 26 | 7ef899309c3603bc |
| [backend/src/feedback/service.ts](../backend/src/feedback/service.ts) | 111 | 4baa02426fd0d4b9 |
| [backend/src/feedback/tokens.ts](../backend/src/feedback/tokens.ts) | 27 | d4eb91c5dbe8346a |
| [backend/src/feedback/validation.ts](../backend/src/feedback/validation.ts) | 25 | 72baf16ae4102fbf |
| [backend/src/funnels/print.ts](../backend/src/funnels/print.ts) | 15 | 9027fc2bf297130c |
| [backend/src/funnels/qr.ts](../backend/src/funnels/qr.ts) | 8 | a34c9147fb4f3769 |
| [backend/src/funnels/routes.ts](../backend/src/funnels/routes.ts) | 30 | 404cc4a6dd0d2ef2 |
| [backend/src/funnels/service.ts](../backend/src/funnels/service.ts) | 151 | cf3456608e6644de |
| [backend/src/funnels/validation.ts](../backend/src/funnels/validation.ts) | 16 | 1ebf04052994444c |
| [backend/src/middleware/error-handler.ts](../backend/src/middleware/error-handler.ts) | 26 | 90fc426454156564 |
| [backend/src/migrations/cli.ts](../backend/src/migrations/cli.ts) | 32 | bddfa9764671c1f0 |
| [backend/src/migrations/operator-cli.ts](../backend/src/migrations/operator-cli.ts) | 54 | 0bd037ea727581cd |
| [backend/src/migrations/operator.ts](../backend/src/migrations/operator.ts) | 57 | a41cfd8b871d58c1 |
| [backend/src/migrations/privileges.ts](../backend/src/migrations/privileges.ts) | 51 | 433c6935fb493ad7 |
| [backend/src/migrations/runner.ts](../backend/src/migrations/runner.ts) | 187 | bc6c86845a95196d |
| [backend/src/migrations/schema.ts](../backend/src/migrations/schema.ts) | 33 | b1e4d3cbd83189e5 |
| [backend/src/server.ts](../backend/src/server.ts) | 71 | 48d3886d65d19743 |
| [backend/src/setup/bootstrap.ts](../backend/src/setup/bootstrap.ts) | 65 | 2fd2744577467ef7 |
| [backend/src/setup/cli.ts](../backend/src/setup/cli.ts) | 25 | 94e0ce672769f65a |
| [backend/src/subscriptions/catalog.ts](../backend/src/subscriptions/catalog.ts) | 67 | f48e7014401cd722 |
| [backend/src/subscriptions/model.ts](../backend/src/subscriptions/model.ts) | 31 | c7a0d6ee152a94ce |
| [backend/src/subscriptions/quota.ts](../backend/src/subscriptions/quota.ts) | 59 | f308a5a72f691921 |
| [backend/src/subscriptions/routes.ts](../backend/src/subscriptions/routes.ts) | 31 | 8ba6078904faacc7 |
| [backend/src/subscriptions/service.ts](../backend/src/subscriptions/service.ts) | 155 | 725c0a19b485cfe9 |
| [backend/src/tenants/delivery.ts](../backend/src/tenants/delivery.ts) | 7 | d12dd63739504ac0 |
| [backend/src/tenants/routes.ts](../backend/src/tenants/routes.ts) | 42 | 3f342369e1c9245c |
| [backend/src/tenants/service.ts](../backend/src/tenants/service.ts) | 201 | 386fb921acd5839a |
| [backend/scripts/recovery/archive.mjs](../backend/scripts/recovery/archive.mjs) | 53 | 406e6d45ffb0b040 |
| [backend/scripts/recovery/cli.mjs](../backend/scripts/recovery/cli.mjs) | 26 | bc53d39cc41169e5 |
| [backend/scripts/recovery/files.mjs](../backend/scripts/recovery/files.mjs) | 44 | 3db0143a0b041688 |
| [backend/scripts/recovery/snapshot.mjs](../backend/scripts/recovery/snapshot.mjs) | 51 | 619e99dbd8e85635 |
| [backend/scripts/recovery/utility.mjs](../backend/scripts/recovery/utility.mjs) | 106 | e5b5f27ba9c759b7 |
| [backend/scripts/schema-manifest.mjs](../backend/scripts/schema-manifest.mjs) | 18 | ea8b92e9e3d81bad |
| [backend/scripts/task22-audit.mjs](../backend/scripts/task22-audit.mjs) | 209 | 549100ffc0c0e821 |

### Mounted route declarations

| Source | Literal method/path declaration |
| --- | --- |
| backend/src/ai/routes.ts:7 | POST '/public/funnels/:code/views' |
| backend/src/ai/routes.ts:14 | POST '/public/funnels/:code/drafts' |
| backend/src/app.ts:86 | POST '/api/v1/billing/webhooks/razorpay' |
| backend/src/app.ts:103 | GET ['/health/live', '/health'] |
| backend/src/app.ts:106 | GET ['/health/ready', '/ready'] |
| backend/src/auth/routes.ts:54 | POST '/login' |
| backend/src/auth/routes.ts:64 | POST '/mfa/enrollment' |
| backend/src/auth/routes.ts:76 | POST '/refresh' |
| backend/src/auth/routes.ts:80 | POST '/logout' |
| backend/src/auth/routes.ts:83 | POST '/select-tenant' |
| backend/src/auth/routes.ts:87 | GET '/me' |
| backend/src/auth/routes.ts:88 | POST '/forgot-password' |
| backend/src/auth/routes.ts:94 | POST '/reset-password' |
| backend/src/auth/routes.ts:98 | POST '/accept-invitation' |
| backend/src/billing/routes.ts:13 | GET '/merchants/:id/billing' |
| backend/src/billing/routes.ts:14 | GET '/merchants/:id/billing/metering' |
| backend/src/billing/routes.ts:15 | GET '/merchants/:id/billing/:agreementId/invoice-preparation' |
| backend/src/billing/routes.ts:16 | POST '/merchants/:id/billing/checkout' |
| backend/src/billing/routes.ts:17 | POST '/merchants/:id/billing/:agreementId/cancel' |
| backend/src/business/presentation-routes.ts:13 | GET '/merchants/:id/presentation' |
| backend/src/business/presentation-routes.ts:14 | POST '/merchants/:id/presentation' |
| backend/src/business/presentation-routes.ts:15 | POST '/merchants/:id/presentation/logo' |
| backend/src/business/routes.ts:18 | GET '/industry-channels' |
| backend/src/business/routes.ts:19 | GET '/industry-channels/:id/versions/:versionId' |
| backend/src/business/routes.ts:20 | GET '/industry-channels/:id/versions' |
| backend/src/business/routes.ts:21 | GET '/industry-channels/:id' |
| backend/src/business/routes.ts:22 | PATCH '/industry-channels/:id' |
| backend/src/business/routes.ts:23 | POST '/industry-channels/:id/versions' |
| backend/src/business/routes.ts:24 | PATCH '/industry-channels/:id/versions/:versionId' |
| backend/src/business/routes.ts:25 | POST '/industry-channels/:id/versions/:versionId/publish' |
| backend/src/business/routes.ts:26 | POST '/merchants' |
| backend/src/business/routes.ts:27 | GET '/merchants/:id/branches' |
| backend/src/business/routes.ts:28 | POST '/merchants/:id/branches' |
| backend/src/business/routes.ts:29 | GET '/merchants/:id' |
| backend/src/business/routes.ts:30 | PATCH '/merchants/:id' |
| backend/src/business/routes.ts:31 | GET '/branches/:id' |
| backend/src/business/routes.ts:32 | PATCH '/branches/:id' |
| backend/src/business/routes.ts:33 | POST '/branches/:id/archive' |
| backend/src/business/routes.ts:34 | GET '/branches/:id/review-destination' |
| backend/src/business/routes.ts:35 | POST '/branches/:id/review-destination' |
| backend/src/business/routes.ts:36 | PATCH '/branches/:id/review-destination' |
| backend/src/business/routes.ts:37 | POST `/branches/:id/review-destination/${action}` |
| backend/src/feedback/routes.ts:17 | POST '/public/funnels/:code/feedback' |
| backend/src/feedback/routes.ts:19 | GET '/feedback/statistics' |
| backend/src/feedback/routes.ts:20 | GET '/feedback/analytics' |
| backend/src/feedback/routes.ts:21 | GET '/feedback' |
| backend/src/feedback/routes.ts:22 | GET '/feedback/:id' |
| backend/src/feedback/routes.ts:23 | PATCH '/feedback/:id/status' |
| backend/src/funnels/routes.ts:17 | GET '/public/funnels/:code' |
| backend/src/funnels/routes.ts:18 | POST '/public/funnels/:code/events' |
| backend/src/funnels/routes.ts:20 | POST '/branches/:id/funnels' |
| backend/src/funnels/routes.ts:21 | POST '/branches/:id/short-links' |
| backend/src/funnels/routes.ts:22 | GET '/branches/:id/short-links' |
| backend/src/funnels/routes.ts:23 | POST '/short-links/:id/disable' |
| backend/src/funnels/routes.ts:24 | POST '/branches/:id/qr' |
| backend/src/funnels/routes.ts:25 | GET '/branches/:id/qr' |
| backend/src/funnels/routes.ts:26 | GET '/qr-assets/:id/print.pdf' |
| backend/src/funnels/routes.ts:27 | GET '/qr-assets/:id/content' |
| backend/src/subscriptions/routes.ts:15 | GET '/admin/subscription-plans' |
| backend/src/subscriptions/routes.ts:16 | POST '/admin/subscription-plans' |
| backend/src/subscriptions/routes.ts:17 | POST '/admin/subscription-plans/:id/publish' |
| backend/src/subscriptions/routes.ts:18 | POST '/admin/subscription-plans/:id/commercial-approval' |
| backend/src/subscriptions/routes.ts:19 | GET '/subscription-plans' |
| backend/src/subscriptions/routes.ts:20 | GET '/subscription-plans/:id' |
| backend/src/subscriptions/routes.ts:21 | GET '/merchants/:id/subscription' |
| backend/src/subscriptions/routes.ts:22 | GET '/merchants/:id/subscriptions' |
| backend/src/subscriptions/routes.ts:23 | POST '/merchants/:id/subscriptions' |
| backend/src/subscriptions/routes.ts:24 | PATCH '/merchants/:id/subscriptions/:subscriptionId/status' |
| backend/src/subscriptions/routes.ts:25 | POST '/merchants/:id/subscriptions/:subscriptionId/usage/initialize' |
| backend/src/subscriptions/routes.ts:26 | GET '/merchants/:id/usage/history' |
| backend/src/subscriptions/routes.ts:27 | GET '/merchants/:id/usage/:metric' |
| backend/src/subscriptions/routes.ts:28 | GET '/merchants/:id/usage' |
| backend/src/tenants/routes.ts:31 | POST '/' |
| backend/src/tenants/routes.ts:32 | GET '/' |
| backend/src/tenants/routes.ts:33 | GET '/:id/descendants' |
| backend/src/tenants/routes.ts:34 | GET '/:id/history' |
| backend/src/tenants/routes.ts:35 | GET '/:id' |
| backend/src/tenants/routes.ts:36 | PATCH '/:id' |
| backend/src/tenants/routes.ts:37 | POST '/:id/suspend' |
| backend/src/tenants/routes.ts:38 | POST '/:id/reinstate' |
| backend/src/tenants/routes.ts:39 | POST '/:id/invitations' |

### Automated test inventory

- [backend/test/ai-billing.test.mjs](../backend/test/ai-billing.test.mjs)
- [backend/test/auth.integration.mjs](../backend/test/auth.integration.mjs)
- [backend/test/auth.test.mjs](../backend/test/auth.test.mjs)
- [backend/test/business.integration.mjs](../backend/test/business.integration.mjs)
- [backend/test/business.test.mjs](../backend/test/business.test.mjs)
- [backend/test/commercial-fixtures.mjs](../backend/test/commercial-fixtures.mjs)
- [backend/test/external.integration.mjs](../backend/test/external.integration.mjs)
- [backend/test/external.test.mjs](../backend/test/external.test.mjs)
- [backend/test/feedback-concurrency.integration.mjs](../backend/test/feedback-concurrency.integration.mjs)
- [backend/test/feedback-concurrency.test.mjs](../backend/test/feedback-concurrency.test.mjs)
- [backend/test/feedback.integration.mjs](../backend/test/feedback.integration.mjs)
- [backend/test/feedback.test.mjs](../backend/test/feedback.test.mjs)
- [backend/test/foundation.test.mjs](../backend/test/foundation.test.mjs)
- [backend/test/funnels.integration.mjs](../backend/test/funnels.integration.mjs)
- [backend/test/funnels.test.mjs](../backend/test/funnels.test.mjs)
- [backend/test/mariadb-fixture.mjs](../backend/test/mariadb-fixture.mjs)
- [backend/test/mfa-fixtures.mjs](../backend/test/mfa-fixtures.mjs)
- [backend/test/mfa.integration.mjs](../backend/test/mfa.integration.mjs)
- [backend/test/migration-safety.integration.mjs](../backend/test/migration-safety.integration.mjs)
- [backend/test/migration-safety.test.mjs](../backend/test/migration-safety.test.mjs)
- [backend/test/migrations.integration.mjs](../backend/test/migrations.integration.mjs)
- [backend/test/migrations.test.mjs](../backend/test/migrations.test.mjs)
- [backend/test/quota-fixtures.mjs](../backend/test/quota-fixtures.mjs)
- [backend/test/quotas.integration.mjs](../backend/test/quotas.integration.mjs)
- [backend/test/quotas.test.mjs](../backend/test/quotas.test.mjs)
- [backend/test/recovery.integration.mjs](../backend/test/recovery.integration.mjs)
- [backend/test/recovery.test.mjs](../backend/test/recovery.test.mjs)
- [backend/test/schema.integration.mjs](../backend/test/schema.integration.mjs)
- [backend/test/setup.integration.mjs](../backend/test/setup.integration.mjs)
- [backend/test/startup.test.mjs](../backend/test/startup.test.mjs)
- [backend/test/subscriptions.integration.mjs](../backend/test/subscriptions.integration.mjs)
- [backend/test/subscriptions.test.mjs](../backend/test/subscriptions.test.mjs)
- [backend/test/task22.test.mjs](../backend/test/task22.test.mjs)
- [backend/test/tenants.integration.mjs](../backend/test/tenants.integration.mjs)
- [backend/test/tls-fixture.mjs](../backend/test/tls-fixture.mjs)

### Migration inventory

85 ordered SQL versions, 84 matching verification files
(the bootstrap ledger has special runner verification). Filesystem-only loading
validated order and every SHA-256 against schema-manifest.json. No SQL/verification
file, ledger or schema manifest was edited by this audit; disposable integration
tests separately execute fresh migrations and verify 32 tables/46 triggers.

## Actual validation results (2026-11-07)

| Command | Result |
| --- | --- |
| npm --prefix backend test | 52 passed, 0 failures/skips, including 7 new startup/readiness tests |
| npm --prefix backend run test:integration | 185 passed, 0 failures/skips; disposable MariaDB 11.8.9 |
| npm test | 29 frontend tests passed |
| npm run test:e2e:real | 13 passed, 0 failures/skips, actual local React/Express/MariaDB |
| npm run test:browser | 8 fixture browser tests passed |
| npm run test:server | 1 frontend-server test passed |
| npm run typecheck; npm --prefix backend run typecheck | Both passed |
| npm run build; backend build as part of backend test/integration/E2E | Both passed |
| npm run lint | Passed |
| Migration filesystem checksum/ordering inspection | All 85 match manifest |
| git diff --check and new-file whitespace validation | Passed |

**288 tests total**, including node:test parent tests; no existing test skipped or
weakened. Startup tests use only loopback, example.invalid origins, ephemeral random
credentials and a temporary copy of a Node-bundled public trust root for CA parsing.
No platform-specific OpenSSL is needed by the new unit tests. The latest actual
compiled production-entrypoint spawn-to-listen measurement was **405 ms**, below
three seconds locally; the test uses a generous process timeout to avoid treating
shared CI scheduling as a provider latency benchmark. Local Windows Node24 timing
does not prove Hostinger cold-start performance. Earlier focused run measured 406 ms.

Integration includes the original feedback deadlock reproduction/fixed-path stress,
quota workers, MFA/session replay, target/privilege/schema/lock/interruption recovery,
TLS/SMTP refusal and encrypted fresh backup/restore. Synthetic provider protocol
responses and browser fixture tests remain distinct from actual external verification.
Actual AI, payment, Google, real mailbox, provider TLS/grants and production startup
verification are **blocked/unverified**, not skipped tests counted as successes.

Existing dependencies were already installed and unchanged; npm install was not
needed or run. No package/lockfile, SQL/migration manifest or business implementation
changed. Temporary logs reside in ignored .tmp-frontend/backend-audit/. Tests/builds
passed locally; no deployment success or product completion is inferred.

## Complete change inventory

| File | Actual change |
| --- | --- |
| [backend/.env.example](../backend/.env.example) | Modified: commented production/optional/operator placeholders, no secret values |
| [backend/src/app.ts](../backend/src/app.ts) | Modified: probe aliases, embedded production auth readiness guard, safe TLS diagnostics |
| [backend/docs/hostinger-environment-setup-guide.md](../backend/docs/hostinger-environment-setup-guide.md) | Extended pre-existing untracked guide with dated audit addendum |
| [backend/test/startup.test.mjs](../backend/test/startup.test.mjs) | Created: seven child-process/readiness/security regression tests |
| [reports/BACKEND_AUDIT.md](../reports/BACKEND_AUDIT.md) | Created: architecture, cause, controls, source/route/test inventory and actual results |
| [reports/HOSTINGER_DEPLOYMENT.md](../reports/HOSTINGER_DEPLOYMENT.md) | Created: unexecuted secure handoff, exact formats and 52-name backend environment inventory |
| [reports/PENDING_TASKS.md](../reports/PENDING_TASKS.md) | Created: prioritized P0?P3 dependencies and owner actions |
| [reports/PROJECT_COMPLETION_STATUS.md](../reports/PROJECT_COMPLETION_STATUS.md) | Created: feature status/evidence, genuine gaps/deferred scope and no unsupported percentage |
