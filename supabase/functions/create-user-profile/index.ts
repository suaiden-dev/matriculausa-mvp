// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck
// The following linter errors are expected in local editors but do not affect Supabase Edge Functions runtime.
// - Remote import (esm.sh) is supported by Deno/Supabase
// - 'Deno' global is available in Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allows all origins (for debugging). Replace with specific origin in production: 'http://localhost:5173'
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, full_name, phone, country, field_of_interest } = await req.json();

    // Basic validation
    if (!user_id || !full_name) {
      return new Response(JSON.stringify({ error: 'Missing required user data (user_id, full_name).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
    // These secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are automatically injected by Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Insert into user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user_id,
        full_name: full_name,
        phone: phone || '',
        country: country || '',
        field_of_interest: field_of_interest || '',
        is_application_fee_paid: false,
        stripe_customer_id: null,
        stripe_payment_intent_id: null,
        status: 'active',
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileError) {
      console.error('Error inserting user profile in Edge Function:', profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'User profile created successfully.', profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function create-user-profile error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-user-profile' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
