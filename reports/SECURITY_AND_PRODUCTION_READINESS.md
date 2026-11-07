# Security and production readiness

2026-11-07. Source/local-test audit, not a production inspection or certification.
No production endpoint or secret file was read. No security control was changed.

## Immediate security finding

**P0 key exposure:** the latest IDE selection supplied a candidate MFA encryption
key in chat. Its value is deliberately omitted from all reports. Treat that
candidate as exposed and do not install it. The audit cannot establish which
private file it came from, whether it equals the earlier generated key, or whether
it has been installed. The owner must establish use status privately. If never
used, securely generate a fresh independent candidate under separate authorization;
if used with encrypted records, follow controlled migration/re-encryption/incident
response, not blind replacement. Preserve existing AUTH_ACCESS_SECRET. Comparison
with that actual production signing key is still pending; it is only in hPanel.
The operator's empty-schema report is not an authorization to change credentials.

## Verified local controls and limits

| Area | Repository evidence | Audit limit / residual risk |
| --- | --- | --- |
| Tenant isolation | Authorization.ancestors/membership/tenant/provision and TenantService.withActor revalidate status/permissions; composite ownership keys; peer and concurrent tests | Runtime DB account can SELECT shared tables; MariaDB does not enforce per-tenant SELECT RLS. A future unscoped query can leak data. |
| RBAC | Fixed seeded roles/permissions, explicit membership selection and platform path; caller-supplied IDs not authority | No arbitrary custom roles/branch manager completion; route/service additions need negative tests. |
| Password/login | Argon2id, generic auth failures, bounded attempts, persistent MFA failure state | Original passwordless policy remains unresolved; MFA is mandatory for Super Admin, not all tenant users. |
| JWT/sessions | HS256 issuer/audience/type/expiry verification, five-minute access tokens, opaque hashed refresh, rotation/replay/logout/credential-version checks | No multi-key rollover; browser sessionStorage refresh token is exposed to successful same-origin XSS. |
| MFA | AES-256-GCM 32-byte independent key, random 12-byte nonce and user-bound AAD, challenge restrictions/TOTP replay prevention/hashed single-use recovery | Wrong/lost key makes factors unreadable; no shipped keyring/reencryption CLI. Exposed candidate must be resolved. |
| SQL injection/transactions | execute-bound values, bounded IDs/enums and explicit transactions/row locks/rollback; multipleStatements false | Source review and tests are not a pentest or proof of every dynamic SQL path. |
| XSS | React escaping, bounded plain AI text, PNG validation, no arbitrary HTML report renderer, Helmet | No independent DOM-XSS/third-party script assessment; do not regard keyword filters as complete AI safety. |
| CSRF/CORS | Bearer auth rather than ambient auth cookies, no credentialed CORS, exact allowed origins | CORS is not authorization; future OAuth needs state/PKCE/callback protections, not currently delivered. |
| Public abuse | Signed short-lived funnel revision tokens, strict structured input/idempotency, route/process limits and transactional quota admission | IP mapping/proxy trust not verified; limits are process-local, not Redis/distributed protection. No CAPTCHA/abuse classifier certification. |
| Audit | Transactional allowlisted admin metadata, append-only triggers/history, rollback tests | Not every external scan/post is observed, no full audit search/export UI, retention policies unresolved. |
| Review safety | Google-only canonical URL, persistent independent options at all ratings, structured clinic feedback, no medical details/contact narrative | Does not guarantee external review-platform acceptance, future policy compliance or model factual/language safety. |
| Legal/privacy | Anonymous bounded inputs minimize data | No approved ToS/DPA/privacy/retention/erasure policy or completed acceptance/deletion workflow. No GDPR/DPDP compliance certification. |
| Recovery | Encrypted backup tooling/local restore, manifest/FK/trigger/row-count checks, wrong-key/tamper/interruption regressions | Offsite custody, actual production restore and recovery objectives remain unverified. |

## Database transport and deployment gate

Production default is verified TLS with approved CA file-byte SHA-256, DNS DB_HOST,
rejectUnauthorized=true, verifyIdentity=true and TLS1.2 minimum. IP SANs do not
enable this policy's required mode; it explicitly requires DNS because of the
mysql2 identity-check behavior. No automatic plaintext retry exists.

The original SOW M11.3 names TLS1.3 in transit; the verified implementation enforces
a TLS1.2 minimum, which can negotiate TLS1.3 but does not require it. Treat this as
an explicit security acceptance difference, not proof the original minimum is met.
HOSTINGER_LOCAL is a larger deliberate exception with no database TLS at all.

HOSTINGER_LOCAL is an explicitly selected unencrypted exception only at
127.0.0.1:3306, with exact acknowledgement, valid reference, production security
profile and both CA variables absent. Authentication/MFA checks still run before
listen; diagnostic reports encrypted=false. This is not TLS or cryptographic peer
identity. Loopback transport does not prove a dedicated tenant/process/network
boundary; possible local proxy/downstream routing is not verified.

The approved repository implementation and synthetic tests are not approval to
activate production. The supplied SEC-2026-001 record says pending and has example/
uncompleted approver fields. No final production risk acceptance was established.
A format-valid reference cannot cryptographically prove a genuine approval record.
Protected configuration, review/custody and Hostinger topology evidence are required.

`server.ts` validates configuration before listen, constructs a lazy pool and does
not await DB/SMTP/AI/payments or migrations before listening. Startup tests pass;
they do not diagnose the latest production 503 without fresh runtime evidence.
`/health` and `/health/live` return process liveness independently of DB. `/ready`
and `/health/ready` check SELECT 1 and shutdown/auth construction, not schema,
effective grants, SMTP, AI, financial policy or acceptance. The four-second readiness
budget is not guaranteed compatible with a strict three-second readiness probe.
Use prebuilt Node24 backend root/npm start, separate readiness and startup detection,
and separately approved migrations. Never interpret liveness as customer readiness.

## Secret and dependency checks

Tracked-file inventory found placeholder-only .env.example templates, no tracked
production .env or private CA/key file. Pattern scan found no high-confidence
private-key/cloud-token markers in tracked HEAD. This is a scoped current-tree
scan, not exhaustive Git-history/entropy analysis or proof secrets were never shared.
Private MFA files outside Git were not read, copied or modified in this audit.
Logs are ignored; no actual production secret is included in the six reports.

Both root/backend `npm audit --offline --json` reported zero findings. Offline
results do not prove advisory freshness or current dependency safety. No packages
were installed, no audit fix run and no live vulnerability/advisory service queried.
Online advisory review, supported native Argon2/Linux build, lockfile review,
external penetration testing and operational incident rehearsal remain outstanding.

## Production verdict

Not production-ready. Required evidence: resolved exposed-key status/custody,
approved transport exception or usable verified TLS, confirmed hosting isolation,
actual restricted grants/schema/definers/locks, tested offsite backup/restore,
legal and commercial acceptance, live email/AI/Google/payment verification for
approved functions, deployed artifact identity, field accessibility/performance
and explicit owner launch acceptance. HTTPS, DB passwords and MFA do not encrypt
the local database channel. No production success is claimed.
