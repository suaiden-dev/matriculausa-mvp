import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

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

    const { success_url, cancel_url, price_id: incomingPriceId, amount, metadata } = await req.json();
    const price_id = incomingPriceId;
    const mode = 'payment';
    

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    // Buscar taxas do pacote do usuário
    let userPackageFees = null;
    try {
      const { data: packageData, error: packageError } = await supabase
        .rpc('get_user_package_fees', {
          user_id_param: user.id
        });

      if (!packageError && packageData && packageData.length > 0) {
        userPackageFees = packageData[0];
        console.log('[stripe-checkout-i20-control-fee] ✅ Taxas do pacote encontradas:', userPackageFees);
      } else {
        console.log('[stripe-checkout-i20-control-fee] ⚠️ Usuário não tem pacote atribuído, usando taxas padrão');
      }
    } catch (err) {
      console.error('[stripe-checkout-i20-control-fee] ❌ Erro ao buscar taxas do pacote:', err);
    }

    // Metadata para rastreamento
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'i20_control_fee',
      ...metadata,
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

    // Configuração da sessão Stripe
    let sessionConfig: any = {
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      mode,
      success_url,
      cancel_url,
      metadata: sessionMetadata,
    };

    // Se o frontend enviou um amount específico (incluindo dependentes), usar esse valor
    if (amount && typeof amount === 'number' && amount > 0) {
      const finalAmount = Math.round(amount * 100); // Converter para centavos
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'I-20 Control Fee',
              description: userPackageFees ? `I-20 Control Fee - ${userPackageFees.package_name}` : 'I-20 Control Fee',
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ];
    }
    // Se o usuário tem pacote mas não foi enviado amount, usar preço dinâmico do pacote
    else if (userPackageFees) {
      const dynamicAmount = Math.round(userPackageFees.i20_control_fee * 100); // Converter para centavos
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'I-20 Control Fee',
              description: `I-20 Control Fee - ${userPackageFees.package_name}`,
            },
            unit_amount: dynamicAmount,
          },
          quantity: 1,
        },
      ];
    } else {
      // Usar price_id padrão se não tiver pacote
      sessionConfig.line_items = [
        {
          price: price_id,
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-i20-control-fee] ⚠️ Usando price_id padrão:', price_id);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 