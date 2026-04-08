import { getSanidadeData, getReportSanitaryHistory, getActiveFlocksForReport } from "./src/app/actions/relatorios";

async function run() {
  const result = await getActiveFlocksForReport();
  const flockId = result.flocks?.[0]?.id;
  if (!flockId) {
    console.log("No active flock found");
    return;
  }
  
  console.log("Testing getSanidadeData:");
  const sanidade = await getSanidadeData(flockId);
  console.dir(sanidade, { depth: null });
  
  console.log("\nTesting getReportSanitaryHistory:");
  const historico = await getReportSanitaryHistory(flockId);
  console.dir(historico, { depth: null });
}

run().catch(console.error);
