import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  confirm_password: '',
  role: 'nurse',
  institution_id: '',
};

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get('/api/institutions')
      .then(({ data }) => {
        setInstitutions(data);
        if (data.length > 0) setForm((f) => ({ ...f, institution_id: String(data[0].id) }));
      })
      .catch((err) => setError(getErrorMessage(err, 'Unable to load institutions.')));
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm_password) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await api.post('/api/auth/signup', payload);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
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

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">Register with the institution where you work.</p>

          {error && (
            <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>Account created. Redirecting you to sign in...</span>
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

            <div className="sm:col-span-2">
              <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-700">Work email</label>
              <input id="signup-email" type="email" required value={form.email} onChange={update('email')} placeholder="name@hospital.gov.jm" className="input" />
            </div>

            <div>
              <label htmlFor="institution" className="mb-1.5 block text-sm font-medium text-slate-700">Institution</label>
              <select id="institution" required value={form.institution_id} onChange={update('institution_id')} className="input">
                {institutions.length === 0 && <option value="">Loading...</option>}
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <select id="role" value={form.role} onChange={update('role')} className="input">
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="staff">Administrative staff</option>
              </select>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input id="signup-password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" className="input" />
            </div>
            <div>
              <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
              <input id="confirm_password" type="password" required autoComplete="new-password" value={form.confirm_password} onChange={update('confirm_password')} className="input" />
            </div>

            <div className="sm:col-span-2">
              <button type="submit" disabled={loading || success} className="btn-primary w-full">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
