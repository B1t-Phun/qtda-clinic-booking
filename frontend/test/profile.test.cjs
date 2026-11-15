/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('../node_modules/typescript'), sharp = require('../node_modules/sharp');
function load(file, imports = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded, exports: loaded.exports, require(name) {
      if (name === 'server-only') return {};
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error('Unexpected profile import: ' + name);
    }, URL, Request, Response, Headers, Buffer, process, AbortSignal, ...globals,
  });
  return loaded.exports;
}
const profile = load('src/lib/profile.ts');
const http = load('src/lib/auth/http.ts', { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } });
const avatars = load('src/lib/profile-avatar.ts', { sharp, '@/lib/auth/http': http, '@/lib/profile': profile });
const uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const objectId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const saved = {
  id: uid, role: 'patient', email: 'person@example.test', full_name: 'Patient Test', phone: '', gender: '',
  date_of_birth: '', address: '', avatar_url: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-11-15T00:00:00Z',
};
const input = { full_name: 'Nguy?n V?n An', phone: '0912345678', gender: 'male', date_of_birth: '1990-05-15', address: '?? N?ng' };
test('profile fields validate real dates, optional values and Vietnamese contact information', () => {
  assert.equal(Object.keys(profile.profileErrors(input, '2026-11-15')).length, 0);
  assert.equal(Object.keys(profile.profileErrors({ ...input, phone: '', gender: '', date_of_birth: '', address: '' })).length, 0);
  for (const date of ['2026-02-31', '2027-01-01', '1899-12-31', '01/01/2000']) {
    assert.ok(profile.profileErrors({ ...input, date_of_birth: date }, '2026-11-15').date_of_birth);
  }
  assert.ok(profile.profileErrors({ ...input, phone: '12345' }).phone);
  assert.ok(profile.profileErrors({ ...input, full_name: ' ' }).full_name);
  assert.ok(profile.profileErrors({ ...input, address: 'x'.repeat(501) }).address);
  assert.equal(profile.todayInClinic(new Date('2026-11-14T19:00:00Z')), '2026-11-15');
});
test('stored avatar paths cannot address another user or escape the private bucket', () => {
  const url = '/api/profile/avatar/' + uid + '/' + objectId + '.webp';
  assert.equal(profile.avatarPath(url, uid), uid + '/' + objectId + '.webp');
  for (const value of [url + '/extra', '/api/profile/avatar/../secret', 'https://example.test' + url, url + '?x=1']) assert.equal(profile.avatarPath(value, uid), null);
  assert.equal(profile.avatarPath(url, other), null);
});
test('server image processing resizes, strips EXIF and stores a real WebP image', async () => {
  const original = await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#317c65' } }).jpeg().withMetadata({ exif: { IFD0: { Artist: 'Do not retain private metadata' } } }).toBuffer();
  const result = await avatars.readAvatar(new Request('http://localhost/api/profile/avatar', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: original }));
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 512); assert.equal(meta.height, 512);
  assert.equal(meta.exif, undefined); assert.ok(result.length < 1048576);
});
test('server rejects SVG, corrupt images, empty uploads and oversized stream bodies', async () => {
  for (const [mime, bytes] of [['image/svg+xml', Buffer.from('<svg/>')], ['image/jpeg', Buffer.from('not a jpeg')], ['image/png', Buffer.alloc(0)]]) {
    await assert.rejects(() => avatars.readAvatar(new Request('http://localhost/upload', { method: 'POST', headers: { 'content-type': mime }, body: bytes })), error => [400, 415].includes(error.status));
  }
  await assert.rejects(() => avatars.readAvatar(new Request('http://localhost/upload', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: Buffer.alloc(profile.MAX_AVATAR_BYTES + 1) })), error => error.status === 413);
});
function harness({ userId = uid, role = 'patient', needsMfa = false, expired = false, writeError = null, uploadError = null, throwWrite = false, avatar = '' } = {}) {
  const calls = [];
  const current = { ...saved, id: userId, role, avatar_url: avatar };
  const storage = {
    upload: async (path, bytes, options) => { calls.push(['upload', path, bytes.length, options]); return { data: { path }, error: uploadError }; },
    remove: async paths => { calls.push(['remove', paths]); return { error: null }; },
    download: async path => { calls.push(['download', path]); return { data: new Blob(['webp'], { type: 'image/webp' }), error: null }; },
  };
  const client = {
    from(table) {
      calls.push(['from', table]);
      const q = {
        update(value) { calls.push(['update', value]); return q; }, eq(key, value) { calls.push(['eq', key, value]); return q; },
        select() { return q; },
        single: async () => { if (throwWrite) throw new Error('Connection lost'); return { data: { ...current, ...Object.assign({}, ...calls.filter(call => call[0] === 'update').map(call => call[1])) }, error: writeError }; },
      }; return q;
    },
    storage: { from: bucket => { calls.push(['bucket', bucket]); return storage; } },
  };
  const session = async () => {
    if (expired) throw new http.AuthHttpError(401, 'Login required');
    if (needsMfa) throw new http.AuthHttpError(403, 'MFA required');
    return { client, user: { id: userId, role } };
  };
  const server = { profileSession: session, ownProfile: async () => current, profileDatabaseError(error) { if (error) throw new http.AuthHttpError(error.code === 'PGRST116' ? 409 : 503, 'Profile write failed'); } };
  return { calls, client, server, current };
}
function ownRoute(h) {
  return load('src/app/api/profile/route.ts', { '@/lib/auth/http': http, '@/lib/profile': profile, '@/lib/profile-server': h.server });
}
function photoRoute(h) {
  return load('src/app/api/profile/avatar/route.ts', { 'node:crypto': { randomUUID: () => objectId }, '@/lib/auth/http': http,
    '@/lib/profile': profile, '@/lib/profile-server': h.server, '@/lib/profile-avatar': avatars });
}
const origin = 'http://localhost:3000';
process.env.APP_URL = origin;
function patch(body) { return new Request(origin + '/api/profile', { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
test('doctor and patient personal saves bind identity to the verified session and preserve the expected version', async () => {
  for (const role of ['doctor', 'patient']) {
    const h = harness({ role }), route = ownRoute(h);
    const response = await route.PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }));
    assert.equal(response.status, 200);
    assert.ok(h.calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === uid));
    assert.ok(h.calls.some(call => call[0] === 'eq' && call[1] === 'updated_at' && call[2] === saved.updated_at));
    const write = h.calls.find(call => call[0] === 'update')[1];
    assert.equal(write.role, undefined); assert.equal(write.avatar_url, undefined);
  }
});
test('profile route blocks role/email/avatar/identity assignment and stale or invalid field writes', async () => {
  for (const field of ['id', 'email', 'role', 'avatar_url']) {
    const h = harness();
    assert.equal((await ownRoute(h).PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at, [field]: 'forged' }))).status, 400);
    assert.equal(h.calls.some(call => call[0] === 'update'), false);
  }
  const stale = harness({ writeError: { code: 'PGRST116' } });
  assert.equal((await ownRoute(stale).PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }))).status, 409);
  const invalid = harness();
  const response = await ownRoute(invalid).PATCH(patch({ ...input, date_of_birth: '2026-02-31', expectedUpdatedAt: saved.updated_at }));
  assert.equal(response.status, 400); assert.ok((await response.json()).fields.date_of_birth);
});
test('session expiry, MFA and foreign-origin writes stop before touching profile or storage', async () => {
  for (const [options, code] of [[{ expired: true }, 401], [{ needsMfa: true }, 403]]) {
    const h = harness(options);
    assert.equal((await ownRoute(h).PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }))).status, code);
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  assert.equal((await photoRoute(h).POST(new Request(origin + '/api/profile/avatar', { method: 'POST', headers: { origin: 'https://evil.test' }, body: 'x' }))).status, 403);
  assert.equal(h.calls.length, 0);
});
test('avatar save creates an immutable path under the current user and deletes the old owned file only after success', async () => {
  const old = '/api/profile/avatar/' + uid + '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp';
  const h = harness({ avatar: old });
  const png = await sharp({ create: { width: 50, height: 60, channels: 3, background: '#123456' } }).png().toBuffer();
  const response = await photoRoute(h).POST(new Request(origin + '/api/profile/avatar', { method: 'POST', headers: { origin, 'content-type': 'image/png' }, body: png }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profile.avatar_url, '/api/profile/avatar/' + uid + '/' + objectId + '.webp');
  assert.equal(h.calls.find(call => call[0] === 'upload')[1], uid + '/' + objectId + '.webp');
  assert.ok(h.calls.findIndex(call => call[0] === 'remove') > h.calls.findIndex(call => call[0] === 'update'));
  const external = harness({ avatar: 'https://external.test/image.jpg' });
  assert.equal((await photoRoute(external).DELETE(new Request(origin + '/api/profile/avatar', { method: 'DELETE', headers: { origin } }))).status, 200);
  assert.equal(external.calls.some(call => call[0] === 'remove'), false);
});
test('storage configuration errors retain the original profile; failed writes remove only their new upload', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#abcdef' } }).png().toBuffer();
  const upload = () => new Request(origin + '/api/profile/avatar', { method: 'POST', headers: { origin, 'content-type': 'image/png' }, body: png });
  const missing = harness({ uploadError: { statusCode: '404', message: 'Bucket not found' } });
  assert.equal((await photoRoute(missing).POST(upload())).status, 503);
  assert.equal(missing.calls.some(call => call[0] === 'update'), false);
  const rejected = harness({ writeError: { code: 'PGRST116' } });
  assert.equal((await photoRoute(rejected).POST(upload())).status, 409);
  assert.deepEqual(Array.from(rejected.calls.find(call => call[0] === 'remove')[1]), [uid + '/' + objectId + '.webp']);
  const uncertain = harness({ throwWrite: true });
  assert.equal((await photoRoute(uncertain).POST(upload())).status, 503);
  assert.equal(uncertain.calls.some(call => call[0] === 'remove'), false, 'A write may already have committed; preserve the image until reloaded');
});

