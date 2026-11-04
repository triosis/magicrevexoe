SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='short_links' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='short_links')=10
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='short_links' AND COLUMN_NAME IN ('id','tenant_id','branch_id','funnel_configuration_id','code','status','expires_at','lock_version','created_at','updated_at'))=10
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='short_links' AND CONSTRAINT_NAME IN ('uq_short_code','uq_short_owner','fk_short_funnel','ck_short_code'))=4) AS satisfied
