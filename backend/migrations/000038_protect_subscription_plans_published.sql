CREATE TRIGGER protect_subscription_plans_published BEFORE UPDATE ON subscription_plans FOR EACH ROW
BEGIN
IF OLD.status IN ('published','retired') AND (NOT (BINARY OLD.id<=>BINARY NEW.id) OR NOT (BINARY OLD.code<=>BINARY NEW.code) OR NOT (BINARY OLD.version<=>BINARY NEW.version) OR NOT (BINARY OLD.name<=>BINARY NEW.name) OR NOT (BINARY OLD.price<=>BINARY NEW.price) OR NOT (BINARY OLD.currency<=>BINARY NEW.currency) OR NOT (BINARY OLD.interval_unit<=>BINARY NEW.interval_unit) OR NOT (BINARY OLD.created_at<=>BINARY NEW.created_at) OR (OLD.status='published' AND NEW.status NOT IN ('published','retired')) OR (OLD.status='retired' AND NEW.status<>'retired')) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published version is immutable'; END IF;
END
