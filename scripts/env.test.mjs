import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import projectEnv from './env.cjs';
import { syncEnvironments, updateEnvFile } from './sync-env.mjs';
const { parseEnv, loadProjectEnv } = projectEnv;

test('env files combine without blank samples or placeholders erasing real credentials', () => {
  const files = {
    '.env.local': 'NEXT_PUBLIC_SUPABASE_URL=https://same.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=root-secret\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-key',
    'backend/.env': 'PORT=5001',
    'frontend/.env.local': 'APP_URL=http://localhost:3000\nSUPABASE_SERVICE_ROLE_KEY=your_service_role_key',
    'supabase/.env.local': 'SUPABASE_ACCESS_TOKEN=admin-token\nNEXT_PUBLIC_HCAPTCHA_SITE_KEY=site-key\nPORT=',
  };
  const env = loadProjectEnv({ root: resolve('example'), shell: { PORT: '5002' }, read: file => {
    const relative = file.slice(resolve('example').length + 1).replaceAll('\\', '/');
    return files[relative] ?? null;
  } });
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, 'root-secret');
  assert.equal(env.PORT, '5002');
  assert.equal(env.APP_URL, 'http://localhost:3000');
  assert.equal(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY, 'site-key');
  assert.equal(env.SUPABASE_ACCESS_TOKEN, 'admin-token');
});
test('aliases work, mixed projects and private browser keys are rejected without exposing values', () => {
  const env = loadProjectEnv({ shell: { SUPABASE_URL: 'https://same.supabase.co', SUPABASE_ANON_KEY: 'public-key', HCAPTCHA_SITE_KEY: 'site' }, read: () => null });
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'https://same.supabase.co');
  assert.equal(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY, 'site');
  assert.throws(() => loadProjectEnv({ shell: { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }, read: () => 'NEXT_PUBLIC_SUPABASE_URL=https://same.supabase.co' }), /project Supabase khác nhau/);
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.signature';
  for (const key of [token, 'sb_secret_private', 'https://same.supabase.co']) {
    assert.throws(() => loadProjectEnv({ shell: { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, read: () => null }));
  }
});
test('frontend sync only writes public configuration and removes old server credentials', () => {
  const output = updateEnvFile('APP_URL=http://old\nSUPABASE_SERVICE_ROLE_KEY=old-secret\nSMTP_PASS=mail-secret\nOTHER=value\n', { APP_URL: 'http://localhost:3000', NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'public-site' }, { frontend: true });
  assert.equal(output.includes('old-secret'), false);
  assert.equal(output.includes('mail-secret'), false);
  assert.equal(parseEnv(output).NEXT_PUBLIC_HCAPTCHA_SITE_KEY, 'public-site');
  assert.equal(parseEnv(output).OTHER, 'value');
});
test('sync separates backend credentials from frontend and is idempotent', () => {
  const memory = new Map();
  const env = { APP_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_URL: 'https://same.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key', NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'site', SUPABASE_SERVICE_ROLE_KEY: 'server-secret', SUPABASE_ACCESS_TOKEN: 'admin-token', SMTP_PASS: 'smtp-secret' };
  const options = { projectRoot: resolve('example'), read: path => memory.get(path) || '', write: (path, text) => memory.set(path, text) };
  assert.equal(syncEnvironments(env, options).length, 2);
  assert.equal(syncEnvironments(env, options).length, 0);
  const frontend = memory.get(resolve('example/frontend/.env.local'));
  const backend = memory.get(resolve('example/backend/.env'));
  for (const secret of ['server-secret', 'admin-token', 'smtp-secret']) assert.equal(frontend.includes(secret), false);
  assert.equal(backend.includes('server-secret'), true);
  assert.equal(backend.includes('admin-token'), false);
});
