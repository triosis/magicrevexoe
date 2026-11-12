# MFA exposure remediation and Hostinger recovery readiness

2026-11-12. **Local investigation/testing complete; production NO-GO.** Existing
Cloud Startup and MariaDB11.8.9 only. No production access/SQL, permission or
environment/credential change, migration, real owner, secret generation/rotation,
deployment, purchase, commit or push. Initial Git working tree clean at7eb81ef.
Private key files were not opened, read or searched. No secret value is reproduced.

## 1. Exposure findings and evidence limits

The exposure refers to the candidate selected in the earlier IDE context in
**mfa-key-new.json** inside the external Revexoe-MFA-Private directory. Its complete
value appeared in the conversation. A second tab, mfa-key.json, was also present;
its content/equality to the selected candidate is not established. These are private
local filenames, not application defaults or tracked production configuration.
Treat the displayed candidate as compromised regardless of whether Git contains it.

| Question | Actual evidence / finding |
| --- | --- |
| Was it exposed? |YES: prior IDE/chat selection included the value. No need to print/hash it again to establish exposure. |
| Committed? |Bounded reachable-history scan found no matching private-key basename, literal canonical32-byte AUTH_MFA_KEY assignment or standalone canonical32-byte key file across740 text blobs. Current tracked environment files are example templates only. |
| Scope of scan |Reachable refs via Git rev-list/cat-file; selected text/config extensions, blobs<=2MiB. Values were processed without printing; only counts/path findings recorded. No private files, reflogs/unreachable objects, attachments, host shell history, external CI/hPanel/provider logs or global filesystem scan. |
| Exact candidate equality checked? |NO: the candidate was not reopened or passed as a search argument. The structural scan is not proof the exact string was absent from arbitrary embedded text, binary material, ignored files or external history. |
| Logged elsewhere? |The conversation itself is a known disclosure. Other log/backup/telemetry copies are UNKNOWN; no comprehensive incident clearance claimed. |
| Deployed/used? |UNKNOWN. No secret-store version metadata, deployment audit or key-to-ciphertext verification available. Earlier first-setup intention is not evidence of non-use. |
| Existing encrypted records? |Owner previously reported SHOW TABLES zero and later zero application tables/triggers on the named target. No production query here. This supports no current rows on that target at the reported times, not absence in previous instances, other schemas, exports, snapshots or restored data. |

Safe history-scan summary is ignored under
`.tmp-frontend/mfa-recovery-remediation/history-scan.json`. No key values or reusable
secret fingerprints were written to that summary. External copies/private workspaces
require separately approved operator review, not deletion of Git history or logs.

**Is replacement required?** The exposed candidate must not be used for future
first setup. If never used, replace that candidate under separate authorization.
If used, remediate through coordinated reencryption/recovery and assess TOTP seed
compromise; do not simply replace the running key. **It is not established that the
current production AUTH_MFA_KEY equals this candidate or needs immediate rotation.**
Do not rotate existing access/MFA keys based solely on filenames or an empty target.

## 2. Actual MFA cryptographic and custody contract

Reviewed auth/configuration.ts, mfa.ts, service.ts, passwords.ts, setup/bootstrap,
generator, secret-rotation and recovery source/tests. AUTH_MFA_KEY must be canonical
standard Base64 decoding exactly32bytes with>=16 distinct decoded bytes and differ
from AUTH_ACCESS_SECRET. Access key accepts32–128 decoded bytes with the same
canonical/diversity rules. Validation does not prove randomness, custody or non-use.

MFA uses AES-256-GCM:12-byte random nonce,16-byte tag, remaining ciphertext; AAD is
UTF-8 `MagicReview MFA:` plus decimal user ID. Both user_mfa.secret_cipher and
pending_cipher may require the original key. Enabled status alone is not enough
to inventory key dependencies. Preserve user IDs/AAD, pending enrollment/session
state, last_step/replay counters, locks, recovery hashes and authentication versions.
Database dump does not contain the environment's encryption key or CA/secret custody.

Wrong MFA key fails authenticated decryption with generic503; it does not safely
create a new seed. There is no online multi-key keyring or shipped reencryption CLI.
Recovery codes are separate stored hashes: a successful recovery-code login does
not prove TOTP ciphertext decrypts. Password reset is not an MFA reset/backdoor.

