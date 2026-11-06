# Production blockers — Task 14

## Task 22 current status (2026-11-06)

Phase 1 remains incomplete. The current authoritative audit is
[Task 22 final audit](task-22-final-audit-report.md), with
[itemized traceability](task-22-sow-traceability-matrix.md),
[remaining dependencies](task-22-remaining-gaps.md),
[owner decisions](task-22-owner-decisions.md) and [tests](task-22-test-report.md).
Historical Task 20/21 statements below describe earlier snapshots.

Task 22 adds business keyword/PNG setup, scoped recorded analytics, immutable
archival/language, bounded offline fallback, large independent rating controls,
configured-capacity warnings and QR-only print PDF. Paid execution now remains
blocked even with a commercial approval; no written finance policy exists.
Legal/privacy/retention and authentication reconciliation explicitly await owner
approval. Google OAuth/import remains missing code with owner/provider prerequisites;
actual AI/payment/provider quality and operational targets remain unverified.
See [current API/schema changes](task-22-api-changes.md). No production activity occurred.

## Task 21 development update (2026-11-05)

The historical Task 20 absence statements below are superseded only for the
implemented subset in [Task 21 implementation](task-21-implementation-report.md).
Real Claude drafting, English/Hindi/Malayalam public controls, explicit operator
bootstrap, catalog authoring and the Razorpay checkout/captured-payment workflow
are now implemented locally. [Test evidence](task-21-test-report.md) distinguishes
synthetic provider protocol tests from actual MariaDB/browser tests.

**Application remains incomplete.** No approved commercial catalog exists. Paid
activation refuses missing commercial approval; no prices, limits, overage rates
or commercial defaults were seeded. GST PDF invoices, automatic overage settlement,
dunning/reconciliation and other Task 20 onboarding/compliance gaps remain open.
Real AI/payment provider behavior, native-language quality, latency, tax/legal
acceptance and provider grants/configuration remain unverified. See
[remaining gaps and owner decisions](task-21-remaining-gaps.md) and
[operator/API workflows](task-21-workflows.md). No Hostinger/production connection,
migration, secret/configuration change or deployment occurred.


## Task 20 final completion audit (2026-11-05)

**APPLICATION INCOMPLETE — DEVELOPMENT WORK REMAINS.** Original SOW v1.0 has now
been recovered verbatim into docs/product/approved-scope-of-work-v1.md; Task 02's
recorded corrections are preserved separately, with provenance limitations. The
full original scope must not be treated as completed merely because implemented
contracts pass local tests. Phase 1 AI drafts/three-language support, original
billing/payment scope and broader onboarding/analytics/compliance are absent or
conflict with later restrictions; an explicit owner amendment or separately
approved development is needed. No feature expansion occurred in this audit.

A: full product completion not established. B: implemented contracts locally
verified. C: assisted owner testing of the implemented subset only, after a
persistent isolated fixture is prepared; no shipped first-platform bootstrap or
plan-authoring workflow exists. D: no external verification. E: not production ready.
See [final completion report](final-application-completion-report.md),
[traceability matrix](sow-traceability-matrix.md),
[manual acceptance guide](manual-acceptance-testing-guide.md) and
[owner actions](final-owner-action-checklist.md).

Removed unapproved hard-coded example prices/discounts/location allowances from
the landing page and explicitly disclosed disconnected AI/import/NFC demos. Both
previous landing/demo lint warnings are corrected without rule suppression.
Current backend, MFA, feedback concurrency, quotas and migration history are
unchanged. Historical sections below retain their original task evidence; later
contracts and this report establish current status. No Hostinger connection,
production changes or actual provider acceptance occurred.

## Task 19 current integration status (2026-11-05)

Implemented and locally tested: runtime verified database TLS with pinned approved
CA and DNS identity, production environment checks, SMTP TLS/STARTTLS and explicit
no-mail verification command, safe result events with allowlisted error codes,
production frontend API validation and exact CSP API origin. See
[external-integration-report.md](external-integration-report.md),
[deployment-runbook.md](deployment-runbook.md) and
[production-environment-reference.md](production-environment-reference.md).

Externally verified: none. Owner action required: provider TLS/grants/runtime,
DNS/HTTPS/proxy/restarts, real SMTP sender and inbox evidence, credential rotation,
MFA rollout and key custody, representative restores/off-site backup/RPO/RTO,
approved bootstrap/catalog and security/privacy sign-off. Not implemented: durable
mail outbox, shared ingress limiter/alerts, automatic secret rotation and remote
backup execution. No Hostinger connection, production changes or external test mail.
Production remains blocked; historical task sections below are evidence for their
original scope, not assertions that Task 19 code is absent.

