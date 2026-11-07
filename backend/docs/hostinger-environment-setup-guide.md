> **2026-11-07 update:** An explicit HOSTINGER_LOCAL exception is implemented and
> tested locally, but is not authorized for production activation. See the current
> [implementation/settings report](../../reports/HOSTINGER_LOCAL_IMPLEMENTATION_REPORT.md)
> and [test evidence](../../reports/HOSTINGER_LOCAL_TEST_REPORT.md). In that mode only,
> exact 127.0.0.1:3306 plus acknowledgement/genuine approval reference replaces the
> CA requirement; both DB CA variables must be unset. All other production modes
> retain verified TLS. The unconditional CA statements and measurements below are
> the earlier TLS-mode investigation, not a claim about a new deployed build.

# Hostinger backend environment setup and startup diagnosis

2026-11-06. Source-based investigation of the owner-supplied production errors.
No Hostinger connection, production setting/data/secret change, migration or real
provider request was made. This guide is an operator handoff, not deployment success.

## Observed failure and startup sequence

The supplied error names PUBLIC_FUNNEL_ORIGIN, PUBLIC_WEB_ORIGIN, CORS_ORIGINS,
AUTH_RECOVERY_URL, DB_TLS_CA_FILE, DB_TLS_CA_SHA256, AUTH_ACCESS_SECRET,
AUTH_MFA_KEY, AUTH_SMTP_HOST, AUTH_SMTP_PORT, AUTH_SMTP_USER,
AUTH_SMTP_PASSWORD and AUTH_MAIL_FROM as missing/invalid. The accompanying message
is `App did not call listen() within 3 seconds`.

In `src/server.ts`, `loadEnv()` runs first. The reported error is thrown by
`validateEnvironment()` before pool creation, app creation or `server.listen()`.
The top-level catch prints the safe variable-name-only message and sets exit code 1.
Thus the listen message is a downstream symptom of this configuration failure;
it does not establish an independent slow-start bug. A field can be present but
invalid; do not assume every listed field is simply absent. The first gate also
masks later errors: fixing it does not prove CA/key/SMTP validation will pass.

The actual sequence is:

1. Import compiled dependencies, including native Argon2; load protected environment.
2. Validate core/production settings, origins, password strength and required names.
3. Read/validate database CA bytes, digest and DNS-host configuration; create lazy pool.
4. Validate JWT/MFA keys and SMTP configuration; construct transport without connecting.
5. Construct services, validate public origins and any optional AI/payment configuration.
6. Construct Express/HTTP server, signal/error handlers and call `listen(PORT, HOST)`.
7. Log `Backend listening on <host>:<port>; database readiness is checked separately.`

No startup migrations, database query, SMTP verification, email, password hashing,
AI call or payment call is awaited. Missing native modules, unreadable CA files,
partial optional provider configuration or an invalid bind address can still stop
startup before the listening callback.

## Required API runtime variables and exact formats

Set these in the **backend process's protected environment**, not the frontend build.
In production, `loadEnv()` does not read backend/.env or backend/.env.hostinger.
An uploaded file alone is not configuration injection. Do not put literal quote
characters around dashboard values, leave whitespace/newlines in keys/hashes, or
leave REPLACE_WITH_ placeholders. Provider UI/configuration steps must be confirmed
by its operator; no dashboard path or filesystem layout is assumed here.

