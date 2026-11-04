# Task 06 tenant management security and implementation report

Completed locally, 2026-11-04. No Hostinger connection, production credentials,
production migration/configuration change, administrator seed or frontend work.
Existing schema/migration files and security constraints are unchanged.

## Implemented result

Nine account endpoints: create, list, details, permitted rename, suspend,
reinstate, descendants, account history and invitations. The five approved
hierarchy edges are supported with actual-parent authorization. Initial account
creation atomically includes its administrator invitation. No user-controlled
parent kind, ownership, permission list, raw role ID or arbitrary status is trusted.

Selected membership comes from existing authentication. Every tenant transaction
then rechecks the user, email verification, authentication version, live session,
membership, role, permissions and actual active ancestry using that connection.
Existing Authorization helpers now accept an optional database connection, allowing
the same checks to see uncommitted new accounts without switching to the pool.

Account reads are constrained by bounded recursive subtree SQL. Unrelated/peer
accounts return 404. Writes use authorized IDs, actual parent, scope and optimistic
version guards. All request values use prepared statements. Global identity lookup
for an authorized invitation returns only the internal identity fields required
for binding; existing global profiles/passwords/status are not changed.

## Suspension and administrator boundaries

Authentication through a suspended ancestor remains prohibited. An active manager
above that ancestor can inspect its inactive subtree for management, including
effective blocked status. Restoration is top-down; rename/provision/invite require
an entirely active target chain. Ordinary auth authorization was not weakened to
allow inactive selected memberships. The management query path is separately scoped.

Self-suspension/reinstatement and platform-root status mutation are forbidden.
Member demotion, removal and arbitrary role replacement are not exposed. Invitations
always reject active memberships, so the sole active administrator cannot be
overwritten with a staff role or changed to invited/revoked. Future membership-
mutation APIs still require explicit last-admin counts/locks; none is claimed here.
Authorized parent suspension intentionally disables a business account's effective
access while preserving its active membership rows and an upstream restoration path.

## Transactions and audit evidence

One connection performs actor validation, parent/account checks, account writes,
user/membership/token creation and immutable audit insertion. Reads use shared
root/user locks; writes use exclusive locks. Root serialization is intentionally
simple for MVP and is a throughput tradeoff, not a claim of horizontal scalability.
Future services changing hierarchy/status/membership must follow a compatible lock
protocol; middleware checks alone are not transactionally sufficient.

Deadlocks retry rolled-back DB-only operations up to twice; exhausted retries yield
409. No SMTP call is inside a transaction or deadlock retry. Ambiguous commit/
connection errors are not automatically retried. A new-account POST has no API
idempotency key; a lost success response needs list/history reconciliation.

Creation, update, status and invitation audit rows are inserted in the same
transaction as the change; failed audit insertion rolls back all related records.
Metadata contains only IDs/kinds/statuses/role codes or a nameChanged boolean,
never names, emails, passwords or token values. Account history queries require
audit.read and the exact authorized tenant/resource IDs. Denied requests receive
safe HTTP errors; this task does not claim a complete separate denied-attempt ledger.

## Invitations and delivery

Unique tenant/user membership constraints plus serialized checks prevent duplicates.
Fresh tokens use existing opaque-token generation, SHA-256 digests and single-use
consumption infrastructure. An explicit resend supersedes previous unconsumed
invites without changing the membership/role; existing active memberships always
conflict. Profile/name/password information on existing global identities is never
overwritten by another tenant's inviter. Locked/disabled identities cannot be unlocked.

Delivery is injected through InvitationDelivery. Runtime SMTP is exposed only when
the existing authenticated mail adapter and verification callback are configured.
Transport verification must succeed before invitation writes. Actual sending occurs
after commit, with accepted_by_smtp / failed responses. Test adapters produce only
test_delivered. SMTP acceptance is not proof of inbox delivery. Delivery-result
audit is best-effort after commit; the original creation/invitation audit is atomic.
No raw token appears in responses/logs/audit metadata; only the trusted recipient
adapter gets it in memory. No SMTP connection or real email was made in these tests.

## Validation correction discovered during testing

The shared string-ID schema previously called BigInt in a refinement even after
regex failure, so malformed IDs could throw and return generic 500. It now guards
the conversion with the decimal-format check, preserving uint64 safety and returning
400 without issuing an account query. Both unit and HTTP tests cover this case.

## Complete test results

All tests use disposable locally initialized MariaDB 11.8.9 for DB behavior;
fixture administrators use random ephemeral passwords, not production seeds.

