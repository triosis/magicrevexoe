CREATE TABLE usage_counters (
tenant_id BIGINT UNSIGNED NOT NULL,
subscription_id BIGINT UNSIGNED NOT NULL,
metric ENUM('branches','staff_seats','feedback_submissions','short_links','qr_assets') NOT NULL,
period_start DATETIME(6) NOT NULL,
period_end DATETIME(6) NOT NULL,
used BIGINT UNSIGNED NOT NULL DEFAULT 0,
PRIMARY KEY (tenant_id,subscription_id,metric,period_start),
CONSTRAINT fk_counter_subscription FOREIGN KEY (tenant_id,subscription_id) REFERENCES subscriptions(tenant_id,id),
CONSTRAINT ck_counter_period CHECK (period_end>period_start),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
