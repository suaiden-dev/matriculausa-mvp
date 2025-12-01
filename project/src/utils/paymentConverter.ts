import { supabase } from '../lib/supabase';

export interface PaymentIntentInfo {
  currency: string; // 'usd' ou 'brl' - moeda original do pagamento
  isPIX: boolean;
  exchange_rate: number | null;
  base_amount: number | null; // Valor líquido (sem taxa do Stripe)
  payment_method_types: string[];
}

// Cache para evitar múltiplas chamadas ao Stripe para o mesmo payment_intent_id
const paymentIntentCache = new Map<string, { data: PaymentIntentInfo; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca informações do Payment Intent do Stripe via Edge Function
 */
async function getPaymentIntentInfoFromStripe(paymentIntentId: string): Promise<PaymentIntentInfo | null> {
  // Verificar cache primeiro
  const cached = paymentIntentCache.get(paymentIntentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[paymentConverter] Usando cache para payment_intent_id: ${paymentIntentId}`);
    return cached.data;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      console.error('[paymentConverter] Usuário não autenticado');
      return null;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-payment-intent-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[paymentConverter] Erro ao buscar Payment Intent:', error);
      return null;
    }

    const result = await response.json();
    
    if (result.success) {
      const info: PaymentIntentInfo = {
        currency: result.currency,
        isPIX: result.isPIX,
        exchange_rate: result.exchange_rate,
        base_amount: result.base_amount || null,
        payment_method_types: result.payment_method_types || [],
      };
      
      // Salvar no cache
      paymentIntentCache.set(paymentIntentId, { data: info, timestamp: Date.now() });
      
      return info;
    }

    return null;
  } catch (error) {
    console.error('[paymentConverter] Exceção ao buscar Payment Intent:', error);
    return null;
  }
}

/**
 * Identifica se um pagamento é PIX consultando o Payment Intent do Stripe
 */
export async function isPIXPayment(paymentIntentId: string | null | undefined): Promise<boolean> {
  if (!paymentIntentId) {
    return false;
  }

  const info = await getPaymentIntentInfoFromStripe(paymentIntentId);
  return info?.isPIX || false;
}

/**
 * Busca a taxa de câmbio do Stripe via Payment Intent
 */
export async function getExchangeRateFromStripe(paymentIntentId: string | null | undefined): Promise<number | null> {
  if (!paymentIntentId) {
    return null;
  }

  const info = await getPaymentIntentInfoFromStripe(paymentIntentId);
  return info?.exchange_rate || null;
}

/**
 * Busca o valor líquido (base_amount) do Stripe via Payment Intent
 * Este é o valor sem a taxa do Stripe, usado para comissões
 */
export async function getBaseAmountFromStripe(paymentIntentId: string | null | undefined): Promise<number | null> {
  if (!paymentIntentId) {
    return null;
  }

  const info = await getPaymentIntentInfoFromStripe(paymentIntentId);
  return info?.base_amount || null;
}

/**
 * Converte BRL para USD usando a taxa de câmbio
 */
export function convertBRLToUSD(amountBRL: number, exchangeRate: number): number {
  if (exchangeRate <= 0) {
    console.warn('[paymentConverter] Taxa de câmbio inválida:', exchangeRate);
    return amountBRL;
  }
  
  return amountBRL / exchangeRate;
}

/**
 * Calcula o valor líquido (net) removendo as taxas do Stripe do valor bruto (gross)
 * 
 * Para cartões: Se gross = (net + fixed) / (1 - percentage), então:
 *   gross * (1 - percentage) = net + fixed
 *   net = gross * (1 - percentage) - fixed
 * 
 * Para PIX: Se gross = net / (1 - percentage), então:
 *   net = gross * (1 - percentage)
 */
function calculateNetAmountFromGross(grossAmount: number, isPIX: boolean = false): number {
  if (isPIX) {
    // Para PIX: taxa total ~1.8% (1.19% processamento + 0.6% conversão)
    const STRIPE_PIX_TOTAL_PERCENTAGE = 0.018; // ~1.8%
    const netAmount = grossAmount * (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
    return Math.round(netAmount * 100) / 100;
  } else {
    // Para cartão: 3.9% + $0.30
    // Se gross = (net + 0.30) / (1 - 0.039), então:
    // net = gross * (1 - 0.039) - 0.30
    const STRIPE_PERCENTAGE = 0.039; // 3.9%
    const STRIPE_FIXED_FEE = 0.30;   // $0.30
    const netAmount = grossAmount * (1 - STRIPE_PERCENTAGE) - STRIPE_FIXED_FEE;
    return Math.max(0, Math.round(netAmount * 100) / 100); // Garantir que não seja negativo
  }
}

/**
 * ✅ NOVA FUNÇÃO: Busca valores para EXIBIÇÃO nos dashboards (admin de afiliados e seller)
 * Retorna valores "Zelle" (valor base esperado sem taxas do Stripe)
 * 
 * IMPORTANTE: Usa valores esperados baseados no system_type do usuário, não calcula a partir do gross_amount_usd
 * Isso é mais confiável e evita problemas com conversões e cálculos de taxas
 */
export async function getDisplayAmounts(
  userId: string,
  feeTypes: ('selection_process' | 'scholarship' | 'i20_control' | 'application')[]
): Promise<Record<string, number>> {
  try {
    // 1. Buscar system_type, dependents e scholarship_package_id do usuário
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('system_type, dependents, scholarship_package_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('[paymentConverter] Erro ao buscar perfil do usuário:', profileError);
      return {};
    }

    const systemType = userProfile.system_type || 'legacy';
    const dependents = Number(userProfile.dependents) || 0;

    // 2. Buscar overrides do usuário
    // ⚠️ IMPORTANTE: Packages NÃO alteram os valores que o aluno vai pagar
    // Apenas overrides explícitos devem ser usados
    const { data: overrideData, error: overrideError } = await supabase
      .rpc('get_user_fee_overrides', { target_user_id: userId });

    const overrides = overrideError || !overrideData ? {} : (Array.isArray(overrideData) ? overrideData[0] : overrideData);

    // ✅ NOVO: 3. Buscar cupons promocionais usados (BLACK, etc)
    // Mapear fee_types internos para os valores usados na tabela promotional_coupon_usage
    const couponFeeTypeMap: Record<string, string> = {
      'selection_process': 'selection_process',
      'scholarship': 'scholarship_fee',
      'i20_control': 'i20_control',
      'application': 'application_fee'
    };

    const feeTypesForCoupon = feeTypes.map(ft => couponFeeTypeMap[ft] || ft);
    const { data: couponUsage, error: couponError } = await supabase
      .from('promotional_coupon_usage')
      .select('fee_type, final_amount')
      .eq('user_id', userId)
      .in('fee_type', feeTypesForCoupon)
      .order('used_at', { ascending: false });

    // Mapear final_amount por fee_type (usar o mais recente para cada tipo)
    const couponAmounts: Record<string, number> = {};
    if (!couponError && couponUsage) {
      for (const coupon of couponUsage) {
        // Normalizar fee_type para a chave usada internamente
        const feeTypeKey = coupon.fee_type === 'selection_process' ? 'selection_process' :
                          coupon.fee_type === 'scholarship_fee' ? 'scholarship' :
                          coupon.fee_type === 'i20_control' || coupon.fee_type === 'i20_control_fee' ? 'i20_control' :
                          coupon.fee_type === 'application_fee' ? 'application' : null;
        
        if (feeTypeKey && !couponAmounts[feeTypeKey] && coupon.final_amount) {
          couponAmounts[feeTypeKey] = Number(coupon.final_amount);
          console.log(`[paymentConverter] ✅ [DISPLAY] Cupom promocional encontrado para ${feeTypeKey}: ${couponAmounts[feeTypeKey]} (final_amount)`);
        }
      }
    }

    // 4. Buscar valores reais pagos (para casos onde o aluno pagou um valor diferente do padrão)
    const { data: payments, error: paymentsError } = await supabase
      .from('individual_fee_payments')
      .select('fee_type, gross_amount_usd, payment_method')
      .eq('user_id', userId)
      .in('fee_type', feeTypes)
      .order('payment_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Mapear valores reais pagos (usar o mais recente para cada fee_type)
    const realPaidMap: Record<string, number> = {};
    if (!paymentsError && payments) {
      for (const payment of payments) {
        const feeTypeKey = payment.fee_type === 'selection_process' ? 'selection_process' :
                          payment.fee_type === 'scholarship' ? 'scholarship' :
                          payment.fee_type === 'i20_control' ? 'i20_control' :
                          payment.fee_type === 'application' ? 'application' : null;
        
        if (feeTypeKey && !realPaidMap[feeTypeKey] && payment.gross_amount_usd) {
          // Para Zelle, usar diretamente (sem taxas)
          // Para Stripe, usar gross_amount_usd como referência (mas vamos usar valores esperados)
          if (payment.payment_method === 'zelle') {
            realPaidMap[feeTypeKey] = Number(payment.gross_amount_usd);
          }
          // Para Stripe, não usar gross_amount_usd diretamente, vamos usar valores esperados
        }
      }
    }

    // 4. Calcular valores esperados "Zelle" baseados no system_type
    const amounts: Record<string, number> = {};

    // Valores base por system_type
    const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
    const baseScholarshipFee = systemType === 'simplified' ? 550 : 900;
    const baseI20Fee = 900; // Sempre 900 para ambos os sistemas

    // Selection Process Fee - Prioridade: override > cupom promocional > valor real pago (Zelle) > cálculo fixo
    if (feeTypes.includes('selection_process')) {
      if (overrides.selection_process_fee != null) {
        amounts.selection_process = Number(overrides.selection_process_fee);
      } else if (couponAmounts.selection_process) {
        amounts.selection_process = couponAmounts.selection_process;
        console.log(`[paymentConverter] ✅ [DISPLAY] Selection Process usando cupom promocional: ${amounts.selection_process}`);
      } else if (realPaidMap.selection_process) {
        amounts.selection_process = realPaidMap.selection_process;
      } else {
        // Para simplified, Selection Process Fee é fixo ($350), sem dependentes
        // Dependentes só afetam Application Fee ($100 por dependente)
        amounts.selection_process = systemType === 'simplified' 
          ? baseSelectionFee 
          : baseSelectionFee + (dependents * 150);
      }
    }

    // Scholarship Fee - Prioridade: override > cupom promocional > valor real pago (Zelle) > cálculo fixo
    if (feeTypes.includes('scholarship')) {
      if (overrides.scholarship_fee != null) {
        amounts.scholarship = Number(overrides.scholarship_fee);
      } else if (couponAmounts.scholarship) {
        amounts.scholarship = couponAmounts.scholarship;
        console.log(`[paymentConverter] ✅ [DISPLAY] Scholarship usando cupom promocional: ${amounts.scholarship}`);
      } else if (realPaidMap.scholarship) {
        amounts.scholarship = realPaidMap.scholarship;
      } else {
        amounts.scholarship = baseScholarshipFee;
      }
    }

    // I-20 Control Fee - Prioridade: override > cupom promocional > valor real pago (Zelle) > cálculo fixo ($900 padrão)
    // ⚠️ IMPORTANTE: Packages NÃO alteram os valores que o aluno vai pagar
    // Se o aluno tem I-20 de $999, deve haver um override explícito na tabela user_fee_overrides
    if (feeTypes.includes('i20_control')) {
      if (overrides.i20_control_fee != null) {
        amounts.i20_control = Number(overrides.i20_control_fee);
        console.log(`[paymentConverter] ✅ [DISPLAY] I-20 usando override: ${amounts.i20_control}`);
      } else if (couponAmounts.i20_control) {
        amounts.i20_control = couponAmounts.i20_control;
        console.log(`[paymentConverter] ✅ [DISPLAY] I-20 usando cupom promocional: ${amounts.i20_control}`);
      } else if (realPaidMap.i20_control) {
        amounts.i20_control = realPaidMap.i20_control;
        console.log(`[paymentConverter] ✅ [DISPLAY] I-20 usando valor Zelle: ${amounts.i20_control}`);
      } else {
        // Usar valor padrão: $900
        amounts.i20_control = baseI20Fee;
        console.log(`[paymentConverter] ✅ [DISPLAY] I-20 usando valor padrão: ${amounts.i20_control}`);
      }
    }

    // Application Fee - Prioridade: override > cupom promocional > cálculo fixo
    if (feeTypes.includes('application')) {
      if (overrides.application_fee != null) {
        amounts.application = Number(overrides.application_fee);
      } else if (couponAmounts.application) {
        amounts.application = couponAmounts.application;
        console.log(`[paymentConverter] ✅ [DISPLAY] Application usando cupom promocional: ${amounts.application}`);
      } else {
        // Application Fee padrão: $100 + ($100 por dependente)
        amounts.application = 100 + (dependents * 100);
      }
    }

    console.log(`[paymentConverter] ✅ [DISPLAY] Valores "Zelle" para user_id ${userId} (${systemType}):`, amounts);

    return amounts;
  } catch (error) {
    console.error('[paymentConverter] Exceção ao buscar valores para exibição:', error);
    return {};
  }
}

/**
 * Busca valores líquidos pagos (sem taxas do Stripe) de individual_fee_payments
 * ✅ CORREÇÃO: Aplica remoção de taxas APENAS para pagamentos a partir de 19/11/2025
 * Para pagamentos anteriores ou sem registro, retorna valor bruto (sem remover taxas)
 * 
 * Data de corte: 19/11/2025 (implementação de taxas do Stripe)
 * - Pagamentos >= 19/11/2025: retorna valor líquido (após remover taxas)
 * - Pagamentos < 19/11/2025: retorna valor bruto (sem remover taxas)
 * - Sem registro na tabela: trata como antigo (< 19/11/2025), retorna valor bruto
 */
export async function getRealPaidAmounts(
  userId: string,
  feeTypes: ('selection_process' | 'scholarship' | 'i20_control' | 'application')[]
): Promise<Record<string, number>> {
  try {
    // ✅ CORREÇÃO: Buscar também payment_date e gross_amount_usd para determinar se deve remover taxas
    const { data: payments, error } = await supabase
      .from('individual_fee_payments')
      .select('fee_type, amount, payment_method, payment_intent_id, payment_date, gross_amount_usd')
      .eq('user_id', userId)
      .in('fee_type', feeTypes);

    if (error) {
      console.error('[paymentConverter] Erro ao buscar pagamentos:', error);
      return {};
    }

    const amounts: Record<string, number> = {};
    
    // Data de corte: 19/11/2025 (implementação de taxas do Stripe)
    const STRIPE_FEE_IMPLEMENTATION_DATE = new Date('2025-11-19T00:00:00Z');

    // Processar cada pagamento
    for (const payment of payments || []) {
      let amountUSD = Number(payment.amount);
      
      // ✅ NOVO: Verificar data do pagamento
      const paymentDate = payment.payment_date ? new Date(payment.payment_date) : null;
      const shouldRemoveStripeFees = paymentDate && paymentDate >= STRIPE_FEE_IMPLEMENTATION_DATE;
      
      console.log(`[paymentConverter] 🔍 Payment date: ${paymentDate?.toISOString() || 'NULL'}, shouldRemoveFees: ${shouldRemoveStripeFees}`);

      // ✅ LÓGICA BASEADA EM METADADOS DO STRIPE (não em thresholds arbitrários)
      // Se for pagamento Stripe COM payment_intent_id, usar metadados para determinar moeda
      if (payment.payment_method === 'stripe' && payment.payment_intent_id) {
        // Buscar informações do Payment Intent (incluindo currency e base_amount)
        const paymentInfo = await getPaymentIntentInfoFromStripe(payment.payment_intent_id);
        
        if (!paymentInfo) {
          console.warn(`[paymentConverter] ⚠️ Não foi possível buscar informações do Payment Intent ${payment.payment_intent_id}, pulando pagamento`);
          continue;
        }
        
        const originalCurrency = paymentInfo.currency?.toLowerCase() || 'usd';
        const isPIX = paymentInfo.isPIX || false;
        const isBRL = originalCurrency === 'brl' || isPIX;
        
        // ✅ PRIORIDADE 1: Usar base_amount do metadata se disponível (já é líquido e em USD)
        // Mas APENAS se for pagamento após 19/11/2025
        if (shouldRemoveStripeFees && paymentInfo.base_amount !== null && paymentInfo.base_amount !== undefined) {
          amountUSD = paymentInfo.base_amount;
          console.log(`[paymentConverter] ✅ Usando base_amount (líquido) do metadata: ${amountUSD.toFixed(2)} USD para payment_intent_id: ${payment.payment_intent_id} (após 19/11/2025)`);
        } else if (isBRL) {
          // ✅ MOEDA ORIGINAL É BRL: converter BRL para USD usando exchange_rate
          const exchangeRate = paymentInfo.exchange_rate || await getExchangeRateFromStripe(payment.payment_intent_id);
          
          if (exchangeRate && exchangeRate > 0) {
            // Converter BRL bruto para USD bruto
            const grossAmountUSD = convertBRLToUSD(amountUSD, exchangeRate);
            // ✅ NOVO: Remover taxas APENAS se for pagamento após 19/11/2025
            if (shouldRemoveStripeFees) {
              amountUSD = calculateNetAmountFromGross(grossAmountUSD, true);
              console.log(`[paymentConverter] ✅ Convertido BRL para USD (via metadata) - APÓS 19/11/2025: ${payment.amount} BRL → ${grossAmountUSD.toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
            } else {
              amountUSD = grossAmountUSD;
              console.log(`[paymentConverter] ✅ Convertido BRL para USD (via metadata) - ANTES de 19/11/2025: ${payment.amount} BRL → ${amountUSD.toFixed(2)} USD (bruto, sem remover taxas)`);
            }
          } else {
            console.warn(`[paymentConverter] ⚠️ Moeda é BRL mas exchange_rate não encontrada para payment_intent_id: ${payment.payment_intent_id}, pulando pagamento`);
            continue;
          }
        } else {
          // ✅ MOEDA ORIGINAL É USD
          // ✅ NOVO: Remover taxas APENAS se for pagamento após 19/11/2025
          if (shouldRemoveStripeFees) {
            // Determinar se é PIX ou cartão para aplicar a taxa correta
            if (isPIX) {
              amountUSD = calculateNetAmountFromGross(amountUSD, true);
              console.log(`[paymentConverter] ✅ PIX em USD (após 19/11/2025): ${Number(payment.amount).toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
            } else {
              amountUSD = calculateNetAmountFromGross(amountUSD, false);
              console.log(`[paymentConverter] ✅ Cartão em USD (após 19/11/2025): ${Number(payment.amount).toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
            }
          } else {
            // ✅ ANTES de 19/11/2025: usar valor bruto (gross_amount_usd se disponível, senão amount)
            if (payment.gross_amount_usd) {
              amountUSD = Number(payment.gross_amount_usd);
              console.log(`[paymentConverter] ✅ Pagamento ANTES de 19/11/2025: usando gross_amount_usd: ${amountUSD.toFixed(2)} USD (bruto)`);
            } else {
              amountUSD = Number(payment.amount);
              console.log(`[paymentConverter] ✅ Pagamento ANTES de 19/11/2025: usando amount: ${amountUSD.toFixed(2)} USD (bruto)`);
            }
          }
        }
      } else if (payment.payment_method === 'zelle') {
        // ✅ Zelle sempre está em USD, usar diretamente (nunca tem taxas do Stripe)
        amountUSD = amountUSD;
        console.log(`[paymentConverter] ✅ Zelle payment: ${amountUSD.toFixed(2)} USD`);
      } else if (payment.payment_method === 'stripe' && !payment.payment_intent_id) {
        // ✅ Stripe sem payment_intent_id: não podemos determinar moeda, IGNORAR
        // Isso evita contar valores BRL antigos como USD quando não temos metadados
        console.warn(`[paymentConverter] ⚠️ Stripe payment sem payment_intent_id para ${payment.fee_type}, não é possível determinar moeda - IGNORANDO (use valores fixos como fallback)`);
        continue;
      } else {
        // ✅ Outros métodos (manual/outside): não processar, deixar usar valores fixos
        console.log(`[paymentConverter] ℹ️ Payment method '${payment.payment_method}' sem payment_intent_id, não processando - use valores fixos como fallback`);
        continue;
      }

      // Mapear fee_type para a chave correta
      const feeTypeKey = payment.fee_type === 'selection_process' ? 'selection_process' :
                        payment.fee_type === 'scholarship' ? 'scholarship' :
                        payment.fee_type === 'i20_control' ? 'i20_control' :
                        payment.fee_type === 'application' ? 'application' : null;

      if (feeTypeKey) {
        // Se já existe um valor para este fee_type, usar o maior (mais recente)
        if (!amounts[feeTypeKey] || amountUSD > amounts[feeTypeKey]) {
          amounts[feeTypeKey] = amountUSD;
        }
      }
    }

    return amounts;
  } catch (error) {
    console.error('[paymentConverter] Exceção ao buscar valores pagos:', error);
    return {};
  }
}

