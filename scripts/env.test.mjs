import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import projectEnv from './env.cjs';
const { loadProjectEnv, loadFrontendEnv } = projectEnv;

test('one root env configures every service without reading obsolete env files', () => {
  const root = resolve('example');
  const reads = [];
  const env = loadProjectEnv({ root, shell: { PORT: '5002', SUPABASE_SERVICE_ROLE_KEY: '' }, read: file => {
    reads.push(file);
    assert.equal(file, resolve(root, '.env.local'));
    return [
      'NEXT_PUBLIC_SUPABASE_URL=https://same.supabase.co',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-key',
      'SUPABASE_SERVICE_ROLE_KEY=server-secret',
      'SUPABASE_ACCESS_TOKEN=admin-token',
      'APP_URL=http://localhost:3000',
      'NEXT_PUBLIC_HCAPTCHA_SITE_KEY=site-key',
      'SUPABASE_AUTH_CAPTCHA_SECRET=captcha-secret',
      'PORT=5000',
    ].join('\n');
  } });
  assert.deepEqual(reads, [resolve(root, '.env.local')]);
  assert.equal(env.PORT, '5002');
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, 'server-secret');
  assert.equal(env.SUPABASE_ACCESS_TOKEN, 'admin-token');
  assert.equal(env.APP_URL, 'http://localhost:3000');
  assert.equal(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY, 'site-key');
  assert.equal(env.SUPABASE_AUTH_CAPTCHA_SECRET, 'captcha-secret');
});

test('aliases work and missing local env supports deployment through environment variables', () => {
  const env = loadProjectEnv({
    shell: { SUPABASE_URL: 'https://same.supabase.co', SUPABASE_ANON_KEY: 'public-key', HCAPTCHA_SITE_KEY: 'site' },
    read: () => null,
  });
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'https://same.supabase.co');
  assert.equal(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'public-key');
  assert.equal(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY, 'site');
});

test('mixed projects and private browser keys are rejected without exposing credentials', () => {
  assert.throws(() => loadProjectEnv({
    shell: { NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' },
    read: () => 'NEXT_PUBLIC_SUPABASE_URL=https://same.supabase.co',
  }), /project Supabase khác nhau/);
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.signature';
  for (const key of [token, 'sb_secret_private', 'https://same.supabase.co']) {
    assert.throws(() => loadProjectEnv({ shell: { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, read: () => null }),
      error => !error.message.includes(key));
  }
});

test('Next.js receives its site key and app origin without loading administrative credentials', () => {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://same.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'site-key',
    NEXT_PUBLIC_AUTH_MANUAL_LINKING: 'false',
    APP_URL: 'http://localhost:3000',
  };
  const env = loadFrontendEnv({
    shell: {
      ...publicEnv, SUPABASE_SERVICE_ROLE_KEY: 'server-secret', SUPABASE_ACCESS_TOKEN: 'admin-token',
      SUPABASE_AUTH_CAPTCHA_SECRET: 'captcha-secret', SUPABASE_AUTH_GOOGLE_SECRET: 'google-secret',
      NEXT_PUBLIC_UNKNOWN_SECRET: 'unexpected-secret', PORT: '5000',
    },
    read: () => null,
  });
  assert.deepEqual(env, publicEnv);
});
