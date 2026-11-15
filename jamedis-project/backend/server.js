require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'jamedis-dev-secret';

/* -------------------------------------------------------------------------- */
/* Core middleware                                                            */
/* -------------------------------------------------------------------------- */
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Mock JWT: structurally a real HS256 JWT, but we do not verify it on requests (capstone demo).
const createMockJwt = (payload) => {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 8 * 3600 })
  );
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${signature}`;
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '';
  return raw.replace(/^::ffff:/, '').slice(0, 45);
};

const formatUser = (row) => ({
  id: row.id,
  institution_id: row.institution_id,
  institution_name: row.institution_name || null,
  role: row.role,
  email: row.email,
  first_name: row.first_name,
  last_name: row.last_name,
  name: `${row.first_name} ${row.last_name}`,
});

/* -------------------------------------------------------------------------- */
/* Audit middleware: logs every request to the audit_logs table               */
/* -------------------------------------------------------------------------- */
// Handlers may set res.locals.auditUserId / res.locals.auditPatientId to enrich the log.
// Otherwise the user is read from the x-user-id header sent by the frontend.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  res.on('finish', async () => {
    try {
      const headerUserId = parseInt(req.headers['x-user-id'], 10);
      const userId = res.locals.auditUserId || (Number.isInteger(headerUserId) ? headerUserId : null);
      const patientId = res.locals.auditPatientId || null;
      const action = `${req.method} ${req.originalUrl.split('?')[0]} (${res.statusCode})`;

      await pool.query(
        'INSERT INTO audit_logs (user_id, action, patient_id, ip_address) VALUES (?, ?, ?, ?)',
        [userId, action, patientId, getClientIp(req)]
      );
    } catch (err) {
      // Never let audit failures crash a request that has already been answered.
      console.error('[audit] Failed to write audit log:', err.message);
    }
  });

  next();
});

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.institution_id, u.role, u.email, u.password_hash, u.first_name, u.last_name,
              i.name AS institution_name
         FROM users u
         JOIN institutions i ON i.id = u.institution_id
        WHERE u.email = ?
        LIMIT 1`,
      [String(email).trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user || user.password_hash !== sha256(password)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.locals.auditUserId = user.id;
    const token = createMockJwt({ sub: user.id, role: user.role, institution_id: user.institution_id });

    return res.json({ token, user: formatUser(user) });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Unable to sign in right now. Please try again.' });
  }
});

