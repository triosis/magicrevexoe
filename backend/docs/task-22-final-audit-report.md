# Task 22 final SOW gap closure audit

2026-11-06. Repository baseline `efc0a717d19d3306c7cf86da620425eb211d17a8`.
**Phase 1 is not complete. Application completion and production readiness are not
claimed.** This audit closes the independent local gaps below and records remaining
owner, provider, code and acceptance dependencies explicitly.

Authority: original SOW v1.0, separately preserved Task 02 corrections, subsequent
explicit owner restrictions and Task 22. The original file remains unchanged with
SHA-256 `212492f82241a9072b28f1b3aad9e86cdd55b6f2d19666a35855a5bdfaeb47d4`.
No source price grid, projected figure or test fixture became a commercial default.

## Conclusions

| Required conclusion | Result |
| --- | --- |
| Phase 1 complete? | **No**. Google OAuth/import and keyword recommendations remain code/dependency gaps; financial/legal/authentication decisions and external quality/performance acceptance remain unresolved |
| Locally implemented and verified? | Yes, for the exact contracts/tests in task-22-test-report.md; synthetic adapters are identified separately |
| External integrations verified? | **No** actual Claude, Razorpay, Google OAuth/ownership/import, external SMTP inbox, provider grants/TLS/DNS, off-site restore or representative capacity verification |
| Deferred scope? | Task 02 financial reseller hierarchy; Phase 2 white-label/replies/languages/hardware; Phase 3 advanced AI/analytics/builders/integration APIs; Phase 4 voice/mobile/marketplace/advanced policy automation |
| Owner decisions? | Written financial policy/catalog, legal text/acceptance, privacy/consent, retention/deletion, authentication amendment, provider/hosting configuration and field acceptance; exact record in task-22-owner-decisions.md |
| Ready for manual acceptance? | **Assisted testing of the implemented isolated subset only**. Not full Phase 1 sign-off, paid acceptance, unrestricted provider testing or production. A persistent synthetic QA environment still needs preparation; automated fixtures shut down |

## Requirement audit method

Inspected actual services/routes, validation, migration SQL/triggers, privilege map,
public/admin React modules, configuration, tests and reports. The reproducible
`backend/scripts/task22-audit.mjs` inventories **503** individual source items under
**92** headings: bullets, steps, table attributes, meaningful flow lines and normative
statements. Each has original line reference, approved phase/disposition, one of the
seven requested classifications, source/test evidence and a precise remaining limit.
Classification counts are not a completion percentage and do not mean every clause
in a partial source line is implemented. The detailed matrix is the canonical audit;
the earlier Task 20/21 matrices remain historical snapshots.

Status is local-contract verified only where evidence exists. Actual missing Google
connector code is labelled **Not implemented**, not hidden as merely missing credentials.
External quality, device/performance and legal/business claims are not certified from
unit tests. Original superseded customer narrative/contact, arbitrary-depth tree and
PostgreSQL/RLS requirements are explicitly mapped to Task 02 replacements.

## Implemented corrections

