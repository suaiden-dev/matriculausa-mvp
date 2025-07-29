import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔧 setup-gmail-watch: ===== FUNCTION CALLED =====')
  console.log('🔧 Method:', req.method)
  console.log('🔧 URL:', req.url)

  try {
    // Parse request body
    const { targetEmail } = await req.json()
    
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'targetEmail is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Erro ao obter usuário:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('🔧 Usuário autenticado:', user.id)

    // Get Gmail connection for this user and email
    const { data: connection, error: connectionError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('email', targetEmail)
      .single()

    if (connectionError || !connection) {
      console.error('❌ Erro ao obter conexão Gmail:', connectionError)
      return new Response(JSON.stringify({ error: 'Gmail connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('🔧 Conexão Gmail encontrada:', connection.email)

    // Decrypt and refresh access token
    const { data: decryptedData, error: decryptError } = await supabase.rpc('decrypt_data', {
      encrypted_data: connection.encrypted_tokens
    })

    if (decryptError) {
      console.error('❌ Erro ao descriptografar tokens:', decryptError)
      return new Response(JSON.stringify({ error: 'Failed to decrypt tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tokens = JSON.parse(decryptedData)
    
    // Refresh access token if needed
    const refreshedTokens = await refreshAccessToken(tokens)
    
    // Setup Gmail watch
    const watchResult = await setupGmailWatch(refreshedTokens.access_token, targetEmail)
    
    if (watchResult.success) {
      console.log('✅ Gmail watch configurado com sucesso')
      
      // Update connection with new tokens
      const { error: updateError } = await supabase
        .from('gmail_connections')
        .update({
          encrypted_tokens: await supabase.rpc('encrypt_data', {
            data_to_encrypt: JSON.stringify(refreshedTokens)
          })
        })
        .eq('id', connection.id)

      if (updateError) {
        console.error('⚠️ Erro ao atualizar tokens:', updateError)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Gmail watch configured successfully',
        watchId: watchResult.watchId,
        expiration: watchResult.expiration
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      console.error('❌ Erro ao configurar Gmail watch:', watchResult.error)
      return new Response(JSON.stringify({ error: watchResult.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const newTokens = await response.json()
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
 * Setup Gmail watch for push notifications
 */
async function setupGmailWatch(accessToken: string, email: string) {
  try {
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')
    const topicName = `projects/${projectId}/topics/gmail-notifications`
    
    console.log('🔧 Configurando watch para:', email)
    console.log('🔧 Tópico Pub/Sub:', topicName)

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
      console.error('❌ Erro na resposta do Gmail:', response.status, errorText)
      return { success: false, error: `Gmail API error: ${response.status} - ${errorText}` }
    }

    const result = await response.json()
    console.log('✅ Watch configurado:', result)

    return {
      success: true,
      watchId: result.historyId,
      expiration: new Date(Date.now() + (result.expiration * 1000)).toISOString()
    }

  } catch (error) {
    console.error('❌ Erro ao configurar watch:', error)
    return { success: false, error: error.message }
  }
} 