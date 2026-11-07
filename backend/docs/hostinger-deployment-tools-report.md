# Secure Hostinger deployment tools follow-up

2026-11-07. Focused continuation of the completed backend audit. No repeated full
audit, listener rewrite, TLS policy change, production credential read/generation/
rotation, actual production diagnostic, deployment or real provider operation.
Official public Hostinger documentation was read; no authenticated panel was accessed.

## Delivered

- hPanel checklist with complete mandatory runtime variable table, exact validation,
  owner/provider versus safe settings, optional groups, actual panel/mail paths,
  CA mount/hash requirements and separately authorized apply/restart verification.
- File-only first-setup key generator using cryptographic randomBytes: independent
  canonical base64 32-byte keys, runtime byte-diversity checks, no stdout key values,
  exclusive new file with POSIX0600, outside current repo and canonical parent path,
  required private-directory acknowledgement and first-setup flag. POSIX parent
  permissions are checked; Windows ACL must be reviewed by operator before generation.
- Read-only DB diagnostic CLI requiring NODE_ENV=production, --confirm-read-only,
  full production validation plus JWT/MFA/SMTP local configuration checks before
  connecting. It shares the unchanged pool CA/hash/DNS/TLS policy; it reads only
  session cipher, server version and SELECT1. It refuses unencrypted sessions or
  unsupported engines/versions, closes connections/pool, and emits fixed sanitized
  JSON without credentials, server banners or certificate material. No SMTP call,
  migrations, data writes, arbitrary SQL, credentials in argv or retry loop.
- Current implementation explicitly remains DNS-only; an IP SAN that the generic
  Node checker can match does not override the application's IP-host refusal.

## Commands (operator only, not executed against production)

From repository root, after creating/reviewing the private directory outside Git:

~~~powershell
node backend/scripts/generate-auth-secrets.mjs --first-setup --private-directory-reviewed --output "C:\private-secrets\revexoe-auth.json"
~~~

Replace that sample path. Existing enrolled MFA requires the existing matching key;
this command is not a rotation workflow. Never publish the output JSON in terminal
transcripts, screenshots, chat or Git.

After building, with existing protected production environment injected and explicit
operator authorization:

~~~sh
node backend/dist/db/diagnostic-cli.js --confirm-read-only
node backend/dist/auth/smtp-cli.js
~~~

The second command verifies SMTP/TLS/auth only, sends no mail and touches no DB.
Neither is a startup command. The DB CLI deliberately requires complete production
settings, including auth/SMTP; it does not populate fake values to bypass validation.
Actual provider diagnostics and mailbox tests remain unexecuted dependencies.

## TLS conclusion and support dependency

pool.ts still rejects IP literals before connecting. Installed mysql2 sets TLS
servername undefined for IP hosts and gates its explicit identity check on a string
servername. This task does not change the driver or add IP-SAN support. Hostinger
must confirm actual engine/version (current release requires MariaDB11.8.x), supported
TLS DNS endpoint matching certificate identity, trusted CA chain/exact-file integrity,
renewal procedure, runtime network and readable persistent file mapping. General
Hostinger guidance for 127.0.0.1/MySQL is insufficient for this application; no claim
is made that Cloud Startup supports the required configuration. If not supported,
a separately reviewed hosting/database alternative is needed.

## Health meaning preserved

/health remains independent of DB availability after successful security validation.
/ready requires successful DB probe, constructed production auth dependency and no
shutdown. Readiness has a four-second response bound; a strict three-second readiness
probe is not guaranteed compatible. SMTP live availability, optional AI/payment,
schema/grants and legal/commercial acceptance are separate checks, not silently
certified by /ready. No server/app/pool/config validator change was needed in this task.

## Actual checks

| Check | Result |
| --- | --- |
| npm --prefix backend test | 56 passed; no failures/skips (4 new operator-tool unit tests) |
| npm --prefix backend run test:integration | 187 passed; no failures/skips, disposable MariaDB11.8.9 (2 new TLS diagnostic subtests) |
| npm --prefix backend run build | Passed, also repeated by test scripts |
| npm --prefix backend run typecheck | Passed |
| npm run lint | Passed |
| git diff --check / new-file whitespace checks | Passed |

**243 tests executed in this follow-up**, including node:test parents. Previous
full audit's 288 is historical evidence, not this run's count. Frontend/browser/E2E
were not rerun: frontend/listener/business paths did not change; relevant backend
unit/startup/MFA/TLS/SMTP/schema/quota/feedback concurrency/recovery suites all ran.
Test-only generated keys were ephemeral local fixtures, never production values,
and were not printed/committed. Successful DB CLI was run solely against a disposable
TLS server, with synthetic complete production settings and information_schema
selected. Failed credentials were checked for sanitized stderr/no stdout. No npm
install, new dependency, lockfile, SQL/migration manifest or business logic change.
Ignored local logs: .tmp-frontend/deployment-tools/.

## Complete files changed in this follow-up

Prior audit edits in .env.example/app.ts/startup.test.mjs/reports are preserved;
they were not re-authored here. The following nine files are this task's changes:

| File | Reason |
| --- | --- |
| [../scripts/generate-auth-secrets.mjs](../scripts/generate-auth-secrets.mjs) | New manual first-setup private file generator |
| [../src/db/diagnostic.ts](../src/db/diagnostic.ts) | New fixed read-only TLS/engine/connection diagnostic |
| [../src/db/diagnostic-cli.ts](../src/db/diagnostic-cli.ts) | New explicit production operator command with safe output |
| [../test/deployment-tools.test.mjs](../test/deployment-tools.test.mjs) | New format/privacy/overwrite/CLI/IP-SAN boundary tests |
| [../test/external.integration.mjs](../test/external.integration.mjs) | Extend existing real TLS fixture with function/CLI success and redaction tests |
| [hostinger-hpanel-deployment-checklist.md](hostinger-hpanel-deployment-checklist.md) | New exact operator checklist and support request |
| [hostinger-deployment-tools-report.md](hostinger-deployment-tools-report.md) | This task's evidence and inventory |
| [hostinger-environment-setup-guide.md](hostinger-environment-setup-guide.md) | Link current operator tools/checklist |
| [../../reports/HOSTINGER_DEPLOYMENT.md](../../reports/HOSTINGER_DEPLOYMENT.md) | Add focused follow-up pointer; preserve historical audit |

## Remaining blockers

Hostinger TLS/engine compatibility and mount/network/probe support; existing DB
account/schema/grants; protected keys/custody; actual mailbox/sender/outbound/DNS/
inbox verification; authorized staging apply/restart/diagnostics; shared ingress
limits/offsite restore and previously recorded commercial/legal/provider feature
acceptance. Financial execution remains held. **Not production ready; no deployment
success claimed.** See checklist for exact support/owner inputs and source links.
