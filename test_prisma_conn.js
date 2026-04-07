require('dotenv').config();
const { Pool } = require('pg');

// Try with explicit config instead of connection string
const pool = new Pool({ 
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.gnvbrkpfzxyfhgnjlhtv',
  password: 'Jonny2020@!@',
  ssl: { rejectUnauthorized: false }
});

console.log('Testing with explicit config...');

pool.query('SELECT NOW() as time')
  .then(r => {
    console.log('OK:', r.rows[0]);
    return pool.end();
  })
  .catch(e => {
    console.log('Error:', e.message);
    console.log('Code:', e.code);
    pool.end();
  });
