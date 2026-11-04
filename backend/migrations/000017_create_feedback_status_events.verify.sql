SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='feedback_status_events' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='feedback_status_events')=8
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='feedback_status_events' AND COLUMN_NAME IN ('id','tenant_id','feedback_id','actor_user_id','from_status','to_status','reason_code','created_at'))=8
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='feedback_status_events' AND CONSTRAINT_NAME IN ('fk_status_feedback','fk_status_user','ck_status_transition'))=3) AS satisfied
