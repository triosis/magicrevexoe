CREATE TRIGGER protect_funnel_configurations_owner BEFORE UPDATE ON funnel_configurations FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.branch_id<=>BINARY NEW.branch_id) OR NOT (BINARY OLD.industry_channel_id<=>BINARY NEW.industry_channel_id) OR NOT (BINARY OLD.revision<=>BINARY NEW.revision) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
