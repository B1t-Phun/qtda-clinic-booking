import { readFileSync } from 'node:fs';
import projectEnv from './env.cjs';

const env = projectEnv.loadProjectEnv();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const sqlFiles = ['../supabase/tests/doctor_workflow.sql', '../supabase/tests/doctor_isolation.sql'];
for (const sqlFile of sqlFiles) {
  let sql = readFileSync(new URL(sqlFile, import.meta.url), 'utf8');
  if (sqlFile.includes('doctor_isolation')) {
    // Preview the optional migration inside this suite's transaction; its final ROLLBACK also removes the function.
    const migration = readFileSync(new URL('../docs/20261115_doctor_module_hardening.sql', import.meta.url), 'utf8');
    sql = migration.replace(/commit;\s*$/i, '') + '\n' + sql.replace(/^begin;$/m, '');
  }
  const response = await fetch('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: false }),
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    let message = body?.message || 'Database test HTTP ' + response.status;
    for (const secret of Object.values(env).filter(value => typeof value === 'string' && value.length > 6)) {
      message = message.split(secret).join('[redacted]');
    }
    throw new Error(message);
  }
  const result = await response.json();
  if (!result.some(row => typeof row.result === 'string')) throw new Error('Missing database test result.');
  console.log(result.find(row => row.result).result);
}
