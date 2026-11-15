import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { readIdentity } from '@/lib/auth/server';
import { ADMIN_SESSION_COOKIE, REMEMBER_COOKIE, SESSION_COOKIE, cookieSecurity, isAuthCookie, sessionCookieOptions } from '@/lib/auth/cookies';
import { roleForPath, ROLE_HOME, safeDestination } from '@/lib/auth/policy';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { ...cookieSecurity, name: SESSION_COOKIE },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items, headers) => {
          for (const { name, value } of items) request.cookies.set(name, value);
          const previous = response;
          response = NextResponse.next({ request });
          for (const cookie of previous.cookies.getAll()) response.cookies.set(cookie);
          const remember = !request.cookies.get(ADMIN_SESSION_COOKIE)?.value && request.cookies.get(REMEMBER_COOKIE)?.value === '1';
          for (const { name, value, options } of items) response.cookies.set(name, value, sessionCookieOptions(options, remember));
          for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
        },
      },
    },
  );
  const pathname = request.nextUrl.pathname;
  const required = roleForPath(pathname);
  let state;
  try { state = await readIdentity(client, { adminSession: request.cookies.get(ADMIN_SESSION_COOKIE)?.value || '' }); }
  catch { return new NextResponse('Dịch vụ xác thực tạm thời không khả dụng.', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  const { user, needsMfa, needsReauthentication } = state;
  let destination: string | null = null;
  const adminEntry = (pathname === '/' || pathname === '/login') && user?.role === 'admin';
  if (needsReauthentication || adminEntry) {
    // Entering the site/login always asks administrators for fresh credentials.
    // Clearing only this browser does not log out other devices.
    for (const cookie of request.cookies.getAll()) {
      if (isAuthCookie(cookie.name)) response.cookies.set(cookie.name, '', { ...cookieSecurity, maxAge: 0 });
    }
    if (pathname !== '/login') destination = '/login?reauth=admin';
  } else if (needsMfa) destination = '/auth/mfa?next=' + encodeURIComponent(pathname + request.nextUrl.search);
  else if (pathname === '/') destination = user ? ROLE_HOME[user.role] : '/login';
  else if ((required || pathname.startsWith('/account/')) && !user) destination = '/login?next=' + encodeURIComponent(pathname + request.nextUrl.search);
  else if (required && user && user.role !== required) destination = ROLE_HOME[user.role];
  else if (user && ['/login', '/register'].includes(pathname)) destination = safeDestination(request.nextUrl.searchParams.get('next'), user.role);
  if (destination) {
    const redirected = NextResponse.redirect(new URL(destination, request.url));
    for (const cookie of response.cookies.getAll()) redirected.cookies.set(cookie);
    response = redirected;
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/', '/admin/:path*', '/doctor/:path*', '/client/:path*', '/login', '/register', '/account/:path*'] };
