const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.resolve(__dirname, '../../docs/database_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running database_schema.sql...');
    await client.query(sql);
    console.log('Migration executed successfully! 5 core tables and triggers created.');

    // Check profiles table
    const res = await client.query('SELECT count(*) FROM public.specialties;');
    console.log('Specialties count:', res.rows[0].count);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
