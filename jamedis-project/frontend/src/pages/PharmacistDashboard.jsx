import { useState } from 'react';
import { Pill, Search, CheckCircle2, AlertCircle, Loader2, UserCheck, X } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const formatTrn = (trn) => String(trn).replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function PharmacistDashboard({ user }) {
  const [trnInput, setTrnInput] = useState('');
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fillingId, setFillingId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setFlash('');

    const cleanTrn = trnInput.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(cleanTrn)) {
      return setError('TRN must be exactly 9 digits (e.g. 123-456-789).');
    }

    setLoading(true);
    setPatient(null);
    setPrescriptions([]);

    try {
      const { data } = await api.get(`/api/pharmacy/patient/${cleanTrn}/unfilled`);
      setPatient(data.patient);
      setPrescriptions(data.unfilled_prescriptions || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to access patient prescriptions.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFilled = async (rxId) => {
    setError('');
    setFlash('');
    setFillingId(rxId);
    try {
      const { data } = await api.patch(`/api/pharmacy/prescriptions/${rxId}/fill`);
      setPrescriptions((prev) => prev.filter((rx) => rx.id !== rxId));
      setFlash(data.message || 'Prescription marked as filled.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to mark prescription as filled.'));
    } finally {
      setFillingId(null);
    }
  };

  const clearSession = () => {
    setTrnInput('');
    setPatient(null);
    setPrescriptions([]);
    setError('');
    setFlash('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.first_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter a patient&apos;s TRN at the counter to view their current unfilled prescriptions.
        </p>
      </div>

      {/* Scoped Patient Lookup Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              required
              value={trnInput}
              onChange={(e) => setTrnInput(e.target.value)}
              placeholder="Patient TRN (e.g. 123-456-789)"
              className="input pl-10"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Searching...' : 'View Unfilled Prescriptions'}
          </button>
          {patient && (
            <button type="button" onClick={clearSession} className="btn-secondary">
              <X size={16} /> Clear
            </button>
          )}
        </form>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {flash && (
          <div role="status" className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{flash}</span>
          </div>
        )}
      </div>

      {/* Patient Verification Header & Unfilled Prescriptions */}
      {patient && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {patient.first_name[0]}
                {patient.last_name[0]}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </h2>
                <p className="text-xs text-slate-500">
                  TRN: <span className="font-medium text-slate-700">{formatTrn(patient.trn)}</span> &middot; DOB:{' '}
                  {formatDate(patient.date_of_birth)}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <UserCheck size={14} /> Scoped Pharmacy Access
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
              <Pill size={18} className="text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Current Unfilled Prescriptions ({prescriptions.length})
              </h3>
            </div>

            {prescriptions.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                No unfilled prescriptions are currently on this patient&apos;s account.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {prescriptions.map((rx) => (
                  <li key={rx.id} className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-semibold text-slate-900">{rx.medication_name}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Unfilled
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        <strong>Instructions:</strong> {rx.dosage} &middot; <strong>Qty:</strong> {rx.quantity || '30 days supply'}
                      </p>
                      {rx.notes && <p className="text-xs text-slate-500">Note: {rx.notes}</p>}
                      <p className="text-xs text-slate-400">
                        Prescribed by Dr. {rx.doctor_name} ({rx.institution_name}) on {formatDate(rx.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={fillingId === rx.id}
                      onClick={() => handleMarkFilled(rx.id)}
                      className="btn-primary shrink-0"
                    >
                      {fillingId === rx.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {fillingId === rx.id ? 'Updating...' : 'Mark as Filled'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
