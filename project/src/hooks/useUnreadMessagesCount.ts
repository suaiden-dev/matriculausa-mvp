import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';
import { throttle } from '../utils/debounce';

export const useUnreadMessagesCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminIds, setAdminIds] = useState<string[]>([]);

  // ✅ OTIMIZAÇÃO: Buscar admin IDs apenas uma vez e cachear
  const loadAdminIds = useCallback(async () => {
    if (adminIds.length > 0) return adminIds; // Já carregado
    
    try {
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('user_id')
        .in('role', ['admin', 'affiliate_admin']);
      const ids = (admins || []).map((a: any) => a.user_id);
      setAdminIds(ids);
      return ids;
    } catch (e) {
      console.error('Failed to load admin IDs:', e);
      return [];
    }
  }, [adminIds.length]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // ✅ OTIMIZAÇÃO: Usar apenas a RPC, que já retorna o contador correto
      // Não precisamos fazer queries adicionais em admin_student_messages
      const { data, error } = await supabase
        .rpc('get_unread_admin_student_chat_notifications', {
          user_id_param: user.id
        });

      if (error) throw error;

      // A RPC já retorna o contador correto
      setUnreadCount(data?.length || 0);
    } catch (e: any) {
      console.error('Failed to fetch unread count:', e);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ✅ OTIMIZAÇÃO: Throttle para evitar chamadas excessivas em eventos real-time
  const throttledFetchUnreadCount = useRef(
    throttle(() => {
      fetchUnreadCount();
    }, 3000) // Throttle de 3 segundos - máximo 1 chamada a cada 3 segundos
  );

  // Atualizar a função throttled quando fetchUnreadCount mudar
  useEffect(() => {
    throttledFetchUnreadCount.current = throttle(() => {
      fetchUnreadCount();
    }, 3000);
  }, [fetchUnreadCount]);

  // ✅ OTIMIZAÇÃO: Buscar admin IDs apenas uma vez no mount
  useEffect(() => {
    if (user && adminIds.length === 0) {
      loadAdminIds();
    }
  }, [user, adminIds.length, loadAdminIds]);

  // Buscar contador quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  // Configurar real-time para atualizações
  useEffect(() => {
    if (!user) return;

    const channelName = `unread-messages-count-${user.id}`;

    const channel = channelManager.subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_chat_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      )
      // Fallback realtime: escutar diretamente mudanças nas mensagens também
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_messages',
          // sem filtro: queremos refletir mensagens enviadas a qualquer admin
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'admin_student_messages',
          // sem filtro para atualizar contagem global
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'admin_student_messages',
          // sem filtro para atualizar contagem global
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'admin_student_chat_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'admin_student_chat_notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          // ✅ OTIMIZAÇÃO: Usar throttle para evitar múltiplas chamadas
          throttledFetchUnreadCount.current();
        }
      );

    return () => {
      channelManager.unsubscribe(channelName);
    };
  }, [user]);

  return {
    unreadCount,
    loading,
    refetch: fetchUnreadCount
  };
};
