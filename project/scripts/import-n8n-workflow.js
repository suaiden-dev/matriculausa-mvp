const fs = require('fs');
const path = require('path');

// Configurações do n8n
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-api-key';

// Função para importar workflow no n8n
async function importWorkflow() {
  try {
    console.log('🚀 Importando workflow AI Email Auto-Responder no n8n...');
    
    // Ler o arquivo do workflow
    const workflowPath = path.join(__dirname, '../n8n-workflow-ai-email-autoresponder.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Preparar dados para importação
    const importData = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings,
      staticData: workflowData.staticData,
      tags: workflowData.tags,
      triggerCount: workflowData.triggerCount,
      versionId: workflowData.versionId
    };
    
    // Fazer requisição para importar o workflow
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(importData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao importar workflow: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Workflow importado com sucesso!');
    console.log('📋 ID do Workflow:', result.id);
    console.log('🔗 URL do Workflow:', `${N8N_BASE_URL}/workflow/${result.id}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao importar workflow:', error.message);
    throw error;
  }
}

// Função para configurar credenciais no n8n
async function setupCredentials() {
  console.log('🔧 Configurando credenciais no n8n...');
  
  const credentials = [
    {
      name: 'Supabase Database',
      type: 'postgres',
      data: {
        host: process.env.SUPABASE_HOST || 'db.supabase.co',
        port: 5432,
        database: process.env.SUPABASE_DB || 'postgres',
        user: process.env.SUPABASE_USER || 'postgres',
        password: process.env.SUPABASE_PASSWORD || '',
        ssl: true
      }
    },
    {
      name: 'OpenAI API',
      type: 'openAiApi',
      data: {
        apiKey: process.env.OPENAI_API_KEY || ''
      }
    },
    {
      name: 'Email Service',
      type: 'emailSend',
      data: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: 587,
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        secure: false
      }
    }
  ];
  
  for (const credential of credentials) {
    try {
      const response = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credential)
      });
      
      if (response.ok) {
        console.log(`✅ Credencial ${credential.name} configurada`);
      } else {
        console.log(`⚠️ Credencial ${credential.name} já existe ou erro na configuração`);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao configurar credencial ${credential.name}:`, error.message);
    }
  }
}

// Função para ativar o workflow
async function activateWorkflow(workflowId) {
  try {
    console.log('🔌 Ativando workflow...');
    
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao ativar workflow: ${response.status} - ${errorText}`);
    }
    
    console.log('✅ Workflow ativado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao ativar workflow:', error.message);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log('🎯 Iniciando configuração do workflow AI Email Auto-Responder...\n');
    
    // 1. Configurar credenciais
    await setupCredentials();
    console.log('');
    
    // 2. Importar workflow
    const workflow = await importWorkflow();
    console.log('');
    
    // 3. Ativar workflow
    await activateWorkflow(workflow.id);
    console.log('');
    
    console.log('🎉 Configuração concluída com sucesso!');
    console.log('📧 O sistema de auto-resposta de emails está pronto para uso.');
    console.log('🔗 Webhook URL:', `${N8N_BASE_URL}/webhook/ai-email-webhook`);
    
  } catch (error) {
    console.error('💥 Erro na configuração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  importWorkflow,
  setupCredentials,
  activateWorkflow
}; 