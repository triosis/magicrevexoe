# Hostinger Node deployment with an external verified-TLS database

2026-11-07. Approval-gated checklist, not deployment. Production API stays
https://api.revexoe.com; changing the database does not normally require changing
API/web domains. The owner confirms current Hostinger MariaDB11.8.x loopback lacks
customer-authenticated trust/identity/enforcement evidence. This plan keeps secure
validation, not that insecure local connection. All production steps below remain
unexecuted; no provider account or infrastructure was changed.

Read the companion [provider comparison](DATABASE_PROVIDER_COMPARISON.md),
[migration plan](DATABASE_MIGRATION_PLAN.md), [TLS configuration](DATABASE_TLS_CONFIGURATION.md)
and [risk/rollback plan](MIGRATION_RISKS_AND_ROLLBACK.md) before authorizing a cutover.
The recommended first qualification candidate is AWS RDS for MariaDB11.8, conditional
on actual version/region, network, grants, TLS and restore acceptance. No MySQL port
or frontend/business/API change is bundled with this plan.

## Stage A ? required approvals and support answers

- [ ] Owner/security/DBA choose provider, region/residency, price quote/HA tier,
  maintenance window, RPO/RTO/retention and offsite backup/key custody. No numerical
  business/retention policy is invented by the plan or copied from a provider default.
- [ ] External provider confirms actual MariaDB11.8.x patch and downgrade/upgrade
  policy, InnoDB/strict/FK/CHECK behavior, 46 expected triggers and required metadata/
  grant visibility, direct writer/session-affine transactions and advisory locks.
- [ ] Obtain authenticated CA bundle, matching endpoint DNS identity, TLS1.2+,
  renewal/overlap procedure and server-side secure-transport enforcement evidence.
- [ ] **Hostinger support** confirms outbound TCP to that DNS endpoint and actual
  DB_PORT, stable egress IPv4/IPv6 or approved private routing across restarts/failover,
  region and persistent backend CA-file mount/read access. Website ingress IP is
  not assumed to be outbound egress. Never open DB ingress to all internet sources
  merely because egress cannot be allowlisted.
- [ ] If private DB chosen, provide an actual supported private connectivity path;
  Hostinger Cloud is not automatically inside an external provider VPC. If controlled
  connectivity or CA mounting cannot be provided, seek separate approval to host the
  API beside the DB in a supported private network. Do not install an ad-hoc identity-
  bypassing proxy/tunnel or change DB_HOST to an unrelated loopback alias.
- [ ] Hostinger provides consistent source export/snapshot via authenticated encrypted
  delivery. No application/source tool fallback to unverified SQL. Without a complete
  secure export, stop; do not declare there is no data merely because the API is503.
- [ ] Obtain approval for staging/protected-clone use, provisioning, target imports,
  temporary restore accounts and later cutover separately. No credentials in chat.

## Stage B ? prepare configuration without touching production

- [ ] Freeze reviewed code/lockfiles and all85 migration/checksum/postcondition pairs
  (bootstrap has its runner verification), current full manifest and rollback plan.
  Do not edit history, rebaseline or create a fresh ledger over imported data.
- [ ] Build precompiled backend with Node24/native Argon2 on provider-equivalent OS.
  Entry backend/dist/server.js. Working directory backend: node dist/server.js;
  root: node backend/dist/server.js. Root npm start is the frontend, not API.
- [ ] Make a private filled copy of [external-database.env.example](external-database.env.example)
  outside Git. Placeholder values are intentionally not deployable. No app loader
  reads this worksheet in production; hPanel protected variables must be injected.
- [ ] Keep NODE_ENV=production, HOST=0.0.0.0, provider HTTP PORT, approved public/CORS/
  recovery origins and DB_TLS_MODE=required. DB_PORT is independent of HTTP PORT.
- [ ] Supply actual external DB DNS writer hostname, DB port/schema/restricted user/
  password and approved pool limit. Across replicas, reserve connections for operators
  and recovery, not only API max50. Avoid WAN transaction-pool proxies and reader endpoints.
