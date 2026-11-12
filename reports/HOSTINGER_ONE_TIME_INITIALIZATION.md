# One-time Hostinger initialization job

2026-11-12. Local implementation only. Production remains NO-GO. No production
connection, settings change, migration, bootstrap, deployment, commit or push.

Subsequent local HTTP-dispatch work is documented in
[manual setup dispatch](HOSTINGER_MANUAL_SETUP_HTTP.md). The fingerprint/results
below describe this earlier CLI-only revision; use the later report's exact
artifact evidence for the updated release. Neither report authorizes production.

## What changed

Added an explicit one-action job entry point, `backend/dist/setup/job-cli.js`,
invoked through `npm run initialize:job -- --job <absolute-private-job-file>` from
the backend. This is a command shape, not a paste-ready production command. The
actual private paths, policies, evidence and execution mechanism are not known.
There is no HTTP setup endpoint, automatic startup migration, default password,
manual user insert, new authentication table or removal of Argon2id hashing.
Existing password-only owner policy remains scoped to rxadmin@revexoe.com.

Each invocation performs exactly one action: preflight, apply, verify-complete,
bootstrap or check-runtime. It delegates to the existing guarded CLI. The operator
continues to verify target identity, transport, grants, schema, immutable migration
checksums, advisory locks, preflight expiry and audit integrity. Hostinger wildcard
and transport approval policies are unchanged. No SQL/manifest changes.

The job strictly parses its configuration, checks the installed compiled release
fingerprint, requires explicit action/target confirmation and operator/recovery
references, and refuses an unrelated wildcard approval reference. Syntax alone is
not proof of genuine authorization or tested recovery. The child receives only
necessary operator inputs and selected OS variables; no dotenv/API DB fallback.
It does not print child output, credentials, passwords, grants or hashes.

## Required reviewed job file

Create this JSON privately using real reviewed values, never placeholder approval
IDs. It contains no passwords:

| Field | Required content |
| --- | --- |
| action | One supported action listed above |
| targetFile | Absolute path to the existing reviewed target policy JSON |
| stateDirectory | Existing private persistent operator directory, outside the backend release, hbuilds and public directories |
| releaseFingerprint | Current `wildcardReleaseFingerprint()` result for the approved compiled artifact |
| operatorReference | Genuine operator/change record, existing reference syntax |
| recoveryReference | Genuine accepted backup/restore evidence record |
| confirmation | `INITIALIZE:` + action + `:` + `digest(targetPolicy.parse(policy))` |

POSIX state permissions must deny group/other access. On Windows the test harness
uses disposable directories; Windows production ACL assurance is not claimed.
Resolve protected parent ownership/mounts and deployment UID/ACLs independently.
Do not put operator state in a release, frontend/static directory or Git.

`preflight` writes exclusive `preflight.json`. `apply` consumes that exact report
and writes exclusive `apply.jsonl`; the original 15-minute approval still applies.
Mutating jobs reserve `apply.started.json` or `bootstrap.started.json` **before**
launch, whether the child later succeeds or fails. Each success writes an exclusive
action `.completed.json`. An exclusive `job.lock` prevents concurrent invocations.
These files are local operational safeguards, not security approval records or a
substitute for the database ledger/locks. All artifacts require protected custody.

An interruption/crash may leave a lock/marker or committed DDL. Stop and preserve
everything. Do not delete markers/ledger rows, switch directories to retry, rerun
builds automatically, or assume a missing completion file means no mutation.
Use the existing independently authorized recovery review. There is no automatic
retry, repair, cleanup of failed state or grant change.

## Protected inputs

Migration/verification jobs use MIGRATION_DB_USER and MIGRATION_DB_PASSWORD.
Bootstrap uses BOOTSTRAP_DB_USER, BOOTSTRAP_DB_PASSWORD, BOOTSTRAP_PLATFORM_NAME,
BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_OWNER_NAME and BOOTSTRAP_OWNER_PASSWORD.
The actual bootstrap schema validates 16–128 characters and >=10 distinct
characters. Use masked interactive input where supported, or an explicitly
approved protected one-time secret injection mechanism; never command arguments,
source, reports or build-log interpolation. Normal API runtime must not retain
bootstrap/migration authority or the owner's plaintext password. Clear job secrets
after their independently authorized use. No real secret was generated here.

