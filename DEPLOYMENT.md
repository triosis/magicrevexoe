# Deployment documentation

Use [the current deployment runbook](backend/docs/deployment-runbook.md),
[environment reference](backend/docs/production-environment-reference.md) and
[production blockers](backend/docs/production-blockers.md).

The React frontend and Express API are separate Node 24 deployments and packages.
Frontend: revexoe.com, root server.mjs, dist/. API: api.revexoe.com,
backend/dist/server.js. VITE_API_URL is public build-time configuration and must be
set before npm ci (prepare builds). All database/authentication/SMTP secrets belong
only to the backend's protected runtime environment. Do not put them in VITE_ names.

This repository now implements authenticated business APIs, MFA, public funnels,
feedback and quotas. Prior no-API deployment instructions are obsolete. Deployment,
provider settings changes and production migrations require separate approval;
none were performed by Task 19. Passing local tests does not establish readiness.
