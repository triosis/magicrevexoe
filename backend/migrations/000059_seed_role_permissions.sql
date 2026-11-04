INSERT INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM (SELECT 'super_admin' AS role_code,'platform.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'reseller.create' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'sub_reseller.create' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'merchant.create' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'tenant.read' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'tenant.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'membership.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'branch.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'destination.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'funnel.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'qr.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'feedback.read' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'feedback.change_status' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'subscription.read' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'subscription.manage' AS permission_code
UNION ALL
SELECT 'super_admin' AS role_code,'audit.read' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'sub_reseller.create' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'merchant.create' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'tenant.read' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'tenant.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'membership.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'branch.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'destination.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'funnel.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'qr.manage' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'feedback.read' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'feedback.change_status' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'subscription.read' AS permission_code
UNION ALL
SELECT 'reseller_admin' AS role_code,'audit.read' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'merchant.create' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'tenant.read' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'tenant.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'membership.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'branch.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'destination.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'funnel.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'qr.manage' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'feedback.read' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'feedback.change_status' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'subscription.read' AS permission_code
UNION ALL
SELECT 'sub_reseller_admin' AS role_code,'audit.read' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'tenant.read' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'tenant.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'membership.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'branch.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'destination.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'funnel.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'qr.manage' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'feedback.read' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'feedback.change_status' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'subscription.read' AS permission_code
UNION ALL
SELECT 'merchant_admin' AS role_code,'audit.read' AS permission_code
UNION ALL
SELECT 'merchant_staff' AS role_code,'tenant.read' AS permission_code
UNION ALL
SELECT 'merchant_staff' AS role_code,'feedback.read' AS permission_code
UNION ALL
SELECT 'merchant_staff' AS role_code,'feedback.change_status' AS permission_code) s JOIN roles r ON r.code=s.role_code JOIN permissions p ON p.code=s.permission_code WHERE NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id)
