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
 * Busca valores líquidos pagos (sem taxas do Stripe) de individual_fee_payments
 * ✅ CORREÇÃO: Agora retorna valores LÍQUIDOS (net) ao invés de brutos (gross)
 */
export async function getRealPaidAmounts(
  userId: string,
  feeTypes: ('selection_process' | 'scholarship' | 'i20_control' | 'application')[]
): Promise<Record<string, number>> {
  try {
    const { data: payments, error } = await supabase
      .from('individual_fee_payments')
      .select('fee_type, amount, payment_method, payment_intent_id')
      .eq('user_id', userId)
      .in('fee_type', feeTypes);

    if (error) {
      console.error('[paymentConverter] Erro ao buscar pagamentos:', error);
      return {};
    }

    const amounts: Record<string, number> = {};

    // Processar cada pagamento
    for (const payment of payments || []) {
      let amountUSD = Number(payment.amount);

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
        if (paymentInfo.base_amount !== null && paymentInfo.base_amount !== undefined) {
          amountUSD = paymentInfo.base_amount;
          console.log(`[paymentConverter] ✅ Usando base_amount (líquido) do metadata: ${amountUSD.toFixed(2)} USD para payment_intent_id: ${payment.payment_intent_id}`);
        } else if (isBRL) {
          // ✅ MOEDA ORIGINAL É BRL: converter BRL para USD usando exchange_rate
          const exchangeRate = paymentInfo.exchange_rate || await getExchangeRateFromStripe(payment.payment_intent_id);
          
          if (exchangeRate && exchangeRate > 0) {
            // Converter BRL bruto para USD bruto
            const grossAmountUSD = convertBRLToUSD(amountUSD, exchangeRate);
            // Remover taxas do Stripe para obter valor líquido
            amountUSD = calculateNetAmountFromGross(grossAmountUSD, true);
            console.log(`[paymentConverter] ✅ Convertido BRL para USD (via metadata): ${payment.amount} BRL → ${grossAmountUSD.toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
          } else {
            console.warn(`[paymentConverter] ⚠️ Moeda é BRL mas exchange_rate não encontrada para payment_intent_id: ${payment.payment_intent_id}, pulando pagamento`);
            continue;
          }
        } else {
          // ✅ MOEDA ORIGINAL É USD: apenas remover taxas do Stripe
          // Determinar se é PIX ou cartão para aplicar a taxa correta
          if (isPIX) {
            amountUSD = calculateNetAmountFromGross(amountUSD, true);
            console.log(`[paymentConverter] ✅ PIX em USD: ${Number(payment.amount).toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
          } else {
            amountUSD = calculateNetAmountFromGross(amountUSD, false);
            console.log(`[paymentConverter] ✅ Cartão em USD: ${Number(payment.amount).toFixed(2)} USD (bruto) → ${amountUSD.toFixed(2)} USD (líquido)`);
          }
        }
      } else if (payment.payment_method === 'zelle') {
        // ✅ Zelle sempre está em USD, usar diretamente
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
      .select('fee_type, amount, gross_amount_usd, payment_method')
      .eq('user_id', userId)
      .in('fee_type', feeTypes);

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
        // Se já existe um valor para este fee_type, usar o maior (mais recente)
        if (!amounts[feeTypeKey] || amountUSD > amounts[feeTypeKey]) {
          amounts[feeTypeKey] = amountUSD;
        }
      }
    }

    return amounts;
  } catch (error) {
    console.error('[paymentConverter] Exceção ao buscar valores brutos pagos:', error);
    return {};
  }
}

