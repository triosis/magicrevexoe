# Authentication API v1

## Task 16 current MFA contract (2026-11-05)

This section supersedes historical password-only/MFA-absent statements below.
Apply additive migrations 000064?000066 only through an authorized release process;
this implementation ran them only against disposable local MariaDB 11.8.9.
Production startup now requires AUTH_ACCESS_SECRET (32?128 random bytes, canonical
base64) and independent AUTH_MFA_KEY (exactly 32 random bytes, canonical base64).
Malformed, repetitive, equal or missing required secrets fail with safe errors.
Development without MFA encryption configuration fails Super Admin login closed.

An identity with an active platform super_admin membership receives from POST
/login only {mfaRequired:true, challengeToken, enrollmentRequired}. The opaque
challenge is hashed in auth_sessions, expires in five minutes, cannot refresh,
and cannot authenticate any ordinary/privileged endpoint. No access or refresh
credential is issued until factor verification. Role elevation also invalidates
password-only access and refresh paths. Non-platform identities retain their
existing password flow. GET /me now returns mfaImplemented=true and session amr;
verified sessions use [pwd,mfa], covering TOTP or recovery possession.

All paths below are relative to /api/v1/auth; bodies reject unknown properties.

| Method/path | Body/authentication | Result |
| --- | --- | --- |
| POST /mfa/enrollment | challengeToken from password login | Private PNG QR; pending enrollment only; repeat requests for the same live challenge return the same QR |
| POST /mfa/activate | challengeToken, code (six decimal digits) | Verify pending TOTP, enable MFA, revoke prior sessions, issue verified token pair and ten once-shown recoveryCodes |
| POST /mfa/verify | challengeToken, code (six digits or 32-character recovery code) | Consume factor/challenge atomically; issue verified token pair |
| POST /mfa/recovery-codes | Verified Bearer, current password, code | Fresh possession proof, invalidate prior recovery codes, return ten replacements, revoke all sessions; sign in again |
| POST /mfa/disable | Verified Bearer, current password, code | Current platform role/permission required; invalidate factors/codes/sessions; next Super Admin login must enroll again |

TOTP: OTPAuth, SHA-1, six digits, 30 seconds, ?1 step for clock drift; globally
reject a previously accepted or older step. Recovery codes carry 192 random bits
and only SHA-256 hashes persist. Codes are case-sensitive, single-use, one display.
There is no unauthenticated administrative reset or recovery bypass. Password
reset never disables MFA. Lost factors AND recovery codes require a separately
approved operator identity-recovery procedure; no such bypass is implemented.

The enrollment QR necessarily carries the shared secret for the authenticator.
It is delivered only as a no-store PNG over the password-authenticated challenge,
never as raw seed/otpauth JSON, public URL, external QR service or log entry.
Treat QR/screenshots as credentials; serve only through HTTPS and trusted UI.
The React client keeps challenges and recovery codes in memory, displays the QR
and once-only codes, and stores refresh credentials only after successful MFA.

Invalid factors return generic 401; five failed attempts lock MFA for fifteen
minutes in MariaDB across processes/restarts/new challenges. Failed-attempt audit
and lockout updates commit before returning 401. Existing bounded IP/login limits
also apply. 429 indicates lockout/throttling; 503 indicates unavailable key/service.
Enrollment, activation, verification, recovery use/regeneration and disablement
have atomic safe audit events. Refresh retains verified MFA state and strict
family replay revocation. Seven-day absolute session lifetime remains unchanged.

See [MFA implementation evidence](mfa-implementation-report.md) and
[secret rotation runbook](secret-rotation-runbook.md). Production is not certified.


Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Task 07 adds merchant, channel, branch and destination APIs documented in
[business-api.md](business-api.md). Historical Task 05 statements below about
absent business endpoints describe that earlier task, not the current API.

Task 06 now implements invitation issuance and account provisioning in
[tenants-api.md](tenants-api.md). The Task 05 scope notes below are historical:
those tenant endpoints reuse accept-invitation and the same hashed-token schema.
SMTP verification is required before tenant invitation writes, and CORS also
permits PATCH. No bootstrap, member-demotion API or MFA was added.

Task 05 implementation, 2026-11-04. API prefix: /api/v1/auth. No frontend or
production configuration/deployment was changed. No business CRUD endpoints exist.

## Transport and configuration

