import { useEffect, useState } from 'react';
import { Printer, Pill, Building2, ShieldCheck, BadgeCheck, BadgeAlert, AlertCircle, FileText } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const formatTrn = (trn) => String(trn || '').replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' });
};

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

export default function PatientPortal({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = user?.patient_id || user?.id;
    if (!patientId) return;

    setLoading(true);
    api
      .get(`/api/patients/${patientId}/summary`)
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your health record.')))
      .finally(() => setLoading(false));
  }, [user]);

  const patient = summary?.patient || user;
  const prescriptions = summary?.prescriptions || [];
  const visits = summary?.visits || [];
  const accessLogs = summary?.access_logs || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header & Print Action */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Personal Health Dashboard, {patient?.first_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your centralized JAMEDIS record. You have full rights under the Data Protection Act to inspect and print your clinical summary.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-primary shrink-0">
          <Printer size={18} />
          Print Records Statement
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Identity & Longitudinal Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">National Identifier</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{formatTrn(patient?.trn)}</p>
          <p className="mt-1 text-xs text-slate-500">DOB: {formatDate(patient?.date_of_birth)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Identity Status</p>
          <div className="mt-2">
            {patient?.is_photo_verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck size={15} /> Photo ID Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <BadgeAlert size={15} /> Pending Photo Verification
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">Verify at any participating MOHW facility</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Primary / Latest Facility</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {visits?.institution_name || 'No facility check-ins yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {visits ? `Last visit: ${formatDate(visits.checked_in_at)}` : 'Check in at a clinic or hospital'}
          </p>
        </div>
      </div>

      {/* Prescriptions (Shows Unfilled vs Filled status) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
          <Pill size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-slate-900">My Prescriptions</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No prescriptions have been posted to your account yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {prescriptions.map((rx) => (
              <li key={rx.id} className="flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-900">{rx.medication_name}</span>
                    {rx.is_active ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Unfilled — Ready for Pharmacy
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Dispensed {rx.filled_at ? `on ${formatDate(rx.filled_at)}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {rx.dosage} &middot; {rx.quantity || '30 days supply'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Prescribed by Dr. {rx.doctor_name} ({rx.institution_name}) on {formatDate(rx.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Authorized Facilities & Patient Right-to-Audit Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <Building2 size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Facilities With Record Access</h2>
          </div>
          {visits.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">No institutions have checked you in yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visits.map((v, idx) => (
                <li key={idx} className="px-6 py-3.5 text-sm">
                  <p className="font-medium text-slate-900">{v.institution_name}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {v.institution_type} &middot; Checked in {formatDateTime(v.checked_in_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Record Access Audit Trail</h2>
          </div>
          {accessLogs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-500">No recent access events logged.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {accessLogs.map((log) => (
                <li key={log.id} className="px-6 py-3 text-xs">
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="mt-0.5 text-slate-500">
                    {log.user_name ? `${log.user_name} (${log.institution_name || 'System'})` : 'Self-Service'} &middot;{' '}
                    {formatDateTime(log.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
