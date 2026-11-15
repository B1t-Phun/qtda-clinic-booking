const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAuthMiddleware } = require('../middleware/auth');
const id = 'df24b2cb-5130-4b9e-8dc0-62ab47d8e081';
const doctorId = 'df24b2cb-5130-4b9e-8dc0-62ab47d8e082';
const token = (aal = 'aal1') => 'header.' + Buffer.from(JSON.stringify({ aal })).toString('base64url') + '.signature';
function fixture({ role = 'patient', confirmed = true, valid = true, active = true, factors = [], aal = 'aal1' } = {}) {
  const client = { from(table) {
    const query = {
      select() { return query; }, eq() { return query; },
      single: async () => ({ data: { id, role }, error: null }),
      maybeSingle: async () => ({ data: table === 'doctors' && active ? { id: doctorId } : null, error: null }),
    }; return query;
  } };
  const middleware = createAuthMiddleware({
    verifier: { auth: { getUser: async () => ({ data: { user: valid ? { id, email_confirmed_at: confirmed ? 'confirmed' : null, factors, user_metadata: { role: 'admin' } } : null }, error: valid ? null : new Error('Invalid') }) } },
    userClient: () => client,
  });
  const req = { get: () => 'Bearer ' + token(aal), query: {}, body: {} };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, set() {} };
  return { middleware, req, res };
}
test('missing and invalid credentials are rejected', async () => {
  for (const valid of [true, false]) {
    const f = fixture({ valid });
    if (valid) f.req.get = () => '';
    let next = false;
    await f.middleware.requireUser(f.req, f.res, () => { next = true; });
    assert.equal(f.res.statusCode, 401); assert.equal(next, false);
  }
});
test('unconfirmed email has no API access', async () => {
  const f = fixture({ confirmed: false });
  await f.middleware.requireUser(f.req, f.res, () => assert.fail('must not continue'));
  assert.equal(f.res.statusCode, 401);
});
test('role is taken from profiles, never editable user metadata', async () => {
  const f = fixture();
  await f.middleware.requireUser(f.req, f.res, () => {});
  assert.equal(f.req.auth.role, 'patient');
  f.middleware.requireRole('admin')(f.req, f.res, () => assert.fail('must not become admin'));
  assert.equal(f.res.statusCode, 403);
});
test('MFA blocks AAL1 but accepts verified AAL2 sessions', async () => {
  for (const aal of ['aal1', 'aal2']) {
    const f = fixture({ factors: [{ status: 'verified' }], aal });
    let next = false;
    await f.middleware.requireUser(f.req, f.res, () => { next = true; });
    assert.equal(next, aal === 'aal2');
    assert.equal(f.res.statusCode, aal === 'aal2' ? 200 : 403);
  }
});
test('disabled doctors cannot enter doctor API', async () => {
  const f = fixture({ role: 'doctor', active: false });
  await f.middleware.requireUser(f.req, f.res, () => assert.fail('must not continue'));
  assert.equal(f.res.statusCode, 403);
});
test('patient identity is injected from session and tampered IDs are rejected', async () => {
  const f = fixture();
  await f.middleware.requireUser(f.req, f.res, () => {});
  f.middleware.bindPatient(f.req, f.res, () => {});
  assert.equal(f.req.query.patient_id, id); assert.equal(f.req.body.patient_id, id);
  for (const supplied of ['other-id', [id], { $ne: null }]) {
    f.req.body.patient_id = supplied;
    f.middleware.bindPatient(f.req, f.res, () => assert.fail('must reject forged identity'));
    assert.equal(f.res.statusCode, 403);
  }
});
test('doctor identity uses the linked doctor row, not the profile id or request input', async () => {
  const f = fixture({ role: 'doctor' });
  await f.middleware.requireUser(f.req, f.res, () => {});
  f.middleware.bindDoctor(f.req, f.res, () => {});
  assert.equal(f.req.query.doctor_id, doctorId); assert.equal(f.req.body.doctor_id, doctorId);
  f.req.query.doctor_id = id;
  f.middleware.bindDoctor(f.req, f.res, () => assert.fail('must reject'));
  assert.equal(f.res.statusCode, 403);
});
