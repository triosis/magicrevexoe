SELECT (COUNT(*)=3 AND (SELECT COUNT(*) FROM industry_channels)=3) AS satisfied FROM (SELECT 'salon_spa' AS code,'Salon & Spa' AS name,'active' AS status
UNION ALL
SELECT 'clinic_healthcare' AS code,'Clinic & Healthcare' AS name,'active' AS status
UNION ALL
SELECT 'restaurant_cafe' AS code,'Restaurant & Cafe' AS name,'active' AS status) s JOIN industry_channels t ON t.code<=>s.code AND t.name<=>s.name AND t.status<=>s.status
