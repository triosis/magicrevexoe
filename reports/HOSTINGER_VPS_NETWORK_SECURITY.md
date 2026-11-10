# Cloud Startup to VPS network and database TLS assessment

2026-11-10. Analysis only; no DNS lookup of production, connection, tunnel, firewall
change or certificate installation performed. **Network feasibility is conditional,
not verified. Production NO-GO.**

## Provider questions that must be answered

The reviewed public documentation does not establish a private bridge between
Cloud Startup and a customer's VPS, stable Cloud outbound source addresses, or
permission for this exact application to reach a VPS MariaDB listener. Documentation
silence is not proof those capabilities are unavailable. Obtain written answers
for the actual subscription/region, then separately authorize a disposable probe.

| ID | Exact question / required evidence |
| --- | --- |
| N1 | Can this Cloud Startup Node website reach this VPS through a supported private network? Addressing, tenant isolation, authentication, routing and lifecycle guarantees? |
| N2 | What are the Cloud application's actual IPv4/IPv6 outbound source addresses/CIDRs? Are they stable across builds, restarts, scaling, region moves and failover? Shared with other tenants? How are changes notified? |
| N3 | Are outbound TCP connections and persistent mysql2 sockets to the selected VPS port permitted? Any NAT idle timeout, connection cap, throttling or firewall requirement? |
| N4 | If public routing is needed, can the VPS firewall restrict both address families to the reviewed sources? Is a static egress facility available, and at what cost? |
| N5 | Are supervised SSH tunnels, VPN/TUN devices or authenticated database proxies supported for this product? Who supervises/restarts them and supplies network identity? |
| N6 | Which co-located regions are available, and what are measured RTT, DNS TTL/resolver behavior, restart/outage and failover characteristics? |
| N7 | Can the Cloud runtime persist and privately mount the approved CA file across releases with the correct process permissions? |
| N8 | What VPS console, firewall recovery, disk encryption, backup encryption/restore and support responsibilities are contractual? |

The website's inbound IP, SSH host IP and VPS IP do **not** establish Cloud egress
identity. No remote allowlist entries in the existing Cloud database are evidence
about neither VPS ingress nor Cloud outbound routing.

## Approved-path design choices

Prefer a provider-supported private authenticated path, still using verified TLS.
If unavailable, public routing needs a stable reviewed source allowlist, verified
TLS, unique limited credentials, login monitoring and a documented residual-risk
decision. Shared egress allowlisting permits other tenants to reach the TCP service;
it is not application authentication. Do not authorize 0.0.0.0/0 or ::/0 database
ingress as a workaround for unknown egress. If no supportable restricted path exists,
Option B is blocked; evaluate Option C separately.

Bind MariaDB only to the required database interface(s), with provider and host
firewalls default-denying database access except the approved application and
operator paths. Restrict SSH to a separately controlled administration path using
keys and recovery access. Do not open a database port or web phpMyAdmin console
during assessment. DNS names do not themselves restrict source networks.

Do not assume a persistent SSH/VPN helper works in Cloud Startup. Hostinger documents
one long-running Node process per website and no always-running background workers;
plan process/thread limits are shared. This is not an explicit ruling on every
tunnel technology, so N5 requires confirmation. Do not add an unreviewed helper to
startup, use a Windows laptop as the production tunnel, or proxy SQL over HTTP to
evade hosting limits. [Hostinger Node limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)

## Exact existing TLS contract

Verified in backend/src/config/database-transport.ts, config/tls.ts and db/pool.ts:
required mode rejects IP literals even if the server has an IP SAN. Use a DNS
hostname matching a valid server-certificate DNS SAN; an IP-only certificate will
not satisfy this application contract. DNS must resolve to the approved listener.
No code change is needed for a correctly configured DNS certificate/CA chain.

The runtime loads a readable PEM certificate bundle and compares SHA-256 of its
**exact file bytes** to the approved 64-hex digest before creating the pool. It then
uses rejectUnauthorized:true, verifyIdentity:true and minimum TLS1.2. Bad CA bytes,
hostname/chain/expiry errors and connection failures have no plaintext retry.
The operator additionally checks a nonempty session Ssl_cipher and exact target
identity. Automatic server-generated encryption does not substitute for this
explicit CA/DNS trust contract.

