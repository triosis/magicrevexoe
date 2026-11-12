# Hostinger Cloud migration compatibility: explicit policy assessment

2026-11-12. **Investigation/disposable testing only; production NO-GO.** No VPS,
purchase, hosting migration, Hostinger connection/SQL, deployment, environment/
credential/grant change, production migration/bootstrap, commit or push. Initial
Git working tree clean at3b9b070. Only this report added; application/test code and
historical migrations/manifest unchanged. No new permission exception implemented.

## Decision and updated evidence

Owner now confirms Express running, MariaDB11.8.9 connected at127.0.0.1:3306,
database u676472791_magicreview_db empty of tables/triggers, `/health` alive and
`/ready` database up. These supersede earlier startup-failure assumptions for the
reported current deployment. They are owner evidence, not fresh production probes.
The present blocker is **migration privilege-policy incompatibility**, not a
demonstrated listener failure. Readiness SELECT1 does not verify schema, grants,
MFA, tenant isolation or production acceptance.

**Recommended next approach:** review a separate, default-denied Hostinger
**wildcard-authority risk exception**, then authorize local implementation/rehearsal
only if its residual risks are acceptable and the final runtime state is viable.
Leave original strict profiles and existing exact-scope Cloud profiles unchanged.
This is a deliberately weaker SQL authority boundary, not an exact-isolation fix.
No approved executable path currently accepts the reported raw wildcard grant.

If exact database isolation remains non-negotiable, or the owner cannot authorize
the full affected scope, this proposed exception is unacceptable and the fixed
Cloud-only constraints remain incompatible. Approval cannot constrain MariaDB's
effective privileges or authorize risks to resources outside the approver's remit.
No alternative hosting/purchase is proposed in this report.

## 1. Why the current operator refuses

Inspected migrations/runner.ts, privileges.ts, cloud-startup.ts, operator.ts,
operator-cli.ts, schema.ts, setup/cli.ts and bootstrap.ts, transport/pool and relevant
tests/runbooks. `inspectGrants` rejects unescaped schema wildcard characters and
excess privileges. Separately, `inspectCloudGrants` permits a bounded initial ALL
exception only on exact schema scope and rejects this grant with
`CLOUD_STARTUP_GRANT_SCOPE_MISMATCH`. Unknown target-policy fields refuse.

At database-level scope, `_` matches one character and `%` matches arbitrary
characters. Backticks quote an identifier without making those pattern characters
literal. The reported pattern contains two underscores. The intended schema and
`u676472791XmagicreviewYdb` match it; this is an illustrative name, not a production
database claim. A disposable native account can read a future matching schema and,
with matching CREATE authority, create a matching name outside hPanel's UI rules.
[MariaDB GRANT semantics](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant).

An exact target, normalized grant fingerprint, empty database, correct CURRENT_USER,
named lock or approval does **not** narrow the pattern. A fingerprint detects change
from reviewed authority; it does not certify the authority is least privilege.
MariaDB11.8.9 has no MySQL partial_revokes setting to reinterpret these grants.
Changing SQL mode or renaming just the suffix does not remove the fixed underscore.

Hostinger publicly documents one user/database and an immutable initial name
component. Owner/support evidence adds database-wide controls only, no separate
definer/per-table grants, declined raw-scope correction and inability of the account
to change its own grants. ALL without GRANT OPTION does not grant self-reduction.
Do not assume the account can REVOKE its own rights or that an extra narrow grant
removes a broader one. Actual complete SHOW GRANTS/roles/PUBLIC/identity still need
private review; the supplied abbreviated GRANT line is not a complete grant inventory.
[Hostinger database constraints](https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/).

## 2. Can85 migrations and46 triggers run?

**Engine capability: yes, locally demonstrated. Existing approved production
operator with the reported grant: no.** All85 immutable statements and manifest
postconditions work on11.8.9 and produce32 base tables/46 triggers. Existing explicit
Cloud tests complete the full operator workflow with exact escaped schema authority,
then reduce privileges and exercise every guard. Native wildcard tests demonstrate
the broader authority and current rejection separately.

This task did **not** route a raw wildcard grant around validation to migrate.
A future wildcard-policy end-to-end apply/restore remains **NOT_IMPLEMENTED /
NOT_TESTED**. Existing successful exact-scope tests must not be relabelled as proof
of that proposed policy. Provider trigger creation/metadata/definer/binary-log
restrictions may still stop DDL despite an ALL token; Hostinger rehearsal evidence
is not established by harness-admin capabilities.

The85 steps000000–000084,84 verify SQL files and schema-manifest.json must remain
byte-identical. Preserve combined checksum rules, exact ledger/prefix/shape checks,
InnoDB/utf8mb4/strict FK/CHECK settings, target identity, named lock/session affinity,
15-minute preflight binding, independent production confirmation, exclusive fsynced
audit, statement-boundary deadlines and no automatic retry/repair/baseline. DDL can
commit outside ledger transactions; an interrupted run needs separate recovery.

