import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('=== REQUEST RECEIVED IN process-stripe-connect-callback ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request - returning 200')
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    })
  }

  console.log('Processing request...')

  try {
    console.log('Starting process-stripe-connect-callback function')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripeConnectClientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID')!
    
    console.log('Environment variables loaded:', { 
      hasSupabaseUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      hasStripeKey: !!stripeSecretKey,
      hasConnectClientId: !!stripeConnectClientId
    })
    
    // Log full Stripe keys for debugging
    console.log('Full Stripe keys for debugging:', {
      secretKey: stripeSecretKey,
      connectClientId: stripeConnectClientId
    })

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    console.log('Parsing request body...')
    const body = await req.json()
    console.log('Request body parsed:', body)
    
    const { university_id, code, state } = body

    if (!university_id || !code || !state) {
      console.log('Missing required parameters')
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify state parameter
    console.log('Verifying state parameter...')
    const { data: stateData, error: stateError } = await supabase
      .from('stripe_connect_states')
      .select('*')
      .eq('state', state)
      .eq('university_id', university_id)
      .single()

    if (stateError || !stateData) {
      console.log('State verification failed:', stateError)
      return new Response(
        JSON.stringify({ error: 'Invalid state parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if state is expired
    if (new Date(stateData.expires_at) < new Date()) {
      console.log('State expired')
      return new Response(
        JSON.stringify({ error: 'State parameter expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('State verified successfully:', {
      stateId: stateData.id,
      expiresAt: stateData.expires_at
    })

    // Get university data
    const { data: university, error: universityError } = await supabase
      .from('universities')
      .select('*')
      .eq('id', university_id)
      .single()

    if (universityError || !university) {
      console.log('University not found:', universityError)
      return new Response(
        JSON.stringify({ error: 'University not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('University found:', { id: university.id, name: university.name })

    console.log('Stripe initialized with key:', stripeSecretKey.substring(0, 20) + '...')

    try {
      // Exchange authorization code for access token via OAuth
      console.log('=== STARTING STRIPE OAUTH TOKEN EXCHANGE ===')
      console.log('Authorization code received:', code?.substring(0, 20) + '...')
      console.log('Stripe secret key starts with:', stripeSecretKey?.substring(0, 20) + '...')
      console.log('Full authorization code:', code)
      console.log('Full secret key:', stripeSecretKey)
      
      // Exchange authorization code for access token
      console.log('Exchanging authorization code for access token...')
      
      const tokenRequestData = {
        grant_type: 'authorization_code',
        client_secret: stripeSecretKey,
        code: code,
      }
      
      console.log('Token exchange request data:', {
        grant_type: tokenRequestData.grant_type,
        client_secret: tokenRequestData.client_secret?.substring(0, 20) + '...',
        code: tokenRequestData.code?.substring(0, 20) + '...'
      })
      
      console.log('Making request to Stripe OAuth endpoint...')
      console.log('Request URL: https://connect.stripe.com/oauth/token')
      console.log('Request method: POST')
      console.log('Request headers: Content-Type: application/x-www-form-urlencoded')
      console.log('Request body:', new URLSearchParams(tokenRequestData).toString())
      
      const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestData),
      })

      console.log('=== STRIPE RESPONSE RECEIVED ===')
      console.log('Response status:', tokenResponse.status)
      console.log('Response status text:', tokenResponse.statusText)
      console.log('Response headers:', Object.fromEntries(tokenResponse.headers.entries()))
      
      // Log the full response for debugging
      const responseText = await tokenResponse.text()
      console.log('Response body (raw):', responseText)
      
      if (!tokenResponse.ok) {
        console.error('=== STRIPE ERROR RESPONSE ===')
        console.error('Status:', tokenResponse.status)
        console.error('Status text:', tokenResponse.statusText)
        console.error('Response body:', responseText)
        
        // Try to parse as JSON for better error details
        try {
          const errorJson = JSON.parse(responseText)
          console.error('Parsed error JSON:', errorJson)
          throw new Error(`Stripe OAuth failed: ${errorJson.error} - ${errorJson.error_description}`)
        } catch (parseError) {
          console.error('Could not parse error response as JSON:', parseError)
          throw new Error(`Stripe OAuth failed with status ${tokenResponse.status}: ${responseText}`)
        }
      }

      console.log('=== STRIPE SUCCESS RESPONSE ===')
      const tokenData = JSON.parse(responseText)
      console.log('Token data received:', {
        hasAccessToken: !!tokenData.access_token,
        hasStripeUserId: !!tokenData.stripe_user_id,
        accessTokenStart: tokenData.access_token?.substring(0, 20) + '...',
        stripeUserId: tokenData.stripe_user_id
      })
      
      const { access_token, stripe_user_id } = tokenData

      // Get account details from Stripe
      console.log('=== FETCHING STRIPE ACCOUNT DETAILS ===')
      console.log('Making request to Stripe API for account:', stripe_user_id)
      
      const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${stripe_user_id}`, {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      })

      console.log('Account response status:', accountResponse.status)
      console.log('Account response headers:', Object.fromEntries(accountResponse.headers.entries()))

      if (!accountResponse.ok) {
        const accountErrorText = await accountResponse.text()
        console.error('Failed to get Stripe account details:', accountErrorText)
        throw new Error('Failed to get Stripe account details')
      }

      const accountData = await accountResponse.json()
      console.log('Account data received:', {
        id: accountData.id,
        businessName: accountData.business_profile?.name,
        chargesEnabled: accountData.charges_enabled,
        payoutsEnabled: accountData.payouts_enabled,
        requirements: {
          currentlyDue: accountData.requirements?.currently_due?.length || 0,
          eventuallyDue: accountData.requirements?.eventually_due?.length || 0,
          pastDue: accountData.requirements?.past_due?.length || 0
        }
      })
      
      const {
        id: account_id,
        business_profile: { name: account_name },
        charges_enabled,
        payouts_enabled,
        requirements: { currently_due, eventually_due, past_due }
      } = accountData

      // Check if requirements are completed
      const requirements_completed = currently_due.length === 0 && past_due.length === 0
      console.log('Requirements completed:', requirements_completed)

      // Update or insert university fee configuration
      console.log('=== SAVING TO DATABASE ===')
      const { error: upsertError } = await supabase
        .from('university_fee_configurations')
        .upsert({
          university_id,
          is_stripe_connect_enabled: true,
          stripe_connect_account_id: account_id,
          stripe_account_name: account_name,
          stripe_charges_enabled: charges_enabled,
          stripe_payouts_enabled: payouts_enabled,
          stripe_requirements_completed: requirements_completed,
          stripe_access_token: access_token, // Store for future use
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'university_id'
        })

      if (upsertError) {
        console.error('Error upserting university fee configuration:', upsertError)
        throw new Error('Failed to save Stripe Connect configuration')
      }
      console.log('Database update successful')

      // Clean up used state
      console.log('=== CLEANING UP STATE ===')
      await supabase
        .from('stripe_connect_states')
        .delete()
        .eq('id', stateData.id)
      console.log('State cleanup successful')

      console.log('=== ALL OPERATIONS COMPLETED SUCCESSFULLY ===')
    return new Response(
      JSON.stringify({
        success: true,
          message: 'Stripe Connect account connected successfully',
          account_id,
          account_name,
          charges_enabled,
          payouts_enabled,
          requirements_completed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

    } catch (stripeError: any) {
      console.log('Stripe API error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        decline_code: stripeError.decline_code,
        param: stripeError.param
      })
    
    return new Response(
      JSON.stringify({
          error: 'Stripe API error', 
          details: stripeError.message,
          code: stripeError.code
        }),
        { 
        status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error: any) {
    console.log('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
