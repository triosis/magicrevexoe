CREATE TRIGGER immutable_billing_events_update BEFORE UPDATE ON billing_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable commercial history'
