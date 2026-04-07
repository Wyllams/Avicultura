const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  console.log("User:", user);
  const farms = await prisma.farm.findMany({ include: { barns: true }});
  console.log("Farms and barns:", JSON.stringify(farms, null, 2));
}

main().finally(() => prisma.$disconnect());
