// Small formatting helpers shared by several pages.

export const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString('en-JM', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-JM', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const calcAge = (dob) => {
  const birth = new Date(`${String(dob).slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

// 123456789 -> 123-456-789
export const formatTrn = (trn) => String(trn).replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');

export const roleLabel = (role) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : '');

export const initials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
