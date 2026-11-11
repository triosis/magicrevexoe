# Phase 2 actual test results and platform boundaries

2026-11-11. **Linux tests NOT_RUN. Production NO-GO.** No Linux simulation is counted
as a real infrastructure test. The task's Linux fallback was used because WSL has
no installed distribution and no usable container/VM runtime was identified.

## Actual supplemental Windows execution

Host Microsoft Windows10.0.26300; Node24.14.0, harness-owned MariaDB11.8.9 Windows
ZIP server. Existing .tmp-mariadb/extracted/mariadb-11.8.9-winx64/bin supplied as
MARIADB_TEST_BIN. Harness uses new private datadirs/random synthetic credentials,
never reads production .env, adopts an existing listener or uses customer data.
Public VITE_API_URL supplied only for local frontend build. No production provider
request, credential generation or real Super Admin created.

| Exact command (npm.cmd on Windows) | Executed platform | Result |
| --- | --- | --- |
| npm --prefix backend test | Windows |89 passed,0 failed/skipped/cancelled. |
| npm --prefix backend run test:integration | Windows/MariaDB11.8.9 |206 passed,0 failed/skipped/cancelled. |
| npm test | Windows |29 passed. |
| npm run test:e2e:real | Windows real React/Express/MariaDB stack |13 passed,0 failed/skipped/cancelled. |
| npm run test:browser | Windows browser fixtures |8 passed. |
| npm run test:server | Windows |1 passed,0 failed/skipped/cancelled. |
| npm --prefix backend run build | Windows | Passed as part of backend/E2E commands. |
| npm --prefix backend run typecheck | Windows | Passed. |
| npm run typecheck | Windows | Passed. |
| npm run build | Windows | Passed. |
| npm run lint | Windows | Passed. |

Total **346 tests passed**, including node:test parents. Two new local tests cover
Linux prerequisite version classification and unsupported-platform refusal before
filesystem/subprocess access. Their Linux-formatted fixture strings do not mean a
Linux command was executed. The historical344 Phase1 result was not simply reused;
all above suites were rerun during this phase. Targeted/aggregate counts are not
added twice. No failed/skipped Windows case remains in this run.

Local logs: ignored .tmp-frontend/option-c-phase2/. Decoded WSL discovery output is
wsl-list.txt. Test summaries, durations and binaries identify actual platform.
No evidence includes production environment dumps, keys or raw account grants.

## Linux execution register

| Requested work | Actual result |
| --- | --- |
| Ubuntu24.04/Node24/MariaDB11.8/Nginx environment | BLOCKED: no usable Linux runtime. |
| Linux backend/frontend units, integration/E2E/browser/startup | NOT_RUN. No skipped Linux suite is disguised as a Windows pass. |
| Linux build/typecheck/lint/native Argon2 | NOT_RUN. |
| nginx -t/-T, actual HTTPS/header/raw-body/rate-limit chain | NOT_RUN. |
| systemd-analyze verify and real manager lifecycle | NOT_RUN. |
| Linux signed DB TLS/lifetime/plaintext/rotation | NOT_RUN. |
| Linux strict identities, reduction, bootstrap metadata | NOT_RUN. |
|46 Linux guards before/after restore/restart | Each entry NOT_RUN. |
| Linux encrypted native backup/failure injection/restore | NOT_RUN; durations unmeasured. |
| Independent public-port denial,IPv4/IPv6 | NOT_VERIFIED. |
| Reboot/encrypted-volume unlock/off-server recovery | NOT_RUN / PENDING. |

No test PKI was generated or native Linux service unit installed. No Hostinger
system/package/port was accessed. Read-only collector's Linux branch remains
implemented but NOT_TESTED on Linux; its default report explicitly says integration
NOT_RUN and production NO_GO even if prerequisite versions match.

## Reproduction and artifact evidence

See [Linux packet](../ops/option-c/linux-validation/README.md) for approved
environment/isolation/PKI/version collection, native syntax/lifecycle/SQL/restore
hold points and cleanup. Linux fixture adaptation remains required; current
Windows-only fixtures cannot be forced to pass by dropping platform/security checks.
Run the full table in that real isolated environment after appropriate fixture work,
and record command/platform/version/result/duration plus artifact hashes separately.

Offline loadMigrations/validateManifest passed for85 ordered versions000000-000084.
Historical SQL/verify/manifest diff is empty. node --check for the collector,
git diff --check, new-report/procedure links and trailing-whitespace checks passed.
Native Nginx/systemd compatibility cannot be established by these checks.

Artifact evidence captured in ignored .tmp-frontend/option-c-phase2/artifacts.json:

| Item | Actual fingerprint |
| --- | --- |
| Base HEAD, not a new release/deployment commit |85a31a984e7ffd1460edef8aa0c924ec82b7948e |
| Parsed manifest digest |4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735 |
| Ordered version/combined-checksum array digest |0520ec3e09077426b0aedde1e49625d966140f2eece03a7970356a2680adca3e |
| New collector raw-byte SHA256 |a006f6e82ee446b94b0220dcabf53ce63aa27975e299079f7ddb8cd6bcaea67f |

The evidence file also records raw hashes for current TLS/operator/proxy/recovery
source and Nginx/systemd examples. New phase files remain uncommitted working-tree
changes; the base commit is not falsely identified as containing them. No new
release commit or push was made. All six phase reports distinguish untested/blocked
work from executed supplemental Windows evidence.
