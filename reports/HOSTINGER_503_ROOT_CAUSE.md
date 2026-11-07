# Hostinger 503: latest evidence and root cause

2026-11-07. Focused continuation, not a full application re-audit. Repository base
commit fa048ed813bd0972b1f03faa60228ec139b492b0; tested working tree includes the small follow-up changes below.
No deployment, hPanel setting/credential change, database connection/migration or
production diagnostic was executed. Private .env files were not read. Public HTTP
probe attempts are recorded separately and do not establish current website status.

## Latest evidence supplied during this task

The owner provided repeated runtime lines:

~~~text
Missing or invalid production environment variables: DB_TLS_CA_FILE, DB_TLS_CA_SHA256
App did not call listen() within 3 seconds.
~~~

The provider's accompanying suggestions mention require.main guards and hanging
promises generically. Current server source has neither guard nor awaited network
initialization before listen. The latest excerpt names **two** fields, not the four
in earlier logs. No deployment ID/commit, runtime timestamp, selected Node/root/
entrypoint or build artifact was included. Do not infer build parity from text alone.

## Confirmed cause versus unresolved conditions

| Question | Actual finding |
| --- | --- |
| Why did the reported attempts not listen? | Confirmed configuration rejection before listener initialization: DB_TLS_CA_FILE/DB_TLS_CA_SHA256 fail the production gate |
| Does this establish today's independently observed HTTP503? | Owner reports503; no fresh successful HTTP response was obtainable by tools here. Root cause is confirmed for supplied log attempts, not every possible later deployment |
| Missing, invalid or inaccessible? | Pair unmet is confirmed. Exact runtime values/injection unknown. Current env.ts checks presence/placeholders before pool/CA loading; inaccessible/untrusted CA file would produce a later Invalid approved TLS CA configuration error. Do not fabricate a file/hash just to pass the first gate |
| Are auth keys now valid? | Not established. They no longer appear in the missing-name list, which indicates at most that the early presence gate no longer lists them. Base64/length/diversity/separation and MFA key-to-ciphertext usability occur later or require existing-data verification |
| Is DB TLS operational in production? | No evidence; current Hostinger local DB lacks the required authenticated CA/DNS identity by owner confirmation. No unverified DB connection attempted |
| Is startup itself broken? | No confirmed listener defect; unchanged compiled production entrypoint starts locally in432ms with complete synthetic valid security config, even with DB/SMTP unavailable |
| Does deployed code match tested code? | Unknown: no deployed commit/build manifest/artifact fingerprint supplied |
| Is production ready /503 fixed? | No. Required trust/configuration/network/target evidence and actual runtime/URL success remain unresolved |

## Exact control flow / references

- backend/src/server.ts:18 calls loadEnv before createDatabasePool (line19), auth
  construction (line21), app construction and server.listen (line61).
- backend/src/config/env.ts:46 starts the production checks; lines59?66 include the
  required CA pair and throw the variable-name-only message. General schema checks
  precede this and also validate hash format when supplied.
- backend/src/config/tls.ts:6?15 reads exact approved PEM bytes, verifies SHA-256 and
  parses secure context. It never fabricates trust or falls back to system/plaintext.
- backend/src/db/pool.ts:6?17 enforces required production TLS and DNS-only DB_HOST,
  with rejectUnauthorized=true, verifyIdentity=true and minimum TLS1.2.
- backend/src/auth/configuration.ts:5?19 validates canonical independent signing/MFA
  keys and constructs verified SMTP configuration; loadEnv failure prevents reaching it.
- backend/src/server.ts:66?70 logs safe startup failure and exits nonzero. Thus a
  listen detector may time out after the rejected process has already failed.

Missing CA is an **external trust/provisioning dependency**, not a source-code typo.
A dummy PEM, hash of an arbitrary certificate, disabled TLS/validation or early
unauthenticated listener would conceal the blocker rather than resolve it. The
supported external MariaDB11.8 plan is the minimum secure infrastructure direction;
its actual AWS endpoint/CA/network/account/grants still require operator input.

## Fresh verification attempts

