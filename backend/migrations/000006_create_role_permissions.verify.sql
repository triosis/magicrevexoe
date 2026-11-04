SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions')=3
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions' AND COLUMN_NAME IN ('role_id','permission_id','created_at'))=3
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='role_permissions' AND CONSTRAINT_NAME IN ('fk_rp_role','fk_rp_permission'))=2) AS satisfied
