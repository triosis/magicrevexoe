# Migration risks, backup, restoration and rollback

2026-11-07. Proposed operator procedure, not an executed migration or production
backup certification. No approved RPO/RTO, retention/delete period, cost ceiling or
maintenance window is invented. Source Hostinger insecure loopback remains unsuitable
for serving this backend under the enforced TLS policy.

## Risk register and stop criteria

| Risk | Preventive evidence / response |
| --- | --- |
| Source snapshot inconsistent | Full writer/DDL fence, consistent provider snapshot/logical export and same-capture manifests; GET_LOCK alone is insufficient |
| Source export lacks authenticated SQL TLS | Use approved Hostinger-assisted server-side export and authenticated encrypted transfer; no plaintext app/export TCP fallback. No secure export means stop |
| Production source schema differs | Inventory full ledger/checksums/objects/rows before planning load. Unknown tables/incomplete histories stop; never discard/baseline automatically |
| Target engine differs/MySQL chosen | Current tools require MariaDB11.8. MySQL conversion requires separate dialect/metadata/constraint/concurrency project |
| Trigger definer/grant restrictions | Rehearse actual managed accounts, required object privileges/SQL mode and definer allowlist; no admin runtime/global-grant bypass |
| Restoring data with triggers active | Isolated empty target: DDL/index/FK/CHECK then base-row load then exact triggers. Published plan INSERT guard otherwise rejects history. Keep all runtime access fenced until guards verified |
| Lost security/history state | Preserve all user/password hashes/versions, MFA cipher/last-step/failed attempts, code consumption, sessions/revocations/families, audit, tokens/idempotency and usage ledgers byte-exact |
| Auth key changed | Retain existing matching JWT/MFA keys in separate protected custody; no auto rotation. Signed funnel tokens also depend on signing key. Hashes/ciphertext cannot regenerate their keys |
| Time shifts during outage | Preserve UTC microseconds, original expiry/revocation values and TOTP last-step; do not extend/revive expired sessions/tokens as a migration convenience |
| ID/encoding/decimal corruption | Typed deterministic full-row hashes, BLOB hex, BIGINT/decimal strings, raw JSON text, NULL/empty distinction, original next IDs, generated-column result comparison |
| Split-brain | Drain all replicas/writers/webhooks; one authoritative database, explicit T0, source stays fenced. No replica may write old DB after target activation |
| WAN RTT/pool/root mutex/failover | Same-region proximity where feasible, actual load and repeated concurrency tests, max connection budget; no arbitrary retries or silent timeout/constraint weakening |
| Backup false confidence | Encrypted integrity verification plus actual isolated restore and application/security tests, measured recovery time, provider export/PITR limitations and custody |
| Source rollback violates TLS | Reverting DB_HOST to127.0.0.1 does not provide secure service. Stay in maintenance or recover to another qualified TLS endpoint |
| New writes lost on rollback | After target writes begin, old source is stale. Freeze/reconcile/export target changes or fix forward; never switch back and silently drop them |
| Delayed callback/email/AI side effects | Drain/hold ingress with approved reconciliation; do not replay external actions automatically or invoke unapproved financial execution |

## Required protected backup set (P)

1. Complete provider source recovery point plus reviewed logical schema/data/trigger/
   ledger export for the same fenced UTC capture. Include every approved application
   object; inventory source routines/events/extra schemas before assuming none exist.
2. Encrypted artifacts with authenticated manifest: hashes/byte sizes, source identity,
   capture time, engine/client/release versions, ordered ledger/checksums, object
   definitions/order/definers, counts/row hashes/next IDs and restore mapping.
3. Separately controlled backup encryption-key ID/material and existing JWT/MFA key
   references/custody; never copy credentials or raw keys into reports/manifests.
4. Current app release/configuration fingerprint and secure environment backup,
   target approval/network/CA fingerprints, mutation-fence state and audit/change log.
5. Owner-approved retention/access/offsite policy. A provider snapshot in the same
   account is not an independently tested offsite recovery strategy. No deletion now.

