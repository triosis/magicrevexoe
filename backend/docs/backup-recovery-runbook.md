# Backup and recovery runbook — Task 14

## Task 17 current schema and key-recovery note

The current 000000-000066 release has 26 tables and 35 triggers, including the
Task 16 MFA tables. Historical Task 14 counts below must not limit backup/restore
coverage. Inventory all current objects with the approved schema manifest, and
restore encrypted MFA state with its matching independently protected encryption
key. Follow secret-rotation-runbook.md for key custody/rotation consequences.
Task 17 did not perform a backup, restoration or provider connection; C3 remains
unverified. Migration forward repair and local DDL tests are not restore evidence.


2026-11-05. **Externally unverified / Blocked for production use until rehearsed.**
This is a proposed operator procedure, not executed backup/restore evidence or
permission to access production. No actual export, restore, provider snapshot,
PITR or disaster-recovery drill was performed in this audit. Existing local
transaction rollback/savepoint/forward-repair tests do **not** prove restoration.
Verdict and complete inventory: [production-readiness-report.md](production-readiness-report.md).

## Ownership, objectives and schedule

Before launch, service owner/DBA/security must approve and record:

| Decision | Required evidence / classification |
| --- | --- |
| RPO | Maximum acceptable loss window and its business impact; **Externally unverified** |
| RTO | Maximum service restoration outage, including provisioning, import, validation, secret/config restoration and routing; **Externally unverified** |
| Schedule | Backup interval plus failure detection/retry must meet approved RPO; **Blocked** until objectives agreed |
| Retention/location | Privacy/legal retention, encrypted offsite/versioned copies, access separation and tested key recovery; **Externally unverified** |
| Personnel | Primary/backup restore operator, security approver, communications/on-call contact and incident authority; **Not implemented** as an operational procedure |

Recommend scheduled full logical backups at least daily as an initial operational
baseline, plus immediately before any authorized migration or risky data operation.
Daily backups alone may lose nearly a day's writes and do not meet tighter RPO.
Choose more frequent consistent backups or verified provider snapshots/binlog
archiving for tighter objectives; do not promise PITR unless provider access,
retention and replay were tested. Backup jobs must alert on missing/late/failed
exports; a schedule entry or downloadable provider file is not proof of recovery.
Frequency, retention and storage capacity remain owner decisions, not commercial
defaults or verified service guarantees.

## Backup prerequisites and procedure (not executed)

1. Verify explicit authorized source/identity privately. Record server/client
   version, schema/engine inventory, commit/artifact ID, exact migration manifest
   checksums/status, object definitions, definer identities/effective grants and UTC
   snapshot boundary. Never copy passwords/tokens or dumps into repository/reports.
2. Use a compatible MariaDB 11.8 client; dump/restore client compatibility matters.
   Confirm provider permits the required SELECT, trigger/routine/event metadata and
   any snapshot/locking privileges. If access is denied, stop and resolve scope;
   do not silently omit objects. Existing app defines 24 tables and 35 triggers,
   but actual source inventory may contain more objects or other engines.
3. Freeze migration/DDL during logical backup. For InnoDB use a consistent snapshot;
   any nontransactional tables require separately approved write quiescence/backup
   strategy. Keep application writes running only if consistency was established.
4. Supply backup credentials via a protected OS-ACL option file or approved secret
   mechanism; not command-line password, frontend variables or shell history.
   Template only, to be adapted/reviewed by the authorized operator:

```text
mariadb-dump --defaults-extra-file=<PROTECTED_OPTION_FILE> --single-transaction --quick --routines --events --triggers --hex-blob --skip-add-drop-table --skip-add-locks --result-file=<PROTECTED_DUMP_FILE> <AUTHORIZED_SOURCE_SCHEMA>
```

The extra-file option must be the first client option. This template does not
choose a host/user/password; operator config must explicitly select and validate
them. Use result-file rather than shell redirection that may change encoding.
No command in this runbook was executed against a database.

MariaDB documents snapshot dumping, trigger/routine/event options and compatible
restore clients. DDL concurrency can invalidate a transactionally consistent dump;
confirm the exact option semantics with the chosen version.
[MariaDB mariadb-dump reference](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump).

5. Require exit code zero and privately review warnings. A nonempty or partial dump
   is not success. Inspect object/definer coverage and unintended database-selection
   or destructive statements before restoration. Keep an unmodified original;
   version any reviewed clone-only portability transform and its rationale.
6. Hash the completed export (e.g. SHA-256), encrypt using separately managed keys,
   upload to restricted offsite/versioned storage, verify hash after retrieval and
   confirm alerting/job records. A hash detects accidental changes, not authorized
   tampering or semantic consistency. Dumps contain identities, password hashes,
   session/token digests, private ratings and business history: treat as sensitive.
