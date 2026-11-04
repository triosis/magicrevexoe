CREATE TRIGGER protect_tenant_memberships_owner BEFORE UPDATE ON tenant_memberships FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.tenant_kind<=>BINARY NEW.tenant_kind) OR NOT (BINARY OLD.user_id<=>BINARY NEW.user_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
