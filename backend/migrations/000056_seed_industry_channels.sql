INSERT INTO industry_channels (code,name,status)
SELECT s.code,s.name,s.status FROM (SELECT 'salon_spa' AS code,'Salon & Spa' AS name,'active' AS status
UNION ALL
SELECT 'clinic_healthcare' AS code,'Clinic & Healthcare' AS name,'active' AS status
UNION ALL
SELECT 'restaurant_cafe' AS code,'Restaurant & Cafe' AS name,'active' AS status) s
WHERE NOT EXISTS (SELECT 1 FROM industry_channels t WHERE t.code=s.code)
