# Task 17 migration implementation and safety report

2026-11-05. **Locally verified; production remains NOT READY.** No Hostinger
connection, production migration, production configuration/grant change or
production credential request/storage occurred. All database experiments used
new harness-owned loopback MariaDB **11.8.9** instances and ephemeral credentials.

## Audit findings and corrections

The existing migration foundation already enforced contiguous six-digit versions,
immutable SHA-256 source/verification checksums, strict ledger shape, durable
applying/applied/failed progress, a dedicated advisory-lock connection, incomplete
state rejection, one server statement per file, strict engine/settings checks,
postconditions and forward-only manual recovery. MariaDB DDL commits independently
of transaction rollback; a failed verification does not mean DDL was undone.

Identified gaps were full applied-object drift detection, effective account
privileges, explicit nonlocal target/approval controls and durable run-level
operator evidence. The legacy CLI's local guard was a deliberate safety boundary,
not a permission to evade it. Existing production schema/data compatibility was
and remains unknown; there is no automatic baseline/import/reconciliation path.

The new separate operator CLI supplies preflight, apply and check-runtime. It
requires a strict target-policy file and matching explicit environment. Connected
database/server/account identity is checked. Nonlocal transport requires a pinned
CA file, certificate-chain and hostname verification, and an encrypted session.
Apply requires an unexpired fifteen-minute preflight approval plus a fresh audit
file. Production additionally requires its exact target-bound confirmation phrase,
checked by both CLI and execution core before any connection/execution there.

Approval binds the complete reference manifest, current schema shape, target
policy, server/account identity and effective grant fingerprint. Checks repeat
under the exclusive migration lock; changed or stale approval cannot authorize a
different prefix or release. No credentials, raw SHOW GRANTS (which can contain
authentication hashes), SQL or connection values are printed in operator output.

The checked-in schema manifest was generated from every actual migration prefix
on a fresh disposable 11.8.9 server. It fingerprints tables/engine/collation/options,
ordered column types/defaults/nullability/charset/generated expressions, indexes,
named keys and constraints, FK target schemas/columns/rules and CHECK clauses;
trigger bodies/events/order/timing/creation SQL modes and character contexts.
Own-schema references are normalized; foreign-schema references remain distinct.
Approved trigger definers are checked separately, never silently normalized away.
Unexpected/missing tables, views, columns, indexes or triggers and modified trigger
bodies stop execution. The full expected prefix is compared after each statement
before that non-bootstrap step is marked applied.

No migration or verification SQL file changed. The existing bootstrap boundary
remains explicit: a crash between CREATE ledger and insertion of its first row
leaves an orphan ledger requiring review. Reference fingerprints supplement, not
replace, source checksums, postconditions and operator SQL review. A reference
generated from an untrusted/live drifted target is not acceptable evidence.

## Privilege hardening evidence

The supported migration profile has project-schema SELECT/CREATE/ALTER/TRIGGER,
INSERT on the ledger/four seeded catalogs and UPDATE only on the ledger. The
runtime profile has explicit per-table DML, no ledger access or DDL, catalog
read-only rights where no authoring API exists and SELECT/INSERT-only history.
The existing platform channel API requires industry_channels UPDATE. No routine,
standalone index, foreign DEFINER or account-management SQL is present, so those
privilege classes are not invented. See the exact
[database privilege matrix](database-privilege-matrix.md).

Two actual MariaDB details were established during testing:

1. Granting DML on a table before it exists requires CREATE in that table grant.
   The tested provisioning profile includes it on those five tables, without
   expanding rights beyond its already-required project-schema CREATE.
2. The Windows ZIP installer assigned broad test/test\_% privileges to PUBLIC.
   SHOW GRANTS exposed these inherited rights despite otherwise restricted
   identities. The checker rejects them. Only the disposable fixture's PUBLIC
   test grants were revoked before positive least-privilege tests. Provider PUBLIC
   configuration was not accessed or assumed. Schema-grant wildcard escaping is
   also checked; backticks alone are insufficient to constrain LIKE patterns.

The checker refuses active/inherited role syntax it cannot prove, PUBLIC, global
privileges other than USAGE, unrelated schemas, wildcard database grants, grant
option, unknown/column/proxy/routine grant forms and excess rights. It does not
pretend that a direct-grant allowlist supports arbitrary role graphs.

