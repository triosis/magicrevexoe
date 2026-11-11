# Option C implementation-readiness and DNS cutover plan

2026-11-10. **Future plan only, not execution authorization.** No code, package,
service, DNS, production setting, database or account changed. Preserve existing
production-migration-runbook.md, deployment-runbook.md and bootstrap gates. Cloud
commands assuming HOST=0.0.0.0/provider PORT are not the proposed VPS binding.

## Small implementation milestones requiring later approval

| Milestone | Files/artifacts and acceptance |
| --- | --- |
|1 Fail-closed operator TLS | backend/src/migrations/operator-cli.ts, existing config/tls.ts loader; backend/test/migration-safety.test.mjs and migration-safety.integration.mjs. All invalid CA cases refuse before pool/network access; valid required TLS and strict/local negative cases remain intact. |
|2 Single-proxy client identity | backend/src/app.ts, auth/routes.ts explanatory policy, proxy/rate-limit regression tests and proposed ops/nginx/api.conf. Narrow trusted-hop design and authoritative forwarded headers, no spoofing, separate client buckets, no weakened auth/abuse checks. |
|3 Linux service release | Proposed ops/systemd/magicreview-api.service and ops/nginx/api.conf, backend/.env.example and deployment documentation. Root-owned immutable artifact, nonroot runtime, protected environment, loopback listener, graceful stop/restart, public HTTPS and certificate renewal rehearsal. These ops files do not yet exist as this deliverable. |
|4 Recovery | Approved Linux/TLS production-target recovery design for backend/scripts/recovery/* or separately reviewed native DBA procedure; isolated recovery tests. Do not merely remove existing local-policy restrictions. |
|5 Acceptance and release packet | Full test/build/lint, Linux equivalent environment, recovery/performance/security results, exact commit/artifact hashes, named operator/reviewer and approved target/cutover/rollback evidence. |

No historical migration/verification/manifest changes are required. No authentication,
MFA, tenant/RBAC or review-path redesign is authorized. Five fully distinct database
principals would require the extra definer strategy reviewed in the security report.

## API service and reverse proxy proposal

Use a root-owned release path selected by the operator; do not hardcode an assumed
Hostinger VPS layout. Build on Linux with patched Node24 and backend lockfile/native
Argon2 dependencies: npm ci in backend invokes prepare/build; verify dist/server.js.
Keep install/build outside service startup. WorkingDirectory is the approved backend
directory; ExecStart uses the absolute approved Node binary and dist/server.js.
Do not start frontend server.mjs, Vite, watch mode, npm install or migrations there.

Propose systemd supervising one unprivileged API process: restricted filesystem
access, no shell login, no privilege escalation, root-owned secrets/environment
injection, bounded restart-on-failure/backoff/start-rate limits and alerts. No
restart loop should repeatedly run setup or compensate for invalid configuration.
SIGTERM drains via existing10-second application deadline; proposed supervisor
stop allowance>=20seconds, tested with active requests and transaction cleanup.
MariaDB and Nginx have separate services/users and startup/recovery behavior.
Ordering after MariaDB is not proof of readiness; do not stop/restart API endlessly
because DB readiness fails. A broken key/CA must fail startup, not be bypassed.
[systemd service semantics](https://www.freedesktop.org/software/systemd/man/252/systemd.service.html)

Nginx terminates public HTTPS for api.revexoe.com and forwards the complete original
URI to127.0.0.1:3001; /api/v1 must not be stripped or duplicated. Preserve Authorization,
Host, Content-Type, Accept, OPTIONS and webhook signature/event headers/raw bytes.
No API caching or proxy retries of non-idempotent requests. Preserve no-store/errors;
do not rewrite failures into200 or cached HTML. Restrict hostnames/default virtual
host, bound request/header/body/time budgets compatible with16KB JSON and64KB raw
webhook limits and approved presentation requests. Validate all larger body routes
before choosing a proxy cap. Forward the health aliases unchanged. Test redirects,
413/429/5xx and timeout behavior instead of assuming defaults are compatible.
[Nginx proxy reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

Public HTTPS needs a legitimate certificate, renewal monitoring and tested reload.
DNS-01 can establish domain control before API DNS cutover using narrowly scoped
DNS credentials; HTTP-01 requires public port80 and challenge routing. Select one
approved ACME process; do not disable HTTPS validation for pre-cutover tests.
Private database PKI is separate and needs no public SQL listener.
[ACME challenge requirements](https://letsencrypt.org/docs/challenge-types/)

## Probe and operational behavior

`/health` and `/health/live` return200 alive without DB queries. `/ready` and
`/health/ready` return200 only for successful SELECT1 and constructed production
auth/not-draining; DB failure/drain returns503. Readiness has4000ms response race;
allow>4seconds plus local/proxy margin. Do not use root404 as startup failure.
No schema, grants, SMTP, MFA decryption or whole-business readiness is asserted by
SELECT1. Require separate release gates and public end-to-end checks.

Node already listens after synchronous configuration/service construction without
awaited DB/SMTP/provider operations. Moving to VPS removes hPanel's3-second
detector, not configuration validation. Preserve30-second HTTP request and15-second
header timeouts unless a separately reviewed test demonstrates a required change.
Monitor CPU/RAM/disk/DB/pool pressure, API/error latency, rate limits, certificates,
SMTP and backup age. Readiness loss should fence traffic/alert with reviewed
thresholds, not invoke migrations, restore or secret rotation automatically.

## Future cutover sequence

1. Obtain architecture/budget/admin/security/recovery and local implementation
   approvals. Complete milestones and isolated tests before provisioning production.
2. After separate provisioning authority, establish hardened VPS, console access,
   firewalls, encryption/reboot plan, loopback DNS/TLS, OS/DB identities and services.
3. Freeze reviewed release/lockfiles/native artifacts and exact85-step manifest.
   Rehearse strict migration, bootstrap, all46 guards and recovery on a disposable
   equivalent Linux target; do not use production as the test environment.
4. Privately inventory current API DNS A/AAAA/CNAME/TTL, old origin/cert/release and
   real database state under separate read-only authorization. Preserve apex/www,
   frontend hosting, MX/SPF/DKIM/DMARC, unrelated records and HTTPS origin names.
5. Approve maintenance/write freeze and recovery evidence. If Cloud has any actual
   data or initialized identity, STOP empty-initialization plan and approve transfer
   and reconciliation. An old empty-DB screenshot is not current authorization.
6. Prepare correct api.revexoe.com certificate and validate the new origin using an
   approved local resolver/HTTPS resolve override with SNI/Host intact, no insecure
   TLS option. Validate proxy routes, CORS, client IPs, denied public3306/3001,
   runtime grants, DB TLS, services and failure/reboot behavior.
7. Independently authorize production migration with exact target/grants, private
   preflight report,15-minute approval, explicit production confirmation, dedicated
   named lock, immutable checksums, schema postconditions and exclusive fsynced
   audit. No startup migration or automatic retry. Verify85 applied/zero pending
   and exact32 tables/46 triggers; do not use historical67-row runbook count.
8. Resolve exposed MFA status, separately approve/bootstrap first owner, retain
   definer rights while reducing maintenance authority and verify strict runtime.
   Keep customer traffic fenced until acceptance and independent GO.
9. If approved, lower API TTL sufficiently in advance to let the **previous** TTL
   expire. Record exact old/new answers and rollback conditions; no arbitrary
   propagation guarantee. Change only the API address/alias after review, including
   staleAAAA/CDN configuration as applicable; leave React DNS/hosting unchanged.
10. During propagation only one database/API generation may accept writes. Fence
    old origin explicitly; DNS caches can reach both. A maintenance response on
    old origin is safer than divergent stores. Do not add an old-origin bridge
    without a separately tested authenticated routing plan. Some maintenance is
    possible; zero downtime is not promised.
11. Verify authoritative and representative resolver answers, valid HTTPS, public
    health/readiness, actual login/MFA, tenant denial, public paths, SMTP/inbox and
    allowed synthetic operations. Keep payment operations held. Monitor for an
    approved observation window before restoring normal TTL or retiring old API.
12. Retain old artifact/configuration and protected evidence for the approved
    rollback period; do not delete the Cloud DB, release, or hosting plan as cleanup.

## Rollback is a state decision

Before new production writes, aborting/canceling DNS cutover can preserve the
previous approved endpoint/state, but an old failing API is not a working fallback.
After first new write, pointing DNS at the old empty Cloud database loses access
to new state. Freeze writes and use approved restore/reconciliation or a compatible
previous API artifact against the same verified current database; do not blindly
restore old schema or repoint to a stale store. Maintain a single writer through
DNS cache overlap. Fix-forward versus restore requires independent incident
authorization and measured RPO; switching back to required local plaintext is not
an authorized rollback. No procedure here executes any DNS or data action.
