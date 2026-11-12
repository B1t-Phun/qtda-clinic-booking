import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import projectEnv from './env.cjs';
const { parseEnv, loadProjectEnv } = projectEnv;
export { parseEnv };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const templateFiles = {
  confirmation: 'confirm-signup.html',
  invite: 'invite-user.html',
  magic_link: 'magic-link.html',
  email_change: 'change-email.html',
  recovery: 'reset-password.html',
  reauthentication: 'reauthentication.html',
};


function present(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    !/^(?:\*+|<.*>|your[_-].*|.*_here)$/i.test(value.trim());
}
function origin(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch { return null; }
}
const normalize = value => typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';

export function evaluateChecklist({ env = {}, settings, config, templates = {}, oauth = {} }) {
  const rows = [];
  const add = (id, title, status, evidence) => rows.push({ id, title, status, evidence });
  const emailEnabled = config?.external_email_enabled ?? settings?.external?.email;
  const autoconfirm = config?.mailer_autoconfirm ?? settings?.mailer_autoconfirm;
  add('email', 'Bật Email Provider và Confirm Email',
    emailEnabled === true && autoconfirm === false ? 'complete' :
      emailEnabled === false || autoconfirm === true ? 'missing' : 'unknown',
    emailEnabled === undefined || autoconfirm === undefined ? 'Chưa đọc được settings.' :
      'Email enabled=' + emailEnabled + '; mailer_autoconfirm=' + autoconfirm + '.');

  for (const [provider, label] of [['google', 'Google OAuth Client ID và Secret'], ['facebook', 'Facebook App ID và App Secret']]) {
    const enabled = config?.['external_' + provider + '_enabled'] ?? settings?.external?.[provider];
    const credentials = ['client_id', 'secret'].map(key => config?.['external_' + provider + '_' + key]);
    const status = enabled === false ? 'missing' : enabled === true && credentials.every(present) ? 'complete' :
      enabled === true ? 'partial' : 'unknown';
    add(provider, label, status, status === 'complete'
      ? 'Provider bật; có ID và secret trong cấu hình quản trị. Cần thử đăng nhập thực tế.'
      : 'Provider ' + (enabled === true ? 'đã bật' : enabled === false ? 'chưa bật' : 'chưa xác minh') +
        (oauth[provider] === true ? '; authorize trả redirect đúng nhà cung cấp, có client_id và callback Supabase' : '') +
        '; chưa xác minh đủ ID/secret và luồng đăng nhập.');
  }

  const templateKeys = Object.keys(templateFiles);
  const localTemplates = templateKeys.every(key => typeof templates[key] === 'string' && templates[key].trim().length > 0);
  const matchingTemplates = config && localTemplates && templateKeys.every(key =>
    normalize(config['mailer_templates_' + key + '_content']) === normalize(templates[key]));
  add('templates', 'Cấu hình Email Templates', matchingTemplates ? 'complete' : localTemplates ? 'partial' : 'missing',
    matchingTemplates ? 'Cả 6 template trên Supabase khớp các mẫu trong repo.' :
      localTemplates ? 'Repo có 6 mẫu; chưa xác nhận đã áp dụng trên Supabase.' : 'Thiếu file template trong repo.');

  const defaultEmail = config && Object.hasOwn(config, 'smtp_host') && !config.smtp_host;
  add('email_delivery', 'Gửi email mặc định Supabase', defaultEmail ? 'complete' : config ? 'missing' : 'unknown',
    defaultEmail ? 'Đang dùng email mặc định Supabase; chỉ gửi tới địa chỉ được Supabase cho phép.' :
      config ? 'Project còn bật máy chủ email tùy chỉnh.' : 'Chưa đọc được cấu hình gửi email.');

  const rateKeys = ['rate_limit_email_sent', 'rate_limit_token_refresh', 'rate_limit_verify', 'rate_limit_otp'];
  const rates = rateKeys.map(key => [key, config?.[key]]);
  const rateReady = config && rates.every(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0) &&
    typeof config.smtp_max_frequency === 'number' && config.smtp_max_frequency > 0;
  add('rates', 'Kiểm tra Rate Limits', rateReady ? 'complete' : config ? 'partial' : 'unknown',
    config ? rates.map(([key, value]) => key + '=' + (typeof value === 'number' ? value : 'chưa rõ')).join('; ') +
      '; smtp_max_frequency=' + (typeof config.smtp_max_frequency === 'number' ? config.smtp_max_frequency : 'chưa rõ') +
      '. Cần đối chiếu quota theo lưu lượng thực tế; không tự tăng giới hạn.' : 'Chưa đọc được quota; ứng dụng đã xử lý lỗi 429.');

  const totp = config?.mfa_totp_enroll_enabled === true && config?.mfa_totp_verify_enabled === true;
  add('totp', 'Bật TOTP MFA', totp ? 'complete' : config ? 'missing' : 'unknown',
    totp ? 'Đã bật enroll và verify TOTP. Cần thử tại /account/security.' :
      config ? 'Chưa xác nhận cả enroll và verify TOTP được bật.' : 'Code enroll/verify/challenge đã có; chưa đọc được cờ TOTP trên Supabase.');

  const sitekey = present(env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);
  const captcha = config?.security_captcha_enabled === true && config?.security_captcha_provider === 'hcaptcha' &&
    present(config?.security_captcha_secret) && sitekey;
  add('captcha', 'Cấu hình CAPTCHA hCaptcha', captcha ? 'complete' : config?.security_captcha_enabled === false ? 'missing' : 'partial',
    captcha ? 'hCaptcha bật; có secret server và site key frontend. Cần thử domain/token thực tế.' :
      (sitekey ? 'Frontend có site key. ' : 'Frontend thiếu NEXT_PUBLIC_HCAPTCHA_SITE_KEY. ') +
      'Cần xác nhận provider, secret và domain trên Dashboard hCaptcha/Supabase.');

  add('leaked', 'Kiểm tra Leaked Password Protection',
    config?.password_hibp_enabled === true ? 'complete' : config?.password_hibp_enabled === false ? 'missing' : 'unknown',
    config?.password_hibp_enabled === true ? 'password_hibp_enabled=true.' :
      'Chưa xác nhận đã bật; tính năng yêu cầu Pro trở lên. Code weak_password không chứng minh kiểm tra mật khẩu rò rỉ đang bật.');

  const appOrigin = origin(env.APP_URL);
  const redirects = typeof config?.uri_allow_list === 'string' ? config.uri_allow_list.split(',').map(url => url.trim()) : [];
  const required = appOrigin ? ['/auth/callback', '/auth/confirm', '/reset-password'].map(path => appOrigin + path) : [];
  const urlsReady = appOrigin && config?.site_url === appOrigin && required.every(url => redirects.includes(url));
  add('urls', 'Cấu hình Site URL và Redirect URLs', urlsReady ? 'complete' : appOrigin ? 'partial' : 'missing',
    urlsReady ? 'Site URL khớp APP_URL; đủ 3 redirect URL chính xác.' :
      appOrigin ? 'APP_URL hợp lệ; cần Site URL khớp và allow list có /auth/callback, /auth/confirm, /reset-password.' :
        'APP_URL thiếu hoặc không phải origin HTTP(S) hợp lệ.');
  return rows;
}

