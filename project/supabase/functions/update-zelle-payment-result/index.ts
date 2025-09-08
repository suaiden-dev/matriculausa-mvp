import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const {
      payment_id,
      image_url,
      n8n_response,
      status = 'pending_verification'
    } = await req.json();

    // Validar parâmetros obrigatórios
    if (!payment_id || !image_url || !n8n_response) {
      return corsResponse({ 
        error: 'Missing required fields: payment_id, image_url, n8n_response' 
      }, 400);
    }

    console.log('[update-zelle-payment-result] Updating payment:', {
      payment_id,
      image_url,
      n8n_response,
      status
    });

    // Verificar se o pagamento existe
    const { data: existingPayment, error: fetchError } = await supabase
      .from('zelle_payments')
      .select('id, user_id, status')
      .eq('id', payment_id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('[update-zelle-payment-result] Payment not found:', payment_id);
      return corsResponse({ error: 'Payment not found' }, 404);
    }

    // Determinar status baseado na resposta do n8n
    let finalStatus = status;
    let adminNotes = '';

    if (n8n_response === 'valid') {
      finalStatus = 'approved';
      adminNotes = 'Payment automatically approved by n8n validation';
    } else if (n8n_response === 'invalid') {
      finalStatus = 'rejected';
      adminNotes = 'Payment automatically rejected by n8n validation';
    } else {
      finalStatus = 'pending_verification';
      adminNotes = `Payment requires manual review. n8n response: ${n8n_response}`;
    }

    // Atualizar o pagamento com screenshot_url e status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('zelle_payments')
      .update({
        screenshot_url: image_url,
        status: finalStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) {
      console.error('[update-zelle-payment-result] Error updating payment:', updateError);
      return corsResponse({ error: 'Failed to update payment' }, 500);
    }

    console.log('[update-zelle-payment-result] Payment updated successfully:', updatedPayment);

    return corsResponse({ 
      success: true,
      payment_id: payment_id,
      status: finalStatus,
      message: 'Payment updated successfully with n8n result'
    }, 200);

  } catch (error) {
    console.error('[update-zelle-payment-result] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
