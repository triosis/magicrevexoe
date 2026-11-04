SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qr_assets' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qr_assets')=10
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qr_assets' AND COLUMN_NAME IN ('id','tenant_id','branch_id','short_link_id','format','object_key','content_sha256','status','created_at','updated_at'))=10
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='qr_assets' AND CONSTRAINT_NAME IN ('uq_qr_object','uq_qr_format','fk_qr_short','ck_qr_ready'))=4) AS satisfied
