import { useEffect, useState } from 'react';
import { Activity, LogOut, ShieldAlert, Pill, Syringe, HeartPulse, ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import { formatDate } from '../utils.js';

// One card of the health summary (like the categories in a phone health app)
function Section({ icon: Icon, title, tone, items, render }) {
  const tones = {
    red: 'bg-red-50 text-red-700',
    brand: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} />
        </div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="ml-auto text-xs text-slate-400">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing shared yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3.5">{render(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The patient's own page: read-only, and only items their doctor has approved.
export default function PortalHome({ patient, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/portal/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load your health record.')));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-wide text-brand-900">JAMEDIS</span>
          </div>
          <button type="button" onClick={onLogout} className="btn-secondary !px-3 !py-2">
            <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Health records</h1>
          <p className="mt-1 text-sm text-slate-500">{patient.name}</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>You only see the information your doctor has chosen to share with you. This page is read-only.</p>
        </div>

        {error && <Alert>{error}</Alert>}

        {!summary && !error && (
          <div className="space-y-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        )}

        {summary && (
          <div className="space-y-5">
            <Section
              icon={ShieldAlert} title="Allergies" tone="red" items={summary.allergies}
              render={(a) => (
                <>
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  {a.detail && <p className="text-sm text-slate-600">{a.detail}</p>}
                </>
              )}
            />
            <Section
              icon={Pill} title="Medications" tone="brand" items={summary.medications}
              render={(m) => (
                <>
                  <p className="text-sm font-semibold text-slate-900">{m.medication_name}</p>
                  <p className="text-sm text-slate-600">{m.dosage}</p>
                  <p className="text-xs text-slate-400">Prescribed by {m.doctor_name}</p>
                </>
              )}
            />
            <Section
              icon={Syringe} title="Immunizations" tone="emerald" items={summary.immunizations}
              render={(i) => (
                <>
                  <p className="text-sm font-semibold text-slate-900">{i.title}</p>
                  <p className="text-sm text-slate-600">
                    {[i.detail, i.recorded_on && formatDate(i.recorded_on)].filter(Boolean).join(' · ')}
                  </p>
                </>
              )}
            />
            <Section
              icon={HeartPulse} title="Conditions" tone="amber" items={summary.conditions}
              render={(c) => (
                <>
                  <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                  <p className="text-sm text-slate-600">
                    {[c.detail, c.recorded_on && formatDate(c.recorded_on)].filter(Boolean).join(' · ')}
                  </p>
                </>
              )}
            />
          </div>
        )}
      </main>
    </div>
  );
}
