# Hostinger production preflight and recovery readiness

2026-11-12. **Preparation complete; production initialization NO-GO.** Read-only
repository review, public documentation and disposable local testing only. No
production SQL/connection, hPanel/permission/environment/credential change,
deployment, real migration/bootstrap, purchase, commit or push. Initial Git tree
clean at4c07187. Only this report added; logs ignored under
`.tmp-frontend/production-preflight-readiness/`.

## 1. Completed review and default-denied status

Read [wildcard implementation](HOSTINGER_WILDCARD_POLICY_IMPLEMENTATION.md),
[compatibility assessment](HOSTINGER_CLOUD_MIGRATION_COMPATIBILITY.md),
[production migration runbook](../backend/docs/production-migration-runbook.md),
actual operator/policy/runner/privilege/setup/transport and recovery source/tests.
The assessment's old unimplemented status is superseded by the implementation.

`targetPolicy.hostingerWildcard` remains optional with **no default**. It cannot
coexist with cloudStartup or alternate definers. No global environment switch
selects it; normal API DB_* configuration does not activate it. Strict and
exact-scope Cloud interpreters still reject raw wildcard scope. Missing policy,
approval, wrong phase, identity/release/grant drift or expiry refuse; no fallback.
API startup itself does not run operator privilege verification, so release must
enforce that gate independently.

Owner-confirmed current context: Node24/Express running; MariaDB11.8.9 at127.0.0.1:3306,
database u676472791_magicreview_db, user u676472791_magicrev_user with ALL; expected
empty initial target; health alive/readiness up; hPanel individual checkboxes.
None was queried live here. Username does not establish CURRENT_USER's matched
host. Live target inventory, deployed source/compiled parity, grants and backup
remain unverified. Liveness/readiness are not schema/permission/MFA acceptance.

## 2. Current local verification

| Executed command/check | Actual result |
| --- | --- |
| `npm.cmd --prefix backend test` |Backend build passed;96 unit cases passed,0 failed/skipped/cancelled |
| Three recovery/local/wildcard integration files, sequentially |30 cases passed,0 failed/skipped/cancelled;60.3seconds |
| `npm.cmd --prefix backend run typecheck` |Passed |
| `npm.cmd run lint` |Passed |
| loadMigrations/validateManifest, compiled entry and release fingerprint |Passed;85 ordered migrations; dist/server.js exists |
| Historical migration/verify/manifest Git diff |Unchanged |
| Report links/whitespace; `git diff --check` |Passed |

**126 cases passed in this task**, including node:test parent cases. Integration
command, with fixture-only MARIADB_TEST_BIN selecting the existing local11.8.9 ZIP:

```text
node --test --test-concurrency=1 backend/test/hostinger-wildcard.integration.mjs backend/test/recovery.integration.mjs backend/test/hostinger-local.integration.mjs
```

Actual compiled startup reached listen locally in466ms with synthetic required-TLS
configuration and472ms in the HOSTINGER_LOCAL fixture; these are separate single
local observations, not provider cold-start measurements. Tests exercise liveness200/
DB-unavailable readiness503 and readiness200 against disposable MariaDB, mandatory
MFA/session/tenant checks, all85 migration entries/full manifest,46 guards/definers,
actual CLI preflight/apply/verify/runtime/bootstrap phases, grant reduction/ALL
refusal/broader authority, interrupted migration and native encrypted restoration.
Wrong key/tamper/truncation/incomplete/interrupted import and wrong/nonempty target
refusals also passed. All recovery execution was disposable only.

Historical full backend result **327 cases passed** is recorded in the implementation
report. This task reruns the checks explicitly listed above; it does not re-label
all327 as freshly executed. Windows results are not Linux/Hostinger certification.

Local compiled server exists: backend/dist/server.js. Offline artifact verification
accepted85 migrations000000–000084 plus all required verification files/manifest.
Expected final artifact remains32 base tables and46 original triggers.

Canonical manifest fingerprint:
`4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735`.

Current local compiled/SQL/manifest release fingerprint:
`b11e4ab01d9126c67030f27c91b3f0f775c6ce101f5e46aeee8d9889e6ff681d`.