| Command | Result |
| --- | --- |
| npm --prefix backend test | 16 foundation/unit tests passed |
| npm --prefix backend run test:tenants:integration | 11 tenant scenarios + parent: 12 passed |
| npm --prefix backend run test:auth:integration | 15 auth scenarios + parent: 16 passed |
| npm --prefix backend run test:schema:integration | 9 schema scenarios + parent: 10 passed |
| npm --prefix backend run test:migrations:integration | 7 runner scenarios + parent: 8 passed |
| TypeScript builds | Passed for every suite |
| git diff --check | Passed |

No failed or skipped tests. Counts include integration parent tests as stated.

Tenant scenarios cover:

1. Every approved actor/parent/child onboarding path, initial role derivation,
   atomic creation records, history and digest-only token persistence.
2. Every forbidden parent-type pair plus sub-reseller, merchant and peer escalation.
3. Scoped lists/details/descendants/history, pagination and malformed input.
4. Name-only updates, immutable ownership input rejection, stale versions and history.
5. Authorized suspension/reinstatement, effective descendant blocking, self/root
   status protection and unauthorized suspension/reinstatement.
6. Real invitation acceptance through the reused auth service, with no token/PII
   in responses or audit payloads.
7. Duplicate/resend behavior, simultaneous invitations from different authorized
   actors, one membership/live token, and protection of the sole active admin.
8. Role escalation rejection and preservation of an existing global user's profile.
9. Synthetic final invitation-audit failure proving rollback of tenant, user,
   membership, token and creation audit, with no delivery attempt.
10. Unavailable/unverified delivery preventing writes, explicit post-commit send
    failure and authorized resend recovery; provider detail logging is suppressed.
11. Stale principal revalidation, required selected membership and PATCH CORS.

The rollback test creates only a conditional synthetic guard trigger in its own
disposable schema. No production or destructive SQL is executed.

## Complete file inventory

Created:

| File | Purpose |
| --- | --- |
| [../src/tenants/service.ts](../src/tenants/service.ts) | Scoped transaction service, account management, invitations, history |
| [../src/tenants/routes.ts](../src/tenants/routes.ts) | Nine versioned routes, strict validation and write limiter |
| [../src/tenants/delivery.ts](../src/tenants/delivery.ts) | Verified delivery abstraction with explicit test/SMTP distinction |
| [../test/tenants.integration.mjs](../test/tenants.integration.mjs) | Disposable MariaDB/HTTP tenant integration scenarios |
| [tenants-api.md](tenants-api.md) | API, scope, status and delivery contracts |
| [tenants-security-report.md](tenants-security-report.md) | This report and inventory |

Modified:

| File | Change |
| --- | --- |
| [../package.json](../package.json) | Explicit test:tenants:integration command; no dependency changes |
| [../src/app.ts](../src/app.ts) | Tenant router injection/mount and PATCH CORS |
| [../src/server.ts](../src/server.ts) | Tenant service wired to existing pool/auth and optional delivery |
| [../src/auth/authorization.ts](../src/auth/authorization.ts) | Optional transaction connection on existing scope/role checks |
| [../src/auth/service.ts](../src/auth/service.ts) | Exposes configured, verifiable invitation delivery adapter |
| [../src/auth/configuration.ts](../src/auth/configuration.ts) | SMTP verification, recipient acceptance check and invitation subject |
| [../src/auth/tokens.ts](../src/auth/tokens.ts) | Safe malformed-ID validation before BigInt conversion |
| [../test/auth.test.mjs](../test/auth.test.mjs) | Regression for malformed IDs |
| [../README.md](../README.md) | Tenant API/report links and current scope |
| [auth-api.md](auth-api.md) | Task 06 invitation/provisioning handoff update |
| [auth-security-report.md](auth-security-report.md) | Task 06 supersedes historical invitation-issuance gap |
| [database-architecture.md](database-architecture.md) | Task 06 implementation status and management/access distinction |

No migrations, lockfiles, runtime secrets or frontend files changed.

## Remaining limits and release gates

- No SMTP was verified in this environment. The adapter can verify a configured
  provider at runtime, but operational email/inbox delivery is not claimed.
- Email remains in-process without a durable outbox. Process death after commit
  can lose delivery; use scoped list/history and explicit resend, not blind creation.
- The root mutex serializes writes; performance and deadlock behavior under expected
  production traffic require capacity testing before broader rollout.
- Rate limiting is bounded/in-process, not distributed. The existing trusted-proxy,
  native Argon2, least-privilege grants, backup/restore and production review gates
  remain unchanged. This task does not authorize Hostinger migration/deployment.
- MFA is still not implemented/enforced. Existing explicit platform authorization
  remains password-based until the separate MFA task is completed.
- No bootstrap, member-demotion/removal API, tenant transfer, account deletion,
  industry reassignment or frontend was introduced. The service intentionally
  does not weaken immutable ownership or published-content constraints.
