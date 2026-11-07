# Hostinger-only deployment and empty-schema initialization steps

2026-11-07. **Review-only plan. No activation, deployment, production connection,
credential modification, database creation or migration performed.** The owner reports
an empty Hostinger MariaDB database. Actual emptiness/target identity/grants still
need authorized read-only verification; no delete/overwrite is permitted.

Current intended platform is Hostinger Cloud Startup only, Node24, app root backend,
build npm run build, start npm start, compiled dist/server.js and API api.revexoe.com.
No AWS/external database action is proposed. Older external-provider reports remain
historical alternatives and do not authorize provisioning or change this requirement.

## Stage0 ? review, NOT executable activation

1. Review HOSTINGER_LOCAL_DATABASE_PROPOSAL.md, HOSTINGER_ENV_SETUP.md and
   SECURITY_TRADEOFFS.md. Current enum/pool/operator still reject production local
   non-TLS mode. The pure evaluator in backend/proposals has no live imports or I/O.
2. Obtain Hostinger's actual isolation/proxy/downstream-hop/tenant-access/auth/backup
   evidence. Do not assume127.0.0.1 establishes a dedicated security boundary.
3. Owner explicitly approves or rejects the transport exception and proposed code
   integration. Approval record must be genuine; local unit-test acknowledgement is
   not production approval. No release-enable flag was added to live configuration.
4. If approved later, integrate the exact runtime/operator/bootstrap/diagnostic changes
   listed in the proposal in a separately reviewed release. Keep verification/auth/MFA,
   strict defaults and production/target approval gates. Run real local-mode startup
   and migration CLI acceptance on a harness-owned isolated3306 server; fail rather
   than connect to an existing local listener if that port is occupied. Do not reuse
   random-port fixtures by weakening the production3306 policy. Those new end-to-end
   local-mode tests are a **pending post-approval gate**, not claimed successful here.

## Stage1 ? verify existing Hostinger database without mutations (future approval)

5. After explicit approval for operator access, use protected separate migration
   credentials to verify exact schema/account/@@hostname/version11.8.x, InnoDB,
   utf8mb4/utf8mb4_unicode_ci, strict SQL, enabled FK/CHECKs, metadata visibility,
   named-lock session affinity, DDL/trigger support and approved definer permissions.
6. Enumerate tables/views/triggers/routines/events/ledger in the exact selected schema.
   Initialization is permitted only if the operator/reviewer confirms it is genuinely
   empty with no unknown objects/data. Any existing ledger/table/view/object stops
   first initialization for review. Never run DROP/TRUNCATE/reset/rebaseline or assume
   a failed API means the schema is empty. Preserve provider backup/provisioning evidence.
7. Keep runtime, migration and bootstrap accounts separate. Migration profile remains
   schema SELECT/CREATE/ALTER/TRIGGER plus explicit seed/ledger DML; runtime exact
   per-table grants from database-privilege-matrix.md, no schema/ledger/DDL access.
   Hostinger support must confirm these are actually available; do not silently use
   provider-wide grants to pass. Definer identity must remain supported after apply.

## Stage2 ? existing runner workflow after transport integration (NOT runnable now)

8. Freeze reviewed85 ordered migrations/84 verification files plus runner-verified
   bootstrap and the schema manifest. No new SQL/migration rewrite is needed. The
   existing runner already creates all32 tables/46 triggers and safe channel/role/
   permission seeds from an empty disposable MariaDB11.8.9 schema.
9. Prepare a private explicit production target policy for host127.0.0.1, port3306,
   actual schema/@@hostname/account/approved definers and proposed transport/approval
   reference. It must not use environment=local, test prefixes or absent-CA inference.
   Current policy parser rejects production IP/no-CA targets: do not bypass it.
10. Once the reviewed transport adapter exists, run the existing operator preflight
    in a separately authorized protected operator environment. The following are
    **future command shapes**, with real private paths/reference values supplied by
    the operator; they are not commands to run on the current build or production now:

~~~sh
node dist/migrations/operator-cli.js preflight --target <private-target.json> --environment production --report <new-private-preflight.json>
~~~

    Preflight must be non-mutating: initialized=false, all85 versions pending,
    no application objects/ledger created, exact identity/grants/empty-schema shape,
    selected local transport and approval reference in the binding. Obtain reviewer
    approval of this report. Read-only preflight does not guarantee DDL success.
11. Apply only after separate production-initialization authorization, current recent
    approval, explicit production confirmation and new private audit-output path:

~~~sh
node dist/migrations/operator-cli.js apply --target <private-target.json> --environment production --approval <approved-preflight.json> --audit <new-private-audit.jsonl> --confirm-production APPLY-PRODUCTION:<actual-policy-digest>
~~~

    Do not invent the digest or suppress approval. Preserve exclusive GET_LOCK ownership
    checks, checksums, postconditions, per-step progress and failure codes. MariaDB DDL
    commits independently: interrupted/failed/applying ledger states stop automatic
    retry. Quarantine traffic and use explicit forward repair/review; no rollback deletion.
12. Verify all85 applied/checksum/postconditions, full32-table/46-trigger manifest,
    safe seed counts, actual grants/definers and no unexpected objects. Do not grant
    application access to an incomplete schema. No administrator/password/customer
    or commercial plan-price seed is created by these migrations.
