# Cloud Startup compatibility and recovery tests

2026-11-10. Windows Node24.14.0 and harness-owned MariaDB11.8.9 ZIP server. No
production endpoint/configuration/credential or real provider operation. Declared
Hostinger Node24.22.1 is operator evidence, not this local test runtime. No service
installed and no production DB initialized. Fixture credentials/keys/approval records
are explicitly synthetic; none are usable production approvals or commercial terms.

## Final verification

| Command | Result |
| --- | --- |
| npm --prefix backend test | 79 passed, 0 failed/skipped/cancelled |
| npm --prefix backend run test:integration | 206 passed, 0 failed/skipped/cancelled |
| npm test | 29 passed |
| npm run test:e2e:real | 13 passed, actual local React/Express/MariaDB stack |
| npm run test:browser | 8 passed, browser fixtures |
| npm run test:server | 1 passed |
| npm --prefix backend run typecheck | Passed |
| npm run typecheck | Passed |
| Backend build (included in backend/E2E commands) | Passed |
| npm run build | Passed, public API build string only; no external call |
| npm run lint | Passed (existing Oxlint) |
| git diff --check / new-file whitespace and report links | Passed |
| Historical migration/verification/manifest comparison | Unchanged; loadMigrations/validateManifest passed |

Total **336 tests passed**, including node:test parent cases. No coverage-percentage,
penetration certification or production readiness claim. Local ignored logs are
`.tmp-frontend/cloud-startup/`. Source/test development failures were corrected:
the first synthetic short code was too short, and the recovery fixture initially
used an output directory before creation and misread the authenticated manifest
envelope. No production behavior or migration constraint was relaxed to fix them.

## New tests (16 additional cases including parent)

Five unit cases in `backend/test/cloud-startup.test.mjs` verify:

- Existing strict migration/runtime profiles continue rejecting schema ALL; the
  new explicit initial profile accepts pinned schema authority, while runtime
  accepts only exact SELECT/INSERT/UPDATE/TRIGGER, never ALL.
- Global/other-schema/table/wildcard-pattern/GRANT OPTION/unknown/role authority
  rejects. Schema-name underscore escapes are not silently treated as literals.
- Missing/mismatched approval, inactive/expired/overlong windows, placeholder
  references, wrong endpoint and transport mismatch refuse.
- Runtime profile cannot authorize migrations; missing cloud approval fails before
  any supplied pool is accessed.
- All46 trigger definitions have the reviewed SELECT/TRIGGER dependency set and no
  body writes/calls. New body categories/count changes require explicit review.

Ten subtests plus parent in `backend/test/cloud-startup.integration.mjs` verify:

1. Strict default ALL refusal and explicit approval-bound non-mutating preflight:
   no tracking table created, all85 pending, encrypted:false.
2. Provider-style grant change invalidates the approved fingerprint before ledger
   creation; source grant authority is not approximated.
3. Synthetic approval-clock expiry between migration statements stops next DDL;
   only bootstrap ledger entry exists and initial-only exception refuses partial
   restart. Date.now override is isolated/restored inside this test process.
4. Full85-step migration, unchanged manifest/history, elevated approval audit and
   refusal to reuse initial-only preflight against a populated schema.
5. Same-account bootstrap preserves existing complete-history/schema/one-root
   behavior and authorization callback; no authentication/MFA bypass issued.
6. Revoke/regrant to exact schema-wide runtime authority, close prior sessions,
   reconnect; actual ALTER and DELETE denied. Actual CLI check-runtime validates
   complete schema/ledger/definers and reports retained authority/risks and
   encrypted:false. Ledger SELECT/UPDATE remains a disclosed residual capability.
7. All46 original guards activated under the reduced creating definer: positive
   INSERT guards through synthetic fixture setup; UPDATE guards through real
   populated-row statements (append-only rejects are expected); DELETE guards
   through a rollback-only harness-admin invoker, with reduced definer privileges.
   This is every trigger, not every possible branch/value combination in each body.
8. Runtime truly can create/drop a synthetic trigger and write migration ledger;
   this is explicit evidence of permanent risk, not a test asserting false isolation.
9. Removing the sole definer's TRIGGER privilege causes writes to fail; restoring
   the reviewed profile restores guard activation. Application pools are reconnected.
10. Native mariadb-dump/mariadb11.8.9 encrypted backup/restore of populated synthetic
   data, complete manifest/ledger/row hashes/counts/auto-increments/FK/CHECK integrity
   and all46 exact definer identities; restored schema reduced and all46 exercised
   again. Existing recovery suite also proves wrong-key/tamper/incomplete/interrupted
   import handling and restored auth/MFA/tenant/public/QR services.

The test first reserves exactly127.0.0.1:3306 and launches a new datadir/random
credential server; occupied port is an error, never adoption of an existing DB.
Aggregate integration files run sequentially. Native backup tools are from the
existing disposable distribution. No hPanel import or live backup was used.

## Recovery limitations and production release gate

The harness administrator provisioned/escalated/reduced test users and schemas.
During isolated native restore it temporarily granted the creating identity access
to source and separate destination schemas so original DEFINER names remained
valid; the strict Cloud validator would reject other-schema grants for runtime.
This is a recovery rehearsal, not a production user/grant recipe. Provider must
demonstrate an allowed isolated recovery route preserving the original principal
(for example an isolated instance with the original schema/account identity), or
obtain separate reviewed definer-remapping/schema design approval. Standard hPanel
import/one-user restrictions do not establish that ability automatically.

No existing recovery executable was broadened to accept production targets; it
remains disposable-only. An approved provider/native production recovery workflow,
backup/custody and actual grant transitions still need separate verification. The
listed Hostinger backup is not marked restore-tested by these local results.

Production remains **NO-GO** until the genuine initial and enduring privilege-risk
approvals, transport/isolation evidence, exact provider grants, reviewed recovery,
MFA remediation and independent release authorization are satisfied. See
[implementation/remaining gates](HOSTINGER_CLOUD_STARTUP_IMPLEMENTATION.md).
