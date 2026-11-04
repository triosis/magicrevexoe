CREATE TRIGGER require_draft_plan_insert BEFORE INSERT ON subscription_plans FOR EACH ROW
BEGIN
  IF NEW.status<>'draft' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Create draft plan before defining quotas and publishing';
  END IF;
END
