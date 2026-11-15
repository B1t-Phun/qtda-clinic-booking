// Direct Supabase API checks use publishable key + each doctor's real access token.
// No service-role client is constructed. Password login can be blocked by project CAPTCHA.
import assert from 'node:assert/strict';
import projectEnv from './env.cjs';
const env = projectEnv.loadProjectEnv();
const accounts = ['doctor@clinic.test', 'doctor2@clinic.test', 'doctor3@clinic.test'];
const password = process.env.DOCTOR_TEST_PASSWORD;
const sessions = [];
let blocked = 0;
async function api(path, token, options = {}) {
  const response = await fetch(new URL(path, env.NEXT_PUBLIC_SUPABASE_URL), {
    ...options, headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      'Content-Type': 'application/json', ...options.headers,
    }, redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, ok: response.ok, data: await response.json().catch(() => null) };
}
for (let index = 0; index < accounts.length; index++) {
  let token = process.env['DOCTOR_TEST_ACCESS_TOKEN_' + (index + 1)];
  if (!token && password) {
    const result = await api('/auth/v1/token?grant_type=password', null, {
      method: 'POST', body: JSON.stringify({ email: accounts[index], password }),
    });
    if (!result.ok || !result.data?.access_token) {
      console.log(JSON.stringify({ account: accounts[index], login: 'blocked', status: result.status, code: result.data?.error_code || result.data?.code || 'unknown' }));
      blocked++; continue;
    }
    token = result.data.access_token;
  }
  if (!token) { console.log(JSON.stringify({ account: accounts[index], login: 'blocked', reason: 'Provide password or a real user access token.' })); blocked++; continue; }
  const verified = await api('/auth/v1/user', token);
  assert.equal(verified.ok, true, 'User token verification failed');
  assert.equal(verified.data.email, accounts[index], 'Token belongs to the wrong account');
  const doctor = await api('/rest/v1/doctors?select=id,profile_id&profile_id=eq.' + verified.data.id + '&is_active=eq.true', token);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.data.length, 1);
  sessions.push({ email: accounts[index], token, userId: verified.data.id, doctorId: doctor.data[0].id });
}
for (const session of sessions) {
  const appointments = await api('/rest/v1/appointments?select=id,doctor_id,patient_id&limit=20000', session.token);
  const events = await api('/rest/v1/appointment_events?select=id,doctor_id&limit=100', session.token);
  assert.equal(appointments.ok, true); assert.equal(events.ok, true);
  assert.ok(appointments.data.every(row => row.doctor_id === session.doctorId));
  assert.ok(events.data.every(row => row.doctor_id === session.doctorId));
  for (const other of sessions.filter(other => other.userId !== session.userId)) {
    const foreign = await api('/rest/v1/appointments?select=id&doctor_id=eq.' + other.doctorId, session.token);
    assert.equal(foreign.ok, true); assert.deepEqual(foreign.data, []);
    const profile = await api('/rest/v1/rpc/current_doctor_id', session.token, { method: 'POST', body: '{}' });
    assert.equal(profile.data, session.doctorId);
  }
  console.log(JSON.stringify({ account: session.email, directRestReads: 'passed', ownAppointments: appointments.data.length, ownEvents: events.data.length }));
}
console.log(JSON.stringify({
  verifiedAccounts: sessions.length, blockedAccounts: blocked,
  crossAccountReadChecks: sessions.length === 3 ? 'passed' : 'not fully verified',
  mutationChecks: 'Run supabase/tests/doctor_isolation.sql inside its rollback transaction; this script never mutates clinic records.',
  note: 'No tokens or passwords are printed. Existing data is not modified.',
}));
if (blocked) process.exitCode = 2;
