# Task 14 production-readiness audit

## Task 18 current backup/recovery status (2026-11-05)

Actual encrypted native export and import into a separate fresh disposable
MariaDB 11.8.9 database now pass full schema/row/ledger comparison, 35 trigger,
36 FK and 34 CHECK validation and restored Express/service application tests.
This addresses the missing local restore-rehearsal evidence. See
[backup implementation](backup-implementation-report.md),
[restore evidence](restore-rehearsal-report.md),
[disaster recovery procedure](disaster-recovery-runbook.md) and
[provider checklist](provider-backup-validation.md).

No Hostinger connection, production backup/restore, migration or settings change
occurred. The execution utility is disposable-local only. Provider export/import,
real data-volume recovery time, key/off-site/retention operation and owner-approved
RPO/RTO remain unverified. Historical no-rehearsal statements below describe earlier
tasks. The release verdict remains **NOT READY - CRITICAL BLOCKERS**.


## Task 17 current migration status (2026-11-05)

A separate explicit operator workflow now provides non-mutating preflight,
restricted-grant inspection, approved target/environment selection, pinned-CA
verified migration TLS, expiring operator approval, production confirmation,
exclusive locking, applied-prefix structural fingerprints, durable progress audit
and post-statement verification. The legacy local CLI and all 67 migration files
remain intact. Restricted migration/runtime accounts and failure boundaries were
verified on disposable MariaDB 11.8.9 only.

See [migration safety and implementation report](migration-safety-report.md),
[operator runbook](production-migration-runbook.md) and
[privilege matrix](database-privilege-matrix.md). Historical absent-executor/drift
findings below describe earlier tasks. The application still uses SELECT 1
readiness and has no configured runtime DB TLS path; migration TLS does not close
that runtime finding. Provider TLS/privileges/definers, actual existing schema/data,
restore rehearsal and production execution authorization remain unverified.
**NOT READY - CRITICAL BLOCKERS.** No Hostinger connection or production change.


## Task 16 current status (2026-11-05)

Platform MFA is now implemented and locally tested; historical missing-MFA
statements below describe Task 14. MFA requires additive migrations 000064?000066,
independent AUTH_MFA_KEY provisioning, controlled administrator enrollment and
provider validation before any deployment. See
[mfa-implementation-report.md](mfa-implementation-report.md) and
[secret-rotation-runbook.md](secret-rotation-runbook.md).

Verdict remains **NOT READY ? CRITICAL BLOCKERS**: historical credential rotation,
backup/restore rehearsal, approved production migration/baseline, least-privilege
effective grants, database transport and provider operations remain unverified
or absent. No production secret rotation, deployment or database connection occurred.


Task 15 update (2026-11-05): the identified root-lock inversion is corrected
locally using one shared unique platform_slot lookup/projection, without automatic
retries or schema changes. See [feedback-concurrency-report.md](feedback-concurrency-report.md)
for captured 1213/40001 engine evidence, deterministic tests and repeated stress.
Historical Task 14 failure evidence below is preserved; other release blockers remain.


Date: 2026-11-05. **NOT READY — CRITICAL BLOCKERS**.

The current application has substantial local functional/security coverage, but
local success is not evidence of safe production operation. Critical gates are
unverified exposed-secret rotation, missing platform MFA, unverified restore,
unsupported production migration execution and unverified restricted DB identities.
This audit also reproduced an intermittent feedback-concurrency deadlock.

No Hostinger/SMTP/Google production connection, production credential read,
production setting change, migration or deployment occurred. Runtime code and tests
were not modified. This task delivers the five requested audit/runbook documents.

## Evidence and classifications

Use [production-blockers.md](production-blockers.md) as the canonical classified
finding register with severity, source evidence, closure criteria and owners.
Verified = repository/advisory fact; Locally tested only = disposable execution;
Externally unverified = provider/operator evidence absent; Not implemented = absent
functionality; Blocked = unsafe/unavailable release prerequisite. These labels do
not imply independent external penetration testing or legal certification.

Reviewed repository application/configuration/test/script inventory; migration SQL
and verification definitions/ordering; lockfiles/package scripts; architecture,
API, compatibility, security, implementation, E2E and quota documentation through
Task 13. Historical reports retain old scope and counts; current code/Task 13
contracts take precedence. Generated outputs/dependency trees are not represented
as a line-by-line third-party source audit. Only example environment files were
read. Tracked env filenames/history inspection revealed no rotation attestation;
no actual historical secret value was reproduced or necessary to this audit.

