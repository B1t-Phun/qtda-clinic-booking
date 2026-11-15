import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import projectEnv from './env.cjs';
const { loadProjectEnv } = projectEnv;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'APP_URL', 'NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'NEXT_PUBLIC_AUTH_MANUAL_LINKING'];
const backendKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_URL', 'AUTH_ADDITIONAL_ORIGINS', 'PORT', 'PROJECT_NAME'];
function privateFrontendKey(key) {
  return /^(?:SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SMTP_.+|SUPABASE_AUTH_.+|HCAPTCHA_SECRET|GOOGLE_CLIENT_SECRET|FACEBOOK_APP_SECRET)$/.test(key);
}
export function updateEnvFile(source, values, { frontend = false } = {}) {
  const updated = new Set();
  const output = [];
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const key = /^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/.exec(line)?.[1];
    if (key && frontend && privateFrontendKey(key)) continue;
    if (key && Object.hasOwn(values, key)) {
      if (!updated.has(key)) output.push(key + '=' + JSON.stringify(values[key]));
      updated.add(key);
    } else output.push(line);
  }
  for (const [key, value] of Object.entries(values)) {
    if (!updated.has(key)) output.push(key + '=' + JSON.stringify(value));
  }
  return output.join('\n').trim() + '\n';
}
export function syncEnvironments(env, { projectRoot = root, read, write, frontendOnly = false } = {}) {
  const readFile = read || (file => existsSync(file) ? readFileSync(file, 'utf8') : '');
  const writeFile = write || ((file, text) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  });
  const targets = [{ name: 'frontend/.env.local', keys: frontendKeys, frontend: true }];
  if (!frontendOnly) targets.push({ name: 'backend/.env', keys: backendKeys, frontend: false });
  const changed = [];
  for (const target of targets) {
    const values = Object.fromEntries(target.keys.filter(key => env[key] !== undefined).map(key => [key, env[key]]));
    const file = resolve(projectRoot, target.name);
    const before = readFile(file) || '';
    const after = updateEnvFile(before, values, { frontend: target.frontend });
    if (before !== after) { writeFile(file, after); changed.push(target.name); }
  }
  return changed;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--frontend')) throw new Error('Chỉ hỗ trợ --frontend.');
    const changed = syncEnvironments(loadProjectEnv(), { frontendOnly: args.includes('--frontend') });
    console.log(changed.length ? 'Đã đồng bộ biến môi trường: ' + changed.join(', ') : 'Biến môi trường đã đồng bộ.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
