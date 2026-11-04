CREATE TABLE review_destinations (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
branch_id BIGINT UNSIGNED NOT NULL,
provider ENUM('google') NOT NULL DEFAULT 'google',
place_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
review_url VARCHAR(2048) NOT NULL,
status ENUM('active','disabled') NOT NULL DEFAULT 'active',
lock_version INT UNSIGNED NOT NULL DEFAULT 1,
UNIQUE KEY uq_destination_provider (tenant_id,branch_id,provider),
UNIQUE KEY uq_destination_owner (tenant_id,branch_id,id),
KEY ix_destination_status (tenant_id,status,id),
CONSTRAINT fk_destination_branch FOREIGN KEY (tenant_id,branch_id) REFERENCES branches(tenant_id,id),
CONSTRAINT ck_destination_url CHECK (place_id REGEXP '^[A-Za-z0-9_-]+$' AND BINARY review_url=BINARY CONCAT('https://search.google.com/local/writereview?placeid=',place_id)),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
