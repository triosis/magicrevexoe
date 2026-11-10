# VPS database proposal: executive decision and production gates

2026-11-10. **Analysis complete; production NO-GO.** No implementation, purchase,
production access, environment/credential/grant/firewall change, migration,
bootstrap or deployment occurred. Wait for explicit owner approval before any
implementation. Local336-test evidence does not authorize production execution.

## Executive recommendation

Conditionally select **B: Cloud Startup React/Express plus Hostinger VPS MariaDB**.
It preserves the application hosting arrangement while enabling verified TLS and
strict runtime privileges with a separate creating-definer/operator identity.
The existing pool and strict migration path need no provider-specific bypass.
The operator CLI does need a fail-closed empty-CA correction before remote use;
the network report documents this source-review finding and required tests.
First obtain an approved network path and an accountable self-managed database
operations/recovery plan. Do not buy first and discover Cloud cannot reach it safely.

If Cloud cannot provide a supportable private path or stable restricted public
egress route, B remains blocked. Assess C (app and DB on VPS) separately. Do not
open MariaDB to the entire internet or fall back to the Cloud plaintext/shared-user
exception as an automatic substitute. A has different enduring security risks,
documented in the existing Cloud compatibility reports, not erased by local tests.

## Evidence versus assumptions

| Item | Evidence level / current result |
| --- | --- |
| MariaDB11.8 migration artifact,85 migrations/32 tables/46 triggers | Repository definitions and prior disposable rehearsal; no historical artifact changes proposed. |
| Cloud Node24 and deployed operator present | Operator-confirmed; not independently inspected on production in this task. |
| Cloud database empty | Prior owner/phpMyAdmin evidence only; no fresh inventory. Recheck under separate authorization before initial-empty workflow. |
| Existing336 tests | Historical local report; not rerun or represented as VPS certification. |
| DNS/CA verified remote pool and strict operator | Pool supports it; operator empty-CA pre-connection gap requires correction. Actual certificate, host, grants and route not provisioned/verified. |
| Cloud-to-VPS private network, stable egress and outbound SQL | Unconfirmed; questions N1-N8 in network report. |
| VPS availability/sizing/security | Proposed pilot design; no purchased host, actual workload benchmark or HA. |
| Production recovery | Not established. Prior Windows/local restore and listed Cloud backup do not prove Linux/VPS restoration. |
| First owner/MFA | Bootstrap implemented; account absent/unverified, exposed-key remediation still unresolved. |

## Required work and exact boundaries

The [architecture diagram and source-file impact](HOSTINGER_VPS_DATABASE_ARCHITECTURE.md)
cover the proposed boundary. The [network/TLS report](HOSTINGER_VPS_NETWORK_SECURITY.md)
contains exact environment names/formats. Replace DB_HOST/PORT/NAME/USER/PASSWORD,
select DB_TLS_MODE=required, install approved DB_TLS_CA_FILE and exact-byte
DB_TLS_CA_SHA256, and review DB_CONNECTION_LIMIT. Remove local exception inputs.
Actual host, path, account, certificate and credentials require operator input.

Retain public origins, frontend API URL, Node24/backend root/build/start binding,
authentication/MFA keys and SMTP configuration. This database move does not change
HTTP login credentials or create an administrator. Build artifacts must be compared
with the approved commit and compiled output before release.

No SQL/verification bytes or schema manifest change is proposed. No authentication,
RBAC, tenant or parallel-path business logic change is justified. Required TLS
hardening is limited to the operator empty-CA gap, with negative regressions.
Future implementation work includes Linux/TLS production recovery tooling or an
approved native DBA workflow, configuration/runbooks and isolated acceptance tests.
Do not broaden the disposable recovery executor's targets without separate design
and tests. A five-fully-independent-user definer implementation would require extra
review; minimum unchanged-artifact design merges definer into a non-runtime
maintenance identity, as explicitly described in the
[privilege report](HOSTINGER_VPS_DATABASE_PRIVILEGES.md).

The VPS administrator controls database security and can override it; the Node
runtime must not have that authority. Firewalls restrict reachability, TLS verifies
the server, credentials authenticate users, and per-table grants bound runtime
capabilities. None independently establishes tenant isolation inside the application.
At-rest encryption needs its own approved design/risk decision. All five layers
must be reviewed truthfully, without treating loopback or a provider brand as proof.

