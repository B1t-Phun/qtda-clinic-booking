/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('../node_modules/typescript'), sharp = require('../node_modules/sharp');
function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(name) {
    if (name === 'server-only') return {};
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error('Unexpected profile import: ' + name);
  }, URL, Request, Response, Headers, Buffer, process, AbortSignal, ...globals });
  return loaded.exports;
}
const profile = load('src/lib/profile.ts');
const http = load('src/lib/auth/http.ts', { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } });
const avatar = load('src/lib/profile-avatar.ts', { sharp, '@/lib/auth/http': http, '@/lib/profile': profile });
const uid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', object = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const saved = { id: uid, role: 'patient', email: 'person@example.test', full_name: 'Patient Test', phone: '', gender: '', date_of_birth: '', address: '', avatar_url: '', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-11-15T00:00:00Z' };
const input = { full_name: 'Nguyễn Văn An', phone: '0912345678', gender: 'male', date_of_birth: '1990-05-15', address: 'Đà Nẵng' };
const origin = 'http://localhost:3000';
process.env.APP_URL = origin;
test('profile validates Vietnamese contact details, optional fields and real dates', () => {
  assert.equal(Object.keys(profile.profileErrors(input, '2026-11-15')).length, 0);
  assert.equal(Object.keys(profile.profileErrors({ ...input, phone: '', gender: '', date_of_birth: '', address: '' })).length, 0);
  for (const dob of ['2026-02-31', '2027-01-01', '1899-12-31', '01/01/2000']) assert.ok(profile.profileErrors({ ...input, date_of_birth: dob }, '2026-11-15').date_of_birth);
  assert.ok(profile.profileErrors({ ...input, phone: '12345' }).phone);
  assert.ok(profile.profileErrors({ ...input, full_name: ' ' }).full_name);
  assert.ok(profile.profileErrors({ ...input, address: 'x'.repeat(501) }).address);
  assert.equal(profile.clinicToday(new Date('2026-11-14T19:00:00Z')), '2026-11-15');
});
test('avatar object paths cannot escape folders or clean up another account image', () => {
  const url = '/api/profile/avatar/' + uid + '/' + object + '.webp';
  assert.equal(profile.avatarPath(url, uid), uid + '/' + object + '.webp');
  for (const value of [url + '/extra', '/api/profile/avatar/../secret', 'https://example.test' + url, url + '?x=1']) assert.equal(profile.avatarPath(value, uid), null);
  assert.equal(profile.avatarPath(url, other), null);
});
test('real image bytes become bounded WebP thumbnails without private EXIF metadata', async () => {
  const original = await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#317c65' } }).jpeg().withMetadata({ exif: { IFD0: { Artist: 'Private camera data' } } }).toBuffer();
  const result = await avatar.readAvatar(new Request(origin, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: original }));
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 512); assert.equal(meta.height, 512);
  assert.equal(meta.exif, undefined); assert.ok(result.length < 1048576);
});
test('server rejects SVG, corrupt bytes, empty files and oversized streamed bodies', async () => {
  for (const [mime, bytes] of [['image/svg+xml', Buffer.from('<svg/>')], ['image/jpeg', Buffer.from('not a jpeg')], ['image/png', Buffer.alloc(0)]]) {
    await assert.rejects(() => avatar.readAvatar(new Request(origin, { method: 'POST', headers: { 'content-type': mime }, body: bytes })), error => [400, 415].includes(error.status));
  }
  await assert.rejects(() => avatar.readAvatar(new Request(origin, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: Buffer.alloc(profile.MAX_AVATAR_BYTES + 1) })), error => error.status === 413);
});
function harness({ role = 'patient', expired = false, mfa = false, writeError = null, uploadError = null, uncertain = false, oldImage = '' } = {}) {
  const calls = [], current = { ...saved, role, avatar_url: oldImage };
  const storage = {
    upload: async (key, bytes, options) => { calls.push(['upload', key, bytes.length, options]); return { error: uploadError }; },
    remove: async paths => { calls.push(['remove', paths]); return { error: null }; },
    download: async key => { calls.push(['download', key]); return { data: new Blob(['image']), error: null }; },
  };
  const client = { from(table) { calls.push(['from', table]); const q = {
    update(data) { calls.push(['update', data]); return q; }, eq(key, value) { calls.push(['eq', key, value]); return q; }, select() { return q; },
    single: async () => { if (uncertain) throw new Error('Network lost'); return { data: { ...current, ...Object.assign({}, ...calls.filter(call => call[0] === 'update').map(call => call[1])) }, error: writeError }; },
  }; return q; }, storage: { from: bucket => { calls.push(['bucket', bucket]); return storage; } } };
  const server = { profileSession: async () => { if (expired) throw new http.AuthHttpError(401, 'Login required'); if (mfa) throw new http.AuthHttpError(403, 'MFA required'); return { client, user: { id: uid, role } }; },
    ownProfile: async () => current, profileDatabaseError(error) { if (error) throw new http.AuthHttpError(error.code === 'PGRST116' ? 409 : 503, 'Write failed'); } };
  const route = load('src/app/api/profile/route.ts', { '@/lib/auth/http': http, '@/lib/profile': profile, '@/lib/profile-server': server });
  const photo = load('src/app/api/profile/avatar/route.ts', { 'node:crypto': { randomUUID: () => object }, '@/lib/auth/http': http, '@/lib/profile': profile, '@/lib/profile-server': server, '@/lib/profile-avatar': avatar });
  return { calls, route, photo };
}
function patch(body) { return new Request(origin + '/api/profile', { method: 'PATCH', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
test('personal edits bind to current session and expected version for both roles', async () => {
  for (const role of ['doctor', 'patient']) {
    const h = harness({ role }), response = await h.route.PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }));
    assert.equal(response.status, 200);
    assert.ok(h.calls.some(c => c[0] === 'eq' && c[1] === 'id' && c[2] === uid));
    assert.ok(h.calls.some(c => c[0] === 'eq' && c[1] === 'updated_at' && c[2] === saved.updated_at));
    assert.equal(h.calls.find(c => c[0] === 'update')[1].avatar_url, undefined);
  }
});
test('profile blocks identity, email, role and arbitrary avatar assignment', async () => {
  for (const field of ['id', 'email', 'role', 'avatar_url']) {
    const h = harness(); assert.equal((await h.route.PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at, [field]: 'forged' }))).status, 400);
    assert.equal(h.calls.some(c => c[0] === 'update'), false);
  }
  const h = harness({ writeError: { code: 'PGRST116' } });
  assert.equal((await h.route.PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }))).status, 409);
});
test('expired sessions, MFA and foreign-origin writes stop before profile or storage writes', async () => {
  for (const [options, status] of [[{ expired: true }, 401], [{ mfa: true }, 403]]) {
    const h = harness(options); assert.equal((await h.route.PATCH(patch({ ...input, expectedUpdatedAt: saved.updated_at }))).status, status); assert.equal(h.calls.length, 0);
  }
  const h = harness(); assert.equal((await h.photo.POST(new Request(origin, { method: 'POST', headers: { origin: 'https://evil.test' }, body: 'x' }))).status, 403);
  assert.equal(h.calls.length, 0);
});
test('avatar creates owner-scoped immutable filenames and removes only previous owned objects after success', async () => {
  const png = await sharp({ create: { width: 50, height: 60, channels: 3, background: '#123456' } }).png().toBuffer();
  const old = '/api/profile/avatar/' + uid + '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp';
  const h = harness({ oldImage: old }), response = await h.photo.POST(new Request(origin, { method: 'POST', headers: { origin, 'content-type': 'image/png' }, body: png }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profile.avatar_url, '/api/profile/avatar/' + uid + '/' + object + '.webp');
  assert.ok(h.calls.findIndex(c => c[0] === 'remove') > h.calls.findIndex(c => c[0] === 'update'));
  const external = harness({ oldImage: 'https://external.test/image.jpg' });
  assert.equal((await external.photo.DELETE(new Request(origin, { method: 'DELETE', headers: { origin } }))).status, 200);
  assert.equal(external.calls.some(c => c[0] === 'remove'), false);
});
test('missing Storage leaves original data intact and uncertain writes preserve the new photo', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#abcdef' } }).png().toBuffer();
  const upload = () => new Request(origin, { method: 'POST', headers: { origin, 'content-type': 'image/png' }, body: png });
  const missing = harness({ uploadError: { statusCode: '404', message: 'Bucket not found' } });
  assert.equal((await missing.photo.POST(upload())).status, 503); assert.equal(missing.calls.some(c => c[0] === 'update'), false);
  const rejected = harness({ writeError: { code: 'PGRST116' } });
  assert.equal((await rejected.photo.POST(upload())).status, 409); assert.deepEqual(Array.from(rejected.calls.find(c => c[0] === 'remove')[1]), [uid + '/' + object + '.webp']);
  for (const options of [{ uncertain: true }, { writeError: { code: '', message: 'Fetch failed' } }]) {
    const uncertain = harness(options); assert.equal((await uncertain.photo.POST(upload())).status, 503); assert.equal(uncertain.calls.some(c => c[0] === 'remove'), false);
  }
});
test('real session helper rejects Admin, expired identity and MFA without weakening roles', async () => {
  for (const [role, loggedIn, mfa, expected] of [['doctor', true, false, 200], ['patient', true, false, 200], ['admin', true, false, 403], ['patient', false, false, 401], ['doctor', true, true, 403]]) {
    const helper = load('src/lib/profile-server.ts', { '@/lib/auth/server': { createServerSupabase: async () => ({}), readIdentity: async () => ({ user: loggedIn ? { id: uid, role } : null, needsMfa: mfa }) }, '@/lib/auth/http': http, '@/lib/profile': profile });
    if (expected === 200) assert.equal((await helper.profileSession()).user.id, uid); else await assert.rejects(() => helper.profileSession(), e => e.status === expected);
  }
});
test('private image responses enforce Storage permissions and never enter shared caches', async () => {
  for (const allowed of [true, false]) {
    const route = load('src/app/api/profile/avatar/[...path]/route.ts', { '@/lib/auth/server': {
      createServerSupabase: async () => ({ storage: { from: () => ({ download: async () => ({ data: allowed ? new Blob(['webp']) : null, error: allowed ? null : {} }) }) } }),
      readIdentity: async () => ({ user: { id: other, role: 'doctor' }, needsMfa: false }),
    }, '@/lib/auth/http': http, '@/lib/profile': profile });
    const response = await route.GET(new Request(origin), { params: Promise.resolve({ path: [uid, object + '.webp'] }) });
    assert.equal(response.status, allowed ? 200 : 404);
    if (allowed) assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await route.GET(new Request(origin), { params: Promise.resolve({ path: [uid, '..', 'secret'] }) })).status, 404);
  }
});

