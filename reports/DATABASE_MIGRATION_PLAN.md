# Database migration plan ? approval-gated, unexecuted

2026-11-07. Scope: same-engine MariaDB11.8 to an external managed TLS writer endpoint.
No production target/source credentials were read, requested or used; no export,
provisioning, import, schema mutation or cutover performed. R = repository fact;
C = confirmation; P = proposed future operator procedure. MySQL conversion is a
separate engineering project, not hidden in this plan.

## 1. Repository architecture and preservation contract (R)

- mysql2 pool in backend/src/db/pool.ts: default5/max50 connections, fail-fast pool
  queue (waitForConnections=false), connect timeout3000ms, UTC, utf8mb4, BIGINT strings,
  multipleStatements=false. No startup DB query/migration and no automatic retry.
- auth/database.ts: parameter-bound execute, one acquired connection per transaction,
  UTC session, commit/rollback/finally release. Root point-record shared/exclusive lock
  ordering preserves feedback/quota concurrency. Savepoints isolate payment allocation.
- 85 immutable versioned SQL migrations, SHA-256 ledger, applying/failed refusal,
  GET_LOCK session exclusion, postconditions and full schema manifest. Current
  expected release32 tables/46 triggers; no assumption production already matches.
- Composite ownership FKs, named unique/index/CHECK definitions, immutable parents,
  published content, append-only history and generated unique root/subscription slots.
- Auth users/password hashes/versions, membership/role/permission records, sessions/
  revocations/refresh families, hashed auth/recovery codes, MFA ciphertext/counters/
  locks/pending references, audit and submission/idempotency records must survive.
  Keep AUTH_ACCESS_SECRET and AUTH_MFA_KEY unchanged and available through private
  custody. Copying DB ciphertext without its MFA key is not a usable recovery.

## 2. Approval and source discovery gate (C/P)

Name migration owner, DB/security reviewers, change window, business write fence,
RPO/RTO/retention, target region/budget/data residency and rollback authority. Approval
must cover secure source export, restricted target provisioning, isolated restore,
later cutover and privileged operator access independently; none is inferred here.

Inventory the actual source read-only through an approved provider mechanism:
engine/build/SQL mode, ledger rows/checksums/status, all table/column/index/FK/CHECK/
trigger definitions and order/definers/SQL mode, generated expressions, next IDs,
row counts, data hashes, total size, binary/JSON/time/decimal formats and any extra
objects. Determine all writers, sessions, jobs, mail/payment callbacks and pending
in-flight work. An empty database or schema matching the current release is **not**
assumed. Unknown tables/data, ledger drift/incomplete versions or unsupported objects
stop the procedure for explicit mapping/recovery review; never drop/baseline them.

The source has no authenticated DB CA/identity. Do not connect the application or
export tool over unverified TCP. Require Hostinger-assisted server-side consistent
export/snapshot delivered via an authenticated encrypted channel into encrypted
storage, with source identity, capture time and integrity manifest. If no secure
consistent export is available, migration is blocked. This route avoids weakening
the application's TLS policy; it is not permission for plaintext SQL transfer.

## 3. Target qualification before any production data (C/P)

Select exact MariaDB11.8.x patch, region and plan. Approve provider account, DNS CA/
identity, server-side TLS enforcement, firewall route from Hostinger, backup/PITR,
crypto custody and stable direct writer/session behavior. Provision separate minimal
runtime/migration/restore accounts; exact profiles are in database-privilege-matrix.md
and src/migrations/privileges.ts. Restore privileges are a separate temporary profile,
not runtime permissions; audit grant/revoke and keep definer identity supported.

On isolated nonproduction fixtures: verify TLS success plus wrong-CA/wrong-name/plain
transport failures; session-affine GET_LOCK ownership/concurrent refusal; strict SQL,
CHECK/FK/trigger behavior, JSON and BIGINT; exact grant parsing; metadata manifest;
backup/restore with the chosen provider version. Read-only preflight is not a dry-run
promise. A provider's different metadata formatting or rotating @@hostname can fail
strict target identity; review/rehearse rather than falsify expected values or loosen
checks. The diagnostic permits MariaDB11.8 only and proves connection, not full schema.

## 4. Consistent backup and restore rehearsal (P)

Freeze writes and DDL, drain app replicas, stop all background writers and inbound
mutation/webhook processing at ingress with a reviewed retry/reconciliation policy.
Do not run fake payment processing. Block platform/admin changes as well as merchant
writes. A migration advisory lock alone does not freeze application writes. Prefer
an owner-approved maintenance window to speculative online replication, because
source binlog/replication privileges/TLS are unconfirmed. No zero-downtime claim.

