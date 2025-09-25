// Script de diagnóstico para verificar por que emails não estão sendo respondidos
// Execute este script para diagnosticar problemas no sistema de email

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente
loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseEmailSystem() {
  console.log('🔍 DIAGNÓSTICO DO SISTEMA DE EMAIL');
  console.log('=====================================\n');

  try {
    // 1. Verificar configurações de email ativas
    console.log('1️⃣ Verificando configurações de email ativas...');
    const { data: configs, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('provider_type', 'microsoft')
      .eq('is_active', true);

    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
      return;
    }

    console.log(`📊 Configurações ativas encontradas: ${configs?.length || 0}`);
    
    if (configs && configs.length > 0) {
      configs.forEach((config, index) => {
        console.log(`   ${index + 1}. User ID: ${config.user_id}`);
        console.log(`      Email: ${config.email_address}`);
        console.log(`      Ativo: ${config.is_active}`);
        console.log(`      Último processamento: ${config.last_processing_date || 'Nunca'}`);
        console.log(`      Total processados: ${config.total_processed || 0}`);
        console.log(`      Total respondidos: ${config.total_replied || 0}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhuma configuração ativa encontrada!');
      console.log('💡 Dica: Verifique se o usuário fez login e ativou o processamento de email');
      return;
    }

    // 2. Verificar emails processados recentemente
    console.log('2️⃣ Verificando emails processados recentemente...');
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(10);

    if (processedError) {
      console.error('❌ Erro ao buscar emails processados:', processedError);
    } else {
      console.log(`📧 Emails processados recentemente: ${processedEmails?.length || 0}`);
      
      if (processedEmails && processedEmails.length > 0) {
        processedEmails.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.subject || 'Sem assunto'}`);
          console.log(`      De: ${email.from_email}`);
          console.log(`      Status: ${email.status}`);
          console.log(`      Processado em: ${email.processed_at}`);
          console.log(`      Resposta: ${email.response_text ? 'Sim' : 'Não'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhum email foi processado recentemente!');
        console.log('💡 Possíveis causas:');
        console.log('   - Polling não está funcionando');
        console.log('   - Token de acesso expirado');
        console.log('   - Problema na conexão com Microsoft Graph');
      }
    }

    // 3. Verificar se há emails não processados
    console.log('3️⃣ Verificando se há emails não processados...');
    
    // Para cada configuração ativa, verificar se há emails recentes
    for (const config of configs || []) {
      console.log(`\n🔍 Verificando usuário: ${config.user_id}`);
      
      // Buscar emails processados nas últimas 24 horas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentEmails, error: recentError } = await supabase
        .from('processed_microsoft_emails')
        .select('*')
        .eq('user_id', config.user_id)
        .gte('processed_at', yesterday.toISOString())
        .order('processed_at', { ascending: false });

      if (recentError) {
        console.error(`❌ Erro ao buscar emails recentes para ${config.user_id}:`, recentError);
      } else {
        console.log(`   📧 Emails processados nas últimas 24h: ${recentEmails?.length || 0}`);
        
        if (recentEmails && recentEmails.length > 0) {
          const repliedCount = recentEmails.filter(e => e.status === 'replied').length;
          const errorCount = recentEmails.filter(e => e.status === 'error').length;
          console.log(`   ✅ Respondidos: ${repliedCount}`);
          console.log(`   ❌ Erros: ${errorCount}`);
        }
      }
    }

    // 4. Verificar status do polling (se disponível)
    console.log('\n4️⃣ Verificando status do polling...');
    console.log('💡 Para verificar o status do polling, acesse:');
    console.log('   - Frontend: Verifique o console do navegador');
    console.log('   - Netlify: Verifique os logs da função');
    console.log('   - Supabase: Verifique os logs da Edge Function');

    // 5. Sugestões de solução
    console.log('\n🛠️ SUGESTÕES DE SOLUÇÃO:');
    console.log('========================');
    
    if (!configs || configs.length === 0) {
      console.log('1. ❌ Nenhuma configuração ativa encontrada');
      console.log('   → Verifique se o usuário fez login no sistema');
      console.log('   → Verifique se o processamento de email foi ativado');
    } else if (!processedEmails || processedEmails.length === 0) {
      console.log('2. ❌ Nenhum email foi processado');
      console.log('   → Verifique se o polling automático está funcionando');
      console.log('   → Teste o processamento manual');
      console.log('   → Verifique se o token de acesso não expirou');
    } else {
      console.log('3. ✅ Sistema parece estar funcionando');
      console.log('   → Verifique se o email foi enviado para o endereço correto');
      console.log('   → Verifique se o email não foi filtrado como spam');
      console.log('   → Verifique os logs para erros específicos');
    }

    console.log('\n📞 PRÓXIMOS PASSOS:');
    console.log('===================');
    console.log('1. Teste o processamento manual via API');
    console.log('2. Verifique os logs do sistema');
    console.log('3. Teste com um email simples');
    console.log('4. Verifique se o token de acesso está válido');

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  }
}

// Executar diagnóstico
diagnoseEmailSystem();
