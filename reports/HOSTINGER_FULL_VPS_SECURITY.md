# Option C security and required corrections

2026-11-10. Assessment only. All settings and account designs below are proposals;
none are installed or approved for production. **NO-GO remains.**

## Loopback database with verified TLS

MariaDB can listen exclusively on127.0.0.1:3306 while the client uses a DNS name.
Propose an owner-approved FQDN under a controlled domain, resolved **on the VPS**
through root-controlled hosts/private DNS to127.0.0.1. No public A/AAAA database
record is required. Select a real approved name later; this report creates none.
The same name must appear as DNS SAN in the database server certificate. Mapping
a hostname to loopback does not waive chain/hostname validation. Ensure no unintended
IPv6/public resolution or alternate listener; application and operators resolve
the same pinned intended target in their actual namespace.

Use DB_TLS_MODE=required, not HOSTINGER_LOCAL/disabled. Current required mode
rejects literal IP DB_HOST even with an IP SAN. An owner-managed private CA issuing
a server-authentication certificate is compatible, with independently approved
CA bytes/fingerprint and protected offline CA signing-key custody. This is a future
legitimate PKI design, not permission to fabricate a certificate. Keep server leaf
private key on the database service; give Node only the trusted CA bundle. Distinguish
database PKI from the public HTTPS certificate.

Runtime approvedCa checks readable PEM, SHA256 of exact file bytes and secure-context
parsing. Pool sets rejectUnauthorized:true, verifyIdentity:true, TLS minimum1.2;
bootstrap uses this same loader. Never set a TLS bypass, switch to plaintext after
failure, or label production local. Enforce secure TCP transport server-side and
REQUIRE SSL on application/operator TCP accounts after rehearsal, with reviewed
local emergency administration. CA change requires independent trust review,
negative tests, overlap/rollover plan, restart of pools and verified renewed
handshake. Leaf renewal under unchanged SAN/CA need not change the pinned CA bytes.

Loopback is not encryption or tenant isolation: TLS remains mandatory. A process
on the same OS can still attempt SQL authentication; a root compromise defeats
local boundaries. At-rest protection is separate. Hostinger documents that VPS
disks and provider backups/snapshots are not encrypted at rest; require reviewed
operator-managed encryption and unlock/reboot recovery, or explicit accepted risk.
[Provider encryption limitations](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)

## Exact runtime configuration impact

| Input | Proposed requirement |
| --- | --- |
| NODE_ENV | production; process-manager injection, no automatic production dotenv loading |
| HOST / PORT |127.0.0.1 /3001 as proposed private Node upstream; positive valid port, confirm free before approval. Unlike Cloud ingress, no0.0.0.0 bind is needed. |
| DB_HOST / DB_PORT | Approved certificate DNS name resolving locally to127.0.0.1 /3306 |
| DB_NAME | Approved exact schema; existing u676472791_magicreview_db name may be retained after inventory |
| DB_USER / DB_PASSWORD | Separate restricted runtime identity/credential; password>=16 chars and>=8 distinct chars |
| DB_CONNECTION_LIMIT | Integer1-50, initially reviewed default5 |
| DB_TLS_MODE | required |
| DB_TLS_CA_FILE / DB_TLS_CA_SHA256 | Actual protected readable PEM path; independently approved64-hex exact-file digest |
| HOSTINGER_LOCAL_APPROVAL, HOSTINGER_LOCAL_APPROVAL_ID | Absent; no local plaintext exception |
| PUBLIC_FUNNEL_ORIGIN / PUBLIC_WEB_ORIGIN | Preserve https://api.revexoe.com / https://revexoe.com after owner confirmation |
| CORS_ORIGINS / AUTH_RECOVERY_URL | Preserve exact approved web origins and https://revexoe.com/recover |

Preserve existing valid AUTH_ACCESS_SECRET, AUTH_MFA_KEY and AUTH_SMTP_HOST/PORT/
USER/PASSWORD/MAIL_FROM plus approved optional SMTP TLS variables. Production SMTP
password strength remains enforced; implicit465 or STARTTLS587 must match provider.
VPS outbound SMTP availability and sender authorization must be verified separately.
Retain optional AI/payment group contracts and existing financial hold; never enable
live billing as infrastructure validation. Frontend VITE_API_URL stays public API
URL; no backend/operator secrets in frontend builds. Runtime contains no MIGRATION_*,
BOOTSTRAP_* or Cloud privilege-exception authority.

