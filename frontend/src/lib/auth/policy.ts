import type { UserRole } from '@/types/auth';

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin', doctor: '/doctor', patient: '/client',
};
export const PASSWORD_HINT = 'Mật khẩu từ 12–128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';

export function isRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'doctor' || value === 'patient';
}

export function roleForPath(path: string): UserRole | null {
  for (const role of Object.keys(ROLE_HOME) as UserRole[]) {
    const home = ROLE_HOME[role];
    if (path === home || path.startsWith(home + '/')) return role;
  }
  return null;
}

export function safeDestination(value: unknown, role: UserRole): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\u0000-\u0020\u007f%#]/.test(value)) return ROLE_HOME[role];
  try {
    const url = new URL(value, 'https://clinic.invalid');
    if (url.origin !== 'https://clinic.invalid' || (roleForPath(url.pathname) !== role && url.pathname !== '/account/security')) return ROLE_HOME[role];
    return url.pathname + url.search;
  } catch { return ROLE_HOME[role]; }
}

export function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128 &&
    /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\d/.test(value) && /[^\p{L}\p{N}\s]/u.test(value);
}

export function validTokenHash(value: unknown): value is string {
  // Supabase Auth uses SHA-224 email hashes, with a pkce_ prefix for PKCE flows.
  return typeof value === 'string' && /^(?:pkce_)?(?:[a-f0-9]{56}|[a-f0-9]{64})$/i.test(value);
}

// The HTTP boundary also limits operations before Postgres applies row ownership.
export function canAccessData(role: UserRole, resource: string, method: string): boolean {
  const read = method === 'GET' || method === 'HEAD';
  if (resource === 'rpc/admin_set_user_role') return role === 'admin' && method === 'POST';
  if (!['profiles', 'specialties', 'doctors', 'time_slots', 'appointments'].includes(resource)) return false;
  if (role === 'admin' || read) return true;
  if (resource === 'profiles') return method === 'PATCH';
  if (resource === 'appointments') return method === 'PATCH' || (role === 'patient' && method === 'POST');
  if (role === 'doctor' && resource === 'doctors') return method === 'PATCH';
  return role === 'doctor' && resource === 'time_slots' && ['POST', 'PATCH', 'DELETE'].includes(method);
}

export function validAuthCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._~-]{1,2048}$/.test(value);
}
