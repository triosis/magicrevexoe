# Tenant management API v1

Task 06, locally implemented/tested on MariaDB 11.8.9. Prefix: /api/v1/tenants.
No production connection/migration, administrator seed or frontend change.

## Authentication and authority

Use an access token from login and select-tenant. An unselected identity is not
an account administrator. Every route runs existing authentication/active-membership
middleware. The service then revalidates user status, verified email, auth_version,
live session and selected membership inside its database transaction. Actor roles,
permissions, ownership and parent kinds come from the database, never request claims.

IDs/cursors are decimal strings; lockVersion and limit are bounded integers.
Unknown fields are rejected. Cache-Control is no-store. CORS uses the existing
exact allowlist with PATCH added; Bearer transport remains cookie-free.

| Action | Required permission |
| --- | --- |
| List/get/descendants | tenant.read |
| Account history | audit.read |
| Rename/suspend/reinstate | tenant.manage |
| Create reseller/sub-reseller/merchant | reseller.create / sub_reseller.create / merchant.create, tenant.read and membership.manage |
| Invite/resend | membership.manage and allowed-role/permission-subset checks |

Platform operations additionally require the explicitly selected platform
super_admin membership and platform.manage. Super Admin authority is not an
unscoped query fallback. All other actors must own the account or be an actual
ancestor; peer resellers and unrelated merchants are invisible (404).

## Routes

| Method / path | Input | Result |
| --- | --- | --- |
| POST / | Create body below | 201: tenant and administrator invitation metadata |
| GET / | optional afterId, limit (default 50, max 100) | Own account and authorized descendants |
| GET /:id | Authorized target ID | Account details, status and timestamps |
| PATCH /:id | name, lockVersion | Renamed account, incremented version |
| POST /:id/suspend | lockVersion | Suspended descendant account |
| POST /:id/reinstate | lockVersion | Reinstated suspended descendant |
| GET /:id/descendants | optional afterId, limit | Descendants excluding target itself |
| GET /:id/history | optional afterId, limit | Scoped creation/update/status audit events |
| POST /:id/invitations | Invitation body below | 201: membership, role, expiry, delivery result |

Paths are relative to the prefix. Lists/history use ascending ID keyset pagination;
nextCursor is the last ID when a page reaches limit, otherwise null. A subsequent
page may be empty. No pagination SQL is performed over an unscoped global list.

### Create an account

```json
{
  "parentId": "1",
  "kind": "merchant",
  "name": "Example business",
  "industryChannelCode": "salon_spa",
  "invitation": {
    "email": "admin@example.invalid",
    "displayName": "Example administrator"
  }
}
```

This is a shape example, not a production account or delivery address.
kind is reseller, sub_reseller or merchant. ParentId is only a selector, not a
claim of ownership. The actual parent's kind and ancestry are checked server-side.
industryChannelCode is REQUIRED for merchant and forbidden for other kinds:
salon_spa, clinic_healthcare or restaurant_cafe. Initial invitation is required;
its administrator role is derived from the new tenant kind. Client role/status/
parent_kind/tenant_id fields are not accepted.

| Actual parent | Allowed child |
| --- | --- |
| Platform | Reseller, Merchant |
| Reseller | Sub-Reseller, Merchant |
| Sub-Reseller | Merchant |
| Merchant | None |

Super Admin may provision valid edges through its platform path. Resellers may
provision their own sub-resellers/direct merchants and merchants under their own
sub-resellers. A sub-reseller can create only its own merchants. No intermediary
tenants are invented, no tenant can be reparented, and no platform root is created
through this endpoint. Initial platform/admin bootstrap remains a separate task.

Creation inserts the account, optional new global invited identity, one invited
membership, one hashed token and immutable creation/invitation audit records in
one transaction. The account starts active but its first administrator must
accept the invitation before it can log in/select that membership. Existing
global users retain their profile, password and account status.

Account responses include id, publicId (hex binary UUID), kind, parentId, name,
status, industryChannelId, lockVersion, createdAt, updatedAt and effectiveStatus.
effectiveStatus is active or blocked; a stored active account can be blocked by a
suspended ancestor. No password, token/hash, global user profile or provider detail
is exposed in tenant responses.

### Information and status updates

PATCH accepts only name (1–160 trimmed characters) and current lockVersion.
Ownership, kind, channel, roles and status cannot be changed through PATCH.
Stale versions return 409. Suspension/reinstatement also require lockVersion.

An actor cannot suspend/reinstate its own selected account or the platform root.
Only a manager above the target can change its status. Closed accounts cannot
be reopened here. Repeating the current status is a 409 rather than another event.

An active ancestor manager can read suspended descendants to diagnose/manage them.
This does NOT authorize login or business access as the suspended descendant.
Rename/create/invite operations require an entirely active target/parent chain.
Reinstatement permits the TARGET to be suspended, but all its upstream ancestors
must already be active. Restore top-down. A manager cannot reinstate a deeper
account while another ancestor remains suspended.

