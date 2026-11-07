# Phase 1 implementation order and file map

2026-11-07. Planning only; complements the
[roadmap and milestone exits](PHASE1_COMPLETION_ROADMAP.md) and
[owner decision register](OWNER_DECISIONS_REQUIRED.md). Existing source paths were
checked against the repository. New paths below are proposed additions, not files
created in this task. A named file is a planned change surface, not permission to
rewrite the entire module. Preserve unrelated/untracked audit work.

## Dependency order and review units

1. Open **M0** incident decision and **OD-S/L/P/R/F/G/A/H** owner/support requests
   immediately. Do not rotate a key or block independent local code while waiting.
2. First local PR: **M1** only (non-blocking receipt-failure awareness). No migration,
   external call, new secret, billing policy or production action.
3. Separate local PRs: **M2** disabled Google adapter and **M6a** AI evaluation
   fixtures; start **M11** local accessibility/performance measurement baseline.
   These can proceed independently; no delegation or parallel agents are implied.
4. After Google/privacy/token-custody decisions: **M3 → M4**; after onboarding
   acceptance: **M5a**; after source/entitlement decisions: **M5b**. Keep manual
   canonical Google URL onboarding available. Live Google verification is separately
   authorized and is not a local PR merge condition masquerading as completed work.
5. After AI account/model/processor/entitlement approval: **M6b**, using M6a cases.
6. After written finance policy: **M7a → M7b → M7c**; **M7d** depends on approved
   invoice/tax policy and billing inputs; **M7e** depends on approved lifecycle rules.
   Each disabled slice independently testable; never lift all holds through one flag.
7. After approved legal content/data policy: **M8a**, then **M8b** with reviewed
   retention/hold design. **M9** follows explicit auth decision, not the OAuth task.
8. **M10** support/design/rehearsal work can run alongside development. Shared-state
   implementation depends on approved Hostinger-only topology; not on an assumed
   Redis service or a new external database. **M11** full acceptance follows the
   relevant product/UI slices; field tests require reviewers/environment.
9. **M12** release/acceptance requires resolved incident, functional/owner/provider/
   operational gates; deployment, migrations, live charges and secrets remain
   separate explicitly authorized operations.

Critical chains are owner finance → M7, owner privacy/Google → M3-M4,
owner legal → M8, owner/support topology → M10, and incident/use-status → M0.
The project manager should track each code exit and external evidence exit
separately; a merged disabled adapter is not a live integration.

## Exact existing and proposed frontend/backend/test surfaces

Paths are repository-relative. New-file names are proposed stable logical paths;
database filenames/sequences cannot be finalized before approved schema design.
All newly proposed tests are meaningful behavior/security cases, not snapshots
that mirror implementation. Shared regression files are touched only if contracts
actually change.

