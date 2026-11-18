import { Link } from 'react-router-dom';
import { Users, BadgeCheck, BadgeAlert, HeartPulse } from 'lucide-react';
import { formatDate, calcAge, formatTrn, initials } from '../utils.js';

// Reusable patient list. Each row opens that patient's record.
export default function PatientTable({ patients, emptyTitle, emptyHint }) {
  if (patients.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <Users size={32} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">{emptyTitle}</p>
        {emptyHint && <p className="mt-1 text-sm text-slate-500">{emptyHint}</p>}
      </div>
    );
  }

  return (
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
          {patients.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-5 py-3.5">
                <Link to={`/patients/${p.id}`} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(p.first_name, p.last_name)}
                  </div>
                  <span className="font-medium text-slate-900 hover:text-brand-700">
                    {p.first_name} {p.last_name}
                  </span>
                  {p.has_critical_illness && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      <HeartPulse size={12} /> Critical
                    </span>
                  )}
                </Link>
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
  );
}
