CREATE TRIGGER protect_plan_limits_insert BEFORE INSERT ON plan_limits FOR EACH ROW
BEGIN
IF (SELECT status FROM subscription_plans WHERE id=NEW.plan_id)<>'draft' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published plan limits are immutable'; END IF;
END
