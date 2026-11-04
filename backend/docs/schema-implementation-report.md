# Task 04 schema implementation and test report

Completed locally on 2026-11-04. No Hostinger connection, production credentials,
production changes, destructive SQL, authentication/business API or frontend change.
The original 000000 migration and runner source are unchanged.

## Implemented result

- 62 new single-statement migrations plus 62 matching verification files.
- 23 business tables, 35 ownership/immutability/publication/history triggers,
  four seed statements. With the unchanged tracking table there are 24 tables.
- Safe seeds: three industry channels, five roles, sixteen permissions and
  fifty-five explicit role-permission pairs. No users, tenants, plan prices,
  administrator password, raw token, customer or production URL is seeded.
- InnoDB/utf8mb4/utf8mb4_unicode_ci; composite ownership keys; named FK/CHECK/
  unique/index definitions; UTC microsecond timestamps; binary opaque identifiers.
- Merchant parent paths are platform-direct, reseller-direct or sub-reseller-owned.
- No review-gating flags, medical-detail fields, free-text feedback or customer
  administrative membership type. Both public/private labels are fixed in channel
  JSON and a published funnel requires its Google destination and channel version.

## Test results

Commands executed using a newly initialized disposable MariaDB **11.8.9** Windows
ZIP server, loopback random port, random ephemeral credential, no installed service:

| Command (from repository root) | Result |
| --- | --- |
| npm --prefix backend test | 12 foundation/unit tests passed, no failures/skips |
| npm --prefix backend run test:schema:integration | 9 schema scenarios + parent test: 10 passed, no failures/skips |
| npm --prefix backend run test:migrations:integration | 7 infrastructure scenarios + parent test: 8 passed, no failures/skips |
| TypeScript build (part of every command) | Passed |
| git diff --check | Passed |

Schema scenarios verify full fresh migration/status, safe seed replay and conflict
refusal, all five valid edges and all forbidden parent-type pairs, NULL/mismatched
parents, root uniqueness, actual descendant traversal, role type membership FKs,
password representation checks, hashed token uniqueness/single consumption, expiry,
channel JSON shape, branch/channel ownership, canonical Google URL, published
content immutability including case-only edits, active-link publication requirements,
QR ownership/readiness digest, structured feedback/rating/idempotency constraints,
merchant-only subscriptions, plan completeness/immutability, active subscription
uniqueness, usage ownership/quantity constraints, transaction rollback and append-only
UPDATE rejection, BIGINT 9007199254740993 round-trip as a string and checksum drift.
Infrastructure regression covers locking, bootstrap/incomplete states, committed DDL
failure, explicit forward repair, savepoints and multiple-statement refusal.

DELETE guards are inspected through metadata, not executed: this task prohibits
destructive SQL. All data-changing tests use only synthetic disposable fixtures.
No automated test establishes Hostinger table-level privileges or production grants.

## MariaDB compatibility decisions

1. MariaDB disallows referencing an AUTO_INCREMENT ID in a CHECK. Removed the
   redundant self-ID CHECK before finalizing these new migrations. Typed parent
   constraints plus composite FK reject self-parenting; immutable parents prevent
   later cycles. No previously committed/applied migration was modified.
2. Foreign-key ENUM columns use identical full domains; merchant-only CHECKs enforce
   ownership. Actual MariaDB 11.8.9 accepted/enforced these definitions.
3. Generated PERSISTENT columns enforce one root and one allocated subscription.
   Database negative tests reject duplicates.
4. Trigger guards compare protected values byte-for-byte with BINARY, so the
   human-text collation cannot permit case/accent-only published-content edits.
5. QR digest is nullable while pending/failed but required for ready metadata;
   object keys are ASCII binary to fit a full unique index without utf8mb4 growth.
6. Audit actor membership uses a stronger (actor tenant, membership, user) composite
   FK, so the claimed actor user must actually own that membership.
7. Client BIGINT support is explicit in the existing pool factory. No ID is coerced
   into a JavaScript number. Future repositories must continue binding string IDs.
8. Current tracking table uses CHAR(6) version keys and single-statement verification
   files, refining the original design's VARCHAR(64)/multi-step proposal. Business
   scripts preserve that existing runner rather than replacing it.

No unresolved local MariaDB syntax/constraint issue remains. Production blockers
are separate credentials/effective grants, Hostinger trigger/lock/session behavior,
existing schema/data inventory and mappings, and backup/restore rehearsal. Root
integration credentials prove behavior, not least-privilege production feasibility.