Take a provider-consistent encrypted recovery snapshot and a complete logical export
plus independent schema/row/hash manifest while fenced. Single-transaction export
covers InnoDB rows, not concurrent DDL; the fence and schema capture are essential.
Use version-matched mariadb-dump11.8 tooling through approved provider facilities;
credentials in private option files/secret channels, never argv/logs. Do not blindly
pipe unreviewed dumps or copy source mysql/system account databases.

Store authenticated encrypted artifacts, UTC capture time, engine/client versions,
release/migration hashes, table hashes/counts/next IDs and approved trigger-definer
mapping. Keep encryption keys/auth keys separately in protected recoverable custody.
Authenticate source and destination file transfer; checksum alone is not source trust.
Verify encrypted artifact integrity before restoration. No customer data in reports.

Restore only into a separately approved **empty isolated target**, with app ingress
and non-restore accounts fenced. If nonempty, stop; do not DROP/TRUNCATE/reset it.

1. Restore reviewed table/schema DDL, indexes, FKs, CHECKs and generated expressions,
   without triggers initially. Apply no fresh seeds on top of source data. Avoid dump
   DROP/CREATE DATABASE/USE statements targeting other schemas and hidden disables.
2. Load **base columns only**, preserving explicit IDs and bytes, in FK dependency
   order. Tenant self-parent records require ancestor-before-descendant order, not
   an unproven PK sorting assumption. Keep FK/CHECK checks enabled. Missing dependency,
   import warning or unexpected row stops restore; do not silently coerce/drop it.
   Generated columns must be recomputed, then compared, not loaded as arbitrary values.
3. Preserve the source ledger exactly, including checksums/statuses/verification
   evidence. Do not manufacture ?applied? rows, replay historical seeds or run the full
   migration runner against pre-populated application data. Incomplete source ledger
   is a separate forward-recovery gate. Missing newer versions require a separately
   approved post-restore forward-migration plan, not an implicit migration here.
4. Restore all46 expected triggers (or exact reviewed actual source prefix), names,
   bodies, execution order, SQL mode and creation charset/collation after data load.
   This is critical: migration000061 requires draft plans on INSERT and can reject
   historical published-plan imports if installed too early. Trigger-free target
   remains isolated throughout. Require all guards before any app/runtime access.
5. Recreate approved target **definer accounts/mapping**, not source server system users.
   Preserve trigger behavior and exact definitions; source root@localhost usually
   cannot be copied as a managed-service superuser. Keep the new definer identity alive
   with minimum needed privileges. No regex-based blanket DEFINER deletion or ignoring
   restore errors. Metadata manifest excludes DEFINER from structural hash, but the
   separate definer allowlist still must pass. Any other semantic change stops approval.
6. Preserve next AUTO_INCREMENT values at least at original next values and above
   restored maxima; compare all unique/generated slots. Preserve full schema names
   or explicitly review cross-schema references/mapping, never silently rewrite SQL.
7. Verify every base row/byte digest and every constraint/trigger/index against the
   captured source; confirm all target sessions have FK/CHECK/strict settings enabled.
   Only then admit a restricted QA application and run protected acceptance cases.

This is a reviewed procedure specification, **not shipped production restore tooling**.
The current scripts/recovery executor deliberately allows disposable loopback only,
requires11.8.9 and uses Windows native clients. Do not bypass its guard or point it
at source/target. A provider/DBA restoration mechanism must be approved and rehearsed.
AWS describes external logical import and separate trigger recreation; it does not
supply this application's integrity/definer/ledger verification automatically.
[Official RDS MariaDB import](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mariadb-importing-data-external-database.html).
RDS does not support mariadb-backup physical imports as a general native restore path:
[import options](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Procedural.Importing.html).

## 5. Verification evidence required (C/P)

- Full object inventory, named indexes/ordered columns/prefix lengths/uniqueness;
  ownership/role FKs and rules, CHECK text/enforcement, generated expression/results;
  trigger count/order/SQL mode/charset/body plus approved DEFINER mapping.
- Full per-table counts and deterministic typed row digests in PK order, including
  binary hashes/ciphertext and JSON raw text. Preserve NULL versus empty, decimal/
  unsigned BIGINT strings and UTC DATETIME(6). No JS Number conversion or lossy
  JSON reserialization. Existing snapshot code is a reference, not remote certification.
