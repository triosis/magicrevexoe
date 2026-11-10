> **2026-11-10 Cloud Startup update:** The strict grant and separate-account path
> below is incompatible with the confirmed single-user/database-wide-grant plan.
> Separate default-denied compatibility profiles have been implemented and rehearsed
> locally; see [current design, fields, recovery and approvals](HOSTINGER_CLOUD_STARTUP_IMPLEMENTATION.md)
> and [tests](HOSTINGER_CLOUD_STARTUP_TEST_REPORT.md). Do not run the commands below
> with ALL privileges expecting strict checks to pass. Production remains NO-GO;
> the shared-account runtime requires explicit persistent risk acceptance.

# Hostinger initial database migration and first owner

2026-11-10. **For review, not execution authorization.** Target supplied by owner:
`u676472791_magicreview_db`, `127.0.0.1:3306`, reported empty in phpMyAdmin.
No production connection, migration, account creation, settings change or secret
generation occurred during preparation. Commands below are Bash commands for an
authorized **Hostinger-side** operator, not Windows PowerShell. Read all gates first.

## 1. What has actually been verified locally

Inspected src/migrations/{operator-cli,operator,runner,privileges,schema}.ts,
src/config/database-transport.ts, src/setup/{cli,bootstrap}.ts and the existing
production-migration-runbook.md/task-21-workflows.md (paths under backend).

- 85 single-statement migrations: `000000_schema_migrations.sql` through
  `000084_protect_feedback_language.sql`, contiguous numeric order without gaps.
- 84 matching `.verify.sql` files: tracking-table bootstrap is verified in runner
  code. Every subsequent step requires its verification file.
- `loadMigrations` and `validateManifest` passed against the actual SQL/verification
  bytes and checked-in manifest. Bootstrap checksum is SHA-256(SQL); others are
  SHA-256(SQL + NUL + verification SQL). Preserve LF/no BOM bytes.
- Existing migration-handoff ZIP
  `.tmp-frontend/migration-handoff-0b388901293749ca8788f2a066c487ed.zip` was opened:
  all 169 SQL files plus schema-manifest.json match current repository bytes.
  README and SHA256SUMS are also present. Individual file hashes in SHA256SUMS
  are transfer checks, **not** the runner's combined migration checksums.
- Expected final local baseline: 32 base tables including schema_migrations,
  46 triggers, 85 applied ledger rows. The old Task17 runbook's 67-row count is
  historical; use 85 for this exact artifact, not future releases blindly.

The ZIP is not a standalone executable or backup. Use the matching compiled backend,
installed Node24/Linux dependencies, migrations and manifest together. Never import
or concatenate the SQL in phpMyAdmin; it bypasses tracking, checksums, locks and
postconditions. No administrator is seeded by migrations.

## 2. Mandatory stop/go review gates

Before any production database operation, obtain named operator/reviewer, exact
release identity, maintenance/write-free window and approvals for migration and
bootstrap. Freeze competing writers and automatic migration retries.

**Transport:** HOSTINGER_LOCAL implementation is locally tested, but its production
activation approval has not been established in the conversation. SEC-2026-001 was
a pending example, not approval. Require a genuine finalized approval record,
approver/dates/conditions/review and Hostinger routing/isolation evidence. Loopback
is unencrypted and has no TLS certificate peer identity; do not assume dedicated
tenant isolation or an encrypted downstream hop. If approval is absent, STOP.
Never fabricate CA/hash values, use remote plaintext or silently downgrade TLS.

**MFA:** the candidate shown in IDE/chat is exposed. Determine whether it was used.
Do not install it. Unused-key replacement or used-key reencryption needs its own
approved safe procedure. Preserve production AUTH_ACCESS_SECRET; actual independence
comparison remains operator-private. Resolve this before enabling administrator login.

**Backup/restore:** empty base-table count alone is not a backup. Independently
inventory views/triggers/routines/events as well as schema properties, grants,
definers and accounts. Record release/UTC time and approved protected snapshot/export
of the target plus required metadata; encrypt/store privately with separate key
custody and approved off-host copy. Confirm no secrets/customer exports are public
or in Git. A provider snapshot/export must have verified integrity and an isolated
restore rehearsal covering objects, constraints, triggers/definers and schema
properties. For a genuinely empty target, rehearse restoration/recreation of that
empty state on a separate disposable schema, not this production schema. Define
RPO/RTO, maintenance window, accountable restorer and restoration approval. Also
rehearse the exact new schema in an authorized isolated MariaDB11.8 target. Record
evidence privately. No provider backup mechanism or restore capability is assumed.
Without accepted recovery evidence, STOP; never use DROP/reset as an ad hoc rollback.