## 3. Proposed separate permission policy — design, not current settings

The new profile would be a **visible risk-policy relaxation**. Implementing it would
not silently disable validation, but it would intentionally accept authority that
the existing security contract rejects. The owner must approve that changed contract
before development; this investigation does not supply such approval.

| Proposed control | Required behavior |
| --- | --- |
| Separate selection |New strict optional policy branch, no defaults/env skip switch; old strict and exact-scope Cloud branches retain rejection behavior and fingerprints |
| Exact target |Production, explicit HOSTINGER_LOCAL127.0.0.1:3306, exact schema/account/@@hostname/MariaDB11.8.9 and immutable release/manifest; no remote selection |
| Reviewed wildcard authority |Pin the exact raw schema pattern and privilege token set, preserve escape semantics, reject extra patterns/%/global elevation/roles/PUBLIC/proxy/GRANT OPTION/unknown syntax rather than approximate |
| Scope disclosure |Report pattern authority, `exactDatabaseIsolation:false` and distinct policy-acceptance result; never reuse unqualified `verified:true` to imply isolation |
| Genuine approval |Independent transport, initial privilege and enduring runtime risk records; real approver/operator/reviewer, affected assets, dates/expiry, recovery evidence; no generated fake reference |
| Initial-only |Empty tables/views/triggers/routines/events at entry, complete metadata visibility; no upgrade/repair reuse, no missing-ledger adoption |
| Deadline/binding |No longer than existing initial one-hour window and15-minute preflight; earliest deadline governs next statement. Identity/grant/manifest/policy changes invalidate apply; audit reference, raw-authority fingerprint and risks without auth clauses/hashes |
| Final-state distinction |Different initial, bootstrap/post-apply-verification and reduced-runtime phases; never use initial exception as runtime authorization |
| Fail closed |Missing/expired/mismatched approvals, different grant or unresolved runtime state stop. No automatic fallback from strict rejection |

The exact raw pattern would be allowed only because it is **explicitly risk-accepted**,
not because it is proven confined to this database. No account-name prefix/UI rule
can be used to assert confinement. Enumerating currently visible schemas cannot
prove absence of future or metadata-hidden matching resources. Provider evidence
on the full tenant boundary and who owns all affected resources is essential to
an informed decision; if unavailable, record uncertainty and keep production NO-GO.

### Initial and enduring risk are separate

Preferred conditional final state is provider-controlled reduction to schema-wide
SELECT/INSERT/UPDATE/TRIGGER with the exact reviewed raw pattern, removing ALL and
unneeded CREATE/ALTER/DROP/DELETE/etc. This still has wildcard authority and broad
ledger/identity writes and trigger-management rights. It requires its own proposed
wildcard-runtime profile, not the existing exact-scope runtime branch.

Provider/hPanel reduction capability, exact TRIGGER availability and persistence,
account matching and new-session effects must be demonstrated before initialization.
The database user cannot be assumed to perform the transition. A timestamp stops
the tool, not privileges or in-flight statements. Stop/isolate the API while elevated;
close pools and reconnect after authorized provider reduction.

If reduction is unavailable and ALL would remain, the temporary-maintenance design
is not valid. Permanent ALL needs a **different enduring high-risk proposal**, not
implicit consent here; it is not recommended for this minimal design. No future
runtime validator should pretend the retained DDL/destructive authority is absent.

## 4. Irreducible shared-account security risks

- Matching other/future schemas can be readable/writable and, during ALL, created,
  altered or dropped. No exact-isolation claim; current cross-customer impact is
  unknown, not asserted present or absent.
- Shared runtime/creating definer has broad reads and identity/role/ledger writes.
  TRIGGER permits removing/replacing integrity protections. Normal SQL guards and
  application RBAC still operate, but cannot defend against arbitrary SQL by the
  same overprivileged credential. Ledger/audit data on that database are not
  independently tamper-proof; retain protected operator artifacts outside it.
- All46 CREATE TRIGGER statements default to the executing account's DEFINER.
  Keep its needed23-table TRIGGER/18-table SELECT dependency rights and account;
  indiscriminate reduction/removal breaks activation. Database-wide rights exceed
  those minimums. [Trigger dependency map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.md).
- HOSTINGER_LOCAL is unencrypted with no TLS server identity; loopback routing
  and provider tenant isolation remain unproven. Permission approval cannot replace
  the independent transport approval. No fabricated CA or remote plaintext allowed.
- No separate runtime credential exists on this plan. APP RBAC/password hashing/
  MFA/tenant checks remain mandatory, but do not make shared SQL authority least
  privilege. No password/key rotation, auth bypass or SQL artifact change is needed
  or authorized by this assessment.

