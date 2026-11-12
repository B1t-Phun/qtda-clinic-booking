import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import projectEnv from './env.cjs';
const { loadProjectEnv } = projectEnv;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = {
  profiles: ['id', 'email', 'full_name', 'phone', 'role', 'date_of_birth', 'gender', 'address', 'avatar_url', 'updated_at'],
  doctors: ['id', 'profile_id', 'specialty_id', 'is_active', 'room', 'consultation_fee', 'years_experience', 'created_at'],
  appointments: ['id', 'patient_id', 'doctor_id', 'slot_id', 'status', 'doctor_note', 'reason', 'created_at'],
  time_slots: ['id', 'doctor_id'],
  specialties: ['id'],
};
export function assertAuthSchema(columns) {
  const missing = Object.entries(required).flatMap(([table, fields]) => fields.filter(field =>
    !columns.some(column => column.table_name === table && column.column_name === field)).map(field => table + '.' + field));
  if (missing.length) throw new Error('Database chưa tương thích; chưa chạy migration. Thiếu: ' + missing.join(', '));
}
export async function migrateAuth(env, { apply = false, fetcher = fetch } = {}) {
  const base = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const ref = /^([a-z0-9]{20})\.supabase\.co$/.exec(base.hostname)?.[1];
  if (!ref || base.protocol !== 'https:' || !env.SUPABASE_ACCESS_TOKEN) throw new Error('Cần project Supabase hosted và SUPABASE_ACCESS_TOKEN có quyền database query.');
  async function query(sql, readOnly) {
    const response = await fetcher('https://api.supabase.com/v1/projects/' + ref + '/database/query', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, read_only: readOnly }), redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Database query thất bại (HTTP ' + response.status + '); kiểm tra schema và quyền token.');
    return response.json();
  }
  const columns = await query("select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('profiles','doctors','appointments','time_slots','specialties')", true);
  assertAuthSchema(columns);
  if (!apply) return { applied: false };
  // Transactional migration: no table drops and no user data deletion.
  await query(readFileSync(resolve(root, 'docs/auth_security.sql'), 'utf8'), false);
  const sql = [
    "select to_regprocedure('public.admin_set_user_role(uuid, public.user_role, bigint, text, numeric)') is not null as role_rpc,",
    "to_regprocedure('public.has_required_aal()') is not null as aal_guard,",
    "not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') as role_protected,",
    "has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') as profile_editable,",
    "(select count(*) = 5 from pg_policies where schemaname='public' and policyname='auth_mfa_required' and permissive='RESTRICTIVE') as mfa_policies,",
    "(select count(*) = 5 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profiles','doctors','appointments','time_slots','specialties') and c.relrowsecurity) as rls_enabled",
  ].join(' ');
  const results = await query(sql, true);
  if (!results[0] || Object.values(results[0]).some(value => value !== true)) throw new Error('Migration đã chạy nhưng kiểm tra quyền chưa đạt.');
  return { applied: true, checks: results[0] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) {
    console.error('Dùng npm run supabase:migrate:auth [-- --apply]. Mặc định chỉ kiểm tra schema.');
    process.exitCode = 1;
  } else migrateAuth(loadProjectEnv(), { apply: args.includes('--apply') })
    .then(result => console.log(result.applied ? 'Đã áp dụng migration Auth và xác minh RPC, RLS, MFA cùng quyền sửa profile.' : 'Schema tương thích; dùng --apply để chạy migration Auth.'))
    .catch(error => { console.error(error instanceof TypeError ? 'Không kết nối được Supabase.' : error.message); process.exitCode = 1; });
}
