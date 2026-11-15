import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import projectEnv from './env.cjs';
const { loadProjectEnv } = projectEnv;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const managed = JSON.parse(readFileSync(resolve(root, 'supabase/auth.config.json'), 'utf8'));
function value(env, key) {
  return typeof env[key] === 'string' ? env[key].trim() : '';
}
function validOrigin(source) {
  const url = new URL(source);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) {
    throw new Error('APP_URL/origin phải là HTTPS hoặc HTTP localhost, không có đường dẫn con.');
  }
  return url.origin;
}
function credentials(env, keys, group) {
  const supplied = keys.filter(key => value(env, key));
  if (!supplied.length) return false;
  const missing = keys.filter(key => !value(env, key));
  if (missing.length) throw new Error(group + ' thiếu biến: ' + missing.join(', ') + '. Chưa áp dụng cấu hình.');
  for (const key of keys) {
    if (/^(?:your[_-]|<|\*+$)/i.test(value(env, key))) throw new Error(key + ' đang dùng placeholder.');
  }
  return true;
}
export function buildAuthPatch(env, current = {}) {
  if (!value(env, 'APP_URL')) throw new Error('Thiếu APP_URL.');
  const site = validOrigin(env.APP_URL);
  const origins = [site, ...value(env, 'AUTH_ADDITIONAL_ORIGINS').split(',').filter(Boolean).map(item => validOrigin(item.trim()))];
  const required = origins.flatMap(origin => ['/auth/callback', '/auth/confirm', '/reset-password'].map(path => origin + path));
  const existing = typeof current.uri_allow_list === 'string' ? current.uri_allow_list.split(',').map(item => item.trim()).filter(Boolean) : [];
  const patch = { ...managed, site_url: site, uri_allow_list: [...new Set([...existing, ...required])].join(',') };
  const configured = ['Gửi email mặc định Supabase', 'Email/Confirm Email', 'TOTP MFA', 'Password/session policies', 'Rate Limits', 'Site URL/Redirect URLs'];
  const skipped = [];
  for (const [provider, title] of [['google', 'Google'], ['facebook', 'Facebook']]) {
    const prefix = 'SUPABASE_AUTH_' + provider.toUpperCase();
    if (credentials(env, [prefix + '_CLIENT_ID', prefix + '_SECRET'], title)) {
      patch['external_' + provider + '_enabled'] = true;
      patch['external_' + provider + '_client_id'] = value(env, prefix + '_CLIENT_ID');
      patch['external_' + provider + '_secret'] = env[prefix + '_SECRET'];
      configured.push(title);
    } else {
      skipped.push(title + ': giữ cấu hình hiện tại; chưa có cặp ID/secret mới.');
    }
  }
  if (credentials(env, ['NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'SUPABASE_AUTH_CAPTCHA_SECRET'], 'hCaptcha')) {
    patch.security_captcha_enabled = true;
    patch.security_captcha_provider = 'hcaptcha';
    patch.security_captcha_secret = env.SUPABASE_AUTH_CAPTCHA_SECRET;
    configured.push('hCaptcha');
  } else {
    skipped.push('hCaptcha: giữ cấu hình hiện tại; cần site key frontend và secret tương ứng.');
  }
  if (value(env, 'SUPABASE_ENABLE_LEAKED_PASSWORD_PROTECTION') === 'true') {
    patch.password_hibp_enabled = true;
    configured.push('Leaked Password Protection (yêu cầu gói hỗ trợ)');
  } else {
    skipped.push('Leaked Password Protection: giữ cấu hình hiện tại; đặt SUPABASE_ENABLE_LEAKED_PASSWORD_PROTECTION=true khi gói hỗ trợ.');
  }
  return { patch, configured, skipped };
}
export async function configureAuth(env, { apply = false, fetcher = fetch } = {}) {
  const base = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const ref = /^([a-z0-9]{20})\.supabase\.co$/.exec(base.hostname)?.[1];
  if (!ref || base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL phải trỏ tới project Supabase hosted hợp lệ.');
  }
  const endpoint = 'https://api.supabase.com/v1/projects/' + ref + '/config/auth';
  const token = value(env, 'SUPABASE_ACCESS_TOKEN');
  if (apply && !token) throw new Error('Cần SUPABASE_ACCESS_TOKEN có quyền auth_config_read/auth_config_write. service_role không thay thế token quản trị.');
  const options = () => ({
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  let current = {};
  if (token) {
    const response = await fetcher(endpoint, options());
    if (!response.ok) throw new Error('Không đọc được Auth config (HTTP ' + response.status + '). Chưa thay đổi project.');
    current = await response.json();
  }
  const { patch, configured, skipped } = buildAuthPatch(env, current);
  // Return only field names and group labels, never IDs, credentials or template contents.
  const result = { applied: false, configured, skipped, fields: Object.keys(patch) };
  if (!apply) return result;
  const response = await fetcher(endpoint, { ...options(), method: 'PATCH', body: JSON.stringify(patch) });
  if (!response.ok) {
    throw new Error('Supabase từ chối cấu hình (HTTP ' + response.status + '). Kiểm tra quyền token, gói dịch vụ và giá trị cấu hình.');
  }
  const verified = await fetcher(endpoint, options());
  if (!verified.ok) throw new Error('Đã gửi cấu hình nhưng chưa đọc lại được. Chạy audit:supabase để xác minh.');
  const saved = await verified.json();
  const secretFields = new Set(['smtp_pass', 'security_captcha_secret', 'external_google_secret', 'external_facebook_secret']);
  const mismatched = Object.keys(patch).filter(key => !secretFields.has(key) &&
    (patch[key] === null ? Boolean(saved[key]) : typeof patch[key] === 'string' ? String(saved[key] ?? '').trim() !== patch[key].trim() : saved[key] !== patch[key]));
  if (mismatched.length) throw new Error('Đã áp dụng nhưng đọc lại chưa khớp các trường: ' + mismatched.join(', ') + '.');
  return { ...result, applied: true };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('npm run supabase:configure [-- --apply]\nMặc định xem các nhóm/trường sẽ cấu hình; --apply ghi lên project và xác minh lại.\nHợp nhất .env ở root, backend, frontend, supabase; shell được ưu tiên cao nhất.\nSecrets nằm trong supabase/.env.local. Không dùng service_role làm token quản trị.');
    return;
  }
  if (args.some(arg => arg !== '--apply')) throw new Error('Chỉ chấp nhận --apply hoặc --help.');
  const env = loadProjectEnv();
  const result = await configureAuth(env, { apply: args.includes('--apply') });
  console.log(result.applied ? 'Đã áp dụng và đọc lại cấu hình Supabase.' : 'Cấu hình sẵn sàng. Dùng --apply để áp dụng lên project.');
  for (const group of result.configured) console.log('  + ' + group);
  for (const message of result.skipped) console.log('  - ' + message);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    // HTTP errors and validators deliberately omit remote bodies and secret values.
    console.error(error instanceof TypeError ? 'Không kết nối được Supabase hoặc URL không hợp lệ.' : error.message);
    process.exitCode = 1;
  });
}
