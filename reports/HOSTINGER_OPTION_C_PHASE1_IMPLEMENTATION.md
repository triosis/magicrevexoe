# Option C Phase 1 local implementation and verification

2026-11-11. Authorized scope: local source development and disposable testing only.
**Production remains NO-GO.** No production connection, deployment, migration,
bootstrap, credential generation, VPS purchase/provisioning, DNS/firewall change
or template installation occurred. Only synthetic harness-owned MariaDB databases
were used by the integration/E2E suites; no supplied database endpoint was adopted.

## Implemented behavior

Required-TLS migration CLI now calls the application's approvedCa loader, resolving
the policy CA path, before constructing a database pool. SSL selection depends on
the validated transport mode, never CA truthiness. Required mode always supplies
SSL with CA bytes, rejectUnauthorized:true, verifyIdentity:true and minimum TLS1.2.
Missing/empty/whitespace/malformed/hash-mismatched material refuses before pool
creation. No TLS-to-plaintext retry or environment fallback was introduced.

Regression testing also found that createSecureContext alone can ignore malformed
CA certificate entries. The shared loader now parses every PEM certificate with
X509Certificate before accepting the bundle, including mixed valid/malformed
bundles. This hardens runtime, bootstrap and optional SMTP CA use too. Exact-file
SHA256 validation still precedes certificate parsing; no line-ending/UTF8 rewrite
is used for pinning. Existing explicit disposable/local and approved HOSTINGER_LOCAL
behavior remains; strict target/grants/checksum/lock/approval/audit paths are unchanged.

HTTP_PROXY_MODE is optional and defaults to existing direct behavior. Explicit
single-nginx-loopback mode requires HOST=127.0.0.1 in environment validation and
createApp construction. Only socket peer127.0.0.1 (including mapped IPv4 form),
hop0 is trusted. Nginx must overwrite XFF with the actual socket client and XFP
with https, removing XFH/Forwarded and alternative identity headers. Express
rejects chains, invalid IPs, unexpected forwarded-host/Forwarded and incomplete/
wrong-protocol headers. Header-free local health probes still work. Default mode
continues ignoring untrusted XFF. No arbitrary trusted CIDR/env list or unrestricted
trust proxy was added; auth/email/recovery/global and per-IP limiters remain.

The mode is **not activated** in any real environment. A trusted local user can
forge a direct local proxy request; this design assumes controlled local OS users,
root and proxy configuration. A CDN/additional hop requires a separately reviewed
topology, not extension of the trusted list without tests.

## Changed files

| File | Change |
| --- | --- |
| backend/src/migrations/operator-cli.ts | Pre-pool approvedCa validation and transport-selected required SSL. |
| backend/src/config/tls.ts | Explicit X509 parsing of every CA bundle entry. |
| backend/src/config/http-proxy.ts | New opt-in single-local-hop validation/middleware. |
| backend/src/config/env.ts | HTTP_PROXY_MODE enum and loopback bind validation. |
| backend/src/app.ts | Configure reviewed proxy handling before routes. |
| backend/src/auth/routes.ts | Correct commentary for direct/explicit proxy policy; limits unchanged. |
| backend/.env.example | Commented opt-in proxy setting and prerequisite warning. |
| backend/test/operator-tls.test.mjs | Real CLI child import hook proves rejection before pool construction on all commands; no network possible in hook. |
| backend/test/http-proxy.test.mjs | Actual Express HTTP/rate-limit/header/webhook tests and one-hop HTTP topology model. |
| backend/test/startup.test.mjs | Actual production-like synthetic startup selects proxy mode, accepts proper headers/refuses chains and preserves health/drain/MFA enforcement. |
| ops/option-c/nginx-api.conf.example | Review-only HTTPS/raw-path forwarding, overwrite/strip headers, unknown-host rejection, no retries/cache. |
| ops/option-c/magicreview-api.service.example | Review-only restricted Node service, protected environment, bounded restart and graceful stop. |
| ops/option-c/service-users.conf.example | Review-only unprivileged OS user declaration. |
| ops/option-c/mariadb.cnf.example | Review-only loopback listener, required secure transport and certificate paths. |
| ops/option-c/hosts.example | Proposed private DNS name resolving to loopback with matching certificate SAN. |
| ops/option-c/api.env.example | Deliberately unusable placeholder configuration, no production secrets or dummy CA hash. |
| ops/option-c/README.md | Permissions/custody/topology requirements and outstanding Linux validations. |
| reports/HOSTINGER_OPTION_C_PHASE1_IMPLEMENTATION.md | This report. |

No historical SQL/verification/manifest, authentication/MFA policy, hierarchy/RBAC,
tenant isolation, review architecture or financial holds changed. Existing assessment
reports remain historical; this report updates the local implementation status,
not their unresolved production evidence.

## Regression coverage and actual test execution

