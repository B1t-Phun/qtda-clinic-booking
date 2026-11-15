/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
const filename = path.resolve(__dirname, '../src/lib/auth/http.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function helpers(env) {
  const loadedModule = { exports: {} };
  vm.runInNewContext(source, {
    module: loadedModule, exports: loadedModule.exports, process: { env },
    require: name => name === 'next/server' ? { NextResponse: { json: (body, options) => Response.json(body, options) } } : {},
    URL, Request, Response, Headers, Buffer,
  });
  return loadedModule.exports;
}
const configured = 'http://cliniccare.localhost:3000';
function request(url, origin, headers = {}) {
  return new Request(url + '/api/doctor/appointment', {
    method: 'POST', headers: { ...(origin === undefined ? {} : { origin }), ...headers },
  });
}
test('development accepts local aliases on the configured application port', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: configured });
  for (const origin of ['http://localhost:3000', configured, 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://cliniccare.localhost:3000']) {
    assert.doesNotThrow(() => http.assertSameOrigin(request(origin, origin, { 'sec-fetch-site': 'same-origin' })), origin);
    assert.equal(http.appOrigin(request(origin, origin)), origin, 'Callbacks must remain on the browser host');
  }
});
test('Next.js internal localhost URL preserves the configured local browser alias', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: configured });
  const req = request('http://localhost:3000', configured, { host: 'cliniccare.localhost:3000', 'sec-fetch-site': 'same-origin' });
  assert.doesNotThrow(() => http.assertSameOrigin(req));
  assert.equal(http.appOrigin(req), configured);
});
test('development still rejects unrelated sites, missing Origin, port mismatch and cross-site requests', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: configured });
  for (const req of [
    request('http://localhost:3000', 'https://evil.example'),
    request('http://localhost:3000', undefined),
    request('http://localhost:3000', 'null'),
    request('http://localhost:3000', 'http://localhost:3001'),
    request('http://localhost:3000', 'http://localhost:3000', { 'sec-fetch-site': 'cross-site' }),
    request('http://localhost:3000', 'http://localhost.evil.example:3000'),
    request('http://localhost:3000', 'https://evil.example', { 'x-forwarded-host': 'evil.example' }),
  ]) assert.throws(() => http.assertSameOrigin(req), error => error.status === 403);
});
test('a nonlocal APP_URL does not enable automatic loopback aliases', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: 'https://clinic.example' });
  assert.throws(() => http.assertSameOrigin(request('http://localhost:3000', 'http://localhost:3000')), error => error.status === 403);
});
test('production requires the configured origin and does not trust local or forwarded host aliases', () => {
  const http = helpers({ NODE_ENV: 'production', APP_URL: 'https://clinic.example' });
  assert.doesNotThrow(() => http.assertSameOrigin(request('https://clinic.example', 'https://clinic.example')));
  for (const req of [
    request('http://localhost:3000', 'http://localhost:3000'),
    request('https://clinic.example', 'https://evil.example', { host: 'evil.example', 'x-forwarded-host': 'evil.example' }),
    request('https://clinic.example', 'https://clinic.example', { 'sec-fetch-site': 'cross-site' }),
  ]) assert.throws(() => http.assertSameOrigin(req), error => error.status === 403);
  assert.equal(http.appOrigin(request('http://localhost:3000', 'http://localhost:3000')), 'https://clinic.example');
  assert.throws(() => helpers({ NODE_ENV: 'production' }).appOrigin(request('http://localhost:3000')));
});
test('origin rejection returns a distinct code rather than pretending that login expired', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: configured });
  let caught;
  try { http.assertSameOrigin(request('http://localhost:3000', 'https://evil.example')); } catch (error) { caught = error; }
  assert.equal(caught?.code, 'origin_mismatch');
});

test('a different local port is accepted only when that port is configured', () => {
  const http = helpers({ NODE_ENV: 'development', APP_URL: 'http://cliniccare.localhost:3001' });
  assert.doesNotThrow(() => http.assertSameOrigin(request('http://127.0.0.1:3001', 'http://localhost:3001')));
  assert.throws(() => http.assertSameOrigin(request('http://127.0.0.1:3001', 'http://localhost:3000')), error => error.status === 403);
});
