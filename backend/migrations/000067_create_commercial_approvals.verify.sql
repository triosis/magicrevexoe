SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commercial_approvals' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commercial_approvals')=5
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commercial_approvals' AND COLUMN_NAME IN ('plan_id','terms','approval_reference','approved_by','created_at'))=5
AND (SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commercial_approvals' AND INDEX_NAME IN ('PRIMARY'))=1
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='commercial_approvals' AND CONSTRAINT_NAME IN ('fk_commercial_plan','fk_commercial_approver','ck_commercial_terms'))=3) AS satisfied
