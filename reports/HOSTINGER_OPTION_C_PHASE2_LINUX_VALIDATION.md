# Phase 2 Linux environment and implementation status

2026-11-11. Authorized local/disposable testing only. **Phase2 blocked; production
NO-GO.** No Hostinger access, purchase, provisioning, deployment, real DNS/firewall
change, production secret handling or Super Admin creation occurred.

## Actual environment discovery

Host reports Microsoft Windows10.0.26300, Node24.14.0. Existing ZIP MariaDB binary
reports11.8.9-MariaDB Win64. WSL executable exists, but `wsl --list --verbose`
reports **no installed distributions** and exits-1. `wsl --status` reports default
version2; that alone is not an installed Ubuntu environment. UTF16 output was
decoded by removing interleaved NULs for local evidence. Docker, Podman, Ubuntu,
Nginx, systemd-analyze, VBoxManage and qemu-system-x86_64 were not found on PATH.
No already approved usable Linux runtime was identified. No host features,
virtualization/network settings, packages or administrator elevation were changed.

Actual Linux distribution/Node/MariaDB/Nginx/systemd versions: **NOT AVAILABLE**.
No Linux runtime was used. Linux tests are NOT_RUN, not simulated passes or skipped
cases inside the Windows result. The task explicitly permits a prepared packet
when execution is unavailable; availability/setup requiring host changes is a
separate approval, not permission to install WSL/Docker automatically.

## Source review and discrepancies

Reviewed the five HOSTINGER_FULL_VPS reports, Phase1 implementation, all option-c
examples/README, production migration/deployment/bootstrap/recovery runbooks,
actual TLS/env/pool/server/proxy/operator/privilege/bootstrap/MFA sources,85-step
manifest and46-trigger dependency map, recovery utilities/tests and fixture code.
No mandatory reference is missing. Relevant discrepancies/limitations:

- The historical production migration runbook still mentions67 ledger entries;
  current manifest is85,000000-000084, with32 tables and46 triggers. Use exact
  manifest validation, never that old count or a regenerated live baseline.
- Earlier assessments describe the empty-CA defect as outstanding; Phase1 current
  source fixes it. Old reports are dated evidence, not current implementation.
- Linux parity is not available through current fixtures: mariadb-fixture.mjs
  explicitly requires Windows ZIP/win32; tls-fixture.mjs names Windows OpenSSL.
  Recovery utility invokes .exe tools and refuses non-disposable/local/no-TLS
  targets. These guards were not removed. A separate approved Linux fixture/
  adapter and recovery acceptance are required before a Linux suite can pass.
- Required TLS verifies DNS identity/CA, but generic DB policy supports remote
  verified endpoints; it does not enforce that every DNS name resolves to loopback.
  Option C must independently validate private resolution/listeners. No claim that
  an unexpected-public-resolution test already passes is made.

## Deliverable status

| Item | Status |
| --- | --- |
| Host capability discovery | Executed, Windows evidence; Linux unavailable. |
| Read-only Linux prerequisite collector | Implemented; pure classifier and unsupported-host refusal tested on Windows. Linux branch NOT_RUN. |
| Reproducible isolation/versions/proxy/service/TLS test schedule | Review packet prepared; environment not created. |
| Native Linux recovery | Separately reviewable DBA procedure prepared; NOT_EXECUTED, not a tested production program. |
| Review-only operational templates | Inspected; not installed/native-validated. README wording corrected from approved to reviewed topology. |
| Real Nginx/systemd/TLS/grant/restore Linux acceptance | BLOCKED / NOT_RUN. |
| Windows regression revalidation | Supplemental actual results in test report; not Linux evidence. |

## Added/changed files for this phase

- backend/scripts/linux-validation/preflight.mjs: read-only prerequisite collector,
  private marker/root/new-report checks, no SQL/network/service/install actions.
- backend/test/linux-validation.test.mjs: two real local tests of version
  classification and fail-before-probe behavior; these are not Linux execution.
- ops/option-c/linux-validation/README.md: reproducible approved-VM entry conditions,
  isolation/export/PKI, strict staging TLS operator, native verification schedule,
  evidence and bounded owned-run cleanup procedure.
- ops/option-c/linux-validation/NATIVE_RECOVERY_PROCEDURE.md: future protected native
  backup/encryption/target/definer/restore/failure procedure with hold points.
- ops/option-c/README.md: link to Phase2 and truthful reviewed-only topology wording.
- Six reports: HOSTINGER_OPTION_C_PHASE2_LINUX_VALIDATION.md,
  HOSTINGER_OPTION_C_PHASE2_NGINX_SYSTEMD.md,
  HOSTINGER_OPTION_C_PHASE2_MARIADB_TLS_GRANTS.md,
  HOSTINGER_OPTION_C_PHASE2_ENCRYPTED_RECOVERY.md,
  HOSTINGER_OPTION_C_PHASE2_TEST_RESULTS.md,
  HOSTINGER_OPTION_C_PHASE2_GO_NO_GO.md.

No application behavior, historical migration/checksum/manifest, Windows recovery
restrictions or production release gate changed. No cleanup deletes existing
services/databases/directories; no provisioning/cleanup executor was added.

The [packet](../ops/option-c/linux-validation/README.md) requires an independently
identified disposable Ubuntu24.04 environment, private owned root and marker,
synthetic-only input, no production mounts/credentials/DNS authority, staged
dependencies and integration egress isolation. Its marker is self-attestation,
not proof of isolation/authorization. A read-only inventory match is not a test pass.

Further implementation/execution depends on an approved usable Linux environment.
Any required host elevation, WSL install, Docker install, host networking/firewall
or external infrastructure remains outside this task. See the
[decision register](HOSTINGER_OPTION_C_PHASE2_GO_NO_GO.md).
