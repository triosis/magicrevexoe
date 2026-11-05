# Task 21 operator and API workflows

All HTTP paths below have prefix `/api/v1`. Responses use `Cache-Control: no-store`.
Do not copy test fixtures into a commercial catalog. Existing authentication, active
membership, MFA and tenant ancestry checks remain mandatory for administrative APIs.

## First owner

Apply reviewed migrations to the separately authorized target using the existing
production migration runbook. Bootstrap is a separate CLI, never a public endpoint:

`npm --prefix backend run bootstrap -- --target <policy.json> --environment <local|staging|production> --approve BOOTSTRAP:<policy-SHA256>`

Use the existing migration target-policy format and its `digest(policy)` canonical
SHA-256, not a raw-file hash. Explicit environment, target identity/version/TLS and
approval are required. This documents a future operator procedure; production
execution was not authorized or performed. Protected environment injection supplies
`BOOTSTRAP_DB_USER`, `BOOTSTRAP_DB_PASSWORD`, `BOOTSTRAP_PLATFORM_NAME`,
`BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_NAME`, `BOOTSTRAP_OWNER_PASSWORD`.
Never place credentials/passwords in shell arguments, policy JSON or reports.

The CLI does not load a credential file. The owner password must be 16–128
characters with at least ten distinct characters. The authenticated operator attests
the initial owner's identity. The first actual login still requires MFA enrollment
and verification. No session is issued by bootstrap. Target schema must match the
complete checked-in manifest and checksum ledger. Bootstrap holds the same advisory
lock as migrations, provisions root/user/membership/audit in one transaction, refuses
partial existing stores and never resets an existing password. An identical repeat
returns `created:false`; conflicting identity/name refuses without overwrite.

A separately scoped bootstrap account needs schema SELECT (including ledger and
complete metadata) and INSERT on tenants, users, tenant_memberships and audit_logs.
It needs no UPDATE, DELETE, DDL or global grants. Do not give ledger SELECT to the
runtime account. Effective provider bootstrap grants and trigger-definer behavior
still require a separately approved rehearsal; local bootstrap tests use the
disposable fixture administrator.

## Catalog

Super Admin UI: `/app/catalog`. API:

- `GET /admin/subscription-plans?limit=20&afterId=<id>` lists drafts and published versions.
- `POST /admin/subscription-plans` requires code, positive version, name, exact two-place
  decimal-string price, currency, interval (`month|year`) and all five `limits` keys:
  branches, staff_seats, feedback_submissions, short_links, qr_assets. Values are
  unsigned integer strings or explicit null for unlimited. No omitted defaults.
- `POST /admin/subscription-plans/:id/publish` requires empty body and publishes immutable
  complete terms. Repeating identical create/publish is safe; conflicting versions refuse.
- `POST /admin/subscription-plans/:id/commercial-approval` requires owner `reference` and
  the complete `terms` shape below. Immutable; use a new plan version for changes.

Commercial terms schema (`backend/src/billing/terms.ts`) requires:

| Key | Explicit value |
| --- | --- |
| provider, providerPlanId, cycles | razorpay, actual approved plan ID, finite authorized cycle count |
| scanAllowance, aiDraftAllowance, aiTokenAllowance | Whole strings or explicit null |
| scanOveragePrice, aiTokenOveragePrice | Decimal strings with six fractional digits |
| overageRounding | ceil_minor or half_up_minor |
| features | aiDrafts boolean; languages from en/hi/ml |
| invoice | issuerName, issuerAddress, gstin, state, prefix, taxRateBps, priceIncludesTax |

These fields are decisions, not verified legal compliance. Tax-exclusive checkout
refuses pending a tax settlement workflow. GST invoices/automatic overage settlement
must not be advertised as delivered. See task-21-remaining-gaps.md.

## Customer drafting and metering

`POST /public/funnels/:code/drafts`: submissionToken from the current public form,
UUID requestKey, language en/hi/ml, rating 1–5, up to three allowlisted structured
service tags and optional complex boolean. No arbitrary narrative, merchant IDs,
medical details or free-text feedback. Low ratings may use AI and Google equally.
The draft is editable; copying/opening Google never posts on the customer's behalf.