// POST /api/auth/signup  (supports the Signup page)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, institution_id } = req.body || {};

    if (!first_name || !last_name || !email || !password || !institution_id) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    // Admin accounts cannot be self-registered.
    const allowedRoles = ['doctor', 'nurse', 'staff', 'pharmacist'];
    const safeRole = allowedRoles.includes(role) ? role : 'staff';

    const [inst] = await pool.query('SELECT id FROM institutions WHERE id = ?', [institution_id]);
    if (inst.length === 0) {
      return res.status(400).json({ message: 'Selected institution does not exist.' });
    }

    const [result] = await pool.query(
      `INSERT INTO users (institution_id, role, email, password_hash, first_name, last_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [institution_id, safeRole, String(email).trim().toLowerCase(), sha256(password), first_name.trim(), last_name.trim()]
    );

    res.locals.auditUserId = result.insertId;
    return res.status(201).json({ message: 'Account created. You can now sign in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('[signup]', err);
    return res.status(500).json({ message: 'Unable to create the account right now.' });
  }
});

// GET /api/institutions  (populates the Signup dropdown)
app.get('/api/institutions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, type FROM institutions ORDER BY name ASC');
    return res.json(rows);
  } catch (err) {
    console.error('[institutions]', err);
    return res.status(500).json({ message: 'Unable to load institutions.' });
  }
});

// GET /api/patients
// NOTE: The institution restriction is mocked for now, so ALL patients are returned.
// To enforce it later, JOIN patient_institution_access and filter by the caller's institution_id.
app.get('/api/patients', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, trn, first_name, last_name, date_of_birth, profile_photo_url,
              is_photo_verified, created_at
         FROM patients
        ORDER BY created_at DESC, id DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[patients]', err);
    return res.status(500).json({ message: 'Unable to load patients.' });
  }
});

// POST /api/patients/check-in
app.post('/api/patients/check-in', async (req, res) => {
  const { first_name, last_name, trn, dob } = req.body || {};

  if (!first_name || !last_name || !trn || !dob) {
    return res.status(400).json({ message: 'First name, last name, TRN and date of birth are required.' });
  }

  const cleanTrn = String(trn).replace(/[\s-]/g, '');
  if (!/^\d{9}$/.test(cleanTrn)) {
    return res.status(400).json({ message: 'TRN must be exactly 9 digits.' });
  }

  const dobDate = new Date(dob);
  if (Number.isNaN(dobDate.getTime()) || dobDate > new Date()) {
    return res.status(400).json({ message: 'Enter a valid date of birth that is not in the future.' });
  }

  // Mock auth context: the frontend sends these headers after login.
  const userId = parseInt(req.headers['x-user-id'], 10) || 1;
  const institutionId = parseInt(req.headers['x-institution-id'], 10) || 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let patientId;
    let alreadyRegistered = false;

    const [existing] = await conn.query('SELECT id FROM patients WHERE trn = ? LIMIT 1', [cleanTrn]);
    if (existing.length > 0) {
      patientId = existing[0].id;
      alreadyRegistered = true;
    } else {
      const [insert] = await conn.query(
        'INSERT INTO patients (trn, first_name, last_name, date_of_birth) VALUES (?, ?, ?, ?)',
        [cleanTrn, first_name.trim(), last_name.trim(), dob]
      );
      patientId = insert.insertId;
    }

    // INSERT IGNORE: the (patient_id, institution_id) unique key prevents duplicate access rows.
    await conn.query(
      `INSERT IGNORE INTO patient_institution_access (patient_id, institution_id, checked_in_by_user_id)
       VALUES (?, ?, ?)`,
      [patientId, institutionId, userId]
    );

    await conn.commit();

    res.locals.auditPatientId = patientId;
    res.locals.auditUserId = userId;

    const [patientRows] = await pool.query(
      `SELECT id, trn, first_name, last_name, date_of_birth, is_photo_verified, created_at
         FROM patients WHERE id = ?`,
      [patientId]
    );

    return res.status(201).json({
      message: alreadyRegistered
        ? 'Existing patient record found and checked in to your institution.'
        : 'Patient checked in successfully.',
      already_registered: alreadyRegistered,
      patient: patientRows[0],
    });
  } catch (err) {
    await conn.rollback();
    console.error('[check-in]', err);
    return res.status(500).json({ message: 'Unable to check in the patient right now.' });
  } finally {
    conn.release();
  }
});

// GET /api/audit-logs  (latest 20)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.user_id, a.action, a.patient_id, a.ip_address, a.\`timestamp\`,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.\`timestamp\` DESC, a.id DESC
        LIMIT 20`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[audit-logs]', err);
    return res.status(500).json({ message: 'Unable to load audit logs.' });
  }
});

