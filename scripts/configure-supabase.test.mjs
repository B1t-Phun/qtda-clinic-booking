import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthPatch, configureAuth } from './configure-supabase.mjs';

const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', APP_URL: 'http://localhost:3000' };
test('managed config uses default Supabase email without paid template customization', () => {
  const { patch, skipped } = buildAuthPatch(env);
  assert.equal(patch.external_email_enabled, true);
  assert.equal(patch.mailer_autoconfirm, false);
  assert.equal(patch.mailer_allow_unverified_email_sign_ins, false);
  assert.equal(patch.security_update_password_require_reauthentication, true);
  assert.equal(patch.mfa_totp_enroll_enabled, true);
  assert.equal(patch.mfa_totp_verify_enabled, true);
  assert.equal(patch.password_min_length, 12);
  assert.equal(patch.smtp_host, null);
  assert.equal(patch.smtp_user, null);
  assert.equal(patch.smtp_pass, null);
  assert.equal(Object.hasOwn(patch, 'rate_limit_email_sent'), false);
  assert.equal(Object.hasOwn(patch, 'smtp_sender_name'), false);
  assert.equal(Object.keys(patch).some(key => key.startsWith('mailer_templates_') || key.startsWith('mailer_subjects_')), false);
  assert.equal(skipped.length, 4);
  assert.equal('external_google_enabled' in patch, false);
  assert.equal('security_captcha_enabled' in patch, false);
  assert.equal('password_hibp_enabled' in patch, false);
});
test('URL configuration preserves existing redirects and adds exact routes for explicit origins', () => {
  const { patch } = buildAuthPatch({ ...env, AUTH_ADDITIONAL_ORIGINS: 'https://clinic.example.com' }, { uri_allow_list: 'https://old.example.com/auth/callback' });
  const urls = patch.uri_allow_list.split(',');
  assert.equal(urls.length, 7);
  assert.ok(urls.includes('https://old.example.com/auth/callback'));
  assert.ok(urls.includes('https://clinic.example.com/auth/confirm'));
  assert.equal(patch.site_url, env.APP_URL);
  for (const APP_URL of ['http://public.example.com', 'https://clinic.example.com/path', 'https://user:pass@clinic.example.com']) {
    assert.throws(() => buildAuthPatch({ ...env, APP_URL }));
  }
});
test('incomplete OAuth or CAPTCHA credentials fail before any PATCH', async () => {
  for (const extra of [{ SUPABASE_AUTH_GOOGLE_CLIENT_ID: 'client' }, { NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'site-key' }]) {
    let writes = 0;
    await assert.rejects(() => configureAuth({ ...env, ...extra, SUPABASE_ACCESS_TOKEN: 'admin-token' }, {
      apply: true, fetcher: async (_url, options) => {
        if (options.method === 'PATCH') writes++;
        return Response.json({});
      },
    }));
    assert.equal(writes, 0);
  }
});
test('OAuth, CAPTCHA and leaked-password settings are applied only with complete inputs', () => {
  const { patch } = buildAuthPatch({
    ...env, SUPABASE_AUTH_GOOGLE_CLIENT_ID: 'google-id', SUPABASE_AUTH_GOOGLE_SECRET: 'google-secret',
    SUPABASE_AUTH_FACEBOOK_CLIENT_ID: 'facebook-id', SUPABASE_AUTH_FACEBOOK_SECRET: 'facebook-secret',
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'site-key', SUPABASE_AUTH_CAPTCHA_SECRET: 'captcha-secret',
    SUPABASE_ENABLE_LEAKED_PASSWORD_PROTECTION: 'true',
  });
  assert.equal(patch.external_google_enabled, true);
  assert.equal(patch.external_facebook_secret, 'facebook-secret');
  assert.equal(patch.security_captcha_provider, 'hcaptcha');
  assert.equal(patch.password_hibp_enabled, true);
});
test('preview does not write; apply requires Management token rather than service role', async () => {
  const preview = await configureAuth(env, { fetcher: () => assert.fail('preview without token must be offline') });
  assert.equal(preview.applied, false);
  await assert.rejects(() => configureAuth({ ...env, SUPABASE_SERVICE_ROLE_KEY: 'service-secret' }, { apply: true }), /SUPABASE_ACCESS_TOKEN/);
});
test('apply sends a real PATCH, verifies saved fields and excludes secrets from output', async () => {
  let saved = { uri_allow_list: 'https://existing.example.com/auth/callback', smtp_host: 'existing-smtp' };
  const methods = [];
  const result = await configureAuth({
    ...env, SUPABASE_ACCESS_TOKEN: 'admin-token',
    SUPABASE_AUTH_GOOGLE_CLIENT_ID: 'client-id', SUPABASE_AUTH_GOOGLE_SECRET: 'google-secret',
  }, {
    apply: true, fetcher: async (url, options) => {
      assert.equal(url, 'https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth');
      assert.equal(options.headers.Authorization, 'Bearer admin-token');
      assert.equal(options.redirect, 'error');
      methods.push(options.method || 'GET');
      if (options.method === 'PATCH') saved = { ...saved, ...JSON.parse(options.body) };
      return Response.json({ ...saved, external_google_secret: '********' });
    },
  });
  assert.deepEqual(methods, ['GET', 'PATCH', 'GET']);
  assert.equal(result.applied, true);
  for (const secret of ['admin-token', 'google-secret', 'client-id']) assert.equal(JSON.stringify(result).includes(secret), false);
});
test('rejected writes and mismatched readback are reported without remote secrets', async () => {
  const rejection = () => configureAuth({ ...env, SUPABASE_ACCESS_TOKEN: 'admin-token' }, {
    apply: true, fetcher: async (_url, options) => options.method === 'PATCH'
      ? new Response('server-secret-do-not-print', { status: 403 }) : Response.json({}),
  });
  await assert.rejects(rejection, error => /HTTP 403/.test(error.message) && !error.message.includes('server-secret'));
  await assert.rejects(() => configureAuth({ ...env, SUPABASE_ACCESS_TOKEN: 'admin-token' }, {
    apply: true, fetcher: async () => Response.json({}),
  }), /đọc lại chưa khớp/);
});
test('stale SMTP environment values cannot restore custom delivery or block configuration', async () => {
  let saved = {}, payload;
  const result = await configureAuth({
    ...env, SUPABASE_ACCESS_TOKEN: 'admin-token', SMTP_HOST: 'old-smtp', SMTP_PASS: 'bad-secret', SUPABASE_EMAIL_RATE_LIMIT: '100',
  }, {
    apply: true, fetcher: async (_url, options) => {
      if (options.method === 'PATCH') { payload = JSON.parse(options.body); saved = payload; }
      return Response.json(saved);
    },
  });
  assert.equal(result.applied, true);
  assert.equal(payload.smtp_host, null);
  assert.equal(payload.smtp_pass, null);
  assert.equal(Object.hasOwn(payload, 'rate_limit_email_sent'), false);
  assert.equal(Object.hasOwn(payload, 'smtp_sender_name'), false);
  assert.equal(JSON.stringify(payload).includes('bad-secret'), false);
});
