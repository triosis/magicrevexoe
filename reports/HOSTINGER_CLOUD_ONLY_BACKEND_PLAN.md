# Cloud Startup-only backend: evidence, blockers and conditional plan

2026-11-12. **Investigation only. Production NO-GO.** No VPS, purchase or hosting
migration proposed. No production connection, configuration/grant/data change,
deployment, production migration, real Super Admin, commit or push. Initial working
tree clean atba69f1e. Only this report added; disposable logs are ignored. Existing
code,85 migrations/verification files and schema manifest remain unchanged.

## Root cause: what is confirmed

The supplied production logs report missing/invalid DB_TLS_CA_FILE and
DB_TLS_CA_SHA256, then the provider's three-second listen warning. Current env.ts
rejects that configuration before pool creation/app/listen. Thus **those attempts
failed configuration validation**, not a demonstrated slow listener or require.main
guard. With required TLS,127.0.0.1 also fails the DNS-hostname contract even if
arbitrary CA values are supplied. Never fabricate a CA/hash to pass validation.

**Today's exact503 cause is unconfirmed:** this task supplied no new timestamped
runtime log/deployed artifact and forbids production access. Later configuration,
bind/deployment errors or ingress probes could differ. Obtain redacted current
logs, deployment ID/commit/compiled artifact identity and probe semantics under
separate owner review. Historical evidence is in
[503 root-cause report](HOSTINGER_503_ROOT_CAUSE.md). An application login500 is also
distinct from a provider503; an empty schema can cause login SQL failures, but no
fresh production SQL error was examined here.

The database permission problem is a **separate initialization/security blocker**.
The API pool does not call the migration/runtime privilege verifier at startup.
An ALL-privileges account can therefore let the API listen or SELECT1 succeed while
still failing the release security gate. Do not describe permission-check rejection
as a confirmed cause of the listener503 or treat liveness/readiness as grant approval.

## Existing implementation and smallest safe change

Current source already contains explicit HOSTINGER_LOCAL transport and separately
approved Cloud initial-maintenance/runtime-dbwide operator profiles. No missing
driver, ORM rewrite, listen workaround or new code is established as necessary.
Node24/Express/mysql2 support MariaDB11.8.9, and the schema executes in disposable
tests. `HOSTINGER_LOCAL` permits exactly production security validation plus
127.0.0.1:3306, explicit acknowledgement/genuine reference and no CA fields. Remote
connections still require verified DNS TLS; TLS failure never selects plaintext.

**Smallest source change required now: none justified.** A configuration-only
startup path exists, conditional on a separate genuine transport exception and a
deployed artifact containing the tested implementation. It is not approval to
activate it. Production configuration still enforces origins, strong passwords,
canonical independent auth/MFA keys and SMTP. Argon2id, MFA, RBAC, tenant scopes,
integrity guards and compliant parallel review paths remain unchanged.

No small application change can narrow a server-side wildcard SQL grant or create
separate SQL identities when the provider permits one. Removing/relaxing
inspectGrants/inspectCloudGrants, hiding grant rows, comparing raw schema text,
manually importing SQL or marking a migration applied would bypass safeguards.
None is implemented or recommended. Any future risk-policy redesign requires
explicit separate review and does not constitute verified exact-scope isolation.

## Managed database compatibility and available account

Owner/support evidence: database u676472791_magicreview_db, endpoint127.0.0.1:3306,
MariaDB11.8.9, account reported as u676472791_magicrev_user@127.0.0.1, ALL PRIVILEGES,
one user/database, database-wide grant controls only, no separate provider definer,
and declined raw-grant correction. Exact CURRENT_USER/@@hostname/SHOW GRANTS and
current schema state were **not** queried here. The Cloud exception pins11.8.9;
generic11.8.x alone is insufficient for that profile without a reviewed change.

