import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getParcelowConfig } from '../parcelow-config.ts';
import { getRedirectOrigin } from '../shared/environment-detector.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function corsResponse(body: any, status = 200) {
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

/**
 * Obtém token de acesso da Parcelow
 */
async function getParcelowAccessToken(config: any) {
  console.log('[Parcelow] Autenticando...');
  
  const response = await fetch(`${config.apiBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Parcelow Auth Error: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    console.log('[create-parcelow-checkout] 🚀 Iniciando função');
    
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const config = getParcelowConfig(req);
    
    if (!config.clientId || !config.clientSecret) {
      console.error('[create-parcelow-checkout] ❌ Credenciais Parcelow não configuradas');
      return corsResponse({ error: 'Parcelow configuration error' }, 500);
    }

    const { amount, fee_type, metadata } = await req.json();
    
    console.log('[create-parcelow-checkout] 📥 Payload recebido:', { amount, fee_type, metadata });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[create-parcelow-checkout] ❌ Header de autorização não encontrado');
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[create-parcelow-checkout] ❌ Erro de autenticação:', authError);
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[create-parcelow-checkout] ✅ Usuário autenticado:', user.id);

    // Buscar perfil do usuário para obter CPF
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, email, cpf_document, phone')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[create-parcelow-checkout] ❌ Erro ao buscar perfil:', profileError);
      return corsResponse({ error: 'User profile not found' }, 404);
    }

    if (!profile.cpf_document) {
      console.error('[create-parcelow-checkout] ❌ CPF é obrigatório para pagamento via Parcelow');
      return corsResponse({ error: 'document_number_required', message: 'CPF is required for Parcelow payment' }, 400);
    }

    // Obter token de acesso
    const accessToken = await getParcelowAccessToken(config);

    // Gerar ID de referência único
    const timestamp = Date.now();
    const reference = `${fee_type.substring(0, 10)}_${timestamp}`;

    // URLs de redirect dinâmicas conforme ambiente (matriculausa.com, staging ou localhost)
    const origin = getRedirectOrigin(req);
    const redirectSuccess = `${origin}/student/dashboard/payment-success?reference=${encodeURIComponent(reference)}&payment_method=parcelow`;
    const redirectFailed = `${origin}/student/dashboard/payment-error?reference=${encodeURIComponent(reference)}&payment_method=parcelow`;

    // URL do webhook
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/parcelow-webhook`;

    // Preparar dados do pedido
    const orderData = {
      reference: reference,
      amount: amount,
      currency: 'USD',
      description: `Payment for ${fee_type}`,
      customer: {
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        tax_id: profile.cpf_document.replace(/\D/g, ''), // apenas números
      },
      redirect: {
        success: redirectSuccess,
        failed: redirectFailed
      },
      notify_url: webhookUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: user.id,
        fee_type: fee_type,
        reference: reference,
        ...(metadata || {}),
      },
    };

    console.log('[create-parcelow-checkout] 🛒 Criando pedido na Parcelow...');
    
    const orderResponse = await fetch(`${config.apiBaseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error('[create-parcelow-checkout] ❌ Erro ao criar pedido na Parcelow:', error);
      return corsResponse({ error: 'Failed to create Parcelow order', details: error }, 500);
    }

    const parcelowOrder = await orderResponse.json();
    
    // Extrair order_id e checkout_url
    const orderId = parcelowOrder.data?.order_id || parcelowOrder.order_id || parcelowOrder.id;
    const checkoutUrl = parcelowOrder.data?.url_checkout || parcelowOrder.checkout_url || parcelowOrder.url;

    console.log('[create-parcelow-checkout] ✅ Pedido criado:', orderId);

    // Registrar no banco de dados (individual_fee_payments)
    const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
      p_user_id: user.id,
      p_fee_type: fee_type,
      p_amount: amount,
      p_payment_date: new Date().toISOString(),
      p_payment_method: 'parcelow',
      p_parcelow_order_id: String(orderId),
      p_parcelow_checkout_url: checkoutUrl,
      p_parcelow_reference: reference
    });

    if (insertError) {
      console.error('[create-parcelow-checkout] ❌ Erro ao registrar pagamento:', insertError);
    } else {
      console.log('[create-parcelow-checkout] ✅ Pagamento registrado com sucesso!');
    }

    // Log action
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', user.id).single();
      if (userProfile) {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'checkout_session_created',
          p_action_description: `Parcelow checkout session created for ${fee_type} (${parcelowOrder.id})`,
          p_performed_by: user.id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: fee_type,
            payment_method: 'parcelow',
            order_id: parcelowOrder.id,
            amount: amount
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log checkout creation:', logError);
    }

    return corsResponse({ checkout_url: parcelowOrder.checkout_url }, 200);

  } catch (error: any) {
    console.error('[create-parcelow-checkout] ❌ Erro geral na função:', error);
    return corsResponse({ error: 'Internal server error', details: error.message }, 500);
  }
});
