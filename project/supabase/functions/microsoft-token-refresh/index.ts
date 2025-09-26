import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração do Microsoft
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');

interface TokenRefreshResult {
  success: boolean;
  message: string;
  email?: string;
  userId?: string;
}

/**
 * Renovar token Microsoft usando refresh token
 */
async function refreshMicrosoftToken(
  userId: string, 
  email: string, 
  refreshToken: string
): Promise<TokenRefreshResult> {
  try {
    console.log(`🔄 Renovando token para ${email}...`);
    
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Erro ao renovar token para ${email}:`, errorData);
      return {
        success: false,
        message: `Erro ao renovar token: ${errorData.error_description || errorData.error}`,
        email,
        userId
      };
    }

    const tokenData = await response.json();
    console.log(`✅ Token renovado com sucesso para ${email}`);

    // Atualizar tokens no banco de dados
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    console.log(`🔄 Atualizando tokens no banco para ${email}...`);
    console.log(`📊 Dados a serem salvos:`, {
      oauth_access_token: tokenData.access_token ? 'PRESENTE' : 'AUSENTE',
      oauth_refresh_token: tokenData.refresh_token ? 'PRESENTE' : 'AUSENTE',
      oauth_token_expires_at: expiresAt.toISOString(),
      is_active: true,
      updated_at: new Date().toISOString()
    });

    const { error: updateError } = await supabase
      .from('email_configurations')
      .update({
        oauth_access_token: tokenData.access_token,
        oauth_refresh_token: tokenData.refresh_token || refreshToken,
        oauth_token_expires_at: expiresAt.toISOString(),
        is_active: true, // MANTER CONTA ATIVA APÓS RENOVAÇÃO
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('email_address', email)
      .eq('provider_type', 'microsoft');

    if (updateError) {
      console.error(`❌ Erro ao atualizar tokens no banco para ${email}:`, updateError);
      return {
        success: false,
        message: `Token renovado mas erro ao salvar no banco: ${updateError.message}`,
        email,
        userId
      };
    }

    console.log(`✅ Tokens atualizados com sucesso para ${email}`);
    console.log(`✅ Conta mantida ATIVA após renovação`);

    return {
      success: true,
      message: `Token renovado com sucesso para ${email}`,
      email,
      userId
    };

  } catch (error) {
    console.error(`❌ Erro inesperado ao renovar token para ${email}:`, error);
    return {
      success: false,
      message: `Erro inesperado: ${error.message}`,
      email,
      userId
    };
  }
}

/**
 * Marcar conta como desconectada quando refresh falha
 */
async function markAccountAsDisconnected(userId: string, email: string): Promise<void> {
  try {
    console.log(`⚠️ Marcando conta ${email} como desconectada...`);
    
    const { error } = await supabase
      .from('email_configurations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('email_address', email)
      .eq('provider_type', 'microsoft');

    if (error) {
      console.error(`❌ Erro ao marcar conta como desconectada:`, error);
    } else {
      console.log(`✅ Conta ${email} marcada como desconectada`);
    }
  } catch (error) {
    console.error(`❌ Erro ao marcar conta como desconectada:`, error);
  }
}

/**
 * Verificar se token está próximo do vencimento (30 minutos)
 */
function isTokenNearExpiry(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const timeUntilExpiry = expiryDate.getTime() - now.getTime();
  
  // Considerar próximo do vencimento se restam menos de 30 minutos
  return timeUntilExpiry < 30 * 60 * 1000;
}

/**
 * Processar refresh de tokens para todas as conexões Microsoft ativas
 */
async function processTokenRefresh(): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  results: TokenRefreshResult[];
}> {
  console.log('🔄 Iniciando processo de refresh de tokens Microsoft...');
  
  try {
    // Buscar todas as conexões Microsoft ativas
    const { data: connections, error: fetchError } = await supabase
      .from('email_configurations')
      .select('user_id, email_address, oauth_access_token, oauth_refresh_token, oauth_token_expires_at')
      .eq('provider_type', 'microsoft')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Erro ao buscar conexões Microsoft:', fetchError);
      throw new Error(`Erro ao buscar conexões: ${fetchError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('ℹ️ Nenhuma conexão Microsoft ativa encontrada');
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    console.log(`📧 Encontradas ${connections.length} conexões Microsoft ativas`);

    const results: TokenRefreshResult[] = [];
    let successful = 0;
    let failed = 0;

    // Processar cada conexão
    for (const connection of connections) {
      const { user_id, email_address, oauth_refresh_token, oauth_token_expires_at } = connection;
      
      console.log(`\n🔍 Processando ${email_address}...`);
      
      // Verificar se tem refresh token
      if (!oauth_refresh_token || oauth_refresh_token.trim() === '') {
        console.log(`⚠️ ${email_address} não possui refresh token válido`);
        results.push({
          success: false,
          message: 'Refresh token vazio ou inválido',
          email: email_address,
          userId: user_id
        });
        failed++;
        continue;
      }

      // Verificar se token está próximo do vencimento (sempre renovar para garantir)
      const now = new Date();
      const tokenExpiry = new Date(oauth_token_expires_at);
      const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
      
      if (timeUntilExpiry > 30 * 60 * 1000) { // Mais de 30 minutos restantes
        console.log(`✅ ${email_address} - Token ainda válido por mais tempo (${Math.round(timeUntilExpiry / 60000)} minutos)`);
        results.push({
          success: true,
          message: 'Token ainda válido',
          email: email_address,
          userId: user_id
        });
        successful++;
        continue;
      }

      // Tentar renovar token
      const refreshResult = await refreshMicrosoftToken(
        user_id,
        email_address,
        oauth_refresh_token
      );

      results.push(refreshResult);

      if (refreshResult.success) {
        successful++;
        console.log(`✅ ${email_address} - Token renovado com sucesso`);
      } else {
        failed++;
        console.log(`❌ ${email_address} - Falha ao renovar token: ${refreshResult.message}`);
        
        // Se falhou, marcar conta como desconectada
        await markAccountAsDisconnected(user_id, email_address);
      }

      // Pequena pausa entre requisições para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Resumo do refresh de tokens:`);
    console.log(`   Total processadas: ${connections.length}`);
    console.log(`   Sucessos: ${successful}`);
    console.log(`   Falhas: ${failed}`);

    return {
      totalProcessed: connections.length,
      successful,
      failed,
      results
    };

  } catch (error) {
    console.error('❌ Erro no processo de refresh de tokens:', error);
    throw error;
  }
}

/**
 * Handler principal da Edge Function
 */
Deno.serve(async (req) => {
  console.log('🔄 microsoft-token-refresh: ===== FUNCTION CALLED =====');
  
  try {
    // Verificar se é uma requisição de teste ou cron
    const url = new URL(req.url);
    const isTest = url.searchParams.get('test') === 'true';
    
    if (isTest) {
      console.log('🧪 Modo de teste ativado');
    }

    // Processar refresh de tokens
    const result = await processTokenRefresh();

    const response = {
      success: true,
      message: 'Processo de refresh de tokens concluído',
      timestamp: new Date().toISOString(),
      ...result
    };

    console.log('✅ microsoft-token-refresh: Processo concluído com sucesso');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });

  } catch (error) {
    console.error('❌ microsoft-token-refresh: Erro na função:', error);
    
    const errorResponse = {
      success: false,
      message: 'Erro no processo de refresh de tokens',
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
}, { verify_jwt: false });