| SOW / task reference | Exact previous gap | Completed correction / evidence |
| --- | --- | --- |
| Task 22 §4; SOW 1.5/4.9/10 | Commercial approval alone could permit paid activation/checkout | Non-overridable current financial hold covers assignment, reactivation, internal payment allocation and checkout, including cached checkout URLs. Catalog rows, roles, signatures and environment flags cannot lift it. Signed historical receipts remain deduplicated/reconciled without allocation; UI offers no payment initiation |
| SOW 4.1/5.2/6.1 | No owned merchant keyword setup | Strict 3–5 business phrase editor (explicit empty clears), optimistic versions, RBAC/ancestry, audit and immutable ownership. Server-derived merchant context reaches the real AI adapter; no customer-supplied prompt, fake recommendation or compelled SEO claim |
| SOW 4.1/5.1 | No logo upload/public logo | Authenticated bounded static RGB/RGBA PNG pipeline validates structure/CRC, dimensions, inflation bound and forbidden metadata/animation/tail; 64 KiB/512-pixel bounds. No SVG/URL upload or executable template. Current merchant logo appears on its public page; cross-tenant writes refuse |
| SOW 4.3/7.1 | Status counts/mean only | Scoped, bounded UTC rating distributions and accessible shares, daily private feedback, recorded funnel view/click events, recent feedback and language/token records. Google post/conversion/velocity remain explicitly unavailable. Date/branch/merchant scopes and permissions revalidated |
| SOW 4.4 | No resolved-to-archived workflow | Additive immutable archive relation and triggers, resolved-only database insert guard, optimistic version update, atomic success audit and archive history projection. Old enum rows/events and dismissed spam/duplicate semantics preserved. Archived entries cannot reopen through the API |
| SOW 4.4/5.2 | Feedback language absent | Optional strict en/hi/ml input, stored immutable language, admin display and retry comparison. Historical language stays NULL/unknown, never backfilled as guessed English. Clinic input remains ratings plus language only |
| SOW 4.9 | No 80%/100% warning | Exact bigint in-app alerts based only on actual configured finite capacity; missing/unlimited/inactive data does not create a threshold. No message delivery or charging implied |
| SOW 5.1/11.1 | No large star-entry controls | Accessible 48-pixel minimum star buttons before both independent paths, preserving either path at every rating. Prefill assists forms; changing the public selection cannot mutate an attempted duplicate-safe private submission |
| SOW 5.4 | No offline destination fallback | Only a previously verified canonical Google destination is retained in the same tab for at most ten minutes; no private form token cached. Expiry checked at click, explicit disabled/invalid/unauthorized responses invalidate cache. First-ever offline destination is not invented |
| SOW 4.1/4.2/9.3 Phase 1 QR | PDF missing | Deterministic A6 vector QR PDF download uses the same ownership, ready digest, active branch/link, expiry and publication checks as SVG/PNG. No financial document, NFC hardware or industry fulfillment claim. Rendered preview visually inspected and exact QR destination decoded from rendered pixels |

The originally fixed structured-field/label CHECKs are unchanged. Per-industry
service-only AI guardrails do not expose a custom rule editor. Branding/keywords
cannot disable compliance, change destination provider or create medical feedback.

## Database, security and preservation

Eight additive single-statement migration/verification pairs, 000077–000084:
merchant_presentation and immutable feedback_archives, feedback language column and
ownership/archive/language triggers. Current full schema: **85 migrations, 32 tables,
46 triggers**. All 77 pre-Task-22 checksums and structural prefix fingerprints remain
unchanged. No old migration was modified, skipped, baselined or automatically retried.
The fresh manifest was regenerated only against a disposable MariaDB 11.8.9 server.

Runtime adds only SELECT/INSERT/UPDATE for merchant_presentation and SELECT/INSERT
for feedback_archives; no DDL, ledger or global grants. Existing root point-lock
projection/order, transactional quota/audit boundaries, MFA, session/replay checks,
tenant ancestry and all three corrected merchant parent paths remain. New presentation
routes authenticate before parsing the bounded image body. No arbitrary URL image,
filesystem upload path, business rule toggle or public tenant identifier is exposed.

No billing-policy secret switch or test-only finance bypass exists. Tests that need
resource allocations now use explicit zero-price synthetic plans, while retaining
configured-price/catalog assertions and adding refusal even with commercial approval.
Historical external-agreement/paid-row fixtures are direct isolated fixtures, not
successful paid application activation. Existing constraints and test controls were
not weakened to obtain a passing result.

## Remaining work and manual acceptance

See task-22-remaining-gaps.md and task-22-owner-decisions.md. No approved ToS/privacy/
retention text or formal authentication amendment exists; the owner explicitly
instructed preserving current authentication and awaiting those decisions. No such
document, acceptance, period or guarantee was fabricated. Financial execution stays
disabled pending written finance review. Further Google connector/import and keyword
recommendation work depends on approved consent/provider/data/entitlement requirements;
it remains visible as incomplete code, not a made-up deferral.

Assisted manual QA should exercise: real first-owner/MFA setup; each merchant parent
path; PNG/keyword change and stale-version refusal; three-language star/private/Google
choices; pending-submit immutability; analytics scope/filtering; resolve/archive/history;
QR SVG/PNG/PDF; explicit-link-disable versus transient cached fallback; finite-capacity
warnings; paid-activation/checkout refusal even after catalog approval; and non-issuable
invoice preparation. Use synthetic owned data and protected local configuration, never
production credentials or automatically issued financial documents.