test('personal profile components use the account role and render all database fields without requesting data during SSR', () => {
  const React = require('../node_modules/react'), { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const icons = Object.fromEntries(['CalendarDays','CircleCheck','CircleX','Clock3','Camera','Check','ChevronRight','LoaderCircle','Pencil','Save','ShieldCheck','Trash2','Upload','UserRound'].map(name => [name, () => null]));
  const component = load('src/components/profile/PersonalProfile.tsx', { react: React, 'react/jsx-runtime': require('../node_modules/react/jsx-runtime'),
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) }, 'lucide-react': icons,
    '@/lib/profile': profile, './Profile.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  }, { fetch: () => assert.fail('SSR profile must use its server-provided data') }).PersonalProfilePanel;
  for (const role of ['doctor','patient']) {
    const html = renderToStaticMarkup(React.createElement(component, { initialProfile: { ...saved, role } }));
    assert.ok(html.includes('data-role="' + role + '"'));
    for (const label of ['Họ và tên','Số điện thoại','Ngày sinh','Giới tính','Email đăng nhập','Địa chỉ liên hệ','Ngày tham gia','Cập nhật gần nhất','Mã hồ sơ','Chọn ảnh từ máy']) assert.ok(html.includes(label), label);
    assert.ok(html.includes(uid)); assert.ok(html.includes(saved.email));
  }
});
test('doctor patient detail refuses patients without an owned appointment', () => {
  const React = require('../node_modules/react'), { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const detail = load('src/modules/doctor/views/PatientDetailView.tsx', {
    react: React, 'react/jsx-runtime': require('../node_modules/react/jsx-runtime'),
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': { ArrowLeft: () => null, CalendarDays: () => null },
    '../components/DoctorUI': { Avatar: () => null, EmptyState: ({ title }) => React.createElement('p', null, title), Pagination: () => null, StatusBadge: () => null },
    '../store/store': { useDoctorStore: () => ({ patients: [saved], appointments: [{ id: '1', patient_id: uid, slot_id: '1', status: 'completed', created_at: saved.created_at }],
      slots: [{ id: '1', slot_date: '2026-11-15', start_time: '09:00', end_time: '09:30' }], now: new Date('2026-11-15T00:00:00Z') }) },
    '../utils': { ageOf: () => '—', dateTimeVN: v => v, dateVN: v => v, genderLabel: { '': 'Chưa cập nhật' }, timeLabel: v => v },
    '@/components/profile/Profile.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  }).default;
  const own = renderToStaticMarkup(React.createElement(detail, { id: uid }));
  assert.ok(own.includes(saved.full_name)); assert.ok(own.includes('data-role="doctor"'));
  const foreign = renderToStaticMarkup(React.createElement(detail, { id: other }));
  assert.equal(foreign.includes(saved.email), false); assert.equal(foreign.includes(saved.full_name), false);
  assert.ok(foreign.includes('Không tìm thấy hồ sơ bệnh nhân'));
});