## 5. Required future code changes, if separately authorized

| Files | Proposed limited work |
| --- | --- |
| backend/src/migrations/cloud-startup.ts or new hostinger-wildcard.ts |Separate fail-closed approval/schema/authority interpreter; preserve current functions; explicit raw-pattern and residual-risk reporting |
| backend/src/migrations/operator.ts |Optional distinct policy branch, phase-aware validation, exact identity/release/grant binding and empty-only gating; preserve existing canonical hashes when branch absent |
| backend/src/migrations/operator-cli.ts |Explicit profile dispatch, truthful preflight/apply/check-runtime diagnostics and audit; no bypass switch or automatic grant transition |
| backend/src/setup/cli.ts / bootstrap.ts if needed |Explicit separately approved shared-account bootstrap/full-schema verification context after85 steps; retain one-root/idempotency/transaction/password/MFA protections |
| backend/test/hostinger-grant-scope.*, cloud-startup.*, new wildcard unit/integration tests |Exact raw-pattern fixture, future lookalikes, all85 migration/history/46 definitions and guards, mandatory negative/expiry/drift/audit/recovery/phase/role tests |
| production runbooks/reports |Distinct temporary/steady-state risks, provider transitions/recovery, schema-complete verification and release gates |

runner.ts need not change merely to accept a different privilege assessment;
reuse its existing callbacks/history/locking. Change only if a reviewed missing
phase hook demands it, with regression proof. No historical SQL/verify/manifest,
authentication, MFA/RBAC/tenant or business-flow change proposed. No application
code or tests were modified in this investigation.

Future acceptance specifically must prove full initial workflow with the **raw**
grant under the new explicit policy; strict defaults still reject it. Then reduce
through harness-admin actions simulating the provider, prove actual denied DDL/
DELETE where removed, demonstrate retained matching-schema access/trigger tampering/
ledger authority honestly, preserve all46 exact definers, test post-apply verification
without reusing empty-only apply, bootstrap/MFA and encrypted isolated restore.
These additions require new local implementation authorization, not production SQL.

## 6. Conditional deployment plan — separate approvals, not executable today

1. **Review evidence:** owner privately captures full actual grant/role/PUBLIC state,
   CURRENT_USER,@@hostname, version and inventory of all object types under separately
   authorized Hostinger read-only access. Do not share auth hashes or credentials.
   Existing health facts alone do not complete these checks.
2. **Owner/security decision:** accept or reject explicit wildcard cross-schema risk
   and shared-account/unencrypted transport. Establish approver authority, provider
   boundary evidence and exact final privilege transition. If rejected/unresolvable,
   stop; existing profile remains unchanged. No repeated assumption that support
   will perform a previously declined escaped-grant correction.
3. **Local implementation approval:** implement/test the proposed isolated branch
   and all negative cases; review exact code/release and truthful diagnostics.
   New JSON fields/commands are not available now; do not invent a policy file that
   the current strict parser will reject.
4. **Recovery approval:** protected current backup plus isolated restore rehearsal,
   original account/definers, full schema/rows/85 ledger checksums/46 guards and
   matching synthetic MFA. Inventory empty state includes views/routines/events.
   Provider snapshot listing is not accepted recovery evidence. Shipped recovery
   executor remains disposable-only; production restore needs a reviewed provider/
   native DBA procedure. Specify RPO/RTO/restorer/custody and failure authorization.
5. **Provider transition approval before apply:** confirm real hPanel/provider action
   that reduces privileges and preserves definers, exact raw pattern and persistence.
   Plan API stop/drain and new connections; no unapproved GRANT/REVOKE or self-grant.
6. **Release/preflight review:** Hostinger-side Node24, root backend, build npm run
   build, start npm start/dist/server.js; verify exact compiled release and85 SQL/
   verification/manifest bytes. Keep migration outside startup. Real operator inputs
   and approved target policy bind127.0.0.1:3306, schema/account/hostname/version,
   transport and new separate risk approvals. Run existing operator preflight
   interface only after approved feature exists; require all85 pending, empty shape,
   truthful wildcard/unencrypted warnings, policy/grant/manifest fingerprints and
   new private report. Preflight must remain non-schema-mutating.
7. **Separate production migration approval:** review backup/target/window/report
   within15minutes, require canonical APPLY-PRODUCTION target digest, new exclusive
   fsynced audit and same reviewed policy. Apply through operator only, never SQL
   concatenation/phpMyAdmin. Stop on any drift, expiry, lost lock or failure.
8. **Full completion before reduction:** use reviewed post-apply verification phase
   to require85 applied/no pending/incomplete,32 tables/46 exact definitions/definers
   and full schema manifest. The initial-only Cloud preflight cannot simply be
   reused on populated schema; the new design needs its distinct verification path.
   Separately approved bootstrap may then create one real owner with private new
   password; do not create through manual SQL or hardcoded defaults.
