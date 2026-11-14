-- JAMEDIS: database write auditing (MySQL 8 / Aiven)
-- Apply only to a development database after team approval.
-- Existing API middleware logs requests; these triggers log row changes.
-- No clinical text, passwords or TRNs are copied into audit logs.
-- Run with a migration account that has TRIGGER permission.
DROP TRIGGER IF EXISTS jamedis_patient_insert;
DROP TRIGGER IF EXISTS jamedis_patient_update;
DROP TRIGGER IF EXISTS jamedis_note_insert;
DROP TRIGGER IF EXISTS jamedis_rx_insert;
DROP TRIGGER IF EXISTS jamedis_rx_update;
CREATE TRIGGER jamedis_patient_insert AFTER INSERT ON patients
FOR EACH ROW INSERT INTO audit_logs (user_id, action, patient_id, ip_address)
VALUES (NULL, 'DB INSERT patients', NEW.id, NULL);
CREATE TRIGGER jamedis_patient_update AFTER UPDATE ON patients
FOR EACH ROW INSERT INTO audit_logs (user_id, action, patient_id, ip_address)
VALUES (NULL, 'DB UPDATE patients', NEW.id, NULL);
CREATE TRIGGER jamedis_note_insert AFTER INSERT ON clinical_notes
FOR EACH ROW INSERT INTO audit_logs (user_id, action, patient_id, ip_address)
VALUES (NULL, CONCAT('DB INSERT clinical_notes #', NEW.id), NEW.patient_id, NULL);
CREATE TRIGGER jamedis_rx_insert AFTER INSERT ON prescriptions
FOR EACH ROW INSERT INTO audit_logs (user_id, action, patient_id, ip_address)
VALUES (NULL, CONCAT('DB INSERT prescriptions #', NEW.id), NEW.patient_id, NULL);
CREATE TRIGGER jamedis_rx_update AFTER UPDATE ON prescriptions
FOR EACH ROW INSERT INTO audit_logs (user_id, action, patient_id, ip_address)
VALUES (NULL, CONCAT('DB UPDATE prescriptions #', NEW.id), NEW.patient_id, NULL);
-- NULL actor/IP intentionally: database triggers cannot establish the authenticated API identity.
-- SELECT cannot activate MySQL triggers; log authorized reads in the API.