## GO / NO-GO checklist

| Release gate | Current status / evidence needed |
| --- | --- |
| Owner chooses B and approves spend/administration | Pending; prices/estimates are assessment only. |
| N1-N8 answered for actual Cloud/VPS products and region | Pending; network feasibility conditional. |
| Restricted route and verified DNS/CA TLS, negative failure tests | Not tested/provisioned; operator empty-CA gap also requires correction. NO-GO. |
| MariaDB/OS/package compatibility and at-rest controls | Proposed, not installed/rehearsed. |
| Exact identities/grants/creating definer and metadata access | Designed, not provisioned; runtime must pass original strict profile. |
| Linux native backup/isolated restore with original definers | New workflow/rehearsal required; NO-GO. |
|85 migrations, bootstrap and46 guards rehearsed in proposed environment | Prior local evidence only; separate-identity Linux/TLS acceptance required. |
| Cloud inventory, recovery capture and target identity approval | Not freshly established. |
| Exposed MFA candidate assessed and remediated | Pending independent secure handling; preserve used ciphertext/key compatibility. |
| First production owner securely bootstrapped/MFA enrolled | Not executed or established. |
| Exact release, migration, bootstrap and deployment authorization | Not granted by this analysis. |
| Production listening, readiness, permissions and business acceptance | Not verified; do not claim503 fixed or production ready. |

Liveness `/health` or `/health/live` is independent of DB availability; `/ready` or
`/health/ready` checks SELECT1 and draining state. Readiness can take4000ms and
does not verify schema, SMTP, grants, MFA, AI, billing or whole-product acceptance.
Use startup/listen or liveness probes with separate readiness timing above4s plus
ingress margin, after provider confirmation. Preserve prompt listen, no startup
migrations/network-dependent tunnel launch, and provider-assigned HTTP port.

## Owner decisions and approvals before implementation

1. Choose B conditionally versus C; approve VPS term/renewal budget, region,
   administrators/on-call and the operational estimate in
   [cost and operations](HOSTINGER_VPS_COST_AND_OPERATIONS.md).
2. Approve written N1-N8 answers and restricted private/public route, shared-egress
   residual exposure if applicable, DNS/certificate ownership and any additional
   network service cost. Separate authority is required to provision/open ports.
3. Approve OS/MariaDB/security-patching plan and at-rest encryption/key-unlock design
   or explicitly accepted residual at-rest risk; TLS is not an at-rest control.
4. Approve account/definer coalescence or fund the separately designed distinct
   definer strategy, temporary bootstrap metadata/grants and future maintenance.
5. Approve recovery implementation scope, isolated environment, storage/custody,
   legal retention decisions, proposed RPO<=24h/RTO<=4h or alternatives, and measured
   restore acceptance. No retention policy or recovery SLA is invented.
6. Authorize isolated implementation/rehearsal separately. Later require independent
   production migration/bootstrap, configuration/deployment and traffic-release
   approvals bound to exact target/artifact and maintenance window.
7. Resolve the exposed MFA-key status privately; authorize unused-key replacement
   or used-key reencryption/recovery as appropriate. Preserve existing access key;
   do not rotate simply to change databases. Use a new privately chosen owner
   password, never the previously shared password.

The [migration and recovery sequence](HOSTINGER_VPS_MIGRATION_AND_RECOVERY.md)
sets all12 future steps and rollback stop points. Existing legal/authentication
amendment, financial-operation holds and application-completion gaps remain separate
launch decisions; this infrastructure proposal does not mark Phase1 complete.

## Validation performed for this assessment

Read the required reports, trigger map and actual transport/pool/startup/operator,
privilege/bootstrap and recovery source. Checked current official Hostinger/MariaDB
documentation, public prices and hosting limitations. Documentation-only change;
no new feature tests or live probes were appropriate or run. Offline artifact/link/
whitespace validation passed: loadMigrations/validateManifest accepted85 versions,
000000 through000084; all local report links resolved and all six reports had no
trailing whitespace. git diff --check passed, and Git showed only these six new
reports, with no backend changes. Prior336 tests remain historical, not rerun here.
