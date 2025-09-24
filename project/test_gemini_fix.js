// Script para testar a correção do Gemini
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGeminiFix() {
  console.log('🧪 TESTE DA CORREÇÃO DO GEMINI');
  console.log('==============================\n');

  try {
    // 1. Verificar configurações ativas
    console.log('1️⃣ Verificando configurações ativas...');
    const { data: configs, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('⚠️ Nenhuma configuração ativa encontrada');
      return;
    }

    console.log(`✅ ${configs.length} configuração(ões) ativa(s)`);
    configs.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.name} (${config.provider_type}) - ${config.email_address}`);
    });

    // 2. Testar Edge Function diretamente
    console.log('\n2️⃣ Testando Edge Function diretamente...');
    
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('microsoft-email-polling', {
      body: {}
    });

    if (functionError) {
      console.error('❌ Erro ao chamar Edge Function:', functionError);
      return;
    }

    console.log('✅ Edge Function executada com sucesso');
    console.log('📊 Resultado:', JSON.stringify(functionResult, null, 2));

    // 3. Verificar emails processados recentemente
    console.log('\n3️⃣ Verificando emails processados recentemente...');
    
    const { data: processedEmails, error: emailsError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .gte('processed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('processed_at', { ascending: false })
      .limit(5);

    if (emailsError) {
      console.error('❌ Erro ao buscar emails processados:', emailsError);
      return;
    }

    if (processedEmails && processedEmails.length > 0) {
      console.log(`✅ ${processedEmails.length} email(s) processado(s) nos últimos 5 minutos`);
      processedEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject} (${email.status}) - ${email.processed_at}`);
      });
    } else {
      console.log('⚠️ Nenhum email processado nos últimos 5 minutos');
    }

    // 4. Verificar logs de erro
    console.log('\n4️⃣ Verificando se há erros de JSON...');
    
    const { data: errorEmails, error: errorError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .not('error_message', 'is', null)
      .gte('processed_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('processed_at', { ascending: false });

    if (errorError) {
      console.error('❌ Erro ao buscar emails com erro:', errorError);
      return;
    }

    if (errorEmails && errorEmails.length > 0) {
      console.log(`⚠️ ${errorEmails.length} email(s) com erro nos últimos 10 minutos:`);
      errorEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject} - Erro: ${email.error_message}`);
      });
    } else {
      console.log('✅ Nenhum erro de processamento encontrado');
    }

    console.log('\n🎉 Teste concluído!');
    console.log('💡 Se você enviar um email agora, ele deve ser processado sem erros de JSON.');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testGeminiFix();
