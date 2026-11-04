CREATE TRIGGER protect_subscriptions_owner BEFORE UPDATE ON subscriptions FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.tenant_kind<=>BINARY NEW.tenant_kind) OR NOT (BINARY OLD.plan_id<=>BINARY NEW.plan_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
