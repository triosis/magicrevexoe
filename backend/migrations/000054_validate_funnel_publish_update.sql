CREATE TRIGGER validate_funnel_publish_update BEFORE UPDATE ON funnel_configurations FOR EACH ROW
BEGIN
IF NEW.status='published' AND NOT EXISTS (SELECT 1 FROM channel_versions v JOIN review_destinations d ON d.id=NEW.review_destination_id AND d.tenant_id=NEW.tenant_id AND d.branch_id=NEW.branch_id JOIN branches b ON b.id=NEW.branch_id AND b.tenant_id=NEW.tenant_id WHERE v.id=NEW.channel_version_id AND v.industry_channel_id=NEW.industry_channel_id AND v.status='published' AND d.status='active' AND b.status='active') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Published funnel requires active parallel paths'; END IF;
END