## 3. Establish the Hostinger execution environment

Previous SSH output showed node/npm missing from that shell's PATH. This is an
unresolved prerequisite, not permission to install Node or guess an activation path.
Ask Hostinger for the supported Node24 operator shell/runtime and access to the
managed app artifact and the same local DB endpoint. SSH localhost can differ from
an application container/proxy namespace. Confirm that relationship with support.

Read-only discovery in the Hostinger SSH session:

```bash
pwd
command -v node
command -v npm
find "$HOME/domains/api.revexoe.com" -maxdepth 6 -type f \
  -name package.json -not -path '*/node_modules/*' 2>/dev/null
```

Proceed only after the operator identifies the real backend path/runtime. The
following prompt accepts that real path without executable example placeholders:

```bash
read -r -p 'Confirmed Hostinger backend directory: ' REVO_BACKEND
cd -- "$REVO_BACKEND" || exit 1
node --version
test -f dist/migrations/operator-cli.js && test -f dist/setup/cli.js || exit 1
test -d migrations && test -f docs/schema-manifest.json || exit 1
```

Node must be 24.x. Verify the tested release commit/artifact using approved deployment
fingerprint evidence. If .git exists, `git rev-parse HEAD` is a useful source check,
not proof compiled files match. Build an approved artifact during build/staging,
never start migrations from an unverified hbuilds temporary directory or use a
Windows-native Argon2/node_modules copy. The SQL-only archive cannot supply runtime.
Do not change startup/build commands to run migrations automatically.

Offline artifact verification from the confirmed backend directory (no DB query):

```bash
node --input-type=module <<'NODE'
import {loadMigrations} from './dist/migrations/runner.js';
import {validateManifest} from './dist/migrations/schema.js';
import {readFileSync} from 'node:fs';
const files=await loadMigrations(new URL('./migrations/',import.meta.url));
const manifest=JSON.parse(readFileSync('docs/schema-manifest.json','utf8'));
validateManifest(manifest,files);
if(files.length!==85 || files[0].version!=='000000' || files.at(-1).version!=='000084')
  throw Error('Unexpected migration release; stop for review');
console.log('85 ordered migrations and combined manifest checksums verified');
NODE
```

Any mismatch is STOP, not permission to regenerate a manifest from production drift.

## 4. Read-only inventory and exact operator privileges

Use an approved database client/provider operator to inspect this target privately.
Select the intended database first. These queries are read-only:

```sql
SELECT DATABASE() AS db, VERSION() AS version, @@hostname AS server_hostname,
       CURRENT_USER() AS authenticated_account, CURRENT_ROLE() AS active_role;
SELECT @@default_storage_engine, @@character_set_database,
       @@collation_database, @@session.foreign_key_checks,
       @@session.check_constraint_checks, @@session.sql_mode;
SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA='u676472791_magicreview_db' ORDER BY TABLE_NAME;
SELECT TRIGGER_NAME,DEFINER FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA='u676472791_magicreview_db';
SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES
 WHERE ROUTINE_SCHEMA='u676472791_magicreview_db';
SELECT EVENT_NAME FROM information_schema.EVENTS
 WHERE EVENT_SCHEMA='u676472791_magicreview_db';
SHOW GRANTS;
```

Inventory `@@hostname` and `CURRENT_USER()` using the **migration account through
the intended transport**, not an assumed phpMyAdmin account or SSH hostname.
SHOW GRANTS can contain sensitive account details/hashes: inspect privately and
never paste raw output in chat/logs. Required: MariaDB11.8.x (not MySQL/unknown
series), InnoDB default, utf8mb4/utf8mb4_unicode_ci schema, FK/CHECK checks on and
STRICT_TRANS_TABLES or STRICT_ALL_TABLES. Confirm metadata visibility. Unexpected
objects or settings stop review; don't overwrite them or disable checks.

