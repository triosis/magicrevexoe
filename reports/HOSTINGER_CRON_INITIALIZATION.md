# Hostinger cron initialization using MariaDB state

## Confirmed first-trigger collation mismatch: scoped repair and resume

The owner supplied the actual trigger metadata and exact 411-byte body hash
`b9e73f8593dfb127b009824d13a93e5ab90659d61e29b9db5a43e180ea04aff4`.
The body matches the reference. Hosting created it with connection collation
`utf8mb4_unicode_ci`; the existing checked-in reference expects
`utf8mb4_uca1400_ai_ci`. SQL mode, client charset and database collation supplied
by the owner match. Earlier phpMyAdmin queries using DATABASE() selected
information_schema, explaining the misleading empty results.

Migration sessions now explicitly pin UTF-8 and the reference connection collation
with SET NAMES, as well as the reference SQL mode. No GLOBAL setting changes, SQL
file edits, checksum changes or relaxed schema comparisons are involved.

The diagnostic `migrationReview.firstTriggerCollationOnlyMismatch` compares the
complete actual schema to the original prefix manifest after substituting only
this one metadata field in memory. It is true only when that substitution makes
the entire prefix match. This is a read-only check, not a changed acceptance rule.

New explicit cron actions:

1. `repair-first-trigger`: requires the original failed apply marker/failure and
   no completed apply; exact 25-row history with 000000–000023 applied and 000024
   failed; unchanged names/checksums; one correctly owned trigger; zero users and
   tenants; and the complete prefix matching after only the known collation
   substitution. It takes the normal migration lock, audits prior state, uses
   atomic CREATE OR REPLACE with the exact original compiled trigger body and
   pinned session, verifies the full original prefix/postcondition, then reconciles
   that single failed row. Original failure_code and all previous control records
   remain. A single exclusive job marker blocks repeated attempts. Unrelated
   drift, changed owner/body, extra ledger rows or any unexpected state is refused.
2. `resume-preflight`: allowed only after completed repair for the same release.
   Reuses the existing operator, with the precisely verified prefix count 25 and
   one trigger instead of the initial empty-schema requirement. Produces a new
   15-minute preflight approval under its own immutable action records.
3. `resume-apply`: consumes that exact recent resume-preflight and completes only
   the remaining original migrations. Original apply markers are never reset or
   reused. New failures, interrupted actions and repeated attempts remain blocked.

All three use an initial-phase wildcard policy, current exact release fingerprint,
existing grant/manifest/identity checks and an action-specific INITIALIZE
confirmation. Each action must be explicitly selected and run separately. No
automatic retry/advancement or second production attempt was performed locally.
After resume, run the existing separately configured verify-complete and bootstrap
phases. Old apply/preflight JSON is stale after deploying these changes.

Deploy this revision and run --diagnose first, then prepare time-bounded repair
and resume jobs against its actual release fingerprint. Do not manually drop the
trigger, change ledger status or clear markers in phpMyAdmin.

Local validation: backend build, lint and 26 cases passed across migration unit,
cron unit/integration, recovery and migration-safety suites. The new recovery test
reproduces the reported trigger collation, refuses unrelated drift, preserves the
failed history, repairs exactly that trigger and resumes to all 85 migrations and
46 triggers matching the original full manifest. A further focused recovery/review
rerun validates the read-only collation-only candidate indicator. No production
repair, resume, administrator creation or login success is claimed.

## Failed first-trigger review and retained error numbers

The owner supplied evidence that apply stopped at migration 000024, with 000000
through 000023 applied, and that `protect_tenants_owner` is absent. Provider support
confirmed CREATE/TRIGGER privileges and binary logging disabled, but did not supply
the original SQL error. The original `EXECUTION_FAILED` record cannot recover that
lost error number. Do not infer a syntax, permission or DEFINER cause from it.

The read-only `--diagnose`/`--inspect` output now includes `migrationReview` when
the ledger exists. It checks all recorded migration names/order/checksums, counts
the applied prefix, identifies a single failed/applying tail, compares the actual
schema against both the applied prefix and failed-step manifest, and evaluates
the compiled SELECT-only failed-step postcondition. It does not execute migration
DDL, change ledger/state rows, clear markers, baseline, resume or repair anything.

Future migration driver errors retain only a bounded numeric errno such as
`DB_ERROR_1142` in the failed ledger and CLI output. Exception messages, SQL and
credentials are still discarded. This does not reconstruct the earlier lost error.

