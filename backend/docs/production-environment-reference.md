# Production environment reference — Task 19

Prepared 2026-11-05. These are configuration instructions, not changes to a live
environment. Never paste credentials into this document, source, chat or commands.

| Process / phase | Variables and requirements |
| --- | --- |
| Frontend build | `VITE_API_URL=https://api.revexoe.com/api/v1`. Required before `npm ci` because prepare builds. HTTPS `/api/v1`, no userinfo/query/fragment. Other `VITE_*` names are refused to reduce accidental secret publication. Every Vite value is public. |
| Frontend runtime | `NODE_ENV=production`, `HOST=0.0.0.0`, provider-assigned positive `PORT`. Runs `node server.mjs`, serves `dist`; reads public `dist/deployment.json` for exact CSP API origin. Changing API location requires rebuilding, not just restarting. |
| API runtime | `NODE_ENV=production`, `HOST=0.0.0.0`, provider-assigned `PORT`, `CORS_ORIGINS=https://revexoe.com`. Exact origins only; add www only after separately approving its DNS/HTTPS. No wildcard. |
| Database runtime | `DB_HOST`, `DB_PORT` (default 3306), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_CONNECTION_LIMIT` (default 5, max 50). Independent application account with the exact table DML profile in database-privilege-matrix.md. Production passwords need >=16 characters and >=8 distinct characters; validation cannot prove entropy. |
| Database TLS | `DB_TLS_MODE=required` (production default; disabled is rejected), `DB_TLS_CA_FILE`, `DB_TLS_CA_SHA256` (SHA-256 of exact PEM bytes). DNS DB_HOST must match certificate SAN; IP literals refused because mysql2 skips its explicit identity check for them. CA checksum comes from an independently approved trust source. No certificate-verification disable switch. Minimum TLS 1.2. |
| API authentication | `AUTH_ACCESS_SECRET`: canonical base64 of independently generated 32–128 random bytes. `AUTH_MFA_KEY`: separate canonical base64 of exactly 32 random bytes. Existing validators reject short/repetitive/equal keys. Both mandatory in production. Opaque refresh credentials have no signing secret. |
| Public navigation | `PUBLIC_FUNNEL_ORIGIN=https://api.revexoe.com`, `PUBLIC_WEB_ORIGIN=https://revexoe.com`. Exact HTTPS origins, no path/trailing slash/userinfo. Short links address API `/api/v1/public/funnels/:code`, which negotiates JSON versus HTML navigation to the web funnel. |
| SMTP | `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USER`, `AUTH_SMTP_PASSWORD`, `AUTH_MAIL_FROM`, `AUTH_RECOVERY_URL=https://revexoe.com/recover`. Production requires complete configuration and a password with >=16 characters and >=8 distinct characters; sender must be provider-approved. Optional `AUTH_SMTP_SECURITY=implicit` (465 default) or `starttls` (587 default); custom ports require explicit mode. Always verified TLS, minimum 1.2. |
| SMTP trust | Default OS/Node trusted roots. Optional `AUTH_SMTP_CA_FILE` plus `AUTH_SMTP_CA_SHA256` pins private CA bytes. Optional `AUTH_SMTP_TLS_SERVERNAME` sets the reviewed certificate DNS identity when connecting through an approved address; never a way to bypass validation. |
| Migration operator | Separate private target JSON and `MIGRATION_DB_USER`, `MIGRATION_DB_PASSWORD`; no app credential fallback. Use production-migration-runbook.md and exact migration privilege profile. Target policy has independent CA path/hash, host/schema/server/account expectations and explicit environment. |
| Backup operator | Separate `RECOVERY_DB_USER`, `RECOVERY_DB_PASSWORD`, `BACKUP_ENCRYPTION_KEY` (canonical base64, independent 32 random bytes), `BACKUP_KEY_ID` (non-secret version). Private target/output/native-client paths and explicit commands in disaster-recovery-runbook.md. Shipped executor accepts disposable local targets only. Never add these secrets to frontend or API runtime. |

`loadEnv` loads backend/.env only in local development, not test/production.
Production configuration comes from the process manager's protected environment.
Malformed core configuration fails before listening; JWT/MFA/SMTP validation also
runs before listening. DB reachability and certificate handshake are readiness
checks, not startup connectivity guarantees. SMTP is never contacted automatically
at startup. Health endpoints expose fixed statuses, never environment values.

Safe examples live in root `.env.example` and backend `.env.example`. They are
templates, not production files. Provision secrets with a protected secret manager;
do not use shell history/argv, repository files or shared deployment logs. Secret
rotation is a separate approved operation. TLS CA files are public trust material
but their source, integrity and replacement must be controlled.
