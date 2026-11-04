CREATE TABLE short_links (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
branch_id BIGINT UNSIGNED NOT NULL,
funnel_configuration_id BIGINT UNSIGNED NOT NULL,
code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
status ENUM('active','disabled') NOT NULL DEFAULT 'active',
expires_at DATETIME(6) NULL,
lock_version INT UNSIGNED NOT NULL DEFAULT 1,
UNIQUE KEY uq_short_code (code),
UNIQUE KEY uq_short_owner (tenant_id,branch_id,id),
KEY ix_short_status (tenant_id,branch_id,status,id),
CONSTRAINT fk_short_funnel FOREIGN KEY (tenant_id,branch_id,funnel_configuration_id) REFERENCES funnel_configurations(tenant_id,branch_id,id),
CONSTRAINT ck_short_code CHECK (CHAR_LENGTH(code)>=22 AND code REGEXP '^[A-Za-z0-9_-]+$'),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
