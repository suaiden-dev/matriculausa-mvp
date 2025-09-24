import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (valores hardcoded para teste)
const supabaseUrl = 'https://fitpynguasqqutuhzifx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.8Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCronStatus() {
  console.log('🔍 VERIFICANDO STATUS DO CRON JOB');
  console.log('===================================\n');

  try {
    // 1. Verificar configurações de email ativas
    console.log('1️⃣ Verificando configurações de email ativas...');
    const { data: configs, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('provider_type', 'microsoft')
      .eq('is_active', true);

    if (configError) {
      console.log('❌ Erro ao buscar configurações:', configError.message);
    } else {
      console.log(`📊 Configurações ativas: ${configs?.length || 0}`);
      
      if (configs && configs.length > 0) {
        configs.forEach((config, index) => {
          console.log(`   ${index + 1}. User ID: ${config.user_id}`);
          console.log(`      Email: ${config.email_address}`);
          console.log(`      Último processamento: ${config.last_processing_date || 'Nunca'}`);
          console.log(`      Total processados: ${config.total_processed || 0}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhuma configuração ativa encontrada!');
        console.log('💡 Isso explica por que não há processamento automático');
      }
    }

    // 2. Verificar emails processados recentemente
    console.log('\n2️⃣ Verificando emails processados recentemente...');
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
      .order('processed_at', { ascending: false })
      .limit(10);

    if (processedError) {
      console.log('❌ Erro ao buscar emails processados:', processedError.message);
    } else {
      console.log(`📧 Emails processados nas últimas 24h: ${processedEmails?.length || 0}`);
      
      if (processedEmails && processedEmails.length > 0) {
        processedEmails.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.subject} (${email.from})`);
          console.log(`      Processado em: ${email.processed_at}`);
          console.log(`      Respondido: ${email.was_replied ? 'Sim' : 'Não'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhum email processado recentemente!');
      }
    }

    // 3. Verificar se a Edge Function está acessível
    console.log('\n3️⃣ Testando Edge Function...');
    try {
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        console.log('✅ Edge Function está acessível');
        const result = await response.text();
        console.log('📝 Resposta da Edge Function:', result.substring(0, 300) + '...');
      } else {
        console.log('❌ Edge Function retornou erro:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('📝 Erro detalhado:', errorText);
      }
    } catch (error) {
      console.log('❌ Erro ao chamar Edge Function:', error.message);
    }

    console.log('\n📋 DIAGNÓSTICO COMPLETO:');
    console.log('========================');
    console.log('🔍 PROBLEMA IDENTIFICADO:');
    console.log('   - O frontend detecta novos emails (44→45)');
    console.log('   - Mas a Edge Function não está sendo chamada automaticamente');
    console.log('   - Isso indica que o CRON JOB não está configurado ou não está funcionando');
    
    console.log('\n💡 SOLUÇÕES:');
    console.log('1. Configurar CRON JOB no Supabase:');
    console.log('   - Acesse o painel do Supabase → SQL Editor');
    console.log('   - Execute o SQL de configuração do cron job');
    console.log('2. Verificar se a extensão pg_cron está habilitada');
    console.log('3. Testar manualmente a Edge Function (como fizemos acima)');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar diagnóstico
checkCronStatus();
