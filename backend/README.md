# Backend foundation

Task 06 adds [tenant/account APIs](docs/tenants-api.md) and a complete
[tenant security report](docs/tenants-security-report.md). Provisioning/invitations
require configured and successfully verified delivery; no operational SMTP claim
is made from local tests. No migration or frontend change is needed for Task 06.

Task 05 adds authentication and tenant authorization; see
[Auth API](docs/auth-api.md) and [security report](docs/auth-security-report.md).
Authentication requires an operator-provided signing key and schema version
000063. No production environment was changed. MFA and the recovery frontend
remain unimplemented. Historical foundation notes below describe the original
health subsystem; current auth routes are documented separately.

Requires Node.js 24. The frontend and backend are independent npm packages with separate lockfiles. Install the backend with `npm ci --prefix backend`; this also compiles it through its prepare script. Install the frontend separately with `npm ci` at the repository root.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and replace the database placeholders with your own MySQL/MariaDB connection details. Do not commit this file.
2. Run `npm run dev:api` from the repository root. Run the existing `npm run dev` in another terminal for the unchanged frontend.
3. Check `http://127.0.0.1:3001/health/live` and `/health/ready`.

The backend loads only `backend/.env`, resolved relative to its own modules in both source and compiled builds. Existing environment variables take priority. The frontend does not read this file and does not make API calls in this phase. Never put database values in `VITE_*` variables.

## Configuration

| Variable | Meaning |
| --- | --- |
| NODE_ENV | development (default), test, or production |
| HOST | Bind interface; defaults to 127.0.0.1 locally. Confirm Hostinger's required interface before deployment. |
| PORT | HTTP port, 1–65535; defaults to 3001. Honor the hosting-assigned value. |
| CORS_ORIGINS | Required comma-separated exact HTTP(S) frontend origins, without trailing slashes, paths, credentials, or wildcards |
| DB_HOST / DB_PORT | Database hostname and port; port defaults to 3306 |
| DB_NAME / DB_USER / DB_PASSWORD | Required database credentials; example placeholders are rejected |
| DB_CONNECTION_LIMIT | Pool size, 1–50; defaults to 5. Match the hosting database allowance. |

CORS allows GET/HEAD/POST/PATCH/OPTIONS and Content-Type/Authorization; credentials are disabled. Disallowed browser origins receive 403. Requests without Origin remain valid for health probes and server-to-server access; CORS is not authentication.

## Health and lifecycle

- `GET /health/live`: 200 if HTTP is responding; no database query.
- `GET /health/ready`: 200 after a successful `SELECT 1`; 503 if the database is unavailable, times out, or shutdown has begun. No connection details are returned.
- Configuration errors stop startup with exit code 1 and variable names only. A database outage does not prevent HTTP startup.
- Probes have a four-second response deadline and share an in-flight query. The pool has bounded connections and does not queue requests when exhausted.
- SIGINT/SIGTERM marks the service unready, stops accepting HTTP connections, drains active requests, and closes the pool. A ten-second deadline forces exit if cleanup hangs.
- Express uses Helmet, a 16 KB JSON body limit, centralized safe errors, and no x-powered-by header. HTTP request/header timeouts are configured independently of database timeouts.

## Commands

From the repository root:

```text
npm run typecheck:api
npm run build:api
npm run start:api
npm --prefix backend run test
```

Backend tests compile first and use Node's built-in test runner. They exercise HTTP behavior with an injected database probe, environment validation, query deduplication, startup failure, unavailable database behavior, and the real shutdown handler. A successful readiness response against a real database still requires a configured MySQL/MariaDB instance.

## Before deployment

Confirm Hostinger's Node 24 runtime, monorepo build root, compiled entrypoint (`backend/dist/server.js` relative to repository root), environment-variable controls, required bind address/port, HTTPS/API domain, and log access. Confirm the actual MariaDB/MySQL version, database network location, TLS requirements, allowed connections, and backups. TLS must be configured with a verified CA if the database requires a remote TLS connection; this local foundation does not assume a remote database transport configuration.

Keep the current frontend deployment unchanged. `npm run build` still builds only the frontend; `npm run build:api` builds only the backend. Install dev dependencies during backend builds so the compiler is available; run compiled JavaScript in production. No PM2 or background worker is included.

## Implemented APIs and explicit local migration commands

Authentication, tenant provisioning and merchant business management now use the
existing schema. Read [auth-api.md](docs/auth-api.md),
[tenants-api.md](docs/tenants-api.md), [business-api.md](docs/business-api.md) and
[migration-guide.md](docs/migration-guide.md) before configuring or using them.
Migrations never run during install, prepare, startup or health checks. No
production deployment is implied by the local implementation reports.

Run `npm --prefix backend run test:business:integration` with MARIADB_TEST_BIN
pointing to local MariaDB 11.8.9 binaries to test business APIs on a disposable
database. See [business-implementation-report.md](docs/business-implementation-report.md)
for the complete regression results and remaining deployment gates.

Task 08 adds [QR/short-link/public funnel APIs](docs/funnels-api.md). Supply an
exact HTTPS PUBLIC_FUNNEL_ORIGIN through operator configuration before issuing
codes; no Host-header-derived URLs or default production origin is used. The QR
currently resolves to a JSON API, not a customer page. Task 09 now implements
private-feedback submission; the public frontend remains separate work. Run
`npm --prefix backend run test:funnels:integration` with the same disposable local
MariaDB harness. See [the Task 08 report](docs/funnels-implementation-report.md)
for security limits, complete file inventory and all regression results.

See [feedback-api.md](docs/feedback-api.md) for anonymous signed/idempotent
structured submission and authorized feedback management. Run
`npm --prefix backend run test:feedback:integration` with the same disposable
local MariaDB harness. Read the [security report](docs/feedback-security-report.md)
and [implementation/test inventory](docs/feedback-implementation-report.md) before
rollout. Existing current subscriptions require initialized usage counters; no
new production secret, schema migration or quota admission was added.

Task 11 adds [merchant subscription and usage APIs](docs/subscriptions-api.md) and
the existing merchant frontend's subscription panel. No plan prices/limits are
seeded. See the [security report](docs/subscriptions-security-report.md) and
[implementation/test inventory](docs/subscriptions-implementation-report.md) for
current gauge versus snapshot-history semantics and production gates. Run
`npm --prefix backend run test:subscriptions:integration` using the disposable
MariaDB harness. No payment/billing automation or quota admission is implemented.
