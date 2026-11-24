import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, BadgeAlert, HeartPulse, Send, Pencil, Loader2, Pill, FileText, UserRound, Eye, EyeOff, Trash2, ClipboardList,
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate, formatDateTime, calcAge, formatTrn, initials } from '../utils.js';

/* ------------------------------ Overview tab ------------------------------ */
// Shows the patient's details; staff, nurses and doctors can edit them or verify the photo ID.
function OverviewTab({ patient, canEdit, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: String(patient.date_of_birth).slice(0, 10),
      profile_photo_url: patient.profile_photo_url || '',
    });
    setError('');
    setEditing(true);
  };

  // Send changes to the API (used for both the edit form and the verify button)
  const save = async (changes) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/api/patients/${patient.id}`, changes);
      onChange(data);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save changes.'));
    } finally {
      setSaving(false);
    }
  };

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      {editing ? (
        <form
          onSubmit={(e) => { e.preventDefault(); save(form); }}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="e_first" className="label">First name</label>
            <input id="e_first" required value={form.first_name} onChange={update('first_name')} className="input" />
          </div>
          <div>
            <label htmlFor="e_last" className="label">Last name</label>
            <input id="e_last" required value={form.last_name} onChange={update('last_name')} className="input" />
          </div>
          <div>
            <label htmlFor="e_dob" className="label">Date of birth</label>
            <input id="e_dob" type="date" required max={today} value={form.date_of_birth} onChange={update('date_of_birth')} className="input" />
          </div>
          <div>
            <label htmlFor="e_photo" className="label">Photo URL (optional)</label>
            <input id="e_photo" type="url" value={form.profile_photo_url} onChange={update('profile_photo_url')} placeholder="https://..." className="input" />
          </div>
          <div className="flex gap-3 sm:col-span-2 sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Save changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ['First name', patient.first_name],
              ['Last name', patient.last_name],
              ['TRN', formatTrn(patient.trn)],
              ['Date of birth', `${formatDate(patient.date_of_birth)} (${calcAge(patient.date_of_birth)} yrs)`],
              ['Checked in at your institution', formatDateTime(patient.checked_in_at)],
              ['Record created', formatDateTime(patient.created_at)],
              ['Consent to digital record', patient.consent_given ? `Given on ${formatDateTime(patient.consent_at)}` : 'Not recorded'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          {canEdit && (
            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <button type="button" className="btn-secondary" onClick={startEdit}><Pencil size={16} /> Edit details</button>
              <button
                type="button"
                disabled={saving}
                className="btn-secondary"
                onClick={() => save({ is_photo_verified: !patient.is_photo_verified })}
              >
                {patient.is_photo_verified ? <BadgeAlert size={16} /> : <BadgeCheck size={16} />}
                {patient.is_photo_verified ? 'Mark photo ID as not verified' : 'Mark photo ID as verified'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------- Notes tab -------------------------------- */
// Clinical notes. Doctors can add notes and read everything; nurses only see the nurse summary.
function NotesTab({ patientId, role }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ is_critical_illness: false, summary_for_nurses: '', full_medical_notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/patients/${patientId}/notes`);
      setNotes(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load clinical notes.'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/patients/${patientId}/notes`, form);
      setForm({ is_critical_illness: false, summary_for_nurses: '', full_medical_notes: '' });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save the note.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      {role === 'doctor' && (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Add a clinical note</h3>
          <div>
            <label htmlFor="n_summary" className="label">Summary for nurses</label>
            <textarea id="n_summary" rows={2} value={form.summary_for_nurses} onChange={(e) => setForm((f) => ({ ...f, summary_for_nurses: e.target.value }))} className="input" placeholder="What nurses need to know to care for this patient" />
          </div>
          <div>
            <label htmlFor="n_full" className="label">Full medical notes (doctors only)</label>
            <textarea id="n_full" rows={4} value={form.full_medical_notes} onChange={(e) => setForm((f) => ({ ...f, full_medical_notes: e.target.value }))} className="input" placeholder="Diagnosis, history, treatment plan" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_critical_illness} onChange={(e) => setForm((f) => ({ ...f, is_critical_illness: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
            Flag this patient as having a critical illness
          </label>
          <button type="submit" disabled={saving || (!form.summary_for_nurses.trim() && !form.full_medical_notes.trim())} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} Save note
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No clinical notes yet.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{n.author_name}</span>
                <span>· {n.institution_name}</span>
                <span>· {formatDateTime(n.created_at)}</span>
                {Boolean(n.is_critical_illness) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                    <HeartPulse size={12} /> Critical illness
                  </span>
                )}
              </div>
              {n.summary_for_nurses && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nurse summary</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{n.summary_for_nurses}</p>
                </div>
              )}
              {role === 'doctor' && n.full_medical_notes && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full medical notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{n.full_medical_notes}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------- Prescriptions tab ---------------------------- */
// Doctors add and stop prescriptions; nurses can read them.
function PrescriptionsTab({ patientId, role }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ medication_name: '', dosage: '', shared_with_patient: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/patients/${patientId}/prescriptions`);
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load prescriptions.'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/patients/${patientId}/prescriptions`, form);
      setForm({ medication_name: '', dosage: '', shared_with_patient: false });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to add the prescription.'));
    } finally {
      setSaving(false);
    }
  };

  // Approve or hide a prescription in the patient portal
  const toggleShare = async (rx) => {
    setError('');
    try {
      await api.patch(`/api/patients/${patientId}/prescriptions/${rx.id}`, { shared_with_patient: !rx.shared_with_patient });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update sharing.'));
    }
  };

  // Stop or restart a prescription
  const toggle = async (rx) => {
    setError('');
    try {
      await api.patch(`/api/patients/${patientId}/prescriptions/${rx.id}`, { is_active: !rx.is_active });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update the prescription.'));
    }
  };

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      {role === 'doctor' && (
        <form onSubmit={add} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="rx_med" className="label">Medication</label>
            <input id="rx_med" required maxLength={150} value={form.medication_name} onChange={(e) => setForm((f) => ({ ...f, medication_name: e.target.value }))} className="input" placeholder="e.g. Amlodipine" />
          </div>
          <div>
            <label htmlFor="rx_dose" className="label">Dosage</label>
            <input id="rx_dose" required maxLength={100} value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} className="input" placeholder="e.g. 5 mg once daily" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} Add
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
            <input type="checkbox" checked={form.shared_with_patient} onChange={(e) => setForm((f) => ({ ...f, shared_with_patient: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
            Share with the patient in their portal
          </label>
        </form>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No prescriptions recorded.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {items.map((rx) => (
            <li key={rx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className={`text-sm font-semibold ${rx.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{rx.medication_name}</p>
                <p className="text-sm text-slate-600">{rx.dosage}</p>
                <p className="text-xs text-slate-400">Prescribed by {rx.doctor_name} · {formatDateTime(rx.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${rx.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {rx.is_active ? 'Active' : 'Stopped'}
                </span>
                {role === 'doctor' ? (
                  <>
                    <button type="button" onClick={() => toggleShare(rx)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                      {rx.shared_with_patient ? <Eye size={14} /> : <EyeOff size={14} />}
                      {rx.shared_with_patient ? 'Shared' : 'Not shared'}
                    </button>
                    <button type="button" onClick={() => toggle(rx)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                      {rx.is_active ? 'Stop' : 'Restart'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">{rx.shared_with_patient ? 'Shared with patient' : 'Not shared'}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------- Health summary tab --------------------------- */
// Allergies, immunizations and conditions. The doctor decides what the patient sees in their portal.
const CATEGORY_LABELS = { allergy: 'Allergies', immunization: 'Immunizations', condition: 'Conditions' };

function HealthTab({ patientId, role }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const emptyForm = { category: 'allergy', title: '', detail: '', recorded_on: '', shared_with_patient: false };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/patients/${patientId}/health-records`);
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load the health summary.'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/patients/${patientId}/health-records`, form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleShare = async (item) => {
    setError('');
    try {
      await api.patch(`/api/patients/${patientId}/health-records/${item.id}`, { shared_with_patient: !item.shared_with_patient });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update sharing.'));
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.title}"? Use this only for entries made by mistake.`)) return;
    setError('');
    try {
      await api.delete(`/api/patients/${patientId}/health-records/${item.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to remove the entry.'));
    }
  };

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
        The patient only sees entries marked <strong>Shared</strong>, in their patient portal.
      </p>

      {role === 'doctor' && (
        <form onSubmit={add} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="h_cat" className="label">Type</label>
            <select id="h_cat" value={form.category} onChange={update('category')} className="input">
              <option value="allergy">Allergy</option>
              <option value="immunization">Immunization</option>
              <option value="condition">Condition</option>
            </select>
          </div>
          <div>
            <label htmlFor="h_title" className="label">Name</label>
            <input id="h_title" required maxLength={150} value={form.title} onChange={update('title')} className="input" placeholder="e.g. Penicillin, Tetanus, Asthma" />
          </div>
          <div>
            <label htmlFor="h_detail" className="label">Details (optional)</label>
            <input id="h_detail" maxLength={255} value={form.detail} onChange={update('detail')} className="input" placeholder="Reaction, dose, notes" />
          </div>
          <div>
            <label htmlFor="h_date" className="label">Date (optional)</label>
            <input id="h_date" type="date" max={today} value={form.recorded_on} onChange={update('recorded_on')} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={form.shared_with_patient} onChange={(e) => setForm((f) => ({ ...f, shared_with_patient: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
            Share with the patient in their portal
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Add to health summary
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Nothing recorded yet.</p>
      ) : (
        Object.keys(CATEGORY_LABELS).map((cat) => {
          const rows = items.filter((i) => i.category === cat);
          if (rows.length === 0) return null;
          return (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">{CATEGORY_LABELS[cat]}</h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {rows.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{i.title}</p>
                      <p className="text-sm text-slate-600">{[i.detail, i.recorded_on && formatDate(i.recorded_on)].filter(Boolean).join(' · ')}</p>
                      <p className="text-xs text-slate-400">Recorded by {i.recorded_by_name}</p>
                    </div>
                    {role === 'doctor' ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleShare(i)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                          {i.shared_with_patient ? <Eye size={14} /> : <EyeOff size={14} />}
                          {i.shared_with_patient ? 'Shared' : 'Not shared'}
                        </button>
                        <button type="button" onClick={() => remove(i)} aria-label={`Remove ${i.title}`} className="btn-danger !px-2.5 !py-1.5">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">{i.shared_with_patient ? 'Shared with patient' : 'Not shared'}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ----------------------------- Referral dialog ---------------------------- */
// Lets a doctor or nurse refer this patient to another institution.
function ReferralModal({ patient, ownInstitutionId, onClose, onSent }) {
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState({ to_institution_id: '', urgency: 'routine', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/institutions')
      .then(({ data }) => setInstitutions(data.filter((i) => i.id !== ownInstitutionId)))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load institutions.')));
  }, [ownInstitutionId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/referrals', { ...form, patient_id: patient.id });
      onSent('Referral sent.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send the referral.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Refer ${patient.first_name} ${patient.last_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label htmlFor="r_to" className="label">Refer to</label>
          <select id="r_to" required value={form.to_institution_id} onChange={(e) => setForm((f) => ({ ...f, to_institution_id: e.target.value }))} className="input">
            <option value="">Choose an institution...</option>
            {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r_urg" className="label">Urgency</label>
          <select id="r_urg" value={form.urgency} onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))} className="input">
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <div>
          <label htmlFor="r_reason" className="label">Reason for referral</label>
          <textarea id="r_reason" required rows={4} maxLength={2000} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="input" />
        </div>
        <p className="text-xs text-slate-500">If the other institution accepts, they will be able to see this patient's record.</p>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} Send referral
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* --------------------------------- Page ----------------------------------- */
export default function PatientDetail({ user }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [showReferral, setShowReferral] = useState(false);
  const [flash, setFlash] = useState(location.state?.flash || '');

  const isClinical = ['doctor', 'nurse'].includes(user.role);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/patients/${id}`)
      .then(({ data }) => setPatient(data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load this patient.')))
      .finally(() => setLoading(false));
  }, [id]);

  // Clear the flash message from history state so it does not reappear on refresh
  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: UserRound },
    ...(isClinical ? [
      { key: 'health', label: 'Health summary', icon: ClipboardList },
      { key: 'notes', label: 'Clinical notes', icon: FileText },
      { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
    ] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/patients" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to patients
      </Link>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : error || !patient ? (
        <Alert>{error || 'Patient not found.'}</Alert>
      ) : (
        <div className="space-y-6">
          {flash && <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>}

          {/* Header */}
          <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {patient.profile_photo_url ? (
                <img src={patient.profile_photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
                  {initials(patient.first_name, patient.last_name)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{patient.first_name} {patient.last_name}</h1>
                <p className="text-sm text-slate-500">TRN {formatTrn(patient.trn)} · {calcAge(patient.date_of_birth)} years old</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${patient.is_photo_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {patient.is_photo_verified ? <BadgeCheck size={14} /> : <BadgeAlert size={14} />}
                  {patient.is_photo_verified ? 'Photo ID verified' : 'Photo ID not verified'}
                </span>
              </div>
            </div>
            {isClinical && (
              <button type="button" className="btn-secondary" onClick={() => setShowReferral(true)}>
                <Send size={16} /> Refer patient
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3" role="tablist">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition ${
                    tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === 'overview' && (
                <OverviewTab patient={patient} canEdit={['doctor', 'nurse', 'staff'].includes(user.role)} onChange={setPatient} />
              )}
              {tab === 'health' && <HealthTab patientId={patient.id} role={user.role} />}
              {tab === 'notes' && <NotesTab patientId={patient.id} role={user.role} />}
              {tab === 'prescriptions' && <PrescriptionsTab patientId={patient.id} role={user.role} />}
            </div>
          </div>
        </div>
      )}

      {showReferral && patient && (
        <ReferralModal
          patient={patient}
          ownInstitutionId={user.institution_id}
          onClose={() => setShowReferral(false)}
          onSent={(msg) => { setShowReferral(false); setFlash(msg); }}
        />
      )}
    </div>
  );
}
