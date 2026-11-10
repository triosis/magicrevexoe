# Cloud Startup compatibility: local implementation and residual risk

2026-11-10. Local development/disposable testing only. No production connection,
grant/credential change, deployed-file change, migration or initialization. Historical
SQL and schema-manifest.json are unchanged. Production remains **NO-GO**.

## Feasibility result and proposed post-migration grants

MariaDB11.8.9 supports the current application's operations and all46 triggers using
one shared creating/runtime account with **database-wide SELECT, INSERT, UPDATE,
TRIGGER**. DELETE, CREATE, ALTER, DROP, routine/event/admin and GRANT OPTION are not
part of this runtime profile. This was demonstrated on a harness-owned server,
not inferred from parser acceptance. Invoker DELETE is not needed by current API;
DELETE guards were separately invoked by the harness administrator while the
shared definer retained only that reduced set.

This is a **persistent security exception**, not least privilege equivalent to the
existing per-table runtime map. Broad SELECT exposes every tenant's rows to that
database credential. INSERT/UPDATE includes ledger, roles, permissions, identities
and append-only tables; some protected writes fail through triggers, but no blanket
SQL separation exists. TRIGGER can create/drop/replace guards. Tests prove that
capability and ledger-write authority directly. App RBAC/query scopes remain, but
cannot stop arbitrary SQL after credential compromise. Removing TRIGGER from the
creating account breaks activation; no separate provider definer is assumed.

If the owner cannot accept those permanent capabilities, this hosting/identity
model is incompatible with the required security boundary: **do not activate it**.
The implementation offers an explicit validated exception, not a claim that a shared
database account can preserve strict separation. ALL PRIVILEGES is never accepted
as runtime and is not a recommended permanent grant state.

Detailed generated map: [46-trigger dependency table](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.md)
and [every OLD/NEW column and table dependency](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.json).
Each definer needs TRIGGER on the subject and listed SELECT dependencies. All current
bodies have no SET NEW/table writes/routine calls; user/app INSERT/UPDATE performs
the actual row writes. Future triggers require re-review; analyzer is not a generic
SQL parser. Physical Hostinger behavior/privilege transitions remain unverified.

## Implemented separate default-denied profiles

Existing `inspectGrants(...,'migration'|'runtime')` and runtimePrivileges are unchanged.
They still reject schema ALL and database-wide runtime grants. No automatic fallback
or environment-only grant bypass exists. API startup itself does not check grants;
the release must explicitly enforce the operator validation gate. No automatic
configuration switch, production deployment or credential provisioning was added.

`backend/src/migrations/cloud-startup.ts` adds a separate pure policy/grant validator:

- `initial-maintenance`: explicit reviewed schema-level initial authority; can accept
  the ALL PRIVILEGES token only in this profile, pinned to exact normalized grant
  fingerprint and exact MariaDB11.8.9. Narrow explicit schema grants must include
  SELECT/INSERT/UPDATE/CREATE/ALTER/TRIGGER; known extra schema powers are enumerated,
  never silently accepted as future unknown privilege syntax.
- `runtime-dbwide`: **exact** SELECT/INSERT/UPDATE/TRIGGER authority at the exact schema;
  extra schema powers/ALL reject. This validates retained authority honestly.
- Both refuse other schemas/tables, global authority except USAGE, GRANT OPTION,
  roles/PUBLIC, unsupported syntax, wildcard schema patterns/ambiguous escapes and
  unknown extras. Underscores in schema-level grant patterns must be escaped. If
  Hostinger's actual normalized grants are broader/unescaped, stop; this code does
  not declare a broader pattern harmless merely because other schemas do not exist.
- Auth material in SHOW GRANTS is never fingerprinted or logged: fingerprint is only
  database/profile/sorted schema authority. Active role and exact DB/account/hostname
  validation remain separate required gates. SQL mode/FK/CHECK constraints persist.

The strict target policy accepts optional `cloudStartup` only in production with
explicit HOSTINGER_LOCAL127.0.0.1:3306. Omission preserves old parsed policy/hash
behavior. Required fields, with no real values seeded:

