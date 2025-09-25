import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente
loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCronStatus() {
  console.log('🔍 VERIFICANDO STATUS DO CRON JOB');
  console.log('===================================\n');

  try {
    // 1. Verificar se a extensão pg_cron está habilitada
    console.log('1️⃣ Verificando extensão pg_cron...');
    const { data: extensions, error: extError } = await supabase
      .rpc('check_extensions');

    if (extError) {
      console.log('⚠️ Não foi possível verificar extensões:', extError.message);
    } else {
      console.log('✅ Extensões encontradas:', extensions);
    }

    // 2. Verificar jobs do cron
    console.log('\n2️⃣ Verificando jobs do cron...');
    const { data: cronJobs, error: cronError } = await supabase
      .rpc('check_cron_jobs');

    if (cronError) {
      console.log('❌ Erro ao verificar cron jobs:', cronError.message);
      console.log('💡 Isso pode indicar que a extensão pg_cron não está habilitada');
    } else {
      console.log('✅ Cron jobs encontrados:', cronJobs);
      
      if (cronJobs && cronJobs.length > 0) {
        cronJobs.forEach((job, index) => {
          console.log(`   ${index + 1}. Job: ${job.jobname}`);
          console.log(`      Schedule: ${job.schedule}`);
          console.log(`      Active: ${job.active}`);
          console.log(`      Last Run: ${job.last_run || 'Nunca'}`);
          console.log(`      Next Run: ${job.next_run || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhum cron job encontrado!');
        console.log('💡 Isso explica por que a Edge Function não está sendo chamada automaticamente');
      }
    }

    // 3. Verificar configurações de email ativas
    console.log('\n3️⃣ Verificando configurações de email ativas...');
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
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhuma configuração ativa encontrada!');
      }
    }

    // 4. Verificar se a Edge Function está deployada
    console.log('\n4️⃣ Verificando se a Edge Function está acessível...');
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
        console.log('📝 Resposta da Edge Function:', result.substring(0, 200) + '...');
      } else {
        console.log('❌ Edge Function retornou erro:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Erro ao chamar Edge Function:', error.message);
    }

    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log('========================');
    console.log('1. Se não há cron jobs, a Edge Function não será chamada automaticamente');
    console.log('2. Se não há configurações ativas, não há emails para processar');
    console.log('3. Se a Edge Function não está acessível, há problema de deploy');
    console.log('\n💡 SOLUÇÕES:');
    console.log('- Para ativar cron job: Execute o SQL de configuração do cron');
    console.log('- Para ativar processamento: Usuário deve fazer login e ativar');
    console.log('- Para deploy da Edge Function: Execute supabase functions deploy');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar diagnóstico
checkCronStatus();
