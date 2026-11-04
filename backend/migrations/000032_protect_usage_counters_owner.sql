CREATE TRIGGER protect_usage_counters_owner BEFORE UPDATE ON usage_counters FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.subscription_id<=>BINARY NEW.subscription_id) OR NOT (BINARY OLD.metric<=>BINARY NEW.metric) OR NOT (BINARY OLD.period_start<=>BINARY NEW.period_start) OR NOT (BINARY OLD.period_end<=>BINARY NEW.period_end) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