## Architecture and application assessment

| Area | Classification | Evidence / practical limit |
| --- | --- | --- |
| Frontend | Locally tested only | React/Vite/TypeScript live application; public-only API build setting, independent public page, tab auth, scoped business/feedback/subscription panels; SPA/server deep links and mobile/desktop tests. Broader browser/accessibility certification absent. |
| Backend/API | Locally tested only | Express 5 strict ESM TypeScript, versioned routers, shared pool/context services, strict allowlists and safe errors. Separate npm packages/lockfiles; prepare builds only, never migrates. |
| Auth/RBAC | Locally tested only | Argon2id, fixed JWT claims/algorithm, current DB session/version/member/ancestry checks, refresh replay, invite/reset consumption and revocation tests. Platform assurance remains password-only. |
| Tenancy | Locally tested only | All five parent edges, direct merchant paths, scoped SQL and composite ownership FKs; peer/merchant escalation denials and suspended ancestry. No RLS claim; raw privileged DB access is outside application isolation. |
| Transactions | Locally tested only | One connection for resource/quota/usage/audit, rollback/failure tests; DB-only retries in TenantService. Public helper lacks equivalent deadlock handling (H1). |
| Errors/logs | Verified | Public errors omit SQL/credentials/body; fixed console messages and throttled DB diagnostics. Correlation/alerts/security-denial export remain absent. |
| Configuration | Verified | Required DB/exact CORS inputs checked; missing auth key disables auth rather than startup. Public origins HTTPS-only; remote DB TLS not configurable. Health can be green with auth/SMTP/public origins absent. |
| Build/deployment | Locally tested only | Both production builds/typechecks pass on Node v24.14.0 Windows. Provider Linux/native dependencies, current security patch, routes/ports/restarts and proxy behavior unverified. |

## Database/migration assessment

Locally tested only: 64 contiguous versions 000000–000063; 24 tables including
ledger, 35 triggers; InnoDB/utf8mb4_unicode_ci; named composite FKs/unique/CHECKs,
UTC microseconds, BIGINT strings and DECIMAL prices. Latest schema tests prove
ownership/hierarchy/negative constraints and exact immutable content. Indexes cover
main ownership/FK access, but target-size query plans and cardinalities are unknown.
DELETE guards are inspected, not destructively exercised. No production DDL claim.

Verified: bootstrap checksum covers SQL bytes; later checksums cover SQL + NUL +
verification bytes. Loader enforces contiguous LF source and unchanged applied
prefix. Dedicated GET_LOCK session bounds acquisition, serializes status/bootstrap/
up, checks ownership, releases and destroys connection. Applying/failed/ambiguous
bootstrap blocks progress. No automatic rollback, reconnect, baseline or mark-applied.
DDL implicit commit and additive manual forward recovery are tested locally.
There is no production executor; name/loopback checks must not be bypassed (C4).

Applied-object drift detection is incomplete (H8): names/event types do not prove
full column/FK/index/CHECK/trigger body/definer equivalence. Inventory and compare
SHOW CREATE definitions plus grants independently before rollout. Existing Hostinger
tables/data/migration history may exist; nothing here authorizes overwriting them.
Full prerequisites: [deployment checklist](hostinger-deployment-checklist.md).

## Subscription/quota audit

Locally tested only: centralized QuotaService is called by branch creation,
merchant invite acceptance, link creation, first/non-ready QR readiness and new
anonymous feedback. Raw service operations and alternate admin routes retain
enforcement; no Super Admin bypass was found. Merchant creation, channel/destination
editing, downloads/reads/status changes have no consuming metric and are not charged.

Finite/explicit-unlimited require current active/trialing allocation and consistent
period counter/ledger; missing/inactive/past-due/expired/canceled states deny new
consumption. Suspension derives from real ancestry. Gauge updates reconcile live
counts with signed net ledger deltas; feedback adds once after duplicate detection.
Cleanup may leave broken accounting unavailable, not silently initialize it.
Counter initialization is explicit/transactional and preserves history. Merchant
plan assignment must precede first admin acceptance. No prices/limits were invented.

Native branch uniqueness/QR identity/feedback nonce and optional short-link retry
key prevent extra charges for supported retries. Unkeyed new link requests are
distinct resource creations; audit retention matters for keyed retry. History is
opening snapshots plus observed reconciliations, not exact historical gauge timing.
Rollback/quota concurrency passed locally; H1 remains an observed reliability gap.

