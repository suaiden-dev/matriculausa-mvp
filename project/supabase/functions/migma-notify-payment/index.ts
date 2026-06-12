import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { zelle_payment_id, action, approved_by, rejected_by, rejection_reason } = await req.json()

    if (!zelle_payment_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields: zelle_payment_id, action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[migma-notify-payment] action=${action} payment=${zelle_payment_id}`)

    const { data: payment, error: fetchError } = await supabase
      .from('zelle_payments')
      .select('id, fee_type, metadata')
      .eq('id', zelle_payment_id)
      .single()

    if (fetchError || !payment) {
      console.error('[migma-notify-payment] Payment not found:', fetchError)
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payment.fee_type !== 'application_fee_migma' || payment.metadata?.source !== 'migma') {
      console.warn('[migma-notify-payment] Payment is not a Migma payment, skipping callback')
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'not_migma_payment' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { migma_application_id, migma_profile_id, migma_user_id } = payment.metadata

    if (!migma_application_id || !migma_profile_id) {
      console.error('[migma-notify-payment] Missing Migma IDs in metadata:', payment.metadata)
      return new Response(JSON.stringify({ error: 'Missing migma_application_id or migma_profile_id in payment metadata' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const migmaFunctionsUrl = 'https://ekxftwrjvxtpnqbraszv.supabase.co/functions/v1'
    const migmaWebhookSecret = Deno.env.get('MIGMA_WEBHOOK_SECRET')

    const payload: Record<string, string> = {
      action,
      migma_application_id,
      migma_profile_id,
      migma_user_id: migma_user_id ?? '',
      matriculausa_payment_id: zelle_payment_id,
    }

    if (action === 'approved') {
      payload.approved_by = approved_by ?? 'Admin'
    } else {
      payload.rejected_by = rejected_by ?? 'Admin'
      payload.rejection_reason = rejection_reason ?? ''
    }

    console.log(`[migma-notify-payment] Sending to Migma:`, JSON.stringify(payload))

    const migmaResponse = await fetch(`${migmaFunctionsUrl}/migma-approve-application-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-migma-webhook-secret': migmaWebhookSecret ?? '',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await migmaResponse.text()

    if (migmaResponse.ok) {
      console.log(`✅ [migma-notify-payment] Migma callback success (${migmaResponse.status}):`, responseText)
      return new Response(JSON.stringify({ success: true, migma_status: migmaResponse.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      console.error(`❌ [migma-notify-payment] Migma callback failed (${migmaResponse.status}):`, responseText)
      return new Response(JSON.stringify({ success: false, migma_status: migmaResponse.status, migma_response: responseText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('[migma-notify-payment] Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
