> **2026-11-10 implementation update:** The separate default-denied Cloud Startup
> profiles and disposable single-account/46-trigger/native-recovery rehearsal are
> now implemented locally. See [current implementation and persistent risks](HOSTINGER_CLOUD_STARTUP_IMPLEMENTATION.md),
> [test evidence](HOSTINGER_CLOUD_STARTUP_TEST_REPORT.md), and
> [exact trigger dependency map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.md).
> Analysis-only/unimplemented statements below describe the earlier snapshot.
> Production initialization remains NO-GO: genuine approvals, reduced Hostinger
> grants/definers, actual recovery and release evidence are not established.

# Hostinger Cloud Startup migration compatibility

2026-11-10. Analysis only. No source, SQL, grants, credentials, deployed files or
production data changed. No production connection or migration executed. No
privilege bypass implemented. Existing initial-migration runbook remains gated;
this report documents newly supplied constraints, not permission to skip its checks.

## Decision

**NO-GO for production initialization with the current operator and approval evidence.**

MariaDB11.8.9 and Node24 are compatible with the implemented migration artifact.
One database account is not an SQL-engine prohibition on initial creation. However,
the existing ALL-PRIVILEGES account is deliberately rejected by the migration and
runtime privilege verifiers. A reviewed, tightly bound initial-maintenance profile
could make initialization technically feasible. It would not solve the permanent
runtime/trigger-definer separation problem or prove that privileges can be reduced.

**Conditional feasibility:** proceed to a separately authorized local implementation
and disposable rehearsal only after scope/approval; production apply still requires
accepted recovery evidence, transport approval, exact target/grants and a demonstrated
post-maintenance security state. If Hostinger cannot reduce the account's grants,
the proposed *time-limited* exception is not achievable. A permanent ALL-PRIVILEGES
runtime requires a different explicit persistent-risk decision and is not recommended
as a minimal migration fix. Do not initialize first and discover that problem later.

## Evidence boundaries

Owner-confirmed hosting facts, not independently queried by this audit:

- Cloud Startup, not VPS; MariaDB11.8.9; DB u676472791_magicreview_db, loopback3306.
- One account per database; supplied account identity
  u676472791_magicrev_user@127.0.0.1 with ALL PRIVILEGES on the application database.
- SSH/Node24.22.1 work; deployed operator/manifest/85 migrations reportedly verified.
- Provider backup dated **2026-11-10 02:02 UTC (07:32 IST)** exists in hPanel.
- No remote database IP allowlist entries.

These supersede the earlier missing-Node assumption, but do not prove the exact
CURRENT_USER(), server @@hostname, SHOW GRANTS representation, metadata visibility,
transport namespace, restore validity or privilege-management capability. Confirm
the supplied account matches CURRENT_USER() through the intended TCP endpoint;
127.0.0.1 connect host does not alone establish MariaDB's matched account host.
No remote allowlist entries do not prove zero remote exposure: listener/firewall,
proxy and account-host matching remain distinct controls. No new remote access is
needed or recommended for this workflow.

Repository evidence reviewed: backend/src/migrations/{privileges,operator,
operator-cli,runner,schema}.ts; src/setup/{cli,bootstrap}.ts; src/config/
database-transport.ts; src/db/pool.ts and server.ts; migration trigger bodies;
backend/test/migration-safety.{test,integration}.mjs and hostinger-local.integration.mjs;
backend/scripts/recovery/{cli,utility}.mjs; production-migration-runbook.md and
HOSTINGER_INITIAL_DATABASE_MIGRATION_RUNBOOK.md. Earlier local verification checked
85 ordered migrations, 84 verification files, matching combined checksums/manifest
and byte-matching handoff ZIP. Expected final artifact remains 32 tables/46 triggers.

## Current architecture: compatibility table