## Database versus future service guarantees

FKs isolate stored ownership relationships, not SELECT permissions. Future
repositories must enforce actor ancestry and permissions on every query; no API
or repository authorization was implemented here. Global identity/session tables
are platform-owned, not customer accounts. Membership status, last-admin protection,
Argon2id hashing/costs, signed funnel-submission version tokens, public abuse controls,
quota admission locks/counter reconciliation, safe audit payload allowlists and
retention workflows still belong to separately approved service tasks.

Stored hashes are fixed-size token digests and Argon2id-format password strings;
the database cannot prove how a caller generated a digest. Published funnel rows
are immutable; their referenced destination is an operational record whose future
updates must be authorized/audited. Public UI parallel-path rendering must be tested
when implemented; schema constraints cannot alone guarantee browser presentation.
Safe metadata JSON does not license arbitrary PII: future services must allowlist it.

## All files created or modified

### Existing files modified

| File | Change |
| --- | --- |
| [../src/db/pool.ts](../src/db/pool.ts) | BIGINT result safety options |
| [../package.json](../package.json) | Explicit test:schema:integration command |
| [../test/migrations.test.mjs](../test/migrations.test.mjs) | Full-manifest regression expectations |
| [../test/migrations.integration.mjs](../test/migrations.integration.mjs) | Bootstrap-only fault fixtures; full CLI schema expectations |
| [database-architecture.md](database-architecture.md) | Implemented status, physical refinements and remaining service work |
| [database-compatibility-checklist.md](database-compatibility-checklist.md) | Local MariaDB evidence versus unverified Hostinger gates |
| [migration-guide.md](migration-guide.md) | Schema ordering, commands, seeds and postconditions |

### Non-migration files created

| File | Purpose |
| --- | --- |
| [../test/schema.integration.mjs](../test/schema.integration.mjs) | Disposable full-schema integration tests |
| [schema-implementation-report.md](schema-implementation-report.md) | This complete inventory, dependency manifest and test report |

### Every new SQL/verification file

Each row links both new files. The runner always applies the full numeric prefix;
listed object dependencies are additional explanations, not permission to skip
versions. Every table postcondition verifies expected columns and named constraints
plus InnoDB/collation; trigger postconditions verify event/table/timing; seeds verify
exact definitions and total counts. There is no IF NOT EXISTS or destructive reset.

