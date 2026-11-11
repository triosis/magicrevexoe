# Hostinger database-grant compatibility investigation

2026-11-11. **LOCAL DEVELOPMENT ONLY. Final status: PRODUCTION NO-GO.** No Hostinger
connection, production SQL/permissions/env/credential change, migration, bootstrap,
deployment, commit or push occurred. Initial Git working tree was clean at
29cfc4d. No unrelated work was reset or discarded.

## Root cause and exact scope decision

The supplied grant targets `` `u676472791_magicreview_db`.* `` and contains two
unescaped underscores. At database-level privilege scope, MariaDB treats `_` as a one-character
wildcard and `%` as a zero-or-more-character wildcard; identifier backticks do not
make those characters literal. Explicit backslash escaping is needed to represent
literal wildcard characters. This is privilege-pattern matching, not a comparison
to the currently selected DATABASE(). Table-level grants have different scope.
[MariaDB GRANT reference](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant)

Thus both the intended name and, for example, `u676472791XmagicreviewYdb` fit that
pattern. The example is not a claim such a production database exists. An empty
database, currently absent lookalikes, SHOW DATABASES filtered visibility, exact
CURRENT_USER/@@hostname pins, a fingerprint or a signed approval cannot narrow
the SQL authority. Future matching databases remain a risk. Explicit approval
cannot substitute for exact scope under this task's requirements.

**No permissive compatibility fix was implemented.** Existing
inspectCloudGrants correctly refuses this representation with
CLOUD_STARTUP_GRANT_SCOPE_MISMATCH. No defensible application-side exact-scope
proof was found for the reported unescaped MariaDB grant. Do not strip escapes,
compare raw string equality, ignore wildcard rows or add a SKIP_GRANT_CHECK flag.
Strict migration/runtime profiles and Cloud approval/fingerprint/expiry/version/
transport/target/lock/audit/manifest gates remain untouched.

## Disposable MariaDB11.8.9 observations

Tests launched a new Windows ZIP11.8.9 datadir/random loopback port and synthetic
users/schema names. They did not reuse a supplied or existing database listener.

- Native unescaped database grant was retained unescaped in mysql.db.Db and
  SHOW GRANTS. It authorized SELECT on the intended schema and on a same-length
  lookalike created **after** the grant; a nonmatching suffix was denied.
- Replacing the broad pattern with a genuinely escaped database grant denied
  the lookalike and unrelated schema while preserving intended-schema access.
  Its native SHOW GRANTS was accepted by initial-maintenance; runtime still
  rejected ALL. Exact runtime SELECT/INSERT/UPDATE/TRIGGER passed after reduction.
- `%` pattern really authorized a suffixed schema and remained rejected.
- `SHOW VARIABLES LIKE 'partial_revokes'` returned zero rows;
  `SELECT @@partial_revokes` returned ER_UNKNOWN_SYSTEM_VARIABLE. Do not assume
  MySQL's partial_revokes behavior applies to MariaDB11.8.9.
- Reissuing grants with session NO_BACKSLASH_ESCAPES still gave unescaped patterns
  cross-schema access; explicitly escaped backtick database scopes stayed exact.
  That SQL mode is not a solution. Case/host lookup and visibility options must
  be reviewed separately; they are not proof of literal underscore scope.
- Authentication clauses and MAX_STATEMENT_TIME on native USAGE lines did not
  change normalized authority fingerprints. Raw grant/authentication strings
  were never printed or stored in the report; only authority digests were compared.
  A statement time limit restricts execution duration, not database name reach.

