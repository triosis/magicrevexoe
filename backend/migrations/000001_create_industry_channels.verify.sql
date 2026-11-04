SELECT ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='industry_channels' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci')=1
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='industry_channels')=6
AND (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='industry_channels' AND COLUMN_NAME IN ('id','code','name','status','created_at','updated_at'))=6
AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='industry_channels' AND CONSTRAINT_NAME IN ('uq_channel_code'))=1) AS satisfied
