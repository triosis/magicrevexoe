INSERT INTO roles (code,tenant_kind,name)
SELECT s.code,s.tenant_kind,s.name FROM (SELECT 'super_admin' AS code,'platform' AS tenant_kind,'Super Admin' AS name
UNION ALL
SELECT 'reseller_admin' AS code,'reseller' AS tenant_kind,'Reseller Admin' AS name
UNION ALL
SELECT 'sub_reseller_admin' AS code,'sub_reseller' AS tenant_kind,'Sub-Reseller Admin' AS name
UNION ALL
SELECT 'merchant_admin' AS code,'merchant' AS tenant_kind,'Merchant Admin' AS name
UNION ALL
SELECT 'merchant_staff' AS code,'merchant' AS tenant_kind,'Merchant Staff' AS name) s
WHERE NOT EXISTS (SELECT 1 FROM roles t WHERE t.code=s.code)
