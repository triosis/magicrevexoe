# MagicReview AI — Hostinger database compatibility checklist

## Task 17 current local evidence

Explicit operator preflight/apply and separate least-privilege accounts now pass
on disposable MariaDB 11.8.9, including all 67 versions, 26 tables and 35 triggers.
Metadata fingerprints cover every ordered prefix; changed/missing/unexpected
columns, indexes and trigger definitions fail closed. PUBLIC test-schema grants
were discovered and rejected rather than ignored. No Hostinger state was inspected
or changed. Follow [production-migration-runbook.md](production-migration-runbook.md)
for read-only provider inventory and separately authorized clone write checks.
Provider grants, TLS, trigger definers, time budgets and restore remain unverified.


Task 05 local evidence: all versions through 000063 and the authentication/tenant
authorization suite pass on disposable MariaDB 11.8.9. Existing schema and runner
regressions also pass. No Hostinger database, SMTP provider or production secret
was accessed. See auth-security-report.md for explicit MFA/rate-limit/delivery
limits; production grants and deployment checks below remain separate gates.

Status: LOCAL SCHEMA VERIFIED / Task 04, 2026-11-04. Production permissions pending.
No Hostinger production connection or modification occurred. Task 03 authorized
disposable local MariaDB tests and only migration infrastructure, not business DDL.
The metadata SQL and runner now exist; the inventory SQL below remains unexecuted
against Hostinger. All production capability tests still need separate approval.

## Task 04 evidence update

All 63 versions (unchanged bootstrap plus 62 new schema/guard/seed statements)
apply on a fresh disposable MariaDB 11.8.9 instance. It creates 24 InnoDB tables
including tracking metadata, utf8mb4_unicode_ci, and 35 triggers. Local tests
prove hierarchy/NULL rejection, composite ownership FKs, generated uniqueness,
rating/period/hash-format/JSON CHECKs, exact published-content immutability,
append-only UPDATE rejection, seed replay/conflict detection and BIGINT strings.
DELETE guards were verified in metadata; no destructive SQL was executed.
The redundant self-ID CHECK was replaced by the already-enforced typed parent
CHECK + composite FK, because MariaDB forbids AUTO_INCREMENT references in CHECK.

No unresolved local MariaDB DDL compatibility issue remains in this schema.
Hostinger runtime/migration grants and deployment prerequisites remain unverified;
local root tests do not prove production least privilege. No production access occurred.
Full test report and file inventory: [schema-implementation-report.md](schema-implementation-report.md).

## Task 03 evidence update

User-verified Hostinger facts (reported, not independently queried by this task):
MariaDB 11.8.9; default InnoDB; utf8mb4 / utf8mb4_unicode_ci; transactions and
savepoints supported; current project user has ALL PRIVILEGES on its database.
Separate runtime/migration identities and effective restricted grants remain
unverified. ALL PRIVILEGES is not append-only isolation.

Local evidence: official MariaDB 11.8.9 Windows ZIP server, newly initialized
disposable data directory, random ephemeral credential, loopback-only random port.
No existing project/Hostinger database was used. SQL created only migration
metadata and synthetic integration fixtures; no business schema was implemented.

- [x] Existing mysql2 pool factory reused without altering application behavior.
- [x] Explicit migrate:status and migrate:up commands, no lifecycle/startup hook.
- [x] SHA-256 file/postcondition tracking, validated ledger shape and history prefix.
- [x] GET_LOCK excludes a concurrent runner and survives a commit locally.
- [x] Fresh-schema status performs no persistent writes; metadata bootstrap/rerun passes.
- [x] Existing untracked schema, orphan bootstrap, incompatible ledger and incomplete
  execution fail closed. Unknown vendor/version and unsafe CLI targets are rejected.
- [x] Local DML rollback/savepoints and additive operator-style forward repair tested.
- [x] Failed postcondition after committed DDL remains failed and blocks retries.
- [ ] Actual Hostinger lock/session-proxy behavior and migration identity remain unverified.
- [ ] Business CHECK/FK/generated-index/trigger behavior and audit grants remain unverified.

See [migration-guide.md](migration-guide.md) for commands, supported 11.8-series
policy, checksums, bootstrap failure boundary and manual recovery procedure.
The CLI deliberately allows only explicit disposable loopback targets and has no
production override. No statement here authorizes connecting to Hostinger.

