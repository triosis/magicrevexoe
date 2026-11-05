# Production migration operator runbook - Task 17

Prepared 2026-11-05; tested only on disposable MariaDB 11.8.9. This document is
not production authorization. No Hostinger connection, production migration,
production settings change or production credential collection occurred.

## Release prerequisites

Obtain separate DBA/security/release approval, a named operator/reviewer, change
identifier, maintenance window, rollback-of-code compatibility plan, protected
backup and successful isolated restore rehearsal. Preserve MFA encryption keys
with the independently protected key-recovery process. Never put credentials,
dumps, secret values or live target policies in the repository or chat.

Freeze other schema writers. Pause application writes for the approved maintenance
window; GET_LOCK coordinates cooperating migration clients, not arbitrary SQL or
application transactions. Confirm single writable primary and session affinity.
Inventory actual data, constraints, definers and effective privileges separately.
An existing untracked schema is blocked, not automatically baselined or adopted.
Rehearse the exact artifact on an authorized restored staging clone first.

Review all SQL and verification files and the generated schema manifest in source
control. Existing 000000-000066 files and their checksums remain immutable.
The new operator workflow is separate from the preserved local-only legacy CLI.
Never tunnel production through loopback or change that CLI's guard.

## Target policy and credential separation

The operator CLI requires a private JSON target policy plus a matching explicit
--environment argument. No database/host defaults, dotenv or application DB_*
fallback exist. Credentials are injected through protected MIGRATION_DB_USER and
MIGRATION_DB_PASSWORD environment variables by the authorized operator's secret
mechanism, outside this workspace. The policy contains identity expectations,
not passwords. The connected DATABASE(), @@hostname and CURRENT_USER() must match.

| Policy field | Meaning |
| --- | --- |
| environment | local, staging or production; must match the command argument |
| host / port / database | Exact approved transport target and project schema; no wildcard hosts or DB name patterns |
| serverHostname | Expected server-reported @@hostname, established through approved inventory |
| expectedAccount | Exact expected CURRENT_USER() result for this account profile |
| allowedTriggerDefiners | Explicit reviewed legacy definer identities, if any; current migration account is automatically allowed |
| tlsCaFile | Protected trusted CA PEM path, relative to policy directory or absolute |
| tlsCaSha256 | SHA-256 of the exact PEM file bytes; binds trust configuration to approval |

Staging/production policies require both TLS fields. mysql2 uses certificate-chain
validation and verifyIdentity=true; no verification-disable option exists. The
session must report a nonempty TLS cipher. This transport is implemented for the
migration CLI only; application runtime TLS remains a separate blocker. No real
remote TLS handshake or provider topology was verified in this task.

Local policies must select loopback and a magicreview_migration_* disposable name.
The tests construct them for their own server. Do not copy a test policy into
production or reuse fixture identities. Use the privilege matrix for independently
provisioned migration and runtime accounts; the CLI never grants/revokes privileges.

## Non-mutating preflight

Commands below describe an approved operator environment, not commands executed
against production here. Replace metasyntactic paths only after review:

```text
npm.cmd --prefix backend run migrate:operator -- preflight --target <PRIVATE_POLICY_JSON> --environment <EXPLICIT_ENVIRONMENT> --report <NEW_PREFLIGHT_JSON>
```

--report creates a new UTF-8 file exclusively; it never overwrites an artifact.
Use it instead of shell redirection that may add UTF-16/BOM or npm build output.
Apply the operator's filesystem ACL policy; Unix mode 0600 alone is not a Windows
ACL guarantee. Preflight writes no database objects, seed data, audit rows or
ledger rows. Its named lock and session settings are transient server state.

Preflight checks version/settings, target/account identity, current effective
grant representation, exclusive named-lock acquisition, exact ledger shape,
history prefix/checksums/completion, applied-prefix schema fingerprints and
trigger-definer approval. Its report includes initialized/applied/pending state,
target/manifest fingerprints and an approval digest expiring in fifteen minutes.
The digest binds the complete manifest, current shape, identity, privileges and
target policy. It contains no password, authentication hash or raw grant listing.

Supported privileges are explicit direct grants, with only global USAGE. Active
roles, role-grant syntax, PUBLIC grants, wildcard database grants, unrelated
schemas, column/routine/proxy grants, grant option and excessive privileges stop
the workflow rather than being silently approximated. Resolve provider limitations
through review; do not bypass the checker. See the privilege matrix.

**Preflight is not a dry-run execution or a guarantee of future success.** It does
not run pending DDL, prove data compatibility, exercise future triggers, estimate
table-copy time, lock all application data, restore backups or validate provider
quotas. Data/privileges/provider state may change after inspection.

## Explicit execution and audit

Review the preflight artifact, exact release source, pending versions, operational
approvals and backup evidence. The following requires explicit operator action:

```text
npm.cmd --prefix backend run migrate:operator -- apply --target <PRIVATE_POLICY_JSON> --environment <EXPLICIT_ENVIRONMENT> --approval <PREFLIGHT_JSON> --audit <NEW_AUDIT_JSONL>
```

For production, also pass:

```text
--confirm-production APPLY-PRODUCTION:<PREFLIGHT_TARGET_FINGERPRINT>
```