The fingerprint matches the earlier local implementation, not proof of deployed
bytes. Hash the actual reviewed Hostinger artifact independently before approval.
This release hash covers installed dist .js, migrations/verification SQL and manifest;
dependency lockfile, Node/native Argon2 and supply-chain provenance need separate
review. Never overwrite policy hashes automatically to accommodate drift.

## 3. Required operator inputs and genuine records

All future commands below are **review-only**, to be run by an authorized
Hostinger-side operator after separate access/phase approval. None ran here.
Do not put passwords in CLI arguments, shell history or chat. Disable shell tracing,
use private non-recorded session/approved secret injection and private directory0700,
files0600 or equivalent reviewed ACL. Raw SHOW GRANTS can contain authentication
hashes: keep its complete evidence protected and never log/paste it.

| Input/evidence | Required value or verification |
| --- | --- |
| Release |Approved commit/artifact, Node24/Linux native dependencies, compiled server/operator/setup,85 exact SQL/verify bytes and manifest; actual release fingerprint |
| Target environment |production; explicit HOSTINGER_LOCAL;127.0.0.1:3306; database u676472791_magicreview_db |
| Target identity |Actual @@hostname; CURRENT_USER must exactly u676472791_magicrev_user@127.0.0.1; actual MariaDB11.8.9; no active role/extra PUBLIC authority |
| Transport record |Genuine finalized unencrypted-loopback risk decision and review conditions; HOSTINGER_LOCAL_APPROVAL_ID matches policy.hostingerLocalApprovalId |
| Transport acknowledgement |HOSTINGER_LOCAL_APPROVAL exactly I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT |
| Operator credential |MIGRATION_DB_USER/PASSWORD protected in operator process; no DB_* fallback or dotenv |
| Wildcard authorization |Genuine record for actual broader scope; HOSTINGER_WILDCARD_APPROVAL_ID equals nested approvalId; no implication of exact isolation |
| Review/recovery/enduring risk |Real operatorReference, recoveryReference and runtimeApprovalReference; approver must have authority for full affected risk; named independent reviewer |
| Time windows |Actual reviewed notBefore/expiresAt UTC ISO datetimes; initial/verify/bootstrap <=1hour; runtime <=30days; phase-specific approval |
| Phase and fingerprints |initial/verify/bootstrap/runtime; actual grantFingerprint, manifestFingerprint, releaseFingerprint; each reviewed policy canonical digest |
| Wildcard acknowledgement |riskAcknowledgement exactly I_ACCEPT_WILDCARD_SCHEMA_AUTHORITY_AND_SHARED_DEFINER_RISK |
| Recovery gate |Protected verified backup and isolated restore evidence, account/definer procedure, accepted RPO/RTO/retention/key custody and authorized restorer |
| Maintenance |API/writers stopped while account elevated, no competing DDL/retries, operator/reviewer/window and rollback/repair responsibility |

References use existing8–80 ASCII letters/digits/dot/underscore/hyphen, start
alphanumeric and reject REPLACE_WITH_. Valid syntax is not genuine authorization;
the release reviewer must check records independently. No approval records supplied
or invented by this task. API transport approval does not grant migration authority.

## 4. Step-by-step preflight procedure

### A. Gates before any production connection

1. Obtain independent written authorization for read-only identity/inventory/preflight
   access, separate from this preparation task. Review wildcard/shared-definer and
   unencrypted-transport risk ownership, final permission transition and recovery.
   Without accepted final-state/recovery evidence, do not schedule initial apply.
2. Verify real Hostinger backend working directory, Node24 and compiled artifact;
   use approved deployed release rather than an arbitrary temporary build folder.
   Do not install/build/migrate automatically on server start.
3. Compare immutable artifact bytes and generate offline fingerprints on that
   reviewed backend. Example Bash command reads only installed project artifacts:

```bash
node --input-type=module <<'NODE'
import {readFileSync} from 'node:fs';
import {loadMigrations} from './dist/migrations/runner.js';
import {validateManifest,digest} from './dist/migrations/schema.js';
import {wildcardReleaseFingerprint} from './dist/migrations/hostinger-wildcard.js';
const files=await loadMigrations(new URL('./migrations/',import.meta.url));
const manifest=JSON.parse(readFileSync('docs/schema-manifest.json','utf8'));
validateManifest(manifest,files);
if(files.length!==85||files[0].version!=='000000'||files.at(-1).version!=='000084')
  throw Error('Unexpected reviewed release');
console.log(JSON.stringify({manifestFingerprint:digest(manifest),
  releaseFingerprint:await wildcardReleaseFingerprint()}));
NODE
```

