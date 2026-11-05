# Task 18 backup implementation and security report

2026-11-05. Implemented and verified on actual disposable MariaDB **11.8.9**.
No Hostinger connection, production backup/restore, production migration,
production configuration/grant change or production credential request occurred.
**Production readiness is not established.**

## Delivered system

The Node CLI wraps native mariadb-dump and mariadb clients with explicit local
target policy, exact connected database/server/account identity and 11.8.9
server/client gates. It supports backup, verify, target-fingerprint and confirmed
restore. Nonlocal/staging/production execution is refused; there is no override,
dotenv/app DB_* fallback, automatic overwrite or automatic destructive retry.

Backup holds the existing migration advisory lock and all-table READ locks,
including required FK-query aliases. This pauses application writes. Under those
locks it validates the complete approved schema/ledger, explicit FK/CHECK
integrity and a deterministic snapshot of every table. Native single-transaction
dump includes schema, data, inline indexes/FKs, 35 triggers with original
definers, migration history and append-only audit/usage history. A second snapshot
must match before the artifact is published. Visible routines/events, unknown
schema/drift or incomplete release history are rejected; current source has no
routines/events. Hidden provider objects need independent privileged inventory.

Each table snapshot includes exact count, SHA-256 of primary-key-ordered typed
row data and next auto-increment value. Streamed rows use date strings/BIGINT
strings to preserve DATETIME(6), binary values and decimal precision. The schema
fingerprints reuse Task 17's complete prefix reference, including indexes,
generated expressions, CHECK/FK definitions and trigger bodies/order/SQL modes.
The full original ledger content is included in table hashing, not reconstructed.

Dump stdout streams directly to AES-256-GCM, with a random 96-bit nonce and
versioned format/AAD. HKDF derives independent encryption and metadata-HMAC keys
from an externally supplied 32-byte master key. The private manifest records
capture/archive timestamps, key ID, validated versions, source/release
fingerprints, ciphertext and plaintext lengths/hashes, schema, original definers,
row counts/digests and relationship results. Metadata is authenticated rather
than encrypted and must be protected with the archive. No plaintext backup SQL
is written during export. Filename timestamp/UUID, private run directories and
exclusive hard-link publication prevent overwriting an existing artifact.

Manifest publication is last, after successful native exit and stable source
comparison. Empty/incomplete exports and stream failures are rejected. Artifact
verify checks metadata HMAC, file size/SHA-256, GCM tag and decrypted SQL digest;
it explicitly returns restoreVerified=false. It is not full restore validation.

Restore authenticates and decrypts completely into a private temporary file
before sending any SQL to the client. It requires target-bound RESTORE-EMPTY
confirmation, the shared lock, expected target/version and an empty destination.
It never drops/recreates a destination or strips/remaps trigger definers. A
durable private restore-state.json records importing, failed-unverified or
verified, with backup and target fingerprints. A native import failure or
interruption cannot become a verified result. A nonempty retry target is refused.

After actual import, schema, original trigger definers, every table count/content
hash, auto-increment state and full migration history must match. Every composite
FK is checked with an anti-join, and all 34 CHECK predicates are evaluated.
Reenabling foreign_key_checks alone does not validate imported rows: a dedicated
negative test creates an orphan in an isolated fixture and proves the verifier
detects it. A correctly authenticated archive with a deliberately wrong signed
count passes file integrity but fails actual restored-data verification.

## Security controls and boundaries

- Backup/restore client credentials are absent from native arguments and logs. A generated owner-only client.cnf
  supplies credentials; --defaults-file is first and excludes global/user client
  option inheritance. Native child environments omit recovery passwords, backup
  keys, MFA/JWT secrets and unrelated app environment. Raw native stderr is not
  relayed; only fixed failure codes/numeric diagnostics are retained.
- Private directories use Unix permissions or Windows owner-only DACLs. Output
  must be outside the repository and common public-root paths; the tool creates
  a private subdirectory instead of changing a shared root's ACL. Operators must
  also exclude web aliases and use encrypted volumes. Artifacts are never placed
  in frontend/public directories. Exclusive publication preserves existing files.
- Restore SQL and client credentials are temporary plaintext only in that private
  directory, removed after child handles close. Cleanup removes only known owned
  paths and an empty directory, not recursive unknown paths. Hard termination/OS
  failure can leave protected files; unlink is not secure forensic erasure.
- Current execution is disposable loopback TCP, not remote TLS. Native ssl=0 is
  restricted to that local-only topology, consistent with the existing test pool;
  TLS policy fields are explicitly rejected rather than silently ignored. The
  initial native-client TLS 2026 failure on the local fixture led to this explicit
  transport boundary, not a remote certificate-verification bypass. Provider TLS
  and application runtime TLS remain separate unverified/unimplemented gates.
- A separate backup account succeeded with source-project SELECT/TRIGGER/LOCK
  TABLES rights and no source-project DML/DDL. Missing rights fail closed. Restore
  privilege/definer support is independently required; the local restore uses its
  disposable root fixture. No provider roles, PUBLIC rights or grants are assumed
  safe, automatically granted or weakened. Task 17 privilege hardening remains.
- Backup keys are independent of MFA/signing keys. DB restore preserves encrypted
  MFA, hashed recovery/session tokens and audit/history exactly. Application tests
  prove MFA and tenant/quota controls still work; configuration/key recovery and
  incident session revocation are separate approved procedures, not silent edits
  made to force hash equality. Fence the old primary before promotion.

## Verification results

