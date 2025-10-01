// Script para testar a edge function de renovação de tokens
// Execute com: node test-token-refresh.js

const SUPABASE_URL = 'https://fitpynguasqqutuhzifx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg';

async function testTokenRefresh() {
  try {
    console.log('🧪 Testando edge function de renovação de tokens...');
    
    // URL da edge function com parâmetros de teste
    const functionUrl = `${SUPABASE_URL}/functions/v1/microsoft-token-refresh?test=true&force=true`;
    
    console.log('📡 Chamando edge function...');
    console.log('🔗 URL:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Teste executado com sucesso!');
      console.log(`📊 Total processadas: ${result.totalProcessed}`);
      console.log(`✅ Sucessos: ${result.successful}`);
      console.log(`❌ Falhas: ${result.failed}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detalhes dos resultados:');
        result.results.forEach((res, index) => {
          console.log(`${index + 1}. ${res.email}: ${res.success ? '✅' : '❌'} ${res.message}`);
        });
      }
    } else {
      console.log('❌ Teste falhou:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar teste:', error);
  }
}

// Executar teste
testTokenRefresh();
