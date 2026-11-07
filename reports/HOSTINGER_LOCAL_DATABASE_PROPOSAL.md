# Hostinger-only local database proposal ? review, NOT activated

2026-11-07. Owner-directed Hostinger-only alternative; AWS/external databases are
not part of this proposed deployment. Current Node24 / backend root / npm run build /
npm start / Hostinger MariaDB127.0.0.1:3306 settings are owner-confirmed. No Hostinger
connection, production setting/credential change, migration, bootstrap or deployment.
No claim the current503 is fixed or the proposed non-TLS startup has been released.

## Review decision and implementation boundary

**Proposal only. Explicit owner approval is required before production integration
or activation.** The candidate is backend/proposals/hostinger-local-transport.mjs,
a pure review-policy evaluator with no I/O or process.env reads. No server, config,
pool, migration, bootstrap or diagnostic CLI imports it. It is outside the TypeScript
src build. Even with all proposed settings, the live production env validator still
rejects HOSTINGER_LOCAL and the existing pool refuses IP-host verified TLS. No
hPanel variable or acknowledgement can activate this proposal in the current build.

This deliberately follows the instruction not to activate the mode before review.
The exact future wiring is below; it is not secretly enabled and no environment
change is suggested now. Current secure TLS startup remains tested and available
when a genuinely verified endpoint exists. Hostinger-only no-CA startup remains
blocked until the separately approved implementation is integrated and accepted.

## Proposed production transport decision

| Condition | Required decision |
| --- | --- |
| DB_TLS_MODE omitted |Keep existing production required TLS; no local inference |
| DB_TLS_MODE=required |Unchanged authenticated CA/hash and DNS/hostname verification; no plaintext retry |
| DB_TLS_MODE=HOSTINGER_LOCAL |Only after approved release wiring AND exact explicit operator acknowledgement/reference and literal endpoint below |
| DB_TLS_MODE=disabled in production |Continue rejecting; no generic plaintext production switch |
| Required TLS failure |Fail closed; never try local mode automatically |
| Hostinger local connection failure |Fail readiness/operation; never switch endpoint, credentials, port or TLS mode automatically |

The proposed local branch accepts only raw DB_HOST exactly127.0.0.1 and DB_PORT
exactly the canonical string3306, NODE_ENV=production, explicit mode, acknowledgement
and approval record. No localhost,127.1,127.0.0.2, IPv6, integer-encoded IP, URI,
DNS alias, whitespace, alternate port or environment-default approval. The selected
connection must use explicit host127.0.0.1/port3306 with no TLS option, no socketPath
or arbitrary caller connection options. There is no rejectUnauthorized=false setting.
This chooses **non-TLS transport explicitly** rather than pretending encryption is
verified. All other production endpoints retain required verified TLS.

Proposed acknowledgement: HOSTINGER_LOCAL_APPROVAL must exactly equal
I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT. HOSTINGER_LOCAL_APPROVAL_ID is a
nonsecret reviewed change/approval-record reference,8?80 characters, alphanumeric
first then alphanumeric/dot/underscore/hyphen. It must identify actual owner/operator
approval, not a generated fake reference. String checks record explicit intent;
they cannot cryptographically prove ownership or the hosting boundary. Protected
hPanel access, written approval and a separately reviewed enabling release remain
required. The test-only reference is not production approval.

DB_TLS_CA_FILE and DB_TLS_CA_SHA256 must both be **absent**, including no empty
string or placeholder, in the proposed branch. Mixed settings fail instead of
silently discarding trust configuration. Required TLS retains both CA requirements.
No certificate/hash is fabricated. SMTP CA settings remain independent and TLS
mandatory as before; HTTPS, JWT, MFA and password policies are not relaxed.

## Safe hardening applied now

A confirmed development/test gap allowed explicitly disabled TLS to arbitrary
remote hosts. backend/src/db/pool.ts now restricts that existing nonproduction path
to literal127.0.0.1/::1 fixtures. This only tightens access; it does not allow non-TLS
production. Disposable fixtures keep random loopback ports and are separate from
the proposed exact127.0.0.1:3306 production exception. No existing test was weakened.

## Exact code changes needed AFTER explicit approval (not applied)

