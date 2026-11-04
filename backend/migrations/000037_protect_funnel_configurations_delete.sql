CREATE TRIGGER protect_funnel_configurations_delete BEFORE DELETE ON funnel_configurations FOR EACH ROW
BEGIN
IF OLD.status IN ('published','retired') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published version cannot be deleted'; END IF;
END