| Field | Meaning / validation |
| --- | --- |
| profile | initial-maintenance or runtime-dbwide |
| approvalId | Genuine separate privilege approval reference, 8-80 allowed ASCII characters, no REPLACE_WITH_ prefix |
| operatorReference | Non-secret named operator/reviewer change-record reference, same bounded format |
| recoveryReference | Non-secret accepted recovery/rehearsal record reference, same bounded format |
| grantFingerprint | 64 lowercase hex digest from inspectCloudGrants on reviewed real grants/profile |
| manifestFingerprint | 64 lowercase hex digest(manifest), not raw-file SHA256 |
| notBefore / expiresAt | Explicit UTC ISO timestamps; positive duration, initial maximum1hour, runtime review-window maximum30days; checked on use |
| riskAcknowledgement | Exactly I_ACCEPT_DATABASE_WIDE_DML_AND_TRIGGER_MANAGEMENT |

The operator process additionally needs `CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID` exactly
matching approvalId; transport still independently requires HOSTINGER_LOCAL_APPROVAL
and HOSTINGER_LOCAL_APPROVAL_ID. A syntactically valid reference cannot establish
genuine human approval; private change governance must verify it. No fabricated
production reference or test reference can authorize production.

The existing CLI commands are reused, with no new production invocation executed:
preflight/apply require initial-maintenance, check-runtime requires runtime-dbwide
when cloudStartup is present. Default strict paths remain unchanged. Runtime approval
is distinct, not a maintenance artifact reused after changing the profile/grants.

## Preserved and added execution gates

Initial preflight/apply must enter an entirely empty schema: no table/view ledger
prefix, trigger, routine or event. A completed/partial schema cannot restart through
this initial exception. Apply still requires original independent production digest
confirmation, a new audit file and a fresh bound preflight artifact. All85 ordered
SQL/verify checksums, manifest/schema prefix validation, target/account/hostname,
GET_LOCK ownership and postcondition/ledger states remain enforced.

Preflight expires after15minutes; both that expiry and the exception window are
checked before starting subsequent statements. A runner beforeStep hook is optional
and inert for existing callers; exception paths check immediately before DDL and
ledger/statement boundaries. No automatic resume/repair/retry is added. Expiry during
in-flight DDL cannot cancel/roll back the DDL; finish recording/review its state,
start no next step, preserve evidence. Expired/incomplete initial execution needs
separately approved forward recovery, not a renewed initial flag to continue blindly.

Audit includes cloud profile/approval/expiry on approved_execution_started; the full
policy digest binds operator/recovery references and fingerprints. Result carries
encrypted:false and explicit residual risk messages. Credentials/grant auth clauses
are not printed. Audit still uses exclusive files and per-event fsync.

Cloud check-runtime verifies exact reduced grants, active window, expected creating
definer for all triggers, complete ledger/checksums and full schema manifest. Its
verified:true is a contract check, not TLS assurance or absence of retained powers.
Output enumerates retained schema privileges and risks. It cannot authorize migrations.

Cloud bootstrap CLI requires active initial-maintenance approval and pinned manifest/
grants as well as its existing explicit BOOTSTRAP:<canonical-policy-digest>. The
transaction rechecks authorization before first writes and commit; expiry rolls
back bootstrap DML. Existing complete schema/history, one-root/idempotency, Argon2id,
MFA requirements remain. A structured completion record names cloud approval/target;
normal transactional platform.bootstrapped audit remains. Operator must retain
bootstrap output privately with the approved change audit; no automatic scheduler.

Approval expiry **does not revoke server privileges**, drain stale sessions or stop
stolen credentials. hPanel/provider must perform the approved grant transition while
API/workers are stopped, then close pools/reconnect and validate actual reduced
state before traffic. No grant-modifying code or production credential change was
added. Shared runtime profile remains an enduring risk after maintenance ends.

## Exact recovery design and local rehearsal

Recovery uses existing native-dump encrypted-backup code in a **disposable local**
policy; that executor was not broadened to accept production. Source and restore
schemas were separately created by the test harness. Root/admin is harness-only;
production must supply its own approved recovery authority, not copy a test account.

1. Isolate all writers, preserve release SQL/manifest and ledger; keep approved
   creating-account identity available. Temporarily authorized backup/recovery
   authority must supply dump locks/read/trigger metadata and restore DDL. Reduced
   runtime alone is not sufficient for this maintenance operation.
2. Existing backup takes the migration named lock and table READ locks, validates
   complete schema/history/relationships, captures row hashes/counts/auto-increments
   and exact trigger definitions/order/definers. Native mariadb-dump11.8.9 explicitly
   includes --triggers/--hex-blob and omits destructive add-drop statements. Native
   credentials use private temporary configuration files, not command arguments.
