# First Super Admin login: minimum setup handoff

> Follow-up: the owner explicitly requested password-only login for
> rxadmin@revexoe.com. See [current password-only release packet](SUPER_ADMIN_PASSWORD_LOGIN_RELEASE.md).
> MFA remains the default for other Super Admins. The MFA flow below is historical
> local evidence; no production policy or account was changed.

2026-11-12. Local disposable verification only. No production connection, schema/
permission/credential change, real owner, deployment, commit or push. No application
code changed. Production setup remains blocked pending the existing approvals.

## Status

- **Local login works:** existing bootstrap → password → MFA QR enrollment/TOTP →
  platform selection → `/app` Super Admin overview and authorized catalog route.
  Real local React/Express/MariaDB browser test confirmed selected role super_admin,
  platform kind and platform.manage permission. Conflicting second owner refused;
  one platform root and one user remained in this fresh fixture.
- **Production schema initialization is required:** owner reports no application
  tables. No production query here; a fresh authorized inventory must confirm it.
  Health/readiness do not create the schema or administrator. Bootstrap requires
  all85 migrations,32 tables,46 triggers and complete ledger/manifest verification.
- **Actual production auth/MFA values are unverified:** no production credentials
  or private key files read. Current local agent process has none of the required
  auth/SMTP variables; that says nothing about hPanel. Synthetic configuration and
  actual MFA enrollment/login passed locally. Exposed-key usage/remediation and
  matching encrypted records remain separate evidence gates.

Local checks: backend build passed; existing hostinger-local integration8 cases
passed; focused real-browser first-owner flow2 cases passed (including parents).
**10 cases passed.** First browser attempt used the wrong expected heading;
corrected harness expectation to actual “Super Admin overview” and reran successfully.
No product fix or unrelated development. Ignored harness/logs:
`.tmp-frontend/super-admin-login-only.mjs` and `.tmp-frontend/super-admin-login-only/`.

## Existing operator commands — later approval required

Run from the verified **Hostinger backend directory**, using approved compiled
artifact and genuine private phase policies. The shell variables below must refer
to actual reviewed files/digests; no policy/approval/path is fabricated here.

If fresh inventory confirms empty schema, the existing guarded migration path is:

```bash
node dist/migrations/operator-cli.js preflight --target "$INITIAL_TARGET" --environment production --report "$PREFLIGHT_REPORT"
node dist/migrations/operator-cli.js apply --target "$INITIAL_TARGET" --environment production --approval "$PREFLIGHT_REPORT" --audit "$NEW_AUDIT" --confirm-production "APPLY-PRODUCTION:$INITIAL_TARGET_DIGEST"
```

This identifies commands, **not production execution approval**. Requires initial
wildcard/transport approval, exact identity/grants/release/manifest, accepted recovery,
maintenance/write freeze, new audit and fresh15-minute preflight plus independent
canonical target confirmation. INITIAL_TARGET_DIGEST is digest(targetPolicy.parse(
JSON)), not a raw JSON-file hash. After apply, separately approved verify-phase
`verify-complete` must establish complete schema before bootstrap. Full gates:
[production preflight handoff](HOSTINGER_PRODUCTION_PREFLIGHT_READINESS.md).

Then use the existing first-owner bootstrap command with a **bootstrap-phase**
private target, approved installed release and canonical digest:

```bash
node dist/setup/cli.js --target "$BOOTSTRAP_TARGET" --environment production --approve "BOOTSTRAP:$BOOTSTRAP_TARGET_DIGEST"
```

Protected bootstrap-process inputs:

| Names | Required input |
| --- | --- |
| BOOTSTRAP_DB_USER / BOOTSTRAP_DB_PASSWORD |Actual approved shared database account/credential; not a login password |
| BOOTSTRAP_PLATFORM_NAME |MagicReviewAI or approved platform name |
| BOOTSTRAP_OWNER_EMAIL / BOOTSTRAP_OWNER_NAME |Chosen first-owner email/display name |
| BOOTSTRAP_OWNER_PASSWORD |New private16–128character password,>=10 distinct characters; never prior exposed password |
| HOSTINGER_LOCAL_APPROVAL / HOSTINGER_LOCAL_APPROVAL_ID |Existing exact transport acknowledgement and matching genuine record |
| HOSTINGER_WILDCARD_APPROVAL_ID |Genuine matching bootstrap-phase wildcard approval; policy also pins required review/recovery/runtime references, windows and fingerprints |

Bootstrap returns initialized:true,created:true once; identical existing identity
returns created:false without password replacement; conflicts refuse. Do not rerun
to reset credentials, insert users manually, create a second owner or bypass MFA.
BOOTSTRAP_* hPanel entries alone never execute setup. Keep operator credentials
outside normal API runtime and clear protected operator inputs after use.

## Required normal API authentication configuration

AUTH_ACCESS_SECRET: existing canonical standard Base64,32–128 decoded bytes;
AUTH_MFA_KEY: canonical standard Base64,exact32 decoded bytes; both>=16 distinct
decoded bytes and independent. Preserve used keys/ciphertext; do not install the
exposed candidate. No values generated or printed here.

Also required: AUTH_SMTP_HOST, AUTH_SMTP_PORT, AUTH_SMTP_USER, AUTH_SMTP_PASSWORD,
AUTH_MAIL_FROM and AUTH_RECOVERY_URL=https://revexoe.com/recover. Production SMTP
credential strength and verified TLS remain enforced. PUBLIC_WEB_ORIGIN,
PUBLIC_FUNNEL_ORIGIN, CORS_ORIGINS and existing DB/approved HOSTINGER_LOCAL settings
must remain valid. Optional SMTP security mode/CA fields must match provider.

## Minimum remaining Hostinger actions

1. Obtain real transport/wildcard/maintenance and tested recovery approvals;
   resolve exposed MFA candidate use and actual auth-key readiness privately.
2. Confirm deployed artifact, exact target/grants/current emptiness and viable
   approved post-migration permission reduction. Execute guarded85-step migration
   only under separate approval, then complete verify-phase schema/definer checks.
3. Separately approve/run the first-owner bootstrap above while required reviewed
   metadata/ALL authority is available. No administrator exists merely from env values.
4. Under separate permission-change approval, retain only SELECT/INSERT/UPDATE/TRIGGER,
   reconnect and pass runtime-phase check-runtime. No permanent ALL runtime approval
   implied; schema wildcard/shared-definer risks remain explicit.
5. After independent release approval open **https://revexoe.com/login**, use the
   privately chosen owner credentials, scan the private authenticator QR, enter TOTP,
   store recovery codes privately and select the platform workspace if prompted.
   Dashboard: **https://revexoe.com/app**. Login API:
   `POST https://api.revexoe.com/api/v1/auth/login`; MFA uses `/auth/mfa/enrollment`,
   `/auth/mfa/activate`, later `/auth/mfa/verify`, then `/auth/select-tenant`, all
   under `/api/v1`. Validate role/permissions after selection; no shared default login.

**Local first-owner login READY; production first-owner activation NOT READY.**
Stop after this handoff; no Hostinger action was executed.
