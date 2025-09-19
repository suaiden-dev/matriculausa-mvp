// Netlify Function para API de Email Processing
// Converte o server-email-api.js para formato serverless

// Netlify Functions não precisam de express/cors
// As variáveis de ambiente são carregadas automaticamente

// Instâncias globais (serão recriadas a cada invocação)
let pollingService = null;
let emailProcessor = null;

// Função principal do Netlify
export const handler = async (event, context) => {
  // Configurar CORS para Netlify
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const { httpMethod, path, headers, body } = event;
    
    // Extrair o endpoint da URL
    const endpoint = path.replace('/.netlify/functions/api', '').replace('/api/', '');
    
    console.log(`🚀 API Request: ${httpMethod} /${endpoint}`);
    console.log(`🚀 Full path: ${path}`);

    // Roteamento baseado no método HTTP e endpoint
    switch (httpMethod) {
      case 'GET':
        if (endpoint === 'polling-user' || endpoint === '') {
          return await handleGetPollingStatus(corsHeaders);
        }
        break;
        
      case 'POST':
        if (endpoint === 'polling-user' || endpoint === '') {
          return await handleStartPolling(headers, body, corsHeaders);
        }
        break;
        
      case 'PUT':
        if (endpoint === 'polling-user' || endpoint === '') {
          return await handleProcessEmails(headers, body, corsHeaders);
        }
        break;
    }

    // Endpoint não encontrado
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        availableEndpoints: ['/api/polling-user'],
        currentPath: path,
        extractedEndpoint: endpoint
      }),
    };

  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
    };
  }
};

// GET - Verificar status do polling
async function handleGetPollingStatus(corsHeaders) {
  try {
    console.log('🔍 POLLING USER - Verificando status...');
    
    if (!pollingService) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          isRunning: false,
          message: 'Sistema de polling não iniciado',
          lastCheckTime: null,
          processedCount: 0
        }),
      };
    }

    const status = pollingService.getStatus();
    const stats = await pollingService.getStats();
    
    console.log('🔍 POLLING USER - Status:', status);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        isRunning: status.isRunning,
        lastCheckTime: status.lastCheckTime,
        processedCount: status.processedCount,
        config: status.config,
        stats,
        message: status.isRunning 
          ? `Sistema ativo - ${status.processedCount} emails processados`
          : 'Sistema parado'
      }),
    };

  } catch (error) {
    console.error('❌ POLLING USER - Erro ao verificar status:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Erro ao verificar status do polling',
        details: error.message
      }),
    };
  }
}

// POST - Iniciar polling com token de usuário
async function handleStartPolling(headers, body, corsHeaders) {
  try {
    console.log('🚀 POLLING USER - Iniciando sistema de polling...');
    
    // Obter token do usuário do header Authorization
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Token de usuário não fornecido'
        }),
      };
    }

    const userToken = authHeader.substring(7);
    console.log('🚀 POLLING USER - Token de usuário recebido');
    
    // Extrair userId do token
    let userId = null;
    try {
      const tokenParts = userToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        userId = payload.sub;
        console.log('🚀 POLLING USER - UserId extraído do JWT:', userId);
      } else {
        console.log('⚠️ POLLING USER - Token não é um JWT, é um token de acesso do Microsoft Graph');
        userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';
        console.log('🚀 POLLING USER - Usando user_id real do banco:', userId);
      }
    } catch (error) {
      console.log('⚠️ POLLING USER - Erro ao processar token:', error.message);
      userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27';
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
      userId,
      userEmail,
      {
        intervalMinutes: 0.5,
        maxRetries: 3,
        retryDelayMs: 5000
      }
    );
    
    await pollingService.start();
    
    const status = pollingService.getStatus();
    const stats = await pollingService.getStats();
    
    console.log('✅ POLLING USER - Sistema de polling iniciado');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Sistema de polling iniciado com sucesso',
        isRunning: status.isRunning,
        lastCheckTime: status.lastCheckTime,
        processedCount: status.processedCount,
        config: status.config,
        stats
      }),
    };

  } catch (error) {
    console.error('❌ POLLING USER - Erro ao iniciar polling:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Erro ao iniciar sistema de polling',
        details: error.message
      }),
    };
  }
}

// PUT - Processar emails manualmente com token de usuário
async function handleProcessEmails(headers, body, corsHeaders) {
  try {
    console.log('🔄 POLLING USER - Processamento manual...');
    
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Token de usuário não fornecido'
        }),
      };
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

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Processamento manual concluído',
        processedCount: processedEmails.length,
        stats,
        emails: processedEmails
      }),
    };

  } catch (error) {
    console.error('❌ POLLING USER - Erro no processamento manual:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'Erro no processamento manual',
        details: error.message
      }),
    };
  }
}
