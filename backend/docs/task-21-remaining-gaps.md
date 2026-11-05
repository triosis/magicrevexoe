# Task 21 remaining gaps

2026-11-05. **Application incomplete; no production readiness or deployment approval.**
Read with the unchanged original SOW v1.0, separate Task 02 amendment and Task 20
traceability matrix. Task 21 authorizes development; it does not approve commercial
numbers, externally verify integrations or silently remove other Phase 1 requirements.

## Owner policy instruction

The owner confirmed during Task 21 that no approved Billing, Settlement and GST
Policy exists. Settlement, overage charging, refunds, credit notes and automated
dunning must stay disabled until written owner approval with finance/accounting
review. This is an explicit restriction, not an inferred waiver of the SOW.
Invoice data preparation is implemented without issuing financial documents.

## Owner commercial decisions

The owner explicitly rejected treating the original proposed numbers as approved.
No production catalog, plan, commercial approval, provider subscription or credentials
were created. All of the following remain unset until an authorized Super Admin records
an explicit immutable commercial approval and matching published resource plan:

- Monthly/yearly prices, currencies, billing cycles and approved payment-plan IDs.
- Staff seats, branches, feedback submissions, short links and QR asset limits.
- Scan allowances and overage rates; AI draft/token allowances and overage rates.
- Unlimited versus finite limits, feature/language availability and rounding policy.
- Verified invoice issuer identity/address/GST registration, applicable tax rates,
  tax-inclusive/exclusive policy and legally reviewed invoice numbering requirements.

No missing value means zero or unlimited. Synthetic values appear only in tests.
Paid administrative assignment/reactivation and checkout fail closed without approval.
Existing historical allocations are not automatically overwritten or revoked.

## Phase 1 work and external evidence still required

| Requirement / SOW reference | Current boundary | Required next step |
| --- | --- | --- |
| AI drafts, §6 Phase 1 and Module 6.1 | Real Claude adapter, structured customer form, three languages, actual token accounting and safe failure paths implemented locally | Owner configures approved Haiku/Sonnet model IDs, API version and protected provider key; separately authorized real-provider evaluation of language quality, hallucinations, medical exclusion, negative sentiment and P95 latency. No real AI response was obtained during this task |
| AI-assisted seed keywords and merchant-editable industry prompts, Modules 2.3/4.1/5.2 | Provider prompt uses server-derived industry and structured service facts; no merchant keyword suggestion/editor or custom prompt builder | Those authoring/onboarding features remain unimplemented; they must not be inferred from the customer draft adapter. Review any SEO language for substantiation/compliance before adding it |
| Public three languages, Module 5.1 / §6 | English/Hindi/Malayalam customer controls and service questions implemented | Native-speaker review, accessibility and low-bandwidth/sub-1s performance acceptance remain unverified; merchant-authored names/headings are not automatically translated |
| Three commercial tiers, Module 10.1 / §6 | Versioned catalog supports Starter/Professional/Enterprise without seeding names, prices or limits | Owner supplies actual approved catalog; numerical examples in original SOW are not approval |
| Razorpay, §6 / Module 10.4 | Real fixed-origin adapter, hosted checkout, signed captured-payment confirmation, deduplication, atomic allocation and explicit renewal cancellation implemented | Approved test account/configuration, matching provider plans, payment methods, real captured payment/webhook delivery, refunds/disputes and provider lifecycle acceptance are unverified. Unknown/overlapping/out-of-order historical payments require operator reconciliation; no automatic financial retry |
| Usage-based overages, Modules 1.5 / 10.2 | Separate view/token records and exact configured-rate estimates; unresolved reservations do not become confirmed token usage | Owner must approve a written finance-reviewed policy defining billable scans, settlement timing, refund/dispute rules and commercial values. Automatic overage collection and settlement are **not implemented**. Recorded browser views do not prove unique customers, physical scans or Google posts |
| GST PDF invoices, Module 1.5 | Non-issuable, tenant-scoped invoice preparation returns configured issuer/plan and verified receipt references; recipient, number, tax split and amount due remain null. Provider invoice binds each captured payment to its subscription | Merchant billing identity/place-of-supply workflow, immutable tax invoice snapshots, PDF generation, credit notes and reviewed GST rules remain **unimplemented**. Payment receipt records are not GST invoices; do not enable a paid launch based on them |
| Dunning/renewal, Module 10.5 | Existing period expiry/quota rules and explicit cancellation preserved; captured renewal can allocate a nonoverlapping current period | Automated dunning is explicitly disabled pending written policy: retry schedule, reminders, grace, suspension and restoration rules require approval and later implementation/acceptance. No unapproved three-retry or discount policy was introduced |
| Bootstrap/catalog, §6 onboarding / Modules 1.2, 4.1 | Repeatable target-approved first-owner CLI; MFA at first login; immutable catalog authoring UI/API; existing channel publication workflow | Provider-specific restricted bootstrap grants and operator rehearsal remain unverified. No production bootstrap occurred. Existing identity stores deliberately cannot be adopted/reset by bootstrap |
| Broader Task 20 Phase 1 onboarding/dashboard/compliance | Existing working hierarchy, channel/branch/funnel setup, QR, private inbox, MFA and quotas preserved | Task 20 matrix still records GBP OAuth/import, logo/print templates, broader analytics, terms/privacy/retention and acceptance/performance gaps. This task does not declare those delivered or waive them |

Stripe appears in original Module 3.3 for international/reseller payments. The
explicit Phase 1 roadmap selects Razorpay; Stripe is not implemented or claimed.
If the owner requires international payments in Phase 1, record that phase decision
and approved settlement/currency/tax requirements before extending payment behavior.

## Deferred scope preserved

Module 6.2 auto-replies and eight additional languages: Phase 2. Module 6.3
sentiment/topics, 6.4 GBP audits, 6.5 AI content/images, broader 6.6 fraud detection:
Phase 3. Module 6.7 voice: Phase 4. Industry prompt/keyword builders are not a
claim that these later AI modules exist. Commissions, reseller wallets, wholesale
pricing and payouts remain deferred under Task 02. Clinic free text/medical detail,
rating-gated Google paths and staff-name scripting remain prohibited.

No Hostinger connection, production migration, provider payment, secret rotation,
external message or production configuration change occurred.
