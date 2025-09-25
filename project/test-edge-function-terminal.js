// Script para testar Edge Function no terminal
// Execute com: node test-edge-function-terminal.js

import https from 'https';

// Função para fazer requisição HTTPS
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'fitpynguasqqutuhzifx.supabase.co',
      port: 443,
      path: '/functions/v1/microsoft-email-polling',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Erro ao parsear resposta: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Teste 1: Email de sistema (não deve responder)
async function testSystemEmail() {
  console.log('🧪 TESTE 1: Email de Sistema');
  console.log('=============================');
  
  const systemEmail = {
    id: 'test-system-terminal',
    subject: 'Welcome to Cursor!',
    from: { emailAddress: { address: 'hi@cursor.com' } },
    bodyPreview: 'Welcome to Cursor, the AI-first code editor.',
    body: { content: 'Welcome to Cursor, the AI-first code editor.' }
  };
  
  console.log(`📧 De: ${systemEmail.from.emailAddress.address}`);
  console.log(`📝 Assunto: ${systemEmail.subject}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: systemEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      const shouldReply = result.data.analysis?.shouldReply || false;
      const confidence = result.data.analysis?.confidence || 0;
      const reason = result.data.analysis?.reason || 'N/A';
      
      console.log(`🤖 Análise da IA:`);
      console.log(`   - Deve responder: ${shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Confiança: ${Math.floor(confidence * 100)}%`);
      console.log(`   - Motivo: ${reason}`);
      
      if (shouldReply === false) {
        console.log('✅ SUCESSO: Email de sistema detectado corretamente!');
      } else {
        console.log('❌ FALHA: Email de sistema não foi detectado!');
      }
    } else {
      console.log(`❌ Erro na requisição: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Teste 2: Email normal (deve responder)
async function testNormalEmail() {
  console.log('\n🧪 TESTE 2: Email Normal');
  console.log('=========================');
  
  const normalEmail = {
    id: 'test-normal-terminal',
    subject: 'Dúvidas sobre admissão no Matrícula USA',
    from: { emailAddress: { address: 'estudante@gmail.com' } },
    bodyPreview: 'Olá, tenho dúvidas sobre o processo de admissão.',
    body: { content: 'Olá, tenho dúvidas sobre o processo de admissão. Como funciona? Quais documentos preciso?' }
  };
  
  console.log(`📧 De: ${normalEmail.from.emailAddress.address}`);
  console.log(`📝 Assunto: ${normalEmail.subject}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: normalEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      const shouldReply = result.data.analysis?.shouldReply || false;
      const confidence = result.data.analysis?.confidence || 0;
      const response = result.data.response || '';
      
      console.log(`🤖 Análise da IA:`);
      console.log(`   - Deve responder: ${shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Confiança: ${Math.floor(confidence * 100)}%`);
      
      if (response) {
        console.log(`💬 Resposta gerada: ${response.substring(0, 150)}...`);
      } else {
        console.log(`💬 Nenhuma resposta gerada`);
      }
      
      if (shouldReply === true) {
        console.log('✅ SUCESSO: Email normal será respondido!');
      } else {
        console.log('❌ FALHA: Email normal não será respondido!');
      }
    } else {
      console.log(`❌ Erro na requisição: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Teste 3: Email de boas-vindas (não deve responder)
async function testWelcomeEmail() {
  console.log('\n🧪 TESTE 3: Email de Boas-vindas');
  console.log('=================================');
  
  const welcomeEmail = {
    id: 'test-welcome-terminal',
    subject: 'Bem-vindo à sua nova conta do Outlook.com',
    from: { emailAddress: { address: 'no-reply@microsoft.com' } },
    bodyPreview: 'Bem-vindo à sua nova conta do Outlook.com',
    body: { content: 'Bem-vindo à sua nova conta do Outlook.com. Sua conta foi criada com sucesso.' }
  };
  
  console.log(`📧 De: ${welcomeEmail.from.emailAddress.address}`);
  console.log(`📝 Assunto: ${welcomeEmail.subject}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: welcomeEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      const shouldReply = result.data.analysis?.shouldReply || false;
      const confidence = result.data.analysis?.confidence || 0;
      const reason = result.data.analysis?.reason || 'N/A';
      
      console.log(`🤖 Análise da IA:`);
      console.log(`   - Deve responder: ${shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Confiança: ${Math.floor(confidence * 100)}%`);
      console.log(`   - Motivo: ${reason}`);
      
      if (shouldReply === false) {
        console.log('✅ SUCESSO: Email de boas-vindas detectado corretamente!');
      } else {
        console.log('❌ FALHA: Email de boas-vindas não foi detectado!');
      }
    } else {
      console.log(`❌ Erro na requisição: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 INICIANDO TESTES DA EDGE FUNCTION');
  console.log('====================================');
  console.log('Testando melhorias implementadas...\n');
  
  await testSystemEmail();
  await testNormalEmail();
  await testWelcomeEmail();
  
  console.log('\n🎯 TESTES CONCLUÍDOS!');
  console.log('Verifique os logs da Edge Function para ver os novos logs de tempo e detecção.');
  console.log('\n📋 RESUMO DOS TESTES:');
  console.log('- Teste 1: Email de sistema (cursor.com) - deve ser rejeitado');
  console.log('- Teste 2: Email normal (gmail.com) - deve ser respondido');
  console.log('- Teste 3: Email de boas-vindas (microsoft.com) - deve ser rejeitado');
}

// Executar os testes
runAllTests().catch(console.error);
