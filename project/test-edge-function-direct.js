// Script para testar Edge Function diretamente
// Execute no console do navegador

async function testEdgeFunctionDirectly() {
  console.log('🧪 TESTANDO EDGE FUNCTION DIRETAMENTE');
  console.log('=====================================');
  
  try {
    // 1. Testar chamada direta para Edge Function
    console.log('1️⃣ Testando chamada direta para Edge Function...');
    
    const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'get_processed_emails',
        user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
      })
    });
    
    console.log('📊 Status da resposta:', response.status);
    const data = await response.json();
    console.log('📊 Dados da resposta:', data);
    
    if (response.ok) {
      console.log('✅ Edge Function está funcionando!');
      console.log('📧 Emails processados:', data.processed_emails?.length || 0);
    } else {
      console.log('❌ Edge Function retornou erro:', data);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar Edge Function:', error);
  }
  
  try {
    // 2. Testar processamento de email específico
    console.log('\n2️⃣ Testando processamento de email específico...');
    
    const testEmail = {
      id: 'test-email-123',
      subject: 'Teste de IA - Resposta Instantânea',
      from: { emailAddress: { address: 'test@example.com' } },
      bodyPreview: 'Este é um email de teste para verificar se a IA está funcionando.',
      body: { content: 'Este é um email de teste para verificar se a IA está funcionando corretamente.' }
    };
    
    const processResponse = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'process_email',
        email: testEmail,
        user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
      })
    });
    
    console.log('📊 Status do processamento:', processResponse.status);
    const processData = await processResponse.json();
    console.log('📊 Resultado do processamento:', processData);
    
    if (processResponse.ok) {
      console.log('✅ Processamento de email funcionando!');
      console.log('🤖 Análise da IA:', processData.analysis);
      console.log('💬 Resposta gerada:', processData.response);
    } else {
      console.log('❌ Erro no processamento:', processData);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar processamento:', error);
  }
}

// Executar o teste
testEdgeFunctionDirectly();
