# Task 21 implementation report

2026-11-05. Base commit `87adf6eb3ec6853a56b5ea1c0cdc420edef08fb8`.
**Application incomplete; no production readiness claim.** Work is local only.

Authority: unchanged approved-scope-of-work-v1.md, separate Task 02 amendment,
Task 20 report/matrix/checklist, Task 21 and the owner's explicit instruction to
leave unconfirmed commercial values unset. Proposed SOW numbers were not adopted.

## Requirement results

| Original reference / approved phase | Previous status | Implemented change | Local evidence / remaining boundary |
| --- | --- | --- | --- |
| Module 6.1; §6 Phase 1 AI customer drafts | Absent/disconnected demo | Real Claude Messages/token-count adapter; structured rating/tags; configured primary/complex model; bounded plain editable two-to-four-sentence text; signed form verification; exact usage reservation and atomic audit | ai-billing.test.mjs, setup.integration.mjs, public.test.tsx. No external provider response, quality or latency proof; model IDs/key/version remain owner configuration |
| Module 5.1; §6 Phase 1 English/Hindi/Malayalam | English only | Browser-language initial choice and explicit selector; independent Google/private controls, structured form and AI request language; clipboard/open workflow; React escapes output | Three-language frontend tests and provider output validation. Native-speaker and accessibility/performance review pending |
| Modules 1.5,10.1; §6 Phase 1 catalog | Empty-by-default schema, no authoring | MFA Super Admin catalog UI/API; complete explicit five-resource limits, immutable version publication, exact repeat/conflict handling, immutable commercial approval | Concurrent catalog tests; no three paid tiers seeded. All owner commercial decisions remain unset |
| Module 10.4; §6 Phase 1 Razorpay | No adapter/workflow | Fixed-origin real adapter, protected config, matching provider-plan check, hosted checkout, immutable merchant binding, UUID reservation, raw signed webhook, fetched captured payment + paid invoice binding, receipt deduplication and atomic allocation/counters/audit | Synthetic protocol + actual MariaDB concurrent checkout/payment replay tests. Real payment methods/webhook delivery/provider contract acceptance remain unverified |
| Module 10.5 lifecycle | Manual status/period only | Captured current nonoverlapping renewal allocation and explicit renewal cancellation; prior manual lifecycle, expiry and quota rules preserved | Existing subscription/quota/E2E tests. Dunning, refunds, disputed/delayed historical periods and reconciliation UI remain incomplete; no arbitrary automatic payment retry |
| Modules 1.5,10.2 usage billing | Five resource quotas only | Separate signed view receipts and AI actual/reserved token ledger; exact bigint configured-rate estimates; no conflation with existing resource metrics | Concurrent draft/view, ambiguous failure, audit rollback and quota admission tests. Automatic financial settlement remains unimplemented; billable scan definition/rates need owner approval |
| Module 1.5 GST invoices | Absent | Explicit issuer/tax configuration gate, provider invoice/payment binding and non-issuable scoped invoice data preparation | Not a GST PDF implementation. Recipient identity, tax treatment, immutable invoice snapshots/PDF and legal review remain open |
| §6 onboarding, Modules 1.2/4.1 initialization | Synthetic test bootstrap only | Explicit target-approved operator CLI, full manifest/ledger checks, shared migration lock, atomic first owner/root/membership/audit, password-preserving repeats; first login real MFA | Actual MariaDB concurrency/partial-store tests. No production bootstrap or provider restricted-account rehearsal |
| Modules 6.2–6.7, §6 later phases | Deferred | No later-phase feature silently enabled; no automatic posting, sentiment classifier, audit/content generator or voice | Phase inventory in remaining-gaps report; later features remain deferred |
| Task 02 merchant ownership / deferred financial hierarchy | Existing controls | Financial operations restricted to own merchant admin or scoped Super Admin; typed tenant FK on agreements; no commission/wallet/payout tables | Staff/peer denial plus existing hierarchy/isolation suites |

## Database and security

Ten additive single-statement migrations, 000067–000076, with matching postconditions.
Four new tables: commercial_approvals, billing_agreements, billing_events,
billable_usage. Six triggers preserve approvals/events and ownership/completed
usage. Total: 77 migrations, 30 tables and 41 triggers. New postconditions inspect
engine/collation, columns, indexes and named constraints or trigger metadata.
The regenerated full manifest fingerprints structural definitions at every prefix.
All 67 historical prefix fingerprints and historical SQL files remain unchanged.
No existing constraints, transaction boundaries, ledger history or tests were removed.

