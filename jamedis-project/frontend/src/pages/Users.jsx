import { useCallback, useEffect, useState } from 'react';
import { UserPlus, KeyRound, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate, initials } from '../utils.js';

const ROLES = ['admin', 'doctor', 'nurse', 'staff'];

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [dialog, setDialog] = useState(null); // { type: 'create' } or { type: 'reset', target }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users');
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Change a user's role or switch their account on/off
  const patchUser = async (target, changes) => {
    setError('');
    try {
      await api.patch(`/api/users/${target.id}`, changes);
      setFlash('User updated.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update the user.'));
    }
  };

  const openDialog = (next) => {
    setDialog(next);
    setDialogError('');
    setForm(next.type === 'create' ? { first_name: '', last_name: '', email: '', password: '', role: 'nurse' } : { new_password: '' });
  };

  // Submit either the "add user" or the "reset password" dialog
  const submitDialog = async (e) => {
    e.preventDefault();
    setSaving(true);
    setDialogError('');
    try {
      if (dialog.type === 'create') {
        const { data } = await api.post('/api/users', form);
        setFlash(data.message);
      } else {
        const { data } = await api.post(`/api/users/${dialog.target.id}/reset-password`, form);
        setFlash(data.message);
      }
      setDialog(null);
      await load();
    } catch (err) {
      setDialogError(getErrorMessage(err, 'Unable to save.'));
    } finally {
      setSaving(false);
    }
  };

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Accounts at {user.institution_name}. Inactive accounts cannot sign in.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => openDialog({ type: 'create' })}>
          <UserPlus size={16} /> Add user
        </button>
      </div>

      {flash && <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>}
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <section className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === user.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                          {initials(u.first_name, u.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.first_name} {u.last_name}{isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        aria-label={`Role for ${u.first_name} ${u.last_name}`}
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => patchUser(u, { role: e.target.value })}
                        className="input !w-auto !py-1.5"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => openDialog({ type: 'reset', target: u })}>
                          <KeyRound size={14} /> Reset password
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            className={u.is_active ? 'btn-danger !px-3 !py-1.5 !text-xs' : 'btn-primary !px-3 !py-1.5 !text-xs'}
                            onClick={() => patchUser(u, { is_active: !u.is_active })}
                          >
                            {u.is_active ? 'Deactivate' : 'Approve / activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {dialog && (
        <Modal title={dialog.type === 'create' ? 'Add a user' : `Reset password for ${dialog.target.first_name}`} onClose={() => setDialog(null)}>
          <form onSubmit={submitDialog} className="space-y-4">
            {dialogError && <Alert>{dialogError}</Alert>}
            {dialog.type === 'create' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="u_first" className="label">First name</label>
                    <input id="u_first" required value={form.first_name} onChange={update('first_name')} className="input" />
                  </div>
                  <div>
                    <label htmlFor="u_last" className="label">Last name</label>
                    <input id="u_last" required value={form.last_name} onChange={update('last_name')} className="input" />
                  </div>
                </div>
                <div>
                  <label htmlFor="u_email" className="label">Email</label>
                  <input id="u_email" type="email" required value={form.email} onChange={update('email')} className="input" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="u_role" className="label">Role</label>
                    <select id="u_role" value={form.role} onChange={update('role')} className="input">
                      {ROLES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="u_pw" className="label">Temporary password</label>
                    <input id="u_pw" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={update('password')} className="input" />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="u_newpw" className="label">New password</label>
                <input id="u_newpw" type="password" required minLength={8} autoComplete="new-password" value={form.new_password} onChange={update('new_password')} placeholder="At least 8 characters" className="input" />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setDialog(null)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {dialog.type === 'create' ? 'Create user' : 'Reset password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
