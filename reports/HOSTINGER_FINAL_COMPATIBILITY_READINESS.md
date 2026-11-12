# Hostinger setup compatibility: final verification gates

2026-11-12. **Production initialization: NO-GO.** Read-only source review and
official documentation checks only. No setup request, production SQL, filesystem
probe/write, restore, migration, deployment, configuration change or administrator
creation. No alternative setup mechanism introduced. Prior 343 local passing cases
remain historical evidence; not rerun or presented as Hostinger verification.

## Actual verification outcome

| Gate | Verified fact | Still required |
| --- | --- | --- |
| Proxy/TLS | Source uses node:http createServer. Setup requires req.secure. Default Express proxy trust remains off; the only explicit proxy policy is single-nginx-loopback. | Actual Cloud upstream protocol, immediate peer/range, header overwrite behavior and direct-port reachability. With plain upstream/default mode the route will return 403 despite public HTTPS. Current Cloud compatibility is not established. |
| Private persistence | Job source requires an existing private state directory outside release/public/hbuilds paths and POSIX mode excluding group/other; exclusive lock, markers and fsynced artifacts are retained. | A real app-UID-accessible path, parent ownership/mount isolation, persistence across release/restart, file mode/ACL review and safe retrieval of preflight/audit. A path visible in SSH is not proof it is visible to the app. |
| Child process | Source invokes process.execPath with fixed CLI/arguments, no shell, and whitelisted environment; disposable Windows real-CLI tests passed. | Provider confirmation and approved harmless child-process test in the actual managed runtime: execPath allowed, deployed files/dependencies readable, limits and disconnect/restart behavior. NPROC availability does not establish child-process support. |
| HTTP execution | Hostinger officially documents a 120-second request limit, no always-running workers, shared process/thread limits (Cloud Startup NPROC 200/entry 100). | App-specific lower proxy limits, whether timeout only closes response or terminates execution, and measured worst-case action duration with margin on isolated hosting fixtures. Local full-suite duration is not one migration action's duration or a Hostinger guarantee. |
| Recovery | Existing local encrypted recovery evidence includes full history, schema, original definers, data and auth/MFA checks. Shipped recovery tool still rejects production targets. | Provider-supported isolated recovery preserving original identities/privileges, not an in-place restore or stripped dump; demonstrate it with all 46 triggers and complete verification. |

Public documentation cannot verify the actual runtime properties in the last
column. The signed-in browser was not on hPanel initially. A read-only attempt to
select its Hostinger tab failed with coordinate geometry unavailable; one refreshed
window/capture retry failed with `window crop is outside captured monitor`.
Inspection stopped without further input. Web-tool GET attempts to /health and
/ready returned tool access errors, not verified HTTP statuses. No current deployed
fingerprint, runtime peer, private mount, grants, backup archive or successful
restore was obtained. These tool failures do not establish a website outage.

## Recovery conflict requiring provider resolution

Hostinger's current [database import guide](https://www.hostinger.com/support/1864324-how-to-upload-and-set-up-your-database-at-hostinger/)
lists dumps without DEFINER, PROCEDURE or TRIGGER lines as its preparation
requirements. Therefore generic phpMyAdmin/hPanel import is **not demonstrated to
support this application's unchanged trigger/definer recovery requirement**.
Do not strip those objects to comply. The [restore guide](https://www.hostinger.com/support/4283700-how-to-restore-backups-at-hostinger/)
restores the selected existing database to an earlier state; it does not document
an isolated clone preserving this application's objects and principal permissions.

Creating another database/user alone is insufficient. Original DEFINER identities
must exist and have required activation privileges on the restored schema. A
renamed schema/different account may break those rights. Do not grant the production
credential broad new access, rewrite DEFINER clauses, or use the live database as
the test target. Hostinger must supply an approved isolated target/identity mapping
that preserves the original definitions and effective trigger rights, or a supported
provider-assisted restoration route. Support's earlier conditional suggestion to
import a downloaded dump does not establish that this route is available.

The reported November 10 backup is not a fresh capture or a demonstrated restore.
For an empty target, verify recovery of its complete empty object/schema state and
separately rehearse the fully initialized synthetic schema. After initialization,
verify backups of actual state under separately approved custody/retention rules.

## Exact remaining actions, in order

1. Obtain deployment-specific provider evidence for **api.revexoe.com** (not another
   domain): proxy peers/header overwrites/direct access, app UID/private persistent
   directory, child-process support/resource limits and timeout/termination rules.
   Restore browser geometry for read-only evidence collection; do not infer these
   from dashboard deployment-completed status.
2. Under separately approved disposable/staging probe deployment/configuration,
   verify the existing setup route's TLS classification through the real ingress,
   refusal of spoofed headers/direct untrusted requests, private file persistence
   across restart/release, harmless fixed Node child invocation and request timeout
   semantics. No migration/bootstrap for capability probing. Source-only or SSH
   observations cannot substitute for runtime tests. No broad trust proxy switch.
   If actual topology differs from the implemented policy, approve a narrowly bound
   compatibility correction with regression tests before enabling setup.
3. Obtain separate authorization for an **isolated** restore rehearsal and its
   credentials/artifacts. Use synthetic data and an approved complete dump: encrypted
   storage, separate key custody, integrity checks, unchanged 85 ledger checksums,
   exact schema/32 tables/46 trigger definitions and valid definers, rows/indexes/
   FK/CHECKs, all trigger guards, reduced runtime permissions and authentication/
   matching MFA decryption. Record measured recovery times, failed/tampered/wrong-key
   handling and an accountable production restoration procedure. Do not execute the
   disposable-only recovery tool against production or click in-place Restore.
4. Review evidence and genuine transport/wildcard/shared-definer/risk approvals,
   exposed MFA-key use/remediation, actual target CURRENT_USER/hostname/grants and
   exact compiled release fingerprint. Preserve the existing access signing key.
   Resolve backup/restore and proxy/storage/child blockers before production GO.
5. Only after independent release/configuration approval: deploy the reviewed exact
   artifact and arm the existing **preflight** job with private state and temporary
   setup authorization. Review its output. Separately approve apply within the
   original 15-minute preflight window; never automatically advance or retry.
6. Verify complete manifest/history: 85 applied entries, 32 tables, 46 original
   triggers/definers and no failed/applying rows. Counts alone are insufficient.
   Separately approve bootstrap for rxadmin@revexoe.com, with a **new** password
   privately injected (16–128 characters, at least 10 distinct). Do not reuse the
   exposed password or put it in HTTP requests, files, Git, logs or chat.
7. Separately authorized permission reduction/reconnection/check-runtime, remove
   setup and elevated operator/password inputs, verify the route is absent, and
   confirm the explicitly scoped password-only owner policy is deployed. Remove
   expired setup configuration before restart: its current validator intentionally
   fails startup when an expired optional setup configuration remains present.
8. Under final traffic/login authorization, operator manually verifies password
   login -> /app, Super Admin permissions, logout, wrong-password rejection and
   unauthorized access. No WORKING claim before actual production evidence.

The existing mechanism is **not proven unusable**, but is also not yet proven
usable on Cloud. The [120-second limit and hosting constraints](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
must be satisfied without automatic background continuation/retries. If an action
cannot fit safely, stop for evidence-based review of this mechanism rather than
introducing another runner in this assessment. No purchase or hosting move proposed.
