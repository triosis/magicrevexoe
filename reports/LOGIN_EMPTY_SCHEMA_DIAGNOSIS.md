# Login error with empty production schema

2026-11-12. Local correction and disposable testing only. No production access,
SQL, settings change, initialization, bootstrap, deployment, commit or push.

Owner-supplied evidence shows the backend listening and a generic request error;
phpMyAdmin reports zero base tables in u676472791_magicreview_db. That schema cannot
support database-backed login. The generic production log does not independently
identify its driver error or prove the deployed app's selected database; those
remain evidence boundaries. Empty-schema login was reproduced locally.

## Correction

backend/src/middleware/error-handler.ts now recognizes only ER_NO_SUCH_TABLE and
returns HTTP503 with no-store, code APPLICATION_SCHEMA_UNAVAILABLE and fixed text
`Service setup is incomplete. Contact the administrator.` The server logs only a
fixed code/instruction to verify the configured database and approved migrations.
Raw error messages, SQL, account/database/table names, passwords and request bodies
are never copied. Unknown exceptions retain the generic HTTP500 path. Existing
validation/auth failures retain their original status and messages.

This diagnostic correction does not create tables, weaken hashing, change the
password policy, insert an administrator or bypass any setup gate. Existing
readiness remains SELECT1-only: it can report200 on an empty database. HTTP bind
and database connectivity are not schema/bootstrap acceptance.

## Executed local verification

- Backend build and 105 unit cases passed, zero failures/skips/cancellations.
- Real disposable MariaDB empty-schema/auth/password-only integration files:
  22 cases passed, zero failures/skips/cancellations. Empty schema returned the
  same safe503 for owner/unknown emails, did not log secrets or create tables;
  health/ready remained200 under their existing narrow contracts. Normal auth,
  roles, session/logout, persistent lockout and other-owner MFA tests passed.
- Backend typecheck, root lint and git diff --check passed.
- No frontend/browser or complete integration rerun claimed for this narrow change.

127 passing cases executed here including parents. Prior test totals are historical
and not added. Generated compiled files now differ: earlier release fingerprints
must not be reused for this new artifact without independent review.

## Remaining actual login fix

Resolve the existing Hostinger proxy/TLS, persistent private operator state,
child-process/HTTP deadline and accepted isolated recovery blockers. Then obtain
separate production execution approval, preflight/apply all85 migrations, verify
manifest/32 tables/46 triggers/ledger/definers, and separately bootstrap the permanent
rxadmin@revexoe.com owner using a new privately supplied password meeting16–128
characters and >=10 distinct characters. Verify reduced runtime authority and
explicit password-only owner policy, remove setup/operator inputs, then test real
login -> /app. Do not import concatenated SQL, hardcode a password, fabricate
approvals or rerun failed setup automatically. See
[final gates](HOSTINGER_FINAL_COMPATIBILITY_READINESS.md).

Production login remains **NOT FIXED / NO-GO**; pushing the diagnostic correction
alone cannot initialize the database or create the missing owner.
