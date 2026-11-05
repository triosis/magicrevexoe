# Provider backup validation checklist - Task 18

Prepared 2026-11-05. **No Hostinger connection or provider test occurred.** Every
item below requires separately authorized evidence. Current automated backup and
restore execution is restricted to disposable local targets and is not a provider
integration. No production credentials should be requested/copied into this repo.

| Area | Required operator/provider evidence | Current classification |
| --- | --- | --- |
| Export facilities | Available logical/snapshot facilities, exact client/server versions and ability to include all tables, indexes, FKs, triggers/definers and complete data | Externally unverified |
| Consistency | DDL freeze, transaction/snapshot semantics, ability and acceptable window for all-table READ locks, writable-primary/session affinity | Externally unverified |
| Export limits | Maximum size, duration, process/native binary support, connection limits and memory/CPU budgets; reject partial downloads | Externally unverified |
| Import limits | File/upload/request size, client/server timeouts, transaction/DDL behavior, binary/UTF-8 handling and exact target selection | Externally unverified |
| Storage | Sufficient source/tmp/encrypted output/restore space, encrypted volumes, filesystem exclusive-create/link support, private ACLs and disk-full behavior | Externally unverified |
| Trigger behavior | Export all 35 trigger bodies/order/SQL modes and original definers; prove activation and denied ownership/history mutations after restore | Externally unverified |
| Routines/events/views | Independently inventory objects, including ones hidden from limited metadata accounts; this release has no routines/events and the utility refuses visible extras rather than silently claiming support | Externally unverified |
| Grants | Verify effective backup SELECT/TRIGGER/LOCK TABLES rights and separate restore/definer privileges; PUBLIC/role inheritance, foreign definer and binary-log policies require review | Externally unverified |
| Connection topology | Approved local versus remote access, exact host/schema/account, trusted CA/hostname verification and authenticated encrypted transport for any remote workflow | Externally unverified |
| Encryption/key custody | Independently generated/versioned backup key, separate MFA/signing key recovery, off-site encrypted storage, access separation and lost-key test | Externally unverified |
| Retention/transfer | Owner-approved retention, versioning/immutability/access logs, protected metadata, verified post-transfer integrity and approved deletion holds | Externally unverified |
| Recovery objective | Business-approved RPO/RTO, schedule/alerts and measured restored-clone rehearsal on representative data volume | Owner decision / unverified |
| Operational recovery | Named incident commander/DBA/security/app validators, fenced old primary, no automatic overwrite/retry, logs and post-recovery sign-off | Not operationally verified |

Read-only provider inventory alone cannot establish consistent exports, trigger
activation, FK/CHECK integrity, time budgets, backup restorability or effective
recovery time. Rehearse those in an explicitly authorized isolated provider clone.
Do not use a production trial, tunnel, certificate bypass, fake local policy or
edited safety guard. The local ssl=0 setting is limited to the disposable loopback
test topology; it is not approved for a remote provider connection.

Require both artifact authentication and a successful **actual restore** followed
by exact schema/ledger/data verification and application tests. A zero export exit,
provider snapshot icon, successful download or passing SHA-256 check alone is not
a disaster recovery rehearsal. Provider readiness remains blocked pending evidence.
