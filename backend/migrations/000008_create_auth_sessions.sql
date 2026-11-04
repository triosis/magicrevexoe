CREATE TABLE auth_sessions (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
user_id BIGINT UNSIGNED NOT NULL,
token_hash BINARY(32) NOT NULL,
family_id BINARY(16) NOT NULL,
expires_at DATETIME(6) NOT NULL,
revoked_at DATETIME(6) NULL,
last_used_at DATETIME(6) NULL,
UNIQUE KEY uq_session_token (token_hash),
KEY ix_session_user (user_id,revoked_at,expires_at),
KEY ix_session_family (family_id),
CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id),
CONSTRAINT ck_session_expiry CHECK (expires_at>created_at),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
