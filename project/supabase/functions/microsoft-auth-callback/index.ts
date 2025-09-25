import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Configuração do Microsoft OAuth
const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = 'common'; // FORÇAR TENANT COMMON para contas pessoais

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// URL base da aplicação
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface MicrosoftUserInfo {
  id: string;
  mail: string;
  userPrincipalName: string;
  displayName: string;
}

/**
 * Função para trocar authorization code por tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<MicrosoftTokenResponse> {
  try {
    console.log('🔄 Trocando authorization code por tokens...');
    console.log('🔍 DEBUG - Code:', code ? 'PRESENTE' : 'AUSENTE');
    console.log('🔍 DEBUG - RedirectUri:', redirectUri);
    console.log('🔍 DEBUG - MICROSOFT_TENANT_ID:', MICROSOFT_TENANT_ID);
    console.log('🔍 DEBUG - MICROSOFT_CLIENT_ID:', MICROSOFT_CLIENT_ID ? 'PRESENTE' : 'AUSENTE');
    console.log('🔍 DEBUG - MICROSOFT_CLIENT_SECRET:', MICROSOFT_CLIENT_SECRET ? 'PRESENTE' : 'AUSENTE');
    
    const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
    console.log('🔍 DEBUG - Token URL:', tokenUrl);
    
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
    });

    console.log('🔍 DEBUG - Fazendo requisição para Microsoft...');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    console.log('🔍 DEBUG - Resposta da Microsoft - Status:', response.status);
    console.log('🔍 DEBUG - Resposta da Microsoft - OK:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao trocar code por tokens:', errorData);
      console.error('❌ Status:', response.status);
      console.error('❌ StatusText:', response.statusText);
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokenData = await response.json();
    console.log('✅ Tokens obtidos com sucesso via BFF');
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type
    };
  } catch (error) {
    console.error('❌ Erro no exchange de tokens:', error);
    throw error;
  }
}

/**
 * Função para obter informações do usuário Microsoft
 */
