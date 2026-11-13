import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const initialForm = { first_name: '', last_name: '', trn: '', dob: '' };

export default function CheckIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanTrn = form.trn.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(cleanTrn)) {
      return setError('TRN must be exactly 9 digits.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/patients/check-in', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        trn: cleanTrn,
        dob: form.dob,
      });
      navigate('/', { state: { flash: data.message } });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to check in the patient.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserPlus size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Check in a patient</h1>
            <p className="text-sm text-slate-500">
              Checking in gives your institution access to this patient's record.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="first_name" className="mb-1.5 block text-sm font-medium text-slate-700">First name</label>
            <input id="first_name" required value={form.first_name} onChange={update('first_name')} className="input" />
          </div>
          <div>
            <label htmlFor="last_name" className="mb-1.5 block text-sm font-medium text-slate-700">Last name</label>
            <input id="last_name" required value={form.last_name} onChange={update('last_name')} className="input" />
          </div>
          <div>
            <label htmlFor="trn" className="mb-1.5 block text-sm font-medium text-slate-700">
              Taxpayer Registration Number (TRN)
            </label>
            <input
              id="trn"
              required
              inputMode="numeric"
              maxLength={11}
              value={form.trn}
              onChange={update('trn')}
              placeholder="123-456-789"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="dob" className="mb-1.5 block text-sm font-medium text-slate-700">Date of birth</label>
            <input id="dob" type="date" required max={today} value={form.dob} onChange={update('dob')} className="input" />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Link to="/" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Checking in...' : 'Check in patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
