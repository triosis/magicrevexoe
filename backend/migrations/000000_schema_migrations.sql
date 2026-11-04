CREATE TABLE schema_migrations (
  version CHAR(6) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(160) NOT NULL,
  checksum BINARY(32) NOT NULL,
  status ENUM('applying','applied','failed') NOT NULL,
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  applied_at DATETIME(6) NULL,
  execution_ms BIGINT UNSIGNED NULL,
  last_verified_step INT UNSIGNED NOT NULL DEFAULT 0,
  failure_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  runner_id BINARY(16) NOT NULL,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
