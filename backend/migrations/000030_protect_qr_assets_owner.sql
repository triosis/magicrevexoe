CREATE TRIGGER protect_qr_assets_owner BEFORE UPDATE ON qr_assets FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.branch_id<=>BINARY NEW.branch_id) OR NOT (BINARY OLD.short_link_id<=>BINARY NEW.short_link_id) OR NOT (BINARY OLD.format<=>BINARY NEW.format) OR NOT (BINARY OLD.object_key<=>BINARY NEW.object_key) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
