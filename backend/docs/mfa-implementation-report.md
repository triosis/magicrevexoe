# Task 16 MFA implementation and security verification

2026-11-05. Implemented and tested locally with actual Express, React and
disposable MariaDB **11.8.9**. No Hostinger connection, production migration,
production configuration/secret change or administrator credential seed occurred.
**Production readiness is not established.**

## Implemented behavior

Super Admin password authentication issues only a random five-minute MFA
challenge. Its SHA-256 digest is stored in auth_sessions; it is neither a JWT
nor a usable refresh credential. Normal authentication, tenant selection, refresh
and service transaction actors reject incomplete sessions. Existing password-only
platform sessions fail closed, including if a user gains a Super Admin membership
after login. Ordinary non-platform authentication remains compatible.

OTPAuth provides standard SHA-1 TOTP with a cryptographic 160-bit seed, six digits,
30-second steps and one step of clock tolerance. A pending secret must be verified
before activation. Enrollment is challenge/session-bound and expires in five
minutes. Previously accepted and older time steps cannot be reused across
sessions. QR generation uses the existing local qrcode library; no external QR
service receives secrets.

Secrets persist only as AES-256-GCM ciphertext, with a fresh random 96-bit nonce
and user-bound authenticated data. AUTH_MFA_KEY is an independent 32-byte key.
The enrollment QR necessarily transports the seed to the user's authenticator:
only the protected no-store PNG exposes it, never a raw seed/otpauth JSON field,
public URL, audit payload or log entry. Operators must protect enrollment screens
and backups as credentials. Encrypted pending secrets remain unusable after expiry.

Ten recovery codes are generated from 24 random bytes each. Only SHA-256 digests
persist; consumption is conditional and single-use inside the same transaction
as challenge revocation, session creation and safe audit writes. Regeneration
invalidates every earlier code. Codes are displayed once, held in browser memory
and excluded from sessionStorage. Loss of both authenticator and recovery codes
has no automatic bypass or shipped administrator reset endpoint.

Five failed factor/reauthentication attempts impose a fifteen-minute per-account
lock in MariaDB, surviving new challenges, processes and restarts. Attempts and
rejection audits commit before returning generic 401 errors; active lockouts
return 429. Existing bounded IP/login limits also apply. SQL locks serialize
concurrent verification and recovery consumption. No automatic retry was added.

Verified JWTs use amr=[pwd,mfa]; the matching DB session must also be verified.
The generic mfa method accurately covers TOTP or a recovery credential; audits
distinguish recovery use, including use during regeneration/disablement. Refresh
rotation preserves verified state and the seven-day absolute family lifetime.
Replay commits family revocation; logout revokes the family. Activation,
regeneration and disablement revoke every existing user session. Factor changes
require a current verified session, active platform role/permission, current
password and fresh factor. Disabling forces enrollment on the next Super Admin
login. Password reset revokes sessions without disabling MFA.

Production startup requires valid independent access and encryption keys.
Configuration rejects missing required keys, malformed base64, short/repetitive
keys and reuse of the same access/encryption key. This validation cannot prove
cryptographic generation or secure custody. Nonproduction may leave auth disabled;
missing MFA configuration never grants platform password-only access.

## Schema and transaction review

Three additive migrations, each with a verification file, follow the unchanged
000000-000063 prefix. 000064 adds user_mfa, 000065 adds mfa_recovery_codes, and
000066 adds mfa_verified/challenge_only to auth_sessions with fail-closed defaults.
The full local schema now has 67 versions and 26 tables. Existing constraints,
triggers, ownership relationships and tenant hierarchy are unchanged.

Factor transactions identify the challenge outside the transaction, then lock
the user first, revalidate the challenge/session/version, and lock factor state.
Membership and current permissions are checked for management. Factor changes,
session changes, code consumption and audit events share one connection/commit.
An injected signing failure proves rollback restores code availability and leaves
the challenge usable, without partial sessions or audits. Failed credentials are
not automatically retried. Rejected MFA and refresh-replay audit outcomes are
recorded as denied; submitted values never enter safe_metadata.

The actual browser exposed overlapping enrollment requests. A deterministic
concurrent enrollment test reproduced MariaDB ER_CHECKREAD, errno 1020, SQLSTATE
HY000, at the initial user_mfa locking read. A challenge lookup inside the
transaction established a repeatable-read snapshot before waiting for the user
lock; another transaction initialized factor state while that wait occurred.
Moving the hint lookup outside the transaction ensures the user lock precedes
snapshot reads. Initialization now uses a locking current read under that user
mutex. Repeated enrollment returns the same pending QR; no retry, isolation
relaxation or constraint change hides the failure.