9. **Accepted final state:** provider reduces grants, drains/reconnects sessions,
   new profile verifies actual final authority and disclosed scope risks; validate
   app/guard behavior and actual forbidden DDL/DELETE where removed. Preserve needed
   defining principal/metadata authority; remove temporary operator credentials from
   API environment. If reduction fails, keep API closed and invoke reviewed recovery,
   not permanent ALL as a workaround.
10. **Independent traffic release:** confirm deployed artifact/config and actual
    HTTPS health/readiness, auth/MFA enrollment/recovery, RBAC/tenant denial and
    both review paths. Resolve exposed MFA candidate status separately; preserve
    existing access key/ciphertext compatibility. Owner accepts enduring risks and
    approves customer traffic independently; passing tests does not authorize it.

On partial migration failure retain original SQL/checksums, ledger/audit and DB
state; stop retries/writers, establish committed/in-flight DDL and rehearse minimal
forward repair or restore on clone. Never delete ledger, mark applied, disable
constraints or DROP/reset production to restart an initial-only exception.

This is the exact sequence of gates, not an executable raw-grant deployment recipe.
Exact proposed policy serialization/apply commands can only be finalized after
separate implementation/rehearsal approval; current apply still refuses correctly.

## 7. Local checks executed in this investigation

Windows Node24.14.0; harness-owned MariaDB11.8.9 datadirs/ports/random credentials
and synthetic approval references only. No real credentials/environment files loaded.
Logs ignored under `.tmp-frontend/cloud-migration-compatibility/`.

| Executed check | Actual result |
| --- | --- |
| `npm.cmd --prefix backend test` |Backend TypeScript build passed;92 passed,0 failed/skipped/cancelled |
| Eight integration files sequentially |98 passed,0 failed/skipped/cancelled;91.9seconds |
| `npm.cmd --prefix backend run typecheck` |Passed |
| `npm.cmd run lint` |Passed |
| Offline loadMigrations/validateManifest |85 versions000000–000084 accepted |
| Historical SQL/verification/manifest Git diff |Unchanged |
| Report links/whitespace and `git diff --check` |Passed |

**190 test cases passed**, including node:test parent cases. Exact integration
selection executed:

```text
node --test --test-concurrency=1 backend/test/hostinger-local.integration.mjs backend/test/cloud-startup.integration.mjs backend/test/hostinger-grant-scope.integration.mjs backend/test/cloud-managed-alternatives.integration.mjs backend/test/migration-safety.integration.mjs backend/test/mfa.integration.mjs backend/test/setup.integration.mjs backend/test/recovery.integration.mjs
```

Fixture-only MARIADB_TEST_BIN selected the existing local Windows ZIP distribution.
Native tests prove raw-pattern read/create access to matching lookalikes, rejection
by current profiles, escaped-scope behavior and provider-regeneration risk. Baseline
operator tests verify all85 ledger entries/checksums,32-table manifest,46 trigger
definitions, lock exclusion/target/drift/expiry/failure/audit behavior; shared-account
tests exercise all46 guards before/after reduction and encrypted native restoration,
while demonstrating retained trigger-management and ledger-write authority.
Synthetic bootstrap/MFA/tenant checks, actual HTTP liveness/readiness, schema/row/
definer restore integrity and wrong-key/tamper/interrupted restore refusals pass.
Unit tests preserve strict defaults, invalid-CA-before-pool, environment/startup,
proxy and abuse controls. No production account or owner is used.

Manifest fingerprint:
`4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735`.

No claim that these tests validate the unimplemented raw-pattern exception, actual
Hostinger constraints, production backups or exact isolation. Earlier reports'
test totals are historical, not added to this run. No Linux/provider test executed.

## Final GO / NO-GO

| Gate | Status |
| --- | --- |
| Backend listening and DB connectivity |Owner-confirmed; no new production probe |
|85 migrations/32 tables/46 triggers work on engine |Disposable baseline verified |
|Current strict/existing Cloud profile accepts raw grant |NO; correct fail-closed refusal |
|New separately approved wildcard policy implemented/tested |NO; design evaluation only |
|Provider final reduction and accepted enduring scope risk |UNRESOLVED |
|Genuine transport/privilege/recovery/release approvals |NOT ESTABLISHED |
|Production initialization/release |**NO-GO** |

A separately reviewed exception could make execution technically feasible by
accepting broader authority, while preserving migration history and application
security checks. It cannot satisfy the previous exact SQL isolation requirement.
If that requirement or final-state/recovery approvals cannot change/be met, Cloud
deployment remains unacceptable. Stop after this report; no implementation or
production action is authorized by this investigation.
