# Private feedback API v1

## Task 22 extension and restrictions

See [Task 22 API/security changes](task-22-api-changes.md) for financial hold,
merchant PNG/keyword configuration, actual scoped analytics, feedback language and
immutable resolved-to-archived workflow, finite-capacity warnings, bounded cached
fallback and authorized QR PDF. No existing constraint, root-lock ordering, MFA,
strict clinical input or tenant scope is relaxed. Current testing and manual
acceptance limits are in task-22-test-report.md and task-22-remaining-gaps.md.
No paid execution, legal-policy acceptance, retention/deletion or new login policy
may be inferred: the owner explicitly requires written decisions first.

Task 15 update (2026-11-05): the identified root-lock inversion is corrected
locally using one shared unique platform_slot lookup/projection, without automatic
retries or schema changes. See [feedback-concurrency-report.md](feedback-concurrency-report.md)
for captured 1213/40001 engine evidence, deterministic tests and repeated stress.
Historical Task 14 failure evidence below is preserved; other release blockers remain.


Task 13 now enforces the five existing quotas at service transaction boundaries.
See [current quota contract](quotas-api.md). Earlier no-enforcement/pre-billing notes
are historical; merchant subscription/counters must precede first admin acceptance
and metered resources. Google remains independent; no production change.

Task 09, implemented locally on 2026-11-04. Prefix `/api/v1`. No frontend or
production change. See [feedback-security-report.md](feedback-security-report.md)
and [feedback-implementation-report.md](feedback-implementation-report.md).

## Anonymous submission

1. GET `/public/funnels/:code` using the printed short link. Both Google/private
   options are returned independently. `options.privateFeedback` now contains
   submissionAvailable=true, submissionUrl and
   submissionToken: `{token,expiresAt}`.
2. POST `/public/funnels/:code/feedback` with JSON:

```json
{
  "submissionToken": "<token from the funnel response>",
  "overallRating": 3,
  "serviceRating": 4,
  "cleanlinessRating": 4,
  "waitingTimeRating": 2
}
```

No login, registration, cookies, customer email or phone is needed. overallRating
is required; dimensions are optional integers 1-5 and must be present in the pinned
published channel's approved labels. Omit unanswered dimensions rather than sending
null. The existing published configuration permits only these fields for **all
three channels**, including Salon & Spa and Restaurant & Cafe. No configuration
currently permits narrative fields. Free text, medical details, contact fields,
notes, tenant/branch/merchant selectors, status and arbitrary answer JSON are
rejected, not silently dropped. Query parameters are also rejected.

Successful first submissions and identical retries both return 200:

```json
{"accepted":true,"confirmationId":"<32 random hex characters>"}
```

This reference is independent of database IDs. It is not an authorization token
and grants no public lookup or mutation. Public responses contain no ratings,
customer identities, actor data, ownership IDs or saved metadata. No public feedback
read/update/statistics endpoint exists.

The signed token contains only the public short code, published funnel revision,
random 128-bit nonce and 15-minute expiration. It has no administrative permissions
or internal IDs. It is returned in no-store JSON and submitted in the body, never
embedded in QR URLs or query strings. Keep the same token and identical answers
for network retries. An identical retry returns the original confirmation with
no second record/event/usage increment. Different answers with a consumed token
return 409; callers cannot overwrite customer ratings. A new funnel GET issues a
new nonce, so this is per-form idempotency, not unique-customer detection.

Token signature, code, revision and expiration are checked on every submission.
Expired tokens and changed link revisions require reloading the form. There is
no stale-form grace period. Retries after expiration or link disable are rejected
even when previously accepted. The active link/branch/channel/destination and
merchant/ancestor checks are the same as public resolution. Unavailable funnels
return the same generic 404. Anonymous submission does not require a Google click,
and Google selection never requires a rating or private submission.

## Authenticated management

Use existing selected-membership Bearer authentication. Every operation revalidates
session/user/auth_version, membership, permissions and actual ancestry inside its
transaction. IDs/cursors are strings; numeric values are not accepted as IDs.

| Method / path | Input | Permission and result |
| --- | --- | --- |
| GET `/feedback` | Filters and pagination below | feedback.read; `{feedback,nextCursor}` |
| GET `/feedback/statistics` | Filters below, no pagination fields | feedback.read; `{groups:[{status,count,averageRating}]}` |
| GET `/feedback/:id` | No query/body | feedback.read; saved ratings/status/timestamps and status history |
| PATCH `/feedback/:id/status` | `{status,reasonCode,lockVersion}` | feedback.change_status; `{id,status,lockVersion}` |

The seeded merchant_staff role already has feedback.read and
feedback.change_status; those grants were preserved. Authority is resolved from
database permissions, not a hardcoded staff/read-only assumption. A role without
feedback.change_status receives 403 on status writes. No role editing API is added.