Audit date: 2026-11-05. Verdict: **NOT READY — CRITICAL BLOCKERS**.
No production access/deployment/settings/migrations occurred. This register is an
audit finding list, not permission to perform the remediation against production.

Classification legend: **Verified** = directly established repository/advisory
fact; **Locally tested only** = observed in disposable local tests; **Externally
unverified** = required target/provider evidence absent; **Not implemented** =
missing implementation; **Blocked** = release activity cannot safely proceed.
Severity is release impact, not a claim of an exploited vulnerability.

| ID / severity | Classification | Finding / evidence | Required closure evidence / owner |
| --- | --- | --- | --- |
| A20 Product acceptance blocker | Verified missing/partial scope; owner decision required | Recovered original SOW Phase 1 AI/multilingual/billing and broader onboarding/analytics/compliance are not delivered or reconciled; bootstrap/catalog handoff absent. | Product owner reviews traceability and approves precise amended scope or separately authorizes remaining development; no full application-complete verdict. |
| C1 Critical | Externally unverified | Rotation of user-referenced historically exposed database credentials and JWT signing secrets cannot be verified without operator/provider evidence. Ignored files/history absence does not establish rotation. | Security owner: dated non-secret rotation records, revocation of prior credentials/sessions, new independently generated signing key, old-key rejection test in isolated staging. Never publish key/password values. |
| C2 Critical - implemented locally, rollout unverified | Locally tested only | TOTP challenge/enrollment/recovery and DB-backed MFA session enforcement implemented in Task 16. Historical password-only gap is remediated locally. | Auth/security/operations: review additive migrations 000064-000066, independent MFA key custody, controlled initial enrollment, clock synchronization, identity-recovery policy and provider staging negative tests. See mfa-implementation-report.md. No deployment or production readiness claim. |
| C3 Critical | Locally tested restore; operational/provider evidence unverified | Task 18 actual encrypted export/fresh import passes 26-table data/schema/ledger comparison, 35 triggers, 36 FKs, 34 CHECKs and restored application tests. Provider restore, representative-volume recovery, off-site/key custody, retention and approved RPO/RTO remain absent. | DBA/operations/business: provider-clone rehearsal with measured objectives, protected key/off-site recovery and approved operational owners/schedule/retention. See restore-rehearsal-report.md and disaster-recovery-runbook.md; local success is not production readiness. |
| C4 Critical | Blocked; controls locally tested | Task 17 adds an explicit operator executor with target/privilege/schema preflight, production confirmation, approval and audit; actual provider baseline/data mapping, restore and execution authorization remain absent. | DBA/release: reviewed production inventory, restored-clone rehearsal, exact grant/TLS/definer proof, approved window and separate execution authorization. See production-migration-runbook.md; never use the legacy local CLI against production. |
| C5 Critical | Locally tested only; externally unverified | Separate restricted migration/runtime grant profiles and negative tests pass on disposable MariaDB; actual provider grants, PUBLIC/roles and trigger definers remain unverified. | DBA/provider: effective grant evidence, stable definer account/rights and full runtime staging tests. See database-privilege-matrix.md; no assumption of Hostinger support. |
| H1 High ? remediated locally in Task 15 | Locally tested only | Captured legacy index/PRIMARY lock inversion: errno 1213, ER_LOCK_DEADLOCK, SQLSTATE 40001. Shared unique platform_slot point lookup and identical id/status projection remove conflicting scan paths; no new retry. | Three consecutive counter-checked stress runs and all 174 distinct tests pass. See feedback-concurrency-report.md. Provider validation/capacity remain unverified; other blockers stay open. |
| H2 High | Implemented and locally tested; owner action required | Task 19 runtime verified CA/hostname TLS is implemented; production refuses disabled TLS. Actual MariaDB 11.8.9 handshake, wrong CA and hostname rejection pass locally. Migration TLS remains separately configured. | DB/operations owner must establish provider CA, DNS certificate identity, cipher, effective runtime grants and staging evidence; never disable verification. |
| H3 High | Externally unverified | SMTP/inbox, DNS/HTTPS, exact CORS/origins, provider runtime/native Argon2, shutdown/restarts and current patched Node 24 are unverified on the actual account. | Operations: separately authorized staging functional/negative evidence, not production trial-and-error. |
| H4 High | Not implemented | Limits are process-local, trust proxy disabled, no shared edge enforcement; reverse-proxy NAT can throttle all clients together and restarts reset limits. Public view/event requests grow append-only audit storage. | Operations/security: trusted proxy specification, shared per-client/global limits, ingress/body/time/connection controls, retention/capacity evidence. Do not blindly trust X-Forwarded-For. |
| H5 High | Not implemented | No durable mail outbox/retry, external alert pipeline, audit reconciliation/export, incident/on-call procedures or operational dashboards. Safe console errors omit actionable internal diagnosis. | Operations/backend: privacy-safe correlated events/metrics, SMTP failure queue/alerts, health/latency/DB/quota reconciliation alerts, tested incident routing. |
| H6 High | Verified | Global platform-root serialization, user/root lock-order interactions, per-request DB auth and per-metric ledger SUM/live COUNT are capacity risks. No representative load/EXPLAIN/lock-wait budget evidence. | Backend/DB: non-destructive staging capacity/plan measurement and transaction time bounds. Root WHERE kind predicates are not direct PK lookups; measure access plans before optimizing. |
| H7 High | Externally unverified | Retention/erasure, clinic-context sensitivity, backup encryption/access, public privacy notice/contact, jurisdiction and data-controller obligations lack acceptance evidence. Structured-only is data minimization, not legal certification. | Product/privacy/security: approved policies, notice, lawful-purpose/retention/access workflow and independent compliance review as applicable. |
| H8 High | Locally tested structural controls; operational gate unverified | Task 17 operator workflow compares every applied prefix including columns, indexes, CHECK/FK definitions, trigger bodies/order/SQL mode and approved definers. Application readiness remains SELECT 1; data/hidden routines/provider drift are separate reviews. | Release/DB: use reviewed complete-manifest operator verification before opening traffic, plus provider object/grant/data inventory and staging rehearsal. A green preflight is not a DDL-success or application-readiness guarantee. |
| H9 High | Not implemented | Secure one-time platform bootstrap and approved commercial catalog authoring/provisioning workflow are absent. Quotas require subscription/counters before first merchant admin acceptance; only seeded Super Admin manages subscriptions. | Product/release/security: controlled bootstrap/invite procedure, independently approved versioned terms/limits, staff capacity >= needed admins, onboarding dependency test. No sample/default commercial data. |
| M1 Medium | Partially implemented; locally tested | Task 19 production CSP restricts connect-src to self plus the build-approved API origin. Refresh tokens remain XSS-readable in sessionStorage; inline styles remain permitted. | Frontend/security owner: continued CSP/dependency review; cookie migration would require separately designed CSRF/SameSite/CORS controls. |
| M2 Medium | Implemented; locally tested | Task 19 replaces obsolete DEPLOYMENT.md and expands safe examples, current environment reference and deployment runbook. | Release owner must validate actual protected configuration and provider topology; documentation is not deployment evidence. |
| M3 Medium | Verified | Plans/history use per-row enrichment (N+1); several pickers show only a first page. History/search lacks full large-account UX. Gauge history contains observed net reconciliations, not precise lifecycle events. | Backend/frontend: query/pagination improvements measured against real volumes; keep history semantics explicit. |
| M4 Medium | Not implemented | Session/token/limiter/audit retention cleanup, durable retry of unkeyed provisioning, automatic renewal and full denied-attempt security ledger absent. | Product/operations: scoped retention/idempotency policies; preserve link creation audit while retry keys depend on it. Do not add unauthorized billing automation. |
| M5 Medium | Verified | Tests run Windows MariaDB ZIP/Chrome; Linux/provider native build/CI automation and broad accessibility/cross-browser verification absent. Task 20 resolves the two prior landing/demo lint warnings; provider/browser/accessibility gates remain. | QA/release: reproducible protected CI and provider-like artifact build/smoke tests; address warnings separately. |

No alternate existing consuming API bypass was found in the inspected service
paths. That local conclusion does not override external gates; H1 is locally remediated as recorded above. Close findings
with evidence and named approvers, not with a green local-test count.

Related deliverables: [main assessment](production-readiness-report.md),
[security audit](security-audit-report.md), [deployment prerequisites](hostinger-deployment-checklist.md),
[backup/recovery](backup-recovery-runbook.md). Complete Task 14 file inventory is in
the main assessment. No runtime fix was made during this audit.
