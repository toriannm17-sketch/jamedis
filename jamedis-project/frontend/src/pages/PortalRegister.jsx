import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';

const initialForm = { first_name: '', last_name: '', trn: '', dob: '', email: '', password: '', confirm_password: '' };

// Patients create their own portal account. Their name, TRN and date of birth must match the clinic record,
// and the clinic must already have verified their photo ID.
export default function PortalRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trn = form.trn.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(trn)) return setError('TRN must be exactly 9 digits.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm_password) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const { confirm_password, ...rest } = form;
      const { data } = await api.post('/api/portal/register', { ...rest, trn });
      setSuccess(data.message);
      setTimeout(() => navigate('/portal/login'), 1800);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <Activity size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide text-brand-900">JAMEDIS</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Create your patient account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your details exactly as your clinic has them. You can register once your clinic has checked your photo ID.
          </p>

          <div className="mt-6 space-y-4">
            {error && <Alert>{error}</Alert>}
            {success && <Alert type="success">{success} Redirecting you to sign in...</Alert>}
          </div>

          <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="r_first" className="label">First name</label>
              <input id="r_first" required value={form.first_name} onChange={update('first_name')} className="input" />
            </div>
            <div>
              <label htmlFor="r_last" className="label">Last name</label>
              <input id="r_last" required value={form.last_name} onChange={update('last_name')} className="input" />
            </div>
            <div>
              <label htmlFor="r_trn" className="label">Taxpayer Registration Number (TRN)</label>
              <input id="r_trn" required inputMode="numeric" maxLength={11} value={form.trn} onChange={update('trn')} placeholder="123-456-789" className="input" />
            </div>
            <div>
              <label htmlFor="r_dob" className="label">Date of birth</label>
              <input id="r_dob" type="date" required max={today} value={form.dob} onChange={update('dob')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="r_email" className="label">Email</label>
              <input id="r_email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} className="input" />
            </div>
            <div>
              <label htmlFor="r_pw" className="label">Password</label>
              <input id="r_pw" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" className="input" />
            </div>
            <div>
              <label htmlFor="r_pw2" className="label">Confirm password</label>
              <input id="r_pw2" type="password" required autoComplete="new-password" value={form.confirm_password} onChange={update('confirm_password')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading || Boolean(success)} className="btn-primary w-full">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered? <Link to="/portal/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