| Requirement | Current implementation / consequence on this plan |
| --- | --- |
| Migration privileges | Schema SELECT/CREATE/ALTER/TRIGGER and narrowly table-scoped seed/ledger writes. Reject ALL PRIVILEGES/excessive DML, global elevation, GRANT OPTION, unsupported roles/PUBLIC/column/routine grants, other schemas and wildcard schema patterns. Existing account fails. |
| Schema name | Contains underscores; schema grants use pattern semantics. Escaped literal matching must be reviewed; do not simply compare a string or accept a wildcard grant as exact-target isolation. ALL alone is not the only possible rejection. |
| Runtime privileges | Exact per-table runtimePrivileges map; no schema-wide grants, no TRIGGER, no DDL or ledger SELECT/write. Existing account fails check-runtime. |
| Actual API startup | createDatabasePool does not invoke verifyPrivileges. An API could listen/connect with ALL PRIVILEGES without passing check-runtime. That is not proof of approved runtime security; deployment must enforce the review gate. |
| Bootstrap | CLI pins exact target and canonical policy hash; full ledger/manifest/schema, named lock, transaction/root safeguards, Argon2id and MFA on later login remain. It does not separately enforce the documented minimum bootstrap grant profile. One account can technically execute it after migrations, but account separation guidance would need explicit exception, not false claims of least privilege. |
| Target policy | Strict parser has no privilege-exception field/profile/window. Any invented field currently refuses. Pins environment, host/port/schema, @@hostname, CURRENT_USER and transport. No built-in elevated initial-only mode. |
| Transport | HOSTINGER_LOCAL requires exact127.0.0.1:3306, acknowledgement/reference and absence of CA fields; diagnostics report encrypted:false. No certificate identity or assumed isolation. Verified TLS remains default elsewhere. Privilege approval cannot substitute for transport approval. |
| Preflight/apply | Fresh15-minute approval bound to policy/identity/grants/schema/manifest/prefix; independent APPLY-PRODUCTION digest confirmation; lock reacquired/checks repeated. No broad privilege retry or alternative path. |
| Migration data safety | Immutable SQL/verification checksums; applying/applied/failed tracking and schema fingerprint at each step, exclusive/fsynced audit, no blind retry/reconnect or automatic repair. DDL may commit independently of ledger. |
| Recovery tools | Shipped recovery executor accepts disposable local-policy targets, not this production target. Do not relabel production as local to run it. Provider backup/manual authorized recovery must be documented/rehearsed, or a separate recovery feature approved. |

## Single-account trigger-definer problem

Migration SQL uses CREATE TRIGGER without a separate DEFINER, so the executing
account becomes definer. With only one account, the runtime and trigger definer
are the same database principal. Process labels MIGRATION_DB_USER and DB_USER do
not create separate database identities or different effective grants.

MariaDB's [CREATE TRIGGER reference](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/create-trigger)
defines the activation security context through the definer. Its
[GRANT reference](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant)
states that the defining account needs TRIGGER on the table for trigger execution.
Column references and body queries also require the relevant access. Accordingly,
revoking TRIGGER from the sole definer is not a safe generic reduction procedure.

Retaining table-level TRIGGER for the definer also gives the running API account
trigger-management capability on those tables. Even after removing broad ALTER/
CREATE/DROP/schema DML, a compromised application credential may weaken/replace
trigger protections. This is a **persistent** exception, not solved by a one-hour
maintenance window. Current runtime verifier correctly forbids this privilege.
Never describe this reduced shared account as equivalent to the separate restricted
runtime account tested today.

The old tests demonstrate runtime DML without TRIGGER using a **different** migration
definer. They do not establish that the same runtime identity can lose its own
TRIGGER privileges and preserve all protections. All 46 triggers, their subject
tables, OLD/NEW usage, cross-table SELECTs and active operations need a reviewed
privilege dependency map and disposable grant-transition tests.

## Options and minimum recommended design

| Option | Assessment |
| --- | --- |
| Keep existing operator unchanged | NO-GO with current ALL account; it intentionally refuses. |
| One identity, provider changes grants by phase | Potentially feasible for initial maintenance. Provider must demonstrate grant control independently of application credentials; a runtime-plus-definer exception or provider-managed definer is still needed. |
| Provider retains a separate non-customer definer identity | Ask support whether this is permitted despite one customer user. Not assumed available. Would require approved trigger creation/definer/artifact strategy and manifest compatibility; do not edit historical migrations or copy a trigger user blindly. |
| Exact runtime map plus minimum table TRIGGER/required SELECT under same identity | Conditional reduced steady state, **not current strict runtime profile**. Removes broad DDL/DELETE/ledger writes where possible but retains trigger-tampering risk; needs separate enduring approval, validator design and tests. |
| Leave ALL permanently; merely suppress verifier | Not recommended. No effective time limitation, loss of ledger/audit/immutability trust under credential compromise, arbitrary schema destruction capability. Separate persistent-risk proposal required; not covered by initial-migration approval. |
| Raw phpMyAdmin import/rename production local/disable validation | Reject: bypasses runner/recovery/target/grant controls rather than resolving incompatibility. |