A restricted migration identity successfully created the complete 26-table,
35-trigger schema and all inline indexes without global administration privileges.
A separate runtime identity read application catalogs and executed the immutable
ownership trigger with the migration definer. Ledger access, append-only UPDATE,
CREATE and ALTER were denied. This is local restricted-account evidence, not a
full application/provider-grant certification. Stable definer rights/account
lifetime and provider binary-log policies remain operational review items.

## Execution, interruption and recovery

The unchanged named-lock namespace coordinates legacy and operator clients.
Ownership is checked before migration statements and again before success.
Progress events are appended/fsynced to an exclusively created JSONL audit file,
with run ID, timestamps, target fingerprint, approval digest, step versions,
fixed errors and final summary. The existing database ledger remains the durable
per-version state. Audit-file failure stops execution rather than silently losing
evidence. Operator filesystem ACLs and protected external export remain required;
the local log is not an immutable external audit service.

Migration sessions bound metadata and InnoDB row-lock waits to ten seconds; the
operator connection timeout is five seconds and the named-lock wait five seconds.
These do not bound wall-clock DDL execution. SIGINT/SIGTERM requests a stop at a
verified boundary. A forced disconnection during an applying statement leaves
durable incomplete evidence and blocks another run; server DDL completion still
requires inspection. No automatic retry/reconnect, partial rerun, mark-applied,
destructive rollback, constraint weakening or checksum rewrite was introduced.

The fixture explicitly demonstrates forward repair preserving source checksums,
postcondition proof and conditional ledger reconciliation under operator-style
review. No production repair tool or grant-changing command is supplied. Follow
the [production migration runbook](production-migration-runbook.md) for approved
restore rehearsal, failure evidence, maintenance controls and separate approval.

## Successful verification

Final local validation uses the actual MariaDB engine and real React/Express
browser workflow. Counts include node:test parent tests; repeated command runs
are not counted as additional distinct tests.

| Command from repository root | Passed |
| --- | --- |
| npm.cmd --prefix backend test | 29 |
| npm.cmd --prefix backend run test:integration | 135 across all 12 integration suites |
| npm.cmd --prefix backend run test:migration-safety:integration | Dedicated safety command also passed all 13 included tests |
| npm.cmd test | 19 |
| npm.cmd run test:browser | 8; API-fixture browser suite, separate from real stack |
| npm.cmd run test:e2e:real | 11; real React/Express/MariaDB, no local API mocks |
| npm.cmd run test:server | 1 |
| Both TypeScript checks and production builds | Passed |
| npm.cmd run lint | Passed, two unchanged landing/demo warnings |
| git diff --check | Passed |

Total: **203 distinct tests**, zero final failures/skips. MARIADB_TEST_BIN points
to the local 11.8.9 Windows ZIP bin directory. Final ignored local evidence is
under .tmp-frontend/task17-*.log; temporary policies/audits contain synthetic local
target metadata only. No reusable production credential or secret is recorded.

One overlapping aggregate/backend plus E2E rerun timed out during disposable
Windows database initialization: three mariadb-install-db/mysqld bootstrap pairs
remained running without completing. Only workspace-binary processes from that
run were terminated; the failed logs are retained as task17-*-overlap-failed.log.
The exact installer stall cause is not established. The canonical aggregate
integration command schedules test files sequentially, and E2E runs separately.
Every original assertion and the real concurrent quota/feedback workers remain
enabled; this changes fixture scheduling, not business concurrency coverage.
Final results above refer to those isolated runs.

New coverage verifies fresh migration with restricted grants, non-mutating
preflight (empty database and unchanged full ledger), unexpected targets,
missing/excessive/PUBLIC grants, changed checksums, stale approval, missing tables/
indexes, extra columns/indexes/triggers, modified existing trigger body, exclusive
locking, concurrent attempt rejection, cooperative interruption, actual connection
loss while applying, failed postcondition, explicit forward repair, production
confirmation rejection before connection and real CLI report/audit exclusivity.

All existing MFA, quota concurrency, feedback concurrency, authorization, business,
subscription, schema and migration regressions remain enabled. Feedback stress
again proves four workers x 50 mixed rounds, 300 duplicate pairs, 20 point-lock
rounds, 508 feedback rows/202 status events, matching audit/usage accounting and
zero additional application deadlocks. Its one intentional legacy deadlock is an
asserted negative control. No authentication, tenant, quota or feedback service or
database constraint/trigger source changed in this task.

## Unsuccessful/blocked workflows and limits

