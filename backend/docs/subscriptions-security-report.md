# Task 11 subscription security report

Implemented and tested locally on 2026-11-05. No Hostinger connection, production
credentials/configuration, migrations, plan seeds or payment integration were used.

All routes use existing access authentication and active membership validation.
Services recheck user status/auth_version, session, membership, permissions and
actual ancestry within the shared TenantService transaction. Platform access uses
the explicit platform path. Queries bind merchant/subscription keys and values;
SQL fragments are fixed source. A subscription ID never substitutes for its owner.
Peer resellers and cross-merchants cannot read or write each other's subscriptions.
Body-provided permissions/owner/price/quota fields fail strict Zod validation.

Only the existing seeded Super Admin has subscription.manage. Descendant admins
retain their existing read permission. Merchants are explicitly denied writes;
staff without read permission receives no data. No role grants or constraints were
weakened. Account suspension remains a derived effective state; inactive actor
ancestry is rejected. An active authorized ancestor can inspect suspended account
history without enabling its resource access.

Assignment, expiration during replacement, status/CAS, counter initialization,
opening usage events and administrative audits share one connection/transaction.
Audit failure rolls back changes. Existing exclusive platform-root locking
serializes account/feedback writes; duplicate/concurrent initialization cannot
reset existing values. Read transactions share that root lock. The global lock is
an MVP scalability limit, not a distributed admission system.

Period keys remain exact DATETIME(6) strings rather than being rounded through JS
Date. SQL checks current boundary activity. Public feedback accounting now uses
these same exact keys for legacy periods. All BIGINT quota arithmetic uses BigInt
and transport strings; prices remain DECIMAL strings. Missing accounting state
fails closed for remaining quota and existing feedback accounting; it is never
treated as unlimited. Explicit unlimited plan limits are distinguished from absent
configuration. Inconsistent counters require repair, not an automatic reset.

Responses are no-store, errors are safe, audit metadata contains only fixed safe
identifiers/status/counts, and no passwords/tokens/feedback payloads are logged.
No new token transport, cookie/CSRF design, signing secret or environment loader
was introduced. Rate limiting is memory-bounded and process-local; production
edge/shared limits and effective database grants remain deployment gates.

Current gauge reports are live counts; their ledger history contains only opening
snapshots until future lifecycle accounting is implemented. Feedback has ongoing
ledger/counter updates. This task reports limits and overages, **does not enforce
quota admission**, process payments, automate billing/renewals or create commercial
terms. Public Google/private-path compliance behavior remains unchanged.

Disposable MariaDB tests cover every parent path, cross-tenant/role denial,
concurrent/idempotent initialization, unavailable state, microsecond periods,
terminal/expired/suspended behavior and atomic audit failure rollback. Frontend
tests verify loading/errors, empty states, exact configured values and restricted
administrative controls. Full results/inventory are in
[subscriptions-implementation-report.md](subscriptions-implementation-report.md).
