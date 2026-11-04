CREATE TRIGGER protect_subscription_plans_delete BEFORE DELETE ON subscription_plans FOR EACH ROW
BEGIN
IF OLD.status IN ('published','retired') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published version cannot be deleted'; END IF;
END