export async function collect(env, fetcher = fetch) {
  const templates = Object.fromEntries(Object.entries(templateFiles).map(([key, file]) => {
    const path = resolve(root, 'docs/supabase-email-templates', file);
    return [key, existsSync(path) ? readFileSync(path, 'utf8') : ''];
  }));
  const base = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
      !(base.protocol === 'https:' || base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) {
    throw new Error('Invalid Supabase URL');
  }
  const warnings = [];
  const headers = { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  let settings;
  try {
    const response = await fetcher(new URL('/auth/v1/settings', base), { headers, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (response.ok) settings = await response.json();
    else warnings.push('Không đọc được public settings (HTTP ' + response.status + ').');
  } catch { warnings.push('Không đọc được public settings; kiểm tra mạng và URL/API key.'); }

  const oauth = {};
  await Promise.all(['google', 'facebook'].map(async provider => {
    if (settings?.external?.[provider] !== true) return;
    try {
      const target = new URL('/auth/v1/authorize', base);
      target.searchParams.set('provider', provider);
      if (origin(env.APP_URL)) target.searchParams.set('redirect_to', origin(env.APP_URL) + '/auth/callback');
      const response = await fetcher(target, { headers, redirect: 'manual', signal: AbortSignal.timeout(10000) });
      const location = response.headers.get('location');
      if (!location) return;
      const url = new URL(location);
      oauth[provider] = response.status === 302 &&
        (provider === 'google' ? url.hostname === 'accounts.google.com' : url.hostname === 'www.facebook.com') &&
        Boolean(url.searchParams.get('client_id')) &&
        url.searchParams.get('redirect_uri') === new URL('/auth/v1/callback', base).href;
    } catch { warnings.push('Chưa kiểm tra được redirect ' + provider + '.'); }
  }));

  let config;
  const projectRef = /^([a-z0-9]{20})\.supabase\.co$/.exec(base.hostname)?.[1];
  if (env.SUPABASE_ACCESS_TOKEN && projectRef) {
    try {
      const response = await fetcher('https://api.supabase.com/v1/projects/' + projectRef + '/config/auth', {
        headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN },
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (response.ok) config = await response.json();
      else warnings.push('Không đọc được Management API (HTTP ' + response.status + '); không dùng service role thay access token.');
    } catch { warnings.push('Không đọc được Management API; chưa xác minh các mục quản trị.'); }
  } else {
    warnings.push('Chưa có SUPABASE_ACCESS_TOKEN hoặc URL project hosted: chỉ kiểm tra được cấu hình công khai và file local.');
  }
  const checklist = evaluateChecklist({ env, settings, config, templates, oauth });
  return {
    checkedAt: new Date().toISOString(),
    complete: checklist.filter(row => row.status === 'complete').length,
    total: checklist.length,
    managementConfigRead: Boolean(config),
    checklist,
    warnings,
    note: 'Đây là kiểm tra cấu hình; OAuth/email/MFA/CAPTCHA cần kiểm thử thực tế. Script chỉ GET, không sửa project hay gửi email.',
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node scripts/audit-supabase.mjs [--json]\nHợp nhất các file .env ở root, backend, frontend, supabase; shell được ưu tiên.\nTùy chọn SUPABASE_ACCESS_TOKEN để đọc Management API. Không dùng service role.\nChỉ GET; không in secrets, không sửa cấu hình và không gửi email.');
    return;
  }
  if (args.some(arg => arg !== '--json')) throw new Error('Unknown argument');
  const env = loadProjectEnv();
  if (!present(env.NEXT_PUBLIC_SUPABASE_URL) || !present(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Missing Supabase environment');
  }
  const report = await collect(env);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    const labels = { complete: 'ĐẠT', partial: 'MỘT PHẦN', missing: 'THIẾU', unknown: 'CHƯA XÁC MINH' };
    console.log('Supabase: ' + report.complete + '/' + report.total + ' mục được xác minh đủ cấu hình\n');
    for (const row of report.checklist) console.log('[' + labels[row.status] + '] ' + row.title + '\n  ' + row.evidence);
    for (const warning of report.warnings) console.log('\nLưu ý: ' + warning);
    console.log('\n' + report.note);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Không thể kiểm tra. Kiểm tra frontend/.env.local, URL/API key và tham số --help. Không ghi log secrets.');
    process.exitCode = 1;
  });
}
