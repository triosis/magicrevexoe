# Launch readiness checklist

2026-11-07, baseline 9e04eef. **Not approved for launch.** This is an audit handoff,
not authorization to deploy, initialize a database or change credentials.

## Completed local audit gates

- [x] Original SOW and recorded Task02 corrections located; later financial/legal
  instructions respected. Phases distinguished in the feature matrix.
- [x] Real core frontend/API/database journeys inspected; marketing mocks identified.
- [x] Backend unit: 74 passed, 0 failed/skipped/cancelled.
- [x] Backend integration: 195 passed, 0 failed/skipped/cancelled; fresh disposable
  MariaDB 11.8.9, including migration/schema, concurrency, TLS, SMTP, MFA and RBAC.
- [x] Frontend unit: 29 passed; real-stack E2E: 13 passed; browser fixtures: 8 passed;
  frontend server: 1 passed. Total 320 passed, no final failures/skips.
- [x] Frontend and backend TypeScript checks/builds passed. Backend build is part
  of backend test/E2E commands. Existing lint is `npm run lint` (Oxlint), passed;
  no separate ESLint configuration was assumed or installed.
- [x] Current tracked-file secret pattern scan found no high-confidence credential/
  private-key matches; environment examples contain placeholders, production .env
  files are not tracked. This does not include exhaustive history or external files.
- [x] Root/backend offline npm audit each returned zero findings; current online
  vulnerability assessment remains open.
- [x] No application source or migration changed; only six requested audit reports
  created. Diff/whitespace checks passed. No package installation or production access.

## Owner/security/legal gates still open

- [ ] Establish whether exposed candidate MFA key was installed. Do not use it for
  first setup; if already used, preserve ciphertext/key continuity during reviewed
  incident rotation. Generate replacement only under separate authorization, privately
  compare with existing production signing key and retain secure custody/backup.
- [ ] Final signed production transport decision with genuine record reference,
  approver, dates, conditions and review/expiry; draft SEC-2026-001 remains pending.
- [ ] Hostinger confirms actual loopback routing, local proxy/downstream hops,
  tenant/process/network isolation and required grants/lock/definer support. Do not
  call HOSTINGER_LOCAL encrypted or TLS-authenticated.
- [ ] Approved ToS/privacy/DPA/consent and retention/erasure/legal-hold requirements,
  with subsequent implementation and acceptance evidence.
- [ ] Approved authentication amendment resolving original magic-link/OTP against
  current password/SuperAdmin MFA, without weakening current controls.
- [ ] Finance-reviewed catalog and Billing/Settlement/GST policy, followed by reviewed
  implementation. Keep paid activation/checkout, collection, settlement, refund/
  credit notes, GST issuance and dunning disabled until then.
- [ ] Written Phase1 acceptance scope for ambiguous original channel/theme/branch/
  analytics/support clauses; no silent reductions or invented prices/quotas.

## Code and integration gates still open

- [ ] Implement and verify Google OAuth/location/category onboarding. Real callback,
  state/PKCE, scopes, identity binding, encrypted token custody/revocation and approved
  business access required. No connector currently exists.
- [ ] Finish agreed onboarding/keyword/theme/channel functionality; manual editor/
  logo and Place ID entry are not full OAuth wizard delivery.
- [ ] Validate real Claude outputs, primary/complex models, usage reconciliation,
  negative-sentiment/factual/clinical safety and en/hi/ml native-language quality;
  measure actual provider latency. No fake fallback.
- [ ] Authorized SMTP TLS/auth and synthetic inbox invitation/recovery delivery
  verification, sender-domain authentication and failure/recovery acceptance.
- [ ] Verify Razorpay sandbox only after policy/authorization, then any separately
  approved live lifecycle; never assume signed fixtures prove real settlement.
- [ ] Approved scan/usage semantics and observable, reconciled metering. Clicks/views
  are not verified physical scans or posted Google reviews.
- [ ] Representative performance/4G P95, physical QR/NFC where accepted, full
  accessibility/mobile/offline and native-speaker acceptance. Process startup timing
  is not scan-page or AI latency performance.
- [ ] Distributed-limit/proxy/edge architecture acceptance or approved amendment to
  original Redis/edge scope. Single-process limits are not distributed protection.

## Production operator gates (not executed)

- [ ] Confirm exact artifact/commit, Node24/native Argon2 compatibility, backend root,
  build `npm run build`, prebuilt runtime `npm start`, HOST=0.0.0.0 and assigned PORT.
- [ ] Confirm current actual schema/data/accounts, restricted runtime/migration grants
  and application key custody. Owner reports empty DB; do not automatically initialize.
- [ ] Protected backup/key recovery, offsite copy and isolated restore rehearsal;
  agreed RPO/RTO, retention and maintenance/rollback plan.
- [ ] Separate release/schema/bootstrap approvals and guarded fresh preflight/apply,
  immutable SQL/checksums/postconditions and exact target identity. No startup migrations.
- [ ] After explicit authorization only, validate secret-free startup logs and
  `/health` or `/health/live`; separately `/ready` or `/health/ready`. Readiness checks
  SELECT 1, not complete schema/provider/business readiness; timeout can exceed 3 seconds.
- [ ] Fresh production response/logs confirm actual availability and no 503; no such
  evidence collected here. Verify request routing, effective privileges, TLS mode
  truthfulness, application acceptance and monitoring before customer traffic.
- [ ] Independent security/advisory assessment and incident rehearsal, real provider
  outages, rollback and restored key/ciphertext compatibility tested.
- [ ] Owner signs functional/legal/security/operational acceptance for real customers.

## Deferred scope, not launch conditions unless separately contracted

Task02 commissions/wallets/payouts/wholesale; Phase2 white-label, extended languages/
channels, review replies and hardware fulfillment; Phase3 advanced AI/audits/content/
analytics/custom builders and automation APIs; Phase4 voice/mobile/marketplace/
advanced policy automation. Original undated/ambiguous clauses still need a phase
decision and cannot be silently declared deferred.

## Reproduction and evidence

Local audit commands: `npm --prefix backend test`, `npm --prefix backend run
test:integration`, `npm test`, `npm run test:e2e:real`, `npm run test:browser`,
`npm run test:server`, both project `typecheck` commands, frontend build and
`npm run lint`. Windows uses npm.cmd; DB suites require MARIADB_TEST_BIN pointing
to the disposable MariaDB 11.8.9 Windows ZIP bin directory. Suites ran serially
where they own DB instances; the port3306 test refuses existing listeners.
The public VITE_API_URL build string causes no external API call during compilation.
Root/backend `npm audit --offline --json` and diff checks were also run.
Ignored logs are `.tmp-frontend/completion-audit/`; no secrets are included in reports.

Assisted manual acceptance of the implemented subset is appropriate in an isolated
synthetic environment. Full Phase1 acceptance and real-customer production launch
are not approved or demonstrated.

**DEVELOPMENT INCOMPLETE**