Platform Super Admin explicitly selects platform scope and can access feedback
across active accounts. Resellers see only actual direct/sub-reseller merchant
descendants; sub-resellers see their merchant children. Merchant users see their
own merchant only. Peer reseller, peer sub-reseller and cross-merchant IDs return
404. Collection queries exclude suspended descendant subtrees; a suspended actor's
ancestry rejects authentication/scope. Explicit filters targeting suspended accounts
fail closed. Archived branches retain historical administrative feedback access;
they cannot receive public submissions.

Filters are optional merchantId, branchId, status, from and to. Selectors are
authorized against stored ownership, including branch/merchant consistency.
Dates must be ISO timestamps with Z or an explicit offset; from is inclusive and
to exclusive, and from must precede to. Status is exactly new, in_progress,
resolved or dismissed. Unknown filters/sorts are rejected. List pagination uses
afterId (exclusive ascending ID cursor), limit 1-100/default 50. nextCursor is the
last ID when a full page is returned; a following empty page is possible.
Statistics apply the same filters and authorization. Counts and decimal averages
remain strings at the JSON boundary. Groups with no rows are omitted.

Details include only authorized administrative IDs/publicId, merchantId/branchId,
ratings, current status, lockVersion, submittedAt/resolvedAt and status-transition
history. They exclude raw/digested submission tokens and authentication/identity
data. History contains previous/next state, reason and timestamp, not actor profiles.
Assignment and internal notes are intentionally not implemented: the Phase 1
privacy schema has no safe notes field and permits only structured feedback.

## Controlled workflow

| From | To | Required reasonCode |
| --- | --- | --- |
| new | in_progress | triage |
| new or in_progress | resolved | completed |
| new or in_progress | dismissed | spam or duplicate |
| in_progress | new | follow_up |
| resolved or dismissed | in_progress | reopened |

Other transitions, repeated state changes and stale lockVersion return 409. Resolved
sets resolvedAt to server UTC; reopening/dismissing clears it. Each successful
transition increments lockVersion and inserts one append-only status event and
one audit event in the same transaction. Customer ratings, source link/revision,
submission timestamp and ownership remain immutable, including under existing DB
triggers. Public users cannot alter these administrative fields.

## Events and accounting

Successful first submissions insert public.feedback_submitted in audit_logs with
NULL actor fields and `{}` safe metadata. Management records feedback.viewed,
feedback.list_viewed, feedback.statistics_viewed and feedback.status_changed.
Collection-view audit ownership is the actor's selected tenant; individual events
use the affected merchant. Status metadata contains only fixed state/reason codes.
No raw ratings/body, medical text, IP, user agent, fingerprint or visitor profile
is copied into event metadata or application logs.

If an existing trialing/active/past_due subscription covers server time, the same
transaction appends one feedback_submissions usage event and increments its
preinitialized period counter. The source event key uses the random feedback
reference, not the raw form token. Missing counters or mismatched period ends
fail 409 and roll back the entire submission rather than silently resetting usage.
Billing activation must initialize/reconcile these rows before activating plans.
Merchants without a current subscription still submit; feedback rows and audits
provide pre-billing counts, without inventing a subscription or billing period.
Task 09 did not backfill the ledger. Task 11 now provides explicit transactional
current-period initialization: when no ledger exists, it records an aggregate
baseline of actual feedback within the operator-assigned period. Existing ledger
rows take priority and are never rewritten. Subsequent submissions use exact
DATETIME(6) period keys, including legacy microseconds. See subscriptions-api.md.
No plan quota admission is implemented.
Accounting failure never disables or hides the independent Google option.

## Errors, limits and deployment

400: malformed/unsupported payload, filters or invalid/expired form token.
401: missing/invalid management authentication. 403: missing permission/inactive
actor ancestry. 404: inaccessible feedback or unavailable public funnel.
409: replay with changed answers, invalid transition/stale version or accounting
configuration conflict. 429: throttled. 503: service/auth configuration unavailable.
Unexpected failures use the existing safe 500 response. All responses are no-store.

Public submissions are limited to 30 per socket-derived IP per 15 minutes and
3,000 per application process per minute. Invalid submissions consume limits too.
Management requests share a per-user bucket, with 120 for reads and 30 for writes
per 15 minutes; mixed reads/writes can reach the write threshold sooner. 429 uses
Retry-After:900. Limiter keys are hashed and memory-bounded; forwarded headers are
ignored. Verify Hostinger proxy topology and shared edge limits before rollout;
process-local counters are not distributed spam protection.

No new signing secret is required: the existing validated AUTH_ACCESS_SECRET
derives a separate HMAC-SHA-256 key under a fixed feedback domain. All replicas
must use the same auth key and synchronized clocks. Key rotation invalidates
pending forms as well as existing access credentials. No secret/environment file
was read, printed or modified for this implementation. No frontend, production
migration, customer account, AI analysis, SMTP or Google ownership claim is added.
