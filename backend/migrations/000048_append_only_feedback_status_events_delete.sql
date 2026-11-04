CREATE TRIGGER append_only_feedback_status_events_delete BEFORE DELETE ON feedback_status_events FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Append-only history';
END
