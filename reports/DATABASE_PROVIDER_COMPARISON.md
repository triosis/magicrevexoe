# Database provider comparison

Research date: 2026-11-07. No account/quote/provisioning/network test or production
connection. Labels: **R** = verified repository fact; **D** = published provider
claim; **C** = owner/provider confirmation or rehearsal required; **I** = engineering
inference. Public prices are indicative product listings, not approved budget,
commercial terms or a production quotation. Regional inventory/features can change.

## Actual compatibility baseline (R)

Node24/TypeScript/Express with mysql2 direct SQL, MariaDB11.8 version gate; 85 ordered
SHA-256 migrations, 32 tables including ledger, 46 triggers in the current manifest.
InnoDB/utf8mb4_unicode_ci, composite ownership FKs, enforced CHECKs, generated unique
slots, JSON constraints, UTC microseconds and string-safe unsigned BIGINT. Single
connection transactions/savepoints, shared/exclusive row locks, session-affine
GET_LOCK migration exclusion and strict grant/metadata inspection are required.
Existing runtime TLS requires approved CA bytes/hash, DNS identity and TLS>=1.2;
it cannot use the confirmed unauthenticated Hostinger loopback connection securely.
No wire-protocol compatibility claim substitutes for SQL/privilege compatibility.

## Shortlist

| Provider/service | Engine/version fit | TLS/hostname | Network from Hostinger | Migration effort / decision |
| --- | --- | --- | --- | --- |
| AWS RDS **for MariaDB** | D: version documentation lists11.8 including11.8.9. C: selected region/class/patch availability and maintenance pin | D: downloadable AWS CA bundles and endpoint certificate identity; TLS1.2/1.3;11.8 secure transport default ON. C: actual chain/identity/auth plugin | D: public endpoints with restricted security groups, or connected private network. C: Hostinger stable outbound IP/CIDR and outbound TCP; private routing is not assumed | I: lowest documented engine-change risk. Recommended candidate after gates; not Aurora/RDS MySQL. Managed grants, definers, metadata/@@hostname stability still require rehearsal |
| MariaDB Cloud (published SkySQL technical docs) | D: managed MariaDB. C: exact11.8 Community/Enterprise topology/version and metadata compatibility; no exact version availability established by research | D: client TLS1.2/1.3 by default; C: customer-downloadable authenticated CA, hostname identity verification, bundle rotation and any mTLS requirement | D: current pricing describes IP allowlists and higher-tier private connectivity. C: Hostinger ingress eligibility/region and direct versus MaxScale session behavior | I: plausible low-SQL-change alternative only if11.8 and all gates pass; current evidence does not establish drop-in compatibility |
| Aiven **for MySQL** | D: MySQL service, not MariaDB11.8. R: current version/diagnostic gates reject it | D: project CA download and VERIFY_IDENTITY hostname mode documented | D: IP filters/public and private DNS options. C: stable Hostinger egress and correct plan/port | I: high effort SQL/tooling port, not a configuration-only move; retain as future alternative, not recommended for this incident |
| DigitalOcean Managed **MySQL** | D: MySQL service, not MariaDB11.8. R: current gates reject it | D: public/private hostnames and CA download documented. C: exact target identity handshake with mysql2 and chosen version | D: private hostname limited to VPC peers; external app needs public path and restricted trusted sources. C: Hostinger egress/port | I: high effort SQL/tooling port; advertised low entry price does not remove conversion and acceptance cost |

### Evidence supporting these provider claims

- RDS version availability: [current version management](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Concepts.VersionMgmt.html)
  and [11.8 announcement](https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-rds-mariadb-11-8-vector-support/).
  Prefer version docs/region availability over older generic FAQ lists. No live AWS
  region query was made; do not assume every listed minor is newly orderable everywhere.
- RDS security: [MariaDB TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Concepts.SSLSupport.html),
  [CA bundles](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html),
  [secure transport](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mariadb-ssl-connections.require-ssl.html)
  and [public/private access](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-public-private.html).
