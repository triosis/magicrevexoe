CREATE TABLE feedback_archives (
tenant_id BIGINT UNSIGNED NOT NULL,
feedback_id BIGINT UNSIGNED NOT NULL,
actor_user_id BIGINT UNSIGNED NOT NULL,
archived_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
PRIMARY KEY (tenant_id,feedback_id),
CONSTRAINT fk_archive_feedback FOREIGN KEY (tenant_id,feedback_id) REFERENCES private_feedback(tenant_id,id),
CONSTRAINT fk_archive_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