Runtime grants now include catalog authoring DML and the four new tables; no
schema/global privileges or ledger access were added. Bootstrap uses separate operator
credentials. No passwords/tokens/provider keys are seeded, returned or written to reports.
External response/driver details are not exposed in public errors. Public draft text
is intentionally returned for customer editing, never interpreted as HTML.

The original feedback root-lock projection/order is preserved. Network I/O occurs
outside actor transactions, so existing bounded pure-DB retries cannot repeat charges
or generations. Payment uncertainty and AI uncertainty retain explicit state; neither
is hidden with a retry loop. Atomic success audit is required. A failed AI completion
leaves a reservation rather than exposing a result whose ledger/audit did not commit.

Process-local rate limiting and conservative language/medical-output checks do not
prove distributed abuse resistance or perfect model safety. Owner must evaluate live
outputs and approve retention/provider data handling before enablement. Cached drafts
are returned only against matching signed form/request/input/tenant and short expiry;
database retention/purge remains a separate approved workflow.

## Verification and remaining work

See task-21-test-report.md for actual command results and file inventory below.
See task-21-workflows.md for API/configuration/bootstrap procedure and
task-21-remaining-gaps.md for unresolved Phase 1 work and owner decisions.
The Task 20 full-product verdict remains incomplete. Tests establish local contracts;
they do not establish paid launch readiness, GST compliance, external provider quality,
approved commercial terms or closure of all Task 20 onboarding/compliance gaps.

No Hostinger connection, production migration, production service/configuration/secret
change, real AI request, real payment or external message occurred.

The owner's follow-up explicitly requires settlement, overage charging, refunds,
credit notes and automated dunning to stay disabled pending a written finance-reviewed
Billing, Settlement and GST Policy. Invoice preparation returns data and missing
approvals only; it creates no numbered financial document or amount due.

## Complete file inventory

All paths are relative to repository root. This includes every created or modified file; generated local logs/build assets are ignored and are not application changes.