MySQL documents partial_revokes as changing `_`/`%` interpretation; it is not an
available remediation for the tested MariaDB server.
[MySQL partial-revoke semantics](https://dev.mysql.com/doc/mysql-security-excerpt/8.0/en/partial-revokes.html)

These are actual local engine observations, not production Hostinger queries,
Linux validation or evidence of provider account/routing isolation. Supplied
production emptiness/grant descriptions remain owner evidence, not refreshed state.

## Smallest safe provider-side remediation

Ask Hostinger's authorized DBA/support to **replace**, not merely supplement, the
unescaped schema pattern with the literal database scope:

```text
ON `u676472791\_magicreview\_db`.*
```

The old broad pattern must no longer remain effective on that account. Adding an
escaped grant while keeping the broad one does not remove other-schema authority.
Preserve credentials/authentication configuration and approved resource limits;
do not ask the application to change passwords or directly edit mysql grant tables.

Provider must confirm actual stored/effective literal scope, roles/PUBLIC/global/
overlapping-account grants and whether hPanel rewrites escapes on privilege changes.
Have provider rehearse equivalent changes and lookalike denial on an isolated
target, not create adversarial schemas in production. Native SHOW GRANTS formatting
must be reviewed privately; redact/omit authentication material in shared evidence.
If hPanel/support cannot supply persistent exact-scope grants, **this Cloud Startup
workflow remains incompatible**. Do not initialize first or broaden the validator.

Escaping alone does not make permanent ALL runtime acceptable. Initial ALL is only
the existing separately approved bounded maintenance profile; final runtime-dbwide
must be exact SELECT/INSERT/UPDATE/TRIGGER, with its existing enduring ledger/role/
identity-write and trigger-management risks separately approved. HOSTINGER_LOCAL
still lacks TLS server authentication/encryption and proven tenant isolation.
Provider remediation of scope does not resolve those independent gates, restore
capability, MFA exposure or the approved final privilege transition.

## Changed files and test results

Only additions for this task:

1. backend/test/hostinger-grant-scope.test.mjs — owner-supplied nonsecret formatting,
   escaped/raw/percent/similar-scope refusals, strict-profile preservation and
   normalized fingerprint behavior with deliberately non-hash synthetic suffixes.
2. backend/test/hostinger-grant-scope.integration.mjs — actual11.8.9 wildcard,
   future-schema exposure, escaped correction, SQL mode, partial_revokes absence,
   native auth/resource tails and final runtime rejection/acceptance checks.
3. reports/HOSTINGER_GRANT_COMPATIBILITY_REPORT.md — this report.

No backend/src validator, migration/bootstrap logic, SQL/verification/checksum or
schema manifest changed. No new compatibility exception/approval contract exists.

| Actual command | Result |
| --- | --- |
| npm --prefix backend run build | Passed. |
| Focused node --test on new tests plus cloud-startup.test.mjs and migration-safety.test.mjs |19 passed,0 failed/skipped/cancelled. Includes missing/expired/mismatched approvals and pre-connection refusal. |
| npm --prefix backend test |92 passed,0 failed/skipped/cancelled. |
| node --test --test-concurrency=1 on Cloud/grant-scope/migration-safety integration files |33 passed,0 failed/skipped/cancelled, including strict grants, approval/lock/drift/postcondition/CLI audit and Cloud trigger/recovery regressions. |
| npm --prefix backend run typecheck | Passed. |
| npm run lint | Passed. |

Executed aggregate total:125 distinct tests (92 unit +33 integration, including
node:test parents). The focused19 overlaps these and is not added again. Offline
loadMigrations/validateManifest passed for all85 versions000000-000084.
git diff --check and new-file whitespace/link checks passed; Git showed only the
three additions above. Application/validator source and historical artifacts are
unchanged. This investigation did not run Linux or production tests.

Windows Node24.14.0; MARIADB_TEST_BIN points only to existing local11.8.9 ZIP bin.
Initial targeted development run failed three scope/fingerprint subtests because
the fresh fixture also exposed default test-schema PUBLIC grants, correctly rejected
by the validator. Added explicit PUBLIC rejection coverage, then removed only those
new fixture defaults under harness-admin authority to isolate scope behavior. No
parser/security rule was relaxed. Final reruns supersede this documented failure.
Raw SHOW GRANTS authentication material never entered test logs/reports. Ignored
local logs: .tmp-frontend/hostinger-grant-scope/. Focused/aggregate overlaps are
not counted as additional distinct tests. Frontend/complete product suite was not
rerun for this tests-only investigation; prior346 totals remain historical.

## Prerequisites for a future read-only production preflight

No live command is authorized by this report. Before a separately authorized
operator can run preflight:

1. Provider must remediate exact scope and establish privately reviewed effective
   grants; current raw pattern is a STOP. Confirm MariaDB11.8.9, actual DATABASE(),
   @@hostname, CURRENT_USER()/roles and exact approved account, not presumed host
   matching from the connection address. Do not share raw authentication clauses.
2. Accept a genuine finalized HOSTINGER_LOCAL transport risk record and separate
   initial-maintenance privilege approval, named operator/reviewer and recovery
   record. No fake/reference defaults. Review permanent reduced-runtime risks and
   actual provider transition before initial creation.
3. Verify approved release/compiled Node24 artifact,85 SQL files/84 verification
   files, unchanged combined checksums/manifest, schema settings, full object/data
   inventory and accepted backup/isolated-restore evidence. Current emptiness
   alone is insufficient. Resolve independently gated MFA remediation.
4. Prepare protected exact target policy for production127.0.0.1:3306/schema/
   account/server with transport/reference fields and no dummy CA/hash. Require
   real bounded Cloud profile fields, actual post-remediation normalized grant
   fingerprint, manifest digest, operator/recovery references, risk acknowledgement,
   notBefore/expiresAt (initial max1hour) and matching protected
   CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID. The parser cannot fingerprint current raw
   broad grants as accepted authority; do not insert an arbitrary hash instead.
5. Use protected MIGRATION_DB_USER/PASSWORD only in approved Hostinger operator
   context, matching transport acknowledgement/reference, private policy/report
   paths and no environment dumps. Preflight is separate from apply/bootstrap.
6. Explicitly authorize only the intended read-only preflight. It performs transient
   session settings/named lock and creates a private local report, but no schema/
   ledger/seed writes. Require exact target/version/grants/settings/manifest/history
   and empty object inventory to pass. Approval expires15minutes; no automatic
   apply, retry, elevated fallback or bootstrap follows a successful preflight.

If any scope/provider/recovery/approval gate is unresolved, stop before live
preflight. Scope acceptance is not production readiness. **PRODUCTION NO-GO.**
