CREATE TRIGGER protect_feedback_archives_delete BEFORE DELETE ON feedback_archives FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable feedback archive'
