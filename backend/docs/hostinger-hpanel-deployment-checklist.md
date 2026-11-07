# Hostinger hPanel secure deployment checklist

2026-11-07. Follow-up to the completed backend audit, not a repeat audit or a claim
of deployment. No production connection, credential generation/rotation, settings
change, email, database mutation or deployment occurred. Existing startup and TLS
policy remain unchanged. Stop at unresolved prerequisites; these are unexecuted
operator instructions.

## 1. Resolve prerequisites before applying settings

- [ ] Owner confirms api.revexoe.com and revexoe.com, exact CORS origins and recovery route.
- [ ] Hostinger confirms the actual engine/version: this release's migration and
  diagnostic compatibility contract is **MariaDB 11.8.x**, locally tested on 11.8.9.
  ?MySQL-compatible? alone is insufficient; do not substitute MySQL or another series.
- [ ] Hostinger provides a supported DB DNS endpoint, TLS port, certificate identity,
  trusted CA chain/exact-file integrity evidence, and outbound/runtime access.
- [ ] Operator uploads that exact PEM file outside Git/public/dist directories into a
  persistent backend-readable mount/path. Obtain the real runtime absolute path;
  hPanel environment variables do not upload certificate files. Ask support how the
  managed build/runtime mount maps if not documented. No invented path is supplied.
- [ ] Compute and compare the exact CA file-byte SHA-256 on workstation and runtime
  with independently approved trust evidence. Windows: Get-FileHash -Algorithm SHA256;
  Linux: sha256sum. Copy only 64 hex characters. See setup guide for full commands.
- [ ] Recover the existing signing/MFA keys if accounts or MFA data already exist.
  First-setup generation below is not rotation or permission to overwrite keys.
- [ ] Owner/provider supplies restricted runtime DB credentials and approved SMTP
  account/sender. Credentials stay in protected custody, never chat/screenshots/Git.

## 2. hPanel environment settings

Hostinger's current instructions: open the website dashboard, choose **Environment
variables**, add/edit key-value entries, then **Apply changes**. Runtime settings
are read on process restart; build-time VITE_ changes require rebuilding/redeploying.
Do not assume a saved row is active in the current process; verify redacted logs.
[Official environment-variable procedure](https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/).

- [ ] Select **api.revexoe.com** (backend), not the frontend website.
- [ ] Prepare all required settings below before owner-approved Apply changes/restart.
- [ ] Enter exact names and unquoted single-line values. Check all pages of the list;
  masked values prove only row presence. Keep protected backups outside Git.
- [ ] Do not upload a production .env into the repository: production uses process env.
- [ ] Set NODE_ENV=production, HOST=0.0.0.0, DB_TLS_MODE=required. Use the provider's
  assigned PORT, never an invented port. Safe code default connection limit is 5;
  provider account capacity must still be reviewed.

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


AUTH_ACCESS_SECRET and AUTH_MFA_KEY must decode to independent random keys. The new
first-setup generator emits exactly 32 bytes each, canonical standard base64 (44
characters with padding), and checks runtime byte-diversity/independence constraints.
DB/SMTP passwords must be actual provider credentials; never pad or modify them
locally to pass strength checks. If incompatible, ask the provider for suitable ones.
No AUTH_REFRESH_SECRET exists: refresh tokens are opaque hashes.

### Optional settings

| Variable | Exact format / behavior |
| --- | --- |
| AUTH_SMTP_SECURITY | `implicit` or `starttls`; default implicit only on 465, starttls only on 587. Other ports require explicit mode; match provider transport |
| AUTH_SMTP_TLS_SERVERNAME | Optional letters/digits/dot/hyphen DNS certificate identity; use only provider-reviewed identity when a separate connect address requires it |
| AUTH_SMTP_CA_FILE | Optional readable PEM CA path, paired with hash below; only for approved private CA |
| AUTH_SMTP_CA_SHA256 | Optional 64 hex SHA-256 of exact CA bytes, paired with file above |


Leave private SMTP CA fields absent unless the provider explicitly requires a private
trust bundle. Never disable chain verification. Optional ANTHROPIC_API_KEY,
ANTHROPIC_MODEL, ANTHROPIC_API_VERSION, AI_MAX_OUTPUT_TOKENS and optional
ANTHROPIC_FALLBACK_MODEL are an all-or-nothing configured group, with exact formats
in the existing setup guide. No real AI configuration is needed to start the listener.
Leave the entire RAZORPAY_MODE/KEY_ID/KEY_SECRET/WEBHOOK_SECRET group absent while
unavailable. Do not set BILLING_LIVE_APPROVAL to bypass a startup error or lift the
Task 22 unconditional financial hold. Operator migration/bootstrap/backup credentials
do not belong in the API process.

## 3. First-setup authentication key command

