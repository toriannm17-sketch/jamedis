import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import { roleLabel } from '../utils.js';

// Shows the signed-in user's details and lets them choose a new password.
export default function Account({ user }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.new_password.length < 8) return setError('New password must be at least 8 characters.');
    if (form.new_password !== form.confirm) return setError('The new passwords do not match.');

    setSaving(true);
    try {
      const { data } = await api.post('/api/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(data.message);
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to change the password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">My account</h1>

      <section className="card p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          {[
            ['Name', user.name],
            ['Email', user.email],
            ['Role', roleLabel(user.role)],
            ['Institution', user.institution_name],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      
      Form panel 
      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">Change password</h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <div>
            <label htmlFor="cur_pw" className="label">Current password</label>
            <input id="cur_pw" type="password" required autoComplete="current-password" value={form.current_password} onChange={update('current_password')} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new_pw" className="label">New password</label>
              <input id="new_pw" type="password" required minLength={8} autoComplete="new-password" value={form.new_password} onChange={update('new_password')} className="input" />
            </div>
            <div>
              <label htmlFor="conf_pw" className="label">Confirm new password</label>
              <input id="conf_pw" type="password" required autoComplete="new-password" value={form.confirm} onChange={update('confirm')} className="input" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} Update password
          </button>
        </form>
      </section>
      
    </div>
  );
}
