# Task 22 API and operator changes

2026-11-06. These changes apply to the local implementation, not production
configuration. All routes use `/api/v1`, no-store responses, existing bearer
authentication/active membership where applicable and server-side tenant ancestry.

## Financial hold

`billing/approval.ts` currently always refuses financial execution. No environment
flag, administrator/catalog approval or webhook signature lifts the hold. Paid
assignment, paid reactivation, paid counter initialization and internal payment
allocation refuse with 409. Checkout refuses before returning an old hosted URL or
performing a provider creation request. Catalog authoring/read history, safe usage
measurement and non-issuable invoice preparation remain. Historical allocations
are not automatically revoked or rewritten. Renewal cancellation is a separate
explicit authorized action; it issues no refund or new charge.

Signed historical payment callbacks still validate and deduplicate receipts. They
record reconciliation without new allocation/counters. No settlement, financial
invoice, overage collection, refund/credit note or automated dunning route is enabled.
Future enablement requires written finance-reviewed owner policy and separately
reviewed implementation, not a guessed boolean or a synthetic test approval.

## Merchant presentation

| Method/path | Input / behavior |
| --- | --- |
| GET /merchants/:id/presentation | Scoped tenant.read; seedKeywords, logoDataUrl, lockVersion; absent row is empty with version 0 |
| POST /merchants/:id/presentation | Scoped tenant.manage; strict JSON lockVersion and seedKeywords. Explicit [] clears; otherwise 3–5 distinct bounded Unicode business phrases. Unknown policy/tenant/prompt keys refuse |
| POST /merchants/:id/presentation/logo?lockVersion=N | Scoped tenant.manage; raw Content-Type image/png, at most 64 KiB. Static non-interlaced 8-bit RGB/RGBA, at most 512×512, valid chunks/CRC/inflation bound. Metadata, animation, unknown chunks, malformed data and trailing bytes refuse |

Both updates are optimistic, root-ordered and audited in the same transaction.
Only merchant ownership is permitted. Authentication precedes the route's bounded
PNG body parser. There is no URL fetch, filesystem upload path, SVG interpretation,
third-party image service or secret-bearing logo response. Business keywords are
not shown in anonymous funnel responses; only the current merchant's validated logo
is public. Keywords are optional untrusted context in the fixed server prompt,
never a tenant-supplied instruction/guardrail switch or fabricated customer fact.

## Feedback language and archive

Public submission accepts optional `language: en|hi|ml` in addition to the existing
strict structured ratings/token. Existing clients may omit it; stored value is NULL,
not guessed. The current UI sends the selected language. The database makes it
immutable. Duplicate retries must match language and ratings; narrative/contact/
medical/ownership/status fields still refuse.

The existing PATCH /feedback/:id/status additionally accepts resolved → archived
with reasonCode completed and current lockVersion. New/in-progress/dismissed cannot
archive directly. Archive is immutable/terminal in the API. One transaction inserts
feedback_archives, advances the private row's version and writes the success audit;
failure rolls back all three. The old stored status/event enums are untouched.
Resolved-only archive insertion is database guarded. Details/list/statistics and
analytics project archive state and append its actual stored timestamp to history;
resolved filters exclude archives. This is not a destructive delete or a retention job.

## Recorded analytics and warnings

GET /feedback/analytics accepts the existing strict merchantId, branchId, status,
from/to filters. Default is last 30 days, maximum interval 93 days; UTC boundaries
are returned. `feedback.read`, active ancestry and optional merchant/branch ownership
are checked. Response contains real rating distribution, daily feedback, recorded
public view/click counts, language/AI usage and at most 20 recent feedback rows.
Status filtering concerns feedback; event counters are explicitly labelled separately.
Google posts, posting conversion and Google velocity remain null/unavailable.

Current usage responses include alertLevel null, approaching_limit (at least 80%)
or at_limit (100%/exceeded), calculated with bigint from finite configured capacities.
Missing/inactive/unlimited data never creates an allowance or synthetic alert. The
UI shows in-app notices; this is not email/push delivery, automatic charging or dunning.

## Public rating and offline behavior

Star controls have 48-pixel minimum targets and may prefill the forms without
changing either option's visibility. After an attempted private submission, changing
the public selection does not change its frozen retry payload. Both Google and
private choices remain independent, including low ratings and AI failure.

Optional same-tab cache stores only a canonical Google URL and ten-minute expiry
after valid configuration retrieval. It stores no form/session token or private
feedback. Expiry is checked before opening. Only transient network/503/504 errors
permit fallback; explicit invalid/disabled/unauthorized responses clear it. First-time
offline use cannot invent a destination, and no private submission is cached or queued.
The warning explains that the destination cannot currently be revalidated. No PWA,
background sync or privacy/retention guarantee is supplied.

## QR PDF

GET /qr-assets/:id/print.pdf returns application/pdf as an attachment after the same
actor scope, branch/funnel/link readiness/expiry and ready-content digest validation
as QR content. It renders a deterministic QR-only A6 vector page with neutral
independent-choice captions. It does not create a financial document, extra quota
asset, NFC record, hardware order or branded industry template. SVG/PNG remain unchanged.

## Additive schema and grants

Versions 000077–000084 add merchant_presentation, immutable feedback_archives,
nullable immutable feedback language, ownership/archive validation and matching
postconditions. Full manifest: 85 versions, 32 tables, 46 triggers. Old 77 prefixes
and checksums are unchanged. Runtime adds only SELECT/INSERT/UPDATE on
merchant_presentation and SELECT/INSERT on feedback_archives. No DDL, DELETE,
ledger access or global grant is added. Migration account profile remains unchanged;
provider-effective grants/definers still require separate verification.

Use existing explicit target/approval/preflight/lock/forward-repair controls.
No production migration was run. Preserve backups/history; never automatically
rerun an interrupted migration or weaken old CHECKs to accept illustrative labels.

Analytics also returns at most 20 recent scoped public funnel events with UTC
timestamps and owned short-link identifiers, without actor identity. These are
recorded events, not verified scans, unique people or Google review posts.