The migration account is separate from application runtime. `inspectGrants` requires:

| Scope | Required allowed privileges |
| --- | --- |
| Exact schema | SELECT, CREATE, ALTER, TRIGGER |
| schema_migrations table | INSERT, UPDATE (table CREATE also allowed) |
| industry_channels, roles, permissions, role_permissions tables | INSERT on each (table CREATE also allowed) |
| Global | Only USAGE; no global elevated privileges |

The profile rejects excessive schema-wide INSERT/UPDATE/DELETE, ALL PRIVILEGES,
GRANT OPTION, unreviewed roles/PUBLIC grants, unsupported routine/column/proxy grants,
unrelated schemas and wildcard schema patterns. Underscores in this schema name
must be escaped in **schema-level grant patterns**, even inside SQL backticks.
Table-level grants are literal. A Hostinger default ALL PRIVILEGES user will fail
this checker. Ask provider/DBA to provision the exact profile, including pregrants
on not-yet-created seed/ledger tables. If it cannot, **STOP: provider privilege
blocker**. Do not change the checker or issue invented GRANT commands here.
Trigger creation/definer, binary logging restrictions and advisory-lock/session
affinity need approved provider rehearsal; a read-only list cannot prove them.

## 5. Protected shell inputs and migration target policy

The operator CLI uses no dotenv, no hPanel-secret assumption and no app DB_* fallback.
Do not put migration/bootstrap account secrets into normal API runtime. Use the
provider-approved secret injection mechanism, or the following masked interactive
Bash prompts in a private non-recorded operator session. Disable shell tracing;
never use printenv/env dumps or passwords as command arguments.

```bash
set +x
umask 077
REVO_RUN_DIR=$(mktemp -d "$HOME/magicreview-initial-migration.XXXXXXXX") || exit 1
export REVO_RUN_DIR
chmod 700 "$REVO_RUN_DIR" || exit 1
export HOSTINGER_LOCAL_APPROVAL='I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT'
read -r -p 'Genuine finalized production transport approval reference: ' HOSTINGER_LOCAL_APPROVAL_ID
export HOSTINGER_LOCAL_APPROVAL_ID
read -r -p 'Approved migration DB username: ' MIGRATION_DB_USER
read -r -s -p 'Migration DB password: ' MIGRATION_DB_PASSWORD
printf '\n'
export MIGRATION_DB_USER MIGRATION_DB_PASSWORD
read -r -p 'Verified DB @@hostname for this target: ' REVO_DB_HOSTNAME
read -r -p 'Verified migration CURRENT_USER(): ' REVO_MIGRATION_ACCOUNT
export REVO_DB_HOSTNAME REVO_MIGRATION_ACCOUNT
```

Approval reference syntax: 8-80 ASCII letters/digits/dot/underscore/hyphen, initial
alphanumeric, no REPLACE_WITH_ prefix. Syntax does not prove actual authorization.
DB_TLS_MODE/DB_HOST/DB_PORT are not read by migration operator: JSON policy selects
the transport. In API runtime those values would be HOSTINGER_LOCAL/127.0.0.1/3306;
this runbook does not change them. Omit tlsCaFile/tlsCaSha256 from this policy;
DB_TLS_CA_FILE/DB_TLS_CA_SHA256 are not used by operator. Never use dummy values.

Create a new private policy from real operator inputs, validate transport and print
only the canonical fingerprint (not credentials):

```bash
node --input-type=module <<'NODE'
import {writeFileSync} from 'node:fs';
import {targetPolicy,operatorTransport} from './dist/migrations/operator.js';
import {digest} from './dist/migrations/schema.js';
const policy=targetPolicy.parse({environment:'production',host:'127.0.0.1',port:3306,
 database:'u676472791_magicreview_db',serverHostname:process.env.REVO_DB_HOSTNAME,
 expectedAccount:process.env.REVO_MIGRATION_ACCOUNT,transport:'HOSTINGER_LOCAL',
 hostingerLocalApprovalId:process.env.HOSTINGER_LOCAL_APPROVAL_ID});
operatorTransport(policy,{acknowledgement:process.env.HOSTINGER_LOCAL_APPROVAL,
 approvalId:process.env.HOSTINGER_LOCAL_APPROVAL_ID});
writeFileSync(process.env.REVO_RUN_DIR+'/migration-target.json',JSON.stringify(policy)+'\n',
 {flag:'wx',mode:0o600});
console.log('Migration target fingerprint: '+digest(policy));
NODE
```