- [ ] Upload authenticated CA PEM unchanged into a persistent readable location outside
  public/dist/Git; compare exact file-byte SHA-256 to approved material on both sides.
  Set actual DB_TLS_CA_FILE/DB_TLS_CA_SHA256; do not invent paths/digests or supply
  a website certificate/server private key. Rehearse trust rotation before expiry.
- [ ] Retain **existing** AUTH_ACCESS_SECRET/AUTH_MFA_KEY and actual SMTP/origin settings.
  A DB move is not key/password rotation. MFA ciphertext, hash/session/token metadata
  and signed submission tokens need the correct existing key and original identities.
- [ ] Keep migration/backup/restore/bootstrap accounts separate from runtime. Verify
  exact grants and approved definer account lifecycle before opening application access.

## Stage C ? rehearsal and evidence before source write freeze

- [ ] Run complete local tests plus the actual selected-provider isolated acceptance
  suite: schema/manifest/ledger, grants/definers/SQL mode, negative constraints,
  auth/MFA/session replay/role ancestry, feedback/root-lock/quota concurrency, audit
  rollback, binary/JSON/BIGINT/time round trips and secure backup/restore.
- [ ] Prove correct trust/name succeeds and wrong trust/name fails using isolated
  provider fixtures. Confirm server TLS enforcement independently; diagnostic success
  does not establish it refuses every unencrypted account/client.
- [ ] Run authorized existing read-only diagnostic with protected environment:

~~~sh
node backend/dist/db/diagnostic-cli.js --confirm-read-only
~~~

- [ ] Verify encrypted=true, engine=MariaDB, series=11.8. The diagnostic deliberately
  reports schemaAndGrantsVerified=false. No passwords/CA material/raw errors printed;
  it reads only session TLS status/version/SELECT1 and contacts no SMTP/AI/payment.
  Do not dump environment or pass credentials through argv. It validates full local
  production/auth/SMTP configuration before connecting; no fake placeholders allowed.
- [ ] Record provider version/target/grant/manifest fingerprints through separately
  approved preflight. The strict operator expects exact @@hostname/account and schema;
  managed endpoint failover can change server identity, requiring new target review
  and fresh approval. Preflight does not promise migrations/import will succeed.
- [ ] Rehearse whole encrypted export/empty-target restore/verification and actual
  measured RPO/RTO. The shipped local-only recovery executor is **not** a remote
  production restore tool. No flag/policy guard bypass is authorized by this plan.
- [ ] Test actual Hostinger-to-provider latency/root lock waits/pool saturation,
  DNS/CA rotation and provider restart/failover. Keep existing3-second connect and
 4-second readiness behavior unless a separately justified/tested change is approved.

## Stage D ? later owner-approved cutover

- [ ] Confirm backup/restore and named reviewers pass, source schema/ledger is known,
  all source writers/DDL/admin changes/jobs are fenced and ingress has an approved
  mutation/webhook hold policy. Take final consistent source capture and integrity
  inventory; retain source untouched. GET_LOCK does not fence all application writes.
- [ ] Restore target using the migration plan: empty/fenced target, complete DDL/FK/
  CHECK/indexes, base-column dependency-order data including exact ledger, then all
  triggers/approved definers, followed by complete data/schema/auth verification.
  Never import published plans under the existing draft-only INSERT guard or expose
  a trigger-free restoration to runtime traffic. No source object deletion/cleanup.
- [ ] In hPanel select api.revexoe.com ? website dashboard ? Environment variables.
  Prepare the approved external DB variables and CA path/hash. Apply changes and
  restart only when authorized. Runtime changes need a new process; build-time
  VITE_ changes require rebuilding, but a DB-only move does not change VITE_API_URL.
  [Official environment-variable procedure](https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/).
- [ ] Drain/restart **all** replicas against the single approved target, with source
  still fenced. Do not run install/build/migrate/backup/diagnostic as startup command.
  Avoid two authoritative writers. Log the exact DB-authority switch time T0.
- [ ] Confirm listening log, actual target TLS diagnostic, full schema/privileges and
  application read checks while writes remain fenced. Root / is404, not a health probe.

