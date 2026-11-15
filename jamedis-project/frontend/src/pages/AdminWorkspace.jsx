import { useEffect, useState } from 'react';
import { Shield, Users, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const ROLES = ['admin', 'doctor', 'nurse', 'staff', 'pharmacist'];

const roleBadgeStyles = {
  admin: 'bg-purple-50 text-purple-700',
  doctor: 'bg-brand-50 text-brand-700',
  nurse: 'bg-emerald-50 text-emerald-700',
  pharmacist: 'bg-amber-50 text-amber-700',
  staff: 'bg-slate-100 text-slate-700',
};

export default function AdminWorkspace({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/users');
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load operator accounts.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (targetUserId, newRole) => {
    setError('');
    setFlash('');
    try {
      const { data } = await api.patch(`/api/admin/users/${targetUserId}/role`, { role: newRole });
      setFlash(data.message);
      setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update user permissions.'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">System IAM &amp; Access Matrix</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage healthcare operator credentials and role permissions across participating Jamaican institutions.
        </p>
      </div>

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

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-6 py-4">
          <Shield size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-slate-900">Registered System Operators ({users.length})</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading operator accounts...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            <Users size={30} className="mx-auto mb-2 text-slate-300" />
            No registered operators found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Operator</th>
                  <th className="px-6 py-3">Institution</th>
                  <th className="px-6 py-3">Current Role</th>
                  <th className="px-6 py-3">Assign IAM Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-900">
                        {op.first_name} {op.last_name}
                        {op.id === user?.id && <span className="ml-2 text-xs text-slate-400">(You)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{op.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        {op.institution_name}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyles[op.role] || 'bg-slate-100 text-slate-700'}`}>
                        {op.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <select
                        aria-label={`Change role for ${op.first_name} ${op.last_name}`}
                        value={op.role}
                        disabled={op.id === user?.id}
                        onChange={(e) => handleRoleChange(op.id, e.target.value)}
                        className="input !py-1.5 !text-xs max-w-[160px] capitalize"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
