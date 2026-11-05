# Disaster recovery runbook - Task 18

2026-11-05. The local rehearsal below was performed on disposable MariaDB 11.8.9.
No Hostinger connection, production backup/restore, production migration or
production configuration/grant change occurred. Production execution requires
separate approval and provider-specific validation. **Not production readiness.**

## Decisions, ownership and objectives

| Decision | Owner/evidence required |
| --- | --- |
| RPO | Business owner approves the maximum acceptable data-loss interval. No value is committed by this implementation. |
| RTO | Business/operations owners approve incident-to-service-restoration time, including detection, provisioning, keys, import, verification and routing. No SLA is invented. |
| Frequency | Select a schedule that meets approved RPO; daily full backups plus before every approved migration are a starting design proposal, not an accepted recovery commitment. Tighter RPO needs more frequent backups or independently verified PITR. |
| Retention | Business/privacy/security approve retention, deletion holds, capacity and key lifetime; do not keep clinic-context data indefinitely by default. |
| Storage | Operations/security approve encrypted off-site/versioned copies, access separation, protected metadata and tested key recovery. Local temporary directories are not a retention/off-site strategy. |
| Incident command | Name incident commander, primary/backup DBA restore operators, security/key custodian, application validator and business sign-off owner. |

Measure actual data age from authenticated metadata.snapshotCapturedAt, not the
time a file was copied off-site. Measure operational RTO from incident declaration
until the approved functional checks and routing complete. The roughly one-second
tiny-fixture export/import measurements in the rehearsal report are not RPO/RTO
commitments or production capacity evidence. No scheduler, PITR or off-site upload
service is implemented in this task.

## Utility scope and prerequisites

The shipped CLI supports explicit **disposable loopback local** policies only.
It refuses staging/production, remote hosts, unexpected server/account/database
identity and non-magicreview_migration_* names. Never tunnel production to
loopback, relabel a live database as disposable or supply production credentials.
Provider recovery remains a separately approved handoff, not an override flag.

Use trusted MariaDB 11.8.9 native binaries and Node 24, plus the reviewed project
release including all 67 migrations. Current native execution was tested on the
Windows ZIP distribution. Linux/provider execution is not verified or claimed.
The source must match the complete approved schema manifest and ledger. Unexpected
tables/views/drift, incomplete history or visible routines/events are refused;
the current release has no routines/events to export. Hidden provider objects
require independent privileged inventory, not an assumption of metadata visibility.

Supply credentials through a protected environment/secret mechanism:
RECOVERY_DB_USER, RECOVERY_DB_PASSWORD, BACKUP_ENCRYPTION_KEY and BACKUP_KEY_ID.
The encryption key must be independently generated, canonical base64 encoding of
32 random bytes. The key ID is a non-secret version label. No default secret,
production secret generation or secret value is committed in source or reports.
Keep backup keys separate from archives and from AUTH_MFA_KEY/signing secrets.

The private JSON target policy uses the Task 17 local policy fields: environment,
host, port, database, serverHostname and expectedAccount. Pin actual authorized
DATABASE(), @@hostname and CURRENT_USER(); no app DB_* or dotenv fallback exists.
Local recovery explicitly rejects TLS policy fields rather than silently ignoring
them. Current local TCP is unencrypted, matching the disposable test pool; native
ssl=0 exists only behind this loopback/local guard. There is **no remote TLS
verification bypass**. Remote/provider transport needs a separately reviewed
certificate/hostname-verified path; Task 17 migration TLS is a different workflow.

Use an existing approved private output root outside the repository and any web
root/alias. The utility rejects repository paths and common public-root names,
then creates its own new private run directory; it does not change permissions on
a shared output root. Unix private modes and Windows owner-only DACLs protect
created directories/files. Confirm actual filesystem/ACL support and encrypted
storage independently; path-name checks cannot discover every web-server alias.

## Backup sequence and exact commands

Approve a write/DDL maintenance window. Backups acquire the Task 17 migration
advisory lock and READ-lock every application table, including aliases needed by
relationship checks. These locks **pause application writes** during capture,
dump and comparison. They are not an online zero-impact backup feature. Other
DBA schema writers must remain frozen; named locks coordinate cooperating clients.

```text
npm.cmd --prefix backend run recovery -- backup --target <PRIVATE_SOURCE_POLICY_JSON> --bin <TRUSTED_MARIADB_11_8_9_BIN> --output <PRIVATE_BACKUP_ROOT>
```

The exact native export argument template used internally is:

```text
mariadb-dump.exe --defaults-file=<GENERATED_PRIVATE_CLIENT_CNF> --single-transaction --quick --skip-lock-tables --triggers --hex-blob --no-tablespaces --skip-add-drop-table --skip-add-drop-trigger --skip-add-locks --skip-disable-keys --complete-insert --skip-comments --skip-dump-date <EXPLICIT_SOURCE_DATABASE>
```

The defaults-file option is first and isolates the client from global/user option
files. No password appears in command arguments. The generated credential file
is private and removed in finally. Child environments exclude DB credentials,
backup/MFA/JWT keys and unrelated application secrets. Raw native stderr is never
relayed to logs. Source schema/data, precise row hashes, counts, auto-increment
state, ledger and FK/CHECK integrity are captured under the locks and compared
again after the single-transaction dump. A zero native exit alone is insufficient.

Native logical export/import and option semantics are documented in the primary
[MariaDB mariadb-dump reference](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump).

