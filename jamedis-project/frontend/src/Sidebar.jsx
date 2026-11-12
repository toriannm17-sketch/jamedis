import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, UserPlus, ShieldCheck } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/check-in', label: 'Check in patient', icon: UserPlus },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-900 text-brand-100 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <Activity size={22} className="text-brand-200" />
        </div>
        <span className="text-lg font-bold tracking-wide text-white">JAMEDIS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/15 text-white' : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 flex items-start gap-3 rounded-lg bg-white/10 p-3 text-xs leading-relaxed text-brand-100/90">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-200" />
        <p>Every action is recorded in the audit log. Only access records you need for patient care.</p>
      </div>
    </aside>
  );
}
