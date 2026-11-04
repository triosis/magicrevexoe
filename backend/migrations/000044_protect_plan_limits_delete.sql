CREATE TRIGGER protect_plan_limits_delete BEFORE DELETE ON plan_limits FOR EACH ROW
BEGIN
IF (SELECT status FROM subscription_plans WHERE id=OLD.plan_id)<>'draft' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published plan limits are immutable'; END IF;
END
