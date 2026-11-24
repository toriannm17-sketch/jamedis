import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import { formatDateTime } from '../utils.js';

const PAGE_SIZE = 25;

// Full audit trail for the administrator's institution, 25 rows at a time.
export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/audit-logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load the audit log.'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">Every sensitive action by staff at your institution. {total} entries.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={load}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">IP address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDateTime(l.timestamp)}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{l.user_name || 'Unknown'}</td>
                <td className="break-all px-5 py-3 text-slate-700">{l.action}</td>
                <td className="px-5 py-3 text-slate-600">{l.patient_id ? `#${l.patient_id}` : '-'}</td>
                <td className="px-5 py-3 text-slate-500">{l.ip_address || '-'}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-500">No activity recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !px-3 !py-2" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} /> Previous
          </button>
          <button type="button" className="btn-secondary !px-3 !py-2" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