**Required operator correction found in this assessment:** operator-cli.ts reads
the CA as UTF-8 and uses `if(ca && ...)` for the hash check and
`...(ca ? {ssl:...} : {})` for pool configuration. An empty file is falsy: even
with a syntactically valid policy hash, it skips hash validation and constructs a
pool without ssl. verifyTarget rejects an empty Ssl_cipher later, after a possible
connection/authentication attempt. This is inadequate pre-connection refusal.
Application pool and bootstrap instead call approvedCa and reject empty material
before connecting. No TLS-error retry path was found.

Before remote operator use, separately authorize reusing approvedCa with the
resolved policy path, raw-byte hash and PEM/context validation in required mode,
always supplying SSL in that mode. Regression tests must prove missing, empty,
malformed and mismatched CA fails before pool creation/access, valid CA works,
and wrong SAN/chain fails. Keep target/cipher checks and existing local modes.
No correction was implemented in this analysis; do not claim the operator already
guarantees pre-connection fail-closed CA handling.

The future DBA must install a legitimate certificate/private key with server
authentication usage and the selected DNS SAN, an appropriate chain and monitored
expiry. Keep the private key on the database server; the Cloud app receives only
public CA certificates. Configure server-side secure-transport enforcement and
REQUIRE SSL for TCP application/operator accounts, with a reviewed local emergency
administration path. These are proposed controls, not existing settings.
[MariaDB TLS configuration](https://mariadb.com/docs/server/security/encryption/data-in-transit-encryption/data-in-transit-encryption-enabling-tls-on-mariadb-server)

## Required environment changes, no actual values generated

| Variable | Required value / source |
| --- | --- |
| NODE_ENV | production |
| DB_TLS_MODE | required, explicitly selected |
| DB_HOST | Approved real database DNS hostname; no protocol, path or IP literal |
| DB_PORT | Approved port, integer1-65535; 3306 only if actually configured |
| DB_NAME | Approved exact schema; retaining u676472791_magicreview_db is possible on VPS but not provisioned |
| DB_USER / DB_PASSWORD | New restricted runtime identity and protected credential, separately provisioned; production password >=16 characters and >=8 distinct characters |
| DB_CONNECTION_LIMIT | Integer1-50, initially reviewed default5; aggregate capacity review required |
| DB_TLS_CA_FILE | Persistent absolute backend-readable PEM path selected by operator |
| DB_TLS_CA_SHA256 | Independently approved SHA-256 of exact PEM bytes, 64 hexadecimal characters |
| HOSTINGER_LOCAL_APPROVAL / HOSTINGER_LOCAL_APPROVAL_ID | Remove from remote configuration; no local exception needed |

Preserve HOST/PORT provider binding, PUBLIC_* origins, CORS, recovery URL, SMTP,
AUTH_ACCESS_SECRET and matching AUTH_MFA_KEY. Do not rotate authentication keys for
a database move. Cloud privilege-exception inputs are operator-only and must not
be used in the new strict target policy. Never place any DB value in a VITE_ variable.

CA changes require independent trust approval, exact-byte source/runtime digest
comparison, isolated positive and wrong-CA/wrong-host tests, reviewed overlap bundle,
process/pool restart and post-change handshake verification. Leaf renewal under the
same trusted CA/SAN need not change the pinned bundle; CA rotation does. Retain the
previous approved trust configuration for an authorized rollback only while valid.
No invented CA, dummy hash or certificate verification disablement is acceptable.

## Performance, availability and acceptance

Existing pool connect timeout is3000ms, readiness query timeout3000ms and readiness
response race4000ms. Sequential SQL round trips amplify cross-host RTT. Measure
P50/P95/P99 login, public funnel, quota and transaction latency under representative
load and reconnection/DNS failure, not just SELECT1. Do not automatically increase
timeouts to hide network incompatibility. Connection pools need explicit restart
on a reviewed cutover; DNS changes do not migrate existing sockets.

One VPS is a single database failure domain. No replica, automatic failover or HA
SLA has been established. Prefer the nearest supported region after measurement;
same provider does not prove same datacenter or latency. A future failover must
retain trusted SAN/CA and exact operator hostname/account policy approval, and
prevent split-brain/writes to two databases. Do not silently repoint an operator.

Acceptance requires N1-N8 answers, reviewed route/firewall, TLS1.2+ handshake with
actual DNS identity, wrong-host/CA/plaintext rejection, stable source observation
across restarts, and bounded dependency-failure behavior. No such live test occurred.
