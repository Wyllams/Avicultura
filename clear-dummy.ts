import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  await supabase.from('Company').delete().neq('id', '0'); // Delete all companies (which cascades to Users, Farms, etc. if cascade is set, if not we delete manually)
  const { data: companies } = await supabase.from('Company').select('id');
  if (companies?.length) {
    for (const c of companies) {
      await supabase.from('User').delete().eq('companyId', c.id);
      await supabase.from('Farm').delete().eq('companyId', c.id);
      await supabase.from('Company').delete().eq('id', c.id);
    }
  }
  console.log("Cleared old data");
}

run();
