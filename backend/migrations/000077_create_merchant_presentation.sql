CREATE TABLE merchant_presentation (
tenant_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
tenant_kind ENUM('platform','reseller','sub_reseller','merchant') NOT NULL DEFAULT 'merchant',
seed_keywords JSON NOT NULL,
logo_png MEDIUMBLOB NULL,
lock_version INT UNSIGNED NOT NULL DEFAULT 1,
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
CONSTRAINT fk_presentation_merchant FOREIGN KEY (tenant_id,tenant_kind) REFERENCES tenants(id,kind),
CONSTRAINT ck_presentation_merchant CHECK (tenant_kind='merchant'),
CONSTRAINT ck_presentation_keywords CHECK (JSON_TYPE(seed_keywords)='ARRAY' AND (JSON_LENGTH(seed_keywords)=0 OR JSON_LENGTH(seed_keywords) BETWEEN 3 AND 5)),
CONSTRAINT ck_presentation_logo CHECK (logo_png IS NULL OR OCTET_LENGTH(logo_png)<=65536)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
