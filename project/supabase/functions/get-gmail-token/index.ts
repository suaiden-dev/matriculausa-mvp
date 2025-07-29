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

  console.log('🔑 get-gmail-token: ===== FUNCTION CALLED =====')

  try {
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

    // Parse request body
    const { targetEmail } = await req.json()
    
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'targetEmail is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('🔑 Buscando token para:', targetEmail)

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

    // Decrypt tokens
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
    
    console.log('✅ Token obtido com sucesso')

    return new Response(JSON.stringify({
      success: true,
      access_token: refreshedTokens.access_token,
      expires_in: refreshedTokens.expires_in,
      token_type: refreshedTokens.token_type
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