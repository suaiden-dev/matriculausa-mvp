
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let fetch;
async function initFetch() {
  const module = await import('node-fetch');
  fetch = module.default;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-legal-pdf`;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FAILED_EMAILS = [
  "maria.carvalho15@icloud.com",
  "monickcosta7@gmail.com",
  "renan_cvc@hotmail.com",
  "pzubioli@yahoo.com.br",
  "alondracq056@gmail.com",
  "paulinho.guimaraes@hotmail.com",
  "adolfocezarcosta@gmail.com",
  "barbarahf@yahoo.com",
  "agsselene@gmail.com",
  "vanessapullmantur@gmail.com",
  "marialuisasalmeid@gmail.com"
];

async function run() {
  await initFetch();
  console.log('\n====================================================');
  console.log('🔄 INICIANDO REPESCAGEM DE FALHAS');
  console.log('====================================================\n');

  const { data: students, error } = await supabase
    .from('user_profiles')
    .select(`
      user_id, 
      full_name, 
      email,
      comprehensive_term_acceptance!inner (
        id, 
        term_type
      )
    `)
    .in('email', FAILED_EMAILS)
    .eq('comprehensive_term_acceptance.term_type', 'checkout_terms');

  if (error) {
    console.error('❌ Erro ao buscar alunos:', error);
    return;
  }

  console.log(`📋 Alunos encontrados para nova tentativa: ${students.length}\n`);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const acceptance = student.comprehensive_term_acceptance.find(a => a.term_type === 'checkout_terms');
    
    console.log(`[${i + 1}/${students.length}] 🔄 Retentando: ${student.full_name.padEnd(30)}`);

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          type: 'term_acceptance',
          user_id: student.user_id,
          related_id: acceptance.id,
          trigger_table: 'manual_retry_batch'
        })
      });

      if (response.ok) {
        console.log(`   ✅ Sucesso.`);
      } else {
        const errorText = await response.text();
        console.error(`   ❌ Erro (Status ${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error(`   ❌ Falha: ${err.message}`);
    }

    if (i < students.length - 1) {
      console.log(`   ⏳ Aguardando 15s...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  console.log('\n====================================================');
  console.log('✨ REPESCAGEM CONCLUÍDA');
  console.log('====================================================\n');
}

run();