Dump stdout streams directly into AES-256-GCM; backup SQL is not written as a
plaintext export. A timestamp/UUID filename and exclusive publication prevent
overwriting another artifact. The manifest is published last with complete=true,
authenticated file/SQL hashes and lengths, source/release fingerprints, capture
time, key ID, inventories, row counts and table data digests. Derived encryption
and metadata-HMAC keys use separate HKDF domains. Incomplete/failed exports do
not produce a valid completed pair. Metadata is authenticated, not confidential;
protect it with the same private storage and encrypted off-site container policy.

```text
npm.cmd --prefix backend run recovery -- verify --manifest <BACKUP_MANIFEST_JSON>
```

This verifies metadata HMAC, archive SHA-256/length, GCM authentication and decrypted
SQL hash/length without importing. It explicitly returns restoreVerified=false.
It does not prove that native SQL can be imported or that rows/constraints will
match. Copy the encrypted SQL and its manifest together to approved protected
off-site/versioned storage, verify again after transfer, and test key recovery.
Transport must be authenticated/encrypted through an independently approved service;
no remote transfer or provider backup facility was exercised here.

## Restore sequence and exact commands

1. Declare the incident, preserve evidence and fence the old primary/writers.
   Prevent split-brain; do not expose both original and restored copies as live.
2. Select a proven backup/key version and verify the artifact pair. Preserve a
   recovery copy of the original artifacts. Provision a **separate fresh empty**
   database through approved DBA procedures; the utility does not create/drop it.
   Use the matching reviewed release; mismatched migration checksums are rejected
   before import. Accept only trusted utility artifacts under the approved key
   custody process, not arbitrary SQL dumps.
3. Verify exact local target policy, server version, account and storage. Obtain
   explicit operator authorization; no default confirmation or destructive retry.

```text
npm.cmd --prefix backend run recovery -- target-fingerprint --target <PRIVATE_FRESH_TARGET_POLICY_JSON>
npm.cmd --prefix backend run recovery -- restore --target <PRIVATE_FRESH_TARGET_POLICY_JSON> --bin <TRUSTED_MARIADB_11_8_9_BIN> --output <PRIVATE_RECOVERY_EVIDENCE_ROOT> --manifest <BACKUP_MANIFEST_JSON> --confirm RESTORE-EMPTY:<TARGET_FINGERPRINT>
```

4. The utility fully authenticates/decrypts the archive into a protected temporary
   SQL file **before** import, verifies target identity/version and named-lock
   ownership, and refuses any existing table/view or visible routine/event.
   There is no overwrite/force/drop mode. A durable private restore-state.json
   records importing, verified or failed-unverified; CLI progress identifies it.
5. The exact import invocation is:

```text
mariadb.exe --defaults-file=<GENERATED_PRIVATE_CLIENT_CNF> --binary-mode <EXPLICIT_EMPTY_TARGET_DATABASE>
```

   Verified SQL is piped to stdin, not appended to command arguments. There is no
   --force or automatic retry. Native dump session directives may temporarily
   disable FK checks on the isolated import connection; reenabling them does not
   validate existing rows. The utility therefore explicitly validates every
   composite FK by anti-join and every CHECK predicate after import.
6. Require exact schema/index/trigger fingerprints and original trigger definers,
   complete migration checksums/status/history, every table count/content hash,
   auto-increment state and all FK/CHECK checks to pass. Trigger bodies are
   preserved; no definer stripping/remapping or weakening is done automatically.
7. Keep traffic closed until the application checks pass: MFA challenge/recovery,
   scoped merchant access, independent public options, feedback submission/status
   and retry behavior, QR content, subscription/usage, audit and quota consistency.
8. Restore configuration/keys through the separate protected custody process.
   A DB archive does not contain AUTH_MFA_KEY or signing keys. Apply the approved
   incident secret/session revocation policy before reopening service; recovery
   preserves session/token rows exactly rather than silently revoking them during
   integrity comparison. Follow secret-rotation-runbook.md and maintain MFA.
9. Reconcile against the accepted capture point, record measured recovery/data
   loss, obtain business/security sign-off, open approved routing, and monitor.

## Grants, interruption and cleanup

A separate local backup identity was verified with project-schema SELECT,
TRIGGER and LOCK TABLES only, without source DML/DDL grants. Escape schema-grant
underscores literally; do not inherit arbitrary PUBLIC/global/role rights. The
Task 17 runtime and migration profiles are not backup identities. Restore needs
approved CREATE/INSERT/TRIGGER and verification SELECT on the empty target;
foreign trigger definers may require separately authorized definer privileges.
The rehearsal restores as its disposable root fixture; provider definer/grant
support is not assumed, granted or weakened automatically.

SIGINT/SIGTERM requests interruption; native commands are not retried. Import may
have committed DDL/data before interruption. Failed/unverified targets remain
closed and any nonempty target is refused on the next attempt. Inspect the private
state file, original ledger/schema and native/provider state through an approved
operator process. Rehearse forward reconciliation or select another explicitly
approved fresh target; never drop unknown objects or blindly rerun an import.

Temporary credential/decrypted SQL files are removed only after child handles
close; cleanup unlinks only known files in that newly created private directory
and removes an empty directory, never a recursive unknown path. Unlink is not
forensic secure erasure. Use encrypted temporary volumes. SIGKILL/OS crash can
leave protected temporary files: a named operator must verify ownership, stopped
processes and exact run paths before removing client.cnf/verified.sql and the
empty temporary directory. Do not run broad recursive cleanup or delete retained
encrypted archives/state evidence. Test retention and key-deletion consequences.

Native defaults/config, OS ACLs, schema/data size, disk capacity, execution time,
definer policies, backup storage and provider TLS/import/export facilities all
need independent provider validation. No invented RPO/RTO or production readiness
claim follows from a successful local rehearsal.
