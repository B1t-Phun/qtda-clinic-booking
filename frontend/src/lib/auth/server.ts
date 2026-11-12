import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@/types/auth';
import { isRole, ROLE_HOME } from './policy';
import { ADMIN_SESSION_COOKIE, REMEMBER_COOKIE, SESSION_COOKIE, cookieSecurity, isAuthCookie, isPkceCookie, isSessionCookie, sessionCookieOptions } from './cookies';
export { SESSION_COOKIE, cookieSecurity } from './cookies';

export async function createServerSupabase(writable = false, remember?: boolean) {
  await connection();
  const jar = await cookies();
  const persistent = !jar.get(ADMIN_SESSION_COOKIE)?.value && (remember ?? jar.get(REMEMBER_COOKIE)?.value === '1');
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { ...cookieSecurity, name: SESSION_COOKIE },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          if (!writable) return; // Proxy refreshes sessions before Server Components render.
          for (const { name, value, options } of items) {
            jar.set(name, value, sessionCookieOptions(options, persistent));
          }
        },
      },
    },
  );
}

export async function verifiedUser(client: Awaited<ReturnType<typeof createServerSupabase>>) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error && ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError')) throw error;
  return !error && user?.email && user.email_confirmed_at ? user : null;
}

type ServerClient = Awaited<ReturnType<typeof createServerSupabase>>;
export type AuthState = { user: AuthUser | null; needsMfa: boolean; needsReauthentication?: boolean };

export async function readIdentity(client: ServerClient, options: { adminSession?: string } = {}): Promise<AuthState> {
  const user = await verifiedUser(client);
  if (!user) return { user: null, needsMfa: false };
  const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) throw aalError;
  if (user.factors?.some((factor) => factor.status === 'verified') && aal.currentLevel !== 'aal2') return { user: null, needsMfa: true };
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,email,full_name,role,phone').eq('id', user.id).single();
  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile || !isRole(profile.role)) return { user: null, needsMfa: false };
  if (profile.role === 'doctor') {
    const { data: doctor, error: doctorError } = await client.from('doctors')
      .select('id').eq('profile_id', user.id).eq('is_active', true).maybeSingle();
    if (doctorError) throw doctorError;
    if (!doctor) return { user: null, needsMfa: false };
  }
  if (profile.role === 'admin') {
    const sessionId = await authSessionId(client);
    const marker = options.adminSession ?? (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    if (!sessionId || marker !== sessionId) return { user: null, needsMfa: false, needsReauthentication: true };
  }
  return { needsMfa: false, user: {
    id: user.id, email: user.email || '', fullName: profile.full_name,
    role: profile.role, phone: profile.phone || undefined,
  } satisfies AuthUser };
}

export async function requireRole(role: UserRole) {
  const { user, needsMfa } = await readIdentity(await createServerSupabase());
  if (needsMfa) redirect('/auth/mfa');
  if (!user) redirect(role === 'admin' ? '/login?reauth=admin' : '/login');
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

// Claims come from the SDK verifier, never from an unverified cookie/JWT payload.
async function authSessionId(client: ServerClient) {
  const { data, error } = await client.auth.getClaims();
  if (error) throw error;
  const sessionId = data?.claims.session_id;
  return typeof sessionId === 'string' && /^[a-f0-9-]{36}$/i.test(sessionId) ? sessionId : null;
}

// This marker is a browser-lifetime gate bound to an authenticated Supabase session.
// It never grants a role; getUser, profiles and MFA remain authoritative.
export async function authorizePasswordSession(client: ServerClient) {
  const sessionId = await authSessionId(client);
  if (!sessionId) throw new Error('Missing authenticated session id');
  (await cookies()).set(ADMIN_SESSION_COOKIE, sessionId, cookieSecurity);
}

export async function persistAuthenticatedSession(user: AuthUser, remember: boolean) {
  const jar = await cookies();
  const persistent = user.role !== 'admin' && remember;
  for (const cookie of jar.getAll()) {
    if (isSessionCookie(cookie.name) && cookie.value) {
      jar.set(cookie.name, cookie.value, sessionCookieOptions({}, persistent));
    }
  }
  jar.set(REMEMBER_COOKIE, persistent ? '1' : '0', sessionCookieOptions({}, persistent));
  if (user.role !== 'admin') jar.set(ADMIN_SESSION_COOKIE, '', { ...cookieSecurity, maxAge: 0 });
}

export async function clearSessionCookies({ preservePkce = false }: { preservePkce?: boolean } = {}) {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (isAuthCookie(cookie.name) && !(preservePkce && isPkceCookie(cookie.name))) {
      jar.set(cookie.name, '', { ...cookieSecurity, maxAge: 0 });
    }
  }
}
