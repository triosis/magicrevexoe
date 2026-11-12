# Hostinger cron initialization using MariaDB state

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