Architecture: [database-architecture.md](database-architecture.md).
No separate approved SOW artifact was found in the repository. Task 02 supplies
the corrected hierarchy, merchant billing and structured-feedback decisions.

## 1. Evidence available from project configuration

| Item inspected | Repository evidence | What remains unknown |
| --- | --- | --- |
| backend/package.json and lockfile | mysql2 driver; explicit local migration runner; Node 24 | Hostinger integration behavior; restricted grants |
| backend/src/db/pool.ts | Promise pool; utf8mb4; client timezone Z; bounded connections; parameterized-query-capable driver; multipleStatements disabled | Server/schema collation, session timezone, grants, TLS topology and capabilities |
| backend/src/config/env.ts | Required DB variables and range/placeholder validation | Actual deployed values, connectivity, existing schema and account privileges |
| backend/src/app.ts | SELECT 1 readiness; generic public errors; allowlisted private diagnostics | Schema compatibility, audit grants and tenant isolation (not implemented) |
| backend/tsconfig.json | Strict TypeScript compilation | No database dialect guarantee follows from TypeScript compilation |
| backend/docs/database-architecture.md | Proposed FKs, CHECKs, generated uniqueness, triggers and grants | No evidence those constructs are supported/enforced at Hostinger |

No secret-bearing configuration files were inspected or copied into these docs.
A successful health check is not evidence that migrations or constraints work.
mysql2 can speak to different compatible servers; its presence does not establish
that the host is MySQL 8. An hPanel label is not enough to identify server version.

## 2. Safe execution and evidence rules for the later check

- [x] Task 03 grants disposable local integration access only. Obtain separate
  explicit permission for any Hostinger/production database access.
- [ ] Use a disposable development/staging schema on the same exact engine/version
  and hosting permission model. A local MySQL container alone does not prove
  Hostinger grants, triggers or connection behavior.
- [ ] Inventory existing production schema only in a separately approved read-only
  operation or from a sanitized schema export. Do not assume tables are empty.
- [ ] Store evidence privately with date, operator, engine/version, database scope,
  test case, expected versus actual result and pass/fail. Redact account identities,
  grants containing auth details, object names identifying clients and network data.
- [ ] Never paste connection strings, environment dumps, credential files, raw
  driver messages, password hashes, production feedback or medical data into reports.
- [ ] Only the read-only metadata examples below may be used during inventory.
  Negative constraint/grant tests are future staging writes requiring approval;
  do not run them on production. No destructive SQL is provided here.
- [ ] Never disable foreign_key_checks, CHECK enforcement, strict mode or TLS
  validation to force tests or migrations to pass.

Boxes below are the remaining business/hosting verification checklist; Task 03
local results above must not be interpreted as Hostinger permission/capability results.

## 3. Read-only metadata examples (not executed)

Use only after access is authorized, with the intended schema selected. These
statements do not read application rows; returned metadata still needs redaction.

```sql
SELECT VERSION() AS server_version, @@version_comment AS server_family;
SHOW ENGINES;
SELECT @@default_storage_engine AS default_engine,
       @@character_set_database AS database_charset,
       @@collation_database AS database_collation,
       @@session.time_zone AS session_timezone,
       @@global.time_zone AS global_timezone,
       @@system_time_zone AS system_timezone,
       @@session.sql_mode AS session_sql_mode,
       @@session.foreign_key_checks AS fk_checks;
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE();
SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME,
       REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, ORDINAL_POSITION
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;
```

Privately inspect SHOW GRANTS for the connected runtime identity and separately
for the migration identity, including effective activated roles and inherited
schema/global rights. Do not publish raw SHOW GRANTS output. Provider-managed
rights may require Hostinger support to confirm. An empty information_schema
result can mean limited visibility; it does not prove absence of existing objects.

Only if the server is identified as MariaDB, also inspect
`SHOW SESSION VARIABLES LIKE 'check_constraint_checks'` and require ON where that
variable exists. Do not run vendor-specific metadata queries without detecting
vendor/version. A missing variable is not proof of enforcement.

## 4. Capability verification matrix

### A. Vendor/version reported; business dialect and lifecycle checks still pending

