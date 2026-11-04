CREATE TRIGGER validate_subscription_plan BEFORE INSERT ON subscriptions FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id=NEW.plan_id AND status='published') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subscription requires a published plan';
  END IF;
END
