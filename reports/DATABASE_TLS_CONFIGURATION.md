# Database TLS configuration and evidence

2026-11-07. Repository inspection plus public provider documentation, not an actual
external handshake. No provider/production certificate was fabricated/downloaded into the application,
production key/CA changed or verification switch removed. R = repository verified;
C = target/provider confirmation; P = future approved operator step.

## What the existing implementation can do (R)

**Yes: the existing pool can connect to an external MariaDB11.8 writer endpoint
using an authenticated trusted CA bundle and matching DNS hostname without a TLS
code change.** Actual provider compatibility remains conditional on grants, engine,
network, authentication, metadata and rehearsal. A valid MySQL TLS handshake alone
would not make the current schema/migration tools MySQL-compatible.

backend/src/db/pool.ts calls approvedCa in config/tls.ts before pool creation.
Production DB_TLS_MODE omitted defaults to required; explicit disabled is rejected.
With required mode, it refuses IPv4/IPv6 literals and non-DNS host characters, reads
CA PEM bytes, checks a 64-hex SHA-256 against those exact bytes, parses a secure
context and passes ca/rejectUnauthorized=true/verifyIdentity=true/minVersion=TLSv1.2
to mysql2. It has no insecure retry, alternate plaintext pool or default-trust fallback
when a CA/identity check fails. Missing production CA/key settings fail before listen.
Once connecting, wrong CA/identity/expiry or missing server TLS fails rather than
negotiating a plaintext application connection. No database query is awaited at startup.

The pool uses server-authenticated TLS with password authentication, not mTLS/client
certificate keys or an IAM token refresh mechanism. If a provider requires those,
that is a separate implementation, not an environment flag we already support.

Development/test mode intentionally permits disabled TLS for disposable local
fixtures; scripts/recovery is additionally loopback-only and must never be repurposed
for production. These are explicit scoped modes, not production fallback. Deployment
must enforce NODE_ENV=production; selecting development to avoid errors is prohibited.
Non-local migration/operator target policy independently requires pinned CA/DNS TLS.

## IP SAN versus DNS identity (R)

Node's generic checker can validate an IP SAN, but the installed mysql2 code in
lib/base/connection.js sets servername undefined for IP hosts and gates its explicit
identity check on a string servername. Application policy therefore rejects IP
DB_HOST before connecting. **An IP SAN does not make127.0.0.1 acceptable today.**
No hosts-file/DNS alias or unrelated certificate may be invented to bypass this.
Use the provider-issued DNS writer hostname and its actual matching certificate.
A reviewed IP-SAN implementation could be future work; it is not required for a
provider offering a verified DNS endpoint and was not added here.

The peer chain must be valid/current and anchored in approved CA material with a
matching identity under Node's SAN/CN rules. Ask for explicit DNS SAN evidence;
do not assert the existing checker is SAN-only (Node may apply CN fallback when
appropriate). Never trust an arbitrary captured leaf as a new root. Normal expiry
and supported TLS/cipher checks remain enabled. Leaf certificate fingerprints and
whole PEM file hashes are different; DB_TLS_CA_SHA256 is the latter.

## Provider-independent environment template (P)

Use [external-database.env.example](external-database.env.example) as a private
configuration worksheet, not an executable production file. Placeholders intentionally
fail validation. Never commit a filled copy. Full application production auth/SMTP/
origins remain required even after the DB moves. This changes no public API hostname.

| Setting | Exact requirement |
| --- | --- |
| NODE_ENV | production; no development fallback |
| HOST / PORT |0.0.0.0 for provider ingress / actual assigned integer1?65535 |
| DB_HOST | Actual provider DNS writer endpoint, letters/digits/dot/hyphen; not URI/IP/alias |
| DB_PORT | Actual provider port integer1?65535; do not assume3306 |
| DB_NAME / DB_USER | Actual approved schema and restricted runtime account, nonempty, no placeholders |
| DB_PASSWORD | Real protected account credential, >=16 characters and >=8 distinct characters |
| DB_CONNECTION_LIMIT | Default5/max50; approve budget across all replicas plus operator/backup connections |
| DB_TLS_MODE | required |
| DB_TLS_CA_FILE | Readable persistent runtime PEM path outside public/dist/Git; absolute path operationally preferred |
| DB_TLS_CA_SHA256 |64 hexadecimal characters, exact approved PEM bytes, case-insensitive |

An endpoint password valid at the provider but incompatible with local validation
needs a separately issued compliant credential, not local padding or weaker checks.
Query/connection timeouts and transaction logic remain unchanged; WAN region RTT and
root-lock contention must be measured before release, not fixed by blind retries.