- MariaDB Cloud: [current pricing/capabilities](https://mariadb.com/pricing/cloud),
  [published encryption documentation](https://docs.skysql.com/Security/Encryption/).
  Legacy SkySQL branding/doc age means exact current SKU features require confirmation.
- Aiven: [CA and identity verification](https://aiven.io/docs/platform/concepts/tls-ssl-certificates),
  [IP/network parameters](https://aiven.io/docs/products/mysql/reference/advanced-params).
- DigitalOcean: [MySQL connection/CA/public-private hostnames](https://docs.digitalocean.com/products/databases/mysql/how-to/connect/).

## Cost and recovery comparison

| Service | Published cost model (D) | Backups/recovery (D) | Cost/operational questions (C) |
| --- | --- | --- | --- |
| RDS MariaDB | Region/class-hours, storage/IO, HA and backup/transfer costs; no universal minimum quoted | Automated snapshots/transaction-log PITR and manual snapshots; configured retention up to35 days | Quote chosen region, Single/Multi-AZ, backup surplus, public IPv4/network transfer, KMS/support, cross-region/offsite copy and restore/test capacity |
| MariaDB Cloud | Current page advertises Foundation free; Power from USD0.16/hour, PowerPlus0.21/hour | Listed nightly/self-service backups; PITR/retention vary by tier | Confirm exact service/version, production SLA/HA, billable floor/storage, cross-cloud transfer, retention/export/PITR and support. Free is not assumed production-suitable |
| Aiven MySQL | Hourly plan billing; published model includes infrastructure/network/backup, with extras for some features/storage/private connectivity | Plan-dependent backups/HA; documents different backup history by plan | Current regional calculator/quote required; add conversion engineering, duplicate staging, restore drill and outage cost |
| DigitalOcean MySQL | Published single-node entry USD15/month; HA starts with USD30 primary plus matching USD30 standby | Daily backups/PITR documented, features/limits plan-dependent | Confirm actual region/version/retention/export/storage/support; single-node entry is not a production HA budget |

Sources: [RDS pricing](https://aws.amazon.com/rds/mariadb/pricing/),
[RDS backup explanation](https://aws.amazon.com/rds/faqs/),
[MariaDB Cloud pricing](https://mariadb.com/pricing/cloud),
[Aiven pricing model](https://aiven.io/docs/platform/concepts/service-pricing),
[Aiven HA/backups](https://aiven.io/docs/products/mysql/concepts/high-availability),
[DigitalOcean MySQL prices](https://docs.digitalocean.com/products/databases/mysql/details/pricing/),
[DigitalOcean backup features](https://docs.digitalocean.com/products/databases/).
Do not select backup retention from these maxima: owner/legal RPO/RTO/retention
approval is still required. HA/failover does not replace backups or prove zero loss.

## Mandatory acceptance gates for every provider (C)

1. Real MariaDB11.8.x for configuration-only migration; agreed upgrade notice and
   rehearsed patched version. No MySQL/other MariaDB series under the current gates.
2. Authenticated CA bytes and approved SHA-256, matching certificate identity, verified
   TLS1.2+, supported password authentication; no client cert required unless separately
   implemented. Server-side TLS enforcement independently verified, not merely assumed.
3. Direct/session-affine writer endpoint: connection IDs/advisory locks/transactions
   stable through the operator session. No transaction-pooling proxy or reader endpoint.
4. Exact required grants, visible information_schema and SHOW GRANTS, supported
   CREATE TRIGGER/definers and strict/FK/CHECK enforcement. Provider admin accounts
   cannot be used to evade the exact runtime grant profile. Strict parser may reject
   provider roles/global grants; do not weaken it to make a provider pass.
5. Approved constrained Hostinger outbound route. No blanket0.0.0.0/0 workaround for
   changing egress. Confirm restart/failover egress, DNS, outbound port, CA persistence,
   region latency/data residency, connection budgets and source export mechanism.
6. Full isolated restore and actual backend concurrency/security tests; protected
   production-clone evidence is separate from synthetic CI, with owner authorization.
7. Backup/PITR/export/definer permissions and matching auth-key custody. No source
   destruction, untested failback or silent post-cutover data loss.

## Recommendation (I)

**Preserve MariaDB11.8 and choose RDS for MariaDB as the first qualification candidate.**
It has the strongest collected documentation matching this release's version, TLS,
CA, endpoint and recovery requirements. This is conditional, not a deployed or fully
certified provider. MariaDB Cloud is the next same-engine candidate if its exact11.8
and session/CA/grant contracts are confirmed. MySQL services are future port projects.

Retain Hostinger Node hosting only if it supplies controlled stable egress/private
routing and persistent approved CA mounting. If not, moving the API near the chosen
DB into a supported private network is safer than opening the DB to all internet
sources or weakening identity checks. That hosting change requires separate approval.