/**
 * Busca valor real pago para um fee_type específico
 */
export async function getRealPaidAmount(
  userId: string,
  feeType: 'selection_process' | 'scholarship' | 'i20_control' | 'application'
): Promise<number | null> {
  const amounts = await getRealPaidAmounts(userId, [feeType]);
  return amounts[feeType] || null;
}

/**
 * Busca valores brutos pagos (COM taxas do Stripe) de individual_fee_payments
 * Usado no Payment Management do superADMIN para mostrar o valor que o aluno realmente pagou
 * 
 * IMPORTANTE: Usa gross_amount_usd quando disponível (valor bruto antes das taxas),
 * senão usa amount (valor líquido após taxas).
 */
export async function getGrossPaidAmounts(
  userId: string,
  feeTypes: ('selection_process' | 'scholarship' | 'i20_control' | 'application')[]
): Promise<Record<string, number>> {
  try {
    const { data: payments, error } = await supabase
      .from('individual_fee_payments')
      .select('fee_type, amount, gross_amount_usd, payment_method, payment_date')
      .eq('user_id', userId)
      .in('fee_type', feeTypes)
      .order('payment_date', { ascending: false }); // ✅ CORREÇÃO: Ordenar por data mais recente primeiro

    if (error) {
      console.error('[paymentConverter] Erro ao buscar pagamentos:', error);
      return {};
    }

    const amounts: Record<string, number> = {};

    // Processar cada pagamento
    for (const payment of payments || []) {
      // Usar gross_amount_usd quando disponível, senão usar amount
      const amountUSD = payment.gross_amount_usd 
        ? Number(payment.gross_amount_usd) 
        : Number(payment.amount);

      // Mapear fee_type para a chave correta
      const feeTypeKey = payment.fee_type === 'selection_process' ? 'selection_process' :
                        payment.fee_type === 'scholarship' ? 'scholarship' :
                        payment.fee_type === 'i20_control' ? 'i20_control' :
                        payment.fee_type === 'application' ? 'application' : null;

      if (feeTypeKey) {
        // ✅ CORREÇÃO: Usar o primeiro registro (mais recente) para cada fee_type
        // Como já está ordenado por payment_date DESC, o primeiro é o mais recente
        if (!amounts[feeTypeKey]) {
          amounts[feeTypeKey] = amountUSD;
          console.log(`[paymentConverter] ✅ Valor pago para ${feeTypeKey}: ${amountUSD} (gross_amount_usd: ${payment.gross_amount_usd || 'null'}, amount: ${payment.amount})`);
        }
      }
    }

    return amounts;
  } catch (error) {
    console.error('[paymentConverter] Exceção ao buscar valores brutos pagos:', error);
    return {};
  }
}
