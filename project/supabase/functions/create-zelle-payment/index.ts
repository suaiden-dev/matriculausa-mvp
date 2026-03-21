import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// @ts-ignore
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

// @ts-ignore
Deno.serve(async (req: any) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const requestBody = await req.json();
    
    // Verificar se é uma atualização de resultado do n8n
    if (requestBody.payment_id && requestBody.n8n_response) {
      return await handleN8nResultUpdate(requestBody);
    }

    // Processo normal de criação de pagamento
    const {
      fee_type,
      amount,
      currency = 'USD',
      recipient_email = 'pay@matriculausa.com',
      recipient_name = 'Matricula USA',
      comprovante_url,
      confirmation_code = `ZEL_${Date.now()}`,
      payment_date = new Date().toISOString(),
      scholarships_ids,
      metadata = {}
    } = requestBody;

    console.log('[create-zelle-payment] Recebidos:', {
      fee_type,
      amount,
      comprovante_url,
      recipient_email,
      confirmation_code
    });

    // Validar parâmetros obrigatórios mínimos
    if (!fee_type || !amount || !comprovante_url) {
      return corsResponse({ 
        error: `Missing required fields: ${[!fee_type && 'fee_type', !amount && 'amount', !comprovante_url && 'comprovante_url'].filter(Boolean).join(', ')}`
      }, 400);
    }

    // Validar tipo de taxa
    const validFeeTypes = ['selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control', 'i-20_control_fee', 'placement_fee', 'ds160_package', 'i539_cos_package'];
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

    // PARÂMETROS PARA O RPC (Restaurado para garantir que o comprovante seja salvo)
    const rpcParams = {
      p_user_id: user.id,
      p_fee_type: fee_type,
      p_amount: Number(amount),
      p_currency: currency,
      p_recipient_email: recipient_email || 'pay@matriculausa.com',
      p_recipient_name: recipient_name || 'Matricula USA',
      p_confirmation_code: confirmation_code || `ZELLE_${Date.now()}`,
      p_payment_date: payment_date || new Date().toISOString(),
      p_screenshot_url: comprovante_url,
      p_metadata: {
        ...metadata,
        scholarships_ids: Array.isArray(scholarships_ids) ? scholarships_ids : [],
        source: 'edge_function_v74',
        updated_at: new Date().toISOString()
      }
    };

    console.log('[create-zelle-payment] Invocando RPC create_zelle_payment para salvar comprovante...');

    // Verificar se já existe um pagamento pendente idêntico criado nos últimos 5 minutos (Idempotência)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingRecentPayment, error: searchError } = await supabase
      .from('zelle_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('fee_type', fee_type)
      .eq('amount', Number(amount))
      .eq('status', 'pending_verification')
      .gt('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error('[create-zelle-payment] Error searching for existing payment:', searchError);
    }

    if (existingRecentPayment) {
      console.log('[create-zelle-payment] Pagamento pendente recente encontrado, evitando duplicidade:', existingRecentPayment.id);
      return corsResponse({ 
        success: true,
        payment_id: existingRecentPayment.id,
        message: 'Recent pending payment already exists. Skipping duplicate webhook.',
        is_duplicate: true
      }, 200);
    }

    // Criar o registro oficial com o comprovante
    const { data: paymentId, error: createError } = await supabase.rpc('create_zelle_payment', rpcParams);

    if (createError) {
      console.error('[create-zelle-payment] Error creating Zelle payment via RPC:', createError);
      // Mesmo com erro no RPC, tentaremos seguir para o webhook se tivermos os dados básicos
    }

    console.log('[create-zelle-payment] Registro com comprovante criado/verificado:', paymentId);

    // Enviar webhook para n8n para validação automática
    try {
      // Formatar URL do comprovante usando o proxy para o n8n
      // @ts-ignore
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const proxyImageUrl = `${supabaseUrl}/functions/v1/n8n-storage-access?url=${encodeURIComponent(comprovante_url)}&token=n8n_default_secret_2026`;
      
      const webhookPayload = {
        user_id: user.id,
        image_url: proxyImageUrl,
        value: amount.toString(),
        currency: currency,
        fee_type: fee_type,
        timestamp: payment_date,
        payment_id: paymentId, // Enviamos o ID criado, embora o n8n possa criar outro
        confirmation_code: confirmation_code,
        scholarships_ids: Array.isArray(scholarships_ids) ? scholarships_ids : [],
        discount_applied: metadata.discount_applied ?? false,
        original_amount: metadata.original_amount ?? amount,
        final_amount: metadata.final_amount ?? amount,
        promotional_coupon: metadata.promotional_coupon ?? null,
        email_aluno: user.email,
        nome_aluno: user.user_metadata?.full_name || 'Alun MatrículaUSA',
        callback_url: `${supabaseUrl}/functions/v1/validate-zelle-payment-result`
      };

      console.log('[create-zelle-payment] Enviando webhook para n8n:', JSON.stringify(webhookPayload, null, 2));

      const n8nResponse = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (n8nResponse.ok) {
        console.log('[create-zelle-payment] Webhook n8n enviado com sucesso');
      } else {
        const errorText = await n8nResponse.text();
        console.warn('[create-zelle-payment] Webhook n8n falhou:', n8nResponse.status, errorText);
      }
    } catch (webhookError) {
      console.error('[create-zelle-payment] Erro ao enviar webhook para n8n:', webhookError);
      // Não falhar por causa do webhook, o pagamento já existe e o admin pode ver
    }

    console.log('[create-zelle-payment] Processamento concluído com sucesso');

    return corsResponse({ 
      success: true,
      payment_id: paymentId,
      message: 'Zelle payment created successfully. Validation in progress.',
      debug_info: {
        fee_type,
        amount,
        confirmation_code
      }
    }, 200);

  } catch (error) {
    console.error('[create-zelle-payment] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});

// Função para lidar com atualização de resultado do n8n
async function handleN8nResultUpdate(requestBody: any) {
  try {
    const {
      payment_id,
      image_url,
      n8n_response,
      status = 'pending_verification'
    } = requestBody;

    console.log('[create-zelle-payment] Updating payment with n8n result:', {
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
      console.error('[create-zelle-payment] Payment not found:', payment_id);
      return corsResponse({ error: 'Payment not found' }, 404);
    }

    // Determinar status baseado na resposta do n8n
    let finalStatus = status;
    let adminNotes = '';

    if (n8n_response === 'valid') {
      finalStatus = 'approved';
      adminNotes = 'Payment automatically approved by n8n validation';
    } else if (n8n_response === 'invalid') {
      finalStatus = 'pending_verification';
      adminNotes = 'Payment flagged as invalid by n8n validation - requires manual review';
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
      console.error('[create-zelle-payment] Error updating payment:', updateError);
      return corsResponse({ error: 'Failed to update payment' }, 500);
    }

    console.log('[create-zelle-payment] Payment updated successfully:', updatedPayment);

    return corsResponse({ 
      success: true,
      payment_id: payment_id,
      status: finalStatus,
      message: 'Payment updated successfully with n8n result'
    }, 200);

  } catch (error) {
    console.error('[create-zelle-payment] Error in handleN8nResultUpdate:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}
