import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests - RESPONDER SEMPRE COM 200
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get request body
    const { university_id } = await req.json()
    
    if (!university_id) {
      throw new Error('university_id is required')
    }
    
    // Get current Stripe Connect configuration
    const { data: config, error: configError } = await supabase
      .from('university_fee_configurations')
      .select('stripe_connect_account_id, stripe_access_token')
      .eq('university_id', university_id)
      .single()
    
    if (configError || !config?.stripe_connect_account_id) {
      throw new Error('University not connected to Stripe Connect')
    }
    
    // Get updated account details from Stripe
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${config.stripe_connect_account_id}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    })
    
    if (!accountResponse.ok) {
      throw new Error('Failed to get Stripe account details')
    }
    
    const accountData = await accountResponse.json()
    const {
      business_profile: { name: account_name },
      charges_enabled,
      payouts_enabled,
      requirements: { currently_due, eventually_due, past_due }
    } = accountData
    
    // Check if requirements are completed
    const requirements_completed = currently_due.length === 0 && past_due.length === 0
    
    // Update university fee configuration with new status
    const { error: updateError } = await supabase
      .from('university_fee_configurations')
      .update({
        stripe_account_name: account_name,
        stripe_charges_enabled: charges_enabled,
        stripe_payouts_enabled: payouts_enabled,
        stripe_requirements_completed: requirements_completed,
        updated_at: new Date().toISOString()
      })
      .eq('university_id', university_id)
    
    if (updateError) {
      console.error('Error updating Stripe Connect status:', updateError)
      throw new Error('Failed to update Stripe Connect status')
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe Connect status updated successfully',
        account_name,
        charges_enabled,
        payouts_enabled,
        requirements_completed,
        requirements_details: {
          currently_due,
          eventually_due,
          past_due
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to refresh status', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
