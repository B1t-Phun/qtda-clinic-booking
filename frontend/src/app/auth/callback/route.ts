import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabase, readIdentity, clearSessionCookies, cookieSecurity, persistAuthenticatedSession } from '@/lib/auth/server';
import { appOrigin } from '@/lib/auth/http';
import { REMEMBER_COOKIE } from '@/lib/auth/cookies';
import { safeDestination, validTokenHash, validAuthCode } from '@/lib/auth/policy';
import { emailLinkError } from '@/lib/auth/email-link';

export async function GET(request: Request) {
  const jar = await cookies();
  const origin = appOrigin(request);
  const url = new URL(request.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), { headers: { 'Cache-Control': 'private, no-store' } });
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || jar.get('cliniccare-next')?.value;
  // Leave token verification to an explicit POST so email scanners cannot consume it.
  if (tokenHash) {
    if (!validTokenHash(tokenHash) || !['email', 'signup', 'invite', 'magiclink', 'email_change', 'recovery'].includes(type || '')) {
      return go('/magic-link?error=email_invalid');
    }
    const target = new URL(type === 'recovery' ? '/reset-password' : '/auth/confirm', origin);
    target.searchParams.set('token_hash', tokenHash);
    if (type !== 'recovery') target.searchParams.set('type', type!);
    if (next) target.searchParams.set('next', next.slice(0, 2048));
    return go(target.pathname + target.search);
  }
  if (url.searchParams.has('error')) {
    const errorCode = emailLinkError({ code: url.searchParams.get('error_code') });
    return go('/magic-link?error=' + errorCode);
  }
  if (!code || code.length > 2048) return go('/magic-link?error=email_invalid');
  const flowId = url.searchParams.get('sb_flow_id');
  if (flowId !== null && !/^[A-Za-z0-9_-]{8,64}$/.test(flowId)) return go('/magic-link?error=email_invalid');
  if (type === 'recovery') {
    if (!validAuthCode(code)) return go('/forgot-password?error=email_invalid');
    const target = new URL('/reset-password', origin);
    target.searchParams.set('code', code);
    if (flowId) target.searchParams.set('sb_flow_id', flowId);
    return go(target.pathname + target.search);
  }
  const client = await createServerSupabase(true, false);
  let exchanged = false;
  try {
    const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error) return go('/magic-link?error=' + emailLinkError(error));
    exchanged = true;
    const { user, needsMfa, needsReauthentication } = await readIdentity(client);
    jar.set('cliniccare-next', '', { ...cookieSecurity, maxAge: 0 });
    if (needsReauthentication) {
      await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
      return go('/login?reauth=admin');
    }
    if (needsMfa) return go('/auth/mfa?next=' + encodeURIComponent(next || ''));
    if (!user) {
      await client.auth.signOut({ scope: 'local' }); await clearSessionCookies();
      return go('/login?error=email_account');
    }
    await persistAuthenticatedSession(user, jar.get(REMEMBER_COOKIE)?.value === '1');
    return go(safeDestination(next, user.role));
  } catch (error) {
    if (exchanged) {
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      await clearSessionCookies();
    }
    return go(exchanged ? '/login?error=email_account' : '/magic-link?error=' + emailLinkError(error));
  }
}
