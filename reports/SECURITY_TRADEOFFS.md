# Security tradeoffs ? proposed Hostinger loopback transport

2026-11-07. Review-only Hostinger-local proposal; no production activation/deployment.
No external database service is part of this requested architecture. This document
records a **security exception**, not proof that loopback equals verified TLS.

## What changes, and what does not

| Property | Existing verified TLS | Proposed HOSTINGER_LOCAL |
| --- | --- | --- |
| Endpoint |DNS matching trusted server certificate |Only literal127.0.0.1:3306 |
| Traffic confidentiality/integrity |TLS1.2+ with authenticated chain/identity |No TLS transport confidentiality/integrity |
| Peer identity |Certificate chain plus hostname check |No certificate-bound server authentication; a local endpoint may be a proxy |
| Password auth |DB account auth inside verified TLS |DB account auth still required, but exchange/SQL traffic has no TLS protection. Password exposure depends on auth plugin; no unconditional safety claim |
| Misconfiguration handling |Fail closed, no downgrade |Explicit exception only; no automatic switch from TLS or endpoint fallback |
| Approval |Existing release/secret/target controls |Separate written owner risk acceptance, reviewed enabling release, exact operator mode/ack/reference and target binding |
| Authentication/MFA |JWT/session/Argon2/TOTP/recovery/RBAC controls |Unchanged; not disabled by database transport acknowledgement |
| Current build |Implemented and tested |Unwired pure policy proposal; live production rejects mode |

Database SQL/results, personal/business records, hash/session metadata and encrypted
MFA blobs can cross a plaintext socket. Stored hashes and encrypted MFA secrets do
not encrypt other SQL/results or authenticate the database peer. No application
login/RBAC or strong password substitutes for authenticated transport. HTTPS to the
API and SMTP TLS protect different links and must remain enabled independently.

Loopback only restricts routing inside the process network namespace. It does not
by itself prove dedicated hosting, no other tenant access, no local sniffing/process
inspection, no host administrator access, no impersonating local service or no
unencrypted downstream proxy hop. A provider may route127.0.0.1 through a proxy to
another machine. No such topology or isolation is assumed here.

## Evidence Hostinger must provide before risk acceptance

- Is127.0.0.1:3306 the actual DB service, a tenant-aware proxy, socket bridge or port
  forward? Does traffic leave the local namespace/host? What protects every downstream hop?
- How are Node and MariaDB/proxy namespaces, UIDs, other tenants' processes and network
  interfaces isolated? Is this a dedicated or shared security boundary, and what is
  contractually guaranteed versus a product label? No dedicated-host assumption.
- Can other customers connect to/sniff/impersonate this endpoint or inspect process
  memory/configuration? What controls apply to provider administrators/support access?
- Is the database account scoped to the application/schema and expected client,
  with compatible secure password-auth plugin, brute-force controls and auditing?
- Can exact runtime/migration/definer permissions, metadata/lock/trigger/CHECK support,
  supported11.8 patch/updates, backups and isolated restoration be verified?
- What happens after failover, migration between hosts, restore and platform updates?
  Does the same trust/isolation/auth scope remain? Will material changes be notified?

Until this is answered, boundary protection is **unverified**. Syntactically valid
approval flags cannot verify it. Written owner acceptance cannot be invented from
this task's request to prepare a proposal. If the provider cannot support an acceptable
boundary, report Hostinger-only deployment blocked rather than silently lowering
other controls, adopting external infrastructure or treating local mode as equivalent TLS.

## Required compensating controls and limitations

1. Exact literal/port validation before any connection; no hostname resolution, URI,
   Unix/named socket, alternate host/port or arbitrary connection-options override.
   Mode defaults remain verified TLS; generic production disabled remains forbidden.
2. Separate reviewed release decision before local branch is wired, protected hPanel
   administration and explicit nonsecret operator acknowledgement/reference. Account
   access auditing/change review records who applied the approved exception.
3. Runtime minimal per-table DML, no DDL/ledger/admin grants. Separate operator accounts,
   explicit approved target/account/transport and fresh migration preflight/audit.
   Strong credentials are still mandatory; no password weakening or automatic rotation.
4. Secure secret custody/permissions, unchanged independent access/MFA keys, no .env or
   raw driver logs/credentials in reports; database transport approval cannot activate
   missing/weak auth, bypass MFA or grant tenant/platform powers.
5. Fail-closed query/initialization errors, no automatic plaintext/TLS/endpoint fallback,
   no arbitrary DB retries, and fixed nonsecret security-posture warning on future
   local-mode startup. Diagnostic must report encrypted=false honestly.
6. Provider-supported consistent encrypted backups, matching auth/MFA key custody,
   restoration rehearsal and approved retention/RPO/RTO. The shipped local recovery
   CLI is not production backup tooling and cannot be repointed by bypassing its guard.
7. Approval expiry/review on material topology, host, port, service, release or provider
   policy changes. An approval-reference syntax check is not a cryptographic owner
   identity/signature check. Operator environment access itself remains privileged.

These reduce exposure but do **not** restore missing transport encryption, integrity
or certificate peer identity. Do not claim compliance, risk equivalence, penetration
assessment or production readiness solely from these controls or local tests.

## Scope boundaries

Only proposed production Hostinger mode is exact127.0.0.1:3306. Existing explicit
nonproduction disposable fixtures can use literal127.0.0.1/::1 and random local
ports; the safe hardening now rejects remote plaintext even there. Such fixtures
must not be used as NODE_ENV=test against a production schema to evade controls.

Migration data safety and tenant constraints are not weakened: no historical SQL,
ledger/manifest/hash, ownership hierarchy, published guards, quota root-lock ordering,
MFA/session/recovery consumption or structured-only Clinic fields change. Financial
and legal scope approvals remain held separately. The new mode is a transport
proposal, not authorization for database initialization, first-owner creation or deployment.

## Approval decision required

Owner must explicitly approve or reject the documented non-TLS residual risk and
supporting provider evidence, the proposed exact endpoint/ack/reference design and
follow-up runtime/operator integration. A later release approval is distinct from
permission to connect/init/deploy. No mode was activated and no production schema
was initialized during this task. Current503 remains unresolved at the secure
configuration gate until a reviewed viable configuration is approved and deployed.
