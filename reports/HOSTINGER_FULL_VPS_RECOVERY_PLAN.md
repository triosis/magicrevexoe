# Option C encrypted backup, recovery and first-owner gates

2026-11-10. Design only. No native dump/restore, production query, credential/key
generation or bootstrap performed. **Recovery and initialization remain NO-GO.**

## Implementation gap and recovery boundaries

Existing backend/scripts/recovery/utility.mjs is deliberately restricted to local
disposable policies, literal loopback and magicreview_migration_* schema names,
exact MariaDB11.8.9 and no CA configuration. It invokes mariadb-dump.exe/mariadb.exe.
Co-location on a VPS does not turn production into a disposable local target.
Do not relabel environment:local or remove guards to make it run.

Approve a Linux-native/TLS/production-target implementation with equivalent policy,
integrity and approval safeguards, or a separately reviewed native DBA procedure.
Use matching supported MariaDB native clients, explicit local DNS host and TCP/TLS
verification. A utility's implicit Unix socket fallback must not be substituted
for the selected verified-TLS TCP policy. Keep credentials in protected operator
injection/private client configuration, not arguments, shell history or dump logs.
The operator empty-CA fix is a prerequisite for all SQL operator paths used here.

## Backup contents and custody

Capture a consistent native backup of all32 tables including schema_migrations,
85 ledger entries/checksums/status, all rows and binary IDs, auto-increments,
indexes, FKs/CHECKs, generated columns, triggers/ordering and valid original
DEFINER names. Coordinate write/DDL freeze, named migration lock and required
table/snapshot locks; --single-transaction alone does not authorize concurrent
DDL. No --force or errors-ignored backup. Prove privileges/tool flags in isolation.

Create authenticated encrypted archives with a signed/authenticated integrity and
completeness manifest, exact release identity, row hashes/counts and metadata.
Encrypt before off-server transfer; verify independent protected off-server copy,
backup age and key retrieval. A checksum of an untrusted file is not provenance.
Use independent backup keys, not AUTH_ACCESS_SECRET/AUTH_MFA_KEY; separate key
custody from archives and test recovery by the designated backup operator.

Capture protected account/grant reconstruction evidence separately: schema dumps
do not include all users/system grants. Also retain OS/Node/proxy/service versions,
approved application artifact, root-controlled local DNS, CA trust configuration,
PKI recovery/renewal, firewall policy and environment-variable inventory. Preserve
the existing auth/MFA keys in approved secret custody, not in the SQL archive or
public documentation. QR data is rendered from stored metadata by current funnel
services; inventory any actual external assets rather than assuming object storage
exists merely because qr_assets has object_key columns.

Hostinger documents weekly VPS backups, optional paid daily backups, no default
at-rest encryption for disks/backups/snapshots and whole-VPS replacement on restore.
Treat provider snapshots as supplemental, not verified encrypted native recovery.
The listed Cloud backup is not evidence of VPS recovery.
[Hostinger backup behavior](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)

Proposed pilot objectives only: RPO<=24hours for nightly verified encrypted backup,
RTO<=4hours after a measured exercise. Tighter RPO requires separately approved
binlog/PITR design, encryption, continuity and replay tests. Owner must approve
actual objectives, retention/deletion/legal exceptions, region, key custody,
off-server storage and costs; no policy or SLA is invented. Schedule restore
exercises and alerts for missing/old copies under that approval.

## Isolated restore acceptance

1. Create a separately approved disposable Linux MariaDB instance with no access
   to production traffic or credentials; restrict outbound SMTP/payment/AI and
   public DNS. Use synthetic source data and secrets for development rehearsals.
2. Verify archive authenticity/completeness/key before import. Recreate original
   schema and valid definer principals with exact approved grants in isolation.
   Restore authority may need DBA SET USER for preserved other definers; never
   hand that privilege to runtime/strict migration account or strip DEFINER text.
3. Restore only into the explicitly approved empty target, retaining protected
   audit evidence. Keep API stopped/fenced. Wrong-key/tamper/partial archive/import
   interruption or target mismatch must fail closed; no automatic retry/release.
