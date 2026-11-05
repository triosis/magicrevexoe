CREATE TABLE user_mfa (
user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
secret_cipher VARBINARY(256) NULL,
pending_cipher VARBINARY(256) NULL,
pending_session_id BIGINT UNSIGNED NULL,
pending_expires_at DATETIME(6) NULL,
enabled_at DATETIME(6) NULL,
last_step BIGINT UNSIGNED NULL,
failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
locked_until DATETIME(6) NULL,
CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users(id),
CONSTRAINT fk_mfa_pending_session FOREIGN KEY (pending_session_id) REFERENCES auth_sessions(id),
CONSTRAINT ck_mfa_enabled CHECK ((enabled_at IS NULL AND secret_cipher IS NULL) OR (enabled_at IS NOT NULL AND secret_cipher IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
