CREATE TABLE mfa_recovery_codes (
user_id BIGINT UNSIGNED NOT NULL,
code_hash BINARY(32) NOT NULL,
consumed_at DATETIME(6) NULL,
created_at DATETIME(6) NOT NULL DEFAULT UTC_TIMESTAMP(6),
PRIMARY KEY (user_id,code_hash),
CONSTRAINT fk_mfa_recovery_user FOREIGN KEY (user_id) REFERENCES user_mfa(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
