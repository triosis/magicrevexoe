CREATE TRIGGER protect_platform_root BEFORE DELETE ON tenants FOR EACH ROW
BEGIN
IF OLD.kind='platform' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Platform root cannot be deleted'; END IF;
END