## Trust distribution, pinning and rotation (C/P)

1. Obtain the bundle over an independently authenticated provider channel; identify
   issuer, applicable region/endpoint and renewal/overlap procedure. Record approved
   exact-file digest. Computing a hash alone does not authenticate an arbitrary file.
2. Upload unchanged bytes via approved secure file mount/transfer, outside public
   document roots/Git, to a persistent backend-readable path. Restrict modification
   to the deployment/security operator; confirm runtime UID/path/container mapping.
3. Compute exact file SHA-256 on both sides, compare with approved digest:

~~~powershell
(Get-FileHash -LiteralPath '<actual-approved-CA-file>' -Algorithm SHA256).Hash.ToLowerInvariant()
~~~

~~~sh
sha256sum -- '<actual-approved-runtime-CA-file>'
~~~

   Copy only the64 hex characters. PEM newline/encoding changes alter this hash.
   Do not replace it with openssl x509's DER fingerprint or an invented constant.
4. Set protected environment path/hash and required mode. The CA is public trust
   material, not a private key, but its integrity is security-critical. Never upload
   the database server's private key into the app. No client private key is needed.
5. Rehearse CA rotation with a provider-approved overlap bundle and approved new byte
   hash before server-chain cutover. Pinning the file means an unreviewed byte change
   deliberately breaks startup; redeploy/restart all replicas with the approved pair.
   Preserve hostname checking and requireTLS policies throughout; no temporary bypass.

RDS publishes region/global CA bundles and recommends registering roots rather than
pinning intermediate certificates that change during server rotation. Confirm the
selected endpoint's actual identity/chain, and approve exact downloaded bundle bytes.
[Official RDS CA guidance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html).
RDS documents endpoint identity and supported TLS for MariaDB:
[TLS behavior](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Concepts.SSLSupport.html).
Provider-specific public claims are not locally authenticated target evidence.

## Required server/network checks (C/P)

Require server-side secure transport or per-user REQUIRE SSL where supported;
independently verify effective configuration/account restrictions through approved
DBA inspection. The client still verifies chain and hostname: server-side encryption
alone does not establish server identity. RDS11.8 documents require_secure_transport
ON by default, but verify the chosen actual parameter group rather than assume it.
[Official server enforcement](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mariadb-ssl-connections.require-ssl.html).
No parameter/grant change was executed here.

Allow only approved Hostinger stable egress IPs or a reviewed private network path;
confirm both IPv4/IPv6, restart/failover and outbound TCP/port policies. No blanket
internet-source rule or changing DB_HOST to an IP to evade DNS problems. No transaction
pooler or failover reader endpoint for session locks/transactions. If Hostinger cannot
supply a controlled route/persistent trust file, separate hosting review is required.

## Safe verification sequence (P, not executed externally)

- With owner-approved protected environment injected and artifact built, run
  node backend/dist/db/diagnostic-cli.js --confirm-read-only. It validates full
  production settings/auth/SMTP configuration, connects with the same TLS pool and
  reads only session cipher, engine/version and SELECT1. No email/SQL writes/retries.
- Expected result: status verified, encrypted true, engine MariaDB, series11.8,
  schemaAndGrantsVerified false. This is not a schema/grant/HA/backup certificate.
- In isolated target acceptance, wrong CA, wrong DNS identity and rejected insecure
  client attempts must fail; do not perform insecure production probes without
  specific authorization. Compare session TLS cipher and enabled server enforcement.
- Run separate manifest/target/grant/definer checks and actual concurrency/restore
  tests. Current strict preflight may reject provider roles/metadata; no bypass.
- Verify /health remains200 independent of DB availability after valid secure startup;
  /ready returns503 on DB failure/drain,200 after DB probe/auth dependency available.
  Readiness may wait4 seconds; it does not certify schema/SMTP/optional providers.
- No native backup client may silently use MySQL's PREFERRED mode: explicit verified
  identity/CA settings depend on the exact client/version and must be reviewed.
  [MySQL TLS modes](https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html).
  Source Hostinger backup instead requires approved provider-assisted secure export.

## Local verification this planning task

Unchanged production validation/IP refusal, wrong CA/hostname and actual encrypted
MariaDB diagnostic tests were rerun as part of56 backend unit and187 integration
passes on disposable MariaDB11.8.9. These confirm local fail-closed contracts, not
external provider compatibility. No source/TLS/runtime implementation changed here.
See HOSTINGER_EXTERNAL_DATABASE_DEPLOYMENT.md for final check evidence and inventory.
