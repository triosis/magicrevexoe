CREATE TABLE commercial_approvals (
plan_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
terms JSON NOT NULL,
approval_reference VARCHAR(120) NOT NULL,
approved_by BIGINT UNSIGNED NOT NULL,
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
CONSTRAINT fk_commercial_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
CONSTRAINT fk_commercial_approver FOREIGN KEY (approved_by) REFERENCES users(id),
CONSTRAINT ck_commercial_terms CHECK (JSON_TYPE(terms)='OBJECT' AND CHAR_LENGTH(approval_reference)>0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