Node24 is required. Create a private directory **outside every Git repository** first.
On Windows, configure/review the parent ACL to grant only the intended owner and
necessary administrators; the utility cannot infer that ACL from POSIX mode bits.
On POSIX create the directory with mode 0700. The directory must already exist.

From repository root, replace the sample path with that private directory:

~~~powershell
node backend/scripts/generate-auth-secrets.mjs --first-setup --private-directory-reviewed --output "C:\private-secrets\revexoe-auth.json"
~~~

POSIX equivalent:

~~~sh
node backend/scripts/generate-auth-secrets.mjs --first-setup --private-directory-reviewed --output /absolute/private/revexoe-auth.json
~~~

The utility requires both explicit acknowledgements and absolute output, refuses
output inside this repository (including resolved parent symlinks), refuses existing
files, uses exclusive creation/0600 mode, verifies POSIX parent privacy, and prints
only a fixed success/failure message. It generates the two keys in a private JSON
file; read it only in a private local editor/secret-manager workflow, copy each field
into the matching protected hPanel setting, and preserve approved encrypted custody.
Do not use Get-Content/cat to publish it in shared console/transcripts. A failed
write may leave a partial private file: review it privately; never overwrite/retry
blindly. Windows ACL review is an explicit operator responsibility, not a claimed
programmatic guarantee. No production key generation was executed by this task.

Existing enrolled MFA requires the existing matching AUTH_MFA_KEY. Changing the
JWT key invalidates signatures but does not automatically revoke DB refresh sessions.
Follow the rotation runbook for any separately approved rotation.

## 4. Exact database certificate requirements and IP-SAN decision

The CA loader reads exact PEM certificate bytes, checks their approved SHA-256 and
parses a TLS context. The pool requires rejectUnauthorized=true, verifyIdentity=true,
and TLS>=1.2. The server must present a currently valid chain anchored in that trust
bundle, with a certificate matching **DB_HOST** under Node's identity rules and
usable TLS server credentials/ciphers. Request the provider's explicit DNS SAN and
complete chain; Node's checker has its own SAN/CN fallback rules and this task does
not add a new CN-only exception or claim SAN-only enforcement already exists.
CA-file hash is not a DER certificate fingerprint. Website HTTPS CA/certificate is
not automatically a database trust bundle. No client private key/mTLS support is
configured in this pool.

**Current implementation requires a DNS hostname. It does not accept an IP address
as DB_HOST even if the certificate contains a correct IP-address SAN.** Node's generic
checker can match an IP SAN, but the installed mysql2 connection code sets servername
undefined for IP literals and conditions its explicit identity check on a string
servername. databaseTls therefore rejects IP literals before connecting. This task
preserves that policy. A DNS endpoint that resolves to a provider-approved address
may work only if its actual certificate matches and routing is supported; do not
invent a DNS alias, substitute localhost or edit hosts files to evade the blocker.

Hostinger's general Node/MySQL article recommends 127.0.0.1 and describes managed
MySQL offerings; it does **not** establish our required MariaDB version or verified
TLS trust/identity. That generic recipe cannot be applied unchanged to this backend.
[Official generic database guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).

Send support this precise request (no credentials):

> For this Cloud Startup Node24 application, please confirm the database engine and
> version and whether MariaDB 11.8.x is supported. Our mysql2 application requires
> verified TLS1.2+ with a DNS DB_HOST matching the server certificate. Please provide
> the supported endpoint/port, DNS SAN/chain details, trusted CA PEM bundle and
> independently authenticated exact-file SHA-256, renewal procedure, runtime network
> access and persistent CA-file mount instructions. The supplied 127.0.0.1 endpoint
> is rejected by our DNS identity policy. If unsupported on this product, confirm
> the limitation and supported secure alternative. Do not send passwords/private keys.

Until answered: **BLOCKED PRODUCTION DEPENDENCY**. Any future IP-SAN support would
require a separately reviewed driver/identity-verification change and real tests;
no such change or TLS weakening was made here.

## 5. Read-only database diagnostic

Build the backend in the approved build phase. In a separately authorized operator
shell with the **existing protected production environment injected**, run from root:

~~~sh
node backend/dist/db/diagnostic-cli.js --confirm-read-only
~~~

Or from backend: node dist/db/diagnostic-cli.js --confirm-read-only. Never put
credentials in command arguments, shell history, a committed environment file or
npm logging configuration. The utility requires NODE_ENV=production, the explicit
flag, full existing environment validation and auth/MFA/SMTP configuration validation.
It contacts no SMTP/AI/payment service and loads no .env in production.

It uses the same CA/hash/DNS/TLS pool policy, a single connection, bounded SQL query
and connect timeouts, checks a nonempty session TLS cipher, verifies the supported
MariaDB11.8 series and runs SELECT1. Statements are only SHOW SESSION STATUS and
SELECT; no migration, schema change, seed, data write or retry is performed.
Connections are released/destroyed and pool closed on success or failure. Normal
output contains fixed status/engine/series fields, never DB names, users, passwords,
raw TLS errors, certificate private material or SQL results. Known safe error codes
retain fixed explanations; unrecognized errors remain generic. Do not enable
NODE_DEBUG/mysql2 debug or dump environment variables when collecting evidence.

