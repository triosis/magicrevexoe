# VPS migration, initial owner and recovery assessment

2026-11-10. Proposed future workflow only. No production database queried, native
backup created, restore executed, account created or migration run in this task.
**Production initialization and bootstrap remain NO-GO.**

## Existing operator compatibility

The strict operator supports production MariaDB11.8.x with valid CA material,
verified DNS TLS, exact schema, @@hostname and CURRENT_USER(). Its empty-CA
pre-connection gap must first be corrected/tested under separate implementation
approval; see the [TLS finding](HOSTINGER_VPS_NETWORK_SECURITY.md). A VPS
administrator can provision the narrow grants that Cloud Startup cannot. Use
backend/dist/migrations/operator-cli.js, not raw SQL import or the legacy generic
up command. The approved compiled Linux/Node24 artifact, SQL, verification files
and manifest must match. Do not copy Windows node_modules/native Argon2 to Linux.

The inspected release has85 contiguous migrations,84 verification files, expected
32 tables/46 triggers and85 applied ledger rows. Bootstrap tracking checksum is
SHA256(SQL); subsequent checksums include SQL + NUL + verification bytes. Preserve
all historical bytes, order, postconditions and manifest. Counts alone are not
definition validation.

Use a private parsed target policy containing environment:production, approved
DNS host/port/database, actual serverHostname/expectedAccount, tlsCaFile and
lowercase64-hex tlsCaSha256, plus the exact allowedTriggerDefiners if necessary.
Omit Cloud exception and local transport fields. Fingerprints hash the normalized
parsed policy, not raw JSON-file bytes. MIGRATION_DB_USER/PASSWORD are separate
protected operator-process inputs; no normal app DB_* or dotenv fallback exists.
Operator CA path resolution and exact bytes must be checked on its actual host.

Retain all existing gates: target/version/grant verification; schema/history prefix;
fresh15-minute preflight approval bound to identity/grants/shape/manifest/policy;
independent APPLY-PRODUCTION canonical digest confirmation; named lock on one
dedicated connection; exclusive audit files and fsynced events; postconditions;
applying/applied/failed states; no blind reconnect/retry or automatic repair. A
preflight is non-mutating schema inspection, not a guarantee every later DDL succeeds.
DDL can commit independently of the ledger and is not an atomic rollbackable batch.

The strict verifier, not the Cloud initial-maintenance exception, is the VPS path.
Keep application writers closed during initialization. Verify exact grants and
metadata visibility before rehearsing executable commands. See the existing
[production operator runbook](../backend/docs/production-migration-runbook.md);
its mechanisms remain authoritative, but Cloud-local commands in the
[initial Hostinger runbook](HOSTINGER_INITIAL_DATABASE_MIGRATION_RUNBOOK.md) must
not be reused unchanged for this remote target.

## Future cutover sequence and stop points

Every item below requires later authorization; none was executed.

| Step | Proposed action / evidence and stop condition |
| --- | --- |
| 1 | Approve architecture, network, at-rest design, identity/definer model, recovery objectives, operator/reviewer and budget. No approved network or recovery route means STOP. |
| 2 | Provision the approved VPS only after purchase approval. Confirm OS, region, capacity, package availability and console recovery. |
| 3 | Harden OS/MariaDB; enforce strict SQL/FK/CHECK settings, least exposure, patching, monitoring and encrypted-storage decision. Unexplained drift means STOP. |
| 4 | Correct/test operator empty-CA handling under implementation approval. Establish restricted connectivity and pinned-CA/DNS TLS; test empty/wrong CA/host/plaintext rejection in isolation. No tunnel/plaintext fallback. |
| 5 | Provision distinct runtime/operator/backup/DBA identities and the reviewed creating-definer strategy. Verify actual account and grants; never replace runtime with DBA credentials. |
| 6 | Rehearse all85 migrations with the exact release and strict operator on a disposable MariaDB11.8 target, including lock/drift/partial-failure cases. Verify32 tables,46 triggers,85 applied checksums and all definitions. |
| 7 | Rehearse bootstrap using synthetic identities/passwords and real first-login MFA flow; verify one root, idempotency/conflict refusal and audit evidence. |
| 8 | Rehearse encrypted native backup and isolated restore with original valid definers; repeat all46 guards, auth/MFA and tenant/parallel-path tests. Measure restore duration. |
| 9 | Independently authorize production GO, maintenance window and exact artifact/target. Reconfirm Cloud target inventory through separately authorized read-only access and accepted recovery capture. If any data exists, STOP initial-empty procedure and design data transfer/reconciliation; do not discard or initialize over it. |
| 10 | Run approved production preflight, reviewer-bound apply, complete structural verification, then separately authorized bootstrap. Any failure freezes traffic and retries for repair/restore review. |
| 11 | Reduce maintenance grants while retaining definer dependencies; reconnect. Validate strict runtime grants and actual application TLS/permissions. Update Cloud environment only under explicit deployment approval, retaining HTTP binding and auth keys. |
| 12 | Validate listening log, health, readiness, login/MFA, tenant authorization and public funnels; release traffic only after independent acceptance. Monitor error/latency/backup signals. |