Deploy the review revision and run the existing read-only diagnostic command once.
Do not execute the old apply JSON or change any failed ledger row. The purpose is
to determine whether the partial schema exactly matches a known migration prefix
before designing any separately explicit repair/recovery action.

Validation: backend build, root lint and diff checks passed. Nineteen cases passed
across cron unit, real failed-trigger review and migration-safety suites. The review
fixture deliberately withholds TRIGGER to produce a known numeric error; this is
test setup only and is not a claim about the actual Hostinger failure's cause.
The failed ledger remains byte-for-byte unchanged after review and a normal
migration rerun remains refused. Historical migration/manifest bytes are unchanged.

## Strict migration sessions and reviewed failed preflight (November 13)

Owner-provided phpMyAdmin settings show InnoDB, utf8mb4_unicode_ci, FK/CHECK
enforcement enabled, and `NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION` SQL mode.
The missing strict mode would fail the earlier runner if the Node session has the
same defaults. The earlier stored generic failure does not independently prove its
original cause or the Node session's actual mode.

The runner now sets and verifies this migration-connection-only SQL mode after
validating server/version/engine/charset/collation/FK/CHECK settings:

```text
IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION
```

This is the existing reference manifest's mysql2 session mode, including its
IGNORE_SPACE flag. GLOBAL configuration, other websites' connections and normal
application pools are not changed. Migration SQL, checksums, schema manifest and
trigger definitions remain unchanged. Do not run SET GLOBAL on the hosting server.

The owner also provided a persisted failed `preflight.started` and `failure`, no
completed preflight, and later inspection showing zero application tables. There
is now one explicit reviewed preflight recovery input:

```env
INITIALIZATION_PREFLIGHT_REVIEW=OWNER_REVIEWED_FAILED_EMPTY_PREFLIGHT
```

It allows exactly one additional **read-only preflight** only when an earlier
preflight-started record and matching failure exist, no completed/reviewed preflight
exists, no apply/bootstrap-started record exists, and the selected application
database has zero tables. The target is reverified and the ordinary operator schema,
grant and locking checks still run. It inserts an exclusive `preflight.reviewed`
record preserving the prior attempt; it never deletes/updates old evidence. A
recurring second execution is refused. It never authorizes retrying apply or
bootstrap. Remove this temporary input after its one reviewed use.

Deploy this revision before using that input. First use `--diagnose` to obtain
the new deployed release fingerprint; old job JSON remains stale/possibly expired.
After preparing the new initial job, run preflight once and preserve its output.

Verification: backend build, root lint and diff checks passed. Twenty-four cases
passed across cron integration/unit, migration unit and migration-safety suites.
The cron fixture sets permissive GLOBAL defaults only on its harness-owned server,
preserves a synthetic old failed preflight, performs the explicitly reviewed check,
then applies all 85 migrations, verifies 46 triggers and the original full schema
manifest, and bootstraps the owner. GLOBAL mode remains permissive and unchanged by
the application runner. Old failure markers remain intact; repeat preflight and
apply remain blocked. No production setup or global SQL change was executed here.

## Read-only failure diagnosis (November 13 update)

The original fixed generic failure hid whether a job had expired, was malformed,
used missing credentials or mismatched references, or pinned an older release.
The CLI now emits an allowlisted safe error code and supports `--diagnose`.
Raw exception messages, SQL, grants and secret values are never printed.

After deploying this diagnostics revision, stop any mutating recurring cron and
run this read-only command instead:

```bash
/opt/alt/alt-nodejs24/root/bin/node --env-file=/home/u676472791/domains/api.revexoe.com/hbuilds/config/.env /home/u676472791/domains/api.revexoe.com/hbuilds/current/nodejs/dist/setup/cron-cli.js --diagnose
```

It reports actual inspection fingerprints and fixed boolean checks for JSON,
schema validity, policy window, release and confirmation matches, approval-ID
matches, required operator-input presence and a distinct control-database name.
It performs SELECT/SHOW only, does not enter the initializer, does not create
control tables or job markers, and does not retry a failed action. Delete the
recurring diagnostic job after capturing its output.

This source change changes the compiled release fingerprint. Previously prepared
job files must be reviewed against the new diagnostic output before any migration
attempt; do not merely rerun a stale job after deployment. Diagnostic output does
not independently prove state-database connectivity or absence of earlier writes.

