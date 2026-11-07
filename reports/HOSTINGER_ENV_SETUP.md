> **2026-11-07 implementation update:** HOSTINGER_LOCAL is now implemented in the
> repository and tested against disposable local MariaDB. The review-only/unwired
> statements below describe the earlier proposal snapshot. Current behavior, exact
> settings and evidence: [implementation report](HOSTINGER_LOCAL_IMPLEMENTATION_REPORT.md)
> and [test report](HOSTINGER_LOCAL_TEST_REPORT.md). Owner approval covers repository
> implementation and local testing only. Hostinger activation, initialization and
> deployment remain unauthorized and unverified; no production 503 fix is claimed.

# Hostinger-only environment setup ? proposed values, NOT active

2026-11-07. Confirmed Node24/root backend/build npm run build/start npm start/API
api.revexoe.com/managed MariaDB127.0.0.1:3306. No production settings changed. The
current executable still requires verified production TLS and rejects HOSTINGER_LOCAL.
Do not enter/activate proposed local-mode values until owner approval and reviewed
runtime/operator integration. No AWS/external database is requested by this proposal.

## Known application settings (retain/confirm, not changed here)

~~~dotenv
NODE_ENV=production
HOST=0.0.0.0
PUBLIC_FUNNEL_ORIGIN=https://api.revexoe.com
PUBLIC_WEB_ORIGIN=https://revexoe.com
CORS_ORIGINS=https://revexoe.com
AUTH_RECOVERY_URL=https://revexoe.com/recover
~~~

Origins have no trailing slash/path/query/fragment/userinfo. Confirm canonical web
origin matches the actual served frontend; no unapproved wildcard/www origin.
HTTP PORT is Hostinger-assigned, integer1?65535 and distinct from DB_PORT3306.
DB_CONNECTION_LIMIT defaults5, optional integer1?50 with provider budget review.

## Proposed database local-mode configuration (REVIEW ONLY)

| Variable | Proposed exact requirement after approval | Current activation status |
| --- | --- | --- |
| DB_TLS_MODE |HOSTINGER_LOCAL, exact case |Rejected by current production enum; not activated |
| DB_HOST |127.0.0.1, exact literal |Only proposed approved local branch may accept it without TLS |
| DB_PORT |3306, exact canonical string |No alternative port, shorthand or default inference in candidate |
| DB_NAME |Actual complete existing empty Hostinger schema name, nonempty, no REPLACE_WITH_ |Operator supplies privately; no schema is inferred/deleted |
| DB_USER |Actual restricted application account, separate from migration/bootstrap/admin |Owner/provider supplies and verifies effective grants |
| DB_PASSWORD |Real credential, >=16 characters and>=8 distinct characters; no placeholder |Never invent, pad, print, commit or overwrite |
| HOSTINGER_LOCAL_APPROVAL |I_ACCEPT_UNENCRYPTED_LOOPBACK_DATABASE_TRANSPORT |Review acknowledgement only; cannot enable current runtime |
| HOSTINGER_LOCAL_APPROVAL_ID |Actual reviewed change/approval record,8?80 chars, initial alphanumeric then alphanumeric/dot/underscore/hyphen |No production reference supplied or invented; tests use synthetic references |
| DB_TLS_CA_FILE |Must be unset/absent in proposed local mode |Do not remove existing production values now; post-approval atomic configuration change only |
| DB_TLS_CA_SHA256 |Must be unset/absent in proposed local mode |No empty/dummy/placeholder hash; no fabricated CA |

Mixed CA/local settings must fail. In every other production mode leave default
required TLS and genuine approved CA file/hash checks unchanged. DB_TLS_MODE=disabled
remains forbidden in production. No approval string silently changes the transport.
Current no-CA startup remains blocked: removing CA requirements in live code is
not part of this review-only deliverable.

## Authentication, MFA and SMTP remain mandatory

| Variable | Unchanged production validation |
| --- | --- |
| AUTH_ACCESS_SECRET |Canonical standard base64,32?128 decoded bytes,>=16 distinct byte values |
| AUTH_MFA_KEY |Canonical standard base64 exactly32 decoded bytes,>=16 distinct byte values, independent of access key; must match any existing MFA ciphertext |
| AUTH_SMTP_HOST |Provider-approved hostname, letters/digits/dot/hyphen, not URL |
| AUTH_SMTP_PORT |Provider-confirmed integer1?65535;465 implicit TLS default or587 STARTTLS default |
| AUTH_SMTP_USER |Actual nonempty SMTP username/mailbox |
| AUTH_SMTP_PASSWORD |Real protected credential,>=16 chars and>=8 distinct chars |
| AUTH_MAIL_FROM |Approved bare valid sender email |
| AUTH_RECOVERY_URL |Exactly PUBLIC_WEB_ORIGIN + /recover |

AUTH_SMTP_SECURITY may be explicit implicit/starttls; custom ports require it.
Optional AUTH_SMTP_CA_FILE/SHA256 remain paired approved private trust settings;
AUTH_SMTP_TLS_SERVERNAME only for provider-confirmed identity. SMTP verified TLS
and public HTTPS/CORS are never disabled by the database proposal. Retain existing
keys/credentials privately. No refresh signing secret exists. Local DB transport
approval is not authentication/MFA or email-delivery approval.

The first-setup secret file utility remains available under separate first-setup
approval; no key generation/rotation was executed here. Existing keys need preservation,
not replacement merely to start a local DB mode. Never add partial optional Claude/
Razorpay placeholder groups; existing startup validation and financial holds remain.

## Separate future migration operator inputs

Migration credentials remain MIGRATION_DB_USER/MIGRATION_DB_PASSWORD, not app fallback.
Private target JSON must name production, exact127.0.0.1:3306, actual schema,
@@hostname, expected migration account and approved trigger definers, plus the future
explicit local transport marker/reference. Never use environment=local or a disposable
test-schema prefix to evade production safeguards. Current strict target parser
rejects this production IP/no-CA combination; no activation-ready target file was
created. A reviewed policy extension is required after owner approval.

Approval artifacts must bind the exact target, account, grants, shape, manifest and
transport/reference with a fresh expiry. Production apply still requires independent
explicit confirmation/audit output. Bootstrap credentials/owner identity/password
are a later separate operator action, not environment needed to bind the HTTP listener.

## Manual hPanel actions only after explicit approval

Select api.revexoe.com backend, confirm Node24/root backend/build/start, then review
complete protected values. Apply local-mode transport settings and removal of CA pair
only in the same authorized rollout after the approved code exists. Confirm actual
runtime injection and all pages of variable names without revealing values. Do not
put local flags into the current build and expect them to work, and do not switch
NODE_ENV to development/test. No settings, credentials or files were uploaded here.