## Invitations and last-administrator protection

```json
{
  "email": "staff@example.invalid",
  "displayName": "Example staff member",
  "roleCode": "merchant_staff",
  "resend": false
}
```

roleCode is an optional selector from reseller_admin, sub_reseller_admin,
merchant_admin or merchant_staff. It is looked up against the target's actual
kind and authorized role matrix. Without it the target's administrator role is
selected. There is no arbitrary role ID, permission array or Super Admin invite.

- Only Super Admin can invite reseller administrators.
- Resellers can invite sub-reseller administrators into their own sub-resellers
  and merchant roles into their own actual merchant subtree.
- Sub-resellers can invite merchant roles into their own merchants.
- Merchant admins can invite merchant admin/staff into their own merchant.
- Staff and actors lacking membership.manage cannot invite. Non-platform actors
  cannot grant permissions they do not themselves hold.

An active membership always returns 409, regardless of resend or role requested.
The endpoint never demotes, replaces or revokes an active administrator, including
the last one. Existing invited/revoked memberships cannot silently change role.
No member-removal/demotion route exists; future membership APIs must implement
explicit last-admin counting/locking before permitting those operations.

Duplicate live pending invites return 409. Explicit resend:true consumes earlier
unconsumed invites and issues a new 24-hour single-use token for the SAME membership
and role. Expired invites may be renewed without resend. A revoked membership can
be invited again with its existing authorized role. Unique tenant/user constraints
and transaction serialization prevent duplicate memberships under concurrent requests.
Locked/disabled global identities are not unlocked by invitation.

Acceptance uses the existing POST /api/v1/auth/accept-invitation endpoint. Raw
invitation tokens are delivered only to the trusted delivery adapter, never in API
responses/logs/audit metadata. Digests are stored in auth_tokens. Existing active
identities must prove their current global password when accepting another invite.

## Delivery truthfulness and failure handling

Creating an account or invitation requires a configured delivery adapter that
successfully verifies BEFORE persistence. The runtime SMTP adapter uses the
existing AUTH_SMTP_* / AUTH_MAIL_FROM / AUTH_RECOVERY_URL settings, verified TLS
and transport.verify(). Missing/failed verification returns generic 503 and creates
no account/invitation. Tests inject an explicitly labeled test adapter, not SMTP.

After database commit, delivery result is one of:

| deliveryStatus | Meaning |
| --- | --- |
| accepted_by_smtp | Verified SMTP transport accepted the message; inbox receipt is NOT proven |
| test_delivered | Injected test adapter received the invitation; no SMTP claim |
| failed | Account/membership/token committed, but message submission failed |

Post-commit send failure still returns 201 with failed. Do not retry account
creation blindly; use the returned tenant ID and POST its invitations endpoint
with resend:true after fixing delivery. Delivery attempts are not retried inside
database transactions. Their result gets a separate best-effort audit event;
creation audit is guaranteed atomically even if delivery-result auditing fails.

No SMTP provider was contacted or verified during this task. The code can verify
configured SMTP at runtime, but that is not evidence production email is operational.
Email delivery remains in-process without a durable outbox/retry queue. Recovery/
invitation frontend pages remain unimplemented; links use the existing fragment
format and account acceptance API.

## Transaction and error contract

Reads use shared root/user locks; writes use exclusive locks and revalidate actor
authority inside the transaction. The root lock serializes hierarchy/membership
writes for this MVP, preventing suspension/provisioning races. Parameterized CTEs
scope accounts to the actor's real subtree; updates bind validated account ID,
actual parent and optimistic version. Membership/token writes bind target scope.
SMTP verification and sending are outside SQL locks.

Deadlock victims retry DB-only work at most twice; no email is sent by those
retries. An exhausted deadlock returns 409. Connection/commit uncertainty is not
automatically retried. POST account creation has no idempotency key; a lost response
must be reconciled through the scoped list/history before repeating the request.

Errors: 400 invalid input; 401 missing/revoked identity; 403 permission, hierarchy,
inactive scope or self/root status denial; 404 out-of-scope/nonexistent account;
409 stale version/duplicate invite/active membership/status conflict; 429 rate
limit; 503 unavailable delivery/auth configuration. Unexpected errors remain
generic 500 with no raw SQL/SMTP/client values. Tenant writes are limited to
30 per authenticated identity per 15 minutes, using the existing bounded local
limiter. This is not a shared/multi-instance limiter.

## Verification

Run npm --prefix backend run test:tenants:integration with MARIADB_TEST_BIN pointing
to the trusted local MariaDB 11.8.9 ZIP bin directory. No remote test URL is used.
See [tenants-security-report.md](tenants-security-report.md) for all test results,
files and remaining production gates. Existing MFA, shared-rate-limit, least-
privilege grant and production rollout gates remain unresolved.
