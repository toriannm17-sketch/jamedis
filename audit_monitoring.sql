-- JAMEDIS: read-only monitoring queries; authorized security reviewers only.
-- 1. Recent audit activity
SELECT id, user_id, action, patient_id, ip_address, `timestamp`
FROM audit_logs ORDER BY `timestamp` DESC, id DESC LIMIT 50;
-- 2. Failed login attempts in the last 24 hours
SELECT ip_address, COUNT(*) AS failures, MAX(`timestamp`) AS last_attempt
FROM audit_logs WHERE action = 'POST /api/auth/login (401)'
AND `timestamp` >= NOW() - INTERVAL 1 DAY
GROUP BY ip_address HAVING COUNT(*) >= 5 ORDER BY failures DESC;
-- 3. Denied requests (once authentication/authorization is enforced)
SELECT id, user_id, action, ip_address, `timestamp` FROM audit_logs
WHERE (action LIKE '%(401)' OR action LIKE '%(403)')
AND `timestamp` >= NOW() - INTERVAL 1 DAY ORDER BY `timestamp` DESC;
-- 4. Patient-specific activity: replace 1 with authorized test patient ID
SELECT id, user_id, action, `timestamp` FROM audit_logs
WHERE patient_id = 1 ORDER BY `timestamp` DESC;
-- 5. Verify triggers and TLS for this database session
SHOW TRIGGERS;
SHOW SESSION STATUS LIKE 'Ssl_cipher';
SHOW SESSION STATUS LIKE 'Ssl_version';
