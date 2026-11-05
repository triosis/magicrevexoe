SELECT (COUNT(*)=1) AS satisfied FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='mfa_recovery_codes' AND ENGINE='InnoDB' AND TABLE_COLLATION='utf8mb4_unicode_ci'