| File/path | Required reviewed wiring / invariant |
| --- | --- |
| src/config/env.ts |Add HOSTINGER_LOCAL enum and explicit approval fields. Conditional CA pair only for validated local branch. Parse/select transport once; retain all production auth/SMTP/origin/password checks. Unset mode remains required; generic disabled still rejects |
| src/db/pool.ts |Use the shared validated transport decision, recheck literal endpoint/port for local branch and omit TLS only there. Verified TLS branch unchanged; no catch-and-downgrade or caller options overlay |
| src/server.ts |Keep validation/auth/MFA before listen; log a fixed local-unencrypted security-posture notice/approval reference without secrets. No migrations/DB/network waits before listener and no silent production-test mode |
| src/migrations/operator.ts |Extend private target policy with an explicit optional Hostinger-local transport marker and approval reference only for exact production127.0.0.1:3306. Do not label production as local or accept test-schema bypass. Bind marker/reference/target identity to current approval digest; old policy with no marker retains TLS requirements |
| src/migrations/operator-cli.ts |Use same transport validator and require explicit local acknowledgement for preflight/check-runtime/apply. Preserve separate credentials, production confirmation, fresh target/schema/grant-bound approval, audit output, GET_LOCK and interruption refusal. Omit CA only in the approved branch; never infer from absent CA |
| src/migrations/runner.ts |Keep version/SQL mode/FK/CHECK, numeric ordering, checksums, ledger, lock/postconditions/failure behavior unchanged. A Hostinger-only initialization wrapper must require empty reviewed schema before first apply; never overwrite/adopt unknown objects |
| src/setup/cli.ts |Use approved target transport only after separate first-owner/bootstrap authorization. Preserve empty-root/identity/idempotency guards and original password/MFA policies |
| src/db/diagnostic.ts and diagnostic-cli.ts |Respect approved selected mode; local result explicitly transport=unencrypted_loopback, encrypted=false. Do not report TLS verified for an empty cipher. All other endpoints still require cipher/chain/name success |
| Operator documentation/templates |Provide marked activation checklist only after approval; audit nonsecret approval identity and actual target. Keep mode disabled/unwired until release approved |
| Tests |After wiring, run real approved-local startup and migration CLI in isolated loopback3306 fixture, auth/MFA/tenant/concurrency regressions, remote/CA/mode-negative tests and unchanged TLS negatives. No production fixtures |

Optional new policy fields must not silently change old target-policy semantics or
reuse old approval artifacts. Any changed policy/schema/grant/transport requires
fresh preflight/approval. The current strict target parser deliberately rejects
production IP targets; that is a pending reviewed change, not a command to bypass.

## Database initialization preparation

Owner states source schema is empty. This remains an operator assertion until a
read-only inventory of the exact schema/account/@@hostname/engine confirms it.
The existing runner already creates the full85-version release on a genuinely
empty MariaDB11.8 schema and is exercised on disposable11.8.9. No new migration SQL
or schema redesign is needed. Expected result32 tables including ledger,46 triggers,
safe catalog/role/permission seeds; no user/password/plan-price seed.

The **transport adapter is pending approval**, so current operator cannot be used
as a plaintext production initializer. Do not use legacy local migration CLI or
NODE_ENV=test against the Hostinger schema. After approved wiring, retain explicit
environment/target/account, exact grants, read-only preflight, fresh approval/audit,
production confirmation and lock. Any existing table/ledger/data or partial DDL
stops first initialization for review; no DROP/TRUNCATE/baseline/reset/automatic
rerun. No database was created or initialized by this task.

## Security conditions before owner decision

Hostinger must describe whether loopback terminates at the actual MariaDB server
or a proxy, any downstream hops, network/process/tenant namespaces, isolation of
other customer processes, credential handling/DB auth, patching/backups and allowed
privileges. Do not infer dedicated tenancy from Cloud Startup branding or127.0.0.1.
Loopback is routing scope, not encrypted authenticated transport; the difference is
an explicit residual risk, not equivalent security or a certificate substitute.
If provider cannot substantiate the required boundary, do not activate the proposal;
report the Hostinger-only requirement blocked rather than weaken other controls.
See SECURITY_TRADEOFFS.md and the exact deployment/environment reports.

## Verification boundary

Eight new tests exercise candidate endpoint/approval/CA restrictions, current runtime
refusal, unchanged auth/MFA/TLS gates and actual remote-plaintext hardening. Existing
secure production-like startup is verified. **Proposed non-TLS production startup,
production migration and Hostinger boundary are not verified or activated.** This
limitation is deliberate pending owner approval, not hidden as a passing local-mode
end-to-end test. Test results/inventory are recorded in HOSTINGER_DEPLOYMENT_STEPS.md.
