# Hostinger deployment requirements — Task 14

2026-11-05. **Blocked: NOT READY — CRITICAL BLOCKERS.** This checklist is an
unexecuted operator handoff, not deployment authorization. No Hostinger account,
database, domain or environment was accessed/changed. Use the classified register
in [production-blockers.md](production-blockers.md); all unchecked items need evidence.

## Provider/runtime and artifact gates

- [ ] **Externally unverified:** confirm the actual account/plan supports two
  independently rooted Node apps, required resource limits, persistent secrets,
  public routes, custom domains, environment-at-build and hosting-provided PORT.
- [ ] **Externally unverified:** select a current security-patched Node 24.x/npm
  combination and record actual runtime patch on provider staging. Local tests used
  v24.14.0, which is compatibility evidence only. Hostinger publicly lists 24.x,
  but that does not prove account enablement or patch rollout.
  [Official version guidance](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/),
  [Hostinger patch notice](https://www.hostinger.com/support/node-js-24-22-1-security-update-on-hostinger-hosting/).
- [ ] **Externally unverified:** `npm ci` independently in root and backend using
  committed lockfiles; include development build dependencies (both .npmrc files
  currently include dev). Verify native Argon2 build/runtime on provider Linux.
  prepare builds automatically; do not confuse it with a migration step.
- [ ] **Locally tested only:** frontend root `/`, entry server.mjs, `npm run build`
  then `npm start`; backend root backend/, entry dist/server.js, its build/start.
  Verify provider entry/start semantics rather than assume a particular hPanel UI.
- [ ] **Externally unverified:** deploy immutable reviewed artifact/commit identity,
  retain prior artifact for compatible code rollback, install/restart ordering and
  restart-on-crash policy. No schema migration during install/prepare/start/health.
- [ ] **Verified documentation risk:** legacy DEPLOYMENT.md says APIs are absent;
  this checklist/current API contracts override that historical statement.

## Environment separation (names only; no credentials here)

| Setting | Required configuration / verification | Classification |
| --- | --- | --- |
| NODE_ENV | production, separately in both deployments | Externally unverified |
| HOST / PORT | Bind provider-required interface; keep assigned PORT. Defaults are backend 127.0.0.1:3001 / frontend 0.0.0.0:3000 and are not proof of provider compatibility. | Externally unverified |
| VITE_API_URL | Frontend build-time exact HTTPS API URL ending /api/v1; set before prepare/build. Rebuild when changed. No JWT/DB/SMTP secret in any VITE variable or frontend bundle. | Externally unverified |
| CORS_ORIGINS | Backend exact actual frontend origins, including www only if actually served; no wildcard/path/trailing slash. credentials=false. Test positive and negative origins. | Externally unverified |
| DB_HOST / DB_PORT / DB_NAME | Actual provider hostname, port, project schema and approved topology. Do not assume localhost or 3306 solely from examples. No production value read here. | Externally unverified |
| DB_USER / DB_PASSWORD | Newly rotated restricted runtime identity only; no migration owner in app environment. | Externally unverified |
| DB_CONNECTION_LIMIT | Per-instance provider budget, default 5, validated 1–50; budget migration/backup/monitoring and all replicas too. No queue in current pool. | Externally unverified |
| AUTH_ACCESS_SECRET | Fresh operator-generated canonical base64, 32–128 random bytes; synchronized replicas; documented old-key/session revocation. Missing key leaves auth unavailable even if health is green. | Externally unverified |
| PUBLIC_FUNNEL_ORIGIN | Exact backend HTTPS origin; QR encodes this plus /api/v1/public/funnels/:code. Never request Host-derived. Origin changes can invalidate asset digests until controlled regeneration. | Externally unverified |
| PUBLIC_WEB_ORIGIN | Exact frontend HTTPS origin enabling HTML 303 bridge to /r/:code; verify JSON still JSON and unavailable links never redirect. | Externally unverified |
| AUTH_SMTP_HOST / PORT / USER / PASSWORD | All configured together; port 465 or 587, certificate-verified TLS, restricted rotated credentials. No debug/body logging. | Externally unverified |
| AUTH_MAIL_FROM / AUTH_RECOVERY_URL | Verified sender/domain; HTTPS frontend /recover supports purpose-based invitation/reset fragments. One configured URL is shared by both flows; a reset-only page would not handle invitations correctly. | Externally unverified |

No runtime DB TLS setting currently exists (**Not implemented**, H2). Do not invent
DB_SSL variables and assume they work. Prove a permitted local/private topology or
add a separately tested CA/hostname-verified configuration before remote transport.

## Exact database migration prerequisites

1. [ ] **Externally unverified:** separately authorized inventory: actual VERSION,
   schema/objects/data sizes, table engines/collations, CHECK/FK enforcement, SQL
   mode, current constraints/triggers/definers, grants/roles and migration ledger.
   User-reported MariaDB 11.8.9/InnoDB/utf8mb4_unicode_ci is not provider evidence
   obtained by this audit. No assumption of empty tables/data.
2. [ ] **Externally unverified:** create separate DBA/provisioning, migration and
   runtime identities. Test effective inherited roles, not just explicit grants.
   Migration requires reviewed CREATE/ALTER/INDEX/TRIGGER, metadata/verification,
   seed DML and ledger SELECT/INSERT/UPDATE, plus session variables/named locks.
   It does not need broad GRANT OPTION. Provider provisions identities separately.
3. [ ] **Externally unverified:** runtime gets only required SELECT/INSERT/UPDATE
   on mutable tables, SELECT-only role/permission and commercial catalogs where
   no runtime authoring exists; SELECT/INSERT-only audit_logs, usage_records and
   feedback_status_events; no ledger writes, DDL/TRIGGER/GRANT or broad inherited
   schema rights. Confirm trigger definer can perform required checks and stays
   valid while runtime cannot replace/bypass triggers. Stronger tamper resistance
   requires independent append-only export, not trust in a DB owner.
4. [ ] **Externally unverified:** on disposable provider staging, prove all 35
   triggers, named FKs/CHECKs/generated UNIQUE keys, utf8mb4 collation, UTC session,
   InnoDB rollback, GET_LOCK/IS_USED_LOCK/RELEASE_LOCK and dedicated session affinity
   across commit/disconnect. Single writable primary only. Test runtime denials.
5. [ ] **Blocked:** current CLI only permits loopback and magicreview_migration_*
   disposable schemas. Design/review an explicit production executor with target
   identity confirmation, TLS, locking, immutable checksums and operator controls.
   Never use a tunnel, fake local name or edited guard to evade this restriction.
6. [ ] **Blocked:** classify target as genuinely empty versus existing data/ledger.
   Empty target can rehearse exact 000000–000063 manifest. Existing untracked data
   requires reviewed mappings/collision/orphan/uniqueness checks and additive
   expand/backfill/validate steps; current CREATE statements are not an upgrade
   for unknown existing business tables. Never silently baseline or IF NOT EXISTS.
7. [ ] **Externally unverified:** approved backup and completed isolated restore
   rehearsal before migration; compare precise object definitions/trigger bodies/
   definers/grants and data integrity, not only names/status checksums. Freeze DDL
   during backup and app writes during incompatible cutover as reviewed.
8. [ ] **Blocked:** rehearse provider clone upgrade/failure boundaries, lock waits,
   duration/copy cost, schema compatibility and code rollout. Establish a release
   gate for complete manifest/protections; current SELECT 1 readiness is insufficient.
9. [ ] **Blocked:** named operator/reviewer/deployment window and separate production
   approval. Applying/failed entries stop rollout. Preserve source/checksum/failure
   evidence; use reviewed forward repair, never blind mark-applied/down/reset.

## Application, operations and compliance acceptance

- [ ] **Not implemented:** enforced platform MFA and secure one-time root/admin
  bootstrap; do not promote fixture passwords/users into production.
- [ ] **Blocked:** approve and securely provision immutable plan terms/limits and
  channel versions. Assign merchant subscription/counters before first admin accepts.
  Missing commercial data must remain unavailable; no sample price/quota defaults.
- [ ] **Externally unverified:** SMTP transport verification plus invitation/reset
  inbox delivery, sender authentication, correct fragments, replay rejection and
  honest failure/retry behavior; decide durable outbox requirement.
- [ ] **Externally unverified:** HTTPS certificates/renewal/redirects, DNS ownership,
  reverse proxy restrictions, headers/CSP/HSTS and actual public origins; deep-link
  /app, /recover and /r; protected QR preview/download; Google canonical target.
- [ ] **Not implemented:** shared edge rate/abuse controls, trusted proxy model,
  privacy-safe logs/alerts, disk/audit growth and quota reconciliation monitoring.
- [ ] **Locally tested only:** close H1 deadlock before relying on public retry
  reliability; measure root/row lock waits, pool saturation and query plans safely.
- [ ] **Externally unverified:** health routing, readiness dependency failures,
  termination drain, process crash/restart, mail loss and limits resetting on restart.
- [ ] **Externally unverified:** approved privacy/retention/contact/clinic policy,
  no incentive/selective solicitation; no logging of bodies/Authorization/fragments.
- [ ] **Blocked:** close C1–C5 and high-risk gates, sign off security/DB/QA/operations,
  then authorize release separately. Local tests are not deployment approval.

Exact tests and complete Task 14 file inventory are in the
[main audit](production-readiness-report.md). Backup/restore prerequisites:
[backup-recovery-runbook.md](backup-recovery-runbook.md).
