import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('User').select('*');
  console.log("Users:", JSON.stringify(data, null, 2));
  
  const { data: auth, error: authErr } = await supabase.auth.admin.listUsers();
  console.log("\nAuth Users:", JSON.stringify(authErr ? authErr : auth?.users.map(u => ({ id: u.id, email: u.email })), null, 2));
}

run();