~~~sh
curl --fail --silent --show-error --max-time 2 https://api.revexoe.com/health
curl --fail --silent --show-error --max-time 6 https://api.revexoe.com/ready
~~~

  These are future manual approved probes, not calls performed here. /health200
  means process alive after secure validation, independent of DB availability.
  /ready200 requires DB probe/auth dependency/no drain; DB failure503. Existing
  /health/live and /health/ready remain aliases. Separate process detection from
  readiness timeout: up to4 seconds needs ingress margin, not a guaranteed3-second
  readiness deadline. Ready does not prove schema/grants/SMTP/providers/acceptance.
- [ ] Explicitly approve opening one target writer only after all checks pass and
  post-cutover recovery point exists. Login/refresh/MFA/audit also write: do not
  misclassify them as zero-write validation when making failback decisions.
- [ ] Monitor TLS/errors/connection count/root contention, statement latency, CPU/
  storage/backup age, auth failures and quota reconciliation. Confirm actual SMTP
  separately with approved no-mail verification then synthetic inbox acceptance;
  no unapproved payment/AI/email side effects or automatic retries.
- [ ] Retain source/backups until explicit retention/acceptance criteria pass. On
  failure follow stage-specific rollback; source remains TLS-unsuitable, so do not
  reopen it with disabled verification. Target writes require reconciliation/fix-forward.

## Current facts, unknowns and evidence

**Repository verified:** same-engine MariaDB11.8 gates; direct verified-TLS DNS pool;
no silent production downgrade; 85 migrations/32 tables/46 triggers; intact auth and
feedback/quota controls; local-only recovery guard. **Owner-confirmed situation:**
Hostinger source MariaDB11.8.x/127.0.0.1 lacks the required customer trust/identity/
TLS enforcement evidence. **Published only:** provider feature/version/price/backup
claims cited in the comparison. **Unverified:** actual region/SKU/patch, provider
account/grants/CA/SAN/network/metadata, source data/schema/export and restore,
Hostinger stable egress/mount, representative performance and production success.
No reliable production-data inventory or migration duration/zero-loss RPO can be
inferred from repository tests or an HTTP503.

## Checks and complete file inventory for this planning task

| Local command/check | Actual result |
| --- | --- |
| npm --prefix backend test |56 passed, no failures/skips |
| npm --prefix backend run test:integration |187 passed, no failures/skips; disposable MariaDB11.8.9 including real TLS/SMTP, schema, MFA, concurrency and recovery |
| Backend build (included by both commands) |Passed |
| Existing migration order/checksums versus schema manifest |85 versions match; no SQL/manifest change |
| New-file whitespace/template safety and git diff --check |Passed |

243 relevant tests executed; no new implementation or mirrored tests were added for
this documentation-only task. Frontend/E2E/lint/typecheck full-audit results remain
historical; backend test commands compile TypeScript in this run. No actual remote
connection/provider integration test occurred. Temporary logs are ignored under
.tmp-frontend/external-db-plan/. No production secret values generated/read in this task;
existing tests use synthetic local material, not production credentials.

Files created (this task only):

1. [DATABASE_PROVIDER_COMPARISON.md](DATABASE_PROVIDER_COMPARISON.md)
2. [DATABASE_MIGRATION_PLAN.md](DATABASE_MIGRATION_PLAN.md)
3. [DATABASE_TLS_CONFIGURATION.md](DATABASE_TLS_CONFIGURATION.md)
4. [HOSTINGER_EXTERNAL_DATABASE_DEPLOYMENT.md](HOSTINGER_EXTERNAL_DATABASE_DEPLOYMENT.md)
5. [MIGRATION_RISKS_AND_ROLLBACK.md](MIGRATION_RISKS_AND_ROLLBACK.md)
6. [external-database.env.example](external-database.env.example)

No application source, dependencies/lockfiles, production environment, migrations,
ledger, schema manifest or existing reports were modified. The environment worksheet
contains placeholders only and intentionally fails production validation. **No
production deployment/migration/readiness claim.** Next action is owner/provider
qualification and quote approval, not automatic provisioning or data transfer.
