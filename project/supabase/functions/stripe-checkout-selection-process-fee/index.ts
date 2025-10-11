import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

// O Stripe fará a conversão de moeda automaticamente
// quando payment_method_types incluir 'pix' e a moeda for USD

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
    console.log('[stripe-checkout-selection-process-fee] 🚀 Iniciando função');
    
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    
    // Criar instância do Stripe com a chave correta para o ambiente
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-07-30.preview', // Versão preview para FX Quotes API
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0',
      },
    });

    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);

    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Variáveis do Supabase não configuradas');
      return corsResponse({ error: 'Supabase configuration error' }, 500);
    }

    console.log('[stripe-checkout-selection-process-fee] ✅ Variáveis de ambiente verificadas');

    const { price_id, amount, success_url, cancel_url, mode, metadata, payment_method } = await req.json();
    
    console.log('[stripe-checkout-selection-process-fee] 📥 Payload recebido:', { price_id, amount, success_url, cancel_url, mode, metadata, payment_method });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Header de autorização não encontrado');
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[stripe-checkout-selection-process-fee] 🔑 Token extraído, verificando usuário...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro de autenticação:', authError);
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-selection-process-fee] ✅ Usuário autenticado:', user.id);

    // Buscar taxas do pacote do usuário
    let userPackageFees = null;
    try {
      console.log('[stripe-checkout-selection-process-fee] 🔍 Tentando buscar taxas do pacote para user_id:', user.id);
      
      const { data: packageData, error: packageError } = await supabase
        .rpc('get_user_package_fees', {
          user_id_param: user.id
        });

      console.log('[stripe-checkout-selection-process-fee] 📊 Resultado da RPC:', { packageData, packageError });

      if (!packageError && packageData && packageData.length > 0) {
        userPackageFees = packageData[0];
        console.log('[stripe-checkout-selection-process-fee] ✅ Taxas do pacote encontradas:', userPackageFees);
      } else {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Usuário não tem pacote atribuído, usando taxas padrão');
        if (packageError) {
          console.error('[stripe-checkout-selection-process-fee] ❌ Erro na RPC:', packageError);
        }
      }
    } catch (err) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao buscar taxas do pacote:', err);
      // Continuar sem pacote se houver erro
      userPackageFees = null;
    }

    // Monta o metadata mínimo
    const sessionMetadata = {
      student_id: user.id,
      fee_type: 'selection_process',
      origem: 'site',
      payment_method: payment_method || 'stripe', // Adicionar método de pagamento ao metadata
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

    console.log('[stripe-checkout-selection-process-fee] �� Metadata da sessão:', sessionMetadata);

    // Verificar se usuário tem desconto ativo
    let activeDiscount = null;
    try {
      console.log('[stripe-checkout-selection-process-fee] �� VERIFICANDO DESCONTO PARA USUÁRIO');
      console.log('[stripe-checkout-selection-process-fee] User ID:', user.id);
      console.log('[stripe-checkout-selection-process-fee] User Email:', user.email);
      
      const { data: discountData, error: discountError } = await supabase
        .rpc('get_user_active_discount', {
          user_id_param: user.id
        });

      console.log('[stripe-checkout-selection-process-fee] 📊 Resultado da consulta de desconto:');
      console.log('[stripe-checkout-selection-process-fee] Data:', discountData);
      console.log('[stripe-checkout-selection-process-fee] Error:', discountError);

      if (discountError) {
        console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao buscar desconto:', discountError);
      } else if (discountData && discountData.has_discount) {
        activeDiscount = discountData;
        console.log('[stripe-checkout-selection-process-fee] ✅ Desconto ativo encontrado!');
        console.log('[stripe-checkout-selection-process-fee] Coupon ID:', activeDiscount.stripe_coupon_id);
        console.log('[stripe-checkout-selection-process-fee] Discount Amount:', activeDiscount.discount_amount);
        console.log('[stripe-checkout-selection-process-fee] Affiliate Code:', activeDiscount.affiliate_code);
      } else {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Nenhum desconto ativo encontrado para o usuário');
      }
    } catch (error) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao verificar desconto:', error);
    }

    // Configuração da sessão Stripe baseada no método escolhido
    let sessionConfig: any = {
      payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'], // PIX ou cartões
      client_reference_id: user.id,
      customer_email: user.email,
      mode: mode || 'payment',
      success_url: payment_method === 'pix' 
        ? `${success_url}&pix_payment=true`
        : success_url,
      cancel_url: cancel_url,
      metadata: sessionMetadata,
    };

    console.log('[stripe-checkout-selection-process-fee] 🎯 Método de pagamento selecionado:', payment_method);
    
    // Para PIX, tentar obter taxa em tempo real usando FX Quotes API
    // A API retorna: to_currency=brl, from_currencies=usd
    // Resultado: rates.usd.exchange_rate (taxa USD->BRL)
    let exchangeRate = 1;
    if (payment_method === 'pix') {
      console.log('[PIX] 🇧🇷 PIX selecionado - Configurando sessão PIX...');
      console.log('[PIX] 💰 Valor USD:', amount);
      try {
        console.log('[stripe-checkout-selection-process-fee] 💱 Obtendo taxa de câmbio com margem comercial...');
        
        // Usar API externa com margem comercial (mais realista que Stripe)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
          const data = await response.json();
          const baseRate = parseFloat(data.rates.BRL);
          
          // Aplicar margem comercial (3-5% acima da taxa oficial)
          exchangeRate = baseRate * 1.04; // 4% de margem
          console.log('[stripe-checkout-selection-process-fee] 💱 Taxa base (ExchangeRates-API):', baseRate);
          console.log('[stripe-checkout-selection-process-fee] 💱 Taxa com margem comercial (+4%):', exchangeRate);
        } else {
          throw new Error('API externa falhou');
        }
        
        // Logs específicos para PIX após cálculo da taxa
        console.log('[PIX] 💱 Taxa de conversão:', exchangeRate);
        console.log('[PIX] 💰 Valor BRL:', Math.round(amount * exchangeRate * 100));
        console.log('[PIX] 🔗 Success URL PIX:', `http://localhost:5173/student/dashboard/pix-payment-success?session_id={CHECKOUT_SESSION_ID}`);
        
      } catch (apiError) {
        console.error('[stripe-checkout-selection-process-fee] ❌ Erro na API externa:', apiError);
        exchangeRate = 5.6; // Taxa de fallback
        console.log('[stripe-checkout-selection-process-fee] 💱 Usando taxa de fallback:', exchangeRate);
      }
    }

    // Se o frontend enviou um amount específico (incluindo dependentes), usar esse valor
    if (amount && typeof amount === 'number' && amount > 0) {
      const finalAmount = Math.round(amount * 100); // Converter para centavos
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd', // BRL para PIX, USD para cartões
            product_data: {
              name: 'Selection Process Fee',
              description: userPackageFees ? `Selection Process Fee - ${userPackageFees.package_name}` : 'Selection Process Fee',
            },
            unit_amount: payment_method === 'pix' ? Math.round(finalAmount * exchangeRate) : finalAmount, // Conversão manual para PIX
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-selection-process-fee] 💰 USANDO VALOR ENVIADO PELO FRONTEND');
      console.log('[stripe-checkout-selection-process-fee] 💰 Valor enviado:', amount);
      console.log('[stripe-checkout-selection-process-fee] 💰 Valor em centavos:', finalAmount);
      console.log('[stripe-checkout-selection-process-fee] 💰 Inclui dependentes: SIM');
    }
    // Se o usuário tem pacote mas não foi enviado amount, usar preço dinâmico do pacote
    else if (userPackageFees) {
      const dynamicAmount = Math.round(userPackageFees.selection_process_fee * 100); // Converter para centavos
      sessionConfig.line_items = [
        {
          price_data: {
            currency: payment_method === 'pix' ? 'brl' : 'usd', // BRL para PIX, USD para cartões
            product_data: {
              name: 'Selection Process Fee',
              description: `Selection Process Fee - ${userPackageFees.package_name}`,
            },
            unit_amount: payment_method === 'pix' ? Math.round(dynamicAmount * exchangeRate) : dynamicAmount, // Conversão manual para PIX
          },
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-selection-process-fee] 💰 USANDO PREÇO DINÂMICO DO PACOTE');
      console.log('[stripe-checkout-selection-process-fee] 💰 Valor do pacote:', userPackageFees.selection_process_fee);
      console.log('[stripe-checkout-selection-process-fee] 💰 Valor em centavos:', dynamicAmount);
      console.log('[stripe-checkout-selection-process-fee] 💰 Nome do pacote:', userPackageFees.package_name);
      console.log('[stripe-checkout-selection-process-fee] ⚠️ ATENÇÃO: Não inclui dependentes - usar amount do frontend');
    } else {
      // Usar preço fixo do Stripe
      sessionConfig.line_items = [
        {
          price: price_id,
          quantity: 1,
        },
      ];
      console.log('[stripe-checkout-selection-process-fee] ⚠️ USANDO PRICE_ID PADRÃO');
      console.log('[stripe-checkout-selection-process-fee] ⚠️ Motivo: Usuário não tem pacote ou pacote não encontrado');
      console.log('[stripe-checkout-selection-process-fee] ⚠️ Price ID:', price_id);
    }

    console.log('[stripe-checkout-selection-process-fee] ⚙️ Configuração da sessão Stripe:', sessionConfig);

    // Aplica desconto se houver
    if (activeDiscount && activeDiscount.stripe_coupon_id) {
      console.log('[stripe-checkout-selection-process-fee] �� APLICANDO DESCONTO');
      console.log('[stripe-checkout-selection-process-fee] Coupon ID:', activeDiscount.stripe_coupon_id);
      console.log('[stripe-checkout-selection-process-fee] Discount Amount:', activeDiscount.discount_amount);
      
      let couponId = activeDiscount.stripe_coupon_id;
      let discountAmount = activeDiscount.discount_amount;
      
      // ✅ NOVO: Se for PIX, criar cupom em BRL
      if (payment_method === 'pix') {
        console.log('[PIX] 💰 Criando cupom específico para BRL');
        couponId = `MATR_BRL_${activeDiscount.affiliate_code}`;
        discountAmount = Math.round(activeDiscount.discount_amount * exchangeRate); // USD → BRL
        
        console.log('[PIX] 💰 Desconto USD:', activeDiscount.discount_amount);
        console.log('[PIX] 💰 Desconto BRL:', discountAmount);
        console.log('[PIX] 💰 Taxa de câmbio:', exchangeRate);
      }
      
      // Verificar se o cupom existe no Stripe antes de usar
      let couponExists = false;
      try {
        await stripe.coupons.retrieve(couponId);
        couponExists = true;
        console.log('[stripe-checkout-selection-process-fee] ✅ Cupom existe no Stripe');
      } catch (couponError: any) {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Cupom não existe no Stripe:', couponError.message);
        
        // Se o cupom não existe, criar um novo
        try {
          console.log('[stripe-checkout-selection-process-fee] 🔧 Criando novo cupom no Stripe...');
          const newCoupon = await stripe.coupons.create({
            id: couponId,
            amount_off: discountAmount * 100,
            currency: payment_method === 'pix' ? 'brl' : 'usd',
            duration: 'once',
            name: `Matricula Rewards - ${activeDiscount.affiliate_code}${payment_method === 'pix' ? ' (BRL)' : ''}`,
            metadata: { 
              affiliate_code: activeDiscount.affiliate_code, 
              user_id: user.id, 
              referrer_id: activeDiscount.referrer_id,
              payment_method: payment_method || 'stripe',
              original_amount_usd: activeDiscount.discount_amount
            }
          });
          
          console.log('[stripe-checkout-selection-process-fee] ✅ Novo cupom criado:', newCoupon.id);
          couponExists = true;
        } catch (createError: any) {
          console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao criar cupom:', createError.message);
          // Se não conseguir criar o cupom, continua sem desconto
        }
      }
      
      if (couponExists) {
        sessionConfig.discounts = [{ coupon: couponId }];
        // Remove allow_promotion_codes quando há desconto aplicado
        delete sessionConfig.allow_promotion_codes;
        
        sessionMetadata.referral_discount = true;
        sessionMetadata.affiliate_code = activeDiscount.affiliate_code;
        sessionMetadata.referrer_id = activeDiscount.referrer_id;
        sessionMetadata.discount_amount = activeDiscount.discount_amount; // Manter USD original
        
        if (payment_method === 'pix') {
          sessionMetadata.discount_amount_brl = discountAmount;
        }
        
        console.log('[stripe-checkout-selection-process-fee] ✅ Desconto aplicado na sessão!');
        console.log('[stripe-checkout-selection-process-fee] 📋 Metadata atualizada:', sessionMetadata);
      } else {
        console.log('[stripe-checkout-selection-process-fee] ⚠️ Não foi possível aplicar desconto - cupom não disponível');
      }
    } else {
      console.log('[stripe-checkout-selection-process-fee] ⚠️ Nenhum desconto para aplicar');
      // Códigos promocionais removidos - não permitir entrada manual de cupons
    }

    console.log('[stripe-checkout-selection-process-fee] 🚀 Criando sessão do Stripe...');
    
    try {
      const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('[stripe-checkout-selection-process-fee] ✅ Sessão Stripe criada com sucesso!');
    console.log('[stripe-checkout-selection-process-fee] Session ID:', session.id);
    console.log('[stripe-checkout-selection-process-fee] Session URL:', session.url);
    
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
      console.log('[stripe-checkout-selection-process-fee] Metadata da sessão:', session.metadata);

      // Log the checkout session creation
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', user.id).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'checkout_session_created',
            p_action_description: `Stripe checkout session created for Selection Process Fee (${session.id})`,
            p_performed_by: user.id,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'selection_process',
              payment_method: 'stripe',
              session_id: session.id,
              amount: amount,
              has_discount: activeDiscount ? true : false,
              discount_amount: activeDiscount?.discount_amount || 0,
              package_name: userPackageFees?.package_name || null
            }
          });
        }
      } catch (logError) {
        console.error('Failed to log checkout session creation:', logError);
      }

      return corsResponse({ session_url: session.url }, 200);
    } catch (stripeError: any) {
      console.error('[stripe-checkout-selection-process-fee] ❌ Erro ao criar sessão Stripe:', stripeError);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Type:', stripeError.type);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Message:', stripeError.message);
      console.error('[stripe-checkout-selection-process-fee] Stripe Error Code:', stripeError.code);
      
      return corsResponse({ 
        error: 'Failed to create Stripe checkout session',
        details: stripeError.message,
        code: stripeError.code 
      }, 500);
    }

  } catch (error: any) {
    console.error('[stripe-checkout-selection-process-fee] ❌ Erro geral na função:', error);
    console.error('[stripe-checkout-selection-process-fee] Error Stack:', error.stack);
    console.error('[stripe-checkout-selection-process-fee] Error Message:', error.message);
    
    return corsResponse({ 
      error: 'Internal server error',
      details: error.message 
    }, 500);
  }
});