Existing transport/privilege paths may additionally require HOSTINGER_LOCAL_APPROVAL,
HOSTINGER_LOCAL_APPROVAL_ID, HOSTINGER_WILDCARD_APPROVAL_ID or
CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID. These are not created by the wrapper.
Production password-only API login still requires the separately reviewed
AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL=rxadmin@revexoe.com and valid authentication
keys; the setup job does not configure API runtime or rotate keys.

## Hostinger execution sequence requiring separate approval

1. Have Hostinger confirm a supported managed **one-time operator job** for
   api.revexoe.com, DB namespace/access, persistent private artifacts, protected
   inputs, exit handling and absence of automatic retry. SSH has no supported
   Node runtime. Merely adding an npm script does not supply one.
2. Resolve genuine unencrypted-loopback/wildcard/shared-definer risk approvals,
   exposed MFA candidate handling, backup capture and isolated restore acceptance.
   Confirm the exact target/account/version/grants and current empty inventory.
3. Review/test/deploy the new exact compiled release only under separate release
   approval. Recalculate/review fingerprints; old fingerprints are invalid after
   adding these compiled files. Do not regenerate a manifest to conceal drift.
4. Keep business traffic closed during maintenance. Run preflight only with its
   explicit job file; retrieve and review private report and recovery evidence.
5. Under separate production apply authorization, execute only the apply action
   before preflight expires. It retains explicit target confirmation and audit.
6. Prepare the existing separately reviewed `verify` phase wildcard policy and run
   verify-complete. Confirm 85 applied migrations, 32 tables, 46 triggers, exact
   manifest and definers. Counts alone are insufficient.
7. Prepare the existing separately approved bootstrap policy and run bootstrap once
   with a new privately chosen strong password. Exactly one root/owner is enforced
   by the original CLI, not by manually inserting credentials.
8. Provider/operator reduces permissions under separate authority to the approved
   SELECT/INSERT/UPDATE/TRIGGER state. Reconnect, use the reviewed runtime policy
   and check-runtime job. Shared trigger and wildcard risks remain permanent.
9. Remove job inputs from normal app runtime, complete release gates, then manually
   test https://revexoe.com/login -> /app, invalid passwords, logout and RBAC.

Never put initialize:job in normal start, build or prepare. A temporary managed
build-command invocation is **not approved by this report**: availability of Node
during build does not prove supported database access or persistent operator state.
If Hostinger cannot support these properties, initialization remains blocked. Do
not replace the controls with a public setup route or phpMyAdmin import.

## Files and verification

Changed: backend/package.json; backend/src/setup/job.ts;
backend/src/setup/job-cli.ts; backend/test/initialization-job.test.mjs;
backend/test/initialization-job.integration.mjs; this report.

Executed locally on Windows Node24.14.0 with harness-owned MariaDB11.8.9:

- Backend unit tests: 100 passed, zero failures/skips/cancellations.
- New real CLI workflow integration test: passed, including preflight, 85 applied
  ledger entries, 46 triggers, guarded bootstrap, repeat refusal, wrong password
  rejection, password-only owner authentication and selected Super Admin role.
  Persisted job/policy/preflight/audit files were checked for synthetic credentials.
- Backend build and typecheck: passed. Root lint: passed.
- Offline loadMigrations/validateManifest: passed for 85 migrations. Historical
  SQL/verification/manifest unchanged; git diff --check passed.
- The first aggregate integration run had 237 passes and one new-test failure
  because COUNT returned numeric 0, not string '0'. Corrected the assertion without
  changing application behavior or any safeguard; focused rerun passed.
- Final full backend integration rerun: 238 passed, zero failures/skips/cancellations
  (201.7 seconds). Combined backend total: 338 passing cases including parent cases;
  repeated focused runs are not added to that count. No new browser or production
  verification is claimed.

Tested compiled release fingerprint:
`5fe8475ea1b3296a8d3da13f406e449b6dae23735440e43c82bb58fafb0db741`.
This is local artifact evidence, not a deployed fingerprint or authorization.
No production success or actual Hostinger job capability is claimed.
