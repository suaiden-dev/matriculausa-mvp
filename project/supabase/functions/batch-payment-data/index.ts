import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { user_ids } = await req.json();
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch fetch all data in parallel
    const [overridesResult, paymentDatesResult, systemTypesResult] = await Promise.all([
      // Fee overrides
      supabase.rpc('get_user_fee_overrides_batch', { p_user_ids: user_ids }),
      
      // Payment dates
      supabase.rpc('get_payment_dates_batch', { p_user_ids: user_ids }),
      
      // System types
      supabase
        .from('user_profiles')
        .select('user_id, system_type')
        .in('user_id', user_ids),
    ]);

    // Process results
    const overridesMap: { [key: string]: any } = {};
    if (overridesResult.data && Array.isArray(overridesResult.data)) {
      overridesResult.data.forEach((row: any) => {
        if (row.user_id) {
          overridesMap[row.user_id] = {
            selection_process_fee: row.selection_process_fee != null ? Number(row.selection_process_fee) : undefined,
            application_fee: row.application_fee != null ? Number(row.application_fee) : undefined,
            scholarship_fee: row.scholarship_fee != null ? Number(row.scholarship_fee) : undefined,
            i20_control_fee: row.i20_control_fee != null ? Number(row.i20_control_fee) : undefined,
          };
        }
      });
    }

    const paymentDatesMap: { [key: string]: { [feeType: string]: string } } = {};
    if (paymentDatesResult.data && Array.isArray(paymentDatesResult.data)) {
      paymentDatesResult.data.forEach((row: any) => {
        if (row.user_id && row.fee_type && row.payment_date) {
          if (!paymentDatesMap[row.user_id]) {
            paymentDatesMap[row.user_id] = {};
          }
          // Keep most recent date if multiple exist
          const existingDate = paymentDatesMap[row.user_id][row.fee_type];
          if (!existingDate || new Date(row.payment_date) > new Date(existingDate)) {
            paymentDatesMap[row.user_id][row.fee_type] = row.payment_date;
          }
        }
      });
    }

    const systemTypesMap: { [key: string]: string } = {};
    if (systemTypesResult.data && Array.isArray(systemTypesResult.data)) {
      systemTypesResult.data.forEach((row: any) => {
        if (row.user_id) {
          systemTypesMap[row.user_id] = row.system_type || 'legacy';
        }
      });
    }

    return new Response(
      JSON.stringify({
        overrides: overridesMap,
        paymentDates: paymentDatesMap,
        systemTypes: systemTypesMap,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in batch-payment-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

