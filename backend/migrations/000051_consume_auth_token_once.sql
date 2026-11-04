CREATE TRIGGER consume_auth_token_once BEFORE UPDATE ON auth_tokens FOR EACH ROW
BEGIN
IF NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.user_id<=>BINARY NEW.user_id) OR NOT (BINARY OLD.purpose<=>BINARY NEW.purpose) OR NOT (BINARY OLD.tenant_id<=>BINARY NEW.tenant_id) OR NOT (BINARY OLD.token_hash<=>BINARY NEW.token_hash) OR NOT (BINARY OLD.expires_at<=>BINARY NEW.expires_at) OR NOT (BINARY OLD.created_at<=>BINARY NEW.created_at) OR (OLD.consumed_at IS NOT NULL AND NOT (BINARY OLD.consumed_at<=>BINARY NEW.consumed_at)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Token identity and consumption are immutable'; END IF;
END
