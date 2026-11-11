# Linux-native DBA recovery procedure — reviewable, NOT EXECUTED

2026-11-11. Chosen alternative to shipping an untested production recovery program.
This is a separately reviewable native DBA procedure for **disposable testing only**.
It neither broadens Windows recovery restrictions nor authorizes production use.
Linux unavailability blocks rehearsal and approval. No standard hPanel import,
account preservation, off-server storage, measured RPO/RTO or46-guard result is
claimed. The production recovery dependency remains open.

## Mandatory operator hold points

Two independently identified isolated Linux instances are required: source and
fresh restore destination, separate datadirs, same synthetic schema/definer account
names and matching11.8 native tools. Never restore on top of source or any existing
target. Record staging TLS policy identity/server/account/host/port/CA hash and
the new destination's own exact values. The source policy cannot authorize a
different server. Obtain an explicit disposable restore decision binding archive
integrity, target inventory, expected definers, release and designated operator.
Do not manufacture a production approval ID or infer authority from a file hash.

Before **any connection**, validate CA bytes with approvedCa and independently
check native-client options/credentials. Native client use does not automatically
reuse Node's pin. Revalidate the exact CA hash and prevent CA-file changes through
ownership/read-only permissions during the operation. Native options below use
certificate verification explicitly, not just --ssl. Official references:
[mariadb-dump](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump),
[mariadb client](https://mariadb.com/docs/server/clients-and-utilities/mariadb-client/mariadb-command-line-client).

Use a private0700 operator directory. A0600 source client file and a different
destination client file contain only their explicit synthetic host/port/user/
password, protocol=tcp, ssl-ca, ssl-verify-server-cert and supported minimum TLS
versions; files/parents are operator-owned and not symlinks. No defaults include
file or environmental credential override. Never use command-line passwords,
--print-defaults, raw grant logging or trace mode. --defaults-file must be first
argument so unreviewed global option files are excluded. Confirm actual binary
version/options in the isolated environment before treating these commands as usable.

```bash
# Run only inside approved instances, with actual protected paths already reviewed.
set +x
umask 077
mariadb --defaults-file="$REVO_SOURCE_CNF" --batch --skip-column-names \
  --database="$REVO_SCHEMA" \
  --execute="SELECT VERSION(),DATABASE(),@@hostname,CURRENT_USER(); SHOW SESSION STATUS LIKE 'Ssl_cipher';"
```

Review identity privately against pinned policy; nonempty cipher alone is not
hostname validation. Repeat using destination credentials/policy before restoration.
Assert zero tables/views/triggers/routines/events at destination with full metadata
visibility and actual intended schema charset/collation. Missing metadata privilege
is failure, not proof of emptiness. Stop on any mismatch, wrong version or no TLS.

## Backup creation and verification

1. Freeze source writers/DDL, acquire the migration named lock on a retained
   dedicated TLS connection and retain ownership through backup. Coordinate an
   application-consistent snapshot/table-read lock strategy with the DBA; neither
   a lock held by a short-lived client that exits nor --single-transaction alone
   proves DDL isolation. The separate backup principal needs proven SELECT/metadata/
   lock privileges. TRIGGER metadata privilege is also sensitive management
   authority; never give it to runtime. Do not grant ALL merely to obtain a dump.
2. While the freeze/lock remains, verify complete schema/ledger using existing
   snapshot.mjs schemaAndLedger/integrity/snapshot against a separately created
   **verified-TLS** pool with exact target checks. These read-only functions are
   reusable; the Windows utility's non-TLS pool/clientConfiguration/localPolicy
   functions are not used. The metadata snapshot contains all32 tables,85 exact
   checksums/status, row hashes/binary data/auto-increments and46 original definers.
   Store privately, not console output; snapshot can include sensitive metadata.
3. Capture exact definitions/order plus account/grant reconstruction separately
   under protected DBA custody. Dumping the schema does not include server users.
   Verify all required definers exist and their23-table TRIGGER/18-table SELECT
   dependencies are available. Source defaults, strict/FK/CHECK settings and
   source release/SQL/manifest fingerprints are part of the review packet.
4. Native dump into a new0600 owned file inside the isolated instance's protected
   staging area; refuse overwrite. Keep stderr private and check exit0:

```bash
set -o noclobber
mariadb-dump --defaults-file="$REVO_SOURCE_CNF" \
  --single-transaction --quick --skip-lock-tables --triggers --hex-blob \
  --no-tablespaces --skip-add-drop-table --skip-add-drop-trigger \
  --skip-add-locks --skip-disable-keys --complete-insert \
  --skip-comments --skip-dump-date "$REVO_SCHEMA" > "$REVO_NEW_SQL"
```

These flags preserve the existing reviewed native approach. Do not use --force,
strip definers or concatenate historical migration files. No --databases/CREATE
DATABASE: destination schema is separately reviewed and selected explicitly.
The dump can contain native session/constraint settings: review them, enforce
post-import FK/CHECK/integrity and fail on error; never waive constraints to accept
incompatible rows. Verify all triggers/definers exist in the dump, not just row
counts. Complete source snapshot and native exit/definition checks before releasing
freeze/lock. A concurrent writer invalidates this review.

5. Before exporting/storing outside that instance, authenticated-encrypt the dump
   using the existing archive.mjs AES256-GCM/HKDF helpers and authenticated manifest,
   with a **new synthetic backup key**, independent of access/MFA keys. Do not put
   key values in arguments/env dumps. A reviewed Node operator process reads it
   from a private file in a **separate key-custody directory**, not archive directory.
   `encryptDump` writes an exclusive file; `writeManifest` binds format1, complete:
   true, MariaDB/client version, safe archive basename, snapshot, source/release
   fingerprints, sqlSha256/sqlBytes, ciphertext sha256/bytes and key identifier.
   Required archive name matches magicreview-<safe-run-label>.sql.aesgcm. Preserve
   the helper's authenticated envelope; never edit its body to change target trust.
6. `decryptVerified(manifest,key)` with no output verifies archive/hash/MAC/GCM/
   SQL completeness before transfer. Test wrong-key/tampered/truncated/missing
   component refusal. Copy only encrypted archive/manifest to independent approved
   storage, verify bytes/authentication there, and test separate key retrieval.
   If no independent off-server destination exists, mark this pending. A second
   directory on the same disk is not off-server recovery.

The helpers are encryption primitives, not a complete Linux authorization/restore
executor. This procedure requires reviewer-controlled target and state checks
around them. Existing Windows tests of primitives do not validate Linux I/O/custody.

## Restore, original definers and final release hold

1. Authenticate metadata/key/archive first; compare exact85 release checksums to
   loadMigrations/validateManifest. Refuse incomplete/unrecognized schema release,
   missing46-trigger metadata/definitions, changed source identity or bad archive.
2. Reviewer confirms fresh, empty, independent destination and explicit restore
   authorization immediately before import. Recheck identity/emptiness under
   protected access and retained lock; prevent concurrent writers. Source and
   destination identities are different reviewed policies even if DNS/ports/names
   inside their independent namespaces match. No blind rerun after partial import.
3. DBA reconstructs original definer accounts and reviewed dependencies before
   importing. Use the same schema/account names on the independent instance.
   Restoring another definer can require SET USER administrative authority:
   use controlled restore/DBA principal, never runtime or a weakened strict migration
   profile. Stop if missing accounts/host mappings cannot be recreated. Do not
   replace DEFINER with restoring user or drop it from SQL.
4. Decrypt verified dump into a **new** private local file only after archive and
   destination acceptance; reverify authenticated SQL length/hash before import.
   A failure may leave plaintext/partial state: quarantine, preserve evidence,
   remove only specifically owned transient files under reviewed cleanup. No
   recursive reset or automatic DROP/DELETE-ledger procedure is supplied.

```bash
mariadb --defaults-file="$REVO_DESTINATION_CNF" --binary-mode \
  --database="$REVO_SCHEMA" < "$REVO_VERIFIED_PRIVATE_SQL"
```

Check exit0, lock ownership, full schema/ledger/row snapshots and exact46 definers/
trigger order/definitions. Refuse any integrity mismatch. Close/drain sessions,
restore exact runtime per-table grants and reduced creating-definer dependencies;
repeat all46 guards, actual DDL/ledger/trigger/grant/DELETE denials and application
tenant isolation. Test original synthetic MFA encryption, immutable publication/
history and public feedback/QR paths; no real email/provider operations.

## Failure matrix and measured objectives — all NOT RUN on Linux

| Injection | Required outcome |
| --- | --- |
| Wrong key, modified/truncated archive or missing component | Refuse before import; never publish incomplete metadata as complete. |
| Wrong/nonempty/unidentified destination or absent authorization | No import; preserve existing state. |
| Missing definer or incompatible checksums/schema | Refuse, not implicit remapping or baseline. |
| Interrupted import or DB crash | Keep destination quarantined, preserve exact partial state/audit; independently authorize repair/new isolated restore. |
| Wrong runtime grants | Refuse traffic; restore intended privileges only under separate DBA approval. |
| Post-restore data/hash/FK/CHECK/trigger/MFA mismatch | Fail closed; no relaxed constraints, secret replacement or partial GO. |

Record actual native backup/verification/transfer/restore/guard/service durations,
last independently verified copy timestamp and data-loss bounds. Proposed RPO<=24h/
RTO<=4h remain unapproved and unmeasured; no compliance claim. Reboot/encrypted
volume unlocking, off-server custody, legal retention and production recovery
authorization remain separate gates. The overall Phase2 status is BLOCKED/NO-GO
until the Linux exercise and independent acceptance occur.
