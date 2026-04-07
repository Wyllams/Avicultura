const { PrismaClient } = require('@prisma/client');

async function run() {
  process.env.DATABASE_URL = 'postgres://postgres:Jonny2020%40%21%40@db.gnvbrkpfzxyfhgnjlhtv.supabase.co:5432/postgres';
  const prisma = new PrismaClient({ log: ['info', 'query', 'warn', 'error'] });
  try {
    const res = await prisma.$queryRawUnsafe('SELECT 1');
    console.log('SUCCESS DIRECT:', res);
  } catch (e) {
    console.error('FAILED DIRECT:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
