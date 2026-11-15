/* eslint-disable @typescript-eslint/no-require-imports -- Tests execute directly in Node.js CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');

function loadTs(relative, imports = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(source, {
    module: loadedModule, exports: loadedModule.exports, require: (name) => {
      if (name in imports) return imports[name];
      if (name === 'server-only') return {};
      throw new Error('Unexpected import ' + name);
    },
    URL, Response, Request, Headers, Buffer, process, AbortSignal, ...globals,
  }, { filename });
  return loadedModule.exports;
}
const policy = loadTs('src/lib/auth/policy.ts');
const cookiePolicy = loadTs('src/lib/auth/cookies.ts');
const sessionId = 'df24b2cb-5130-4b9e-8dc0-62ab47d8e081';
function cookieJar(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    get: (name) => values.has(name) ? { name, value: values.get(name) } : undefined,
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    set(name, value, options = {}) {
      writes.push({ name, value, ...options });
      if (options.maxAge === 0) values.delete(name); else values.set(name, value);
    },
  };
}
function loadServer(jar = cookieJar()) {
  return loadTs('src/lib/auth/server.ts', {
    '@supabase/ssr': {}, 'next/headers': { cookies: async () => jar }, 'next/server': { connection: async () => {} },
    'next/navigation': {}, './policy': policy, './cookies': cookiePolicy,
  });
}
const http = loadTs('src/lib/auth/http.ts', {
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
});
const user = { id: 'patient-id', email: 'patient@example.com', fullName: 'Patient', role: 'patient' };
function routeHarness(options = {}) {
  const calls = [];
  const jar = cookieJar({ 'cliniccare-session.0': 'test-access-and-refresh', ...(options.cookies || {}) });
  const server = loadServer(jar);
  let reads = 0;
  const client = {
    auth: {
      getClaims: async () => ({ data: { claims: { session_id: sessionId } }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: options.aal || { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
        listFactors: async () => ({ data: options.factors || { totp: [] }, error: null }),
        challengeAndVerify: async () => ({ error: null }),
      },
      signInWithPassword: async (body) => { calls.push(['login', body]); return { error: options.authError || null }; },
      resetPasswordForEmail: async () => ({ error: options.authError || null }),
      resend: async () => ({ error: options.authError || null }),
      signInWithOtp: async () => ({ error: options.authError || null }),
      signUp: async (body) => { calls.push(['register', body]); return { data: { session: null }, error: options.authError || null }; },
      signOut: async (body) => { calls.push(['logout', body]); return { error: null }; },
      exchangeCodeForSession: async (...args) => { calls.push(['exchange', ...args]); return { data: { redirectType: Object.hasOwn(options, 'recoveryType') ? options.recoveryType : 'recovery' }, error: null }; },
      verifyOtp: async (body) => { calls.push(['verify', body]); return { error: null }; },
      updateUser: async (body) => { calls.push(['update', body]); return { error: options.updateError || null }; },
    },
  };
  const handlers = loadTs('src/app/api/auth/[action]/route.ts', {
    'next/headers': { cookies: async () => jar },
    '@/lib/auth/server': {
      createServerSupabase: async () => client,
      readIdentity: async () => options.states ? options.states[Math.min(reads++, options.states.length - 1)] : options.state || { user, needsMfa: false },
      verifiedUser: async () => user,
      clearSessionCookies: async (settings) => { calls.push(['clear']); await server.clearSessionCookies(settings); },
      authorizePasswordSession: server.authorizePasswordSession,
      persistAuthenticatedSession: server.persistAuthenticatedSession,
      cookieSecurity: { httpOnly: true, sameSite: 'lax' },
    },
    '@/lib/auth/password-security': { assertPasswordNotLeaked: async () => {
      if (options.passwordError) throw new http.AuthHttpError(options.passwordError.status, options.passwordError.message);
    } },
    '@/lib/auth/http': http, '@/lib/auth/policy': policy, '@/lib/auth/cookies': cookiePolicy,
  }, { fetch: async () => Response.json(options.providerSettings || { external: {} }, { status: options.settingsStatus || 200 }) });
  return {
    calls, jar,
    async post(action, body, origin = 'http://localhost:3000') {
      return handlers.POST(new Request('http://localhost:3000/api/auth/' + action, {
        method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
      }), { params: Promise.resolve({ action }) });
    },
    async get(action) {
      return handlers.GET(new Request('http://localhost:3000/api/auth/' + action), { params: Promise.resolve({ action }) });
    },
  };
}
process.env.APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://clinic-test.supabase.co';
delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

test('every role is limited to its portal; redirect payloads cannot escape or cross roles', () => {
  for (const role of ['admin', 'doctor', 'patient']) {
    const home = policy.ROLE_HOME[role];
    assert.equal(policy.safeDestination(home + '/appointments?tab=all', role), home + '/appointments?tab=all');
    for (const attack of ['https://evil.example', '//evil.example', '/client/../../admin', '/admin%2f..', '/client\\evil', '/client\nheader', '/doctor-evil', '/admin?x=%0a']) {
      assert.equal(policy.safeDestination(attack, role), home);
    }
    for (const other of ['admin', 'doctor', 'patient'].filter((value) => value !== role)) {
      assert.equal(policy.safeDestination(policy.ROLE_HOME[other], role), home);
    }
  }
});
test('SQL metacharacters are data; object/operator input is rejected before Auth', async () => {
  const harness = routeHarness();
  assert.equal((await harness.post('login', { email: { $ne: null }, password: ['anything'] })).status, 400);
  assert.equal((await harness.post('login', { email: ["' OR 1=1 --"], password: 'x' })).status, 400);
  assert.equal(harness.calls.length, 0);
});
test('role mass assignment on registration is rejected', async () => {
  const harness = routeHarness();
  const response = await harness.post('register', { email: 'patient@example.com', password: 'StrongPass!234', role: 'admin' });
  assert.equal(response.status, 400);
  assert.equal(harness.calls.length, 0);
});
test('auth mutations reject cross-origin requests', async () => {
  const harness = routeHarness();
  assert.equal((await harness.post('login', { email: user.email, password: 'x' }, 'https://evil.example')).status, 403);
  assert.equal(harness.calls.length, 0);
});
test('successful login derives destination from server role', async () => {
  const harness = routeHarness();
  const response = await harness.post('login', { email: user.email, password: 'x', next: '/admin' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).redirect, '/client');
});
test('accounts with MFA cannot complete login at AAL1', async () => {
  const harness = routeHarness({ state: { user: null, needsMfa: true } });
  const response = await harness.post('login', { email: user.email, password: 'x', next: '/client/booking' });
  assert.match((await response.json()).redirect, /^\/auth\/mfa\?/);
});
test('Supabase throttling is returned as 429', async () => {
  const harness = routeHarness({ authError: { status: 429, code: 'over_request_rate_limit' } });
  assert.equal((await harness.post('login', { email: user.email, password: 'x' })).status, 429);
});
test('CAPTCHA site configuration requires a token before calling Supabase', async () => {
  process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = 'test-site';
  try {
    const harness = routeHarness();
    assert.equal((await harness.post('login', { email: user.email, password: 'x' })).status, 400);
    assert.equal(harness.calls.length, 0);
  } finally { delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY; }
});
test('CAPTCHA token is forwarded to Supabase for verification', async () => {
  const harness = routeHarness();
  await harness.post('login', { email: user.email, password: 'x', captchaToken: 'verified-widget-token' });
  assert.equal(harness.calls.find(([name]) => name === 'login')[1].options.captchaToken, 'verified-widget-token');
});
test('session endpoint returns identity without access/refresh tokens and disables caching', async () => {
  const response = await routeHarness().get('session');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.user.id, user.id);
  assert.equal('access_token' in body, false);
  assert.equal('refresh_token' in body, false);
});
test('recovery tokens cannot be exchanged through the normal confirmation endpoint', async () => {
  const harness = routeHarness();
  assert.equal((await harness.post('confirm', { tokenHash: 'a'.repeat(64), type: 'recovery' })).status, 400);
  assert.equal(harness.calls.length, 0);
});
test('password recovery verifies the token, updates password, revokes sessions and clears cookies', async () => {
  const harness = routeHarness();
  const response = await harness.post('reset-password', { tokenHash: 'a'.repeat(64), password: 'StrongPass!234', confirmPassword: 'StrongPass!234' });
  assert.equal(response.status, 200);
  assert.deepEqual(harness.calls.map(([name]) => name), ['clear', 'verify', 'update', 'logout', 'clear']);
  assert.equal(harness.calls[1][1].type, 'recovery');
  assert.equal(harness.calls[3][1].scope, 'global');
});
test('failed password recovery updates also clear the temporary recovery session', async () => {
  const harness = routeHarness({ updateError: { status: 422, code: 'weak_password' } });
  const response = await harness.post('reset-password', { tokenHash: 'a'.repeat(64), password: 'StrongPass!234', confirmPassword: 'StrongPass!234' });
  assert.equal(response.status, 400);
  assert.equal(harness.calls.at(-1)[0], 'clear');
});
test('password policy rejects short/common passwords and accepts a long mixed password', () => {
  assert.equal(policy.validPassword('password'), false);
  assert.equal(policy.validPassword('Password123'), false);
  assert.equal(policy.validPassword({ $regex: '.*' }), false);
  assert.equal(policy.validPassword('StrongPass!234'), true);
});

test('MFA enforcement uses fresh verified factors, even when cached session factors are missing', async () => {
  const server = loadServer();
  const state = await server.readIdentity({ auth: {
    getUser: async () => ({ data: { user: { ...user, email_confirmed_at: 'confirmed', factors: [{ status: 'verified' }] } }, error: null }),
    mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }) },
  }, from: () => assert.fail('must not read protected data before MFA') });
  assert.equal(state.needsMfa, true);
  assert.equal(state.user, null);
});


test('patient and doctor remember cookies last seven days; unchecked login uses browser-session cookies', async () => {
  for (const role of ['patient', 'doctor']) for (const remember of [false, true]) {
    const harness = routeHarness({ state: { user: { ...user, role }, needsMfa: false } });
    const response = await harness.post('login', { email: user.email, password: 'x', remember });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).redirect, policy.ROLE_HOME[role]);
    const authCookie = harness.jar.writes.findLast((cookie) => cookie.name === 'cliniccare-session.0');
    assert.equal(authCookie.maxAge, remember ? 604800 : undefined);
    assert.equal(authCookie.expires, undefined);
    assert.equal(authCookie.httpOnly, true);
    assert.equal(authCookie.sameSite, 'lax');
    assert.equal(harness.jar.get(cookiePolicy.ADMIN_SESSION_COOKIE), undefined);
  }
});

test('administrator login ignores remember, with a browser-only marker bound to the Supabase session', async () => {
  const harness = routeHarness({ state: { user: { ...user, role: 'admin' }, needsMfa: false } });
  const response = await harness.post('login', { email: user.email, password: 'x', remember: true });
  assert.equal((await response.json()).redirect, '/admin');
  for (const name of ['cliniccare-session.0', cookiePolicy.ADMIN_SESSION_COOKIE, cookiePolicy.REMEMBER_COOKIE]) {
    const cookie = harness.jar.writes.findLast((item) => item.name === name);
    assert.equal(cookie.maxAge, undefined);
    assert.equal(cookie.expires, undefined);
    assert.equal(cookie.httpOnly, true);
  }
  assert.equal(harness.jar.get(cookiePolicy.REMEMBER_COOKIE).value, '0');
  assert.equal(harness.jar.get(cookiePolicy.ADMIN_SESSION_COOKIE).value, sessionId);
});

test('MFA restores the requested persistence only after successful verification, including admin exception', async () => {
  for (const role of ['patient', 'doctor', 'admin']) {
    const harness = routeHarness({
      cookies: { [cookiePolicy.REMEMBER_COOKIE]: '1', [cookiePolicy.ADMIN_SESSION_COOKIE]: sessionId },
      states: [{ user: null, needsMfa: true }, { user: { ...user, role }, needsMfa: false }],
    });
    const response = await harness.post('mfa-verify', { factorId: sessionId, code: '123456', next: '/admin' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).redirect, policy.ROLE_HOME[role]);
    assert.equal(harness.jar.writes.findLast((item) => item.name === 'cliniccare-session.0').maxAge, role === 'admin' ? undefined : 604800);
  }
});

test('magic links cannot restore an admin portal without a password login', async () => {
  const harness = routeHarness({ state: { user: null, needsMfa: false, needsReauthentication: true } });
  const response = await harness.post('confirm', { tokenHash: 'a'.repeat(64), type: 'magiclink' });
  assert.equal((await response.json()).redirect, '/login?reauth=admin');
  assert.equal(harness.jar.get('cliniccare-session.0'), undefined);
});

test('cookie deletion survives remember mode and all auth chunks/markers are removed on logout', async () => {
  assert.equal(cookiePolicy.sessionCookieOptions({ maxAge: 0 }, true).maxAge, 0);
  const jar = cookieJar({
    'cliniccare-session': 'token', 'cliniccare-session.0': 'chunk0', 'cliniccare-session.1': 'chunk1',
    'cliniccare-session-code-verifier.0': 'pkce', 'cliniccare-remember': '1',
    'cliniccare-admin-session': sessionId, 'cliniccare-next': '/admin', theme: 'light',
  });
  await loadServer(jar).clearSessionCookies();
  assert.deepEqual(jar.getAll(), [{ name: 'theme', value: 'light' }]);
});

function identityFixture({ role = 'patient', marker, active = true, profileError = null } = {}) {
  const jar = cookieJar(marker === undefined ? {} : { [cookiePolicy.ADMIN_SESSION_COOKIE]: marker });
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { ...user, email_confirmed_at: 'confirmed', user_metadata: { role: 'admin' } } }, error: null }),
      getClaims: async () => ({ data: { claims: { session_id: sessionId } }, error: null }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1' }, error: null }) },
    },
    from(table) {
      const query = {
        select() { return query; }, eq() { return query; },
        single: async () => ({ data: { id: user.id, full_name: user.fullName, role }, error: profileError }),
        maybeSingle: async () => ({ data: active ? { id: 'doctor-id' } : null, error: null }),
      };
      assert.ok(['profiles', 'doctors'].includes(table));
      return query;
    },
  };
  return { server: loadServer(jar), client };
}

test('admin sessions from old persistent cookies, another login, or patient promotion require reauthentication', async () => {
  for (const marker of [undefined, 'other-session']) {
    const { server, client } = identityFixture({ role: 'admin', marker });
    const state = await server.readIdentity(client);
    assert.equal(state.user, null);
    assert.equal(state.needsReauthentication, true);
  }
  const { server, client } = identityFixture({ role: 'admin', marker: sessionId });
  assert.equal((await server.readIdentity(client)).user.role, 'admin');
});

test('identity uses the live profile role, rejects unknown roles and inactive doctors', async () => {
  for (const role of ['patient', 'doctor']) {
    const { server, client } = identityFixture({ role });
    assert.equal((await server.readIdentity(client)).user.role, role);
  }
  for (const options of [{ role: 'owner' }, { role: 'doctor', active: false }]) {
    const { server, client } = identityFixture(options);
    assert.equal((await server.readIdentity(client)).user, null);
  }
});

test('database failure fails closed without pretending the user signed out', async () => {
  const { server, client } = identityFixture({ profileError: { code: 'DATABASE_UNAVAILABLE' } });
  await assert.rejects(() => server.readIdentity(client));
});

async function runProxy(path, state, initialCookies = {}, refresh = false) {
  const request = { url: 'http://localhost:3000' + path, nextUrl: new URL('http://localhost:3000' + path), cookies: cookieJar(initialCookies) };
  class MockResponse extends Response {
    constructor(body, options) {
      super(body, options);
      const values = new Map();
      this.cookies = {
        getAll: () => [...values.values()],
        set(name, value, options = {}) {
          const cookie = typeof name === 'object' ? name : { name, value, ...options };
          values.set(cookie.name, cookie);
        },
      };
    }
    static next() { return new MockResponse(null, { status: 200 }); }
    static redirect(url) { return new MockResponse(null, { status: 307, headers: { location: String(url) } }); }
  }
  let storage;
  const { proxy } = loadTs('src/proxy.ts', {
    '@supabase/ssr': { createServerClient: (_url, _key, options) => { storage = options.cookies; return {}; } },
    'next/server': { NextResponse: MockResponse },
    '@/lib/auth/server': { readIdentity: async () => {
      if (refresh) {
        storage.setAll([{ name: 'cliniccare-session.0', value: 'fresh', options: { maxAge: 999 } }], {});
        storage.setAll([{ name: 'cliniccare-session.1', value: 'second-chunk', options: { maxAge: 999 } }], {});
      }
      return state;
    } },
    '@/lib/auth/cookies': cookiePolicy, '@/lib/auth/policy': policy,
  });
  return proxy(request);
}

test('site entry shows login for visitors and restores each non-admin role to its own portal', async () => {
  assert.equal((await runProxy('/', { user: null, needsMfa: false })).headers.get('location'), 'http://localhost:3000/login');
  for (const role of ['patient', 'doctor']) {
    const response = await runProxy('/', { user: { ...user, role }, needsMfa: false });
    assert.equal(response.headers.get('location'), 'http://localhost:3000' + policy.ROLE_HOME[role]);
  }
});

test('all three portals reject anonymous visitors and cross-role direct URLs', async () => {
  for (const role of ['patient', 'doctor', 'admin']) {
    const path = policy.ROLE_HOME[role] + '/appointments';
    assert.match((await runProxy(path, { user: null, needsMfa: false })).headers.get('location'), /\/login\?next=/);
    for (const other of ['patient', 'doctor', 'admin'].filter((value) => value !== role)) {
      const response = await runProxy(path, { user: { ...user, role: other }, needsMfa: false });
      assert.equal(response.headers.get('location'), 'http://localhost:3000' + policy.ROLE_HOME[other]);
    }
  }
});

test('admin returning to entry/login clears browser auth; navigation inside admin remains authorized', async () => {
  const state = { user: { ...user, role: 'admin' }, needsMfa: false };
  for (const path of ['/', '/login']) {
    const response = await runProxy(path, state, { 'cliniccare-session.0': 'old', [cookiePolicy.ADMIN_SESSION_COOKIE]: sessionId });
    assert.equal(response.status, path === '/' ? 307 : 200);
    assert.equal(response.cookies.getAll().find((cookie) => cookie.name === 'cliniccare-session.0').maxAge, 0);
  }
  assert.equal((await runProxy('/admin/accounts', state)).status, 200);
  const stale = await runProxy('/admin', { user: null, needsMfa: false, needsReauthentication: true });
  assert.equal(stale.headers.get('location'), 'http://localhost:3000/login?reauth=admin');
});

test('redirects preserve every refreshed cookie chunk and admin refresh cannot become persistent', async () => {
  for (const admin of [false, true]) {
    const response = await runProxy('/doctor', { user, needsMfa: false }, {
      [cookiePolicy.REMEMBER_COOKIE]: '1', ...(admin ? { [cookiePolicy.ADMIN_SESSION_COOKIE]: sessionId } : {}),
    }, true);
    const chunks = response.cookies.getAll();
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].value, 'fresh');
    for (const cookie of chunks) assert.equal(cookie.maxAge, admin ? undefined : 604800);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('forbidden data mutations are rejected before forwarding a JWT to Supabase', async () => {
  for (const [role, path, method] of [
    ['patient', ['doctors'], 'PATCH'], ['patient', ['time_slots'], 'POST'],
    ['patient', ['specialties'], 'DELETE'], ['patient', ['rpc', 'admin_set_user_role'], 'POST'],
    ['doctor', ['rpc', 'admin_set_user_role'], 'POST'], ['doctor', ['appointments'], 'POST'],
  ]) {
    const { POST, PATCH, DELETE } = loadTs('src/app/api/data/[...path]/route.ts', {
      '@/lib/auth/server': {
        createServerSupabase: async () => ({ auth: { getSession: () => assert.fail('must not forward tokens') } }),
        readIdentity: async () => ({ user: { ...user, role }, needsMfa: false }),
      },
      '@/lib/auth/http': http, '@/lib/auth/policy': policy,
    });
    const response = await ({ POST, PATCH, DELETE })[method](new Request('http://localhost:3000/api/data/' + path.join('/'), {
      method, headers: { origin: 'http://localhost:3000' },
    }), { params: Promise.resolve({ path }) });
    assert.equal(response.status, 403);
  }
});


test('general data updates reject role/identity assignment before forwarding any JWT', async () => {
  for (const [role, resource, method, payload, status] of [
    ['patient', 'profiles', 'PATCH', { role: 'admin' }, 400],
    ['patient', 'profiles', 'PATCH', { email: 'admin@example.com' }, 400],
    ['admin', 'profiles', 'PATCH', { role: 'doctor' }, 400],
    ['doctor', 'doctors', 'PATCH', { profile_id: 'other-user' }, 400],
    ['doctor', 'doctors', 'PATCH', { is_active: true }, 400],
    ['patient', 'appointments', 'PATCH', { status: 'confirmed' }, 403],
    ['patient', 'appointments', 'POST', { patient_id: 'other-user' }, 403],
    ['patient', 'appointments', 'POST', { doctor_note: 'forged' }, 400],
  ]) {
    const handlers = loadTs('src/app/api/data/[...path]/route.ts', {
      '@/lib/auth/server': {
        createServerSupabase: async () => ({ auth: { getSession: () => assert.fail('must reject protected fields before reading tokens') } }),
        readIdentity: async () => ({ user: { ...user, role }, needsMfa: false }),
      },
      '@/lib/auth/http': http, '@/lib/auth/policy': policy,
    });
    const response = await handlers[method](new Request('http://localhost:3000/api/data/' + resource, {
      method, headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify(payload),
    }), { params: Promise.resolve({ path: [resource] }) });
    assert.equal(response.status, status);
  }
});


test('existing patient booking/cancellation payloads still work through the secured gateway', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://clinic-test.supabase.co';
  try {
    const forwarded = [];
    const handlers = loadTs('src/app/api/data/[...path]/route.ts', {
      '@/lib/auth/server': {
        createServerSupabase: async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'verified-test-token' } } }) } }),
        readIdentity: async () => ({ user, needsMfa: false }),
      },
      '@/lib/auth/http': http, '@/lib/auth/policy': policy,
    }, {
      fetch: async (url, init) => {
        forwarded.push({ url, ...init });
        return Response.json({ id: 123 });
      },
    });
    for (const [method, body] of [
      ['POST', { doctor_id: 'doctor-id', slot_id: 1, reason: 'Khám bệnh' }],
      ['PATCH', { status: 'cancelled', cancel_reason: 'Changed plans', updated_at: '2000-01-01T00:00:00.000Z' }],
    ]) {
      const response = await handlers[method](new Request('http://localhost:3000/api/data/appointments?id=eq.123', {
        method, headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify(body),
      }), { params: Promise.resolve({ path: ['appointments'] }) });
      assert.equal(response.status, 200);
    }
    const booking = JSON.parse(forwarded[0].body);
    assert.equal(booking.patient_id, user.id);
    assert.equal(booking.status, 'pending');
    const cancellation = JSON.parse(forwarded[1].body);
    assert.equal(cancellation.status, 'cancelled');
    assert.notEqual(cancellation.updated_at, '2000-01-01T00:00:00.000Z');
    for (const request of forwarded) {
      assert.equal(request.headers.get('Authorization'), 'Bearer verified-test-token');
      assert.equal(request.url.searchParams.get('id'), 'eq.123');
    }
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});


test('compact registration accepts required fields and keeps optional profile metadata neutral', async () => {
  const harness = routeHarness();
  const response = await harness.post('register', {
    fullName: 'Nguyễn Minh Anh', email: ' PATIENT@EXAMPLE.COM ', phone: '0912345678',
    password: 'StrongPass!234', confirmPassword: 'StrongPass!234', agree: true,
  });
  assert.equal(response.status, 200);
  const signup = harness.calls.find(([name]) => name === 'register')[1];
  assert.equal(signup.email, 'patient@example.com');
  assert.equal(signup.options.data.gender, 'other');
  assert.equal(signup.options.data.date_of_birth, null);
  assert.equal('role' in signup.options.data, false);
});

test('optional registration details remain validated when supplied', async () => {
  for (const extra of [{ gender: 'admin' }, { dateOfBirth: '2099-01-01' }, { dateOfBirth: '2025-02-30' }]) {
    const harness = routeHarness();
    const response = await harness.post('register', {
      fullName: 'Test Patient', email: user.email, phone: '0912345678', password: 'StrongPass!234',
      confirmPassword: 'StrongPass!234', agree: true, ...extra,
    });
    assert.equal(response.status, 400);
    assert.equal(harness.calls.length, 0);
  }
});

test('provider endpoint only exposes enabled Supabase login options', async () => {
  for (const [settings, expected] of [
    [{ external: { google: true, facebook: false, github: true }, smtp_secret: 'never-expose' }, ['google']],
    [{ external: { google: false, facebook: false } }, []],
    [{ external: { google: true, facebook: true } }, ['google', 'facebook']],
  ]) {
    const response = await routeHarness({ providerSettings: settings }).get('providers');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { providers: expected });
  }
  assert.deepEqual(await (await routeHarness({ settingsStatus: 503 }).get('providers')).json(), { providers: [] });
});

test('non-JSON or unavailable auth services return a readable error instead of parser details', async () => {
  for (const stub of [
    async () => new Response('<html>Bad Gateway</html>', { status: 502 }),
    async () => Response.json(null, { status: 503 }),
    async () => { throw new TypeError('Failed to fetch'); },
  ]) {
    const { authRequest } = loadTs('src/lib/auth/client.ts', {}, { fetch: stub });
    await assert.rejects(() => authRequest('login', {}), error =>
      /Vui lòng/.test(error.message) && !/JSON|Unexpected|TypeError|Failed to fetch/.test(error.message));
  }
});


const emailLink = loadTs('src/lib/auth/email-link.ts');
function callbackHarness({ state = { user, needsMfa: false }, exchangeError = null, initialCookies = {}, identityError } = {}) {
  const jar = cookieJar(initialCookies);
  const calls = [];
  const client = { auth: {
    exchangeCodeForSession: async (...args) => { calls.push(['exchange', ...args]); return { error: exchangeError }; },
    signOut: async () => { calls.push(['logout']); return { error: null }; },
  } };
  const { GET } = loadTs('src/app/auth/callback/route.ts', {
    'next/headers': { cookies: async () => jar },
    'next/server': { NextResponse: { redirect: (url, options) => new Response(null, { status: 307, headers: { location: url.toString(), ...options?.headers } }) } },
    '@/lib/auth/server': {
      createServerSupabase: async () => client,
      readIdentity: async () => { if (identityError) throw identityError; return state; },
      clearSessionCookies: async () => { calls.push(['clear']); await loadServer(jar).clearSessionCookies(); },
      cookieSecurity: cookiePolicy.cookieSecurity,
      persistAuthenticatedSession: async (identity, remember) => calls.push(['persist', identity.role, remember]),
    },
    '@/lib/auth/http': http, '@/lib/auth/cookies': cookiePolicy,
    '@/lib/auth/policy': policy, '@/lib/auth/email-link': emailLink,
  });
  return { calls, jar, get: async (query) => GET(new Request('http://localhost:3000/auth/callback' + query)) };
}

test('Supabase email hashes accept SHA-224 and PKCE formats, never arbitrary or malformed strings', () => {
  for (const token of ['a'.repeat(56), 'pkce_' + 'b'.repeat(56), 'c'.repeat(64), 'pkce_' + 'd'.repeat(64)]) assert.equal(policy.validTokenHash(token), true);
  for (const token of ['', 'a'.repeat(55), 'a'.repeat(57), 'g'.repeat(56), 'pkce_' + 'a'.repeat(55), ['a'.repeat(56)], 'a'.repeat(56) + '\n']) assert.equal(policy.validTokenHash(token), false);
});

test('magic link token hashes sign patients in without a prior browser cookie', async () => {
  for (const token of ['a'.repeat(56), 'pkce_' + 'a'.repeat(56)]) {
    const harness = routeHarness();
    const response = await harness.post('confirm', { tokenHash: token, type: 'magiclink' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).redirect, '/client');
    assert.equal(harness.calls.find(([action]) => action === 'verify')[1].token_hash, token);
    assert.equal(harness.calls.find(([action]) => action === 'verify')[1].type, 'magiclink');
  }
});

test('token-hash callback forwards to explicit confirmation without consuming the email token on GET', async () => {
  const harness = callbackHarness();
  for (const type of ['magiclink', 'signup', 'invite', 'email', 'email_change', 'recovery']) {
    const response = await harness.get('?token_hash=pkce_' + 'a'.repeat(56) + '&type=' + type);
    const target = new URL(response.headers.get('location'));
    assert.equal(target.pathname, type === 'recovery' ? '/reset-password' : '/auth/confirm');
    assert.equal(target.searchParams.get('token_hash'), 'pkce_' + 'a'.repeat(56));
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal(harness.calls.length, 0);
});

test('malformed email callbacks fail without signing out a currently logged-in browser', async () => {
  const harness = callbackHarness({ initialCookies: { 'cliniccare-session.0': 'existing-session' } });
  for (const query of ['', '?token_hash=no&type=magiclink', '?token_hash=' + 'a'.repeat(56) + '&type=sms']) {
    const response = await harness.get(query);
    assert.equal(new URL(response.headers.get('location')).pathname, '/magic-link');
  }
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.jar.get('cliniccare-session.0').value, 'existing-session');
});

test('PKCE callbacks preserve flow id and restore the authorized destination', async () => {
  const harness = callbackHarness({ initialCookies: { [cookiePolicy.REMEMBER_COOKIE]: '1', 'cliniccare-next': '/client/booking' } });
  const response = await harness.get('?code=valid-auth-code&sb_flow_id=abcdefgh12345678');
  assert.equal(response.headers.get('location'), 'http://localhost:3000/client/booking');
  assert.equal(harness.calls[0][0], 'exchange');
  assert.equal(harness.calls[0][1], 'valid-auth-code');
  assert.equal(harness.calls[0][2].flowId, 'abcdefgh12345678');
  assert.deepEqual(harness.calls[1], ['persist', 'patient', true]);
});

test('missing browser verifier and expired email links lead to specific recovery messages', async () => {
  for (const [error, expected] of [
    [{ code: 'pkce_code_verifier_not_found' }, 'email_browser'],
    [{ name: 'AuthPKCECodeVerifierMissingError' }, 'email_browser'],
    [{ code: 'bad_code_verifier' }, 'email_browser'],
    [{ code: 'otp_expired' }, 'email_expired'],
    [{ code: 'flow_state_expired' }, 'email_expired'],
    [{ status: 503 }, 'email_unavailable'],
  ]) {
    const harness = callbackHarness({ exchangeError: error, initialCookies: { 'cliniccare-session.0': 'existing' } });
    const response = await harness.get('?code=one-time-code');
    const target = new URL(response.headers.get('location'));
    assert.equal(target.searchParams.get('error'), expected);
    assert.equal(harness.calls.some(([action]) => action === 'clear'), false);
  }
});

test('email callbacks preserve MFA and administrator password requirements', async () => {
  const mfa = await callbackHarness({ state: { user: null, needsMfa: true } }).get('?code=one-time-code');
  assert.equal(new URL(mfa.headers.get('location')).pathname, '/auth/mfa');
  const admin = callbackHarness({ state: { user: null, needsMfa: false, needsReauthentication: true } });
  const response = await admin.get('?code=one-time-code');
  assert.equal(response.headers.get('location'), 'http://localhost:3000/login?reauth=admin');
  assert.ok(admin.calls.some(([action]) => action === 'clear'));
});

test('verified email without a usable profile is reported as an account problem, never successful login', async () => {
  const state = { user: null, needsMfa: false };
  const response = await callbackHarness({ state }).get('?code=one-time-code');
  assert.equal(response.headers.get('location'), 'http://localhost:3000/login?error=email_account');
  assert.equal((await routeHarness({ state }).post('confirm', { tokenHash: 'a'.repeat(56), type: 'magiclink' })).status, 403);
});

test('per-flow PKCE cookies are preserved after signup and removed on full logout', async () => {
  const cookies = {
    'cliniccare-session-code-verifier': 'fixed',
    'cliniccare-session-flow-abcdefgh1234-code-verifier': 'slot',
    'cliniccare-session-flows-code-verifier': 'index',
    'cliniccare-session.0': 'old-session',
  };
  const harness = routeHarness({ cookies });
  assert.equal((await harness.post('register', {
    fullName: 'Test Patient', email: user.email, phone: '0912345678',
    password: 'StrongPass!234', confirmPassword: 'StrongPass!234', agree: true,
  })).status, 200);
  assert.equal(harness.calls.some(([action]) => action === 'logout'), false);
  for (const name of Object.keys(cookies).filter(name => name.endsWith('code-verifier'))) assert.ok(harness.jar.get(name));
  assert.equal(harness.jar.get('cliniccare-session.0'), undefined);
  await loadServer(harness.jar).clearSessionCookies();
  assert.deepEqual(harness.jar.getAll(), []);
});

test('real Supabase SSR SDK persists email PKCE cookies and can exchange a link using them', async () => {
  const { createServerClient } = require('../node_modules/@supabase/ssr');
  const values = new Map();
  let pkceBody;
  const claims = Buffer.from(JSON.stringify({ sub: sessionId, exp: Math.floor(Date.now() / 1000) + 3600, aal: 'aal1', session_id: sessionId })).toString('base64url');
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + claims + '.test-signature';
  function sdk() {
    return createServerClient('https://clinic-test.supabase.co', 'test-publishable-key', {
      cookieOptions: { name: cookiePolicy.SESSION_COOKIE },
      cookies: {
        getAll: () => [...values].map(([name, value]) => ({ name, value })),
        setAll: (items) => { for (const item of items) {
          if (item.options.maxAge === 0) values.delete(item.name);
          else values.set(item.name, item.value);
        } },
      },
      global: { fetch: async (url, init) => {
        if (url.toString().includes('/otp')) return Response.json({});
        if (url.toString().includes('/token')) {
          pkceBody = JSON.parse(init.body);
          return Response.json({ access_token: token, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user: { id: sessionId, email: user.email, email_confirmed_at: 'confirmed' } });
        }
        assert.fail('Unexpected SDK request');
      } },
    });
  }
  const send = await sdk().auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false, emailRedirectTo: 'http://localhost:3000/auth/callback' } });
  assert.equal(send.error, null);
  assert.ok([...values.keys()].some(cookiePolicy.isPkceCookie));
  const result = await sdk().auth.exchangeCodeForSession('sample-auth-code');
  assert.equal(result.error, null);
  assert.equal(pkceBody.auth_code, 'sample-auth-code');
  assert.ok(pkceBody.code_verifier.length >= 43);
  assert.ok([...values.keys()].some(cookiePolicy.isSessionCookie));
});

test('rate-limited responses include Retry-After and the client preserves it for cooldown', async () => {
  const response = await routeHarness({ authError: { status: 429, code: 'over_request_rate_limit' } })
    .post('login', { email: user.email, password: 'x' });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  for (const [header, expected] of [['120', 120], [null, 60], ['bad-header', 60]]) {
    const { authRequest, AuthRequestError } = loadTs('src/lib/auth/client.ts', {}, {
      fetch: async () => Response.json({ message: 'Vui lòng chờ.' }, {
        status: 429, headers: header ? { 'Retry-After': header } : {},
      }),
    });
    await assert.rejects(() => authRequest('login', {}), error =>
      error instanceof AuthRequestError && error.status === 429 && error.retryAfter === expected);
  }
});
test('email requests preserve rate-limit errors even if the SDK reports a non-429 HTTP status', async () => {
  for (const action of ['forgot-password', 'resend', 'magic-link']) {
    const response = await routeHarness({ authError: { status: 422, code: 'over_email_send_rate_limit' } })
      .post(action, { email: user.email });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
  }
});

test('hCaptcha waits for the API-ready callback, shares loads and reuses the ready API', async () => {
  const scripts = [];
  const timers = new Map();
  const window = {
    setTimeout(fn) { timers.set(1, fn); return 1; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    createElement: () => ({ remove() {} }),
    head: { appendChild: script => scripts.push(script) },
  };
  const { loadHCaptcha } = loadTs('src/lib/auth/hcaptcha.ts', {}, { window, document });
  const first = loadHCaptcha();
  const second = loadHCaptcha();
  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /onload=cliniccareHCaptchaReady/);
  let resolved = false;
  first.then(() => { resolved = true; });
  await Promise.resolve();
  assert.equal(resolved, false);
  const api = { render() { return 0; }, remove() {} };
  window.hcaptcha = api;
  window.cliniccareHCaptchaReady();
  assert.equal(await first, api);
  assert.equal(await loadHCaptcha(), api);
  assert.equal(timers.size, 0);
  assert.equal(scripts.length, 1);
});
test('hCaptcha network failure and timeout clear failed scripts and allow retry', async () => {
  for (const failWithTimeout of [false, true]) {
    const scripts = [];
    let timeout;
    const window = { setTimeout(fn) { timeout = fn; return 1; }, clearTimeout() {} };
    const document = { createElement: () => ({ removed: false, remove() { this.removed = true; } }), head: { appendChild: script => scripts.push(script) } };
    const { loadHCaptcha } = loadTs('src/lib/auth/hcaptcha.ts', {}, { window, document });
    const first = loadHCaptcha();
    const rejected = assert.rejects(first, /xác minh/);
    if (failWithTimeout) timeout(); else scripts[0].onerror();
    await rejected;
    assert.equal(scripts[0].removed, true);
    const second = loadHCaptcha();
    window.hcaptcha = { render() { return 1; }, remove() {} };
    window.cliniccareHCaptchaReady();
    await second;
    assert.equal(scripts.length, 2);
  }
});

test('password range checks send only the hash prefix, enable padding and reject leaked passwords', async () => {
  const { createHash } = require('node:crypto');
  const password = 'AlreadyLeaked!1234';
  const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
  const { assertPasswordNotLeaked } = loadTs('src/lib/auth/password-security.ts', {
    'node:crypto': { createHash }, './http': http,
  }, { fetch: async (url, options) => {
    assert.equal(url, 'https://api.pwnedpasswords.com/range/' + hash.slice(0, 5));
    assert.equal(options.headers['Add-Padding'], 'true');
    assert.equal(JSON.stringify({ url, options }).includes(password), false);
    assert.equal(JSON.stringify({ url, options }).includes(hash.slice(5)), false);
    return new Response(hash.slice(5) + ':123\r\n' + '0'.repeat(35) + ':0');
  } });
  await assert.rejects(() => assertPasswordNotLeaked(password), error => error.status === 400 && /rò rỉ/.test(error.message));
});
test('password range checks ignore padding entries and fail safely on unavailable or invalid responses', async () => {
  const { createHash } = require('node:crypto');
  for (const response of [new Response('', { status: 503 }), new Response('<html>error</html>'), new Response('')]) {
    const { assertPasswordNotLeaked } = loadTs('src/lib/auth/password-security.ts', { 'node:crypto': { createHash }, './http': http }, { fetch: async () => response });
    await assert.rejects(() => assertPasswordNotLeaked('SafeRandom!1234'), error => error.status === 503);
  }
  const password = 'SafeRandom!1234';
  const suffix = createHash('sha1').update(password).digest('hex').toUpperCase().slice(5);
  const { assertPasswordNotLeaked } = loadTs('src/lib/auth/password-security.ts', { 'node:crypto': { createHash }, './http': http }, {
    fetch: async () => new Response(suffix + ':0\r\n' + '0'.repeat(35) + ':5'),
  });
  await assertPasswordNotLeaked(password);
});
test('registration and every password change reject leaked passwords before Auth mutations', async () => {
  const tokenHash = 'a'.repeat(56);
  const password = 'StrongPass!234';
  const payloads = [
    ['register', { email: user.email, fullName: 'Patient Test', phone: '0912345678', password, confirmPassword: password, agree: true }],
    ['reset-password', { tokenHash, password, confirmPassword: password }],
    ['reset-password-mfa', { factorId: sessionId, code: '123456', password, confirmPassword: password }],
    ['password', { password, confirmPassword: password, nonce: '123456' }],
  ];
  for (const [action, body] of payloads) {
    const harness = routeHarness({ passwordError: { status: 400, message: 'Mật khẩu đã bị rò rỉ.' } });
    const response = await harness.post(action, body);
    assert.equal(response.status, 400, action);
    assert.equal(harness.calls.length, 0, action);
  }
});

test('default Supabase recovery exchanges the PKCE code on POST and preserves its browser verifier', async () => {
  const password = 'StrongPass!234';
  const pkceName = 'cliniccare-session-code-verifier';
  const harness = routeHarness({ cookies: { [pkceName]: 'browser-verifier/recovery' } });
  const response = await harness.post('reset-password', { code: 'recovery-code', flowId: 'flow_123456', password, confirmPassword: password });
  assert.equal(response.status, 200);
  assert.deepEqual(harness.calls.map(([name]) => name), ['clear', 'exchange', 'update', 'logout', 'clear']);
  const exchange = harness.calls.find(([name]) => name === 'exchange');
  assert.equal(exchange[1], 'recovery-code');
  assert.equal(exchange[2].flowId, 'flow_123456');
});
test('OAuth or magic-link PKCE codes cannot reset passwords', async () => {
  const harness = routeHarness({ recoveryType: null });
  const response = await harness.post('reset-password', { code: 'ordinary-login-code', password: 'StrongPass!234', confirmPassword: 'StrongPass!234' });
  assert.equal(response.status, 400);
  assert.equal(harness.calls.some(([name]) => name === 'update'), false);
  assert.deepEqual(harness.calls.map(([name]) => name), ['clear', 'exchange', 'logout', 'clear']);
});
test('recovery requires exactly one valid token or code and validates the flow id', async () => {
  for (const extra of [{}, { code: '' }, { code: 'x', tokenHash: 'a'.repeat(56) }, { code: 'x', flowId: '../invalid' }]) {
    const harness = routeHarness();
    const response = await harness.post('reset-password', { ...extra, password: 'StrongPass!234', confirmPassword: 'StrongPass!234' });
    assert.equal(response.status, 400);
    assert.equal(harness.calls.length, 0);
  }
});
test('default recovery keeps MFA verification mandatory before changing the password', async () => {
  const harness = routeHarness({
    aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
    factors: { totp: [{ id: sessionId, status: 'verified', friendly_name: 'Authenticator' }] },
  });
  const response = await harness.post('reset-password', { code: 'recovery-code', password: 'StrongPass!234', confirmPassword: 'StrongPass!234' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).recoveryFactors[0].id, sessionId);
  assert.equal(harness.calls.some(([name]) => name === 'update'), false);
});
test('recovery callback forwards PKCE to the reset form without exchanging it on GET', async () => {
  const harness = callbackHarness();
  const response = await harness.get('?type=recovery&code=recovery-code&sb_flow_id=flow_123456');
  const location = new URL(response.headers.get('location'));
  assert.equal(location.pathname, '/reset-password');
  assert.equal(location.searchParams.get('code'), 'recovery-code');
  assert.equal(location.searchParams.get('sb_flow_id'), 'flow_123456');
  assert.equal(harness.calls.length, 0);
});
