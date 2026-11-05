CREATE TRIGGER immutable_commercial_approvals_update BEFORE UPDATE ON commercial_approvals FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable commercial history'
