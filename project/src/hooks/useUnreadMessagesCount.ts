import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';

export const useUnreadMessagesCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminIds, setAdminIds] = useState<string[]>([]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_unread_admin_student_chat_notifications', {
          user_id_param: user.id
        });

      if (error) throw error;

      // Tentar usar lista de todos admins; se ainda não carregou, busque
      let ids = adminIds;
      if (ids.length === 0) {
        const { data: admins } = await supabase
          .from('user_profiles')
          .select('user_id')
          .in('role', ['admin', 'affiliate_admin']);
        ids = (admins || []).map((a: any) => a.user_id);
        setAdminIds(ids);
      }

      // Contar mensagens não lidas para TODOS admins
      if (ids.length > 0) {
        const { count, error: allErr } = await supabase
          .from('admin_student_messages')
          .select('id', { count: 'exact', head: true })
          .in('recipient_id', ids)
          .is('read_at', null);
        if (!allErr && typeof count === 'number') {
          setUnreadCount(count);
        } else {
          // Fallback para RPC
          const rpcCount = data?.length || 0;
          setUnreadCount(rpcCount);
        }
      } else {
        // Fallback direto do usuário atual
        const { count, error: directErr } = await supabase
          .from('admin_student_messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .is('read_at', null);
        if (!directErr && typeof count === 'number') {
          setUnreadCount(count);
        } else {
          const rpcCount = data?.length || 0;
          setUnreadCount(rpcCount);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch unread count:', e);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Buscar contador quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, adminIds]);

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
          fetchUnreadCount();
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
          fetchUnreadCount();
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
          fetchUnreadCount();
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
          fetchUnreadCount();
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
          fetchUnreadCount();
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
          fetchUnreadCount();
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
