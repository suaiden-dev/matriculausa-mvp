import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Instância global do serviço de polling
let pollingService = null;
let emailProcessor = null;

// Função para iniciar o polling automaticamente
async function startAutomaticPolling() {
  try {
    console.log('🚀 INICIANDO POLLING AUTOMÁTICO...');
    
    // Usar token do Microsoft Graph das variáveis de ambiente
    const userToken = process.env.VITE_MICROSOFT_GRAPH_TOKEN || '';
    const userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';
    
    // Buscar userEmail do banco
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: config } = await supabase
      .from('email_processing_configs')
      .select('email_address')
      .eq('user_id', userId)
      .single();
    
    const userEmail = config?.email_address || null;
    console.log('🔍 POLLING AUTOMÁTICO - userEmail encontrado:', userEmail);
    
    // Criar EmailProcessor
    const { EmailProcessor } = await import('./emailProcessor.js');
    emailProcessor = new EmailProcessor(userToken, process.env.VITE_GEMINI_API_KEY, userId, userEmail);
    
    // Criar EmailPollingService
    const { EmailPollingService } = await import('./emailPollingService.js');
    pollingService = new EmailPollingService(
      userToken,
      process.env.VITE_GEMINI_API_KEY,
      userId,
      userEmail,
      {
        intervalMinutes: 0.5, // Verificar a cada 30 segundos
        maxRetries: 3,
        retryDelayMs: 5000
      }
    );
    
    // Iniciar o polling
    await pollingService.start();
    console.log('✅ POLLING AUTOMÁTICO INICIADO COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro ao iniciar polling automático:', error);
  }
}

// GET - Verificar status do polling
app.get('/api/polling-user', async (req, res) => {
  try {
    console.log('🔍 POLLING USER - Verificando status...');
    
    if (!pollingService) {
      return res.json({
        success: true,
        isRunning: false,
        message: 'Sistema de polling não iniciado',
        lastCheckTime: null,
        processedCount: 0
      });
    }

    const status = pollingService.getStatus();
    const stats = await pollingService.getStats();
    
    console.log('🔍 POLLING USER - Status:', status);

    res.json({
      success: true,
      isRunning: status.isRunning,
      lastCheckTime: status.lastCheckTime,
      processedCount: status.processedCount,
      config: status.config,
      stats,
      message: status.isRunning 
        ? `Sistema ativo - ${status.processedCount} emails processados`
        : 'Sistema parado'
    });

  } catch (error) {
    console.error('❌ POLLING USER - Erro ao verificar status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar status do polling',
      details: error.message
    });
  }
});

