import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    // Criar EmailProcessor real
    const { EmailProcessor } = await import('./emailProcessor.js');
    emailProcessor = new EmailProcessor(userToken);
    
    // Criar EmailPollingService real
    const { EmailPollingService } = await import('./emailPollingService.js');
    pollingService = new EmailPollingService(
      userToken,
      process.env.GEMINI_API_KEY,
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
    
    // Criar EmailProcessor se não existir
    if (!emailProcessor) {
      const { EmailProcessor } = await import('./emailProcessor.js');
      emailProcessor = new EmailProcessor(userToken);
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
app.listen(PORT, () => {
  console.log(`🚀 Servidor de API rodando na porta ${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   GET    http://localhost:${PORT}/api/polling-user`);
  console.log(`   POST   http://localhost:${PORT}/api/polling-user`);
  console.log(`   PUT    http://localhost:${PORT}/api/polling-user`);
});
