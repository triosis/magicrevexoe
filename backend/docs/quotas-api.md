# Subscription quota enforcement — Task 13

Implemented locally, 2026-11-05. Existing schema only; no new migration or commercial
seed. This contract supersedes earlier documents' absence-of-enforcement notes.

## Metrics and admission

| Metric | Consuming transaction | Release / retry semantics |
| --- | --- | --- |
| branches | BusinessService.createBranch | Archive releases; duplicate merchant/code fails without charging |
| staff_seats | AuthService.consumeToken(invite), when a merchant membership becomes active | Includes merchant admins; pending invitations reserve no seat. Failed acceptance leaves token/user/membership unchanged. Future user/membership lifecycle APIs must use this same guard. |
| short_links | FunnelService.createLink | Disable releases link and associated ready QR capacity; optional requestKey makes creation retry-safe |
| qr_assets | First ready QR row or non-ready→ready generation | Existing ready return/regeneration does not charge; each format is a separate asset |
| feedback_submissions | FeedbackService.submit | Signed-form duplicate detection precedes admission; accepted retries do not increment again |

Merchant/account creation, channel/destination editing, funnel publication, reads,
downloads and feedback status updates have no corresponding consuming metric.
They are not charged. No reseller-owned billing or merchant-count metric was added.
Existing auth/ancestry/permissions are mandatory; Super Admin has no quota bypass.

New merchants can be provisioned/invited before billing is configured, but an
authorized subscription manager must assign a plan and initialize counters **before
the first merchant administrator accepts** or any metered resource is created.
This intentionally changes the earlier pre-billing feedback/onboarding behavior.

| Subscription/account state | New metered operation |
| --- | --- |
| active or trialing, current UTC period, active ancestors | Admit only with complete metric configuration and consistent counter/ledger |
| past_due | Block; no unapproved grace policy is invented |
| canceled, expired, elapsed, scheduled or ended | Block |
| missing subscription | Block |
| suspended merchant/ancestor | Existing authorization/public-funnel denial; direct quota service also fails closed |
| missing limit/counter, mismatched period or ledger | Block pending initialization/reconciliation |
| explicit NULL limit | Unlimited only when subscription and accounting state are valid |
| finite limit including zero | Compare exact BigInt usage; one beyond limit fails |

Suspension remains derived from tenant ancestry, not a new subscription enum.
Cleanup operations that release capacity are not denied solely because accounting
is unavailable; they do not create/reset counters. Read access/history, safe public
Google resolution and non-consuming administration are not quota-gated.

## Atomic accounting and history

The central QuotaService uses the caller's existing transaction and authorized
merchant ID. A platform-root lock serializes supported writes, followed by exclusive
subscription/counter locks. Provisional resource changes, admission, ledger/counter
updates and existing audit writes commit together or all roll back. No new pool,
reconnect, default quota, floating-point ID/quota arithmetic or network work in
the quota transaction is introduced. DATETIME(6) keys remain exact UTC strings.

Counters must equal the append-only period ledger before consumption. Gauges use
actual live resources and append a signed net reconciliation delta to the ledger,
then update the counter to that live count. This safely upgrades valid opening
snapshots without rewriting history. Natural link expiry, related QR expiry and
privileged external changes are reflected by live counts and reconciled at the
next relevant write; timestamps are observation times, not invented historical
lifecycle times. A net-zero change needs no quantity-zero event. Feedback appends
one positive event per new accepted form. Releases preserve historical records.

Usage history now declares
`gaugeHistoryCoverage: initialization_snapshots_and_reconciliation_events`.
It is not a complete real-time lifecycle event stream. Current usage remains
live gauge counts / period feedback ledger. Inconsistent counters are never reset
silently. Existing initialization explicitly restores missing current counters.
Assignment carries real opening gauges even if they exceed a lower new plan;
existing data is retained and further consuming operations are denied.

## Errors

Quota errors include these top-level fields alongside the existing safe `error`:

```json
{"error":"Operation blocked: branches quota exceeded","code":"QUOTA_EXCEEDED","metric":"branches","limit":"2","used":"2","remaining":"0","limitMode":"finite"}
```

Numbers are decimal strings; unknown values are null. Codes:
QUOTA_EXCEEDED, QUOTA_LIMIT_MISSING, QUOTA_COUNTER_MISSING,
QUOTA_RECONCILIATION_REQUIRED, SUBSCRIPTION_MISSING, SUBSCRIPTION_INACTIVE.
Inactive subscription is 403; other quota/configuration conflicts are 409.
Earlier authentication/scope errors retain their existing 401/403/404 contracts.
Responses contain no owner, plan, subscription, database or identity identifiers.

Anonymous feedback responses retain code/metric but redact limit/used/remaining
to null and limitMode to unavailable, protecting private merchant commercial data.
The independent Google option remains usable when private admission fails; no
rating, sentiment or plan limit determines Google visibility.

## Short-link retry key

POST /api/v1/branches/:id/short-links accepts optional `requestKey` (UUID) alongside
funnelId. Reuse the same key for ambiguous retries. Within the already authorized
merchant scope, the existing indexed append-only creation audit binds the key to
the link; the root lock serializes lookup/create. Same key/body returns the original
link without another resource/charge, even at quota. A different branch/funnel
with that key returns 409. Disabled links are returned disabled, never resurrected.
No key means a distinct creation attempt that must independently pass quota.
The frontend retains a per-funnel key for retries in its current tab. On full reload,
inspect existing links before manually repeating an ambiguous unkeyed operation.

## Frontend

The existing panel shows configured limits/remaining and quota-reached warnings.
Safe quota responses identify the blocked operation and known numbers. Rejections
stay failed, with no optimistic success. Branch/QR/link changes refresh the panel
without discarding the QR preview; an explicit refresh also handles changes from
other sessions. Backend checks remain authoritative. No frontend entitlement grant.