| Variable | Exact validation / expected value | Source / safe handling |
| --- | --- | --- |
| NODE_ENV | Exactly `production` for this deployment; schema also accepts development/test, default development | Safe literal; explicitly set production, never change it to evade validation |
| HOST | Nonempty trimmed string; default 127.0.0.1. Set `0.0.0.0` behind the provider ingress | Safe literal for exposed container binding; not the public DNS name |
| PORT | Positive integer 1–65535, default 3001 | Use provider-assigned port; do not assume default matches detection |
| CORS_ORIGINS | Comma-separated exact HTTPS origins, each trimmed, no wildcard/path/query/fragment/trailing slash/userinfo; must include PUBLIC_WEB_ORIGIN | Planned `https://revexoe.com`; add www only if separately approved and served |
| PUBLIC_FUNNEL_ORIGIN | Exact HTTPS origin, no path or trailing slash | Planned `https://api.revexoe.com`; owner confirms API domain/ingress |
| PUBLIC_WEB_ORIGIN | Exact HTTPS origin, no path or trailing slash | Planned `https://revexoe.com`; owner confirms web domain |
| AUTH_RECOVERY_URL | Exactly PUBLIC_WEB_ORIGIN followed by `/recover` | With planned domain: `https://revexoe.com/recover` |
| DB_HOST | Nonempty, not REPLACE_WITH_; verified TLS additionally requires DNS characters A–Z/a–z/0–9/dot/hyphen and refuses IP literals | Provider must supply TLS-capable DB DNS endpoint whose certificate SAN matches; do not substitute IP/localhost |
| DB_PORT | Positive integer 1–65535; default 3306 | Provider supplies actual port |
| DB_NAME | Nonempty, not REPLACE_WITH_ | Provider/owner supplies exact existing application schema; no migration implied |
| DB_USER | Nonempty, not REPLACE_WITH_ | Separately provisioned runtime account with reviewed table DML only; not migration/admin user |
| DB_PASSWORD | Nonempty, not REPLACE_WITH_; production at least 16 characters and at least 8 distinct characters | Provider-approved runtime credential; private, never in Git/logs/reports |
| DB_CONNECTION_LIMIT | Optional positive integer 1–50, default 5 | Default 5 is code configuration, not proven provider capacity; operator reviews account budget |
| DB_TLS_MODE | `required`; omitted defaults required in production. `disabled` rejected | Safe literal `required`; never disable |
| DB_TLS_CA_FILE | Nonempty path to readable trusted PEM CA file inside backend runtime | Provider CA plus operator-selected absolute persistent path; see below |
| DB_TLS_CA_SHA256 | Exactly 64 hex characters, case-insensitive, digest of exact PEM file bytes | Independently approved trust-material fingerprint; no spaces/colon prefix |
| AUTH_ACCESS_SECRET | Canonical standard base64 decoding to 32–128 bytes, at least 16 distinct decoded byte values; re-encoding must equal input | Owner/security operator generates independent random key; not hex, URL-safe base64, JWT string or passphrase |
| AUTH_MFA_KEY | Same canonical/byte-diversity check, exactly 32 decoded bytes, different from AUTH_ACCESS_SECRET | Existing encrypted MFA data requires its existing matching key; generate only for authorized first setup, never replace to fix startup |
| AUTH_SMTP_HOST | Nonempty string matching letters/digits/dot/hyphen | Provider SMTP endpoint, not a URL; no smtp:// prefix |
| AUTH_SMTP_PORT | Required positive integer 1–65535 | Provider port; 465 defaults implicit TLS, 587 defaults STARTTLS |
| AUTH_SMTP_USER | Nonempty | Provider-issued mailbox/SMTP username; may be full address, do not assume |
| AUTH_SMTP_PASSWORD | Nonempty, not REPLACE_WITH_; production at least 16 characters and 8 distinct characters | Provider-issued compatible credential; do not pad/change it locally to pass validation |
| AUTH_MAIL_FROM | Bare valid email address; display-name syntax is not accepted | Provider-approved sender address, owner/provider supply |

The 14 names in the supplied error are not the entire configuration contract.
DB identity/password, NODE_ENV, HOST and PORT also need the correct values above.
The absence of a name from that error does not verify its actual endpoint, grants,
certificate handshake, secret custody or provider functionality.

## Optional SMTP configuration

