# Task 07 implementation and security report

Implemented and tested locally on 2026-11-04. No Hostinger connection, production
credentials/configuration, production migration, schema change, frontend change or
AI functionality. Existing migration SQL/checksums and database constraints remain
unchanged. API contract: [business-api.md](business-api.md).

## Delivered

- 21 authenticated merchant/channel/branch/destination routes using the existing
  versioned Express router, validation/error conventions and mysql2 pool.
- Merchant onboarding reuses tenant provisioning and invitation delivery rather
  than duplicating roles, hierarchy logic or token issuance. Channel assignment
  occurs at creation only and remains database-immutable.
- Scoped merchant profiles and name updates, computed business-setup status,
  branch CRUD/archive with IANA timezone validation and optimistic concurrency.
- Active channel catalog/published versions plus explicit platform-only catalog,
  draft editing and publication. Published content remains immutable under both
  service and existing trigger protection. Server generates fixed parallel-action
  labels and structured question labels; no configurable compliance switches.
- One canonical Google destination per branch; strict safe URL/ID association,
  explicit enable/disable and version conflicts. No outbound fetching or arbitrary
  redirects. Active public links block branch archive/destination disable.

## Security boundary and evidence

Each service operation reuses the tenant transaction guard, revalidates selected
membership/session/permissions and checks actual merchant ancestry. The SQL scope
CTE filters branch lookups before disclosure; subsequent statements bind merchant
and branch IDs. Merchant IDs are selectors, ownership always comes from stored
authorized rows. IDs remain strings. Suspended ancestors block business access,
including platform access to the merchant business surface; authorized account
status restoration remains available through tenant management.

Writes use parameterized statements, existing root/actor locks, lock-version CAS
where the schema supports it and atomic audit insertion. Tests inject an audit
failure and verify no branch survives rollback. Catalog/draft operations use the
same serialized write guard, without claiming optimistic version semantics for
tables that lack lock_version. Strict Zod allowlists reject tenant/role/channel
spoofing and unsupported privacy/compliance fields. Audit records contain fixed
safe metadata, not request bodies or raw Google destinations. Existing Bearer
authentication, explicit CORS and no-cookie design are preserved. A bounded
per-user write limiter uses the existing limiter implementation.

Structured-only clinic feedback and independent Google/private paths remain the
schema/service contract. This task adds no feedback fields and no public funnel UI;
browser visibility/independent usability tests belong to that future UI task.

## Actual tests

All commands executed from repository root. Every integration suite starts its
own newly initialized disposable MariaDB **11.8.9** Windows ZIP server on loopback,
using synthetic data and ephemeral credentials, never environment-file credentials.
`MARIADB_TEST_BIN` points only to the local server binary directory.

| Command | Passed | Failed / skipped |
| --- | ---: | --- |
| npm --prefix backend test | 18 | 0 / 0 |
| npm --prefix backend run test:business:integration | 11 | 0 / 0 |
| npm --prefix backend run test:tenants:integration | 12 | 0 / 0 |
| npm --prefix backend run test:auth:integration | 16 | 0 / 0 |
| npm --prefix backend run test:schema:integration | 10 | 0 / 0 |
| npm --prefix backend run test:migrations:integration | 8 | 0 / 0 |

Total: 75 passing tests (integration totals include their parent test). TypeScript
compilation passes in every command. New coverage includes all administrative
types/staff, peer/cross-merchant boundaries, onboarding delegate and invalid channel
assignment, retired channel refusal, suspended ancestor rejection, branch duplicate
codes and ownership, timezone validation, pagination, stale writes, canonical URL
negative cases, duplicate destinations, onboarding state transitions, immutable
published versions, platform-only catalog changes, active-link guards, safe audits
and rollback. Existing provisioning tests cover all five valid edges and all
forbidden hierarchy combinations. Existing auth/schema/migration regressions pass.

## Remaining limits and deployment gates

- No unresolved MariaDB 11.8.9 syntax/constraint issue found. Production engine
  behavior, existing data mappings, backup/restore and restricted effective grants
  remain separate verification gates. No production test or deployment is claimed.
- Google validation proves canonical URL syntax and matching place ID only; a
  trusted operator must verify the real listing. No OAuth/place ownership service.
- Merchant setup completion excludes subscriptions/entitlements, public funnel
  publication and QR assets. Branch quota admission/usage ledger integration is a
  future subscription service task; do not claim paid limits are enforced here.
- No SMTP verification is claimed. Production merchant invitations require the
  existing verified delivery adapter. Tests use an explicit local test adapter.
- Existing global write-lock serialization is conservative and may limit throughput;
  optimize only with equivalent authorization/suspension race tests. In-memory
  rate limits need a shared implementation before multi-instance guarantees.
- MFA remains unimplemented; existing platform MFA rollout restrictions remain.
  No administrator bootstrap credentials were seeded. No member demotion API was
  added; existing invitation/last-administrator protections are reused.
- No general draft list, branch restore/delete, channel-version retirement, short
  link management, billing, dashboard or feedback API was added in this task.

## Complete file inventory

| File | Change |
| --- | --- |
| ../src/business/service.ts | New business services, scoped transactions and audit writes |
| ../src/business/routes.ts | New 21 versioned authenticated routes and write limiter |
| ../src/business/validation.ts | New strict inputs, IANA timezone and canonical Google URL validation |
| ../src/tenants/service.ts | Export existing typed scope/context and wrappers for transaction, authorization and audit reuse |
| ../src/app.ts | Inject and mount business router |
| ../src/server.ts | Wire business service to existing auth/tenant instances |
| ../package.json | Explicit test:business:integration script |
| ../test/business.test.mjs | New timezone and destination unit tests |
| ../test/business.integration.mjs | New disposable MariaDB business API/rollback tests |
| business-api.md | New endpoint, validation and security contract |
| business-implementation-report.md | This report and complete inventory |
| database-architecture.md | Task 07 implementation/status note |
| auth-api.md | Current business API pointer; historical scope clarification |
| ../README.md | Current API documentation pointers and CORS/scope corrections |

No package dependency, lockfile, migration, secret file or frontend file changed.