Record that the source provider export authenticates identity and consistent capture;
a SHA-256 of an arbitrary downloaded file is not proof of trustworthy origin.
Physical provider snapshots restore according to provider engine/region mechanisms,
not generally into a different managed vendor. For RDS MariaDB, logical import is
supported, while mariadb-backup physical import is not the advertised generic path:
[official import methods](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Procedural.Importing.html).

## Restore and verify (P)

Authenticate/decrypt artifacts in a private isolated operator environment; verify
integrity before loading. Choose a new empty qualified MariaDB11.8 target and keep
application/other user access fenced. Follow DATABASE_MIGRATION_PLAN.md load order
without destructive resets, lossy conversions, disabled FK/CHECKs, duplicate seeds
or partial-history replay. Restore all guards before enabling QA/runtime access.
Any failure quarantines the target and preserves diagnostics/artifacts; do not
rerun a partial import into the same nonempty schema or auto-mark migrations applied.
A fresh approved empty target is safer for another reviewed attempt.

Verification must compare the entire captured schema/index/FK/CHECK/generated and
trigger contract, complete typed per-table row digests/counts, ledger/checksums,
next IDs, approved definers and effective grants. Run isolated synthetic negative
security/authorization/publication/token-reuse tests plus MFA/session/feedback/quota
concurrency and audit rollback, never test destructive operations on the source.
Use real protected clone data only under owner/privacy authorization; do not leak it
into normal CI. Prove recovery time and loss window against owner-approved targets.

RDS automated snapshots/logs provide PITR with configured retention up to35 days;
restore creates a recovery target that still needs current application/key/grant/
network verification. That public feature is not proof this project's source backup
or target PITR is enabled/rehearsed. [RDS backup explanation](https://aws.amazon.com/rds/faqs/).
Do not select a retention policy merely because a provider has a default or maximum.

## Rollback decision tree and point of authority

| Stage | Allowed recovery strategy (requires named operator approval) |
| --- | --- |
| Before production target import | Source remains untouched. Abort preparation, preserve encrypted artifacts, stay on existing maintenance posture. No source cleanup |
| Target import incomplete; source still authoritative/fenced | Quarantine target, retain audit; do not reopen without required triggers/constraints. Restore anew only to a separately approved empty target |
| API switched but NO target production writes or security-state changes | Drain/fence API; verify truly no new sessions/token consumption/audit or other writes. Revert reviewed config only to a qualified secure database; original insecure source cannot be reopened as a workaround |
| ANY target writes, including login/refresh/MFA/recovery/audit | Target is authoritative. Fence writers, snapshot it, reconcile all deltas and security state. Prefer fix-forward or restore target to a supported secure endpoint. No blind source switch |
| Target lost/corrupt | Restore approved target recovery point/PITR to new endpoint. Reconcile loss window, revocations/token reuse/side effects before traffic; owner accepts documented RPO consequences |
| Application release rollback | Only if old app is schema/security compatible and target remains authoritative; no destructive database rollback |

Even a ?read-only acceptance login? can create session/audit records or consume MFA
steps, so it crosses the write boundary. Classify before calling failback zero-loss.
Once writes resume, reverting host/config alone is not a valid data rollback plan.
No assumed reverse replication/binlog access exists from Hostinger. Importing target
state back to source is a new approved migration and still does not resolve TLS.

## Stop/go reviewers

Security approves endpoint trust/CA/key custody and account boundaries; DBA approves
complete restore/data/metadata/definer equality; owner approves financial/legal scope,
window/RPO/RTO and authoritative-writer switch; hosting operator verifies actual
network/CA mounts/restart/probes; QA approves repeated synthetic real-engine and
provider staging acceptance. No signature/result is fabricated. No decommission,
DROP/TRUNCATE, backup deletion or production cutover executed by these documents.

The shipped recovery CLI is local-only,11.8.9/Windows native-tool constrained; its
successful local test does not authorize remote restore. Production export/restore
mechanism still requires provider/DBA implementation/rehearsal. No guard bypass added.