| Variable | Exact format / behavior |
| --- | --- |
| AUTH_SMTP_SECURITY | `implicit` or `starttls`; default implicit only on 465, starttls only on 587. Other ports require explicit mode; match provider transport |
| AUTH_SMTP_TLS_SERVERNAME | Optional letters/digits/dot/hyphen DNS certificate identity; use only provider-reviewed identity when a separate connect address requires it |
| AUTH_SMTP_CA_FILE | Optional readable PEM CA path, paired with hash below; only for approved private CA |
| AUTH_SMTP_CA_SHA256 | Optional 64 hex SHA-256 of exact CA bytes, paired with file above |

Normally omit both SMTP CA variables and use Node/OS trusted roots. Setting either
activates the same strict CA loader as DB TLS, so both must then be correct. SMTP
always uses requireTLS, rejectUnauthorized and minimum TLS 1.2. Do not add
NODE_TLS_REJECT_UNAUTHORIZED=0 or any certificate bypass. Custom servername does
not waive certificate verification. Do not guess SMTP mode from an arbitrary port.

Ask the provider to confirm outbound TCP access, host/port/mode, username/password,
permitted sender and sender-domain SPF/DKIM/DMARC. If its credential fails the local
strength check, request a suitable provider credential; do not weaken validation.
SMTP is mandatory for production even though it is not contacted during startup.
Timeouts are 10 seconds for connection/greeting and 15 seconds for socket activity;
these are explicit SMTP operations, not startup listen waits.

In a separately approved protected operator environment, after configuring variables:

```sh
node dist/auth/smtp-cli.js
```

Run from backend after building. Or `npm run smtp:verify` builds then runs that CLI.
It reads process environment only, does not load .env, touch DB or send email.
A successful result says connection/TLS/authentication verified and mailbox delivery
unverified. Actual invitation/recovery delivery needs separate authorized synthetic
recipient and inbox checks. Do not enable transport debug or paste raw provider errors.

## Upload and verify the database CA certificate

1. Obtain the DB TLS root/intermediate CA PEM bundle and expected integrity evidence
   from an independently authenticated provider/security source. Do not download an
   arbitrary presented leaf certificate and promote it to trusted CA. Provider must
   confirm TLS support and the DNS name on its database server certificate. If this
   hosting product does not offer these, stop and escalate the deployment requirement.
2. Upload the exact PEM bytes through an approved secure file/secret-file mechanism,
   outside any frontend/public/static directory and outside Git. Use a persistent
   backend-readable absolute path selected by the provider operator. No private
   certificate key is required by this implementation (server-authenticated TLS).
3. Restrict modification to the deployment/security operator; grant the backend
   process read access. On POSIX an owner-readable 0600 file or reviewed group-readable
   0640 arrangement is appropriate; verify actual process UID/group. Do not blindly
   use a private home path inaccessible inside the running container. Keep trust
   material available across restarts/releases and confirm mounted path mapping.
4. Compute SHA-256 of the exact uploaded file bytes on both source and runtime host:

```powershell
(Get-FileHash -LiteralPath '<approved-local-CA-path>' -Algorithm SHA256).Hash.ToLowerInvariant()
```

```sh
sha256sum -- '<approved-runtime-CA-path>'
# Alternative: openssl dgst -sha256 '<approved-runtime-CA-path>'
```

   Replace angle-bracket paths; they are placeholders, not usable settings. Copy only
   the 64 hex digest, not filename, algorithm label, whitespace or colons. This is a
   **file-byte** hash, not the X.509 DER certificate fingerprint from `openssl x509`.
   Windows line-ending conversion or adding a final newline changes this hash.
5. Compare both hashes with the independently approved exact-file digest. Merely
   computing the hash of an untrusted file does not establish trust. If distribution
   differs in encoding, have security approve the exact bundle bytes before pinning.
