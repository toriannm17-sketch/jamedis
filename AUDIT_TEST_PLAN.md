# JAMEDIS audit and monitoring contribution

## Scope
Adds separate migration and read-only monitoring scripts compatible with the uploaded schema. Existing API request logging is retained. No schema reset is required. Use synthetic data only.

## Deployment and verification
1. Obtain team approval and use an isolated development database with the existing schema. Do not rerun schema.sql on a populated database: it drops tables.
2. Run audit_triggers.sql with a migration account that has TRIGGER permission. Confirm with SHOW TRIGGERS. If Aiven rejects trigger creation, record the error and consult the database owner.
3. Run audit_monitoring.sql using an authorized reviewer account. A nonempty Ssl_cipher confirms TLS for that session only.
4. With a demo patient present, run the following in a single MySQL Workbench session:
   ```sql
   START TRANSACTION;
   UPDATE patients SET is_photo_verified = NOT is_photo_verified WHERE id = 1;
   SELECT id, action, patient_id FROM audit_logs
   WHERE patient_id = 1 AND action = 'DB UPDATE patients' ORDER BY id DESC LIMIT 1;
   ROLLBACK;
   ```
   Expected: a new audit row is visible inside the transaction; rollback removes both changes. Verify the patient exists first.
5. Attempt five invalid demo logins through the application and run the failed-login query. Expected: a matching group if logging succeeds. IP is currently based on an untrusted forwarded header, so results are indicative only.
6. Record actual results and screenshots privately; never publish real patient data or credentials.

## Security gaps identified in server.js
- JWT is signed but not verified; x-user-id and x-institution-id are client-controlled. Verify tokens and derive identity from server-side authentication.
- GET /api/patients returns all patients; enforce institution and role restrictions. Log authorized patient reads in the API, since MySQL has no SELECT triggers.
- GET /api/audit-logs has no authorization; restrict to designated audit reviewers.
- Signup permits self-selection of doctor/nurse roles; require staff verification and approval.
- SHA-256 password storage and fallback JWT secret are unsuitable for production; migrate to Argon2id or bcrypt and require a strong secret.
- Existing audit middleware writes after the response; failures may leave gaps. Add reliable logging and alerting. Trigger logs are transactional and intentionally omit unverified actor/IP; they complement rather than replace authenticated API logs.
- Restrict audit table UPDATE/DELETE permissions; review retention and backup policy. Trigger coverage is limited to listed inserts/updates, not all tables, deletes, or reads.

## Status
Scripts prepared against uploaded schema; not executed against Aiven. No live deployment or security fixes to server.js claimed. Team review and integration testing required.
