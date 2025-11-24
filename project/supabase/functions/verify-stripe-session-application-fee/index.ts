import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
function getCurrencyInfo(session) {
  const currency = session.currency?.toLowerCase() || 'usd';
  const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
  
  // Se for PIX ou currency for BRL, usar Real
  if (currency === 'brl' || isPix) {
    return {
      currency: 'BRL',
      symbol: 'R$',
      code: 'brl'
    };
  }
  
  // Caso contrário, usar Dólar
  return {
    currency: 'USD',
    symbol: '$',
    code: 'usd'
  };
}

// Função auxiliar para formatar valor com moeda
function formatAmountWithCurrency(amount, session) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

function corsResponse(body, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };
  if (status === 204) {
    return new Response(null, {
      status,
      headers
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers
    }
  });
}
Deno.serve(async (req)=>{
  console.log('--- verify-stripe-session-application-fee: Request received ---');
  console.log('--- TESTE: Edge Function funcionando ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({
      error: 'Method Not Allowed'
    }, 405);
    
    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-04-10',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0'
      }
    });
    
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({
      error: 'Session ID is required'
    }, 400);
    console.log(`Verifying session ID: ${sessionId}`);
    
    // Verificar se esta sessão já foi processada para evitar duplicação
    const { data: existingLog } = await supabase
      .from('student_action_logs')
      .select('id')
      .eq('action_type', 'fee_payment')
      .eq('metadata->>session_id', sessionId)
      .single();
    
    if (existingLog) {
      console.log(`[DUPLICAÇÃO] Session ${sessionId} já foi processada, retornando sucesso sem reprocessar.`);
      return corsResponse({
        status: 'complete',
        message: 'Session already processed successfully.'
      }, 200);
    }
    
    // Expandir payment_intent para obter o ID completo
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    console.log('Session metadata:', session.metadata);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const paymentMethod = session.metadata?.payment_method || 'stripe';
      const applicationId = session.metadata?.application_id;
      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}, PaymentMethod: ${paymentMethod}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      if (!applicationId) return corsResponse({
        error: 'Application ID missing in session metadata.'
      }, 400);
      // Busca o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', userId).single();
      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return corsResponse({
          error: 'User profile not found'
        }, 404);
      }
      console.log(`User profile found: ${userProfile.id} for auth user: ${userId}`);
      
      // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `Application Fee payment processing started (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'application',
            payment_method: 'stripe',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            session_id: sessionId,
            application_id: applicationId,
            processing_started: true
          }
        });
        console.log('[DUPLICAÇÃO] Log de processamento criado para evitar duplicação');
      } catch (logError) {
        // Se falhar ao criar log, verificar novamente se já existe (race condition)
        const { data: recheckLog } = await supabase
          .from('student_action_logs')
          .select('id')
          .eq('action_type', 'fee_payment')
          .eq('metadata->>session_id', sessionId)
          .single();
        
        if (recheckLog) {
          console.log(`[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already being processed.'
          }, 200);
        }
        console.error('[DUPLICAÇÃO] Erro ao criar log, mas continuando processamento:', logError);
      }
      // Verifica se a aplicação existe e pertence ao usuário (usando userProfile.id)
      const { data: application, error: fetchError } = await supabase.from('scholarship_applications').select('id, student_id, scholarship_id, student_process_type, status').eq('id', applicationId).eq('student_id', userProfile.id).single();
      if (fetchError || !application) {
        console.error('Application not found:', fetchError);
        return corsResponse({
          error: 'Application not found or access denied'
        }, 404);
      }
      console.log('Application found:', application);
      // Preparar dados para atualização
      const updateData = {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        is_application_fee_paid: true,
        application_fee_payment_method: paymentMethod || 'stripe'
      };
      // Preservar o status atual se já estiver 'approved' (universidade já aprovou)
      console.log(`[verify-stripe-session-application-fee] Current application status: '${application.status}' for user ${userId}, application ${applicationId}.`);
      if (application.status !== 'approved') {
        updateData.status = 'under_review';
        console.log(`[verify-stripe-session-application-fee] Application status set to 'under_review' for user ${userId}, application ${applicationId}.`);
      } else {
        console.log(`[verify-stripe-session-application-fee] Preserving 'approved' status for user ${userId}, application ${applicationId} (university already approved).`);
      }
      // Se student_process_type não existe na aplicação, tentar obter dos metadados da sessão
      if (!application.student_process_type && session.metadata?.student_process_type) {
        updateData.student_process_type = session.metadata.student_process_type;
        console.log('Adding student_process_type from session metadata:', session.metadata.student_process_type);
      }
      // Atualiza a aplicação
      console.log(`Updating application ${applicationId} with data:`, updateData);
      const { error: updateError } = await supabase.from('scholarship_applications').update(updateData).eq('id', applicationId).eq('student_id', userProfile.id);
      if (updateError) {
        console.error('Failed to update application status:', updateError);
        console.error('Update data that failed:', updateData);
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }
      
      // Verificar se a atualização foi bem-sucedida
      const { data: updatedApplication, error: verifyError } = await supabase
        .from('scholarship_applications')
        .select('id, application_fee_payment_method, is_application_fee_paid, payment_status')
        .eq('id', applicationId)
        .single();
      
      if (verifyError) {
        console.error('Failed to verify update:', verifyError);
      } else {
        console.log('Application updated successfully:', updatedApplication);
      }
      if (updateData.status) {
        console.log(`Application status updated to '${updateData.status}' with payment info`);
      } else {
        console.log('Application payment info updated (status preserved)');
      }
      // Buscar documentos do user_profiles e vincular à application (usando userId para user_profiles)
      const { data: userProfileDocs, error: userProfileError } = await supabase.from('user_profiles').select('documents').eq('user_id', userId).single();
      if (userProfileError) {
        console.error('Failed to fetch user profile documents:', userProfileError);
      } else if (userProfileDocs?.documents) {
        const documents = Array.isArray(userProfileDocs.documents) ? userProfileDocs.documents : [];
        let formattedDocuments = documents;
        // Se for array de strings (URLs), converter para array de objetos completos
        if (documents.length > 0 && typeof documents[0] === 'string') {
          const docTypes = [
            'passport',
            'diploma',
            'funds_proof'
          ];
          formattedDocuments = documents.map((url, idx)=>({
              type: docTypes[idx] || `doc${idx + 1}`,
              url,
              uploaded_at: new Date().toISOString()
            }));
        }
        if (formattedDocuments.length > 0) {
          const { error: docUpdateError } = await supabase.from('scholarship_applications').update({
            documents: formattedDocuments
          }).eq('id', applicationId).eq('student_id', userProfile.id);
          if (docUpdateError) {
            console.error('Failed to update application documents:', docUpdateError);
          } else {
            console.log('Application documents updated');
          }
        }
      }
      // Atualiza perfil do usuário para marcar que pagou a application fee
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_application_fee_paid: true,
        last_payment_date: new Date().toISOString()
      }).eq('user_id', userId);
      if (profileUpdateError) {
        console.error('Failed to update user_profiles:', profileUpdateError);
        throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);
      }
      console.log('User profile updated - application fee paid');

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        // Obter payment_intent_id: pode ser string ou objeto PaymentIntent
        let paymentIntentId = '';
        if (typeof session.payment_intent === 'string') {
          paymentIntentId = session.payment_intent;
        } else if (session.payment_intent && typeof session.payment_intent === 'object' && 'id' in session.payment_intent) {
          paymentIntentId = (session.payment_intent as any).id;
        }
        
        // Para pagamentos PIX (BRL), buscar o valor líquido recebido em USD do BalanceTransaction
        // Sempre buscar o valor líquido, independente do ambiente
        const shouldFetchNetAmount = true;
        
        // Debug: Log das condições
        console.log(`[Individual Fee Payment] DEBUG - currency: ${currency}, paymentMethod: ${paymentMethod}, paymentIntentId: ${paymentIntentId}, shouldFetchNetAmount: ${shouldFetchNetAmount}, isProduction: ${config.environment.isProduction}`);
        
        let paymentAmount = paymentAmountRaw;
        let grossAmountUsd: number | null = null;
        let feeAmountUsd: number | null = null;
        
        if ((currency === 'BRL' || paymentMethod === 'pix') && paymentIntentId && shouldFetchNetAmount) {
          console.log(`✅ Buscando valor líquido, bruto e taxas do Stripe (ambiente: ${config.environment.environment})`);
          try {
            // Buscar PaymentIntent com latest_charge expandido para obter balance_transaction
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
              expand: ['latest_charge.balance_transaction']
            });
            
            if (paymentIntent.latest_charge) {
              const charge = typeof paymentIntent.latest_charge === 'string' 
                ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
                    expand: ['balance_transaction']
                  })
                : paymentIntent.latest_charge;
              
              if (charge.balance_transaction) {
                const balanceTransaction = typeof charge.balance_transaction === 'string'
                  ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                  : charge.balance_transaction;
                
                // O valor líquido (net) já está em USD e já considera taxas e conversão de moeda
                if (balanceTransaction.net && balanceTransaction.currency === 'usd') {
                  paymentAmount = balanceTransaction.net / 100; // net está em centavos
                  
                  // Buscar valor bruto (amount) em USD
                  if (balanceTransaction.amount && balanceTransaction.currency === 'usd') {
                    grossAmountUsd = balanceTransaction.amount / 100; // amount está em centavos
                    console.log(`[Individual Fee Payment] Valor bruto recebido do Stripe: ${grossAmountUsd} USD`);
                  }
                  
                  // Buscar taxas (fee) em USD
                  if (balanceTransaction.fee && balanceTransaction.currency === 'usd') {
                    feeAmountUsd = balanceTransaction.fee / 100; // fee está em centavos
                    console.log(`[Individual Fee Payment] Taxas recebidas do Stripe: ${feeAmountUsd} USD`);
                  }
                  
                  console.log(`[Individual Fee Payment] Valor líquido recebido do Stripe (após taxas e conversão): ${paymentAmount} USD`);
                  console.log(`[Individual Fee Payment] Valor bruto: ${grossAmountUsd || balanceTransaction.amount / 100} ${balanceTransaction.currency}, Taxas: ${feeAmountUsd || (balanceTransaction.fee || 0) / 100} ${balanceTransaction.currency}`);
                } else {
                  // Fallback: usar exchange_rate do metadata se disponível
                  if (session.metadata?.exchange_rate) {
                    const exchangeRate = parseFloat(session.metadata.exchange_rate);
                    if (exchangeRate > 0) {
                      paymentAmount = paymentAmountRaw / exchangeRate;
                      console.log(`[Individual Fee Payment] Usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                    }
                  }
                }
              } else {
                // Fallback: usar exchange_rate do metadata
                if (session.metadata?.exchange_rate) {
                  const exchangeRate = parseFloat(session.metadata.exchange_rate);
                  if (exchangeRate > 0) {
                    paymentAmount = paymentAmountRaw / exchangeRate;
                    console.log(`[Individual Fee Payment] BalanceTransaction não disponível, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                  }
                }
              }
            } else {
              // Fallback: usar exchange_rate do metadata
              if (session.metadata?.exchange_rate) {
                const exchangeRate = parseFloat(session.metadata.exchange_rate);
                if (exchangeRate > 0) {
                  paymentAmount = paymentAmountRaw / exchangeRate;
                  console.log(`[Individual Fee Payment] PaymentIntent sem charge, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                }
              }
            }
          } catch (stripeError) {
            console.error('[Individual Fee Payment] Erro ao buscar valor líquido do Stripe:', stripeError);
            // Fallback: usar exchange_rate do metadata
            if (session.metadata?.exchange_rate) {
              const exchangeRate = parseFloat(session.metadata.exchange_rate);
              if (exchangeRate > 0) {
                paymentAmount = paymentAmountRaw / exchangeRate;
                console.log(`[Individual Fee Payment] Erro ao buscar do Stripe, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
              }
            }
          }
        } else if ((currency === 'BRL' || paymentMethod === 'pix') && !shouldFetchNetAmount) {
          // Em produção (ou quando desativado), usar exchange_rate do metadata
          console.log(`⚠️ Busca de valor líquido DESATIVADA (ambiente: ${config.environment.environment}), usando exchange_rate do metadata`);
          if (session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              paymentAmount = paymentAmountRaw / exchangeRate;
              console.log(`[Individual Fee Payment] Usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
            }
          }
        } else if (currency === 'BRL' && session.metadata?.exchange_rate) {
          // Para outros pagamentos BRL (não PIX), usar exchange_rate do metadata
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            paymentAmount = paymentAmountRaw / exchangeRate;
            console.log(`[Individual Fee Payment] Convertendo BRL para USD: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
          }
        } else {
          // Debug: Se não entrou em nenhum bloco
          console.log(`[Individual Fee Payment] DEBUG - Não entrou em nenhum bloco de conversão. currency: ${currency}, paymentMethod: ${paymentMethod}, hasExchangeRate: ${!!session.metadata?.exchange_rate}`);
        }
        
        // ✅ Verificar se já existe registro com este payment_intent_id para evitar duplicação
        // IMPORTANTE: Fazer verificação dupla para evitar race conditions
        if (paymentIntentId) {
          // Primeira verificação
          const { data: existingPayment, error: checkError } = await supabase
            .from('individual_fee_payments')
            .select('id, payment_intent_id')
            .eq('payment_intent_id', paymentIntentId)
            .eq('fee_type', 'application')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (checkError) {
            console.warn('[Individual Fee Payment] Warning: Erro ao verificar duplicação:', checkError);
          } else if (existingPayment) {
            console.log(`[DUPLICAÇÃO] Payment já registrado em individual_fee_payments com payment_intent_id: ${paymentIntentId}, pulando inserção.`);
            // Não inserir novamente, mas continuar o fluxo normalmente
          } else {
            // ✅ SEGUNDA VERIFICAÇÃO imediatamente antes de inserir (para evitar race condition)
            const { data: doubleCheckPayment, error: doubleCheckError } = await supabase
              .from('individual_fee_payments')
              .select('id, payment_intent_id')
              .eq('payment_intent_id', paymentIntentId)
              .eq('fee_type', 'application')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (doubleCheckError) {
              console.warn('[Individual Fee Payment] Warning: Erro na segunda verificação de duplicação:', doubleCheckError);
            } else if (doubleCheckPayment) {
              console.log(`[DUPLICAÇÃO] Payment já registrado (segunda verificação) com payment_intent_id: ${paymentIntentId}, pulando inserção.`);
              // Não inserir novamente
            } else {
              // Não existe, pode inserir
              console.log('[Individual Fee Payment] Recording application fee payment...');
              console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD${grossAmountUsd ? `, Valor bruto: ${grossAmountUsd} USD` : ''}${feeAmountUsd ? `, Taxas: ${feeAmountUsd} USD` : ''}`);
              const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
                p_user_id: userId,
                p_fee_type: 'application',
                p_amount: paymentAmount, // Sempre em USD (líquido)
                p_payment_date: paymentDate,
                p_payment_method: 'stripe',
                p_payment_intent_id: paymentIntentId,
                p_stripe_charge_id: null,
                p_zelle_payment_id: null,
                p_gross_amount_usd: grossAmountUsd, // Valor bruto em USD (quando disponível)
                p_fee_amount_usd: feeAmountUsd // Taxas em USD (quando disponível)
              });
              
              if (insertError) {
                // Se o erro for de constraint única ou duplicação, verificar novamente
                if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
                  console.log(`[DUPLICAÇÃO] Erro de constraint única detectado, verificando se o registro foi criado por outra chamada...`);
                  const { data: finalCheckPayment } = await supabase
                    .from('individual_fee_payments')
                    .select('id, payment_intent_id')
                    .eq('payment_intent_id', paymentIntentId)
                    .eq('fee_type', 'application')
                    .eq('user_id', userId)
                    .maybeSingle();
                  
                  if (finalCheckPayment) {
                    console.log(`[DUPLICAÇÃO] Registro foi criado por outra chamada simultânea, continuando normalmente.`);
                  } else {
                    console.warn('[Individual Fee Payment] Warning: Erro ao inserir mas registro não encontrado:', insertError);
                  }
                } else {
                  console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
                }
              } else {
                console.log('[Individual Fee Payment] Application fee recorded successfully:', insertResult);
              }
            }
          }
        } else {
          console.warn('[Individual Fee Payment] Warning: payment_intent_id não disponível, não é possível verificar duplicação. Pulando inserção.');
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }
      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) {
        console.error('Failed to clear user_cart:', cartError);
      } else {
        console.log('User cart cleared');
      }
      
      // Verificar novamente se já foi processado ANTES de enviar notificações
      // (proteção adicional contra race conditions - verifica se há um log que foi criado há mais de 5 segundos)
      const { data: finalCheckLog } = await supabase
        .from('student_action_logs')
        .select('id, created_at, metadata')
        .eq('action_type', 'fee_payment')
        .eq('metadata->>session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (finalCheckLog && finalCheckLog.length > 0) {
        // Verificar se há um log que foi criado há mais de 5 segundos (indicando que o processamento já foi concluído)
        const now = new Date();
        const logsWithTime = finalCheckLog.filter(log => {
          const logTime = new Date(log.created_at);
          const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
          return secondsDiff > 5; // Log criado há mais de 5 segundos
        });
        
        if (logsWithTime.length > 0) {
          console.log(`[DUPLICAÇÃO] Log antigo detectado para session ${sessionId}, retornando sucesso para evitar duplicação.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already processed (old log detected)'
          }, 200);
        }
        
        // Se há múltiplos logs recentes (criados há menos de 5 segundos), verificar se algum deles tem notifications_sent
        // Isso indica que o processamento foi concluído e as notificações já foram enviadas
        const logsWithNotificationsSent = finalCheckLog.filter(log => {
          const metadata = log.metadata || {};
          return metadata.notifications_sent === true;
        });
        
        if (logsWithNotificationsSent.length > 0) {
          console.log(`[DUPLICAÇÃO] Log com notifications_sent detectado para session ${sessionId}, retornando sucesso para evitar duplicação.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already processed (notifications already sent)'
          }, 200);
        }
      }
      
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N (para PIX e cartão) ---
      try {
        console.log(`📤 [verify-stripe-session-application-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code e phone)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.'
          }, 200);
        }
        // Buscar dados da aplicação (já temos application.scholarship_id)
        const scholarshipId = application.scholarship_id;
        // Buscar dados da bolsa
        const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
        if (scholarshipError || !scholarship) throw new Error('Bolsa não encontrada para notificação');
        // Buscar dados da universidade
        const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
        if (univError || !universidade) throw new Error('Universidade não encontrada para notificação');
        const contact = universidade.contact || {};
        const emailUniversidade = contact.admissionsEmail || contact.email || '';
        
        // Preparar informações de moeda
        const currencyInfo = getCurrencyInfo(session);
        const amountValue = session.amount_total ? session.amount_total / 100 : (parseFloat(session.metadata?.amount || '10'));
        const formattedAmount = formatAmountWithCurrency(amountValue, session);
        
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const mensagemAluno = `O aluno ${alunoData.full_name} selecionou a bolsa "${scholarship.title}" da universidade ${universidade.name} e pagou a taxa de aplicação. Acesse o painel para revisar a candidatura.`;
        const alunoNotificationPayload = {
          tipo_notf: 'Novo pagamento de application fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemAluno,
          payment_amount: amountValue,
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
          notification_target: 'student'
        };
        console.log('[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno:', alunoNotificationPayload);
        const alunoNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(alunoNotificationPayload)
        });
        const alunoResult = await alunoNotificationResponse.text();
        console.log('[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):', alunoNotificationResponse.status, alunoResult);
        // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE
        const mensagemUniversidade = `O aluno ${alunoData.full_name} pagou a taxa de aplicação de ${formattedAmount} via Stripe para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Acesse o painel para revisar a candidatura.`;
        const universidadeNotificationPayload = {
          tipo_notf: 'Notificação para Universidade - Pagamento de Application Fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemUniversidade,
          payment_amount: amountValue,
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
          notification_target: 'university'
        };
        console.log('[NOTIFICAÇÃO UNIVERSIDADE] Enviando notificação para universidade:', universidadeNotificationPayload);
        const universidadeNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(universidadeNotificationPayload)
        });
        const universidadeResult = await universidadeNotificationResponse.text();
        console.log('[NOTIFICAÇÃO UNIVERSIDADE] Resposta do n8n (universidade):', universidadeNotificationResponse.status, universidadeResult);
        // 3. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-application-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-application-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-application-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
          // Query simplificada para evitar erro de relacionamento
          const { data: sellerData, error: sellerError } = await supabase.from('sellers').select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id
            `).eq('referral_code', alunoData.seller_referral_code).single();
          console.log(`📤 [verify-stripe-session-application-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            console.log(`📤 [verify-stripe-session-application-fee] Seller encontrado:`, sellerData);
            // Buscar telefone do seller
            const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
            const sellerPhone = sellerProfile?.phone || "";
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              email: "",
              name: "Affiliate Admin",
              phone: ""
            };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-application-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || ""
                  };
                  console.log(`📤 [verify-stripe-session-application-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // 3.1. NOTIFICAÇÃO PARA O SELLER
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_target: 'seller'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para seller:', sellerNotificationPayload);
            const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(sellerNotificationPayload)
            });
            if (sellerNotificationResponse.ok) {
              const sellerResult = await sellerNotificationResponse.text();
              console.log('📧 [verify-stripe-session-application-fee] Notificação para seller enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para seller:', sellerError);
            }
            // 3.2. NOTIFICAÇÃO PARA O AFFILIATE ADMIN (se existir)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de application fee confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone,
                nome_bolsa: scholarship.title,
                nome_universidade: universidade.name,
                o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: sessionId,
                fee_type: 'application',
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe",
                notification_target: 'affiliate_admin'
              };
              console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
              const affiliateNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(affiliateNotificationPayload)
              });
              if (affiliateNotificationResponse.ok) {
                const affiliateResult = await affiliateNotificationResponse.text();
                console.log('📧 [verify-stripe-session-application-fee] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para affiliate admin:', affiliateError);
              }
            }
            // 3.3. NOTIFICAÇÃO PARA O ADMIN
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_affiliate_admin: affiliateAdminData.email,
              nome_affiliate_admin: affiliateAdminData.name,
              phone_affiliate_admin: affiliateAdminData.phone,
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_target: 'admin'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para admin:', adminNotificationPayload);
            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(adminNotificationPayload)
            });
            if (adminNotificationResponse.ok) {
              const adminResult = await adminNotificationResponse.text();
              console.log('📧 [verify-stripe-session-application-fee] Notificação para admin enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para admin:', adminError);
            }
          } else {
            console.log(`📤 [verify-stripe-session-application-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
            
            // Notificação para admin quando NÃO há seller
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              email_universidade: emailUniversidade,
              o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}.`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              payment_method: 'stripe',
              notification_target: 'admin'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para admin da plataforma (sem seller):', adminNotificationPayload);
            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(adminNotificationPayload)
            });
            if (adminNotificationResponse.ok) {
              const adminResult = await adminNotificationResponse.text();
              console.log('📧 [verify-stripe-session-application-fee] Notificação para admin enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para admin:', adminError);
            }
          }
        } else {
          console.log(`📤 [verify-stripe-session-application-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
          
          // Notificação para admin quando NÃO há seller_referral_code
          const adminNotificationPayload = {
            tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
            email_admin: "admin@matriculausa.com",
            nome_admin: "Admin MatriculaUSA",
            phone_admin: adminPhone,
            email_aluno: alunoData.email,
            nome_aluno: alunoData.full_name,
            phone_aluno: alunoData.phone || "",
            nome_bolsa: scholarship.title,
            nome_universidade: universidade.name,
            email_universidade: emailUniversidade,
            o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}.`,
            payment_id: sessionId,
            fee_type: 'application',
            amount: amountValue,
            currency: currencyInfo.currency,
            currency_symbol: currencyInfo.symbol,
            formatted_amount: formattedAmount,
            payment_method: 'stripe',
            notification_target: 'admin'
          };
          console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para admin da plataforma (sem seller):', adminNotificationPayload);
          const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'PostmanRuntime/7.36.3'
            },
            body: JSON.stringify(adminNotificationPayload)
          });
          if (adminNotificationResponse.ok) {
            const adminResult = await adminNotificationResponse.text();
            console.log('📧 [verify-stripe-session-application-fee] Notificação para admin enviada com sucesso:', adminResult);
          } else {
            const adminError = await adminNotificationResponse.text();
            console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para admin:', adminError);
          }
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar application fee via n8n:', notifErr);
      }
      
      // Criar log DEPOIS das notificações para marcar que o processamento foi concluído
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `Application Fee paid via Stripe (${sessionId}) - Notifications sent`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'application',
              payment_method: 'stripe',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              application_id: applicationId,
              notifications_sent: true
            }
          });
          console.log('[DUPLICAÇÃO] Log de conclusão criado após envio de notificações');
        }
      } catch (logError) {
        console.error('Failed to log payment completion:', logError);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      
      // Para PIX, retornar resposta especial que força redirecionamento
      if (paymentMethod === 'pix') {
        console.log('[PIX] Forçando redirecionamento para PIX...');
        return corsResponse({
          status: 'complete',
          message: 'PIX payment verified and processed successfully.',
          payment_method: 'pix',
          redirect_required: true,
          redirect_url: 'http://localhost:5173/student/dashboard/application-fee-success'
        }, 200);
      }
      
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        applicationId: applicationId,
        studentProcessType: application.student_process_type || session.metadata?.student_process_type
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-application-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
