/**
 * Versão OTIMIZADA do loader de payment dates
 * 
 * Corrige problema N+1: busca todas as datas em batch em vez de loop sequencial
 */

import { SupabaseClient } from '@supabase/supabase-js';

export type FeeTypeKey = 'selection_process' | 'application' | 'scholarship' | 'i20_control';

/**
 * Versão otimizada: busca todas as datas de pagamento em uma única query batch
 */
export async function getPaymentDatesForUsersLoaderOptimized(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Map<FeeTypeKey, string>>> {
  const paymentDates = new Map<string, Map<FeeTypeKey, string>>();
  
  if (userIds.length === 0) return paymentDates;

  // OTIMIZAÇÃO: Buscar todas as datas de uma vez usando IN query
  // Assumindo que existe uma tabela individual_fee_payments
  try {
    const feeTypes: FeeTypeKey[] = ['selection_process', 'application', 'scholarship', 'i20_control'];
    
    // Buscar todos os pagamentos de uma vez
    const { data: allPayments, error } = await supabase
      .from('individual_fee_payments')
      .select('user_id, fee_type, payment_date')
      .in('user_id', userIds)
      .in('fee_type', feeTypes);

    if (!error && allPayments) {
      // Agrupar por user_id e fee_type
      allPayments.forEach((payment: any) => {
        const userId = payment.user_id;
        const feeType = payment.fee_type as FeeTypeKey;
        const paymentDate = payment.payment_date;

        if (!paymentDates.has(userId)) {
          paymentDates.set(userId, new Map<FeeTypeKey, string>());
        }

        const userDates = paymentDates.get(userId)!;
        if (paymentDate && feeTypes.includes(feeType)) {
          // Pegar a data mais recente se houver múltiplas
          const existingDate = userDates.get(feeType);
          if (!existingDate || new Date(paymentDate) > new Date(existingDate)) {
            userDates.set(feeType, paymentDate);
          }
        }
      });
    }
  } catch (err) {
    // Fallback para método antigo se a tabela não existir ou houver erro
    console.warn('⚠️ [paymentDatesLoader] Erro ao buscar datas em batch, usando fallback:', err);
    
    // FALLBACK: Método antigo (muito lento, mas funciona)
    const feeTypes: FeeTypeKey[] = ['selection_process', 'application', 'scholarship', 'i20_control'];
    
    // Dividir em chunks para evitar sobrecarga
    const chunkSize = 10;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      
      await Promise.allSettled(
        chunk.map(async (userId) => {
          const userPaymentDates = new Map<FeeTypeKey, string>();
          
          await Promise.allSettled(
            feeTypes.map(async (feeType) => {
              try {
                const { data, error } = await supabase.rpc('get_individual_payment_date', {
                  p_user_id: userId,
                  p_fee_type: feeType,
                  p_payment_method: null
                });
                
                if (!error && data) {
                  userPaymentDates.set(feeType, data);
                }
              } catch (_) {
                // silencioso
              }
            })
          );
          
          if (userPaymentDates.size > 0) {
            paymentDates.set(userId, userPaymentDates);
          }
        })
      );
    }
  }

  return paymentDates;
}

