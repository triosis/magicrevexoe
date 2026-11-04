CREATE TABLE qr_assets (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
branch_id BIGINT UNSIGNED NOT NULL,
short_link_id BIGINT UNSIGNED NOT NULL,
format ENUM('png','svg') NOT NULL,
object_key VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
content_sha256 BINARY(32) NULL,
status ENUM('pending','ready','failed','retired') NOT NULL DEFAULT 'pending',
UNIQUE KEY uq_qr_object (object_key),
UNIQUE KEY uq_qr_format (tenant_id,branch_id,short_link_id,format),
KEY ix_qr_status (tenant_id,status,id),
CONSTRAINT fk_qr_short FOREIGN KEY (tenant_id,branch_id,short_link_id) REFERENCES short_links(tenant_id,branch_id,id),
CONSTRAINT ck_qr_ready CHECK (status<>'ready' OR content_sha256 IS NOT NULL),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