No Hostinger connection, production database/migration, hosting/service/secret change,
real model/payment/Google API request or external message occurred. Temporary PDF
rendering dependencies were installed in an ignored QA directory only; application
package manifests/locks did not change.

## Complete file inventory

All 76 files below are Task 22 changes from the clean baseline. Generated builds,
ignored disposable databases and temporary QA logs/tools are excluded. Existing
migration SQL and package manifests/locks are unchanged.

| File | Change |
| --- | --- |
| [backend/docs/database-compatibility-checklist.md](../docs/database-compatibility-checklist.md) | Modified |
| [backend/docs/database-privilege-matrix.md](../docs/database-privilege-matrix.md) | Modified |
| [backend/docs/feedback-api.md](../docs/feedback-api.md) | Modified |
| [backend/docs/final-application-completion-report.md](../docs/final-application-completion-report.md) | Modified |
| [backend/docs/final-owner-action-checklist.md](../docs/final-owner-action-checklist.md) | Modified |
| [backend/docs/manual-acceptance-testing-guide.md](../docs/manual-acceptance-testing-guide.md) | Modified |
| [backend/docs/migration-guide.md](../docs/migration-guide.md) | Modified |
| [backend/docs/production-blockers.md](../docs/production-blockers.md) | Modified |
| [backend/docs/production-readiness-report.md](../docs/production-readiness-report.md) | Modified |
| [backend/docs/schema-manifest.json](../docs/schema-manifest.json) | Modified |
| [backend/docs/security-audit-report.md](../docs/security-audit-report.md) | Modified |
| [backend/docs/sow-traceability-matrix.md](../docs/sow-traceability-matrix.md) | Modified |
| [backend/docs/subscriptions-api.md](../docs/subscriptions-api.md) | Modified |
| [backend/src/ai/provider.ts](../src/ai/provider.ts) | Modified |
| [backend/src/ai/service.ts](../src/ai/service.ts) | Modified |
| [backend/src/app.ts](../src/app.ts) | Modified |
| [backend/src/billing/service.ts](../src/billing/service.ts) | Modified |
| [backend/src/feedback/routes.ts](../src/feedback/routes.ts) | Modified |
| [backend/src/feedback/service.ts](../src/feedback/service.ts) | Modified |
| [backend/src/feedback/validation.ts](../src/feedback/validation.ts) | Modified |
| [backend/src/funnels/routes.ts](../src/funnels/routes.ts) | Modified |
| [backend/src/funnels/service.ts](../src/funnels/service.ts) | Modified |
| [backend/src/migrations/privileges.ts](../src/migrations/privileges.ts) | Modified |
| [backend/src/subscriptions/model.ts](../src/subscriptions/model.ts) | Modified |
| [backend/src/subscriptions/service.ts](../src/subscriptions/service.ts) | Modified |
| [backend/test/migration-safety.integration.mjs](../test/migration-safety.integration.mjs) | Modified |
| [backend/test/recovery.integration.mjs](../test/recovery.integration.mjs) | Modified |
| [backend/test/schema.integration.mjs](../test/schema.integration.mjs) | Modified |
| [backend/test/setup.integration.mjs](../test/setup.integration.mjs) | Modified |
| [backend/test/subscriptions.integration.mjs](../test/subscriptions.integration.mjs) | Modified |
| [scripts/e2e-real.mjs](../../scripts/e2e-real.mjs) | Modified |
| [src/application/api.ts](../../src/application/api.ts) | Modified |
| [src/application/billing.tsx](../../src/application/billing.tsx) | Modified |
| [src/application/drafts.tsx](../../src/application/drafts.tsx) | Modified |
| [src/application/feedback.tsx](../../src/application/feedback.tsx) | Modified |
| [src/application/merchant.tsx](../../src/application/merchant.tsx) | Modified |
| [src/application/public.tsx](../../src/application/public.tsx) | Modified |
| [src/application/subscriptions.tsx](../../src/application/subscriptions.tsx) | Modified |
| [src/application/types.ts](../../src/application/types.ts) | Modified |
| [test/frontend/billing.test.tsx](../../test/frontend/billing.test.tsx) | Modified |
| [test/frontend/navigation.test.ts](../../test/frontend/navigation.test.ts) | Modified |
| [test/frontend/public.test.tsx](../../test/frontend/public.test.tsx) | Modified |
| [backend/docs/task-22-api-changes.md](../docs/task-22-api-changes.md) | Created |
| [backend/docs/task-22-final-audit-report.md](../docs/task-22-final-audit-report.md) | Created |
| [backend/docs/task-22-owner-decisions.md](../docs/task-22-owner-decisions.md) | Created |
| [backend/docs/task-22-remaining-gaps.md](../docs/task-22-remaining-gaps.md) | Created |
| [backend/docs/task-22-sow-traceability-matrix.md](../docs/task-22-sow-traceability-matrix.md) | Created |
| [backend/docs/task-22-test-report.md](../docs/task-22-test-report.md) | Created |
| [backend/migrations/000077_create_merchant_presentation.sql](../migrations/000077_create_merchant_presentation.sql) | Created |
| [backend/migrations/000077_create_merchant_presentation.verify.sql](../migrations/000077_create_merchant_presentation.verify.sql) | Created |
| [backend/migrations/000078_protect_merchant_presentation_owner.sql](../migrations/000078_protect_merchant_presentation_owner.sql) | Created |
| [backend/migrations/000078_protect_merchant_presentation_owner.verify.sql](../migrations/000078_protect_merchant_presentation_owner.verify.sql) | Created |
| [backend/migrations/000079_create_feedback_archives.sql](../migrations/000079_create_feedback_archives.sql) | Created |
| [backend/migrations/000079_create_feedback_archives.verify.sql](../migrations/000079_create_feedback_archives.verify.sql) | Created |
| [backend/migrations/000080_protect_feedback_archives_update.sql](../migrations/000080_protect_feedback_archives_update.sql) | Created |
| [backend/migrations/000080_protect_feedback_archives_update.verify.sql](../migrations/000080_protect_feedback_archives_update.verify.sql) | Created |
| [backend/migrations/000081_protect_feedback_archives_delete.sql](../migrations/000081_protect_feedback_archives_delete.sql) | Created |
| [backend/migrations/000081_protect_feedback_archives_delete.verify.sql](../migrations/000081_protect_feedback_archives_delete.verify.sql) | Created |
| [backend/migrations/000082_add_feedback_language.sql](../migrations/000082_add_feedback_language.sql) | Created |
| [backend/migrations/000082_add_feedback_language.verify.sql](../migrations/000082_add_feedback_language.verify.sql) | Created |
| [backend/migrations/000083_validate_feedback_archive.sql](../migrations/000083_validate_feedback_archive.sql) | Created |
| [backend/migrations/000083_validate_feedback_archive.verify.sql](../migrations/000083_validate_feedback_archive.verify.sql) | Created |
| [backend/migrations/000084_protect_feedback_language.sql](../migrations/000084_protect_feedback_language.sql) | Created |
| [backend/migrations/000084_protect_feedback_language.verify.sql](../migrations/000084_protect_feedback_language.verify.sql) | Created |
| [backend/scripts/task22-audit.mjs](../scripts/task22-audit.mjs) | Created |
| [backend/src/billing/approval.ts](../src/billing/approval.ts) | Created |
| [backend/src/business/presentation-routes.ts](../src/business/presentation-routes.ts) | Created |
| [backend/src/business/presentation.ts](../src/business/presentation.ts) | Created |
| [backend/src/funnels/print.ts](../src/funnels/print.ts) | Created |
| [backend/test/task22.test.mjs](../test/task22.test.mjs) | Created |
| [output/pdf/task-22-qr-print-preview.pdf](../../output/pdf/task-22-qr-print-preview.pdf) | Created |
| [src/application/analytics.tsx](../../src/application/analytics.tsx) | Created |
| [src/application/offline-cache.ts](../../src/application/offline-cache.ts) | Created |
| [src/application/offline.tsx](../../src/application/offline.tsx) | Created |
| [src/application/presentation.tsx](../../src/application/presentation.tsx) | Created |
| [test/frontend/offline.test.ts](../../test/frontend/offline.test.ts) | Created |