### B. Separately authorized identity/inventory checks

4. Using an approved private client through the intended endpoint and same actual
   account, inspect these read-only queries privately. No query below was executed
   against production. phpMyAdmin's own login identity may differ from the API
   account, so phpMyAdmin output alone may not pin the intended principal.

```sql
SELECT DATABASE(),VERSION(),@@hostname,CURRENT_USER(),CURRENT_ROLE();
SHOW GRANTS;
SELECT @@default_storage_engine,@@character_set_database,@@collation_database,
       @@session.foreign_key_checks,@@session.check_constraint_checks,@@session.sql_mode;
SELECT TABLE_NAME,TABLE_TYPE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA='u676472791_magicreview_db' ORDER BY TABLE_NAME;
SELECT TRIGGER_NAME,DEFINER FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA='u676472791_magicreview_db';
SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES
 WHERE ROUTINE_SCHEMA='u676472791_magicreview_db';
SELECT EVENT_NAME FROM information_schema.EVENTS
 WHERE EVENT_SCHEMA='u676472791_magicreview_db';
```

5. Stop on wrong identity/version, role/global/unknown/extra grants, unexpected
   objects or insufficient metadata visibility. Empty SHOW TABLES alone is not a
   complete empty inventory. Require InnoDB, utf8mb4/utf8mb4_unicode_ci, strict SQL
   mode and FK/CHECK enforcement; do not change them to evade checks. Do not test
   lookalike creation or forbidden DDL on production: those belong in disposable
   rehearsal, not this read-only phase.
6. Review complete grant rows independently, then calculate authority fingerprint
   offline with inspectWildcardGrants. Initial/verify/bootstrap must have one raw
   schema ALL row for the reviewed account, optional global USAGE only. Runtime
   must have exactly the four reduced privileges. Never replace real rows with an
   invented expected GRANT string merely to obtain a passing fingerprint.
   grantFingerprint is authority-only, not a raw SHOW GRANTS file hash.
7. Prepare a **new private reviewed phase=initial target policy** with actual
   evidence, genuine references and windows from section3. Omit cloudStartup,
   tlsCaFile/tlsCaSha256; leave allowedTriggerDefiners absent/default[]. Do not
   automatically activate it or emit a ready-to-use policy with made-up values.
   Canonical target digest comes from digest(targetPolicy.parse(JSON)), not sha256sum
   of JSON bytes. Generate new policy per phase, not automatic phase mutation.

### C. Separately authorized operator preflight

8. Inject only approved protected operator credentials, matching transport and
   wildcard approval references. From backend, using actual private paths obtained
   interactively (no executable placeholder paths), future Bash invocation is:

```bash
read -r -p 'Reviewed initial target policy path: ' REVO_TARGET
read -r -p 'New private preflight report path: ' REVO_PREFLIGHT
node dist/migrations/operator-cli.js preflight \
  --target "$REVO_TARGET" --environment production --report "$REVO_PREFLIGHT"
```

9. Require exit0, mode preflight, initialized:false, applied:[],85 pending versions,
   correct manifest/target/approval expiry and release fingerprint, permissionPolicy
   hostinger-wildcard, phase initial, exactDatabaseIsolation:false, encrypted:false,
   actual raw pattern, retained ALL and residual warnings. Compare real report
   arrays, not guessed count fields. Report must be new/exclusive-created.
   Preflight performs queries/session-setting changes and acquires/releases a
   transient named lock; it does not create schema or seed data and is not a dry-run
   guarantee that all future DDL can execute.
10. Stop after report/reviewer acceptance. No apply, bootstrap, privilege reduction
    or deployment follows automatically. Preflight expires within15minutes; the
    earlier privilege-window deadline also applies. Refresh by new authorized
    preflight/review, not by extending a file's expiresAt manually.

## 5. Proposed migration and reduction sequence — not authorized here

1. Approve tested recovery and actual provider final-state capability first. Capture
   fresh protected backup/current identity/object inventory; keep API/writers closed.
