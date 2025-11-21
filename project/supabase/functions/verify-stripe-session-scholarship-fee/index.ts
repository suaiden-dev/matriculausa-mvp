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
  console.log('--- verify-stripe-session-scholarship-fee: Request received ---');
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
    
    // Expandir payment_intent para obter o ID completo
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
    if (existingLog) {
      console.log(`[DUPLICAÇÃO] Session ${sessionId} já foi processada, retornando sucesso sem reprocessar.`);
      // Mesmo sendo duplicação, ainda precisamos retornar os dados do pagamento
      // Extrair informações do pagamento
      const amountPaid = session.amount_total ? session.amount_total / 100 : null;
      const currency = session.currency?.toUpperCase() || 'USD';
      const promotionalCouponReturn = session.metadata?.promotional_coupon || null;
      const originalAmountReturn = session.metadata?.original_amount ? parseFloat(session.metadata.original_amount) : null;
      let finalAmountReturn: number | null = null;
      if (session.metadata?.final_amount) {
        const parsed = parseFloat(session.metadata.final_amount);
        if (!isNaN(parsed) && parsed > 0) {
          finalAmountReturn = parsed;
        }
      }
      
      let amountPaidUSD = amountPaid || 0;
      if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
        const exchangeRate = parseFloat(session.metadata.exchange_rate);
        if (exchangeRate > 0) {
          amountPaidUSD = amountPaid / exchangeRate;
        }
      }
      
      return corsResponse({
        status: 'complete',
        message: 'Session already processed successfully.',
        amount_paid: amountPaidUSD || amountPaid || 0,
        amount_paid_original: amountPaid || 0,
        currency: currency,
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn
      }, 200);
    }
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      // scholarships_ids pode ser um array ou string separada por vírgula
      const scholarshipsIds = session.metadata?.scholarships_ids;
      console.log(`Processing successful payment. UserID: ${userId}, ScholarshipsIDs: ${scholarshipsIds}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      if (!scholarshipsIds) return corsResponse({
        error: 'Scholarships IDs missing in session metadata.'
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
          p_action_description: `Scholarship Fee payment processing started (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'scholarship',
            payment_method: 'stripe',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            session_id: sessionId,
            scholarships_ids: scholarshipsIds,
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
      // Atualiza perfil do usuário para marcar que pagou a scholarship fee (usando userId para user_profiles)
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_scholarship_fee_paid: true
      }).eq('user_id', userId);
      if (profileUpdateError) throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);
      console.log('User profile updated - scholarship fee paid');

      // Registrar pagamento na tabela individual_fee_payments
      let individualFeePaymentId = null;
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        const paymentMethod = session.payment_method_types?.[0] || 'stripe';
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
        if (paymentIntentId) {
          const { data: existingPayment, error: checkError } = await supabase
            .from('individual_fee_payments')
            .select('id, payment_intent_id')
            .eq('payment_intent_id', paymentIntentId)
            .eq('fee_type', 'scholarship')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (checkError) {
            console.warn('[Individual Fee Payment] Warning: Erro ao verificar duplicação:', checkError);
          } else if (existingPayment) {
            console.log(`[DUPLICAÇÃO] Payment já registrado em individual_fee_payments com payment_intent_id: ${paymentIntentId}, pulando inserção.`);
            // Não inserir novamente, mas continuar o fluxo normalmente
            individualFeePaymentId = existingPayment.id;
          } else {
            // Não existe, pode inserir
            console.log('[Individual Fee Payment] Recording scholarship fee payment...');
            console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD${grossAmountUsd ? `, Valor bruto: ${grossAmountUsd} USD` : ''}${feeAmountUsd ? `, Taxas: ${feeAmountUsd} USD` : ''}`);
            
            // Usar gross_amount_usd como amount quando disponível (valor bruto que o aluno pagou)
            // Isso garante que o valor exibido seja sempre o valor bruto, não o líquido
            const amountToSave = grossAmountUsd || paymentAmount;
            
            const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
              p_user_id: userId,
              p_fee_type: 'scholarship',
              p_amount: amountToSave, // Valor bruto quando disponível, senão valor líquido
              p_payment_date: paymentDate,
              p_payment_method: 'stripe',
              p_payment_intent_id: paymentIntentId,
              p_stripe_charge_id: null,
              p_zelle_payment_id: null,
              p_gross_amount_usd: grossAmountUsd, // Valor bruto em USD (quando disponível)
              p_fee_amount_usd: feeAmountUsd // Taxas em USD (quando disponível)
            });
            
            if (insertError) {
              console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
            } else {
              console.log('[Individual Fee Payment] Scholarship fee recorded successfully:', insertResult);
              individualFeePaymentId = insertResult?.id || null;
            }
          }
        } else {
          console.warn('[Individual Fee Payment] Warning: payment_intent_id não disponível, não é possível verificar duplicação. Pulando inserção.');
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }

      // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

      // Atualiza status das aplicações relacionadas para 'approved' (usando userProfile.id)
      const scholarshipIdsArray = scholarshipsIds.split(',').map((id)=>id.trim());
      console.log(`Updating applications for student_id: ${userProfile.id}, scholarship_ids: ${scholarshipIdsArray}`);
      const { data: updatedApps, error: appError } = await supabase.from('scholarship_applications').update({
        status: 'approved',
        is_scholarship_fee_paid: true,
        scholarship_fee_payment_method: 'stripe'
      }).eq('student_id', userProfile.id).in('scholarship_id', scholarshipIdsArray).select('id');
      if (appError) throw new Error(`Failed to update scholarship_applications: ${appError.message}`);
      console.log('Scholarship applications updated to approved status');

      // Log the payment action
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `Scholarship Fee paid via Stripe (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'scholarship',
            payment_method: 'stripe',
            amount: session.amount_total / 100,
            session_id: sessionId,
            scholarship_ids: scholarshipIdsArray,
            updated_applications: updatedApps?.map(app => app.id) || []
          }
        });
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }
      
      // Verificar se é PIX - se for, não enviar notificações (já foram enviadas pelo webhook)
      const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
      if (isPixPayment) {
        console.log(`[NOTIFICAÇÃO] Pagamento via PIX detectado. Notificações já foram enviadas pelo webhook. Pulando envio de notificações para evitar duplicação.`);
        
        // Mesmo sendo PIX, ainda precisamos retornar os dados do pagamento
        // Extrair informações do pagamento para retornar ao frontend
        const amountPaid = session.amount_total ? session.amount_total / 100 : null;
        const currency = session.currency?.toUpperCase() || 'USD';
        const promotionalCouponReturn = session.metadata?.promotional_coupon || null;
        const originalAmountReturn = session.metadata?.original_amount ? parseFloat(session.metadata.original_amount) : null;
        let finalAmountReturn: number | null = null;
        if (session.metadata?.final_amount) {
          const parsed = parseFloat(session.metadata.final_amount);
          if (!isNaN(parsed) && parsed > 0) {
            finalAmountReturn = parsed;
          }
        }
        
        let amountPaidUSD = amountPaid || 0;
        if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            amountPaidUSD = amountPaid / exchangeRate;
          }
        }
        
        // Obter gross_amount_usd - PRIORIZAR valor do Stripe (balanceTransaction) se disponível
        // O valor do Stripe é o mais preciso pois é o valor real recebido
        let grossAmountUsdFromStripe: number | null = null;
        
        // Obter paymentIntentId para buscar valor do Stripe
        const paymentIntentIdForGross = session.payment_intent ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id) : null;
        const paymentMethodForGross = session.metadata?.payment_method || (session.payment_method_types && session.payment_method_types[0]) || 'card';
        
        // Tentar buscar do balanceTransaction se for PIX
        if ((currency === 'BRL' || paymentMethodForGross === 'pix') && paymentIntentIdForGross) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdForGross, {
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
                
                if (balanceTransaction.amount && balanceTransaction.currency === 'usd') {
                  grossAmountUsdFromStripe = balanceTransaction.amount / 100;
                  console.log(`[verify-stripe-session-scholarship-fee] ✅ Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
                }
              }
            }
          } catch (stripeError) {
            console.warn('[verify-stripe-session-scholarship-fee] ⚠️ Erro ao buscar valor do Stripe:', stripeError);
          }
        }
        
        // Se não tiver valor do Stripe, usar metadata (convertendo de BRL para USD se necessário)
        let grossAmountUsdFromMetadata: number | null = null;
        if (!grossAmountUsdFromStripe && session.metadata?.gross_amount) {
          const grossAmountRaw = parseFloat(session.metadata.gross_amount);
          // Se for PIX (currency BRL), converter para USD usando exchange_rate
          if (currency === 'BRL' && session.metadata?.exchange_rate) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              grossAmountUsdFromMetadata = grossAmountRaw / exchangeRate;
              console.log(`[verify-stripe-session-scholarship-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
            } else {
              grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
            }
          } else {
            // Se não for PIX, já está em USD
            grossAmountUsdFromMetadata = grossAmountRaw;
          }
        }
        
        // Priorizar: Stripe > Metadata > amountPaidUSD > amountPaid
        const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || amountPaidUSD || amountPaid || 0;
        
        return corsResponse({
          status: 'complete',
          message: 'Session verified and processed successfully. Notifications sent via webhook (PIX payment).',
          application_ids: updatedApps?.map((app)=>app.id) || [],
          amount_paid: amountPaidUSD || amountPaid || 0,
          gross_amount_usd: grossAmountUsd, // Valor bruto em USD (valor que o aluno realmente pagou, com markup)
          amount_paid_original: amountPaid || 0,
          currency: currency,
          promotional_coupon: promotionalCouponReturn,
          original_amount: originalAmountReturn,
          final_amount: finalAmountReturn
        }, 200);
      }
      
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N (apenas para pagamentos via cartão) ---
      try {
        console.log(`📤 [verify-stripe-session-scholarship-fee] Iniciando notificações para pagamento via cartão...`);
        // Buscar dados do aluno (incluindo seller_referral_code e phone)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          // Mesmo com erro, ainda precisamos retornar os dados do pagamento
          // Extrair informações do pagamento para retornar ao frontend
          const amountPaid = session.amount_total ? session.amount_total / 100 : null;
          const currency = session.currency?.toUpperCase() || 'USD';
          const promotionalCouponReturn = session.metadata?.promotional_coupon || null;
          const originalAmountReturn = session.metadata?.original_amount ? parseFloat(session.metadata.original_amount) : null;
          let finalAmountReturn: number | null = null;
          if (session.metadata?.final_amount) {
            const parsed = parseFloat(session.metadata.final_amount);
            if (!isNaN(parsed) && parsed > 0) {
              finalAmountReturn = parsed;
            }
          }
          
          let amountPaidUSD = amountPaid || 0;
          if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              amountPaidUSD = amountPaid / exchangeRate;
            }
          }
          
          // Obter gross_amount_usd - PRIORIZAR valor do Stripe (balanceTransaction) se disponível
          let grossAmountUsdFromStripe: number | null = null;
          
          // Obter paymentIntentId para buscar valor do Stripe
          const paymentIntentIdForGross = session.payment_intent ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id) : null;
          const paymentMethodForGross = session.metadata?.payment_method || (session.payment_method_types && session.payment_method_types[0]) || 'card';
          
          // Tentar buscar do balanceTransaction se for PIX
          if ((currency === 'BRL' || paymentMethodForGross === 'pix') && paymentIntentIdForGross) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdForGross, {
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
                  
                  if (balanceTransaction.amount && balanceTransaction.currency === 'usd') {
                    grossAmountUsdFromStripe = balanceTransaction.amount / 100;
                    console.log(`[verify-stripe-session-scholarship-fee] ✅ Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
                  }
                }
              }
            } catch (stripeError) {
              console.warn('[verify-stripe-session-scholarship-fee] ⚠️ Erro ao buscar valor do Stripe:', stripeError);
            }
          }
          
          // Se não tiver valor do Stripe, usar metadata (convertendo de BRL para USD se necessário)
          let grossAmountUsdFromMetadata: number | null = null;
          if (!grossAmountUsdFromStripe && session.metadata?.gross_amount) {
            const grossAmountRaw = parseFloat(session.metadata.gross_amount);
            if (currency === 'BRL' && session.metadata?.exchange_rate) {
              const exchangeRate = parseFloat(session.metadata.exchange_rate);
              if (exchangeRate > 0) {
                grossAmountUsdFromMetadata = grossAmountRaw / exchangeRate;
                console.log(`[verify-stripe-session-scholarship-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
              } else {
                grossAmountUsdFromMetadata = grossAmountRaw;
              }
            } else {
              grossAmountUsdFromMetadata = grossAmountRaw;
            }
          }
          
          // Priorizar: Stripe > Metadata > amountPaidUSD > amountPaid
          const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || amountPaidUSD || amountPaid || 0;
          
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.',
            gross_amount_usd: grossAmountUsd, // Valor bruto em USD (valor que o aluno realmente pagou, com markup)
            application_ids: updatedApps?.map((app)=>app.id) || [],
            amount_paid: amountPaidUSD || amountPaid || 0,
            amount_paid_original: amountPaid || 0,
            currency: currency,
            promotional_coupon: promotionalCouponReturn,
            original_amount: originalAmountReturn,
            final_amount: finalAmountReturn
          }, 200);
        }
        // Para cada scholarship, enviar notificações
        for (const scholarshipId of scholarshipIdsArray){
          try {
            // Buscar dados da bolsa
            const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
            if (scholarshipError || !scholarship) continue;
            // Buscar dados da universidade
            const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
            if (univError || !universidade) continue;
            const contact = universidade.contact || {};
            const emailUniversidade = contact.admissionsEmail || contact.email || '';
            
            // Preparar informações de moeda
            const currencyInfo = getCurrencyInfo(session);
            const amountValue = session.amount_total ? session.amount_total / 100 : 0;
            const formattedAmount = formatAmountWithCurrency(amountValue, session);
            
            // 1. NOTIFICAÇÃO PARA O ALUNO
            const mensagemAluno = `Parabéns! Você pagou a taxa de bolsa para "${scholarship.title}" da universidade ${universidade.name} e foi aprovado. Agora você pode prosseguir com a matrícula.`;
            const alunoNotificationPayload = {
              tipo_notf: 'Pagamento de taxa de bolsa confirmado',
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
              fee_type: 'scholarship',
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
            
            // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE - REMOVIDA
            // Scholarship fee NÃO envia notificação para universidade (apenas application fee faz isso)
            console.log('[NOTIFICAÇÃO UNIVERSIDADE] Scholarship fee não envia notificação para universidade');
            
            // 3. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
            console.log(`📤 [verify-stripe-session-scholarship-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
            if (alunoData.seller_referral_code) {
              console.log(`📤 [verify-stripe-session-scholarship-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
              // Buscar informações do seller através do seller_referral_code
              const { data: sellerData, error: sellerError } = await supabase.from('sellers').select(`
                  id,
                  user_id,
                  name,
                  email,
                  referral_code,
                  commission_rate,
                  affiliate_admin_id
                `).eq('referral_code', alunoData.seller_referral_code).single();
              console.log(`📤 [verify-stripe-session-scholarship-fee] Resultado da busca do seller:`, {
                sellerData,
                sellerError
              });
              if (sellerData && !sellerError) {
                console.log(`📤 [verify-stripe-session-scholarship-fee] Seller encontrado:`, sellerData);
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
                  console.log(`📤 [verify-stripe-session-scholarship-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
                  const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
                  if (affiliateData && !affiliateError) {
                    const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                    if (affiliateProfile && !profileError) {
                      affiliateAdminData = {
                        email: affiliateProfile.email || "",
                        name: affiliateProfile.full_name || "Affiliate Admin",
                        phone: affiliateProfile.phone || ""
                      };
                      console.log(`📤 [verify-stripe-session-scholarship-fee] Affiliate admin encontrado:`, affiliateAdminData);
                    }
                  }
                }
                // 3.1. NOTIFICAÇÃO PARA O SELLER
                const sellerNotificationPayload = {
                  tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Seller",
                  email_seller: sellerData.email,
                  nome_seller: sellerData.name,
                  phone_seller: sellerPhone,
                  email_aluno: alunoData.email,
                  nome_aluno: alunoData.full_name,
                  phone_aluno: alunoData.phone || "",
                  nome_bolsa: scholarship.title,
                  nome_universidade: universidade.name,
                  o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
                  payment_id: sessionId,
                  fee_type: 'scholarship',
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
                console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para seller:', sellerNotificationPayload);
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
                  console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para seller enviada com sucesso:', sellerResult);
                } else {
                  const sellerError = await sellerNotificationResponse.text();
                  console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para seller:', sellerError);
                }
                // 3.2. NOTIFICAÇÃO PARA O AFFILIATE ADMIN (se existir)
                if (affiliateAdminData.email) {
                  const affiliateNotificationPayload = {
                    tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Affiliate Admin",
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
                    o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                    payment_id: sessionId,
                    fee_type: 'scholarship',
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
                  console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
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
                    console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
                  } else {
                    const affiliateError = await affiliateNotificationResponse.text();
                    console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para affiliate admin:', affiliateError);
                  }
                }
                // 3.3. NOTIFICAÇÃO PARA O ADMIN
                const adminNotificationPayload = {
                  tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Admin",
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
                  o_que_enviar: `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                  payment_id: sessionId,
                  fee_type: 'scholarship',
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
                console.log('📧 [verify-stripe-session-scholarship-fee] Enviando notificação para admin:', adminNotificationPayload);
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
                  console.log('📧 [verify-stripe-session-scholarship-fee] Notificação para admin enviada com sucesso:', adminResult);
                } else {
                  const adminError = await adminNotificationResponse.text();
                  console.error('📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação para admin:', adminError);
                }
              } else {
                console.log(`📤 [verify-stripe-session-scholarship-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
              }
            } else {
              console.log(`📤 [verify-stripe-session-scholarship-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
            }
          } catch (notifErr) {
            console.error('[NOTIFICAÇÃO] Erro ao notificar scholarship:', scholarshipId, notifErr);
          }
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro geral ao notificar scholarship fee via n8n:', notifErr);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      // Limpa carrinho (opcional)
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) throw new Error(`Failed to clear user_cart: ${cartError.message}`);
      
      // Retornar informações do pagamento para exibição na página de sucesso
      // amount_total está em centavos da moeda da sessão (USD ou BRL)
      const amountPaid = session.amount_total ? session.amount_total / 100 : null;
      const currency = session.currency?.toUpperCase() || 'USD';
      const promotionalCouponReturn = session.metadata?.promotional_coupon || null;
      const originalAmountReturn = session.metadata?.original_amount ? parseFloat(session.metadata.original_amount) : null;
      // Melhorar parsing do final_amount para tratar strings vazias ou inválidas
      let finalAmountReturn: number | null = null;
      if (session.metadata?.final_amount) {
        const parsed = parseFloat(session.metadata.final_amount);
        if (!isNaN(parsed) && parsed > 0) {
          finalAmountReturn = parsed;
        }
      }
      
      // Log para debug
      console.log('[verify-stripe-session-scholarship-fee] 📊 Dados extraídos do metadata:', {
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn,
        amount_paid: amountPaid,
        currency: currency
      });
      console.log('[verify-stripe-session-scholarship-fee] 📊 Metadata completo da sessão:', JSON.stringify(session.metadata, null, 2));
      console.log('[verify-stripe-session-scholarship-fee] 📊 final_amount RAW do metadata:', session.metadata?.final_amount, 'tipo:', typeof session.metadata?.final_amount);
      
      // Se for PIX (BRL), converter para USD usando a taxa de câmbio do metadata
      let amountPaidUSD = amountPaid || 0;
      if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
        const exchangeRate = parseFloat(session.metadata.exchange_rate);
        if (exchangeRate > 0) {
          amountPaidUSD = amountPaid / exchangeRate;
        }
      }
      
      // Obter gross_amount_usd - PRIORIZAR valor do Stripe (balanceTransaction) se disponível
      let grossAmountUsdFromStripe: number | null = null;
      
      // Tentar buscar do balanceTransaction se for PIX
      const paymentIntentId = session.payment_intent ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id) : null;
      const paymentMethod = session.metadata?.payment_method || (session.payment_method_types && session.payment_method_types[0]) || 'card';
      
      if ((currency === 'BRL' || paymentMethod === 'pix') && paymentIntentId) {
        try {
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
              
              if (balanceTransaction.amount && balanceTransaction.currency === 'usd') {
                grossAmountUsdFromStripe = balanceTransaction.amount / 100;
                console.log(`[verify-stripe-session-scholarship-fee] ✅ Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
              }
            }
          }
        } catch (stripeError) {
          console.warn('[verify-stripe-session-scholarship-fee] ⚠️ Erro ao buscar valor do Stripe:', stripeError);
        }
      }
      
      // Se não tiver valor do Stripe, usar metadata (convertendo de BRL para USD se necessário)
      let grossAmountUsdFromMetadata: number | null = null;
      if (!grossAmountUsdFromStripe && session.metadata?.gross_amount) {
        const grossAmountRaw = parseFloat(session.metadata.gross_amount);
        if (currency === 'BRL' && session.metadata?.exchange_rate) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            grossAmountUsdFromMetadata = grossAmountRaw / exchangeRate;
            console.log(`[verify-stripe-session-scholarship-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
          } else {
            grossAmountUsdFromMetadata = grossAmountRaw;
          }
        } else {
          grossAmountUsdFromMetadata = grossAmountRaw;
        }
      }
      
      // Priorizar: Stripe > Metadata > amountPaidUSD > amountPaid
      const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || amountPaidUSD || amountPaid || 0;
      
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        application_ids: updatedApps?.map((app)=>app.id) || [],
        amount_paid: amountPaidUSD || amountPaid || 0, // Retornar em USD para exibição
        gross_amount_usd: grossAmountUsd, // Valor bruto em USD (valor que o aluno realmente pagou, com markup)
        amount_paid_original: amountPaid || 0, // Valor original na moeda da sessão
        currency: currency,
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-scholarship-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
  