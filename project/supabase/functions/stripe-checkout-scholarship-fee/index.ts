// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

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
    console.log('[stripe-checkout-scholarship-fee] 🚀 Function invoked');
    
    if (req.method === 'OPTIONS') {
      console.log('[stripe-checkout-scholarship-fee] 🔧 Handling OPTIONS request');
      return corsResponse(null, 204);
    }

    console.log('[stripe-checkout-scholarship-fee] 📥 Processing POST request');

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    
    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0',
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    // scholarships_ids pode vir como array (frontend envia string[])
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('[stripe-checkout-scholarship-fee] 📋 Request body received:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('[stripe-checkout-scholarship-fee] ❌ Error parsing request body:', parseError);
      return corsResponse({ error: 'Invalid JSON in request body' }, 400);
    }

    const { price_id, success_url, cancel_url, mode, metadata, scholarships_ids, amount, payment_method } = requestBody;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[stripe-checkout-scholarship-fee] ❌ No authorization header');
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[stripe-checkout-scholarship-fee] ❌ Invalid token:', authError);
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-scholarship-fee] ✅ User authenticated:', user.id);
    console.log('[stripe-checkout-scholarship-fee] 📋 Payload validation:', { price_id, success_url, cancel_url, mode, amount, payment_method });

    // Buscar taxas do pacote do usuário
    type UserPackageFees = {
      package_name: string;
      selection_process_fee: number;
      scholarship_fee: number;
      i20_control_fee: number;
    };
    let userPackageFees: UserPackageFees | null = null;
    try {
      const { data: packageData, error: packageError } = await supabase
        .rpc('get_user_package_fees', {
          user_id_param: user.id
        });

      if (!packageError && packageData && packageData.length > 0) {
        userPackageFees = packageData[0];
        console.log('[stripe-checkout-scholarship-fee] ✅ Taxas do pacote encontradas:', userPackageFees);
      } else {
        console.log('[stripe-checkout-scholarship-fee] ⚠️ Usuário não tem pacote atribuído, usando taxas padrão');
      }
    } catch (err) {
      console.error('[stripe-checkout-scholarship-fee] ❌ Erro ao buscar taxas do pacote:', err);
    }

    // Normaliza scholarships_ids para string (comma-separated) e monta o metadata
    const normalizedScholarshipsIds = Array.isArray(scholarships_ids)
      ? scholarships_ids.join(',')
      : (scholarships_ids || undefined);

    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'scholarship_fee',
      payment_method: payment_method || 'stripe', // Adicionar método de pagamento
      ...metadata,
      ...(normalizedScholarshipsIds ? { scholarships_ids: normalizedScholarshipsIds } : {}),
    };

    // Adicionar informações do pacote como strings no metadata
    if (userPackageFees) {
      sessionMetadata.user_has_package = 'true';
      sessionMetadata.package_name = userPackageFees.package_name;
      sessionMetadata.package_selection_fee = userPackageFees.selection_process_fee.toString();
      sessionMetadata.package_scholarship_fee = userPackageFees.scholarship_fee.toString();
      sessionMetadata.package_i20_fee = userPackageFees.i20_control_fee.toString();
    } else {
      sessionMetadata.user_has_package = 'false';
    }

    // Lógica para PIX (conversão USD -> BRL)
    let exchangeRate = 1;
    if (payment_method === 'pix') {
      console.log('[PIX] 🇧🇷 PIX selecionado para Scholarship Fee - Configurando sessão PIX...');
      console.log('[PIX] 💰 Valor USD:', amount);
      try {
        console.log('[stripe-checkout-scholarship-fee] 💱 Obtendo taxa de câmbio com margem comercial...');
        
        // Usar API externa com margem comercial (mais realista que Stripe)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
          const data = await response.json();
          const baseRate = parseFloat(data.rates.BRL);
          
          // Aplicar margem comercial (3-5% acima da taxa oficial)
          exchangeRate = baseRate * 1.04; // 4% de margem
          console.log('[stripe-checkout-scholarship-fee] 💱 Taxa base (ExchangeRates-API):', baseRate);
          console.log('[stripe-checkout-scholarship-fee] 💱 Taxa com margem comercial (+4%):', exchangeRate);
        } else {
          throw new Error('API externa falhou');
        }
      } catch (apiError) {
        console.error('[stripe-checkout-scholarship-fee] ❌ Erro na API externa:', apiError);
        exchangeRate = 5.6; // Taxa de fallback
        console.log('[stripe-checkout-scholarship-fee] 💱 Usando taxa de fallback:', exchangeRate);
      }
    }

    // Configuração da sessão Stripe
    let sessionConfig: any = {
      payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      mode: mode || 'payment',
      success_url: payment_method === 'pix' ? `${success_url}&pix_payment=true` : success_url,
      cancel_url: cancel_url,
      metadata: {
        ...sessionMetadata,
        ...(payment_method === 'pix' ? { payment_method: 'pix', exchange_rate: exchangeRate.toString() } : {})
      },
    };

    // Definição das line_items priorizando amount explícito ou valor do pacote.
    // 1) Se veio amount no payload/metadata, usa price_data com esse valor (centavos)
    // 2) Senão, se usuário tem pacote, usa o scholarship_fee do pacote
    // 3) Senão, fallback para price_id (mantém compatibilidade)
    const explicitAmount = Number(metadata?.final_amount ?? metadata?.scholarship_fee_amount ?? metadata?.amount ?? amount);
    
    console.log('[stripe-checkout-scholarship-fee] 🔍 Debug valores:', {
      'metadata.final_amount': metadata?.final_amount,
      'metadata.scholarship_fee_amount': metadata?.scholarship_fee_amount,
      'metadata.amount': metadata?.amount,
      'amount': amount,
      'explicitAmount': explicitAmount
    });
    
    // Garantir valor mínimo de $0.50 USD
    const minAmount = 0.50;
    let finalAmount = explicitAmount;
    if (!Number.isNaN(explicitAmount) && explicitAmount > 0) {
      if (explicitAmount < minAmount) {
        console.log(`[stripe-checkout-scholarship-fee] Valor muito baixo (${explicitAmount}), ajustando para mínimo: ${minAmount}`);
        finalAmount = minAmount;
      }
      const unitAmountCents = Math.round(finalAmount * 100);
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'Scholarship Fee',
              description: 'Scholarship application processing fee',
            },
            unit_amount: payment_method === 'pix' ? Math.round(finalAmount * exchangeRate * 100) : unitAmountCents,
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-scholarship-fee] ✅ Usando amount explícito:', payment_method === 'pix' ? `BRL ${finalAmount * exchangeRate}` : `USD ${finalAmount}`);
    } else if (userPackageFees && typeof userPackageFees.scholarship_fee === 'number') {
      // ⚠️ FALLBACK: Usando valor do pacote, mas priorizando $900 para scholarship fee
      let packageAmount = userPackageFees.scholarship_fee;
      
      // Se o valor do pacote for $400 (legacy), usar $900 (valor correto da scholarship fee)
      if (packageAmount === 400) {
        packageAmount = 900;
        console.log('[stripe-checkout-scholarship-fee] 🔧 CORREÇÃO: Valor do pacote era $400, ajustando para $900 (scholarship fee padrão)');
      }
      
      packageAmount = packageAmount < minAmount ? minAmount : packageAmount;
      console.log('[stripe-checkout-scholarship-fee] ⚠️ FALLBACK: Usando valor do pacote (ajustado):', packageAmount, 'USD');
      const dynamicAmount = Math.round(packageAmount * 100);
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'Scholarship Fee',
              description: `Scholarship Fee - ${userPackageFees.package_name}`,
            },
            unit_amount: payment_method === 'pix' ? Math.round(packageAmount * exchangeRate * 100) : dynamicAmount,
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-scholarship-fee] ✅ Usando valor do pacote:', payment_method === 'pix' ? `BRL ${packageAmount * exchangeRate}` : `USD ${packageAmount}`);
    } else {
      sessionConfig.line_items = [
        {
          price: price_id,
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-scholarship-fee] ⚠️ ÚLTIMO FALLBACK: Usando price_id:', price_id);
      console.log('[stripe-checkout-scholarship-fee] ⚠️ ATENÇÃO: Nenhum valor explícito encontrado, usando preço do Stripe');
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[stripe-checkout-scholarship-fee] Created Stripe session with metadata:', session.metadata);
    
    // Logs específicos para PIX
    if (payment_method === 'pix') {
      console.log('[PIX] ✅ Sessão PIX criada com sucesso!');
      console.log('[PIX] 🆔 Session ID:', session.id);
      console.log('[PIX] 🔗 Session URL:', session.url);
      console.log('[PIX] 💰 Valor final BRL:', session.amount_total);
      console.log('[PIX] 💱 Moeda:', session.currency);
      console.log('[PIX] 🎯 Métodos de pagamento:', session.payment_method_types);
      console.log('[PIX] 🔗 Success URL configurada:', session.success_url);
    }

    // Log the checkout session creation
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', user.id).single();
      if (userProfile) {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'checkout_session_created',
          p_action_description: `Stripe checkout session created for Scholarship Fee (${session.id})`,
          p_performed_by: user.id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'scholarship_fee',
            payment_method: 'stripe',
            session_id: session.id,
            amount: explicitAmount || userPackageFees?.scholarship_fee || null,
            scholarships_ids: normalizedScholarshipsIds,
            package_name: userPackageFees?.package_name || null
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log checkout session creation:', logError);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('[stripe-checkout-scholarship-fee] ❌ Checkout error:', error);
    console.error('[stripe-checkout-scholarship-fee] ❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return corsResponse({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}); 