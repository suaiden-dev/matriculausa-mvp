// Script para debugar o sistema de emails
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugEmailSystem() {
  console.log('🔍 DEBUG: Verificando sistema de emails...\n');

  try {
    // 1. Verificar configurações de email
    console.log('📧 1. Verificando configurações de email...');
    const { data: configs, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true);
    
    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
    } else {
      console.log(`✅ Configurações ativas: ${configs?.length || 0}`);
      configs?.forEach(config => {
        console.log(`   - ${config.email_address} (${config.provider_type})`);
      });
    }

    // 2. Verificar fila de emails
    console.log('\n📬 2. Verificando fila de emails...');
    const { data: queue, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (queueError) {
      console.error('❌ Erro ao buscar fila:', queueError);
    } else {
      console.log(`✅ Emails na fila: ${queue?.length || 0}`);
      queue?.forEach(item => {
        console.log(`   - ${item.status}: ${item.email_data?.subject || 'Sem assunto'} (${item.created_at})`);
      });
    }

    // 3. Verificar emails processados
    console.log('\n📊 3. Verificando emails processados...');
    const { data: processed, error: processedError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(10);
    
    if (processedError) {
      console.error('❌ Erro ao buscar emails processados:', processedError);
    } else {
      console.log(`✅ Emails processados: ${processed?.length || 0}`);
      processed?.forEach(item => {
        console.log(`   - ${item.status}: ${item.subject || 'Sem assunto'} (${item.processed_at})`);
      });
    }

    // 4. Verificar locks
    console.log('\n🔒 4. Verificando locks...');
    const { data: locks, error: locksError } = await supabase
      .from('worker_locks')
      .select('*');
    
    if (locksError) {
      console.error('❌ Erro ao buscar locks:', locksError);
    } else {
      console.log(`✅ Locks ativos: ${locks?.length || 0}`);
      locks?.forEach(lock => {
        const age = Date.now() - new Date(lock.created_at).getTime();
        console.log(`   - ${lock.lock_key}: ${Math.round(age/1000)}s atrás`);
      });
    }

    // 5. Verificar recebidos recentes
    console.log('\n📥 5. Verificando emails recebidos recentes...');
    const { data: received, error: receivedError } = await supabase
      .from('received_emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (receivedError) {
      console.error('❌ Erro ao buscar emails recebidos:', receivedError);
    } else {
      console.log(`✅ Emails recebidos recentes: ${received?.length || 0}`);
      received?.forEach(item => {
        console.log(`   - ${item.subject || 'Sem assunto'} (${item.received_at})`);
      });
    }

    console.log('\n🎯 DIAGNÓSTICO:');
    if (queue?.length === 0) {
      console.log('⚠️  PROBLEMA: Fila de emails vazia - novos emails não estão sendo detectados');
      console.log('💡 SOLUÇÃO: Verificar se o sistema de polling está funcionando');
    } else {
      console.log('✅ Sistema funcionando - há emails na fila para processar');
    }

  } catch (error) {
    console.error('💥 Erro no debug:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugEmailSystem();
}

module.exports = { debugEmailSystem };
