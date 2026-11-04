CREATE TABLE plan_limits (
plan_id BIGINT UNSIGNED NOT NULL,
metric ENUM('branches','staff_seats','feedback_submissions','short_links','qr_assets') NOT NULL,
limit_value BIGINT UNSIGNED NULL,
PRIMARY KEY (plan_id,metric),
CONSTRAINT fk_limit_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
