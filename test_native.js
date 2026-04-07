const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log("NATIVE PRISMA SUCCESS");
  } catch (e) {
    console.error("NATIVE PRISMA ERROR:", String(e));
  }
}

test();
