   # Super Admin password-only login: concrete release packet

   2026-11-12. **Local implementation working; production NOT VERIFIED / NO-GO.**
   No Hostinger database query/migration, hPanel mutation, credential/key generation,
   real owner creation, deployment, commit or push. Local changes are complete and
   reviewable; production execution still requires explicit approval and recovery.

   ## Implemented

   - Wildcard interpreter accepts only exact `WITH MAX_STATEMENT_TIME 180.000000`
   on the reviewed account's global USAGE row. No global SQL authority granted.
   Limits on schema grants, different values/formats, extra limits, GRANT OPTION,
   roles, other patterns and privileges still refuse. The optional resource limit
   is included in the authority fingerprint; previous fingerprints must not be
   overwritten without review. Strict/exact-scope policies remain unchanged.
   - Explicit optional API variable
   `AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL=rxadmin@revexoe.com` enables password-only
   authentication for that exact identity. Omitted means original mandatory MFA
   behavior. Blank/other/case-changed values refuse. It does not grant a role: the
   existing active platform membership, super_admin role and permissions are required.
   - Tokens report amr pwd only, never claim MFA verification. Existing signing,
   refresh/replay/logout, password hashing, email/IP throttles and live authorization
   remain. Removing the exception or changing email rejects old pwd-only platform
   sessions. Other Super Admin identities still require MFA.
   - The exempt owner's failed-password counter uses existing user_mfa lock metadata
   under user/row locks: five failures impose15-minute persistent lockout, including
   across service restart. Valid credentials do not bypass an active lock. No TOTP
   enrollment/key ciphertext is created/cleared by this policy; encrypted factors
   for any existing accounts are preserved. Secret-free denial audit uses
   auth.password_rejected. No historical SQL/manifest change.
   - Existing bootstrap remains the only owner creation path; password length16–128
   and>=10 distinct characters, Argon2id, one-root/idempotency checks unchanged.
   No password was hardcoded or requested through chat.

   Password-only administrator access removes a phishing/stolen-password barrier for
   this owner. This follows the owner's explicit preference, not the security default.
   It does not authorize password-only authentication for every user or remove MFA key
   validation from production: other users and retained encrypted factors still need
   the existing valid AUTH_MFA_KEY. Do not install the previously exposed candidate.

   ## Local validation

   | Executed check | Actual result |
   | --- | --- |
   | `npm.cmd --prefix backend test` |Build passed;98 unit tests passed,0 failed/skipped/cancelled |
   | `npm.cmd --prefix backend run test:integration` |237 passed,0 failed/skipped/cancelled;187seconds |
   | Focused actual React/Express/MariaDB Chrome test |2 cases including parent passed;12.8seconds |
   | `npm.cmd --prefix backend run typecheck` |Passed |
   | `npm.cmd run lint` |Passed |
   | Offline migration/manifest integrity |85 immutable versions accepted; SQL/verify/manifest unchanged |
   | `git diff --check` and report link/whitespace checks |Passed |

   **337 cases passed**, including node:test parents. Earlier targeted13-case run is
   repeated coverage and not added to337. Existing default-MFA/tenant/auth/session and
   encrypted recovery regressions remain green. Targeted password-only tests prove
   lockout survives a new AuthService instance; disabled exception and changed email
   reject old pwd-only platform sessions, and unlisted Super Admin still gets an MFA
   challenge. No claim of penetration certification or production readiness.

   Actual real-browser test uses a fresh disposable database, existing bootstrap,
   React/Express and synthetic password/keys. It checks incorrect password rejection,
   password-only login with no MFA QR, `/app` Super Admin overview, selected
   super_admin/platform role and platform.manage permission, and refusal of conflicting
   second-owner bootstrap. No unrelated business features were developed/tested by the
   focused browser flow. Network navigation outside loopback is blocked in the fixture.

   Manifest fingerprint, unchanged:
   `4a82e281add0066adf392e15a7f1135b0601607ebbf4b8eda5b7001491b35735`.

   New local compiled/SQL/manifest release fingerprint:
   `c74e165acdee0a50ed0bbdb3a0820b9b934914f39e3e957e930ef566d5b18a45`.

   This resolves which local bytes are to be reviewed, not deployed parity. Rebuild
   and independently compare the intended Hostinger artifact and dependencies; pin
   its approved computed release fingerprint in all phase policies. Never substitute
   a new hash merely to suppress drift. No production target/grant fingerprint can
   be verified without separately authorized actual evidence. No usable production
   policy/approval was fabricated.

   ## Changed files

   | File | Purpose |
   | --- | --- |
   | backend/src/migrations/hostinger-wildcard.ts |Narrow USAGE resource clause and fingerprint binding |
   | backend/test/hostinger-wildcard.test.mjs |Positive/negative resource-clause regressions |
   | backend/test/hostinger-wildcard.integration.mjs |Actual fixture resource limit on global USAGE through migration/recovery/reduced runtime |
   | backend/src/auth/configuration.ts |Explicit exact owner-only policy validation |
   | backend/src/auth/service.ts |Owner-only MFA decision, persistent failed-password lock and honest audit; existing session/RBAC reused |
   | backend/.env.example |Documents optional owner-only selection; no secret values |
   | backend/test/password-only-admin.test.mjs |Invalid/absent selection and unchanged MFA key validation |
   | backend/test/password-only-admin.integration.mjs |Bootstrap, pwd-only tokens, wrong passwords, permissions, other/default MFA, config/email change invalidation, logout and persistent lockout |
   | reports/SUPER_ADMIN_LOGIN_SETUP.md |Links updated password-only release contract |
   | reports/HOSTINGER_WILDCARD_POLICY_IMPLEMENTATION.md |Links narrow resource-clause follow-up/new hash |
   | reports/SUPER_ADMIN_PASSWORD_LOGIN_RELEASE.md |This packet and remaining execution gates |

   Browser harness and logs are ignored under
   `.tmp-frontend/password-only-production-setup/`. No tracked frontend code changed.

   ## Remaining concrete Hostinger execution steps

   1. **Read-only approval needed now:** verify the real installed release, exact
      account/grants/target and provider recovery options in authenticated Hostinger.
      Automatic approval review rejected the attempt to inspect the existing signed-in
      SSH-access browser page, citing earlier no-production-access restrictions and
      no current authorization for that inspection. No page content was obtained and
      no retry/workaround attempted. Read-only desktop inventory showed a Hostinger
      window, not an approved production session inspection.
   2. **Recovery gate:** accept an actual protected backup plus a faithful isolated
      restoration path for all32 tables,46 definitions/original definers,85 ledger
      rows, data/constraints and matching auth keys. Local recovery is tested; generic
      hPanel import documentation excludes TRIGGER/DEFINER. Need a supported provider/
      native route and actual rehearsal evidence, not the name of an old backup.
      Existing disposable-only recovery executor remains unchanged. No purchase proposed.
   3. **Approve exact production release/maintenance/migration:** reviewer accepts
      actual target/release/grant fingerprints (including180-second limit), genuine
      transport/wildcard/risk/recovery records and viable final reduced privileges.
      Fresh initial preflight, then independent apply confirmation within15minutes;
      preserve manifest/locks/audit and stop on partial failure. No production apply
      authorized by this local task's results.
   4. **First owner:** after complete verify-phase85/32/46 schema, separately approve
      bootstrap-phase execution. Operator privately enters a new strong password via
      approved masked local/SSH input, never chat/source/logs. Set BOOTSTRAP_OWNER_EMAIL
      to rxadmin@revexoe.com and real reviewed platform/name/account inputs. Existing
      `node dist/setup/cli.js --target ... --environment production --approve ...`
      requires the real canonical reviewed bootstrap policy digest, no placeholders.
   5. **Release and final permissions:** under separate approval deploy tested code,
      select the one explicit AUTH_PASSWORD_ONLY_SUPER_ADMIN_EMAIL value, preserve
      existing access/MFA/SMTP keys and guards; provider reduces to exactly SELECT,
      INSERT, UPDATE, TRIGGER, reconnect and pass runtime check. No silent permanent ALL.
   6. **Actual acceptance:** open https://revexoe.com/login with privately supplied
      password, reach https://revexoe.com/app without MFA, verify role/permissions,
      invalid login/anonymous denial and logout. Coordinate negative attempts with
      lockout budget. Only after real deployed evidence report WORKING.

   No new production password or approval ID was requested before these prerequisites
   are satisfied. There is no safe claim that an account exists while its database
   is reported empty. **Current status: local implementation tested, production login
   not created/verified.** Continue only after required access/recovery/production
   authorizations; do not bypass the blocked stage.
