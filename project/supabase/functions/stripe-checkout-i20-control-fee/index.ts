import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';
import { calculateCardAmountWithFees, calculatePIXAmountWithFees } from '../utils/stripe-fee-calculator.ts';

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

    const { success_url, cancel_url, price_id: incomingPriceId, amount, metadata, payment_method } = await req.json();
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

    // Lógica para PIX (conversão USD -> BRL)
    let exchangeRate = 1;
    if (payment_method === 'pix') {
      try {
        console.log('[stripe-checkout-i20-control-fee] 💱 Obtendo taxa de câmbio com margem comercial...');
        
        // Usar API externa com margem comercial (mais realista que Stripe)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
          const data = await response.json();
          const baseRate = parseFloat(data.rates.BRL);
          
          // Aplicar margem comercial (3-5% acima da taxa oficial)
          exchangeRate = baseRate * 1.04; // 4% de margem
          console.log('[stripe-checkout-i20-control-fee] 💱 Taxa base (ExchangeRates-API):', baseRate);
          console.log('[stripe-checkout-i20-control-fee] 💱 Taxa com margem comercial (+4%):', exchangeRate);
        } else {
          throw new Error('API externa falhou');
        }
      } catch (apiError) {
        console.error('[stripe-checkout-i20-control-fee] ❌ Erro na API externa:', apiError);
        exchangeRate = 5.6; // Taxa de fallback
        console.log('[stripe-checkout-i20-control-fee] 💱 Usando taxa de fallback:', exchangeRate);
      }
    }

    // Metadata para rastreamento
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'i20_control_fee',
      payment_method: payment_method || 'stripe', // Adicionar método de pagamento
      ...metadata,
      ...(payment_method === 'pix' ? { exchange_rate: exchangeRate.toString() } : {})
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
      payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      mode,
      success_url: payment_method === 'pix' ? `${success_url}&pix_payment=true` : success_url,
      cancel_url,
      metadata: sessionMetadata,
    };

    // Garantir valor mínimo de $0.50 USD
    const minAmount = 0.50;
    
    // Se o frontend enviou um amount específico (incluindo dependentes), usar esse valor
    if (amount && typeof amount === 'number' && amount > 0) {
      let finalAmount = amount;
      if (finalAmount < minAmount) {
        console.log(`[stripe-checkout-i20-control-fee] Valor muito baixo (${finalAmount}), ajustando para mínimo: ${minAmount}`);
        finalAmount = minAmount;
      }
      
      // Valor base (sem markup) - usado para comissões
      const baseAmount = finalAmount;
      
      // Verificar se deve aplicar markup (não aplicar em produção por padrão)
      const enableMarkupEnv = Deno.env.get('ENABLE_STRIPE_FEE_MARKUP');
      const shouldApplyMarkup = enableMarkupEnv === 'true' 
        ? true 
        : enableMarkupEnv === 'false' 
          ? false 
          : !config.environment.isProduction; // Se não definido, usar detecção automática
      
      // Calcular valor com ou sem markup de taxas do Stripe
      let grossAmountInCents: number;
      if (shouldApplyMarkup) {
        if (payment_method === 'pix') {
          // Para PIX: calcular markup considerando taxa de câmbio
          grossAmountInCents = calculatePIXAmountWithFees(baseAmount, exchangeRate);
        } else {
          // Para cartão: calcular markup
          grossAmountInCents = calculateCardAmountWithFees(baseAmount);
        }
        console.log('[stripe-checkout-i20-control-fee] ✅ Markup ATIVADO (ambiente:', config.environment.environment, ')');
      } else {
        // Sem markup: usar valor original
        if (payment_method === 'pix') {
          grossAmountInCents = Math.round(baseAmount * exchangeRate * 100);
        } else {
          grossAmountInCents = Math.round(baseAmount * 100);
        }
        console.log('[stripe-checkout-i20-control-fee] ⚠️ Markup DESATIVADO (ambiente:', config.environment.environment, ')');
      }
      
      // Adicionar valores base e gross ao metadata para uso em comissões
      sessionMetadata.base_amount = baseAmount.toString();
      sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
      sessionMetadata.fee_type = shouldApplyMarkup ? 'stripe_processing' : 'none';
      sessionMetadata.fee_amount = shouldApplyMarkup ? ((grossAmountInCents / 100) - baseAmount).toString() : '0';
      sessionMetadata.markup_enabled = shouldApplyMarkup.toString();
      
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'I-20 Control Fee',
              description: userPackageFees ? `I-20 Control Fee - ${userPackageFees.package_name}` : 'I-20 Control Fee',
            },
            unit_amount: grossAmountInCents,
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-i20-control-fee] ✅ Usando amount explícito');
      console.log('[stripe-checkout-i20-control-fee] 💰 Valor base (para comissões):', baseAmount);
      console.log('[stripe-checkout-i20-control-fee] 💰 Valor final (cobrado do aluno):', grossAmountInCents / 100);
    }
    // Se o usuário tem pacote mas não foi enviado amount, usar preço dinâmico do pacote
    else if (userPackageFees) {
      // Garantir valor mínimo para pacote também
      let packageAmount = userPackageFees.i20_control_fee < minAmount ? minAmount : userPackageFees.i20_control_fee;
      
      // Valor base (sem markup) - usado para comissões
      const baseAmount = packageAmount;
      
      // Verificar se deve aplicar markup (não aplicar em produção por padrão)
      const enableMarkupEnv = Deno.env.get('ENABLE_STRIPE_FEE_MARKUP');
      const shouldApplyMarkup = enableMarkupEnv === 'true' 
        ? true 
        : enableMarkupEnv === 'false' 
          ? false 
          : !config.environment.isProduction; // Se não definido, usar detecção automática
      
      // Calcular valor com ou sem markup de taxas do Stripe
      let grossAmountInCents: number;
      if (shouldApplyMarkup) {
        if (payment_method === 'pix') {
          // Para PIX: calcular markup considerando taxa de câmbio
          grossAmountInCents = calculatePIXAmountWithFees(baseAmount, exchangeRate);
        } else {
          // Para cartão: calcular markup
          grossAmountInCents = calculateCardAmountWithFees(baseAmount);
        }
        console.log('[stripe-checkout-i20-control-fee] ✅ Markup ATIVADO (ambiente:', config.environment.environment, ')');
      } else {
        // Sem markup: usar valor original
        if (payment_method === 'pix') {
          grossAmountInCents = Math.round(baseAmount * exchangeRate * 100);
        } else {
          grossAmountInCents = Math.round(baseAmount * 100);
        }
        console.log('[stripe-checkout-i20-control-fee] ⚠️ Markup DESATIVADO (ambiente:', config.environment.environment, ')');
      }
      
      // Adicionar valores base e gross ao metadata para uso em comissões
      sessionMetadata.base_amount = baseAmount.toString();
      sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
      sessionMetadata.fee_type = shouldApplyMarkup ? 'stripe_processing' : 'none';
      sessionMetadata.fee_amount = shouldApplyMarkup ? ((grossAmountInCents / 100) - baseAmount).toString() : '0';
      sessionMetadata.markup_enabled = shouldApplyMarkup.toString();
      
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'I-20 Control Fee',
              description: `I-20 Control Fee - ${userPackageFees.package_name}`,
            },
            unit_amount: grossAmountInCents,
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-i20-control-fee] ✅ Usando valor do pacote');
      console.log('[stripe-checkout-i20-control-fee] 💰 Valor base (para comissões):', baseAmount);
      console.log('[stripe-checkout-i20-control-fee] 💰 Valor final (cobrado do aluno):', grossAmountInCents / 100);
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

    // Log the checkout session creation
    try {
      const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', user.id).single();
      if (userProfile) {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'checkout_session_created',
          p_action_description: `Stripe checkout session created for I-20 Control Fee (${session.id})`,
          p_performed_by: user.id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'i20_control_fee',
            payment_method: 'stripe',
            session_id: session.id,
            amount: amount || userPackageFees?.i20_control_fee || null,
            package_name: userPackageFees?.package_name || null
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log checkout session creation:', logError);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 