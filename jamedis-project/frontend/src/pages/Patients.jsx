import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import PatientTable from '../components/PatientTable.jsx';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | unverified | critical

  useEffect(() => {
    api
      .get('/api/patients')
      .then(({ data }) => setPatients(data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load patients.')))
      .finally(() => setLoading(false));
  }, []);

  // Apply the search box and the filter buttons
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter === 'unverified' && p.is_photo_verified) return false;
      if (filter === 'critical' && !p.has_critical_illness) return false;
      if (!q) return true;
      return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || String(p.trn).includes(q.replace(/-/g, ''));
    });
  }, [patients, search, filter]);

  const hasCritical = patients.some((p) => p.has_critical_illness);
  const chips = [
    ['all', 'All'],
    ['unverified', 'Photo ID not verified'],
    ...(hasCritical ? [['critical', 'Critical illness']] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">Patients checked in at your institution.</p>
        </div>
        <Link to="/check-in" className="btn-primary"><UserPlus size={16} /> Check in patient</Link>
      </div>

      <section className="card">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
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

        {error ? (
          <div className="p-5"><Alert>{error}</Alert></div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : (
          <PatientTable
            patients={visible}
            emptyTitle={patients.length === 0 ? 'No patients yet' : 'No patients match your search'}
            emptyHint={patients.length === 0 ? 'Check in your first patient to see them here.' : undefined}
          />
        )}
      </section>
    </div>
  );
}