- No orphan FK, duplicate active-slot/root, missing safe seed, dropped audit/history,
  missing token/session/MFA state, shifted expiration time or changed counter/ledger.
- Actual QA authentication/MFA/recovery/refresh replay/logout and ancestry/RBAC;
  Clinic structured feedback/parallel paths; quota and original feedback concurrency;
  published immutability/idempotency and audit rollback; active-link/QR readiness.
  Use synthetic fixtures for mutations. Read-only real-record validation/clone use
  requires separate privacy authorization. Block real mail/payment/AI side effects.
- DB latency/connection limits under realistic Hostinger region RTT, restart/failover
  and actual patched engine; session timezone/server UTC clock/time sync for TOTP.
- Approved RPO/RTO demonstrated by isolated recovery; no restored content rolled back
  silently after users wrote new records. Dated reviewer sign-off, without secrets.

## 6. Final fenced cutover (P, requires later approval)

After rehearsal, retain source untouched/fenced, take final consistent source capture,
restore/verify target delta or full snapshot under the approved method, and verify
no writes happened after capture. Record the exact authority/time T0. Avoid untested
CDC/replication assumptions, especially across MySQL/MariaDB JSON/binlog formats.

Preserve signing/MFA keys and environment identities; change only the approved DB
host/port/name/user/password/CA path/hash in protected app configuration, with TLS
required. There is normally no API-domain DNS change for a DB-only cutover. Rebuild
only if a reviewed code release is needed; restart/drain all API replicas against
one authoritative DB, never mixed source and target writers.

While writes remain fenced, verify TLS connection/engine, separate runtime grants,
full ledger/manifest/definers, liveness/readiness and safe authenticated read checks.
If no target production writes occurred, abort cutover safely as described in the
rollback report; **source is still unsuitable for normal service under this TLS
policy**, so do not re-enable plaintext service there. Stay in maintenance if needed.
Enable one authoritative target writer only after explicit final approval and capture
a post-cutover recovery point. Monitor latency/TLS/locks/errors/backups and maintain
a protected change log. Financial/legal feature holds remain unchanged. Do not delete
source/artifacts until approved retention/acceptance and recoverability criteria pass.

## MySQL portability blockers (R/I; no port performed)

| Repository dependency | Why a MySQL move is separate engineering |
| --- | --- |
| runner.supportedVersion and diagnostic | Explicit MariaDB11.8 gate; do not relabel server/version or delete checks |
| PERSISTENT generated columns,000002/000020 | MySQL grammar uses STORED/VIRTUAL; unique root/current-slot behavior must remain. New dialect artifact/review required, not editing applied migration history |
| JSON physical type and CHECK metadata | MariaDB JSON is validated LONGTEXT; MySQL native binary JSON normalizes representation and comparison. Preserve exact published/audit text and retest duplicate keys/case/number semantics |
| Schema inspection/ledger verification | information_schema.STATISTICS.IGNORED, table/create options, CHECK metadata/generated expressions and EXTRA formatting are MariaDB-specific contracts; exact hashes/postconditions would differ |
| Server variables/grants | @@check_constraint_checks, CURRENT_ROLE(), SHOW GRANTS and role/global profile parsing require dialect redesign; missing MySQL variable would fail even before migration |
| REGEXP/collation/binary guards | Different regex engines and collation versions may alter validation/equality. Re-test all negative/case-only/Unicode constraints |
| FK and generated unique ownership keys | MySQL version restrictions on referenced/nonstandard keys differ; assess every composite FK/index, not just successful DDL parsing |
| Trigger/SIGNAL/DDL/grants | Both engines have triggers, but privileges, definers, ordering, metadata and implicit-commit behavior need full acceptance; managed proxies may not retain locks |
| CTE/locking/savepoints/advisory locks | Some syntax overlaps, but transaction/isolation/optimizer lock ordering/session semantics require repeated real concurrency tests; no arbitrary retries to hide regressions |
| Physical/replication/recovery | MariaDB physical files/GTIDs/JSON replication are not a generic MySQL restore format; current recovery and migration manifests are MariaDB-specific |

Primary references: [MariaDB JSON](https://mariadb.com/docs/server/reference/data-types/string-data-types/json),
[MariaDB generated columns](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns),
[MySQL generated-column grammar](https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html).
No claim that every overlapping SQL feature is incompatible; the combination and
strict tooling prevent a drop-in MySQL migration. Do not alter historical SQL/checksums.