## External integrations, compliance and operations

Externally unverified: actual SMTP delivery, listing existence/ownership, domains,
HTTPS/cross-origin routing, provider grants/trigger locks, backup encryption/restore
and production key rotation. Google URL validation checks canonical syntax only;
browser navigation was deliberately blocked before external contact. SMTP adapter
requires verified TLS but no provider session/inbox was tested.

Locally tested only: Google/private controls independent before rating and after
low-rating/quota failure; no gating fields, medical/narrative/contact payloads or
customer admin membership. Structured Clinic context may still be sensitive; the
task cannot certify that no medical information exists in unknown production,
provider logs or operator-entered business labels. Privacy/contact/retention and
merchant solicitation behavior require acceptance (H7). Google prohibits selective
positive solicitation and incentives. [Google policy](https://support.google.com/contributionpolicy/answer/7400114).

Verified / Not implemented: health live/ready, deduplicated bounded SELECT 1 probe
and graceful SIGINT/SIGTERM exist; schema/auth readiness, distributed rate storage,
alert routing, log correlation, durable mail and independent audit monitoring do
not. No destructive load test was performed. Root lock serialization, repeated
COUNT/SUM and N+1 plan/member enrichment, connection limit 5/no queue, per-page
request fanout and public audit growth need measured staging capacity (H4–H6).

## Exact audit validation

| Command | This audit result |
| --- | --- |
| npm --prefix backend test | 26 passed |
| npm --prefix backend run test:quotas:integration | 9 passed |
| npm --prefix backend run test:subscriptions:integration | 12 passed |
| npm --prefix backend run test:feedback:integration | Initial 11 passed / 2 failed (scenario + parent); unchanged isolated recheck 13 passed |
| npm --prefix backend run test:funnels:integration | 10 passed |
| npm --prefix backend run test:business:integration | 11 passed |
| npm --prefix backend run test:tenants:integration | 12 passed |
| npm --prefix backend run test:auth:integration | 16 passed |
| npm --prefix backend run test:schema:integration | 10 passed |
| npm --prefix backend run test:migrations:integration | 8 passed |
| npm test | 17 passed |
| npm run test:browser | 8 passed (mocked API regression suite) |
| npm run test:e2e:real | 11 passed, actual local React/Express/MariaDB, no local API mocks |
| npm run test:server | 1 passed |
| Frontend/backend typechecks and production builds | Passed |
| npm run lint | No errors; existing App.tsx purity and Interactive.tsx effect warnings |
| git diff --check | Passed |
| npm audit --json (root and backend) | 0 reported vulnerabilities each after successful advisory query; point-in-time metadata only |

First execution across the 164 reported test cases: **162 passed, 2 failed**, zero
skips. The 13-case feedback recheck passed unchanged: cumulative 175 pass / 2 fail
across 177 reported results. Latest per-suite totals sum to 164 passing cases, but
**the audit is not an unqualified green run**: the initial deadlock is unresolved.
Parent tests are included. No failure was disabled, mocked away or concealed.
The stopped backend sequence was resumed with all remaining suites explicitly run.
Initial sandbox npm advisory requests failed; authorized network retry with cache
under ignored .tmp-frontend succeeded for both packages. No dependency was updated.

## Required release sequence and inventory

Close critical register items first, then H1 and high-risk operational/provider
gates. Rehearse the approved artifact/migration/bootstrap/catalog/origin configuration
on isolated provider staging from a verified restored clone. Run full tests and
schema/grant checks, define rollback/cutover and obtain explicit deployment approval.
No public rollout is authorized by this audit.

Exactly five files created; no existing source/configuration/test/migration modified:

1. backend/docs/production-readiness-report.md — assessment, evidence, tests, inventory.
2. backend/docs/security-audit-report.md — security findings and rotation evidence gate.
3. backend/docs/hostinger-deployment-checklist.md — provider/release/migration prerequisites.
4. backend/docs/backup-recovery-runbook.md — unexecuted backup/restore procedure and rehearsal.
5. backend/docs/production-blockers.md — classified release finding register and closure criteria.

Ignored builds/screenshots/npm cache were regenerated by verification. No production
secrets or values appear in these reports. Final verdict:
**NOT READY — CRITICAL BLOCKERS**.
