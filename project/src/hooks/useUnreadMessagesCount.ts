import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';

export const useUnreadMessagesCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_unread_admin_student_chat_notifications', {
          user_id_param: user.id
        });

      if (error) throw error;

      setUnreadCount(data?.length || 0);
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
  }, [user]);

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
