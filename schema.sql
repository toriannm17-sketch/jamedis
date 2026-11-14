-- =====================================================
-- JAMEDIS - MySQL Schema (Aiven MySQL, InnoDB, utf8mb4)
-- Run this against your Aiven database (default: defaultdb)
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS clinical_notes;
DROP TABLE IF EXISTS mfa_secrets;
DROP TABLE IF EXISTS dispensing_logs;
DROP TABLE IF EXISTS patient_institution_access;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS institutions;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Institutions ------------------------------------------------
CREATE TABLE institutions (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(150) NOT NULL,
  type           ENUM('hospital','clinic','private','pharmacy', 'other') NOT NULL DEFAULT 'other',
  address        VARCHAR(255) NULL,
  contact_number VARCHAR(30)  NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users -------------------------------------------------------
CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  institution_id INT UNSIGNED NOT NULL,
  role           ENUM('admin','doctor','nurse','staff', 'pharmacist') NOT NULL DEFAULT 'staff',
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until   TIMESTAMP NULL DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  first_name     VARCHAR(80)  NOT NULL,
  last_name      VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_institution (institution_id),
  CONSTRAINT fk_users_institution FOREIGN KEY (institution_id)
    REFERENCES institutions (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Patients ----------------------------------------------------
CREATE TABLE patients (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  trn               VARCHAR(15)  NOT NULL,
  first_name        VARCHAR(80)  NOT NULL,
  last_name         VARCHAR(80)  NOT NULL,
  phone_number      VARCHAR (20) NULL,
  date_of_birth     DATE NOT NULL,
  profile_photo_url VARCHAR(500) NULL,
  is_photo_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_trn (trn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Patient <-> Institution access ------------------------------
-- Institutions may only see patients they have checked in.
CREATE TABLE patient_institution_access (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id            INT UNSIGNED NOT NULL,
  institution_id        INT UNSIGNED NOT NULL,
  checked_in_by_user_id INT UNSIGNED NOT NULL,
  checked_in_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_institution (patient_id, institution_id),
  KEY idx_pia_institution (institution_id),
  KEY idx_pia_user (checked_in_by_user_id),
  CONSTRAINT fk_pia_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pia_institution FOREIGN KEY (institution_id)
    REFERENCES institutions (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pia_user FOREIGN KEY (checked_in_by_user_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Clinical notes ----------------------------------------------
CREATE TABLE clinical_notes (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id          INT UNSIGNED NOT NULL,
  author_id           INT UNSIGNED NOT NULL,
  is_critical_illness BOOLEAN NOT NULL DEFAULT FALSE,
  allergies           TEXT NULL,
  summary_for_nurses  TEXT NULL,
  full_medical_notes  TEXT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notes_patient (patient_id),
  KEY idx_notes_author (author_id),
  CONSTRAINT fk_notes_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notes_author FOREIGN KEY (author_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Prescriptions -----------------------------------------------
CREATE TABLE prescriptions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id      INT UNSIGNED NOT NULL,
  doctor_id       INT UNSIGNED NOT NULL,
  medication_name VARCHAR(150) NOT NULL,
  dosage          VARCHAR(100) NOT NULL,
  refills_allowed INT UNSIGNED NOT NULL DEFAULT 0,
  refills_remaining INT UNSIGNED NOT NULL DEFAULT 0,
  pharmacy_institution INT UNSIGNED NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rx_patient (patient_id),
  KEY idx_rx_doctor (doctor_id),
  CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rx_doctor FOREIGN KEY (doctor_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--7. Dispencing Log Trcaker--
CREATE TABLE dispensing_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id INT UNSIGNED NOT NULL,
  pharmacist_id INT UNSIGNED NOT NULL,
  pharmacy_institution INT UNSIGNED NOT NULL,
  quantity_dispensed VARCHAR (100) NOT NULL,
  dispensed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dispense_rx (prescription_id),
  KEY idx_dispense_pharmacy (pharmacist_id),
  CONSTRAINT fk_dispense_pharmacist FOREIGN KEY (pharmacist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispense_prescription FOREIGN KEY (prescription_id)
    REFERENCES prescriptions (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_dispense_institution FOREIGN KEY (pharmacy_institution)
    REFERENCES institutions (id) ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--8. Implementing a MFA Secret TOTP (Time Based One Time Password)--

  CREATE TABLE mfa_secrets (
    user_id     INT UNSIGNED NOT NULL,
    secret      VARCHAR(32)  NOT NULL,
    enabled     TINYINT(1)   NOT NULL DEFAULT 0,
    verified_at DATETIME     NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
  
-- 9. Audit logs --------------------------------------------------
CREATE TABLE audit_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NULL,
  action     VARCHAR(255) NOT NULL,
  patient_id INT UNSIGNED NULL,
  ip_address VARCHAR(45)  NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_timestamp (`timestamp`),
  KEY idx_audit_user (user_id),
  KEY idx_audit_patient (patient_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SEED DATA (demo only)
-- All demo users have the password:  Password123
-- (stored as a SHA-256 hex digest, matching server.js)
-- =====================================================
INSERT INTO institutions (name, type, address, contact_number) VALUES
  ('Kingston Public Hospital', 'hospital', 'North Street, Kingston', '876-922-0210'),
  ('Spanish Town Health Centre', 'clinic', 'Burke Road, Spanish Town', '876-984-2000'),
  ('Caribbean Family Care', 'private', 'Half Way Tree Road, Kingston 10', '876-929-1000'),
  ('New Deanery Pharmacy', 'pharmacy', 'Deanery Road, Kingston 3', '876-759-8909');

INSERT INTO users (institution_id, role, email, password_hash, first_name, last_name) VALUES
  (1, 'admin',  'admin@jamedis.com',  SHA2('Password123', 256), 'Marcia',  'Campbell'),
  (1, 'doctor', 'doctor@jamedis.com', SHA2('Password123', 256), 'Andre',   'Brown'),
  (2, 'nurse',  'nurse@jamedis.com',  SHA2('Password123', 256), 'Shanice', 'Williams'),
  (4, 'pharmacist', 'pharmacist@jamedis.com', SHA2('Password123', 256), 'Karen', 'McKnight');

INSERT INTO patients (trn, first_name, last_name, date_of_birth, is_photo_verified) VALUES
  ('123456789', 'Jerome',  'Thompson', '1988-03-14', TRUE),
  ('234567891', 'Keisha',  'Reid',     '1995-11-02', FALSE),
  ('345678912', 'Winston', 'Clarke',   '1962-07-29', TRUE);

INSERT INTO patient_institution_access (patient_id, institution_id, checked_in_by_user_id) VALUES
  (1, 1, 2),
  (2, 1, 1),
  (3, 2, 3);
