/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), http = require('node:http'), os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const { loadProjectEnv } = require(path.join(root, 'scripts/env.cjs'));
const env = loadProjectEnv({ shell: {} });
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const ts = require('../node_modules/typescript'), React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const sourceRoot = path.join(root, 'frontend/src');
const artifacts = path.join(root, 'artifacts/doctor');
const snapshots = [];
let currentSnapshot, currentPath = '/doctor', browser, socket, server, profile;
let sequence = 0;
const pending = new Map(), cache = new Map();
const routes = [
  ['/doctor', 'TodayView', 'dashboard'], ['/doctor/appointments', 'AppointmentsView', 'appointments'],
  ['/doctor/schedule', 'ScheduleView', 'schedule'], ['/doctor/patients', 'PatientsView', 'patients'],
  ['/doctor/profile', 'ProfileView', 'profile'], ['/doctor/notifications', 'NotificationsView', 'activity'],
  ['/doctor/reports', 'ReportsView', 'reports'],
  ['/client/profile', '', 'patient-profile'],
  ['/doctor/patient-preview', 'PatientDetailView', 'patient-detail'],
];
async function query(sql) {
  const response = await fetch('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: false }), redirect: 'error', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) { const body=await response.json().catch(()=>({})); let message=body.message || 'Review query HTTP '+response.status; for(const value of Object.values(env).filter(value=>typeof value==='string'&&value.length>6)) message=message.split(value).join('[redacted]'); throw new Error(message); }
  return response.json();
}
function load(filename) {
  if (filename.endsWith('.module.css')) {
    const css = fs.readFileSync(filename, 'utf8');
    return { __esModule: true, default: Object.fromEntries([...css.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map(match => [match[1], 'profile_' + match[1]])) };
  }
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mockedNavigation = { usePathname: () => currentPath, useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push() {} }) };
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports,
    require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return require('../node_modules/react/jsx-runtime');
      if (name === 'lucide-react') return require('../node_modules/lucide-react');
      if (name === 'next/navigation') return mockedNavigation;
      if (name === 'next/link') return { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children), __esModule: true };
      if (name === '@/lib/auth/context') return { useAuth: () => ({ user: { id: currentSnapshot.profile.id, role: 'doctor' }, logout() {} }) };
      let resolved = name.startsWith('@/') ? path.join(sourceRoot, name.slice(2)) : path.resolve(path.dirname(filename), name);
      resolved = [resolved, resolved + '.ts', resolved + '.tsx'].find(file => fs.existsSync(file));
      if (!resolved) throw new Error('Unexpected review import: ' + name);
      return load(resolved);
    },
    console, URL, URLSearchParams, Date, Intl, AbortSignal, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: () => { throw new Error('Server rendering must not start a browser data request'); },
  }, { filename });
  return loadedModule.exports;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(operation, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const result = await operation(); if (result) return result; await delay(150); }
  return null;
}
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('Browser command timeout: ' + method)); } }, 10_000).unref();
  });
}
async function evaluate(sessionId, expression) {
  return (await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)).result?.value;
}
(async () => {
  const accounts = await query("select p.id from public.profiles p join public.doctors d on d.profile_id=p.id where p.email in ('doctor@clinic.test','doctor2@clinic.test','doctor3@clinic.test') and p.role='doctor' and d.is_active order by p.email");
  for (const account of accounts) {
    if (!/^[a-f0-9-]{36}$/i.test(account.id)) throw new Error('Invalid account ID');
    const sql = "begin read only; set local role authenticated; select set_config('request.jwt.claims','" +
      JSON.stringify({ sub: account.id, role: 'authenticated', aal: 'aal1' }) + "',true); " +
      "select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=auth.uid())," +
      "'doctor',(select to_jsonb(d) from public.doctors d where id=public.current_doctor_id())," +
      "'specialty',(select to_jsonb(s) from public.specialties s join public.doctors d on d.specialty_id=s.id where d.id=public.current_doctor_id())," +
      "'appointments',(select coalesce(jsonb_agg(a order by a.id),'[]') from public.appointments a where doctor_id=public.current_doctor_id())," +
      "'slots',(select coalesce(jsonb_agg(s order by s.id),'[]') from public.time_slots s where doctor_id=public.current_doctor_id())," +
      "'patients',(select coalesce(jsonb_agg(p),'[]') from public.profiles p where exists(select 1 from public.appointments a where a.patient_id=p.id and a.doctor_id=public.current_doctor_id()))," +
      "'events',(select coalesce(jsonb_agg(e),'[]') from (select * from public.appointment_events where doctor_id=public.current_doctor_id() order by id desc limit 100)e)," +
      "'loadedAt',now()) as snapshot; rollback;";
    const rows = await query(sql);
    const result = rows.find(row => row.snapshot)?.snapshot;
    if (!result?.profile || !result?.doctor) throw new Error('Real doctor snapshot unavailable');
    const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'id' || key.endsWith('_id') ? item == null ? item : String(item) : normalize(item)])) : value;
    snapshots.push(normalize(result));
  }
  if (snapshots.length !== 3) throw new Error('Expected three real doctors for visual review');
  fs.mkdirSync(artifacts, { recursive: true });
  const profileCss = fs.readFileSync(path.join(sourceRoot, 'components/profile/Profile.module.css'), 'utf8').replace(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g, '.profile_$1');
  const css = fs.readFileSync(path.join(sourceRoot, 'app/doctor/doctor.css'), 'utf8') + '\n' + profileCss;
  const { DoctorProvider } = load(path.join(sourceRoot, 'modules/doctor/store/store.tsx'));
  const { DoctorShell } = load(path.join(sourceRoot, 'modules/doctor/layout/DoctorShell.tsx'));
  server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      currentSnapshot = snapshots[Number(url.searchParams.get('account') || 0)];
      const route = routes.find(row => row[0] === url.pathname) || routes[0];
      currentPath = route[0];
      const ownPatient = currentSnapshot.patients[0];
      let content;
      if (route[0] === '/client/profile') {
        if (!ownPatient) throw new Error('No real patient available for a profile review');
        const { PersonalProfilePanel } = load(path.join(sourceRoot, 'components/profile/PersonalProfile.tsx'));
        content = React.createElement('main', { style: { maxWidth: 1180, margin: 'auto', padding: 22 } }, React.createElement(PersonalProfilePanel, { initialProfile: ownPatient }));
      } else {
        const View = load(path.join(sourceRoot, 'modules/doctor/views/' + route[1] + '.tsx')).default;
        content = React.createElement(DoctorShell, null, React.createElement(View, route[2] === 'patient-detail' ? { id: ownPatient?.id || 'unknown' } : {}));
      }
      const html = renderToStaticMarkup(React.createElement(DoctorProvider, { initialSnapshot: currentSnapshot }, content));
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
      res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}button{cursor:pointer}a{color:inherit}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}' + css + '</style><body>' + html + '</body></html>');
    } catch (error) { res.writeHead(500); res.end(String(error.message)); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cliniccare-doctor-review-'));
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' });
  browser.on('error', () => {});
  const marker = path.join(profile, 'DevToolsActivePort');
  const info = await until(() => fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim().split(/\r?\n/) : null, 15_000);
  if (!info) throw new Error('Hidden browser did not start');
  socket = new WebSocket('ws://127.0.0.1:' + info[0] + info[1]);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data)), item = pending.get(message.id);
    if (!item) return; pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  const findings = [];
  for (let account = 0; account < snapshots.length; account++) {
    for (const [route, , label] of (account ? [routes[0]] : routes)) {
      for (const [size, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ...(['schedule', 'profile', 'patient-profile', 'patient-detail'].includes(label) ? [['tablet', 820, 1180]] : [])]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
        await send('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port + route + '?account=' + account }, sessionId);
        if (!await until(() => evaluate(sessionId, 'document.readyState==="complete" && Boolean(document.querySelector("h1"))'), 10_000)) throw new Error('Page did not render: ' + label);
        await delay(100);
        const result = await evaluate(sessionId, '({overflow:document.documentElement.scrollWidth>innerWidth+1,width:innerWidth,contentWidth:document.documentElement.scrollWidth,headings:document.querySelectorAll("h1").length})');
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
        const filename = 'doctor-' + (account + 1) + '-' + label + '-' + size + '.png';
        fs.writeFileSync(path.join(artifacts, filename), Buffer.from(screenshot.data, 'base64'));
        findings.push({ account: account + 1, page: label, size, ...result, screenshot: filename });
      }
    }
  }
  fs.writeFileSync(path.join(artifacts, 'visual-review.json'), JSON.stringify({
    method: 'Rendered actual Doctor components with read-only snapshots queried under each authenticated database identity. This is a layout/SSR review, not an authenticated end-to-end browser test.',
    findings,
  }, null, 2) + '\n');
  console.log(JSON.stringify({ pagesReviewed: findings.length, overflowFailures: findings.filter(result => result.overflow), report: 'artifacts/doctor/visual-review.json' }));
  if (findings.some(result => result.overflow || result.headings !== 1)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (socket) { try { await send('Browser.close'); } catch {} socket.close(); }
  if (browser) await until(() => browser.exitCode !== null, 3000);
  if (browser && browser.exitCode === null) browser.kill();
  if (server) await new Promise(resolve => server.close(resolve));
  if (profile && path.dirname(profile) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('cliniccare-doctor-review-')) {
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
  }
});
