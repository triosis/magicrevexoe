# Hostinger architecture cost and operations comparison

2026-11-10. Analysis only; no purchase or provisioning. Prices are public India
offers observed on this date, not a quote or spending authorization. Actual
checkout, region, currency, tax treatment, availability and renewal must be verified.

## Current published VPS price evidence

| Plan | vCPU / RAM / NVMe | Intro monthly equivalent | 24-month upfront | Renewal monthly equivalent, same term |
| --- | --- | --- | --- | --- |
| KVM1 | 1 / 4GB / 50GB | INR599 | INR14,376 | INR999 |
| KVM2 | 2 / 8GB / 100GB | INR779 | INR18,696 | INR1,199 |
| KVM4 | 4 / 16GB / 200GB | INR1,099 | INR26,376 | INR2,399 |

These are24-month upfront offers, not month-to-month billing. Use the fetched plan
cards rather than older search snippets. Included bandwidth is4/8/16TB respectively;
excess, backup add-ons and other services need separate confirmation.
[Hostinger India VPS pricing](https://www.hostinger.com/in/vps-hosting)

Conditional candidate for Option B: KVM2 under the pilot assumptions in
[architecture](HOSTINGER_VPS_DATABASE_ARCHITECTURE.md): <=10GB database/indexes,
<=1GB monthly growth, <=2 sustained and<=10 burst API requests/second, one backend
instance, no HA/warehouse. It is a starting load-test candidate, not a capacity
guarantee. KVM1 leaves less maintenance/recovery headroom. Option C also runs Node,
proxy, builds and database; size independently after measurement, not automatically
on the same KVM2. No plan purchase is recommended before network feasibility.

## Three-option assessment

| Dimension | A: Cloud app + Cloud DB exception | B: Cloud app + VPS DB | C: app + DB on VPS |
| --- | --- | --- | --- |
| Isolation | Provider local routing/tenant boundary unverified | Separate virtual host and database principals; shared hosting egress remains a boundary question | Operator controls app/service users; one host is shared failure/compromise domain |
| Privileges / triggers | Shared identity retains db-wide DML/TRIGGER and ledger modification risk | Strict per-table runtime; controlled maintenance identity can retain definer role | Same separate-identity DB design possible |
| Transport | HOSTINGER_LOCAL unencrypted, no certificate server identity | Verified CA/DNS TLS across an approved restricted path | Local service communication; preserve verified TLS using DNS if using current required mode |
| Network / latency | No cross-host hop; namespace must still be verified | Outbound rules, stable egress/private path, DNS and RTT unresolved | Avoids Cloud-to-VPS network dependency; public HTTP/reverse proxy now operator-owned |
| Operations | Lowest DB-server administration, strongest enduring exceptions | Cloud app stays managed; owner operates Linux, MariaDB, certificates and recovery | Owner also operates Node, reverse proxy, HTTPS, deployment/process supervision |
| Availability | Cloud-managed service, no tested recovery guarantee here | Both Cloud and single DB VPS must work; no automatic HA established | Single-host app+DB outage; no HA assumed |
| Recovery | One-user/definer limits complicate isolated restoration | Native backup and separate restore identities possible after rehearsal | Same DB recovery plus application/proxy/asset restoration |
| Cost | Existing Cloud bill plus unknown recovery/operations extras | Existing Cloud bill + VPS + operations/storage/monitoring | VPS + operations/storage/monitoring; Cloud savings only if other sites/services permit retirement |
| Approval | Enduring plaintext and db-wide privilege risks plus recovery/release | Network, budget, self-managed operations, at-rest and recovery approvals | Broader hosting migration, process/network design and operations approvals |

Option B is the least disruptive secure candidate **if** the network gate is
satisfied. A remains technically locally rehearsed but is not equivalent in risk.
C is the fallback design to assess if Cloud's network cannot support B; it is a
larger migration, not authorized by this assessment.

## Total cost and operator responsibility

The existing Cloud invoice is unknown. Do not subtract it as a saving: other sites,
email or services may still depend on that plan. Option B's known incremental plan
component is INR18,696 upfront/24months for the conditional KVM2 offer, rising to
INR1,199/month-equivalent at the displayed renewal. This excludes unverified taxes,
off-server encrypted storage, monitoring, optional daily backups, certificate
operations, static egress/private networking and engineering/on-call labor.

Use TCO = retained Cloud cost + VPS term cost + approved add-ons/storage + operator
hours times agreed rate + incident/recovery reserve. No rate or add-on cost is
invented. Public plan price is not an all-in managed-database price. Confirm
budget for intro and renewal rather than approving on an introductory monthly label.

Planning estimate, not promised dates: initial network/security design and Linux
build2-5 engineer-days, migration/recovery/acceptance rehearsal2-4 days, plus1-3 days
for Linux recovery automation if that route is chosen. Provider answers and approval
waiting time are excluded. Pilot maintenance allowance6-12 engineer-hours/month
plus incident on-call; measure after launch. Option C adds deployment/proxy/service
and frontend release work, estimated2-5 days before its own acceptance. Owner must
assign a named primary and backup administrator.

## Required ongoing controls

| Area | Operator work and evidence |
| --- | --- |
| Patching | Review OS/MariaDB/client advisories, stage security patches, test schema/auth/restore, schedule restart and confirm exact version compatibility. Avoid unattended major upgrades. |
| Certificates | Monitor expiry well before deadline; independently approve CA changes, rehearse bundle/leaf rotation, verify actual hostname/cipher after restart. |
| Database service | systemd or equivalent supervised service, restricted OS account, bounded restart/backoff and console recovery. Crash-loop must alert, not trigger automatic schema repair. Rehearse crash recovery and reboot/key unlocking. |
| Capacity | CPU, RAM/swap, disk/inodes, IOPS, temp/binlog growth, connections, slow queries, pool rejection and DB/API P95 latency. Proposed alerts: disk75%, sustained resource pressure and recovery-copy age; tune from measurements. |
| Security logging | Authentication/grant/configuration changes and denied connections; avoid general SQL/password dumps or PII-rich logs. Protect/rotate logs under approved retention. |
| Recovery | Monitor encrypted backup success and off-server integrity; periodically restore in isolation and verify all46 triggers, full schema and representative auth/MFA. Owner approves frequency/RPO/RTO/retention. |
| Incident ownership | Document outage contact, compromised credential response, firewall recovery, release rollback and authorized restore decision maker. |

No provider SLA, private network, at-rest encryption, managed DBA labor, restore
time guarantee or independent off-provider copy is assumed included. Technical
controls and commercial terms must be approved before implementation.
