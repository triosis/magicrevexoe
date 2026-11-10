# VPS database identities and trigger-definer strategy

2026-11-10. Analysis only; no accounts or grants changed. **A VPS can restore the
original strict runtime boundary**, subject to an approved identity/definer design
and isolated rehearsal. Cloud's one-user limitation need not be copied to VPS.

## Exact dependency evidence

The [46-trigger table](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.md) and
[machine-readable map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.json) are authoritative
for release000000-000084. All are BEFORE row triggers, with no body writes, routine
calls or SET NEW assignment. Definers require TRIGGER on their subject tables and
SELECT on the recorded OLD/NEW/body-read tables. This is not a general-purpose
SQL privilege analyzer; new definitions require review.

TRIGGER subjects (23): audit_logs, auth_tokens, billable_usage, billing_agreements,
billing_events, branches, channel_versions, commercial_approvals, feedback_archives,
feedback_status_events, funnel_configurations, merchant_presentation, plan_limits,
private_feedback, qr_assets, review_destinations, short_links, subscription_plans,
subscriptions, tenant_memberships, tenants, usage_counters, usage_records.

SELECT dependencies (18): auth_tokens, billable_usage, billing_agreements, branches,
channel_versions, feedback_archives, funnel_configurations, merchant_presentation,
plan_limits, private_feedback, qr_assets, review_destinations, short_links,
subscription_plans, subscriptions, tenant_memberships, tenants, usage_counters.
No body INSERT/UPDATE/DELETE grants are required for the current guards. The invoker
still needs the event's DML privilege; runtime does not need DELETE just because
DELETE guards exist.

MariaDB uses the trigger's definer security context and requires TRIGGER authority
for activation. Choosing another definer requires SET USER authority; the existing
strict migration verifier does not accept that extra global authority.
[MariaDB CREATE TRIGGER](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/create-trigger),
[MariaDB GRANT](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant).

## Identity and capability design

Names below describe roles, not provisioned usernames or credentials. Scope host
matching to the approved client paths and verify actual CURRENT_USER(). Never use
the Cloud account's @127.0.0.1 identity as a presumed remote account match.

| Role | Proposed authority and exposure |
| --- | --- |
| Application runtime | Exact per-table runtimePrivileges map in backend/src/migrations/privileges.ts across31 business tables. SELECT/INSERT/UPDATE only where listed; no ledger access, TRIGGER, DELETE, schema DDL, global privilege or GRANT OPTION. Credential only in API process. |
| Migration operator | Strict migration profile: schema SELECT/CREATE/ALTER/TRIGGER; table INSERT/UPDATE on schema_migrations and INSERT on industry_channels, roles, permissions, role_permissions. Pregrant required tables before creation. Temporary maintenance authority; never API credential. |
| Trigger definer role | Retained TRIGGER on23 subjects plus SELECT on18 dependency tables after maintenance. Must remain a valid principal; application cannot authenticate as it. This authority can alter guards, so protect custody and administration. |
| Backup reader | Separate source-read identity, required trigger metadata and consistent-backup/lock privileges only after native-tool rehearsal. TRIGGER needed for metadata is itself trigger-management authority, so it is sensitive operator access, not runtime. No GRANT OPTION or general administrator fallback. |
| Restore operator | Separate controlled destination-restoration authority, temporarily sufficient for schema/data/definers; no default normal-runtime access. Assigning preserved other definers may require DBA SET USER authority. Approved isolated procedure must establish exact required privileges. |
| DBA / OS administrator | Separate restricted administration path, owns grants, certificate installation, recovery and patching. Never inject this credential into Node. DBA authority is intentionally outside the strict migration profile. |

Use explicit grants rather than inherited roles/PUBLIC authority for parser
compatibility. Schema-level grants on u676472791_magicreview_db require escaped
underscore pattern semantics; table grants are literal. Reject unreviewed other
schemas, wildcard reach, global authority and GRANT OPTION. A successful TLS session
does not compensate for excessive grants.

## Minimal unchanged-artifact definer strategy

Historical CREATE TRIGGER statements omit DEFINER, so the executing migration
identity becomes the definer. Creating five accounts does not change that fact.

The least disruptive choice is **a maintenance identity distinct from runtime that
also retains the definer role**. Execute unchanged migrations through the strict
operator as that maintenance identity; after approved bootstrap/verification,
withdraw its unnecessary CREATE/ALTER and seed/ledger writes, retaining only the
reviewed definer dependencies. This merges migration and definer roles in one
non-runtime principal, explicitly; it is not a claim of five fully independent
identities. Re-elevation for future upgrades is a separate maintenance approval.
Protect credential custody and restrict login paths. Do not drop the account or
blindly revoke TRIGGER. Account locking/password-authentication changes require
activation and recovery rehearsal before using them to prevent interactive login.

If the owner requires a truly separate migration and definer principal, a new
execution strategy is required. Options include approved DBA-managed definer
assignment or a dedicated creating principal; each must reconcile strict grant
verification, actual executed definitions, allowedTriggerDefiners and restore.
Do not silently inject DEFINER text, give the strict operator SET USER, or modify
old SQL/checksums. A distinct-definer strategy is separate design/implementation
work, not necessary for the minimal runtime separation described above.

## Validation, bootstrap and recovery implications

Remote strict target policy pins actual expectedAccount, @@hostname, schema,
DNS/port, CA and exact reviewed allowedTriggerDefiners. Omit cloudStartup,
transport:HOSTINGER_LOCAL and hostingerLocalApprovalId. No shared-account risk
acknowledgement should authorize remote database access. Original strict preflight
and check-runtime paths remain unchanged.

There is a bootstrap metadata caveat: bootstrapPlatform verifies the complete
manifest/trigger definitions before writing four identity/audit tables. A nominal
SELECT plus four-table INSERT account may lack MariaDB trigger-definition visibility.
Do not claim that documented minimum is sufficient without rehearsal. Use a
separately approved operator identity with necessary metadata/insert authority,
possibly the controlled maintenance identity during a narrow bootstrap window;
the strict migration profile itself lacks tenant/user bootstrap INSERT grants.
Do not broaden the API account or change grant authority between reviewed migration
preflight and apply. Document and revoke temporary bootstrap grants afterward.

Recovery must preserve original definer principals and dependencies. Dumping the
application schema does not back up all MariaDB users/grants. Capture account and
grant reconstruction evidence separately in protected DBA custody, without exposing
authentication hashes in reports. No generic hPanel import is accepted as proof.

## Required isolated acceptance before production

1. Strict migration account performs all85 unchanged steps over verified TLS;
   target, grant fingerprints, ledger and schema checks pass.
2. Withdraw maintenance grants, reconnect all sessions, and exercise every one of
   the46 guards under the retained creating definer and restricted runtime invoker.
   Use an isolated privileged invoker for DELETE guards; do not grant API DELETE.
3. Runtime actually fails ledger access/write, role mutation, CREATE/DROP TRIGGER,
   ALTER/DROP table and other prohibited operations. Verify normal auth/MFA, quota,
   ownership, publication and append-only paths succeed or reject as designed.
4. Native backup and empty isolated restore retain exact DEFINER identities,
   definitions/order, full data and constraints; repeat all46 guards after restore.
5. Independent reviewer accepts resulting grants and metadata requirements. Runtime
   check alone is not full schema verification; retain separate operator evidence.

Prior Cloud tests exercise shared-account risk and native local restore. They do
not certify this proposed Linux separate-identity configuration. No new grants,
tests or approval records were created for this analysis.
