require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Fetching flocks...");
  const { data, error } = await supabase.from('Flock').select('*');
  console.log('Result length:', data ? data.length : 0);
  console.log('Sample:', data ? data[0] : 'None');
  if (error) console.log('Error:', error);
}
test();
