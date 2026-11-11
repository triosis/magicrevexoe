# Option C architecture decision and implementation readiness

2026-11-10. **Assessment complete. Production: NO-GO. Implementation: not authorized.**
Only the five HOSTINGER_FULL_VPS reports were created. No application code,
historical SQL/manifest, secrets, services, production resources or DNS changed.
No purchase, provisioning, production query, migration or bootstrap occurred.

## Is C preferable to B?

**Yes, conditionally for the stated security requirements.** API and MariaDB on
one VPS permit a loopback-only SQL listener, pinned-CA/DNS verified TLS and strict
separate runtime grants without dependence on Cloud Startup's unverified private
network/stable egress. React stays on its existing hosting; no technical requirement
to move it was found. This is not a claim that co-location is universally safer.

B remains less disruptive operationally and separates the API host from database
OS compromise. With a proven private route it may become preferable for isolation
or growth. C concentrates outage/resource/root-compromise risk and makes the owner
responsible for API/proxy/HTTPS as well as database operations. Without competent
administration, tested recovery and approved residual risk, **neither is GO**.
This scoped C assessment supplements the earlier conditional B recommendation.

| Requirement | Option B | Proposed Option C |
| --- | --- | --- |
| No publicly reachable3306 | Needs verified private Cloud-to-VPS route; unresolved | Loopback bind plus host/provider IPv4/IPv6 deny; independently test before GO |
| Verified TLS/DNS/CA pin | Supported valid-config path; operator CA defect unresolved | Same mandatory contract with private local DNS; same defect must be fixed |
| Runtime cannot manage triggers/ledger/DDL | Separate accounts possible | Separate accounts possible; no db-wide exception needed |
| Locality/latency | Cross-host route and RTT to establish | No cross-host SQL hop; same-host contention to measure |
| Recovery | Linux/definer recovery not yet established | Same plus API/proxy/service/host restoration |
| Availability/security | Separate hosts, two service/network dependencies | One shared host failure/root authority; no HA implied |
| Frontend change | None required | None required; retain hosting and API origin |
| Administration/cost | DB VPS plus retained Cloud/app operations | API+DB VPS plus retained frontend hosting; more owner operations |

## Evidence boundaries

Repository facts were re-inspected: required transport refuses IP literals and
uses CA-byte pinning/hostname checks; API pool/bootstrap reject invalid CA before
connection; operator CLI has an empty-CA truthiness gap. Express deliberately
ignores forwarded client IPs, affecting current per-IP limiters behind Nginx.
Server prompt-listen/graceful-drain and health/readiness contracts are implemented.
Strict grants, bootstrap protections and disposable-only Windows recovery remain.

Baseline85 migrations000000-000084/32 tables/46 triggers and prior336 tests come
from the repository and previous local evidence. No production availability,
database current emptiness, deployed-source identity, MFA remediation, CA/SAN,
DNS answer, grant state or restore is independently verified in this task. Planning
capacity, RPO/RTO, region and cost ranges are proposals, not approved policy/SLA.
Public prices/limitations were checked against official documentation on2026-11-10.

## Blocker and approval register

| Gate | Current status / approval and evidence needed |
| --- | --- |
| C scope and budget | Pending: retain React hosting, approve VPS sizing/term/renewal, India-region assumption, named primary/backup administrator and on-call. |
| Local implementation authority | Pending: only assessment authorized; explicit approval needed for CA correction, proxy policy, Linux recovery and staging infrastructure artifacts. |
| Operator CA failure before connection | Known source defect; no correction/regression implemented. Mandatory regardless of loopback. |
| Proxy/IP/abuse controls | Design/rehearsal needed; no blanket trust proxy or shared-client rate buckets accepted silently. |
| Loopback SQL and Node listeners | Proposed, not installed/tested; deny publicIPv4/IPv6, validate externally under separate permission. |
| DNS SAN/CA and HTTPS | Approved real names, trust chain, custody, renewal and rotation tests absent. Private CA signing/leaf keys not created. |
| Account/definer model | Owner must accept combined non-runtime maintenance/definer role or approve distinct-definer execution design; exact grants/activation/metadata rehearsal pending. |
| Encryption at rest / reboot recovery | Operator-managed design or explicit risk acceptance required; no provider encryption guarantee assumed. |
| Linux native encrypted recovery | Implementation/procedure, isolated infrastructure, original definers, key recovery and measured results required. |
| Production current-state inventory | Prior empty evidence only. Separate authorized check and verified recovery capture required. |
| MFA exposure / bootstrap | Key usage unresolved; independently authorize remediation and first owner after complete schema/grant verification. |
| Regression/performance/DR | Prior336 historical tests only; proposed environment suite below not executed. |
| DNS/maintenance/traffic release | Independent staged authorization, exact rollback/write-fencing plan and reviewers required. |

