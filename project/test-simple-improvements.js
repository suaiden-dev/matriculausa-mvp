// Script simples para testar as melhorias
// Execute no console do navegador

async function testSystemEmailDetection() {
  console.log('🧪 TESTANDO DETECÇÃO DE EMAILS DE SISTEMA');
  console.log('==========================================');
  
  // Teste 1: Email de sistema (não deve responder)
  console.log('\n1️⃣ Testando email de sistema...');
  const systemEmail = {
    id: 'test-system',
    subject: 'Welcome to Cursor!',
    from: { emailAddress: { address: 'hi@cursor.com' } },
    bodyPreview: 'Welcome to Cursor',
    body: { content: 'Welcome to Cursor' }
  };
  
  try {
    const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'process_email',
        email: systemEmail,
        user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
      })
    });
    
    const data = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`🤖 Deve responder: ${data.analysis?.shouldReply ? 'SIM' : 'NÃO'}`);
    console.log(`📝 Motivo: ${data.analysis?.reason || 'N/A'}`);
    console.log(`⏱️ Confiança: ${Math.floor((data.analysis?.confidence || 0) * 100)}%`);
    
    if (data.analysis?.shouldReply === false) {
      console.log('✅ SUCESSO: Email de sistema detectado corretamente!');
    } else {
      console.log('❌ FALHA: Email de sistema não foi detectado!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function testNormalEmail() {
  console.log('\n2️⃣ Testando email normal...');
  const normalEmail = {
    id: 'test-normal',
    subject: 'Dúvidas sobre admissão',
    from: { emailAddress: { address: 'estudante@gmail.com' } },
    bodyPreview: 'Olá, tenho dúvidas sobre o processo',
    body: { content: 'Olá, tenho dúvidas sobre o processo de admissão. Como funciona?' }
  };
  
  try {
    const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'process_email',
        email: normalEmail,
        user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
      })
    });
    
    const data = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`🤖 Deve responder: ${data.analysis?.shouldReply ? 'SIM' : 'NÃO'}`);
    console.log(`💬 Resposta: ${data.response ? data.response.substring(0, 100) + '...' : 'Nenhuma'}`);
    
    if (data.analysis?.shouldReply === true) {
      console.log('✅ SUCESSO: Email normal será respondido!');
    } else {
      console.log('❌ FALHA: Email normal não será respondido!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar testes
async function runTests() {
  await testSystemEmailDetection();
  await testNormalEmail();
  
  console.log('\n🎯 TESTES CONCLUÍDOS!');
  console.log('Verifique os logs da Edge Function para ver os novos logs de tempo e detecção.');
}

// Executar
runTests();
