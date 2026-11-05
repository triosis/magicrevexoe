# Actual restore rehearsal - Task 18

2026-11-05. **Successful local actual backup/import/verification**, using a fresh
source and separate fresh destination on a harness-owned MariaDB 11.8.9 server.
No Hostinger connection, production backup/restore/migration or provider claim.

## Rehearsed sequence

1. Start a new loopback MariaDB ZIP server with random ephemeral credentials and
   apply the complete unchanged 000000-000066 migration/verification prefix.
2. Populate all 26 tables with synthetic representative data, including platform,
   reseller, sub-reseller, descendant merchant and direct peer; real Argon2 users,
   enrolled MFA/recovery codes, sessions/reset digest; published channel/funnel,
   Unicode branch, canonical destination, short link and actual generated QR;
   feedback/status history, configured test plan/subscriptions, usage and audit.
3. Acquire migration and all-table READ locks, take full structural/row/integrity
   snapshots, export with actual mariadb-dump, encrypt stdout, recompare source,
   publish authenticated metadata and independently verify the encrypted artifact.
4. Authenticate/decrypt fully, verify the explicitly confirmed empty destination,
   and import actual SQL using mariadb. No migrations are pre-applied to target,
   no force/drop mode is used and no data is mocked into the restored database.
5. Compare every schema object, original definer, all table counts/content digests,
   auto-increment state, full ledger and precise DATETIME(6); prove 36 FKs and
   34 CHECK predicates, 26 tables and 35 triggers. All comparisons pass.
6. Exercise real restored services and Express HTTP for MFA/merchant login,
   cross-merchant denial, independent funnel choices, structured feedback and
   duplicate retry, status/audit, configured subscription/usage and QR content.
   These successful operations intentionally add new rows only after initial
   equality verification. Source and original archive remain unchanged.

## Exact commands

```text
npm.cmd --prefix backend run test:recovery:integration
npm.cmd --prefix backend run test:integration
npm.cmd run test:e2e:real
```

Set MARIADB_TEST_BIN to the local 11.8.9 Windows ZIP bin directory for tests.
The rehearsal also runs the actual backup/verify/restore CLI as subprocesses with
private local policies and protected environment injection. Exact operator/native
argument templates are in [disaster-recovery-runbook.md](disaster-recovery-runbook.md).
No live credential values or dumps are needed in this report.

## Observed source-to-restored evidence

Observed on MariaDB 11.8.9: 26 tables, 35 triggers, 36 foreign keys and 34 CHECK constraints.

Backup utility time: 942 ms; verified restore utility time: 1064 ms
for this tiny fixture, before final temporary-directory cleanup. These are local
measurements, not incident-to-service RTO or production performance commitments.

Verified snapshot digest: `1b500f5634af83ec88577847f7522198579ede486451de81d043f6810af0fe6c`. This is an aggregate
synthetic-data fingerprint, not a password/token/key.

| Table | Source and restored rows at verification |
| --- | --- |
| audit_logs | 9 |
| auth_sessions | 3 |
| auth_tokens | 1 |
| branches | 1 |
| channel_versions | 1 |
| feedback_status_events | 1 |
| funnel_configurations | 1 |
| industry_channels | 3 |
| mfa_recovery_codes | 10 |
| permissions | 16 |
| plan_limits | 5 |
| private_feedback | 1 |
| qr_assets | 1 |
| review_destinations | 1 |
| roles | 5 |
| role_permissions | 55 |
| schema_migrations | 67 |
| short_links | 1 |
| subscriptions | 2 |
| subscription_plans | 1 |
| tenants | 5 |
| tenant_memberships | 2 |
| usage_counters | 10 |
| usage_records | 5 |
| users | 2 |
| user_mfa | 1 |

All table data hashes and auto-increment values also matched. The test then
performed intentional application writes on the restored copy; the equality
counts above describe the verification point before those writes. Ephemeral test
keys are not retained in reports, and temporary test archives are not an
operational backup retention strategy.


## Negative/recovery evidence

The 14 dedicated tests include failed/incomplete metadata, truncated/corrupt
ciphertext, wrong encryption key, denied credentials/privileges, unexpected server
identity, absent confirmation, nonempty targets and exclusive non-overwrite
behavior. A valid signed artifact with wrong expected counts is imported but
correctly remains failed-unverified. Interruption after import but before
verification produces an unverified protected target; the next attempt refuses
it. An orphan inserted only in a separate invalid fixture with FK checks disabled
is detected after checks are reenabled. Published/history trigger mutations and
cross-owner FK writes are rejected on the verified restored data.

File integrity is separately reported as integrityVerified=true and
restoreVerified=false; only actual import plus complete comparison returns
restoreVerified=true. No automatic destructive retry/repair is used to obtain
success. Native exits and file hashes alone were not treated as restore proof.

Local measured durations reflect this tiny synthetic dataset, not operational RTO,
accepted RPO, provider limits or production restore readiness. Off-site/key-loss,
provider clone and representative-volume rehearsals remain required.