JSON requests and responses; authentication uses `Authorization: Bearer <accessToken>`.
There are **no authentication cookies**, no implicit browser credentials and no
cookie fallback. CORS uses the existing exact CORS_ORIGINS allowlist, now permits
POST and Authorization, and keeps credentials=false. Unknown origins receive 403.
Cookies alone never authenticate. HTTPS is required at the public deployment edge.

Access and refresh tokens are returned only to the client, with Cache-Control:
no-store and Pragma: no-cache. Never put them in URLs, logs or browser localStorage.
The future web client must make a deliberate secure storage design; no dashboard
or persistence mechanism was added here. Introducing HttpOnly refresh cookies
later requires explicit CSRF protection, SameSite and credentialed CORS design.

Server activation requires AUTH_ACCESS_SECRET containing canonical base64 encoding
of at least 32 cryptographically random bytes (maximum 128). It has no default.
If absent, auth routes return 503 while existing health checks remain functional.
Malformed supplied configuration fails startup with a fixed safe error. The
signing key is supplied by the operator; none was generated/committed for production.
Issuer and audience are fixed to magicreview-api and magicreview-client. Access
tokens expire after five minutes. Refresh families expire seven days after login;
rotation preserves the original absolute expiry and does not slide it forward.

Apply the reviewed schema including additive migration 000063 before enabling
authentication on an authorized target. That migration adds the session's
authentication-version snapshot, default 0. Existing pre-auth sessions cannot
authenticate or refresh and require a new login. Original migrations are unchanged.
This task applied migrations only to disposable local MariaDB, never Hostinger.

## Endpoints

Request examples describe field names/types, not real tokens or credentials.
Unknown request fields are rejected on login, refresh, tenant selection, recovery,
reset and invitation endpoints. IDs are decimal **strings**, never JS numbers.

| Method / path | JSON request | Success |
| --- | --- | --- |
| POST /login | email, password | 200: accessToken, refreshToken, tokenType=Bearer, expiresIn=300 |
| POST /refresh | refreshToken | 200: rotated accessToken/refreshToken pair |
| POST /logout | empty object; Bearer required | 204; revokes current refresh family and its access tokens |
| POST /select-tenant | membershipId; Bearer required | 200: new accessToken, tokenType, expiresIn and server-derived membership |
| GET /me | Bearer required | 200: own user profile, active authorized memberships, selectedMembership or null, amr and mfaImplemented=false |
| POST /forgot-password | email | 202: same generic message for eligible/ineligible/unknown accounts when delivery is configured |
| POST /reset-password | token, password | 204; consumes reset token and revokes all user sessions |
| POST /accept-invitation | token, password | 204; consumes invite token and activates the bound invited membership |

All paths in the table are relative to /api/v1/auth. New/reset passwords are
12–128 characters and are never trimmed or case-normalized. Login accepts existing
passwords up to 128 characters. Email is trimmed and lowercased as the consistent
identity-key policy; provider-specific dot/plus equivalence is not applied.

Login requires active user status, a password hash and verified email. Locked,
disabled, unverified, nonexistent accounts and wrong passwords receive the same
401 `Invalid credentials` body. Wrong/expired/reused recovery or refresh tokens
also use generic credential errors. Invalid access tokens use 401
`Authentication required`; denied memberships/scopes use 403 `Access denied`.
Bad bodies use 400 `Invalid request`; limits use 429 with Retry-After; configuration
availability failures use 503. Raw database/JWT/SMTP errors and submitted values
are not included in public messages.

## Session and membership flow

1. Login authenticates a global identity, not a tenant. Store neither raw refresh
   token nor password on the server; session rows contain SHA-256 token digests.
2. GET /me lists only that identity's current active memberships whose real tenant
   ancestry is active. It returns no other user's profile.
3. Select a listed membershipId. This is a selector, not authority: the server
   queries its user ownership, status, tenant kind, actual ancestors, role and
   permissions. Client tenant_id, role_id, permissions or is_admin are never trusted.
4. Each selected access token carries only a membership ID, not cached permissions.
   Authentication reloads current session, account/version, membership, role,
   permissions and ancestry on every request. Role revocation/change takes effect
   without waiting for access-token expiry.
5. Refresh rotates to a new session-row ID and an **unselected** access token; select
   an authorized membership again. The previous access token becomes invalid.
6. Replay of any revoked refresh token commits revocation of its whole family
   before returning 401. Clients must serialize refresh requests: simultaneous
   refresh is deliberately treated as replay and revokes the winning rotation too.
7. Logout revokes the current family. Password reset/first invitation activation
   increments auth_version and revokes all user sessions. Changing auth_version
   independently also prevents both existing access and refresh authentication.

