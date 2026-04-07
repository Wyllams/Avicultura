const { PrismaClient } = require('@prisma/client');

async function testConnection(url) {
  process.env.DATABASE_URL = url;
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe(`SELECT 1`);
    console.log('SUCCESS:', url);
  } catch (e) {
    console.error('FAILED:', url, e.message.split('\n')[0]);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  console.log('Testing 6543 (Pooler)');
  await testConnection('postgres://postgres.gnvbrkpfzxyfhgnjlhtv:Jonny2020%40%21%40@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
  console.log('Testing 5432 (Pooler direct)');
  await testConnection('postgres://postgres.gnvbrkpfzxyfhgnjlhtv:Jonny2020%40%21%40@aws-0-sa-east-1.pooler.supabase.com:5432/postgres');
  console.log('Testing 5432 (Direct DB)');
  await testConnection('postgres://postgres:Jonny2020%40%21%40@db.gnvbrkpfzxyfhgnjlhtv.supabase.co:5432/postgres');
}

run();
