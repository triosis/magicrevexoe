CREATE TABLE billing_events (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
agreement_id BIGINT UNSIGNED NOT NULL,
event_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
payment_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
event_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
payload_sha256 BINARY(32) NOT NULL,
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
UNIQUE KEY uq_billing_event (event_key),
UNIQUE KEY uq_billing_payment (payment_id),
CONSTRAINT fk_billing_event_owner FOREIGN KEY (tenant_id,agreement_id) REFERENCES billing_agreements(tenant_id,id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