AUTH_ACCESS_SECRET must remain unchanged unless independent evidence requires its
own incident response. Changing it invalidates access JWTs/feedback signatures but
does not revoke opaque refresh sessions automatically. MFA/backup encryption keys
are separate from access/SMTP/DB credentials. Preserve old key versions needed by
retained backups under restricted audited recovery custody, never next to archives.

## 3. Production-safe remediation decision procedure — not executed

### A. Establish use privately under separate authorization

1. Appoint incident owner/reviewer and approved evidence/key custodian. Inventory
   deployment/secret-manager versions and times, every application writer and
   previous DB/export/snapshot. Review non-secret version identifiers first; do not
   paste environment dumps, keys, ciphertext, QR content or recovery codes.
2. Authorized operator obtains current full target/object inventory and, if MFA
   tables exist, counts of non-NULL active AND pending ciphertext. Review historical
   backups as well. No SQL/prod credential was used here; empty current schema alone
   cannot prove a previous version never encrypted data.
3. Where keys/data may exist, privately test the correct key version against an
   authorized isolated restored copy using actual validator/decryption and matching
   user IDs; report only success/failure/counts/version IDs. Do not attempt new
   enrollment, overwrite records or brute-force keys to establish compatibility.
   Missing evidence or unknown use keeps first-setup generation **blocked**.

### B. If independently established unused

4. Obtain separate first-setup generation/installation approval, restrict an external
   private directory (Windows ACL reviewed, POSIX0700), use a new exclusive filename.
   Existing generator can be invoked later from repository root as follows; this
   is a future authorized operator action, **not run by this task**:

```powershell
$ReviewedNewOutput = Read-Host 'Approved absolute NEW output file in reviewed private directory'
node backend/scripts/generate-auth-secrets.mjs --first-setup --private-directory-reviewed --output "$ReviewedNewOutput"
```

5. **Generator creates BOTH new candidate keys.** Do not import its JSON wholesale
   or replace existing production AUTH_ACCESS_SECRET. Transfer only the new MFA
   candidate through approved secret custody. Compare privately with the existing
   actual access key, not merely the newly generated unused access candidate.
   Current source refuses overwriting an existing file and prints no key values;
   its review flag does not configure Windows ACLs for the operator.
6. Validate privately with the application's actual configuredAuth plus production
   environment validation and approved SMTP settings, without connecting to providers
   or printing inputs. Report canonical Base64/exact32bytes/diversity/independence
   boolean results only. If access-key comparison is unavailable, do not claim full
   production independence validation. Secure backup/version custody and approve
   hPanel installation separately. No secret generation/installation occurred here.
7. Retire the exposed unused candidate from future selection; handle transient copies
   through approved retention/incident policy. Do not delete sole historical recovery
   material if its use remains uncertain. Never reinstall an exposed key as rollback.

### C. If used, possibly used, or old ciphertext must be retained

8. Stop/drain all writers under an approved maintenance window; restore-test encrypted
   backup and matching old key first. No shipped utility performs safe production
   reencryption; separately review/build/rehearse controlled operator tooling.
9. With transaction/row locks, decrypt every non-NULL active/pending envelope with
   original key/AAD; any authentication failure stops and rolls back. Reencrypt
   **the same seed** under fresh approved key with fresh nonce and same AAD/user ID;
   verify decryption before writing bound parameters, expected counts and secret-free
   audit. Preserve factor/replay/lock/recovery state. No deletion/reset-to-enable-login.
10. Coordinate new ciphertext and matching key across all writers atomically while
    stopped; explicitly revoke affected sessions/challenges/auth versions through an
    approved procedure. Verify synthetic staging TOTP, recovery single use/replay,
    pending expiry, restart and existing tenant checks. Keep matched old backup/key
    versions solely for approved recovery/retention, not active insecure rollback.
11. If attacker may have obtained seeds via exposed key plus DB/dumps, encryption-key
    rotation alone does not revoke TOTP factors. Approve identity-verified reenrollment,
    recovery-code replacement and session revocation. Lost-factor recovery requires
    independent identity approval; no MFA bypass introduced.

