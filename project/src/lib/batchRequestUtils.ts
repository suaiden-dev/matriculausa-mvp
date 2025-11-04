/**
 * Batch Request Utils
 * 
 * Wrappers para as novas funções RPC batch que reduzem N requisições para 1.
 * Usa as funções criadas na migration: get_user_fee_overrides_batch, get_payment_dates_batch, etc.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { requestCache } from './requestCache';

export type FeeTypeKey = 'selection_process' | 'application' | 'scholarship' | 'i20_control';

/**
 * Batch: Busca fee overrides para múltiplos usuários
 * Reduz N requisições (uma por usuário) para 1 requisição batch
 * Com cache para evitar requisições duplicadas
 */
export async function batchGetFeeOverrides(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ [userId: string]: { selection_process_fee?: number; application_fee?: number; scholarship_fee?: number; i20_control_fee?: number } }> {
  if (userIds.length === 0) return {};
  
  // Verificar cache primeiro
  const cacheKey = userIds.sort().join(',');
  const cached = requestCache.get<{ [userId: string]: any }>('batchGetFeeOverrides', cacheKey);
  if (cached) {
    return cached;
  }
  
  // Dividir em chunks de 1000 para evitar limite do PostgreSQL
  const chunkSize = 1000;
  const result: { [userId: string]: any } = {};
  
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    
    try {
      const { data, error } = await supabase.rpc('get_user_fee_overrides_batch', {
        p_user_ids: chunk
      });
      
      if (error) {
        console.warn('⚠️ [batchGetFeeOverrides] Erro na batch RPC:', error);
        // Fallback silencioso - retorna objeto vazio para esse chunk
        continue;
      }
      
      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.user_id) {
            result[row.user_id] = {
              selection_process_fee: row.selection_process_fee != null ? Number(row.selection_process_fee) : undefined,
              application_fee: row.application_fee != null ? Number(row.application_fee) : undefined,
              scholarship_fee: row.scholarship_fee != null ? Number(row.scholarship_fee) : undefined,
              i20_control_fee: row.i20_control_fee != null ? Number(row.i20_control_fee) : undefined,
            };
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ [batchGetFeeOverrides] Erro ao buscar overrides em batch:', err);
      // Continua para próximo chunk
    }
  }
  
  // Armazenar no cache
  requestCache.set('batchGetFeeOverrides', result, cacheKey);
  
  return result;
}

/**
 * Batch: Busca payment dates para múltiplos usuários
 * Reduz N×4 requisições (uma por usuário × fee_type) para 1 requisição batch
 * Com cache para evitar requisições duplicadas
 */
export async function batchGetPaymentDates(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, Map<FeeTypeKey, string>>> {
  const paymentDates = new Map<string, Map<FeeTypeKey, string>>();
  
  if (userIds.length === 0) return paymentDates;
  
  // Verificar cache primeiro
  const cacheKey = userIds.sort().join(',');
  const cached = requestCache.get<Map<string, Map<FeeTypeKey, string>>>('batchGetPaymentDates', cacheKey);
  if (cached) {
    return cached;
  }
  
  // Dividir em chunks de 1000 para evitar limite do PostgreSQL
  const chunkSize = 1000;
  const feeTypes: FeeTypeKey[] = ['selection_process', 'application', 'scholarship', 'i20_control'];
  
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    
    try {
      const { data, error } = await supabase.rpc('get_payment_dates_batch', {
        p_user_ids: chunk
      });
      
      if (error) {
        console.warn('⚠️ [batchGetPaymentDates] Erro na batch RPC:', error);
        // Fallback silencioso - continua para próximo chunk
        continue;
      }
      
      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.user_id && row.fee_type && row.payment_date) {
            const userId = row.user_id;
            const feeType = row.fee_type as FeeTypeKey;
            const paymentDate = row.payment_date;
            
            if (!paymentDates.has(userId)) {
              paymentDates.set(userId, new Map<FeeTypeKey, string>());
            }
            
            const userDates = paymentDates.get(userId)!;
            if (feeTypes.includes(feeType)) {
              // Pegar a data mais recente se houver múltiplas
              const existingDate = userDates.get(feeType);
              if (!existingDate || new Date(paymentDate) > new Date(existingDate)) {
                userDates.set(feeType, paymentDate);
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ [batchGetPaymentDates] Erro ao buscar payment dates em batch:', err);
      // Continua para próximo chunk
    }
  }
  
  // Armazenar no cache
  requestCache.set('batchGetPaymentDates', paymentDates, cacheKey);
  
  return paymentDates;
}

/**
 * Batch: Busca notificações não lidas para múltiplos admins
 * Reduz N requisições (uma por admin) para 1 requisição batch
 */
export async function batchGetUnreadNotifications(
  supabase: SupabaseClient,
  adminIds: string[]
): Promise<{ [adminId: string]: any[] }> {
  const result: { [adminId: string]: any[] } = {};
  
  if (adminIds.length === 0) return result;
  
  // Dividir em chunks de 1000 para evitar limite do PostgreSQL
  const chunkSize = 1000;
  
  for (let i = 0; i < adminIds.length; i += chunkSize) {
    const chunk = adminIds.slice(i, i + chunkSize);
    
    try {
      const { data, error } = await supabase.rpc('get_unread_notifications_batch', {
        p_admin_ids: chunk
      });
      
      if (error) {
        console.warn('⚠️ [batchGetUnreadNotifications] Erro na batch RPC:', error);
        // Fallback silencioso - inicializa arrays vazios para esse chunk
        chunk.forEach(adminId => {
          if (!result[adminId]) {
            result[adminId] = [];
          }
        });
        continue;
      }
      
      if (data && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.recipient_id) {
            // notifications já vem como JSONB array
            result[row.recipient_id] = Array.isArray(row.notifications) 
              ? row.notifications 
              : (row.notifications ? [row.notifications] : []);
          }
        });
      }
      
      // Garantir que todos os admins tenham pelo menos array vazio
      chunk.forEach(adminId => {
        if (!result[adminId]) {
          result[adminId] = [];
        }
      });
    } catch (err) {
      console.warn('⚠️ [batchGetUnreadNotifications] Erro ao buscar notificações em batch:', err);
      // Inicializa arrays vazios para esse chunk em caso de erro
      chunk.forEach(adminId => {
        if (!result[adminId]) {
          result[adminId] = [];
        }
      });
    }
  }
  
  return result;
}

