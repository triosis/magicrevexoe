# Task 05 authentication and authorization security report

## Task 16 security update (2026-11-05)

Historical MFA-absent statements below are superseded by the implemented controls
in [mfa-implementation-report.md](mfa-implementation-report.md). Super Admin
password login now issues only a five-minute challenge. Middleware, refresh,
tenant selection and transaction actor validation reject unverified platform
sessions, including after role elevation. Verified state is checked in MariaDB,
not trusted from a JWT claim alone. Active role/permissions are revalidated for
factor management. Non-platform login remains compatible.

Secrets are AES-256-GCM encrypted with user-bound AAD and an independent required
production key. Raw enrollment data reaches only the protected QR image;
one-time recovery codes are shown once, stored as high-entropy digests, and never
logged. Persistent attempt caps, replayed-step rejection and atomic recovery
consumption protect factor verification. Password reset preserves enabled MFA.
Activation, disablement and regeneration revoke all existing user sessions.
No automatic MFA bypass or new transaction retries exist. Task 15's platform
point-lock ordering remains unchanged and is regression-tested.

Production key custody/rotation, supervised initial enrollment, administrator
identity recovery policy, reliable clock synchronization, HTTPS/CORS/provider
configuration and shared edge throttling still need operator validation.
TOTP is not phishing resistant; this is not a WebAuthn claim. Refresh storage
remains XSS-readable sessionStorage. No cookies are introduced; no cookie-CSRF
protection is claimed. SMTP delivery remains externally unverified.


Task 06 update: the historical invitation/provisioning API gap below is now
addressed by tenants-api.md and tenants-security-report.md. Transaction-aware
authorization helpers and verified invitation delivery reuse this foundation.
MFA, frontend and production deployment limitations remain. Task 05 test counts
below are historical; Task 06 records the current complete regression run.

Implemented/tested locally, 2026-11-04. No Hostinger connection, production
migration, credentials/configuration change, administrator seed or frontend change.

## Delivered controls

- Eight versioned authentication endpoints, Zod strict-body validation, generic
  responses and no-store headers. Existing health checks remain independent.
- Established node-argon2 Argon2id with random per-password salts, 19 MiB memory,
  two iterations and parallelism one. Hash/verify actually exercised on Node 24.
- jose HS256 access tokens with fixed algorithm/type/issuer/audience, five-minute
  expiry, iat/jti checks, string IDs and password-only assurance. Every access
  request validates current database status, session and authentication versions.
- Random 256-bit opaque refresh/reset/invitation credentials; only digests stored
  in MariaDB. No plaintext password, raw bearer or raw recovery token is stored
  in application tables or audit events. Tokens necessarily reach the client or
  recovery recipient; logs do not print them.
- Refresh rotation with per-user serialization and retained revoked predecessors.
  Replay commits family revocation before failing. Seven-day absolute family
  lifetime, logout revocation and user-wide reset/version revocation.
- Atomic, expiring, purpose-bound single-use reset/invitation consumption. Existing
  active users must prove their current password when accepting another invitation;
  invitation tokens cannot overwrite their global password.
- Actual ancestry and role/permission checks; every selected membership reloaded
  from DB. Direct platform/reseller merchants supported without invented ancestors.
- Explicit platform path; generic tenant paths deny platform authority. Subtree,
  merchant ownership, role-kind, role-code and permission-subset assignment guards.
- State-changing authentication operations and identity-scoped audit insertions
  share transactions. Audit payloads contain no submitted values or tokens.
- CORS remains exact-origin and non-credentialed, now permits POST/Authorization.
  Authentication cookies are not used, so no cookie-CSRF mechanism is claimed.
- Bounded process-local rate limiting and fixed public errors. SMTP adapter requires
  TLS/certificate validation; no credentials in source, no provider debug output.

## Schema change and compatibility

000063_auth_session_version.sql adds auth_sessions.auth_version INT UNSIGNED NOT
NULL DEFAULT 0; matching .verify.sql checks its definition. Existing pre-auth
rows remain intact but cannot authenticate; new login rows snapshot user version.
This prevents a still-stored refresh token obtaining a new access token after an
independent user auth_version increment. Existing schema/ledger/trigger files
and constraints were not edited. All versions applied to disposable MariaDB only.

## Test evidence

All commands compiled TypeScript successfully:

| Command | Passed | Coverage |
| --- | --- | --- |
| npm --prefix backend test | 16 | Existing foundation/runner tests plus Argon2id, JWT claims/signatures/expiry, bounded limiting, safe configuration errors |
| npm --prefix backend run test:auth:integration | 16 (15 scenarios + parent) | Real MariaDB and HTTP auth/authorization |
| npm --prefix backend run test:schema:integration | 10 (9 scenarios + parent) | Existing full Phase 1 constraints, seeds and migration checksums |
| npm --prefix backend run test:migrations:integration | 8 (7 scenarios + parent) | Existing migration locking, failure and recovery behavior |

