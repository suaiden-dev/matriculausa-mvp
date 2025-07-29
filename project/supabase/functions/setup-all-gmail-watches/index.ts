import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req) => {
  console.log('🔧 setup-all-gmail-watches: ===== FUNCTION CALLED =====')
  console.log('🔧 Headers recebidos:', Object.fromEntries(req.headers.entries()))
  console.log('🔧 Método HTTP:', req.method)
  console.log('🔧 URL:', req.url)
  
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('🔧 Requisição OPTIONS detectada, retornando CORS headers')
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      console.log('❌ Método não permitido:', req.method)
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('🔧 Processando requisição POST...')
    
    // ✅ Validar corretamente o header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Authorization header ausente!');
      return new Response(JSON.stringify({ error: 'Authorization header ausente!' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    console.log('🔧 Token extraído (primeiros 20 chars):', token.substring(0, 20) + '...');

    // Initialize Supabase client with service role key (not user token)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Usando Service Role Key para acessar dados');

    // Get all Gmail connections from all users
    console.log('🔧 Buscando todas as conexões Gmail...');
    const { data: connections, error: connectionsError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('provider', 'google')
      .order('created_at', { ascending: false });

    if (connectionsError) {
      console.error('❌ Erro ao buscar conexões:', connectionsError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar conexões' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔧 Encontradas ${connections?.length || 0} conexões Gmail`);

    if (!connections || connections.length === 0) {
      console.log('🔧 Nenhuma conexão Gmail encontrada');
      return new Response(JSON.stringify({ message: 'Nenhuma conexão Gmail encontrada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Filtrar apenas o registro mais recente de cada email
    const uniqueConnections: any[] = [];
    const seenEmails = new Set<string>();
    
    for (const connection of connections) {
      if (!seenEmails.has(connection.email)) {
        seenEmails.add(connection.email);
        uniqueConnections.push(connection);
        console.log(`✅ Usando conexão mais recente para: ${connection.email} (criada em: ${connection.created_at})`);
      } else {
        console.log(`⚠️ Ignorando conexão duplicada para: ${connection.email} (criada em: ${connection.created_at})`);
      }
    }

    console.log(`🔧 Após filtro de duplicatas: ${uniqueConnections.length} conexões únicas`);

    const results = []
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID') || 'matriculausa'

    // Setup watch for each connection
    for (const connection of uniqueConnections) {
      try {
        console.log(`🔧 Configurando watch para: ${connection.email}`)

        // ✅ Verificar se access_token existe e não é null
        if (!connection.access_token) {
          console.error(`❌ Access token ausente para ${connection.email}`);
          results.push({
            email: connection.email,
            success: false,
            error: 'Access token ausente'
          });
          continue;
        }

        // ✅ Verificar se refresh_token existe e não é null
        if (!connection.refresh_token) {
          console.error(`❌ Refresh token ausente para ${connection.email}`);
          results.push({
            email: connection.email,
            success: false,
            error: 'Refresh token ausente'
          });
          continue;
        }

        // ✅ Usar tokens diretamente da tabela
        const tokens = {
          access_token: connection.access_token,
          refresh_token: connection.refresh_token,
          expires_in: connection.expires_at ? Math.floor((new Date(connection.expires_at).getTime() - Date.now()) / 1000) : 3600
        }
        
        console.log('🔐 Tokens obtidos da tabela:', {
          access_token: tokens.access_token.substring(0, 20) + '...',
          refresh_token: tokens.refresh_token.substring(0, 20) + '...',
          expires_in: tokens.expires_in
        });
        
        // ✅ Verificar se o access token ainda é válido antes de tentar renovar
        let refreshedTokens = tokens;
        
        if (tokens.expires_in <= 300) { // Se expira em menos de 5 minutos
          console.log('🔄 Token expira em breve, tentando renovar...');
          try {
            refreshedTokens = await refreshAccessToken(tokens);
          } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            // Tentar usar o token atual mesmo assim
            console.log('⚠️ Tentando usar token atual mesmo com erro de renovação...');
            refreshedTokens = tokens;
          }
        } else {
          console.log('✅ Token ainda é válido, não precisa renovar');
        }
        
        // Setup Gmail watch
        const watchResult = await setupGmailWatch(refreshedTokens.access_token, connection.email, projectId)
        
        if (watchResult.success) {
          console.log(`✅ Watch configurado com sucesso para: ${connection.email}`)
          
          // ✅ Atualizar tokens na tabela email_connections
          const { error: updateError } = await supabase
            .from('email_connections')
            .update({
              access_token: refreshedTokens.access_token,
              expires_at: new Date(Date.now() + (refreshedTokens.expires_in * 1000)).toISOString()
            })
            .eq('id', connection.id)

          if (updateError) {
            console.error(`⚠️ Erro ao atualizar tokens para ${connection.email}:`, updateError)
          } else {
            console.log(`✅ Tokens atualizados para ${connection.email}`)
          }

          results.push({
            email: connection.email,
            success: true,
            watchId: watchResult.watchId,
            expiration: watchResult.expiration
          })
        } else {
          console.error(`❌ Erro ao configurar watch para ${connection.email}:`, watchResult.error)
          results.push({
            email: connection.email,
            success: false,
            error: watchResult.error
          })
        }

      } catch (error) {
        console.error(`❌ Erro geral para ${connection.email}:`, error)
        results.push({
          email: connection.email,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    // ✅ Log resumo final detalhado
    console.log(`✅ Configuração concluída: ${successCount} sucessos, ${errorCount} erros`)
    console.log('📊 Resumo detalhado:', {
      total: connections.length,
      successful: successCount,
      failed: errorCount,
      results: results
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Gmail watches configured: ${successCount} successful, ${errorCount} failed`,
      results: results,
      summary: {
        total: connections.length,
        successful: successCount,
        failed: errorCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Refresh Gmail access token
 */
async function refreshAccessToken(tokens: any) {
  try {
    console.log('🔄 Renovando access token...');
    console.log('🔐 Refresh token (primeiros 20 chars):', tokens.refresh_token.substring(0, 20) + '...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na resposta do Google OAuth: ${response.status} - ${errorText}`);
      
      // Se o refresh token falhou, tentar usar o access token atual
      if (response.status === 400) {
        console.log('⚠️ Refresh token falhou, tentando usar access token atual...');
        
        // Testar se o access token atual ainda é válido
        const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        });
        
        if (testResponse.ok) {
          console.log('✅ Access token atual ainda é válido, usando ele...');
          return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            token_type: 'Bearer'
          };
        } else {
          console.error('❌ Access token atual também é inválido');
          throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
        }
      }
      
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const newTokens = await response.json()
    console.log('✅ Access token renovado com sucesso');
    return {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token, // Keep the original refresh token
      expires_in: newTokens.expires_in,
      token_type: newTokens.token_type
    }
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error)
    throw error
  }
}

/**
 * Stop existing Gmail watch
 */
async function stopGmailWatch(accessToken: string, email: string) {
  try {
    console.log(`🛑 Parando watch existente para: ${email}`);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/stop', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ Erro ao parar watch (pode não existir): ${response.status} - ${errorText}`);
      return { success: true, message: 'No existing watch to stop' };
    }

    console.log(`✅ Watch parado com sucesso para: ${email}`);
    return { success: true, message: 'Watch stopped successfully' };

  } catch (error) {
    console.error(`❌ Erro ao parar watch para ${email}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup Gmail watch for push notifications
 */
async function setupGmailWatch(accessToken: string, email: string, projectId: string) {
  try {
    const topicName = `projects/${projectId}/topics/gmail-notifications`
    
    console.log(`🔧 Configurando watch para: ${email}`)
    console.log(`🔧 Tópico Pub/Sub: ${topicName}`)

    // ✅ Primeiro parar qualquer watch existente
    await stopGmailWatch(accessToken, email);

    // Aguardar um pouco para garantir que o stop foi processado
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName: topicName,
        labelIds: ['INBOX', 'UNREAD'],
        labelFilterAction: 'include'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro na resposta do Gmail para ${email}:`, response.status, errorText)
      return { success: false, error: `Gmail API error: ${response.status} - ${errorText}` }
    }

    const result = await response.json()
    console.log(`✅ Watch configurado para ${email}:`, result)

    return {
      success: true,
      watchId: result.historyId,
      expiration: new Date(Date.now() + (result.expiration * 1000)).toISOString()
    }

  } catch (error) {
    console.error(`❌ Erro ao configurar watch para ${email}:`, error)
    return { success: false, error: error.message }
  }
} 