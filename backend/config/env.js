const { loadProjectEnv } = require('../../scripts/env.cjs');
const values = loadProjectEnv();
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_URL', 'AUTH_ADDITIONAL_ORIGINS', 'PORT', 'PROJECT_NAME']) {
  if (values[key] !== undefined) process.env[key] = values[key];
}
module.exports = values;
