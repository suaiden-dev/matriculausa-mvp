// Script para testar as melhorias da Edge Function
// Execute no console do navegador

async function testEdgeFunctionImprovements() {
  console.log('🧪 TESTANDO MELHORIAS DA EDGE FUNCTION');
  console.log('=====================================');
  
  const testCases = [
    {
      name: 'Email de Sistema (não deve responder)',
      email: {
        id: 'test-system-1',
        subject: 'Welcome to Cursor!',
        from: { emailAddress: { address: 'hi@cursor.com' } },
        bodyPreview: 'Welcome to Cursor, the AI-first code editor.',
        body: { content: 'Welcome to Cursor, the AI-first code editor.' }
      },
      expectedResponse: false
    },
    {
      name: 'Email de Boas-vindas (não deve responder)',
      email: {
        id: 'test-welcome-1',
        subject: 'Bem-vindo à sua nova conta do Outlook.com',
        from: { emailAddress: { address: 'no-reply@microsoft.com' } },
        bodyPreview: 'Bem-vindo à sua nova conta do Outlook.com',
        body: { content: 'Bem-vindo à sua nova conta do Outlook.com' }
      },
      expectedResponse: false
    },
    {
      name: 'Email de Verificação (não deve responder)',
      email: {
        id: 'test-verify-1',
        subject: 'Verify your email address',
        from: { emailAddress: { address: 'no-reply@cursor.sh' } },
        bodyPreview: 'Please verify your email address',
        body: { content: 'Please verify your email address' }
      },
      expectedResponse: false
    },
    {
      name: 'Email de Pergunta (deve responder)',
      email: {
        id: 'test-question-1',
        subject: 'Dúvidas sobre o Matrícula USA',
        from: { emailAddress: { address: 'usuario@gmail.com' } },
        bodyPreview: 'Olá, tenho dúvidas sobre o processo de admissão.',
        body: { content: 'Olá, tenho dúvidas sobre o processo de admissão. Como funciona?' }
      },
      expectedResponse: true
    },
    {
      name: 'Email de Documentos (deve responder)',
      email: {
        id: 'test-docs-1',
        subject: 'Documentos necessários',
        from: { emailAddress: { address: 'estudante@hotmail.com' } },
        bodyPreview: 'Quais documentos preciso enviar?',
        body: { content: 'Quais documentos preciso enviar para a aplicação?' }
      },
      expectedResponse: true
    }
  ];

  console.log(`\n📋 Executando ${testCases.length} testes...\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}️⃣ ${testCase.name}`);
    console.log(`📧 De: ${testCase.email.from.emailAddress.address}`);
    console.log(`📝 Assunto: ${testCase.email.subject}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_email',
          email: testCase.email,
          user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
        })
      });
      
      const processingTime = Date.now() - startTime;
      const data = await response.json();
      
      console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        const shouldReply = data.analysis?.shouldReply || false;
        const confidence = data.analysis?.confidence || 0;
        const reason = data.analysis?.reason || 'N/A';
        
        console.log(`🤖 Análise da IA:`);
        console.log(`   - Deve responder: ${shouldReply ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   - Confiança: ${Math.floor(confidence * 100)}%`);
        console.log(`   - Motivo: ${reason}`);
        
        if (data.response) {
          console.log(`💬 Resposta gerada: ${data.response.substring(0, 100)}...`);
        } else {
          console.log(`💬 Nenhuma resposta gerada`);
        }
        
        // Verificar se o resultado está correto
        const isCorrect = shouldReply === testCase.expectedResponse;
        console.log(`✅ Resultado: ${isCorrect ? 'CORRETO' : 'INCORRETO'}`);
        
        if (!isCorrect) {
          console.log(`❌ ERRO: Esperado ${testCase.expectedResponse ? 'resposta' : 'sem resposta'}, mas obteve ${shouldReply ? 'resposta' : 'sem resposta'}`);
        }
        
      } else {
        console.log(`❌ Erro na requisição: ${data.error || 'Status ' + response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro no teste:`, error);
    }
    
    // Delay entre testes para evitar rate limiting
    if (i < testCases.length - 1) {
      console.log(`⏳ Aguardando 2s antes do próximo teste...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n🎯 TESTE CONCLUÍDO!`);
  console.log(`Verifique os logs da Edge Function para ver os novos logs de tempo e detecção de sistema.`);
}

// Função para testar delays humanizados
async function testHumanizedDelays() {
  console.log('\n🕐 TESTANDO DELAYS HUMANIZADOS');
  console.log('==============================');
  
  const testEmail = {
    id: 'test-delay-1',
    subject: 'Teste de Delay Humanizado',
    from: { emailAddress: { address: 'teste@example.com' } },
    bodyPreview: 'Este é um teste de delay humanizado.',
    body: { content: 'Este é um teste de delay humanizado para verificar se os delays estão funcionando.' }
  };
  
  console.log('📧 Enviando email de teste...');
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
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
    
    const totalTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`⏱️ Tempo total: ${Math.floor(totalTime/1000)}s`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok && data.analysis?.shouldReply) {
      console.log(`✅ Email deve ser respondido com delay humanizado`);
      console.log(`💬 Resposta: ${data.response?.substring(0, 100)}...`);
      console.log(`⏰ Verifique os logs da Edge Function para ver o delay de 30-120s`);
    } else {
      console.log(`❌ Email não será respondido`);
    }
    
  } catch (error) {
    console.error(`❌ Erro no teste de delay:`, error);
  }
}

// Executar todos os testes
async function runAllTests() {
  await testEdgeFunctionImprovements();
  await testHumanizedDelays();
}

// Executar o teste
runAllTests();
