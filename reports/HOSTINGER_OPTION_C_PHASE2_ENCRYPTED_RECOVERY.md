# Phase 2 encrypted recovery readiness and failure evidence

2026-11-11. **Linux backup/restore NOT_RUN; production recovery NO-GO.** No source
production data, keys or accounts read. No restore target, native Linux dump,
synthetic Linux PKI or off-server destination was created.

## Chosen deliverable and limits

Prepared a [separately reviewable native DBA procedure](../ops/option-c/linux-validation/NATIVE_RECOVERY_PROCEDURE.md),
the authorized alternative to an executable Linux recovery workflow. It specifies
verified TCP TLS/CA-byte prechecks, exact source/destination identity and empty-target
hold points, writer/DDL coordination, native dump flags, original definer/account
reconstruction, authenticated encryption/integrity, isolated restoration and final
schema/data/guard/application verification. It is a **procedure prepared, not a
tested recovery implementation**. Linux availability blocks empirical validation.

Existing Windows utility guards remain intact: local disposable policy/no-TLS,
win32 executable paths and exact11.8.9 restriction were not removed or broadened.
Native recovery cannot be made production-capable by relabeling the target local.
No automatic target/grant/approval bypass or production command executor was added.

## Required contents, trust and isolation

The procedure requires all32 tables,85 ledger rows/checksums,46 trigger definitions/
order/original DEFINERs, rows/binary IDs/auto-increments, indexes/FKs/CHECK/generated
columns/schema defaults and source configuration/release fingerprints. Accounts
and grants are separately reconstructed under protected DBA custody, not presumed
included in the SQL dump. Source and destination use independently identified
instances/datadirs and the same synthetic schema/definer names to preserve identity.

Actual source consistency needs retained named lock and proven writer/DDL freeze/
snapshot/read-lock coordination; a finished short-lived lock query or successful
dump exit alone does not prove a recoverable consistent snapshot. Backup metadata
privilege may permit trigger management and must not be granted to runtime. Import
with different definers may need DBA SET USER authority; stop if that cannot be
preserved legitimately, rather than remap/strip definers or widen strict operator.

Reuse existing reviewed archive.mjs AES256-GCM, random nonce, domain-separated HKDF
keys and authenticated metadata envelope. Exact archive/file/SQL length/hash,
complete release snapshot and authenticity must verify before import. These
primitives are not by themselves a production authorization/target controller.
New synthetic backup keys only, separate from archives and access/MFA keys; no
keys in arguments/logs/Git. Encrypt before exporting off the isolated instance.
Independent off-server copy and key retrieval: **PENDING, not demonstrated**.

## Required failure-injection result register

| Case | Linux result | Required safe behavior |
| --- | --- | --- |
| Wrong encryption key | NOT_RUN | Reject MAC/GCM before import. |
| Modified archive | NOT_RUN | Reject authenticated file integrity. |
| Truncated archive | NOT_RUN | Reject completeness/tag/length, no partial acceptance. |
| Missing component/trigger metadata | NOT_RUN | Refuse archive/release acceptance. |
| Wrong target/identifier | NOT_RUN | No import/target adoption. |
| Nonempty/unidentified target | NOT_RUN | No overwrite or reset. |
| Missing/invalid restore authorization | NOT_RUN | Stop before mutation. |
| Interrupted restore | NOT_RUN | Quarantine; independent recovery decision, no blind rerun. |
| Missing definer | NOT_RUN | Refuse, no silent default to restorer. |
| Incorrect runtime grants | NOT_RUN | No traffic release; reviewed correction only. |
| DB crash during disposable restore | NOT_RUN | Preserve partial state/audit; investigate committed/in-flight work. |
| Incompatible release/checksums | NOT_RUN | No baseline/manifest regeneration. |

The executed Windows206-case integration aggregate includes prior native encrypted
recovery, wrong-key/tamper/interrupted handling and Cloud46-guard exercises. Those
results were revalidated here but **do not fill any Linux result above**, establish
strict Linux identity recovery, or prove host/volume/off-server recovery.

## Post-restore gate and metrics

Future isolated Linux exercise must compare exact schema/ledger definitions/hashes,
row/binary hashes, auto-increments and constraints, then46 named guards before/after
reduction/restart/restore, actual runtime denial boundaries, synthetic MFA/session/
tenant/immutable-publication/parallel-public-flow compatibility. Source constraints
and imported state must pass integrity checks; no disabled guards or forced acceptance.

Record backup, validation, transfer, restore,46-guard and service-recovery durations
separately. Actual Linux recovery time: **NOT_MEASURED**. Actual backup cadence/data
loss bound: **NOT_ESTABLISHED**. Proposed RPO<=24h and RTO<=4h are planning targets,
not approved or satisfied SLAs. Retention/legal exceptions, key custody, region,
storage and independent recovery approvals remain open. Reboot/encrypted-volume
unlocking are NOT_RUN. A provider snapshot or second folder is not proof of these.

No cleanup deletes unknown data/services. On partial failure preserve evidence,
stop retries/writers, assess committed/in-flight DDL and rehearse additive repair
or separately authorize a new isolated restore. No DELETE ledger/DROP/reset or
historical-checksum modification. Production migration/restore requires a separate
tested procedure and explicit independent approval after Linux acceptance.