- Hostinger preflight, migration execution, grant provisioning, real TLS handshake,
  definer activation, timeout/capacity and backup restoration were **not attempted**.
  No production readiness or provider-support claim follows from local tests.
- Unknown existing schemas, incomplete/orphan ledgers, checksum conflicts, drift,
  stale approvals, unsupported grants and absent confirmation intentionally stop.
  They are not automatically repaired/baselined or accepted with IF NOT EXISTS.
- Metadata comparisons do not prove data compatibility, pending DDL success,
  backup recoverability, hidden routine/event inventory or legal compliance. The
  current source has no routines/events; provider-wide inventory remains separate.
- Named locks protect cooperating clients, not arbitrary schema writers. Freeze
  DDL and use the reviewed application maintenance window. There is no universal
  wall-clock DDL cancellation guarantee or fully automatic recovery procedure.
- Runtime database TLS is still absent, despite the new migration transport path.
  Application SELECT 1 readiness still does not enforce the complete schema gate.
  Provider migration/runtime grants and trigger definer policies remain unverified.
- C1 historical secret rotation, C3 restore rehearsal, C4 actual target baseline/
  deployment authorization, C5 provider least privilege and the other existing
  operational/privacy gates remain open. C2 MFA and the Task 15 root-lock correction
  are preserved locally. The release verdict remains **NOT READY**.

## Complete Task 17 file inventory

| File | Purpose |
| --- | --- |
| [backend/docs/backup-recovery-runbook.md](../docs/backup-recovery-runbook.md) | Current 26-table/MFA key-recovery coverage; backup rehearsal remains unverified |
| [backend/docs/database-compatibility-checklist.md](../docs/database-compatibility-checklist.md) | Local restricted-account and exact drift-check evidence versus provider gates |
| [backend/docs/database-privilege-matrix.md](../docs/database-privilege-matrix.md) | Exact migration and runtime grant requirements, verified scope and limits |
| [backend/docs/hostinger-deployment-checklist.md](../docs/hostinger-deployment-checklist.md) | Read-only compatibility requirements and current migration/MFA handoff |
| [backend/docs/migration-guide.md](../docs/migration-guide.md) | Preserved legacy CLI versus new reviewed operator workflow |
| [backend/docs/migration-safety-report.md](../docs/migration-safety-report.md) | This implementation/audit report, tests, limitations and inventory |
| [backend/docs/production-blockers.md](../docs/production-blockers.md) | C4/C5/H8 remediation evidence and remaining runtime/provider gates |
| [backend/docs/production-migration-runbook.md](../docs/production-migration-runbook.md) | Explicit operator workflow, read-only provider checklist and forward recovery |
| [backend/docs/production-readiness-report.md](../docs/production-readiness-report.md) | Current Task 17 evidence with unchanged NOT READY verdict |
| [backend/docs/schema-manifest.json](../docs/schema-manifest.json) | Reviewed checksums and structural fingerprints for empty schema and all 67 prefixes |
| [backend/package.json](../package.json) | Explicit operator, reference generation, safety test and serialized aggregate integration scripts |
| [backend/scripts/schema-manifest.mjs](../scripts/schema-manifest.mjs) | Generate reference from every prefix on harness-owned MariaDB 11.8.9 only |
| [backend/src/migrations/operator-cli.ts](../src/migrations/operator-cli.ts) | Explicit target/environment, credential isolation, pinned-CA TLS, report/approval/audit files and signal handling |
| [backend/src/migrations/operator.ts](../src/migrations/operator.ts) | Target/account identity, approval binding, production confirmation, grants/schema/definer checks |
| [backend/src/migrations/privileges.ts](../src/migrations/privileges.ts) | Exact migration/runtime profiles and fail-closed effective-grant inspection |
| [backend/src/migrations/runner.ts](../src/migrations/runner.ts) | Optional under-lock inspection/audit/interruption controls and bounded row-lock wait |
| [backend/src/migrations/schema.ts](../src/migrations/schema.ts) | Canonical metadata fingerprint collection and applied-prefix verification |
| [backend/test/migration-safety.integration.mjs](../test/migration-safety.integration.mjs) | Restricted users, drift, interruption, approval, actual CLI/audit and recovery evidence |
| [backend/test/migration-safety.test.mjs](../test/migration-safety.test.mjs) | Grant parser, configuration and production-confirmation negative tests |

19 Task 17 files. No migration SQL/history file, application environment,
authentication service, quota service or feedback service was modified.
