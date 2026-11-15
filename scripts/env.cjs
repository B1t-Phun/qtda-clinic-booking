const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const envFiles = [
  '.env', '.env.local',
  'backend/.env', 'backend/.env.local',
  'frontend/.env', 'frontend/.env.local',
  'supabase/.env', 'supabase/.env.local',
];
function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const raw = match[2];
    const quote = raw[0];
    if (quote === '"' || quote === "'") {
      const end = raw.lastIndexOf(quote);
      values[match[1]] = end > 0 ? raw.slice(1, end) : raw;
    } else values[match[1]] = raw.replace(/\s+#.*$/, '');
  }
  return values;
}
function usable(value) {
  return typeof value === 'string' && Boolean(value.trim()) &&
    !/^(?:your[_-]|<[^>]*>$|\*+$)/i.test(value.trim());
}
function normalize(values) {
  const result = Object.fromEntries(Object.entries(values).filter(([, value]) => usable(value)));
  const aliases = {
    NEXT_PUBLIC_SUPABASE_URL: ['SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ['SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: ['HCAPTCHA_SITE_KEY'],
    SUPABASE_AUTH_CAPTCHA_SECRET: ['HCAPTCHA_SECRET'],
    SUPABASE_AUTH_GOOGLE_CLIENT_ID: ['GOOGLE_CLIENT_ID'],
    SUPABASE_AUTH_GOOGLE_SECRET: ['GOOGLE_CLIENT_SECRET'],
    SUPABASE_AUTH_FACEBOOK_CLIENT_ID: ['FACEBOOK_APP_ID'],
    SUPABASE_AUTH_FACEBOOK_SECRET: ['FACEBOOK_APP_SECRET'],
  };
  for (const [key, names] of Object.entries(aliases)) {
    if (!usable(result[key])) {
      const found = names.find(name => usable(result[name]));
      if (found) result[key] = result[found];
    }
  }
  return result;
}
function loadProjectEnv({ root = resolve(__dirname, '..'), shell = process.env, read } = {}) {
  const readEnv = read || (file => existsSync(file) ? readFileSync(file, 'utf8') : null);
  const merged = {};
  const projects = new Map();
  for (const file of [...envFiles, '<shell>']) {
    const source = file === '<shell>' ? shell : readEnv(resolve(root, file));
    if (source === null || source === undefined) continue;
    const layer = normalize(typeof source === 'string' ? parseEnv(source) : source);
    if (layer.NEXT_PUBLIC_SUPABASE_URL) {
      try { projects.set(file, new URL(layer.NEXT_PUBLIC_SUPABASE_URL).origin); }
      catch { throw new Error('Supabase URL không hợp lệ tại ' + file + '.'); }
    }
    Object.assign(merged, layer);
  }
  if (new Set(projects.values()).size > 1) {
    throw new Error('Các file đang trỏ tới project Supabase khác nhau: ' + [...projects.keys()].join(', ') + '.');
  }
  const key = merged.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (key) {
    if (key.startsWith('sb_secret_') || /^https?:/.test(key)) throw new Error('Publishable key không hợp lệ; không dùng secret key hoặc URL.');
    try {
      if (key.startsWith('eyJ') && JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role') {
        throw new Error('Service role key không được dùng làm publishable key.');
      }
    } catch (error) {
      if (error.message.includes('Service role')) throw error;
    }
  }
  return merged;
}
module.exports = { envFiles, parseEnv, loadProjectEnv };