Recommended conditional path: first obtain provider proof of grant changes and
agree the accepted final identity/definer model. Then implement an **additional,
default-denied** initial-maintenance privilege profile, leaving all default profiles
unchanged. Also implement an explicit post-maintenance profile only if the owner
accepts the minimum shared-definer residual risk. No implementation in this task.

### Proposed initial-maintenance exception contract (not existing config)

1. Separate signed/reviewed security change record: approved account/endpoint/schema,
   release and manifest fingerprint, exact reviewed grant fingerprint/allowlist,
   genuine approval reference, named operator/reviewer, backup/rehearsal evidence,
   startsAt/expiresAt and intended final privilege profile. No fake default ID.
2. Bind exception to production HOSTINGER_LOCAL127.0.0.1:3306, this exact schema
   and actual matched account/hostname, expected empty object inventory and initial
   bootstrap state. Optional policy fields have no defaults so existing policy
   fingerprints/behavior remain stable. Unknown/partial/stray fields reject.
3. Accept only reviewed exact-schema grants/explicit bounded privileges. Handle an
   ALL PRIVILEGES token only under the new exact version-specific reviewed profile,
   never as a universal wildcard; global/admin/GRANT OPTION/roles/PUBLIC/other-schema/
   pattern-derived broader access still reject. If actual Hostinger grant patterns
   are broader than the approved target, stop for separate design/approval.
4. Restrict to initial creation (empty target at preflight/apply entry), not an
   upgrade/repair/normal runtime option. Do not accept exception merely because
   ledger is absent if views/tables/triggers/routines/events already exist. Record
   canonical policy/profile/grant/manifest fingerprints in approval and audit.
5. Keep existing15-minute preflight expiry; effective new-step authorization ends
   at the earlier preflight/exception deadline. Check window before connect,
   preflight/apply approval and each next statement boundary. Reject changed grants,
   expired reference/window, uninitialized artifact mismatch or missing independent
   production confirmation. Never automatically retry through strict rejection.
6. Audit elevated mode/reference/window/operator evidence and normalized grant
   fingerprint, not raw SHOW GRANTS/password/hash/private backup. Preserve fsync,
   exclusive new audit files, exact target/version/schema validation and locks.
7. Bootstrap is a separately approved narrow step after successful complete ledger,
   schema and transport verification. It may use the same actual account during
   the authorized window; change documentation and audit to disclose that fact.
   Root/user/membership/audit transactions and password/MFA controls stay unchanged.
8. Exception expiry stops this tool starting further work; it does **not** revoke
   server grants, stop an already-running DDL or constrain stolen credentials.
   Provider-controlled reduction, connection draining and fail-closed release
   verification are mandatory. A timestamp field alone is not time-limited SQL power.

## Post-maintenance reduction and handoff (conditional proposal)

No GRANT/REVOKE statements are authorized or issued here. Ask Hostinger who can
change privileges, whether hPanel overwrites them, and whether changes persist on
restart/account reassignment. ALL PRIVILEGES without GRANT OPTION does not by itself
give the account authority to manage its own grants. Never solve this by adding
GRANT OPTION to application credentials.

1. Keep the API/workers stopped or isolated throughout elevated maintenance; same
   account means an already-running app receives the same broad permissions.
   Confirm real provider process control, not a cosmetic UI maintenance message.
2. Complete structural verification and separately approved initial bootstrap while
   grant/metadata requirements are satisfied. Securely preserve artifacts/evidence.
3. Provider reduces broad schema/global privileges through its authorized control
   plane to the reviewed final per-table map. Remove unnecessary CREATE/ALTER/DROP,
   DELETE, routines/events/view/file/admin/ledger writes and blanket schema DML.
   Retain required SELECT/INSERT/UPDATE only plus explicitly proven definer needs.
   Do not assume every member of schema ALL can be blindly revoked without effect.
