# Cloud Startup-only alternatives: compatibility decision

2026-11-12. Investigation and local disposable testing only. **PRODUCTION NO-GO.**
No Hostinger database/hPanel, production credentials/settings/grants, deployment,
real owner account, cloud purchase or provisioning was accessed/changed. Initial
Git working tree was clean at df15873; unrelated work was not discarded.

## A. Executive conclusion

**NO — the confirmed current Cloud Startup capabilities are incompatible with the
required exact-schema privilege boundary.** No secure deployable Cloud-only solution
was verified. No application workaround or relaxed profile was implemented.

The blocker is not the suffix `magicreview_db` specifically. Changing it to letters
and digits leaves the provider-style `u676472791_` separator. A raw database-level
grant containing that underscore still has wildcard authority. Ordinary backticks,
an empty schema, a dedicated password, one user per database, a maintenance timer
or hPanel's intended naming namespace do not make MariaDB treat the pattern as
literal. A safe exact grant correction was already declined by support according
to the owner; it is **not** an immediately available recommended solution.

The only naming-based reopening would be a documented supported same-plan method
to provision a **full name with no `_` or `%` anywhere**, not just an alphanumeric
suffix, with exact effective grants persisting after permission changes. That is
technically feasible on MariaDB, but is not established as a Hostinger capability
and conflicts with its documented immutable first part. Do not create another
production DB simply to discover the same delimiter problem.

## Evidence boundaries

| Evidence class | Findings / limit |
| --- | --- |
| Current repository | Strict migration/runtime maps and separate explicit Cloud profiles;85 migrations/32 tables/46 triggers; exact target, CA/transport, manifest, approvals/expiry, locking/audit and bootstrap checks. No runtime validator changed. |
| Hostinger public documentation checked2026-11-12 | Immutable database/user first part, one user per DB, hPanel permission checkboxes/default all, prefixed full-name examples and local127.0.0.1 connection guidance. |
| Owner/support evidence | Current raw unescaped grant, reported empty database; support cannot perform the raw server-side correction; earlier account-specific constraints: database-level only, no per-table grants or separate provider definer. Not independently queried here. |
| Disposable11.8.9 observations | Detailed tests below prove naming/scope, first-table pregrants, strict migration/runtime separation, bootstrap visibility and regeneration behavior. Harness administrator can provision rights that Hostinger does not offer. |
| Unverified provider specifics | Actual full-name delimiter exceptions, complete allowed suffix character set, exact retained TRIGGER checkbox availability/persistence, effective cross-account grants, current live state and restore/transport approval. |

