CREATE TRIGGER append_only_audit_logs_delete BEFORE DELETE ON audit_logs FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Append-only history';
END