// POST - Iniciar polling com token de usuário
app.post('/api/polling-user', async (req, res) => {
  try {
    console.log('🚀 POLLING USER - Iniciando sistema de polling...');
    
    // Obter token do usuário do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de usuário não fornecido'
      });
    }

    const userToken = authHeader.substring(7);
    console.log('🚀 POLLING USER - Token de usuário recebido');
    
    // Extrair userId do token
    let userId = null;
    try {
      // Verificar se é um JWT válido (tem 3 partes separadas por ponto)
      const tokenParts = userToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        userId = payload.sub;
        console.log('🚀 POLLING USER - UserId extraído do JWT:', userId);
      } else {
        console.log('⚠️ POLLING USER - Token não é um JWT, é um token de acesso do Microsoft Graph');
        // Para tokens do Microsoft Graph, usar o user_id real do banco de dados
        userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'; // user_id real do paulo.suaiden@outlook.com
        console.log('🚀 POLLING USER - Usando user_id real do banco:', userId);
      }
    } catch (error) {
      console.log('⚠️ POLLING USER - Erro ao processar token:', error.message);
      userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'; // user_id real em caso de erro
      console.log('🚀 POLLING USER - Usando user_id real:', userId);
    }
    
    // Buscar userEmail do banco
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: config } = await supabase
      .from('email_processing_configs')
      .select('email_address')
      .eq('user_id', userId)
      .single();
    
    const userEmail = config?.email_address || null;
    console.log('🔍 POLLING USER - userEmail encontrado:', userEmail);
    
    // Criar EmailProcessor real
    const { EmailProcessor } = await import('./emailProcessor.js');
    emailProcessor = new EmailProcessor(userToken, process.env.VITE_GEMINI_API_KEY, userId, userEmail);
    
    // Criar EmailPollingService real
    const { EmailPollingService } = await import('./emailPollingService.js');
    pollingService = new EmailPollingService(
      userToken,
      process.env.VITE_GEMINI_API_KEY,
      userId, // Passar userId para o EmailPollingService
      userEmail, // Passar userEmail para o EmailPollingService
      {
        intervalMinutes: 0.5, // Verificar a cada 30 segundos
        maxRetries: 3,
        retryDelayMs: 5000
      }
    );
    
    await pollingService.start();
    
    const status = pollingService.getStatus();
    const stats = await pollingService.getStats();
    
    console.log('✅ POLLING USER - Sistema de polling iniciado');

    res.json({
      success: true,
      message: 'Sistema de polling iniciado com sucesso',
      isRunning: status.isRunning,
      lastCheckTime: status.lastCheckTime,
      processedCount: status.processedCount,
      config: status.config,
      stats
    });

  } catch (error) {
    console.error('❌ POLLING USER - Erro ao iniciar polling:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao iniciar sistema de polling',
      details: error.message
    });
  }
});

// PUT - Processar emails manualmente com token de usuário
app.put('/api/polling-user', async (req, res) => {
  try {
    console.log('🔄 POLLING USER - Processamento manual...');
    
    // Obter token do usuário do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de usuário não fornecido'
      });
    }

    const userToken = authHeader.substring(7);
    console.log('🔄 POLLING USER - Token de usuário recebido');
    
    // Extrair userId do token (mesmo código do POST)
    let userId = null;
    try {
      const tokenParts = userToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        userId = payload.sub;
        console.log('🔄 POLLING USER - UserId extraído do JWT:', userId);
      } else {
        console.log('⚠️ POLLING USER - Token não é um JWT, usando user_id real do banco');
        userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';
        console.log('🔄 POLLING USER - Usando user_id real:', userId);
      }
    } catch (error) {
      console.log('⚠️ POLLING USER - Erro ao processar token:', error.message);
      userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';
      console.log('🔄 POLLING USER - Usando user_id real:', userId);
    }
    
    // Criar EmailProcessor se não existir
    if (!emailProcessor) {
      // Buscar userEmail do banco
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      
      const { data: config } = await supabase
        .from('email_processing_configs')
        .select('email_address')
        .eq('user_id', userId)
        .single();
      
      const userEmail = config?.email_address || null;
      console.log('🔍 POLLING USER - userEmail encontrado:', userEmail);
      
      const { EmailProcessor } = await import('./emailProcessor.js');
      emailProcessor = new EmailProcessor(userToken, process.env.VITE_GEMINI_API_KEY, userId, userEmail);
    }
    
    // Processar emails reais
    console.log('🔄 POLLING USER - Iniciando processamento real de emails...');
    const processedEmails = await emailProcessor.processNewEmails();
    
    const stats = await emailProcessor.getEmailStats();
    
    console.log(`✅ POLLING USER - ${processedEmails.length} emails processados manualmente`);
    console.log('📊 POLLING USER - Estatísticas:', stats);

    res.json({
      success: true,
      message: 'Processamento manual concluído',
      processedCount: processedEmails.length,
      stats,
      emails: processedEmails
    });

  } catch (error) {
    console.error('❌ POLLING USER - Erro no processamento manual:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro no processamento manual',
      details: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor de API rodando na porta ${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   GET    http://localhost:${PORT}/api/polling-user`);
  console.log(`   POST   http://localhost:${PORT}/api/polling-user`);
  console.log(`   PUT    http://localhost:${PORT}/api/polling-user`);
  
  // Iniciar polling automaticamente
  await startAutomaticPolling();
});