4. Preserve every trigger's definer account/required activation privileges. With
   shared identity this likely retains table TRIGGER and necessary SELECT; document
   the full permanent capability, including possible trigger replacement. If owner
   declines that residual risk and provider cannot supply another definer, NO-GO.
5. Drain/close all existing connections/pools, reconnect, inspect actual grants and
   test them with the new approved verifier. Privilege changes have scope/session
   effects; a new shell or readiness SELECT1 alone does not prove all old sessions
   lost rights. Provider must confirm how lingering/active sessions are handled.
6. Before customer traffic, rehearse all normal/invalid trigger paths, auth/MFA,
   quotas/publication/append-only and tenant boundaries on a representative isolated
   target with that exact reduced account. Verify schema definitions and no ledger
   write/forbidden broad DDL rights, while explicitly acknowledging retained TRIGGER.
7. During production handoff use fresh read-only grant/identity/manifest evidence
   available under approved operator elevation, then release gate. Runtime may
   lack full metadata/ledger SELECT; do not add those permanently merely to make
   operator preflight pass. Future schema changes need another maintenance window
   and provider re-elevation; initial-only exception cannot be reused as an upgrade.
8. Keep elevated/normal commands outside startup. Clear operator secret copies,
   preserve existing credentials/keys, do not automatically rotate passwords.
   Provider-completed privilege reduction must have audit/approval evidence.

If Hostinger cannot do this reduction, a time-limited migration exception would
leave a permanent overprivileged app. Keep production initialization NO-GO pending
a separately reviewed hosting/security decision; do not present it as a transient fix.

## Recovery evidence and approval gates

The reported02:02UTC provider backup is evidence of a listed snapshot, not a verified
restore. Establish snapshot completion/scope and target, base-table and other-object
state at that time, schema defaults, accounts/grants/definers inclusion, preservation
of encryption keys separately, retention/download/offsite controls and changes since
snapshot. If it predates an important state, approve additional capture before work.

Rehearse restore into a separate isolated target without touching production;
verify exact object/schema/trigger/definer and row state, grant reduction, account
mapping, lock/session behavior and application startup/MFA. For empty target,
verify restoration of empty state/schema plus a separate full migration rehearsal.
Specify responsible restorer, RPO/RTO, maintenance window and approval for any actual
restore. One-account-per-database does not prove a disposable test DB can be created;
support must confirm an isolated rehearsal environment/recovery route. Existing
disposable-only recovery CLI is not a production-restoration tool.

On migration failure: preserve applying/failed state and original checksums, audit,
server-side state and backup; stop all retries. Check committed/in-flight DDL under
approved operator access; test additive forward repair/reconciliation on restored
clone. No delete-ledger/mark-applied/disable-checks/automatic baseline/force rollback.
Fresh explicit approval required for repair/restore and continuation. Expiry may
leave an incomplete migration requiring separate recovery authorization; never
extend it automatically to finish. Keep API closed until accepted reduced state.

## Precise local implementation plan, only if explicitly approved later

