CREATE TABLE billing_agreements (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
tenant_kind ENUM('platform','reseller','sub_reseller','merchant') NOT NULL DEFAULT 'merchant',
plan_id BIGINT UNSIGNED NOT NULL,
request_key BINARY(16) NOT NULL,
provider_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
checkout_url VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NULL,
status ENUM('creating','ready','active','pending','halted','canceled','completed','unknown') NOT NULL,
last_period_end DATETIME(6) NULL,
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE KEY uq_billing_request (tenant_id,request_key),
UNIQUE KEY uq_billing_provider (provider_id),
UNIQUE KEY uq_billing_owner (tenant_id,id),
CONSTRAINT fk_billing_merchant FOREIGN KEY (tenant_id,tenant_kind) REFERENCES tenants(id,kind),
CONSTRAINT ck_billing_merchant CHECK (tenant_kind='merchant'),
CONSTRAINT fk_billing_approval FOREIGN KEY (plan_id) REFERENCES commercial_approvals(plan_id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
