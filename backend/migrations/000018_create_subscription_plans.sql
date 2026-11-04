CREATE TABLE subscription_plans (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
version INT UNSIGNED NOT NULL,
name VARCHAR(100) NOT NULL,
price DECIMAL(12,2) NOT NULL,
currency CHAR(3) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
interval_unit ENUM('month','year') NOT NULL,
status ENUM('draft','published','retired') NOT NULL DEFAULT 'draft',
UNIQUE KEY uq_plan_version (code,version),
CONSTRAINT ck_plan_version CHECK (version>0 AND price>=0),
CONSTRAINT ck_plan_currency CHECK (currency REGEXP '^[A-Z]{3}$'),
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
