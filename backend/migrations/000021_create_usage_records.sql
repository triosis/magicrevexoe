CREATE TABLE usage_records (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
subscription_id BIGINT UNSIGNED NOT NULL,
metric ENUM('branches','staff_seats','feedback_submissions','short_links','qr_assets') NOT NULL,
quantity BIGINT NOT NULL,
period_start DATETIME(6) NOT NULL,
period_end DATETIME(6) NOT NULL,
source_event_key VARBINARY(128) NOT NULL,
occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
UNIQUE KEY uq_usage_event (tenant_id,metric,source_event_key),
KEY ix_usage_period (tenant_id,subscription_id,metric,period_start,occurred_at,id),
CONSTRAINT fk_usage_subscription FOREIGN KEY (tenant_id,subscription_id) REFERENCES subscriptions(tenant_id,id),
CONSTRAINT ck_usage_quantity CHECK (quantity<>0 AND (metric<>'feedback_submissions' OR quantity>0)),
CONSTRAINT ck_usage_period CHECK (period_end>period_start),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