- [x] User reports MariaDB 11.8.9; disposable integration server matches 11.8.9.
- [ ] Record authorized Hostinger VERSION and version_comment in private evidence; distinguish
  MySQL, MariaDB and any provider proxy/compatible service.
- [ ] Confirm the release is supported by the provider and vendor; old minimum
  syntax versions are not recommendations to deploy unsupported releases.
- [ ] Select a dialect explicitly. MySQL >=8.0.16 is the historical CHECK
  enforcement boundary, not automatic approval for every MySQL 8 feature.
- [ ] If MariaDB, review/test JSON representation/validation, CHECK switches,
  generated indexes, ENUM FKs, trigger syntax, DDL commit/locking behavior and
  metadata differences. Do not claim compatibility based only on a version string.
- [ ] Confirm Node 24/mysql2 correctly handles authentication plugin, TLS mode,
  DECIMALs, BIGINTs as strings, DATETIME(6), binary IDs and parameter binding.

Pass criterion: supported exact engine/version documented with passing tests
below. Otherwise stop schema implementation for that target; adapt deliberately.

### B. InnoDB and transactions — BLOCKER: unverified

- [ ] SHOW ENGINES lists InnoDB as available; inspect existing table engines.
- [ ] Future definitions specify ENGINE=InnoDB explicitly for business and ledger
  tables; do not rely solely on default_storage_engine.
- [ ] Staging: related DML rolls back together using one dedicated connection;
  SELECT FOR UPDATE serializes provisioning/quota tests; deadlock and connection
  loss handling leave no partial business changes.
- [ ] Verify lock wait timeout/isolation defaults and operational limits; size the
  application pool for Hostinger's connection budget and reserve migration capacity.

Pass criterion: transactional behavior and FK support proven on intended tables.
Nontransactional engines cannot meet the proposed atomic business/audit writes.

### C. CHECK enforcement — BLOCKER: unverified

- [ ] Inspect definitions/metadata, but also prove behavior in disposable staging.
- [ ] All five permitted edges succeed: platform->reseller, platform->merchant,
  reseller->sub_reseller, reseller->merchant, sub_reseller->merchant.
- [ ] All other parent type pairs fail, including merchant parents, reseller peers,
  sub-reseller peers, self-parenting and root-with-parent cases.
- [ ] Verify explicit NULL handling: parent pair must both be NULL only for the
  platform root; non-platform parent IDs/kinds cannot be NULL; only merchant gets
  a non-NULL channel. SQL UNKNOWN must not bypass conditions.
- [ ] Invalid ratings, invalid date ranges, merchant-only ownership and boolean
  values fail; valid boundary values succeed. Test UPDATE as well as INSERT.
- [ ] Verify FK columns used by CHECK and explicit RESTRICT clauses compile and
  behave together on the selected engine. Never remove ownership constraints just
  to make DDL compile; a dialect revision needs review and equivalent enforcement.
- [ ] Strict SQL modes reject invalid ENUM coercions. MariaDB check_constraint_checks
  stays enabled; runtime initialization cannot turn constraints off.

Pass criterion: invalid rows are rejected by the database, not only by Zod/services.
If CHECKs are parsed but ignored, the current schema is incompatible; propose an
engine upgrade or reviewed equivalent triggers before proceeding.

### D. Composite foreign keys — BLOCKER: unverified

- [ ] Use explicit composite FK syntax and explicit referenced UNIQUE keys.
  All participating columns match type, unsignedness, ENUM domain/order and
  charset/collation. Referencing and referenced tables use InnoDB.
- [ ] Parent_kind spoofing fails against tenants(id,kind).
- [ ] A branch/destination/funnel/link/feedback reference to another merchant fails,
  even when every individual ID exists. Test mismatched branch within one merchant.
- [ ] Role kind and membership kind must match the actual tenant kind.
- [ ] Branch/subscription tenant_kind uses the full tenant ENUM plus a merchant-only
  CHECK, not an unrelated one-value ENUM.
- [ ] RESTRICT prevents orphaning history or ownership; there are no accidental
  cascades, SET NULL paths or disabled FK sessions.
- [ ] FK index order and maximum index bytes are supported; confirm future SQL's
  generated column/index use and CHECK interactions on this exact engine.

Pass criterion: structurally cross-tenant references fail under direct staging
SQL. SELECT authorization still requires scoped repositories; FKs alone cannot
enforce that a reseller sees only its real descendant merchants.

