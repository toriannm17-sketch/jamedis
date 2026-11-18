import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, FileClock, ServerCog, UserPlus, RefreshCw, ShieldCheck, ScrollText,
  CalendarCheck, HeartPulse, Pill, UserCog,
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import PatientTable from '../components/PatientTable.jsx';
import { formatDateTime } from '../utils.js';

// One number card
function StatCard({ icon: Icon, label, value, hint, tone = 'brand', to }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  const body = (
    <div className="card h-full p-5 transition hover:border-slate-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Dashboard({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isClinical = ['doctor', 'nurse'].includes(user?.role);

  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logScope, setLogScope] = useState('self');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(location.state?.flash || '');

  // Load stats, recent patients and recent activity together
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p, l] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/patients'),
        api.get('/api/audit-logs?limit=10'),
      ]);
      setStats(s.data);
      setPatients(p.data);
      setLogs(l.data.logs);
      setLogScope(l.data.scope);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load the dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Clear the flash message from history state so it does not reappear on refresh
  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const v = (n) => (loading || !stats ? '...' : n ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.first_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Here is what is happening at {user?.institution_name || 'your institution'} today.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={load} className="btn-secondary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/check-in" className="btn-primary">
            <UserPlus size={16} />
            Check in patient
          </Link>
        </div>
      </div>

      {flash && <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>}
      {error && <Alert>{error}</Alert>}

      {/* Stats: the cards depend on the signed-in role */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key figures">
        <StatCard icon={Users} label="Total patients" value={v(stats?.total_patients)} hint="Records your institution can access" to="/patients" />
        <StatCard icon={CalendarCheck} label="Checked in today" value={v(stats?.checked_in_today)} hint="New check-ins since midnight" tone="emerald" />
        {stats?.pending_referrals !== undefined && (
          <StatCard icon={FileClock} label="Pending referrals" value={v(stats.pending_referrals)} hint="Waiting for your answer" tone="amber" to="/referrals" />
        )}
        {isClinical && (
          <>
            <StatCard icon={HeartPulse} label="Critical patients" value={v(stats?.critical_patients)} hint="Flagged with a critical illness" tone="red" />
            <StatCard icon={Pill} label="Active prescriptions" value={v(stats?.active_prescriptions)} hint="Across your patients" />
          </>
        )}
        {user?.role === 'admin' && (
          <StatCard
            icon={UserCog}
            label="Staff accounts"
            value={v(stats?.total_users)}
            hint={stats?.inactive_users ? `${stats.inactive_users} inactive or awaiting approval` : 'All accounts active'}
            tone={stats?.inactive_users ? 'amber' : 'brand'}
            to="/users"
          />
        )}
        {/* Recent patients 
        <StatCard
          icon={ServerCog}
          label="System status"
          value={loading ? 'Checking' : error ? 'Degraded' : 'Operational'}
          hint={error ? 'Some services are not responding' : 'API and database responding'}
          tone={loading ? 'brand' : error ? 'red' : 'emerald'}
        />*/}
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        {/* Recent patients */}
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-900">Recent check-ins</h2>
            <Link to="/patients" className="text-sm font-medium text-brand-700 hover:text-brand-800">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : (
            <PatientTable
              patients={patients.slice(0, 6)}
              emptyTitle="No patients yet"
              emptyHint="Check in your first patient to see them here."
            />
          )}
        </section>

        {/* Activity: whole institution for admins, own actions for everyone else */}
        <section className="card">
          <div className="flex items-center gap-2.5 border-b border-slate-200 p-5">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">{logScope === 'institution' ? 'Audit log' : 'My recent activity'}</h2>
            {logScope === 'institution' && <Link to="/audit" className="ml-auto text-xs font-medium text-brand-700">See all</Link>}
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <ScrollText size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <p className="break-words text-sm font-medium text-slate-800">{log.action}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {log.user_name || 'Anonymous'}
                    {log.patient_id ? ` · Patient #${log.patient_id}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">{formatDateTime(log.timestamp)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
