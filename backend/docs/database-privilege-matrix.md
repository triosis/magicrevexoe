# Database privilege matrix - Task 17

2026-11-05. Derived from all 67 actual migration statements and current application
SQL, then tested with separate restricted accounts on disposable MariaDB 11.8.9.
No production account/grant was inspected, requested, stored or changed.

## Migration and trigger-definer identity

The operator profile requires exactly schema-level SELECT, CREATE, ALTER and
TRIGGER for the one approved project schema; INSERT on schema_migrations and the
four seeded catalog tables; UPDATE only on schema_migrations. Table-level CREATE
may additionally be included with those five table grants to provision them
before creation; it adds no effective privilege beyond schema CREATE. Actual
MariaDB rejected precreation DML-only table grants and accepted CREATE plus DML.

| SQL/use | Required grant | Actual scope |
| --- | --- | --- |
| CREATE TABLE, including inline keys/FKs/CHECKs | CREATE | Project schema |
| ALTER TABLE auth_sessions in 000063/000066 | ALTER | Project schema in this supported profile |
| 35 CREATE TRIGGER statements | TRIGGER | Project schema, also needed for full trigger metadata visibility and subsequent definer activation |
| Postconditions, complete metadata inventory, trigger SELECTs | SELECT | Project schema; required to avoid hidden objects in structural inspection |
| Seed industry_channels, roles, permissions, role_permissions | INSERT | Those four tables only |
| Bootstrap and durable migration progress | INSERT, UPDATE | schema_migrations only |
| UTC/autocommit and bounded session lock waits; named locks | No global administration grant requested | Current dedicated session only; behavior must be proved on provider clone |

No standalone CREATE INDEX, DROP, DELETE, explicit DEFINER, routine, event, view,
GRANT or account-management statement exists in the migration source. No INDEX,
REFERENCES, SET USER, SUPER, FILE, PROCESS, RELOAD, GRANT OPTION, EXECUTE,
CREATE/ALTER ROUTINE, CREATE USER or global ALL PRIVILEGES is required/accepted by
the implemented profile. CREATE/ALTER can create their inline indexes without a
separate INDEX grant; CREATE TRIGGER requires TRIGGER. See the primary
[MariaDB grant reference](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant)
and [trigger reference](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/create-trigger).

Provider-side binary-log/trigger policy may impose additional requirements. Stop
if the approved restricted profile cannot create triggers; do not automatically
request SUPER or change server settings. No Hostinger capability is assumed.
The default trigger definer is the executing migration account; no SET USER is
needed for an explicit foreign definer because the SQL supplies none. All current
trigger bodies inspect OLD/NEW/SELECT or SIGNAL; none writes another table.
Keep required SELECT/TRIGGER rights and the account valid while those triggers
exist. Separate DBA/provisioning authority is outside both application accounts.

Provisioning templates only, for a separately authorized DBA. Replace placeholders
privately; **escape every underscore as \_ in schema-level grant patterns** and
never use a percent wildcard. Backticks alone do not make a schema grant literal.
The checker rejects unescaped wildcard grants, including unrelated databases.

```sql
GRANT SELECT, CREATE, ALTER, TRIGGER ON `<LITERAL_ESCAPED_SCHEMA>`.* TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
GRANT CREATE, INSERT, UPDATE ON `<SCHEMA>`.`schema_migrations` TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
GRANT CREATE, INSERT ON `<SCHEMA>`.`industry_channels` TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
GRANT CREATE, INSERT ON `<SCHEMA>`.`roles` TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
GRANT CREATE, INSERT ON `<SCHEMA>`.`permissions` TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
GRANT CREATE, INSERT ON `<SCHEMA>`.`role_permissions` TO '<MIGRATION_IDENTITY>'@'<APPROVED_CLIENT_HOST>';
```

These statements were not executed against production. Accounts/passwords and
Hostinger permissions must be provisioned and verified independently. The CLI
does not execute GRANT/REVOKE or create identities. Schema ALTER is a deliberate
table-level-profile simplification for the approved project scope; grant-policy
support for a narrower table/column/role model requires a separate reviewed change.

## Application runtime identity

Use explicit table grants, never database-wide INSERT/UPDATE or inherited broad
rights. No ledger privileges, DELETE, schema modification or grant option. The
shared runtime identity covers authorized platform operations as well as tenant
requests; SQL grant separation is not database row-level tenant authorization.
Existing service ownership/ancestry checks, MFA and quota transactions remain
mandatory. The industry_channels UPDATE is required by the existing platform
channel-administration API, not merchant permission to alter platform settings.

| Table | Required privileges |
| --- | --- |
| audit_logs | SELECT, INSERT |
| auth_sessions | SELECT, INSERT, UPDATE |
| auth_tokens | SELECT, INSERT, UPDATE |
| branches | SELECT, INSERT, UPDATE |
| channel_versions | SELECT, INSERT, UPDATE |
| feedback_status_events | SELECT, INSERT |
| funnel_configurations | SELECT, INSERT, UPDATE |
| industry_channels | SELECT, UPDATE |
| mfa_recovery_codes | SELECT, INSERT, UPDATE |
| permissions | SELECT |
| plan_limits | SELECT |
| private_feedback | SELECT, INSERT, UPDATE |
| qr_assets | SELECT, INSERT, UPDATE |
| review_destinations | SELECT, INSERT, UPDATE |
| role_permissions | SELECT |
| roles | SELECT |
| short_links | SELECT, INSERT, UPDATE |
| subscription_plans | SELECT |
| subscriptions | SELECT, INSERT, UPDATE |
| tenant_memberships | SELECT, INSERT, UPDATE |
| tenants | SELECT, INSERT, UPDATE |
| usage_counters | SELECT, INSERT, UPDATE |
| usage_records | SELECT, INSERT |
| user_mfa | SELECT, INSERT, UPDATE |
| users | SELECT, INSERT, UPDATE |
| schema_migrations | None |

Grant each row's listed privileges on that one table to the runtime account.
No schema-level grant is accepted by check-runtime. SELECT-only commercial terms
must be authored through a separately reviewed provisioning workflow; no sample
plan or price is invented here. Archive/disable operations are UPDATE, not DELETE.

## Effective privileges and evidence limits

SHOW GRANTS is parsed without printing its raw output, which can contain password
authentication hashes. Active roles, role grants, PUBLIC grants, proxy/routine/
column grants, unknown syntax, global rights other than USAGE, unrelated schemas,
wildcards, grant option and excess rights fail closed. Both positive completeness
and negative excess checks apply. This direct-grant model intentionally refuses
to claim support for arbitrary inherited role graphs.

The local MariaDB ZIP installer gave PUBLIC broad access to test/test\_% schemas.
The new checker caught that effective inheritance despite an otherwise restricted
account. Tests remove only those grants on the harness-owned disposable server
before proving least privilege. They never modify a provider's PUBLIC role.
An operator must resolve any provider PUBLIC/inherited rights through review;
ignoring unrelated grants would misstate account separation.

Locally verified: a restricted migration account creates all tables, indexes and
35 triggers; a separate runtime account reads catalogs and activates an immutable
ownership trigger but cannot read/write the ledger, ALTER/CREATE a table or UPDATE
append-only audit rows. Existing application regressions continue to run. This is
not proof that every provider identity/definer has the same effective grants, nor
a claim of a full real-stack suite executed under provider runtime credentials.
