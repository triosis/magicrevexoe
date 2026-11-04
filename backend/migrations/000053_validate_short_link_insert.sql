CREATE TRIGGER validate_short_link_insert BEFORE INSERT ON short_links FOR EACH ROW
BEGIN
IF NEW.status='active' AND NOT EXISTS (SELECT 1 FROM funnel_configurations f WHERE f.id=NEW.funnel_configuration_id AND f.tenant_id=NEW.tenant_id AND f.branch_id=NEW.branch_id AND f.status='published') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active link requires published funnel'; END IF;
END
