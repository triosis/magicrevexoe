# Current production blockers and manual release actions

2026-11-07. Latest owner-provided logs, not historical assumptions, confirm unmet
DB_TLS_CA_FILE/DB_TLS_CA_SHA256 before listen. Local implementation passes tests.
**503 not fixed; production not ready.** No deployment/credential/infrastructure/data
change, migration or unverified DB connection occurred. This report does not replace
the broader product/security/owner restrictions in backend/docs/production-blockers.md.

| Priority | Blocker | Required party / exact completion evidence |
| --- | --- | --- |
| P0 |Latest process lacks usable required CA settings |Operator provides approved actual CA mount/path/file-byte SHA-256 and verifies runtime injection. Empty/dummy/placeholder rows cannot resolve trust |
| P0 |Hostinger managed loopback TLS incompatibility |Owner-confirmed local service cannot expose required chain/DNS identity/enforcement. Existing approved RDS MariaDB11.8 plan is appropriate direction; no plaintext fallback |
| P0 |Actual RDS endpoint/network/certificates/account unavailable |AWS/DB/security operator: region/patch/budget approval, writer DNS matching certificate, authenticated AWS trust bundle, secure transport, restricted account/grants/schema/backup. Hostinger: controlled outbound egress/private route, port access and persistent CA mount |
| P0 |Deployed commit/artifact/root/Node/settings unknown |Hostinger operator supplies current deployment/build identity and read-only artifact fingerprint matching approved target-platform build, selected backend root/entrypoint/runtime and logs |
| P0 |Production auth/MFA key validity/custody unknown |Owner/security confirms correct original independent canonical keys and existing ciphertext usability. Absence from missing-name error is not proof of later validation or decrypted factor availability |
| P1 |Source data/schema/backup/restore and cutover gates |DBA/owner authorizes secure provider-assisted consistent export, full inventory, encrypted backup/isolated restore and single-writer/rollback plan. No production migration authorized by this request |
| P1 |Production resource/proxy/probe contract unknown |Hosting operator verifies actual Node24/native Argon2, process limits/OOM/restarts, assigned HTTP PORT/HOST, health paths, >4s readiness plus margin and >10s drain grace |
| P1 |Actual SMTP/sender/network/inbox verification absent |Email owner/provider supplies compatible existing credential/sender, approved TLS/mode/outbound/DNS; separately approved no-mail diagnostic then synthetic inbox acceptance |
| P1 |Public URL success/current status unavailable to tools |Owner/operator supplies actual verified HTTPS200 expected bodies and selected-release runtime listening log. Current attempts blocked by EACCES/tool access, not an observed HTTP status |
| P1 |Other release/product dependencies retained |Approved legal/privacy/retention/auth amendment, commercial catalog/policy and financial hold; Google/AI/keyword gaps, shared limits/proxy trust/offsite restore and full acceptance remain separately tracked |

## Minimum external infrastructure/configuration actions

1. Confirm/select the approved same-engine RDS MariaDB11.8 target and change owner;
   do not switch to MySQL or another engine series to work around the current gate.
2. Security/DBA verifies real writer DNS, certificate identity, authenticated CA file
   and SHA-256, compatible password auth, exact restricted runtime/migration profiles,
   trigger definers, server TLS enforcement and existing/new-target schema plan.
3. Hostinger confirms outbound TCP to that actual endpoint/port and stable allowlistable
   egress or a supported private route. Never open all internet sources merely because
   egress changes. If Cloud Startup cannot provide controlled routing/CA mounting,
   separately approve relocating the API near the database; do not weaken TLS.
4. Securely export/restore/migrate only under separate explicit data authorization,
   full protected verification and stage-specific rollback. Source loopback remains
   unsuitable for resuming normal service under current TLS policy.
5. Operator supplies exact complete environment and correct backend build/start
   settings from the companion reports, preserves existing keys/SMTP and applies only
   after release authorization. Test actual target connectivity/grants/schema and
   liveness/readiness before routing writes. No automated deployment was added.

## Manual hPanel acceptance evidence required

- Current website selected api.revexoe.com, app root backend or equivalent scoped
  commands, Node24/runtime OS, build success, deployed source/artifact identity.
- Required key NAMES plus private validation confirmation; do not reveal values.
  Database CA readable at approved mount with approved exact hash; external DB_HOST
  matches real certificate identity and network/account requirements pass.
- Backend listening log after secure startup, actual HTTP200 /health with alive and
  /ready with ready/database up. No startup build/migration/background-worker command.
- Separate runtime account/grants/schema/definers and actual DB TLS evidence; separate
  auth/MFA/SMTP acceptance and backup/restore sign-off. Ready is only a scoped DB probe.
- Owner final release approval. On error retain maintenance/security, collect redacted
  latest logs and use the approved rollback plan, never disable validation or TLS.

Current statuses: log-attempt startup cause **confirmed**; local secure-config start
**passed**; deployed parity **unknown**; production TLS **blocked/unverified**;
production authentication/MFA **unverified**; API production readiness **not ready**.
The repeated provider listen suggestion is not evidence of a require.main bug here.

No remaining missing provider material can be generated honestly from application
source. No repository-only change can authenticate the unavailable source database
CA or supply a real RDS account/network. See HOSTINGER_503_ROOT_CAUSE.md for tests,
artifact reference and complete seven-file change inventory.