async function getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  try {
    console.log('🔄 Obtendo informações do usuário...');
    
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get user info: ${errorData.error?.message || 'Unknown error'}`);
    }

    const userInfo = await response.json();
    console.log('✅ Informações do usuário obtidas');
    
    return {
      id: userInfo.id,
      mail: userInfo.mail || userInfo.userPrincipalName,
      userPrincipalName: userInfo.userPrincipalName,
      displayName: userInfo.displayName
    };
  } catch (error) {
    console.error('❌ Erro ao obter informações do usuário:', error);
    throw error;
  }
}

/**
 * Função para salvar tokens no banco de dados
 */
async function saveTokensToDatabase(
  userId: string, 
  email: string, 
  accessToken: string, 
  refreshToken: string, 
  expiresIn: number,
  userInfo: MicrosoftUserInfo
): Promise<void> {
  try {
    console.log('🔄 Salvando tokens no banco de dados...');
    
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
     // Primeiro, verificar se já existe uma configuração para este usuário e email
     const { data: existingConfig } = await supabase
       .from('email_configurations')
       .select('id')
       .eq('user_id', userId)
       .eq('provider_type', 'microsoft')
       .eq('email_address', email)
       .single();

     if (existingConfig) {
       // Atualizar configuração existente
       const { error } = await supabase
         .from('email_configurations')
         .update({
           oauth_access_token: accessToken,
           oauth_refresh_token: refreshToken,
           oauth_token_expires_at: expiresAt.toISOString(),
           microsoft_account_id: userInfo.id, // Campo obrigatório para Microsoft
           is_active: true,
           sync_enabled: true,
           sync_interval_minutes: 3,
           updated_at: new Date().toISOString()
         })
         .eq('id', existingConfig.id);

       if (error) {
         console.error('❌ Erro ao atualizar tokens:', error);
         throw new Error(`Failed to update tokens: ${error.message}`);
       }
     } else {
       // Inserir nova configuração
       const { error } = await supabase
         .from('email_configurations')
         .insert({
           user_id: userId,
           name: 'Microsoft Account',
           email_address: email,
           provider_type: 'microsoft',
           oauth_access_token: accessToken,
           oauth_refresh_token: refreshToken,
           oauth_token_expires_at: expiresAt.toISOString(),
           microsoft_account_id: userInfo.id, // Campo obrigatório para Microsoft
           is_active: true,
           sync_enabled: true,
           sync_interval_minutes: 3
         });

       if (error) {
         console.error('❌ Erro ao inserir tokens:', error);
         throw new Error(`Failed to insert tokens: ${error.message}`);
       }
     }

    console.log('✅ Tokens salvos com sucesso no banco de dados');
  } catch (error) {
    console.error('❌ Erro ao salvar tokens no banco:', error);
    throw error;
  }
}

/**
 * Função principal da Edge Function
 */
Deno.serve(async (req: Request) => {
  try {
    console.log('🚀 Microsoft Auth Callback iniciado');
    console.log('🔍 DEBUG - URL:', req.url);
    console.log('🔍 DEBUG - Method:', req.method);
    console.log('🔍 DEBUG - Headers:', Object.fromEntries(req.headers.entries()));
    
    // Verificar método HTTP
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
        }
      });
    }
    
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Extrair parâmetros da URL
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    
    console.log('🔍 DEBUG - Parâmetros recebidos:', {
      code: code ? 'PRESENTE' : 'AUSENTE',
      state: state ? 'PRESENTE' : 'AUSENTE',
      error: error || 'NENHUM',
      errorDescription: errorDescription || 'NENHUMA'
    });
    
    console.log('🔍 DEBUG - Variáveis de ambiente:', {
      MICROSOFT_CLIENT_ID: MICROSOFT_CLIENT_ID ? 'PRESENTE' : 'AUSENTE',
      MICROSOFT_CLIENT_SECRET: MICROSOFT_CLIENT_SECRET ? 'PRESENTE' : 'AUSENTE',
      MICROSOFT_TENANT_ID: MICROSOFT_TENANT_ID,
      supabaseUrl: supabaseUrl ? 'PRESENTE' : 'AUSENTE',
      supabaseServiceKey: supabaseServiceKey ? 'PRESENTE' : 'AUSENTE'
    });

    // Verificar se há erro na autorização
    if (error) {
      console.error('❌ Erro na autorização:', error, errorDescription);
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Erro de Autorização</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>❌ Erro de Autorização</h1>
          <p><strong>Erro:</strong> ${error}</p>
          <p><strong>Descrição:</strong> ${errorDescription || 'Nenhuma descrição disponível'}</p>
          <p><a href="${APP_BASE_URL}/email-management">← Voltar para Gerenciamento de Email</a></p>
        </body>
        </html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }

    // Verificar se o code foi fornecido
    if (!code) {
      console.error('❌ Authorization code não fornecido');
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Erro de Configuração</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>❌ Erro de Configuração</h1>
          <p>Authorization code não foi fornecido pela Microsoft.</p>
          <p><a href="${APP_BASE_URL}/email-management">← Voltar para Gerenciamento de Email</a></p>
        </body>
        </html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }

     // Construir redirect URI (deve corresponder ao configurado no Azure)
     const redirectUri = `http://localhost:5173/microsoft-email`;

    // Trocar code por tokens
    console.log('🔄 Tentando trocar código por tokens...');
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, redirectUri);
      console.log('✅ Tokens obtidos com sucesso');
    } catch (error) {
      console.error('❌ ERRO ao trocar código por tokens:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw new Error(`Erro ao trocar código por tokens: ${error.message}`);
    }

    // Obter informações do usuário
    console.log('🔄 Tentando obter informações do usuário...');
    let userInfo;
    try {
      userInfo = await getUserInfo(tokens.access_token);
      console.log('✅ Informações do usuário obtidas com sucesso');
    } catch (error) {
      console.error('❌ ERRO ao obter informações do usuário:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw new Error(`Erro ao obter informações do usuário: ${error.message}`);
    }

    // Obter userId do header de autorização ou usar fixo para teste
    const authHeader = req.headers.get('Authorization');
    let userId = '5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27'; // User ID padrão para teste
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // Tentar extrair userId do token (implementação simples)
        // Por enquanto, usar o userId fixo
        console.log('🔍 DEBUG - Header de autorização presente, mas usando userId fixo');
      } catch (error) {
        console.log('⚠️ Erro ao processar header de autorização, usando userId fixo');
      }
    }
    
    console.log('🔍 DEBUG - Usando userId:', userId);

    // Salvar tokens no banco de dados
    console.log('🔄 Tentando salvar tokens no banco de dados...');
    try {
      await saveTokensToDatabase(
        userId,
        userInfo.mail,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in,
        userInfo
      );
      console.log('✅ Tokens salvos no banco de dados com sucesso');
    } catch (error) {
      console.error('❌ ERRO ao salvar tokens no banco de dados:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw new Error(`Erro ao salvar tokens no banco de dados: ${error.message}`);
    }

     // Retornar JSON de sucesso
     return new Response(
       JSON.stringify({
         success: true,
         email: userInfo.mail,
         displayName: userInfo.displayName,
         hasRefreshToken: !!tokens.refresh_token,
         expiresIn: tokens.expires_in,
         message: 'Conta Microsoft conectada com sucesso!'
       }),
       { 
         status: 200,
         headers: { 
           'Content-Type': 'application/json',
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
         }
       }
     );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
       { 
         status: 500,
         headers: { 
           'Content-Type': 'application/json',
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
         }
       }
     );
  }
});
