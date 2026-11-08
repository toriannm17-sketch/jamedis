-- 1. INSTITUTIONS TABLE
-- Represents hospitals, clinics, or private practices.
CREATE TABLE institutions (
    institution_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('hospital', 'clinic', 'private', 'other') NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (Staff, Doctors, Nurses, Admins)
-- Everyone who logs into the system goes here.
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id INT NOT NULL,
    role ENUM('admin', 'doctor', 'nurse', 'staff') NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Note: Never store plain text passwords
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id)
);

-- 3. PATIENTS TABLE
-- The core demographic data for the citizen.
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    trn VARCHAR(20) UNIQUE NOT NULL, -- Used for checking in
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_type VARCHAR(5),
    profile_photo_url VARCHAR(255), -- URL to the uploaded photo
    is_photo_verified BOOLEAN DEFAULT FALSE, -- Checked by the photo authenticator
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PATIENT_INSTITUTION_ACCESS (The Privacy Lock)
-- This table ensures an institution can ONLY see a patient if they checked them in.
CREATE TABLE patient_institution_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    institution_id INT NOT NULL,
    first_checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_by_user_id INT NOT NULL,
    UNIQUE KEY unique_patient_inst (patient_id, institution_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id),
    FOREIGN KEY (checked_in_by_user_id) REFERENCES users(user_id)
);

-- 5. APPOINTMENTS TABLE
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    institution_id INT NOT NULL,
    doctor_id INT, -- NULL if the patient hasn't been assigned a doctor yet
    appointment_time DATETIME NOT NULL,
    status ENUM('pending', 'accepted', 'completed', 'cancelled') DEFAULT 'pending',
    reason_for_visit TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);

-- 6. MEDICAL_VISITS (History & Check-ins)
-- Tracks each time a patient is seen. Required for the "Recent visits" view.
CREATE TABLE medical_visits (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    institution_id INT NOT NULL,
    doctor_id INT,
    visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_in_verified_by_id INT, -- The staff member who checked them in
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (institution_id) REFERENCES institutions(institution_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id),
    FOREIGN KEY (check_in_verified_by_id) REFERENCES users(user_id)
);

-- 7. CLINICAL_NOTES (Doctors & Nurses)
-- Nurses see a summary (flagged), Doctors see everything.
CREATE TABLE clinical_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    visit_id INT NOT NULL,
    author_id INT NOT NULL, -- Doctor or Nurse
    is_critical_illness BOOLEAN DEFAULT FALSE, -- If TRUE, Nurses cannot view
    summary_for_nurses TEXT, -- The safe summary nurses can see
    full_medical_notes TEXT, -- The detailed notes for Doctors only
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(visit_id),
    FOREIGN KEY (author_id) REFERENCES users(user_id)
);

-- 8. DIAGNOSES
CREATE TABLE diagnoses (
    diagnosis_id INT AUTO_INCREMENT PRIMARY KEY,
    visit_id INT NOT NULL,
    doctor_id INT NOT NULL,
    icd10_code VARCHAR(10), -- Standard medical code
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);

-- 9. ALLERGIES
CREATE TABLE allergies (
    allergy_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergen VARCHAR(100) NOT NULL,
    severity ENUM('mild', 'moderate', 'severe') NOT NULL,
    noted_by_doctor_id INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (noted_by_doctor_id) REFERENCES users(user_id)
);

-- 10. PRESCRIPTIONS
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    visit_id INT NOT NULL,
    doctor_id INT NOT NULL,
    medication_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES medical_visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);

-- 11. AUDIT_LOG (DPA 2020 Compliance)
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    institution_id INT,
    action VARCHAR(100) NOT NULL, -- e.g., 'VIEW_PATIENT', 'CHECK_IN', 'EDIT_NOTE'
    patient_id INT, -- If applicable
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