Full existing process: [secret rotation runbook](../backend/docs/secret-rotation-runbook.md).
If the original key is unavailable or envelopes fail authentication, STOP for approved
matching-key/backup recovery; do not assume any key can be discarded or regenerated.

## 4. Hostinger backup/restore options: evidence versus gaps

Public official documentation checked2026-11-12; no hPanel session or production
download/import/restore was opened. Website-specific plan/UI availability remains
operator/provider evidence, not inferred from documentation.

| Route | Public evidence and required confirmation |
| --- | --- |
|hPanel database backup download |Websites → Manage site → Backups → Restore and download → Database backups; select exact DB/date, Download database, wait, Download. Documented .sql.gz output. Verify actual completion, scope, UTC timestamp, integrity, trigger content and custody. |
|hPanel file backup |Separate Files backups/download; useful for matching application artifacts/config metadata, but not assumed to include protected injected secrets. Do not use WordPress-only website restore for this Express app. |
|hPanel database restore |Database backups → selected date → Restore database; existing DB needed; Restore History records progress. This rolls target back and requires separate mutation approval. Does it preserve triggers/definers/grants and support an isolated destination? NOT ESTABLISHED. |
|Generic phpMyAdmin/dashboard import |Official preparation guide excludes DEFINER, PROCEDURE and TRIGGER statements. Therefore this documented generic path is not a validated faithful recovery procedure for all46 triggers. Do not strip guards/definers to fit it. |
|Native SSH tools |Official SSH guide documents mariadb import; actual mariadb/mariadb-dump/mysqldump binaries,11.8-compatible versions/options and same endpoint namespace are UNVERIFIED for this account. No server utility was executed or installed. |