### E. Generated uniqueness and types — BLOCKER: unverified

- [ ] platform_slot generated uniqueness permits at most one platform root.
- [ ] subscriptions current_slot permits one trialing/active/past_due subscription
  per merchant, while preserving multiple historical rows.
- [ ] Generated column syntax/storage mode and indexes are supported. Test duplicate
  INSERTs and transitions that would create a second current subscription.
- [ ] JSON fields reject invalid JSON and application validation rejects forbidden
  keys; no reliance on MySQL binary JSON behavior when the vendor is MariaDB.
- [ ] DATETIME(6), binary email/token keys and safe case comparisons round-trip.
  Full-length unique keys fit the selected engine's index byte limits, especially
  object_key; select ASCII binary for server-generated storage keys if appropriate.

### F. Triggers — BLOCKER: unverified

- [ ] Provider permits the migration identity to create required triggers, including
  any binary-logging/definer restrictions. Verify using actual staging privileges.
- [ ] Migration-controlled triggers block UPDATE/DELETE on audit history; immutable
  tenant parents/types and published version content cannot be modified.
- [ ] Allowed lifecycle-only transitions still work; trigger ownership survives
  deployment, restores and credential rotation without privileged missing definers.
- [ ] Runtime identity cannot replace/drop triggers, change definitions or obtain
  migration credentials. Inspect effective grants, not just UI permission labels.

Pass criterion: tests under separate identities prove the controls. If trigger
support is unavailable, record a blocking architectural exception; choose suitable
hosting or a reviewed equally strong design, not silent service-only enforcement.

### G. Table-level grants and append-only audit — BLOCKER: unverified

| Identity | Required capabilities | Must not have |
| --- | --- | --- |
| Runtime | Required business DML; SELECT/INSERT on audit_logs, usage_records, feedback_status_events | UPDATE/DELETE on append-only tables; DDL, TRIGGER, GRANT OPTION; migration ledger writes |
| Migration job | Explicit reviewed DDL, trigger creation, backfill DML and ledger updates | Automatic app exposure; unnecessary global privileges or GRANT OPTION |
| DBA/provider | Provision identities and grants; approved backup/recovery | Use as runtime account |

- [ ] Hostinger can issue distinct credentials and effective table-specific grants.
- [ ] No broader schema/global grant or inherited role overrides intended history
  restrictions. GRANT rights are additive; narrow table grants do not negate broad
  grants elsewhere.
- [ ] Runtime staging attempts to mutate existing audit rows fail, including update/
  delete, REPLACE-style replacement and duplicate-key update paths; ordinary inserts
  and scoped reads work. No TRUNCATE/ALTER/DROP right is available.
- [ ] Verify service-side insert allowlists; append-only means rows cannot change,
  not that a compromised application can never fabricate a new event.
- [ ] Document database-owner threat model, restore controls and separately controlled
  append-only export if tamper evidence against a DBA is required.

Pass criterion: append-only behavior works with the actual runtime credentials.
If hPanel only provides a broad shared account, this is a release blocker for the
proposed immutable audit design; obtain provider support or change the design/host.

### H. Collation, timezone and SQL mode — BLOCKER: unverified

- [ ] Confirm actual schema/table/column charset/collation; choose supported utf8mb4
  human-text collation and explicitly binary-comparing keys. Do not assume
  MySQL-specific utf8mb4_0900_* collations exist on MariaDB.
- [ ] Test uniqueness with mixed-case email/codes, Unicode and trailing spaces;
  email normalization policy must agree with stored binary email_key.
- [ ] Set/verify session UTC on every runtime and migration connection at future
  implementation. mysql2 timezone='Z' controls conversion, not server NOW().
- [ ] Numeric offset +00:00 must work without requiring named-zone tables. Server
  global timezone may differ, but every application session must be verified UTC.
- [ ] Test DATETIME(6) round-trip, subscription period rollover and IANA branch zone
  conversion without double conversion or loss of precision relevant to the API.
- [ ] Strict modes reject truncation, invalid ENUMs and bad dates. Do not relax
  modes for a migration without a separately reviewed compatibility plan.

### I. Existing data, backup and connectivity — BLOCKER: unverified

- [ ] Inventory existing tables, constraints, triggers, indexes and migrations
  without reading customer data into logs. Check collisions and FK orphans.
