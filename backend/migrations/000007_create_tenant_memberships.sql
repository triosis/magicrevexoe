CREATE TABLE tenant_memberships (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
tenant_kind ENUM('platform','reseller','sub_reseller','merchant') NOT NULL,
user_id BIGINT UNSIGNED NOT NULL,
role_id BIGINT UNSIGNED NOT NULL,
status ENUM('invited','active','revoked') NOT NULL DEFAULT 'invited',
UNIQUE KEY uq_membership_user (tenant_id,user_id),
UNIQUE KEY uq_membership_owner (tenant_id,id),
UNIQUE KEY uq_membership_actor (tenant_id,id,user_id),
KEY ix_membership_user (user_id,status,tenant_id),
KEY ix_membership_role (tenant_id,status,role_id),
CONSTRAINT fk_membership_tenant FOREIGN KEY (tenant_id,tenant_kind) REFERENCES tenants(id,kind),
CONSTRAINT fk_membership_role FOREIGN KEY (role_id,tenant_kind) REFERENCES roles(id,tenant_kind),
CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
