# Disposable Linux validation packet — NOT RUN

2026-11-11. No usable Linux runtime was found on the development host. This is a
reproducible **review packet**, not an executed environment or deployment script.
Do not install WSL/Docker, enable host features, change host networking/firewalls,
purchase a VPS or connect to production to complete this packet without separate
authority. Existing .example files remain review-only. Production stays NO-GO.

## Entry conditions and isolation

Use an approved disposable Ubuntu24.04 VM with actual systemd PID1 for lifecycle
tests. Containers are useful for Nginx/DB tests but do not establish systemd/reboot
behavior unless those facilities really exist. Exact initial versions: Node24.x,
MariaDB11.8.9 preferred, matching mariadb/mariadb-dump11.8.x, Nginx, OpenSSL. Verify
signed package sources and stock/version availability in that environment; this
packet contains no host installer or curl-to-root-shell command. A default Ubuntu
MariaDB10.11 package or MySQL is incompatible with the requested parity.

Before importing files, the operator must establish:

1. New VM/datadirs and unique run UUID; a private0700 root owned by the operator.
   Record VM/instance identity, kernel/PID1, package versions and network namespace.
2. No mounted developer home, SSH agents, production .env/private-key directories,
   cloud metadata/credentials or DNS API authority. Export an allowlisted source
   tree (src/test/migrations/package/lockfiles/scripts/docs/ops), not a whole home or
   workstation filesystem. Install Linux dependencies/native Argon2, not Windows
   node_modules. Stage approved dependencies before blocking external integrations.
3. No route/access to Hostinger production DB or customer services. Disable outbound
   SMTP/payment/AI and external DNS authority in the **disposable environment**;
   retain no real keys. A `.invalid` hostname alone does not prove network isolation.
   The runtime collector records isolation as operator-attested, not independently
   proved. Do not change the Windows host firewall to achieve isolation.
4. Source and restore instances use separate VM/datadirs and the same unique
   `magicreview_migration_linux_<run suffix>` schema name, not the production name.
   Use synthetic users/customers/email@example.invalid and synthetic secrets only.
5. Synthetic DNS `db.optionc.test` resolves to127.0.0.1 only inside each instance.
   Generate a separate test CA with protected signing key and signed leaf with that
   DNS SAN, valid lifetime and server-auth usage. The API user cannot read signing
   or database leaf keys. Do not export these keys in the source packet or Git.

All machine-level setup below is restricted to that independently identified VM.
If establishing it needs prohibited developer-host changes, STOP and request a
separate approved environment. No script here creates a VM, package or network.

## Read-only prerequisite collector

The operator creates `.magicreview-disposable.json` in the existing private run
root,0600, with format1, disposable:true, a generated runId UUID and networkIsolated:
true **only after** verifying isolation. This marker is a local attestation, not a
production approval or a security boundary against a malicious operator.

From the staged source tree, after dependency installation/build, future commands:

```bash
# These variables refer to actual approved private paths, not placeholder strings.
node backend/scripts/linux-validation/preflight.mjs \
  --root "$REVO_RUN_ROOT" --report "$REVO_RUN_ROOT/linux-inventory.json"
```

Collector requires Linux, Ubuntu24.04, Node24, MariaDB server/client/dump11.8 and
Nginx; checks private owned root/marker and exclusive-create report. It reads
versions/PID1 only, strips inherited secrets from child environments and performs
no SQL, service control, downloads or network probes. INVENTORY_MATCHES means
prerequisites only; all Linux integration/lifecycle results remain NOT_RUN until
separately executed. Existing report cannot be overwritten. Missing prerequisites
give BLOCKED. Non-Linux refuses before filesystem/child/report access.

## Build, migration and identities

Inside the approved VM, build backend with its lockfile and Node24; build frontend
with public VITE_API_URL=https://api.revexoe.com/api/v1 as a string only. Do not
start the actual public frontend/API domains. Resolve the fixture mismatch first:
current backend/test/mariadb-fixture.mjs explicitly requires win32/Windows ZIP
binaries and tls-fixture.mjs uses a Windows OpenSSL path. Existing real-stack and
browser harness dependencies also need Linux review. Merely running the existing
integration command on Linux will not produce parity evidence. Prepare a separate
Linux disposable fixture or reviewed backward-compatible adapter under later
implementation; never skip tests or replace them with mocks to claim Linux passes.

Use the original strict operator, not Cloud exceptions. For this TLS rehearsal use
an explicit **staging** target policy for the isolated synthetic schema and DNS:
local-policy mode deliberately selects non-TLS and cannot represent this test.
Pin actual @@hostname/CURRENT_USER, CA path/exact-byte hash and reviewed definers.
This is an authorized disposable staging fixture, not production relabeled local.
No production account, approval ID or production email is used.

From backend after protected synthetic credentials are injected:

```bash
node dist/migrations/operator-cli.js preflight --target "$REVO_SOURCE_POLICY" \
  --environment staging --report "$REVO_RUN_ROOT/preflight.json"
# Reviewer inspects exact target/grants/empty inventory/manifest before apply.
node dist/migrations/operator-cli.js apply --target "$REVO_SOURCE_POLICY" \
  --environment staging --approval "$REVO_RUN_ROOT/preflight.json" \
  --audit "$REVO_RUN_ROOT/apply.jsonl"
```

These commands can change only the explicitly authorized disposable target after
their gates pass. Fifteen-minute artifact expiry, named lock, grants, checksums,
audit/postconditions and refusal of partial histories are unchanged. Confirm85
applied entries,32 tables and46 exact triggers. Old67-row runbook text is historical.
Do not manually import the initial85 SQL files or regenerate the manifest.

Provision separate synthetic runtime, migration/retained-definer, backup and DBA/
restore principals. Strict migration profile and runtime per-table map remain the
source of truth. Creating migration user is the default definer; document combined
role rather than claiming five separate identities. Reduce its unnecessary rights,
reconnect, exercise all46 guards with the reviewed TRIGGER/SELECT dependency map,
then verify runtime DDL/trigger/ledger/grant/DELETE denials. Tenant SELECT isolation
requires application authorization tests: grants do not scope rows by tenant.

Assess bootstrap metadata under temporary protected authority, including actual
trigger-definition visibility. Use synthetic owner@example.invalid only, password
entry private and canonical policy digest. Do not bypass root/MFA/history safeguards
or grant metadata/DDL rights to runtime. See the native recovery procedure for
source/destination identity and definer reconstruction gates.

## Real proxy, service, TLS and network test schedule

In the VM only, render **copies** of the .example templates with test hostnames,
approved local paths/test certificates and actual Node24 binary. Originals stay
review-only. Record hashes of both originals and rendered copies. Full nginx.conf
must contain only intended includes, explicit events/http blocks, log/pid/temp
paths inside the owned environment and expected default servers. Inspect nginx -T
privately for unexpected includes/real_ip/PROXY/CDN trust before running tests.

```bash
nginx -t -c "$REVO_NGINX_CONFIG"
systemd-analyze verify "$REVO_SERVICE_UNIT"
# Actual service lifecycle requires systemd PID1 and approved disposable unit/user.
ss -H -ltn 'sport = :3001 or sport = :3306'
```

Syntax validation is not runtime evidence. Nginx tests: valid HTTPS, unknown SNI/
Host rejection, HTTP308, original URI, Authorization/signature/raw bytes, OPTIONS/
CORS/no-store; body/header limits;413, app429/503, backend502 and real upstream
timeout. Proxy read35s/application request30s may prevent a504 in the ordinary API
path: use a dedicated **test-only slow upstream**, never a production debug route.
Count invocations to prove no write retries/cache. Test two genuine client source
addresses/network namespaces, spoofed XFF/XFP/XFH/Forwarded, direct Node requests,
malformed chains and no arbitrary CIDR trust. Existing HTTP model tests are not
Nginx execution. Client spoof headers must be overwritten, not merely echoed.

Service tests: nonroot/nologin, immutable code, denied secret/CA-key access,
protected env, journal redaction, valid/missing config/CA, DB unavailable/lost,
bounded crash/restart, active-request SIGTERM draining, stop allowance>=20s against
10s app deadline, no setup on restart. A systemd binary without a manager cannot
establish lifecycle. Reboot/encrypted-volume unlock remain NOT_RUN unless a real
disposable exercise is completed.

Database tests: exact hash/PEM, signed chain/SAN/lifetime/TLS>=1.2, missing/empty/
whitespace/malformed/mixed/hash mismatch **before pool**, actual wrong-CA/SAN/
expired/untrusted/plaintext failures, cert replacement/new pool, and no downgrade.
Check native clients use TCP/verified CA, not Unix socket/implicit trust fallback.
Observe resolution and listener inventory. Current generic required mode permits
remote verified DNS endpoints by design; it does not itself pin DNS to loopback.
Abort this harness if resolution leaves loopback; test that gate explicitly rather
than pretending application code already forbids every public resolution.

Probe3001/3306 from separate network vantage forIPv4/IPv6 after socket inspection.
If no independent vantage exists, public exposure is NOT_VERIFIED; listener/host
firewall checks alone do not substitute. No current-host firewall change authorized.

## Evidence and cleanup

Record command, versions, exit/result, timestamp/duration, test counts, original/
rendered/release hashes and reviewer. Do not collect environment dumps, passwords,
hashes from mysql.user, raw customer rows or keys. Use PASS/FAIL/NOT_RUN/BLOCKED,
not a generic “Linux validated” label. No production/public-CA claim from test PKI.

Stop only processes/units whose PID, start time, datadir and run marker match this
new run. Never kill all Node/MariaDB processes, adopt a busy3306 listener, run
global docker prune or remove pre-existing services/databases. Record partial
restore/import state before cleanup. Remove only an explicitly verified owned
run directory/VM under its cleanup approval; no recursive deletion command or
automatic database reset is supplied. Preserve protected evidence and separately
dispose test keys/data under the approved test retention rule.