New tests exercise preflight, apply and check-runtime with missing file, empty,
whitespace-only, malformed, mixed-malformed, hash mismatch and changed exact bytes;
each has a syntactically valid required-TLS policy where appropriate. Missing CA
policy fields also refuse. A child module hook records any pool construction and
cannot access a real driver/network:27 negative combinations record no pool;
valid CA cases record a Buffer CA and all required SSL settings before a deliberate
synthetic stop. This is CLI construction evidence, not a production TLS handshake.
Existing disposable integration tests supply actual trusted/wrong-CA/wrong-SAN
MariaDB TLS handshake coverage.

Proxy tests cover exact bind/trusted hop, invalid/spoofed chains and alternate
headers, default direct-mode behavior, independent IP buckets,20/IP login and
10/email login,5/email recovery,60 general auth, AI per-IP/global, feedback and
public-funnel limits. They check raw webhook bytes/signatures/event headers, API
path routing, CORS/OPTIONS, parser/error/404 behavior and health. The HTTP proxy
model overwrites attacker headers and proves spoofing does not evade an IP bucket.
It is **not execution of Nginx**. Actual production-like Node entrypoint test uses
synthetic valid CA/auth configuration and unavailable local DB/SMTP, with MFA and
authenticated-route protections preserved.

Execution environment: Windows, Node24.14.0; MariaDB11.8.9 ZIP binaries in existing
ignored .tmp-mariadb distribution. Fixtures initialize new datadirs/random test
credentials and use only loopback; occupied explicit3306 fails rather than adopting
an existing listener. No real provider was contacted. Public VITE_API_URL supplied
for the frontend build is a build string, not an external request.

| Command | This task's result |
| --- | --- |
| npm --prefix backend test |87 passed,0 failures/skips/cancellations. |
| npm --prefix backend run test:integration |206 passed,0 failures/skips/cancellations; harness-owned MariaDB11.8.9. |
| npm test |29 passed. |
| npm run test:e2e:real |13 passed,0 failures/skips/cancellations; actual local React/Express/MariaDB stack. |
| npm run test:browser |8 passed. |
| npm run test:server |1 passed. |
| npm --prefix backend run build | Passed; also rerun by backend/E2E commands. |
| npm --prefix backend run typecheck | Passed. |
| npm run typecheck | Passed. |
| npm run build | Passed. |
| npm run lint | Passed. |
| Offline loadMigrations/validateManifest |85 ordered migrations000000-000084 accepted; historical files unchanged. |

Total **344 tests passed**, including node:test parent cases, versus the historical
336 baseline. Eight new unit cases are included in the87; the targeted8-case run
is not counted again. The augmented synthetic production startup reached listen
in619ms in the recorded final unit run, with proper proxy headers accepted and
chained headers rejected. This is a local Windows measurement, not VPS performance.
git diff --check and new-file trailing-whitespace checks passed; compiled
backend/dist/server.js was generated by the backend builds. No migration SQL,
verification file or schema-manifest diff exists. Logs/binary distribution remain
Git-ignored; only intended source/tests/templates and this report changed.

Initial targeted test development corrected a Windows --import path to file-URL
format; its malformed-CA case then exposed the real shared-loader parsing gap,
which was fixed without relaxing security. Initial aggregate integration invocation
failed because MARIADB_TEST_BIN was unset; it was rerun with the existing local
11.8.9 binary path, not a production connection. Final results supersede those
failed development attempts; prior336 results are historical, not this task's count.
Ignored local logs are .tmp-frontend/option-c-phase1/.

## Remaining risks and required approvals

Templates are non-production .example files with unresolved paths/credentials;
they were neither installed nor activated. No Linux Nginx/systemd configuration
parsing, actual Nginx HTTPS round trip, service hardening, public-port denial,
firewall/DNS cutover, load/performance test, volume encryption or reboot/unlock
rehearsal was performed. Windows source tests do not certify those properties.

Before any deployment: approve actual single-hop topology, full Nginx config
(including inherited real_ip/default-server settings), paths/users/env/PKI custody,
HTTPS renewal, real DNS SAN/CA/hash and strict DB grants/creating-definer strategy.
Verify protected permissions, proxy-generated errors/body limits, real distinct
clients, no public3001/3306 onIPv4/IPv6 and graceful/restart behavior on disposable
Linux first. Native Argon2/resource budgets and journal redaction also need review.

Linux-native production recovery remains a separate implementation/approval task;
the disposable-only Windows recovery utility was not broadened. Preserve all46
definers,85 ledger rows, complete schema/data and matching MFA keys in an approved
encrypted off-server recovery/rehearsal. Previous local recovery tests do not prove
Hostinger production restoration. MFA exposed-key usage/remediation and secure
first-owner bootstrap remain unresolved; no key or account was generated here.

Purchase/provisioning, grants/credentials, DNS/firewall/config installation,
production migration, bootstrap, deployment and traffic release each remain outside
this authorization. Production stays NO-GO until independent release, security,
recovery and owner gates in HOSTINGER_FULL_VPS_GO_NO_GO.md are satisfied.
