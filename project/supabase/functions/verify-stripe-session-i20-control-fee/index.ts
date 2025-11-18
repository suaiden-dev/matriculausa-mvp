// Função edge inicial para verificar sessão de pagamento do I-20 Control Fee
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

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
Deno.serve(async (req)=>{
  console.log('--- verify-stripe-session-i20-control-fee: Request received ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({
      error: 'Method Not Allowed'
    }, 405);
    
    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-07-30.preview',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0'
      }
    });
    
    console.log(`🔧 Using Stripe in ${config.environment.environment} mode`);
    
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({
      error: 'Session ID is required'
    }, 400);
    console.log(`Verifying session ID: ${sessionId}`);
    
    // Verificar se esta sessão já foi processada para evitar duplicação
    const { data: allExistingLogs } = await supabase
      .from('student_action_logs')
      .select('id, metadata, created_at')
      .eq('action_type', 'fee_payment')
      .eq('metadata->>session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (allExistingLogs && allExistingLogs.length > 0) {
      // Verificar se há um log que indica que as notificações já foram enviadas ou estão sendo enviadas
      const hasNotificationLog = allExistingLogs.some(log => {
        const metadata = log.metadata || {};
        return metadata.notifications_sending === true || metadata.notifications_sent === true;
      });
      
      if (hasNotificationLog) {
        console.log(`[DUPLICAÇÃO] Session ${sessionId} já está processando ou processou notificações, retornando sucesso sem reprocessar.`);
        return corsResponse({
          status: 'complete',
          message: 'Session already processing or processed notifications.'
        }, 200);
      }
      
      // Verificar se há múltiplos logs de processing_started (indicando chamadas simultâneas)
      const processingLogs = allExistingLogs.filter(log => {
        const metadata = log.metadata || {};
        return metadata.processing_started === true;
      });
      
      if (processingLogs.length > 1) {
        const now = new Date();
        const recentProcessingLogs = processingLogs.filter(log => {
          const logTime = new Date(log.created_at);
          const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
          return secondsDiff < 2; // Log criado há menos de 2 segundos
        });
        
        if (recentProcessingLogs.length > 1) {
          console.log(`[DUPLICAÇÃO] Múltiplos logs de processamento detectados para session ${sessionId}, retornando sucesso para evitar duplicação.`);
          return corsResponse({
            status: 'complete',
            message: 'Multiple processing logs detected, avoiding duplication.'
          }, 200);
        }
      }
      
      console.log(`[DUPLICAÇÃO] Session ${sessionId} tem logs mas notificações ainda não foram enviadas, continuando processamento.`);
    }
    
    // Expandir payment_intent para obter o ID completo
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const paymentMethod = session.metadata?.payment_method || 'stripe';
      
      if (!userId) {
        return corsResponse({
          error: 'User ID (client_reference_id) missing in session.'
        }, 400);
      }
      
      // Obter payment_intent_id: pode ser string ou objeto PaymentIntent
      // Definir no escopo mais amplo para uso em múltiplos lugares
      let paymentIntentId = '';
      if (typeof session.payment_intent === 'string') {
        paymentIntentId = session.payment_intent;
      } else if (session.payment_intent && typeof session.payment_intent === 'object' && 'id' in session.payment_intent) {
        paymentIntentId = (session.payment_intent as any).id;
      }
      
      // Obter informações de moeda
      const currencyInfo = getCurrencyInfo(session);
      const amountValue = session.amount_total ? session.amount_total / 100 : 0;
      const formattedAmount = formatAmountWithCurrency(amountValue, session);
      
      console.log(`[I20 Control Fee] Currency: ${currencyInfo.currency}, Amount: ${formattedAmount}`);
      // Atualiza user_profiles para marcar o pagamento do I-20 Control Fee
      const { error: profileError } = await supabase.from('user_profiles').update({
        has_paid_i20_control_fee: true,
        i20_control_fee_payment_method: paymentMethod,
        i20_control_fee_due_date: new Date().toISOString(),
        i20_control_fee_payment_intent_id: paymentIntentId
      }).eq('user_id', userId);
      if (profileError) throw new Error(`Failed to update user_profiles: ${profileError.message}`);

      // Registrar pagamento na tabela individual_fee_payments
      let individualFeePaymentId = null;
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        
        // Para pagamentos PIX (BRL), buscar o valor líquido recebido em USD do BalanceTransaction
        // Controle de ambiente: só buscar em test/staging por padrão, ou se variável de ambiente forçar
        const enableNetAmountFetchEnv = Deno.env.get('ENABLE_STRIPE_NET_AMOUNT_FETCH');
        const shouldFetchNetAmount = 
          enableNetAmountFetchEnv === 'true'   ? true  // Força ativar
          : enableNetAmountFetchEnv === 'false' ? false // Força desativar
          : !config.environment.isProduction;   // Auto: busca só em test/staging (não em produção)
        
        // Debug: Log das condições
        console.log(`[Individual Fee Payment] DEBUG - currency: ${currency}, paymentMethod: ${paymentMethod}, paymentIntentId: ${paymentIntentId}, shouldFetchNetAmount: ${shouldFetchNetAmount}, enableNetAmountFetchEnv: ${enableNetAmountFetchEnv}, isProduction: ${config.environment.isProduction}`);
        
        let paymentAmount = paymentAmountRaw;
        if ((currency === 'BRL' || paymentMethod === 'pix') && paymentIntentId && shouldFetchNetAmount) {
          console.log(`✅ Buscando valor líquido do Stripe (ambiente: ${config.environment.environment})`);
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
                  console.log(`[Individual Fee Payment] Valor líquido recebido do Stripe (após taxas e conversão): ${paymentAmount} USD`);
                  console.log(`[Individual Fee Payment] Valor bruto: ${balanceTransaction.amount / 100} ${balanceTransaction.currency}, Taxas: ${(balanceTransaction.fee || 0) / 100} ${balanceTransaction.currency}`);
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
        
        console.log('[Individual Fee Payment] Recording i20_control fee payment...');
        console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD`);
        const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
          p_user_id: userId,
          p_fee_type: 'i20_control',
          p_amount: paymentAmount, // Sempre em USD
          p_payment_date: paymentDate,
          p_payment_method: paymentMethod,
          p_payment_intent_id: paymentIntentId || null,
          p_stripe_charge_id: null,
          p_zelle_payment_id: null
        });
        
        if (insertError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
        } else {
          console.log('[Individual Fee Payment] I20 control fee recorded successfully:', insertResult);
          individualFeePaymentId = insertResult?.id || null;
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }

      // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

      // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
      const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
      if (!userProfile) {
        return corsResponse({
          error: 'User profile not found'
        }, 404);
      }
      
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `I-20 Control Fee payment processing started (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'i20_control',
            payment_method: paymentMethod,
            amount: amountValue,
            session_id: sessionId,
            payment_intent_id: paymentIntentId,
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
        console.error('[DUPLICAÇÃO] Erro ao criar log de processamento:', logError);
      }
      // Buscar o application_id mais recente do usuário
      console.log('[I20ControlFee] userId do Stripe:', userId);
      console.log('[I20ControlFee] userProfile encontrado:', userProfile);
      let applicationId = null;
      if (userProfile && userProfile.id) {
        const { data: applications } = await supabase.from('scholarship_applications').select('id').eq('student_id', userProfile.id).order('created_at', {
          ascending: false
        }).limit(1);
        console.log('[I20ControlFee] applications encontradas:', applications);
        if (applications && applications.length > 0) {
          applicationId = applications[0].id;
        }
      }
      
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N ---
      try {
        // Criar log de "notificações sendo enviadas" ANTES de enviar para evitar duplicação
        try {
          const { error: notificationLogError } = await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `I-20 Control Fee notifications sending started (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'i20_control',
              payment_method: paymentMethod,
              amount: amountValue,
              session_id: sessionId,
              notifications_sending: true
            }
          });
          
          if (notificationLogError) {
            // Se falhar ao criar log, verificar novamente se já existe (race condition)
            const { data: recheckLogs } = await supabase
              .from('student_action_logs')
              .select('id, metadata')
              .eq('action_type', 'fee_payment')
              .eq('metadata->>session_id', sessionId);
            
            if (recheckLogs && recheckLogs.length > 0) {
              const hasNotificationLog = recheckLogs.some(log => {
                const metadata = log.metadata || {};
                return metadata.notifications_sending === true || metadata.notifications_sent === true;
              });
              
              if (hasNotificationLog) {
                console.log(`[DUPLICAÇÃO] Notificações já estão sendo enviadas ou foram enviadas para session ${sessionId}, retornando sucesso.`);
                return corsResponse({
                  status: 'complete',
                  message: 'Notifications already being sent or sent'
                }, 200);
              }
            }
            console.error('[DUPLICAÇÃO] Erro ao criar log de notificações, mas continuando:', notificationLogError);
          } else {
            console.log('[DUPLICAÇÃO] Log de envio de notificações criado para evitar duplicação');
            
            // Verificar novamente após criar o log para garantir que não há duplicação
            const { data: verifyLogs } = await supabase
              .from('student_action_logs')
              .select('id, metadata')
              .eq('action_type', 'fee_payment')
              .eq('metadata->>session_id', sessionId);
            
            if (verifyLogs && verifyLogs.length > 0) {
              const notificationLogs = verifyLogs.filter(log => {
                const metadata = log.metadata || {};
                return metadata.notifications_sending === true || metadata.notifications_sent === true;
              });
              
              if (notificationLogs.length > 1) {
                console.log(`[DUPLICAÇÃO] Múltiplos logs de notificações detectados para session ${sessionId}, retornando sucesso para evitar duplicação.`);
                return corsResponse({
                  status: 'complete',
                  message: 'Multiple notification logs detected, avoiding duplication'
                }, 200);
              }
            }
          }
        } catch (logError) {
          console.error('[DUPLICAÇÃO] Erro ao criar log de notificações:', logError);
          // Verificar se já existe um log antes de continuar
          const { data: allLogs } = await supabase
            .from('student_action_logs')
            .select('id, metadata')
            .eq('action_type', 'fee_payment')
            .eq('metadata->>session_id', sessionId);
          
          if (allLogs && allLogs.length > 0) {
            const hasNotificationLog = allLogs.some(log => {
              const metadata = log.metadata || {};
              return metadata.notifications_sending === true || metadata.notifications_sent === true;
            });
            
            if (hasNotificationLog) {
              console.log(`[DUPLICAÇÃO] Notificações já estão sendo enviadas ou foram enviadas para session ${sessionId}, retornando sucesso.`);
              return corsResponse({
                status: 'complete',
                message: 'Notifications already being sent or sent'
              }, 200);
            }
          }
        }
        
        console.log(`📤 [verify-stripe-session-i20-control-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Buscar telefone do admin
        const { data: adminProfile, error: adminProfileError } = await supabase.from('user_profiles').select('phone').eq('email', 'admin@matriculausa.com').single();
        const adminPhone = adminProfile?.phone || "";
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.',
            application_id: applicationId
          }, 200);
        }
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const alunoNotificationPayload = {
          tipo_notf: 'Pagamento de I-20 control fee confirmado',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          o_que_enviar: `O pagamento da taxa de controle I-20 no valor de ${formattedAmount} foi confirmado para ${alunoData.full_name}. Seu documento I-20 será processado e enviado em breve.`,
          payment_id: sessionId,
          fee_type: 'i20_control_fee',
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: paymentMethod
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
        // 2. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-i20-control-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        console.log(`📤 [verify-stripe-session-i20-control-fee] DEBUG - alunoData completo:`, alunoData);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-i20-control-fee] ✅ CÓDIGO SELLER ENCONTRADO! Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-i20-control-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
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
          console.log(`📤 [verify-stripe-session-i20-control-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
            const sellerPhone = sellerProfile?.phone;

            console.log(`📤 [verify-stripe-session-i20-control-fee] ✅ SELLER ENCONTRADO! Dados:`, sellerData);
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              email: "",
              name: "Affiliate Admin"
            };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-i20-control-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin"
                  };
                  console.log(`📤 [verify-stripe-session-i20-control-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // NOTIFICAÇÕES SEPARADAS PARA ADMIN, SELLER E AFFILIATE ADMIN
            // 1. NOTIFICAÇÃO PARA ADMIN
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              email_affiliate_admin: affiliateAdminData.email,
              nome_affiliate_admin: affiliateAdminData.name,
              phone_affiliate_admin: (await (async ()=>{ try { const { data: a, error: e } = await supabase.from('user_profiles').select('phone').eq('email', affiliateAdminData.email).single(); return a?.phone || "" } catch { return "" } })()),
              o_que_enviar: `Pagamento Stripe de I-20 control fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso. Seller responsável: ${sellerData.name} (${sellerData.referral_code}). Affiliate: ${affiliateAdminData.name}`,
              payment_id: sessionId,
              fee_type: 'i20_control_fee',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: paymentMethod,
              notification_type: "admin"
            };
            console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN:', adminNotificationPayload);
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
              console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para ADMIN enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN:', adminError);
            }
            // 2. NOTIFICAÇÃO PARA SELLER
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              o_que_enviar: `Parabéns! Seu aluno ${alunoData.full_name} pagou a taxa de I-20 control fee no valor de ${formattedAmount}. O documento I-20 será processado em breve.`,
              payment_id: sessionId,
              fee_type: 'i20_control_fee',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: paymentMethod,
              notification_type: "seller"
            };
            console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA SELLER:', sellerNotificationPayload);
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
              console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para SELLER enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para SELLER:', sellerError);
            }
            // 3. NOTIFICAÇÃO PARA AFFILIATE ADMIN (se houver)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: (await (async ()=>{ try { const { data: a, error: e } = await supabase.from('user_profiles').select('phone').eq('email', affiliateAdminData.email).single(); return a?.phone || "" } catch { return "" } })()),
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone || "",
                o_que_enviar: `O seller ${sellerData.name} (${sellerData.referral_code}) do seu afiliado teve um pagamento de I-20 control fee no valor de ${formattedAmount} do aluno ${alunoData.full_name}.`,
                payment_id: sessionId,
                fee_type: 'i20_control_fee',
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: paymentMethod,
                notification_type: "affiliate_admin"
              };
              console.log('📧 [verify-stripe-session-i20-control-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA AFFILIATE ADMIN:', affiliateNotificationPayload);
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
                console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para AFFILIATE ADMIN enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para AFFILIATE ADMIN:', affiliateError);
              }
            } else {
              console.log('📧 [verify-stripe-session-i20-control-fee] Não há affiliate admin para notificar');
            }
          } else {
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ SELLER NÃO ENCONTRADO para seller_referral_code: ${alunoData.seller_referral_code}`);
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ ERRO na busca do seller:`, sellerError);
            
            // Notificar admin quando seller não é encontrado
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              phone_admin: adminPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              o_que_enviar: `Pagamento Stripe de I-20 control fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso. Seller não encontrado para código: ${alunoData.seller_referral_code}`,
              payment_id: sessionId,
              fee_type: 'i20_control_fee',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              payment_method: paymentMethod,
              notification_type: 'admin'
            };
            console.log('📧 [verify-stripe-session-i20-control-fee] Enviando notificação para admin (seller não encontrado):', adminNotificationPayload);
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
              console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para admin enviada com sucesso:', adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para admin:', adminError);
            }
          }
        } else {
          console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ NENHUM SELLER_REFERRAL_CODE encontrado, não há seller para notificar`);
          
          // Notificar admin quando não há seller
          const adminNotificationPayload = {
            tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
            email_admin: "admin@matriculausa.com",
            nome_admin: "Admin MatriculaUSA",
            phone_admin: adminPhone,
            email_aluno: alunoData.email,
            nome_aluno: alunoData.full_name,
            phone_aluno: alunoData.phone || "",
            o_que_enviar: `Pagamento Stripe de I-20 control fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso.`,
            payment_id: sessionId,
            fee_type: 'i20_control_fee',
            amount: amountValue,
            currency: currencyInfo.currency,
            currency_symbol: currencyInfo.symbol,
            formatted_amount: formattedAmount,
            payment_method: paymentMethod,
            notification_type: 'admin'
          };
          console.log('📧 [verify-stripe-session-i20-control-fee] Enviando notificação para admin da plataforma (sem seller):', adminNotificationPayload);
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
            console.log('📧 [verify-stripe-session-i20-control-fee] Notificação para admin enviada com sucesso:', adminResult);
          } else {
            const adminError = await adminNotificationResponse.text();
            console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para admin:', adminError);
          }
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar I-20 control fee via n8n:', notifErr);
      }
      
      // Atualizar log para marcar que as notificações foram enviadas
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `I-20 Control Fee paid via Stripe (${sessionId}) - Notifications sent`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'i20_control',
            payment_method: paymentMethod,
            amount: amountValue,
            session_id: sessionId,
            payment_intent_id: paymentIntentId,
            notifications_sent: true
          }
        });
        console.log('[DUPLICAÇÃO] Log de conclusão criado após envio de notificações');
      } catch (logError) {
        console.error('Failed to log payment completion:', logError);
      }
      
      // --- FIM DAS NOTIFICAÇÕES ---
      // Extrair informações do pagamento para retornar ao frontend
      const amountPaid = session.amount_total ? session.amount_total / 100 : null;
      const currency = session.currency?.toUpperCase() || 'USD';
      const promotionalCouponReturn = session.metadata?.promotional_coupon || null;
      const originalAmountReturn = session.metadata?.original_amount ? parseFloat(session.metadata.original_amount) : null;
      const finalAmountReturn = session.metadata?.final_amount ? parseFloat(session.metadata.final_amount) : null;
      
      // Se for PIX (BRL), converter para USD usando a taxa de câmbio do metadata
      let amountPaidUSD = amountPaid || 0;
      if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
        const exchangeRate = parseFloat(session.metadata.exchange_rate);
        if (exchangeRate > 0) {
          amountPaidUSD = amountPaid / exchangeRate;
        }
      }
      
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        application_id: applicationId,
        amount_paid: amountPaidUSD || amountPaid || 0, // Retornar em USD para exibição
        amount_paid_original: amountPaid || 0, // Valor original na moeda da sessão
        currency: currency,
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn
      }, 200);
    } else {
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-i20-control-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