The exact phrase and target fingerprint are required in both CLI and execution
core. Tests exercise rejection without connecting to a production target.
No interactive yes/default selection or automatic production mode exists.

Apply reacquires the same database-scoped named lock on one dedicated connection
and redoes checks under that lock. An expired or changed approval stops before
DDL/ledger writes. A previous approval cannot authorize a different target,
manifest, privilege set, identity or applied prefix. Approval is an explicit
operator control, not a cryptographic signature or substitute for change governance.

The new audit file is opened exclusively, appended and fsynced for each event.
It records run ID/time/target fingerprint, approval digest, step starts/completions,
fixed failure codes and the final execution summary. It never prints SQL, raw
grants, authentication hashes, passwords or connection settings. Protect/export
it to the approved external audit store; a local file is not tamper-proof logging.

Each migration retains durable applying/applied/failed ledger states. Schema
fingerprints are checked after every statement before marking that step applied.
Named-lock ownership is checked before statements and again before success is
recorded. DDL may commit independently of the ledger. No reconnect-and-continue,
automatic repair, automatic rerun or destructive rollback exists.

Connect timeout is five seconds; advisory-lock wait is five seconds; metadata and
InnoDB row-lock waits are bounded to ten seconds on the migration session. These
are **not a wall-clock DDL timeout**. A table-copy/ALTER can run longer. Agree a
provider-supported statement/cutover budget and emergency observation procedure.
SIGINT/SIGTERM requests a stop at the next verified statement boundary; it does
not promise immediate DDL cancellation. A forced connection loss may leave
applying and a server operation that completed or is still completing. Do not
restart automatically. Tests kill a disposable applying connection and prove
the next run blocks on its durable incomplete entry.

## Post-migration and runtime handoff

Require a successful audit execution_completed event, no pending versions, all
67 ledger entries applied for this release and matching final schema fingerprint.
Run a new preflight, then verify the separately provisioned runtime identity:

```text
npm.cmd --prefix backend run migrate:operator -- check-runtime --target <RUNTIME_POLICY_JSON> --environment <EXPLICIT_ENVIRONMENT>
```

The runtime policy pins its own account. check-runtime is read-only privilege and
target inspection; it cannot inspect all protected trigger bodies and does not
claim schema verification. The migration identity performs structural verification.
Run authorized staging application negative/functional tests using runtime grants,
including MFA, tenant boundaries, immutable publication, quotas and append-only
history. Never put the migration identity in the application environment.

SELECT 1 readiness remains a connectivity check. It is not a schema release gate.
Keep application traffic closed until the complete manifest, operational evidence
and approved deployment sequence pass. Revoke unnecessary migration DDL/DML rights
outside maintenance through a separately authorized DBA procedure, while retaining
the definer privileges/accounts required by live triggers. Do not drop a definer
account or blindly revoke its TRIGGER/SELECT rights.

## Failure and forward recovery

1. Stop traffic/retries and other migration operators. Preserve the exact source,
   original checksums, preflight/audit artifacts, ledger state, server-side query
   state and backup evidence. A failed local audit write is also a stop condition.
2. With separately approved DBA access and the same named lock, determine whether
   the statement never ran, completed, remains active or left partial committed
   state. ROLLBACK cannot reverse committed MariaDB DDL. Never delete the ledger,
   rewrite checksums, blindly rerun CREATE/ALTER, disable constraints or use a
   destructive down migration to force a green result.
3. Rehearse a minimal additive forward repair in a restored disposable clone.
   Prove the original postcondition and exact approved schema/trigger invariants.
   Preserve data and failure evidence. If correctness cannot be established,
   restore the independently rehearsed backup using its matching keys/config.
4. An exceptional conditional reconciliation of an exact failed/applying ledger
   row requires independent approval and original checksum/identity evidence.
   No automatic mark-applied, baseline or repair command is supplied. Retain the
   historical failure separately instead of erasing it.
5. Obtain a fresh successful preflight and new approval before any subsequent
   migration. Resume only after the reviewer accepts evidence and the release
   window remains valid. Never generate a new manifest from live drift to accept it.

## Read-only Hostinger compatibility handoff

No checklist item below was executed on Hostinger. Authorized future inventory
must establish VERSION(), engine/charset/collation, strict SQL mode, FK/CHECK
flags, object/trigger definitions and definers, CURRENT_USER/CURRENT_ROLE and safe
private grant evidence; trusted CA/hostname, TLS cipher, session affinity, exact
host/schema and server identity; provider connection, execution and lock budgets.
An authorized disposable provider clone must prove InnoDB rollback, FK/CHECK and
generated-index enforcement, trigger creation/activation under restricted grants,
GET_LOCK ownership across DDL commits, interruption and recovery behavior.
Read-only queries cannot prove those write capabilities. No Hostinger support for
specific privileges, binary-log trigger policies or timeouts is assumed.

Local verification scheduling: use npm.cmd --prefix backend run test:integration
for all backend integration files, then run the real-stack E2E suite separately.
The aggregate schedules files sequentially to avoid overlapping Windows ZIP
initialization jobs. Quota and feedback suites still run their real concurrent
transactions/workers. See the safety report for the observed installer timeout.
