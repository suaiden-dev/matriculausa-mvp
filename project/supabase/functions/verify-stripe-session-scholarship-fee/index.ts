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

/**
 * Busca todos os administradores do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(supabase, isDevelopment: boolean = false): Promise<Array<{
  email: string;
  full_name: string;
  phone: string;
}>> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    'luizedmiola@gmail.com',
    'chimentineto@gmail.com',
    'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com'
  ];
  
  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    const { data: adminProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');

    if (profileError) {
      console.error('[getAllAdmins] Erro ao buscar admins de user_profiles:', profileError);
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin encontrado em user_profiles, tentando auth.users...');
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Se algum admin não tem email em user_profiles, buscar de auth.users
    const adminsWithEmail = await Promise.all(
      adminProfiles.map(async (profile) => {
        if (profile.email) {
          return {
            email: profile.email,
            full_name: profile.full_name || 'Admin MatriculaUSA',
            phone: profile.phone || ''
          };
        } else {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              email: authUser?.user?.email || '',
              full_name: profile.full_name || authUser?.user?.user_metadata?.full_name || 'Admin MatriculaUSA',
              phone: profile.phone || authUser?.user?.user_metadata?.phone || ''
            };
          } catch (e) {
            console.warn(`[getAllAdmins] Erro ao buscar email para user_id ${profile.user_id}:`, e);
            return null;
          }
        }
      })
    );

    // Filtrar nulos e admins sem email
    let admins = adminsWithEmail
      .filter((admin): admin is { email: string; full_name: string; phone: string } => 
        admin !== null && !!admin.email
      );

    // Filtrar emails bloqueados em desenvolvimento
    if (isDevelopment) {
      const beforeFilter = admins.length;
      admins = admins.filter(admin => !devBlockedEmails.includes(admin.email));
      if (beforeFilter !== admins.length) {
        console.log(`[getAllAdmins] Filtrados ${beforeFilter - admins.length} admin(s) em ambiente de desenvolvimento`);
      }
    }

    if (admins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido encontrado após processamento, usando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    console.log(`[getAllAdmins] Encontrados ${admins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, admins.map(a => a.email));

    return admins;
  } catch (error) {
    console.error('[getAllAdmins] Erro inesperado ao buscar admins:', error);
    return [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
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
    
    // ✅ VERIFICAÇÃO INICIAL ROBUSTA: Verificar se esta sessão já foi completamente processada
    const { data: existingLogs } = await supabase
      .from('student_action_logs')
      .select('id, metadata, created_at')
      .eq('action_type', 'fee_payment')
      .eq('metadata->>session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Se já existe um log com notificações enviadas, retornar imediatamente
    if (existingLogs && existingLogs.length > 0) {
      const logsWithNotificationsSent = existingLogs.filter(log => {
        const metadata = log.metadata || {};
        return metadata.notifications_sent === true || metadata.notifications_sent === 'true';
      });
      
      if (logsWithNotificationsSent.length > 0) {
        console.log(`[DUPLICAÇÃO] Session ${sessionId} já foi completamente processada (notificações enviadas), retornando sucesso sem reprocessar.`);
        // Expandir session apenas para retornar dados do pagamento
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent']
        });
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
          message: 'Session already processed successfully (notifications already sent).',
          amount_paid: amountPaidUSD || amountPaid || 0,
          amount_paid_original: amountPaid || 0,
          currency: currency,
          promotional_coupon: promotionalCouponReturn,
          original_amount: originalAmountReturn,
          final_amount: finalAmountReturn
        }, 200);
      }
      
      // Verificar se há múltiplos logs recentes (chamadas simultâneas)
      const now = new Date();
      const recentLogs = existingLogs.filter(log => {
        const logTime = new Date(log.created_at);
        const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
        return secondsDiff < 10; // Log criado há menos de 10 segundos
      });
      
      if (recentLogs.length > 1) {
        console.log(`[DUPLICAÇÃO] Múltiplos logs recentes detectados (${recentLogs.length}) para session ${sessionId}, aguardando e verificando novamente...`);
        // Aguardar um pouco para dar tempo da outra chamada processar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar novamente se as notificações foram enviadas
        const { data: recheckLogs } = await supabase
          .from('student_action_logs')
          .select('id, metadata')
          .eq('action_type', 'fee_payment')
          .eq('metadata->>session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (recheckLogs?.metadata?.notifications_sent === true || recheckLogs?.metadata?.notifications_sent === 'true') {
          console.log(`[DUPLICAÇÃO] Após aguardar, notificações já foram enviadas por outra chamada, retornando sucesso.`);
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
          });
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
            message: 'Session already processed successfully (notifications already sent by another call).',
            amount_paid: amountPaidUSD || amountPaid || 0,
            amount_paid_original: amountPaid || 0,
            currency: currency,
            promotional_coupon: promotionalCouponReturn,
            original_amount: originalAmountReturn,
            final_amount: finalAmountReturn
          }, 200);
        }
      }
    }
    
    // Expandir payment_intent para obter o ID completo
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
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
      
      // Detectar se é PIX através dos payment_method_types ou metadata
      const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
      
      // Para pagamentos via Stripe, sempre usar 'stripe' como payment_method na tabela individual_fee_payments
      // Mas para scholarship_applications, usar 'pix' se for PIX, 'stripe' caso contrário
      const paymentMethodForIndividualFee = 'stripe'; // Sempre 'stripe' para individual_fee_payments
      const paymentMethodForApplication = isPixPayment ? 'pix' : 'stripe'; // 'pix' ou 'stripe' para scholarship_applications
      
      // Variável para lógica de conversão (usada para detectar PIX)
      const paymentMethod = isPixPayment ? 'pix' : (session.payment_method_types?.[0] || 'stripe');
      
      // ✅ VERIFICAÇÃO DE DUPLICAÇÃO ATÔMICA: Tentar criar log primeiro (com unique constraint)
      // Se já existir, retornar imediatamente sem processar
      let isDuplicate = false;
      try {
        const { data: logResult, error: logError } = await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `Scholarship Fee payment processing started (${sessionId})`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'scholarship',
              payment_method: paymentMethodForApplication,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              scholarships_ids: scholarshipsIds,
              processing_started: true
            }
        });
        
        // Se houver erro, verificar se é porque já existe (duplicação)
        if (logError) {
          console.log('[DUPLICAÇÃO] Erro ao criar log, verificando se já existe:', logError);
          const { data: existingLog } = await supabase
            .from('student_action_logs')
            .select('id')
            .eq('action_type', 'fee_payment')
            .eq('metadata->>session_id', sessionId)
            .single();
          
          if (existingLog) {
            console.log(`[DUPLICAÇÃO] Session ${sessionId} já foi processada, retornando sucesso sem reprocessar.`);
            isDuplicate = true;
          } else {
            // Erro real, não duplicação
            throw logError;
          }
        } else {
          console.log('[DUPLICAÇÃO] Log de processamento criado com sucesso para evitar duplicação');
        }
      } catch (logError: any) {
        // Se falhar, verificar novamente se já existe (race condition)
        console.log('[DUPLICAÇÃO] Erro ao criar log, verificando duplicação:', logError);
        const { data: recheckLog } = await supabase
          .from('student_action_logs')
          .select('id')
          .eq('action_type', 'fee_payment')
          .eq('metadata->>session_id', sessionId)
          .single();
        
        if (recheckLog) {
          console.log(`[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`);
          isDuplicate = true;
        } else {
          console.error('[DUPLICAÇÃO] Erro ao criar log, mas continuando processamento:', logError);
        }
      }
      
      // ✅ Se for duplicação, retornar imediatamente com dados do pagamento
      if (isDuplicate) {
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
        
        // Buscar valores do Stripe para PIX/BRL ou para qualquer pagamento com paymentIntentId (incluindo cartão USD)
        if (paymentIntentId && shouldFetchNetAmount) {
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
                  // Fallback: usar exchange_rate do metadata se disponível (apenas para BRL)
                  if (currency === 'BRL' && session.metadata?.exchange_rate) {
                    const exchangeRate = parseFloat(session.metadata.exchange_rate);
                    if (exchangeRate > 0) {
                      paymentAmount = paymentAmountRaw / exchangeRate;
                      console.log(`[Individual Fee Payment] Usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                    }
                  }
                }
              } else {
                // Fallback: usar exchange_rate do metadata (apenas para BRL)
                if (currency === 'BRL' && session.metadata?.exchange_rate) {
                  const exchangeRate = parseFloat(session.metadata.exchange_rate);
                  if (exchangeRate > 0) {
                    paymentAmount = paymentAmountRaw / exchangeRate;
                    console.log(`[Individual Fee Payment] BalanceTransaction não disponível, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                  }
                }
              }
            } else {
              // Fallback: usar exchange_rate do metadata (apenas para BRL)
              if (currency === 'BRL' && session.metadata?.exchange_rate) {
                const exchangeRate = parseFloat(session.metadata.exchange_rate);
                if (exchangeRate > 0) {
                  paymentAmount = paymentAmountRaw / exchangeRate;
                  console.log(`[Individual Fee Payment] PaymentIntent sem charge, usando exchange_rate do metadata: ${paymentAmountRaw} BRL / ${exchangeRate} = ${paymentAmount} USD`);
                }
              }
            }
          } catch (stripeError) {
            console.error('[Individual Fee Payment] Erro ao buscar valor líquido do Stripe:', stripeError);
            // Fallback: usar exchange_rate do metadata (apenas para BRL)
            if (currency === 'BRL' && session.metadata?.exchange_rate) {
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
            
            // ✅ CORREÇÃO: amount deve ser o valor líquido (paymentAmount), não o bruto
            // O gross_amount_usd é o valor bruto que o aluno pagou (antes das taxas)
            // O amount é o valor líquido que a plataforma recebe (após taxas)
            const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
              p_user_id: userId,
              p_fee_type: 'scholarship',
              p_amount: paymentAmount, // ✅ Valor líquido (após taxas e conversão)
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
        scholarship_fee_payment_method: paymentMethodForApplication // 'pix' ou 'stripe'
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
      // isPixPayment já foi declarado acima
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
        // ✅ VERIFICAÇÃO CRÍTICA: Verificar se as notificações já foram enviadas para evitar duplicação
        const { data: notificationLogs } = await supabase
          .from('student_action_logs')
          .select('id, metadata, created_at')
          .eq('action_type', 'fee_payment')
          .eq('metadata->>session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        let shouldSendNotifications = true;
        
        // Verificar se há um log com notificações já enviadas
        if (notificationLogs && notificationLogs.length > 0) {
          const logsWithNotificationsSent = notificationLogs.filter(log => {
            const metadata = log.metadata || {};
            return metadata.notifications_sent === true || metadata.notifications_sent === 'true';
          });
          
          if (logsWithNotificationsSent.length > 0) {
            console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Notificações para session ${sessionId} já foram enviadas, pulando envio de notificações.`);
            shouldSendNotifications = false;
          } else {
            // Verificar se há múltiplos logs recentes (criados há menos de 5 segundos)
            // Isso pode indicar chamadas simultâneas
            const now = new Date();
            const logsWithTime = notificationLogs.filter(log => {
              const logTime = new Date(log.created_at);
              const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
              return secondsDiff < 5; // Log criado há menos de 5 segundos
            });
            
            if (logsWithTime.length > 1) {
              console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Múltiplos logs recentes detectados para session ${sessionId}, verificando se outro processo já enviou notificações...`);
              // Aguardar um pouco e verificar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const { data: recheckLogs } = await supabase
                .from('student_action_logs')
                .select('id, metadata')
                .eq('action_type', 'fee_payment')
                .eq('metadata->>session_id', sessionId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              
              if (recheckLogs?.metadata?.notifications_sent === true || recheckLogs?.metadata?.notifications_sent === 'true') {
                console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Notificações já foram enviadas por outro processo, pulando envio.`);
                shouldSendNotifications = false;
              }
            }
          }
        }
        
        if (!shouldSendNotifications) {
          console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Pulando envio de notificações para session ${sessionId}`);
          // Continuar normalmente, apenas não enviar notificações
        } else {
          console.log(`📤 [verify-stripe-session-scholarship-fee] Iniciando notificações para pagamento via cartão...`);
          
          // ✅ MARCAR ANTES DE ENVIAR: Tentar marcar que estamos enviando notificações (atômico)
          // Se outra chamada já marcou, não enviar
          let canProceedWithNotifications = false;
          try {
            const { data: logToUpdate } = await supabase
              .from('student_action_logs')
              .select('id, metadata')
              .eq('action_type', 'fee_payment')
              .eq('metadata->>session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (logToUpdate) {
              const currentMetadata = logToUpdate.metadata || {};
              // Se já está marcado como enviado ou enviando, não prosseguir
              if (currentMetadata.notifications_sent === true || currentMetadata.notifications_sent === 'true' || 
                  currentMetadata.notifications_sending === true || currentMetadata.notifications_sending === 'true') {
                console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Notificações já estão sendo enviadas ou foram enviadas, pulando.`);
                canProceedWithNotifications = false;
              } else {
                // Marcar como "enviando" ANTES de enviar
                const updatedMetadata = {
                  ...currentMetadata,
                  notifications_sending: true, // Flag temporária
                  notifications_sending_at: new Date().toISOString()
                };
                const { error: updateError } = await supabase
                  .from('student_action_logs')
                  .update({ metadata: updatedMetadata })
                  .eq('id', logToUpdate.id);
                
                if (updateError) {
                  console.error(`[DUPLICAÇÃO NOTIFICAÇÕES] Erro ao marcar como enviando:`, updateError);
                  // Se falhar, verificar se outra chamada já marcou
                  const { data: recheckLog } = await supabase
                    .from('student_action_logs')
                    .select('id, metadata')
                    .eq('id', logToUpdate.id)
                    .single();
                  
                  if (recheckLog?.metadata?.notifications_sending === true || 
                      recheckLog?.metadata?.notifications_sent === true) {
                    console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Outra chamada já está processando, pulando.`);
                    canProceedWithNotifications = false;
                  } else {
                    // Erro real, mas vamos tentar continuar
                    canProceedWithNotifications = true;
                  }
                } else {
                  console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Marcado como "enviando" com sucesso, prosseguindo com envio.`);
                  canProceedWithNotifications = true;
                }
              }
            } else {
              // Não encontrou log, pode prosseguir (caso raro)
              console.warn(`[DUPLICAÇÃO NOTIFICAÇÕES] Log não encontrado para marcar, prosseguindo com cuidado.`);
              canProceedWithNotifications = true;
            }
          } catch (markError) {
            console.error(`[DUPLICAÇÃO NOTIFICAÇÕES] Erro ao tentar marcar como enviando:`, markError);
            // Em caso de erro, verificar novamente se já foi enviado
            const { data: finalCheck } = await supabase
              .from('student_action_logs')
              .select('id, metadata')
              .eq('action_type', 'fee_payment')
              .eq('metadata->>session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (finalCheck?.metadata?.notifications_sent === true || finalCheck?.metadata?.notifications_sent === 'true') {
              console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Após erro, verificação final indica que já foi enviado, pulando.`);
              canProceedWithNotifications = false;
            } else {
              canProceedWithNotifications = true;
            }
          }
          
          if (!canProceedWithNotifications) {
            console.log(`[DUPLICAÇÃO NOTIFICAÇÕES] Não foi possível prosseguir com envio de notificações, outra chamada já está processando.`);
            // Continuar normalmente, apenas não enviar notificações
          } else {
        
        // Buscar dados do aluno (incluindo seller_referral_code e phone)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Detectar ambiente de desenvolvimento
        const isDevelopment = config.environment.isTest || config.environment.environment === 'test';
        // Buscar todos os admins do sistema
        // Em ambiente de desenvolvimento (test), filtrar emails específicos
        const admins = await getAllAdmins(supabase, isDevelopment);
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
        
        // Preparar informações de moeda (fora do loop para reutilizar)
        const currencyInfo = getCurrencyInfo(session);
        const amountValue = session.amount_total ? session.amount_total / 100 : 0;
        const formattedAmount = formatAmountWithCurrency(amountValue, session);
        
        // 1. NOTIFICAÇÃO PARA O ALUNO (UMA ÚNICA VEZ, FORA DO LOOP)
        // Buscar nomes das bolsas para a mensagem
        const scholarshipNames: string[] = [];
        for (const scholarshipId of scholarshipIdsArray) {
          const { data: scholarship } = await supabase.from('scholarships').select('title').eq('id', scholarshipId).single();
          if (scholarship) {
            scholarshipNames.push(scholarship.title);
          }
        }
        const bolsasText = scholarshipNames.length > 0 
          ? scholarshipNames.join(', ') 
          : 'suas bolsas';
        const mensagemAluno = `Parabéns! Você pagou a taxa de bolsa para ${bolsasText} e foi aprovado. Agora você pode prosseguir com a matrícula.`;
        const alunoNotificationPayload = {
          tipo_notf: 'Pagamento de taxa de bolsa confirmado',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
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
        console.log('[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno (UMA ÚNICA VEZ):', alunoNotificationPayload);
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
        
        // Coletar informações de todas as bolsas para notificação consolidada para admin
        const scholarshipInfoList: Array<{ title: string; university: string }> = [];
        let sellerDataForAdmin: any = null;
        let affiliateAdminDataForAdmin: any = null;
        let sellerPhoneForAdmin = '';
        
        // Para cada scholarship, enviar notificações para seller/affiliate (dentro do loop)
        // Notificações para admin serão enviadas UMA ÚNICA VEZ após o loop
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
            
            // Coletar informações da bolsa para notificação consolidada
            scholarshipInfoList.push({
              title: scholarship.title,
              university: universidade.name
            });
            
            // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE - REMOVIDA
            // Scholarship fee NÃO envia notificação para universidade (apenas application fee faz isso)
            console.log('[NOTIFICAÇÃO UNIVERSIDADE] Scholarship fee não envia notificação para universidade');
            
            // 3. NOTIFICAÇÃO PARA SELLER/AFFILIATE (se houver código de seller)
            // Notificações para admin serão enviadas UMA ÚNICA VEZ após o loop
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
                
                // Armazenar informações do seller apenas na primeira vez (para notificação consolidada)
                if (!sellerDataForAdmin) {
                  // Buscar telefone do seller
                  const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
                  sellerPhoneForAdmin = sellerProfile?.phone || "";
                  sellerDataForAdmin = sellerData;
                  
                  // Buscar dados do affiliate_admin se houver
                  if (sellerData.affiliate_admin_id) {
                    console.log(`📤 [verify-stripe-session-scholarship-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
                    const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
                    if (affiliateData && !affiliateError) {
                      const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                      if (affiliateProfile && !profileError) {
                        affiliateAdminDataForAdmin = {
                          email: affiliateProfile.email || "",
                          name: affiliateProfile.full_name || "Affiliate Admin",
                          phone: affiliateProfile.phone || ""
                        };
                        console.log(`📤 [verify-stripe-session-scholarship-fee] Affiliate admin encontrado:`, affiliateAdminDataForAdmin);
                      }
                    }
                  }
                }
                
                // Buscar telefone do seller para notificação individual do seller
                const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
                const sellerPhone = sellerProfile?.phone || "";
                
                // Buscar dados do affiliate_admin para notificação individual
                let affiliateAdminData = {
                  email: "",
                  name: "Affiliate Admin",
                  phone: ""
                };
                if (sellerData.affiliate_admin_id) {
                  const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
                  if (affiliateData && !affiliateError) {
                    const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                    if (affiliateProfile && !profileError) {
                      affiliateAdminData = {
                        email: affiliateProfile.email || "",
                        name: affiliateProfile.full_name || "Affiliate Admin",
                        phone: affiliateProfile.phone || ""
                      };
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
                // Notificações para admin serão enviadas UMA ÚNICA VEZ após o loop (consolidadas)
              } else {
                console.log(`📤 [verify-stripe-session-scholarship-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
                // Notificações para admin serão enviadas UMA ÚNICA VEZ após o loop
              }
            } else {
              console.log(`📤 [verify-stripe-session-scholarship-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
              // Notificações para admin serão enviadas UMA ÚNICA VEZ após o loop
            }
          } catch (notifErr) {
            console.error('[NOTIFICAÇÃO] Erro ao notificar scholarship:', scholarshipId, notifErr);
          }
        }
        
        // 4. NOTIFICAÇÃO CONSOLIDADA PARA TODOS OS ADMINS (UMA ÚNICA VEZ, APÓS O LOOP)
        // Consolidar informações de todas as bolsas
        const bolsasTextAdmin = scholarshipInfoList.length > 0
          ? scholarshipInfoList.map(s => `"${s.title}" (${s.university})`).join(', ')
          : 'suas bolsas';
        
        const adminNotificationPromises = admins.map(async (admin) => {
          let oQueEnviar = '';
          if (sellerDataForAdmin) {
            oQueEnviar = `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para ${bolsasTextAdmin}. Seller responsável: ${sellerDataForAdmin.name} (${sellerDataForAdmin.referral_code})`;
          } else {
            oQueEnviar = `Pagamento Stripe de scholarship fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para ${bolsasTextAdmin}.`;
          }
          
          const adminNotificationPayload = {
            tipo_notf: "Pagamento Stripe de scholarship fee confirmado - Admin",
            email_admin: admin.email,
            nome_admin: admin.full_name,
            phone_admin: admin.phone,
            email_aluno: alunoData.email,
            nome_aluno: alunoData.full_name,
            phone_aluno: alunoData.phone || "",
            email_seller: sellerDataForAdmin?.email || "",
            nome_seller: sellerDataForAdmin?.name || "",
            phone_seller: sellerPhoneForAdmin || "",
            email_affiliate_admin: affiliateAdminDataForAdmin?.email || "",
            nome_affiliate_admin: affiliateAdminDataForAdmin?.name || "",
            phone_affiliate_admin: affiliateAdminDataForAdmin?.phone || "",
            o_que_enviar: oQueEnviar,
            payment_id: sessionId,
            fee_type: 'scholarship',
            amount: amountValue,
            currency: currencyInfo.currency,
            currency_symbol: currencyInfo.symbol,
            formatted_amount: formattedAmount,
            seller_id: sellerDataForAdmin?.user_id || "",
            referral_code: sellerDataForAdmin?.referral_code || "",
            commission_rate: sellerDataForAdmin?.commission_rate || null,
            payment_method: "stripe",
            notification_target: 'admin'
          };
          
          console.log(`📧 [verify-stripe-session-scholarship-fee] ✅ ENVIANDO NOTIFICAÇÃO CONSOLIDADA PARA ADMIN ${admin.email}:`, adminNotificationPayload);
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
            console.log(`📧 [verify-stripe-session-scholarship-fee] Notificação consolidada para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
          } else {
            const adminError = await adminNotificationResponse.text();
            console.error(`📧 [verify-stripe-session-scholarship-fee] Erro ao enviar notificação consolidada para ADMIN ${admin.email}:`, adminError);
          }
        });
        
        await Promise.allSettled(adminNotificationPromises);
        console.log(`✅ [verify-stripe-session-scholarship-fee] Todas as notificações consolidadas para admins processadas!`);
        
        // ✅ Marcar no log que as notificações foram enviadas para evitar duplicação
        try {
          const { data: existingLogForUpdate } = await supabase
            .from('student_action_logs')
            .select('id, metadata')
            .eq('action_type', 'fee_payment')
            .eq('metadata->>session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (existingLogForUpdate) {
            const currentMetadata = existingLogForUpdate.metadata || {};
            const updatedMetadata = {
              ...currentMetadata,
              notifications_sent: true, // ✅ Salvar como boolean
              notifications_sent_at: new Date().toISOString()
            };
            const { error: updateError } = await supabase
              .from('student_action_logs')
              .update({ metadata: updatedMetadata })
              .eq('id', existingLogForUpdate.id);
            
            if (updateError) {
              console.error(`❌ [verify-stripe-session-scholarship-fee] Erro ao atualizar log:`, updateError);
            } else {
              console.log(`✅ [verify-stripe-session-scholarship-fee] Log atualizado: notificações marcadas como enviadas`);
            }
          }
        } catch (updateLogError) {
          console.error('[NOTIFICAÇÃO] Erro ao atualizar log com flag de notificações enviadas:', updateLogError);
          // Não quebra o fluxo se falhar
        }
          } // Fim do else (canProceedWithNotifications)
        } // Fim do else (shouldSendNotifications)
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
      const paymentIntentIdForGross = session.payment_intent ? (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id) : null;
      // paymentMethod já foi declarado acima, usar isPixPayment para detectar PIX
      
      if ((currency === 'BRL' || isPixPayment) && paymentIntentIdForGross) {
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