No genuine approval ID is fabricated by these reports. HOSTINGER_LOCAL and Cloud
database-wide privilege exceptions are unnecessary for the proposed strict TLS
design; they cannot substitute for these gates.

## Required validation before release

Future approved local checks, using synthetic fixtures only:

```text
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix backend run typecheck
npm --prefix backend run build
npm test
npm run test:e2e:real
npm run test:browser
npm run test:server
npm run typecheck
npm run build
npm run lint
git diff --check
```

On Windows use npm.cmd where needed. Production frontend build requires the approved
public VITE_API_URL before install/prepare/build. These commands are a future test
plan, not results claimed for this assessment. Linux-native separate-identity and
proxy/service/PKI/DR tests require additional approved fixtures/workflow; Windows
success alone is insufficient.

Acceptance must include:

1. Operator required TLS refuses missing/empty/malformed/hash-mismatched CA before
   pool access/network, and rejects wrong hostname/chain/expiry without plaintext
   attempt; application/bootstrap and local-default regressions remain intact.
2. Exact85 migrations/checksums/manifest, target/grants/15-minute approval, locks,
   audit fsync/failure, drift, interruption/committed-DDL recovery and zero blind
   retries. No historical SQL/manifest changes accepted as incidental fixes.
3. Separate creating-definer/runtime grant transition, all46 guards, original
   definers after restore, strict actual denial of trigger/DDL/ledger/role changes
   by runtime, and verified metadata authority for bootstrap/operators.
4. Spoofed forwarded headers rejected, distinct client IP limits preserved, auth/
   recovery/global limits retained, correct raw webhook/path/body/error behavior,
   CORS/HTTPS and direct public Node/SQL denial on both address families.
5. Auth/password/MFA/recovery/session revocation, four-tier ancestry/peer isolation,
   quota concurrency, immutable publication/append-only history, QR and both
   compliant public paths. No rating gating, authentication or financial bypass.
6. Combined-load P50/P95/P99 API latency, Argon2 concurrency/native memory, QR,
   DB locks/pool exhaustion, simultaneous backup pressure and growth headroom.
   Owner approves performance budgets before measuring; no invented pass threshold.
7. DB down leaves liveness available/readiness503; graceful shutdown/drain,
   bounded crash restart, reboot/encrypted-volume unlock, expired certificate,
   disk-full/OOM and missing secrets fail safely and alert without automatic setup.
8. Encrypted off-server backup, wrong-key/tamper/incomplete/interrupted restore
   rejection, exact schema/row/definer integrity, matching synthetic MFA and full
   service recovery, measured accepted RPO/RTO and single-writer DNS rollback drill.
9. Separately authorized external SMTP TLS/authentication and synthetic inbox
   delivery, Google destination/other approved integrations as applicable. Existing
   AI/payment tests do not authorize real billing or verify provider delivery.

Independent production GO must bind the exact release/compiled artifact, target,
runtime/definer grants, accepted recovery evidence, MFA remediation, maintenance
window and cutover. Migration, first-owner bootstrap, DNS/deployment and customer
traffic release each require explicit scope; passing tests never grants them.

## Implementation packet and current validation

The [architecture/cost report](HOSTINGER_FULL_VPS_ARCHITECTURE.md) specifies sizing,
retained frontend and responsibility boundaries. [Security](HOSTINGER_FULL_VPS_SECURITY.md)
defines local DNS/TLS, env requirements, identities and required corrections.
[Deployment](HOSTINGER_FULL_VPS_DEPLOYMENT_PLAN.md) identifies source/artifact work,
proxy/supervision, DNS sequence and state-dependent rollback.
[Recovery](HOSTINGER_FULL_VPS_RECOVERY_PLAN.md) covers encrypted Linux recovery,
definers, MFA remediation and first-owner conditions.

Assessment validation is documentation and offline artifact inspection only.
The prior336 tests were not rerun. No Linux performance/DR or live probe occurred.
Offline loadMigrations/validateManifest passed for85 migrations000000-000084.
All five new reports passed local-link/trailing-whitespace checks; git diff --check
passed and Git listed only these five new reports, with no tracked source changes.
Do not claim503 resolved, complete Phase1 or production readiness.

Next permissible step requires explicit owner approval for the scoped local
implementation/rehearsal packet. This assessment authorizes nothing further.
