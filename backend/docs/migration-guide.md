# MariaDB migration foundation

## Task 21 additive schema

Versions 000067–000076 add commercial approvals, merchant-owned billing agreements,
append-only payment receipts and separate browser-view/AI-token usage, with matching
postconditions and six triggers. Current full manifest is 77 migrations, 30 tables,
41 triggers. Historical versions/prefix fingerprints are unchanged. Exact runtime
grant deltas are in database-privilege-matrix.md. No commercial seeds or production
migration occurred. Full disposable MariaDB validation and remaining provider gates
are recorded in task-21-test-report.md and task-21-remaining-gaps.md. Apply the full
ordered prefix using existing approval/preflight/lock/recovery controls; never
baseline, skip or automatically rerun an incomplete migration.

## Task 17 current operator workflow

All 000000-000066 migration/verification files remain unchanged. This guide's
local-only CLI commands remain supported and retain their guards. A separate
explicit operator CLI now implements preflight/apply/check-runtime using reviewed
target policies, exact grant profiles, structural manifests and explicit approval.
See [production-migration-runbook.md](production-migration-runbook.md) and
[migration-safety-report.md](migration-safety-report.md). No production migration
was run and no unknown existing schema is automatically baselined.

Regenerate the reference only through npm.cmd --prefix backend run migrate:manifest
with MARIADB_TEST_BIN pointing to the local 11.8.9 ZIP distribution. The script
creates its own disposable instance, applies every prefix, then writes
schema-manifest.json. Review SQL and all fingerprint changes together. Never
learn a new expected manifest from a live drifted database. This reference is
additional to the original immutable SHA-256 ledger checks, not a replacement.


Task 05 adds 000063_auth_session_version.sql and matching verification SQL.
It adds auth_sessions.auth_version, preserving rows with a default 0 that makes
pre-auth sessions require a new login. Apply before enabling new auth routes,
only on a separately authorized target. No production migration ran in Task 05.
The Task 04 inventory below is historical; the current manifest ends at 000063.

Task 03 runner plus Task 04 Phase 1 schema, locally verified on MariaDB 11.8.9.
Hostinger production was not contacted. No API/frontend functionality changed.
The existing pool now enables supportBigNumbers/bigNumberStrings so BIGINT IDs
round-trip as strings; the health routes and install/start lifecycle stay unchanged.
Full file/dependency inventory and test results: [schema-implementation-report.md](schema-implementation-report.md).

## Supported target and safety boundary

The operator CLI currently accepts **local disposable targets only**: explicit
MIGRATION_DB_HOST must be 127.0.0.1 or ::1, and the database name must match
`magicreview_migration_[a-z0-9_]+`. There is no remote/production override.
Use an independently provisioned empty development database. A local tunnel to
production is prohibited; loopback alone cannot identify what a tunnel reaches.

Runner accepts only MariaDB 11.8.x, matching the verified 11.8.9 family. MySQL,
older MariaDB, unknown version strings and future major/minor series fail before
DDL. It requires InnoDB default, utf8mb4/utf8mb4_unicode_ci, FK/CHECK enforcement
and strict SQL mode. It sets UTC, autocommit for durable progress, and a ten-second
metadata-lock wait bound on its dedicated session. These are migration
checks, not a claim that future business schema features are already verified.

The core runner accepts the existing pool abstraction for integration testing;
application code must not call it. The CLI reuses createDatabasePool, obtains one
session, holds it throughout and destroys it on completion. It intentionally
does not import dotenv/loadEnv or use application DB_* variables. Migration
credentials must be supplied separately through the process environment; never
commit them, print them or copy production credentials to local fixtures.

## Explicit commands

From the repository root:

```text
npm --prefix backend run migrate:status
npm --prefix backend run migrate:up
npm --prefix backend run test:migrations
npm --prefix backend run test:migrations:integration
npm --prefix backend run test:schema:integration
```

Before status/up, supply MIGRATION_DB_HOST, MIGRATION_DB_PORT,
MIGRATION_DB_NAME, MIGRATION_DB_USER and MIGRATION_DB_PASSWORD securely in the
operator environment, targeting the disposable local database described above.
No defaults select a database. No credential-bearing example values are included.
Commands compile TypeScript but do not trigger a connection until the explicit
CLI runs. npm install/prepare only compiles; server startup and health checks
never import migration code.

