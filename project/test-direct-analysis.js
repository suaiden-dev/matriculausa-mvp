// Script para testar análise direta
// Execute com: node test-direct-analysis.js

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

// Teste direto da análise
async function testDirectAnalysis() {
  console.log('🧪 TESTE DIRETO - ANÁLISE SIMPLES');
  console.log('==================================');
  
  const testEmail = {
    id: 'test-direct-1',
    subject: 'Oi, tudo bem?',
    from: { emailAddress: { address: 'amigo@gmail.com' } },
    bodyPreview: 'Oi, tudo bem? Como vai?',
    body: { content: 'Oi, tudo bem? Como vai? Espero que esteja bem!' }
  };
  
  console.log(`📧 Testando: ${testEmail.subject}`);
  console.log(`📝 De: ${testEmail.from.emailAddress.address}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: testEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log(`\n📋 RESPOSTA COMPLETA:`);
      console.log(JSON.stringify(result.data, null, 2));
      
      console.log(`\n🤖 ANÁLISE:`);
      console.log(`   - shouldReply: ${result.data.analysis?.shouldReply}`);
      console.log(`   - confidence: ${result.data.analysis?.confidence}`);
      console.log(`   - category: ${result.data.analysis?.category}`);
      console.log(`   - priority: ${result.data.analysis?.priority}`);
      console.log(`   - reason: ${result.data.analysis?.reason || 'N/A'}`);
      
      console.log(`\n💬 RESPOSTA:`);
      console.log(`   ${result.data.response || 'Nenhuma'}`);
      
    } else {
      console.log(`❌ Erro: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testDirectAnalysis().catch(console.error);