- [ ] Verify nonempty-table upgrade/backfill plan, duplicate normalization conflicts,
  lock/copy cost, scheduled maintenance and schema compatibility across app releases.
- [ ] Restore a sanitized backup into staging and reconcile row counts and ownership.
  Approve encrypted backup retention, access control and recovery objectives.
- [ ] Privately verify database user assignment/grants, correct intended database,
  and internal/remote topology; do not invent credentials or change production
  secrets. If remote TLS is required, verify CA and hostname; no TLS bypass.

## 5. Migration runner verification gate

Implemented using existing mysql2 in src/migrations/. Only the metadata bootstrap
is checked in. Local verification is recorded above; Hostinger deployment and
business migration checks remain separate gates. See migration-guide.md.

- [ ] Version ledger includes immutable version/name/SHA-256 checksum, applying/
  applied/failed state, timing, runner identifier and last verified step.
- [ ] Fixed ordered versions, LF source bytes and checksum rules are reproducible
  across Windows and Linux. Changed/applied files, missing files or duplicate
  versions fail before DDL. Existing schema is never silently baselined.
- [ ] One dedicated session obtains a bounded GET_LOCK, requiring result 1;
  a second staging session cannot run concurrently. Connection/session affinity
  is verified if a provider proxy exists. No automatic reconnect or pool handoff.
- [ ] A stable <=64-byte per-schema lock name serializes bootstrap and migrations.
  Release/destroy on exit; connection loss aborts. Commit/rollback must not release
  the named advisory lock. Test actual provider capability, not just syntax.
- [ ] Each DDL step has explicit postconditions; runner does not split trigger
  bodies at semicolons and never enables multipleStatements.
- [ ] Crash after DDL but before progress update leaves applying/failed state and
  blocks later runs. Reconcile actual schema before an operator-approved repair;
  do not automatically rerun, edit checksums or mark applied.
- [ ] Database DDL implicit commits are acknowledged. DML rollback is not a
  substitute for restoring a failed schema change. Test forward repair and restore.
- [ ] Runtime/migration identities are separate, including effective grants;
  migration runner is never invoked by prepare, start, health routes or requests.
- [ ] Safe logs contain versions, step IDs and fixed failure codes, not driver
  payloads, credentials, raw SQL data or connection details.

## 6. Scope and release decisions

Resolved by Task 02:

- Five valid hierarchy edges with one actual parent per tenant; ancestry, not
  account depth, determines authority. No tenant reparenting in current MVP.
- Merchant-owned subscriptions for all merchant parent paths. Commissions,
  wallets, payouts and wholesale billing are explicitly later-phase work.
- Structured-only Phase 1 feedback; no free-text clinic field or medical details.
  Google and private feedback stay independently visible and usable; no rating gate.

Unresolved blockers before any schema execution against Hostinger:

1. Confirm reported MariaDB 11.8.9 metadata in separately authorized evidence;
   business dialect testing remains pending.
2. CHECK, composite FK, generated-key and transaction behavior on that target.
3. Trigger permissions and separate least-privilege/table-level grant feasibility.
4. Existing schema/data inventory, restore evidence and approved additive mapping.
5. Collation/session UTC configuration and provider advisory-lock/session behavior.
6. Runner/metadata implementation was approved in Task 03. Business schema
   migrations and all production execution still require separate approval.

Product/security decisions still requiring specification: plan amounts/limits,
one-channel-per-merchant assumption, retention/erasure policy, authentication/MFA
details, and optional payment-provider scope. These do not reopen the confirmed
merchant billing or parallel-path requirements.

Sign-off record (all pending): engine/dialect ___; metadata evidence ___;
staging constraint results ___; grants/trigger evidence ___; restore rehearsal ___;
reviewer ___; approval date ___; approved next implementation scope ___.

## 7. Primary references

- [MySQL CHECK constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [MySQL composite foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [MySQL named advisory locks](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html)
- [MySQL implicit DDL commits](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
- [MariaDB constraints and enforcement](https://mariadb.com/docs/server/reference/sql-statements/data-definition/constraint)
- [MariaDB foreign keys](https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/optimization-and-indexes/foreign-keys)

Documentation describes vendor behavior, not evidence that this Hostinger account
supports it. Verification results remain pending until a separately authorized check.
