import { NavLink } from 'react-router-dom';
import { LogOut, UserCircle2, Building2, LayoutDashboard, UserPlus } from 'lucide-react';

const roleLabel = (role) => role.charAt(0).toUpperCase() + role.slice(1);

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        {/* Mobile navigation (sidebar is hidden below lg) */}
        <nav className="flex items-center gap-1 lg:hidden">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg p-2 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`
            }
            aria-label="Dashboard"
          >
            <LayoutDashboard size={20} />
          </NavLink>
          <NavLink
            to="/check-in"
            className={({ isActive }) =>
              `rounded-lg p-2 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500'}`
            }
            aria-label="Check in patient"
          >
            <UserPlus size={20} />
          </NavLink>
        </nav>

        <div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex">
          <Building2 size={16} />
          <span>{user.institution_name || 'Your institution'}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <UserCircle2 size={30} className="text-brand-600" />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="btn-secondary !px-3 !py-2">
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
