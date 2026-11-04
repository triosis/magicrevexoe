SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auth_tokens' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auth_tokens')=8
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auth_tokens' AND COLUMN_NAME IN ('id','user_id','purpose','tenant_id','token_hash','expires_at','consumed_at','created_at'))=8
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auth_tokens' AND CONSTRAINT_NAME IN ('uq_auth_token','fk_token_user','fk_token_tenant','fk_token_invite','ck_token_scope','ck_token_expiry'))=6) AS satisfied