| Migration SQL | Postcondition SQL | Object dependencies |
| --- | --- | --- |
| [000001_create_industry_channels.sql](../migrations/000001_create_industry_channels.sql) | [000001_create_industry_channels.verify.sql](../migrations/000001_create_industry_channels.verify.sql) | schema_migrations / previous ordered prefix |
| [000002_create_tenants.sql](../migrations/000002_create_tenants.sql) | [000002_create_tenants.verify.sql](../migrations/000002_create_tenants.verify.sql) | industry_channels (000001) |
| [000003_create_users.sql](../migrations/000003_create_users.sql) | [000003_create_users.verify.sql](../migrations/000003_create_users.verify.sql) | schema_migrations / previous ordered prefix |
| [000004_create_roles.sql](../migrations/000004_create_roles.sql) | [000004_create_roles.verify.sql](../migrations/000004_create_roles.verify.sql) | schema_migrations / previous ordered prefix |
| [000005_create_permissions.sql](../migrations/000005_create_permissions.sql) | [000005_create_permissions.verify.sql](../migrations/000005_create_permissions.verify.sql) | schema_migrations / previous ordered prefix |
| [000006_create_role_permissions.sql](../migrations/000006_create_role_permissions.sql) | [000006_create_role_permissions.verify.sql](../migrations/000006_create_role_permissions.verify.sql) | roles (000004), permissions (000005) |
| [000007_create_tenant_memberships.sql](../migrations/000007_create_tenant_memberships.sql) | [000007_create_tenant_memberships.verify.sql](../migrations/000007_create_tenant_memberships.verify.sql) | tenants (000002), roles (000004), users (000003) |
| [000008_create_auth_sessions.sql](../migrations/000008_create_auth_sessions.sql) | [000008_create_auth_sessions.verify.sql](../migrations/000008_create_auth_sessions.verify.sql) | users (000003) |
| [000009_create_auth_tokens.sql](../migrations/000009_create_auth_tokens.sql) | [000009_create_auth_tokens.verify.sql](../migrations/000009_create_auth_tokens.verify.sql) | users (000003), tenants (000002), tenant_memberships (000007) |
| [000010_create_channel_versions.sql](../migrations/000010_create_channel_versions.sql) | [000010_create_channel_versions.verify.sql](../migrations/000010_create_channel_versions.verify.sql) | industry_channels (000001) |
| [000011_create_branches.sql](../migrations/000011_create_branches.sql) | [000011_create_branches.verify.sql](../migrations/000011_create_branches.verify.sql) | tenants (000002) |
| [000012_create_review_destinations.sql](../migrations/000012_create_review_destinations.sql) | [000012_create_review_destinations.verify.sql](../migrations/000012_create_review_destinations.verify.sql) | branches (000011) |
| [000013_create_funnel_configurations.sql](../migrations/000013_create_funnel_configurations.sql) | [000013_create_funnel_configurations.verify.sql](../migrations/000013_create_funnel_configurations.verify.sql) | branches (000011), channel_versions (000010), review_destinations (000012) |
| [000014_create_short_links.sql](../migrations/000014_create_short_links.sql) | [000014_create_short_links.verify.sql](../migrations/000014_create_short_links.verify.sql) | funnel_configurations (000013) |
| [000015_create_qr_assets.sql](../migrations/000015_create_qr_assets.sql) | [000015_create_qr_assets.verify.sql](../migrations/000015_create_qr_assets.verify.sql) | short_links (000014) |
| [000016_create_private_feedback.sql](../migrations/000016_create_private_feedback.sql) | [000016_create_private_feedback.verify.sql](../migrations/000016_create_private_feedback.verify.sql) | funnel_configurations (000013), short_links (000014), tenant_memberships (000007) |
| [000017_create_feedback_status_events.sql](../migrations/000017_create_feedback_status_events.sql) | [000017_create_feedback_status_events.verify.sql](../migrations/000017_create_feedback_status_events.verify.sql) | private_feedback (000016), users (000003) |
| [000018_create_subscription_plans.sql](../migrations/000018_create_subscription_plans.sql) | [000018_create_subscription_plans.verify.sql](../migrations/000018_create_subscription_plans.verify.sql) | schema_migrations / previous ordered prefix |
| [000019_create_plan_limits.sql](../migrations/000019_create_plan_limits.sql) | [000019_create_plan_limits.verify.sql](../migrations/000019_create_plan_limits.verify.sql) | subscription_plans (000018) |
| [000020_create_subscriptions.sql](../migrations/000020_create_subscriptions.sql) | [000020_create_subscriptions.verify.sql](../migrations/000020_create_subscriptions.verify.sql) | tenants (000002), subscription_plans (000018) |
| [000021_create_usage_records.sql](../migrations/000021_create_usage_records.sql) | [000021_create_usage_records.verify.sql](../migrations/000021_create_usage_records.verify.sql) | subscriptions (000020) |
| [000022_create_usage_counters.sql](../migrations/000022_create_usage_counters.sql) | [000022_create_usage_counters.verify.sql](../migrations/000022_create_usage_counters.verify.sql) | subscriptions (000020) |
| [000023_create_audit_logs.sql](../migrations/000023_create_audit_logs.sql) | [000023_create_audit_logs.verify.sql](../migrations/000023_create_audit_logs.verify.sql) | tenants (000002), users (000003), tenant_memberships (000007) |
| [000024_protect_tenants_owner.sql](../migrations/000024_protect_tenants_owner.sql) | [000024_protect_tenants_owner.verify.sql](../migrations/000024_protect_tenants_owner.verify.sql) | tenants (000002) |
| [000025_protect_platform_root.sql](../migrations/000025_protect_platform_root.sql) | [000025_protect_platform_root.verify.sql](../migrations/000025_protect_platform_root.verify.sql) | tenants (000002) |
| [000026_protect_tenant_memberships_owner.sql](../migrations/000026_protect_tenant_memberships_owner.sql) | [000026_protect_tenant_memberships_owner.verify.sql](../migrations/000026_protect_tenant_memberships_owner.verify.sql) | tenant_memberships (000007) |
| [000027_protect_branches_owner.sql](../migrations/000027_protect_branches_owner.sql) | [000027_protect_branches_owner.verify.sql](../migrations/000027_protect_branches_owner.verify.sql) | branches (000011) |
| [000028_protect_review_destinations_owner.sql](../migrations/000028_protect_review_destinations_owner.sql) | [000028_protect_review_destinations_owner.verify.sql](../migrations/000028_protect_review_destinations_owner.verify.sql) | review_destinations (000012) |
| [000029_protect_short_links_owner.sql](../migrations/000029_protect_short_links_owner.sql) | [000029_protect_short_links_owner.verify.sql](../migrations/000029_protect_short_links_owner.verify.sql) | short_links (000014) |
| [000030_protect_qr_assets_owner.sql](../migrations/000030_protect_qr_assets_owner.sql) | [000030_protect_qr_assets_owner.verify.sql](../migrations/000030_protect_qr_assets_owner.verify.sql) | qr_assets (000015) |
| [000031_protect_subscriptions_owner.sql](../migrations/000031_protect_subscriptions_owner.sql) | [000031_protect_subscriptions_owner.verify.sql](../migrations/000031_protect_subscriptions_owner.verify.sql) | subscriptions (000020) |
| [000032_protect_usage_counters_owner.sql](../migrations/000032_protect_usage_counters_owner.sql) | [000032_protect_usage_counters_owner.verify.sql](../migrations/000032_protect_usage_counters_owner.verify.sql) | usage_counters (000022) |
| [000033_protect_private_feedback_owner.sql](../migrations/000033_protect_private_feedback_owner.sql) | [000033_protect_private_feedback_owner.verify.sql](../migrations/000033_protect_private_feedback_owner.verify.sql) | private_feedback (000016) |
| [000034_protect_channel_versions_published.sql](../migrations/000034_protect_channel_versions_published.sql) | [000034_protect_channel_versions_published.verify.sql](../migrations/000034_protect_channel_versions_published.verify.sql) | channel_versions (000010) |
| [000035_protect_channel_versions_delete.sql](../migrations/000035_protect_channel_versions_delete.sql) | [000035_protect_channel_versions_delete.verify.sql](../migrations/000035_protect_channel_versions_delete.verify.sql) | channel_versions (000010) |
| [000036_protect_funnel_configurations_published.sql](../migrations/000036_protect_funnel_configurations_published.sql) | [000036_protect_funnel_configurations_published.verify.sql](../migrations/000036_protect_funnel_configurations_published.verify.sql) | funnel_configurations (000013) |
| [000037_protect_funnel_configurations_delete.sql](../migrations/000037_protect_funnel_configurations_delete.sql) | [000037_protect_funnel_configurations_delete.verify.sql](../migrations/000037_protect_funnel_configurations_delete.verify.sql) | funnel_configurations (000013) |
| [000038_protect_subscription_plans_published.sql](../migrations/000038_protect_subscription_plans_published.sql) | [000038_protect_subscription_plans_published.verify.sql](../migrations/000038_protect_subscription_plans_published.verify.sql) | subscription_plans (000018) |
| [000039_protect_subscription_plans_delete.sql](../migrations/000039_protect_subscription_plans_delete.sql) | [000039_protect_subscription_plans_delete.verify.sql](../migrations/000039_protect_subscription_plans_delete.verify.sql) | subscription_plans (000018) |
| [000040_protect_funnel_configurations_owner.sql](../migrations/000040_protect_funnel_configurations_owner.sql) | [000040_protect_funnel_configurations_owner.verify.sql](../migrations/000040_protect_funnel_configurations_owner.verify.sql) | funnel_configurations (000013) |
| [000041_protect_channel_versions_owner.sql](../migrations/000041_protect_channel_versions_owner.sql) | [000041_protect_channel_versions_owner.verify.sql](../migrations/000041_protect_channel_versions_owner.verify.sql) | channel_versions (000010) |
| [000042_protect_plan_limits_insert.sql](../migrations/000042_protect_plan_limits_insert.sql) | [000042_protect_plan_limits_insert.verify.sql](../migrations/000042_protect_plan_limits_insert.verify.sql) | plan_limits (000019), subscription_plans (000018) |
| [000043_protect_plan_limits_update.sql](../migrations/000043_protect_plan_limits_update.sql) | [000043_protect_plan_limits_update.verify.sql](../migrations/000043_protect_plan_limits_update.verify.sql) | plan_limits (000019), subscription_plans (000018) |
| [000044_protect_plan_limits_delete.sql](../migrations/000044_protect_plan_limits_delete.sql) | [000044_protect_plan_limits_delete.verify.sql](../migrations/000044_protect_plan_limits_delete.verify.sql) | plan_limits (000019), subscription_plans (000018) |
| [000045_append_only_audit_logs_update.sql](../migrations/000045_append_only_audit_logs_update.sql) | [000045_append_only_audit_logs_update.verify.sql](../migrations/000045_append_only_audit_logs_update.verify.sql) | audit_logs (000023) |
| [000046_append_only_audit_logs_delete.sql](../migrations/000046_append_only_audit_logs_delete.sql) | [000046_append_only_audit_logs_delete.verify.sql](../migrations/000046_append_only_audit_logs_delete.verify.sql) | audit_logs (000023) |
| [000047_append_only_feedback_status_events_update.sql](../migrations/000047_append_only_feedback_status_events_update.sql) | [000047_append_only_feedback_status_events_update.verify.sql](../migrations/000047_append_only_feedback_status_events_update.verify.sql) | feedback_status_events (000017) |
| [000048_append_only_feedback_status_events_delete.sql](../migrations/000048_append_only_feedback_status_events_delete.sql) | [000048_append_only_feedback_status_events_delete.verify.sql](../migrations/000048_append_only_feedback_status_events_delete.verify.sql) | feedback_status_events (000017) |
| [000049_append_only_usage_records_update.sql](../migrations/000049_append_only_usage_records_update.sql) | [000049_append_only_usage_records_update.verify.sql](../migrations/000049_append_only_usage_records_update.verify.sql) | usage_records (000021) |
| [000050_append_only_usage_records_delete.sql](../migrations/000050_append_only_usage_records_delete.sql) | [000050_append_only_usage_records_delete.verify.sql](../migrations/000050_append_only_usage_records_delete.verify.sql) | usage_records (000021) |
| [000051_consume_auth_token_once.sql](../migrations/000051_consume_auth_token_once.sql) | [000051_consume_auth_token_once.verify.sql](../migrations/000051_consume_auth_token_once.verify.sql) | auth_tokens (000009) |
| [000052_validate_funnel_publish_insert.sql](../migrations/000052_validate_funnel_publish_insert.sql) | [000052_validate_funnel_publish_insert.verify.sql](../migrations/000052_validate_funnel_publish_insert.verify.sql) | funnel_configurations (000013), channel_versions (000010), review_destinations (000012), branches (000011) |
| [000053_validate_short_link_insert.sql](../migrations/000053_validate_short_link_insert.sql) | [000053_validate_short_link_insert.verify.sql](../migrations/000053_validate_short_link_insert.verify.sql) | short_links (000014), funnel_configurations (000013) |
| [000054_validate_funnel_publish_update.sql](../migrations/000054_validate_funnel_publish_update.sql) | [000054_validate_funnel_publish_update.verify.sql](../migrations/000054_validate_funnel_publish_update.verify.sql) | funnel_configurations (000013), channel_versions (000010), review_destinations (000012), branches (000011) |
| [000055_validate_short_link_update.sql](../migrations/000055_validate_short_link_update.sql) | [000055_validate_short_link_update.verify.sql](../migrations/000055_validate_short_link_update.verify.sql) | short_links (000014), funnel_configurations (000013) |
| [000056_seed_industry_channels.sql](../migrations/000056_seed_industry_channels.sql) | [000056_seed_industry_channels.verify.sql](../migrations/000056_seed_industry_channels.verify.sql) | industry_channels (000001) |
| [000057_seed_roles.sql](../migrations/000057_seed_roles.sql) | [000057_seed_roles.verify.sql](../migrations/000057_seed_roles.verify.sql) | roles (000004) |
| [000058_seed_permissions.sql](../migrations/000058_seed_permissions.sql) | [000058_seed_permissions.verify.sql](../migrations/000058_seed_permissions.verify.sql) | permissions (000005) |
| [000059_seed_role_permissions.sql](../migrations/000059_seed_role_permissions.sql) | [000059_seed_role_permissions.verify.sql](../migrations/000059_seed_role_permissions.verify.sql) | role_permissions (000006), roles (000004), permissions (000005) |
| [000060_validate_plan_publish.sql](../migrations/000060_validate_plan_publish.sql) | [000060_validate_plan_publish.verify.sql](../migrations/000060_validate_plan_publish.verify.sql) | subscription_plans (000018), plan_limits (000019) |
| [000061_require_draft_plan_insert.sql](../migrations/000061_require_draft_plan_insert.sql) | [000061_require_draft_plan_insert.verify.sql](../migrations/000061_require_draft_plan_insert.verify.sql) | subscription_plans (000018) |
| [000062_validate_subscription_plan.sql](../migrations/000062_validate_subscription_plan.sql) | [000062_validate_subscription_plan.verify.sql](../migrations/000062_validate_subscription_plan.verify.sql) | subscriptions (000020), subscription_plans (000018) |

No production deployment or migration execution is authorized by this report.