2. Fresh initial preflight and separate production apply approval; canonical
   APPLY-PRODUCTION digest confirmation, new exclusive/fsynced audit, dedicated
   named lock and exact target/grants/release/manifest. All85 SQL bytes immutable.
3. After successful execution_completed/exit0, independently approved **verify**
   policy and verify-complete status; never reuse initial-only preflight on the
   populated schema. Require all85 applied and full32-table/46-trigger definitions
   and original shared definer. Counts alone do not establish correctness.
4. If real first owner is separately authorized, resolve MFA-key remediation and
   run **bootstrap** phase while reviewed ALL/metadata rights remain. Existing
   root/idempotency/transaction/password/MFA checks remain. Do not add another
   owner or rerun setup to reset a password. No real owner was created here.
5. Provider-authorized hPanel reduction below; close/drain old sessions and reconnect.
   Re-inspect real identity/grants, create separately reviewed **runtime** policy
   with new actual grant fingerprint and genuine enduring approval.
6. Run check-runtime with that policy, inspect disclosures and perform authorized
   application acceptance. Keep API closed if reduction/check fails. ALL cannot
   be silently retained as a substitute runtime state. Future maintenance or failed
   migration needs a different reviewed recovery/maintenance path, not reuse of
   initial-only policy.
7. Independent deployment/traffic release only after these gates and actual URL/
   runtime evidence. Passing a local test or expiring a policy does not change
   server grants or authorize production work.

## 6. Exact hPanel permission reduction and verification

**Do not change permissions during this task.** Future action requires named
operator/reviewer and explicit permission-change approval after completed schema/
bootstrap steps, with API stopped. Provider-controlled checkboxes—not self-GRANT/
REVOKE—must perform reduction; current account lacks grant-management authority.

