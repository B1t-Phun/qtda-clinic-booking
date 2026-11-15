import type { CookieOptions } from '@supabase/ssr';

export const SESSION_COOKIE = 'cliniccare-session';
export const REMEMBER_COOKIE = 'cliniccare-remember';
export const ADMIN_SESSION_COOKIE = 'cliniccare-admin-session';
export const REMEMBER_SECONDS = 60 * 60 * 24 * 7;
export const cookieSecurity = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/',
};

export function isSessionCookie(name: string) {
  return name === SESSION_COOKIE || /^cliniccare-session\.\d+$/.test(name);
}

export function isPkceCookie(name: string) {
  return /^cliniccare-session(?:-flow-[A-Za-z0-9_-]{8,64}|-flows)?-code-verifier(?:\.\d+)?$/.test(name);
}

export function isAuthCookie(name: string) {
  return isSessionCookie(name) || isPkceCookie(name) ||
    [REMEMBER_COOKIE, ADMIN_SESSION_COOKIE, 'cliniccare-next'].includes(name);
}

export function sessionCookieOptions(options: CookieOptions = {}, remember = false): CookieOptions {
  const settings = { ...options, ...cookieSecurity };
  // Cookie deletion must survive both persistent and browser-session modes.
  if (options.maxAge === 0) return settings;
  delete settings.expires;
  if (remember) settings.maxAge = REMEMBER_SECONDS;
  else delete settings.maxAge;
  return settings;
}
