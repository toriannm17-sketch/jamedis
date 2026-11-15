import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  CreditCard,
  Calendar,
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

export default function Login({ onLogin }) {
  const [portalType, setPortalType] = useState('staff'); // 'staff' | 'patient'
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'

  // Staff / Clinician / Pharmacist fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Patient self-service fields
  const [trn, setTrn] = useState('');
  const [dob, setDob] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      onLogin(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setError('');
    const cleanTrn = trn.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(cleanTrn)) {
      return setError('TRN must be exactly 9 digits (e.g. 123-456-789).');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/patient-login', { trn: cleanTrn, dob });
      onLogin(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to verify patient credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setResetSent(true);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  const switchPortal = (nextPortal) => {
    setPortalType(nextPortal);
    setMode('login');
    setError('');
    setResetSent(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-12 text-brand-100 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Activity size={24} className="text-brand-200" />
          </div>
          <span className="text-xl font-bold tracking-wide text-white">JAMEDIS</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight text-white">
            One patient record, shared safely across Jamaica&apos;s care teams.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/80">
            Check patients in, issue and dispense e-prescriptions securely, and keep a clear audit trail of every access.
          </p>
        </div>

        <p className="text-sm text-brand-100/60">IT Capstone Project &middot; Demo environment</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
              <Activity size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide text-brand-900">JAMEDIS</span>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => switchPortal('staff')}
              className={`rounded-lg py-2 transition ${
                portalType === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Care Team &amp; Pharmacy
            </button>
            <button
              type="button"
              onClick={() => switchPortal('patient')}
              className={`rounded-lg py-2 transition ${
                portalType === 'patient' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Patient Self-Service
            </button>
          </div>

          {portalType === 'patient' ? (
            <>
              <h2 className="text-2xl font-semibold text-slate-900">Patient Health Portal</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in with your 9-digit TRN and Date of Birth to view your prescriptions and access log.
              </p>

              {error && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handlePatientLogin} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="patient-trn" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Taxpayer Registration Number (TRN)
                  </label>
                  <div className="relative">
                    <CreditCard size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="patient-trn"
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      required
                      value={trn}
                      onChange={(e) => setTrn(e.target.value)}
                      placeholder="123-456-789"
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="patient-dob" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="patient-dob"
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? 'Verifying...' : 'Access My Health Record'}
                </button>
              </form>

              <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-semibold text-slate-700">Demo patient account</p>
                <p>TRN: 123-456-789 &middot; DOB: 1988-03-14 (Jerome Thompson)</p>
              </div>
            </>
          ) : mode === 'login' ? (
            <>
              <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-slate-500">Use your institution or pharmacy email address.</p>

              {error && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.gov.jm"
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                New to JAMEDIS?{' '}
                <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
                  Create an account
                </Link>
              </p>

              <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-semibold text-slate-700">Demo accounts (password: Password123)</p>
                <p>admin@jamedis.com &middot; doctor@jamedis.com &middot; nurse@jamedis.com &middot; pharmacist@jamedis.com</p>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={16} /> Back to sign in
              </button>
              <h2 className="text-2xl font-semibold text-slate-900">Reset your password</h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your email and we will send you a link to choose a new password.
              </p>

              {resetSent ? (
                <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>
                    If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReset} className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hospital.gov.jm"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    Send reset link
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* REPLACED 
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      onLogin(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // No reset endpoint exists yet: this confirms the request on screen for the demo.
  const handleReset = (e) => {
    e.preventDefault();
    setResetSent(true);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setResetSent(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */ /*}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-12 text-brand-100 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Activity size={24} className="text-brand-200" />
          </div>
          <span className="text-xl font-bold tracking-wide text-white">JAMEDIS</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight text-white">
            One patient record, shared safely across Jamaica's care teams.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-brand-100/80">
            Check patients in, see only the records your institution is responsible for, and keep a clear audit trail of
            every access.
          </p>
        </div>

        <p className="text-sm text-brand-100/60">IT Capstone Project &middot; Demo environment</p>
      </div>

      {/* Form panel */ /*}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
              <Activity size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide text-brand-900">JAMEDIS</span>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-slate-500">Use your institution email address.</p>

              {error && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.gov.jm"
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                New to JAMEDIS?{' '}
                <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
                  Create an account
                </Link>
              </p>

              <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
                <p className="mb-1 font-semibold text-slate-700">Demo accounts (password: Password123)</p>
                <p>admin@jamedis.com &middot; doctor@jamedis.com &middot; nurse@jamedis.com</p>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={16} /> Back to sign in
              </button>
              <h2 className="text-2xl font-semibold text-slate-900">Reset your password</h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your email and we will send you a link to choose a new password.
              </p>

              {resetSent ? (
                <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>
                    If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReset} className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hospital.gov.jm"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    Send reset link
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
*/