| Stage / files | Minimal intended change and evidence |
| --- | --- |
| 0 Decisions/support, report and runbooks | Final grant-transition/definer model, privilege+transport approval records and verified recovery before designing an executable exception. No code needed to establish facts. |
| 1 backend/src/migrations/privileges.ts | Add separate strict initial-maintenance grant interpreter/profile and, only if approved, a distinct shared-definer runtime profile. Keep existing migration/runtime maps and rejection tests unchanged. Reject unknown privilege syntax/global/other schemas/pattern ambiguity. |
| 2 backend/src/migrations/operator.ts | Strict optional exception schema, real reference and bounds/fingerprints, empty-initial-only validation, bound preflight/15-minute/window checks and explicit audit metadata; no default profile switch. |
| 3 backend/src/migrations/operator-cli.ts and runner.ts | Propagate approved context explicitly; runner boundary callback for window validation if needed, preserving SQL/checksum/postcondition/lock/failure semantics. Do not import a broad environment toggle or allow fallback. Scope check-runtime to explicitly approved new final profile, never reuse elevated profile. |
| 4 backend/src/setup/cli.ts / bootstrap.ts | Explicitly record approved shared-account bootstrap operation/window without changing complete-history/schema/root/idempotency/MFA rules. Add privilege/window enforcement for this path if exception requires it; no current automatic grant verifier is assumed. |
| 5 backend/test/migration-safety.test.mjs, migration-safety.integration.mjs, hostinger-local.test.mjs, hostinger-local.integration.mjs; proposed shared-account.integration.mjs | Pure negative tests for absent/expired/future/mismatched approvals/profile/grants/window/target; exact empty-only behavior; real MariaDB ALL-account preflight/apply; grant change invalidates artifact; same-account bootstrap; reduced grants+definer transition; all triggers exercised, drift/interruption/DDL-commit/lock loss/audit failure; expiry cannot authorize another statement or runtime broad access. |
| 6 backend/docs/production-migration-runbook.md, task-21-workflows.md, privilege/security docs and initial Hostinger runbook | Separate initial, bootstrap, final-reduced and future-maintenance phases, exact reviewer artifacts and provider handoff; do not publish bypass commands before approved design/rehearsal. |

No migration SQL/verification file or checksum/manifest change is expected merely
for a grant-policy extension. If provider-managed definers require changing actual
schema definitions, stop for separate artifact/manifest design approval; cannot
claim checksums and object fingerprints stay unchanged automatically. No API
RBAC/tenant/auth/MFA/compliance/billing hold modifications are necessary for this task.

Acceptance must include the final credential's actual granted capability, not only
that a grant parser now returns success. Test explicit denial of schema destruction/
ledger writes where removed, plus truthful residual TRIGGER risk. Existing default
profiles and verified TLS behavior must retain all negative regression cases.
Rerun full backend/integration/startup/build/typecheck/lint before release; no new
feature tests or production grant changes were executed for this analysis.

## Owner/support approvals still needed

1. **Provider capability record:** can this single account be reduced/re-elevated
   at schema/table level, by whom, persisted how, without extra grant authority in
   the API? Can support maintain a separate definer principal? Exact normalized
   SHOW GRANTS/role/PUBLIC/pattern/identity review and privilege dependency evidence.
2. **Transport approval:** finalized genuine HOSTINGER_LOCAL exception, acknowledged
   unencrypted local routing/unknown isolation and conditions/review date; independent
   of privilege approval. No remote access/allowlist change.
3. **Initial privilege exception approval:** exact artifact/account/target/grant
   scope/window/operator/reviewer, bootstrap authorization and fail-closed deadline;
   no authority for permanent ALL runtime or later upgrades.
4. **Steady-state security decision:** separate identities/provider definer, or
   explicitly approved reduced shared-definer risk. If unavoidable permanent ALL,
   separate enduring risk proposal; current recommendation NO-GO, not implicit consent.
5. **Backup/restore approval:** provider snapshot evidence, isolated restore/rehearsal,
   RPO/RTO/retention/custody and repair/restore responsibility; no empty-DB exemption.
6. **Maintenance/release approval:** isolate app processes while elevated, verify final
   grants/new sessions, release only after actual handoff evidence. MFA exposed-key
   remediation and existing authentication/financial holds remain independent gates.

## GO / NO-GO checklist

| Gate | Current result |
| --- | --- |
| Engine/runtime/artifact compatibility | Owner confirms MariaDB11.8.9/Node24.22.1/deployed artifact; local baseline supports these series. |
| Current strict operator accepts supplied account | **NO**; ALL/schema-wide privileges rejected. |
| Single-account initial-only exception implemented/tested/approved | **NO**; proposal only. |
| Confirmed privilege reduction and accepted trigger-definer final state | **UNKNOWN / BLOCKER**. |
| Genuine transport and initial+steady-state privilege approvals | **NOT ESTABLISHED**. |
| Listed backup restored/tested with accepted recovery procedure | **NOT ESTABLISHED**. |
| Safe production initialization today | **NO-GO**. |

Next safe action is obtain provider answers and explicit authorization for the
scoped local implementation/rehearsal plan. Do not run the previous apply/bootstrap
commands, disable inspectGrants or import the SQL to get past the rejection.
