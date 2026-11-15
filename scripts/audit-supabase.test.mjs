import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateChecklist, parseEnv, collect, templateFiles } from './audit-supabase.mjs';

const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'test-site-key',
};
const templates = Object.fromEntries(Object.keys(templateFiles).map(key => [key, '<html>' + key + '</html>']));
const settings = { external: { email: true, google: true, facebook: true }, mailer_autoconfirm: false };
function fullConfig() {
  return {
    external_email_enabled: true, mailer_autoconfirm: false,
    external_google_enabled: true, external_google_client_id: 'google-client', external_google_secret: 'google-secret',
    external_facebook_enabled: true, external_facebook_client_id: 'facebook-client', external_facebook_secret: 'facebook-secret',
    ...Object.fromEntries(Object.entries(templates).map(([key, value]) => ['mailer_templates_' + key + '_content', value])),
    smtp_host: null, smtp_port: null, smtp_user: null, smtp_pass: null,
    smtp_admin_email: null, smtp_sender_name: null, smtp_max_frequency: 60,
    rate_limit_email_sent: 30, rate_limit_token_refresh: 1800, rate_limit_verify: 360, rate_limit_otp: 30,
    mfa_totp_enroll_enabled: true, mfa_totp_verify_enabled: true,
    security_captcha_enabled: true, security_captcha_provider: 'hcaptcha', security_captcha_secret: 'captcha-secret',
    password_hibp_enabled: true,
    site_url: env.APP_URL,
    uri_allow_list: ['/auth/callback', '/auth/confirm', '/reset-password'].map(path => env.APP_URL + path).join(','),
  };
}
const row = (rows, id) => rows.find(item => item.id === id);
const check = config => evaluateChecklist({ env, settings, config, templates });

test('public settings and OAuth redirects do not prove secrets or private configuration', () => {
  const rows = evaluateChecklist({ env, settings, templates, oauth: { google: true, facebook: true } });
  assert.deepEqual(rows.filter(item => item.status === 'complete').map(item => item.id), ['email']);
  assert.equal(row(rows, 'google').status, 'partial');
  assert.equal(row(rows, 'facebook').status, 'partial');
  assert.equal(row(rows, 'email_delivery').status, 'unknown');
  assert.equal(row(rows, 'totp').status, 'unknown');
  assert.equal(row(rows, 'leaked').status, 'unknown');
  assert.equal(evaluateChecklist({ env }).some(item => item.status === 'complete'), false);
});

test('full management config verifies all ten items without outputting secrets', () => {
  const rows = check(fullConfig());
  assert.equal(rows.length, 10);
  assert.equal(rows.every(item => item.status === 'complete'), true);
  for (const secret of ['google-secret', 'facebook-secret', 'smtp-secret', 'captcha-secret']) {
    assert.equal(JSON.stringify(rows).includes(secret), false);
  }
});

test('disabled confirmation and disabled providers override public settings', () => {
  const config = { ...fullConfig(), mailer_autoconfirm: true, external_google_enabled: false };
  assert.equal(row(check(config), 'email').status, 'missing');
  assert.equal(row(check(config), 'google').status, 'missing');
  config.external_facebook_secret = '********';
  assert.equal(row(check(config), 'facebook').status, 'partial');
});

test('a default recovery template and custom email delivery cannot pass', () => {
  const config = fullConfig();
  config.mailer_templates_recovery_content = '<a href="{{ .ConfirmationURL }}">Reset</a>';
  config.smtp_host = 'unexpected-custom-host';
  assert.equal(row(check(config), 'templates').status, 'partial');
  assert.notEqual(row(check(config), 'email_delivery').status, 'complete');
});

test('TOTP requires both flags; hCaptcha requires server config and local site key', () => {
  assert.equal(row(check({ ...fullConfig(), mfa_totp_verify_enabled: false }), 'totp').status, 'missing');
  assert.notEqual(row(check({ ...fullConfig(), security_captcha_provider: 'turnstile' }), 'captcha').status, 'complete');
  const rows = evaluateChecklist({ env: { ...env, NEXT_PUBLIC_HCAPTCHA_SITE_KEY: '' }, config: fullConfig(), templates });
  assert.equal(row(rows, 'captcha').status, 'partial');
});

test('URL validation rejects wildcard-only redirects, wrong site URL and invalid APP_URL', () => {
  for (const uri_allow_list of ['http://localhost:3000/**', 'http://localhost:3000/auth/callback']) {
    assert.equal(row(check({ ...fullConfig(), uri_allow_list }), 'urls').status, 'partial');
  }
  assert.equal(row(check({ ...fullConfig(), site_url: 'https://other.example.com' }), 'urls').status, 'partial');
  for (const APP_URL of ['javascript:alert(1)', 'https://example.com/path', 'https://user:password@example.com', '']) {
    const rows = evaluateChecklist({ env: { ...env, APP_URL }, config: fullConfig(), templates });
    assert.equal(row(rows, 'urls').status, 'missing');
  }
});

test('invalid quotas and disabled leaked password protection cannot pass', () => {
  for (const value of [0, -1, '30', undefined]) {
    assert.equal(row(check({ ...fullConfig(), rate_limit_otp: value }), 'rates').status, 'partial');
  }
  assert.equal(row(check({ ...fullConfig(), password_hibp_enabled: false }), 'leaked').status, 'missing');
});

test('dotenv parsing handles comments, quotes and exported values without executing them', () => {
  assert.deepEqual(parseEnv('A=one # note\nB="two # three"\nexport C=\'$(never-run)\'\n# D=x\nEMPTY='), {
    A: 'one', B: 'two # three', C: '$(never-run)', EMPTY: '',
  });
});

test('live collector uses GET only and never serializes credentials or raw error bodies', async () => {
  const calls = [];
  const config = fullConfig();
  for (const [key, filename] of Object.entries(templateFiles)) {
    config['mailer_templates_' + key + '_content'] = readFileSync(new URL('../docs/supabase-email-templates/' + filename, import.meta.url), 'utf8');
  }
  const report = await collect({ ...env, SUPABASE_ACCESS_TOKEN: 'management-secret' }, async (input, options) => {
    const url = new URL(input);
    calls.push({ url: url.href, method: options.method || 'GET' });
    if (url.hostname === 'api.supabase.com') {
      assert.equal(options.headers.Authorization, 'Bearer management-secret');
      assert.equal(options.redirect, 'error');
      return Response.json(config);
    }
    if (url.pathname === '/auth/v1/settings') return Response.json(settings);
    const provider = url.searchParams.get('provider');
    const location = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/auth' : 'https://www.facebook.com/dialog/oauth');
    location.searchParams.set('client_id', 'client');
    location.searchParams.set('redirect_uri', env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/callback');
    return new Response(null, { status: 302, headers: { location: location.href } });
  });
  assert.equal(report.complete, 10);
  assert.equal(calls.every(call => call.method === 'GET'), true);
  assert.equal(calls.length, 4);
  const output = JSON.stringify(report);
  for (const secret of ['management-secret', 'google-secret', 'facebook-secret', 'smtp-secret', 'captcha-secret', 'sb_publishable_test']) {
    assert.equal(output.includes(secret), false);
  }
  const failed = await collect({ ...env, SUPABASE_ACCESS_TOKEN: 'management-secret' }, async input =>
    new URL(input).hostname === 'api.supabase.com'
      ? new Response('private-error-secret', { status: 403 })
      : Response.json(settings));
  assert.equal(failed.complete, 1);
  assert.equal(failed.managementConfigRead, false);
  assert.equal(JSON.stringify(failed).includes('private-error-secret'), false);
});
