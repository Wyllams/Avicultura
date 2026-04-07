require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Testing relations...");
  const { data, error } = await supabase.from('Flock').select(`
    id,
    name,
    status,
    barn:Barn!inner (
      id,
      farm:Farm!inner (
        id,
        companyId
      )
    )
  `);
  console.log('Result length:', data ? data.length : 0);
  console.log('Sample:', data ? JSON.stringify(data[0], null, 2) : 'None');
  if (error) console.log('Error:', error);
}
test();