Hostinger's documented route is Websites → Manage site → Databases Management →
List of Current MySQL Databases And Users → desired DB ⋮ → Change Permissions →
Update. Review actual selected database/user before saving. Documentation confirms
checkbox changes, not the exact available TRIGGER option or resulting SQL grants
for this subscription. [Official permission procedure](https://www.hostinger.com/support/4564363-how-to-change-permissions-for-a-database-user-in-hostinger/).

| Checkbox setting | Desired final state |
| --- | --- |
| SELECT |Enabled |
| INSERT |Enabled |
| UPDATE |Enabled |
| TRIGGER |Enabled; required for the retained creating definer |
| ALL PRIVILEGES / select-all control |Disabled; four selected privileges only |
| Every other permission |Disabled, including DELETE/DELETE HISTORY, CREATE, ALTER, DROP, INDEX, REFERENCES, views, routines/EXECUTE, EVENT, temporary tables, LOCK TABLES, administration/GRANT OPTION if shown |

If hPanel lacks TRIGGER, bundles extra rights, cannot remove ALL, changes the account/
pattern, or reintroduces privileges after update/restart, **STOP/NO-GO**. Do not
assume a label or checked UI proves effective permissions. USAGE on *.* is a baseline
no-privilege grant permitted by the checker, not an extra authority checkbox to
remove. No other global or inherited authority is accepted.

After separately authorized Update, drain/recreate pools/operator connections as
provider requires; confirm session/privilege persistence across reconnect and
deployment. In a new connection, SHOW GRANTS should have a schema row equivalent
in authority to the following **illustrative output, not SQL to execute**:

```text
GRANT SELECT, INSERT, UPDATE, TRIGGER ON `u676472791_magicreview_db`.*
TO `u676472791_magicrev_user`@`127.0.0.1`
```

Order may differ; optional global USAGE/authentication clauses are handled by the
interpreter. Unexpected additional rows/options or scope differences refuse. This
is still a raw wildcard pattern: it is **not exact isolation**. Do not escape or
edit the captured evidence to make validation pass.

The runtime target uses phase runtime, reviewed reduced grant fingerprint, same
target/release/manifest and separately approved enduring risk/window. Future
read-only checker invocation (after all approvals, no command ran here):

```bash
read -r -p 'Reviewed runtime target policy path: ' REVO_RUNTIME_TARGET
node dist/migrations/operator-cli.js check-runtime \
  --target "$REVO_RUNTIME_TARGET" --environment production
```

It uses MIGRATION_DB_USER/PASSWORD in the separate protected operator process, now
the same actual reduced shared principal—not a different invented runtime user.
Require exit0, mode check-runtime, phase runtime, permissionPolicyAccepted:true,
85 complete applied/no pending, exactDatabaseIsolation:false, encrypted:false and
only SELECT/INSERT/UPDATE/TRIGGER retainedPrivileges. It validates full schema/
ledger/definers under the named lock. It does not claim unqualified verified:true,
exact scope or continuous runtime monitoring. Do not rerun bootstrap/initial apply
with this policy. Record sanitized output privately with reviewer.

Reduced account still has broad tenant/identity/role/ledger writes and TRIGGER
management on matching schemas. Normal guards remain, but this credential can
tamper with them. Approval expiry does not revoke these powers. Scope/transport
and shared-definer risks need enduring approval independently of checkbox reduction.

## 7. Backup and recovery acceptance

| Required content | Local evidence and production gap |
| --- | --- |
|32 tables/85 ledger entries and exact checksums |Native fixture snapshot/restore compares full schema/history; actual production backup/inventory unverified |
|46 trigger definitions/order/DEFINER identities |Fixture/native dump and separate-instance restore preserve originals; same-account rights and guard activation tested; hPanel import preservation unverified |
|Data/indexes/FKs/CHECKs/generated columns/auto-increments |Snapshot/schema/row/relationship integrity and invalid-write tests; production tool flags/metadata visibility/referential coverage must be rehearsed |
|Users/password hashes/sessions/tokens/MFA ciphertext/recovery state |Synthetic restored application tests pass; separately protected matching auth keys are essential and not included in ordinary SQL backup |
|Encryption/integrity/completeness |Authenticated encrypted archive/manifest; wrong-key/tamper/truncation/incomplete/interrupted import cases refuse; off-server custody and production key retrieval not demonstrated |

Existing `backend/scripts/recovery/utility.mjs` is intentionally **disposable-only**:
local policy/literal loopback/magicreview_migration_* target, Windows native .exe
clients and no production TLS policy. Do not relabel the real Hostinger schema as
local or remove safeguards. New wildcard test uses a direct fixture-native procedure
with protected client files and separately launched instance; it does not make
the production recovery CLI usable on Hostinger.

Before production initialization require:

- Authorized backup of the exact current target, even if empty, including other
  objects/schema defaults and separate account/grant/definer reconstruction metadata.
  A dated hPanel snapshot listing is not proof of integrity/completeness/restore.
- Reviewed supported provider/native recovery mechanism. Confirm native client
  availability/options and account/definer privileges, or provider restoration
  capabilities. Standard phpMyAdmin/hPanel import must not be assumed to preserve
  all46 triggers/definers. One-user restrictions may prevent faithful isolated
  restoration; obtain an approved feasible route before apply.
- Independent isolated restore with original schema/account identities, full ledger/
  schema/row comparisons, all46 guards after reduced-definer transition and matching
  synthetic auth/MFA/tenant/public application acceptance. No production restore test.
- Defined consistency method: freeze competing writers/DDL, named migration lock
  plus required native snapshot/table locks; single-transaction alone does not
  protect against concurrent DDL. No errors-ignored/force dump/import.
- Authenticated encrypted artifacts, verified off-host copy, independent backup
  key custody/retrieval and separately preserved auth/MFA key compatibility. Approve
  retention/legal requirements, accountable restorer and measured RPO/RTO. Suggested
  older24-hour/4-hour values remain proposals, not an achieved guarantee.
- Partial failure plan: stop writers/retries, retain applying/failed ledger/original
  SQL/audit and establish committed/in-flight DDL. Rehearse additive repair or restore
  on clone and obtain fresh approval; never delete ledger, alter old checksums,
  disable constraints, mark applied or DROP/reset production for a fresh start.

## 8. Deployment/environment readiness

Future Cloud settings: Node24; app root backend; build npm run build; start npm
start; entry dist/server.js relative to backend. Repository-root equivalent is node
backend/dist/server.js. Complete build/install before runtime listen timer; do not
start frontend server.mjs or put migrations/SMTP verify/install into startup.
Actual Hostinger selected settings/compiled Linux artifact remain unverified.

API process variables, supplied privately only under later approval:

| Names | Expected settings/formats |
| --- | --- |
| NODE_ENV / HOST / PORT |production /0.0.0.0 /actual provider-assigned positive port1–65535 |
| HTTP_PROXY_MODE |Omit/default direct for current Cloud topology; VPS single-Nginx mode not selected |
| DB_HOST / DB_PORT / DB_NAME |127.0.0.1 /explicit canonical3306 /u676472791_magicreview_db |
| DB_USER / DB_PASSWORD |Actual shared account/private credential; production password>=16characters,>=8 distinct |
| DB_CONNECTION_LIMIT |Default5; optional1–50 within reviewed plan budget |
| DB_TLS_MODE / HOSTINGER_LOCAL_APPROVAL / HOSTINGER_LOCAL_APPROVAL_ID |Explicit approved HOSTINGER_LOCAL /exact acknowledgement /genuine transport record |
| DB_TLS_CA_FILE / DB_TLS_CA_SHA256 |Both unset in local mode; no empty/dummy values |
| PUBLIC_FUNNEL_ORIGIN / PUBLIC_WEB_ORIGIN |https://api.revexoe.com /https://revexoe.com, exact served HTTPS origins |
| CORS_ORIGINS / AUTH_RECOVERY_URL |https://revexoe.com /https://revexoe.com/recover; no wildcard/path in origins |
| AUTH_ACCESS_SECRET / AUTH_MFA_KEY |Canonical standard Base64;32–128 bytes /exact32 bytes;>=16 distinct decoded bytes and different keys; preserve existing custody/ciphertext |
| AUTH_SMTP_HOST / AUTH_SMTP_PORT / AUTH_SMTP_USER / AUTH_SMTP_PASSWORD / AUTH_MAIL_FROM |Real provider host/port/private credentials/approved bare sender; password>=16chars and8 distinct;465 implicit or587 STARTTLS defaults |
| AUTH_SMTP_SECURITY |implicit/starttls; explicit for nonstandard port |
| AUTH_SMTP_TLS_SERVERNAME / AUTH_SMTP_CA_FILE / AUTH_SMTP_CA_SHA256 |Optional approved TLS identity/private CA only; CA pair real/validated, normally omit |

Production reads injected environment, not backend/.env. SMTP and auth/MFA remain
mandatory even though startup does not await network verification. Leave optional
AI/payment groups wholly absent while disabled; no financial execution authorized.
BOOTSTRAP_* and HOSTINGER_WILDCARD_APPROVAL_ID/operator credentials are operator
inputs, not needed for normal API runtime. Frontend retains public
VITE_API_URL=https://api.revexoe.com/api/v1; never VITE-prefix backend secrets.

Startup local tests prove prompt listen with valid production-like config and no
DB wait; liveness /health or /health/live200 independent of DB. /ready or
/health/ready checks SELECT1 and draining state; unavailable DB503. Paths omit
/api/v1; root404 is expected. Readiness overall4seconds requires provider timeout
above4seconds plus margin, separate from liveness/startup. Actual ingress routing,
client-IP abuse buckets/CORS/SMTP/provider delivery and production health still need
authorized acceptance. Readiness does not establish whole-product readiness.

## 9. Required decisions and GO/NO-GO

| Gate | Current outcome |
| --- | --- |
|Policy default denied; local build/manifest/recovery behavior |Verified locally |
|Actual full account/grants/roles/target and deployed release identity |Not inspected; owner/provider evidence required |
|Genuine wildcard/transport/initial/bootstrap/enduring risk approvals |Not supplied/created |
|hPanel exact four-privilege transition incl TRIGGER, persistence/new-session effect |UI capability owner-confirmed generally; actual outcome not verified |
|Production-grade protected backup and faithful isolated restore with definers/keys |Not accepted; disposable tooling is not production recovery |
|Exposed MFA candidate usage/remediation and private first-owner process |Unresolved; separately authorize unused replacement or used-record reencryption/recovery; preserve access key |
|Maintenance/migration/permission change/bootstrap/deployment/traffic release approval |Not granted by this preparation |
|Production initialization |**NO-GO** |

No code correction is identified by this preparation. Local preflight/recovery
checks are complete within their scope; they do not activate the wildcard policy
or authorize production connections. The next step is independent owner/reviewer
approval of evidence collection, risk records and a feasible tested recovery/final
privilege procedure. Stop after this report.
