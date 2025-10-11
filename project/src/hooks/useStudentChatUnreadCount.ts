import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { channelManager } from '../lib/supabaseChannelManager';

export const useStudentChatUnreadCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar mensagens não lidas diretamente da tabela admin_student_messages
      const { data, error } = await supabase
        .from('admin_student_messages')
        .select('id, read_at, recipient_id')
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      const count = data?.length || 0;
      setUnreadCount(count);
    } catch (e: any) {
      console.error('Failed to fetch student chat unread count:', e);
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

    const channelName = `student-chat-unread-count-${user.id}`;

    const channel = channelManager.subscribe(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_student_messages',
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
          table: 'admin_student_messages',
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

  const markStudentMessagesAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('admin_student_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return;
      }

      setUnreadCount(0);
    } catch (e: any) {
      console.error('Failed to mark messages as read:', e);
    }
  };

  return {
    unreadCount,
    loading,
    refetch: fetchUnreadCount,
    markStudentMessagesAsRead
  };
};
