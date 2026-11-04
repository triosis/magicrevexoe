CREATE TRIGGER protect_plan_limits_update BEFORE UPDATE ON plan_limits FOR EACH ROW
BEGIN
IF (SELECT status FROM subscription_plans WHERE id=NEW.plan_id)<>'draft' OR NOT (BINARY OLD.plan_id<=>BINARY NEW.plan_id) OR NOT (BINARY OLD.metric<=>BINARY NEW.metric) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published plan limits are immutable'; END IF;
END
