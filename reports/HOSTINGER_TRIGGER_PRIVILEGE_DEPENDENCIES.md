# Hostinger trigger privilege dependency map

2026-11-10. Generated from all 46 unchanged CREATE TRIGGER migration statements
by backend/scripts/trigger-privilege-map.mjs and exercised in a disposable
MariaDB11.8.9 shared-account rehearsal. The JSON companion records every OLD/NEW
column, body table read and required definer SELECT/TRIGGER dependency.

All current triggers are BEFORE row triggers. No trigger assigns SET NEW, writes
another table, calls a stored routine or invokes external code. Body writes are
therefore empty. The caller needs the event INSERT/UPDATE/DELETE authority; the
definer needs TRIGGER on the subject plus the SELECT dependencies below. Runtime
uses SELECT/INSERT/UPDATE/TRIGGER database-wide. DELETE guards were activated by
a harness-administrator invoker while the creating definer retained only the
reduced runtime grants; the runtime account itself has no DELETE permission.

The database-wide profile broadens access beyond this minimum map. It grants
ledger/role/identity writes and trigger-management capability; it is not equivalent
to the strict per-table runtime profile or tamper-proof append-only security.

The analyzer is deliberately scoped to this reviewed release, not a general SQL
parser. New trigger bodies/writes/functions require manual review and new tests.
Definer identity is the actual creating account, checked at runtime/restore, not
a hardcoded privileged account. Do not change historic SQL to assign a new definer.

| Migration | Trigger | Event / subject | Definer SELECT tables | Body writes |
| --- | --- | --- | --- | --- |
| 000024 | protect_tenants_owner | UPDATE / tenants | tenants | None |
| 000025 | protect_platform_root | DELETE / tenants | tenants | None |
| 000026 | protect_tenant_memberships_owner | UPDATE / tenant_memberships | tenant_memberships | None |
| 000027 | protect_branches_owner | UPDATE / branches | branches | None |
| 000028 | protect_review_destinations_owner | UPDATE / review_destinations | review_destinations | None |
| 000029 | protect_short_links_owner | UPDATE / short_links | short_links | None |
| 000030 | protect_qr_assets_owner | UPDATE / qr_assets | qr_assets | None |
| 000031 | protect_subscriptions_owner | UPDATE / subscriptions | subscriptions | None |
| 000032 | protect_usage_counters_owner | UPDATE / usage_counters | usage_counters | None |
| 000033 | protect_private_feedback_owner | UPDATE / private_feedback | private_feedback | None |
| 000034 | protect_channel_versions_published | UPDATE / channel_versions | channel_versions | None |
| 000035 | protect_channel_versions_delete | DELETE / channel_versions | channel_versions | None |
| 000036 | protect_funnel_configurations_published | UPDATE / funnel_configurations | funnel_configurations | None |
| 000037 | protect_funnel_configurations_delete | DELETE / funnel_configurations | funnel_configurations | None |
| 000038 | protect_subscription_plans_published | UPDATE / subscription_plans | subscription_plans | None |
| 000039 | protect_subscription_plans_delete | DELETE / subscription_plans | subscription_plans | None |
| 000040 | protect_funnel_configurations_owner | UPDATE / funnel_configurations | funnel_configurations | None |
| 000041 | protect_channel_versions_owner | UPDATE / channel_versions | channel_versions | None |
| 000042 | protect_plan_limits_insert | INSERT / plan_limits | plan_limits, subscription_plans | None |
| 000043 | protect_plan_limits_update | UPDATE / plan_limits | plan_limits, subscription_plans | None |
| 000044 | protect_plan_limits_delete | DELETE / plan_limits | plan_limits, subscription_plans | None |
| 000045 | append_only_audit_logs_update | UPDATE / audit_logs | None | None |
| 000046 | append_only_audit_logs_delete | DELETE / audit_logs | None | None |
| 000047 | append_only_feedback_status_events_update | UPDATE / feedback_status_events | None | None |
| 000048 | append_only_feedback_status_events_delete | DELETE / feedback_status_events | None | None |
| 000049 | append_only_usage_records_update | UPDATE / usage_records | None | None |
| 000050 | append_only_usage_records_delete | DELETE / usage_records | None | None |
| 000051 | consume_auth_token_once | UPDATE / auth_tokens | auth_tokens | None |
| 000052 | validate_funnel_publish_insert | INSERT / funnel_configurations | branches, channel_versions, funnel_configurations, review_destinations | None |
| 000053 | validate_short_link_insert | INSERT / short_links | funnel_configurations, short_links | None |
| 000054 | validate_funnel_publish_update | UPDATE / funnel_configurations | branches, channel_versions, funnel_configurations, review_destinations | None |
| 000055 | validate_short_link_update | UPDATE / short_links | funnel_configurations, short_links | None |
| 000060 | validate_plan_publish | UPDATE / subscription_plans | plan_limits, subscription_plans | None |
| 000061 | require_draft_plan_insert | INSERT / subscription_plans | subscription_plans | None |
| 000062 | validate_subscription_plan | INSERT / subscriptions | subscription_plans, subscriptions | None |
| 000071 | immutable_commercial_approvals_update | UPDATE / commercial_approvals | None | None |
| 000072 | immutable_commercial_approvals_delete | DELETE / commercial_approvals | None | None |
| 000073 | immutable_billing_events_update | UPDATE / billing_events | None | None |
| 000074 | immutable_billing_events_delete | DELETE / billing_events | None | None |
| 000075 | protect_billing_agreements_owner | UPDATE / billing_agreements | billing_agreements | None |
| 000076 | protect_billable_usage_owner | UPDATE / billable_usage | billable_usage | None |
| 000078 | protect_merchant_presentation_owner | UPDATE / merchant_presentation | merchant_presentation | None |
| 000080 | protect_feedback_archives_update | UPDATE / feedback_archives | None | None |
| 000081 | protect_feedback_archives_delete | DELETE / feedback_archives | None | None |
| 000083 | validate_feedback_archive | INSERT / feedback_archives | feedback_archives, private_feedback | None |
| 000084 | protect_feedback_language | UPDATE / private_feedback | private_feedback | None |

Every row also requires definer TRIGGER on its subject. Detailed columns: [JSON map](HOSTINGER_TRIGGER_PRIVILEGE_DEPENDENCIES.json).
