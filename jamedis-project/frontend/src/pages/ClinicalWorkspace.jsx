import { useEffect, useState } from 'react';
import {
  Search,
  FileText,
  Pill,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const formatTrn = (trn) => String(trn || '').replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-JM', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function ClinicalWorkspace({ user }) {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [chart, setChart] = useState({ notes: [], prescriptions: [] });
  const [loadingChart, setLoadingChart] = useState(false);

  const [securityAlert, setSecurityAlert] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  // Append-only Clinical Note form state
  const [noteForm, setNoteForm] = useState({
    summary_for_nurses: '',
    full_medical_notes: '',
    is_critical_illness: false,
  });
  const [savingNote, setSavingNote] = useState(false);

  // E-Prescription form state (Doctors only)
  const [rxForm, setRxForm] = useState({
    medication_name: '',
    dosage: '',
    quantity: '30 days supply',
    notes: '',
  });
  const [savingRx, setSavingRx] = useState(false);

  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    api
      .get('/api/patients')
      .then(({ data }) => setPatients(data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load patient registry.')));
  }, []);

  const loadPatientChart = async (patient) => {
    setSecurityAlert('');
    setError('');
    setFlash('');

    // Self-access compliance guard
    const clinicianFullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toLowerCase();
    const patientFullName = `${patient.first_name} ${patient.last_name}`.trim().toLowerCase();
    if (clinicianFullName && clinicianFullName === patientFullName) {
      setSelectedPatient(null);
      return setSecurityAlert(
        'Access Denied: Healthcare providers are restricted from inspecting or modifying their own medical chart.'
      );
    }

    setSelectedPatient(patient);
    setLoadingChart(true);
    try {
      const { data } = await api.get(`/api/patients/${patient.id}/chart`);
      setChart({ notes: data.notes || [], prescriptions: data.prescriptions || [] });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load patient medical chart.'));
    } finally {
      setLoadingChart(false);
    }
  };

  const handleAppendNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSavingNote(true);
    setError('');
    setFlash('');
    try {
      const { data } = await api.post('/api/clinical-notes', {
        patient_id: selectedPatient.id,
        ...noteForm,
      });
      setNoteForm({ summary_for_nurses: '', full_medical_notes: '', is_critical_illness: false });
      setFlash(data.message);
      await loadPatientChart(selectedPatient);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to append clinical note.'));
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSavingRx(true);
    setError('');
    setFlash('');
    try {
      const { data } = await api.post('/api/prescriptions', {
        patient_id: selectedPatient.id,
        ...rxForm,
      });
      setRxForm({ medication_name: '', dosage: '', quantity: '30 days supply', notes: '' });
      setFlash(data.message);
      await loadPatientChart(selectedPatient);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to post prescription.'));
    } finally {
      setSavingRx(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      String(p.trn).includes(q.replace(/-/g, ''))
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clinical Medical Workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          Inspect checked-in patient charts, append immutable clinical entries, and issue e-prescriptions.
        </p>
      </div>

      {securityAlert && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
          <Lock size={18} className="mt-0.5 shrink-0" />
          <span>{securityAlert}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {flash && (
        <div role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{flash}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Patient Registry Lookup */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Patient Registry Lookup</h2>
          <div className="relative mt-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or TRN..."
              className="input py-2 pl-9"
            />
          </div>

          <ul className="mt-4 max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
            {filteredPatients.map((p) => {
              const active = selectedPatient?.id === p.id;
              return (
                <li key={p.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => loadPatientChart(p)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-brand-600 bg-brand-50/60'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-slate-900">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-500">TRN: {formatTrn(p.trn)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

                {/* Right 2 Columns: Active Chart, Append-Only Notes & E-Prescribing */}
        <div className="space-y-6 lg:col-span-2">
          {!selectedPatient ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Select a patient from the registry on the left to inspect their medical chart.
            </div>
          ) : loadingChart ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
              Loading medical chart...
            </div>
          ) : (
            <>
              {/* Active Chart Header */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Medical Chart: {selectedPatient.first_name} {selectedPatient.last_name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      TRN: {formatTrn(selectedPatient.trn)} &middot; Append-only clinical record (edits &amp; deletions disabled)
                    </p>
                  </div>
                </div>
              </div>

              {/* Doctor E-Prescription Form */}
              {isDoctor && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Pill size={18} className="text-brand-600" />
                    <h3 className="text-base font-semibold text-slate-900">Issue E-Prescription to Patient Account</h3>
                  </div>
                  <form onSubmit={handleCreatePrescription} className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Medication Name &amp; Strength
                      </label>
                      <input
                        required
                        value={rxForm.medication_name}
                        onChange={(e) => setRxForm((f) => ({ ...f, medication_name: e.target.value }))}
                        placeholder="e.g. Amlodipine 5mg"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Dosage &amp; Sig Instructions
                      </label>
                      <input
                        required
                        value={rxForm.dosage}
                        onChange={(e) => setRxForm((f) => ({ ...f, dosage: e.target.value }))}
                        placeholder="e.g. 1 tablet by mouth daily"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Quantity / Duration</label>
                      <input
                        value={rxForm.quantity}
                        onChange={(e) => setRxForm((f) => ({ ...f, quantity: e.target.value }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Pharmacy Notes (Optional)</label>
                      <input
                        value={rxForm.notes}
                        onChange={(e) => setRxForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="e.g. Take with food"
                        className="input"
                      />
                    </div>
                    <div className="flex justify-end sm:col-span-2">
                      <button type="submit" disabled={savingRx} className="btn-primary">
                        {savingRx ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {savingRx ? 'Posting...' : 'Post Prescription'}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {/* Append Clinical Note Form */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-brand-600" />
                  <h3 className="text-base font-semibold text-slate-900">Append Clinical Entry</h3>
                </div>
                <form onSubmit={handleAppendNote} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Care Summary for Nurses &amp; Triage
                    </label>
                    <input
                      value={noteForm.summary_for_nurses}
                      onChange={(e) => setNoteForm((f) => ({ ...f, summary_for_nurses: e.target.value }))}
                      placeholder="Brief care instructions visible to nursing staff..."
                      className="input"
                    />
                  </div>
                  {isDoctor && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Full Medical Diagnosis &amp; Clinical Notes (Doctors Only)
                      </label>
                      <textarea
                        rows={3}
                        value={noteForm.full_medical_notes}
                        onChange={(e) => setNoteForm((f) => ({ ...f, full_medical_notes: e.target.value }))}
                        placeholder="Detailed clinical findings, differential diagnosis, follow-up plan..."
                        className="input"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={noteForm.is_critical_illness}
                        onChange={(e) => setNoteForm((f) => ({ ...f, is_critical_illness: e.target.checked }))}
                      />
                      Flag as critical illness / high-priority alert
                    </label>
                    <button type="submit" disabled={savingNote} className="btn-primary">
                      {savingNote ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {savingNote ? 'Saving...' : 'Append Entry'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Longitudinal Notes & Prescription History */}
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Longitudinal Clinical History ({chart.notes.length} entries)
                </h3>
                {chart.notes.length === 0 ? (
                  <p className="text-sm text-slate-500">No clinical entries recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {chart.notes.map((n) => (
                      <li key={n.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {n.author_name} ({n.author_role})
                          </span>
                          <div className="flex items-center gap-2">
                            {Boolean(n.is_critical_illness) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                <AlertTriangle size={12} /> Critical Alert
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{formatDateTime(n.created_at)}</span>
                          </div>
                        </div>
                        {n.summary_for_nurses && (
                          <p className="mt-2 text-slate-700">
                            <strong>Care Summary:</strong> {n.summary_for_nurses}
                          </p>
                        )}
                        {isDoctor && n.full_medical_notes && (
                          <p className="mt-1 text-slate-600">
                            <strong>Medical Notes:</strong> {n.full_medical_notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