Expected success is JSON status=verified, encrypted=true, engine=MariaDB, series=11.8,
readOnlyProbe=true, schemaAndGrantsVerified=false. Exit0 is **connection evidence
only**, not production readiness. Exact schema/grants/definers still need separate
approved read-only operator review. Failure exits1; unsupported MySQL/version is
explicitly refused. Diagnostic was tested only against a disposable local server,
not production. Network/DNS scheduling can exceed individual timeouts; it is not a
three-second application startup command.

## 6. Hostinger Email SMTP steps

- [ ] hPanel **Emails** ? **Manage** beside the chosen domain ? **Connect Apps &
  Devices**. Retrieve the actual mailbox's outgoing server settings and confirm the
  email product; another provider/Titan requires its own settings.
- [ ] For **Hostinger Email**, official settings are smtp.hostinger.com, port465,
  implicit TLS; port587/STARTTLS is an alternative. Set AUTH_SMTP_SECURITY explicitly
  to implicit or starttls matching the selected port. This is not confirmation that
  the owner's mailbox exists or outbound SMTP is permitted from the app runtime.
- [ ] AUTH_SMTP_USER is the actual full mailbox address; AUTH_SMTP_PASSWORD is its
  existing private mailbox/app credential. AUTH_MAIL_FROM is the provider-approved
  bare sender address. Do not reset/create credentials as part of this handoff.
- [ ] Confirm SPF/DKIM/DMARC, approved sender and outbound465/587 access with provider.
- [ ] Set AUTH_RECOVERY_URL exactly to PUBLIC_WEB_ORIGIN + /recover.
- [ ] In an approved protected operator context run node backend/dist/auth/smtp-cli.js
  from root (or node dist/auth/smtp-cli.js from backend). It authenticates with verified
  TLS but sends no email and touches no DB. It does not load .env.
- [ ] Separately authorize a synthetic recipient invitation/recovery inbox test.
  SMTP acceptance/authentication does not prove inbox delivery; never retry blindly.

[Official Hostinger Email settings and panel path](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/).

## 7. Start and prove the right health contract

- [ ] Build with the backend package on provider-equivalent Node24/native Argon2 OS.
- [ ] Backend working directory: node dist/server.js; root working directory:
  node backend/dist/server.js. Root npm start serves the frontend. No build/install,
  SMTP verification, DB diagnostic or migration belongs in runtime startup command.
- [ ] On owner-approved apply/restart, inspect runtime logs for Backend listening;
  report redacted validation errors if absent. Do not deploy automatically here.
- [ ] GET /health (alias /health/live) must return200 status=alive without a DB query.
  Missing/invalid security configuration still prevents any listener from starting.
- [ ] GET /ready (alias /health/ready) returns200 only after successful database probe
  and startup security configuration with auth service present, and no shutdown.
  DB failure returns503; shutdown returns503. Its up-to-four-second response contract
  needs a separate probe deadline above four seconds plus ingress margin; it is not
  guaranteed to fit a strict three-second readiness deadline.
- [ ] Ready is **not** SMTP delivery, AI/provider availability, schema/grants, billing,
  legal acceptance, full application completion or production certification. SMTP
  startup validation is local configuration validation, not live reachability. These
  remaining checks are explicit below rather than hidden in process health.
- [ ] Confirm proxy paths (health has no /api/v1 prefix), assigned port, TLS domains,
  startup probe semantics, restart/drain grace and logs. Never route traffic based
  only on liveness, or claim successful deployment from an environment-variable row.

## 8. Remaining owner/provider/approval tasks

| Dependency | Required owner / evidence |
| --- | --- |
| Engine/version, TLS DNS identity/chain/CA/mount/access | Hostinger support, confirmed compatible service; current blocker |
| DB credential/account/grants/existing schema | Owner/DB operator, protected runtime values and read-only reviewed inventory; no migrations authorized |
| Auth keys and existing MFA ciphertext | Owner/security custody; first-setup versus rotation decision and approved secure storage |
| Mailbox/sender/outbound/DNS/inbox | Email/provider owner, protected credentials and separately authorized diagnostic/delivery |
| Runtime/port/probe/native dependency/ingress/drain | Hosting operator, actual dated staging evidence |
| Apply/restart/deployment/real diagnostics | Explicit operator authorization; none executed automatically |
| Commercial/legal/provider acceptance | Existing Task22 decisions unchanged; financial hold, Google/AI gaps, shared limits/offsite restore and full release acceptance remain |

See hostinger-deployment-tools-report.md for this task's exact changes and tests.
