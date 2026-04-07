const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const { data: farms } = await supabase.from('Farm').select('id, name');
  console.log("Farms available:", farms);

  // Let's delete "Grande teste" for him to test
  const farmToDelete = farms.find(f => f.name === 'Grande teste');
  if (!farmToDelete) {
    console.log("Grande teste farm not found");
    return;
  }
  
  const farmId = farmToDelete.id;
  console.log("Testing deletion script step-by-step for:", farmId);

  try {
    const { data: barns } = await supabase.from("Barn").select("id").eq("farmId", farmId);
    const barnIds = barns?.map(b => b.id) || [];
    console.log("Barns:", barnIds);

    let flockIds = [];
    if (barnIds.length > 0) {
      const { data: flocks } = await supabase.from("Flock").select("id").in("barnId", barnIds);
      flockIds = flocks?.map(f => f.id) || [];
    }
    console.log("Flocks:", flockIds);

    if (flockIds.length > 0) {
      console.log("Deleting flock dependencies...");
      await supabase.from("MortalityLog").delete().in("flockId", flockIds);
      await supabase.from("WeightLog").delete().in("flockId", flockIds);
      await supabase.from("FeedLog").delete().in("flockId", flockIds);
      await supabase.from("VaccineLog").delete().in("flockId", flockIds);
      await supabase.from("VisitLog").delete().in("flockId", flockIds);
      await supabase.from("MedicationLog").delete().in("flockId", flockIds);
      await supabase.from("Task").delete().in("flockId", flockIds);
    }

    if (barnIds.length > 0) {
      console.log("Deleting flocks and barns...");
      await supabase.from("Flock").delete().in("barnId", barnIds);
      await supabase.from("Barn").delete().eq("farmId", farmId);
    }

    const { data: stockItems } = await supabase.from("StockItem").select("id").eq("farmId", farmId);
    const stockItemIds = stockItems?.map(s => s.id) || [];
    console.log("Stock Items:", stockItemIds);

    if (stockItemIds.length > 0) {
       await supabase.from("StockMovement").delete().in("itemId", stockItemIds);
    }
    
    console.log("Deleting farm dependencies...");
    await supabase.from("StockItem").delete().eq("farmId", farmId);
    await supabase.from("UserFarmAccess").delete().eq("farmId", farmId);
    await supabase.from("PnsaAudit").delete().eq("farmId", farmId);

    console.log("Deleting farm...");
    const { error, data } = await supabase.from("Farm").delete().eq("id", farmId);

    if (error) {
      console.error("FAIL ON FARM DELETE:", JSON.stringify(error, null, 2));
    } else {
      console.log("SUCCESS deleted farm:", farmId);
    }
  } catch (err) {
    console.error("Caught error:", err);
  }
}

testDelete().catch(console.error);