6. Set DB_TLS_CA_FILE to the actual absolute runtime path and DB_TLS_CA_SHA256 to its
   approved digest. The loader checks PEM certificate marker, SHA-256 and secure
   context parsing before listening. Chain/hostname/expiry/DB handshake are checked
   only when a DB connection is made, e.g. readiness. Preserve rejectUnauthorized,
   verifyIdentity and TLS 1.2 minimum. CA replacement requires a reviewed trust change.

`Invalid approved TLS CA configuration` is intentionally generic: check existence,
permissions/runtime mount, bytes/hash and PEM parsing without logging credentials.
It may refer to DB CA or optional SMTP CA; inspect which startup stage/config applies.

## Authentication secret generation and preservation

Do not generate production values in source, CI logs, shell history or this report.
Existing deployments must recover the existing approved keys from protected custody.
Changing the access signing key invalidates old access-token signatures; it does not
itself revoke stored opaque refresh sessions. Changing the MFA key without reviewed
reencryption makes enrolled ciphertext unreadable. Follow secret-rotation-runbook.md;
never create replacement keys merely to make this error disappear.

For an authorized **first setup**, use a trusted secret-manager cryptographic generator
or run this once on a trusted workstation. It generates two independent 32-byte
keys directly into a new private JSON file, refuses overwriting an existing file,
and prints no key values. Replace the path first. This is a generation procedure,
not a committed script or an action performed by this investigation:

```javascript
// Save as a .cjs file; run only in an approved private workspace outside Git.
const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
writeFileSync('/absolute/private/new-auth-secrets.json', JSON.stringify({
  AUTH_ACCESS_SECRET: randomBytes(32).toString('base64'),
  AUTH_MFA_KEY: randomBytes(32).toString('base64')
}), { flag: 'wx', mode: 0o600 });
```

On Windows, restrict the parent directory ACL before generation and verify the
resulting file ACL; POSIX mode does not configure Windows ACLs. Transfer through the approved secret manager into backend environment,
verify privately, preserve encrypted backup/key custody, and remove transient copies
according to approved secret handling. Never paste the resulting file into chat.
32 random bytes normally encode as 44 standard-base64 characters including `=`;
length alone is insufficient. No AUTH_REFRESH_SECRET exists: refresh tokens are
opaque stored hashes, not separately signed JWTs. Do not add invented signing keys.

## Optional integrations: all-or-nothing groups

Neither group is required to listen. Leave the **whole group absent** while disabled,
not empty strings/placeholder fragments. Any supplied group member triggers parsing.
No real provider operation was verified by this investigation.

| Group | Exact code contract / owner input |
| --- | --- |
| Claude | ANTHROPIC_API_KEY 20–512 characters; ANTHROPIC_MODEL matching `^claude-[a-zA-Z0-9.-]+$`; ANTHROPIC_API_VERSION matching `^20[0-9]{2}-[0-9]{2}-[0-9]{2}$`; AI_MAX_OUTPUT_TOKENS integer 64–4096. Optional ANTHROPIC_FALLBACK_MODEL same model format. REPLACE_WITH_ strings refuse. Regex checks do not establish supported model/date or entitlement; owner/provider supplies approved exact values |
| Razorpay | RAZORPAY_MODE test/live; RAZORPAY_KEY_ID `rzp_test_` or `rzp_live_` followed by alphanumerics, matching mode; RAZORPAY_KEY_SECRET 20–256 characters; RAZORPAY_WEBHOOK_SECRET 32–256 characters and different from key secret. Live construction additionally checks BILLING_LIVE_APPROVAL equals OWNER_APPROVED_LIVE_BILLING. This legacy construction gate is not financial authorization: **do not set it now**; Task 22 financial hold remains unconditional |

Paid activation, checkout, collection/settlement, refunds, credit notes, GST invoice
issuance and dunning remain disabled pending the previously recorded written approvals.
Do not enable payment variables as a proposed startup workaround. No price/quota/rate
is authorized here. Migration/backup/bootstrap operator secrets do not belong in API
runtime. Refer to their separate runbooks; this startup investigation runs none.

