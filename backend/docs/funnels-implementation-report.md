# Task 08 implementation and security report

Completed locally, 2026-11-04. No Hostinger connection, production credentials,
production migration, secret/configuration-file change, frontend change or AI
feature. Existing migration files, checksums and database constraints are unchanged.
Contract and workflow: [funnels-api.md](funnels-api.md).

## Implementation

Seven authenticated routes and two public routes reuse the existing mysql2 pool,
tenant transaction guard, ancestry/RBAC authorization, validation, safe errors,
rate limiter and append-only audit architecture. New branch funnel publication
provides the missing path from published industry version/Google destination to
immutable branch configuration. Links pin a revision and are never arbitrarily
redirected. Codes are 128 cryptographically random bits with a database UNIQUE key
and bounded collision handling.

QR generation supports SVG/PNG, persists existing qr_assets metadata and verifies
rendered content against SHA-256. Virtual assets render on demand, with no local
filesystem/object-store dependency and no public storage permission. Two-phase
generation revalidates after rendering, then commits metadata plus audit atomically.
Idempotent generation and explicit regeneration preserve printed URLs. Authenticated
content download rechecks ownership/status. PNG tests decode the resulting image
with an independent decoder and assert that its sole payload is the public URL.

Public projection explicitly excludes internal IDs, actor data and private database
metadata. Both independent options are returned together, with no rating/sentiment
input or gating settings. All three channels expose structured-only rating fields;
medical/narrative/unknown event inputs are rejected. Disabled/expired links,
archived branches, inactive destinations/channels and suspended merchant/ancestor
states fail closed with identical safe 404 messages. Public audit event insertion
and resolution share a transaction and conservative shared-root locking.

## Scope boundary: backend APIs versus customer journey

The public QR URL currently returns JSON. This task does not implement a customer
page or a private-feedback submission service. Independent selection events and
structured form metadata work; `submissionAvailable=false` states that feedback
cannot yet be submitted. Do not claim the full Google/private customer journey is
operational. Completing that journey requires the future public UI and separately
secured, idempotent structured submission endpoint. The Google URL is independently
available without rating or private selection. No quota enforcement is added.

No Google listing ownership/existence verification or SMTP delivery verification
is claimed. No visitor profiling, medical fields, raw bodies, IPs or user agents
are stored in public events. Analytics counts describe untrusted requests/clicks,
never unique customers or confirmed Google reviews. Operator retention policy is
still required because append-only events consume storage.

## Tests actually run

Every integration suite uses a newly initialized disposable local MariaDB **11.8.9**
Windows ZIP server, loopback random port and ephemeral credentials. Tests never
load production environment files. No destructive SQL or production migration.

| Command from repository root | Passed | Failed / skipped |
| --- | ---: | --- |
| npm --prefix backend test | 20 | 0 / 0 |
| npm --prefix backend run test:funnels:integration | 10 | 0 / 0 |
| npm --prefix backend run test:business:integration | 11 | 0 / 0 |
| npm --prefix backend run test:tenants:integration | 12 | 0 / 0 |
| npm --prefix backend run test:auth:integration | 16 | 0 / 0 |
| npm --prefix backend run test:schema:integration | 10 | 0 / 0 |
| npm --prefix backend run test:migrations:integration | 8 | 0 / 0 |

Total: 87 passing tests, including integration parent tests. TypeScript compilation
passes in every command. New unit tests exercise code entropy/shape and uniqueness,
trusted-origin validation, rejected privacy/gating inputs, deterministic QR rendering
and independent PNG decoding. New integration coverage includes:

- Every seeded industry, scoped immutable publication and invalid industry/version
  assignment; same-branch ownership and cross-merchant/peer access rejection.
- QR generation, idempotent repeats, SVG/PNG content digest and regeneration;
  staff read versus write permissions and all administrative management scopes.
- Database duplicate-code rejection and missing-origin fail-before-write behavior.
- Public data minimization, independent selection events, structured-only clinic
  fields, rating/gating/medical payload rejection and no public configuration writes.
- Merchant, sub-reseller, reseller and root suspension; archived branch, retired
  channel, inactive/unsafe destination; expired/disabled/invalid/unknown links.
- Safe minimum analytics, atomic link/QR rollback under injected audit failure,
  honest public event failure, rate-limit refusal and ignored spoofed IP headers.

Existing auth, tenant, business, schema and migration regression suites pass.
No test establishes production edge routing, SMTP, Google ownership, provider
grants or a usable public browser UI. Initial test assertions were corrected for
mysql2 JSON objects and BIGINT count strings; application safeguards were not
relaxed to make tests pass.

## Dependencies and compatibility

Runtime qrcode ^1.5.4 handles real encoding. Development-only @types/qrcode,
jsqr and pngjs provide type definitions and independent PNG decoding in tests.
package-lock pins resolved versions. Installation reported zero known npm audit
vulnerabilities at test time; this is not an ongoing security guarantee.
No additional SQL/MariaDB compatibility issue was found, and no schema migration
was needed. MariaDB schema/trigger/integrity regression tests pass unchanged.

## Remaining operational gates

- Set and verify PUBLIC_FUNNEL_ORIGIN/DNS/HTTPS/API routing before issuing codes.
  Printed links are currently JSON API URLs; future HTML routes need a deliberate
  compatibility plan. Do not use untrusted Host headers or weaken origin validation.
- Verify effective least-privilege database grants, append-only tables, provider
  session/trigger behavior, existing data compatibility and backups before rollout.
- Provide shared edge limits and verify trusted-proxy behavior. Current bounded
  process-local limits do not claim distributed protection or bot-proof analytics.
- Root-lock serialization prioritizes consistent suspension checks over throughput;
  load testing and equivalent race tests are required before changing lock strategy.
- Regeneration is required if a dependency/origin change alters deterministic QR
  bytes. Old metadata is not silently rewritten during content downloads.
- Implement private submission and public UI separately; neither analytics events
  nor schema constraints alone prove parallel browser presentation/usability.

## Complete file inventory

| File | Change |
| --- | --- |
| ../src/funnels/service.ts | New scoped publication/link/QR/public projection/event services |
| ../src/funnels/routes.ts | New seven authenticated and two public routes, strict validation and limits |
| ../src/funnels/validation.ts | New CSPRNG codes, exact origin and allowlisted input schemas |
| ../src/funnels/qr.ts | New deterministic SVG/PNG renderer and SHA-256 digest |
| ../src/app.ts | Inject/mount funnel router before the existing business router |
| ../src/server.ts | Wire existing services/pool and optional operator-supplied public origin |
| ../package.json | QR runtime/test dependencies and explicit integration command |
| ../package-lock.json | Resolved dependency lock updates |
| ../test/funnels.test.mjs | New code/validation/QR decode unit tests |
| ../test/funnels.integration.mjs | New disposable MariaDB route/security/rollback tests |
| funnels-api.md | New API/workflow/configuration/privacy contract |
| funnels-implementation-report.md | This test/security report and inventory |
| database-architecture.md | Task 08 status note and scope boundary |
| business-api.md | Current funnel API pointer and historical scope clarification |
| ../README.md | Funnel configuration/documentation and explicit local test command |

No environment file, production secret, migration, frontend file or existing
business/schema implementation file changed. No production deployment is performed.
