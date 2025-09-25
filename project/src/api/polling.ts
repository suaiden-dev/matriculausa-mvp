import EmailProcessor from '../lib/emailProcessor';
import EmailPollingService from '../lib/emailPollingService';
import ImprovedTokenRenewalService from '../lib/improvedTokenRenewal';

// Instância global do serviço de polling
let pollingService: EmailPollingService | null = null;

// Provider de autenticação para polling
class PollingAuthProvider {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getAccessToken(): Promise<string> {
    // Se já temos um token válido, retornar ele
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Usar o novo serviço de renovação de tokens
    try {
      const renewalService = ImprovedTokenRenewalService.getInstance();
      // Aqui você precisaria passar o userId e email do usuário atual
      // Por enquanto, vamos usar um fallback
      throw new Error('Token expirado. Faça login novamente para renovar o token.');
    } catch (error) {
      throw new Error('Token expirado. Faça login novamente para renovar o token.');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Erro ao obter token: ${data.error_description || data.error}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
      
      console.log('✅ POLLING - Token de acesso obtido com sucesso');
      return this.accessToken;

    } catch (error) {
      console.error('❌ POLLING - Erro ao obter token de acesso:', error);
      throw error;
    }
  }
}

// Inicializar serviço de polling
async function initializePollingService(): Promise<EmailPollingService> {
  if (!pollingService) {
    console.log('🔧 POLLING - Inicializando serviço de polling...');
    
    try {
      const authProvider = new PollingAuthProvider();
      const accessToken = await authProvider.getAccessToken();
      
        pollingService = new EmailPollingService(
          accessToken,
          import.meta.env.VITE_GEMINI_API_KEY,
          {
            intervalMinutes: 5, // 🚨 MODO CONSERVADOR: Verificar a cada 5 minutos (era 2)
            maxRetries: 3,
            retryDelayMs: 5000
          }
        );
      
      console.log('✅ POLLING - Serviço de polling inicializado');
    } catch (error) {
      console.error('❌ POLLING - Erro ao inicializar serviço:', error);
      throw error;
    }
  }
  
  return pollingService;
}

// GET - Verificar status do polling
export async function handlePollingStatusRequest(): Promise<Response> {
  try {
    console.log('🔍 POLLING - Verificando status...');
    
    if (!pollingService) {
      return new Response(JSON.stringify({
        success: true,
        isRunning: false,
        message: 'Sistema de polling não iniciado',
        lastCheckTime: null,
        processedCount: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const status = pollingService.getStatus();
    const stats = await pollingService.getStats();
    
    console.log('🔍 POLLING - Status:', status);

    return new Response(JSON.stringify({
      success: true,
      isRunning: status.isRunning,
      lastCheckTime: status.lastCheckTime,
      processedCount: status.processedCount,
      config: status.config,
      stats,
      message: status.isRunning 
        ? `Sistema ativo - ${status.processedCount} emails processados`
        : 'Sistema parado'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POLLING - Erro ao verificar status:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro ao verificar status do polling',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Iniciar polling
export async function handlePollingStartRequest(): Promise<Response> {
  try {
    console.log('🚀 POLLING - Iniciando sistema de polling...');
    
    const service = await initializePollingService();
    await service.start();
    
    const status = service.getStatus();
    const stats = await service.getStats();
    
    console.log('✅ POLLING - Sistema de polling iniciado');

    return new Response(JSON.stringify({
      success: true,
      message: 'Sistema de polling iniciado com sucesso',
      isRunning: status.isRunning,
      lastCheckTime: status.lastCheckTime,
      processedCount: status.processedCount,
      config: status.config,
      stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POLLING - Erro ao iniciar polling:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro ao iniciar sistema de polling',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE - Parar polling
export async function handlePollingStopRequest(): Promise<Response> {
  try {
    console.log('⏹️ POLLING - Parando sistema de polling...');
    
    if (!pollingService) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Sistema de polling já estava parado'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await pollingService.stop();
    
    console.log('✅ POLLING - Sistema de polling parado');

    return new Response(JSON.stringify({
      success: true,
      message: 'Sistema de polling parado com sucesso',
      isRunning: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POLLING - Erro ao parar polling:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro ao parar sistema de polling',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT - Processar emails manualmente
export async function handlePollingProcessRequest(): Promise<Response> {
  try {
    console.log('🔄 POLLING - Processamento manual...');
    
    const service = await initializePollingService();
    const processedEmails = await service.processNewEmails();
    const stats = await service.getStats();
    
    console.log(`✅ POLLING - ${processedEmails.length} emails processados manualmente`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Processamento manual concluído',
      processedCount: processedEmails.length,
      stats,
      emails: processedEmails.slice(0, 5) // Apenas os primeiros 5 para debug
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POLLING - Erro no processamento manual:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro no processamento manual',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Rotas para usuários logados (com token do usuário)
export async function handlePollingUserRequest(request: Request): Promise<Response> {
  const method = request.method;
  
  try {
    console.log(`🔍 POLLING USER - ${method} request`);
    
    // Obter token do usuário do header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token de usuário não fornecido'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userToken = authHeader.substring(7);
    console.log('🔍 POLLING USER - Token de usuário recebido');
    
    if (method === 'GET') {
      // Verificar status
      return new Response(JSON.stringify({
        success: true,
        isRunning: false,
        message: 'Sistema de polling não iniciado',
        lastCheckTime: null,
        processedCount: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      // Iniciar polling com token de usuário
      const processor = new EmailProcessor(userToken, import.meta.env.VITE_GEMINI_API_KEY);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Sistema de polling iniciado com sucesso',
        isRunning: true,
        lastCheckTime: new Date(),
        processedCount: 0,
        config: {
          intervalMinutes: 5, // 🚨 MODO CONSERVADOR: Verificar a cada 5 minutos (era 2)
          maxRetries: 3,
          retryDelayMs: 5000
        },
        stats: {
          total: 0,
          processed: 0,
          errors: 0,
          replied: 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'PUT') {
      // Processar emails manualmente com token de usuário
      const processor = new EmailProcessor(userToken, import.meta.env.VITE_GEMINI_API_KEY);
      const processedEmails = await processor.processNewEmails();
      const stats = await processor.getEmailStats();
      
      console.log(`✅ POLLING USER - ${processedEmails.length} emails processados manualmente`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Processamento manual concluído',
        processedCount: processedEmails.length,
        stats,
        emails: processedEmails.slice(0, 5) // Apenas os primeiros 5 para debug
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ POLLING USER - Erro:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro no processamento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