| Command from repository root | Result |
| --- | --- |
| npm.cmd --prefix backend test | 32 passed |
| npm.cmd --prefix backend run test:integration | 149 passed across all 13 integration files, including MFA, quotas, feedback concurrency and recovery |
| npm.cmd --prefix backend run test:recovery:integration | Dedicated actual rehearsal also passed all 14 included tests |
| npm.cmd test | 19 frontend tests passed |
| npm.cmd run test:browser | 8 API-fixture browser tests passed |
| npm.cmd run test:e2e:real | 11 real React/Express/MariaDB browser tests passed |
| npm.cmd run test:server | 1 production frontend server test passed |
| Frontend/backend TypeScript checks and production builds | Passed |
| npm.cmd run lint | Passed; two unchanged landing/demo warnings |
| git diff --check | Passed |

Total: **220 distinct tests**, no final failures/skips. Test files run sequentially
for Windows ZIP initialization as established in Task 17; internal real concurrent
quota/feedback workers remain enabled. Run real-stack E2E separately from database
fixture initialization batches. No existing assertion/test was removed or disabled.

The actual source contains data in all 26 tables: hierarchy, global identity,
MFA/session/reset state, membership/catalogs, published channel/funnel, branch,
Google destination, short link, real QR metadata, structured feedback/status
history, synthetic subscription/limits/counters/usage and audit rows. Unicode and
microsecond datetime preservation are checked. Original and restored counts and
all table hashes match before intentional post-restore application mutations.

Restored tests use real services and Express HTTP, not response mocks: primary
Super Admin authentication still requires MFA; stored recovery codes work;
merchant/peer isolation holds; public options remain independent; anonymous
feedback retry is idempotent with correct usage; feedback status changes audit;
subscriptions and deterministic QR content work. Publication and append-only
triggers and ownership FKs reject invalid writes. The existing full-stack browser
suite separately remains green on its own actual disposable database.

See [restore-rehearsal-report.md](restore-rehearsal-report.md) for exact observed
counts/digests/timings and [disaster-recovery-runbook.md](disaster-recovery-runbook.md)
for exact commands. Evidence is ignored local .tmp-frontend/recovery/result.json
and task18-*.log; encrypted test artifacts remain in protected OS-temp directories,
not source control. No password, raw factor, key or SQL dump is reported.

## Limitations and remaining blockers

No production/provider backup, restored provider clone, off-site transfer,
scheduled retention/alert service, lost-key drill, PITR or representative-volume
capacity test was performed. RPO/RTO and retention are business decisions.
The current CLI is local-only and native execution was tested on Windows;
provider/Linux native binaries, limits, accounts and transport require review.
The READ-lock consistency strategy has an approved write-pause requirement and
does not stop arbitrary privileged DBA operations; source DDL must remain frozen.
Hidden routine/event metadata and foreign-definer authorization need provider
inventory. A file-integrity check cannot replace actual restore/application proof.

C3's missing-local-rehearsal gap is addressed, but provider restore and operational
RPO/RTO/key/off-site evidence remain open. Historical secret rotation, actual
target baseline, provider grants/definers/TLS, runtime TLS and existing operational
privacy gates still block production. MFA, quota enforcement, migration history,
schema constraints and the feedback concurrency correction were preserved.

## Complete Task 18 file inventory

| File | Purpose |
| --- | --- |
| [backend/docs/backup-implementation-report.md](../docs/backup-implementation-report.md) | This implementation/security report, tests, limitations and complete inventory |
| [backend/docs/backup-recovery-runbook.md](../docs/backup-recovery-runbook.md) | Current procedure/evidence links superseding historical no-rehearsal scope |
| [backend/docs/disaster-recovery-runbook.md](../docs/disaster-recovery-runbook.md) | Exact commands, capture/restore/incident sequence, encryption, retention and owner decisions |
| [backend/docs/hostinger-deployment-checklist.md](../docs/hostinger-deployment-checklist.md) | Backup/recovery provider evidence requirements and local-only boundary |
| [backend/docs/production-blockers.md](../docs/production-blockers.md) | C3 local rehearsal evidence versus remaining operational/provider gates |
| [backend/docs/production-readiness-report.md](../docs/production-readiness-report.md) | Current Task 18 evidence with unchanged NOT READY verdict |
| [backend/docs/provider-backup-validation.md](../docs/provider-backup-validation.md) | Unexecuted provider export/import, privilege, transport, capacity and key checklist |
| [backend/docs/restore-rehearsal-report.md](../docs/restore-rehearsal-report.md) | Actual measured restore evidence, counts/digest and successful/negative workflows |
| [backend/package.json](../package.json) | Explicit recovery CLI and dedicated recovery integration command |
| [backend/scripts/recovery/archive.mjs](../scripts/recovery/archive.mjs) | Streaming AES-GCM, HKDF/HMAC metadata, integrity verification and exclusive publication |
| [backend/scripts/recovery/cli.mjs](../scripts/recovery/cli.mjs) | Explicit local target selection, confirmation, protected environment and signal handling |
| [backend/scripts/recovery/files.mjs](../scripts/recovery/files.mjs) | Private permissions/Windows DACLs, isolated native options, filtered environment and bounded cleanup |
| [backend/scripts/recovery/snapshot.mjs](../scripts/recovery/snapshot.mjs) | Full schema/ledger and streamed precise row snapshots plus explicit FK/CHECK validation |
| [backend/scripts/recovery/utility.mjs](../scripts/recovery/utility.mjs) | Consistent native backup, confirmed empty-target import, metadata/state and post-restore comparison |
| [backend/test/recovery.integration.mjs](../test/recovery.integration.mjs) | Actual source/export/import rehearsal, corruption/failure cases and restored services/HTTP |
| [backend/test/recovery.test.mjs](../test/recovery.test.mjs) | Target/key/path safeguards, child environment and exclusive publication tests |

16 Task 18 files. Existing migration SQL/history, schema constraints,
authentication, tenant, quota and feedback implementation sources remain unchanged.
