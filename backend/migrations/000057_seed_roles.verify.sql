SELECT (COUNT(*)=5 AND (SELECT COUNT(*) FROM roles)=5) AS satisfied FROM (SELECT 'super_admin' AS code,'platform' AS tenant_kind,'Super Admin' AS name
UNION ALL
SELECT 'reseller_admin' AS code,'reseller' AS tenant_kind,'Reseller Admin' AS name
UNION ALL
SELECT 'sub_reseller_admin' AS code,'sub_reseller' AS tenant_kind,'Sub-Reseller Admin' AS name
UNION ALL
SELECT 'merchant_admin' AS code,'merchant' AS tenant_kind,'Merchant Admin' AS name
UNION ALL
SELECT 'merchant_staff' AS code,'merchant' AS tenant_kind,'Merchant Staff' AS name) s JOIN roles t ON t.code<=>s.code AND t.tenant_kind<=>s.tenant_kind AND t.name<=>s.name
