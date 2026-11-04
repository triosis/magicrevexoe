INSERT INTO permissions (code,description)
SELECT s.code,s.description FROM (SELECT 'platform.manage' AS code,'Permission: platform.manage' AS description
UNION ALL
SELECT 'reseller.create' AS code,'Permission: reseller.create' AS description
UNION ALL
SELECT 'sub_reseller.create' AS code,'Permission: sub_reseller.create' AS description
UNION ALL
SELECT 'merchant.create' AS code,'Permission: merchant.create' AS description
UNION ALL
SELECT 'tenant.read' AS code,'Permission: tenant.read' AS description
UNION ALL
SELECT 'tenant.manage' AS code,'Permission: tenant.manage' AS description
UNION ALL
SELECT 'membership.manage' AS code,'Permission: membership.manage' AS description
UNION ALL
SELECT 'branch.manage' AS code,'Permission: branch.manage' AS description
UNION ALL
SELECT 'destination.manage' AS code,'Permission: destination.manage' AS description
UNION ALL
SELECT 'funnel.manage' AS code,'Permission: funnel.manage' AS description
UNION ALL
SELECT 'qr.manage' AS code,'Permission: qr.manage' AS description
UNION ALL
SELECT 'feedback.read' AS code,'Permission: feedback.read' AS description
UNION ALL
SELECT 'feedback.change_status' AS code,'Permission: feedback.change_status' AS description
UNION ALL
SELECT 'subscription.read' AS code,'Permission: subscription.read' AS description
UNION ALL
SELECT 'subscription.manage' AS code,'Permission: subscription.manage' AS description
UNION ALL
SELECT 'audit.read' AS code,'Permission: audit.read' AS description) s
WHERE NOT EXISTS (SELECT 1 FROM permissions t WHERE t.code=s.code)