## Operator CLI defect: mandatory pre-connection correction

Verified current operator-cli.ts reads CA as UTF8, checks hash with `if(ca && ...)`,
and includes ssl only when ca is truthy. An empty file bypasses the hash check and
builds a pool without TLS. Later Ssl_cipher verification can refuse the established
session but does not prevent a plaintext connection/authentication attempt. Local
co-location does **not** make this acceptable under the required TLS policy.

Future approved correction: reuse approvedCa with resolved policy path/raw-byte
digest/PEM validation for every required-mode CLI path, always construct an SSL
pool in that mode, and reject before pool creation/access on invalid trust material.
Keep strict policy/target/cipher/grant/approval checks. Tests must cover preflight,
apply and check-runtime, missing/empty/whitespace/malformed/mismatched CA, valid CA,
wrong SAN/chain/expiry and no plaintext attempt. Preserve explicit approved local
modes and all default negative tests. No fix is implemented by this assessment.

## Separate identities and definer limits

Use the original strict profiles, not database-wide Cloud exceptions. Runtime has
the exact per-table map in privileges.ts, with no TRIGGER/DDL/DELETE/ledger access.
Migration identity has only the strict schema SELECT/CREATE/ALTER/TRIGGER plus
specified seed/ledger writes during maintenance. Backup and restore operators are
separate protected identities; DBA controls accounts/grants via restricted admin
access, never from the API. Verify matched CURRENT_USER through actual TCP/TLS;
do not assume @localhost and @127.0.0.1 match identically.

The [46-trigger map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.json) requires TRIGGER
on23 subject tables and SELECT on18 dependency tables, with no body writes/calls.
Historical CREATE TRIGGER omits DEFINER: the creating migration principal is the
definer. Minimum unchanged-artifact strategy retains that non-runtime identity
as definer after revoking unnecessary maintenance grants. This explicitly combines
two roles, not five independent principals. Do not drop it or revoke activation
rights. Locking its login needs activation/restore rehearsal.

If five fully distinct principals are mandatory, approve a new execution/definer
strategy first. Assigning another definer requires administrative SET USER authority,
which the strict migration verifier does not accept. Do not add global privilege,
inject SQL, edit historical checksums or change manifest without separate design.
[MariaDB trigger security](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/create-trigger)

Backup needs reviewed source-read/lock and trigger-metadata authority, which can
include sensitive trigger-management capability. Restore must recreate valid
definers under separate controlled authority. Bootstrap full-schema verification
also needs trigger visibility: a SELECT/four-table-INSERT account may be insufficient.
Resolve this in isolated tests, potentially using temporary controlled operator
grants outside the migration preflight/apply window. Never grant them to runtime.

## Proxy and abuse-control release gate

Current Express intentionally leaves trust proxy disabled; auth, funnel, feedback
and AI limiters use req.ip/socket address. Behind local Nginx they see127.0.0.1,
so unrelated customers share IP buckets. Setting trust proxy=true blindly would
permit spoofing in an incorrectly configured topology.

Propose one reviewed proxy hop, Node loopback-only, proxy overwriting X-Forwarded-For,
X-Forwarded-Proto and forwarded host with authoritative values. Do not append
untrusted inbound XFF for this single-hop design. Choose a narrowly scoped trusted
proxy policy with source/topology tests, or an independently reviewed ingress abuse
design that accounts for existing app buckets. This is a justified future change
to app.ts/auth route commentary and regression tests, not an existing configuration
variable. A future CDN adds a different trusted-hop design; do not assume its IP
headers are authentic. Prove spoofed headers fail and distinct clients remain
distinct. Preserve per-email/user/global limits and one process initially.
[Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/)

Preserve four-tier ancestry, RBAC, MFA, quotas, immutable publication, append-only
history and equal public/private paths. Infrastructure approval cannot bypass
application acceptance, policy or financial approvals.