Frontend is a separate process/build: VITE_API_URL is public and the planned value is
`https://api.revexoe.com/api/v1`; set before frontend build. Never prefix backend keys
with VITE_. The root frontend server and backend/dist/server.js are different entrypoints.

## Three-second detection and correct process configuration

Start the prebuilt backend, not a compiler/watch process or frontend server. With
backend as application working directory, use `node dist/server.js` (equivalently
backend `npm start`). With repository root as working directory, use
`node backend/dist/server.js` or the correctly scoped backend start command.
The backend package `prepare` builds on installation; install/build must complete
in the build phase, before the provider starts its listen timer. Do not run `npm ci`,
TypeScript build, migrations or smtp:verify in the runtime startup command.
Use provider Node 24.x and compatible native Argon2 dependencies built for its OS.
Bind 0.0.0.0 and the assigned PORT. Do not invent a fixed port or health path.

Five local Windows Node 24.14.0 launches of the actual compiled entrypoint with
valid ephemeral synthetic production configuration reached the listening callback
in **440, 476, 509, 547 and 574 ms** from child spawn. Each then returned liveness
200 without database/SMTP availability. The local fixture used only loopback and
example.invalid origins, a temporary test CA and discarded random credentials;
it did not load a real environment file. These measurements are not Hostinger
cold-start, proxy or Linux/native-dependency verification.

**Conclusion:** the sequence is structurally compatible with a 3-second TCP/listen
or `/health/live` detection after a prebuilt process starts. No deliberate network
wait precedes listen. Compatibility on actual hosting is unverified, not guaranteed.
The supplied attempt fails earlier at validation, so it does not demonstrate an
independent timeout problem. After fixing configuration, capture timestamped
secret-free process-start, listening-callback and provider-probe evidence if it persists.
Confirm whether the provider timer includes npm wrapper/install/build, and whether
its detection is port-open, a root request, liveness or database readiness. Root `/`
is not the API health endpoint and returns 404. No provider-setting change was made.

`/health/ready` can wait up to **4000 ms**; connection timeout and query timeout are
3000 ms each, with a 4000-ms overall response race. A strict three-second readiness
HTTP deadline is therefore **not guaranteed compatible** with the current contract.
Use liveness/port detection for process startup if supported, and a separate readiness
probe with a timeout above four seconds plus ingress margin and reviewed startup grace.
Never route business traffic based solely on liveness. If the provider only supports
a fixed shorter readiness deadline, its product/probe contract needs resolution;
do not remove TLS, validation or database readiness to satisfy the timer.

## Verify startup and health without changing data

In the separately authorized runtime/probe context (not executed against production
here), verify the listening log first. A listening log means only the HTTP bind
succeeded. Preserve startup errors exactly with values redacted; never dump printenv.

```sh
curl --fail --silent --show-error --max-time 2 https://api.revexoe.com/health/live
curl --fail --silent --show-error --max-time 6 https://api.revexoe.com/health/ready
```

These URLs are planned domain examples, not proof DNS/ingress exists. Paths are
`/health/live` and `/health/ready`, **without `/api/v1`**. Proxy must forward them to
the backend with no redirect/login dependency; validate its routing separately.

- Live: HTTP 200, `{"status":"alive"}`; no database query. No-store response.
- Ready: HTTP 200, `{"status":"ready","database":"up"}` only after SELECT 1.
- DB failure: HTTP 503, `{"status":"not_ready","database":"unavailable"}`.
- During draining: HTTP 503, database unchecked (or up if a probe completed while
  shutdown began). Server closes/drains with a 10-second application deadline.
- Ready does not verify schema versions, table privileges, triggers, SMTP, AI,
  billing, Google, MFA custody or application acceptance. Use their separate approved
  non-mutating checks; do not automatically migrate when readiness fails.

