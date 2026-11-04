CREATE TRIGGER protect_channel_versions_owner BEFORE UPDATE ON channel_versions FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.industry_channel_id<=>BINARY NEW.industry_channel_id) OR NOT (BINARY OLD.version<=>BINARY NEW.version) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Immutable record ownership'; END IF;
END
