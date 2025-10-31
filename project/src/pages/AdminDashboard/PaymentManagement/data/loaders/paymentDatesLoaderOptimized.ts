/**
 * Versão OTIMIZADA do loader de payment dates
 * 
 * Corrige problema N+1: usa RPC batch para buscar todas as datas em uma única requisição
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { batchGetPaymentDates } from '../../../../lib/batchRequestUtils';

export type FeeTypeKey = 'selection_process' | 'application' | 'scholarship' | 'i20_control';

/**
 * Versão otimizada: usa RPC batch get_payment_dates_batch
 * Reduz N×4 requisições (uma por usuário × fee_type) para 1 requisição batch
 */
export async function getPaymentDatesForUsersLoaderOptimized(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Map<FeeTypeKey, string>>> {
  if (userIds.length === 0) {
    return new Map<string, Map<FeeTypeKey, string>>();
  }

  // Usar RPC batch - sempre, nunca fallback individual
  try {
    return await batchGetPaymentDates(supabase, userIds);
  } catch (err) {
    console.error('❌ [paymentDatesLoader] Erro fatal ao buscar payment dates em batch:', err);
    // Retorna Map vazio em caso de erro crítico
    // NÃO faz fallback individual para evitar N+1
    return new Map<string, Map<FeeTypeKey, string>>();
  }
}

