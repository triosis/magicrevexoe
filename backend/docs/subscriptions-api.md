# Merchant subscriptions and usage APIs

Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Implemented locally for Task 11, 2026-11-05. Base `/api/v1`. Every endpoint requires
the existing bearer access token and an active selected membership. Responses are
`Cache-Control: no-store`. IDs, prices, limits, quantities and remaining quotas are
decimal strings; do not convert BIGINT values to JavaScript numbers.

| Method and path | Permission and result |
| --- | --- |
| GET /subscription-plans | subscription.read; published plans, limits and configured terms |
| GET /subscription-plans/:id | subscription.read; published/retired plan, draft returns 404 |
| GET /merchants/:id/subscription | subscription.read; current allocation, otherwise latest history row, or null |
| GET /merchants/:id/subscriptions | subscription.read; subscription history |
| POST /merchants/:id/subscriptions | subscription.manage; assign published plan and initialize all counters |
| PATCH /merchants/:id/subscriptions/:subscriptionId/status | subscription.manage; optimistic status change |
| POST /merchants/:id/subscriptions/:subscriptionId/usage/initialize | subscription.manage; initialize missing current counters, body `{}` |
| GET /merchants/:id/usage | subscription.read; all five metrics |
| GET /merchants/:id/usage/:metric | subscription.read; one metric |
| GET /merchants/:id/usage/history | subscription.read; append-only recorded usage |

Catalog and history lists accept `afterId` and `limit` (1–100, default 50), returning
`nextCursor`. Usage history also accepts `metric` and `subscriptionId`. Unknown
parameters/body fields are rejected. History is ascending ID order, not newest first.

All merchant operations resolve actual ancestry on the server. Super Admin must
select the platform membership and pass its dedicated authorization path. Reseller
and Sub-Reseller administrators can read authorized merchant descendants, including
the supported direct parent paths; merchant administrators read only their own.
Current seed grants give only Super Admin `subscription.manage`; no grants changed.
Merchants cannot write even if an erroneous future catalog grant gives them manage.
Staff without subscription.read cannot read this area. Inaccessible IDs return 404.

## Assignment and status

Assignment accepts only:

```json
{"planId":"123","status":"active","periodEnd":"2027-01-01T00:00:00.000Z"}
```

`status` is active (default) or trialing. Optional `periodStart` defaults to database
UTC time. ISO dates require an offset and at most millisecond input precision.
The period must cover server time, have a future end and not overlap an earlier
allocation's actual end. A first backdated period is explicit operator input, not
an automatic billing calculation. No price, currency, limit or owner overrides.
Only published plans with all five configured limit rows can be assigned. There
are no production plan seeds or price/quota defaults. An empty catalog is valid.

An allocated trialing/active/past_due row blocks replacement until ended. An elapsed
allocation can be atomically marked expired during an explicit new assignment.
The transaction creates subscription, initial counters, nonzero opening ledger
events and audits together. Failure leaves none of these partial changes.

Status PATCH accepts `{"status":"canceled","lockVersion":1}`. Supported transitions:
trialing → active/past_due/canceled/expired; active → past_due/canceled/expired;
past_due → active/canceled/expired. Terminal states never reactivate. Expiration
requires an elapsed period; cancellation ends allocation immediately, clamped to
stored start/end. Activation initializes missing counters in the same transaction.
Periods and plan ownership are not editable through these routes.

Stored statuses remain the existing schema enum. Account/ancestor suspension is a
derived `effectiveStatus: suspended`, not a new subscription status. Period elapse
is reported as effective expired without a read-side write. Authorized active
ancestors may inspect suspended descendant history; the suspended merchant cannot
authenticate into its selected membership. Suspended accounts cannot receive a
new allocation or initialize/activate usage. Cancel/expire remains an authorized
administrative operation. No scheduler, renewal, proration, grace calculation,
scheduled cancellation, payment or refund is implemented. `cancelAtPeriodEnd` is
reported from existing data but cannot be set here.

## Initialization and usage semantics

Metrics: branches, staff_seats, feedback_submissions, short_links, qr_assets.
Each counter is bound to the merchant, subscription and exact half-open period
`[start,end)`. Legacy DATETIME(6) keys retain all six fractional digits in SQL.
Boundary activity is evaluated by MariaDB UTC_TIMESTAMP(6).

Initialization serializes with existing tenant/feedback writes using the shared
transaction/root lock. A counter already present must match its end and ledger
sum, and is preserved. A missing counter is rebuilt from recorded ledger events
when present; otherwise a real resource/submission snapshot initializes it, with
one immutable `init:` event when nonzero. Duplicate/concurrent requests do not add
another baseline or reset usage. Negative/mismatched ledger state or inconsistent
counters returns 409 and needs operator reconciliation; there is no reset API.
Only a current active period may initialize. Historical windows are never filled
from today's gauge counts. Existing ledger rows are never rewritten or deleted.

Current gauges count active branches; active memberships of active users (including
administrators); active unexpired links of active branches; ready QR assets on
those links/branches. These use `source: live_resources`. Existing resource APIs
do not append lifecycle events, so stored gauge counters/ledger are opening
snapshots, **not complete historical gauge accounting**. Usage history exposes
`gaugeHistoryCoverage: initialization_snapshots_only` and `kind: initial_snapshot`
or recorded_event. Continuous lifecycle accounting/quota admission is future work.

Feedback uses `source: period_ledger`: the counter must equal its ledger sum.
Initial baseline counts actual feedback already in the explicit period; subsequent
signed public submissions append/increment transactionally via the existing API.
This does not synthesize one event per earlier submission or replay historical data.

Usage fields include `availability`, `initialized`, `used`, `limit`, `limitMode`,
`remaining`, `overLimit`, `source`. Explicit NULL limit is unlimited, zero is zero,
and a missing limit row is missing configuration. Missing/mismatched/inconsistent
counters, missing limits or inactive periods yield unavailable remaining quota,
never unlimited. Finite available remaining is max(limit − used, 0), using BigInt;
over-limit is reported without changing admission behavior. No quota enforcement
is added. No subscription returns `availability: no_subscription` and empty metrics.

## Errors and limits

400 invalid inputs; 401 invalid authentication; 403 permission/inactive actor;
404 inaccessible merchant/subscription/plan; 409 period/version/accounting conflict;
429 rate limited; 503 unavailable service; unexpected errors use safe generic 500.
Per-user process-local bucket uses 120 reads or 30 writes per 15 minutes, shared
between these routes; mixed reads can reach the write threshold sooner. Retry-After
is 900. Existing explicit CORS/bearer design is unchanged; no cookies or new secrets.