4. Compare exact schema/manifest, all85 ledger hashes/status,32 tables,46 trigger
   definitions/order/definers, row hashes/counts, indexes/FKs/CHECK integrity and
   auto-increments. Counts alone do not establish a faithful restore.
5. Apply reviewed definer/runtime grant transition, close old sessions, reconnect
   and exercise every46 guard under the intended creating definer. Privileged
   isolated invokers test DELETE guards without granting API DELETE. Prove API
   cannot access ledger/manage triggers/DDL/roles outside its map.
6. Restore matching synthetic MFA/auth configuration; test decryption/enrollment,
   recovery codes/session revocation, tenant isolation, quota concurrency, immutable
   publication and both public review paths. Then rehearse complete OS/service
   reboot and encrypted-volume unlocking, HTTPS/CA renewal and protected key access.
7. Record measured RPO/RTO, integrity, operator/reviewer, failures and remediation.
   Restore mismatches quarantine the target; they never justify accepting drift
   or regenerating the schema manifest from the bad result.

Prior Windows336-test results do not establish these Linux/production procedures.
No hPanel SQL import is presumed to preserve triggers, privileges or definer identity.

## Partial migration and host loss

Preserve original release/SQL/verifications, ledger applying/failed states, fsynced
audit, preflight and backup. Stop writers/retries and establish actual committed or
in-flight DDL under approved operator access/lock. A transaction ROLLBACK does not
reverse MariaDB committed DDL. No DELETE ledger, rewritten checksum, blind
mark-applied, disabled constraints or DROP/reset workaround.

Rehearse minimal additive forward repair or exceptionally authorized ledger
reconciliation on an isolated restored clone. Otherwise restore the approved
consistent state under separate authorization; revalidate before fresh preflight
and continuation. Whole-host restore also rolls back API/config/certificates and
may expose stale keys/renewal state: validate all, avoid split-brain with old host,
and fence writes until recovery is accepted. Do not automatically launch bootstrap
or migrations after service/host restart.

## MFA exposure and first Super Admin

The previously selected MFA candidate was exposed in IDE/chat. Determine privately
whether installed and whether any MFA records use it. If unused, obtain separate
approval for secure replacement; if used, approve verified reencryption/recovery
with matching data/key backups and session handling. Replacing a used key without
reencryption makes existing records unreadable. Do not repeat the secret or treat
the old empty-table evidence as a fresh determination. Preserve existing production
AUTH_ACCESS_SECRET; database/API migration is not authority to rotate it.

Actual validator requires AUTH_MFA_KEY canonical standard Base64, exactly32 decoded
random bytes,>=16 distinct decoded bytes and different from AUTH_ACCESS_SECRET.
Validate privately with application's configuredAuth using protected input; no
secret logging, production secret in tests or key generation in this assessment.

Only after all85 migrations/manifest and identities/recovery are accepted, authorize
the existing dist/setup/cli.js separately for rxadmin@revexoe.com. It requires a
production target and BOOTSTRAP:<canonical parsed policy digest>, not a file hash.
Protected operator-only inputs: BOOTSTRAP_DB_USER/PASSWORD, BOOTSTRAP_PLATFORM_NAME,
BOOTSTRAP_OWNER_EMAIL/NAME/PASSWORD. Password16-128 characters with>=10 distinct
characters, privately chosen; do not reuse the password previously shared in chat.

Bootstrap validates complete schema/history under the migration lock, creates
root/user/membership/audit transactionally, refuses partial/conflicting identity
and cannot reset an existing password/add another root. Identical repeat is
non-overwriting; no session/MFA bypass is issued. Resolve trigger-metadata visibility
and temporary bootstrap grants in rehearsal before production. Verify one root,
one intended active platform super_admin and bootstrap audit without selecting
password hashes or ciphertext for sharing. First login still requires MFA enrollment/
verification, protected recovery codes and later session/recovery acceptance.