/***************************************************************************/
/* Prescriptions API (Doctor and Pharmacy)                                 */
/***************************************************************************/ 
// POST /api/prescriptions (Doctor adds a prescription to a patient account)
app.post('/api/prescriptions', async (req, res) => {
  const { patient_id, medication_name, dosage, quantity, notes } = req.body || {};
  const doctorId = parseInt(req.headers['x-user-id'], 10);

  if (!patient_id || !medication_name || !dosage) {
    return res.status(400).json({ message: 'Patient, medication name, and dosage are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, quantity, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [patient_id, doctorId, medication_name.trim(), dosage.trim(), quantity || '30 days supply', notes || null]
    );

    res.locals.auditPatientId = patient_id;
    res.locals.auditUserId = doctorId;

    return res.status(201).json({ id: result.insertId, message: 'Prescription added to patient account.' });
  } catch (err) {
    console.error('[prescriptions:create]', err);
    return res.status(500).json({ message: 'Unable to save prescription.' });
  }
});

// GET /api/pharmacy/patient/:trn/unfilled (Pharmacy looks up a patient by TRN and returns their unfilled prescriptions)
app.get('/api/pharmacy/patient/:trn/unfilled', async (req, res) => {
  const cleanTrn = String(req.params.trn).replace(/[\s-]/g, '');
  if (!/^\d{9}$/.test(cleanTrn)) {
    return res.status(400).json({ message: 'TRN must be exactly 9 digits.' });
  }

  try {
    const [patients] = await pool.query(
      'SELECT id, trn, first_name, last_name, date_of_birth, is_photo_verified FROM patients WHERE trn = ? LIMIT 1',
      [cleanTrn]
    );

    if (patients.length === 0) {
      return res.status(404).json({ message: 'No patient account found with that TRN.' });
    }

    const patient = patients;
    res.locals.auditPatientId = patient.id;

    const [unfilled] = await pool.query(
      `SELECT p.id, p.medication_name, p.dosage, p.quantity, p.notes, p.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
              i.name AS institution_name
         FROM prescriptions p
         JOIN users u ON u.id = p.doctor_id
         JOIN institutions i ON i.id = u.institution_id
        WHERE p.patient_id = ? AND p.is_active = TRUE
        ORDER BY p.created_at DESC`,
      [patient.id]
    );

    return res.json({ patient, unfilled_prescriptions: unfilled });
  } catch (err) {
    console.error('[pharmacy:lookup]', err);
    return res.status(500).json({ message: 'Unable to look up patient prescriptions.' });
  }
});

// PATCH /api/pharmacy/prescriptions/:id/fill (Pharmacy marks a prescription as filled)
app.patch('/api/pharmacy/prescriptions/:id/fill', async (req, res) => {
  const rxId = parseInt(req.params.id, 10);
  const pharmacistId = parseInt(req.headers['x-user-id'], 10);

  try {
    const [rows] = await pool.query(
      'SELECT patient_id FROM prescriptions WHERE id = ? AND is_active = TRUE LIMIT 1',
      [rxId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Unfilled prescription not found or already dispensed.' });
    }

    await pool.query(
      `UPDATE prescriptions
          SET is_active = FALSE,
              filled_by_user_id = ?,
              filled_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [pharmacistId, rxId]
    );

    res.locals.auditPatientId = rows.patient_id;
    res.locals.auditUserId = pharmacistId;

    return res.json({ message: 'Prescription dispensed and marked as filled.' });
  } catch (err) {
    console.error('[pharmacy:fill]', err);
    return res.status(500).json({ message: 'Unable to mark prescription as filled.' });
  }
});

/******************************************************************************/
/* Patient Portal APIs (Patient self-service)                                 */
/******************************************************************************/
// POST /api/auth/patient-login  (Patient login via 9-digit TRN + Date of Birth)
app.post('/api/auth/patient-login', async (req, res) => {
  try {
    const { trn, dob } = req.body || {};
    const cleanTrn = String(trn || '').replace(/[\s-]/g, '');

    if (!/^\d{9}$/.test(cleanTrn) || !dob) {
      return res.status(400).json({ message: 'Valid 9-digit TRN and Date of Birth are required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, trn, first_name, last_name, date_of_birth, is_photo_verified FROM patients WHERE trn = ? AND date_of_birth = ? LIMIT 1',
      [cleanTrn, dob]
    );

    const patient = rows;
    if (!patient) {
      return res.status(401).json({ message: 'No patient record matched that TRN and Date of Birth.' });
    }

    res.locals.auditPatientId = patient.id;

    const user = {
      id: patient.id,
      patient_id: patient.id,
      institution_id: null,
      institution_name: 'Patient Self-Service Portal',
      role: 'patient',
      trn: patient.trn,
      first_name: patient.first_name,
      last_name: patient.last_name,
      name: `${patient.first_name} ${patient.last_name}`,
      date_of_birth: patient.date_of_birth,
      is_photo_verified: patient.is_photo_verified,
    };

    const token = createMockJwt({ sub: patient.id, role: 'patient', trn: patient.trn });
    return res.json({ token, user });
  } catch (err) {
    console.error('[patient-login]', err);
    return res.status(500).json({ message: 'Unable to sign in right now. Please try again.' });
  }
});

// GET /api/patients/:id/summary  (Longitudinal record, prescriptions, visits & access log for PatientPortal)
app.get('/api/patients/:id/summary', async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(patientId)) {
    return res.status(400).json({ message: 'Invalid patient ID.' });
  }

  try {
    const [[patient]] = await pool.query(
      'SELECT id, trn, first_name, last_name, date_of_birth, is_photo_verified, created_at FROM patients WHERE id = ?',
      [patientId]
    );
    if (!patient) {
      return res.status(404).json({ message: 'Patient record not found.' });
    }

    const [prescriptions] = await pool.query(
      `SELECT p.id, p.medication_name, p.dosage, p.quantity, p.notes, p.is_active, p.created_at, p.filled_at,
              CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
              i.name AS institution_name
         FROM prescriptions p
         JOIN users u ON u.id = p.doctor_id
         JOIN institutions i ON i.id = u.institution_id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC`,
      [patientId]
    );

    const [visits] = await pool.query(
      `SELECT pia.checked_in_at, i.name AS institution_name, i.type AS institution_type
         FROM patient_institution_access pia
         JOIN institutions i ON i.id = pia.institution_id
        WHERE pia.patient_id = ?
        ORDER BY pia.checked_in_at DESC`,
      [patientId]
    );

    const [accessLogs] = await pool.query(
      `SELECT a.id, a.action, a.\`timestamp\`,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name,
              i.name AS institution_name
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         LEFT JOIN institutions i ON i.id = u.institution_id
        WHERE a.patient_id = ?
        ORDER BY a.\`timestamp\` DESC
        LIMIT 10`,
      [patientId]
    );

    res.locals.auditPatientId = patientId;
    return res.json({ patient, prescriptions, visits, access_logs: accessLogs });
  } catch (err) {
    console.error('[patient-summary]', err);
    return res.status(500).json({ message: 'Unable to load your health summary.' });
  }
});

/******************************************************************************/
/* Clinical Chart APIs (Doctor & Nurse)                                       */
/******************************************************************************/
// GET /api/patients/:id/chart  (Clinical notes & prescriptions for a checked-in patient)
app.get('/api/patients/:id/chart', async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(patientId)) {
    return res.status(400).json({ message: 'Invalid patient ID.' });
  }

  try {
    const [[patient]] = await pool.query(
      'SELECT id, trn, first_name, last_name, date_of_birth, is_photo_verified FROM patients WHERE id = ?',
      [patientId]
    );
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const [notes] = await pool.query(
      `SELECT cn.id, cn.is_critical_illness, cn.summary_for_nurses, cn.full_medical_notes, cn.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS author_name, u.role AS author_role
         FROM clinical_notes cn
         JOIN users u ON u.id = cn.author_id
        WHERE cn.patient_id = ?
        ORDER BY cn.created_at DESC`,
      [patientId]
    );

    const [prescriptions] = await pool.query(
      `SELECT p.id, p.medication_name, p.dosage, p.quantity, p.notes, p.is_active, p.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS doctor_name
         FROM prescriptions p
         JOIN users u ON u.id = p.doctor_id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC`,
      [patientId]
    );

    res.locals.auditPatientId = patientId;
    return res.json({ patient, notes, prescriptions });
  } catch (err) {
    console.error('[patient-chart]', err);
    return res.status(500).json({ message: 'Unable to load clinical chart.' });
  }
});

