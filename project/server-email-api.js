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
    
    // Usar token fixo para o usuário principal
    const userToken = 'EwB4BMl6BAAUBKgm8k1UswUNwklmy2v7U/S+1fEAARv08Ad07PsKF/6ArEdfvm1I1sQXT9FyXZE3QzKOOvyVLafl75iCphi/25Z8lrUBbVSbRaQAYmjMZfQuxFNNM2m9U0+2Dyb6IClV4uqACXoPLq69T8DUj8HugEl1vO+glRYcxZ2/TCWQpAVtNLxeL1gQEVPApiLp+Ej4ItiqJClnY2EjkuWYeDDc4cRTjT13YZZnBWML1ZocVt2wB/TkmmoLAGZ7v/sg0rl8YmFioMfQ8nIuNSazbt+sJMhiZtqvFhFcn6k5Xsaw/v0+SuNIKkGPE2+7ZXbXVQN3fukbqdli0o3tCaZ9eW9kSCMM5ZdycZw/GFTjys1OSttLGBcx9CMQZgAAEFCAb8ANYrCVJXQyl/1vIKVAA4sLccrDq/ym6FFdDksbOtargL/ugNUbrt7AlAZTSgmwuEmrWwNOsOCbVKltoEvgRxC/oCsk8qC+UrJnM9Sc/kszH3Qv19cl+sst6Tys6WXSA8ZnlJ8CDgDkNBfGN2lTq7UMI1guuAZAGBkM0KbyT4o/x+sj30YixO3tuGwt7aYoNyuUiaZFhQ1ZCIMPoKZ65nKnJOKjXKpsfu06Vi9bzS02bWvMEXBWhKQYgesKXBL1n/c/iz64SFuLjm3a5xteuNJauY997Lzp5O9tCOt/O05gDdkhfjegLRxxLnAB4mEfS6xkkctRJ/tqUWoNH2eewzSvwG5ukwxi7ZD+MU9oK9JbhvimKyfOvfT1N3hiKqmisJF1Vr+ff4WH02HbNX4n43fyCdOaZNqEgGkUo00X1rVu9wOnkLba7RL2a8t+ZqPf2dF3bwfZtuF1QBAsF5fBhSG/IeC6B8NI1eqyP2ARud1rl6N5DuuOZxcPb55+b3LoQoQImYhi1JMKmK+0uLp466tyMkw6DgB8zD16qEguydBtyvwIKkU+IY+jOawJtUwWxNvb9gj9K5RTdd8qe9CJqW4qDcZze2ob1I35jJWdC0TuFSroFC9Xv6XGBsJHK0001L2hU011KFI6sFJFq1TW4tdvrAt1LgSkOwd2idRhVAEEOOH7f4tp/cxDJ35HoYOWxEvPUQzP31Qw0oCf1hQ5Vm6tXGNIq0j+FnC9hM6XOq6iiHAC1mCXAN2MTWYi5Fbg0qAFCIb1x4mPjI/CFaQFCxVO0qI0IaZqHJhUp+w73mTNou0tKI1zJr5jiJMJb8jPzCK4FLbCk/hDTY2wf8KfPDoY9WGWgxyVNpB0H4qDOcPp8qAdFwGVKI4WEbE6F9e5fCaT2442DO2NmIaXh7wefbYFgJ3wYY/H5dqmeZ4tonxSMRJHzIZctFsSMfiEO7h528w/yVnhExWAkhxrPddYxoxU6QhUvo4P2VQsw7TY7H3tzNFMuHMAK4mCv+ouVrmVgMZ/Vfk/HJlX7et3R/NfKSXJ55LKtsOYKSCs0GZ/Rxq43aBflvY0W2R5kQmaiXXJIu6Hwzzbs1nTR4Cyb7Z3WA4kvsgL77hwaERrN0hjdRNiAw==';
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
    emailProcessor = new EmailProcessor(userToken, process.env.GEMINI_API_KEY, userId, userEmail);
    
    // Criar EmailPollingService
    const { EmailPollingService } = await import('./emailPollingService.js');
    pollingService = new EmailPollingService(
      userToken,
      process.env.GEMINI_API_KEY,
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
    emailProcessor = new EmailProcessor(userToken, process.env.GEMINI_API_KEY, userId, userEmail);
    
    // Criar EmailPollingService real
    const { EmailPollingService } = await import('./emailPollingService.js');
    pollingService = new EmailPollingService(
      userToken,
      process.env.GEMINI_API_KEY,
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
      emailProcessor = new EmailProcessor(userToken, process.env.GEMINI_API_KEY, userId, userEmail);
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
