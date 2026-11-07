# Production environment checklist for the current 503

2026-11-07. Use the api.revexoe.com backend process's protected environment.
No production values were read or changed. Latest supplied logs identify only
DB_TLS_CA_FILE/DB_TLS_CA_SHA256 as unmet; do not treat other values as validated.
The actual mounted files/injected environment cannot be inspected from source or
masked screenshots. Do not dump printenv or send secrets to this chat.

## Intended directly configurable values

These are the existing documented domain layout, not observations of actual DNS/
frontend/provider settings. Confirm approved canonical web origin before applying.

~~~dotenv
NODE_ENV=production
HOST=0.0.0.0
DB_TLS_MODE=required
PUBLIC_FUNNEL_ORIGIN=https://api.revexoe.com
PUBLIC_WEB_ORIGIN=https://revexoe.com
CORS_ORIGINS=https://revexoe.com
AUTH_RECOVERY_URL=https://revexoe.com/recover
~~~

Enter hPanel values without surrounding quotes, trailing slash on origins, newline
or whitespace in keys/hashes. No wildcard CORS or extra unapproved www origin.
PORT must be Hostinger's actual assigned HTTP port, not a guessed constant.
DB_CONNECTION_LIMIT may use code default5 (positive1?50), subject to replica/provider
capacity budget. This is not a commercial quota or claim of throughput readiness.

## Required operator/provider inputs and exact checks

| Key | Required value/validation | Current evidence / owner action |
| --- | --- | --- |
| PORT |Integer1?65535, actual provider assignment |No current setting supplied; verify hPanel/process contract |
| DB_HOST |Actual verified external writer DNS endpoint; ASCII letters/digits/dot/hyphen; no IP, URI or invented DNS alias |RDS endpoint unavailable; Hostinger local127.0.0.1 incompatible with policy |
| DB_PORT |Actual DB integer1?65535, independent of HTTP PORT |Provider supplies;3306 only if confirmed |
| DB_NAME |Actual full existing/restored approved schema, nonempty, not REPLACE_WITH_ |No production inventory supplied; do not seed/migrate automatically |
| DB_USER |Restricted runtime account nonempty, separate from migration/admin/restore users |Effective grants must pass reviewed runtime profile |
| DB_PASSWORD |Actual protected credential, >=16 characters, >=8 distinct characters, no placeholder |Not inspected; never pad/alter to satisfy validation |
| DB_TLS_CA_FILE |Readable approved PEM file path in persistent backend runtime; absolute path recommended |Latest log says unmet; actual path/file/mount not supplied. Provider must supply trust material; key alone does not upload a file |
| DB_TLS_CA_SHA256 |Exactly64 hex characters, SHA-256 of exact approved PEM bytes, case-insensitive |Latest log says unmet; cannot invent a hash or hash untrusted material as approval |
| AUTH_ACCESS_SECRET |Canonical standard base64, decoded32?128 bytes with >=16 distinct byte values |No longer listed by latest presence error, but decode/format and existing-key custody not verified |
| AUTH_MFA_KEY |Canonical base64 exactly32 decoded bytes, >=16 distinct bytes, different from access key; existing ciphertext needs matching original key |No later validation/decryption evidence; do not replace existing key to fix startup |
| AUTH_SMTP_HOST |Provider hostname matching letters/digits/dot/hyphen, not URL |Actual account/network settings not supplied |
| AUTH_SMTP_PORT |Provider integer1?65535;465 defaults implicit TLS,587 STARTTLS; custom port needs explicit mode |Owner/provider input, not an invented default |
| AUTH_SMTP_USER |Actual nonempty SMTP/mailbox username |Protected input |
| AUTH_SMTP_PASSWORD |Actual credential, >=16 characters and>=8 distinct characters |Protected input; request compatible provider credential if needed |
| AUTH_MAIL_FROM |Provider-approved bare valid email address |No invented mailbox/display-name address |

All origins must be exact HTTPS origins with no path/query/fragment/userinfo/trailing
slash. CORS_ORIGINS is comma-separated exact origins and must include PUBLIC_WEB_ORIGIN.
AUTH_RECOVERY_URL must exactly equal PUBLIC_WEB_ORIGIN + /recover. Existing environment
and key validators remain strict; no insecure startup option has been added.

## Optional groups (do not add partial placeholder configuration)

- AUTH_SMTP_SECURITY=implicit or starttls matching provider mode; required on custom
  ports. AUTH_SMTP_TLS_SERVERNAME only for approved certificate DNS identity. Optional
  AUTH_SMTP_CA_FILE plus AUTH_SMTP_CA_SHA256 must both be approved/exact if private
  trust is needed; otherwise omit both and retain verified normal trust roots.
