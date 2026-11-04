CREATE TABLE role_permissions (
role_id BIGINT UNSIGNED NOT NULL,
permission_id BIGINT UNSIGNED NOT NULL,
PRIMARY KEY (role_id,permission_id),
KEY ix_permission_roles (permission_id,role_id),
CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id),
CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