test('private avatar download validates paths, respects Storage RLS and disables shared caching', async () => {
  for (const [allowed, loggedIn, expected] of [[true, true, 200], [false, true, 404], [true, false, 401]]) {
    const calls = [];
    const route = load('src/app/api/profile/avatar/[...path]/route.ts', {
      '@/lib/auth/server': {
        createServerSupabase: async () => ({ storage: { from: () => ({ download: async key => {
          calls.push(key); return { data: allowed ? new Blob(['webp']) : null, error: allowed ? null : { statusCode: '403' } };
        } }) } }),
        readIdentity: async () => ({ user: loggedIn ? { id: other, role: 'doctor' } : null, needsMfa: false }),
      }, '@/lib/auth/http': http, '@/lib/profile': profile,
    });
    const response = await route.GET(new Request(origin + '/api/profile/avatar/' + uid + '/' + objectId + '.webp'), { params: Promise.resolve({ path: [uid, objectId + '.webp'] }) });
    assert.equal(response.status, expected);
    if (expected === 200) { assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.equal(response.headers.get('content-type'), 'image/webp'); }
    if (!loggedIn) assert.equal(calls.length, 0);
    const invalid = await route.GET(new Request(origin + '/api/profile/avatar/bad'), { params: Promise.resolve({ path: [uid, '..', 'other'] }) });
    assert.equal(invalid.status, 404);
  }
});
test('the profile session helper permits only authenticated doctors/patients with required MFA', async () => {
  for (const [role, loggedIn, needsMfa, expected] of [['doctor', true, false, 200], ['patient', true, false, 200], ['admin', true, false, 403], ['patient', false, false, 401], ['doctor', true, true, 403]]) {
    const helper = load('src/lib/profile-server.ts', {
      '@/lib/auth/server': { createServerSupabase: async () => ({}), readIdentity: async () => ({ user: loggedIn ? { id: uid, role } : null, needsMfa }) },
      '@/lib/auth/http': http, '@/lib/profile': profile,
    });
    if (expected === 200) assert.equal((await helper.profileSession()).user.id, uid);
    else await assert.rejects(() => helper.profileSession(), error => error.status === expected);
  }
});
test('doctor patient details render only patients present in the authorized appointment snapshot', () => {
  const React = require('../node_modules/react'), { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const detail = load('src/modules/doctor/views/PatientDetailView.tsx', {
    react: React, 'react/jsx-runtime': require('../node_modules/react/jsx-runtime'),
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'CalendarDays', 'Phone', 'Mail'].map(name => [name, () => null])),
    '../components/DoctorUI': {
      Avatar: () => null, EmptyState: ({ title }) => React.createElement('p', null, title),
      PageHeading: ({ title }) => React.createElement('h1', null, title), Pagination: () => null, StatusBadge: () => null,
    },
    '../store/store': { useDoctorStore: () => ({ patients: [saved], appointments: [{ id: '1', patient_id: uid, slot_id: '1', status: 'completed', created_at: saved.created_at }],
      slots: [{ id: '1', slot_date: '2026-11-15', start_time: '09:00', end_time: '09:30' }], now: new Date('2026-11-15T00:00:00Z') }) },
    '../utils': { ageOf: () => '—', dateTimeVN: value => value, dateVN: value => value, genderLabel: { '': 'Chưa cập nhật' }, timeLabel: value => value },
  }).default;
  const own = renderToStaticMarkup(React.createElement(detail, { id: uid }));
  assert.ok(own.includes(saved.full_name));
  const foreign = renderToStaticMarkup(React.createElement(detail, { id: other }));
  assert.equal(foreign.includes(saved.email), false);
  assert.equal(foreign.includes(saved.full_name), false);
  assert.ok(foreign.includes('Không tìm thấy hồ sơ bệnh nhân'));
});
