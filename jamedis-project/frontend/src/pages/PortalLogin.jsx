import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, Lock, Loader2 } from 'lucide-react';
import api, { getErrorMessage, IS_DEMO } from '../api.js';
import Alert from '../components/Alert.jsx';

// Patient sign-in. Separate from the staff login.
export default function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/portal/login', { email, password });
      onLogin(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <Activity size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide text-brand-900">JAMEDIS</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Patient portal</h1>
          <p className="mt-2 text-sm text-slate-500">See the health information your doctor has shared with you.</p>

          {error && <div className="mt-6"><Alert>{error}</Alert></div>}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="p_email" className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="p_email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" />
              </div>
            </div>
            <div>
              <label htmlFor="p_pw" className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="p_pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/*<p className="mt-6 text-center text-sm text-slate-500">
            First time here?{' '}
            <Link to="/portal/register" className="font-semibold text-brand-700 hover:text-brand-800">Create your account</Link>
          </p> */}
        </div>

        {IS_DEMO && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
            <p className="mb-1 font-semibold text-slate-700">Demo patient login (password: Password123)</p>
            <p>jerome.thompson@example.com</p>
            {/*<p className="mt-1">Or register as Winston Clarke, TRN 345678912, born 1962-07-29.</p>*/}
          </div>
        )} 

        <p className="mt-6 text-center text-sm text-slate-500">
          Hospital or clinic staff? <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Staff sign in</Link>
        </p>
      </div>
    </div>
  );
}
