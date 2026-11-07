# HOSTINGER_LOCAL implementation and operator handoff

2026-11-07. Implemented under the owner's explicit repository/local-test approval.
No production access, credential change, Hostinger initialization or deployment.
This does not resolve or verify the public API's 503. Earlier proposal documents
are historical snapshots; this report describes the implemented code.

## Transport contract

`backend/src/config/database-transport.ts` is the shared, pure transport validator
used by environment validation, application pool, diagnostic and operator paths.
Production defaults to `required`. Remote endpoints always require verified TLS:
DNS certificate identity, approved CA file/hash, chain verification, hostname
verification and minimum TLS 1.2. TLS failures are never caught to retry plaintext.
The pre-existing nonproduction literal-loopback disposable mode remains supported;
remote `disabled` is rejected even outside production.

HOSTINGER_LOCAL is an explicit security exception, accepted only with all settings
below. It constructs an unencrypted mysql2 connection; it does not install a fake
certificate or change TLS verification options. Startup emits a structured warning
with `encrypted:false` and the non-secret approval reference. Diagnostic output
says `status:connected`, `transport:unencrypted_loopback`, `encrypted:false`, not
TLS verified. `check-runtime`'s `verified:true` refers to target/grants, not transport.

## Exact protected Hostinger process settings, for later approved activation

These are instructions only. Current authorization does **not** permit activation.
Set variables on the backend runtime; production does not load .env files.

| Variable | Required value or validation |
| --- | --- |
| NODE_ENV | `production`, including local production-like tests; keeps security validation |
| HOST | `0.0.0.0` for provider ingress; distinct from DB_HOST |
| PORT | Actual provider-assigned HTTP port, positive integer 1-65535 |
| DB_TLS_MODE | Exactly `HOSTINGER_LOCAL` |
| DB_HOST | Exactly `127.0.0.1`; no localhost, IPv6, DNS alias or alternate IP |
| DB_PORT | Explicit canonical string `3306`; omission, 03306 or another port rejected |
| HOSTINGER_LOCAL_APPROVAL | Exactly `I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT` |
| HOSTINGER_LOCAL_APPROVAL_ID | Genuine operator-reviewed approval record: 8-80 ASCII letters/digits/dot/underscore/hyphen, initial alphanumeric; REPLACE_WITH_ prefix rejected |
| DB_TLS_CA_FILE / DB_TLS_CA_SHA256 | Both **absent/unset** in this mode; empty values and dummy hashes rejected |
| DB_NAME / DB_USER | Actual reviewed existing schema and separate restricted runtime account; nonempty, no REPLACE_WITH_ placeholder |
| DB_PASSWORD | Actual protected account password; production minimum 16 characters and 8 distinct characters |
| DB_CONNECTION_LIMIT | Optional integer 1-50, default 5; confirm provider budget |
| PUBLIC_FUNNEL_ORIGIN | `https://api.revexoe.com` if owner-confirmed; exact HTTPS origin, no slash/path |
| PUBLIC_WEB_ORIGIN | `https://revexoe.com` if owner-confirmed; exact HTTPS origin |
| CORS_ORIGINS | Exact HTTPS origins separated by commas; must include PUBLIC_WEB_ORIGIN, no wildcard/path |
| AUTH_RECOVERY_URL | Exactly PUBLIC_WEB_ORIGIN plus `/recover` |
| AUTH_ACCESS_SECRET | Existing approved canonical standard base64, 32-128 decoded bytes and at least 16 distinct byte values |
| AUTH_MFA_KEY | Existing matching independent canonical base64, exactly 32 decoded bytes with same diversity check; never replace existing MFA key to fix startup |
| AUTH_SMTP_HOST | Provider SMTP DNS host, letters/digits/dot/hyphen; no URL prefix |
| AUTH_SMTP_PORT | Provider port, integer 1-65535; 465 defaults implicit TLS, 587 STARTTLS |
| AUTH_SMTP_SECURITY | implicit or starttls; required explicitly for other ports, provider-confirmed |
| AUTH_SMTP_USER / AUTH_SMTP_PASSWORD | Actual protected provider credentials; password minimum 16 characters and 8 distinct characters |
| AUTH_MAIL_FROM | Provider-approved bare email address |

Optional SMTP servername/private-CA pair retain their existing verified TLS rules.
AI/payment groups remain wholly absent unless separately configured and authorized;
financial holds remain unchanged. No secret value or production approval reference
is supplied by this report. A syntactically valid reference cannot prove approval:
the operator/reviewer must verify the real record and control environment access.
Test-only approval IDs are not production authorization.

For normal TLS deployments, omit local approval settings and use `DB_TLS_MODE=required`,
matching DNS DB_HOST, trusted readable PEM DB_TLS_CA_FILE and exact-file 64-hex
DB_TLS_CA_SHA256. Never select HOSTINGER_LOCAL as a fallback after handshake failure.

## Migration and bootstrap safeguards

No SQL migration, manifest or business schema was changed. No migrations run during
API startup. Existing 85 ordered migrations remain available through the guarded
operator runner. The legacy disposable-only CLI is not a production initializer.

