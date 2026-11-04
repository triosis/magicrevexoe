CREATE TABLE tenants (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
public_id BINARY(16) NOT NULL,
kind ENUM('platform','reseller','sub_reseller','merchant') NOT NULL,
parent_id BIGINT UNSIGNED NULL,
parent_kind ENUM('platform','reseller','sub_reseller','merchant') NULL,
name VARCHAR(160) NOT NULL,
status ENUM('active','suspended','closed') NOT NULL DEFAULT 'active',
industry_channel_id BIGINT UNSIGNED NULL,
platform_slot TINYINT GENERATED ALWAYS AS (CASE WHEN kind='platform' THEN 1 ELSE NULL END) PERSISTENT,
lock_version INT UNSIGNED NOT NULL DEFAULT 1,
UNIQUE KEY uq_tenant_public (public_id),
UNIQUE KEY uq_tenant_kind (id,kind),
UNIQUE KEY uq_tenant_channel (id,industry_channel_id),
UNIQUE KEY uq_platform_slot (platform_slot),
KEY ix_tenant_children (parent_id,kind,status,id),
CONSTRAINT fk_tenant_parent FOREIGN KEY (parent_id,parent_kind) REFERENCES tenants(id,kind),
CONSTRAINT fk_tenant_channel FOREIGN KEY (industry_channel_id) REFERENCES industry_channels(id),
CONSTRAINT ck_tenant_hierarchy CHECK (COALESCE(
 (kind='platform' AND parent_id IS NULL AND parent_kind IS NULL AND industry_channel_id IS NULL)
 OR (kind='reseller' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind='platform' AND industry_channel_id IS NULL)
 OR (kind='sub_reseller' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind='reseller' AND industry_channel_id IS NULL)
 OR (kind='merchant' AND parent_id IS NOT NULL AND parent_kind IS NOT NULL AND parent_kind IN ('platform','reseller','sub_reseller') AND industry_channel_id IS NOT NULL),0)),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
