// Script para testar o processamento manual de emails
// Execute este script para forçar o processamento de emails

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente
loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailProcessing() {
  console.log('🧪 TESTE DE PROCESSAMENTO DE EMAIL');
  console.log('==================================\n');

  try {
    // 1. Buscar configurações ativas
    console.log('1️⃣ Buscando configurações ativas...');
    const { data: configs, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('provider_type', 'microsoft')
      .eq('is_active', true);

    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('❌ Nenhuma configuração ativa encontrada!');
      console.log('💡 Dica: Ative o processamento de email no frontend primeiro');
      return;
    }

    console.log(`✅ ${configs.length} configuração(ões) ativa(s) encontrada(s)`);

    // 2. Testar processamento para cada configuração
    for (const config of configs) {
      console.log(`\n🔍 Testando usuário: ${config.user_id}`);
      console.log(`   Email: ${config.email_address}`);
      
      try {
        // Chamar a Edge Function para processar emails
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/microsoft-email-polling`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'process_user_emails',
            user_id: config.user_id
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('   ✅ Processamento executado com sucesso!');
        console.log(`   📊 Resultado:`, JSON.stringify(result, null, 2));

        // Verificar emails processados após o teste
        const { data: recentEmails } = await supabase
          .from('processed_microsoft_emails')
          .select('*')
          .eq('user_id', config.user_id)
          .order('processed_at', { ascending: false })
          .limit(5);

        if (recentEmails && recentEmails.length > 0) {
          console.log(`   📧 Últimos emails processados:`);
          recentEmails.forEach((email, index) => {
            console.log(`      ${index + 1}. ${email.subject || 'Sem assunto'} (${email.status})`);
          });
        }

      } catch (error) {
        console.error(`   ❌ Erro ao processar emails para ${config.user_id}:`, error.message);
      }
    }

    // 3. Testar IA diretamente
    console.log('\n🤖 Testando serviço de IA...');
    try {
      const testResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/microsoft-email-polling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'test_ai',
          user_id: configs[0].user_id
        })
      });

      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log('   ✅ Teste da IA executado com sucesso!');
        console.log(`   📊 Resultado:`, JSON.stringify(testResult, null, 2));
      } else {
        console.error(`   ❌ Erro no teste da IA: ${testResponse.status}`);
      }
    } catch (error) {
      console.error('   ❌ Erro ao testar IA:', error.message);
    }

    console.log('\n✅ Teste concluído!');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('===================');
    console.log('1. Verifique se novos emails foram processados');
    console.log('2. Verifique se respostas foram enviadas');
    console.log('3. Se ainda não funcionar, verifique os logs do sistema');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar teste
testEmailProcessing();
