CREATE TABLE auth_tokens (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
user_id BIGINT UNSIGNED NOT NULL,
purpose ENUM('invite','verify_email','reset_password') NOT NULL,
tenant_id BIGINT UNSIGNED NULL,
token_hash BINARY(32) NOT NULL,
expires_at DATETIME(6) NOT NULL,
consumed_at DATETIME(6) NULL,
UNIQUE KEY uq_auth_token (token_hash),
KEY ix_auth_token_user (user_id,purpose,expires_at),
CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id),
CONSTRAINT fk_token_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
CONSTRAINT fk_token_invite FOREIGN KEY (tenant_id,user_id) REFERENCES tenant_memberships(tenant_id,user_id),
CONSTRAINT ck_token_scope CHECK ((purpose='invite' AND tenant_id IS NOT NULL) OR (purpose<>'invite' AND tenant_id IS NULL)),
CONSTRAINT ck_token_expiry CHECK (expires_at>created_at AND (consumed_at IS NULL OR consumed_at>=created_at)),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
