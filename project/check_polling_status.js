// Script para verificar o status do polling automático
// Execute este script para verificar se o sistema está funcionando

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente
loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPollingStatus() {
  console.log('📊 VERIFICAÇÃO DO STATUS DO POLLING');
  console.log('===================================\n');

  try {
    // 1. Verificar configurações ativas
    console.log('1️⃣ Verificando configurações ativas...');
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

    console.log(`✅ ${configs.length} configuração(ões) ativa(s) encontrada(s)\n`);

    // 2. Verificar status de cada configuração
    for (const config of configs) {
      console.log(`🔍 Usuário: ${config.user_id}`);
      console.log(`   Email: ${config.email_address}`);
      console.log(`   Ativo: ${config.is_active ? '✅' : '❌'}`);
      console.log(`   Último processamento: ${config.last_processing_date || 'Nunca'}`);
      console.log(`   Total processados: ${config.total_processed || 0}`);
      console.log(`   Total respondidos: ${config.total_replied || 0}`);
      
      // Verificar emails processados nas últimas 2 horas
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      
      const { data: recentEmails, error: recentError } = await supabase
        .from('processed_microsoft_emails')
        .select('*')
        .eq('user_id', config.user_id)
        .gte('processed_at', twoHoursAgo.toISOString())
        .order('processed_at', { ascending: false });

      if (recentError) {
        console.log(`   ❌ Erro ao buscar emails recentes: ${recentError.message}`);
      } else {
        console.log(`   📧 Emails processados nas últimas 2h: ${recentEmails?.length || 0}`);
        
        if (recentEmails && recentEmails.length > 0) {
          const repliedCount = recentEmails.filter(e => e.status === 'replied').length;
          const errorCount = recentEmails.filter(e => e.status === 'error').length;
          const processedCount = recentEmails.filter(e => e.status === 'processed').length;
          
          console.log(`      ✅ Respondidos: ${repliedCount}`);
          console.log(`      📝 Processados: ${processedCount}`);
          console.log(`      ❌ Erros: ${errorCount}`);
          
          // Mostrar últimos emails
          if (recentEmails.length > 0) {
            console.log(`   📧 Últimos emails:`);
            recentEmails.slice(0, 3).forEach((email, index) => {
              console.log(`      ${index + 1}. ${email.subject || 'Sem assunto'} (${email.status})`);
              console.log(`         De: ${email.from_email}`);
              console.log(`         Em: ${new Date(email.processed_at).toLocaleString()}`);
            });
          }
        } else {
          console.log(`   ⚠️ Nenhum email processado recentemente`);
          console.log(`   💡 Possíveis causas:`);
          console.log(`      - Polling não está funcionando`);
          console.log(`      - Token de acesso expirado`);
          console.log(`      - Nenhum email novo recebido`);
        }
      }
      console.log('');
    }

    // 3. Verificar status geral do sistema
    console.log('📈 STATUS GERAL DO SISTEMA:');
    console.log('==========================');
    
    const { data: allRecentEmails } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('processed_at', { ascending: false });

    if (allRecentEmails && allRecentEmails.length > 0) {
      const totalReplied = allRecentEmails.filter(e => e.status === 'replied').length;
      const totalErrors = allRecentEmails.filter(e => e.status === 'error').length;
      const totalProcessed = allRecentEmails.filter(e => e.status === 'processed').length;
      
      console.log(`📧 Emails processados nas últimas 24h: ${allRecentEmails.length}`);
      console.log(`   ✅ Respondidos: ${totalReplied}`);
      console.log(`   📝 Processados: ${totalProcessed}`);
      console.log(`   ❌ Erros: ${totalErrors}`);
      
      if (totalErrors > 0) {
        console.log(`\n⚠️ ATENÇÃO: ${totalErrors} erro(s) encontrado(s)!`);
        console.log('💡 Verifique os logs para mais detalhes sobre os erros');
      }
    } else {
      console.log('⚠️ Nenhum email foi processado nas últimas 24 horas!');
      console.log('💡 Possíveis causas:');
      console.log('   - Sistema de polling não está funcionando');
      console.log('   - Tokens de acesso expiraram');
      console.log('   - Problema na conexão com Microsoft Graph');
      console.log('   - Nenhum email novo foi recebido');
    }

    // 4. Sugestões de solução
    console.log('\n🛠️ SUGESTÕES DE SOLUÇÃO:');
    console.log('========================');
    
    if (!configs || configs.length === 0) {
      console.log('1. ❌ Nenhuma configuração ativa');
      console.log('   → Ative o processamento de email no frontend');
      console.log('   → Verifique se o usuário fez login');
    } else if (!allRecentEmails || allRecentEmails.length === 0) {
      console.log('2. ❌ Nenhum email processado recentemente');
      console.log('   → Verifique se o polling automático está funcionando');
      console.log('   → Teste o processamento manual');
      console.log('   → Verifique se os tokens de acesso não expiraram');
    } else {
      console.log('3. ✅ Sistema parece estar funcionando');
      console.log('   → Verifique se o email foi enviado para o endereço correto');
      console.log('   → Verifique se o email não foi filtrado como spam');
      console.log('   → Aguarde alguns minutos para o processamento automático');
    }

    console.log('\n📞 PRÓXIMOS PASSOS:');
    console.log('===================');
    console.log('1. Se não há configurações ativas: Ative no frontend');
    console.log('2. Se não há emails processados: Teste o processamento manual');
    console.log('3. Se há erros: Verifique os logs do sistema');
    console.log('4. Se tudo parece OK: Verifique se o email foi enviado corretamente');

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

// Executar verificação
checkPollingStatus();
