INSERT INTO roles (code, name, account_type) VALUES
  ('SUPER_ADMIN', 'Super Administrator', 'SUPER_ADMIN'),
  ('RESELLER_OWNER', 'Reseller Owner', 'RESELLER'),
  ('RESELLER_STAFF', 'Reseller Staff', 'RESELLER'),
  ('SUB_RESELLER_OWNER', 'Sub-Reseller Owner', 'SUB_RESELLER'),
  ('SUB_RESELLER_STAFF', 'Sub-Reseller Staff', 'SUB_RESELLER'),
  ('CLIENT_OWNER', 'Client Owner', 'CLIENT'),
  ('CLIENT_MANAGER', 'Client Manager', 'CLIENT'),
  ('CLIENT_STAFF', 'Client Staff', 'CLIENT')
ON DUPLICATE KEY UPDATE name = VALUES(name), account_type = VALUES(account_type);

INSERT INTO permissions (code, description) VALUES
  ('dashboard.view', 'View dashboard'),
  ('reseller.create', 'Create resellers'), ('reseller.view', 'View resellers'),
  ('reseller.update', 'Update resellers'), ('reseller.suspend', 'Suspend resellers'),
  ('sub_reseller.create', 'Create sub-resellers'), ('sub_reseller.view', 'View sub-resellers'),
  ('sub_reseller.update', 'Update sub-resellers'),
  ('client.create', 'Create clients'), ('client.view', 'View clients'),
  ('client.update', 'Update clients'), ('client.suspend', 'Suspend clients'),
  ('billing.view', 'View billing'), ('billing.manage', 'Manage billing'),
  ('analytics.view', 'View analytics'), ('audit.view', 'View audit logs'),
  ('channel.view', 'View channels'), ('channel.create', 'Create channels'),
  ('channel.publish', 'Publish channels'), ('compliance.view', 'View compliance'),
  ('compliance.manage', 'Manage compliance'), ('ai.view', 'View AI features'),
  ('ai.manage', 'Manage AI features'), ('hardware.view', 'View hardware'),
  ('hardware.manage', 'Manage hardware'), ('payout.request', 'Request payouts'),
  ('payout.approve', 'Approve payouts')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','sub_reseller.create','sub_reseller.view','sub_reseller.update','client.create','client.view','client.update','client.suspend','billing.view','analytics.view','audit.view','channel.view','channel.create','channel.publish','compliance.view','hardware.view','payout.request')
WHERE r.code = 'RESELLER_OWNER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','sub_reseller.view','client.view','client.update','billing.view','analytics.view','channel.view','compliance.view','hardware.view')
WHERE r.code = 'RESELLER_STAFF';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','client.create','client.view','client.update','client.suspend','billing.view','analytics.view','audit.view','channel.view','channel.create','channel.publish','compliance.view','hardware.view','payout.request')
WHERE r.code = 'SUB_RESELLER_OWNER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','client.view','client.update','analytics.view','channel.view','compliance.view','hardware.view')
WHERE r.code = 'SUB_RESELLER_STAFF';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','client.view','client.update','billing.view','billing.manage','analytics.view','audit.view','channel.view','channel.create','channel.publish','compliance.view','compliance.manage','ai.view','ai.manage','hardware.view','hardware.manage')
WHERE r.code = 'CLIENT_OWNER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','client.view','client.update','analytics.view','channel.view','channel.create','channel.publish','compliance.view','ai.view','hardware.view')
WHERE r.code = 'CLIENT_MANAGER';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
('dashboard.view','client.view','analytics.view','channel.view','compliance.view','ai.view','hardware.view')
WHERE r.code = 'CLIENT_STAFF';

