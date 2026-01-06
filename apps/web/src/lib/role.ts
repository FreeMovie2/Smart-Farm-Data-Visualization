export type UserRole = 'owner' | 'operator' | 'admin';

const KEY = 'sfvd.role';

export function getStoredRole(): UserRole {
  if (typeof window === 'undefined') return 'operator';
  const raw = window.localStorage.getItem(KEY);
  if (raw === 'owner' || raw === 'operator' || raw === 'admin') return raw;
  return 'operator';
}

export function setStoredRole(role: UserRole) {
  window.localStorage.setItem(KEY, role);
}