Before production writes, aborting preserves the existing Cloud target unchanged;
retain evidence and revert an authorized app configuration change to its previous
approved state if appropriate. An empty old database cannot serve new accounts.
After new writes begin, switching back to the old empty database would lose state:
stop writes and use an approved restore/reconciliation with measured data loss,
not a blind environment rollback. Do not dual-write or delete either database.

## Backup and recovery design

Use a reviewed native mariadb-dump/mariadb workflow with matching11.8 binaries,
complete triggers/definitions/data, binary-safe IDs and an application-consistent
snapshot under maintenance coordination. Preserve constraints/indexes, trigger
order/DEFINER, auto-increments and85 ledger rows/checksums. Record SQL modes/schema
defaults, release/artifact identity, accounts/grants and CA/key dependencies in a
protected recovery inventory. Schema dump alone does not include system accounts.

Encrypt before off-server transfer using authenticated encryption and a manifest
binding archive integrity, completeness, version and snapshot metadata. Keep the
backup encryption key in independent custody; do not store it beside the archive
or treat AUTH_MFA_KEY as a backup key. No plaintext export in public web roots,
Git, build logs or chat. A hash proves bytes, not an untrusted backup's provenance.

Hostinger documents weekly VPS backups by default, optional paid daily backups,
and no at-rest encryption for provider backups/snapshots. Provider restore replaces
the VPS contents. These are supplemental recovery mechanisms, not proof of a
consistent encrypted native backup or isolated restore.
[Hostinger VPS backup limitations](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)

Proposed planning objectives only: RPO<=24h with a verified nightly encrypted
backup; RTO<=4h for the stated pilot. Tighter RPO requires a separately designed,
encrypted/off-server binlog and point-in-time recovery rehearsal. Neither target
is an SLA or approved business policy. Owner must approve retention, deletion/legal
exceptions, custody, storage region and costs; no automatic retention period is
selected here. Monitor job completion, integrity, copy age and recovery-key access.

Restore into a **separate isolated instance**, preferably retaining the original
schema/account identities, with outbound email/billing/public access disabled by
approved test configuration. Provision original definer principals/dependencies
before activating restored triggers. Use an authorized restore identity for
DEFINER assignment; do not strip DEFINER, disable guards or rewrite old migrations.
Validate manifest/history, exact32 tables/46 triggers, indexes/FKs/CHECKs, row hashes
and counts, auto-increments, definitions/order/definers and actual guard activation.
Validate representative auth/MFA decryption, tenant boundaries and service behavior.
Authentication requires matching existing MFA key and unchanged record IDs/AAD;
a database move does not authorize key rotation. Wrong key, incomplete archive,
tamper, schema/data/definer mismatch or interrupted restore leaves the target
quarantined, with no release or automatic retry.

Existing recovery utility is **not** a production Linux executable: utility.mjs
requires a disposable local policy, loopback, exact11.8.9, no TLS CA, and invokes
mariadb-dump.exe/mariadb.exe. Never label production local to bypass it. A separate
approved Linux/TLS/production-target implementation or reviewed native DBA procedure
is needed, including credential-file permissions, logging redaction and exact
restore approval. Earlier Windows recovery tests do not establish this workflow.

On partial migration: preserve exact artifacts, audit, ledger, backup and server
state; stop automated retries and assess committed/in-flight DDL under lock.
Rehearse additive forward repair or explicitly approved conditional reconciliation
on a restored clone; never delete ledger rows, edit checksums, mark applied blindly,
disable FK/CHECKs or DROP/reset production. If uncertain, separately authorize
restoration and retain forensic evidence. Fresh reviewed preflight/approval required
for continuation, subject to current history and privileges.

## First Super Admin conditions

Planned email is rxadmin@revexoe.com; no account/password is created by setting
BOOTSTRAP_* environment variables. Use dist/setup/cli.js with an independently
reviewed target and BOOTSTRAP:<canonical-policy-digest>. Protected operator inputs:
BOOTSTRAP_DB_USER/PASSWORD, BOOTSTRAP_PLATFORM_NAME, BOOTSTRAP_OWNER_EMAIL,
BOOTSTRAP_OWNER_NAME and BOOTSTRAP_OWNER_PASSWORD. Password must be16-128 characters
with>=10 distinct characters, entered privately, not command arguments or Git.

Bootstrap validates complete history/manifest/schema, holds the migration lock and
transactionally creates root/user/membership/audit. It refuses conflicting/partial
identity state, cannot reset a password or create another root, and issues no MFA
bypass/session. Resolve the metadata/grant caveat in the
[identity assessment](HOSTINGER_VPS_DATABASE_PRIVILEGES.md) before production.

AUTH_MFA_KEY must be canonical standard Base64, exactly32 decoded random bytes,
>=16 distinct decoded bytes, and different from AUTH_ACCESS_SECRET. The candidate
previously shown in IDE/chat is exposed: determine privately whether used. Do not
install an exposed unused key; if used, separately authorize safe reencryption or
recovery rather than replacing it and losing enrolled MFA. Preserve the existing
access key and all stored encrypted records during the database move. MFA enrollment,
verification and protected recovery-code custody remain required at first login.
