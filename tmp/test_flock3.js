require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Testing relations with eq filter...");
  // Test 1: no eq
  const { data: d1 } = await supabase.from('Flock').select(`id, barn:Barn!inner(id, farm:Farm!inner(companyId))`);
  const companyId = d1[0].barn.farm.companyId;

  // Test 2: eq
  const { data: d2, error: e2 } = await supabase.from('Flock').select(`
    id, barn:Barn!inner(id, farm:Farm!inner(companyId))
  `).eq('barn.farm.companyId', companyId);

  console.log('Result length with explicit companyId filter:', d2 ? d2.length : 0);
  if (e2) console.log('Error eq:', e2);
}
test();
