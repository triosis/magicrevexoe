CREATE TRIGGER protect_short_links_owner BEFORE UPDATE ON short_links FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.branch_id<=>BINARY NEW.branch_id) OR NOT (BINARY OLD.code<=>BINARY NEW.code) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