Provider configuration is optional as a complete set, otherwise startup fails:
ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_API_VERSION, AI_MAX_OUTPUT_TOKENS;
optional ANTHROPIC_FALLBACK_MODEL selects the configured model for complex requests.
No fixed commercial allowance is inferred from the output safety bound. No endpoint
override or vendor key is exposed to browsers. Absent configuration returns 503;
the two independent feedback paths remain usable.

Token estimation and generation occur outside database transactions. Admission
serializes on the established root/subscription locks, reserves bounded usage,
deduplicates the UUID and verifies the signed form/revision/tenant. Completion and
audit commit together. A timeout, rejected output or failed completion retains an
unresolved reservation. Repeating that key never automatically regenerates. Operator
reconciliation must examine provider evidence before releasing an ambiguous charge;
there is no automatic stale-reservation purge or retry.

`POST /public/funnels/:code/views` accepts submissionToken, requestKey and language;
records a deduplicated browser-view receipt only for an approved active allocation.
Its failure never removes either public option. Process-local IP/global throttles
bound both endpoints. Shared multi-instance abuse controls remain an operations gap.

## Payments

Merchant admin for its own tenant, or scoped Super Admin:

- `GET /merchants/:id/billing`: recent agreement status.
- `POST /merchants/:id/billing/checkout`: planId and UUID requestKey.
- `POST /merchants/:id/billing/:agreementId/cancel`: explicit atCycleEnd boolean.
- `GET /merchants/:id/billing/:agreementId/invoice-preparation`: tenant-scoped data
  preparation only; financialDocument/issued false, no invoice number/recipient/tax
  split/amount due, explicit missing finance approvals. Never use it as an invoice.
- `GET /merchants/:id/billing/metering`: recorded views/completed tokens, unresolved
  reservations, configured-rate estimates in minor units, always `settlement:not_charged`.

Staff, peers and parent reseller roles cannot initiate financial operations. Checkout
reserves one local agreement before remote I/O and checks actual provider plan amount,
currency and interval. Only an exact HTTPS rzp.io hosted checkout URL is returned.
Repeated ready requests reuse that URL; creating/unknown operations require reconciliation.
Do not clear unknown state and resubmit without provider evidence: that can double-charge.
Cancellation reserves an unknown state before network I/O; paid local access continues
to its allocated period, without inventing a refund. No provider call is in a retryable
tenant transaction.

Configure complete protected RAZORPAY_MODE, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and
independent RAZORPAY_WEBHOOK_SECRET. Key prefix must match test/live mode. Live additionally
requires explicit BILLING_LIVE_APPROVAL=OWNER_APPROVED_LIVE_BILLING, plus normal release
approval. No live or test provider was contacted in this task.

`POST /billing/webhooks/razorpay` consumes raw JSON (64 KiB maximum), verifies
X-Razorpay-Signature HMAC over exact bytes and validates X-Razorpay-Event-Id. A client
callback/authenticated/activated event grants no access. Captured subscription.charged
payment is fetched from the provider and its paid invoice binds payment to subscription.
Immutable local plan/merchant binding and approved amount/currency must match.
Root-locked allocation, five counters, receipt and audit are atomic; event/payment IDs
deduplicate. Business conflicts retain receipt plus reconciliation audit without a
partial allocation. Unexpected database failures roll back and return failure, permitting
provider redelivery of the same receipt, never initiating another charge.

Provider contracts referenced: [Claude Messages](https://platform.claude.com/docs/en/api/messages/create),
[Razorpay subscription creation](https://razorpay.com/docs/api/payments/subscriptions/create-subscription),
[webhook validation](https://razorpay.com/docs/webhooks/validate-test),
[subscription events](https://razorpay.com/docs/webhooks/subscriptions).
Protocol tests use injected synthetic transport; they do not establish external availability.

Owner instruction (Task 21): no approved Billing, Settlement and GST Policy has
been supplied. Keep settlement, overage charging, refunds, credit notes and
automated dunning disabled until written approval with finance/accounting review.
No financial document is issued by invoice preparation.
