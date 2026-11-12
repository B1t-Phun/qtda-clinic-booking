import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateAuth } from './migrate-auth.mjs';

test('Auth migration refuses an incompatible schema without sending a write query', async () => {
  const queries = [];
  await assert.rejects(() => migrateAuth({
    NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_ACCESS_TOKEN: 'admin-token',
  }, { apply: true, fetcher: async (_url, options) => {
    queries.push(JSON.parse(options.body));
    return Response.json([]);
  } }), /chưa tương thích/);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].read_only, true);
});
test('Auth migration rejects missing Management token before querying the database', async () => {
  await assert.rejects(() => migrateAuth({ NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' }, {
    apply: true, fetcher: () => assert.fail('No database request without Management credentials'),
  }), /SUPABASE_ACCESS_TOKEN/);
});
