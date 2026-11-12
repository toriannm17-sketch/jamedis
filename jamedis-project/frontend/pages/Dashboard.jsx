import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  FileClock,
  ServerCog,
  UserPlus,
  Search,
  RefreshCw,
  ShieldCheck,
  BadgeCheck,
  BadgeAlert,
  CheckCircle2,
  AlertCircle,
  X,
  ScrollText,
} from 'lucide-react';
import api, { getErrorMessage } from '../api.js';

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-JM', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const calcAge = (dob) => {
  const birth = new Date(`${String(dob).slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

const formatTrn = (trn) => String(trn).replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');

function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
}

export default function Dashboard({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');

  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState(location.state?.flash || '');

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      const { data } = await api.get('/api/patients');
      setPatients(data);
    } catch (err) {
      setPatientsError(getErrorMessage(err, 'Unable to load patients.'));
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const { data } = await api.get('/api/audit-logs');
      setLogs(data);
    } catch (err) {
      setLogsError(getErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const refreshAll = () => {
    loadPatients();
    loadLogs();
  };

  useEffect(() => {
    loadPatients();
    loadLogs();
  }, [loadPatients, loadLogs]);

  // Clear the flash message from history state so it does not reappear on refresh.
  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(''), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || String(p.trn).includes(q.replace(/-/g, ''))
    );
  }, [patients, search]);

  const systemOnline = !patientsError && !logsError;
  const systemChecking = patientsLoading && logsLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.first_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Here is what is happening at your institution today.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={refreshAll} className="btn-secondary">
            <RefreshCw size={16} className={patientsLoading || logsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/check-in" className="btn-primary">
            <UserPlus size={16} />
            Check in patient
          </Link>
        </div>
      </div>

      {flash && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {flash}
          </span>
          <button type="button" onClick={() => setFlash('')} aria-label="Dismiss message" className="text-emerald-700 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key figures">
        <StatCard
          icon={Users}
          label="Total patients"
          value={patientsLoading ? '...' : patients.length}
          hint="Patient records in the system"
        />
        <StatCard
          icon={FileClock}
          label="Pending referrals"
          value="4"
          hint="Sample figure: referrals are not built yet"
          tone="amber"
        />
        <StatCard
          icon={ServerCog}
          label="System status"
          value={systemChecking ? 'Checking' : systemOnline ? 'Operational' : 'Degraded'}
          hint={systemOnline ? 'API and database responding' : 'Some services are not responding'}
          tone={systemChecking ? 'brand' : systemOnline ? 'emerald' : 'red'}
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        {/* Patient table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900">Patients</h2>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or TRN"
                aria-label="Search patients"
                className="input py-2 pl-9"
              />
            </div>
          </div>

          {patientsError ? (
            <div role="alert" className="m-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{patientsError}</span>
            </div>
          ) : patientsLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Users size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {patients.length === 0 ? 'No patients yet' : 'No patients match your search'}
              </p>
              {patients.length === 0 && (
                <p className="mt-1 text-sm text-slate-500">Check in your first patient to see them here.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">TRN</th>
                    <th className="px-5 py-3">Date of birth</th>
                    <th className="px-5 py-3">Photo ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                            {p.first_name[0]}
                            {p.last_name[0]}
                          </div>
                          <span className="font-medium text-slate-900">
                            {p.first_name} {p.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-600">{formatTrn(p.trn)}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(p.date_of_birth)}
                        <span className="ml-1.5 text-xs text-slate-400">({calcAge(p.date_of_birth)} yrs)</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.is_photo_verified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <BadgeCheck size={14} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <BadgeAlert size={14} /> Not verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Audit log widget */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-200 p-5">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Audit log</h2>
            <span className="ml-auto text-xs text-slate-400">Latest 20</span>
          </div>

          {logsError ? (
            <div role="alert" className="m-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{logsError}</span>
            </div>
          ) : logsLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <ScrollText size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <p className="break-words text-sm font-medium text-slate-800">{log.action}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {log.user_name || 'Anonymous'}
                    {log.patient_id ? ` · Patient #${log.patient_id}` : ''}
                    {log.ip_address ? ` · ${log.ip_address}` : ''}
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
