import { readFileSync } from 'node:fs';
import projectEnv from './env.cjs';
const env = projectEnv.loadProjectEnv();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const response = await fetch('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
  method: 'POST', headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(new URL('../supabase/tests/profile_avatars.sql', import.meta.url), 'utf8'), read_only: false }),
  redirect: 'error', signal: AbortSignal.timeout(30_000),
});
if (!response.ok) {
  const body = await response.json().catch(() => null);
  let message = body?.message || 'Profile tests HTTP ' + response.status;
  for (const value of Object.values(env).filter(value => typeof value === 'string' && value.length > 6)) message = message.split(value).join('[redacted]');
  throw new Error(message);
}
const result = (await response.json()).find(row => row.result)?.result;
if (!result) throw new Error('Missing profile database result');
console.log(result);
