CREATE TRIGGER protect_tenants_owner BEFORE UPDATE ON tenants FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.kind<=>BINARY NEW.kind) OR NOT (BINARY OLD.parent_id<=>BINARY NEW.parent_id) OR NOT (BINARY OLD.parent_kind<=>BINARY NEW.parent_kind) OR NOT (BINARY OLD.industry_channel_id<=>BINARY NEW.industry_channel_id) OR NOT (BINARY OLD.public_id<=>BINARY NEW.public_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
