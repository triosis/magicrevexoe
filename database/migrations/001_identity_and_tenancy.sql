CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_type ENUM('SUPER_ADMIN','RESELLER','SUB_RESELLER','CLIENT') NOT NULL,
  name VARCHAR(200) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  parent_account_id BIGINT UNSIGNED NULL,
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_accounts_parent (parent_account_id),
  KEY idx_accounts_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE resellers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resellers_account (account_id),
  KEY idx_resellers_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_resellers_account FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE sub_resellers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  reseller_id BIGINT UNSIGNED NOT NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  name VARCHAR(200) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_resellers_account (account_id),
  KEY idx_sub_resellers_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_sub_resellers_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_sub_resellers_reseller FOREIGN KEY (reseller_id) REFERENCES resellers(id)
) ENGINE=InnoDB;

CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  name VARCHAR(200) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_account (account_id),
  KEY idx_clients_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_clients_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_clients_reseller FOREIGN KEY (reseller_id) REFERENCES resellers(id),
  CONSTRAINT fk_clients_sub_reseller FOREIGN KEY (sub_reseller_id) REFERENCES sub_resellers(id)
) ENGINE=InnoDB;

ALTER TABLE accounts
  ADD CONSTRAINT fk_accounts_reseller FOREIGN KEY (reseller_id) REFERENCES resellers(id),
  ADD CONSTRAINT fk_accounts_sub_reseller FOREIGN KEY (sub_reseller_id) REFERENCES sub_resellers(id),
  ADD CONSTRAINT fk_accounts_client FOREIGN KEY (client_id) REFERENCES clients(id);

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  account_type ENUM('SUPER_ADMIN','RESELLER','SUB_RESELLER','CLIENT') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE account_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_account_users_membership (account_id, user_id),
  KEY idx_account_users_user (user_id),
  KEY idx_account_users_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_account_users_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_account_users_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_account_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_account_users_reseller FOREIGN KEY (reseller_id) REFERENCES resellers(id),
  CONSTRAINT fk_account_users_sub_reseller FOREIGN KEY (sub_reseller_id) REFERENCES sub_resellers(id),
  CONSTRAINT fk_account_users_client FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_id (token_id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id, account_id),
  KEY idx_refresh_tokens_tenant (reseller_id, sub_reseller_id, client_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_refresh_tokens_account FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_account_id BIGINT UNSIGNED NULL,
  reseller_id BIGINT UNSIGNED NULL,
  sub_reseller_id BIGINT UNSIGNED NULL,
  client_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id BIGINT UNSIGNED NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  ip_hash CHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_user_id, actor_account_id),
  KEY idx_audit_tenant (reseller_id, sub_reseller_id, client_id),
  KEY idx_audit_event_created (event_type, created_at),
  CONSTRAINT fk_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_audit_actor_account FOREIGN KEY (actor_account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

