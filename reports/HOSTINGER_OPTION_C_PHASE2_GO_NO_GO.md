# Phase 2 decision: Linux validation blocked

2026-11-11. **Phase2 acceptance: NO-GO / BLOCKED. Production: NO-GO.**

## Executive outcome

No usable disposable Linux runtime exists in the discovered local environment:
Windows host, no WSL distribution, no detected Docker/Podman/VM CLI. Under the
task's explicit fallback, prepared reproducible instructions/configuration and a
reviewable native DBA recovery procedure rather than installing WSL/Docker,
changing host features/network/firewall or provisioning infrastructure. No Linux
success, signed production certificate, host isolation or disaster recovery is
claimed. This is a prepared validation packet, not completed Phase2 infrastructure.

Option C remains a conditional architecture preference for keeping SQL off public
interfaces. Neither that preference nor346 supplemental Windows test passes
authorizes production initialization. React hosting stays unchanged.

## Completed versus blocked

| Workstream | Status |
| --- | --- |
| A capability discovery | Completed read-only; no usable Linux execution found. |
| A isolation/version/environment creation | Design packet only; not created/verified. |
| B template/code review | Completed; original examples remain review-only. |
| B real Nginx chain/security | BLOCKED / NOT_RUN. |
| C systemd/security/lifecycle | BLOCKED / NOT_RUN. |
| D Linux PKI/TLS/listener/public exposure | BLOCKED / NOT_RUN; public denial NOT_VERIFIED. |
| E Linux identities/grant transition/46 guards/bootstrap visibility | BLOCKED / NOT_RUN. |
| F Linux-native recovery | Reviewable DBA procedure prepared; unexecuted, not accepted recovery. |
| G Linux full regression | BLOCKED / NOT_RUN. Supplemental Windows346 passed. |
| H lifecycle/rotation/resource/reboot/off-server acceptance | Design/test schedule only; no native acceptance. |

Read-only Linux prerequisite collector and two supplemental local tests were
implemented. No application behavior, migration history/checksum/manifest or
Windows recovery restrictions changed. Complete changed-file list and evidence
boundaries: [Linux validation report](HOSTINGER_OPTION_C_PHASE2_LINUX_VALIDATION.md).

## Independent evidence still required

1. An approved usable disposable Ubuntu24.04 environment with Node24/MariaDB11.8
   native clients/Nginx and actual systemd for lifecycle, isolated from production
   mounts/credentials/DNS/provider integrations. Any developer-host elevation,
   WSL install/features, Docker install or host network/firewall change needs its
   own explicit approval. No such change requested/executed by tools here.
2. Legitimate Linux fixture adaptation and native tests, no relaxed constraints,
   platform checks, TLS or mock substitutions advertised as integration. Record
   exact installed package versions and signed source availability.
3. Complete Nginx -t/-T and HTTPS/IP/spoof/rate-limit/header/body/error tests, actual
   nonroot systemd permissions/start/stop/crash/drain/no-setup behavior, resources
   and alerting. New topology must stop for design review, not expanded proxy trust.
4. Real signed synthetic CA/SAN chain/lifetime/TLS/plaintext/rotation tests, exact
   loopback DNS/listeners and independentIPv4/IPv6 exposure checks. Generic required
   TLS is not itself a loopback-address-resolution restriction. No internet SQL
   listener or TLS waiver is authorized.
5. Original strict privileges, retained creating definer, all46 guards and per-table
   runtime denial enforcement on Linux before/after reduction/restart/restore.
   Resolve bootstrap trigger metadata empirically with protected temporary authority,
   never runtime DDL/TRIGGER or real rxadmin fixture account.
6. Reviewer-accepted native encrypted backup and independent isolated restoration,
   exact85 ledger hashes/32 tables/46 definers/rows/constraints/auth/MFA compatibility,
   all failure injections and measured RPO/RTO. Off-server storage/key custody,
   at-rest encryption, reboot unlock, retention/legal decisions and restore approval
   remain separate; a written procedure is not demonstrated recovery.
7. Independently assess exposed production MFA candidate's use. No production keys
   rotated/replaced/read. Authorize unused-key replacement or used-key reencryption/
   recovery separately; preserve access key and matching encrypted records. Real
   owner bootstrap remains gated after complete schema/recovery/release acceptance.

## Production authority remains absent

No VPS purchase/provisioning, Hostinger connection, production configuration/grants/
credentials, firewall/DNS cutover, migration, restore, Super Admin creation or
deployment is authorized. Later independent release must bind exact tested Linux
artifact/target/identities/PKI/recovery evidence and maintenance window. Production
GO cannot follow from local tests or an operator marker file. Application Phase1
legal/authentication/commercial holds and product gaps also remain independent.

See [Nginx/systemd](HOSTINGER_OPTION_C_PHASE2_NGINX_SYSTEMD.md),
[TLS/grants](HOSTINGER_OPTION_C_PHASE2_MARIADB_TLS_GRANTS.md),
[recovery](HOSTINGER_OPTION_C_PHASE2_ENCRYPTED_RECOVERY.md) and
[actual results](HOSTINGER_OPTION_C_PHASE2_TEST_RESULTS.md).

Stop after this packet. The next dependency is an approved usable Linux environment;
do not install privileged host features or buy/provision cloud infrastructure to
convert the blocked status into an apparent pass.
