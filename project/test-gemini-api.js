// Script para testar se a API do Gemini está funcionando
// Execute com: node test-gemini-api.js

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

// Teste específico para verificar se a IA está funcionando
async function testAIDirectly() {
  console.log('🧪 TESTANDO IA DIRETAMENTE');
  console.log('==========================');
  
  const testEmail = {
    id: 'test-ai-direct',
    subject: 'Dúvidas sobre admissão - TESTE IA',
    from: { emailAddress: { address: 'teste@example.com' } },
    bodyPreview: 'Olá, tenho dúvidas sobre o processo de admissão. Como funciona?',
    body: { content: 'Olá, tenho dúvidas sobre o processo de admissão. Como funciona? Quais documentos preciso?' }
  };
  
  console.log(`📧 Testando email: ${testEmail.subject}`);
  console.log(`📝 Conteúdo: ${testEmail.bodyPreview}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'test_ai',
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log(`🤖 Resultado da IA:`);
      console.log(`   - Deve responder: ${result.data.analysis?.shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Confiança: ${Math.floor((result.data.analysis?.confidence || 0) * 100)}%`);
      console.log(`   - Categoria: ${result.data.analysis?.category || 'N/A'}`);
      console.log(`   - Prioridade: ${result.data.analysis?.priority || 'N/A'}`);
      
      if (result.data.response) {
        console.log(`💬 Resposta gerada:`);
        console.log(`   ${result.data.response.substring(0, 200)}...`);
      } else {
        console.log(`💬 Nenhuma resposta gerada`);
      }
      
      // Verificar se está usando análise simples ou Gemini
      if (result.data.analysis?.confidence === 0.7) {
        console.log('🔍 Usando análise simples (fallback)');
      } else if (result.data.analysis?.confidence > 0.7) {
        console.log('🤖 Usando API do Gemini');
      } else {
        console.log('❓ Análise com confiança baixa - verificar logs');
      }
      
    } else {
      console.log(`❌ Erro na requisição: ${result.data.error || 'Status ' + result.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Teste com email que deveria usar Gemini
async function testGeminiAnalysis() {
  console.log('\n🧪 TESTANDO ANÁLISE COM GEMINI');
  console.log('===============================');
  
  const complexEmail = {
    id: 'test-gemini-complex',
    subject: 'Aplicação para Universidade de Harvard - Processo Completo',
    from: { emailAddress: { address: 'estudante.ambicioso@gmail.com' } },
    bodyPreview: 'Olá, estou interessado em aplicar para Harvard. Preciso de ajuda com todo o processo: documentos, essays, recomendações, etc.',
    body: { 
      content: `Olá equipe Matrícula USA,

Estou muito interessado em aplicar para a Universidade de Harvard para o curso de Computer Science. Tenho algumas dúvidas específicas:

1. Quais documentos são necessários?
2. Como escrever um essay convincente?
3. Como conseguir cartas de recomendação?
4. Qual é o processo de entrevista?
5. Existem bolsas de estudo disponíveis?

Agradeço pela ajuda!

Abraços,
João Silva` 
    }
  };
  
  console.log(`📧 Testando email complexo: ${complexEmail.subject}`);
  console.log(`📝 Conteúdo: ${complexEmail.bodyPreview}`);
  
  try {
    const startTime = Date.now();
    const result = await makeRequest('https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-email-polling', {
      action: 'process_email',
      email: complexEmail,
      user_id: '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de processamento: ${Math.floor(processingTime/1000)}s`);
    console.log(`📊 Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log(`🤖 Análise da IA:`);
      console.log(`   - Deve responder: ${result.data.analysis?.shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   - Confiança: ${Math.floor((result.data.analysis?.confidence || 0) * 100)}%`);
      console.log(`   - Categoria: ${result.data.analysis?.category || 'N/A'}`);
      console.log(`   - Prioridade: ${result.data.analysis?.priority || 'N/A'}`);
      
      if (result.data.response) {
        console.log(`💬 Resposta gerada:`);
        console.log(`   ${result.data.response.substring(0, 300)}...`);
      } else {
        console.log(`💬 Nenhuma resposta gerada`);
      }
      
      // Verificar se está usando análise simples ou Gemini
      if (result.data.analysis?.confidence === 0.7) {
        console.log('🔍 Usando análise simples (fallback) - Gemini pode não estar funcionando');
      } else if (result.data.analysis?.confidence > 0.7) {
        console.log('🤖 Usando API do Gemini - funcionando corretamente');
      } else {
        console.log('❓ Análise com confiança baixa - verificar configuração');
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
  console.log('🚀 TESTANDO CONFIGURAÇÃO DA IA');
  console.log('===============================');
  console.log('Verificando se Gemini está funcionando...\n');
  
  await testAIDirectly();
  await testGeminiAnalysis();
  
  console.log('\n🎯 TESTES CONCLUÍDOS!');
  console.log('\n📋 DIAGNÓSTICO:');
  console.log('- Se confiança = 0.7: Usando análise simples (Gemini não funcionando)');
  console.log('- Se confiança > 0.7: Usando API do Gemini (funcionando)');
  console.log('- Se confiança = 0: Problema na análise');
}

// Executar os testes
runAllTests().catch(console.error);