Hostinger documents one user per database, an immutable first name component,
database-user permission controls and127.0.0.1 for Node's local database connection.
These documents do not prove exact server grants, TLS or tenant isolation.
[Database rules](https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/),
[Permission UI](https://www.hostinger.com/support/4564363-how-to-change-permissions-for-a-database-user-in-hostinger/),
[Node database connection](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

| Check | Compatibility result |
| --- | --- |
| MariaDB syntax/artifact |85 immutable steps,32 tables,46 triggers work on disposable11.8.9 |
| Original strict migration grants |Require schema SELECT/CREATE/ALTER/TRIGGER plus narrowly table-scoped ledger/seed writes; ALL account fails |
| Original strict runtime |Exact per-table DML, no ledger/DDL/TRIGGER/DELETE; single database-wide account cannot meet this profile |
| Explicit initial-maintenance exception |Can accept pinned exact-schema ALL temporarily with real bounded approval; still rejects wildcard/global/other-schema/role authority |
| Reported raw grant scope |Unescaped underscores in database-level `u676472791_magicreview_db` are wildcard characters even inside backticks; rejected with CLOUD_STARTUP_GRANT_SCOPE_MISMATCH |
| Reduced shared runtime |Only exact schema SELECT/INSERT/UPDATE/TRIGGER under separately approved profile; ALL runtime refused; raw wildcard scope still refused |
| Definers |Executing migration account becomes all46 creating definers; removing its needed TRIGGER/SELECT or deleting it can break writes |
| Bootstrap |Needs full schema/history verification and protected metadata access; env variables do not create an account |

**Can the85 migrations/46 triggers be initialized with the reported account?** The
engine and broad privileges can execute DDL in principle, but the **approved
operator cannot authorize this account as reported**. Its scope fails before apply.
No production initialization procedure is currently safe/executable under unchanged
checks. This is not a claim that MariaDB cannot create the tables, nor permission
to bypass the runner. All85 steps and46 guards remain mandatory.

Correct literal schema grants require explicit escaping of each `_`/`%`, with unsafe
old patterns removed; table grants are literal. Support reportedly declined that
correction, so it is not an available next action to promise. Renaming only the
suffix leaves the provider underscore prefix; adding exact target hashes, current
empty-state evidence or approval does not narrow granted SQL authority. Even a
scope correction alone would not restore separate runtime/definer privileges.
See [native grant investigation](HOSTINGER_GRANT_COMPATIBILITY_REPORT.md) and
[Cloud alternatives](HOSTINGER_CLOUD_STARTUP_ALTERNATIVES.md).

## Security tradeoffs and unverified guarantees

1. HOSTINGER_LOCAL is unencrypted and lacks TLS certificate server authentication.
   Loopback does not prove a dedicated tenant boundary or encrypted downstream hop.
   The acknowledgement/reference checks are authorization inputs, not isolation proof.
2. One shared account's database-wide INSERT/UPDATE includes ledger, identities,
   roles and every tenant's rows. TRIGGER allows changing/removing integrity guards.
   Existing guards work for normal writes but cannot be tamper-proof against that
   credential. Application RBAC does not constrain arbitrary stolen-credential SQL.
3. Approval expiry stops new tool work, not server privileges or in-flight DDL.
   Provider-controlled grant reduction/reconnection and actual final-state evidence
   are required. Permanent ALL is not an accepted runtime profile.
4. Raw wildcard scope can reach/create matching lookalike schemas; no observed
   lookalikes or UI naming limit proves absence of effective broader authority.
   This remains an unresolved blocker, not a risk silently waived by local mode.
5. Recovery, trigger metadata visibility and original definer preservation must be
   demonstrated. A listed provider snapshot or empty SHOW TABLES is not a verified
   backup/restore. No hPanel import-preserves-definers claim is made.

These are independent transport, privilege and recovery decisions. No approval ID
is invented here, and this request is not production activation authorization.

## Exact environment contract: review only

Configure **backend process** protected variables, not the React build. Production
does not load backend/.env automatically. The following is conditional configuration,
not an instruction to apply it while permission/recovery gates remain unresolved.

| Variable | Known literal or exact required format |
| --- | --- |
| NODE_ENV |`production` |
| HOST |`0.0.0.0` behind approved Cloud ingress |
| PORT |Actual provider-assigned integer1–65535; do not invent a fixed value |
| HTTP_PROXY_MODE |Omit/default `direct`; VPS-only single-nginx-loopback is not the Cloud topology; existing Cloud client-IP/abuse behavior needs acceptance |
| PUBLIC_FUNNEL_ORIGIN |`https://api.revexoe.com`, subject to owner routing confirmation |
| PUBLIC_WEB_ORIGIN |`https://revexoe.com` |
| CORS_ORIGINS |`https://revexoe.com`; exact comma-separated HTTPS origins only, no slash/path/wildcard; add www only if separately served/approved |
| AUTH_RECOVERY_URL |`https://revexoe.com/recover` exactly |
| DB_HOST / DB_PORT |`127.0.0.1` / explicit canonical `3306` |
| DB_NAME |`u676472791_magicreview_db` |
| DB_USER |Provider-approved real username, reported u676472791_magicrev_user; matched account identity separately verified |
| DB_PASSWORD |Private actual credential;>=16characters and>=8 distinct characters; never pad a provider password |
| DB_CONNECTION_LIMIT |Default5; optional integer1–50, reviewed provider budget |
| DB_TLS_MODE |`HOSTINGER_LOCAL` only after genuine transport approval; default/required TLS cannot work with the reported missing trust identity |
| HOSTINGER_LOCAL_APPROVAL |Exact `I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT` |
| HOSTINGER_LOCAL_APPROVAL_ID |Genuine finalized approval record reference,8–80 ASCII alphanumeric/dot/underscore/hyphen, starts alphanumeric, no REPLACE_WITH_ |
| DB_TLS_CA_FILE / DB_TLS_CA_SHA256 |Both **unset**, not empty/dummy, in explicit local mode |
| AUTH_ACCESS_SECRET |Existing canonical standard Base64 decoding32–128bytes,>=16 distinct bytes; preserve existing approved key |
| AUTH_MFA_KEY |Canonical standard Base64 decoding exactly32bytes,>=16 distinct bytes, different from access key; must match existing ciphertext |
| AUTH_SMTP_HOST |Provider-approved letters/digits/dot/hyphen host, not URL |
| AUTH_SMTP_PORT |Actual provider integer1–65535;465 implicit/587 STARTTLS defaults |
| AUTH_SMTP_SECURITY |Optional `implicit` or `starttls`; required explicitly for other ports |
| AUTH_SMTP_USER / AUTH_SMTP_PASSWORD |Real private provider username/password; password>=16characters and>=8 distinct characters |
| AUTH_MAIL_FROM |Approved bare email address, no display-name syntax |
| AUTH_SMTP_TLS_SERVERNAME |Optional reviewed DNS certificate identity, otherwise omit |
| AUTH_SMTP_CA_FILE / AUTH_SMTP_CA_SHA256 |Normally both absent; if approved private CA needed, real readable PEM plus exact-byte64hex digest; no SMTP verification bypass |

No new secrets generated. Previously exposed MFA candidate must not be installed:
assess whether used, then separately authorize unused-key replacement or tested
reencryption/recovery. Preserve current access key and ciphertext compatibility.

Optional AI whole group: ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_API_VERSION,
AI_MAX_OUTPUT_TOKENS, optional ANTHROPIC_FALLBACK_MODEL. Leave absent when disabled;
approved actual values must satisfy current schema, no placeholders. Payment group
RAZORPAY_MODE/KEY_ID/KEY_SECRET/WEBHOOK_SECRET and BILLING_LIVE_APPROVAL must not be
enabled as a startup workaround; existing unconditional financial hold remains.

Operator-only: MIGRATION_DB_USER/PASSWORD, explicit private target JSON, genuine
HOSTINGER_LOCAL acknowledgement/reference and, only for reviewed Cloud exception,
CLOUD_STARTUP_PRIVILEGE_APPROVAL_ID matching policy.cloudStartup.approvalId. Policy
also binds profile, operator/recovery references, grant/manifest fingerprints,
notBefore/expiresAt and riskAcknowledgement. These are not API .env toggles or a
wildcard-grant waiver. Bootstrap-only BOOTSTRAP_DB_USER/PASSWORD,
BOOTSTRAP_PLATFORM_NAME/OWNER_EMAIL/OWNER_NAME/OWNER_PASSWORD belong to a separately
approved operator process; adding them to hPanel does not run bootstrap. Do not
copy broad migration/bootstrap secrets into normal API runtime.

## Deployment settings and gated owner plan

1. **Evidence first:** owner obtains current redacted runtime/build logs, deployed
   commit and artifact identity. Confirm actual selected application is api.revexoe.com,
   not the frontend root/Vite server. No fresh evidence means today's503 stays unconfirmed.
2. **Stop gate:** resolve exact grant scope and accepted steady-state privilege/
   definer model through a documented supported same-plan capability. Existing support
   refusal means this is currently blocked. Do not initialize first, relax checks,
   create another suffix-only DB or import SQL to get past it. If capability cannot
   be supplied under the fixed constraints, report Cloud-only launch infeasible;
   no VPS/purchase/migration is proposed by this task.
3. Owner separately approves residual transport/shared-account risk, exact target,
   account/version, backup and isolated restore evidence, operator/reviewer and
   maintenance window. Freeze writers and automatic retry/startup migration actions.
   No release can be inferred from syntactically valid approval fields.
4. After all gates, prepare reviewed release: Node24, application root `backend`,
   build `npm run build`, start `npm start`, compiled entry `dist/server.js` relative
   to backend. Repository-root equivalent is node backend/dist/server.js; do not
   select frontend server.mjs. Build/install completes before runtime startup timer;
   Linux/native Argon2 dependencies must match. Inject reviewed runtime values above.
5. Authorized Hostinger-side operator runs exact immutable artifact preflight and
   separately approved apply using existing target/15-minute approval/lock/fsynced
   audit workflow. Preserve failed/applying states on failure; no blind retries,
   checksum edits, ledger deletion or DROP rollback. Rehearse forward repair/restore
   privately and obtain fresh approval. Current scope blocker prevents this step.
6. Verify full85 applied/no pending,32 tables,46 original guards/definers, manifest,
   permitted effective grants and actual denied operations; reconnect after approved
   reduction. Counts or SELECT1 alone are insufficient. Only then separately approve
   synthetic-safe acceptance and real first-owner bootstrap/MFA; never hardcode admin.
7. Separately approve deployment, then verify listening log and actual HTTPS
   `/health`/`/health/live`200; `/ready`/`/health/ready`200 only with reachable DB,
   503 on DB failure/drain. Health paths have no /api/v1 prefix; root404 is expected.
   Confirm provider startup/liveness semantics and separate readiness deadline above
   4seconds plus ingress margin. Do not enable traffic solely on liveness.
8. Verify frontend VITE_API_URL=`https://api.revexoe.com/api/v1` (lowercase path),
   CORS/auth/MFA/tenant denial/SMTP acceptance and error behavior. Keep operator
   credentials out of API; retain protected evidence/recovery. Only real logs/URL
   and independent release acceptance can establish503 resolved.

## Local checks executed for this report

Windows Node24.14.0, harness-owned MariaDB11.8.9, ephemeral synthetic credentials,
approvals and databases only. Explicit3306 fixture fails if occupied rather than
adopting any existing listener. No production environment/secret file loaded.
Ignored logs `.tmp-frontend/cloud-only-plan/`.

| Executed command/check | Actual result |
| --- | --- |
| `npm.cmd --prefix backend test` |Backend build passed;92 tests passed,0 failed/skipped/cancelled |
| Eight integration files, sequential command below |98 passed,0 failed/skipped/cancelled;91.1seconds |
| `npm.cmd --prefix backend run typecheck` |Passed |
| `npm.cmd run lint` |Passed |
| Offline loadMigrations/validateManifest |85 steps000000–000084 accepted |
| Historical SQL/verify/manifest Git diff |Unchanged |
| Report local links/whitespace; `git diff --check` |Passed |

**190 test cases passed**, including node:test parent cases. Integration invocation:

```text
node --test --test-concurrency=1 backend/test/hostinger-local.integration.mjs backend/test/cloud-startup.integration.mjs backend/test/hostinger-grant-scope.integration.mjs backend/test/cloud-managed-alternatives.integration.mjs backend/test/migration-safety.integration.mjs backend/test/mfa.integration.mjs backend/test/setup.integration.mjs backend/test/recovery.integration.mjs
```

Fixture-only MARIADB_TEST_BIN selected the existing Windows11.8.9 ZIP distribution.
The actual compiled HOSTINGER_LOCAL server reached listen in **458ms** locally;
`/health` and `/ready` returned200 with its disposable database. Authentication
remained restricted pending MFA; unauthorized tenant access refused; recovery and
shutdown tests passed. Unit startup tests separately prove liveness200/readiness503
when DB is unavailable and invalid configuration refuses before listen.

Other executed checks cover all85 migrations/32 tables/46 triggers, strict and
explicit Cloud privilege profiles, actual raw-wildcard/lookalike SQL authority and
rejection, grant-fingerprint changes, lock/approval/audit/drift/failure behavior,
all46 guards under reduced creating-definer rights before/after encrypted native
restoration, schema/row/definer integrity, tamper/wrong-key/incomplete restore
refusals and synthetic bootstrap/MFA protections. Harness-admin provisioning of
safe scopes does not mean Hostinger can provision them. Shared-account tests do
not certify strict-runtime isolation.

Manifest fingerprint:
`4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735`.

Tests establish application/engine behavior, not actual Hostinger grants/routing,
tenant boundary, restore validity or production readiness. Historical full-product
results are not represented as rerun. Linux/provider operations were not exercised.

## Final assessment

The listener has a locally verified configuration path; **no startup code fix is
proven necessary**. The reported available database account still cannot satisfy
the operator's exact-scope boundary, and Cloud shared-account/unencrypted transport
risks remain separate approval gates. **Cloud-only production initialization and
launch remain NO-GO.** This report does not authorize implementation, activation or
production work, and does not claim503 fixed. Stop after this investigation.
