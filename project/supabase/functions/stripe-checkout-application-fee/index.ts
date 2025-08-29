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

    const { price_id, success_url, cancel_url, mode, metadata } = await req.json();
    
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

    // Busca o perfil do usuário para obter o user_profiles.id correto
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id')
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
          // O valor já está em centavos no banco, converter para dólares
          const feeAmountInCents = scholarshipData.application_fee_amount || 35000;
          applicationFeeAmount = feeAmountInCents / 100; // Converter centavos para dólares
          universityId = scholarshipData.university_id;
          
          console.log('[stripe-checkout-application-fee] Valores extraídos da bolsa:', {
            originalAmountInCents: feeAmountInCents,
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

    // Calcular valor em centavos para o Stripe
    const amountInCents = Math.round(applicationFeeAmount * 100);
    
    console.log('[stripe-checkout-application-fee] Valores finais calculados:', {
      originalAmount: applicationFeeAmount,
      amountInCents,
      stripeConnectAccountId
    });

    // Monta o metadata para o Stripe
    const sessionMetadata = {
      ...metadata, // Primeiro o metadata recebido
      student_id: user.id,
      fee_type: 'application_fee',
      application_id: applicationId,
      student_process_type: application?.student_process_type || metadata?.student_process_type || null,
      application_fee_amount: applicationFeeAmount.toString(),
      university_id: universityId,
      stripe_connect_account_id: stripeConnectAccountId,
      selected_scholarship_id: application.scholarship_id,
    };

    console.log('[stripe-checkout-application-fee] Metadata final configurado:', sessionMetadata);

    // Configuração da sessão Stripe
    const sessionConfig: any = {
      payment_method_types: ['card'],
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Application Fee',
              description: `Application fee for scholarship application`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: mode || 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: sessionMetadata,
    };

    // Se tiver conta Stripe Connect, usar conta da universidade (sem platform fee)
    if (stripeConnectAccountId) {
      console.log('[stripe-checkout-application-fee] Configurando Checkout Session com Stripe Connect (100% para universidade)');
      
      // Adicionar informações do Connect no metadata
      sessionMetadata.stripe_connect_account_id = stripeConnectAccountId;
      sessionMetadata.requires_transfer = 'true';
      sessionMetadata.transfer_amount = amountInCents.toString(); // 100% do valor para a universidade
      
      console.log('[stripe-checkout-application-fee] Metadata configurado para webhook:', {
        stripe_connect_account_id: stripeConnectAccountId,
        transfer_amount: amountInCents,
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
      amountInCents,
      metadata: session.metadata,
      hasStripeConnect: !!stripeConnectAccountId,
      fullAmountToUniversity: true
    });

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