| Milestone | Frontend files | Backend/tool files | Database files/change | Focused tests / evidence |
| --- | --- | --- | --- | --- |
| M0 | None required; never put keys in UI | Existing backend/scripts/generate-auth-secrets.mjs, backend/src/auth/configuration.ts, backend/src/auth/mfa.ts; backend/docs/secret-rotation-runbook.md. Change only if specific tooling gap confirmed. Conditional new backend/scripts/mfa-key-check.mjs and mfa-reencrypt.mjs after approved design | No table changes for first setup; used-key reencryption touches existing user_mfa only in separately approved operation, no migration needed | Existing backend/test/deployment-tools.test.mjs, auth.test.mjs, mfa.integration.mjs; conditional new mfa-key-tools.test.mjs and mfa-key-rotation.integration.mjs using synthetic data/keys only |
| M1 | src/application/public.tsx, src/application/languages.ts; live.css only if a measured UI requirement needs it | None expected; backend/src/ai/routes.ts and ai/service.ts are contract references, not scope for billing changes | None | test/frontend/public.test.tsx, test/browser/app.spec.ts; existing backend/test/setup.integration.mjs remains regression baseline |
| M2 | None initially | New backend/src/google/configuration.ts, provider.ts, types.ts; config/env.ts or server.ts only when integrating a complete disabled configuration contract | None | New backend/test/google.test.mjs for injected synthetic transport/config/error contracts |
| M3 | src/application/api.ts only for approved authenticated start/callback contract; callback screen belongs M4 | New backend/src/google/service.ts, routes.ts, crypto.ts; backend/src/app.ts, server.ts, config/env.ts; auth/authorization.ts, tenants/service.ts reused, not bypassed; migrations/privileges.ts for new tables | Queue D-G below; no auth MFA-key reuse for OAuth tokens; schema-manifest.json and regression expectations updated only with additive files | New backend/test/google.integration.mjs; extend google.test.mjs; backend/test/migration-safety.integration.mjs, schema.integration.mjs, setup.integration.mjs as applicable |
| M4 | New src/application/google.tsx; src/application/merchant.tsx, api.ts, types.ts, Root.tsx if callback route needed; accounts.tsx only if wizard entry changes | google/service.ts, routes.ts; business/service.ts, validation.ts, routes.ts for reviewed import into existing merchant/branch records | Reuse D-G connection mapping; add separate D-G relation only if ownership review requires it | New test/frontend/google.test.tsx; extend backend/test/google.integration.mjs; scripts/e2e-real.mjs, test/browser/app.spec.ts (synthetic provider only locally) |
| M5a | New src/application/onboarding.tsx; merchant.tsx, presentation.tsx, accounts.tsx, types.ts, Root.tsx, live.css | backend/src/business/presentation.ts, presentation-routes.ts, validation.ts, service.ts; funnels/service.ts only for approved publish/preview change | D-P only if approved colors/template fields require persistence; existing data/versions preserved | New test/frontend/onboarding.test.tsx; backend/test/business.integration.mjs, setup.integration.mjs; scripts/e2e-real.mjs |
| M5b | presentation.tsx, onboarding.tsx, types.ts | New backend/src/business/keywords.ts; presentation.ts, presentation-routes.ts, ai/provider.ts, ai/service.ts; fixed business/feedback validation must remain compliant | No DB change for accepted manual keyword storage; D-P/D-C only if approved question/version/provenance needs it | New backend/test/keywords.test.mjs; setup.integration.mjs, business.integration.mjs; onboarding/presentation frontend tests, public.test.tsx |
| M6a/b | src/application/drafts.tsx, languages.ts only for observed contract/quality/error defects | backend/src/ai/provider.ts, service.ts; new backend/scripts/evaluate-drafts.mjs with explicit synthetic/live separation; reviewed prompt extracted to new backend/src/ai/prompts.ts if useful | No DB change required for fixture/evaluation; D-A only if approved version/budget metadata must persist, not automatic content collection | backend/test/ai-billing.test.mjs, setup.integration.mjs; new backend/test/ai-quality.test.mjs; test/frontend/public.test.tsx; optional new test/frontend/drafts.test.tsx; separately approved real evaluation artifact |
| M7a | src/application/catalog.tsx, subscriptions.tsx, billing.tsx, analytics.tsx, types.ts | backend/src/subscriptions/catalog.ts, model.ts, quota.ts, service.ts; billing/terms.ts, service.ts; ai/service.ts where usage contract changes | Existing plans/limits/terms first; D-F only for approved missing fields. Never edit seed scripts to invent a default catalog | backend/test/subscriptions.test.mjs, subscriptions.integration.mjs, quotas.integration.mjs, task22.test.mjs, setup.integration.mjs; test/frontend/subscriptions.test.tsx, billing.test.tsx |
| M7b/c | billing.tsx, subscriptions.tsx, catalog.tsx, api.ts, types.ts | backend/src/billing/approval.ts, provider.ts, service.ts, routes.ts, terms.ts; subscriptions/service.ts, model.ts, quota.ts; auth/tenants permission paths reused | D-F only after lifecycle/idempotency design; migration grants/manifests reflect actual new objects | New backend/test/billing-lifecycle.integration.mjs and billing-reconciliation.test.mjs; existing ai-billing.test.mjs, task22.test.mjs, setup.integration.mjs; frontend billing tests; provider sandbox evidence separate |
| M7d | New src/application/invoices.tsx; billing.tsx, api.ts, types.ts | New backend/src/billing/invoices.ts, invoice-pdf.ts, credit-notes.ts; billing/service.ts, routes.ts, validation.ts (new), terms.ts | D-F approved billing identity/issued-document/sequence/credit-note storage and immutability; cannot invent table rules before policy | New backend/test/invoices.test.mjs, invoices.integration.mjs; test/frontend/invoices.test.tsx; race/rollback/tax and PDF consistency cases with accountant-approved synthetic examples |
| M7e | billing.tsx, subscriptions.tsx for approved state/error presentation | New backend/src/billing/dunning.ts, dunning-cli.ts; billing/service.ts, subscriptions/service.ts, auth/smtp.ts only for approved messages; no background job on startup | D-F durable attempt/state data if approved; no guessed schedule/defaults | New backend/test/dunning.test.mjs, dunning.integration.mjs; subscriptions.integration.mjs, task22.test.mjs, frontend billing/subscription tests |
| M8a | New src/application/legal.tsx, compliance.tsx; Root.tsx, accounts.tsx, auth.tsx/onboarding.tsx per acceptance policy | New backend/src/legal/service.ts, routes.ts, validation.ts; app.ts, server.ts; existing auth/tenant flows updated only under approved gating rules | D-L approved version/acceptance records; no dummy legal text seeded | New backend/test/legal.test.mjs, legal.integration.mjs; test/frontend/legal.test.tsx; scripts/e2e-real.mjs for scoped version acceptance |
| M8b | compliance.tsx, feedback.tsx/settings only if owner permits | New backend/src/privacy/service.ts, routes.ts, retention.ts, retention-cli.ts; feedback/service.ts, validation.ts, tenants/service.ts, auth/database.ts only for approved holds/audit boundaries; scripts/recovery retained | D-L consent/hold/request/approved telemetry fields if required; no modified historic CHECK/append-only guarantees, reconcile erasure exceptions first | New backend/test/privacy.test.mjs, privacy.integration.mjs; feedback-concurrency.integration.mjs, recovery.integration.mjs; new test/frontend/compliance.test.tsx; dry-run/restore and cross-tenant/hold negatives |
| M9 | src/application/auth.tsx, api.ts, types.ts, Root.tsx only if passwordless approved | Existing backend/src/auth/service.ts, routes.ts, tokens.ts, smtp.ts, configuration.ts; proposed new auth/passwordless.ts only after decision | Reuse auth_tokens only if purpose/security lifecycle supports it; otherwise D-L additive auth design; never weaken existing MFA/session checks | backend/test/auth.test.mjs, auth.integration.mjs, mfa.integration.mjs, startup.test.mjs; new test/frontend/auth.test.tsx; test/browser/app.spec.ts, scripts/e2e-real.mjs |
| M10 | offline-cache.ts/offline.tsx only if approved cache contract changes; no new secret-bearing frontend config | Existing backend/src/config/env.ts, database-transport.ts, tls.ts, db/pool.ts, app.ts, server.ts; auth/routes.ts, ai/routes.ts, feedback/routes.ts; proposed new backend/src/security/rate-limiter.ts only if approved shared store; backend/scripts/recovery/*.mjs; deployment docs | Normally none; any MariaDB-backed shared limiter requires separately reviewed additive D-O schema. No assumption a Redis service exists | backend/test/external.test.mjs, external.integration.mjs, startup.test.mjs, hostinger-local.test.mjs, hostinger-local.integration.mjs, recovery.integration.mjs; deployment-fingerprint.test.mjs; new rate-limiter.test.mjs/integration only if store changes |
| M11 | src/application/public.tsx, drafts.tsx, languages.ts, offline.tsx, offline-cache.ts, live.css, analytics.tsx, Root.tsx; App.tsx/Interactive.tsx only to retain clear demo labels | feedback/service.ts, funnels/service.ts, ai/service.ts only for approved truthful metrics/error fixes | None for measurement-only baseline; D-L/D-A if new collection approved | test/frontend/public.test.tsx, offline.test.ts, navigation.test.ts, api.test.ts; test/browser/app.spec.ts, scripts/e2e-real.mjs; proposed scripts/phase1-performance.mjs, test/browser/accessibility.spec.ts; physical/native evidence separate |
| M12 | No functional changes expected; fix only observed release regression | backend/scripts/deployment-fingerprint.mjs; existing operator/bootstrap/diagnostic/recovery tools and runbooks, reports acceptance records | No automatic production migration; additive artifact manifests verified, operator execution separately approved | Full existing suite plus new milestone tests; both builds/typechecks, Oxlint, diff, online advisory/pentest/manual/provider acceptance evidence |

Frontend paths after the first `src/application/` in each cell remain under that
directory. Backend paths such as `billing/service.ts` remain under backend/src.
Test filenames without prefix in backend test cells are under backend/test. These
abbreviations identify exact logical files, not wildcard permission to change a tree.

## Additive database change queue

No SQL files are created or run in this planning task. Current immutable prefix
ends at 000084. The first newly approved SQL statement will receive 000085 if no
intervening change lands. **Do not reserve guessed version numbers for unknown
tables/constraints**: assign the full ordered numeric prefix at implementation,
one statement per file and matching `.verify.sql`, through the existing runner.

| Queue | Proposed migration filename suffixes / content | Prerequisite |
| --- | --- | --- |
| D-G | create_google_connections.sql, create_google_oauth_attempts.sql, and separate ownership/index/immutability statements as approved; matching verify files | Tenant-bound token custody/state lifecycle/location cardinality/privacy retention; M3 |
| D-P | add_merchant_presentation_branding.sql, plus separate bounded constraints if approved | Exact color/template/asset minimum, M5a; no gallery schema by default |
| D-C | create_channel_question_versions.sql or approved additive version extension, not modification of protected original rows | Explicit fixed-label/question reconciliation, M5b |
| D-A | add_ai_prompt_version.sql or approved usage-version extension only if needed | Prompt retention/budget policy; M6; no default stored user content |
| D-F | create_billing_identities.sql, create_billing_invoices.sql, create_billing_invoice_sequences.sql, create_billing_credit_notes.sql, create_billing_attempts.sql as actually required, each with individual checks/FKs/triggers/verify | Finance-reviewed lifecycle, tax, numbering, idempotency, currency and retention; M7 |
| D-L | create_legal_policy_versions.sql, create_legal_acceptances.sql, create_privacy_requests.sql, create_retention_holds.sql, plus approved token/telemetry extension only if needed | Legal/privacy/auth decisions; M8/M9 |
| D-O | create_rate_limit_buckets.sql only if an approved MariaDB shared-limit design is selected | Hostinger topology/concurrency/capacity acceptance; M10 |

These suffixes describe review candidates, not approved schemas or final filenames.
Exact DDL cannot truthfully be specified before owner policy and relationship
design. Required existing database-support file changes, whenever new schema lands:
`backend/docs/schema-manifest.json`, `backend/src/migrations/privileges.ts`,
`backend/test/migrations.test.mjs`, `backend/test/migrations.integration.mjs`,
`backend/test/schema.integration.mjs`, `backend/test/migration-safety.integration.mjs`
and `backend/docs/migration-guide.md` as their contracts require. Generate the
manifest using `backend/scripts/schema-manifest.mjs` only against disposable schema.
Recheck schema counts rather than freezing current 32 tables/46 triggers after
new approved additions. No old migration checksum or applied verification changes.

## First safe local milestone specification: M1

Current `src/application/public.tsx` swallows the `/views` POST rejection. Implement
only a neutral metering-unavailable state using existing notice conventions and
reviewed en/hi/ml text. Do not retry automatically or add tracking fields; keep
current signed-token/request idempotency semantics, prevent late rejection leaking
state into another code/revision, and keep both public paths independent. A failed
measurement is not a failed feedback submission or permission to hide Google.

Change scope: public.tsx, languages.ts, test/frontend/public.test.tsx and
test/browser/app.spec.ts; add a focused test file only if needed for clarity.
No backend/database/env/secret changes expected. Unit/browser cases: network/503/
409/429 failures, all five ratings, each language, Google click/private submit
still functional, reload/unmount and invalid link handling, no silent promise
rejection, no extra POST/retry or client secret/error detail. Follow with the existing
actual local-stack E2E. Estimated 1-2 engineering days. This closes G14's swallowed
failure subset, **not** billable-scan definition, full reconciliation or Phase1.

## Test/review discipline for each later milestone

Run focused unit/contract tests first; run relevant real MariaDB tests on a fresh
disposable target for data/security changes. Include concurrent/replay/rollback and
cross-tenant/ancestor-suspension/role negatives for new privileged flows. Every
public change must preserve all-ratings Google/private choice and Clinic structure.
External fixtures stay explicitly synthetic and separate from approved live tests.
Before release, rerun the complete expanded suite, builds/typechecks, existing
Oxlint and diff checks; do not assert a future fixed test count or add tests that
only repeat implementation. Last audit baseline was 320 passed, not rerun here.

Review source changes, manifest/privilege deltas, secret-safe logs, updated feature
matrix and milestone acceptance together. Split unrelated tasks into separate
review units. Production accounts, environment files, MFA keys and actual customer
records are never local test inputs. No push/merge/migration/deployment without
the applicable explicit authorization.
