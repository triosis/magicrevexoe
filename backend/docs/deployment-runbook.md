# Deployment handoff — Task 19

Unexecuted operator procedure, 2026-11-05. No Hostinger connection or deployment
occurred. Release remains blocked by production-blockers.md. Obtain a named
release operator, security/DB reviewers and separate approval before live actions.

1. Freeze a reviewed commit, lockfiles, all 67 immutable migration pairs and schema
   manifest. Build on the provider-equivalent OS using patched Node 24.x; verify
   native Argon2 installation. Run the full test commands in external-integration-report.md.
2. Approve RPO/RTO, maintenance window and write freeze. Obtain a complete protected
   pre-change backup using separately reviewed provider facilities and restore it
   into an isolated clone. Compare full rows, ledger, constraints and triggers;
   demonstrate MFA key recovery. The shipped local recovery CLI cannot target production.
3. Complete provider-backup-validation.md and database-compatibility-checklist.md.
   Confirm MariaDB version, InnoDB/charset, strict SQL, FK/CHECK behavior, trigger
   permissions/definers, named-lock session affinity and DDL timeouts on that clone.
   Read-only checks alone do not establish those behaviors.
4. Provision separate runtime, migration and backup accounts using the exact
   database-privilege-matrix.md. Verify effective PUBLIC/role/global/table grants;
   application must have no DDL or migration-ledger access. Do not assume provider
   support. Obtain trusted CA/hostname/TLS-cipher evidence; no insecure fallback.
5. Follow production-migration-runbook.md for explicit target/environment,
   non-mutating preflight, target identity, checksum/schema review, fresh report,
   audit output, operator/reviewer approval and explicit production confirmation.
   Never auto-baseline unknown schemas or rerun incomplete DDL. Successful preflight
   is not a promise of migration success. Production execution requires separate approval.
6. Inject backend-only protected variables from production-environment-reference.md.
   Keep all application replicas stopped/drained while rotating a single signing
   key or changing MFA ciphertext/key pairs. No automatic rotation is implemented.
7. Build/install the API independently: `npm ci --prefix backend` (prepare builds),
   or approved cached artifact build `npm run build --prefix backend`. Entrypoint
   `backend/dist/server.js`, working directory backend, `npm start`. Never run a
   migration automatically on process start. Keep provider PORT and set HOST=0.0.0.0.
8. Set public `VITE_API_URL=https://api.revexoe.com/api/v1` **before** frontend
   `npm ci` (prepare builds), or before `npm run build`. Deploy root server.mjs,
   dist including deployment.json, runtime dependencies and package files. Start
   with `npm start`. Backend and frontend have separate lockfiles/builds/processes.
9. Owner configures HTTPS/DNS for revexoe.com and api.revexoe.com, canonical domain
   redirects, certificate renewal and ingress limits. Proxy must preserve paths,
   Host, Accept, Authorization and Content-Type; forward health and OPTIONS to API.
   Do not blindly enable trust proxy: existing limiters are process-local and see
   proxy addresses. Shared ingress/client limits remain a release blocker.
10. Configure provider restart-on-failure, crash alerts, bounded backoff, log access/
    retention and SIGTERM graceful draining (10-second app deadline; allow more at
    supervisor). These provider controls are not shipped or verified. Ensure a
    restart does not run prepare/migrations or send email.
11. Verify `/health/live` and `/health/ready` on API. Ready means SELECT 1 succeeds,
    not complete schema/grant/application correctness. Verify the operator manifest
    before routing traffic. Frontend root/app/public deep links must load; missing
    assets/API paths return 404. Confirm CSP connect-src is only self plus API origin.
12. Explicitly run `npm.cmd --prefix backend run smtp:verify` in the approved
    protected operator environment. It verifies connection/TLS/authentication only,
    sends no mail and does not load .env. Separately authorize a synthetic recipient
    invitation/recovery test, sender SPF/DKIM/DMARC and actual inbox checks. Do not
    re-provision accounts after an ambiguous send; use explicit invitation resend,
    which invalidates prior tokens. There is no automatic SMTP retry/outbox.
13. In isolated staging, verify non-platform login/logout/refresh replay and Super
    Admin password→MFA, blocked pre-MFA APIs, recovery codes and session revocation.
    Refresh is a bearer token in sessionStorage, not a cookie; no cookie-based CSRF
    protection is claimed. HTTPS/CORS and XSS defenses remain essential.
14. Verify all three merchant hierarchy paths, onboarding, branch/destination,
    QR preview/download and public short links on desktop/mobile. Independently
    verify the merchant's Google Place ID/listing. Both Google and structured
    private feedback must remain available without rating-based gating.
15. Submit synthetic structured feedback, retrieve/update it as the authorized
    merchant, and prove peer access denied. Check subscription/limits/counters and
    finite-boundary quota denial without partial resources/audits or duplicate charges.
16. Record dated, secret-free acceptance evidence. Monitor HTTP failures/latency,
    DB TLS/lock waits, SMTP failure events, MFA lockouts, quota reconciliation,
    storage/backup freshness, certificate expiration and restore readiness. External
    alerting, shared rate limits and incident routing still require implementation.

On failure fence traffic, preserve audit/ledger/backup evidence and classify whether
code-only rollback is schema-compatible. Prefer reviewed roll-forward; never
destructive automatic schema rollback. For incomplete DDL use explicit forward
repair from the migration runbook. For data disaster use the reviewed matching
backup/key pair and full restore verification before routing. Never restore a
compromised signing key to regain service. Do not proceed past missing owner evidence.