// POST /api/clinical-notes  (Append-only clinical entry — no UPDATE/DELETE endpoints exist)
app.post('/api/clinical-notes', async (req, res) => {
  const { patient_id, is_critical_illness, summary_for_nurses, full_medical_notes } = req.body || {};
  const authorId = parseInt(req.headers['x-user-id'], 10);

  if (!patient_id || (!summary_for_nurses && !full_medical_notes)) {
    return res.status(400).json({ message: 'Patient and clinical note content are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO clinical_notes (patient_id, author_id, is_critical_illness, summary_for_nurses, full_medical_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, authorId, Boolean(is_critical_illness), summary_for_nurses || null, full_medical_notes || null]
    );

    res.locals.auditPatientId = patient_id;
    res.locals.auditUserId = authorId;

    return res.status(201).json({ id: result.insertId, message: 'Clinical entry appended to patient chart.' });
  } catch (err) {
    console.error('[clinical-notes:create]', err);
    return res.status(500).json({ message: 'Unable to append clinical note.' });
  }
});

/******************************************************************************/
/* Admin APIs (System Operators)                                              */
/******************************************************************************/
// GET /api/admin/users  (List all system operators & their roles/institutions)
app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.institution_id, u.created_at,
              i.name AS institution_name
         FROM users u
         JOIN institutions i ON i.id = u.institution_id
        ORDER BY u.created_at DESC, u.id DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[admin:users]', err);
    return res.status(500).json({ message: 'Unable to load user accounts.' });
  }
});

// PATCH /api/admin/users/:id/role  (Admin updates a user's IAM role)
app.patch('/api/admin/users/:id/role', async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { role } = req.body || {};
  const validRoles = ['admin', 'doctor', 'nurse', 'staff', 'pharmacist'];

  if (!Number.isInteger(targetUserId) || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Valid user ID and role are required.' });
  }

  try {
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);
    return res.json({ message: `User role updated to ${role}.` });
  } catch (err) {
    console.error('[admin:update-role]', err);
    return res.status(500).json({ message: 'Unable to update user role.' });
  }
});

/* -------------------------------------------------------------------------- */
/* Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

pool
  .query('SELECT 1')
  .then(() => {
    console.log('[db] Connected to MySQL over SSL.');
    app.listen(PORT, () => console.log(`[server] JAMEDIS API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[db] Could not connect to the database:', err.message);
    process.exit(1);
  });