13. First-platform/owner bootstrap is a separate approved action after schema success,
    using the hardened bootstrap CLI with reviewed local transport integration.
    Preserve identity/root uniqueness and password policy; require MFA enrollment at
    Super Admin login. Do not seed an administrator automatically on server startup.

## Stage3 ? approved hPanel rollout and actual acceptance (not performed)

14. Select api.revexoe.com backend. Verify Node24/root backend/build npm run build/
    start npm start (node dist/server.js), Hostinger assigned HTTP PORT, HOST0.0.0.0,
    correct artifact and Linux-native dependencies. No build/migration/diagnostic
    in runtime startup; no PM2/background-worker workaround is required by source.
15. Only after explicit mode/release authorization apply reviewed local-mode values,
    actual credentials, acknowledgement/reference and atomic omission of DB CA pair
    from HOSTINGER_ENV_SETUP.md. Preserve auth/MFA/SMTP/HTTPS. Current build rejects
    the proposal, so applying those variables now cannot fix503.
16. Verify a fixed local-unencrypted posture notice and listening log in the newly
    approved implementation, followed by actual HTTPS /health (or /health/live)200
    alive. No DB query in liveness; invalid secure config must still prevent listener.
17. Verify /ready (or /health/ready)200 only with selected approved transport, auth
    dependency and DB SELECT1/no drain;503 on DB failure. Readiness is not TLS proof,
    schema/grant certification or SMTP delivery. Future local diagnostic must state
    encrypted=false, never TLS verified. No production response observed here.
18. Run authorized synthetic role/hierarchy, password/MFA/session/refresh/recovery,
    branch/Google/private structured feedback, immutable publication, archive, quotas,
    audit and concurrency acceptance. No real payment/AI/email side effects without
    separate approval. Confirm provider backup/restore and matching MFA key custody.
19. Observe process restart/graceful drain/limits/proxy behavior. Listener fits local
    timing but Hostinger probe semantics remain provider evidence; readiness has a
    four-second response bound requiring a separate >4s probe plus network margin.
    Do not claim production readiness until all release/provider/owner gates pass.

## Checks and honest test boundary for this task

| Command/check | Actual result |
| --- | --- |
| npm --prefix backend test |67 passed, zero failures/skips; eight new proposal/security-boundary tests |
| npm --prefix backend run test:integration |187 passed, zero failures/skips; disposable MariaDB11.8.9 including fresh schema/migration, TLS, MFA, quotas and feedback concurrency |
| npm test |29 frontend tests passed |
| npm run test:e2e:real |13 passed, zero failures/skips; actual React/Express/MariaDB |
| npm run test:browser |8 fixture browser tests passed |
| npm run test:server |1 frontend-server test passed |
| npm --prefix backend run typecheck; npm run typecheck |Both passed |
| Backend build included by test/integration/E2E; npm run build |Both passed |
| npm run lint |Passed |
| git diff --check / new-file whitespace / migration checksums |Passed |

**305 tests total**, including node:test parents. Earlier runs before final hardening
are not counted again; complete DB integration was rerun after the pool change.
Current compiled production-like **verified-TLS configuration** reached listen in
428ms locally; no Hostinger runtime timing/response or proposed non-TLS startup is
claimed. The fixture uses temporary local trust material/synthetic random credentials,
not real provider secrets. Original85 migration checksums/manifest remain unchanged.
No existing test, constraint or auth/MFA requirement was weakened. New proposal
module has no imports from backend/src or runtime scripts; only its test imports it.
Logs are ignored under .tmp-frontend/hostinger-local-proposal/. No actual production
or Hostinger connection, settings, secret, migration, approval reference or certificate
was created/changed. Frontend build used only the existing public API-origin build
setting, not a production service request.

The new proposal tests evaluate a pure decision, not a live Hostinger connection or
an implemented non-TLS production startup. Current application startup with **valid
verified-TLS production-like synthetic configuration** is tested, including DB-down
liveness/readiness and protected401 refusals. Current production env rejects proposed
HOSTINGER_LOCAL even when acknowledgement/reference fields are present. The runner's
fresh-schema behavior and original MFA/tenant/feedback/quota concurrency controls are
verified on owned disposable MariaDB, never the reported empty production database.

## Complete file inventory

- backend/proposals/hostinger-local-transport.mjs: isolated pure review-policy evaluator;
  no runtime import, I/O, certificate or production activation.
- backend/test/hostinger-local-proposal.test.mjs: eight new policy/refusal/security
  boundary tests; current production mode remains rejected.
- backend/src/db/pool.ts: tighten nonproduction plaintext to literal loopback only;
  unchanged production required TLS and verified-TLS branch.
- reports/HOSTINGER_LOCAL_DATABASE_PROPOSAL.md: design, exact future code changes and
  explicit pending owner/provider/integration gates.
- reports/HOSTINGER_ENV_SETUP.md: exact proposed settings, current rejection and
  unchanged auth/MFA/SMTP requirements.
- reports/HOSTINGER_DEPLOYMENT_STEPS.md: empty-schema/operator/rollout review procedure,
  actual test evidence and inventory.
- reports/SECURITY_TRADEOFFS.md: residual non-TLS risk, boundary evidence and compensating
  controls; no dedicated-host or TLS-equivalence claim.

No migration SQL/verification/ledger/manifest, auth/MFA/server implementation, secret,
production setting or infrastructure changed. Owner approval is requested only for
this concrete proposal; deployment/initialization require separate later authorization.
