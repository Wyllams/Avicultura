const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log("Users:", users)
  
  const companies = await prisma.company.findMany()
  console.log("Companies:", companies)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