- Claude group ANTHROPIC_API_KEY (20?512 chars), ANTHROPIC_MODEL (claude- plus allowed
  alphanumeric/dot/hyphen), ANTHROPIC_API_VERSION (YYYY-MM-DD-shaped20xx date),
  AI_MAX_OUTPUT_TOKENS integer64?4096; optional ANTHROPIC_FALLBACK_MODEL same format.
  Whole group absent if unavailable; malformed/partial group can fail startup later.
- RAZORPAY_MODE/KEY_ID/KEY_SECRET/WEBHOOK_SECRET require complete consistent provider
  configuration if present. No live approval flag or financial enablement is authorized.
  Current paid execution hold remains unconditional; do not configure payments as
  a workaround for DB startup. Exact formats remain in the existing setup guide.
- No separate refresh signing secret exists. Migration/bootstrap/backup credentials
  are separate operator processes; never add them to the API runtime as a fallback.

## Distinguish failure stages privately

| Error/evidence | Meaning and safe action |
| --- | --- |
| Missing or invalid production environment variables: CA pair |Current presence/placeholder gate fails before CA file access, assuming deployed code matches. Verify both rows exist and are injected into runtime, not just build configuration; confirm artifact parity |
| Missing or invalid environment variables: DB_TLS_CA_SHA256 |General format/schema gate can reject empty/non64-hex input before production-specific checks |
| Invalid approved TLS CA configuration |Later file/readability/hash/PEM-parse gate; inspect approved file mount/bytes/private permissions without logging contents |
| Verified database TLS requires a DNS hostname |IP DB_HOST cannot satisfy current policy, even with an IP SAN. Use approved external DNS/chain, not localhost/hosts-file trick |
| Invalid AUTH_ACCESS_SECRET / AUTH_MFA_KEY configuration |Later canonical base64/length/diversity/independence gate; recover correct existing values privately |
| Invalid authentication email configuration / custom SMTP mode error |Complete provider SMTP inputs and verified trust; do not bypass to start |
| Listening then readiness503 |Listener works; investigate safe DB diagnostics/network/TLS/account, separate from startup validation |

The latest error is not proof the file is merely unreadable: file loading has not
been reached in current source. Conversely, simply adding two rows does not establish
trusted TLS or an accessible RDS database. Only private operator evidence can resolve
missing/injection/format/file-stage details. Do not send actual values for diagnosis.

## Secure manual completion order

1. Confirm RDS MariaDB11.8 plan/region, supported external DNS/certificate chain,
   trusted CA bundle/renewal and independently authenticated exact-file integrity.
2. Obtain Hostinger outbound route/static egress or reviewed private route, persistent
   readable CA-file mapping, target firewall, actual account/schema and required grants.
3. Upload unchanged CA bytes outside public/dist/Git, compare approved hash on source
   and runtime. Windows Get-FileHash -Algorithm SHA256; runtime sha256sum. Use64-hex
   file hash, not a certificate DER fingerprint. No fabricated certificate/digest.
4. Recover existing access/MFA keys and private SMTP values. First-setup generation
   only if owner confirms no existing data/key identity must be preserved:

~~~powershell
node backend/scripts/generate-auth-secrets.mjs --first-setup --private-directory-reviewed --output "C:\private-secrets\revexoe-auth.json"
~~~

   Prepare/review private directory ACL outside Git first. Script refuses overwrite,
   writes private JSON and prints no key values; command was not executed for production.
5. Privately verify required environment rows, complete optional groups or omit them,
   then perform only separately authorized deployment/restart and DB verification.
   Existing read-only CLI node backend/dist/db/diagnostic-cli.js --confirm-read-only
   requires full valid production settings and verified target; it is not run here.
6. Verify SMTP separately via node backend/dist/auth/smtp-cli.js (no mail/DB) in an
   approved protected context. Inbox delivery requires separate synthetic-recipient
   approval. Missing SMTP/provider evidence does not justify weakening validation.
7. Collect artifact fingerprint/commit, listening log, expected HTTPS /health and
   /ready responses and actual target TLS/grants/schema evidence. Remain blocked until
   these pass; no deployment success inferred from UI rows or local tests.

The existing provider-independent worksheet reports/external-database.env.example
remains a placeholder reference, not a runnable production configuration. No filled
.env, credential, certificate or generated key is committed in this follow-up.