Stop on nonzero command exit. Confirm private directory/file permissions and target
identity with reviewer. `digest(policy)` hashes JSON of **parsed/normalized policy**,
including defaults; it is not sha256sum of JSON file bytes.

## 6. Exact non-mutating preflight

Run only after all preceding gates. From backend, the direct compiled command avoids
npm building/adding noise to artifacts and uses the existing guarded operator:

```bash
node dist/migrations/operator-cli.js preflight \
  --target "$REVO_RUN_DIR/migration-target.json" \
  --environment production \
  --report "$REVO_RUN_DIR/preflight-initial.json"
```

Stop on failure. The new report is exclusive-create, never overwritten. It must
show `initialized:false`, `applied:[]`, 85 pending versions, mode preflight,
`transport:HOSTINGER_LOCAL`, `encrypted:false`, correct approval reference and
target/manifest fingerprints. Inspect report locally with reviewer. See actual
report shape before assuming any number is a scalar count. Preflight does not
create tracking table/seed data. It does query/set session settings and acquire
a transient named lock; it is not a dry-run execution guarantee for future DDL.

It validates target/version/grants, manifest and empty/current prefix under lock.
Lock is `magicreview:migrate:` plus first40hex(SHA256(database)), on one dedicated
connection; wait five seconds. Session metadata and InnoDB lock waits are bounded
to ten seconds, not a total DDL duration cap. Every apply repeats identity/grant/
shape validation under that same lock, and checks lock ownership before/after steps.

## 7. Reviewed initial apply (MUTATING — separate authorization required)

Approval expires 15 minutes after preflight. Review backup/rehearsal, identity,
release, pending versions and approval before continuing. Do not automatically
continue simply because preflight succeeded. After explicit approval, calculate
the confirmation from the reviewed artifact, not an invented hash:

```bash
REVO_TARGET_FINGERPRINT=$(node --input-type=module -e \
 'import {readFileSync} from "node:fs"; const r=JSON.parse(readFileSync(process.env.REVO_RUN_DIR+"/preflight-initial.json","utf8")); if(r.mode!=="preflight"||!/^[a-f0-9]{64}$/.test(r.targetFingerprint))process.exit(1); process.stdout.write(r.targetFingerprint)') || exit 1

node dist/migrations/operator-cli.js apply \
  --target "$REVO_RUN_DIR/migration-target.json" \
  --environment production \
  --approval "$REVO_RUN_DIR/preflight-initial.json" \
  --audit "$REVO_RUN_DIR/apply-initial.jsonl" \
  --confirm-production "APPLY-PRODUCTION:$REVO_TARGET_FINGERPRINT"
```

The audit file must be new; each event is appended/fsynced. Changed account,
privileges, policy, schema prefix, manifest or expired artifact refuses execution.
Retain the private audit; success requires exit0 and execution_completed. The runner
records applying/applied/failed ledger states, checks postconditions and exact schema
fingerprints before marking applied. MariaDB DDL can commit independently of ledger;
the whole run is **not** one atomic rollbackable transaction.

## 8. Read-only completion verification

Run a new structural preflight using the migration identity, with a new report:

```bash
node dist/migrations/operator-cli.js preflight \
  --target "$REVO_RUN_DIR/migration-target.json" \
  --environment production \
  --report "$REVO_RUN_DIR/preflight-completed.json"
```

Require 85 applied, zero pending, correct final manifest/shape and no incomplete
history. The authoritative checksum/definition comparison is this operator check,
not table counts alone. Select the correct DB and inspect read-only SQL:

```sql
SELECT DATABASE(), VERSION(), @@hostname, CURRENT_USER();
SELECT COUNT(*) AS ledger_rows, MIN(version) AS first_version,
       MAX(version) AS last_version FROM schema_migrations;
SELECT status, COUNT(*) AS n FROM schema_migrations GROUP BY status;
SELECT version,name,status,last_verified_step,failure_code
 FROM schema_migrations WHERE status<>'applied' ORDER BY version;
SELECT version,name,HEX(checksum) AS checksum_hex,status
 FROM schema_migrations ORDER BY version;
SELECT COUNT(*) AS base_tables FROM information_schema.TABLES
 WHERE TABLE_SCHEMA='u676472791_magicreview_db' AND TABLE_TYPE='BASE TABLE';
SELECT COUNT(*) AS triggers FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA='u676472791_magicreview_db';
SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES
 WHERE TABLE_SCHEMA='u676472791_magicreview_db' ORDER BY TABLE_NAME;
SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE,ACTION_TIMING,EVENT_MANIPULATION,DEFINER
 FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA='u676472791_magicreview_db' ORDER BY TRIGGER_NAME;
SELECT COUNT(*) AS channels FROM industry_channels;
SELECT COUNT(*) AS roles FROM roles;
SELECT COUNT(*) AS permissions FROM permissions;
SELECT COUNT(*) AS role_permissions FROM role_permissions;
```

Expected this release: ledger85, first000000,last000084, applied85 only, no incomplete
rows, base tables32, triggers46; initial safe seeds channels3/roles5/permissions16/
role-permissions55. No administrator, tenant, plan price or customer seeded.
Metadata visibility can hide objects under insufficient grants; absence is not
proof without privilege review. Table/seed counts do not establish definition correctness.

Separately provision exact runtime privileges per src/migrations/privileges.ts.
Create a private runtime target policy pinning its own CURRENT_USER(); include the
reviewed migration trigger definer in allowedTriggerDefiners where relevant. The
runtime checker needs MIGRATION_DB_USER/PASSWORD temporarily set to the **runtime**
credentials in a separate protected shell; it has no DB_USER fallback:

```bash
read -r -p 'Reviewed private runtime target policy path: ' REVO_RUNTIME_TARGET
node dist/migrations/operator-cli.js check-runtime \
  --target "$REVO_RUNTIME_TARGET" --environment production
```

This check is read-only target/grant verification, not full protected trigger-body
inspection. `verified:true` does not mean TLS; HOSTINGER_LOCAL reports encrypted:false.
Never expose migration credentials to the normal app. Do not blindly revoke/drop
the migration definer account: live triggers can depend on its retained privileges.

## 9. Partial failure and recovery

On any failure, keep traffic/writers closed, stop automated retries and preserve
source, exact SQL/verifications, manifest, audit/preflight/ledger, query state and
backup. Do not rerun blindly, import SQL manually, delete ledger rows, edit old
checksums, disable FK/CHECKs or mark entries applied to get past the error.

SIGINT/SIGTERM requests a stop at a verified boundary; force-kill/connection loss
can leave applying or already committed DDL. An authorized DBA, using the same lock,
must establish whether the operation never ran, completed, remains active or left
partial state. Rehearse minimum additive forward repair on a restored clone,
preserving original constraints and postconditions. Exceptional conditional ledger
reconciliation needs independent approval and exact original checksum/state proof;
no automatic repair command exists. If correctness cannot be established, use the
approved restore plan and matching keys under a separate restoration authorization.
Even a previously empty DB is not permission to DROP production schema.
Fresh successful preflight/new audit/approval is required before continuation.

## 10. First Super Admin bootstrap (separate mutating approval)

Only after successful complete migrations, schema verification, account/grant review
and resolution of the exposed MFA key. Bootstrap creates root/user/membership/audit
transactionally, under the same advisory lock. It cannot reset an existing password
or add another root. Identical existing identity/name returns created:false without
overwriting; conflicting/partial identity stores refuse. No login session is issued.

Use a separate bootstrap account: schema SELECT including ledger/full metadata;
INSERT on tenants, users, tenant_memberships, audit_logs; no UPDATE/DELETE/DDL/global
grants needed. Metadata/trigger-definer capability must be rehearsed; phpMyAdmin
success does not prove bootstrap grants. Provide these only in the operator process:

```bash
read -r -p 'Approved bootstrap DB username: ' BOOTSTRAP_DB_USER
read -r -s -p 'Bootstrap DB password: ' BOOTSTRAP_DB_PASSWORD
printf '\n'
export BOOTSTRAP_DB_USER BOOTSTRAP_DB_PASSWORD
export BOOTSTRAP_PLATFORM_NAME='MagicReviewAI'
export BOOTSTRAP_OWNER_EMAIL='rxadmin@revexoe.com'
read -r -p 'Owner display name: ' BOOTSTRAP_OWNER_NAME
read -r -s -p 'NEW private owner password (16-128 chars, >=10 distinct): ' BOOTSTRAP_OWNER_PASSWORD
printf '\n'
export BOOTSTRAP_OWNER_NAME BOOTSTRAP_OWNER_PASSWORD
read -r -p 'Verified bootstrap CURRENT_USER(): ' REVO_BOOTSTRAP_ACCOUNT
export REVO_BOOTSTRAP_ACCOUNT
```

Create its own normalized policy, not the migration-account identity:

```bash
node --input-type=module <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
import {targetPolicy,operatorTransport} from './dist/migrations/operator.js';
const root=process.env.REVO_RUN_DIR;
const policy=targetPolicy.parse({...JSON.parse(readFileSync(root+'/migration-target.json','utf8')),
 expectedAccount:process.env.REVO_BOOTSTRAP_ACCOUNT});
operatorTransport(policy,{acknowledgement:process.env.HOSTINGER_LOCAL_APPROVAL,
 approvalId:process.env.HOSTINGER_LOCAL_APPROVAL_ID});
writeFileSync(root+'/bootstrap-target.json',JSON.stringify(policy)+'\n',{flag:'wx',mode:0o600});
NODE
```

After reviewer accepts bootstrap target and identity, calculate canonical hash and
execute the approved bootstrap (not a raw JSON-file checksum):

```bash
REVO_BOOTSTRAP_DIGEST=$(node --input-type=module -e \
 'import {readFileSync} from "node:fs"; import {targetPolicy} from "./dist/migrations/operator.js"; import {digest} from "./dist/migrations/schema.js"; const p=targetPolicy.parse(JSON.parse(readFileSync(process.env.REVO_RUN_DIR+"/bootstrap-target.json","utf8"))); process.stdout.write(digest(p))') || exit 1

node dist/setup/cli.js \
  --target "$REVO_RUN_DIR/bootstrap-target.json" \
  --environment production \
  --approve "BOOTSTRAP:$REVO_BOOTSTRAP_DIGEST"
```

Expect exit0 and initialized:true,created:true on a fresh store. No blind repeat on
generic failure: inspect ledger/schema/permissions/input privately; don't dump env
or password/hash data. Read-only verification:

```sql
SELECT COUNT(*) AS platform_roots FROM tenants WHERE platform_slot=1;
SELECT COUNT(*) AS initial_super_admins
 FROM users u JOIN tenant_memberships m ON m.user_id=u.id
 JOIN roles r ON r.id=m.role_id AND r.tenant_kind=m.tenant_kind
 WHERE u.email='rxadmin@revexoe.com' AND u.status='active'
 AND m.status='active' AND m.tenant_kind='platform' AND r.code='super_admin';
SELECT COUNT(*) AS bootstrap_audits FROM audit_logs WHERE action='platform.bootstrapped';
```

Fresh expected counts 1/1/1; never SELECT password_hash or MFA ciphertext for sharing.
Clear operator credentials from shell memory when no longer needed (or close the
private session); retain only protected review/audit artifacts per policy:

```bash
unset MIGRATION_DB_PASSWORD MIGRATION_DB_USER BOOTSTRAP_DB_PASSWORD BOOTSTRAP_DB_USER
unset BOOTSTRAP_OWNER_PASSWORD
```

After separately approved application runtime configuration/release, open
https://revexoe.com/login with the privately chosen credentials, enroll/verify MFA,
secure recovery codes and select Platform. BOOTSTRAP_* hPanel variables alone do
not create this account or guarantee SSH availability. Liveness/readiness only
prove their narrow contracts, not administrator setup or whole-product readiness.

## Current review outcome

Artifact ordering/checksums/ZIP locally verified. Actual Hostinger backend runtime
path/Node access, verified migration/bootstrap account identities and exact grants,
accepted backup/restore evidence, finalized production transport approval and MFA
remediation are still required. Commands are parameterized through real-input
prompts; no fake IDs, credentials, hashes or paths were supplied. No command in this
document was executed against Hostinger and no migration success is claimed.