Hostinger states that the first part cannot be changed and each database supports
one user. Its Node guide shows a full name such as u123456789_database. This
supports the fixed-prefix assessment; no production form was inspected and no
undocumented prefix-free exception is assumed.
[Database creation rules](https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/),
[Node database full-name guidance](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

The suffix may be alphanumeric without solving the full-name issue. A backslash
typed into a name field is not a supported way to ask hPanel to emit an escaped
GRANT; do not attempt SQL/name injection. If every eligible name retains the fixed
underscore prefix and unescaped database grants, **every such name remains affected**.
Changing DB_NAME does not revoke the old account's broad grant either.

## B. Alternative comparison

| Alternative | Feasibility / provider dependency | Security and operational effect | Migration | Triggers | Bootstrap | Test evidence / remaining blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Existing DB/account unchanged | NO | Raw wildcard grant retained; approval cannot narrow SQL scope | Current preflight refuses correctly | Existing design possible only after safe scope | Must not run | Prior/new native scope exposure; support declined correction |
| Existing DB with escaped literal grant | Technically safe scope, operationally unavailable per support | Old broad grant must be removed; not merely supplemented | Existing profile needs no code change | Existing46 and definer model preserved | Existing gates remain | Prior corrected-scope tests pass; do not repeat declined raw-GRANT request |
| New DB, alphanumeric suffix | NO under mandatory underscore prefix | At least prefix wildcard remains; new credentials do not cure it | Still refuses raw prefix pattern | Same definer constraints | Still gated | New prefix/lookalike tests pass; no benefit from production recreation |
| New fully alphanumeric complete DB name | CONDITIONAL hypothetical only | Exact scope possible; single-account runtime residual risks still need approval | All85 strict migrations passed on synthetic alphanumeric schema over TLS |32 tables/46 definitions verified; strict-runtime guard activated | Metadata/temporary authority still required | Engine capability verified, supported same-plan naming route not established |
| Dedicated MagicReviewAI account | One per DB is available, already the model | Separates credential from other apps only if effective grants are exact; raw scope still broad | No scope fix | Same identity remains definer | No automatic owner creation | One-user limit documented; password uniqueness is not database isolation |
| Separate migration/runtime accounts | NO on confirmed plan | Would restore strict runtime separation if provider permitted it | Strict workflow works locally | Creating migration definer distinct from runtime works | Temporary protected operator needed | Local strict accounts pass; multiple users/provider definer not available |
| hPanel reduced database-level permissions | Available privilege selection, unsafe raw scope remains | Removing ALL reduces operations, not which schemas pattern covers | CREATE/ALTER/TRIGGER and seed/ledger writes still needed | Shared definer needs retained TRIGGER | Metadata and INSERT authority remain | Cloud runtime requires exactly SELECT/INSERT/UPDATE/TRIGGER and genuine approval; raw scope still rejects |
| Table-level-only provisioning from empty | NO as available current solution | Literal table scopes can avoid database patterns only after all broad grants are absent | Existing strict initial profile refuses; full85 table-only path NOT proven | First-table/guard works; full46 table-only initial model NOT proven | Requires separate metadata/grant analysis | Native first-table pregrant tested; Hostinger table-level access unavailable; no bypass to legacy runner |
| Temporary initialization account/raw scope then reduction | NO | Cross-schema authority exists during initialization and can survive final raw pattern; expiry does not revoke SQL powers | Not safe initial scope | Definer continuity/reduction still needed | Separate approval not a scope remedy | Existing bounded exception cannot authorize unsafe patterns |
| Standard hPanel/phpMyAdmin provisioning/import | NO as a substitute | Import does not correct privileges or supply validated ledger/locks/audit/recovery | No approved equivalent runner/import integration | Provider preparation guide excludes TRIGGER/DEFINER | Cannot seed administrator manually to evade bootstrap |46 guards cannot be removed; no tested import preserving all invariants |
| Different managed MariaDB endpoint inside same plan | Not established | Would need exact scope, appropriate identities/transport/restore capability | Must match11.8/artifact | Must retain46 original guards/valid definers | Existing checks required | No documented eligible alternative service found; not an available recommendation |
| App-only restrictions/proxy/roles/cPanel features | NO as a grant remedy | App WHERE clauses cannot restrict stolen SQL credentials; another hosting product's controls are not hPanel capabilities | No compatible bypass | Guards can be managed by broad credential | MFA/RBAC remain necessary, not SQL scope substitutes | No unsafe proxy/role or engine replacement implemented |

Hostinger documents database permission changes, not a per-table provisioning
interface. Earlier account-specific confirmation rules that option out on this
plan; absence from a webpage is not itself universal proof for future products.
[Permission-management guidance](https://www.hostinger.com/support/4564363-how-to-change-permissions-for-a-database-user-in-hostinger/).

Hostinger's standard setup/import preparation explicitly excludes TRIGGER and
DEFINER lines. That is documented workflow guidance, not proof the MariaDB engine
can never create a trigger. It is nevertheless not a verified preservation route
for this application's46 guards/definers. Raw import would additionally bypass
the runner's ordered checksums/postconditions/ledger/locks/audit unless a separately
designed and tested equivalent exists; none does here.
[Import preparation requirements](https://www.hostinger.com/support/1864324-how-to-upload-and-set-up-your-database-at-hostinger/).

## C. Local tests and security implications

Added backend/test/cloud-managed-alternatives.integration.mjs only, plus this
report. All existing application source, profiles, SQL/verification/manifest,
bootstrap/MFA controls and Windows recovery restrictions are unchanged.

Actual Windows Node24.14.0/MariaDB11.8.9 ZIP synthetic test findings:

1. An all-alphanumeric **full** name has exact database scope. A provider-style
   fixed-prefix underscore plus an alphanumeric suffix grants access to a
   lookalike created afterward.
2. With ALL on that pattern, the synthetic account itself created a matching
   non-hPanel-style schema through SQL. A UI-only naming convention is therefore
   not a sufficient SQL namespace boundary. This is native default behavior,
   not an assertion Hostinger was probed or lacks additional enforcement.
3. A genuinely exact alphanumeric schema supports all85 immutable migrations via
   the current **strict staging TLS** operator with named lock/preflight/audit and
   exact target.32 tables/46 trigger definitions and history passed. No Cloud
   exception or production identifier was needed for this disposable target.
4. A distinct runtime with the original per-table map passed verification and
   denied ledger/DDL/DELETE/unrelated-schema access. A real ownership guard used
   the migration definer despite runtime lacking TRIGGER. This proves an engine
   model; Hostinger does not offer the required account split on this plan.
5. Native table-specific CREATE/SELECT/ALTER/TRIGGER pregrants before an initial
   table existed allowed its creation and a working guard, while unapproved table
   creation/cross-schema reads failed. But existing strict migration verification
   refuses that profile. **No full85/46 table-only success is claimed**; no raw
   runner/import fallback was used. Without provider provisioning and a separately
   approved new profile, this remains an unavailable/unproven architecture.
6. A synthetic bootstrap candidate with schema SELECT and the four required table
   INSERT grants saw only5/46 trigger rows and failed actual full verifySchema.
   Temporary protected schema TRIGGER made all46 visible and full verification
   pass; rights were then removed. No owner was bootstrapped in this new test.
   Metadata privilege is sensitive trigger-management authority, not a harmless
   runtime permission. Production minimum grants are not inferred from root tests.
7. Simulated regeneration replaced escaped grants with raw provider-style grants;
   lookalike access returned and the unchanged validator rejected it. Persistence
   must be guaranteed, not just a one-time hPanel appearance.

Prior grant regressions re-exercise escaped/raw/% behavior, similar/future schemas,
NO_BACKSLASH_ESCAPES, no MariaDB partial_revokes variable, auth/time-limit tail
fingerprints and approvals. Backticks do not literalize database patterns. Limits
on statement time, casing/visibility options and MySQL-only settings are not fixes.
[MariaDB privilege semantics](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant).

The existing Cloud integration suite additionally re-exercises all46 guard bodies
under the reduced shared definer and after encrypted native restore, plus synthetic
bootstrap, approval/lock/audit controls and retained-risk proofs. Those tests require
harness-admin privileges not offered by Hostinger and do **not** verify a table-only
initial profile, actual hPanel regeneration or production restore.

## D. Recommended solution and exact next steps

Priority1, retain current DB: no safe change available after the reported refusal;
do not keep requesting the same raw GRANT fix or initialize around the rejection.
Priority2, new DB/account: changing suffix/account alone fails. Only an independently
documented full prefix-free naming route could reopen a Cloud-only path.
Priority3, reviewed same-plan architecture: account split/table-only provisioning/
preserving import/other endpoint were evaluated above and are unavailable or
unverified with current constraints. No safe application adjustment resolves them.
Only after that managed-hosting exhaustion is a separately approved VPS/self-managed
design a justified fallback; no purchase, migration or deployment is recommended
for immediate execution. Existing Option C remains a proposal, not production GO.

Account-holder sequence:

1. **Read-only:** retain support response and inspect the existing/new-DB form's
   fixed first part without submitting it. Confirm whether `_` is outside the
   editable suffix. Never share passwords/raw authentication grant clauses.
2. **One materially new provider question:** “Within this existing Cloud Startup
   plan, is there a documented supported way to provision a complete database name
   containing only letters/digits, with no immutable underscore separator and no
   raw wildcard authority, that survives permission regeneration?” An alphanumeric
   suffix is not an answer. No request to repeat the declined GRANT operation.
   If no such route exists, close naming as exhausted. Do not repeat already
   answered multi-user/table-level/definer requests unless provider supplies a new
   documented capability for this exact plan.
3. **Local development:** only if a genuinely new supported capability is evidenced,
   design its default-denied validation and repeat full85/46/metadata/identity/
   regeneration/recovery tests before proposing production changes. No new profile
   is justified merely by the engine-only experiments here.
4. **Production changes require explicit approval:** new DB/user, any grants/env,
   preflight access, initialization, bootstrap and release all remain prohibited
   now. Reconfirm exact target/account/server, effective literal grants/roles/PUBLIC,
   artifact/85 checksums, genuine transport/privilege windows/references, tested
   backup/restore, approved final runtime/definer state and exposed MFA remediation
   before any future preflight. No fake IDs, dummy CA, TLS downgrade or unchanged
   unsafe-grant acceptance. Live emptiness is owner evidence, not freshly queried.

## E. Commands and results

Local-only environment used MARIADB_TEST_BIN pointing to the existing11.8.9 Windows
ZIP bin. All databases/credentials were synthetic on newly initialized datadirs;
no Hostinger endpoint or production password/authentication hash was used/logged.

| Exact command / scope | Actual result |
| --- | --- |
| npm --prefix backend run build | Passed. |
| node --test backend/test/cloud-managed-alternatives.integration.mjs | Expanded development run failed on the metadata hypothesis described below; corrected file's8 cases passed in final aggregate. |
| node --test --test-concurrency=1 backend/test/cloud-managed-alternatives.integration.mjs backend/test/hostinger-grant-scope.integration.mjs backend/test/migration-safety.integration.mjs backend/test/cloud-startup.integration.mjs |41 passed,0 failures/skips/cancellations. |
| npm --prefix backend test |92 passed,0 failures/skips/cancellations. |
| npm --prefix backend run typecheck | Passed. |
| npm run lint | Passed, including final test refinement. |

Final disjoint aggregate: **133 tests passed** (92 unit +41 integration, including
node:test parents). Targeted runs overlap and are not added again. Offline
loadMigrations/validateManifest passed for85 versions000000-000084; historical
SQL/verify/manifest and all application source have no diff. git diff --check,
new-file whitespace and report-link checks passed. Only this report and the new
integration-test file are added. No commit/push was made.

Intermediate new bootstrap-metadata test wrongly expected zero visible triggers;
the real result was5/46 and the test failed (including its parent). Corrected it
to assert incomplete visibility **and actual schema-verification refusal**, then
successful full verification after protected TRIGGER authority. No application
security was relaxed; that erroneous hypothesis is not concealed as an engine bug.
Other local alternatives passed. Ignored logs: .tmp-frontend/cloud-alternatives/.
Overlapping targeted runs are not additional distinct tests. Frontend/full product/
Linux/production suites were not rerun; historical346 results are not reused as
this task's total. Native Windows evidence does not establish Hostinger capability.

## F. Final deployment decision

**PRODUCTION NO-GO.** No verified Cloud Startup-only solution meets the required
scope boundary today. A provider-supported prefix-free exception, if it actually
exists, would be CONDITIONAL and still require all operational/security approvals;
it is not a verified workaround. No production action, commit or push authorized.
