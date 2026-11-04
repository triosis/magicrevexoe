CREATE TRIGGER protect_branches_owner BEFORE UPDATE ON branches FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.tenant_kind<=>BINARY NEW.tenant_kind) OR NOT (BINARY OLD.industry_channel_id<=>BINARY NEW.industry_channel_id) OR NOT (BINARY OLD.public_id<=>BINARY NEW.public_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
