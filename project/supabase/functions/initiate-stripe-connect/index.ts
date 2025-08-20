import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuração inline do Stripe para evitar problemas de import
interface StripeConfig {
  apiBaseUrl: string
  connectApiBaseUrl: string
  connectClientId: string
  defaultRedirectUri?: string
  secretKey: string
  publishableKey?: string
  webhookSecret?: string
}

function getStripeConfig(): StripeConfig {
  const config: StripeConfig = {
    apiBaseUrl: Deno.env.get('STRIPE_API_BASE_URL') || 'https://api.stripe.com',
    connectApiBaseUrl: Deno.env.get('STRIPE_CONNECT_API_BASE_URL') || 'https://connect.stripe.com',
    connectClientId: Deno.env.get('STRIPE_CONNECT_CLIENT_ID') || '',
    defaultRedirectUri: Deno.env.get('STRIPE_CONNECT_DEFAULT_REDIRECT_URI'),
    secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
    publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
    webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET')
  }

  if (!config.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required')
  }

  if (!config.connectClientId) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID is required for Stripe Connect functionality')
  }

  return config
}

function buildStripeUrls(config: StripeConfig) {
  return {
    connectOAuth: () => `${config.connectApiBaseUrl}/oauth/authorize`,
    connectToken: () => `${config.connectApiBaseUrl}/oauth/token`,
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('=== REQUEST RECEIVED ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight requests - RESPONDER SEMPRE COM 200
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request - returning 200')
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    })
  }

  console.log('Processing request...')

  try {
    console.log('Starting initiate-stripe-connect function')
    
    // Get configuration
    const stripeConfig = getStripeConfig()
    console.log('Stripe config loaded:', { 
      hasConnectClientId: !!stripeConfig.connectClientId,
      hasSecretKey: !!stripeConfig.secretKey,
      defaultRedirectUri: stripeConfig.defaultRedirectUri 
    })
    
    const stripeUrls = buildStripeUrls(stripeConfig)
    console.log('Stripe URLs built successfully')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    console.log('Environment variables loaded:', { 
      hasSupabaseUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    })

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    console.log('Parsing request body...')
    const { university_id, return_url } = await req.json()
    console.log('Request body parsed:', { university_id, return_url })

    if (!university_id) {
      console.log('Error: university_id is missing')
      throw new Error('university_id is required')
    }

    // Use provided return_url or fallback to default, or use a generic one
    let finalReturnUrl = return_url || stripeConfig.defaultRedirectUri
    
    // For Express OAuth, we don't need a complex redirect URI
    // Just use a simple one that Stripe will accept
    if (!finalReturnUrl) {
      finalReturnUrl = 'http://localhost:5173/school/dashboard/stripe-connect/callback'
      console.log('Using simple redirect URL for Express OAuth:', finalReturnUrl)
    }

    // IMPORTANTE: Verificar se já termina com /callback para evitar duplicação
    if (!finalReturnUrl.endsWith('/callback')) {
      finalReturnUrl = `${finalReturnUrl}/callback`
      console.log('Added /callback to redirect URL:', finalReturnUrl)
    } else {
      console.log('Redirect URL already ends with /callback:', finalReturnUrl)
    }

    console.log('Final return URL:', finalReturnUrl)

    // Verify university exists
    console.log('Verifying university exists...')
    const { data: university, error: universityError } = await supabase
      .from('universities')
      .select('id, name')
      .eq('id', university_id)
      .single()

    if (universityError || !university) {
      console.log('University verification failed:', { universityError, university })
      throw new Error('University not found')
    }
    console.log('University verified:', university)

    // Generate state parameter for security
    console.log('Generating state parameter...')
    const state = crypto.randomUUID()
    console.log('State generated:', state)

    // Store state in database for verification
    console.log('Storing state in database...')
    const { error: stateError } = await supabase
      .from('stripe_connect_states')
      .insert({
        university_id,
        state,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    if (stateError) {
      console.error('Error storing state:', stateError)
      // Continue anyway, this is not critical
    } else {
      console.log('State stored successfully')
    }

    // Build Stripe Connect authorization URL - Using Standard OAuth
    console.log('Building Stripe Connect Standard OAuth URL...')
    
    // For Standard OAuth, we need to redirect to Stripe and handle the callback
    // IMPORTANTE: Não duplicar /callback - usar finalReturnUrl diretamente
    console.log('Using redirect URI:', finalReturnUrl)
    
    const params = new URLSearchParams({
      client_id: stripeConfig.connectClientId,
      response_type: 'code',
      scope: 'read_write',
      state: state,
      redirect_uri: finalReturnUrl
    })

    // IMPORTANTE: O Stripe detecta automaticamente o ambiente baseado no client_id
    // Não é necessário adicionar parâmetros extras
    console.log('Stripe will automatically detect TEST mode from client_id:', stripeConfig.connectClientId)

    const authorizationUrl = `${stripeUrls.connectOAuth()}?${params.toString()}`
    console.log('Standard OAuth URL built:', authorizationUrl)
    console.log('URL parameters:', Object.fromEntries(params.entries()))

    console.log('Sending success response...')
    return new Response(
      JSON.stringify({
        success: true,
        url: authorizationUrl,
        state: state,
        oauth_type: 'standard'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('=== ERROR OCCURRED ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  } finally {
    console.log('=== REQUEST COMPLETED ===')
  }
})