Task 15's shared platform_slot point lookup, id/status projection and existing
transaction ordering are preserved. No feedback/quota service or trigger changed.
Concurrency regression evidence: four workers x 50 mixed-operation rounds,
300 duplicate pairs, 20 point-lock rounds, 508 feedback rows and 202 status events,
with matching audits/usage and **zero additional application deadlocks**. The one
intentional legacy negative-control deadlock remains expected and asserted.

## Validation

All results below are local, not provider/deployment evidence. Parent node:test
tests are included in counts; repeated runs are not counted as distinct tests.

| Command from repository root | Result |
| --- | --- |
| npm.cmd --prefix backend test | 27 passed |
| node --test backend/test/*integration.mjs | 122 passed across all eleven integration suites, including MFA and feedback concurrency |
| npm.cmd --prefix backend run test:mfa:integration | Dedicated MFA command also exercised; full final suite includes 12 MFA tests |
| npm.cmd test | 19 frontend tests passed |
| npm.cmd run test:browser | 8 browser fixture tests passed; separate from real-stack evidence |
| npm.cmd run test:e2e:real | 11 real React/Express/MariaDB tests passed; no local API mocks |
| npm.cmd run test:server | 1 production frontend server test passed |
| npm.cmd run typecheck / npm.cmd --prefix backend run typecheck | Passed |
| npm.cmd run build / npm.cmd --prefix backend run build | Passed |
| npm.cmd run lint | Passed with two pre-existing landing/demo warnings |
| git diff --check | Passed |

Total: **188 distinct passing tests**, no failures/skips in final validation.
Set MARIADB_TEST_BIN to the installed local ZIP distribution's bin directory;
the harness creates fresh random loopback instances and never reads production
environment files. Final logs are ignored local artifacts under .tmp-frontend;
feedback integrity evidence is .tmp-frontend/deadlock/result.json. The real-stack
suite scans the QR rendered in the browser, verifies MFA, acknowledges once-only
recovery codes and continues the complete business workflow on desktop/mobile.
Protected enrollment QR screenshots/codes are not saved as report artifacts.

MFA tests cover pending enrollment, concurrent initialization, invalid activation,
normal TOTP verification, step replay, incomplete-session rejection, forged-claim
rejection, concurrent challenge/recovery reuse, code hashing/regeneration,
persistent lockout, rotation/replay/logout, authorization and late role elevation,
password reset preserving MFA, secure disablement, expiry, missing encryption
configuration, rollback and secret-free audit consistency. Frontend tests cover
challenge memory-only handling, no premature session, failed verification and no
automatic retry. Existing invitation, tenant, business, feedback, subscription,
quota, schema and migration regressions all remain enabled.

## Remaining security findings and production gates

- C2 is implemented and tested locally; controlled initial enrollment, MFA key
  custody, accurate clocks and provider staging rollout remain unverified.
  Initial enrollment depends on the current password and secure delivery to the
  legitimate administrator. Existing accounts with historically exposed passwords
  require controlled credential remediation before first enrollment.
- Historical credential/secret rotation remains externally unverified. The
  [rotation runbook](secret-rotation-runbook.md) is a procedure, not execution
  evidence. There is one JWT signing key and no online MFA encryption keyring or
  reencrypt CLI. Encryption-key replacement requires reviewed offline maintenance
  tooling and matching backup/key recovery, not a blind environment edit.
- Backup/restore rehearsal, production schema baseline/migration executor,
  least-privilege grants/trigger definers, remote DB verified TLS, provider runtime,
  HTTPS/CORS/SMTP and incident operations retain their registered blockers.
- IP/login limiting is process-local. MFA account failure budgets persist in DB,
  but shared edge rate limiting, trusted proxy design and capacity testing remain.
- TOTP/recovery is not phishing-resistant authentication. Browser refresh tokens
  remain XSS-readable sessionStorage. No cookies or cookie-CSRF scheme is added;
  exact non-credentialed CORS and bearer authorization remain in place.
- Retention/cleanup of expired pending ciphertext, used codes, sessions and safe
  audit events needs the existing approved retention work. No destructive cleanup,
  full denial-event pipeline or durable SMTP outbox is claimed.
- Schema postconditions retain the existing limited metadata model; production
  drift/grant/body comparisons remain required. Passing tests is not independent
  penetration testing, legal compliance certification or production readiness.

See [production blockers](production-blockers.md) for owners and closure evidence.

## Complete Task 16 file inventory

| File | Change |
| --- | --- |
| [backend/.env.example](../.env.example) | Document independent environment keys without secret values |
| [backend/docs/auth-api.md](../docs/auth-api.md) | Current MFA endpoints and configuration contract |
| [backend/docs/auth-security-report.md](../docs/auth-security-report.md) | Locally implemented controls and operational limits |
| [backend/docs/mfa-implementation-report.md](../docs/mfa-implementation-report.md) | Current implementation, evidence, limitations and complete inventory |
| [backend/docs/production-blockers.md](../docs/production-blockers.md) | C2 local implementation versus unverified rollout gates |
| [backend/docs/production-readiness-report.md](../docs/production-readiness-report.md) | Current MFA status with unchanged NOT READY verdict |
| [backend/docs/secret-rotation-runbook.md](../docs/secret-rotation-runbook.md) | JWT/session invalidation and safe offline MFA-key rotation procedure |
| [backend/docs/security-audit-report.md](../docs/security-audit-report.md) | Task 16 local remediation update retaining historical findings |
| [backend/migrations/000064_create_user_mfa.sql](../migrations/000064_create_user_mfa.sql) | Additive MFA persistence/session migration |
| [backend/migrations/000064_create_user_mfa.verify.sql](../migrations/000064_create_user_mfa.verify.sql) | Postcondition for the matching additive MFA migration |
| [backend/migrations/000065_create_mfa_recovery_codes.sql](../migrations/000065_create_mfa_recovery_codes.sql) | Additive MFA persistence/session migration |
| [backend/migrations/000065_create_mfa_recovery_codes.verify.sql](../migrations/000065_create_mfa_recovery_codes.verify.sql) | Postcondition for the matching additive MFA migration |
| [backend/migrations/000066_auth_session_mfa.sql](../migrations/000066_auth_session_mfa.sql) | Additive MFA persistence/session migration |
| [backend/migrations/000066_auth_session_mfa.verify.sql](../migrations/000066_auth_session_mfa.verify.sql) | Postcondition for the matching additive MFA migration |
| [backend/package-lock.json](../package-lock.json) | Pinned dependency resolution for OTPAuth and cryptographic dependency |
| [backend/package.json](../package.json) | OTPAuth dependency and dedicated MFA integration command |
| [backend/src/auth/configuration.ts](../src/auth/configuration.ts) | Production required-key validation and independent encryption key injection |
| [backend/src/auth/mfa.ts](../src/auth/mfa.ts) | Encrypted factor state, TOTP, recovery hashes, persistent failure budget |
| [backend/src/auth/routes.ts](../src/auth/routes.ts) | Strict enrollment, activation, verification and factor-management endpoints |
| [backend/src/auth/service.ts](../src/auth/service.ts) | Restricted challenges, DB assurance, factor lifecycle, revocation and atomic audit |
| [backend/src/auth/tokens.ts](../src/auth/tokens.ts) | Validate password-only or verified MFA assurance claim shapes |
| [backend/src/tenants/service.ts](../src/tenants/service.ts) | Recheck DB MFA assurance at business transaction boundaries |
| [backend/test/auth.integration.mjs](../test/auth.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/auth.test.mjs](../test/auth.test.mjs) | Missing, weak, repeated and shared-key configuration rejection |
| [backend/test/business.integration.mjs](../test/business.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/feedback-concurrency.integration.mjs](../test/feedback-concurrency.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/feedback.integration.mjs](../test/feedback.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/funnels.integration.mjs](../test/funnels.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/mfa-fixtures.mjs](../test/mfa-fixtures.mjs) | Real test authenticator that scans QR and consumes real recovery codes |
| [backend/test/mfa.integration.mjs](../test/mfa.integration.mjs) | Dedicated factor, concurrency, revocation, authorization and rollback tests |
| [backend/test/quotas.integration.mjs](../test/quotas.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/schema.integration.mjs](../test/schema.integration.mjs) | Expect the two additive factor tables in the complete schema |
| [backend/test/subscriptions.integration.mjs](../test/subscriptions.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [backend/test/tenants.integration.mjs](../test/tenants.integration.mjs) | Preserve existing regression behavior using actual MFA-capable test authentication |
| [scripts/e2e-real.mjs](../../scripts/e2e-real.mjs) | Scan rendered protected QR, verify MFA and acknowledge recovery codes before business workflow |
| [src/application/api.ts](../../src/application/api.ts) | Memory-only challenge state and verified-session establishment |
| [src/application/auth.tsx](../../src/application/auth.tsx) | Authenticator enrollment/challenge UI and once-only recovery code display |
| [test/frontend/api.test.ts](../../test/frontend/api.test.ts) | No premature credentials, memory-only factors and failed-verification behavior |

38 files across Task 16, including changes already committed during the session.
