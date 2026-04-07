const { Pool } = require('pg');

async function testConnection(name, url) {
  try {
    console.log(`Testing ${name}...`);
    const pool = new Pool({ connectionString: url });
    const res = await pool.query('SELECT 1 as result');
    console.log(`${name} SUCCESS:`, res.rows);
    await pool.end();
  } catch (e) {
    console.error(`${name} ERROR:`, e.message);
  }
}

async function run() {
  const url5432 = "postgres://postgres.gnvbrkpfzxyfhgnjlhtv:Jonny2020%40%21%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
  const url6543 = "postgres://postgres.gnvbrkpfzxyfhgnjlhtv:Jonny2020%40%21%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  await testConnection('5432', url5432);
  await testConnection('6543', url6543);
}

run();
