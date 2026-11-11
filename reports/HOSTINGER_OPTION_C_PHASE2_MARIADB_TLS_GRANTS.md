# Phase 2 MariaDB TLS, strict identities and46-trigger verification

2026-11-11. **Linux handshake/grants/trigger tests NOT_RUN.** No production DB access
or migration. Windows revalidation is supplemental and explicitly separated below.

## Verified current source, not deployed state

operator-cli now uses approvedCa before pool construction; required mode always
supplies verified TLS. Shared loader checks exact CA-file SHA256, nonempty PEM and
every X509 entry; runtime/bootstrap share it. Chain/hostname/lifetime are verified
on handshake with rejectUnauthorized:true/verifyIdentity:true/minTLS1.2. No TLS
failure-to-plaintext retry was found. Target verification pins database/version/
@@hostname/CURRENT_USER and session TLS cipher. The Phase1 empty-CA defect is fixed
in repository source; this says nothing about deployed artifact identity.

Option C uses private DNS SAN/name resolving to127.0.0.1, not literal DB_HOST IP
or HOSTINGER_LOCAL. Generic required mode also intentionally allows other remote
verified DNS endpoints: it is not a loopback-resolution firewall. Enforce this
rehearsal's DNS/listener isolation before connecting; unexpected public resolution
test is outstanding. No CA keys or synthetic PKI generated during this phase.

## Planned native matrix — Linux all NOT_RUN

Missing/empty/whitespace/malformed/mixed bundle/hash mismatch must refuse before
pool/network. Real signed chain/SAN/lifetime/TLS>=1.2 and verified native TCP client
must pass; wrong CA/SAN, expired/untrusted leaf/plaintext must fail with no downgrade.
Certificate replacement needs new pools and verified outcomes. Native client default
trust differs by release: require explicit CA/server verification, not just --ssl.
Plaintext attempt is only against the approved synthetic secure-transport instance.
Actual socket inspection plus independentIPv4/IPv6 probes are required. Public
port denial is NOT_VERIFIED; no external vantage or Linux socket inventory exists.

## Identity and grant plan

Use original strict profile with no Cloud exception: runtime per-table map, no
schema-wide DML/TRIGGER/DDL/ledger/grant/DELETE. Migration identity's exact schema
SELECT/CREATE/ALTER/TRIGGER plus seed/ledger writes stays operator-only. Backup
metadata/lock privileges and separate restore/DBA authority are sensitive and
require actual native-tool testing. Do not grant ALL to runtime.

Historical trigger creation omits DEFINER; selected minimum strategy combines
migration and retained-definer roles in one **non-runtime** principal. After grant
reduction, retain23 subject-table TRIGGER and18 SELECT dependencies from the
[exact map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.json). No trigger body writes/
calls are present. Do not drop/rename/remap definer or claim five independent users.
Other-definer assignment can need DBA SET USER, which the strict migration profile
does not allow. Historical SQL/verify/manifest remain unchanged.

For isolated verified-TLS staging policies, preserve explicit target/identity,
full manifest85 checksums,15-minute preflight, lock ownership, exclusive/fsynced
audit, no retries and applying/failed stop conditions. Use actual ephemeral account
matches, escaped schema grant patterns and approved fixture metadata; no fake
production reference or relabeling production local. Native backup/import is not
a substitute for initial migration runner use.

Runtime tenant SELECTs cannot be isolated by per-table grants alone: prove
application ancestry/RBAC prevents peer/unapproved reads and writes. No claim of
database row-level security is made.

## All46 guards: exact result boundary

The [dependency table](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.md) and JSON identify
every guard. **Linux result for each of its46 entries: NOT_RUN**, both before and
after grant reduction/restart/restore. No subset or Windows result is reported as
a Linux46/46 pass. The Windows Cloud fixture's every-guard shared-definer exercise
and recovered guard activation are revalidated by the supplemental integration
suite, but do not prove the intended strict separate-identity Linux final state.

Future Linux acceptance must record one result per named guard before/after restore,
positive/negative event, actual reduced creating definer, actual invoker and expected
outcome. Use an isolated privileged DELETE invoker where needed, never grant API
DELETE just to exercise guards. Reconnect after reduction; confirm actual runtime
denial of DDL/trigger/ledger/grant/unapproved DML and continued definer activation.

## Bootstrap visibility — unresolved, no real account created

bootstrapPlatform performs full schema/ledger/trigger verification. Its nominal
schema SELECT plus INSERT on tenants/users/memberships/audit may hide trigger
metadata without TRIGGER privilege in MariaDB. Linux minimum effective permissions
are NOT_ESTABLISHED; test visibility under proposed limited account, then explicitly
authorized temporary metadata privilege if needed, retaining no new runtime rights.
Use synthetic owner@example.invalid only. No rxadmin@revexoe.com fixture, real
Super Admin, password generation or MFA bypass occurred. Matching production MFA
key exposure/remediation remains independently approval-dependent.