The new [target template](../backend/docs/hostinger-local-target.example.json) is
deliberately invalid until populated with a genuine approval reference and approved
identity inventory. Keep completed target policies outside Git. It requires
environment production, exact host/port, transport HOSTINGER_LOCAL and
hostingerLocalApprovalId matching the protected process approval ID; omit both
tlsCaFile/tlsCaSha256. Actual connection host/port, DATABASE(), @@hostname and
CURRENT_USER() are checked. Expected identities must come from authorized inventory.

The migration CLI still requires separate MIGRATION_DB_USER/PASSWORD, exact grants,
advisory lock, supported MariaDB version, structural manifest, complete ledger,
checksums and postconditions. Preflight is non-mutating; apply additionally needs
its fresh bound report, new audit file and independent explicit production digest
confirmation. Transport/ref changes invalidate approval artifacts. Existing unknown
objects or incomplete migrations block execution; nothing is deleted or adopted.
See [production operator runbook](../backend/docs/production-migration-runbook.md)
for the preflight/apply command sequence and review controls. This transport exception
supersedes only that runbook's unconditional production CA requirement for an
explicitly approved HOSTINGER_LOCAL target.

Bootstrap uses the same transport/policy and retains separate BOOTSTRAP_DB_USER/
PASSWORD, BOOTSTRAP:<policy-digest> approval and existing duplicate/root safeguards.
The read-only diagnostic remains `node dist/db/diagnostic-cli.js --confirm-read-only`
in a separately approved configured runtime; it does not prove schema/grants.
No such command was run against Hostinger here.

## Deployment checklist and remaining production blockers

1. Obtain separate written production transport-exception approval with genuine
   record reference, operator/reviewer and rollback plan. Current user approval
   authorizes repository implementation and local tests only.
2. Hostinger must confirm backend/container-to-127.0.0.1 routing, process/network
   and tenant isolation, who can observe/redirect that traffic, and whether this
   endpoint proxies an unencrypted downstream hop. No dedicated boundary is assumed.
3. Confirm real DB schema/data inventory, MariaDB version, exact account/grants,
   trigger definers, metadata visibility and named-lock/session behavior. Root
   fixture credentials demonstrate behavior, not provider privilege availability.
4. Establish protected backups, key custody, isolated restore rehearsal and approved
   recovery objectives. Preserve users, MFA ciphertext, sessions and audit history.
   Do not initialize a database merely because it is described as empty.
5. Privately validate existing auth/MFA keys, SMTP configuration, outbound delivery
   and provider HTTP port. Never expose secrets in logs or fabricate replacements.
6. After separately authorized initialization/release, use Node 24, app root backend,
   build `npm run build` during build phase and start `npm start` (dist/server.js).
   Startup must not install, compile, migrate or verify SMTP before listen.
7. Verify deployed commit/artifact and secret-free listening logs. Test
   `/health/live` for HTTP liveness and `/health/ready` for SELECT 1 readiness,
   without `/api/v1`. Existing aliases, if any, must be checked against source;
   do not use root `/` as the health check. Readiness can take four seconds;
   a three-second readiness deadline is not guaranteed compatible.
8. Test authorized synthetic acceptance flows before opening traffic. A listening
   server is not proof of DB schema, SMTP, MFA custody or application readiness.

Loopback traffic has no transport confidentiality, integrity or certificate peer
identity. DB passwords, SQL/results and authentication-related records traverse
the local connection unencrypted; database login is not channel authentication.
Host compromise, privileged inspection, malicious local listeners or unsafe routing
remain risks. Endpoint restrictions cannot establish a hosting security boundary.
App HTTPS, password hashing, MFA encryption, RBAC and tenant isolation remain active,
but cannot replace database transport protection. A required-TLS rollback must have
a verified endpoint/CA first; never silently toggle transport or delete data.

## Changed files

- Runtime: backend/src/config/database-transport.ts (new), config/env.ts,
  db/pool.ts, db/diagnostic.ts, db/diagnostic-cli.ts and server.ts.
- Operators: backend/src/migrations/operator.ts, migrations/operator-cli.ts,
  setup/cli.ts. No migration SQL or authentication/business service changes.
- Tests: backend/test/hostinger-local.test.mjs (new),
  hostinger-local.integration.mjs (new), hostinger-local-proposal.test.mjs and
  mariadb-fixture.mjs (exclusive harness-owned port3306 option).
- Templates/docs: backend/.env.example, docs/hostinger-local-target.example.json
  (new), docs/hostinger-environment-setup-guide.md, docs/production-migration-runbook.md;
  reports/HOSTINGER_LOCAL_DATABASE_PROPOSAL.md, HOSTINGER_ENV_SETUP.md,
  HOSTINGER_DEPLOYMENT_STEPS.md and SECURITY_TRADEOFFS.md (historical status banners);
  this new report and HOSTINGER_LOCAL_TEST_REPORT.md.

See [test evidence](HOSTINGER_LOCAL_TEST_REPORT.md). Production database transport,
current deployed build, authentication configuration and API availability remain
unverified. No production readiness or successful 503 resolution is claimed.
