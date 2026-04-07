const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

require('dotenv').config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const tx = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: { name: "Test Co", cnpj: "123" }
      });
      const u = await tx.user.create({
        data: { authId: "test-auth-123", companyId: c.id, name: "Admin", email: "test@test.com", role: "ADMIN" }
      });
      return c;
    });
    console.log("Success:", tx);
  } catch (e) {
    console.error("Error code:", e.code);
    console.error("Error message:", e.message);
  }
}

test();
