# Manual setup dispatch for a permanent Super Admin

2026-11-12. Local implementation/testing only. Production remains NO-GO. No
production connection, configuration, migration, account creation or deployment.

## What this does

The existing permanent database account is still created by the guarded bootstrap,
with an Argon2id password hash and platform role membership. No credentials table,
plaintext/hardcoded password, password reset shortcut or authentication bypass was
added. All application tables remain required for the existing dashboard.

`POST /internal/initialization` dispatches **one preconfigured job** through the
existing initialization-job wrapper and original operator/bootstrap CLIs. No job
runs on startup. By default the route is absent. Request passwords, SQL, job paths,
query strings, bodies, browser Origin headers and arbitrary commands are rejected.
The response contains only success or a generic review-required failure. It cannot
set an admin password supplied by a client or return a session/token/password.

## Explicit temporary configuration, not production settings applied here

All four inputs must be supplied together. Partial/invalid/expired configuration
fails startup rather than accidentally opening setup:

| Name | Requirement |
| --- | --- |
| INITIALIZATION_HTTP_ENABLED | Exact `OWNER_APPROVED_MANUAL_SETUP` |
| INITIALIZATION_JOB_FILE | Absolute private server-side reviewed job JSON path; action/target/references/fingerprints remain required by the existing job wrapper |
| INITIALIZATION_TOKEN_SHA256 | 64 lowercase hex SHA-256 of an independent cryptographically random setup bearer token; never use an admin password, auth signing key, MFA key or example token |
| INITIALIZATION_EXPIRES_AT | ISO timestamp after current time, no more than one hour ahead when process starts |

Operator sends the private random token as `Authorization: Bearer ...` over verified
HTTPS, with an empty POST body. Accepted token syntax is 43–128 base64url
characters; choose 32 or more cryptographically random bytes. Token creation and
installation are **not performed by this task**. Protect proxy/access logs from
Authorization headers; never put the token in a URL, source, chat or command
history. Use an approved operator client that prompts privately and verifies HTTPS.
No paste-ready live production invocation is supplied before the release gates.

The bootstrap password remains a protected operator environment input, validated
by the existing bootstrap rules (16–128 characters, >=10 distinct characters).
It is never sent in the HTTP request, written to the job file or logged. Remove
the bootstrap password, elevated database credentials and setup inputs from normal
runtime after separately approved setup. Do not reuse the previously exposed
password. Application AUTH_ACCESS_SECRET and AUTH_MFA_KEY are not rotated here.

## Security boundaries and blockers

HTTPS must be recognized by Express through native TLS or the existing explicitly
reviewed proxy policy. The route does **not** trust arbitrary X-Forwarded-Proto.
Current Cloud direct proxy mode will refuse a plaintext upstream request even if
the external client used HTTPS. Do not enable single-nginx-loopback for Cloud or
set unrestricted trust proxy to get past this refusal. Hostinger must establish
actual proxy peer addresses/header overwriting/direct-reachability restrictions;
any new Cloud proxy policy needs independent implementation, review and tests.
This is a known production blocker, not a completed Cloud deployment integration.

The temporary setup credential authorizes the configured job, not general admin
access. Constant-time hash comparison is used. There is a fixed process-wide cap
of 12 authentication attempts, independent of spoofable client-IP headers. This
can be exhausted by an attacker: fail-closed unavailability is deliberate; no
automatic restart/renewal is an authorized remedy. Expiry is checked on every
request. The first authenticated request consumes the in-memory attempt even if
execution fails; concurrent/repeated requests are refused. A process restart is
not a recovery procedure: persistent mutating markers, CLI ledger/locks and audit
checks remain authoritative. Same-host/root compromise and stolen valid setup
credentials remain risks. Disable/remove setup inputs after each reviewed phase.

No arbitrary background job is launched. The request awaits the child CLI;
Hostinger HTTP request/time limits and child-process support are unverified.
If ingress times out, the operation may have committed or may still be running.
Do not retry; preserve audit/markers and review actual server state. Do not raise
HTTP timeouts or replace this with an automatic build/restart hook to conceal the
problem. Persistent private storage outside public/hbuilds/release directories,
operator isolation and process lifecycle/maintenance control need provider proof.

Production still needs genuine transport/wildcard/shared-definer approvals,
accepted backup plus isolated restore evidence preserving all 46 definers, current
target/grants/schema evidence, exposed MFA-key remediation and release/migration/
bootstrap authority. Runtime permission reduction remains a separate operator
action. No old safeguard, historical SQL, trigger or manifest was removed.

## Reviewed sequence

1. Satisfy the blockers above and review the exact compiled release fingerprint.
2. Configure only the reviewed preflight job during an isolated maintenance window;
   authorized operator explicitly POSTs once, then reviews private preflight output.
3. Under separate apply authorization, arm only the approved apply job before the
   original 15-minute preflight approval expires. Never automatically advance phases.
4. Run the reviewed verify-complete job and independently verify the full manifest,
   85 ledger rows, 32 tables, 46 triggers and original definers.
5. Arm separately approved bootstrap with a new privately supplied strong owner
   password, then run it once. It cannot create a second root or reset an account.
6. Reduce/reconnect/check-runtime under existing policy; clear setup and privileged
   inputs, verify route absence, then separately release traffic and manually verify
   https://revexoe.com/login -> /app and negative/unauthorized/logout behavior.

See HOSTINGER_ONE_TIME_INITIALIZATION.md for job files, private artifacts and
failure recovery. Do not clear markers, import SQL manually or invent approvals.

## Files and local evidence

Changed backend/src/setup/http.ts, backend/src/app.ts, backend/src/server.ts,
backend/test/initialization-http.test.mjs,
backend/test/initialization-job.integration.mjs and this report. The earlier
initialization job implementation remains intact.

Executed locally: backend build, typecheck and root lint passed; 105 unit cases
passed with no failures/skips/cancellations. Offline manifest validation accepted
all 85 migrations; historical SQL/verification/manifest unchanged. The new real
HTTPS -> job -> operator -> bootstrap integration case passed on harness-owned
MariaDB11.8.9, including complete history/46 triggers, repeat refusal, password-only
owner authentication and selected Super Admin role. Final full backend integration
suite: 238 passed, zero failures/skips/cancellations (204.8 seconds). Combined total:
343 passing cases including node:test parents. No frontend or real production
browser test is claimed.

Local compiled fingerprint:
`8e249b32ee0b97f6e3eb61f36cb09a97bbb60e132dd3c926c4c09b80f7aadc39`.
This replaces earlier local artifact fingerprints, not the deployed release.
No production login or provider compatibility is claimed.