3. Encrypt SQL with AES-GCM, authenticate metadata, hash exact archive and decrypted
   SQL bytes; store protected artifacts with independent key custody. Wrong key/
   tamper/partial metadata must fail before import (existing recovery regressions).
4. Restore only to an authorized **empty isolated** target, verify release and target
   confirmation/identity before import, preserve same creating definer account and
   capabilities. Do not rewrite DEFINER strings or ignore permission errors. Full
   native import uses binary mode and original trigger definitions/order. A missing
   definer account cannot be invented by the dump; it must be provisioned separately.
5. After import, compare complete schema/ledger, every table's ordered-row hash/count/
   auto-increment, FK/CHECK integrity and trigger identities/order. Any mismatch or
   interruption leaves failed-unverified state and blocks success; no automatic retry.
6. Reduce the shared account back to the exact runtime profile under provider control,
   drain sessions, then exercise all46 guards again. DELETE guards are tested using
   separately authorized invoker authority on the isolated clone, not by giving the
   runtime permanent DELETE. Preserve restore acceptance and evidence.

The new local rehearsal did exactly the native encrypted backup/restore comparison,
checked46 original definers, then re-exercised all46 triggers under the reduced
definer. It also tested withholding TRIGGER (writes fail) and retained capability
(test trigger creation/drop and ledger modification possible). Existing full recovery
suite covers missing/tampered/wrong-key/corrupt/incomplete/foreign-key/interruption
cases. Local native-tool verification is **not** proof hPanel SQL import preserves
triggers or that the listed Hostinger backup restores accounts/definers. Do not use
standard hPanel import until that exact provider mechanism is separately rehearsed.
Production restore procedure/tool access and actual backup10Nov02:02UTC need owner/
provider verification; the shipped executor stays disposable-only.

## Files changed / added

- Added backend/src/migrations/cloud-startup.ts; existing strict privileges.ts untouched.
- Changed migrations/operator.ts and operator-cli.ts; runner.ts adds optional guarded
  statement boundary; setup/cli.ts and bootstrap.ts add explicit cloud approval checks.
- Added backend/scripts/trigger-privilege-map.mjs; cloud-startup.test.mjs,
  cloud-startup.integration.mjs, cloud-startup-fixtures.mjs under backend/test.
- Added dependency MD/JSON, this report and test report; compatibility and existing
  migration/bootstrap runbooks get dated current-status notes only.
- No historical SQL, verification, schema manifest, auth/MFA/RBAC/business/API pool
  configuration or credential files modified. No code path grants/revokes privileges.

## Owner approvals and production GO/NO-GO

- [ ] Genuine separate production privilege-maintenance approval: exact identity,
  schema/grants/release/window/operator/reviewer/recovery evidence and bootstrap scope.
- [ ] Explicit persistent acceptance of database-wide SELECT/INSERT/UPDATE/TRIGGER,
  including ledger/role/identity tampering and dropping/replacing guards; not merely
  accepting unencrypted loopback or a temporary ALL privilege period.
- [ ] Genuine HOSTINGER_LOCAL approval and Hostinger routing/isolation evidence;
  no encryption/tenant-boundary assumptions, no remote allowlist expansion.
- [ ] Provider proves only-database grant controls, correct literal escaped schema
  scope, no automatic ALL restoration, session draining and post-window reduction.
- [ ] Actual matched CURRENT_USER and @@hostname, effective grants/roles/PUBLIC,
  MariaDB11.8.9 metadata/locking and runtime native dependencies verified privately.
- [ ] Actual Hostinger backup/restore rehearsal preserves all objects/definers/data;
  accepted RPO/RTO/retention/key custody and approved recovery executor/procedure.
- [ ] Resolve exposed MFA candidate, preserve signing key, first-owner/release approvals
  and isolated acceptance evidence. Financial/legal holds remain independent.
- [ ] Review/test and explicitly authorize deployment/initialization separately.

**Production initialization remains NO-GO.** Local feasibility passes with explicitly
documented reduced assurances. If the owner rejects those residual capabilities,
or Hostinger cannot provide the exact reduced schema scope and recovery proof,
stop and report hosting/security incompatibility rather than weaken validators.
