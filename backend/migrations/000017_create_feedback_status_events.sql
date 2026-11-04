CREATE TABLE feedback_status_events (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
tenant_id BIGINT UNSIGNED NOT NULL,
feedback_id BIGINT UNSIGNED NOT NULL,
actor_user_id BIGINT UNSIGNED NOT NULL,
from_status ENUM('new','in_progress','resolved','dismissed') NOT NULL,
to_status ENUM('new','in_progress','resolved','dismissed') NOT NULL,
reason_code ENUM('triage','follow_up','completed','spam','duplicate','reopened') NOT NULL,
KEY ix_status_feedback (tenant_id,feedback_id,created_at,id),
KEY ix_status_actor (actor_user_id,created_at),
CONSTRAINT fk_status_feedback FOREIGN KEY (tenant_id,feedback_id) REFERENCES private_feedback(tenant_id,id),
CONSTRAINT fk_status_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
CONSTRAINT ck_status_transition CHECK (from_status<>to_status),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