Validation: backend build, root lint and diff whitespace checks passed. Four cron
unit cases plus the real disposable MariaDB integration case passed, including
allowlisted driver codes, suppression of raw errors, expired/malformed/valid job
diagnosis, secret suppression, and zero control-table creation during diagnostics.

## Original runner implementation

Local implementation, November 12, 2026. No production database connection,
initialization, deployment, push or account creation was performed here.

The owner's phpMyAdmin result confirms MariaDB 11.8.9 and database
`u676472791_magicreview_db`. Earlier support text saying 10.5 is superseded by
that direct result. No database version restriction was relaxed.

## What changed

`backend/dist/setup/cron-cli.js` executes one explicitly configured action in the
managed Node process. It calls the existing operator and bootstrap libraries,
preserving target identity, grants, transport policy, release/manifest fingerprints,
15-minute preflight approval, migration checksums, schema verification and advisory
locks. It does not run on startup or build, launch a child process, expose an HTTP
endpoint, or automatically advance phases.

The new entry point uses a **separate control database**, with a separate database
user, to hold `initialization_records`. It acquires a connection-scoped advisory
lock and durably inserts an exclusive `.started` record before every action.
Preflight results, completion records and append-only audit events persist in
InnoDB across reconnects and deployments. Existing state table column/index/engine
drift or triggers are refused. The application database's exact manifest remains
unchanged: 85 migrations, 32 application tables, 46 triggers. The control database
has one additional table outside that manifest.

Target state keys do not change when a policy window, account or compiled release
changes. The existing application migration lock also coordinates against the
older runner. Any attempted action, including failure or interruption, blocks
another attempt; absent completion is not evidence of absent DDL. Do not clear
records, change the control database or rerun automatically to bypass a failure.
Preserve both databases and review the actual ledger/schema/audit before recovery.

Bootstrap now awaits its final asynchronous authorization check before commit.
The file-based initializer and HTTP initializer retain their existing contracts.

## First deployment and read-only inspection

1. Push these changes and deploy the backend using its existing build command.
   Keep `dist/server.js` as the normal server entry point.
2. Confirm the API's existing database environment selects the application
   database/user. The current explicit local transport policy requires literal
   `127.0.0.1:3306`, `DB_TLS_MODE=HOSTINGER_LOCAL` and its existing explicit
   acknowledgement/reference. It does **not** silently accept `localhost`, remote
   plaintext, arbitrary proxy trust or missing transport configuration. Obtain
   provider confirmation of TCP loopback if necessary; do not disable validation.
3. In hPanel Advanced > Cron Jobs, use the following **read-only** inspection
   command with the managed paths supplied by Hostinger support:

```bash
/opt/alt/alt-nodejs24/root/bin/node --env-file=/home/u676472791/domains/api.revexoe.com/hbuilds/config/.env /home/u676472791/domains/api.revexoe.com/hbuilds/current/nodejs/dist/setup/cron-cli.js --inspect
```

This is 204 characters, within the 255-character limit stated by support. It
uses SELECT/SHOW only and does not require a control database or job JSON. It
reports selected database, server version/hostname/account, table count, and
grant/manifest/release fingerprints. It never prints database passwords, raw
grants, signing keys, password hashes or environment contents. Its grant inspection
currently expects the existing Hostinger initial wildcard privilege profile; an
unexpected grant fails rather than being accepted automatically.

Remove the scheduled inspection after retrieving its output. Hostinger cron is a
recurring scheduler; removal is a manual operator step, not a claimed one-shot
scheduling feature. The executable path and managed environment-file availability
still require confirmation through an actual run on this account.

## Prepare durable control storage

Create a separate empty MySQL database, for example `u676472791_initstate`, and a
separate user with access to that control database only. Keep the existing
application database and application user unchanged. Do not give the application
migration user extra control-database grants: existing exact grant inspection
would correctly reject them. Both pools connect to the same configured server
and transport, using independent credentials.

Set protected temporary inputs in the managed environment:

| Variable | Value |
| --- | --- |
| INITIALIZATION_STATE_DB_NAME | Actual separate control database name |
| INITIALIZATION_STATE_DB_USER | Actual control-only user |
| INITIALIZATION_STATE_DB_PASSWORD | Its private password |
| MIGRATION_DB_USER | Reviewed application migration/bootstrap user |
| MIGRATION_DB_PASSWORD | Its private password |
| INITIALIZATION_CRON_JOB | The single-action JSON described below |