[Download options](https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/),
[restore options](https://www.hostinger.com/support/4283700-how-to-restore-backups-at-hostinger/),
[generic import restrictions](https://www.hostinger.com/support/1864324-how-to-upload-and-set-up-your-database-at-hostinger/),
[documented native import](https://www.hostinger.com/support/4536306-how-to-import-a-database-over-ssh-in-hostinger/).

The download guide describes daily/weekly plan backups and finite retention; verify
this subscription's actual dates/frequency/storage region rather than treating an
old listed snapshot as complete recovery evidence. .sql.gz compression is **not
encryption**. No current Cloud backup encryption guarantee or account-specific
retention/restore SLA is established by this review.

The SSH example uploads SQL to public_html and suggests clearing a target; those
steps are **not suitable for this project's protected production recovery**. Keep
archives/client configs/plaintext outside public directories and Git, require an
approved private target and never clear/reset the live DB as routine preparation.
A prompt-return/import exit0 does not prove schema/data/definer correctness.

## 5. Proposed same-plan recovery procedure, conditional on provider evidence

Preferred candidate: provider-assisted faithful backup/restore preserving original
schema/account/definers, or separately approved Hostinger-side native DBA workflow
if installed tools/grants permit it. Neither is accepted until rehearsed. No VPS,
additional hosting purchase or generic import workaround proposed.

1. Review actual11.8.9/schema/account/object/grant inventory, source release and
   target fingerprint through separately authorized access. Include views/routines/
   events and schema properties even for a purportedly empty DB. Use actual metadata
   authority; absence under restricted visibility is not proof of absence.
2. Owner approves consistency/window, backup/restorer/key custodians, off-host
   destination, RPO/RTO/retention/legal decisions and failed-recovery response. Stop
   competing writers/DDL, obtain the cooperating named lock and required table/
   snapshot consistency controls. Single-transaction alone does not cover DDL.
3. Capture all32 tables,85 ledger rows/checksums/status, data/binary IDs/user IDs,
   indexes/FKs/CHECKs/generated columns/auto-increments and all46 exact trigger
   definitions/order/DEFINER strings. Capture protected account/grant reconstruction
   metadata separately; SQL dumps do not create original users or store environment
   keys automatically. Do not rewrite historical migration SQL or create another owner.
4. If native route is approved, match reviewed11.8 dump options including triggers,
   complete inserts and binary handling, with no errors-ignored/force import.
   Credentials go in approved private client config/secret injection, not arguments.
   Capture successful tool/version/status, compare pre/post snapshot and lock ownership;
   authenticate/encrypt archive and complete manifest before publication. Protect any
   unavoidable plaintext staging under audited permissions and approved destruction.
5. Verify authenticated archive integrity, off-host copy and independent key retrieval.
   Store backup encryption key separately from archive and access/MFA keys; version
   identifiers map backup and ciphertext to correct key versions. Preserve matching
   auth key material separately under restricted recovery custody. No off-host upload,
   scheduler or production encryption job was implemented/executed here.
6. Provider confirms a supported **isolated** restore route on existing resources.
   One-user/naming restrictions may make original definer identities impossible on
   a second schema: require provider-supported original-principal restoration or a
   separately designed/reviewed remapping procedure. Merely replacing DEFINER text
   or pointing the app at another name is not equivalent. No provider isolated route
   is established; lack of one keeps recovery NO-GO.
7. Verify destination empty/isolated, expected original principals and required
  23-table TRIGGER/18-table SELECT definer dependencies before import. Validate/decrypt
   archive completely before sending SQL. Restore only under explicit independent
   target-bound approval with interrupted-state evidence; never import over live data.
8. Compare full immutable ledger/checksums, schema manifest,32 tables,46 exact
   definitions/definers/order, row hashes/counts, constraints and auto-increments.
   Inspect account/grants/metadata and actual definer activation after approved
   SELECT/INSERT/UPDATE/TRIGGER reduction; runtime ALL must refuse. Exercise all46
   guards plus representative branch/value cases; retain honest wildcard/trigger-
   management residual warnings. A raw pattern never becomes exact isolation.
9. In the isolated copy with **matching synthetic or separately authorized protected
   keys**, verify password login, actual TOTP decryption/login, recovery single use,
   sessions/replay/revocation, tenant isolation/RBAC/public feedback and QR. Disable
   real provider email/AI/payment activity. A recovery-code login alone cannot prove
   MFA encryption compatibility. Do not bootstrap a real administrator in the clone.
10. Measure source data age and incident-to-validated-service elapsed time; owner
    accepts RPO/RTO before release. Independent reviewer signs object/data/key/
    definer/grant evidence. Fresh verified capture is needed before real initialization.

Existing recovery executor stays **disposable-only** (literal loopback/local-policy
schema guard, Windows native clients, no production scope). No code was changed
to allow Hostinger production into it. Local raw-grant restore uses a second
harness-owned instance with original schema/account names; that administrator
capability is not a Hostinger promise. Older backup runbook26-table/35-trigger or
67-step figures are historical; current target is32/46/85 from the current manifest.

## 6. Recovery failure, rollback and unresolved provider questions

On wrong key, tamper, truncation, incomplete metadata, nonempty/wrong target or
unverified schema, stop before import when possible. Interrupted import may leave
committed DDL/data: preserve failed target and audit, close writers, do not retry
blindly/adopt it or mark it verified. Rehearse fresh isolated restoration or minimum
additive repair with original ledger/checksums under new authorization. No DROP,
delete-ledger, checksum edit, force import or disabled integrity protections.

Rollback must pair schema/data with corresponding MFA/access-key versions and
approved compatible code; never restore an old DB over new writes without accepted
data-loss/reconciliation authority. Never reintroduce an exposed active key merely
to regain login. If migration partially commits, retain applying/failed evidence
and use the established reviewed repair/restore workflow. Do not rerun initial-only
wildcard mode on a partial target.

Questions requiring actual provider/operator evidence:

- Can database download/restore preserve all46 original trigger bodies and
  definers, account rights and85 exact ledger entries? What do native/provider
  backups include/exclude and what metadata/consistency locks are supported?
- Which native client binaries/versions/options exist in this specific SSH/runtime
  namespace? Can the shared account export triggers/metadata and restore original
  principal safely? Do not assume app connectivity proves native-tool availability.
- Is an isolated faithful restore possible on the current plan with one-user/name
  constraints and no new purchase? Who controls original definer reconstruction?
- Can exact four reduced privileges including TRIGGER persist after restore/restart?
  API closure/new sessions/actual SHOW GRANTS/runtime-policy checks remain required.
- What actual backup frequency/retention/region/download/restore controls, encryption
  and off-host custody are available? What approved recovery objectives are achievable?

If no supported faithful route can be demonstrated under fixed Cloud-only
constraints, production recovery remains incompatible; do not initialize and hope
that imports or provider assistance will work later.

## 7. Local verification and changes

Windows Node24.14.0 and harness-owned MariaDB11.8.9 with synthetic secrets only.
Ignored logs: `.tmp-frontend/mfa-recovery-remediation/`.

| Executed check | Actual result |
| --- | --- |
| `npm.cmd --prefix backend test` |Build passed;96 unit cases passed,0 failed/skipped/cancelled |
| Final five-file integration selection below |64 passed,0 failed/skipped/cancelled;79.7seconds |
| `npm.cmd --prefix backend run typecheck` |Passed |
| `npm.cmd run lint` |Passed |
| Offline loadMigrations/validateManifest |85 ordered steps accepted |
| Historical SQL/verification/manifest Git diff |Unchanged |
| New report links/whitespace and `git diff --check` |Passed |

**160 cases passed**, including node:test parent cases. Earlier selected baseline
run63 passed; its repeated cases are not added to160. Historical full327 is not
claimed as rerun here; full frontend/product suites were not necessary for this
test/documentation-only change.

```text
node --test --test-concurrency=1 backend/test/mfa.integration.mjs backend/test/auth.integration.mjs backend/test/recovery.integration.mjs backend/test/migration-safety.integration.mjs backend/test/hostinger-wildcard.integration.mjs
```

Fixture-only MARIADB_TEST_BIN selects the existing local Windows11.8.9 ZIP. Tests
launch their own instances/random datadirs; explicit3306 refuses if occupied rather
than connecting to an existing listener. New MFA keys are ephemeral **synthetic test
keys**, never real production candidates. No .env or private key file is read.

Verified full85-entry ledger/checksums and32-table/46-trigger manifest; locks/audit/
identity/grant/expiry/drift/interruption controls; all46 guard activation and original
definers on reduced shared account before/after separate-instance native restoration;
actual reduced runtime denials and truthful wildcard risks; native encrypted backup,
fresh full snapshot/row/constraint restoration, wrong-key/corrupt/truncated/incomplete/
interrupted recovery rejection; restored auth/MFA/RBAC/tenant/public/QR services.
The added case specifically tests TOTP decryption, rather than relying only on a
recovery-code login. No production reencryption or provider restore tested.

Unchanged canonical manifest fingerprint:
`4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735`.

Changed files:

- backend/test/recovery.integration.mjs: one additional synthetic regression proves
  restored TOTP ciphertext rejects a different key with safe503/no ciphertext change,
  then matching key completes TOTP authentication. Existing restored recovery-code
  path remains, along with all other restore checks.
- reports/HOSTINGER_MFA_RECOVERY_REMEDIATION.md: this report.

No application implementation, generation/recovery utility, production runbook
activation, historical SQL/verification/manifest or authentication safeguard changed.
No reencryption executor, production key files or usable approvals created.

## 8. Final decisions

| Gate | Current result |
| --- | --- |
|Displayed candidate exposure |CONFIRMED from earlier IDE/chat; do not install for future setup |
|Candidate deployed or used, including prior backup dependencies |UNKNOWN / requires independent protected evidence |
|Safe new first-setup key generation now |NOT AUTHORIZED / non-use not established; no real key generated |
|Existing keys/ciphertext custody |Preserve; separately establish version/use and remediation scope |
|Local complete/definer/MFA recovery |Tested with synthetic data only; results below |
|Actual Hostinger complete backup and original-definer isolated restoration |UNVERIFIED / BLOCKER; generic import docs do not satisfy it |
|Enduring wildcard/shared-account/unencrypted transport and runtime reduction approval |Independent unresolved production gates |
|Production initialization/bootstrap/deployment |**NO-GO** |

Local testing/documentation resolves the test-evidence gap, not missing production
facts. Next action is separately authorized operator/provider evidence collection
and review of key-use/faithful recovery, followed by distinct remediation and
production-execution approvals if justified. Stop after this report.
