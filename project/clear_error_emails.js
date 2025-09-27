// 🧹 SCRIPT PARA LIMPAR EMAILS COM ERRO E PERMITIR REPROCESSAMENTO
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fitpynguasqqutuhzifx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQ4Mzg1NywiZXhwIjoyMDY1MDU5ODU3fQ.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg'
);

async function clearErrorEmails() {
  console.log('🧹 LIMPANDO EMAILS COM ERRO PARA PERMITIR REPROCESSAMENTO');
  console.log('========================================================');
  
  try {
    // 1. Verificar quantos emails com erro existem
    const { data: errorEmails, error: fetchError } = await supabase
      .from('processed_microsoft_emails')
      .select('*')
      .eq('status', 'error')
      .order('processed_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Erro ao buscar emails com erro:', fetchError);
      return;
    }
    
    console.log(`📧 Emails com erro encontrados: ${errorEmails?.length || 0}`);
    
    if (errorEmails && errorEmails.length > 0) {
      console.log('\n📋 LISTA DE EMAILS COM ERRO:');
      errorEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject || 'Sem assunto'}`);
        console.log(`      De: ${email.from_email}`);
        console.log(`      ID: ${email.microsoft_message_id}`);
        console.log(`      Erro: ${email.error_message}`);
        console.log(`      Data: ${email.processed_at}`);
        console.log('');
      });
      
      // 2. Deletar emails com erro
      console.log('🗑️ Deletando emails com erro...');
      const { data: deleteData, error: deleteError } = await supabase
        .from('processed_microsoft_emails')
        .delete()
        .eq('status', 'error');
      
      if (deleteError) {
        console.error('❌ Erro ao deletar emails com erro:', deleteError);
        return;
      }
      
      console.log(`✅ ${errorEmails.length} emails com erro foram deletados!`);
      console.log('🔄 Agora os emails podem ser reprocessados pelo worker.');
      
    } else {
      console.log('✅ Nenhum email com erro encontrado!');
    }
    
    // 3. Verificar status atual
    console.log('\n📊 STATUS ATUAL DA TABELA:');
    const { data: allEmails } = await supabase
      .from('processed_microsoft_emails')
      .select('status')
      .order('processed_at', { ascending: false })
      .limit(100);
    
    if (allEmails) {
      const statusCounts = allEmails.reduce((acc, email) => {
        acc[email.status] = (acc[email.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   📈 Contagem por status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar
clearErrorEmails();
