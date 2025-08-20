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

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { university_id } = await req.json()

    if (!university_id) {
      throw new Error('university_id is required')
    }

    // Get current Stripe Connect configuration
    const { data: config, error: configError } = await supabase
      .from('university_fee_configurations')
      .select('stripe_connect_account_id')
      .eq('university_id', university_id)
      .single()

    if (configError || !config?.stripe_connect_account_id) {
      throw new Error('University not connected to Stripe Connect')
    }

    // Update university fee configuration to disable Stripe Connect
    const { error: updateError } = await supabase
      .from('university_fee_configurations')
      .update({
        is_stripe_connect_enabled: false,
        stripe_connect_account_id: null,
        stripe_account_name: null,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_requirements_completed: false,
        stripe_access_token: null,
        stripe_refresh_token: null,
        stripe_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('university_id', university_id)

    if (updateError) {
      console.error('Error disconnecting Stripe Connect:', updateError)
      throw new Error('Failed to disconnect Stripe Connect')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe Connect disconnected successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in disconnect-stripe-connect:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
