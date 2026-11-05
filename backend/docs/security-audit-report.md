# Task 14 security audit

2026-11-05. Verdict: **NOT READY — CRITICAL BLOCKERS**.
Scope is repository review, public primary documentation, dependency-advisory queries
and disposable local tests. No production system/secret was inspected. Finding IDs,
severity, classification and closure criteria are in [production-blockers.md](production-blockers.md).

## Implemented controls and evidence

| Control | Classification | Audit conclusion / source |
| --- | --- | --- |
| JWT | Locally tested only | auth/tokens.ts restricts HS256/type/issuer/audience, required claims and five-minute age; string uint64 IDs. No client role/permission trust. Signing-key entropy depends on operator randomness, not merely valid base64. |
| Passwords | Locally tested only | auth/passwords.ts Argon2id 19 MiB, t=2, p=1, random salts and dummy work; wrong/null/malformed hashes tested. Provider native build and cost/capacity benchmark remain unverified. |
| Session lifecycle | Locally tested only | Random 256-bit opaque refresh digests; seven-day absolute family, rotation, durable family replay revocation, logout/auth_version reset. No sliding refresh grace or key ring. Retained predecessor rows support replay detection and need a retention policy. |
| Recovery/invitations | Locally tested only | Purpose/expiry/hashed token, one-use transaction, fragment consumption, existing-user password verification, token rollback on quota rejection. Recovery delivery generic; mail outage/outbox gap remains. |
| Membership/RBAC | Locally tested only | authorization.ts and TenantService revalidate membership, permission, active ancestors and actual edges; explicit platform path, role-kind and permission-subset checks; scoped predicates/composite FKs tested. No application RLS claim. |
| Revocation | Locally tested only | Current database session/user/version checked, rotation invalidates predecessor access. Existing role/account changes rechecked per request and inside business transactions. |
| Injection | Locally tested only | Prepared values, strict fields/IDs/cursors, fixed source SQL fragments; no client SQL/sort expression. Migration identifiers/files are trusted source only. This is not an exhaustive external injection assessment. |
| Sensitive data | Verified | Safe fixed errors and metadata allowlists; no request-body/token/feedback logging in inspected code. Anonymous quota values redacted. Provider/CDN/mail/access/error logging remains externally unverified. |
| CORS/CSRF | Locally tested only | Exact allowlist, Authorization/JSON, credentials=false, no cookie auth or ambient auth fallback. Cookie-CSRF protection is not needed for current bearer transport; any cookie change requires a new design. CORS is not authorization. |
| XSS/storage | Verified | React text rendering, no arbitrary channel HTML/JS fields; access token memory, refresh in sessionStorage. Session storage is script-readable, not equivalent to HttpOnly. CSP is broad for HTTPS connections/inline styles (M1). |
| Public abuse | Locally tested only | Opaque 128-bit link codes, strict signed version/expiry form tokens, structured fields, per-form idempotency, bounded process-local limits. No unique-human/bot-proof guarantee; restarts/replicas/proxies require shared edge controls. |
| Audit integrity | Locally tested only | Resource success + audit is transactional; immutable triggers reject updates. Owner/DBA can bypass local controls. Provider table grants/definers/export/monitoring are unverified; denied events are not comprehensively recorded. |
| Dependencies | Verified | Successful npm advisory queries returned zero known reported vulnerabilities for both lockfiles on audit date. This does not cover unknown vulnerabilities, runtime patch status or all supply-chain risks. |

## Critical secret-rotation gate (C1)

**Externally unverified; launch blocked.** The instruction references historical
credential/JWT exposure. No operator rotation/revocation evidence was supplied, so
rotation cannot truthfully be confirmed. Tracking only example env files and finding
no relevant named-file history is not proof that a secret was never exposed or that
an old credential is disabled. Actual ignored/production env files were not read.

Security/operator must privately record: affected secret classes/accounts, exposure
window, rotation timestamp/owner, provider revocation confirmation, new deployment
secret-version identifiers and evidence that old credentials no longer work. Do not
include values or reusable hashes in these reports. Rotate database/SMTP credentials
and any other exposed credential class; remove obsolete provider/repository access.
Generate a fresh independent AUTH_ACCESS_SECRET (at least 32 random bytes, canonical
base64). All API replicas must switch together; current code has no multi-key rollout.
The change invalidates old JWTs and pending signed feedback forms. Refresh digests
are independent of the JWT key: key rotation alone does **not** revoke refresh
families. Use a separately reviewed operator procedure to revoke sessions/advance
authentication versions and consume exposed reset/invite credentials as appropriate.
Preserve incident evidence and communicate required re-login/resends. Old-key/token
rejection and new-key operation must be demonstrated in isolated staging; actual
provider revocation needs separately authorized evidence, not this audit's access.

## Reliability findings affecting security/availability

- **H1 / Locally tested only:** concurrent feedback duplicate test deadlocked at
  funnels/service.ts publicRecord root FOR UPDATE. auth/database.ts transaction
  rolls back but does not retry; withPublicFunnel has no retry wrapper. TenantService
  has separate bounded deadlock retries, which do not cover public submission.
  Isolated recheck passed; original failure remains open. No quota overrun or data
  corruption was observed. Diagnose actual wait graph before asserting root cause.
- **H2 / Not implemented:** pool.ts has no SSL/CA/hostname-verification option.
  Prove approved local topology or implement verified TLS before remote DB use.
- **H4–H6 / Not implemented or Verified as registered:** process-local throttles,
  broad root lock contention, no full query/lock budgets, mail outbox/alerts, and
  synchronous audit-on-public-read growth are public availability risks.
- **H8 / Verified:** migration history checks and SELECT 1 are not complete schema
  drift checks. Trigger bodies/definers and effective grants require independent
  comparison; runtime account must not inherit schema-wide bypass privileges.

## Quota and compliance

**Locally tested only:** all five consumption points are protected in services;
no alternate existing metered API bypass was found. Merchant creation is unmetered;
admin acceptance consumes staff_seats only after configured subscription. Pending
invitations do not reserve capacity. Finite/unlimited/missing/inactive behavior,
concurrent boundary and rollback tests pass. Net gauge deltas are observations,
not a historical lifecycle guarantee. Privileged direct SQL remains outside locks.

Google/private actions remain independent before rating and after private quota
failure. No review gating or Clinic narrative/contact/medical fields were found in
supported feedback inputs. Syntax validation cannot verify listing ownership;
provider logs and arbitrary operator business labels still require privacy controls.
No assertion is made that unknown production data contains no medical information.
Retention, clinic-context risk, legal basis, notices and merchant solicitation policy
need product/privacy approval; see H7. These are not legal-compliance certification.

Exact tests (including initial failure), complete five-file inventory and release
verdict: [production-readiness-report.md](production-readiness-report.md).
No security control or runtime behavior was modified by this audit.