7. Securely retain necessary application configuration/key-version references and
   artifact/manifest separately. Never place raw secrets in the SQL archive/report.
   Provider-managed backup coverage, encryption, geography and retention need
   independent contractual/operator evidence; this repository cannot infer them.

## Required isolated restore rehearsal (not executed)

1. Provision a new isolated MariaDB 11.8.9 target with appropriate charset/collation
   and capacity. Never import into the current live schema. Disable outbound email,
   public networking, Google telemetry and scheduled side effects in the clone.
2. Retrieve/decrypt backup with approved personnel, validate hash and verify restore
   target identity twice. Review definer compatibility and events; do not blindly
   remove security definers or change ownership to the runtime user. Create needed
   restricted identities through the approved DBA/provider operation. Keep event
   scheduling disabled until specifically reviewed.
3. Load using the compatible MariaDB client into the **new empty clone**. Select
   that target in protected option/config and through the client database selector;
   inspect the dump for hard-coded USE/database-qualified statements first. Never
   use --force to conceal errors. Capture safe exit status/timings and private
   diagnostic evidence, not row payloads. Example interactive client operation:

```text
mariadb --defaults-extra-file=<PROTECTED_RESTORE_OPTION_FILE> <NEW_EMPTY_CLONE_SCHEMA>
SOURCE <REVIEWED_LOCAL_DUMP_FILE>;
```

4. Stop on import errors, missing triggers/definers or privilege failures. Record
   the first boundary and repair/restart only in a separately prepared clean clone
   under review. This document authorizes no DROP/TRUNCATE or destructive cleanup.
5. Compare table/object counts and exact SHOW CREATE table/index/constraint/trigger
   definitions, statuses, collations, session UTC and effective grants. Compare
   migration history/checksums to the exact committed source. Status alone does
   not reverify all business definitions. Preserve binary IDs and DATETIME(6).
6. Check data integrity with authorized read-only queries against the snapshot:
   counts/aggregates by table/tenant/period; all ownership/composite FK anti-joins;
   hierarchy edges/root uniqueness; no orphan users/memberships/resources; one
   allocated subscription; period and rating bounds; exact catalog/role/grant
   definitions; audit/event uniqueness; usage counter versus ledger sums and current
   live gauges with documented expiry reconciliation. Re-enabling FOREIGN_KEY_CHECKS
   does not retroactively validate rows imported while checks were disabled.
7. Exercise actual runtime-account negative tests: append-only UPDATE/DELETE/DDL
   denied, published content immutable, cross-tenant scope denied, valid scoped
   resource + quota + audit transaction commits, failure rolls back. Run destructive
   negative tests only if explicitly authorized on expendable clone data, never live.
8. Run isolated application login/invitation/reset/replay, QR/public funnel,
   structured feedback, quota boundary and concurrency smoke tests. Redact/disable
   outbound integrations and use synthetic fixture actors, not restored real-user
   credentials. Confirm no production URL/secret is inherited by the clone.
9. Measure provisioning + retrieval/decryption + import + integrity + application
   validation time against approved RTO; verify snapshot age against RPO. Record
   dataset size, results, operator/reviewer/date, failed checks and rerun evidence.
   Close C3 only after demonstrated restoration, not after documentation approval.

## Migration recovery and live incident decision

**Verified repository behavior:** migration files are immutable, DDL may commit,
and applying/failed rows block later migrations. No automatic down/retry/baseline
exists. Follow migration-guide.md for a reviewed additive forward repair on the
same dedicated lock session, preserving original checksum/failure evidence. Never
mark applied merely to start the server. Restore cannot be replaced by a transaction
ROLLBACK after DDL. Running the current local-only CLI against production is blocked.

For a real incident, an authorized incident owner first isolates writes and preserves
evidence, decides forward repair versus restored-clone cutover based on integrity,
RPO/RTO and data-loss implications, then obtains required approval. Validate the
replacement fully before routing traffic. Preserve the original database; never
overwrite it to make a failed migration disappear. Reconcile any post-snapshot writes
only through reviewed idempotent mapping, not blind replay of HTTP requests/usage.

A restored backup can resurrect sessions, consumed invitation/reset credentials
and old configuration. Review session/auth_version revocation and token invalidation
before cutover; signing-key rotation alone does not invalidate refresh digests.
Coordinate key versions, replicas, user re-login/resends and current secrets outside
the restored database. Verify alerts, audit continuity/event IDs, quotas and both
independent public options after cutover. Rehearse this path before claiming RTO.

No local or Hostinger restore capability is certified by this report. All external
prerequisites remain **Externally unverified**, operational execution **Blocked**
until rehearsal/authorization. Complete five-file inventory and exact test results
are in the main readiness report.