## Exact owner/provider information still required

1. Confirm the planned web/API HTTPS domains, exact CORS origins and /recover route.
   Those give the four directly derived origin/recovery values in the reported error.
2. Supply the actual backend provider PORT/entrypoint/working directory/Node runtime
   and the precise three-second probe semantics; confirm exposed HOST binding.
3. Supply DB DNS endpoint, port, schema name, restricted runtime username/password,
   TLS support/certificate DNS identity, trusted CA PEM and independently approved
   exact-file SHA-256. Operator supplies the persistent runtime file path/read access.
4. Recover/provision AUTH_ACCESS_SECRET and matching existing AUTH_MFA_KEY through
   approved private custody. No existing encrypted data may be overwritten or keys
   silently replaced. Values cannot be inferred from source or reported errors.
5. Supply SMTP host, port/security mode, username, compatible private password and
   approved bare sender email; optional approved CA/servername only if necessary.
6. Optional AI model/version/token cap/account credentials await owner/provider input.
   Financial configuration/operations remain under the existing owner approval hold.

No actual credential, certificate digest, provider hostname, runtime path or secret
value is invented by this guide. The planned public domains and safe literal settings
are the only directly reusable examples, subject to owner/provider confirmation.

## Local validation evidence

Existing test/check reruns on 2026-11-06:

| Command | Actual result |
| --- | --- |
| npm --prefix backend test | 45 passed, no failures/skips |
| npm --prefix backend run test:integration | 185 passed, no failures/skips; disposable MariaDB 11.8.9, including TLS/SMTP, MFA and concurrency |
| npm test | 29 passed |
| npm run test:e2e:real | 13 passed, actual local stack |
| npm run test:browser | 8 passed, browser fixtures |
| npm run test:server | 1 passed |
| npm run typecheck; npm --prefix backend run typecheck | Both passed |
| npm run build; backend build included in backend test/E2E | Both passed |
| npm run lint | Passed |
| git diff --check; new-guide whitespace check | Passed |

Total 281 tests, including node:test parents; the five startup measurements are
additional diagnostics, not counted as test cases. Local logs are ignored under
.tmp-frontend/hostinger-startup/. Test adapters, local TLS/SMTP and synthetic
providers do not verify external services. No application code or security control
was changed. Complete tracked-work inventory for this investigation: this new guide
only. Existing environment files were not read or modified, and no production
secrets were generated. No deployment success is claimed.

## 2026-11-07 startup audit addendum

The later supplied logs name DB_TLS_CA_FILE, DB_TLS_CA_SHA256, AUTH_ACCESS_SECRET
and AUTH_MFA_KEY. They still fail before listen. The provided DB target 127.0.0.1
is separately blocked by verified-TLS DNS identity policy; trusted provider CA/DNS
support is not confirmed. Do not disable verification or invent a replacement CA.

New /health and /ready aliases retain /health/live and /health/ready. Production
readiness additionally refuses missing authentication dependency in an embedded app;
actual server startup still validates keys/CA/SMTP before listen. Fixed safe TLS
readiness diagnostics now distinguish identity, expiry and common trust-chain codes.
No production startup success is established by these changes. See
[backend audit](../../reports/BACKEND_AUDIT.md),
[deployment handoff](../../reports/HOSTINGER_DEPLOYMENT.md),
[completion status](../../reports/PROJECT_COMPLETION_STATUS.md) and
[pending tasks](../../reports/PENDING_TASKS.md) for current evidence/results.

## Secure operator tools follow-up (2026-11-07)

See the [hPanel checklist](hostinger-hpanel-deployment-checklist.md) for current
panel steps, exact variable formats, first-setup file-only key generation and the
explicit read-only DB diagnostic. Both are manual operator tools, not startup tasks.
IP-SAN certificates do not override the current DNS-only DB_HOST policy. Provider
engine/version and TLS identity remain unverified; no production action occurred.