The control runner requires CREATE, SELECT and INSERT on its own record table,
and metadata visibility. A separately managed control user avoids changing the
strict grants on the existing application user. Protect and back up control state
alongside application state: MariaDB durability is not an independent backup.
Existing backup/recovery and privilege/transport acceptance requirements remain.

## Job JSON and execution

`INITIALIZATION_CRON_JOB` is a JSON object with exactly these fields:

| Field | Required value |
| --- | --- |
| action | preflight, apply, verify-complete, bootstrap or check-runtime |
| policy | Existing complete `targetPolicy` JSON object, embedded instead of a file path |
| releaseFingerprint | Fingerprint of this exact deployed compiled release, from inspection |
| operatorReference | Actual operator/change record reference |
| recoveryReference | Actual accepted recovery evidence reference |
| confirmation | `INITIALIZE:` + action + `:` + digest of the parsed target policy |

Use the observed server hostname/account, actual inspected grant fingerprint,
manifest fingerprint and release fingerprint in the policy. The existing
`hostingerWildcard` policy still requires its phase, real references, bounded
authorization window and explicit risk acknowledgement. The top-level operator
and recovery references must match that policy. Do not copy historical release
fingerprints or invent evidence references. Prepare/review the final JSON after
the inspection result is available; a template containing placeholders is not an
executable production job.

`HOSTINGER_LOCAL_APPROVAL`, `HOSTINGER_LOCAL_APPROVAL_ID` and
`HOSTINGER_WILDCARD_APPROVAL_ID` remain required as applicable. No automatic grants,
transport downgrade or fingerprint acceptance occurs.

Configure the cron command below only after its single-action job has been reviewed:

```bash
/opt/alt/alt-nodejs24/root/bin/node --env-file=/home/u676472791/domains/api.revexoe.com/hbuilds/config/.env /home/u676472791/domains/api.revexoe.com/hbuilds/current/nodejs/dist/setup/cron-cli.js
```

This command is 194 characters. It uses absolute paths and works independently
of cron's working directory. No Node/npm command in the SSH PATH is required.

Execute phases explicitly, removing the cron schedule after each invocation:

1. **preflight**, initial policy. Review its `preflight.completed` control record.
   It does not create application tables; it creates control storage records only.
2. **apply**, exact same initial policy/release, before the original 15-minute
   preflight window expires. A changed policy or redeploy requires review, not
   silent recomputation. Do not redeploy between these two phases.
3. **verify-complete**, separately reviewed verify-phase policy. Review full
   manifest/history/trigger definitions, not just table counts.
4. **bootstrap**, separately reviewed bootstrap-phase policy. Supply protected
   `BOOTSTRAP_PLATFORM_NAME`, `BOOTSTRAP_OWNER_NAME`, `BOOTSTRAP_OWNER_PASSWORD`,
   and optionally `BOOTSTRAP_OWNER_EMAIL` (defaults to `rxadmin@revexoe.com`). The
   password must meet the existing 16–128 character/10-distinct-character rule.
   The earlier supplied 14-character login password cannot be used as bootstrap
   input. The earlier hardcoded server-side login credential is a separate feature;
   this change does not remove it, reset an existing account or bypass MFA.
5. Arrange separately reviewed permission reduction; then **check-runtime** with
   the runtime-phase policy and current runtime grants. Remove cron schedules and
   all temporary operator/bootstrap/control secrets from normal app configuration.
6. Retain application auth keys. Set the existing explicitly scoped
   `AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL=rxadmin@revexoe.com` only if that is the
   intended owner policy. Restart normally and verify login, role access, wrong
   password rejection and logout.

The process prints only action completion or a fixed generic failure. Inspect
private database records for details; no automatic retry follows a timeout or
disconnect. A provider timeout may leave committed DDL. Existing evidence gaps
about provider execution, backup/restore and runtime permission reduction are not
resolved by local test success.

## Local verification

Backend compilation, root lint, all 105 existing unit cases and three new cron unit
cases passed. The new real disposable
MariaDB 11.8.9 integration test passed the complete guarded migration, verification
and bootstrap flow, persistence after reconnect, duplicate/concurrent refusal,
failure-marker persistence, manifest integrity and absence of synthetic passwords
in control records. The integration also checks read-only inspection, control-table
drift rejection and rollback when the final asynchronous bootstrap authorization
fails. This is local evidence, not a claim of production login.
