CREATE TRIGGER protect_channel_versions_delete BEFORE DELETE ON channel_versions FOR EACH ROW
BEGIN
IF OLD.status IN ('published','retired') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published version cannot be deleted'; END IF;
END
