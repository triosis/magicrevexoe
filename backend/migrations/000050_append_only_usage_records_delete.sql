CREATE TRIGGER append_only_usage_records_delete BEFORE DELETE ON usage_records FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Append-only history';
END
