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

/**
 * Busca todos os administradores do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(supabase, isDevelopment: boolean = false): Promise<Array<{
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}>> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    'luizedmiola@gmail.com',
    'chimentineto@gmail.com',
    'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com',
    'gui.reis@live.com',
    'admin@matriculausa.com'
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
              user_id: user.id,
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
              user_id: '',
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
        user_id: '',
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
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name || 'Admin MatriculaUSA',
            phone: profile.phone || ''
          };
        }
        
        // Se não tem email em user_profiles, buscar de auth.users
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          if (authUser?.user?.email) {
            return {
              user_id: profile.user_id,
              email: authUser.user.email,
              full_name: profile.full_name || authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: profile.phone || authUser.user.user_metadata?.phone || ''
            };
          }
        } catch (err) {
          console.error(`[getAllAdmins] Erro ao buscar email de auth.users para user_id ${profile.user_id}:`, err);
        }
        
        return null;
      })
    );

    const validAdmins = adminsWithEmail.filter(admin => admin !== null && admin.email) as Array<{
      user_id: string;
      email: string;
      full_name: string;
      phone: string;
    }>;

    if (validAdmins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido encontrado, retornando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Filtrar emails de desenvolvimento se necessário
    const filteredAdmins = isDevelopment 
      ? validAdmins.filter(admin => !devBlockedEmails.includes(admin.email))
      : validAdmins;

    console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
    
    return filteredAdmins.length > 0 ? filteredAdmins : [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  } catch (error) {
    console.error('[getAllAdmins] Erro geral:', error);
    return [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
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
        // Mesmo com duplicação, ainda precisamos retornar os dados do pagamento
        // Buscar a sessão do Stripe para extrair os dados
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent']
        });
        
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
        
        // Obter gross_amount_usd - PRIORIZAR valor do Stripe (balanceTransaction) se disponível
        let grossAmountUsdFromStripe: number | null = null;
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
                  console.log(`[verify-stripe-session-i20-control-fee] ✅ [DUPLICAÇÃO] Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
                }
              }
            }
          } catch (stripeError) {
            console.warn('[verify-stripe-session-i20-control-fee] ⚠️ [DUPLICAÇÃO] Erro ao buscar valor do Stripe:', stripeError);
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
              console.log(`[verify-stripe-session-i20-control-fee] 💱 [DUPLICAÇÃO] Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
            } else {
              grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
            }
          } else {
            // Se não for PIX, já está em USD
            grossAmountUsdFromMetadata = grossAmountRaw;
          }
        }

        // Priorizar: Stripe > Metadata
        const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || null;
        
        let amountPaidUSD = amountPaid || 0;
        if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) {
            amountPaidUSD = amountPaid / exchangeRate;
          }
        }
        
        return corsResponse({
          status: 'complete',
          message: 'Session already processing or processed notifications.',
          amount_paid: amountPaidUSD || amountPaid || 0,
          amount_paid_original: amountPaid || 0,
          currency: currency,
          promotional_coupon: promotionalCouponReturn,
          original_amount: originalAmountReturn,
          final_amount: finalAmountReturn,
          gross_amount_usd: grossAmountUsd // Valor bruto em USD (quando disponível)
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
          // Mesmo com duplicação, ainda precisamos retornar os dados do pagamento
          // Buscar a sessão do Stripe para extrair os dados
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
          });
          
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
          
          // Obter gross_amount_usd - PRIORIZAR valor do Stripe (balanceTransaction) se disponível
          let grossAmountUsdFromStripe: number | null = null;
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
                    console.log(`[verify-stripe-session-i20-control-fee] ✅ [DUPLICAÇÃO] Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
                  }
                }
              }
            } catch (stripeError) {
              console.warn('[verify-stripe-session-i20-control-fee] ⚠️ [DUPLICAÇÃO] Erro ao buscar valor do Stripe:', stripeError);
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
                console.log(`[verify-stripe-session-i20-control-fee] 💱 [DUPLICAÇÃO] Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
              } else {
                grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
              }
            } else {
              // Se não for PIX, já está em USD
              grossAmountUsdFromMetadata = grossAmountRaw;
            }
          }

          // Priorizar: Stripe > Metadata
          const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || null;
          
          let amountPaidUSD = amountPaid || 0;
          if (currency === 'BRL' && session.metadata?.exchange_rate && amountPaid) {
            const exchangeRate = parseFloat(session.metadata.exchange_rate);
            if (exchangeRate > 0) {
              amountPaidUSD = amountPaid / exchangeRate;
            }
          }
          
          return corsResponse({
            status: 'complete',
            message: 'Multiple processing logs detected, avoiding duplication.',
            amount_paid: amountPaidUSD || amountPaid || 0,
            amount_paid_original: amountPaid || 0,
            currency: currency,
            promotional_coupon: promotionalCouponReturn,
            original_amount: originalAmountReturn,
            final_amount: finalAmountReturn,
            gross_amount_usd: grossAmountUsd // Valor bruto em USD (quando disponível)
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
      
      // Detectar se é PIX através dos payment_method_types ou metadata
      const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix'; 
      
      // Para pagamentos via Stripe, sempre usar 'stripe' como payment_method na tabela individual_fee_payments
      // Mas para user_profiles, usar 'pix' se for PIX, 'stripe' caso contrário
      const paymentMethodForIndividualFee = 'stripe'; // Sempre 'stripe' para individual_fee_payments
      const paymentMethodForUserProfile = isPixPayment ? 'pix' : 'stripe'; // 'pix' ou 'stripe' para user_profiles
      
      // Obter informações de moeda
      const currencyInfo = getCurrencyInfo(session);
      const amountValue = session.amount_total ? session.amount_total / 100 : 0;
      const formattedAmount = formatAmountWithCurrency(amountValue, session);
      
      console.log(`[I20 Control Fee] Currency: ${currencyInfo.currency}, Amount: ${formattedAmount}, Payment Method: ${paymentMethodForUserProfile}`);
      // Atualiza user_profiles para marcar o pagamento do I-20 Control Fee
      const { error: profileError } = await supabase.from('user_profiles').update({
        has_paid_i20_control_fee: true,
        i20_control_fee_payment_method: paymentMethodForUserProfile, // 'pix' ou 'stripe'
        i20_paid_at: new Date().toISOString(),
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
        // Sempre buscar o valor líquido, independente do ambiente
        const shouldFetchNetAmount = true;
        
        // Detectar se é PIX através dos payment_method_types da sessão
        const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
        
        // Debug: Log das condições
        console.log(`[Individual Fee Payment] DEBUG - currency: ${currency}, isPixPayment: ${isPixPayment}, paymentIntentId: ${paymentIntentId}, shouldFetchNetAmount: ${shouldFetchNetAmount}, isProduction: ${config.environment.isProduction}`);
        
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
        } else if ((currency === 'BRL' || isPixPayment) && !shouldFetchNetAmount) {
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
          console.log(`[Individual Fee Payment] DEBUG - Não entrou em nenhum bloco de conversão. currency: ${currency}, isPixPayment: ${isPixPayment}, hasExchangeRate: ${!!session.metadata?.exchange_rate}`);
        }
        
        // ✅ Verificar se já existe registro com este payment_intent_id para evitar duplicação
        if (paymentIntentId) {
          const { data: existingPayment, error: checkError } = await supabase
            .from('individual_fee_payments')
            .select('id, payment_intent_id')
            .eq('payment_intent_id', paymentIntentId)
            .eq('fee_type', 'i20_control')
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
            console.log('[Individual Fee Payment] Recording i20_control fee payment...');
            console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD${grossAmountUsd ? `, Valor bruto: ${grossAmountUsd} USD` : ''}${feeAmountUsd ? `, Taxas: ${feeAmountUsd} USD` : ''}`);
            
            // ✅ CORREÇÃO: amount deve ser o valor líquido (paymentAmount), não o bruto
            // O gross_amount_usd é o valor bruto que o aluno pagou (antes das taxas)
            // O amount é o valor líquido que a plataforma recebe (após taxas)
            const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
              p_user_id: userId,
              p_fee_type: 'i20_control',
              p_amount: paymentAmount, // ✅ Valor líquido (após taxas e conversão)
              p_payment_date: paymentDate,
              p_payment_method: paymentMethodForIndividualFee, // Sempre 'stripe' para individual_fee_payments
              p_payment_intent_id: paymentIntentId || null,
              p_stripe_charge_id: null,
              p_zelle_payment_id: null,
              p_gross_amount_usd: grossAmountUsd, // Valor bruto em USD (quando disponível)
              p_fee_amount_usd: feeAmountUsd // Taxas em USD (quando disponível)
            });
            
            if (insertError) {
            } else {
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
            payment_method: paymentMethodForUserProfile,
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
      
      // --- MATRICULA REWARDS - AGORA GERENCIADO POR TRIGGER ---
      // O trigger handle_i20_payment_rewards() no banco de dados automaticamente:
      // 1. Credita 180 MatriculaCoins quando has_paid_i20_control_fee muda para true
      // 2. Atualiza o status do referral para 'i20_paid'
      // Aqui apenas enviamos a notificação de recompensa para o padrinho
      try {
        console.log('[MATRICULA REWARDS] Verificando se usuário usou código de referência para enviar notificação...');
        
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabase
          .from('used_referral_codes')
          .select('referrer_id, affiliate_code')
          .eq('user_id', userId)
          .single();
          
        if (!codeError && usedCode) {
          console.log('[MATRICULA REWARDS] Usuário usou código de referência, enviando notificação para:', usedCode.referrer_id);
          
          // Obter nome/email do usuário que pagou (referred)
          let referredDisplayName = '';
          try {
            const { data: referredProfile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', userId)
              .maybeSingle();
              
            if (referredProfile?.full_name) {
              referredDisplayName = referredProfile.full_name;
            } else {
              const { data: authUser } = await supabase.auth.admin.getUserById(userId);
              referredDisplayName = authUser?.user?.email || userId;
            }
          } catch (e) {
            console.warn('[MATRICULA REWARDS] Could not resolve referred user name, using ID. Error:', e);
            referredDisplayName = userId;
          }
          
          // --- NOTIFICAÇÃO DE RECOMPENSA PARA O ALUNO (PADRINHO) ---
          try {
            console.log('📤 [MATRICULA REWARDS] Enviando notificação de recompensa para o padrinho...');
            
            // Buscar dados do padrinho (referrer)
            const { data: referrerProfile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', usedCode.referrer_id)
              .single();
            
            // Buscar email do aluno indicado (referred)
            const { data: referredProfileData } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('user_id', userId)
              .single();

            if (referrerProfile?.email) {
              const rewardPayload = {
                tipo_notf: "Recompensa de MatriculaCoins por Indicacao",
                email_aluno: referrerProfile.email,
                nome_aluno: referrerProfile.full_name || "Aluno",
                referred_student_name: referredDisplayName,
                referred_student_email: referredProfileData?.email || "",
                payment_method: paymentMethodForUserProfile,
                fee_type: "I20 Control Fee",
                reward_type: "MatriculaCoins",
                o_que_enviar: `Congratulations! Your friend ${referredDisplayName} has completed the I20 payment. 180 MatriculaCoins have been added to your account!`
              };

              console.log('📤 [MATRICULA REWARDS] Payload de recompensa:', rewardPayload);

              await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(rewardPayload),
              });
              console.log('✅ [MATRICULA REWARDS] Notificação de recompensa enviada com sucesso!');
            }
          } catch (rewardNotifError) {
            console.error('❌ [MATRICULA REWARDS] Erro ao enviar notificação de recompensa:', rewardNotifError);
          }
        } else {
          console.log('[MATRICULA REWARDS] Usuário não usou código de referência, nenhuma notificação a enviar');
        }
      } catch (rewardsError) {
        console.error('[MATRICULA REWARDS] Erro ao processar notificação de Matricula Rewards:', rewardsError);
      }
      // --- FIM MATRICULA REWARDS ---
      
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
              payment_method: paymentMethodForUserProfile,
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
                // Mesmo com duplicação, ainda precisamos retornar os dados do pagamento
                // A sessão já foi recuperada anteriormente, então vamos extrair os dados
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
                  message: 'Multiple notification logs detected, avoiding duplication',
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
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('id, full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Detectar ambiente de desenvolvimento
        const isDevelopment = config.environment.isTest || config.environment.environment === 'test';
        // Buscar todos os admins do sistema
        // Em ambiente de desenvolvimento (test), filtrar emails específicos
        const admins = await getAllAdmins(supabase, isDevelopment);
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
          payment_method: paymentMethodForUserProfile
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

        // ✅ IN-APP NOTIFICATION FOR STUDENT (I-20 Control Fee)
        try {
          if (alunoData?.id) {
            console.log('[NOTIFICAÇÃO ALUNO] Criando notificação in-app de pagamento I-20...');
            const { error: inAppError } = await supabase
              .from('student_notifications')
              .insert({
                student_id: alunoData.id,
                title: 'Payment Confirmed',
                message: 'Your I-20 Control Fee has been confirmed. Your I-20 document will be processed shortly.',
                link: applicationId ? `/student/dashboard/application/${applicationId}/chat` : '/student/dashboard/financial',
                created_at: new Date().toISOString()
              });

            if (inAppError) {
              console.error('[NOTIFICAÇÃO ALUNO] Erro ao criar notificação in-app:', inAppError);
            } else {
              console.log('[NOTIFICAÇÃO ALUNO] Notificação in-app criada com sucesso!');
            }
          } else {
            console.warn('[NOTIFICAÇÃO ALUNO] Dados do aluno (ID) não encontrados para notificação in-app.');
          }
        } catch (inAppEx) {
            console.error('[NOTIFICAÇÃO ALUNO] Exceção ao criar notificação in-app:', inAppEx);
        }
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
              user_id: "",
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
                    user_id: affiliateData.user_id,
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin"
                  };
                  console.log(`📤 [verify-stripe-session-i20-control-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // NOTIFICAÇÕES SEPARADAS PARA ADMIN, SELLER E AFFILIATE ADMIN
            // 1. NOTIFICAÇÃO PARA TODOS OS ADMINS
            // Buscar telefone do affiliate admin
            const affiliateAdminPhone = affiliateAdminData.email ? (await (async ()=>{ try { const { data: a, error: e } = await supabase.from('user_profiles').select('phone').eq('email', affiliateAdminData.email).single(); return a?.phone || "" } catch { return "" } })()) : "";
            console.log(`📧 [verify-stripe-session-i20-control-fee] Enviando notificações para ${admins.length} admin(s)...`);
            const adminNotificationPromises = admins.map(async (admin) => {
              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New I-20 Control Fee Payment',
                    message: `Student ${alunoData.full_name} has paid the I-20 Control Fee (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'i20_control',
                       payment_id: sessionId
                    }
                  });
                } catch (adminInAppErr) {
                   console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
                }
              }
              const adminNotificationPayload = {
                tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone || "",
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminPhone,
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
                payment_method: paymentMethodForUserProfile,
                notification_type: "admin"
              };
              try {
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
                  console.log(`📧 [verify-stripe-session-i20-control-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
                  return { success: true, email: admin.email };
                } else {
                  const adminError = await adminNotificationResponse.text();
                  console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
                  return { success: false, email: admin.email, error: adminError };
                }
              } catch (error) {
                console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, error);
                return { success: false, email: admin.email, error: String(error) };
              }
            });
            const adminNotificationResults = await Promise.allSettled(adminNotificationPromises);
            const successfulAdmins = adminNotificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            console.log(`📧 [verify-stripe-session-i20-control-fee] Notificações enviadas: ${successfulAdmins}/${admins.length} admin(s) notificados com sucesso`);
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
              payment_method: paymentMethodForUserProfile,
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
              console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para SELLER:', sellerError);
            }

            // ✅ IN-APP NOTIFICATION FOR SELLER
            if (sellerData.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: sellerData.user_id,
                    title: 'New Commission Potential (I-20)',
                    message: `Your student ${alunoData.full_name} has paid the I-20 Control Fee (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/users',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'i20_control_fee',
                       payment_id: sessionId
                    }
                  });
                } catch (sellerInAppErr) {
                   console.error(`[NOTIFICAÇÃO SELLER] Erro ao criar in-app notification para seller ${sellerData.email}:`, sellerInAppErr);
                }
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
                payment_method: paymentMethodForUserProfile,
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
                console.error('📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para AFFILIATE ADMIN:', affiliateError);
              }

              // ✅ IN-APP NOTIFICATION FOR AFFILIATE ADMIN
              if (affiliateAdminData.user_id) {
                  try {
                    await supabase.from('admin_notifications').insert({
                      user_id: affiliateAdminData.user_id,
                      title: 'Affiliate I-20 Payment',
                      message: `A student from your network (${alunoData.full_name}) has paid the I-20 Control Fee (${formattedAmount}).`,
                      type: 'payment',
                      link: '/admin/dashboard/affiliate-management',
                      metadata: {
                         student_id: alunoData.id,
                         student_name: alunoData.full_name,
                         amount: amountValue,
                         fee_type: 'i20_control_fee',
                         payment_id: sessionId
                      }
                    });
                  } catch (affiliateInAppErr) {
                     console.error(`[NOTIFICAÇÃO AFFILIATE] Erro ao criar in-app notification para affiliate ${affiliateAdminData.email}:`, affiliateInAppErr);
                  }
              }
            } else {
              console.log('📧 [verify-stripe-session-i20-control-fee] Não há affiliate admin para notificar');
            }
          } else {
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ SELLER NÃO ENCONTRADO para seller_referral_code: ${alunoData.seller_referral_code}`);
            console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ ERRO na busca do seller:`, sellerError);
            
            // Notificar todos os admins quando seller não é encontrado
            console.log(`📧 [verify-stripe-session-i20-control-fee] Enviando notificações para ${admins.length} admin(s) (seller não encontrado)...`);
            const adminNotificationPromises = admins.map(async (admin) => {
              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  await supabase.from('admin_student_chat_notifications').insert({
                    recipient_id: admin.user_id,
                    title: 'New I-20 Control Fee Payment',
                    message: `Student ${alunoData.full_name} has paid the I-20 Control Fee (${formattedAmount}).`,
                    notification_type: 'system',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'i20_control',
                       payment_id: sessionId
                    }
                  });
                } catch (adminInAppErr) {
                   console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
                }
              }
              const adminNotificationPayload = {
                tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone || "",
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
                payment_method: paymentMethodForUserProfile,
                notification_type: 'admin'
              };
              try {
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
                  console.log(`📧 [verify-stripe-session-i20-control-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
                  return { success: true, email: admin.email };
                } else {
                  const adminError = await adminNotificationResponse.text();
                  console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
                  return { success: false, email: admin.email, error: adminError };
                }
              } catch (error) {
                console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, error);
                return { success: false, email: admin.email, error: String(error) };
              }
            });
            const adminNotificationResults = await Promise.allSettled(adminNotificationPromises);
            const successfulAdmins = adminNotificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            console.log(`📧 [verify-stripe-session-i20-control-fee] Notificações enviadas: ${successfulAdmins}/${admins.length} admin(s) notificados com sucesso`);
          }
        } else {
          console.log(`📤 [verify-stripe-session-i20-control-fee] ❌ NENHUM SELLER_REFERRAL_CODE encontrado, não há seller para notificar`);
          
          // Notificar todos os admins quando não há seller
          console.log(`📧 [verify-stripe-session-i20-control-fee] Enviando notificações para ${admins.length} admin(s) (sem seller)...`);
          const adminNotificationPromises = admins.map(async (admin) => {
            // ✅ IN-APP NOTIFICATION FOR ADMIN
            if (admin.user_id) {
              try {
                await supabase.from('admin_notifications').insert({
                  user_id: admin.user_id,
                  title: 'New I-20 Control Fee Payment',
                  message: `Student ${alunoData.full_name} has paid the I-20 Control Fee (${formattedAmount}).`,
                  type: 'payment',
                  link: '/admin/dashboard/payments',
                  metadata: {
                     student_id: alunoData.id,
                     student_name: alunoData.full_name,
                     amount: amountValue,
                     fee_type: 'i20_control',
                     payment_id: sessionId
                  }
                });
              } catch (adminInAppErr) {
                 console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
              }
            }
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de I-20 control fee confirmado - Admin",
              email_admin: admin.email,
              nome_admin: admin.full_name,
              phone_admin: admin.phone || "",
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
              payment_method: paymentMethodForUserProfile,
              notification_type: 'admin'
            };
            try {
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
                console.log(`📧 [verify-stripe-session-i20-control-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
                return { success: true, email: admin.email };
              } else {
                const adminError = await adminNotificationResponse.text();
                console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
                return { success: false, email: admin.email, error: adminError };
              }
            } catch (error) {
              console.error(`📧 [verify-stripe-session-i20-control-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, error);
              return { success: false, email: admin.email, error: String(error) };
            }
          });
          const adminNotificationResults = await Promise.allSettled(adminNotificationPromises);
          const successfulAdmins = adminNotificationResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
          console.log(`📧 [verify-stripe-session-i20-control-fee] Notificações enviadas: ${successfulAdmins}/${admins.length} admin(s) notificados com sucesso`);
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
            payment_method: paymentMethodForUserProfile,
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
      // Melhorar parsing do final_amount para tratar strings vazias ou inválidas
      let finalAmountReturn: number | null = null;
      if (session.metadata?.final_amount) {
        const parsed = parseFloat(session.metadata.final_amount);
        if (!isNaN(parsed) && parsed > 0) {
          finalAmountReturn = parsed;
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
                console.log(`[verify-stripe-session-i20-control-fee] ✅ Valor bruto do Stripe (balanceTransaction): ${grossAmountUsdFromStripe} USD`);
              }
            }
          }
        } catch (stripeError) {
          console.warn('[verify-stripe-session-i20-control-fee] ⚠️ Erro ao buscar valor do Stripe:', stripeError);
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
            console.log(`[verify-stripe-session-i20-control-fee] 💱 Convertendo gross_amount de BRL para USD: ${grossAmountRaw} BRL / ${exchangeRate} = ${grossAmountUsdFromMetadata} USD`);
          } else {
            grossAmountUsdFromMetadata = grossAmountRaw; // Fallback se exchange_rate inválido
          }
        } else {
          // Se não for PIX, já está em USD
          grossAmountUsdFromMetadata = grossAmountRaw;
        }
      }

      // Priorizar: Stripe > Metadata > amountPaidUSD > amountPaid
      const grossAmountUsd = grossAmountUsdFromStripe || grossAmountUsdFromMetadata || null;
      
      // Log para debug
      console.log('[verify-stripe-session-i20-control-fee] 📊 Dados extraídos do metadata:', {
        promotional_coupon: promotionalCouponReturn,
        original_amount: originalAmountReturn,
        final_amount: finalAmountReturn,
        amount_paid: amountPaid,
        currency: currency,
        gross_amount_usd: grossAmountUsd
      });
      console.log('[verify-stripe-session-i20-control-fee] 📊 Metadata completo da sessão:', JSON.stringify(session.metadata, null, 2));
      console.log('[verify-stripe-session-i20-control-fee] 📊 final_amount RAW do metadata:', session.metadata?.final_amount, 'tipo:', typeof session.metadata?.final_amount);
      
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
        final_amount: finalAmountReturn,
        gross_amount_usd: grossAmountUsd // Valor bruto em USD (quando disponível)
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
