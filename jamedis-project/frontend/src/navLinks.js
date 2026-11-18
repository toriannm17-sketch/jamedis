import { LayoutDashboard, Users, UserPlus, Send, UserCog, ScrollText, Settings } from 'lucide-react';

// One list drives both the sidebar and the mobile menu. `roles` limits who sees a link.
export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/check-in', label: 'Check in patient', icon: UserPlus },
  { to: '/referrals', label: 'Referrals', icon: Send, roles: ['doctor', 'nurse', 'admin'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/audit', label: 'Audit log', icon: ScrollText, roles: ['admin'] },
  { to: '/account', label: 'My account', icon: Settings },
];

export const linksForRole = (role) => NAV_LINKS.filter((l) => !l.roles || l.roles.includes(role));
