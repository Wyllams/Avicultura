const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam variáveis de ambiente");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAcessos() {
  console.log("Sincronizando acessos das granjas criadas anteriormente...");

  // Pega todos os usuários que pertencem a uma empresa
  const { data: users, error: errUsers } = await supabase.from('User').select('id, companyId');
  if (errUsers) throw errUsers;

  let insertCount = 0;

  for (const user of users) {
    if (!user.companyId) continue;
    
    // Granjas da empresa
    const { data: farms } = await supabase.from('Farm').select('id').eq('companyId', user.companyId);
    if (!farms) continue;

    // Acessos atuais do usuário
    const { data: accesses } = await supabase.from('UserFarmAccess').select('farmId').eq('userId', user.id);
    const hasAccessSet = new Set((accesses || []).map(a => a.farmId));

    for (const farm of farms) {
      if (!hasAccessSet.has(farm.id)) {
        console.log(`Dando acesso a granja ${farm.id} para usuário ${user.id}`);
        await supabase.from('UserFarmAccess').insert({
          id: require('crypto').randomUUID(),
          userId: user.id,
          farmId: farm.id
        });
        insertCount++;
      }
    }
  }

  console.log(`Fim. ${insertCount} acessos inseridos.`);
}

syncAcessos().catch(console.error);
