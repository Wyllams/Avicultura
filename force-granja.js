const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
     console.log("No user found.");
     return;
  }
  
  if (!user.companyId) {
     console.log("User has no company.");
     return;
  }

  const farms = await prisma.farm.findMany({ where: { companyId: user.companyId } });
  
  let targetFarm = farms[0];

  if (!targetFarm) {
     targetFarm = await prisma.farm.create({
        data: {
           id: "farm-" + Date.now(),
           companyId: user.companyId,
           name: "Granja São Lucas (Principal)",
           state: "PE",
           status: "ATIVO"
        }
     });
     console.log("Created Farm:", targetFarm.name);
  } else {
     console.log("Farm already exists:", targetFarm.name);
  }

  const barns = await prisma.barn.findMany({ where: { farmId: targetFarm.id } });
  
  if (barns.length === 0) {
     const newBarn = await prisma.barn.create({
        data: {
           id: "barn-" + Date.now(),
           farmId: targetFarm.id,
           name: "Galpão 01 - Climatizado",
           area: 1200,
           capacity: 15000,
           status: "EM_OPERACAO"
        }
     });
     console.log("Created Barn:", newBarn.name);
  } else {
     console.log("Barns already exist:", barns.length);
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
