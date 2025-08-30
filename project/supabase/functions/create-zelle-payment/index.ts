import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      fee_type,
      amount,
      currency = 'USD',
      recipient_email,
      recipient_name,
      comprovante_url,
      confirmation_code,
      payment_date,
      scholarships_ids,
      metadata = {}
    } = await req.json();

    // Validar parâmetros obrigatórios
    if (!fee_type || !amount || !recipient_email || !recipient_name || !comprovante_url || !confirmation_code || !payment_date) {
      return corsResponse({ 
        error: 'Missing required fields: fee_type, amount, recipient_email, recipient_name, comprovante_url, confirmation_code, payment_date' 
      }, 400);
    }

    // Validar tipo de taxa
    const validFeeTypes = ['selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control', 'i-20_control_fee'];
    if (!validFeeTypes.includes(fee_type)) {
      return corsResponse({ error: 'Invalid fee_type' }, 400);
    }

    // Validar valor
    if (amount <= 0) {
      return corsResponse({ error: 'Amount must be greater than 0' }, 400);
    }

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[create-zelle-payment] Creating Zelle payment for user:', user.id);

    // Criar pagamento Zelle usando a função RPC
    const { data: paymentId, error: createError } = await supabase.rpc('create_zelle_payment', {
      p_user_id: user.id,
      p_fee_type: fee_type,
      p_amount: amount,
      p_currency: currency,
      p_recipient_email: recipient_email,
      p_recipient_name: recipient_name,
      p_metadata: {
        ...metadata,
        scholarships_ids: scholarships_ids,
        confirmation_code: confirmation_code,
        payment_date: payment_date,
        comprovante_url: comprovante_url
      }
    });

    if (createError) {
      console.error('[create-zelle-payment] Error creating Zelle payment:', createError);
      return corsResponse({ error: 'Failed to create Zelle payment' }, 500);
    }

    // Atualizar o pagamento com informações adicionais
    const { error: updateError } = await supabase
      .from('zelle_payments')
      .update({
        confirmation_code: confirmation_code,
        payment_date: payment_date,
        recipient_email: recipient_email,
        recipient_name: recipient_name,
        comprovante_url: comprovante_url,
        comprovante_uploaded_at: new Date().toISOString(),
        status: 'pending' // Aguardando validação automática
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('[create-zelle-payment] Error updating Zelle payment:', updateError);
      // Não falhar se não conseguir atualizar, o pagamento já foi criado
    }

    // Enviar webhook para n8n para validação automática
    try {
      const webhookPayload = {
        tipo_notf: 'Novo pagamento Zelle - Validação Automática',
        email_aluno: user.email,
        nome_aluno: user.user_metadata?.full_name || 'Unknown',
        fee_type: fee_type,
        amount: amount,
        currency: currency,
        confirmation_code: confirmation_code,
        payment_date: payment_date,
        recipient_email: recipient_email,
        recipient_name: recipient_name,
        comprovante_url: comprovante_url,
        payment_id: paymentId,
        metadata: metadata,
        // Campos para validação automática
        validation_required: true,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-zelle-payment-result`
      };

      console.log('[create-zelle-payment] Sending webhook to n8n for automatic validation:', webhookPayload);

      const n8nResponse = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.3',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (n8nResponse.ok) {
        console.log('[create-zelle-payment] Webhook sent successfully for automatic validation');
      } else {
        console.warn('[create-zelle-payment] Webhook failed:', n8nResponse.status);
        // Se o webhook falhar, marcar como pending_verification para verificação manual posterior
        await supabase
          .from('zelle_payments')
          .update({ status: 'pending_verification' })
          .eq('id', paymentId);
      }
    } catch (webhookError) {
      console.error('[create-zelle-payment] Error sending webhook:', webhookError);
      // Se o webhook falhar, marcar como pending_verification para verificação manual posterior
      await supabase
        .from('zelle_payments')
        .update({ status: 'pending_verification' })
        .eq('id', paymentId);
    }

    console.log('[create-zelle-payment] Zelle payment created successfully:', paymentId);

    return corsResponse({ 
      success: true,
      payment_id: paymentId,
      message: 'Zelle payment created successfully and sent for automatic validation'
    }, 200);

  } catch (error) {
    console.error('[create-zelle-payment] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
