// Script para debugar a análise de IA
// Execute com: node test-debug-analysis.js

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

// Teste com email muito simples
async function testSimpleEmail() {
  console.log('🧪 TESTE SIMPLES - EMAIL BÁSICO');
  console.log('================================');
  
  const simpleEmail = {
    id: 'test-simple-debug',
    subject: 'Oi',
    from: { emailAddress: { address: 'teste@teste.com' } },
    bodyPreview: 'Oi, tudo bem?',
    body: { content: 'Oi, tudo bem? Como vai?' }
  };
  
  console.log(`📧 Email: ${simpleEmail.subject}`);
  console.log(`📝 De: ${simpleEmail.from.emailAddress.address}`);
  console.log(`📄 Conteúdo: ${simpleEmail.bodyPreview}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: simpleEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log(`\n🤖 ANÁLISE COMPLETA:`);
      console.log(`   - shouldReply: ${result.data.analysis?.shouldReply}`);
      console.log(`   - confidence: ${result.data.analysis?.confidence}`);
      console.log(`   - category: ${result.data.analysis?.category}`);
      console.log(`   - priority: ${result.data.analysis?.priority}`);
      console.log(`   - reason: ${result.data.analysis?.reason || 'N/A'}`);
      
      if (result.data.response) {
        console.log(`\n💬 RESPOSTA:`);
        console.log(`   ${result.data.response.substring(0, 200)}...`);
      } else {
        console.log(`\n💬 Nenhuma resposta gerada`);
      }
      
      // Diagnóstico
      if (result.data.analysis?.confidence === 0) {
        console.log(`\n❌ PROBLEMA: Confiança 0% - análise não está funcionando`);
      } else if (result.data.analysis?.confidence === 0.7) {
        console.log(`\n🔍 Usando análise simples (fallback)`);
      } else if (result.data.analysis?.confidence > 0.7) {
        console.log(`\n🤖 Usando API do Gemini`);
      }
      
    } else {
      console.log(`❌ Erro: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Teste com email de sistema (deve ser rejeitado)
async function testSystemEmail() {
  console.log('\n🧪 TESTE SISTEMA - EMAIL DE CURSOR');
  console.log('===================================');
  
  const systemEmail = {
    id: 'test-system-debug',
    subject: 'Welcome to Cursor!',
    from: { emailAddress: { address: 'hi@cursor.com' } },
    bodyPreview: 'Welcome to Cursor',
    body: { content: 'Welcome to Cursor, the AI-first code editor.' }
  };
  
  console.log(`📧 Email: ${systemEmail.subject}`);
  console.log(`📝 De: ${systemEmail.from.emailAddress.address}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: systemEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log(`\n🤖 ANÁLISE COMPLETA:`);
      console.log(`   - shouldReply: ${result.data.analysis?.shouldReply}`);
      console.log(`   - confidence: ${result.data.analysis?.confidence}`);
      console.log(`   - category: ${result.data.analysis?.category}`);
      console.log(`   - reason: ${result.data.analysis?.reason || 'N/A'}`);
      
      if (result.data.analysis?.shouldReply === false) {
        console.log(`\n✅ CORRETO: Email de sistema detectado e rejeitado`);
      } else {
        console.log(`\n❌ PROBLEMA: Email de sistema não foi detectado`);
      }
      
    } else {
      console.log(`❌ Erro: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar todos os testes
async function runDebugTests() {
  console.log('🔍 DEBUGANDO ANÁLISE DE IA');
  console.log('==========================');
  console.log('Testando emails simples para identificar o problema...\n');
  
  await testSimpleEmail();
  await testSystemEmail();
  
  console.log('\n🎯 DEBUG CONCLUÍDO!');
  console.log('\n📋 DIAGNÓSTICO:');
  console.log('- Se confiança = 0: Problema na função simpleEmailAnalysis');
  console.log('- Se confiança = 0.7: Usando análise simples (funcionando)');
  console.log('- Se confiança > 0.7: Usando API do Gemini (funcionando)');
}

// Executar os testes
runDebugTests().catch(console.error);