Status obtains the same exclusive advisory lock to avoid reading an in-flight
migration. It performs no persistent writes, including on a fresh schema. It
reports initialized/applied/pending versions as JSON and never prints database
names, account identities or connection values. A blocked history exits nonzero
with a fixed error code, not a raw driver message.

## Files and metadata bootstrap

`backend/migrations/000000_schema_migrations.sql` remains unchanged and creates
schema_migrations, an InnoDB tracking table. It stores version,
name, SHA-256 checksum, applying/applied/failed status, timestamps, elapsed time,
last verified step, safe failure code and a random runner ID.

Task 04 adds 000001 through 000062, each with matching .verify.sql. There are
23 business tables, 35 triggers and four safe catalog/role seed statements.
The schema includes tenants, identity/RBAC, hashed sessions/tokens, channels,
merchant resources, structured feedback, subscriptions/usage and audit history.
No platform tenant, users, admin password, plan prices, live review URLs or
authentication tokens are seeded. No business API implementation is included.

The ledger bootstrap runs under the exclusive lock, only on an empty schema.
If other tables exist without a ledger, execution stops for explicit inventory
and baseline review. Existing ledger columns/defaults/index/collation/engine
and unexpected triggers are checked; incompatible metadata is rejected.
Task 04 approves these schema files locally only. Do not apply them to an existing
live schema: inventory/mapping, backup restore and separate approval are still needed.

### Ordering and dependencies

- 000001–000009: channels, typed tenants, users, role/permission catalogs,
  memberships, sessions and tokens. Channels precede tenant channel ownership;
  memberships precede scoped invite tokens.
- 000010–000017: channel versions, branches, destinations, funnels, links, QR,
  structured feedback and status events, each after its referenced parents.
- 000018–000023: plans/limits, subscriptions, usage records/counters and audit.
- 000024–000055: owner/publication/append-only/token/publication guard triggers.
- 000056–000059: three channel catalogs, five roles, sixteen permissions and
  fifty-five explicit role-permission grants.
- 000060–000062: complete-plan publication/draft-insert/subscription guards.

The complete ordered manifest lists every SQL and verification file. Table
postconditions check InnoDB/collation, expected column set and named constraints;
trigger checks verify table/event/timing; seed checks verify exact definitions
and catalog/grant counts. Failure blocks the runner; no IF NOT EXISTS hides it.

Seeds use INSERT SELECT WHERE NOT EXISTS on stable unique codes/composite grant
keys. Replaying the same seed is harmless. A conflicting existing definition is
preserved and fails its postcondition; it is never overwritten or silently accepted.
Apply all versions before exposing any business services, since protection triggers
are later versions than the tables. No application runs against a partially applied schema.

There is an unavoidable bootstrap boundary: CREATE TABLE implicitly commits
before its own history row can be written. A crash after that CREATE leaves an
empty ledger. The next invocation reports BOOTSTRAP_INCOMPLETE_REQUIRES_REVIEW;
it never silently inserts a successful bootstrap marker into a preexisting table.
On a fresh successful run, the CREATE is verified before recording applied.

## File format and checksums

- Fixed-width contiguous versions starting at 000000, filenames
  `000001_description.sql`, exactly one server SQL statement per file.
- UTF-8 without BOM, LF newlines; .gitattributes enforces LF. No semicolon splitting.
  multipleStatements remains disabled. A compound trigger can be one server
  statement; client directives such as DELIMITER are not server SQL.
- A future non-bootstrap migration also needs `000001_description.verify.sql`:
  one reviewed SELECT returning exactly one row with `satisfied=1` only when its
  intended schema/data postcondition holds. It must not contain side effects.
- Bootstrap checksum is SHA-256 of the exact SQL UTF-8 bytes. Other checksums
  cover SQL bytes + one NUL separator + verification bytes. Both files become
  immutable once applied; this explicitly refines the earlier SQL-only proposal.
