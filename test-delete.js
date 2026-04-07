const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const farmId = 'b07af72e-3652-47cc-9e79-5e0c52ce64fa'; // Replace with an actual farm ID if known, or we just fetch one to test

  // fetch first farm named 'NOVA PENAS'
  const { data: farms } = await supabase.from('Farm').select('id, name').limit(1);
  if (!farms || !farms.length) {
    console.log('No farms found');
    return;
  }
  const farm = farms[0];
  console.log(`Trying to delete farm ${farm.name} (${farm.id})`);

  // Try what's inside deleteFarm exactly to see which step fails

  // 1. Galpões (Barns)
  const { data: barns } = await supabase.from("Barn").select("id").eq("farmId", farm.id);
  const barnIds = barns?.map(b => b.id) || [];

  let flockIds = [];
  if (barnIds.length > 0) {
    const { data: flocks } = await supabase.from("Flock").select("id").in("barnId", barnIds);
    flockIds = flocks?.map(f => f.id) || [];
  }

  if (flockIds.length > 0) {
    await supabase.from("MortalityLog").delete().in("flockId", flockIds);
    await supabase.from("WeightLog").delete().in("flockId", flockIds);
    await supabase.from("FeedLog").delete().in("flockId", flockIds);
    await supabase.from("VaccineLog").delete().in("flockId", flockIds);
    await supabase.from("VisitLog").delete().in("flockId", flockIds);
    await supabase.from("MedicationLog").delete().in("flockId", flockIds);
    await supabase.from("Task").delete().in("flockId", flockIds);
  }

  if (barnIds.length > 0) {
    await supabase.from("Flock").delete().in("barnId", barnIds);
    await supabase.from("Barn").delete().eq("farmId", farm.id);
  }

  const { data: stockItems } = await supabase.from("StockItem").select("id").eq("farmId", farm.id);
  const stockItemIds = stockItems?.map(s => s.id) || [];
  if (stockItemIds.length > 0) {
      await supabase.from("StockMovement").delete().in("itemId", stockItemIds);
  }
  
  await supabase.from("StockItem").delete().eq("farmId", farm.id);
  await supabase.from("UserFarmAccess").delete().eq("farmId", farm.id);
  await supabase.from("PnsaAudit").delete().eq("farmId", farm.id);

  // FINAL DELETE
  const { error } = await supabase.from("Farm").delete().eq("id", farm.id);
  if (error) {
    console.error("FAIL ON FARM DELETE:", JSON.stringify(error, null, 2));
  } else {
    console.log("SUCCESS deleted farm:", farm.id);
  }

}

testDelete().catch(console.error);
