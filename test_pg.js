const { Pool } = require('pg');
require('dotenv').config();

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
  await testConnection('DATABASE_URL', process.env.DATABASE_URL);
  await testConnection('DIRECT_URL', process.env.DIRECT_URL);
}

run();