## Recovery and invitations

Reset tokens are random 256-bit opaque values, expire in 30 minutes, are bound to
one user/purpose and are stored only as SHA-256 digests. Requesting a new reset
consumes earlier unconsumed reset tokens. Consumption locks the user then the
token, verifies expiry/purpose/state, updates the password, consumes tokens and
revokes sessions in one transaction. No automatic login occurs after reset.
Locked/disabled/invited accounts are not reset/unlocked by forgot-password.

An invitation must already have been issued by a trusted, authorized provisioning
workflow with the correct invited membership and hashed token. No public invite
minting, user provisioning, administrator bootstrap or role-assignment mutation
endpoint is exposed in this task. Invitation acceptance checks active ancestry
and the exact bound invited membership. For a new invited identity it sets the
Argon2id password and verifies email; for an already-active identity, password
must verify the EXISTING global password and cannot overwrite it. This prevents
an invitation issuer taking over an existing identity through a new password.

Reset email delivery can use the included Nodemailer adapter. Configure ALL:
AUTH_SMTP_HOST, AUTH_SMTP_PORT (465 or 587), AUTH_SMTP_USER,
AUTH_SMTP_PASSWORD, AUTH_MAIL_FROM and AUTH_RECOVERY_URL. The recovery URL must
be HTTPS without credentials/query/fragment. SMTP uses implicit TLS on 465 or
mandatory STARTTLS on 587, verified certificates, bounded timeouts, no debug logs.
No production values were supplied or modified in this task.

Without delivery configuration, forgot-password returns uniform 503. When enabled,
the generic 202 does not disclose account eligibility or claim mail delivery.
Delivery starts after token commit and is not awaited by the HTTP response, to
avoid exposing SMTP latency as an email-existence signal. Provider failures log
only a fixed safe message. Delivery is currently best-effort/in-process, without
a durable retry queue; process death can lose mail. A resend creates a new token.

Recovery links put the raw single-use token in the URL fragment, not its query.
The future recovery page must read/remove the fragment promptly, avoid third-party
scripts/referrer leakage and POST the token in JSON. That page is not implemented.
SMTP transport is implemented but external SMTP delivery was not performed or
verified; disposable integration tests inject a memory-only delivery adapter.

## Authorization integration for later APIs

Use AuthService.authentication() first. activeMembership() requires a validated
selected membership; requirePermission(code) checks server-loaded permissions and
rejects platform scope. tenantAccess(authorization, targetSelector, permission,
merchantOnly) validates the target's actual ancestry, with merchantOnly=true for
merchant-owned resources. Repositories MUST include authorizedTenantId in SQL.

Super Admin must select its platform membership and pass platformOnly() or
Authorization.platformTarget(). Generic tenant permission/resource paths reject
platform scope. The platform path is explicit; it does not arise from an absent
tenant filter. Future platform mutations must include transactional audit insertion.

Authorization.provision() and assignRole() are guard methods, not provisioning
or grant APIs. They enforce valid edges, actual subtree, typed role compatibility,
allowed role-code matrix and, for non-platform actors, the permission-subset rule.
Sub-resellers cannot create peers, merchants cannot create tenants, resellers
cannot manage peer resellers or platform-direct merchants, and sub-resellers
cannot manage merchants directly under their reseller parent. Tenant transfers
and peer admin invitations remain outside MVP. Future writes must recheck/lock
these conditions within their own transaction; middleware alone is not atomic DML.

MFA is **not implemented**. The verified access-token assurance is only amr=[pwd];
clients cannot assert MFA. Platform access currently uses password authentication
and explicit platform authorization. Implement and enforce MFA before a production
Super Admin launch; a flag or response label is not an MFA implementation.

## Limits and verification

Bounded in-process limiter: 60 auth requests per source IP per 15 minutes; login
also 20 per source IP and 10 per normalized email, recovery 5 per email.
Counters store hashed keys, prune expired entries and fail closed at capacity.
X-Forwarded-For is untrusted because trust proxy remains disabled. Hostinger proxy
topology needs explicit operator review: multiple clients behind its proxy may
share a limit. Use a reviewed trusted-proxy and shared limiter/gateway design
before multi-instance deployment; process-local counters reset on restart.

Run npm --prefix backend test and npm --prefix backend run test:auth:integration.
The integration suite uses only its own disposable MariaDB 11.8.9 child process.
See [auth-security-report.md](auth-security-report.md) for evidence and remaining gates.
