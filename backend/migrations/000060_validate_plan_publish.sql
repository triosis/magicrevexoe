CREATE TRIGGER validate_plan_publish BEFORE UPDATE ON subscription_plans FOR EACH ROW
BEGIN
  IF NEW.status='published' AND OLD.status='draft'
    AND (SELECT COUNT(*) FROM plan_limits WHERE plan_id=NEW.id)<>5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published plan requires all five quota definitions';
  END IF;
END
