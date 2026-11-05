# Task 13 quota security report

2026-11-05, local implementation/test only. No Hostinger connection, production
environment/credentials/migrations, payment processing or invented commercial terms.

QuotaService is centralized and pool-free: it receives one existing transaction
connection and an already authorized merchant. Branch/link/QR services retain
ancestry/RBAC checks; public submission derives ownership from the signed published
funnel; invitation acceptance binds the actual stored membership. No request value
can choose another merchant's counter. Super Admin uses existing platform authority
and still passes quota. Merchant creation is not a billable metric.

All consuming paths use the guard, including direct service calls and alternate
administrator routes. Merchant seats are consumed on activation, not invitation
issuance. The first merchant admin needs initialized billing too. Root locking now
also covers invitation acceptance before membership/user state changes, matching
existing hierarchy/public-write locking. Subscription/counter rows are locked;
resource+ledger+counter+audit commit atomically. Failed hashes/token checks,
duplicates, quota failures, database errors and audit failures cannot leave charges.
Existing bounded DB-only deadlock retries occur after rollback; ambiguous commits
are not automatically replayed. Root serialization remains an MVP throughput limit.

Feedback tokens and existing QR identity provide native idempotency. Branch codes
are unique per merchant. Optional link UUID keys bind the creation audit/resource
under the same root lock; lookups include merchant and operation, and conflicts
cannot leak another merchant's link. No new table or broad privilege was needed.

No missing state is unlimited. NULL is unlimited only as an explicit stored plan
limit, with a valid allocation and initialized consistent accounting. Past-due is
blocked absent an approved grace policy. Expiry/cancellation/suspension fail closed.
Read/cleanup operations are not used as accidental consuming bypasses; cleanup can
leave invalid accounting unavailable without silently repairing it. Gauge expiry
is observed/reconciled, not represented as fictitious past events. Immutable ledger
rows and original migration/checksum history remain unchanged.

Structured errors expose only metric and authorized quota values, with no SQL or
tenant/plan/identity details. Anonymous feedback redacts numeric commercial data.
Google remains independent and visible after a private quota rejection. All Clinic
field restrictions, safe errors, no-store/CORS and token secrecy remain intact.

Real MariaDB tests race branch and feedback requests at one remaining slot, verify
finite/unlimited/missing/inactive cases, staff-token rollback/retry, link/QR retry,
release, cross-merchant denial and audit-failure rollback. A real incomplete plan
cannot publish under current MariaDB triggers; missing-limit fallback is also unit
tested without weakening schema constraints. Existing integration and real-browser
regressions run with explicitly configured synthetic test subscriptions.

No production-readiness claim. MFA, restricted effective grants, trusted proxy/shared
rate limits, SMTP/outbox verification, backup/restore, retention and capacity remain
separate gates. Privileged direct DB writes are outside the application locking
protocol and require controlled reconciliation; do not expose direct counter edits.
