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

    const { price_id, success_url, cancel_url, mode, metadata, payment_method } = await req.json();
    
    // Garantir que payment_method tenha um valor padrão
    const finalPaymentMethod = payment_method || 'stripe';
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsResponse({ error: 'Invalid token' }, 401);
    }

    console.log('[stripe-checkout-application-fee] Received payload:', { price_id, success_url, cancel_url, mode, metadata });
    console.log('[stripe-checkout-application-fee] Metadata recebido:', metadata);
    console.log('[stripe-checkout-application-fee] selected_scholarship_id no metadata:', metadata?.selected_scholarship_id);

    // Lógica para PIX (conversão USD -> BRL)
    let exchangeRate = 1;

    // Busca o perfil do usuário para obter o user_profiles.id correto e informações de dependentes
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, system_type, dependents')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('[stripe-checkout-application-fee] User profile not found:', profileError);
      return corsResponse({ error: 'User profile not found' }, 404);
    }

    // Verifica se application_id foi fornecido
    let applicationId = metadata?.application_id;
    if (!applicationId) {
      return corsResponse({ error: 'Application ID is required in metadata' }, 400);
    }

    // Verifica se a aplicação existe e pertence ao usuário (usando userProfile.id)
    let { data: application, error: appError } = await supabase
      .from('scholarship_applications')
      .select('id, student_id, scholarship_id, student_process_type')
      .eq('id', applicationId)
      .eq('student_id', userProfile.id)
      .single();

    // NOTA: Não validamos deadline aqui porque se o aluno chegou até aqui para pagar,
    // significa que já foi aprovado e a bolsa já foi reservada para ele.
    // A validação de deadline deve acontecer apenas no momento de selecionar/adicionar ao carrinho.

    // Se a aplicação não existe, tenta criar uma nova
    if (appError || !application) {
      console.log('[stripe-checkout-application-fee] Application not found, attempting to create new one');
      
      // Extrai scholarship_id do metadata se disponível
      const scholarshipId = metadata?.selected_scholarship_id || metadata?.scholarship_id;
      if (!scholarshipId) {
        console.error('[stripe-checkout-application-fee] No scholarship_id in metadata to create application');
        return corsResponse({ error: 'Application not found and scholarship_id missing to create new one' }, 404);
      }

      // Preparar dados da aplicação incluindo student_process_type se disponível
      const applicationData: any = {
        student_id: userProfile.id,
        scholarship_id: scholarshipId,
        status: 'pending',
        applied_at: new Date().toISOString(),
      };

      console.log('[stripe-checkout-application-fee] Dados da aplicação a serem criados:', applicationData);
      console.log('[stripe-checkout-application-fee] scholarshipId extraído:', scholarshipId);

      // Adicionar student_process_type se disponível no metadata
      if (metadata?.student_process_type) {
        applicationData.student_process_type = metadata.student_process_type;
        console.log('[stripe-checkout-application-fee] Adding student_process_type:', metadata.student_process_type);
      }

      // Cria nova aplicação usando userProfile.id (correto)
      const { data: newApp, error: insertError } = await supabase
        .from('scholarship_applications')
        .insert(applicationData)
        .select('id, student_id, scholarship_id, student_process_type')
        .single();

      if (insertError || !newApp) {
        console.error('[stripe-checkout-application-fee] Error creating application:', insertError);
        return corsResponse({ error: 'Failed to create application' }, 500);
      }

      application = newApp;
      applicationId = newApp.id;
      console.log('[stripe-checkout-application-fee] New application created:', application.id);
    } else {
      console.log('[stripe-checkout-application-fee] Application verified:', application.id);
      
      // Se a aplicação existe mas não tem student_process_type, atualiza se disponível
      if (!application.student_process_type && metadata?.student_process_type) {
        console.log('[stripe-checkout-application-fee] Updating existing application with student_process_type:', metadata.student_process_type);
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ student_process_type: metadata.student_process_type })
          .eq('id', application.id);
        
        if (updateError) {
          console.error('[stripe-checkout-application-fee] Error updating student_process_type:', updateError);
        }
      }
    }

    // Buscar valor da taxa da bolsa (SEM platform fee)
    let applicationFeeAmount = 350.00; // Valor padrão como fallback
    let universityId = null;
    let stripeConnectAccountId = null;
    
    // Application fee sempre usa o valor da universidade (não muda com pacotes)
    console.log('[stripe-checkout-application-fee] Buscando dados da bolsa para scholarship_id:', application.scholarship_id);
    
    if (application.scholarship_id) {
      try {
        // Buscar dados da bolsa incluindo universidade
        const { data: scholarshipData, error: scholarshipError } = await supabase
          .from('scholarships')
          .select('id, university_id, application_fee_amount')
          .eq('id', application.scholarship_id)
          .single();
        
        console.log('[stripe-checkout-application-fee] Resultado da busca da bolsa:', {
          scholarshipData,
          scholarshipError,
          scholarshipId: application.scholarship_id
        });
        
        if (!scholarshipError && scholarshipData) {
          // O valor já está em dólares no banco
          applicationFeeAmount = scholarshipData.application_fee_amount || 0.50;
          universityId = scholarshipData.university_id;
          
          console.log('[stripe-checkout-application-fee] Valores extraídos da bolsa:', {
            originalAmount: scholarshipData.application_fee_amount,
            applicationFeeAmount,
            universityId
          });
          
          // Buscar conta Stripe Connect da universidade
          if (universityId) {
            const { data: universityConfig, error: configError } = await supabase
              .from('university_fee_configurations')
              .select('stripe_connect_account_id, stripe_charges_enabled')
              .eq('university_id', universityId)
              .single();
            
            if (!configError && universityConfig?.stripe_connect_account_id && universityConfig?.stripe_charges_enabled) {
              stripeConnectAccountId = universityConfig.stripe_connect_account_id;
              console.log('[stripe-checkout-application-fee] Conta Stripe Connect encontrada:', stripeConnectAccountId);
            } else {
              console.log('[stripe-checkout-application-fee] Universidade não tem conta Connect ativa:', configError);
            }
          }
          
          console.log('[stripe-checkout-application-fee] Dados da bolsa encontrados:', {
            applicationFeeAmount,
            universityId,
            stripeConnectAccountId
          });
        } else {
          console.log('[stripe-checkout-application-fee] Usando valores padrão (bolsa não encontrada):', scholarshipError);
        }
      } catch (error) {
        console.error('[stripe-checkout-application-fee] Erro ao buscar dados da bolsa:', error);
        console.log('[stripe-checkout-application-fee] Usando valores padrão como fallback');
      }
    } else {
      console.log('[stripe-checkout-application-fee] Nenhum scholarship_id encontrado na aplicação');
    }

    // Adicionar custo por dependente apenas para sistema legacy
    const systemType = userProfile.system_type || 'legacy';
    const dependents = Number(userProfile.dependents) || 0;
    
    console.log('[stripe-checkout-application-fee] Informações do estudante:', {
      systemType,
      dependents,
      baseApplicationFee: applicationFeeAmount
    });
    
    if (systemType === 'legacy' && dependents > 0) {
      const dependentsCost = dependents * 100; // $100 por dependente
      applicationFeeAmount += dependentsCost;
      console.log(`[stripe-checkout-application-fee] ✅ Adicionado $${dependentsCost} por ${dependents} dependente(s). Novo valor: $${applicationFeeAmount}`);
    } else {
      console.log('[stripe-checkout-application-fee] Sem custo adicional de dependentes (sistema:', systemType, ', dependentes:', dependents, ')');
    }

    // Garantir valor mínimo de $0.50 USD
    const minAmount = 0.50;
    if (applicationFeeAmount < minAmount) {
      console.log(`[stripe-checkout-application-fee] Valor muito baixo (${applicationFeeAmount}), ajustando para mínimo: ${minAmount}`);
      applicationFeeAmount = minAmount;
    }
    
    // Valor base (sem markup) - usado para comissões
    const baseAmount = applicationFeeAmount;
    
    console.log('[stripe-checkout-application-fee] Valores finais calculados:', {
      originalAmount: applicationFeeAmount,
      baseAmount,
      stripeConnectAccountId
    });

    // Monta o metadata para o Stripe (valores base serão atualizados após cálculo do markup)
    const sessionMetadata: any = {
      ...metadata, // Primeiro o metadata recebido
      student_id: user.id,
      fee_type: 'application_fee',
      application_id: applicationId,
      student_process_type: application?.student_process_type || metadata?.student_process_type || null,
      application_fee_amount: applicationFeeAmount.toString(),
      base_amount: baseAmount.toString(), // Valor base para comissões
      university_id: universityId,
      stripe_connect_account_id: stripeConnectAccountId,
      selected_scholarship_id: application.scholarship_id,
      payment_method: finalPaymentMethod, // Adicionar método de pagamento
      exchange_rate: exchangeRate.toString(), // Adicionar taxa de câmbio para PIX
    };

    console.log('[stripe-checkout-application-fee] Metadata final configurado:', sessionMetadata);
    if (finalPaymentMethod === 'pix') {
      console.log('[PIX] 🇧🇷 PIX selecionado para Application Fee - Configurando sessão PIX...');
      console.log('[PIX] 💰 Valor USD:', applicationFeeAmount);
      try {
        console.log('[stripe-checkout-application-fee] 💱 Obtendo taxa de câmbio com margem comercial...');
        
        // Usar API externa com margem comercial (mais realista que Stripe)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
          const data = await response.json();
          const baseRate = parseFloat(data.rates.BRL);
          
          // Aplicar margem comercial (3-5% acima da taxa oficial)
          exchangeRate = baseRate * 1.04; // 4% de margem
          console.log('[stripe-checkout-application-fee] 💱 Taxa base (ExchangeRates-API):', baseRate);
          console.log('[stripe-checkout-application-fee] 💱 Taxa com margem comercial (+4%):', exchangeRate);
        } else {
          throw new Error('API externa falhou');
        }
        
        // Logs específicos para PIX após cálculo da taxa
        console.log('[PIX] 💱 Taxa de conversão:', exchangeRate);
        console.log('[PIX] 💰 Valor BRL:', Math.round(applicationFeeAmount * exchangeRate * 100));
        console.log('[PIX] 🔗 Success URL PIX:', `${success_url}`);
        
      } catch (apiError) {
        console.error('[stripe-checkout-application-fee] ❌ Erro na API externa:', apiError);
        exchangeRate = 5.6; // Taxa de fallback
        console.log('[stripe-checkout-application-fee] 💱 Usando taxa de fallback:', exchangeRate);
      }
    }

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
      if (finalPaymentMethod === 'pix') {
        // Para PIX: calcular markup considerando taxa de câmbio
        grossAmountInCents = calculatePIXAmountWithFees(baseAmount, exchangeRate);
      } else {
        // Para cartão: calcular markup
        grossAmountInCents = calculateCardAmountWithFees(baseAmount);
      }
      console.log('[stripe-checkout-application-fee] ✅ Markup ATIVADO (ambiente:', config.environment.environment, ')');
    } else {
      // Sem markup: usar valor original
      if (finalPaymentMethod === 'pix') {
        grossAmountInCents = Math.round(baseAmount * exchangeRate * 100);
      } else {
        grossAmountInCents = Math.round(baseAmount * 100);
      }
      console.log('[stripe-checkout-application-fee] ⚠️ Markup DESATIVADO (ambiente:', config.environment.environment, ')');
    }
    
    // Atualizar metadata com valores gross e fee
    sessionMetadata.gross_amount = (grossAmountInCents / 100).toString();
    sessionMetadata.fee_type = shouldApplyMarkup ? 'stripe_processing' : 'none';
    sessionMetadata.fee_amount = shouldApplyMarkup ? ((grossAmountInCents / 100) - baseAmount).toString() : '0';
    sessionMetadata.markup_enabled = shouldApplyMarkup.toString();
    
    console.log('[stripe-checkout-application-fee] 💰 Valores calculados:', {
      baseAmount,
      grossAmount: grossAmountInCents / 100,
      feeAmount: shouldApplyMarkup ? (grossAmountInCents / 100) - baseAmount : 0,
      grossAmountInCents,
      markupEnabled: shouldApplyMarkup
    });

    // Configuração da sessão Stripe
    const sessionConfig: any = {
      payment_method_types: finalPaymentMethod === 'pix' ? ['pix'] : ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: finalPaymentMethod === 'pix' ? 'brl' : 'usd',
            product_data: {
              name: 'Application Fee',
              description: `Application fee for scholarship application`,
            },
            unit_amount: grossAmountInCents, // Valor com markup já calculado
          },
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: finalPaymentMethod === 'pix' 
        ? `${success_url}&pix_payment=true`
        : success_url,
      cancel_url: cancel_url, // Mesma página de erro para PIX e Stripe
      metadata: sessionMetadata,
    };

    // Se tiver conta Stripe Connect, usar conta da universidade (sem platform fee)
    if (stripeConnectAccountId) {
      console.log('[stripe-checkout-application-fee] Configurando Checkout Session com Stripe Connect (100% para universidade)');
      
      // Adicionar informações do Connect no metadata
      sessionMetadata.stripe_connect_account_id = stripeConnectAccountId;
      sessionMetadata.requires_transfer = 'true';
      // Transferir o valor base (sem markup) para a universidade
      sessionMetadata.transfer_amount = Math.round(baseAmount * 100).toString(); // 100% do valor base para a universidade
      
      console.log('[stripe-checkout-application-fee] Metadata configurado para webhook:', {
        stripe_connect_account_id: stripeConnectAccountId,
        transfer_amount: Math.round(baseAmount * 100),
        base_amount: baseAmount,
        requires_transfer: true
      });
    } else {
      console.log('[stripe-checkout-application-fee] Usando conta padrão (sem Connect)');
    }

    // Criar sessão Stripe (sempre usando Checkout Session)
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    console.log('[stripe-checkout-application-fee] Created Stripe session:', {
      sessionId: session.id,
      amount: applicationFeeAmount,
      grossAmountInCents,
      metadata: session.metadata,
      hasStripeConnect: !!stripeConnectAccountId,
      fullAmountToUniversity: true
    });

    // Log the checkout session creation
    try {
      await supabase.rpc('log_student_action', {
        p_student_id: userProfile.id,
        p_action_type: 'checkout_session_created',
        p_action_description: `Stripe checkout session created for Application Fee (${session.id})`,
        p_performed_by: user.id,
        p_performed_by_type: 'student',
        p_metadata: {
          fee_type: 'application_fee',
          payment_method: finalPaymentMethod,
          session_id: session.id,
          amount: applicationFeeAmount,
          application_id: applicationId,
          scholarship_id: application.scholarship_id,
          university_id: universityId,
          has_stripe_connect: !!stripeConnectAccountId
        }
      });
    } catch (logError) {
      console.error('Failed to log checkout session creation:', logError);
    }

    return corsResponse({ session_url: session.url }, 200);
  } catch (error) {
    console.error('Checkout error:', error);
    console.error('[stripe-checkout-application-fee] Erro detalhado:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 