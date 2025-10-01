// Script para verificar se email foi processado
// Execute este script para verificar o status do email de victuribdev@gmail.com

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://fitpynguasqqutuhzifx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4NzQsImV4cCI6MjA1MDU1MDg3NH0.sMBxCkaxDBmwiUeTzAFrag_AetAyvJs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmailStatus() {
  console.log('🔍 Verificando status do email de victuribdev@gmail.com...\n');

  try {
    // 1. Verificar na tabela processed_microsoft_emails
    console.log('📧 Verificando na tabela processed_microsoft_emails...');
    const { data: processedEmails, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .ilike('from_email', '%victuribdev@gmail.com%')
      .order('processed_at', { ascending: false });

    if (processedError) {
      console.error('❌ Erro ao buscar emails processados:', processedError);
    } else {
      console.log(`✅ Encontrados ${processedEmails?.length || 0} emails processados de victuribdev@gmail.com`);
      if (processedEmails && processedEmails.length > 0) {
        processedEmails.forEach((email, index) => {
          console.log(`\n📧 Email ${index + 1}:`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Status: ${email.status}`);
          console.log(`   Processed at: ${email.processed_at}`);
          console.log(`   Response: ${email.response_text ? email.response_text.substring(0, 100) + '...' : 'N/A'}`);
        });
      }
    }

    // 2. Verificar na tabela email_queue
    console.log('\n📬 Verificando na tabela email_queue...');
    const { data: queueEmails, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .ilike('email_data->from->emailAddress->address', '%victuribdev@gmail.com%')
      .order('created_at', { ascending: false });

    if (queueError) {
      console.error('❌ Erro ao buscar emails na fila:', queueError);
    } else {
      console.log(`✅ Encontrados ${queueEmails?.length || 0} emails na fila de victuribdev@gmail.com`);
      if (queueEmails && queueEmails.length > 0) {
        queueEmails.forEach((email, index) => {
          console.log(`\n📬 Email na fila ${index + 1}:`);
          console.log(`   Subject: ${email.email_data?.subject}`);
          console.log(`   Status: ${email.status}`);
          console.log(`   Created at: ${email.created_at}`);
          console.log(`   Completed at: ${email.completed_at || 'N/A'}`);
        });
      }
    }

    // 3. Verificar na tabela received_emails
    console.log('\n📥 Verificando na tabela received_emails...');
    const { data: receivedEmails, error: receivedError } = await supabase
      .from('received_emails')
      .select('*')
      .ilike('from_address', '%victuribdev@gmail.com%')
      .order('received_at', { ascending: false });

    if (receivedError) {
      console.error('❌ Erro ao buscar emails recebidos:', receivedError);
    } else {
      console.log(`✅ Encontrados ${receivedEmails?.length || 0} emails recebidos de victuribdev@gmail.com`);
      if (receivedEmails && receivedEmails.length > 0) {
        receivedEmails.forEach((email, index) => {
          console.log(`\n📥 Email recebido ${index + 1}:`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Received at: ${email.received_at}`);
          console.log(`   Processed: ${email.processed || false}`);
        });
      }
    }

    // 4. Verificar configurações de IA ativas
    console.log('\n🤖 Verificando configurações de IA ativas...');
    const { data: aiConfigs, error: aiError } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('is_active', true);

    if (aiError) {
      console.error('❌ Erro ao buscar configurações de IA:', aiError);
    } else {
      console.log(`✅ Encontradas ${aiConfigs?.length || 0} configurações de IA ativas`);
      if (aiConfigs && aiConfigs.length > 0) {
        aiConfigs.forEach((config, index) => {
          console.log(`\n🤖 Configuração ${index + 1}:`);
          console.log(`   AI Name: ${config.ai_name}`);
          console.log(`   Company: ${config.company_name}`);
          console.log(`   Agent Type: ${config.agent_type}`);
          console.log(`   University ID: ${config.university_id}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar verificação
checkEmailStatus();