| File | Change |
| --- | --- |
| [backend/docs/database-compatibility-checklist.md](../docs/database-compatibility-checklist.md) | Modified |
| [backend/docs/database-privilege-matrix.md](../docs/database-privilege-matrix.md) | Modified |
| [backend/docs/final-application-completion-report.md](../docs/final-application-completion-report.md) | Modified |
| [backend/docs/final-owner-action-checklist.md](../docs/final-owner-action-checklist.md) | Modified |
| [backend/docs/migration-guide.md](../docs/migration-guide.md) | Modified |
| [backend/docs/production-blockers.md](../docs/production-blockers.md) | Modified |
| [backend/docs/production-readiness-report.md](../docs/production-readiness-report.md) | Modified |
| [backend/docs/schema-manifest.json](../docs/schema-manifest.json) | Modified |
| [backend/docs/secret-rotation-runbook.md](../docs/secret-rotation-runbook.md) | Modified |
| [backend/docs/security-audit-report.md](../docs/security-audit-report.md) | Modified |
| [backend/docs/sow-traceability-matrix.md](../docs/sow-traceability-matrix.md) | Modified |
| [backend/docs/subscriptions-api.md](../docs/subscriptions-api.md) | Modified |
| [backend/package.json](../package.json) | Modified |
| [backend/src/app.ts](../src/app.ts) | Modified |
| [backend/src/migrations/privileges.ts](../src/migrations/privileges.ts) | Modified |
| [backend/src/server.ts](../src/server.ts) | Modified |
| [backend/src/subscriptions/routes.ts](../src/subscriptions/routes.ts) | Modified |
| [backend/src/subscriptions/service.ts](../src/subscriptions/service.ts) | Modified |
| [backend/test/migration-safety.integration.mjs](../test/migration-safety.integration.mjs) | Modified |
| [backend/test/recovery.integration.mjs](../test/recovery.integration.mjs) | Modified |
| [backend/test/schema.integration.mjs](../test/schema.integration.mjs) | Modified |
| [backend/test/subscriptions.integration.mjs](../test/subscriptions.integration.mjs) | Modified |
| [scripts/e2e-real.mjs](../../scripts/e2e-real.mjs) | Modified |
| [src/application/Root.tsx](../../src/application/Root.tsx) | Modified |
| [src/application/public.tsx](../../src/application/public.tsx) | Modified |
| [src/application/subscriptions.tsx](../../src/application/subscriptions.tsx) | Modified |
| [test/frontend/public.test.tsx](../../test/frontend/public.test.tsx) | Modified |
| [backend/docs/task-21-implementation-report.md](../docs/task-21-implementation-report.md) | Created |
| [backend/docs/task-21-remaining-gaps.md](../docs/task-21-remaining-gaps.md) | Created |
| [backend/docs/task-21-test-report.md](../docs/task-21-test-report.md) | Created |
| [backend/docs/task-21-workflows.md](../docs/task-21-workflows.md) | Created |
| [backend/migrations/000067_create_commercial_approvals.sql](../migrations/000067_create_commercial_approvals.sql) | Created |
| [backend/migrations/000067_create_commercial_approvals.verify.sql](../migrations/000067_create_commercial_approvals.verify.sql) | Created |
| [backend/migrations/000068_create_billing_agreements.sql](../migrations/000068_create_billing_agreements.sql) | Created |
| [backend/migrations/000068_create_billing_agreements.verify.sql](../migrations/000068_create_billing_agreements.verify.sql) | Created |
| [backend/migrations/000069_create_billing_events.sql](../migrations/000069_create_billing_events.sql) | Created |
| [backend/migrations/000069_create_billing_events.verify.sql](../migrations/000069_create_billing_events.verify.sql) | Created |
| [backend/migrations/000070_create_billable_usage.sql](../migrations/000070_create_billable_usage.sql) | Created |
| [backend/migrations/000070_create_billable_usage.verify.sql](../migrations/000070_create_billable_usage.verify.sql) | Created |
| [backend/migrations/000071_immutable_commercial_approvals_update.sql](../migrations/000071_immutable_commercial_approvals_update.sql) | Created |
| [backend/migrations/000071_immutable_commercial_approvals_update.verify.sql](../migrations/000071_immutable_commercial_approvals_update.verify.sql) | Created |
| [backend/migrations/000072_immutable_commercial_approvals_delete.sql](../migrations/000072_immutable_commercial_approvals_delete.sql) | Created |
| [backend/migrations/000072_immutable_commercial_approvals_delete.verify.sql](../migrations/000072_immutable_commercial_approvals_delete.verify.sql) | Created |
| [backend/migrations/000073_immutable_billing_events_update.sql](../migrations/000073_immutable_billing_events_update.sql) | Created |
| [backend/migrations/000073_immutable_billing_events_update.verify.sql](../migrations/000073_immutable_billing_events_update.verify.sql) | Created |
| [backend/migrations/000074_immutable_billing_events_delete.sql](../migrations/000074_immutable_billing_events_delete.sql) | Created |
| [backend/migrations/000074_immutable_billing_events_delete.verify.sql](../migrations/000074_immutable_billing_events_delete.verify.sql) | Created |
| [backend/migrations/000075_protect_billing_agreements_owner.sql](../migrations/000075_protect_billing_agreements_owner.sql) | Created |
| [backend/migrations/000075_protect_billing_agreements_owner.verify.sql](../migrations/000075_protect_billing_agreements_owner.verify.sql) | Created |
| [backend/migrations/000076_protect_billable_usage_owner.sql](../migrations/000076_protect_billable_usage_owner.sql) | Created |
| [backend/migrations/000076_protect_billable_usage_owner.verify.sql](../migrations/000076_protect_billable_usage_owner.verify.sql) | Created |
| [backend/src/ai/provider.ts](../src/ai/provider.ts) | Created |
| [backend/src/ai/routes.ts](../src/ai/routes.ts) | Created |
| [backend/src/ai/service.ts](../src/ai/service.ts) | Created |
| [backend/src/billing/provider.ts](../src/billing/provider.ts) | Created |
| [backend/src/billing/routes.ts](../src/billing/routes.ts) | Created |
| [backend/src/billing/service.ts](../src/billing/service.ts) | Created |
| [backend/src/billing/terms.ts](../src/billing/terms.ts) | Created |
| [backend/src/setup/bootstrap.ts](../src/setup/bootstrap.ts) | Created |
| [backend/src/setup/cli.ts](../src/setup/cli.ts) | Created |
| [backend/src/subscriptions/catalog.ts](../src/subscriptions/catalog.ts) | Created |
| [backend/test/ai-billing.test.mjs](../test/ai-billing.test.mjs) | Created |
| [backend/test/commercial-fixtures.mjs](../test/commercial-fixtures.mjs) | Created |
| [backend/test/setup.integration.mjs](../test/setup.integration.mjs) | Created |
| [src/application/billing.tsx](../../src/application/billing.tsx) | Created |
| [src/application/catalog.tsx](../../src/application/catalog.tsx) | Created |
| [src/application/drafts.tsx](../../src/application/drafts.tsx) | Created |
| [src/application/languages.ts](../../src/application/languages.ts) | Created |
| [test/frontend/billing.test.tsx](../../test/frontend/billing.test.tsx) | Created |