No failed or skipped tests. Integration harness initializes fresh local MariaDB
11.8.9 with a random password and loopback port; no external database settings
are accepted. All fixture accounts, including Super Admin, are synthetic test
data with random test passwords, not production bootstrap credentials.

Authentication integration scenarios:

1. Login, own profile, tenant selection, no cookies, no-store and strict input.
2. Identical invalid-account/password/locked/disabled/unverified errors.
3. Refresh rotation, digest persistence, predecessor access revocation and replay.
4. Concurrent refresh replay revokes the winning family too.
5. Logout, account disable and authentication-version invalidation of access/refresh.
6. Generic recovery, digest-only storage, single use and old-session revocation.
7. Invitation activation/reuse and prevention of existing-user password takeover.
8. Unauthorized membership selection and post-selection membership revocation.
9. Permission changes reflected without relying on JWT role claims.
10. Expired refresh/reset credentials and simultaneous single-use reset race.
11. Suspended ancestor blocks both selection and existing selected tokens.
12. Direct merchant ancestry, peer reseller and cross-merchant rejection.
13. Sub-reseller/merchant provisioning escalation and unauthorized role grants.
14. Explicit selected Super Admin scope and middleware/merchant resource boundaries.
15. Unknown-origin CORS rejection and forwarding-header-resistant login limiting.

SMTP integration uses a memory-only delivery adapter; no external email was sent.
Unit tests exercise delivery configuration validation, not a live provider/TLS chain.

## Files created

- src/auth/database.ts — typed parameterized queries and single-connection transactions.
- src/auth/passwords.ts — Argon2id hashing/verification and unknown-user dummy work.
- src/auth/tokens.ts — jose access tokens, random opaque tokens and SHA-256 digests.
- src/auth/authorization.ts — memberships, ancestry, permission and role/provision guards, middleware.
- src/auth/service.ts — account/session/recovery transactions and safe audit events.
- src/auth/routes.ts — versioned endpoints, validation and bounded rate limiter.
- src/auth/configuration.ts — signing-key validation and optional verified-TLS SMTP.
- migrations/000063_auth_session_version.sql and its .verify.sql — additive version snapshot.
- test/auth.test.mjs and test/auth.integration.mjs — unit and disposable DB/HTTP tests.
- docs/auth-api.md and docs/auth-security-report.md — API/operations/security documentation.

## Files modified

- package.json / package-lock.json — argon2, jose, nodemailer, Nodemailer types;
  explicit test:auth:integration command. No frontend dependencies changed.
- src/app.ts — optional injected auth service, route mount and explicit CORS changes.
- src/server.ts — constructs configured auth service using the existing DB pool.
- README.md — authentication documentation and current scope.
- docs/database-architecture.md — Task 05 status note.
- docs/migration-guide.md — additive migration/rollout note.
- docs/database-compatibility-checklist.md — local authentication evidence update.

## Explicit limits and production gates

1. **MFA is not implemented or enforced.** JWT assurance is only pwd. Platform
   authorization is implemented, but MFA must be implemented/enforced before
   launching production Super Admin access. No client assertion can elevate amr.
2. Production has not been migrated/configured/tested. Require reviewed application
   and migration grants, backup/restore, native Argon2 Linux deployment support,
   operator-managed random signing secret, HTTPS and actual Hostinger proxy review.
3. Process-local rate limits are bounded and tested, but are not distributed and
   reset on restart. A shared gateway/store and reviewed trusted-proxy settings
   are required before multi-instance/public deployment at scale. Disabled trust
   proxy is safe against spoofing but may aggregate clients behind one proxy IP.
4. SMTP delivery is implemented but not externally verified. No configuration
   returns generic 503 for recovery. Configured delivery is best-effort/in-process,
   outside the DB transaction, with no durable retry queue. HTTP 202 does not
   promise delivery. A recovery frontend and reliability policy remain future work.
5. Invitation issuance/provisioning, public signup, email verification issuance,
   administrator bootstrap, role mutation APIs and business repositories were not
   requested/exposed. Guard functions prepare for them but do not mutate grants.
6. Middleware checks do not replace SQL tenant predicates or transactional checks
   in future writes. No dashboard/business CRUD was implemented. Future services
   must lock/recheck ancestor state and include immutable audit events atomically.
7. One configured signing key is supported; rotation invalidates existing access
   tokens. Token digests are high entropy; no raw refresh-token recovery is possible.
   Concurrent refresh is strict replay, intentionally without a grace window.
8. Browser persistent token storage, cookie refresh transport and cookie-CSRF design
   are not implemented. Future frontend integration must address XSS/storage and
   recovery-fragment handling before enabling production user flows.

## Library references

- [node-argon2](https://github.com/ranisalt/node-argon2)
- [jose JWT validation](https://github.com/panva/jose)
- [Nodemailer SMTP/TLS options](https://nodemailer.com/smtp)

These are library references, not claims of external penetration testing or
production verification. Stop point: authentication/authorization foundation only.