- Missing/gapped/duplicate versions, changed applied names/checksums and history
  without a matching source file fail closed. No baseline or checksum-rewrite flag.

## Locking and failure states

GET_LOCK uses a stable application/schema hash name under 64 bytes, a bounded
five-second wait, and requires result 1. Status/up/bootstrap all use that same
lock and dedicated connection. Named locks survive transaction commits. The
runner verifies ownership before each next migration, releases in finally and
destroys the session. It never reconnects and continues after losing the session.
Independent database servers/proxies without session affinity are unsupported.

Each non-bootstrap migration first persists applying, executes one reviewed statement,
checks its verification SELECT, then records applied. Execution/verification
failure records failed when possible. Connection loss may leave applying.
Either state blocks all later execution. A successful DDL statement followed by
a failed verification can leave schema changes committed: failed is not rollback.
No automatic retries, destructive rollback, down migrations or repair command
are provided. Raw server errors/SQL/credentials are never printed by the CLI.

## Recovery procedure (operator approval required)

1. Stop other migration attempts, preserve logs and make a verified backup. Do
   not edit checksums, source files or history to make the error disappear.
2. Establish the exact target, acquire the same exclusive lock on a dedicated
   session and inspect the blocked version and actual schema, privately.
3. Determine whether no change occurred, DDL completed before interruption, or
   partially intended state remains. DDL implicit commits cannot be undone by
   ROLLBACK. DML-only transactions can roll back; savepoints do not reverse DDL.
4. Prepare a reviewed forward repair preserving existing data. Re-run the original
   postcondition and verify all affected invariants. For an orphan bootstrap,
   compare the entire ledger shape and original checksum before considering an
   explicit operator baseline. Never automatically trust an empty ledger.
5. Only after explicit review, record the reconciliation and conditionally update
   the exact blocked ledger row with its original checksum and proven postcondition;
   preserve failure evidence separately. No automatic mark-applied operation exists.
   Release the lock and rerun status before any later migration.
6. If correctness cannot be proved, restore/rehearse in a disposable clone and
   obtain further approval. Do not drop/truncate existing tables to restart.

The integration suite demonstrates an operator-style additive repair of a
synthetic failed fixture in an isolated database; it is not a production repair
tool or authorization to manually change production history.

## Automated tests

Unit tests use Node's built-in test runner. Integration tests require a trusted
local Windows ZIP installation of MariaDB 11.8 (11.8.9 used in this task). Set
MARIADB_TEST_BIN to its absolute bin directory, then run the integration script.
The harness initializes a fresh OS-temp data directory with a random ephemeral
password and binds its own child server only to 127.0.0.1 on a reserved random
port. It does not read .env, accept a remote test URL, install a Windows service
or use Hostinger. All schemas are uniquely scoped within that disposable server.
No destructive SQL or DROP cleanup is performed. The server is stopped after
tests; temporary files remain for operator inspection/normal OS cleanup.

Tests cover version gates, file ordering/encoding/checksums, status without
writes, bootstrap/idempotency, lock exclusion across commit, existing-schema
refusal, incomplete bootstrap, committed DDL with failed postcondition, blocked
retry, explicit forward reconciliation, DML rollback/savepoints, ledger drift
and rejection of multiple SQL statements. The schema suite separately exercises
all approved hierarchy edges, forbidden edges/NULL cases, cross-tenant FKs,
uniqueness, CHECKs, transaction rollback, publication immutability including
case-only edits, safe seed replay/conflict detection and exact BIGINT round trips.
DELETE guard definitions are inspected without executing destructive SQL.
Windows harness support is explicit;
Linux/CI container orchestration is not implemented or claimed in this task.

## Outstanding production gates

User-reported Hostinger facts: MariaDB 11.8.9, InnoDB, utf8mb4_unicode_ci,
transactions/savepoints and ALL PRIVILEGES on the project database. This task
did not independently inspect Hostinger. ALL PRIVILEGES does not satisfy the
future append-only runtime design. Separate credentials, effective table grants,
Hostinger-specific trigger/grant checks, schema inventory and restore rehearsal
remain required. Local schema CHECK/FK/generated-index/trigger tests now pass.
The CLI intentionally has no Hostinger execution path.