Public read-only GETs to /health, /ready and /health/live were attempted. Web tooling
returned inaccessible; Node verified-HTTPS probes failed with EACCES in this execution
environment (recorded UTC2026-11-07T07:05:17.071Z). No HTTP response/status was obtained.
This is a tool-access limitation, not proof of current origin503, DNS or TLS failure.
No authenticated Hostinger session, private backend or database was contacted.

The latest owner runtime excerpt is therefore the newest usable deployment evidence.
Do not claim success until actual operator runtime logs show listening and production
HTTPS probes show the expected liveness/readiness bodies from the selected release.

## Safe repository corrections performed

1. Added backend/scripts/deployment-fingerprint.mjs: manual read-only deterministic
   release hashing. It reads only compiled JS, package/lock files, SQL and schema
   manifest; no .env/credentials/CA/node_modules or network. It refuses incomplete
   compiled release and symlinks encountered in scanned artifact directories.
2. Added three regression tests for determinism, environment exclusion, changed
   compiled/migration detection and missing entrypoint refusal.
3. Corrected the obsolete67-migration runbook count to85 ordered SQL versions with
   84 verification files and runner-verified bootstrap; linked the current reports.
4. Created four requested focused reports. No working server/config/TLS/auth/business
   code was rewritten; no new bypass or startup fallback was introduced.

## Actual local validation

| Check | Result |
| --- | --- |
| npm --prefix backend test |59 passed; no failures/skips, including startup/environment/health/TLS/tool tests |
| npm --prefix backend run test:integration |187 passed; no failures/skips; disposable MariaDB11.8.9 |
| Backend TypeScript compilation/build included in both test commands |Passed |
| npm --prefix backend run typecheck |Passed |
| npm run lint |Passed |
| npm --prefix backend ls --omit=dev --depth=0 |Passed, installed local runtime dependencies resolve |
| Three new artifact-fingerprint regression cases |Passed in the59 unit count |
| Filesystem migration order/checksum comparison |All85 match current manifest |
| git diff --check and new-file whitespace checks |Passed |
| Current production HTTPS status / deployed artifact parity |Unverified/blocked; not counted as successful tests |
| RDS/production DB/SMTP live-provider verification |Not executed; no authorization/credentials/verified target provided |

246 relevant backend tests executed including node:test parents. Integration includes
real loopback TLS success/wrong-CA/wrong-name refusal, auth/MFA/replay, migration
safety/grants, quotas/feedback concurrency and encrypted fresh backup/restore. Startup
regression uses temporary local public trust material and random synthetic settings;
not production secrets or a provider certificate. No existing test skipped/weakened.
Frontend/E2E are not rerun for these read-only tooling/documentation changes; prior
full-suite evidence remains historical. No dependency/lockfile or SQL/manifest edit.

## Local artifact reference, NOT proof of deployed identity

Artifact SHA-256: 79eef75446d114a8f4d524e2746cc8bd649611dcfaf149d597c7488e670871f4

Computed from 229 curated files in the local tested compiled backend.
Use the same built artifact/OS build pipeline when comparing; independent compiler/
line-ending differences can change hashes even for the same source. Do not copy
Windows node_modules/native Argon2 to Linux. A commit match alone also does not prove
compiled-file parity. Node version, native dependencies, configuration, endpoint and
runtime readiness require separate evidence. The fingerprint does not certify these.
See HOSTINGER_EXACT_DEPLOYMENT_SETTINGS.md for operator comparison steps.

## Complete file inventory for this follow-up

- backend/scripts/deployment-fingerprint.mjs (new read-only release evidence tool)
- backend/test/deployment-fingerprint.test.mjs (new three focused tests)
- backend/docs/deployment-runbook.md (correct stale count/current links)
- reports/HOSTINGER_503_ROOT_CAUSE.md (this evidence/results record)
- reports/HOSTINGER_EXACT_DEPLOYMENT_SETTINGS.md (exact source-based deployment settings)
- reports/PRODUCTION_ENVIRONMENT_CHECKLIST.md (required values and evidence gates)
- reports/PRODUCTION_BLOCKERS.md (current external/approval blockers and manual actions)

**Current outcome: production startup blocked;503 not claimed fixed.**
