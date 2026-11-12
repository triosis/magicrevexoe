# Fixed Super Admin login release preparation

2026-11-12. **Verified locally; production login NOT verified.** No production
connection, configuration change, migration, bootstrap, deployment, commit or push.

## Result and implementation

Public owner email is centralized in backend/src/config/platform-owner.ts:
rxadmin@revexoe.com. Auth configuration and direct AuthService construction use
that same constant to reject any other password-only exception identity. The
generic guarded bootstrap CLI and initialization job now default an omitted owner
email to that configured address. Explicit reviewed email inputs remain supported
by the generic bootstrap tool; it is not a login bypass or a second-owner creator.
For this release explicitly use the configured address in operator review.

No password or hash was added to source. Existing BOOTSTRAP_OWNER_PASSWORD is the
private initial password input; no new password variable or automatic server-start
provisioning was introduced. Original Argon2id hashing, complete-schema requirement,
root/identity uniqueness, transactions, target/grant/approval/lock/audit gates,
sessions/refresh/logout, rate limits, persistent lockout and RBAC are unchanged.
MFA key validation remains mandatory in production for other identities and data.

Frontend already accepts email/password, selects the authorized workspace and
redirects to /app after successful password-only login. No form change was needed.
A tracked focused real-browser regression is now available as
`npm run test:super-admin:browser`. It uses only harness-owned MariaDB, synthetic
credentials and temporary loopback TLS, blocks external requests and tests invalid
password, no-MFA /app, platform role/assurance, logout and anonymous dashboard
denial. Browser tolerance of the synthetic self-signed fixture does not change
application TLS behavior or certify production HTTPS.

## Hostinger inputs for separately authorized execution

Normal API runtime:

| Input | Required value / handling |
| --- | --- |
| AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL | rxadmin@revexoe.com; exact lowercase value; explicit policy, absent retains MFA |
| AUTH_ACCESS_SECRET | Preserve existing valid privately held signing key |
| AUTH_MFA_KEY | Valid independent key; resolve exposed candidate/use and ciphertext custody under existing remediation gates |
| Existing DB/origin/SMTP/HOST/PORT variables | Unchanged approved deployment contract; no invented credentials/CA/approval records |

Temporary authorized bootstrap operator inputs (not permanent API configuration):

| Input | Required value / handling |
| --- | --- |
| BOOTSTRAP_OWNER_EMAIL | rxadmin@revexoe.com, or omit to use the configured default |
| BOOTSTRAP_OWNER_PASSWORD | New private value: 16–128 characters, >=10 distinct characters; secret injection/masked operator input only |
| BOOTSTRAP_OWNER_NAME | Actual administrator display name |
| BOOTSTRAP_PLATFORM_NAME | MagicReviewAI |
| BOOTSTRAP_DB_USER / BOOTSTRAP_DB_PASSWORD | Reviewed protected bootstrap account inputs |
| Existing target/transport/privilege/setup authorization inputs | Genuine reviewed records, exact release/policy fingerprints; no defaults created here |

Never put the password in a job JSON, source, request body, command arguments,
logs, Git or chat. Do not reuse the exposed password. Remove temporary setup,
bootstrap password and elevated operator inputs after their approved use. Adding
environment variables does not create an account; changing BOOTSTRAP_OWNER_PASSWORD
does not reset an existing owner's password.

## Executed verification in this task

| Check | Actual result |
| --- | --- |
| npm.cmd --prefix backend test | 105 passed, zero failures/skips/cancellations; build included |
| auth.integration, password-only-admin.integration, initialization-job.integration, sequential | 22 passed, zero failures/skips/cancellations, 20.3 seconds; harness-owned MariaDB11.8.9 |
| npm.cmd run test:super-admin:browser | 1 passed, zero failures/skips/cancellations; real local React/Express/MariaDB/Chrome; backend rebuilt |
| Backend and frontend typecheck | Both passed |
| npm.cmd run build | Passed with public VITE_API_URL=https://api.revexoe.com/api/v1; no external request |
| npm.cmd run lint | Passed, including new tracked browser test |
| loadMigrations/validateManifest | 85 ordered migrations accepted; historical SQL/verification/manifest unchanged |
| git diff --check | Passed |

128 passing cases executed here, including parents; prior 343 are historical and
not added to this count. Complete integration suite was not rerun for this small
configuration/default change; the relevant real auth, bootstrap and HTTP-dispatch
paths were rerun. No coverage percentage or production readiness claim.

Current locally generated compiled fingerprint:
`3171cebb439c860a5972c494fa26600827c6aba34714239e95c4796904b72bfb`.
All earlier local fingerprints describe older artifacts. Review the exact deployed
artifact independently before approving execution; never blindly replace a policy
fingerprint to suppress a mismatch.

## Changed files and Git preparation

backend/src/config/platform-owner.ts; backend/src/auth/configuration.ts;
backend/src/auth/service.ts; backend/src/setup/cli.ts; backend/src/setup/job.ts;
backend/.env.example; backend/test/initialization-job.integration.mjs;
scripts/super-admin-login.browser.mjs; package.json; this report.

The untracked HOSTINGER_FINAL_COMPATIBILITY_READINESS.md predates this task and
is deliberately excluded from the commands below. Review it separately. No real
.env, CA/key or private MFA candidate file is listed as tracked; environment files
shown by Git are examples/documentation. This is not a complete historical secret
scan or a claim that the previously exposed candidate is safe.

Proposed PowerShell commands from repository root; **not executed here**:

```powershell
git add -- backend/src/config/platform-owner.ts backend/src/auth/configuration.ts backend/src/auth/service.ts backend/src/setup/cli.ts backend/src/setup/job.ts backend/.env.example backend/test/initialization-job.integration.mjs scripts/super-admin-login.browser.mjs package.json reports/FIXED_SUPER_ADMIN_RELEASE_READINESS.md
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "Configure fixed Super Admin bootstrap identity and verify password-only login"
```

No new release commit hash exists until commit. Current parent at inspection was
26808eb on main. Hostinger previously showed auto-deployment enabled: pushing main
may deploy immediately. Do not push main as a mere preparation step. Only after
separate release/deployment approval and staged review, the proposed command is
`git push origin main`. No Git action initializes MariaDB or creates the owner.

## Production decision

**NO-GO until the existing final compatibility gates are satisfied.** Preserve the
current manual setup mechanism; do not introduce another runner. Verify Cloud
proxy/TLS behavior, private persistent storage, child-process support, the documented
120-second request limit and isolated recovery preserving all 46 definers. Obtain
independent execution approvals, run reviewed preflight/apply, verify full schema,
then bootstrap and validate reduced runtime permissions. Only after actual login at
https://revexoe.com/login without MFA, /app role access and negative/logout checks
can production be reported WORKING.

See [manual setup](HOSTINGER_MANUAL_SETUP_HTTP.md) and
[final compatibility gates](HOSTINGER_FINAL_COMPATIBILITY_READINESS.md).
